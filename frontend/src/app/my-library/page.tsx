'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Bookmark,
  Cloud,
  Database,
  FileText,
  Image as ImageIcon,
  Landmark,
  Link2,
  Newspaper,
  Rss,
  Search as SearchIcon,
  UploadCloud,
  Users,
  User,
  Youtube,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import { getUser } from '@/lib/api';
import {
  ExploreBookmarkItem,
  ExploreCategory,
  exploreItems,
  countBookmarkItemsByCategory,
  countBookmarksByCategory,
  getExploreCategoryDescription,
  getExploreCategoryLabel,
  loadExploreBookmarkItems,
  loadExploreBookmarks,
  subscribeExploreBookmarks,
} from '@/lib/ai-explore';

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;
type BookmarkDisplayItem = ExploreBookmarkItem & { bookmarkedAt?: string };

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

const CATEGORY_PILL: Record<ExploreCategory, string> = {
  youtube: 'border-red-200 bg-red-50 text-red-700',
  paper: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  blog: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  report: 'border-amber-200 bg-amber-50 text-amber-700',
  policy: 'border-slate-200 bg-slate-100 text-slate-700',
  news: 'border-sky-200 bg-sky-50 text-sky-700',
};

const TAG_COLORS = [
  'border-violet-200 bg-violet-50 text-violet-700',
  'border-rose-200 bg-rose-50 text-rose-700',
  'border-emerald-200 bg-emerald-50 text-emerald-700',
  'border-amber-200 bg-amber-50 text-amber-700',
  'border-sky-200 bg-sky-50 text-sky-700',
  'border-indigo-200 bg-indigo-50 text-indigo-700',
];

type TopTab = 'data' | 'personal' | 'team';
type SubTab = 'overview' | 'bookmarks' | 'notes' | 'images' | 'notion' | 'drive';

function pillClass(active: boolean): string {
  return [
    'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors',
    active
      ? 'border-purple-200 bg-purple-50 text-purple-700'
      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
  ].join(' ');
}

