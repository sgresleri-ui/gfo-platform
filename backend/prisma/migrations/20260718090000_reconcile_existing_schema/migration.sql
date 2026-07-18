-- CreateTable
CREATE TABLE "WealthPosition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "country" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "nativeAmount" DECIMAL,
    "fxRateToBase" DECIMAL,
    "valueBase" DECIMAL NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "isLiability" BOOLEAN NOT NULL DEFAULT false,
    "valuationDate" DATETIME NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WealthPosition_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DecisionLogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decisionDate" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "motivation" TEXT NOT NULL,
    "analysisText" TEXT NOT NULL,
    "alternativesJson" TEXT NOT NULL,
    "finalDecision" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "amount" REAL,
    "resultText" TEXT NOT NULL,
    "lessons" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "workbookModifiedAt" DATETIME,
    "status" TEXT NOT NULL,
    "sheetCount" INTEGER NOT NULL DEFAULT 0,
    "activePositions" INTEGER NOT NULL DEFAULT 0,
    "archivedPositions" INTEGER NOT NULL DEFAULT 0,
    "previewJson" TEXT NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "WealthSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceRunId" TEXT,
    "positionsJson" TEXT NOT NULL,
    "activePositions" INTEGER NOT NULL,
    "archivedPositions" INTEGER NOT NULL,
    "netValue" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restoredAt" DATETIME
);

-- CreateTable
CREATE TABLE "WealthTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" INTEGER NOT NULL,
    "positionId" INTEGER,
    "transactionDate" DATETIME NOT NULL,
    "transactionType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "quantity" DECIMAL,
    "unitPrice" DECIMAL,
    "grossAmount" DECIMAL NOT NULL,
    "fees" DECIMAL NOT NULL DEFAULT 0,
    "taxes" DECIMAL NOT NULL DEFAULT 0,
    "netAmount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "fxRateToBase" DECIMAL,
    "baseAmount" DECIMAL NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "sourceAccountCode" TEXT,
    "destinationAccountCode" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "externalReference" TEXT,
    "notes" TEXT,
    "voidedAt" DATETIME,
    "voidReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WealthTransaction_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WealthTransaction_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "WealthPosition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NetWorthSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" INTEGER NOT NULL,
    "snapshotDate" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "importRunId" TEXT,
    "dataHash" TEXT NOT NULL,
    "positionCount" INTEGER NOT NULL,
    "grossAssets" DECIMAL NOT NULL,
    "liabilities" DECIMAL NOT NULL,
    "netWorth" DECIMAL NOT NULL,
    "liquidity" DECIMAL NOT NULL,
    "investments" DECIMAL NOT NULL,
    "realEstate" DECIMAL NOT NULL,
    "otherAssets" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NetWorthSnapshot_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PositionValuation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "positionId" INTEGER NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "valuationDate" DATETIME NOT NULL,
    "sourceValuationDate" DATETIME,
    "nativeAmount" DECIMAL,
    "currency" TEXT NOT NULL,
    "fxRateToBase" DECIMAL,
    "valueBase" DECIMAL NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PositionValuation_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "WealthPosition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PositionValuation_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "NetWorthSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataQualityCorrection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "entityCode" TEXT,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'USER_CONFIRMED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "IpsPolicyLimit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PERCENT',
    "minimum" REAL,
    "maximum" REAL,
    "target" REAL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rationale" TEXT,
    "source" TEXT NOT NULL DEFAULT 'IPS_CONFIRMED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IpsPositionClassification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "positionId" INTEGER NOT NULL,
    "ipsAssetClass" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'USER_CONFIRMED',
    "rationale" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IpsPositionClassification_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "WealthPosition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IpsClassificationAudit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "positionId" INTEGER NOT NULL,
    "positionCode" TEXT NOT NULL,
    "oldClass" TEXT,
    "newClass" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'USER_CONFIRMED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IpsClassificationAudit_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "WealthPosition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IpsClassificationReview" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "positionId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'USER_CONFIRMED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IpsClassificationReview_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "WealthPosition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IpsClassificationReviewAudit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "positionId" INTEGER NOT NULL,
    "positionCode" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'USER_CONFIRMED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IpsClassificationReviewAudit_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "WealthPosition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OperationalTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "linkedDocumentsJson" TEXT NOT NULL DEFAULT '[]',
    "amount" REAL,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OperationalTask_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WealthPosition_code_key" ON "WealthPosition"("code");

-- CreateIndex
CREATE INDEX "WealthPosition_householdId_category_idx" ON "WealthPosition"("householdId", "category");

-- CreateIndex
CREATE INDEX "WealthPosition_valuationDate_idx" ON "WealthPosition"("valuationDate");

