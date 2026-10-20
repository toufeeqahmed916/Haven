import { Router, type Router as ExpressRouter } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { analyzeSafety } from "../analysis/safety-rules.ts";
import { analyzeWithOptionalAi, type AiConfig } from "../analysis/ai-analysis.ts";
import { generateCaseGuidance } from "../analysis/case-guidance.ts";
import { canAccessTrack } from "../auth/policy.ts";
import { AppError } from "../lib/errors.ts";
import { validateBody, validateParams } from "../middleware/validate.ts";
import type { AppRole, ComplaintTrack } from "../types/auth.ts";
import { adminActionInput, appealInput, complaintIdParams, complaintInput, draftInput, reopenInput, statusInput } from "../complaints/schemas.ts";

type Input = z.infer<typeof complaintInput>;
type ComplaintRow = { id: string; user_id: string; category_id: string; track: ComplaintTrack; original_text: string; original_language: "en" | "ur" | "sd"; summary: string | null; status: string; is_anonymous: boolean; latitude: number | null; longitude: number | null; address_text: string | null; incident_at: string | null };

function requireService(client: SupabaseClient | null): SupabaseClient { if (!client) throw new AppError(503, "SERVICE_NOT_CONFIGURED", "Protected complaint commands require SUPABASE_SECRET_KEY (or the legacy SUPABASE_SERVICE_ROLE_KEY) on the API server."); return client; }
function databaseError(error: { message: string; code?: string } | null, fallback: string): never { throw new AppError(error?.code === "23505" ? 409 : 400, "COMMAND_REJECTED", error?.message || fallback); }

async function categoryTrack(client: SupabaseClient, code: string): Promise<ComplaintTrack> {
  const result = await client.from("categories").select("track").eq("code", code).eq("is_active", true).single();
  if (result.error || !result.data) throw new AppError(400, "INVALID_CATEGORY", "Choose an active Haven category.");
  return result.data.track as ComplaintTrack;
}

async function complaint(client: SupabaseClient, id: string): Promise<ComplaintRow> {
  const result = await client.from("complaints").select("id,user_id,category_id,track,original_text,original_language,summary,status,is_anonymous,latitude,longitude,address_text,incident_at").eq("id", id).single();
  if (result.error || !result.data) throw new AppError(404, "CASE_NOT_FOUND", "The case was not found or is unavailable.");
  return result.data as ComplaintRow;
}

export function normalizedReport(text: string) { return text.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim(); }
async function rejectRecentDuplicate(client: SupabaseClient, actorId: string, text: string, excludedId: string | null) {
  let query = client.from("complaints").select("id,case_number,original_text").eq("user_id", actorId).neq("status", "draft").gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).limit(30);
  if (excludedId) query = query.neq("id", excludedId);
  const recent = await query; if (recent.error) databaseError(recent.error, "Recent reports could not be checked."); const normalized = normalizedReport(text);
  const match = (recent.data ?? []).find((row) => normalizedReport(String(row.original_text)) === normalized);
  if (match) throw new AppError(409, "DUPLICATE_REPORT", `This looks identical to case HAV-${String(match.case_number).padStart(6, "0")} submitted in the last 24 hours.`);
}

async function staffCanAccess(client: SupabaseClient, role: AppRole, actorId: string, item: ComplaintRow) {
  if (canAccessTrack(role, item.track)) return;
  if (role !== "response_team") throw new AppError(403, "TRACK_FORBIDDEN", "Your role cannot manage this case track.");
  const assignments = await client.from("assignments").select("team_id").eq("complaint_id", item.id).not("status", "in", "(completed,cancelled)");
  const teamIds = (assignments.data ?? []).map((entry) => entry.team_id as string);
  if (!teamIds.length) throw new AppError(403, "ASSIGNMENT_REQUIRED", "Your response team is not assigned to this case.");
  const membership = await client.from("team_members").select("team_id").eq("user_id", actorId).in("team_id", teamIds).limit(1);
  if (membership.error || !membership.data?.length) throw new AppError(403, "ASSIGNMENT_REQUIRED", "Your response team is not assigned to this case.");
}

