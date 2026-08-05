-- CreateTable
CREATE TABLE "BrokerConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "externalUserId" TEXT,
    "accessTokenEnc" TEXT,
    "extendedTokenEnc" TEXT,
    "tokenExpiresAt" DATETIME,
    "oauthState" TEXT,
    "lastSyncAt" DATETIME,
    "lastError" TEXT,
    "metaJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BrokerConnection_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BrokerConnection_familyId_provider_key" ON "BrokerConnection"("familyId", "provider");

-- CreateIndex
CREATE INDEX "BrokerConnection_status_idx" ON "BrokerConnection"("status");
