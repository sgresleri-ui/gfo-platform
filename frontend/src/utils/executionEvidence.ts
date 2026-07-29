export type ExecutionEvidenceLike = {
  observedAt: string | null;
  venue: string | null;
  bid: number | null;
  ask: number | null;
  referenceOrderAmount: number | null;
  commissionAmount: number | null;
  regularSession: boolean;
};

export function isExecutionEvidenceComplete(
  evidence: ExecutionEvidenceLike,
): boolean {
  return Boolean(
    evidence.observedAt &&
      evidence.venue?.trim() &&
      evidence.bid !== null &&
      evidence.bid > 0 &&
      evidence.ask !== null &&
      evidence.ask >= evidence.bid &&
      evidence.referenceOrderAmount !== null &&
      evidence.referenceOrderAmount > 0 &&
      evidence.commissionAmount !== null &&
      evidence.commissionAmount >= 0 &&
      evidence.regularSession,
  );
}
