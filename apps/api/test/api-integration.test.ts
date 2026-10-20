import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import { createApp } from "../src/app.ts";
import { normalizedReport } from "../src/routes/complaints.ts";

async function runningApi(limit = 50): Promise<{ baseUrl: string; server: Server }> {
  const app = createApp({ environment: "test", corsOrigins: ["http://allowed.test"], supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "public-test-key-with-enough-characters", rateLimitMax: limit });
  const server = createServer(app); await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Test server did not start");
  return { baseUrl: `http://127.0.0.1:${address.port}`, server };
}
async function close(server: Server) { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }

test("public API exposes health, security, CORS, and consistent 404 responses", async () => {
  const { baseUrl, server } = await runningApi();
  try {
    const health = await fetch(`${baseUrl}/health`, { headers: { origin: "http://allowed.test" } }); assert.equal(health.status, 200); assert.equal(health.headers.get("access-control-allow-origin"), "http://allowed.test"); assert.ok(health.headers.get("content-security-policy")); assert.ok(health.headers.get("ratelimit-limit"));
    const missing = await fetch(`${baseUrl}/missing`); const body = await missing.json() as { error: { code: string }; requestId: string }; assert.equal(missing.status, 404); assert.equal(body.error.code, "ROUTE_NOT_FOUND"); assert.ok(body.requestId);
  } finally { await close(server); }
});

test("invalid JSON is rejected and abusive traffic is rate limited", async () => {
  const { baseUrl, server } = await runningApi(2);
  try {
    const invalid = await fetch(`${baseUrl}/api/v1/complaints`, { method: "POST", headers: { "content-type": "application/json" }, body: "{" }); assert.equal(invalid.status, 400); assert.equal(((await invalid.json()) as { error: { code: string } }).error.code, "INVALID_JSON");
    await fetch(`${baseUrl}/health`); const limited = await fetch(`${baseUrl}/health`); assert.equal(limited.status, 429); assert.equal(((await limited.json()) as { error: { code: string } }).error.code, "RATE_LIMITED"); assert.ok(limited.headers.get("retry-after"));
  } finally { await close(server); }
});

test("duplicate normalization ignores case, punctuation, and repeated spaces", () => {
  assert.equal(normalizedReport("  Broken LIGHT!!! near gate  "), normalizedReport("broken light near   gate"));
});
