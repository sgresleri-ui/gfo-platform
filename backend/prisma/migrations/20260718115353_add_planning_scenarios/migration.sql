-- CreateTable
CREATE TABLE "PlanningScenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assumptionsJson" TEXT NOT NULL,
    "lastResultJson" TEXT,
    "baselineWorkbook" TEXT,
    "baselineAsOfDate" TEXT,
    "baselineStartYear" INTEGER,
    "baselineEndYear" INTEGER,
    "sustainabilityStatus" TEXT,
    "initialCapital" DECIMAL,
    "finalCapital" DECIMAL,
    "minimumCapital" DECIMAL,
    "minimumCapitalYear" INTEGER,
    "firstNegativeCapitalYear" INTEGER,
    "finalCapitalDelta" DECIMAL,
    "finalCapitalDeltaPct" REAL,
    "lastSimulatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlanningScenario_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlanningScenario_householdId_status_idx" ON "PlanningScenario"("householdId", "status");

-- CreateIndex
CREATE INDEX "PlanningScenario_householdId_updatedAt_idx" ON "PlanningScenario"("householdId", "updatedAt");

-- CreateIndex
CREATE INDEX "PlanningScenario_sustainabilityStatus_idx" ON "PlanningScenario"("sustainabilityStatus");
