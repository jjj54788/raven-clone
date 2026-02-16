-- Add integration connections for OAuth providers.
CREATE TYPE "IntegrationProvider" AS ENUM ('NOTION', 'GOOGLE_DRIVE', 'FEISHU');

CREATE TABLE "IntegrationConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT,
  "tokenType" TEXT,
  "scope" TEXT,
  "expiresAt" TIMESTAMP(3),
  "metadata" JSONB,
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationConnection_userId_provider_key" ON "IntegrationConnection"("userId", "provider");
CREATE INDEX "IntegrationConnection_userId_idx" ON "IntegrationConnection"("userId");
CREATE INDEX "IntegrationConnection_provider_idx" ON "IntegrationConnection"("provider");

ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
