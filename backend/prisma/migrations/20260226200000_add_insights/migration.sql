-- AI Insights module: all tables + enums (idempotent via DO $$ EXCEPTION)

-- ── Enums ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "InsightVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "InsightCategory" AS ENUM ('MACRO', 'TECH', 'CORP');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "InsightIcon" AS ENUM ('GLOBE', 'CHIP', 'BUILDING', 'NETWORK');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "InsightTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "InsightDirectionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "InsightAiAgentStatus" AS ENUM ('IDLE', 'WORKING', 'OFFLINE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "InsightResearchStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'ERROR');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── InsightTopic ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "InsightTopic" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "title"      TEXT NOT NULL,
  "subtitle"   TEXT,
  "category"   "InsightCategory"   NOT NULL DEFAULT 'MACRO',
  "visibility" "InsightVisibility" NOT NULL DEFAULT 'PRIVATE',
  "icon"       "InsightIcon"       NOT NULL DEFAULT 'GLOBE',
  "accent"     JSONB,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InsightTopic_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InsightTopic_userId_createdAt_idx" ON "InsightTopic"("userId", "createdAt");

ALTER TABLE "InsightTopic"
  DROP CONSTRAINT IF EXISTS "InsightTopic_userId_fkey";
ALTER TABLE "InsightTopic"
  ADD CONSTRAINT "InsightTopic_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- ── InsightResearchMember ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "InsightResearchMember" (
  "id"        TEXT NOT NULL,
  "topicId"   TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "role"      TEXT NOT NULL,
  "status"    TEXT NOT NULL DEFAULT 'active',
  "taskCount" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "InsightResearchMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InsightResearchMember_topicId_idx" ON "InsightResearchMember"("topicId");

ALTER TABLE "InsightResearchMember"
  DROP CONSTRAINT IF EXISTS "InsightResearchMember_topicId_fkey";
ALTER TABLE "InsightResearchMember"
  ADD CONSTRAINT "InsightResearchMember_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "InsightTopic"("id") ON DELETE CASCADE;

