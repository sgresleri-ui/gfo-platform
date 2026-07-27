-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlatformSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "householdName" TEXT NOT NULL DEFAULT 'Family Office – Stefano Gresleri',
    "ownerName" TEXT NOT NULL DEFAULT 'Stefano Gresleri',
    "baseCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "fiscalResidence" TEXT NOT NULL DEFAULT 'Spain',
    "plannedFiscalResidence" TEXT NOT NULL DEFAULT 'United Arab Emirates',
    "sourceWorkbook" TEXT NOT NULL DEFAULT 'Gresleri2026.xlsm',
    "dataFolder" TEXT NOT NULL DEFAULT '/data',
    "automaticRefresh" BOOLEAN NOT NULL DEFAULT true,
    "showArchivedPositions" BOOLEAN NOT NULL DEFAULT false,
    "requireDecisionNotes" BOOLEAN NOT NULL DEFAULT true,
    "estimatedTaxReserve" REAL NOT NULL DEFAULT 0,
    "futureSaleCosts" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PlatformSetting" ("automaticRefresh", "baseCurrency", "createdAt", "dataFolder", "fiscalResidence", "householdName", "id", "ownerName", "plannedFiscalResidence", "requireDecisionNotes", "showArchivedPositions", "sourceWorkbook", "timezone", "updatedAt") SELECT "automaticRefresh", "baseCurrency", "createdAt", "dataFolder", "fiscalResidence", "householdName", "id", "ownerName", "plannedFiscalResidence", "requireDecisionNotes", "showArchivedPositions", "sourceWorkbook", "timezone", "updatedAt" FROM "PlatformSetting";
DROP TABLE "PlatformSetting";
ALTER TABLE "new_PlatformSetting" RENAME TO "PlatformSetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
