-- CreateTable
CREATE TABLE "GithubRepoCache" (
    "repoFullName"    TEXT NOT NULL,
    "stars"           INTEGER NOT NULL DEFAULT 0,
    "forks"           INTEGER NOT NULL DEFAULT 0,
    "openIssues"      INTEGER NOT NULL DEFAULT 0,
    "pushedAt"        TIMESTAMP(3),
    "starsSnapshot"   INTEGER NOT NULL DEFAULT 0,
    "starsSnapshotAt" TIMESTAMP(3),
    "starsGrowth7d"   INTEGER NOT NULL DEFAULT 0,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubRepoCache_pkey" PRIMARY KEY ("repoFullName")
);
