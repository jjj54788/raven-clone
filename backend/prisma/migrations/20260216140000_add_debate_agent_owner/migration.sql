-- Add optional owner to debate agents.

ALTER TABLE "DebateAgent" ADD COLUMN "userId" TEXT;

CREATE INDEX "DebateAgent_userId_idx" ON "DebateAgent"("userId");

ALTER TABLE "DebateAgent" ADD CONSTRAINT "DebateAgent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
