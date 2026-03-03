-- CreateTable: KnowledgeNote with embedding support for RAG
CREATE TABLE IF NOT EXISTS "KnowledgeNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT,
    "sourceUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "embedding" double precision[] NOT NULL DEFAULT '{}',
    "embeddedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "KnowledgeNote_userId_createdAt_idx" ON "KnowledgeNote"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "KnowledgeNote" DROP CONSTRAINT IF EXISTS "KnowledgeNote_userId_fkey";
ALTER TABLE "KnowledgeNote" ADD CONSTRAINT "KnowledgeNote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
