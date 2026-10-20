import { randomUUID } from "node:crypto";
import { Router, type Router as ExpressRouter } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiConfig } from "../analysis/ai-analysis.ts";
import { transcribeAudio } from "../analysis/ai-analysis.ts";
import { canAccessTrack } from "../auth/policy.ts";
import { createCasePdf } from "../files/pdf.ts";
import { attachmentIdParams, documentIdParams, documentInput, uploadCompleteInput, uploadRequestInput } from "../files/schemas.ts";
import { AppError } from "../lib/errors.ts";
import { validateBody, validateParams } from "../middleware/validate.ts";
import type { AppRole, ComplaintTrack } from "../types/auth.ts";

type CaseRow = { id: string; user_id: string; track: ComplaintTrack; status: string; case_number: number; original_text: string; translated_text: string | null; submitted_at: string; address_text: string | null; categories: { name_en: string } | null };
function dbError(error: { message: string; code?: string } | null, fallback: string): never { throw new AppError(error?.code === "23505" ? 409 : 400, "FILE_COMMAND_REJECTED", error?.message || fallback); }
function cleanName(name: string) { return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(-120) || "file"; }

async function getCase(client: SupabaseClient, id: string): Promise<CaseRow> {
  const result = await client.from("complaints").select("id,user_id,track,status,case_number,original_text,translated_text,submitted_at,address_text,categories(name_en)").eq("id", id).single();
  if (result.error || !result.data) throw new AppError(404, "CASE_NOT_FOUND", "The case was not found.");
  return result.data as unknown as CaseRow;
}
async function canRead(client: SupabaseClient, role: AppRole, actorId: string, item: CaseRow) {
  if (item.user_id === actorId || canAccessTrack(role, item.track)) return;
  if (role !== "response_team") throw new AppError(403, "CASE_FORBIDDEN", "You cannot access files for this case.");
  const active = await client.from("assignments").select("team_id").eq("complaint_id", item.id).not("status", "in", "(completed,cancelled)");
  const teamIds = (active.data ?? []).map((row) => String(row.team_id));
  if (active.error || !teamIds.length) throw new AppError(403, "CASE_FORBIDDEN", "Your team is not actively assigned to this case.");
  const member = await client.from("team_members").select("team_id").eq("user_id", actorId).in("team_id", teamIds).limit(1);
  if (member.error || !member.data?.length) throw new AppError(403, "CASE_FORBIDDEN", "Your team is not actively assigned to this case.");
}
async function audit(client: SupabaseClient, actorId: string, action: string, targetTable: string, targetId: string, metadata: Record<string, unknown> = {}) {
  const result = await client.from("audit_logs").insert({ actor_id: actorId, action, target_table: targetTable, target_id: targetId, metadata });
  if (result.error) dbError(result.error, "The audit record could not be written.");
}

