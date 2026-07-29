export type ExecutionEvidenceLike = {
  observedAt: string | null;
  venue: string | null;
  bid: number | null;
  ask: number | null;
  referenceOrderAmount: number | null;
  commissionAmount: number | null;
  regularSession: boolean;
};

export function executionEvidenceMissingFields(
  evidence: ExecutionEvidenceLike,
): string[] {
  const missing: string[] = [];

  if (!evidence.observedAt) {
    missing.push("data e ora");
  }

  if (!evidence.venue?.trim()) {
    missing.push("mercato");
  }

  if (evidence.bid === null || evidence.bid <= 0) {
    missing.push("bid");
  }

  if (
    evidence.ask === null ||
    evidence.ask <= 0 ||
    (evidence.bid !== null && evidence.ask < evidence.bid)
  ) {
    missing.push("ask");
  }

  if (
    evidence.referenceOrderAmount === null ||
    evidence.referenceOrderAmount <= 0
  ) {
    missing.push("ordine simulato");
  }

  if (
    evidence.commissionAmount === null ||
    evidence.commissionAmount < 0
  ) {
    missing.push("commissione");
  }

  if (!evidence.regularSession) {
    missing.push("sessione regolare");
  }

  return missing;
}

export function isExecutionEvidenceComplete(
  evidence: ExecutionEvidenceLike,
): boolean {
  return executionEvidenceMissingFields(evidence).length === 0;
}
