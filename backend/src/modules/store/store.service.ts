import { Injectable, NotFoundException } from '@nestjs/common';
import type { StoreCustomItem } from '@prisma/client';
import { StoreItemPricing as PrismaStoreItemPricing, StoreItemType as PrismaStoreItemType } from '@prisma/client';
import { CURATED_STORE_ITEMS, DEFAULT_TOOL_CATEGORIES } from './store.data';
import type { GithubTrendingItem, StoreItem, StoreItemType as StoreItemKind } from './store.types';
import type { CreateCustomStoreItemDto } from './dto/create-custom-store-item.dto';
import type { ListStoreItemsQueryDto } from './dto/list-store-items-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { GithubSyncService } from './github-sync.service';

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function parseUsersText(usersText: string | undefined): number {
  if (!usersText) return 0;
  const raw = usersText.trim();
  if (!raw) return 0;

  // Examples: "100M+", "1.8M+", "10K+", "2B+", "GitHub"
  const m = raw.match(/^(\d+(?:\.\d+)?)([KMB])\+?$/i);
  if (!m) return 0;

  const n = Number.parseFloat(m[1]);
  if (!Number.isFinite(n)) return 0;

  const unit = m[2].toUpperCase();
  const factor = unit === 'K' ? 1_000 : unit === 'M' ? 1_000_000 : 1_000_000_000;
  return n * factor;
}

function parseFeaturedFlag(value: string | undefined): boolean | undefined {
  if (value == null) return undefined;
  const v = value.trim().toLowerCase();
  if (v === '1' || v === 'true') return true;
  if (v === '0' || v === 'false') return false;
  return undefined;
}

