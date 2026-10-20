import assert from "node:assert/strict";
import test from "node:test";
import { analyzeWithOptionalAi } from "../src/analysis/ai-analysis.ts";
import { generateCaseGuidance } from "../src/analysis/case-guidance.ts";
import { createCasePdf } from "../src/files/pdf.ts";
import { uploadRequestInput } from "../src/files/schemas.ts";

test("missing optional AI uses a high-priority human-review fallback", async () => {
  const result = await analyzeWithOptionalAi({ text: "A street light has failed near the university gate.", language: "en", selectedCategory: "street_light", allowedCategories: ["street_light"], rulesUrgency: "low", dangerFlags: [] }, { model: "unused", timeoutMs: 1000 });
  assert.equal(result.failed, true); assert.equal(result.finalUrgency, "high"); assert.equal(result.errorCode, "not_configured");
});

test("case guidance has short useful steps even when Gemini is unavailable", async () => {
  const result = await generateCaseGuidance({ complaintText: "A street light is broken near the university gate.", summary: null, language: "en", track: "civic", category: "Street light" }, { model: "unused", timeoutMs: 1000 });
  assert.equal(result.generatedBy, "api_fallback");
  assert.ok(result.immediateSteps.length >= 2);
  assert.ok(result.nextSteps.length >= 2);
  assert.ok(result.usefulInformation.length >= 2);
  assert.ok(result.evidenceChecklist.length >= 2);
});

test("upload validation rejects unsupported files and oversized evidence", () => {
  assert.equal(uploadRequestInput.safeParse({ fileName: "proof.exe", mimeType: "application/x-msdownload", sizeBytes: 20, kind: "other" }).success, false);
  assert.equal(uploadRequestInput.safeParse({ fileName: "proof.jpg", mimeType: "image/jpeg", sizeBytes: 60_000_000, kind: "image" }).success, false);
});

test("document generator creates a real PDF", async () => {
  const bytes = await createCasePdf({ title: "Evidence Checklist", caseNumber: 12, kind: "evidence_checklist", category: "Road damage", status: "submitted", submittedAt: "2026-01-01T00:00:00.000Z", statement: "There is a damaged section of road near the gate.", address: "University gate", attachmentNames: ["road.jpg"] });
  assert.equal(Buffer.from(bytes.slice(0, 4)).toString("ascii"), "%PDF"); assert.ok(bytes.length > 500);
});
