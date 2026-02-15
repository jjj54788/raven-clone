'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Bookmark, BookmarkCheck, FileText, Filter, Landmark, Newspaper, Rss, Search as SearchIcon, Youtube,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import { getUser } from '@/lib/api';
import {
  ExploreCategory,
  exploreItems,
  getExploreCategoryLabel,
  isExploreCategory,
  loadExploreBookmarks,
  subscribeExploreBookmarks,
  toggleExploreBookmark,
} from '@/lib/ai-explore';

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

const CATEGORY_ICON: Record<ExploreCategory, IconComponent> = {
  youtube: Youtube,
  paper: FileText,
  blog: Rss,
  report: FileText,
  policy: Landmark,
  news: Newspaper,
};

const CATEGORY_BG: Record<ExploreCategory, string> = {
  youtube: 'bg-gradient-to-br from-red-500 to-rose-600',
  paper: 'bg-gradient-to-br from-indigo-500 to-blue-600',
  blog: 'bg-gradient-to-br from-emerald-500 to-green-600',
  report: 'bg-gradient-to-br from-amber-500 to-orange-600',
  policy: 'bg-gradient-to-br from-slate-600 to-slate-800',
  news: 'bg-gradient-to-br from-sky-500 to-cyan-600',
};

function pillClass(active: boolean): string {
  return [
    'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors',
    active
      ? 'border-purple-200 bg-purple-50 text-purple-700'
      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
  ].join(' ');
}

