-- CreateTable
CREATE TABLE "DocumentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "issuer" TEXT,
    "country" TEXT,
    "documentNumber" TEXT,
    "issueDate" DATETIME,
    "expiryDate" DATETIME,
    "fileName" TEXT,
    "filePath" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "checksum" TEXT,
    "confidentiality" TEXT NOT NULL DEFAULT 'PRIVATE',
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentRecord_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL DEFAULT 'SUPPORTING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DocumentRecord_householdId_category_idx" ON "DocumentRecord"("householdId", "category");

-- CreateIndex
CREATE INDEX "DocumentRecord_status_idx" ON "DocumentRecord"("status");

-- CreateIndex
CREATE INDEX "DocumentRecord_expiryDate_idx" ON "DocumentRecord"("expiryDate");

-- CreateIndex
CREATE INDEX "DocumentRecord_country_idx" ON "DocumentRecord"("country");

-- CreateIndex
CREATE INDEX "DocumentRecord_checksum_idx" ON "DocumentRecord"("checksum");

-- CreateIndex
CREATE INDEX "DocumentLink_entityType_entityId_idx" ON "DocumentLink"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentLink_documentId_entityType_entityId_key" ON "DocumentLink"("documentId", "entityType", "entityId");
