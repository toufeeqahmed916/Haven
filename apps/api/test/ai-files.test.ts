import assert from "node:assert/strict";
import test from "node:test";
import { analyzeWithOptionalAi, prepareVoiceIntake } from "../src/analysis/ai-analysis.ts";
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

test("voice intake converts Gemini audio output into a complaint draft", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ transcript: "یونیورسٹی گیٹ کے پاس ایک شخص میرا پیچھا کر رہا ہے۔", complaintText: "A person is following me near the university gate and I need help.", language: "ur", categoryCode: "street_harassment", addressText: "University Gate", incidentAt: "2026-10-26T17:00:00+05:00", privacyPreference: "anonymous" }) }] } }] }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const result = await prepareVoiceIntake({ bytes: new Uint8Array([1, 2, 3]), mimeType: "audio/webm", allowedCategories: [{ code: "street_harassment", nameEn: "Street harassment", nameUr: "سڑک پر ہراسانی" }] }, { apiKey: "test-key", model: "test-model", timeoutMs: 1000 });
    assert.equal(result.language, "ur");
    assert.equal(result.complaintText, "A person is following me near the university gate and I need help.");
    assert.equal(result.categoryCode, "street_harassment");
    assert.equal(result.addressText, "University Gate");
    assert.equal(result.incidentAt, "2026-10-26T12:00:00.000Z");
    assert.equal(result.isAnonymous, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
