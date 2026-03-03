-- Phase 3: Link TodoTask to KnowledgeNote (optional, many-to-one)
ALTER TABLE "TodoTask" ADD COLUMN "knowledgeNoteId" TEXT;

ALTER TABLE "TodoTask"
  ADD CONSTRAINT "TodoTask_knowledgeNoteId_fkey"
  FOREIGN KEY ("knowledgeNoteId")
  REFERENCES "KnowledgeNote"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "TodoTask_knowledgeNoteId_idx" ON "TodoTask"("knowledgeNoteId");
