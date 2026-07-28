CREATE TABLE "InvestmentDueDiligencePlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "sourcePropertyCode" TEXT NOT NULL DEFAULT 'PROPERTY_EL_TORO',
    "recommendationSnapshotId" TEXT NOT NULL,
    "reviewsJson" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT_SELECTION',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "InvestmentDueDiligencePlan_sourcePropertyCode_key"
ON "InvestmentDueDiligencePlan"("sourcePropertyCode");

CREATE INDEX "InvestmentDueDiligencePlan_recommendationSnapshotId_idx"
ON "InvestmentDueDiligencePlan"("recommendationSnapshotId");

CREATE INDEX "InvestmentDueDiligencePlan_status_idx"
ON "InvestmentDueDiligencePlan"("status");
