'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, Bot, Brain, Code, FileText, Github, Link2, Palette, Plus, Search as SearchIcon, Star, Store as StoreIcon, Trash2, Video, X,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  createCustomStoreItem,
  deleteCustomStoreItem,
  getStoreItems,
} from '@/lib/api';

type StoreItemType = 'tool' | 'skill';
type StoreItemSource = 'curated' | 'github' | 'internal' | 'custom';
type StoreItemPricing = 'free' | 'freemium' | 'paid' | 'open_source';

interface StoreItem {
  id: string;
  ownerUserId?: string;
  type: StoreItemType;
  source: StoreItemSource;
  name: string;
  description: string;
  url: string;
  iconText?: string;
  rating?: number;
  usersText?: string;
  pricing?: StoreItemPricing;
  featured?: boolean;
  categories: string[];
  tags: string[];
  links?: Array<{ label: string; url: string }>;
  trialNotesMarkdown?: string;
  recommendReasons?: string[];
  githubRepoUrl?: string;
  githubStars?: number;
  createdAt?: string;
  updatedAt?: string;
}

function pricingLabel(pricing: StoreItemPricing | undefined): string {
  switch (pricing) {
    case 'free':
      return 'Free';
    case 'paid':
      return 'Paid';
    case 'open_source':
      return 'Open Source';
    default:
      return 'Freemium';
  }
}

function pricingBadgeClass(pricing: StoreItemPricing | undefined): string {
  switch (pricing) {
    case 'paid':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'open_source':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'free':
      return 'bg-sky-50 text-sky-700 border-sky-100';
    default:
      return 'bg-indigo-50 text-indigo-700 border-indigo-100';
  }
}

function parseUsersText(usersText: string | undefined): number {
  if (!usersText) return 0;
  const raw = usersText.trim();
  if (!raw) return 0;

  const m = raw.match(/^(\d+(?:\.\d+)?)([KMB])\+?$/i);
  if (!m) return 0;

  const n = Number.parseFloat(m[1]);
  if (!Number.isFinite(n)) return 0;

  const unit = m[2].toUpperCase();
  const factor = unit === 'K' ? 1_000 : unit === 'M' ? 1_000_000 : 1_000_000_000;
  return n * factor;
}

function safeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
    return '';
  } catch {
    return '';
  }
}

function pillClass(active: boolean): string {
  return [
    'inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors whitespace-nowrap',
    active
      ? 'border-purple-200 bg-purple-50 text-purple-700'
      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
  ].join(' ');
}

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

const ICON_BY_ID: Record<string, { Icon: IconComponent; bg: string }> = {
  chatgpt: { Icon: Bot, bg: 'bg-gradient-to-br from-emerald-500 to-green-600' },
  claude: { Icon: Brain, bg: 'bg-gradient-to-br from-amber-500 to-orange-600' },
  midjourney: { Icon: Palette, bg: 'bg-gradient-to-br from-fuchsia-500 to-pink-600' },
  'github-copilot': { Icon: Code, bg: 'bg-gradient-to-br from-slate-700 to-slate-900' },
  perplexity: { Icon: SearchIcon, bg: 'bg-gradient-to-br from-sky-500 to-blue-600' },
  runway: { Icon: Video, bg: 'bg-gradient-to-br from-violet-500 to-purple-700' },
  'notion-ai': { Icon: FileText, bg: 'bg-gradient-to-br from-zinc-700 to-neutral-900' },
  firecrawl: { Icon: Github, bg: 'bg-gradient-to-br from-neutral-700 to-neutral-900' },
  langchain: { Icon: Link2, bg: 'bg-gradient-to-br from-indigo-500 to-blue-700' },
};

function iconMetaFor(item: StoreItem): { Icon?: IconComponent; text?: string; bg: string } {
  const mapped = ICON_BY_ID[item.id];
  if (mapped) return mapped;

  const rawText = item.iconText?.trim();
  if (rawText) {
    return { text: rawText, bg: 'bg-gradient-to-br from-purple-600 to-indigo-500' };
  }

  if (item.source === 'github') {
    return { Icon: Github, bg: 'bg-gradient-to-br from-neutral-700 to-neutral-900' };
  }

  if (item.source === 'custom') {
    return { Icon: Link2, bg: 'bg-gradient-to-br from-purple-600 to-indigo-500' };
  }

  return { Icon: StoreIcon, bg: 'bg-gradient-to-br from-purple-600 to-indigo-500' };
}

