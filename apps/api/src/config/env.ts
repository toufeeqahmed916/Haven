import { resolve } from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: resolve(process.cwd(), "../../.env"), quiet: true });
dotenv.config({ path: resolve(process.cwd(), ".env"), override: false, quiet: true });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_HOST: z.string().min(1).default("127.0.0.1"),
  SUPABASE_URL: z.url().refine((value) => value.startsWith("https://"), "Must use HTTPS"),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  SUPABASE_SECRET_KEY: z.string().min(20).optional(),
  GEMINI_API_KEY: z.string().min(20).optional(),
  GEMINI_MODEL: z.string().min(3).default("gemini-2.5-flash-lite"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(12000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(10).max(10000).default(300),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  CORS_ORIGINS: z.string().default("http://127.0.0.1:5173,http://127.0.0.1:5174"),
});

const result = schema.safeParse({ ...process.env, API_PORT: process.env.PORT || process.env.API_PORT, SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined, SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || undefined, GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined });
if (!result.success) {
  const fields = result.error.issues.map((issue) => issue.path.join(".") || "environment").join(", ");
  throw new Error(`Invalid API environment configuration: ${fields}. Check the root .env file.`);
}
export const env = { ...result.data, corsOrigins: result.data.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean) };
