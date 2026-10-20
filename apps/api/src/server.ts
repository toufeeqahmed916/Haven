import { createServer } from "node:http";
import { createApp } from "./app.ts";
import { env } from "./config/env.ts";
const app = createApp({ environment: env.NODE_ENV, corsOrigins: env.corsOrigins, supabaseUrl: env.SUPABASE_URL, supabaseAnonKey: env.SUPABASE_ANON_KEY, supabaseServiceRoleKey: env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY, geminiApiKey: env.GEMINI_API_KEY, geminiModel: env.GEMINI_MODEL, aiTimeoutMs: env.AI_TIMEOUT_MS, rateLimitMax: env.RATE_LIMIT_MAX, trustProxy: env.TRUST_PROXY === "true" });
const server = createServer(app);
server.requestTimeout = 30_000; server.headersTimeout = 35_000; server.keepAliveTimeout = 5_000;
server.listen(env.API_PORT, env.API_HOST, () => console.log(JSON.stringify({ level: "info", message: "Haven API started", url: `http://${env.API_HOST}:${env.API_PORT}`, environment: env.NODE_ENV })));
function shutdown(signal: string) { console.log(JSON.stringify({ level: "info", message: "Haven API stopping", signal })); server.close((error) => { if (error) { console.error(error); process.exit(1); } process.exit(0); }); setTimeout(() => process.exit(1), 10_000).unref(); }
process.on("SIGINT", () => shutdown("SIGINT")); process.on("SIGTERM", () => shutdown("SIGTERM"));