function tagPillClass(active: boolean): string {
  return [
    'inline-flex items-center rounded-full border px-2.5 py-1 text-xs transition-colors',
    active
      ? 'border-purple-200 bg-purple-50 text-purple-700'
      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
  ].join(' ');
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

function getDomain(url: string): string {
  try {
    const host = new URL(url).hostname;
    return host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isYoutubeUrl(url: string): boolean {
  const domain = getDomain(url);
  return domain === 'youtube.com' || domain === 'youtu.be';
}

function formatDate(value: string, locale: 'en' | 'zh'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (locale === 'zh') {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function AiExploreClient() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { locale } = useLanguage();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<ExploreCategory>('youtube');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest'>('latest');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    if (!authReady) return;
    setUserId(getUser()?.id ?? null);
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return () => {};
    const refresh = () => setBookmarks(loadExploreBookmarks(userId));
    refresh();
    return subscribeExploreBookmarks(refresh);
  }, [authReady, userId]);

  useEffect(() => {
    const param = searchParams.get('tab');
    if (isExploreCategory(param)) {
      setTab(param);
    }
  }, [searchParams]);

  const uiText = useMemo(() => {
    if (locale === 'zh') {
      return {
        title: 'AI探索',
        subtitle: '跨来源发现与收藏 AI 相关内容',
        searchPlaceholder: '搜索 AI 资源...',
        empty: '暂无匹配内容',
        bookmark: '收藏',
        bookmarked: '已收藏',
        filterLabel: '筛选',
        filterHint: '关注标签',
        sortLatest: '最新',
        sortOldest: '最早',
      };
    }
    return {
      title: 'AI Explore',
      subtitle: 'Discover AI content across sources and save bookmarks',
      searchPlaceholder: 'Search AI resources...',
      empty: 'No matching results',
      bookmark: 'Bookmark',
      bookmarked: 'Bookmarked',
      filterLabel: 'Filter',
      filterHint: 'Focus tags',
      sortLatest: 'Latest',
      sortOldest: 'Oldest',
    };
  }, [locale]);

  const availableTags = useMemo(() => {
    if (tab !== 'youtube') return [];
    const set = new Set<string>();
    for (const item of exploreItems) {
      if (item.category !== 'youtube') continue;
      if (!isYoutubeUrl(item.url)) continue;
      for (const tag of item.tags) set.add(tag);
    }
    return Array.from(set);
  }, [tab]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      return [...prev, tag];
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let items = exploreItems.filter((item) => {
      if (item.category !== tab) return false;
      if (item.category === 'youtube' && !isYoutubeUrl(item.url)) return false;
      if (!q) return true;
      const hay = [
        item.title.en,
        item.title.zh,
        item.summary.en,
        item.summary.zh,
        item.source,
        item.tags.join(' '),
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });

    if (tab === 'youtube' && selectedTags.length > 0) {
      items = items.filter((item) => selectedTags.every((tag) => item.tags.includes(tag)));
    }

    items = [...items].sort((a, b) => {
      const aTime = new Date(a.publishedAt).getTime();
      const bTime = new Date(b.publishedAt).getTime();
      if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return 0;
      return sortBy === 'latest' ? bTime - aTime : aTime - bTime;
    });

    return items;
  }, [search, tab, selectedTags, sortBy]);

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
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-500 text-white shadow-sm">
                    <SearchIcon size={18} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-xl font-semibold text-gray-900">{uiText.title}</h1>
                    <p className="mt-0.5 text-sm text-gray-500">{uiText.subtitle}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
                <SearchIcon size={16} className="text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={uiText.searchPlaceholder}
                  className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {(['youtube', 'paper', 'blog', 'report', 'policy', 'news'] as ExploreCategory[]).map((cat) => {
                    const Icon = CATEGORY_ICON[cat];
                    return (
                      <button
                        key={cat}
                        type="button"
                        className={pillClass(tab === cat)}
                        onClick={() => {
                          setTab(cat);
                          setSelectedTags([]);
                        }}
                      >
                        <Icon size={14} />
                        {getExploreCategoryLabel(cat, locale)}
                      </button>
                    );
                  })}
                </div>
                {tab === 'youtube' && (
                  <div className="flex flex-wrap items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500 shadow-sm">
                    <Filter size={14} className="text-gray-400" />
                    <span className="font-medium text-gray-600">{uiText.filterLabel}</span>
                    <div className="flex flex-wrap items-center gap-1">
                      {availableTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={tagPillClass(selectedTags.includes(tag))}
                          aria-pressed={selectedTags.includes(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'latest' | 'oldest')}
                      className="ml-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600 outline-none"
                    >
                      <option value="latest">{uiText.sortLatest}</option>
                      <option value="oldest">{uiText.sortOldest}</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
                {uiText.empty}
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((item) => {
                  const isBookmarked = bookmarks.includes(item.id);
                  const Icon = CATEGORY_ICON[item.category];
                  const title = locale === 'zh' ? item.title.zh : item.title.en;
                  const summary = locale === 'zh' ? item.summary.zh : item.summary.en;
                  const href = safeUrl(item.url);
                  const domain = getDomain(item.url);
                  const isYoutube = item.category === 'youtube' && isYoutubeUrl(item.url);
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start gap-4">
                        {isYoutube && item.thumbnailUrl ? (
                          <div className="h-[90px] w-[160px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                            <img
                              src={item.thumbnailUrl}
                              alt={title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${CATEGORY_BG[item.category]} text-white shadow-sm`}>
                            <Icon size={22} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                <span>{formatDate(item.publishedAt, locale)}</span>
                                <span className="h-1 w-1 rounded-full bg-gray-300" />
                                <span>{isYoutube ? 'YouTube' : item.source}</span>
                                {isYoutube && item.channel ? (
                                  <>
                                    <span className="h-1 w-1 rounded-full bg-gray-300" />
                                    <span>{item.channel}</span>
                                  </>
                                ) : null}
                              </div>
                              {href ? (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 line-clamp-2 text-base font-semibold text-gray-900 hover:text-purple-700"
                                >
                                  {title}
                                </a>
                              ) : (
                                <h3 className="mt-1 line-clamp-2 text-base font-semibold text-gray-900">{title}</h3>
                              )}
                              <p className="mt-2 line-clamp-2 text-sm text-gray-600">{summary}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setBookmarks(toggleExploreBookmark(userId, item.id))}
                              className={[
                                'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition-colors',
                                isBookmarked
                                  ? 'border-purple-200 bg-purple-50 text-purple-700'
                                  : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
                              ].join(' ')}
                            >
                              {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                              <span>{isBookmarked ? uiText.bookmarked : uiText.bookmark}</span>
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            {domain ? <span>{domain}</span> : null}
                            {item.tags.map((tag) => (
                              <span key={tag} className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default AiExploreClient;
