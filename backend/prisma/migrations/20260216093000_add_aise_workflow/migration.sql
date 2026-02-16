-- Add AISE workflow data tables.
CREATE TYPE "AiseStageId" AS ENUM ('requirements', 'design', 'implementation', 'testing', 'acceptance');
CREATE TYPE "AiseStageStatus" AS ENUM ('done', 'active', 'review', 'pending');
CREATE TYPE "AiseRequirementStatus" AS ENUM ('done', 'active', 'review', 'blocked');
CREATE TYPE "AiseMetricId" AS ENUM ('lead_time', 'deploy_frequency', 'change_failure_rate', 'mttr');
CREATE TYPE "AiseGateId" AS ENUM ('unit_tests', 'code_review', 'security_scan', 'deployment_check');
CREATE TYPE "AiseGateStatus" AS ENUM ('pass', 'pending', 'running', 'queued');
CREATE TYPE "AiseAcceptanceId" AS ENUM ('coverage', 'defect_closure', 'signoff');

CREATE TABLE "AiseMetric" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "metricId" "AiseMetricId" NOT NULL,
  "value" TEXT NOT NULL,
  "hint" TEXT,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "savedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiseMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiseMetric_userId_metricId_key" ON "AiseMetric"("userId", "metricId");
CREATE INDEX "AiseMetric_userId_idx" ON "AiseMetric"("userId");

CREATE TABLE "AisePipelineStage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stageId" "AiseStageId" NOT NULL,
  "status" "AiseStageStatus" NOT NULL,
  "wipCurrent" INTEGER NOT NULL,
  "wipLimit" INTEGER NOT NULL,
  "itemsCount" INTEGER NOT NULL,
  "desc" TEXT,
  "savedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AisePipelineStage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AisePipelineStage_userId_stageId_key" ON "AisePipelineStage"("userId", "stageId");
CREATE INDEX "AisePipelineStage_userId_idx" ON "AisePipelineStage"("userId");

CREATE TABLE "AiseQualityGate" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "gateId" "AiseGateId" NOT NULL,
  "status" "AiseGateStatus" NOT NULL,
  "value" TEXT NOT NULL,
  "savedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiseQualityGate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiseQualityGate_userId_gateId_key" ON "AiseQualityGate"("userId", "gateId");
CREATE INDEX "AiseQualityGate_userId_idx" ON "AiseQualityGate"("userId");

CREATE TABLE "AiseAcceptanceItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "acceptanceId" "AiseAcceptanceId" NOT NULL,
  "value" TEXT NOT NULL,
  "savedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiseAcceptanceItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiseAcceptanceItem_userId_acceptanceId_key" ON "AiseAcceptanceItem"("userId", "acceptanceId");
CREATE INDEX "AiseAcceptanceItem_userId_idx" ON "AiseAcceptanceItem"("userId");

CREATE TABLE "AiseRequirement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "stageId" "AiseStageId" NOT NULL,
  "status" "AiseRequirementStatus" NOT NULL,
  "progress" INTEGER NOT NULL,
  "sourceUpdatedAt" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "savedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiseRequirement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiseRequirement_userId_key_key" ON "AiseRequirement"("userId", "key");
CREATE INDEX "AiseRequirement_userId_idx" ON "AiseRequirement"("userId");
CREATE INDEX "AiseRequirement_userId_stageId_idx" ON "AiseRequirement"("userId", "stageId");
CREATE INDEX "AiseRequirement_userId_status_idx" ON "AiseRequirement"("userId", "status");

CREATE TABLE "AiseFocus" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requirementKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "stageId" "AiseStageId" NOT NULL,
  "status" "AiseRequirementStatus" NOT NULL,
  "savedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiseFocus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiseFocus_userId_requirementKey_key" ON "AiseFocus"("userId", "requirementKey");
CREATE INDEX "AiseFocus_userId_idx" ON "AiseFocus"("userId");

CREATE TABLE "AiseFocusTrace" (
  "id" TEXT NOT NULL,
  "focusId" TEXT NOT NULL,
  "stageId" "AiseStageId" NOT NULL,
  "status" "AiseStageStatus" NOT NULL,
  "sortOrder" INTEGER NOT NULL,

  CONSTRAINT "AiseFocusTrace_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiseFocusTrace_focusId_sortOrder_idx" ON "AiseFocusTrace"("focusId", "sortOrder");

ALTER TABLE "AiseMetric" ADD CONSTRAINT "AiseMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AisePipelineStage" ADD CONSTRAINT "AisePipelineStage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiseQualityGate" ADD CONSTRAINT "AiseQualityGate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiseAcceptanceItem" ADD CONSTRAINT "AiseAcceptanceItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiseRequirement" ADD CONSTRAINT "AiseRequirement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiseFocus" ADD CONSTRAINT "AiseFocus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiseFocusTrace" ADD CONSTRAINT "AiseFocusTrace_focusId_fkey" FOREIGN KEY ("focusId") REFERENCES "AiseFocus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
