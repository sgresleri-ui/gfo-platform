-- CreateTable
CREATE TABLE "ExecutiveReportSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" INTEGER NOT NULL,
    "reportType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL,
    "completenessPercentage" REAL NOT NULL,
    "totalSections" INTEGER NOT NULL,
    "availableSections" INTEGER NOT NULL,
    "unavailableSections" INTEGER NOT NULL,
    "netWorth" DECIMAL,
    "grossAssets" DECIMAL,
    "liabilities" DECIMAL,
    "liquidity" DECIMAL,
    "investments" DECIMAL,
    "realEstate" DECIMAL,
    "otherAssets" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "payloadJson" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'REPORTING_ENGINE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExecutiveReportSnapshot_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ExecutiveReportSnapshot_checksum_key" ON "ExecutiveReportSnapshot"("checksum");

-- CreateIndex
CREATE INDEX "ExecutiveReportSnapshot_householdId_createdAt_idx" ON "ExecutiveReportSnapshot"("householdId", "createdAt");

-- CreateIndex
CREATE INDEX "ExecutiveReportSnapshot_generatedAt_idx" ON "ExecutiveReportSnapshot"("generatedAt");

-- CreateIndex
CREATE INDEX "ExecutiveReportSnapshot_status_idx" ON "ExecutiveReportSnapshot"("status");

-- CreateIndex
CREATE INDEX "ExecutiveReportSnapshot_reportType_idx" ON "ExecutiveReportSnapshot"("reportType");
