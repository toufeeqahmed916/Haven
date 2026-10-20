import { z } from "zod";

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) { super(message); this.name = "AppError"; this.status = status; this.code = code; this.details = details; }
}
export function validationDetails(error: z.ZodError) { return error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })); }