-- ── InsightAiAgent ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "InsightAiAgent" (
  "id"       TEXT NOT NULL,
  "topicId"  TEXT NOT NULL,
  "name"     TEXT NOT NULL,
  "role"     TEXT NOT NULL,
  "model"    TEXT NOT NULL,
  "status"   "InsightAiAgentStatus" NOT NULL DEFAULT 'IDLE',
  "isLeader" BOOLEAN NOT NULL DEFAULT false,
  "focus"    TEXT,

  CONSTRAINT "InsightAiAgent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InsightAiAgent_topicId_idx" ON "InsightAiAgent"("topicId");

ALTER TABLE "InsightAiAgent"
  DROP CONSTRAINT IF EXISTS "InsightAiAgent_topicId_fkey";
ALTER TABLE "InsightAiAgent"
  ADD CONSTRAINT "InsightAiAgent_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "InsightTopic"("id") ON DELETE CASCADE;

-- ── InsightDirection ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "InsightDirection" (
  "id"      TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "label"   TEXT NOT NULL,
  "status"  "InsightDirectionStatus" NOT NULL DEFAULT 'PENDING',

  CONSTRAINT "InsightDirection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InsightDirection_topicId_idx" ON "InsightDirection"("topicId");

ALTER TABLE "InsightDirection"
  DROP CONSTRAINT IF EXISTS "InsightDirection_topicId_fkey";
ALTER TABLE "InsightDirection"
  ADD CONSTRAINT "InsightDirection_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "InsightTopic"("id") ON DELETE CASCADE;

-- ── InsightTask ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "InsightTask" (
  "id"       TEXT NOT NULL,
  "topicId"  TEXT NOT NULL,
  "taskId"   TEXT NOT NULL,
  "title"    TEXT NOT NULL,
  "subtitle" TEXT,
  "owner"    TEXT,
  "model"    TEXT,
  "status"   "InsightTaskStatus" NOT NULL DEFAULT 'PENDING',

  CONSTRAINT "InsightTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InsightTask_topicId_idx" ON "InsightTask"("topicId");

ALTER TABLE "InsightTask"
  DROP CONSTRAINT IF EXISTS "InsightTask_topicId_fkey";
ALTER TABLE "InsightTask"
  ADD CONSTRAINT "InsightTask_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "InsightTopic"("id") ON DELETE CASCADE;

-- ── InsightResearchSession ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "InsightResearchSession" (
  "id"          TEXT NOT NULL,
  "topicId"     TEXT NOT NULL,
  "status"      "InsightResearchStatus" NOT NULL DEFAULT 'PENDING',
  "stages"      JSONB NOT NULL DEFAULT '[]',
  "discussions" JSONB NOT NULL DEFAULT '[]',
  "output"      JSONB,
  "checkpoints" JSONB NOT NULL DEFAULT '{}',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InsightResearchSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InsightResearchSession_topicId_key" UNIQUE ("topicId")
);

ALTER TABLE "InsightResearchSession"
  DROP CONSTRAINT IF EXISTS "InsightResearchSession_topicId_fkey";
ALTER TABLE "InsightResearchSession"
  ADD CONSTRAINT "InsightResearchSession_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "InsightTopic"("id") ON DELETE CASCADE;

-- ── InsightCollabEvent ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "InsightCollabEvent" (
  "id"        TEXT NOT NULL,
  "topicId"   TEXT NOT NULL,
  "type"      TEXT NOT NULL DEFAULT 'info',
  "actor"     TEXT NOT NULL,
  "detail"    TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InsightCollabEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InsightCollabEvent_topicId_timestamp_idx" ON "InsightCollabEvent"("topicId", "timestamp");

ALTER TABLE "InsightCollabEvent"
  DROP CONSTRAINT IF EXISTS "InsightCollabEvent_topicId_fkey";
ALTER TABLE "InsightCollabEvent"
  ADD CONSTRAINT "InsightCollabEvent_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "InsightTopic"("id") ON DELETE CASCADE;

-- ── InsightReportSection ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "InsightReportSection" (
  "id"         TEXT NOT NULL,
  "topicId"    TEXT NOT NULL,
  "sortOrder"  INTEGER NOT NULL DEFAULT 0,
  "title"      TEXT NOT NULL,
  "summary"    TEXT NOT NULL,
  "highlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  CONSTRAINT "InsightReportSection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InsightReportSection_topicId_sortOrder_idx" ON "InsightReportSection"("topicId", "sortOrder");

ALTER TABLE "InsightReportSection"
  DROP CONSTRAINT IF EXISTS "InsightReportSection_topicId_fkey";
ALTER TABLE "InsightReportSection"
  ADD CONSTRAINT "InsightReportSection_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "InsightTopic"("id") ON DELETE CASCADE;

-- ── InsightHistoryItem ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "InsightHistoryItem" (
  "id"                TEXT NOT NULL,
  "topicId"           TEXT NOT NULL,
  "round"             INTEGER NOT NULL,
  "date"              TEXT NOT NULL,
  "dimensionsUpdated" INTEGER NOT NULL DEFAULT 0,
  "sourcesAdded"      INTEGER NOT NULL DEFAULT 0,
  "interactions"      INTEGER NOT NULL DEFAULT 0,
  "summary"           TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InsightHistoryItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InsightHistoryItem_topicId_idx" ON "InsightHistoryItem"("topicId");

ALTER TABLE "InsightHistoryItem"
  DROP CONSTRAINT IF EXISTS "InsightHistoryItem_topicId_fkey";
ALTER TABLE "InsightHistoryItem"
  ADD CONSTRAINT "InsightHistoryItem_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "InsightTopic"("id") ON DELETE CASCADE;

-- ── InsightCredibility ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "InsightCredibility" (
  "id"          TEXT NOT NULL,
  "topicId"     TEXT NOT NULL,
  "overall"     INTEGER NOT NULL DEFAULT 0,
  "metrics"     JSONB NOT NULL DEFAULT '[]',
  "sources"     JSONB NOT NULL DEFAULT '[]',
  "timeliness"  JSONB NOT NULL DEFAULT '[]',
  "coverage"    JSONB NOT NULL DEFAULT '[]',
  "quality"     JSONB NOT NULL DEFAULT '[]',
  "limitations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InsightCredibility_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InsightCredibility_topicId_key" UNIQUE ("topicId")
);

ALTER TABLE "InsightCredibility"
  DROP CONSTRAINT IF EXISTS "InsightCredibility_topicId_fkey";
ALTER TABLE "InsightCredibility"
  ADD CONSTRAINT "InsightCredibility_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "InsightTopic"("id") ON DELETE CASCADE;

-- ── InsightReference ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "InsightReference" (
  "id"      TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "refId"   TEXT NOT NULL,
  "title"   TEXT NOT NULL,
  "domain"  TEXT NOT NULL,
  "excerpt" TEXT,
  "score"   INTEGER NOT NULL DEFAULT 0,
  "tag"     TEXT,

  CONSTRAINT "InsightReference_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InsightReference_topicId_idx" ON "InsightReference"("topicId");

ALTER TABLE "InsightReference"
  DROP CONSTRAINT IF EXISTS "InsightReference_topicId_fkey";
ALTER TABLE "InsightReference"
  ADD CONSTRAINT "InsightReference_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "InsightTopic"("id") ON DELETE CASCADE;
