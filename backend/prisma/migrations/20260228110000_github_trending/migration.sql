-- CreateTable
CREATE TABLE "GithubTrendingRepo" (
    "id"              TEXT NOT NULL,
    "repoFullName"    TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "description"     TEXT NOT NULL,
    "htmlUrl"         TEXT NOT NULL,
    "language"        TEXT,
    "topics"          TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stars"           INTEGER NOT NULL DEFAULT 0,
    "forks"           INTEGER NOT NULL DEFAULT 0,
    "openIssues"      INTEGER NOT NULL DEFAULT 0,
    "pushedAt"        TIMESTAMP(3),
    "starsSnapshot"   INTEGER NOT NULL DEFAULT 0,
    "starsSnapshotAt" TIMESTAMP(3),
    "starsGrowth7d"   INTEGER NOT NULL DEFAULT 0,
    "aiSummaryZh"     TEXT,
    "keyFeatures"     TEXT[] DEFAULT ARRAY[]::TEXT[],
    "useCases"        TEXT[] DEFAULT ARRAY[]::TEXT[],
    "limitations"     TEXT,
    "evalScore"       JSONB,
    "aiAnalyzedAt"    TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubTrendingRepo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GithubTrendingRepo_repoFullName_key" ON "GithubTrendingRepo"("repoFullName");

-- CreateIndex
CREATE INDEX "GithubTrendingRepo_stars_idx" ON "GithubTrendingRepo"("stars" DESC);

-- CreateIndex
CREATE INDEX "GithubTrendingRepo_starsGrowth7d_idx" ON "GithubTrendingRepo"("starsGrowth7d" DESC);

-- CreateIndex
CREATE INDEX "GithubTrendingRepo_pushedAt_idx" ON "GithubTrendingRepo"("pushedAt" DESC);
