import assert from "node:assert/strict";
import test from "node:test";
import { analyzeSafety, combineWithAi } from "../src/analysis/safety-rules.ts";

test("safety track has a medium human-review floor", () => { const result = analyzeSafety("Someone keeps contacting me and I need advice.", "safety"); assert.equal(result.rulesUrgency, "medium"); assert.equal(result.needsHumanReview, true); });
test("critical English danger phrases override the track floor", () => { const result = analyzeSafety("He has a gun and is attacking me now", "safety"); assert.equal(result.rulesUrgency, "critical"); assert.ok(result.dangerFlags.includes("weapon")); assert.ok(result.dangerFlags.includes("immediate_attack")); });
test("Urdu and Sindhi danger phrases are recognized", () => { assert.equal(analyzeSafety("مجھے دھمکی دی گئی ہے", "safety").rulesUrgency, "high"); assert.equal(analyzeSafety("مون کي ڌمڪي ڏني وئي", "safety").rulesUrgency, "high"); });
test("configured civic hazards are raised", () => { const result = analyzeSafety("There is a live wire beside the road", "civic"); assert.equal(result.rulesUrgency, "high"); assert.ok(result.dangerFlags.includes("civic_hazard")); });
test("AI can raise but never lower rule urgency", () => { assert.equal(combineWithAi("high", "low"), "high"); assert.equal(combineWithAi("medium", "critical"), "critical"); assert.equal(combineWithAi("critical", null), "critical"); });
