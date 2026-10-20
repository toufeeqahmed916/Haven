import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { requireRoles, requireTrackAccess } from "../auth/middleware.ts";
import { staffRoles } from "../auth/policy.ts";
import { validateParams } from "../middleware/validate.ts";

export const authRouter: ExpressRouter = Router();
authRouter.get("/me", (request, response) => { const auth = request.auth!; response.json({ data: { userId: auth.user.id, email: auth.user.email ?? null, profile: auth.profile } }); });
authRouter.get("/staff", requireRoles(...staffRoles), (request, response) => response.json({ data: { authorized: true, role: request.auth!.profile.role } }));
const trackParams = z.object({ track: z.enum(["safety", "civic"]) });
authRouter.get("/track/:track", validateParams(trackParams), (request, response, next) => { const track = request.params.track as "safety" | "civic"; requireTrackAccess(track)(request, response, (error) => { if (error) return next(error); response.json({ data: { authorized: true, role: request.auth!.profile.role, track } }); }); });