@Injectable()
export class StoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly githubSync: GithubSyncService,
  ) {}

  private toStoreItem(row: StoreCustomItem): StoreItem {
    const pricing =
      row.pricing === PrismaStoreItemPricing.FREE ? 'free'
        : row.pricing === PrismaStoreItemPricing.PAID ? 'paid'
          : row.pricing === PrismaStoreItemPricing.OPEN_SOURCE ? 'open_source'
            : row.pricing === PrismaStoreItemPricing.FREEMIUM ? 'freemium'
              : undefined;

    const type = row.type === PrismaStoreItemType.SKILL ? 'skill' : 'tool';

    return {
      id: row.id,
      type,
      source: 'custom',
      name: row.name,
      description: row.description,
      url: row.url,
      iconText: row.iconText || undefined,
      pricing,
      featured: false,
      categories: row.categories || [],
      tags: row.tags || [],
      trialNotesMarkdown: row.trialNotesMarkdown || undefined,
      recommendReasons: row.recommendReasons || [],
      links: [{ label: '访问', url: row.url }],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async enrichWithGithubCache(items: StoreItem[]): Promise<StoreItem[]> {
    const repoUrls = items
      .filter((it) => it.githubRepoUrl)
      .map((it) => this.githubSync.extractRepoFull(it.githubRepoUrl!))
      .filter(Boolean);

    if (repoUrls.length === 0) return items;

    const caches = await this.prisma.githubRepoCache.findMany({
      where: { repoFullName: { in: repoUrls } },
    });
    const cacheMap = new Map(caches.map((c) => [c.repoFullName, c]));

    return items.map((item) => {
      if (!item.githubRepoUrl) return item;
      const repoFull = this.githubSync.extractRepoFull(item.githubRepoUrl);
      const cache = cacheMap.get(repoFull);
      if (!cache) return item;
      return {
        ...item,
        githubStars: cache.stars,
        githubForks: cache.forks,
        githubStarsGrowth7d: cache.starsGrowth7d,
        githubLastPushedAt: cache.pushedAt?.toISOString(),
      };
    });
  }

  async listItems(userId: string, query: ListStoreItemsQueryDto): Promise<StoreItem[]> {
    const type = query.type;
    const q = query.q ? normalizeText(query.q) : '';
    const category = query.category ? normalizeText(query.category) : '';
    const tag = query.tag ? normalizeText(query.tag) : '';
    const sort = query.sort || 'rating';
    const featured = parseFeaturedFlag(query.featured);

    const rows = await this.prisma.storeCustomItem.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    const customItems = rows.map((r) => this.toStoreItem(r));
    const all = [...CURATED_STORE_ITEMS, ...customItems];

    let items = all;

    if (type) {
      items = items.filter((it) => it.type === type);
    }

    if (featured !== undefined) {
      items = items.filter((it) => Boolean(it.featured) === featured);
    }

    if (category) {
      items = items.filter((it) => it.categories.some((c) => normalizeText(c) === category));
    }

    if (tag) {
      items = items.filter((it) => it.tags.some((t) => normalizeText(t) === tag));
    }

    if (q) {
      items = items.filter((it) => {
        const hay = normalizeText([it.name, it.description, ...it.categories, ...it.tags].join(' '));
        return hay.includes(q);
      });
    }

    items = [...items].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'zh-Hans-CN');
      if (sort === 'users') return parseUsersText(b.usersText) - parseUsersText(a.usersText);
      return (b.rating || 0) - (a.rating || 0);
    });

    return this.enrichWithGithubCache(items);
  }

  async getItemById(userId: string, id: string): Promise<StoreItem> {
    const curated = CURATED_STORE_ITEMS.find((it) => it.id === id);
    if (curated) {
      const [enriched] = await this.enrichWithGithubCache([curated]);
      return enriched;
    }

    const row = await this.prisma.storeCustomItem.findFirst({
      where: { id, userId },
    });
    if (!row) throw new NotFoundException('Store item not found');
    return this.toStoreItem(row);
  }

  async listCategories(userId: string, type?: StoreItemKind): Promise<string[]> {
    const categories = new Set<string>();
    for (const c of DEFAULT_TOOL_CATEGORIES) categories.add(c);
    for (const it of CURATED_STORE_ITEMS) {
      if (type && it.type !== type) continue;
      for (const c of it.categories) categories.add(c);
    }

    const rows = await this.prisma.storeCustomItem.findMany({
      where: {
        userId,
        ...(type ? { type: type === 'skill' ? PrismaStoreItemType.SKILL : PrismaStoreItemType.TOOL } : {}),
      },
      select: { categories: true },
    });
    for (const r of rows) {
      for (const c of r.categories || []) categories.add(c);
    }

    return Array.from(categories);
  }

  async createCustomItem(userId: string, dto: CreateCustomStoreItemDto): Promise<StoreItem> {
    const name = dto.name.trim();
    const description = dto.description.trim();
    const url = dto.url.trim();

    const row = await this.prisma.storeCustomItem.create({
      data: {
        userId,
        type: dto.type === 'skill' ? PrismaStoreItemType.SKILL : PrismaStoreItemType.TOOL,
        name,
        description,
        url,
        iconText: dto.iconText?.trim() || null,
        pricing: dto.pricing
          ? dto.pricing === 'free' ? PrismaStoreItemPricing.FREE
            : dto.pricing === 'paid' ? PrismaStoreItemPricing.PAID
              : dto.pricing === 'open_source' ? PrismaStoreItemPricing.OPEN_SOURCE
                : PrismaStoreItemPricing.FREEMIUM
          : null,
        categories: (dto.categories || []).map((c) => c.trim()).filter(Boolean),
        tags: (dto.tags || []).map((t) => t.trim()).filter(Boolean),
        trialNotesMarkdown: dto.trialNotesMarkdown?.trim() || null,
        recommendReasons: (dto.recommendReasons || []).map((r) => r.trim()).filter(Boolean),
      },
    });

    return this.toStoreItem(row);
  }

  async deleteCustomItem(userId: string, id: string): Promise<void> {
    const result = await this.prisma.storeCustomItem.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundException('Custom store item not found');
  }

  // ---- Bookmarks ----

  private resolveItemById(itemId: string, customItems: StoreItem[]): StoreItem | undefined {
    return CURATED_STORE_ITEMS.find((it) => it.id === itemId)
      ?? customItems.find((it) => it.id === itemId);
  }

  async getBookmarks(userId: string): Promise<StoreItem[]> {
    const bookmarks = await this.prisma.storeBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const customRows = await this.prisma.storeCustomItem.findMany({ where: { userId } });
    const customItems = customRows.map((r) => this.toStoreItem(r));

    const result: StoreItem[] = [];
    for (const bm of bookmarks) {
      const item = this.resolveItemById(bm.itemId, customItems);
      if (item) result.push(item);
    }
    return result;
  }

  async addBookmark(userId: string, itemId: string): Promise<void> {
    await this.prisma.storeBookmark.upsert({
      where: { userId_itemId: { userId, itemId } },
      update: {},
      create: { userId, itemId },
    });
  }

  async removeBookmark(userId: string, itemId: string): Promise<void> {
    await this.prisma.storeBookmark.deleteMany({ where: { userId, itemId } });
  }

  // ---- GitHub Trending ----

  async getTrendingRepos(query: { sort?: string; language?: string; limit?: number }): Promise<GithubTrendingItem[]> {
    const limit = Math.min(query.limit ?? 40, 100);
    const orderBy: Record<string, 'desc'> = { stars: 'desc' };
    if (query.sort === 'growth') orderBy.starsGrowth7d = 'desc';
    else if (query.sort === 'recent') orderBy.pushedAt = 'desc';

    const where: Record<string, unknown> = {};
    if (query.language) where.language = query.language;

    const rows = await this.prisma.githubTrendingRepo.findMany({
      where,
      orderBy,
      take: limit,
    });

    return rows.map((r) => this.toTrendingItem(r));
  }

  async getTrendingRepo(id: string): Promise<GithubTrendingItem> {
    const row = await this.prisma.githubTrendingRepo.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Trending repo not found');
    return this.toTrendingItem(row);
  }

  private toTrendingItem(r: {
    id: string; repoFullName: string; name: string; description: string;
    htmlUrl: string; language: string | null; topics: string[]; stars: number;
    forks: number; openIssues: number; starsGrowth7d: number; pushedAt: Date | null;
    aiSummaryZh: string | null; keyFeatures: string[]; useCases: string[];
    limitations: string | null; evalScore: unknown; aiAnalyzedAt: Date | null;
    createdAt: Date; updatedAt: Date;
  }): GithubTrendingItem {
    return {
      id: r.id,
      repoFullName: r.repoFullName,
      name: r.name,
      description: r.description,
      htmlUrl: r.htmlUrl,
      language: r.language ?? undefined,
      topics: r.topics,
      stars: r.stars,
      forks: r.forks,
      openIssues: r.openIssues,
      starsGrowth7d: r.starsGrowth7d,
      pushedAt: r.pushedAt?.toISOString(),
      aiSummaryZh: r.aiSummaryZh ?? undefined,
      keyFeatures: r.keyFeatures,
      useCases: r.useCases,
      limitations: r.limitations ?? undefined,
      evalScore: r.evalScore as GithubTrendingItem['evalScore'],
      aiAnalyzedAt: r.aiAnalyzedAt?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  // ---- AI Recommendations ----

  async getRecommendations(userId: string): Promise<StoreItem[]> {
    // Fetch last 10 sessions as context
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { title: true },
    });

    // Fallback: return featured items if no history
    if (sessions.length === 0) {
      return CURATED_STORE_ITEMS.filter((it) => it.featured).slice(0, 4);
    }

    const model = this.aiService.getDefaultModel();
    if (!model) {
      return CURATED_STORE_ITEMS.filter((it) => it.featured).slice(0, 4);
    }

    const sessionTitles = sessions.map((s, i) => `${i + 1}. ${s.title}`).join('\n');
    const catalog = CURATED_STORE_ITEMS.slice(0, 40)
      .map((it) => `id:${it.id} | name:${it.name} | categories:${it.categories.join(',')} | desc:${it.description.slice(0, 60)}`)
      .join('\n');

    const prompt = `You are a helpful AI tool recommender. Based on the user's recent AI chat topics, recommend 3-4 most relevant tools from the catalog.

User's recent chat topics:
${sessionTitles}

Available tools catalog:
${catalog}

Reply with ONLY a JSON array of 3-4 item IDs that best match the user's interests. Example: ["chatgpt","cursor","perplexity"]
Do not include any other text.`;

    try {
      const response = await this.aiService.chat(model, [
        { role: 'user', content: prompt },
      ]);
      const match = response.match(/\[.*?\]/s);
      if (!match) return CURATED_STORE_ITEMS.filter((it) => it.featured).slice(0, 4);

      const ids: string[] = JSON.parse(match[0]);
      const result: StoreItem[] = [];
      for (const id of ids) {
        const item = CURATED_STORE_ITEMS.find((it) => it.id === id);
        if (item) result.push(item);
      }
      return result.length > 0 ? result : CURATED_STORE_ITEMS.filter((it) => it.featured).slice(0, 4);
    } catch {
      return CURATED_STORE_ITEMS.filter((it) => it.featured).slice(0, 4);
    }
  }
}
