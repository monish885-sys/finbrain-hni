-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "totalNetWorthInr" REAL NOT NULL DEFAULT 0,
    "deltaTodayInr" REAL NOT NULL DEFAULT 0,
    "deltaMonthInr" REAL NOT NULL DEFAULT 0,
    "taxSavedYtdInr" REAL NOT NULL DEFAULT 0,
    "heldAwayPct" REAL NOT NULL DEFAULT 0,
    "primaryBank" TEXT NOT NULL DEFAULT '',
    "lastSync" DATETIME,
    "nomineeGaps" INTEGER NOT NULL DEFAULT 0,
    "equityPct" REAL NOT NULL DEFAULT 0,
    "debtPct" REAL NOT NULL DEFAULT 0,
    "rePct" REAL NOT NULL DEFAULT 0,
    "altsPct" REAL NOT NULL DEFAULT 0,
    "cashPct" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    CONSTRAINT "FamilyMember_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FamilyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "panMasked" TEXT NOT NULL,
    "netWorthInr" REAL NOT NULL DEFAULT 0,
    "role" TEXT,
    CONSTRAINT "Person_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LegalEntity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "panMasked" TEXT NOT NULL,
    "netWorthInr" REAL NOT NULL DEFAULT 0,
    "kartaId" TEXT,
    CONSTRAINT "LegalEntity_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "custodian" TEXT NOT NULL,
    "heldByEntityId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "currentValueInr" REAL NOT NULL,
    "costBasisInr" REAL NOT NULL,
    "gainLossInr" REAL NOT NULL,
    "gainType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    CONSTRAINT "Asset_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "buyDate" TEXT NOT NULL,
    "buyPriceInr" REAL NOT NULL,
    "currentPriceInr" REAL NOT NULL,
    "gainLossInr" REAL NOT NULL,
    "gainType" TEXT NOT NULL,
    CONSTRAINT "AssetLot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AaConsent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tsp" TEXT NOT NULL DEFAULT 'simulated',
    "fipTypes" TEXT NOT NULL,
    "consentRef" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "AaConsent_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "fy" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "lotRef" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "buyDate" TEXT NOT NULL,
    "buyPriceInr" REAL NOT NULL,
    "currentPriceInr" REAL NOT NULL,
    "costInr" REAL NOT NULL,
    "marketValueInr" REAL NOT NULL,
    "gainLossInr" REAL NOT NULL,
    "gainType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "custodian" TEXT NOT NULL,
    "heldByEntityId" TEXT NOT NULL,
    CONSTRAINT "TaxLot_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FirewallMeta" (
    "familyId" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'clean',
    "lastScan" DATETIME,
    "aisEntriesChecked" INTEGER NOT NULL DEFAULT 0,
    "matched" INTEGER NOT NULL DEFAULT 0,
    "needsAttention" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "FirewallMeta_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FirewallMismatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountInr" REAL NOT NULL,
    "institution" TEXT NOT NULL,
    "suggestedFix" TEXT NOT NULL,
    "aisReference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FirewallMismatch_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActionCardRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "savingsInr" REAL NOT NULL DEFAULT 0,
    "deadline" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "details" TEXT,
    "mismatchId" TEXT,
    "taxWithoutActionInr" REAL,
    "taxWithActionInr" REAL,
    "instructionsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActionCardRecord_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Nominee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "accountLabel" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "hasNominee" BOOLEAN NOT NULL DEFAULT false,
    "nomineeName" TEXT,
    "notes" TEXT,
    CONSTRAINT "Nominee_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "metaJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_familyId_userId_key" ON "FamilyMember"("familyId", "userId");

-- CreateIndex
CREATE INDEX "TaxLot_familyId_fy_idx" ON "TaxLot"("familyId", "fy");