export function createFileRouter(client: SupabaseClient | null, aiConfig: AiConfig): ExpressRouter {
  const router = Router();
  const service = () => { if (!client) throw new AppError(503, "SERVICE_NOT_CONFIGURED", "Private file commands require a Supabase server secret."); return client; };

  router.post("/complaints/:id/attachments/upload-url", validateParams(documentIdParams), validateBody(uploadRequestInput), async (request, response) => {
    const db = service(); const item = await getCase(db, String(request.params.id)); const actor = request.auth!.profile;
    if (actor.role !== "citizen" || item.user_id !== actor.id) throw new AppError(403, "OWNER_REQUIRED", "Only the complaint owner can add evidence.");
    if (["closed", "rejected"].includes(item.status)) throw new AppError(409, "CASE_NOT_OPEN", "Evidence cannot be added to a closed or rejected case.");
    const body = request.body as { fileName: string; mimeType: string; sizeBytes: number; kind: string };
    const path = `${actor.id}/${item.id}/${randomUUID()}-${cleanName(body.fileName)}`;
    const signed = await db.storage.from("complaint-media").createSignedUploadUrl(path, { upsert: false });
    if (signed.error || !signed.data) dbError(signed.error, "A signed upload URL could not be created.");
    response.status(201).json({ data: { path, token: signed.data.token, signedUrl: signed.data.signedUrl, expiresInSeconds: 7200, requiredMimeType: body.mimeType, maximumBytes: body.sizeBytes } });
  });

  router.post("/complaints/:id/attachments/complete", validateParams(documentIdParams), validateBody(uploadCompleteInput), async (request, response) => {
    const db = service(); const item = await getCase(db, String(request.params.id)); const actor = request.auth!.profile;
    if (actor.role !== "citizen" || item.user_id !== actor.id) throw new AppError(403, "OWNER_REQUIRED", "Only the complaint owner can confirm evidence.");
    const body = request.body as { storagePath: string; fileName: string; mimeType: string; sizeBytes: number; kind: string };
    const prefix = `${actor.id}/${item.id}/`; if (!body.storagePath.startsWith(prefix)) throw new AppError(400, "INVALID_STORAGE_PATH", "The evidence path does not belong to this case.");
    const folder = body.storagePath.slice(0, body.storagePath.lastIndexOf("/")); const objectName = body.storagePath.slice(body.storagePath.lastIndexOf("/") + 1);
    const listed = await db.storage.from("complaint-media").list(folder, { search: objectName, limit: 10 });
    const object = listed.data?.find((entry) => entry.name === objectName); if (listed.error || !object) throw new AppError(409, "UPLOAD_NOT_FOUND", "Upload the file before confirming it.");
    const metadata = object.metadata as { size?: number; mimetype?: string } | null; const storedSize = Number(metadata?.size ?? body.sizeBytes); if (storedSize !== body.sizeBytes) throw new AppError(409, "SIZE_MISMATCH", "The uploaded file size does not match the request.");
    if (metadata?.mimetype && metadata.mimetype !== body.mimeType) throw new AppError(409, "MIME_MISMATCH", "The uploaded file type does not match the request.");
    const inserted = await db.from("attachments").insert({ complaint_id: item.id, uploaded_by: actor.id, kind: body.kind, storage_path: body.storagePath, mime_type: body.mimeType, size_bytes: storedSize, original_name: body.fileName, confirmed_at: new Date().toISOString() }).select("id,kind,original_name,mime_type,size_bytes,retention_until,created_at").single();
    if (inserted.error) dbError(inserted.error, "The evidence record could not be created."); await audit(db, actor.id, "attachment_confirmed", "attachments", String(inserted.data.id), { complaint_id: item.id });
    response.status(201).json({ data: inserted.data });
  });

  router.get("/attachments/:id/download-url", validateParams(attachmentIdParams), async (request, response) => {
    const db = service(); const found = await db.from("attachments").select("id,complaint_id,storage_path").eq("id", String(request.params.id)).single(); if (found.error || !found.data) throw new AppError(404, "ATTACHMENT_NOT_FOUND", "The evidence file was not found.");
    const item = await getCase(db, found.data.complaint_id); await canRead(db, request.auth!.profile.role, request.auth!.profile.id, item);
    const signed = await db.storage.from("complaint-media").createSignedUrl(found.data.storage_path, 60, { download: true }); if (signed.error || !signed.data) dbError(signed.error, "The private download link could not be created.");
    await audit(db, request.auth!.profile.id, "attachment_download_link_created", "attachments", found.data.id, { complaint_id: item.id }); response.json({ data: { signedUrl: signed.data.signedUrl, expiresInSeconds: 60 } });
  });

  router.post("/attachments/:id/transcribe", validateParams(attachmentIdParams), async (request, response) => {
    const db = service(); const found = await db.from("attachments").select("id,complaint_id,storage_path,mime_type,kind").eq("id", String(request.params.id)).single(); if (found.error || !found.data) throw new AppError(404, "ATTACHMENT_NOT_FOUND", "The audio file was not found.");
    if (found.data.kind !== "audio") throw new AppError(400, "AUDIO_REQUIRED", "Only audio evidence can be transcribed."); const item = await getCase(db, found.data.complaint_id); await canRead(db, request.auth!.profile.role, request.auth!.profile.id, item);
    const downloaded = await db.storage.from("complaint-media").download(found.data.storage_path); if (downloaded.error || !downloaded.data) dbError(downloaded.error, "The audio could not be read.");
    let transcript: string; try { transcript = await transcribeAudio(new Uint8Array(await downloaded.data.arrayBuffer()), found.data.mime_type, aiConfig); } catch { throw new AppError(503, "TRANSCRIPTION_UNAVAILABLE", "Audio transcription is unavailable. The original audio remains private and unchanged."); }
    const updated = await db.from("attachments").update({ transcription: transcript, transcribed_at: new Date().toISOString() }).eq("id", found.data.id); if (updated.error) dbError(updated.error, "The transcript could not be saved."); await audit(db, request.auth!.profile.id, "attachment_transcribed", "attachments", found.data.id);
    response.json({ data: { attachmentId: found.data.id, transcript } });
  });

  router.post("/complaints/:id/documents", validateParams(documentIdParams), validateBody(documentInput), async (request, response) => {
    const db = service(); const item = await getCase(db, String(request.params.id)); const actor = request.auth!.profile; await canRead(db, actor.role, actor.id, item); const kind = String(request.body.kind);
    if (kind === "civic_application" && item.track !== "civic") throw new AppError(400, "CIVIC_CASE_REQUIRED", "A civic application requires a civic complaint."); if (kind === "fir_draft" && item.track !== "safety") throw new AppError(400, "SAFETY_CASE_REQUIRED", "An FIR draft requires a safety complaint.");
    const files = await db.from("attachments").select("original_name,storage_path").eq("complaint_id", item.id); if (files.error) dbError(files.error, "Evidence metadata could not be loaded.");
    const titles: Record<string, string> = { complaint_application: "Complaint Application", evidence_checklist: "Evidence Checklist", civic_application: "Civic Service Application", fir_draft: "Factual FIR Draft" }; const title = titles[kind];
    const bytes = await createCasePdf({ title, caseNumber: item.case_number, kind, category: item.categories?.name_en ?? "Reported issue", status: item.status, submittedAt: item.submitted_at, statement: item.translated_text || item.original_text, address: item.address_text, attachmentNames: (files.data ?? []).map((file) => file.original_name || file.storage_path.split("/").at(-1) || "Evidence file") });
    const path = `${actor.id}/${item.id}/${randomUUID()}-${kind}.pdf`; const uploaded = await db.storage.from("generated-documents").upload(path, bytes, { contentType: "application/pdf", upsert: false }); if (uploaded.error) dbError(uploaded.error, "The PDF could not be stored.");
    const inserted = await db.from("documents").insert({ complaint_id: item.id, kind, title, content: { version: 1, disclaimer: "Verify before official use" }, storage_path: path, generated_by: actor.id, mime_type: "application/pdf", size_bytes: bytes.length }).select("id,kind,title,storage_path,size_bytes,retention_until,created_at").single();
    if (inserted.error) { await db.storage.from("generated-documents").remove([path]); dbError(inserted.error, "The document record could not be created."); } await audit(db, actor.id, "document_generated", "documents", String(inserted.data.id), { complaint_id: item.id, kind }); response.status(201).json({ data: inserted.data });
  });

  router.get("/documents/:id/download-url", validateParams(documentIdParams), async (request, response) => {
    const db = service(); const found = await db.from("documents").select("id,complaint_id,storage_path").eq("id", String(request.params.id)).single(); if (found.error || !found.data?.storage_path) throw new AppError(404, "DOCUMENT_NOT_FOUND", "The document was not found."); const item = await getCase(db, found.data.complaint_id); await canRead(db, request.auth!.profile.role, request.auth!.profile.id, item);
    const signed = await db.storage.from("generated-documents").createSignedUrl(found.data.storage_path, 60, { download: true }); if (signed.error || !signed.data) dbError(signed.error, "The private document link could not be created."); await audit(db, request.auth!.profile.id, "document_download_link_created", "documents", found.data.id); response.json({ data: { signedUrl: signed.data.signedUrl, expiresInSeconds: 60 } });
  });
  return router;
}