function StoreCard({
  item,
  featured,
  onDelete,
}: {
  item: StoreItem;
  featured?: boolean;
  onDelete?: (id: string) => void;
}) {
  const href = safeUrl(item.url);
  const iconMeta = iconMetaFor(item);
  const iconText = iconMeta.text || item.name.slice(0, 1).toUpperCase();
  const iconCharCount = Array.from(iconText).length;
  const iconTextClass = iconCharCount <= 1 ? 'text-lg' : iconCharCount <= 2 ? 'text-base' : 'text-sm';
  const usersValue = parseUsersText(item.usersText);
  const usersLabel = item.usersText
    ? usersValue > 0 ? `${item.usersText} 用户` : item.usersText
    : null;

  return (
    <div
      className={[
        'group rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
        featured ? 'border-gray-200 p-5' : 'border-gray-200 p-4',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconMeta.bg} text-white shadow-sm`}>
          {iconMeta.Icon ? (
            <iconMeta.Icon size={20} className="text-white" />
          ) : (
            <span className={`font-semibold leading-none ${iconTextClass}`}>{iconText}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-gray-900">{item.name}</h3>
                {item.featured && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    精选
                  </span>
                )}
                {item.pricing && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${pricingBadgeClass(item.pricing)}`}>
                    {pricingLabel(item.pricing)}
                  </span>
                )}
                {item.source === 'custom' && (
                  <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                    自定义
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                {item.description}
              </p>
            </div>

            {onDelete && item.source === 'custom' ? (
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="hidden rounded-lg p-2 text-gray-300 hover:bg-gray-50 hover:text-red-500 group-hover:block"
                title="删除"
              >
                <Trash2 size={16} />
              </button>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {typeof item.rating === 'number' ? (
              <span className="inline-flex items-center gap-1">
                <Star size={14} className="text-amber-500" />
                <span className="font-medium text-gray-700">{item.rating.toFixed(1)}</span>
              </span>
            ) : null}
            {usersLabel ? (
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                {usersLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {item.tags.slice(0, featured ? 4 : 3).map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                >
                  {t}
                </span>
              ))}
            </div>

            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-purple-700 hover:bg-purple-50"
              >
                访问 <ArrowUpRight size={14} />
              </a>
            ) : (
              <span className="text-sm text-gray-400">无链接</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function parseCommaList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AiStorePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { locale } = useLanguage();

  const [tab, setTab] = useState<StoreItemType>('tool');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'rating' | 'users' | 'name'>('rating');
  const [category, setCategory] = useState<string>('全部');

  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    type: 'tool' as StoreItemType,
    name: '',
    description: '',
    url: '',
    iconText: '',
    pricing: 'freemium' as StoreItemPricing,
    categories: '',
    tags: '',
  });

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getStoreItems();
        if (cancelled) return;
        setItems(Array.isArray(data) ? (data as StoreItem[]) : []);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Failed to load store items');
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  useEffect(() => {
    setCategory('全部');
  }, [tab]);

  const uiText = useMemo(() => {
    const zh = {
      title: 'AI Store',
      subtitle: '发现 AI 工具和 Agent 技能',
      tabTools: 'AI 工具',
      tabSkills: 'Agent 技能',
      searchPlaceholder: tab === 'tool' ? '搜索 AI 工具、功能或标签...' : '搜索 Agent 技能、功能或标签...',
      sortLabel: '排序',
      featured: '编辑精选',
      all: tab === 'tool' ? '全部工具' : '全部技能',
      addCustom: '添加自定义链接',
      loading: '加载中...',
      empty: '暂无匹配内容',
      sortRating: '按评分排序',
      sortUsers: '按用户数排序',
      sortName: '按名称排序',
    };
    const en = {
      title: 'AI Store',
      subtitle: 'Discover AI tools and agent skills',
      tabTools: 'AI Tools',
      tabSkills: 'Agent Skills',
      searchPlaceholder: tab === 'tool' ? 'Search tools, features, or tags...' : 'Search skills, features, or tags...',
      sortLabel: 'Sort',
      featured: 'Editor Picks',
      all: tab === 'tool' ? 'All Tools' : 'All Skills',
      addCustom: 'Add Custom Link',
      loading: 'Loading...',
      empty: 'No results',
      sortRating: 'Rating',
      sortUsers: 'Users',
      sortName: 'Name',
    };
    return locale === 'zh' ? zh : en;
  }, [locale, tab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items.filter((it) => it.type === tab);

    if (category !== '全部') {
      list = list.filter((it) => it.categories.includes(category));
    }

    if (q) {
      list = list.filter((it) => {
        const hay = [it.name, it.description, ...it.tags, ...it.categories].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }

    const sorted = [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'users') return parseUsersText(b.usersText) - parseUsersText(a.usersText);
      return (b.rating || 0) - (a.rating || 0);
    });

    return sorted;
  }, [items, tab, search, category, sort]);

  const featuredItems = useMemo(() => filtered.filter((it) => it.featured).slice(0, 3), [filtered]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      if (it.type !== tab) continue;
      for (const c of it.categories) set.add(c);
    }
    return ['全部', ...Array.from(set)];
  }, [items, tab]);

  const onOpenCreate = () => {
    setCreateDraft((d) => ({ ...d, type: tab }));
    setCreateOpen(true);
  };

  const onCreate = async () => {
    const name = createDraft.name.trim();
    const description = createDraft.description.trim();
    const url = createDraft.url.trim();
    if (!name || !description || !url) return;

    try {
      const created = await createCustomStoreItem({
        type: createDraft.type,
        name,
        description,
        url,
        iconText: createDraft.iconText.trim() || undefined,
        pricing: createDraft.pricing,
        categories: parseCommaList(createDraft.categories),
        tags: parseCommaList(createDraft.tags),
      });
      setItems((prev) => [created as StoreItem, ...prev]);
      setCreateOpen(false);
      setCreateDraft({
        type: tab,
        name: '',
        description: '',
        url: '',
        iconText: '',
        pricing: 'freemium',
        categories: '',
        tags: '',
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to create custom item');
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteCustomStoreItem(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete custom item');
    }
  };

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFA]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onShowHistory={() => {}}
        userName={userName}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-5 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm">
                    <StoreIcon size={18} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-xl font-semibold text-gray-900">{uiText.title}</h1>
                    <p className="mt-0.5 text-sm text-gray-500">{uiText.subtitle}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setTab('tool')}
                    className={[
                      'relative pb-2 text-sm font-semibold transition-colors',
                      tab === 'tool' ? 'text-purple-700' : 'text-gray-500 hover:text-gray-700',
                    ].join(' ')}
                  >
                    {uiText.tabTools}
                    {tab === 'tool' && <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-purple-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('skill')}
                    className={[
                      'relative pb-2 text-sm font-semibold transition-colors',
                      tab === 'skill' ? 'text-purple-700' : 'text-gray-500 hover:text-gray-700',
                    ].join(' ')}
                  >
                    {uiText.tabSkills}
                    {tab === 'skill' && <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-purple-600" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
              >
                <Plus size={16} />
                {uiText.addCustom}
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
                <SearchIcon size={16} className="text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={uiText.searchPlaceholder}
                  className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
                  <span className="text-sm font-medium text-gray-600">{uiText.sortLabel}</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as any)}
                    className="bg-transparent text-sm text-gray-700 outline-none"
                  >
                    <option value="rating">{uiText.sortRating}</option>
                    <option value="users">{uiText.sortUsers}</option>
                    <option value="name">{uiText.sortName}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            {error ? (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="py-10 text-center text-sm text-gray-400">{uiText.loading}</div>
            ) : (
              <>
                {featuredItems.length > 0 ? (
                  <section className="mb-7">
                    <div className="mb-3 flex items-center gap-2">
                      <Star size={16} className="text-amber-500" />
                      <h2 className="text-base font-semibold text-gray-900">{uiText.featured}</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {featuredItems.map((it) => (
                        <StoreCard key={it.id} item={it} featured onDelete={onDelete} />
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="mb-6">
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={pillClass(category === c)}
                        onClick={() => setCategory(c)}
                      >
                        {c === '全部' ? uiText.all : c}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <h2 className="text-base font-semibold text-gray-900">
                      {uiText.all} <span className="text-sm font-medium text-gray-400">({filtered.length})</span>
                    </h2>
                  </div>

                  {filtered.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
                      {uiText.empty}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {filtered.map((it) => (
                        <StoreCard key={it.id} item={it} onDelete={onDelete} />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>

      </main>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">添加自定义链接</h3>
                <p className="mt-0.5 text-sm text-gray-500">预留给客户自定义：你可以添加自己的 AI 工具 / App 链接。</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm text-gray-700">
                  类型
                  <select
                    value={createDraft.type}
                    onChange={(e) => setCreateDraft((d) => ({ ...d, type: e.target.value as StoreItemType }))}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                  >
                    <option value="tool">AI 工具</option>
                    <option value="skill">Agent 技能</option>
                  </select>
                </label>
                <label className="text-sm text-gray-700">
                  计费
                  <select
                    value={createDraft.pricing}
                    onChange={(e) => setCreateDraft((d) => ({ ...d, pricing: e.target.value as StoreItemPricing }))}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                  >
                    <option value="freemium">Freemium</option>
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                    <option value="open_source">Open Source</option>
                  </select>
                </label>
              </div>

              <label className="text-sm text-gray-700">
                名称
                <input
                  value={createDraft.name}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                  placeholder="例如：我的 AI 工具"
                />
              </label>

              <label className="text-sm text-gray-700">
                简介
                <input
                  value={createDraft.description}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, description: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                  placeholder="一句话介绍它能做什么"
                />
              </label>

              <label className="text-sm text-gray-700">
                链接 URL
                <input
                  value={createDraft.url}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, url: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                  placeholder="https://..."
                />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm text-gray-700">
                  Icon（可选）
                  <input
                    value={createDraft.iconText}
                    onChange={(e) => setCreateDraft((d) => ({ ...d, iconText: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                    placeholder="🤖 / A"
                  />
                </label>
                <label className="text-sm text-gray-700">
                  分类（逗号分隔）
                  <input
                    value={createDraft.categories}
                    onChange={(e) => setCreateDraft((d) => ({ ...d, categories: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                    placeholder="效率工具, 写作内容"
                  />
                </label>
              </div>

              <label className="text-sm text-gray-700">
                标签（逗号分隔，可选）
                <input
                  value={createDraft.tags}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, tags: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                  placeholder="RAG, Web, 代码"
                />
              </label>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={onCreate}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
