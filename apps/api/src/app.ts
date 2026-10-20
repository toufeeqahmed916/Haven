import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { createRequireAuth } from "./auth/middleware.ts";
import { errorHandler, notFound } from "./middleware/errors.ts";
import { requestContext } from "./middleware/request-context.ts";
import { authRouter } from "./routes/auth.ts";
import { createAdminComplaintRouter, createComplaintRouter } from "./routes/complaints.ts";
import { createServiceClient } from "./lib/supabase.ts";
import { createFileRouter } from "./routes/files.ts";
import { createRateLimiter } from "./middleware/rate-limit.ts";

export type AppSettings = { environment: "development" | "test" | "production"; corsOrigins: string[]; supabaseUrl: string; supabaseAnonKey: string; supabaseServiceRoleKey?: string; geminiApiKey?: string; geminiModel?: string; aiTimeoutMs?: number; rateLimitMax?: number; trustProxy?: boolean };
export function createApp(settings: AppSettings): Express {
  const serviceClient = settings.supabaseServiceRoleKey ? createServiceClient(settings.supabaseUrl, settings.supabaseServiceRoleKey) : null;
  const app = express(); app.disable("x-powered-by"); if (settings.trustProxy) app.set("trust proxy", 1); app.use(requestContext); app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
  app.use(cors({ origin(origin, callback) { callback(null, !origin || settings.corsOrigins.includes(origin)); }, credentials: false }));
  app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, limit: settings.rateLimitMax ?? 300, name: "api" }));
  app.use(express.json({ limit: "1mb" }));
  app.get("/health", (_request, response) => response.json({ status: "ok", service: "haven-api", version: "0.1.0", environment: settings.environment, checks: { protectedCommands: serviceClient ? "configured" : "missing_server_key", ai: settings.geminiApiKey ? "configured" : "safe_fallback" }, uptimeSeconds: Math.floor(process.uptime()), timestamp: new Date().toISOString() }));
  app.get("/api/v1", (_request, response) => response.json({ data: { name: "Haven API", version: "v1", safetyBoundary: "AI suggests. Humans decide." } }));
  const requireAuth = createRequireAuth({ supabaseUrl: settings.supabaseUrl, supabaseAnonKey: settings.supabaseAnonKey });
  app.use("/api/v1/auth", requireAuth, authRouter);
  app.use("/api/v1/complaints", requireAuth, createComplaintRouter(serviceClient, { apiKey: settings.geminiApiKey, model: settings.geminiModel ?? "gemini-2.5-flash-lite", timeoutMs: settings.aiTimeoutMs ?? 12000 }));
  app.use("/api/v1/admin/complaints", requireAuth, createAdminComplaintRouter(serviceClient));
  app.use("/api/v1/files", requireAuth, createFileRouter(serviceClient, { apiKey: settings.geminiApiKey, model: settings.geminiModel ?? "gemini-2.5-flash-lite", timeoutMs: settings.aiTimeoutMs ?? 12000 }));
  app.use("/api/admin/complaints", requireAuth, createAdminComplaintRouter(serviceClient));
  app.use(notFound); app.use(errorHandler); return app;
}
