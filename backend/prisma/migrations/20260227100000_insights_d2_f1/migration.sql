-- Phase D2: Add InsightClaim table for claim-level evidence chain
-- Phase F1: Add PAUSED value to InsightResearchStatus enum

-- ── InsightResearchStatus: add PAUSED ─────────────────────────────────────────

ALTER TYPE "InsightResearchStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

-- ── InsightClaim ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "InsightClaim" (
  "id"             TEXT NOT NULL,
  "topicId"        TEXT NOT NULL,
  "directionLabel" TEXT NOT NULL,
  "statement"      TEXT NOT NULL,
  "confidence"     DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  "sourceQuery"    TEXT NOT NULL DEFAULT '',
  "contestedBy"    TEXT,
  "verified"       BOOLEAN NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InsightClaim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InsightClaim_topicId_idx" ON "InsightClaim"("topicId");
CREATE INDEX IF NOT EXISTS "InsightClaim_topicId_directionLabel_idx" ON "InsightClaim"("topicId", "directionLabel");

ALTER TABLE "InsightClaim"
  DROP CONSTRAINT IF EXISTS "InsightClaim_topicId_fkey";
ALTER TABLE "InsightClaim"
  ADD CONSTRAINT "InsightClaim_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "InsightTopic"("id") ON DELETE CASCADE;