function hashTag(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function tagClass(tag: string): string {
  if (!tag) return TAG_COLORS[0];
  const index = hashTag(tag) % TAG_COLORS.length;
  return TAG_COLORS[index];
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

export default function MyLibraryPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { locale } = useLanguage();

  const [topTab, setTopTab] = useState<TopTab>('data');
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const [userId, setUserId] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [bookmarkItems, setBookmarkItems] = useState<ExploreBookmarkItem[]>([]);

  useEffect(() => {
    if (!authReady) return;
    setUserId(getUser()?.id ?? null);
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return () => {};
    const refresh = () => {
      setBookmarks(loadExploreBookmarks(userId));
      setBookmarkItems(loadExploreBookmarkItems(userId));
    };
    refresh();
    return subscribeExploreBookmarks(refresh);
  }, [authReady, userId]);

  const counts = useMemo(() => {
    if (bookmarkItems.length > 0) {
      return countBookmarkItemsByCategory(bookmarkItems);
    }
    return countBookmarksByCategory(bookmarks);
  }, [bookmarkItems, bookmarks]);

  const exploreItemMap = useMemo(() => {
    const map = new Map<string, ExploreBookmarkItem>();
    exploreItems.forEach((item) => {
      map.set(item.id, { ...item, bookmarkedAt: '' });
    });
    return map;
  }, []);

  const resolvedBookmarks = useMemo<BookmarkDisplayItem[]>(() => {
    if (bookmarkItems.length > 0) return bookmarkItems;
    return bookmarks
      .map((id) => exploreItemMap.get(id))
      .filter((item): item is ExploreBookmarkItem => Boolean(item));
  }, [bookmarkItems, bookmarks, exploreItemMap]);

  const sortedBookmarks = useMemo(() => {
    const items = [...resolvedBookmarks];
    return items.sort((a, b) => {
      const aTime = new Date(a.bookmarkedAt || a.publishedAt).getTime();
      const bTime = new Date(b.bookmarkedAt || b.publishedAt).getTime();
      if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return 0;
      return bTime - aTime;
    });
  }, [resolvedBookmarks]);

  const uiText = useMemo(() => {
    if (locale === 'zh') {
      return {
        title: '我的知识库',
        subtitle: '管理你的数据源与个人知识资产',
        searchPlaceholder: '搜索你的知识资产...',
        tabs: {
          data: '数据源',
          personal: '个人知识库',
          team: '团队知识库',
        },
        subTabs: {
          overview: '概览',
          bookmarks: '书签',
          notes: '笔记',
          images: '图片',
          notion: 'Notion',
          drive: 'Google Drive',
        },
        sections: {
          dataSources: '数据源概览',
          platform: '平台内数据',
          explore: 'AI探索栏目',
          bookmarks: '书签内容',
          usage: '如何使用数据源？',
        },
        actions: {
          connect: '连接',
          view: '查看',
        },
        status: {
          connected: '已连接',
          disconnected: '未连接',
        },
        hints: {
          explore: '来自 AI 探索的收藏会显示在这里',
          emptyTab: '该栏目内容即将上线',
          noBookmarks: '暂无书签',
        },
        platformCards: {
          bookmarks: { title: '书签', desc: '点击浏览' },
          notes: { title: '笔记', desc: '点击浏览' },
          images: { title: '图片', desc: '点击浏览' },
          upload: { title: '上传文件', desc: '添加内容' },
          url: { title: 'URL 抓取', desc: '导入 URL' },
        },
        usageSteps: [
          '连接外部数据源，可在创建知识库时选择作为数据源。',
          '平台内数据（书签、笔记等）可直接导入到知识库。',
          '同步功能会自动更新知识库内容。',
        ],
      };
    }
    return {
      title: 'My Knowledge Base',
      subtitle: 'Manage your sources and personal knowledge assets',
      searchPlaceholder: 'Search your knowledge assets...',
      tabs: {
        data: 'Data Sources',
        personal: 'Personal Knowledge',
        team: 'Team Knowledge',
      },
      subTabs: {
        overview: 'Overview',
        bookmarks: 'Bookmarks',
        notes: 'Notes',
        images: 'Images',
        notion: 'Notion',
        drive: 'Google Drive',
      },
      sections: {
        dataSources: 'Data Sources Overview',
        platform: 'Platform Data',
        explore: 'AI Explore Channels',
        bookmarks: 'Bookmarked Items',
        usage: 'How to use data sources?',
      },
      actions: {
        connect: 'Connect',
        view: 'View',
      },
      status: {
        connected: 'Connected',
        disconnected: 'Not connected',
      },
      hints: {
        explore: 'Bookmarks from AI Explore show up here',
        emptyTab: 'This section is coming soon',
        noBookmarks: 'No bookmarks yet',
      },
      platformCards: {
        bookmarks: { title: 'Bookmarks', desc: 'View items' },
        notes: { title: 'Notes', desc: 'View notes' },
        images: { title: 'Images', desc: 'View media' },
        upload: { title: 'Upload Files', desc: 'Add content' },
        url: { title: 'URL Fetch', desc: 'Import URL' },
      },
      usageSteps: [
        'Connect external sources and select them when creating a knowledge base.',
        'Platform data (bookmarks, notes, etc.) can be imported directly.',
        'Sync keeps knowledge bases updated automatically.',
      ],
    };
  }, [locale]);

  const externalSources = useMemo(() => ([
    {
      id: 'gdrive',
      name: 'Google Drive',
      description: locale === 'zh'
        ? '同步 Google Drive 文档到知识库'
        : 'Sync Google Drive docs into the knowledge base',
      icon: Cloud,
      status: uiText.status.disconnected,
    },
    {
      id: 'notion',
      name: 'Notion',
      description: locale === 'zh'
        ? '同步 Notion 页面到知识库'
        : 'Sync Notion pages into the knowledge base',
      icon: FileText,
      status: uiText.status.disconnected,
    },
    {
      id: 'feishu',
      name: locale === 'zh' ? '飞书' : 'Feishu',
      description: locale === 'zh'
        ? '同步飞书 Wiki 知识库与文档内容'
        : 'Sync Feishu wiki and docs into the knowledge base',
      icon: BookOpen,
      status: uiText.status.disconnected,
    },
  ]), [locale, uiText.status.disconnected]);

  const platformCards = useMemo(() => ([
    {
      id: 'bookmarks',
      title: uiText.platformCards.bookmarks.title,
      desc: uiText.platformCards.bookmarks.desc,
      icon: Bookmark,
    },
    {
      id: 'notes',
      title: uiText.platformCards.notes.title,
      desc: uiText.platformCards.notes.desc,
      icon: FileText,
    },
    {
      id: 'images',
      title: uiText.platformCards.images.title,
      desc: uiText.platformCards.images.desc,
      icon: ImageIcon,
    },
    {
      id: 'upload',
      title: uiText.platformCards.upload.title,
      desc: uiText.platformCards.upload.desc,
      icon: UploadCloud,
    },
    {
      id: 'url',
      title: uiText.platformCards.url.title,
      desc: uiText.platformCards.url.desc,
      icon: Link2,
    },
  ]), [uiText.platformCards]);

  const showOverview = subTab === 'overview';
  const showBookmarks = subTab === 'bookmarks' || subTab === 'overview';

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
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-sm">
                    <Database size={18} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-xl font-semibold text-gray-900">{uiText.title}</h1>
                    <p className="mt-0.5 text-sm text-gray-500">{uiText.subtitle}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
              <SearchIcon size={16} className="text-gray-400" />
              <input
                placeholder={uiText.searchPlaceholder}
                className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" className={pillClass(topTab === 'data')} onClick={() => setTopTab('data')}>
                <Database size={14} />
                {uiText.tabs.data}
              </button>
              <button type="button" className={pillClass(topTab === 'personal')} onClick={() => setTopTab('personal')}>
                <User size={14} />
                {uiText.tabs.personal}
              </button>
              <button type="button" className={pillClass(topTab === 'team')} onClick={() => setTopTab('team')}>
                <Users size={14} />
                {uiText.tabs.team}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['overview', 'bookmarks', 'notes', 'images', 'notion', 'drive'] as SubTab[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={pillClass(subTab === key)}
                  onClick={() => setSubTab(key)}
                >
                  {uiText.subTabs[key]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-6xl space-y-8">
            {topTab !== 'data' ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
                {uiText.hints.emptyTab}
              </div>
            ) : (
              <>
                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-gray-900">{uiText.sections.dataSources}</h2>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      RAG OK
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {externalSources.map((source) => {
                      const Icon = source.icon;
                      return (
                        <div key={source.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-600">
                                <Icon size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{source.name}</p>
                                <p className="mt-1 text-xs text-gray-500">{source.description}</p>
                              </div>
                            </div>
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                              {source.status}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="mt-3 w-full rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                          >
                            {uiText.actions.connect}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <h2 className="mb-3 text-base font-semibold text-gray-900">{uiText.sections.platform}</h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                    {platformCards.map((card) => {
                      const Icon = card.icon;
                      return (
                        <div key={card.id} className="rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-600">
                            <Icon size={20} />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-gray-900">{card.title}</p>
                          <p className="mt-1 text-xs text-gray-500">{card.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-gray-900">{uiText.sections.explore}</h2>
                    <span className="text-xs text-gray-500">{uiText.hints.explore}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {(['youtube', 'paper', 'blog', 'report', 'policy', 'news'] as ExploreCategory[]).map((cat) => {
                      const Icon = CATEGORY_ICON[cat];
                      return (
                        <Link
                          key={cat}
                          href={`/ai-explore?tab=${cat}`}
                          className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${CATEGORY_BG[cat]} text-white shadow-sm`}>
                              <Icon size={18} />
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-400">{uiText.platformCards.bookmarks.title}</p>
                              <p className="text-lg font-semibold text-gray-900">{counts[cat] ?? 0}</p>
                            </div>
                          </div>
                          <h3 className="mt-3 text-sm font-semibold text-gray-900">
                            {getExploreCategoryLabel(cat, locale)}
                          </h3>
                          <p className="mt-1 text-xs text-gray-500">
                            {getExploreCategoryDescription(cat, locale)}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                      <Database size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{uiText.sections.usage}</h3>
                      <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-gray-500">
                        {uiText.usageSteps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
