-- AlterTable: add shareToken to InsightTopic
ALTER TABLE "InsightTopic" ADD COLUMN "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InsightTopic_shareToken_key" ON "InsightTopic"("shareToken");
