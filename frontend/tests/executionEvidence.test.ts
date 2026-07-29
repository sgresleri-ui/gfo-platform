import assert from "node:assert/strict";
import test from "node:test";

import { isExecutionEvidenceComplete } from "../src/utils/executionEvidence.ts";

const completeEvidence = {
  observedAt: "2026-07-29T10:00:00.000Z",
  venue: "MILANO",
  bid: 149.77,
  ask: 149.7703,
  referenceOrderAmount: 70_016.43,
  commissionAmount: 0,
  regularSession: true,
};

test("considera completa una simulazione con commissione zero", () => {
  assert.equal(
    isExecutionEvidenceComplete(completeEvidence),
    true,
  );
});

test("richiede una sessione regolare e un mercato non vuoto", () => {
  assert.equal(
    isExecutionEvidenceComplete({
      ...completeEvidence,
      regularSession: false,
    }),
    false,
  );
  assert.equal(
    isExecutionEvidenceComplete({
      ...completeEvidence,
      venue: "   ",
    }),
    false,
  );
});
