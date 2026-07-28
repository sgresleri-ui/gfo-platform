-- CreateTable
CREATE TABLE "InvestmentRecommendationPlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourcePropertyCode" TEXT NOT NULL DEFAULT 'PROPERTY_EL_TORO',
    "recommendationSnapshotId" TEXT NOT NULL,
    "selectedScenario" TEXT NOT NULL DEFAULT 'BASE',
    "tranchePercentagesJson" TEXT NOT NULL DEFAULT '[]',
    "fundingAccount" TEXT,
    "executionBroker" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentRecommendationPlan_sourcePropertyCode_key"
ON "InvestmentRecommendationPlan"("sourcePropertyCode");

-- CreateIndex
CREATE INDEX "InvestmentRecommendationPlan_recommendationSnapshotId_idx"
ON "InvestmentRecommendationPlan"("recommendationSnapshotId");

-- CreateIndex
CREATE INDEX "InvestmentRecommendationPlan_status_idx"
ON "InvestmentRecommendationPlan"("status");
