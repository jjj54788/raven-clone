-- Debate (multi-agent) tables.

DO $$
BEGIN
  CREATE TYPE "DebateAgentCategory" AS ENUM ('DEBATER', 'EVALUATOR', 'SPECIALIST');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE "DebateSessionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'ERROR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE "DebateAgent" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "profile" TEXT NOT NULL,
  "systemPrompt" TEXT NOT NULL,
  "color" TEXT,
  "description" TEXT,
  "category" "DebateAgentCategory" NOT NULL DEFAULT 'DEBATER',
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DebateAgent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DebateAgent_category_displayOrder_idx" ON "DebateAgent"("category", "displayOrder");

CREATE TABLE "DebateSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "agentIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "maxRounds" INTEGER NOT NULL DEFAULT 5,
  "currentRound" INTEGER NOT NULL DEFAULT 0,
  "status" "DebateSessionStatus" NOT NULL DEFAULT 'PENDING',
  "summary" TEXT,
  "keyPoints" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "consensus" TEXT,
  "disagreements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "bestViewpoint" TEXT,
  "mostInnovative" TEXT,
  "goldenQuotes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "DebateSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DebateSession_userId_createdAt_idx" ON "DebateSession"("userId", "createdAt");
CREATE INDEX "DebateSession_status_idx" ON "DebateSession"("status");

CREATE TABLE "DebateMessage" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "round" INTEGER NOT NULL,
  "logicScore" DOUBLE PRECISION,
  "innovationScore" DOUBLE PRECISION,
  "expressionScore" DOUBLE PRECISION,
  "totalScore" DOUBLE PRECISION,
  "scoringReasons" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DebateMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DebateMessage_sessionId_createdAt_idx" ON "DebateMessage"("sessionId", "createdAt");
CREATE INDEX "DebateMessage_senderId_idx" ON "DebateMessage"("senderId");

CREATE TABLE "DebateTemplate" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "agentIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "rounds" INTEGER NOT NULL DEFAULT 5,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DebateTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DebateTemplate_userId_idx" ON "DebateTemplate"("userId");
CREATE INDEX "DebateTemplate_isSystem_idx" ON "DebateTemplate"("isSystem");

ALTER TABLE "DebateSession" ADD CONSTRAINT "DebateSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DebateMessage" ADD CONSTRAINT "DebateMessage_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "DebateSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DebateTemplate" ADD CONSTRAINT "DebateTemplate_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
