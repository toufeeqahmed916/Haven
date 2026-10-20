import { z } from "zod";

export const attachmentIdParams = z.object({ id: z.uuid() });
export const documentIdParams = z.object({ id: z.uuid() });
export const uploadRequestInput = z.object({
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "audio/mpeg", "audio/mp4", "audio/webm", "video/mp4", "video/webm"]),
  sizeBytes: z.number().int().min(1).max(52_428_800),
  kind: z.enum(["image", "video", "audio", "other"]),
});
export const uploadCompleteInput = uploadRequestInput.extend({ storagePath: z.string().min(10).max(500) });
export const documentInput = z.object({ kind: z.enum(["complaint_application", "evidence_checklist", "civic_application", "fir_draft"]) });
