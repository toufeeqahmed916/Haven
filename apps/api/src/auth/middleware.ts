import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../lib/errors.ts";
import { createAuthClient, createUserClient } from "../lib/supabase.ts";
import { appRoles, type AppRole, type ComplaintTrack } from "../types/auth.ts";
import { canAccessTrack, needsAssignmentCheck } from "./policy.ts";

const profileSchema = z.object({ id: z.uuid(), role: z.enum(appRoles), display_name: z.string().nullable(), language: z.enum(["en", "ur", "sd"]), is_active: z.boolean() });
function bearer(header?: string) { const match = header && /^Bearer\s+(.+)$/i.exec(header.trim()); if (!match?.[1]) throw new AppError(401, "AUTH_REQUIRED", "Send a Supabase access token using the Bearer format."); return match[1]; }

export function createRequireAuth(settings: { supabaseUrl: string; supabaseAnonKey: string }): RequestHandler {
  const authClient = createAuthClient(settings.supabaseUrl, settings.supabaseAnonKey);
  return async (request, _response, next) => { try {
    const token = bearer(request.header("authorization"));
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) throw new AppError(401, "INVALID_TOKEN", "The access token is invalid or expired.");
    const userClient = createUserClient(settings.supabaseUrl, settings.supabaseAnonKey, token);
    const result = await userClient.from("profiles").select("id,role,display_name,language,is_active").eq("id", data.user.id).single();
    if (result.error || !result.data) throw new AppError(403, "PROFILE_UNAVAILABLE", "An active Haven profile is required.");
    const profile = profileSchema.parse(result.data);
    if (!profile.is_active) throw new AppError(403, "ACCOUNT_INACTIVE", "This Haven account is inactive.");
    request.auth = { token, user: data.user, profile: { id: profile.id, role: profile.role, displayName: profile.display_name, language: profile.language, isActive: profile.is_active }, userClient };
    next();
  } catch (error) { next(error); } };
}

export function requireRoles(...allowed: AppRole[]): RequestHandler { return (request, _response, next) => { if (!request.auth) return next(new AppError(401, "AUTH_REQUIRED", "Authentication is required.")); if (!allowed.includes(request.auth.profile.role)) return next(new AppError(403, "ROLE_FORBIDDEN", "Your Haven role cannot perform this action.")); next(); }; }
export function requireTrackAccess(track: ComplaintTrack): RequestHandler { return (request, _response, next) => { if (!request.auth) return next(new AppError(401, "AUTH_REQUIRED", "Authentication is required.")); const role = request.auth.profile.role; if (needsAssignmentCheck(role)) return next(new AppError(403, "ASSIGNMENT_REQUIRED", "Response-team access requires an active case assignment.")); if (!canAccessTrack(role, track)) return next(new AppError(403, "TRACK_FORBIDDEN", `Your role cannot access the ${track} track.`)); next(); }; }