-- CreateIndex
CREATE INDEX "DecisionLogEntry_decisionDate_idx" ON "DecisionLogEntry"("decisionDate");

-- CreateIndex
CREATE INDEX "DecisionLogEntry_status_idx" ON "DecisionLogEntry"("status");

-- CreateIndex
CREATE INDEX "DecisionLogEntry_priority_idx" ON "DecisionLogEntry"("priority");

-- CreateIndex
CREATE INDEX "ImportRun_fileHash_idx" ON "ImportRun"("fileHash");

-- CreateIndex
CREATE INDEX "ImportRun_status_idx" ON "ImportRun"("status");

-- CreateIndex
CREATE INDEX "ImportRun_createdAt_idx" ON "ImportRun"("createdAt");

-- CreateIndex
CREATE INDEX "WealthSnapshot_sourceRunId_idx" ON "WealthSnapshot"("sourceRunId");

-- CreateIndex
CREATE INDEX "WealthSnapshot_createdAt_idx" ON "WealthSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "WealthTransaction_householdId_transactionDate_idx" ON "WealthTransaction"("householdId", "transactionDate");

-- CreateIndex
CREATE INDEX "WealthTransaction_positionId_transactionDate_idx" ON "WealthTransaction"("positionId", "transactionDate");

-- CreateIndex
CREATE INDEX "WealthTransaction_transactionType_idx" ON "WealthTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "WealthTransaction_externalReference_idx" ON "WealthTransaction"("externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "NetWorthSnapshot_dataHash_key" ON "NetWorthSnapshot"("dataHash");

-- CreateIndex
CREATE INDEX "NetWorthSnapshot_householdId_snapshotDate_idx" ON "NetWorthSnapshot"("householdId", "snapshotDate");

-- CreateIndex
CREATE INDEX "NetWorthSnapshot_snapshotDate_idx" ON "NetWorthSnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "NetWorthSnapshot_importRunId_idx" ON "NetWorthSnapshot"("importRunId");

-- CreateIndex
CREATE INDEX "PositionValuation_positionId_valuationDate_idx" ON "PositionValuation"("positionId", "valuationDate");

-- CreateIndex
CREATE INDEX "PositionValuation_snapshotId_idx" ON "PositionValuation"("snapshotId");

-- CreateIndex
CREATE INDEX "PositionValuation_valuationDate_idx" ON "PositionValuation"("valuationDate");

-- CreateIndex
CREATE UNIQUE INDEX "PositionValuation_positionId_snapshotId_key" ON "PositionValuation"("positionId", "snapshotId");

-- CreateIndex
CREATE INDEX "DataQualityCorrection_entityType_entityId_idx" ON "DataQualityCorrection"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "DataQualityCorrection_fieldName_createdAt_idx" ON "DataQualityCorrection"("fieldName", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IpsPolicyLimit_code_key" ON "IpsPolicyLimit"("code");

-- CreateIndex
CREATE INDEX "IpsPolicyLimit_dimension_enabled_idx" ON "IpsPolicyLimit"("dimension", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "IpsPositionClassification_positionId_key" ON "IpsPositionClassification"("positionId");

-- CreateIndex
CREATE INDEX "IpsPositionClassification_ipsAssetClass_idx" ON "IpsPositionClassification"("ipsAssetClass");

-- CreateIndex
CREATE INDEX "IpsClassificationAudit_positionId_createdAt_idx" ON "IpsClassificationAudit"("positionId", "createdAt");

-- CreateIndex
CREATE INDEX "IpsClassificationAudit_newClass_idx" ON "IpsClassificationAudit"("newClass");

-- CreateIndex
CREATE UNIQUE INDEX "IpsClassificationReview_positionId_key" ON "IpsClassificationReview"("positionId");

-- CreateIndex
CREATE INDEX "IpsClassificationReview_status_idx" ON "IpsClassificationReview"("status");

-- CreateIndex
CREATE INDEX "IpsClassificationReviewAudit_positionId_createdAt_idx" ON "IpsClassificationReviewAudit"("positionId", "createdAt");

-- CreateIndex
CREATE INDEX "IpsClassificationReviewAudit_newStatus_idx" ON "IpsClassificationReviewAudit"("newStatus");

-- CreateIndex
CREATE INDEX "OperationalTask_householdId_dueDate_idx" ON "OperationalTask"("householdId", "dueDate");

-- CreateIndex
CREATE INDEX "OperationalTask_status_idx" ON "OperationalTask"("status");

-- CreateIndex
CREATE INDEX "OperationalTask_priority_idx" ON "OperationalTask"("priority");

-- CreateIndex
CREATE INDEX "OperationalTask_category_idx" ON "OperationalTask"("category");

