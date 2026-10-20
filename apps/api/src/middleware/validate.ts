import type { RequestHandler } from "express";
import type { z } from "zod";
import { AppError, validationDetails } from "../lib/errors.ts";

function validationError(message: string, error: z.ZodError) { return new AppError(400, "VALIDATION_ERROR", message, validationDetails(error)); }
export function validateParams(schema: z.ZodType): RequestHandler { return (request, _response, next) => { const result = schema.safeParse(request.params); if (!result.success) return next(validationError("The route parameters are invalid.", result.error)); request.params = result.data as typeof request.params; next(); }; }
export function validateBody(schema: z.ZodType): RequestHandler { return (request, _response, next) => { const result = schema.safeParse(request.body); if (!result.success) return next(validationError("The request body is invalid.", result.error)); request.body = result.data; next(); }; }
