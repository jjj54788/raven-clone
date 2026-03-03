'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowUpRight, Bookmark, BookmarkCheck,
  Bot, Brain, CheckCircle2, Code, ExternalLink, FileText,
  Github, GitFork, Link2, Palette, Search as SearchIcon, Star, Store as StoreIcon, TrendingUp, Video,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import {
  addStoreBookmark,
  getStoreBookmarks,
  getStoreItem,
  getStoreItems,
  removeStoreBookmark,
  type StoreItem,
  type ToolEvalScore,
} from '@/lib/api';

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
  if (rawText) return { text: rawText, bg: 'bg-gradient-to-br from-purple-600 to-indigo-500' };
  if (item.source === 'github') return { Icon: Github, bg: 'bg-gradient-to-br from-neutral-700 to-neutral-900' };
  if (item.source === 'custom') return { Icon: Link2, bg: 'bg-gradient-to-br from-purple-600 to-indigo-500' };
  return { Icon: StoreIcon, bg: 'bg-gradient-to-br from-purple-600 to-indigo-500' };
}

function pricingLabel(pricing: StoreItem['pricing']): string {
  switch (pricing) {
    case 'free': return 'Free';
    case 'paid': return 'Paid';
    case 'open_source': return 'Open Source';
    default: return 'Freemium';
  }
}

function pricingBadgeClass(pricing: StoreItem['pricing']): string {
  switch (pricing) {
    case 'paid': return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'open_source': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'free': return 'bg-sky-50 text-sky-700 border-sky-100';
    default: return 'bg-indigo-50 text-indigo-700 border-indigo-100';
  }
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

const EVAL_LABELS: { key: keyof ToolEvalScore; label: string }[] = [
  { key: 'context', label: '上下文理解' },
  { key: 'creativity', label: '创意表现' },
  { key: 'quality', label: '输出质量' },
  { key: 'multimodal', label: '多模态' },
  { key: 'safety', label: '安全可靠' },
];

const GRADE_STYLE: Record<string, string> = {
  S: 'bg-purple-100 text-purple-700',
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-amber-100 text-amber-700',
};

function ToolEvalBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[4.5rem] shrink-0 text-xs text-gray-500">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-purple-500 transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-7 text-right text-xs font-semibold tabular-nums text-gray-700">{score}</span>
    </div>
  );
}

function ToolEvalCard({ score }: { score: ToolEvalScore }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">AI 能力评估</h2>
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${GRADE_STYLE[score.grade] ?? 'bg-gray-100 text-gray-700'}`}>
          {score.grade}
        </span>
      </div>
      <div className="space-y-2.5">
        {EVAL_LABELS.map(({ key, label }) => (
          <ToolEvalBar key={key} label={label} score={score[key] as number} />
        ))}
      </div>
    </div>
  );
}

function RelatedCard({ item, onClick }: { item: StoreItem; onClick: () => void }) {
  const iconMeta = iconMetaFor(item);
  const iconText = iconMeta.text || item.name.slice(0, 1).toUpperCase();
  const iconCharCount = Array.from(iconText).length;
  const iconTextClass = iconCharCount <= 1 ? 'text-lg' : iconCharCount <= 2 ? 'text-base' : 'text-sm';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconMeta.bg} text-white`}>
        {iconMeta.Icon ? (
          <iconMeta.Icon size={18} className="text-white" />
        ) : (
          <span className={`font-semibold leading-none ${iconTextClass}`}>{iconText}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{item.description}</p>
      </div>
    </button>
  );
}

