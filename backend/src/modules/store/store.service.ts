import { Injectable, NotFoundException } from '@nestjs/common';
import type { StoreCustomItem } from '@prisma/client';
import { StoreItemPricing as PrismaStoreItemPricing, StoreItemType as PrismaStoreItemType } from '@prisma/client';
import { CURATED_STORE_ITEMS, DEFAULT_TOOL_CATEGORIES } from './store.data';
import type { StoreItem, StoreItemType as StoreItemKind } from './store.types';
import type { CreateCustomStoreItemDto } from './dto/create-custom-store-item.dto';
import type { ListStoreItemsQueryDto } from './dto/list-store-items-query.dto';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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

    return items;
  }

  async getItemById(userId: string, id: string): Promise<StoreItem> {
    const curated = CURATED_STORE_ITEMS.find((it) => it.id === id);
    if (curated) return curated;

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
}
