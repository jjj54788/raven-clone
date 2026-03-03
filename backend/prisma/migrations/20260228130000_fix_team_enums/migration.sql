-- Fix: teams_extend migration used TEXT for status columns instead of proper enums.
-- Postgres requires dropping the DEFAULT before altering column type to an enum.

-- 1. Create TeamStatus enum
CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- 2. Drop default → cast TEXT to enum → restore default
ALTER TABLE "Team" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Team"
  ALTER COLUMN "status" TYPE "TeamStatus"
  USING "status"::"TeamStatus";
ALTER TABLE "Team" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"TeamStatus";

-- 3. Create TeamAssistantStatus enum
CREATE TYPE "TeamAssistantStatus" AS ENUM ('IDLE', 'RUNNING', 'DONE');

-- 4. Drop default → cast TEXT to enum → restore default
ALTER TABLE "TeamAssistant" ALTER COLUMN "asStatus" DROP DEFAULT;
ALTER TABLE "TeamAssistant"
  ALTER COLUMN "asStatus" TYPE "TeamAssistantStatus"
  USING "asStatus"::"TeamAssistantStatus";
ALTER TABLE "TeamAssistant" ALTER COLUMN "asStatus" SET DEFAULT 'IDLE'::"TeamAssistantStatus";
