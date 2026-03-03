-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "RepeatRule" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddColumns to TodoTask
ALTER TABLE "TodoTask" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "TodoTask" ADD COLUMN IF NOT EXISTS "repeatRule" "RepeatRule" NOT NULL DEFAULT 'NONE';
ALTER TABLE "TodoTask" ADD COLUMN IF NOT EXISTS "repeatEndAt" TIMESTAMP(3);

-- CreateTable SubTask
CREATE TABLE IF NOT EXISTS "SubTask" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SubTask_taskId_position_idx" ON "SubTask"("taskId", "position");

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "SubTask" ADD CONSTRAINT "SubTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TodoTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
