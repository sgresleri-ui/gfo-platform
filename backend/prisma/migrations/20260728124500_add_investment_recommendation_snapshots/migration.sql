CREATE TABLE "InvestmentRecommendationSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourcePropertyCode" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "investibleCapital" REAL NOT NULL,
    "dataCoveragePercentage" REAL NOT NULL,
    "marketContextAsOf" DATETIME NOT NULL,
    "marketRegime" TEXT NOT NULL,
    "marketContextJson" TEXT NOT NULL,
    "currentAllocationJson" TEXT NOT NULL,
    "proposedAllocationJson" TEXT NOT NULL,
    "instrumentsJson" TEXT NOT NULL,
    "tranchesJson" TEXT NOT NULL,
    "warningsJson" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "InvestmentRecommendationSnapshot_sourcePropertyCode_generatedAt_idx"
ON "InvestmentRecommendationSnapshot"("sourcePropertyCode", "generatedAt");

CREATE INDEX "InvestmentRecommendationSnapshot_status_idx"
ON "InvestmentRecommendationSnapshot"("status");
