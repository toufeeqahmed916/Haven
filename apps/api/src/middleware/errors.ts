import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError, validationDetails } from "../lib/errors.ts";
export const notFound: RequestHandler = (request, _response, next) => next(new AppError(404, "ROUTE_NOT_FOUND", `No API route matches ${request.method} ${request.path}.`));
export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, _next) => {
  let appError: AppError;
  if (error instanceof AppError) appError = error;
  else if (error instanceof ZodError) appError = new AppError(400, "VALIDATION_ERROR", "The request data is invalid.", validationDetails(error));
  else if (error instanceof SyntaxError && "type" in error && error.type === "entity.parse.failed") appError = new AppError(400, "INVALID_JSON", "The request body is not valid JSON.");
  else appError = new AppError(500, "INTERNAL_ERROR", "An unexpected server error occurred.");
  if (appError.status >= 500) console.error(JSON.stringify({ level: "error", requestId: request.requestId, message: error instanceof Error ? error.message : "Unknown error" }));
  response.status(appError.status).json({ error: { code: appError.code, message: appError.message, ...(appError.details ? { details: appError.details } : {}) }, requestId: request.requestId });
};
