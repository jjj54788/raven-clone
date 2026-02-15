-- Align schema drift for Google Sign-In / optional password.

-- Add missing columns introduced after the initial migration.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- Ensure provider has a default and is non-null.
ALTER TABLE "User" ALTER COLUMN "provider" SET DEFAULT 'local';
UPDATE "User" SET "provider" = 'local' WHERE "provider" IS NULL;
ALTER TABLE "User" ALTER COLUMN "provider" SET NOT NULL;

-- Make password nullable (Google users have no password).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = '"User"'::regclass
      AND attname = 'password'
      AND attnotnull
  ) THEN
    ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
  END IF;
END $$;