async function save(client: SupabaseClient, actorId: string, id: string | null, input: Input, submit: boolean, aiConfig: AiConfig) {
  const track = await categoryTrack(client, input.categoryCode);
  const analysis = analyzeSafety(input.text, track);
  if (submit) await rejectRecentDuplicate(client, actorId, input.text, id);
  const categories = await client.from("categories").select("code").eq("is_active", true);
  if (categories.error) databaseError(categories.error, "Complaint categories could not be loaded.");
  const allowedCategories = (categories.data ?? []).map((row) => String(row.code));
  const ai = submit ? await analyzeWithOptionalAi({ text: input.text, language: input.language, selectedCategory: input.categoryCode, allowedCategories, rulesUrgency: analysis.rulesUrgency, dangerFlags: analysis.dangerFlags }, aiConfig) : null;
  const result = await client.rpc("backend_save_complaint", { p_actor_id: actorId, p_complaint_id: id, p_category_code: input.categoryCode, p_original_text: input.text, p_original_language: input.language, p_is_anonymous: input.isAnonymous, p_latitude: input.latitude ?? null, p_longitude: input.longitude ?? null, p_address_text: input.addressText ?? null, p_incident_at: input.incidentAt ?? null, p_submit: submit, p_rules_urgency: analysis.rulesUrgency, p_danger_flags: analysis.dangerFlags, p_urgency_reason: analysis.urgencyReason });
  if (result.error || !result.data) databaseError(result.error, "The complaint could not be saved.");
  if (ai) {
    const finalized = await client.rpc("backend_finalize_analysis", { p_actor_id: actorId, p_complaint_id: String(result.data), p_summary: ai.summary, p_translated_text: ai.translatedText, p_ai_urgency: ai.aiUrgency, p_final_urgency: ai.finalUrgency, p_ai_reason: ai.reason, p_ai_failed: ai.failed, p_ai_category_code: ai.suggestedCategoryCode, p_ai_provider: ai.provider, p_ai_error_code: ai.errorCode });
    if (finalized.error) databaseError(finalized.error, "The safe analysis result could not be recorded.");
  }
  const fallbackSteps = track === "safety" ? ["Move to a safer place if you can do so safely.", "Contact a trusted person and the appropriate emergency service if danger is immediate.", "Preserve evidence only when doing so does not increase your risk."] : ["Keep a safe distance from the hazard.", "Record the location and factual details only when it is safe.", "Follow the case timeline for a reviewed update."];
  return { complaintId: String(result.data), status: submit ? "submitted" : "draft", analysis, ai, fallbackSteps: submit && ai?.failed ? fallbackSteps : [] };
}

