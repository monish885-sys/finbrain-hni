-- AlterTable
ALTER TABLE "Family" ADD COLUMN "onboardingStatus" TEXT NOT NULL DEFAULT 'pending_profile';

-- AlterTable
ALTER TABLE "Person" ADD COLUMN "panLast4" TEXT;

-- CreateTable
CREATE TABLE "LinkedAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "custodian" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "label" TEXT,
    "balanceInr" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LinkedAccount_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LinkedAccount_familyId_source_idx" ON "LinkedAccount"("familyId", "source");
