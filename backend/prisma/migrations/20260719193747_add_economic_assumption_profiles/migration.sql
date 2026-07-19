-- CreateTable
CREATE TABLE "EconomicAssumptionProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "fiscalResidence" TEXT NOT NULL DEFAULT 'Spain',
    "liquidityReturnDeltaPct" REAL NOT NULL DEFAULT 0,
    "investmentsReturnDeltaPct" REAL NOT NULL DEFAULT 0,
    "realEstateReturnDeltaPct" REAL NOT NULL DEFAULT 0,
    "otherAssetsReturnDeltaPct" REAL NOT NULL DEFAULT 0,
    "liquidityTaxRatePct" REAL NOT NULL DEFAULT 0,
    "investmentsTaxRatePct" REAL NOT NULL DEFAULT 0,
    "rebalancingCostRatePct" REAL NOT NULL DEFAULT 0,
    "rebalancingMinimumCost" REAL NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "EconomicAssumptionProfile_code_key" ON "EconomicAssumptionProfile"("code");

-- CreateIndex
CREATE INDEX "EconomicAssumptionProfile_fiscalResidence_idx" ON "EconomicAssumptionProfile"("fiscalResidence");

-- CreateIndex
CREATE INDEX "EconomicAssumptionProfile_isDefault_idx" ON "EconomicAssumptionProfile"("isDefault");

-- CreateIndex
CREATE INDEX "EconomicAssumptionProfile_isArchived_idx" ON "EconomicAssumptionProfile"("isArchived");