export default function StoreItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userName, authReady } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const itemId = typeof params?.itemId === 'string' ? params.itemId : Array.isArray(params?.itemId) ? params.itemId[0] : '';

  const [item, setItem] = useState<StoreItem | null>(null);
  const [allItems, setAllItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  useEffect(() => {
    if (!authReady || !itemId) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [itemData, allData, bookmarks] = await Promise.all([
          getStoreItem(itemId),
          getStoreItems(),
          getStoreBookmarks().catch(() => [] as StoreItem[]),
        ]);
        if (cancelled) return;
        setItem(itemData);
        setAllItems(Array.isArray(allData) ? (allData as StoreItem[]) : []);
        setBookmarked(bookmarks.some((b) => b.id === itemId));
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Failed to load item');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [authReady, itemId]);

  const relatedItems = useMemo(() => {
    if (!item) return [];
    return allItems
      .filter((it) => it.id !== item.id && it.type === item.type && it.categories.some((c) => item.categories.includes(c)))
      .slice(0, 4);
  }, [item, allItems]);

  const toggleBookmark = async () => {
    if (!item || bookmarkLoading) return;
    setBookmarkLoading(true);
    try {
      if (bookmarked) {
        await removeStoreBookmark(item.id);
        setBookmarked(false);
      } else {
        await addStoreBookmark(item.id);
        setBookmarked(true);
      }
    } catch {
      // ignore
    } finally {
      setBookmarkLoading(false);
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

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-5 py-4 sm:px-8">
            <button
              type="button"
              onClick={() => router.push('/ai-store')}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <ArrowLeft size={16} />
              <span>AI Store</span>
            </button>
            <span className="text-gray-300">/</span>
            <span className="truncate text-sm font-medium text-gray-700">{item?.name ?? '...'}</span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : loading ? (
            <div className="space-y-4">
              <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
              <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
              <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
            </div>
          ) : item ? (
            <>
              {/* Header card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-5">
                  {(() => {
                    const iconMeta = iconMetaFor(item);
                    const iconText = iconMeta.text || item.name.slice(0, 1).toUpperCase();
                    const iconCharCount = Array.from(iconText).length;
                    const iconTextClass = iconCharCount <= 1 ? 'text-2xl' : iconCharCount <= 2 ? 'text-xl' : 'text-base';
                    return (
                      <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${iconMeta.bg} text-white shadow-sm`}>
                        {iconMeta.Icon ? (
                          <iconMeta.Icon size={28} className="text-white" />
                        ) : (
                          <span className={`font-bold leading-none ${iconTextClass}`}>{iconText}</span>
                        )}
                      </div>
                    );
                  })()}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl font-bold text-gray-900">{item.name}</h1>
                      {item.featured && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          精选
                        </span>
                      )}
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${pricingBadgeClass(item.pricing)}`}>
                        {pricingLabel(item.pricing)}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                        {item.type === 'tool' ? 'AI 工具' : 'Agent 技能'}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                      {typeof item.rating === 'number' && (
                        <span className="inline-flex items-center gap-1">
                          <Star size={14} className="text-amber-500" />
                          <span className="font-medium text-gray-700">{item.rating.toFixed(1)}</span>
                        </span>
                      )}
                      {item.usersText && (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                          {item.usersText} 用户
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.description}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={toggleBookmark}
                      disabled={bookmarkLoading}
                      className={[
                        'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                        bookmarked
                          ? 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                      ].join(' ')}
                    >
                      {bookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                      {bookmarked ? '已收藏' : '收藏'}
                    </button>

                    {safeUrl(item.url) ? (
                      <a
                        href={safeUrl(item.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
                      >
                        访问工具 <ArrowUpRight size={14} />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="flex flex-col gap-5 lg:col-span-2">
                  {/* Trial Notes */}
                  {item.trialNotesMarkdown ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">使用体验</h2>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                        {item.trialNotesMarkdown}
                      </p>
                    </div>
                  ) : null}

                  {/* Recommend Reasons */}
                  {item.recommendReasons && item.recommendReasons.length > 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">推荐理由</h2>
                      <ul className="space-y-2">
                        {item.recommendReasons.map((reason, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Usage Examples */}
                  {item.usageExamples && item.usageExamples.length > 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">典型使用</h2>
                      <ul className="space-y-2.5">
                        {item.usageExamples.map((example, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-sm">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-50 text-[11px] font-semibold text-purple-600">
                              {idx + 1}
                            </span>
                            <span className="text-gray-700">{example}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Extra links */}
                  {item.links && item.links.length > 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">相关链接</h2>
                      <div className="flex flex-wrap gap-2">
                        {item.links.map((link, idx) => (
                          safeUrl(link.url) ? (
                            <a
                              key={idx}
                              href={safeUrl(link.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <ExternalLink size={13} />
                              {link.label}
                            </a>
                          ) : null
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Sidebar: categories, tags */}
                <div className="flex flex-col gap-5">
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">分类</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {item.categories.map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700"
                        >
                          {c}
                        </span>
                      ))}
                    </div>

                    <h2 className="mb-3 mt-5 text-sm font-semibold uppercase tracking-wide text-gray-500">标签</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* AI Eval Score */}
                  {item.evalScore ? <ToolEvalCard score={item.evalScore} /> : null}

                  {/* GitHub Stats */}
                  {item.githubStars != null && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="mb-3 flex items-center gap-2">
                        <Github size={14} className="text-gray-500" />
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">GitHub 数据</h2>
                      </div>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-gray-500">
                            <Star size={13} className="text-amber-400" />
                            Star 数
                          </span>
                          <span className="font-semibold text-gray-800">
                            {item.githubStars >= 1_000
                              ? `${(item.githubStars / 1_000).toFixed(1)}K`
                              : item.githubStars}
                          </span>
                        </div>
                        {item.githubForks != null && (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-gray-500">
                              <GitFork size={13} />
                              Fork 数
                            </span>
                            <span className="font-semibold text-gray-800">
                              {item.githubForks >= 1_000
                                ? `${(item.githubForks / 1_000).toFixed(1)}K`
                                : item.githubForks}
                            </span>
                          </div>
                        )}
                        {item.githubStarsGrowth7d != null && item.githubStarsGrowth7d > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-gray-500">
                              <TrendingUp size={13} className="text-emerald-500" />
                              本周增长
                            </span>
                            <span className="font-semibold text-emerald-600">
                              +{item.githubStarsGrowth7d >= 1_000
                                ? `${(item.githubStarsGrowth7d / 1_000).toFixed(1)}K`
                                : item.githubStarsGrowth7d}
                            </span>
                          </div>
                        )}
                        {item.githubLastPushedAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">最近提交</span>
                            <span className="font-medium text-gray-700">
                              {(() => {
                                const days = Math.floor((Date.now() - new Date(item.githubLastPushedAt).getTime()) / 86400000);
                                return days === 0 ? '今天' : days === 1 ? '1 天前' : `${days} 天前`;
                              })()}
                            </span>
                          </div>
                        )}
                        {item.githubRepoUrl && (
                          <a
                            href={item.githubRepoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            <Github size={13} />
                            在 GitHub 查看
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Quick visit */}
                  {safeUrl(item.url) ? (
                    <a
                      href={safeUrl(item.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">访问官网</p>
                        <p className="mt-0.5 truncate text-xs text-gray-400">{item.url}</p>
                      </div>
                      <ExternalLink size={16} className="ml-2 shrink-0 text-gray-400" />
                    </a>
                  ) : null}
                </div>
              </div>

              {/* Related tools */}
              {relatedItems.length > 0 ? (
                <div className="mt-8">
                  <h2 className="mb-4 text-base font-semibold text-gray-900">相关工具</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {relatedItems.map((rel) => (
                      <RelatedCard
                        key={rel.id}
                        item={rel}
                        onClick={() => router.push(`/ai-store/${rel.id}`)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
