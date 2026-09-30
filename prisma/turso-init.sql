-- ImpactLens schema for Turso/libSQL — Prisma Migrate cannot reach libsql:// URLs,
-- so the SQL is generated from schema.prisma and applied once with the Turso CLI:
--   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/turso-init.sql
--   turso db shell <db-name> < prisma/turso-init.sql
-- Regenerate this file whenever prisma/schema.prisma changes.

-- CreateTable
CREATE TABLE "Project" (
    "orgId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "region" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "sdgGoals" TEXT,
    "coverUrl" TEXT,
    "lat" REAL,
    "lng" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "orgId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'image',
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "format" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "bytes" INTEGER,
    "aiCaption" TEXT,
    "aiSummary" TEXT,
    "aiDescription" TEXT,
    "projectName" TEXT,
    "location" TEXT,
    "activity" TEXT,
    "category" TEXT,
    "signals" TEXT,
    "objects" TEXT,
    "tagsCsv" TEXT,
    "mood" TEXT,
    "confidence" REAL,
    "ocrText" TEXT,
    "qualityScore" REAL,
    "source" TEXT,
    "originalUrl" TEXT,
    "transformations" TEXT,
    "captureDate" DATETIME,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "analyzedAt" DATETIME,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT,
    "pairGroup" TEXT,
    "pairRole" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaAsset_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "orgId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'impact',
    "projectId" TEXT,
    "headline" TEXT,
    "summary" TEXT NOT NULL,
    "narrative" TEXT,
    "metrics" TEXT,
    "mediaIds" TEXT,
    "callToAction" TEXT,
    "tone" TEXT,
    "shareToken" TEXT,
    "shareNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "model" TEXT,
    "provider" TEXT,
    "durationMs" INTEGER NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "status" INTEGER,
    "error" TEXT,
    "userId" TEXT,
    "orgId" TEXT
);

-- CreateTable
CREATE TABLE "Comparison" (
    "orgId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "beforeId" TEXT NOT NULL,
    "afterId" TEXT NOT NULL,
    "projectId" TEXT,
    "narrative" TEXT,
    "changes" TEXT,
    "impactScore" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comparison_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "orgId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "label" TEXT,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "results" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedSearch_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetNote" (
    "orgId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetNote_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "inviteCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'impact',
    "tone" TEXT NOT NULL DEFAULT 'professional',
    "projectId" TEXT,
    "assetIds" TEXT,
    "audience" TEXT,
    "everyDays" INTEGER NOT NULL DEFAULT 7,
    "emailTo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReportSchedule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_orgId_idx" ON "Project"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_publicId_key" ON "MediaAsset"("publicId");

-- CreateIndex
CREATE INDEX "MediaAsset_projectId_idx" ON "MediaAsset"("projectId");

-- CreateIndex
CREATE INDEX "MediaAsset_category_idx" ON "MediaAsset"("category");

-- CreateIndex
CREATE INDEX "MediaAsset_pairGroup_idx" ON "MediaAsset"("pairGroup");

-- CreateIndex
CREATE INDEX "MediaAsset_orgId_idx" ON "MediaAsset"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_shareToken_key" ON "Report"("shareToken");

-- CreateIndex
CREATE INDEX "Report_orgId_idx" ON "Report"("orgId");

-- CreateIndex
CREATE INDEX "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLog_orgId_idx" ON "AiUsageLog"("orgId");

-- CreateIndex
CREATE INDEX "Comparison_orgId_idx" ON "Comparison"("orgId");

-- CreateIndex
CREATE INDEX "SavedSearch_orgId_idx" ON "SavedSearch"("orgId");

-- CreateIndex
CREATE INDEX "AssetNote_assetId_idx" ON "AssetNote"("assetId");

-- CreateIndex
CREATE INDEX "AssetNote_orgId_idx" ON "AssetNote"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_inviteCode_key" ON "Organization"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_orgId_key" ON "Membership"("userId", "orgId");

-- CreateIndex
CREATE INDEX "ReportSchedule_orgId_idx" ON "ReportSchedule"("orgId");

