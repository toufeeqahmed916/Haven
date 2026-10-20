import assert from "node:assert/strict";
import test from "node:test";
import { adminActionInput, complaintInput, reopenInput } from "../src/complaints/schemas.ts";

test("complaints require paired coordinates", () => {
  const parsed = complaintInput.safeParse({ categoryCode: "street_light", text: "The light has been broken for several nights.", latitude: 24.86 });
  assert.equal(parsed.success, false);
});

test("reject and reopen commands require a meaningful reason", () => {
  assert.equal(adminActionInput.safeParse({ action: "reject", reason: "no" }).success, false);
  assert.equal(reopenInput.safeParse({ reason: "too short" }).success, false);
});

test("assignment commands require a valid team and ETA", () => {
  assert.equal(adminActionInput.safeParse({ action: "assign", teamId: "not-a-uuid", etaMinutes: 0 }).success, false);
  assert.equal(adminActionInput.safeParse({ action: "assign", teamId: "550e8400-e29b-41d4-a716-446655440000", etaMinutes: 30 }).success, true);
});