export function createComplaintRouter(serviceClient: SupabaseClient | null, aiConfig: AiConfig): ExpressRouter {
  const router = Router();

  router.post("/", validateBody(complaintInput), async (request, response) => {
    if (request.auth!.profile.role !== "citizen") throw new AppError(403, "CITIZEN_ONLY", "Only citizen accounts can create complaints.");
    const data = await save(requireService(serviceClient), request.auth!.profile.id, null, request.body as Input, (request.body as Input).submit, aiConfig);
    response.status(data.status === "submitted" ? 201 : 200).json({ data });
  });

  router.get("/:id/guidance", validateParams(complaintIdParams), async (request, response) => {
    const client = requireService(serviceClient);
    const item = await complaint(client, String(request.params.id));
    const role = request.auth!.profile.role;
    if (role === "citizen" && item.user_id !== request.auth!.profile.id) throw new AppError(403, "CASE_FORBIDDEN", "You can only open guidance for your own case.");
    if (role !== "citizen") await staffCanAccess(client, role, request.auth!.profile.id, item);
    const category = await client.from("categories").select("code,name_en").eq("id", item.category_id).single();
    if (category.error || !category.data) databaseError(category.error, "The complaint category could not be loaded.");
    const guidance = await generateCaseGuidance({
      complaintText: item.original_text,
      summary: item.summary,
      language: item.original_language,
      track: item.track,
      category: String(category.data.name_en || category.data.code),
    }, aiConfig);
    response.setHeader("cache-control", "private, no-store");
    response.json({ data: guidance });
  });

  router.patch("/:id/draft", validateParams(complaintIdParams), validateBody(draftInput), async (request, response) => {
    const data = await save(requireService(serviceClient), request.auth!.profile.id, String(request.params.id), request.body as Input, false, aiConfig);
    response.json({ data });
  });

  router.post("/:id/submit", validateParams(complaintIdParams), async (request, response) => {
    const client = requireService(serviceClient); const item = await complaint(client, String(request.params.id));
    if (item.user_id !== request.auth!.profile.id || item.status !== "draft") throw new AppError(409, "DRAFT_REQUIRED", "Only your own draft can be submitted.");
    const category = await client.from("categories").select("code").eq("id", item.category_id).single();
    if (!category.data) throw new AppError(400, "INVALID_CATEGORY", "The draft category is unavailable.");
    const input: Input = { categoryCode: category.data.code, text: item.original_text, language: item.original_language, isAnonymous: item.is_anonymous, latitude: item.latitude, longitude: item.longitude, addressText: item.address_text, incidentAt: item.incident_at, submit: true };
    response.json({ data: await save(client, request.auth!.profile.id, item.id, input, true, aiConfig) });
  });

  router.post("/:id/reopen", validateParams(complaintIdParams), validateBody(reopenInput), async (request, response) => {
    const complaintId = String(request.params.id);
    const result = await requireService(serviceClient).rpc("backend_reopen_complaint", { p_actor_id: request.auth!.profile.id, p_complaint_id: complaintId, p_reason: request.body.reason });
    if (result.error) databaseError(result.error, "The complaint could not be reopened."); response.json({ data: { complaintId, status: "reopened" } });
  });

  router.post("/:id/appeals", validateParams(complaintIdParams), validateBody(appealInput), async (request, response) => {
    const result = await request.auth!.userClient.from("appeals").insert({ complaint_id: String(request.params.id), user_id: request.auth!.profile.id, reason: request.body.reason }).select("id,status,created_at").single();
    if (result.error) databaseError(result.error, "The appeal could not be submitted."); response.status(201).json({ data: result.data });
  });
  return router;
}

export function createAdminComplaintRouter(serviceClient: SupabaseClient | null): ExpressRouter {
  const router = Router();
  router.post("/:id/actions", validateParams(complaintIdParams), validateBody(adminActionInput), async (request, response) => {
    const client = requireService(serviceClient); const item = await complaint(client, String(request.params.id)); const role = request.auth!.profile.role;
    if (role === "citizen" || role === "response_team") throw new AppError(403, "DECISION_FORBIDDEN", "This role cannot accept, reject, request information, or assign cases.");
    await staffCanAccess(client, role, request.auth!.profile.id, item);
    const body = request.body as z.infer<typeof adminActionInput>;
    const result = await client.rpc("backend_admin_action", { p_actor_id: request.auth!.profile.id, p_complaint_id: item.id, p_action: body.action, p_reason: body.reason || null, p_team_id: body.action === "assign" ? body.teamId : null, p_eta_minutes: body.action === "assign" ? body.etaMinutes : null, p_target_status: null, p_visible_to_citizen: true });
    if (result.error) databaseError(result.error, "The admin action was rejected."); response.json({ data: result.data, message: "Action recorded successfully." });
  });

  router.post("/:id/status", validateParams(complaintIdParams), validateBody(statusInput), async (request, response) => {
    const client = requireService(serviceClient); const item = await complaint(client, String(request.params.id)); const role = request.auth!.profile.role;
    if (role === "citizen") throw new AppError(403, "STAFF_ONLY", "Only assigned or authorized staff can change case status.");
    await staffCanAccess(client, role, request.auth!.profile.id, item);
    const body = request.body as z.infer<typeof statusInput>;
    const result = await client.rpc("backend_admin_action", { p_actor_id: request.auth!.profile.id, p_complaint_id: item.id, p_action: "status_transition", p_reason: body.note, p_team_id: null, p_eta_minutes: null, p_target_status: body.status, p_visible_to_citizen: body.visibleToCitizen });
    if (result.error) databaseError(result.error, "The status transition was rejected."); response.json({ data: result.data, message: "Status updated successfully." });
  });
  return router;
}
