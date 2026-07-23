-- CreateTable
CREATE TABLE "PlanningScenarioActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" INTEGER NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "scenarioName" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detailsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanningScenarioActivity_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlanningScenarioActivity_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "PlanningScenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlanningScenarioActivity_householdId_createdAt_idx" ON "PlanningScenarioActivity"("householdId", "createdAt");

-- CreateIndex
CREATE INDEX "PlanningScenarioActivity_scenarioId_createdAt_idx" ON "PlanningScenarioActivity"("scenarioId", "createdAt");

-- CreateIndex
CREATE INDEX "PlanningScenarioActivity_action_idx" ON "PlanningScenarioActivity"("action");
