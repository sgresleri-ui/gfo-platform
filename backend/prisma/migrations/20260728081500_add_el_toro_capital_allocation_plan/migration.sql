CREATE TABLE "CapitalAllocationPlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "sourcePropertyCode" TEXT NOT NULL DEFAULT 'PROPERTY_EL_TORO',
    "dubaiHomeReserve" REAL NOT NULL DEFAULT 0,
    "familyTransitionReserve" REAL NOT NULL DEFAULT 0,
    "longTermCoreInvestment" REAL NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'DOCUMENTED_PLAN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "CapitalAllocationPlan_sourcePropertyCode_key"
ON "CapitalAllocationPlan"("sourcePropertyCode");
