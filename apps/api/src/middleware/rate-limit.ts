import type { RequestHandler } from "express";
import { AppError } from "../lib/errors.ts";

type Entry = { count: number; resetAt: number };

export function createRateLimiter(options: { windowMs: number; limit: number; name: string }): RequestHandler {
  const entries = new Map<string, Entry>(); let requests = 0;
  return (request, response, next) => {
    const now = Date.now(); const key = `${options.name}:${request.ip || request.socket.remoteAddress || "unknown"}`;
    let entry = entries.get(key); if (!entry || entry.resetAt <= now) { entry = { count: 0, resetAt: now + options.windowMs }; entries.set(key, entry); }
    entry.count += 1; requests += 1;
    const remaining = Math.max(0, options.limit - entry.count); const resetSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    response.setHeader("RateLimit-Limit", String(options.limit)); response.setHeader("RateLimit-Remaining", String(remaining)); response.setHeader("RateLimit-Reset", String(resetSeconds));
    if (requests % 500 === 0) for (const [entryKey, value] of entries) if (value.resetAt <= now) entries.delete(entryKey);
    if (entry.count > options.limit) { response.setHeader("Retry-After", String(resetSeconds)); return next(new AppError(429, "RATE_LIMITED", "Too many requests. Wait briefly and try again.")); }
    next();
  };
}
