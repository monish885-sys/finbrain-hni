-- CreateTable
CREATE TABLE "BrainsetRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'demo',
    "financialYear" TEXT NOT NULL,
    "portfolioJson" TEXT NOT NULL,
    "calendarJson" TEXT NOT NULL DEFAULT '[]',
    "openDayPlanIds" TEXT NOT NULL DEFAULT '[]',
    "caPrefsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BrainsetRecord_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DayPlanRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "brainsetId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "asOfDate" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "toolTracesJson" TEXT NOT NULL DEFAULT '[]',
    "citationsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DayPlanRecord_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConversationAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "userId" TEXT,
    "familyId" TEXT,
    "intent" TEXT NOT NULL,
    "refused" BOOLEAN NOT NULL DEFAULT false,
    "escalateToCa" BOOLEAN NOT NULL DEFAULT false,
    "queryHash" TEXT NOT NULL,
    "metaJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CorpusChunkRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "topicsJson" TEXT NOT NULL DEFAULT '[]',
    "documentPath" TEXT NOT NULL,
    "vectorJson" TEXT NOT NULL DEFAULT '[]',
    "license" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "BrainsetRecord_familyId_key" ON "BrainsetRecord"("familyId");

-- CreateIndex
CREATE INDEX "DayPlanRecord_familyId_status_idx" ON "DayPlanRecord"("familyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationAudit_requestId_key" ON "ConversationAudit"("requestId");

-- CreateIndex
CREATE INDEX "ConversationAudit_createdAt_idx" ON "ConversationAudit"("createdAt");
