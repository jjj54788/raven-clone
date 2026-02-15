-- Add profile fields for user preferences and integrations.
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "interests" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN "settings" JSONB;
ALTER TABLE "User" ADD COLUMN "integrations" JSONB;
