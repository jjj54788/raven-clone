-- Store custom items (per-user).

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "StoreItemType" AS ENUM ('TOOL', 'SKILL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE "StoreItemPricing" AS ENUM ('FREE', 'FREEMIUM', 'PAID', 'OPEN_SOURCE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "StoreCustomItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "StoreItemType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "iconText" TEXT,
    "pricing" "StoreItemPricing",
    "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "trialNotesMarkdown" TEXT,
    "recommendReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreCustomItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreCustomItem_userId_idx" ON "StoreCustomItem"("userId");

-- CreateIndex
CREATE INDEX "StoreCustomItem_type_idx" ON "StoreCustomItem"("type");

-- AddForeignKey
ALTER TABLE "StoreCustomItem" ADD CONSTRAINT "StoreCustomItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

