-- CreateTable
CREATE TABLE "StoreBookmark" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "itemId"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreBookmark_userId_itemId_key" ON "StoreBookmark"("userId", "itemId");

-- CreateIndex
CREATE INDEX "StoreBookmark_userId_idx" ON "StoreBookmark"("userId");

-- AddForeignKey
ALTER TABLE "StoreBookmark" ADD CONSTRAINT "StoreBookmark_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
