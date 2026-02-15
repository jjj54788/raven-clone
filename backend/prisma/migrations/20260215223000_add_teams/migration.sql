-- Teams / Assistants / Missions.

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "TeamMemberRole" AS ENUM ('OWNER', 'MEMBER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "TeamMissionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "TeamMissionTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'REVISION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "TeamMissionActivityLevel" AS ENUM ('INFO', 'WARNING', 'ERROR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamAssistant" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "provider" TEXT,
    "roleTitle" TEXT,
    "roleDescription" TEXT,
    "currentGoal" TEXT,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamAssistant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMission" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "leaderAssistantId" TEXT,
    "notificationEmail" TEXT,
    "status" "TeamMissionStatus" NOT NULL DEFAULT 'PENDING',
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "reportMarkdown" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMissionTask" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "assistantId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TeamMissionTaskStatus" NOT NULL DEFAULT 'TODO',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "outputMarkdown" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMissionTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMissionActivity" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "taskId" TEXT,
    "assistantId" TEXT,
    "level" "TeamMissionActivityLevel" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMissionActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMissionSource" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "domain" TEXT,
    "snippet" TEXT,
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "citedCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMissionSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Team_ownerUserId_idx" ON "Team"("ownerUserId");

-- CreateIndex
CREATE INDEX "Team_isPublic_idx" ON "Team"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");

-- CreateIndex
CREATE INDEX "TeamAssistant_teamId_idx" ON "TeamAssistant"("teamId");

-- CreateIndex
CREATE INDEX "TeamAssistant_teamId_isLeader_idx" ON "TeamAssistant"("teamId", "isLeader");

-- CreateIndex
CREATE INDEX "TeamMission_teamId_createdAt_idx" ON "TeamMission"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "TeamMission_teamId_status_idx" ON "TeamMission"("teamId", "status");

-- CreateIndex
CREATE INDEX "TeamMissionTask_missionId_sortOrder_idx" ON "TeamMissionTask"("missionId", "sortOrder");

-- CreateIndex
CREATE INDEX "TeamMissionTask_assistantId_idx" ON "TeamMissionTask"("assistantId");

-- CreateIndex
CREATE INDEX "TeamMissionTask_status_idx" ON "TeamMissionTask"("status");

-- CreateIndex
CREATE INDEX "TeamMissionActivity_missionId_createdAt_idx" ON "TeamMissionActivity"("missionId", "createdAt");

-- CreateIndex
CREATE INDEX "TeamMissionActivity_taskId_idx" ON "TeamMissionActivity"("taskId");

-- CreateIndex
CREATE INDEX "TeamMissionActivity_assistantId_idx" ON "TeamMissionActivity"("assistantId");

-- CreateIndex
CREATE INDEX "TeamMissionActivity_level_idx" ON "TeamMissionActivity"("level");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMissionSource_missionId_url_key" ON "TeamMissionSource"("missionId", "url");

-- CreateIndex
CREATE INDEX "TeamMissionSource_missionId_idx" ON "TeamMissionSource"("missionId");

-- CreateIndex
CREATE INDEX "TeamMissionSource_trustScore_idx" ON "TeamMissionSource"("trustScore");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAssistant" ADD CONSTRAINT "TeamAssistant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMission" ADD CONSTRAINT "TeamMission_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMission" ADD CONSTRAINT "TeamMission_leaderAssistantId_fkey" FOREIGN KEY ("leaderAssistantId") REFERENCES "TeamAssistant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMissionTask" ADD CONSTRAINT "TeamMissionTask_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "TeamMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMissionTask" ADD CONSTRAINT "TeamMissionTask_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "TeamAssistant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMissionActivity" ADD CONSTRAINT "TeamMissionActivity_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "TeamMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMissionActivity" ADD CONSTRAINT "TeamMissionActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TeamMissionTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMissionActivity" ADD CONSTRAINT "TeamMissionActivity_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "TeamAssistant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMissionSource" ADD CONSTRAINT "TeamMissionSource_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "TeamMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

