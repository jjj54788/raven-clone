import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import type { GithubTrendingRepo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CURATED_STORE_ITEMS } from './store.data';
import type { GithubEvalScore } from './store.types';

interface GithubApiRepo {
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string | null;
  fork: boolean;
}

@Injectable()
export class GithubSyncService {
  private readonly logger = new Logger(GithubSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  // ---- Main cron: daily at 3am ----

  @Cron('0 3 * * *')
  async syncAll() {
    this.logger.log('GitHub sync started');
    try {
      await this.syncCuratedStats();
    } catch (err) {
      this.logger.warn(`syncCuratedStats error: ${err}`);
    }
    try {
      await this.syncTrendingRepos();
    } catch (err) {
      this.logger.warn(`syncTrendingRepos error: ${err}`);
    }
    this.logger.log('GitHub sync complete');
  }

  // ---- Manual trigger (for POST /store/github-trending/sync) ----

  async triggerSync() {
    void this.syncAll();
  }

  // ---- Phase A: curated stats ----

  async syncCuratedStats() {
    const withRepo = CURATED_STORE_ITEMS.filter((it) => it.githubRepoUrl);
    this.logger.log(`Syncing ${withRepo.length} curated repos`);

    for (const item of withRepo) {
      const repoFull = this.extractRepoFull(item.githubRepoUrl!);
      if (!repoFull) continue;
      try {
        const data = await this.fetchRepoMeta(repoFull);
        await this.upsertRepoCache(repoFull, data);
      } catch (err) {
        this.logger.warn(`Failed to sync ${repoFull}: ${err}`);
      }
    }
  }

  private async upsertRepoCache(repoFull: string, data: GithubApiRepo) {
    const existing = await this.prisma.githubRepoCache.findUnique({ where: { repoFullName: repoFull } });
    const now = new Date();
    const needsSnapshot = !existing?.starsSnapshotAt || this.daysDiff(now, existing.starsSnapshotAt) >= 7;

    await this.prisma.githubRepoCache.upsert({
      where: { repoFullName: repoFull },
      update: {
        stars: data.stargazers_count,
        forks: data.forks_count,
        openIssues: data.open_issues_count,
        pushedAt: data.pushed_at ? new Date(data.pushed_at) : null,
        ...(needsSnapshot ? {
          starsGrowth7d: data.stargazers_count - (existing?.starsSnapshot ?? data.stargazers_count),
          starsSnapshot: data.stargazers_count,
          starsSnapshotAt: now,
        } : {}),
      },
      create: {
        repoFullName: repoFull,
        stars: data.stargazers_count,
        forks: data.forks_count,
        openIssues: data.open_issues_count,
        pushedAt: data.pushed_at ? new Date(data.pushed_at) : null,
        starsSnapshot: data.stargazers_count,
        starsSnapshotAt: now,
      },
    });
  }

  // ---- Phase B: trending repos ----

  async syncTrendingRepos() {
    const topics = ['llm', 'ai-agent', 'generative-ai', 'large-language-model'];
    const allRepos: GithubApiRepo[] = [];

    for (const topic of topics) {
      try {
        const repos = await this.searchRepos(topic, 20);
        allRepos.push(...repos);
      } catch (err) {
        this.logger.warn(`searchRepos topic=${topic} failed: ${err}`);
      }
      // Small delay between search queries to respect rate limits
      await this.sleep(500);
    }

    // Deduplicate by full_name
    const seen = new Set<string>();
    const unique = allRepos.filter((r) => {
      if (seen.has(r.full_name)) return false;
      seen.add(r.full_name);
      return true;
    });

    // Filter: stars > 200, not a fork, pushed within 90 days
    const ninety = 90 * 24 * 3600 * 1000;
    const filtered = unique.filter((r) => {
      if (r.fork) return false;
      if (r.stargazers_count < 200) return false;
      if (r.pushed_at && Date.now() - new Date(r.pushed_at).getTime() > ninety) return false;
      return true;
    });

    this.logger.log(`Upserting ${Math.min(filtered.length, 80)} trending repos`);
    for (const r of filtered.slice(0, 80)) {
      try {
        await this.upsertTrendingRepo(r);
      } catch (err) {
        this.logger.warn(`upsertTrendingRepo ${r.full_name} failed: ${err}`);
      }
    }

    // Phase C: analyze unprocessed repos
    await this.analyzeUnprocessedRepos();
  }

  private async upsertTrendingRepo(data: GithubApiRepo) {
    const existing = await this.prisma.githubTrendingRepo.findUnique({
      where: { repoFullName: data.full_name },
    });
    const now = new Date();
    const needsSnapshot = !existing?.starsSnapshotAt || this.daysDiff(now, existing.starsSnapshotAt) >= 7;
    const name = data.name || data.full_name.split('/')[1] || data.full_name;

    // Compute eval score with what we have (AI fields may be null initially)
    const evalScore = this.computeEvalScore({
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      pushedAt: data.pushed_at ? new Date(data.pushed_at) : null,
      starsGrowth7d: needsSnapshot
        ? data.stargazers_count - (existing?.starsSnapshot ?? data.stargazers_count)
        : (existing?.starsGrowth7d ?? 0),
      aiSummaryZh: existing?.aiSummaryZh ?? null,
      description: data.description ?? '',
    });

    await this.prisma.githubTrendingRepo.upsert({
      where: { repoFullName: data.full_name },
      update: {
        name,
        description: data.description ?? '',
        htmlUrl: data.html_url,
        language: data.language,
        topics: data.topics ?? [],
        stars: data.stargazers_count,
        forks: data.forks_count,
        openIssues: data.open_issues_count,
        pushedAt: data.pushed_at ? new Date(data.pushed_at) : null,
        evalScore: evalScore as unknown as Prisma.InputJsonValue,
        ...(needsSnapshot ? {
          starsGrowth7d: data.stargazers_count - (existing?.starsSnapshot ?? data.stargazers_count),
          starsSnapshot: data.stargazers_count,
          starsSnapshotAt: now,
        } : {}),
      },
      create: {
        repoFullName: data.full_name,
        name,
        description: data.description ?? '',
        htmlUrl: data.html_url,
        language: data.language,
        topics: data.topics ?? [],
        stars: data.stargazers_count,
        forks: data.forks_count,
        openIssues: data.open_issues_count,
        pushedAt: data.pushed_at ? new Date(data.pushed_at) : null,
        starsSnapshot: data.stargazers_count,
        starsSnapshotAt: now,
        keyFeatures: [],
        useCases: [],
        evalScore: evalScore as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private async searchRepos(topic: string, perPage = 20): Promise<GithubApiRepo[]> {
    const params = new URLSearchParams({
      q: `topic:${topic}`,
      sort: 'stars',
      order: 'desc',
      per_page: String(perPage),
    });
    const res = await fetch(`https://api.github.com/search/repositories?${params}`, {
      headers: this.githubHeaders(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub Search API ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json() as { items?: GithubApiRepo[] };
    return data.items ?? [];
  }

  // ---- Phase C: AI analysis ----

  private async analyzeUnprocessedRepos() {
    const stale = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const repos = await this.prisma.githubTrendingRepo.findMany({
      where: {
        OR: [
          { aiAnalyzedAt: null },
          { aiAnalyzedAt: { lt: stale } },
        ],
      },
      orderBy: { stars: 'desc' },
      take: 5,
    });

    for (const repo of repos) {
      try {
        await this.analyzeRepoWithAi(repo);
        await this.sleep(1000);
      } catch (err) {
        this.logger.warn(`analyzeRepoWithAi ${repo.repoFullName} failed: ${err}`);
      }
    }
  }

  async analyzeRepoWithAi(repo: GithubTrendingRepo) {
    const model = this.aiService.getDefaultModel();
    if (!model) return;

    const readme = await this.fetchReadme(repo.repoFullName);

    const prompt = `You are analyzing a GitHub AI project for Chinese developers.
Repository: ${repo.repoFullName}
GitHub Description: ${repo.description}
README (truncated):
${readme}

Reply with ONLY valid JSON, no markdown fences:
{
  "summaryZh": "2句话中文介绍，说明项目做什么、核心亮点",
  "keyFeatures": ["功能1", "功能2", "功能3"],
  "useCases": ["场景1", "场景2"],
  "limitations": "主要局限或前置要求（若无则填空字符串）"
}`;

    const response = await this.aiService.chat(model, [{ role: 'user', content: prompt }]);
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) return;

    let parsed: { summaryZh?: string; keyFeatures?: string[]; useCases?: string[]; limitations?: string };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return;
    }

    const evalScore = this.computeEvalScore({
      stars: repo.stars,
      forks: repo.forks,
      openIssues: repo.openIssues,
      pushedAt: repo.pushedAt,
      starsGrowth7d: repo.starsGrowth7d,
      aiSummaryZh: parsed.summaryZh ?? null,
      description: repo.description,
    });

    await this.prisma.githubTrendingRepo.update({
      where: { id: repo.id },
      data: {
        aiSummaryZh: parsed.summaryZh ?? null,
        keyFeatures: parsed.keyFeatures ?? [],
        useCases: parsed.useCases ?? [],
        limitations: parsed.limitations || null,
        evalScore: evalScore as unknown as Prisma.InputJsonValue,
        aiAnalyzedAt: new Date(),
      },
    });
  }

  computeEvalScore(repo: {
    stars: number;
    forks: number;
    openIssues: number;
    pushedAt: Date | null;
    starsGrowth7d: number;
    aiSummaryZh: string | null;
    description: string;
  }): GithubEvalScore {
    const daysSincePush = repo.pushedAt
      ? Math.floor((Date.now() - repo.pushedAt.getTime()) / 86400000)
      : 365;
    const activity = daysSincePush < 7 ? 95 : daysSincePush < 30 ? 75 : daysSincePush < 90 ? 50 : 20;

    const engagementRatio = repo.stars > 0 ? (repo.forks + repo.openIssues) / repo.stars : 0;
    const community = Math.min(100, Math.round(engagementRatio * 400));

    const growth = repo.stars > 0
      ? Math.min(100, Math.round((repo.starsGrowth7d / repo.stars) * 1500))
      : 0;

    const docs = repo.aiSummaryZh
      ? 75
      : repo.description.length > 100 ? 55 : 30;

    const avg = (activity + community + growth + docs) / 4;
    const grade: GithubEvalScore['grade'] = avg >= 75 ? 'A' : avg >= 50 ? 'B' : avg >= 25 ? 'C' : 'D';

    return { activity, community, growth, docs, grade };
  }

  // ---- GitHub API helpers ----

  private async fetchRepoMeta(repoFull: string): Promise<GithubApiRepo> {
    const res = await fetch(`https://api.github.com/repos/${repoFull}`, {
      headers: this.githubHeaders(),
    });
    if (!res.ok) throw new Error(`GitHub API /repos/${repoFull} → ${res.status}`);
    return res.json() as Promise<GithubApiRepo>;
  }

  private async fetchReadme(repoFull: string): Promise<string> {
    const res = await fetch(`https://api.github.com/repos/${repoFull}/readme`, {
      headers: this.githubHeaders(),
    });
    if (!res.ok) return '';
    const data = await res.json() as { content?: string; encoding?: string };
    if (!data.content || data.encoding !== 'base64') return '';
    return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8').slice(0, 4000);
  }

  private githubHeaders(): Record<string, string> {
    const token = process.env.GITHUB_TOKEN?.trim();
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  extractRepoFull(githubRepoUrl: string): string {
    try {
      const u = new URL(githubRepoUrl);
      if (u.hostname !== 'github.com') return '';
      const parts = u.pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
      if (parts.length < 2) return '';
      return `${parts[0]}/${parts[1]}`;
    } catch {
      return '';
    }
  }

  // ---- Utilities ----

  private daysDiff(a: Date, b: Date): number {
    return Math.abs(a.getTime() - b.getTime()) / 86400000;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
