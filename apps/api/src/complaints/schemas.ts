import { z } from "zod";

export const complaintIdParams = z.object({ id: z.uuid() });
const locationFields = { latitude: z.number().min(-90).max(90).nullable().optional(), longitude: z.number().min(-180).max(180).nullable().optional() };
const complaintFields = z.object({
  categoryCode: z.string().regex(/^[a-z0-9_]+$/),
  text: z.string().trim().min(10).max(10000),
  language: z.enum(["en", "ur", "sd"]).default("en"),
  isAnonymous: z.boolean().default(false),
  ...locationFields,
  addressText: z.string().trim().max(500).nullable().optional(),
  incidentAt: z.iso.datetime({ offset: true }).nullable().optional(),
  submit: z.boolean().default(true),
});
function locationPair(value: { latitude?: number | null; longitude?: number | null }, context: z.RefinementCtx) { if ((value.latitude == null) !== (value.longitude == null)) context.addIssue({ code: "custom", message: "Latitude and longitude must be provided together.", path: ["latitude"] }); }
export const complaintInput = complaintFields.superRefine(locationPair);
export const draftInput = complaintFields.omit({ submit: true }).superRefine(locationPair);
export const reopenInput = z.object({ reason: z.string().trim().min(10).max(2000) });
export const appealInput = z.object({ reason: z.string().trim().min(10).max(2000) });
export const adminActionInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept"), reason: z.string().trim().max(2000).optional().default("") }),
  z.object({ action: z.literal("request_info"), reason: z.string().trim().min(5).max(2000) }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(10).max(2000) }),
  z.object({ action: z.literal("assign"), teamId: z.uuid(), etaMinutes: z.number().int().min(1).max(1440), reason: z.string().trim().max(2000).optional().default("") }),
]);
export const statusInput = z.object({ status: z.enum(["under_review", "on_the_way", "arrived", "closed"]), note: z.string().trim().min(3).max(2000), visibleToCitizen: z.boolean().default(true) });
