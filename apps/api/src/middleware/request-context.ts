import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
export const requestContext: RequestHandler = (request, response, next) => { request.requestId = request.header("x-request-id")?.slice(0, 100) || randomUUID(); response.setHeader("x-request-id", request.requestId); next(); };
