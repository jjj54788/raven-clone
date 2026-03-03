-- Fix: duplicate of fix_team_enums — guard with IF NOT EXISTS to be idempotent.

-- 1. Create TeamStatus enum only if it doesn't exist
DO $$ BEGIN
  CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Convert column if still TEXT
DO $$ BEGIN
  ALTER TABLE "Team" ALTER COLUMN "status" DROP DEFAULT;
  ALTER TABLE "Team"
    ALTER COLUMN "status" TYPE "TeamStatus"
    USING "status"::"TeamStatus";
  ALTER TABLE "Team" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"TeamStatus";
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- 3. Create TeamAssistantStatus enum only if it doesn't exist
DO $$ BEGIN
  CREATE TYPE "TeamAssistantStatus" AS ENUM ('IDLE', 'RUNNING', 'DONE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Convert column if still TEXT
DO $$ BEGIN
  ALTER TABLE "TeamAssistant" ALTER COLUMN "asStatus" DROP DEFAULT;
  ALTER TABLE "TeamAssistant"
    ALTER COLUMN "asStatus" TYPE "TeamAssistantStatus"
    USING "asStatus"::"TeamAssistantStatus";
  ALTER TABLE "TeamAssistant" ALTER COLUMN "asStatus" SET DEFAULT 'IDLE'::"TeamAssistantStatus";
EXCEPTION
  WHEN others THEN NULL;
END $$;
