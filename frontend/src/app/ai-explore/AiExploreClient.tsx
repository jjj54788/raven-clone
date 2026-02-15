'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowUp,
  Bookmark,
  BookmarkCheck,
  FileText,
  Filter,
  Landmark,
  Newspaper,
  Plus,
  Rss,
  Search as SearchIcon,
  X,
  Youtube,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import { getUser, getYoutubeExplore } from '@/lib/api';
import {
  ExploreCategory,
  exploreItems,
  addExploreKeyword,
  getExploreCategoryLabel,
  isExploreCategory,
  loadExploreBookmarks,
  loadExploreKeywords,
  removeExploreKeyword,
  subscribeExploreBookmarks,
  subscribeExploreKeywords,
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
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [youtubeItems, setYoutubeItems] = useState<typeof exploreItems>([]);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeLoadingMore, setYoutubeLoadingMore] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
    if (!authReady) return () => {};
    const refresh = () => setKeywords(loadExploreKeywords(userId));
    refresh();
    return subscribeExploreKeywords(refresh);
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
        filterHint: '关注词',
        sortLatest: '最新',
        sortOldest: '最早',
        keywordPlaceholder: '添加关注词',
        keywordAdd: '添加',
        keywordEmpty: '还没有关注词',
        youtubeLoading: '加载 YouTube 内容中...',
        youtubeError: 'YouTube 数据暂不可用，请稍后再试',
        youtubeMore: '加载更多',
        youtubeNoMore: '没有更多结果了',
        youtubeLoadingMore: '正在加载更多...',
        youtubeFallback: '当前显示示例数据，请稍后重试',
        loadedCount: (count: number) => `已加载 ${count} 条`,
        backToTop: '回到顶部',
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
      filterHint: 'Focus keywords',
      sortLatest: 'Latest',
      sortOldest: 'Oldest',
      keywordPlaceholder: 'Add keyword',
      keywordAdd: 'Add',
      keywordEmpty: 'No keywords yet',
      youtubeLoading: 'Loading YouTube results...',
      youtubeError: 'YouTube data is unavailable right now',
      youtubeMore: 'Load more',
      youtubeNoMore: 'No more results',
      youtubeLoadingMore: 'Loading more...',
      youtubeFallback: 'Showing sample data for now. Please try again later.',
      loadedCount: (count: number) => `Loaded ${count} items`,
      backToTop: 'Back to top',
    };
  }, [locale]);

  const fallbackYoutubeItems = useMemo(
    () => exploreItems.filter((item) => item.category === 'youtube'),
    [],
  );

  const toggleKeyword = (keyword: string) => {
    setActiveKeywords((prev) => {
      if (prev.includes(keyword)) return prev.filter((item) => item !== keyword);
      return [...prev, keyword];
    });
  };

  const handleAddKeyword = () => {
    const value = keywordInput.trim();
    if (!value) return;
    const next = addExploreKeyword(userId, value);
    setKeywords(next);
    setKeywordInput('');
    if (!activeKeywords.includes(value)) {
      setActiveKeywords((prev) => [...prev, value]);
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    const next = removeExploreKeyword(userId, keyword);
    setKeywords(next);
    setActiveKeywords((prev) => prev.filter((item) => item !== keyword));
  };

  useEffect(() => {
    if (!authReady || tab !== 'youtube') return () => {};
    let cancelled = false;
    const run = async () => {
      setYoutubeLoading(true);
      setYoutubeError(null);
      try {
        const data = await getYoutubeExplore({
          q: search.trim() || undefined,
          keywords: activeKeywords,
          order: sortBy,
          maxResults: 12,
        });
        if (cancelled) return;
        const mapped = (data?.items ?? []).map((item) => ({
          id: item.id,
          category: 'youtube' as ExploreCategory,
          title: { en: item.title, zh: item.title },
          summary: { en: item.description, zh: item.description },
          source: 'YouTube',
          url: item.url,
          publishedAt: item.publishedAt,
          tags: activeKeywords.length > 0 ? [...activeKeywords] : [],
          channel: item.channel,
          thumbnailUrl: item.thumbnailUrl,
        }));
        setYoutubeItems(mapped);
        setNextPageToken(data?.nextPageToken ?? null);
        setUsingFallback(false);
      } catch (err: any) {
        if (cancelled) return;
        setYoutubeError(err?.message || uiText.youtubeError);
        setYoutubeItems(fallbackYoutubeItems);
        setNextPageToken(null);
        setUsingFallback(true);
      } finally {
        if (!cancelled) setYoutubeLoading(false);
      }
    };
    const handle = window.setTimeout(run, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [authReady, tab, search, activeKeywords, sortBy, uiText.youtubeError, fallbackYoutubeItems]);

  const handleLoadMore = useCallback(async () => {
    if (youtubeLoading || youtubeLoadingMore || !nextPageToken) return;
    setYoutubeLoadingMore(true);
    setYoutubeError(null);
    try {
      const data = await getYoutubeExplore({
        q: search.trim() || undefined,
        keywords: activeKeywords,
        order: sortBy,
        maxResults: 12,
        pageToken: nextPageToken || undefined,
      });
      const mapped = (data?.items ?? []).map((item) => ({
        id: item.id,
        category: 'youtube' as ExploreCategory,
        title: { en: item.title, zh: item.title },
        summary: { en: item.description, zh: item.description },
        source: 'YouTube',
        url: item.url,
        publishedAt: item.publishedAt,
        tags: activeKeywords.length > 0 ? [...activeKeywords] : [],
        channel: item.channel,
        thumbnailUrl: item.thumbnailUrl,
      }));
      setYoutubeItems((prev) => [...prev, ...mapped]);
      setNextPageToken(data?.nextPageToken ?? null);
    } catch (err: any) {
      setYoutubeError(err?.message || uiText.youtubeError);
    } finally {
      setYoutubeLoadingMore(false);
    }
  }, [activeKeywords, nextPageToken, search, sortBy, uiText.youtubeError, youtubeLoading, youtubeLoadingMore]);

  useEffect(() => {
    if (tab !== 'youtube') return;
    const root = scrollRef.current;
    const target = sentinelRef.current;
    if (!root || !target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) handleLoadMore();
      },
      { root, rootMargin: '200px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [handleLoadMore, tab]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const onScroll = () => setShowBackTop(node.scrollTop > 480);
    onScroll();
    node.addEventListener('scroll', onScroll);
    return () => node.removeEventListener('scroll', onScroll);
  }, [tab]);

  const handleBackTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filtered = useMemo(() => {
    if (tab === 'youtube') {
      let items = [...youtubeItems];
      if (usingFallback) {
        const q = search.trim().toLowerCase();
        const keywordSet = new Set(activeKeywords.map((keyword) => keyword.toLowerCase()));
        items = items.filter((item) => {
          if (q) {
            const hay = [
              item.title.en,
              item.title.zh,
              item.summary.en,
              item.summary.zh,
              item.source,
              item.tags.join(' '),
              item.channel || '',
            ].join(' ').toLowerCase();
            if (!hay.includes(q)) return false;
          }
          if (keywordSet.size === 0) return true;
          return item.tags.some((tag) => keywordSet.has(tag.toLowerCase()));
        });
      }
      const sorted = items.sort((a, b) => {
        const aTime = new Date(a.publishedAt).getTime();
        const bTime = new Date(b.publishedAt).getTime();
        if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return 0;
        return sortBy === 'latest' ? bTime - aTime : aTime - bTime;
      });
      return sorted;
    }
    const q = search.trim().toLowerCase();
    let items = exploreItems.filter((item) => {
      if (item.category !== tab) return false;
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

    return items;
  }, [search, tab, youtubeItems, sortBy, usingFallback, activeKeywords]);

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
                          setActiveKeywords([]);
                        }}
                      >
                        <Icon size={14} />
                        {getExploreCategoryLabel(cat, locale)}
                      </button>
                    );
                  })}
                </div>
                {tab === 'youtube' && (
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500 shadow-sm">
                    <Filter size={14} className="text-gray-400" />
                    <span className="font-medium text-gray-600">{uiText.filterHint}</span>
                    <div className="flex flex-wrap items-center gap-1">
                      {keywords.length === 0 ? (
                        <span className="text-gray-400">{uiText.keywordEmpty}</span>
                      ) : (
                        keywords.map((keyword) => (
                          <span
                            key={keyword}
                            className={tagPillClass(activeKeywords.includes(keyword))}
                          >
                            <button
                              type="button"
                              onClick={() => toggleKeyword(keyword)}
                              className="px-1"
                              aria-pressed={activeKeywords.includes(keyword)}
                            >
                              {keyword}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyword(keyword)}
                              className="ml-1 rounded-full p-0.5 text-gray-400 hover:text-gray-600"
                              title={locale === 'zh' ? '移除' : 'Remove'}
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5">
                      <input
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddKeyword();
                          }
                        }}
                        placeholder={uiText.keywordPlaceholder}
                        className="w-24 bg-transparent text-xs text-gray-600 outline-none placeholder:text-gray-400"
                      />
                      <button
                        type="button"
                        onClick={handleAddKeyword}
                        className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 hover:bg-purple-100"
                      >
                        <Plus size={12} />
                        {uiText.keywordAdd}
                      </button>
                    </div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'latest' | 'oldest')}
                      className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600 outline-none"
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

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            {tab === 'youtube' && youtubeError && !usingFallback ? (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {youtubeError}
              </div>
            ) : null}
            {tab === 'youtube' && usingFallback ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {uiText.youtubeFallback}
              </div>
            ) : null}
            {tab === 'youtube' && filtered.length > 0 ? (
              <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
                <span>{uiText.loadedCount(filtered.length)}</span>
                {youtubeLoadingMore && <span>{uiText.youtubeLoadingMore}</span>}
              </div>
            ) : null}
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
                {tab === 'youtube' && youtubeLoading ? uiText.youtubeLoading : uiText.empty}
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
                              onClick={() => setBookmarks(toggleExploreBookmark(userId, item.id, item))}
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
                {tab === 'youtube' && (
                  <div className="flex items-center justify-center pt-2">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={!nextPageToken || youtubeLoadingMore}
                      className={[
                        'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                        nextPageToken
                          ? 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
                          : 'border-gray-200 bg-gray-50 text-gray-400',
                      ].join(' ')}
                    >
                      {nextPageToken
                        ? youtubeLoadingMore ? uiText.youtubeLoadingMore : uiText.youtubeMore
                        : uiText.youtubeNoMore}
                    </button>
                  </div>
                )}
                {tab === 'youtube' && <div ref={sentinelRef} className="h-1" />}
              </div>
            )}
          </div>
        </div>
      </main>

      {showBackTop && (
        <button
          type="button"
          onClick={handleBackTop}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-lg hover:bg-gray-50"
        >
          <ArrowUp size={16} />
          {uiText.backToTop}
        </button>
      )}
    </div>
  );
}

export default AiExploreClient;
