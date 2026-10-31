import { createApp } from "./src/app.ts";
import { env } from "./src/config/env.ts";

// Vercel serves this exported Express app as a serverless function.
// Keep server-only values in the API project's Vercel environment settings.
const app = createApp({
  environment: env.NODE_ENV,
  corsOrigins: env.corsOrigins,
  supabaseUrl: env.SUPABASE_URL,
  supabaseAnonKey: env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
  geminiApiKey: env.GEMINI_API_KEY,
  geminiModel: env.GEMINI_MODEL,
  aiTimeoutMs: env.AI_TIMEOUT_MS,
  rateLimitMax: env.RATE_LIMIT_MAX,
  trustProxy: true,
});

export default app;
