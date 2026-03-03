-- AlterTable: Team — add goal, status, canvasJson
ALTER TABLE "Team"
  ADD COLUMN "goal"       TEXT,
  ADD COLUMN "status"     TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "canvasJson" JSONB;

-- AlterTable: TeamAssistant — add display metadata + asStatus
ALTER TABLE "TeamAssistant"
  ADD COLUMN "catalogId"  TEXT,
  ADD COLUMN "iconText"   TEXT,
  ADD COLUMN "accent"     TEXT,
  ADD COLUMN "asStatus"   TEXT NOT NULL DEFAULT 'IDLE';
