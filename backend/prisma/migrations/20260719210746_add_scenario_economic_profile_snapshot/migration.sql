-- AlterTable
ALTER TABLE "PlanningScenario" ADD COLUMN "economicProfileCode" TEXT;
ALTER TABLE "PlanningScenario" ADD COLUMN "economicProfileId" TEXT;
ALTER TABLE "PlanningScenario" ADD COLUMN "economicProfileName" TEXT;
ALTER TABLE "PlanningScenario" ADD COLUMN "economicProfileSnapshotJson" TEXT;

-- CreateIndex
CREATE INDEX "PlanningScenario_economicProfileId_idx" ON "PlanningScenario"("economicProfileId");
