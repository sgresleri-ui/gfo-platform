CREATE TABLE "InvestmentDecisionPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourcePropertyCode" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "recommendationSnapshotId" TEXT NOT NULL,
    "entryPlanUpdatedAt" DATETIME NOT NULL,
    "dueDiligenceUpdatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY_FOR_PROFESSIONAL_REVIEW',
    "fiscalStatus" TEXT NOT NULL DEFAULT 'NEEDS_VALIDATION',
    "executionStatus" TEXT NOT NULL DEFAULT 'BLOCKED',
    "payloadJson" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "decisionLogId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "InvestmentDecisionPackage_checksum_key"
ON "InvestmentDecisionPackage"("checksum");

CREATE UNIQUE INDEX "InvestmentDecisionPackage_decisionLogId_key"
ON "InvestmentDecisionPackage"("decisionLogId");

CREATE UNIQUE INDEX "InvestmentDecisionPackage_sourcePropertyCode_version_key"
ON "InvestmentDecisionPackage"("sourcePropertyCode", "version");

CREATE INDEX "InvestmentDecisionPackage_sourcePropertyCode_createdAt_idx"
ON "InvestmentDecisionPackage"("sourcePropertyCode", "createdAt");

CREATE INDEX "InvestmentDecisionPackage_recommendationSnapshotId_idx"
ON "InvestmentDecisionPackage"("recommendationSnapshotId");

CREATE INDEX "InvestmentDecisionPackage_status_idx"
ON "InvestmentDecisionPackage"("status");
