'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle, ArrowLeft, ArrowUpRight, CheckCircle2, GitFork, Github, Globe, Star, TrendingUp,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { getGithubTrendingRepo, getGithubTrendingRepos, type GithubTrendingItem, type GithubEvalScore } from '@/lib/api';

const LANGUAGE_COLORS: Record<string, string> = {
  Python: 'bg-blue-500', TypeScript: 'bg-blue-400', JavaScript: 'bg-yellow-400',
  Rust: 'bg-orange-500', Go: 'bg-cyan-500', Java: 'bg-red-500', 'C++': 'bg-pink-500',
  C: 'bg-gray-500', Swift: 'bg-orange-400', Kotlin: 'bg-purple-500',
};

function formatStars(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function EvalScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs text-gray-500">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-purple-500 transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-semibold tabular-nums text-gray-700">{score}</span>
    </div>
  );
}

function EvalScoreCard({ score }: { score: GithubEvalScore }) {
  const gradeBg: Record<string, string> = {
    A: 'bg-emerald-100 text-emerald-700',
    B: 'bg-blue-100 text-blue-700',
    C: 'bg-amber-100 text-amber-700',
    D: 'bg-rose-100 text-rose-700',
  };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">综合评估</h2>
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${gradeBg[score.grade] ?? 'bg-gray-100 text-gray-700'}`}>
          {score.grade}
        </span>
      </div>
      <div className="space-y-2.5">
        <EvalScoreBar label="活跃度" score={score.activity} />
        <EvalScoreBar label="社区" score={score.community} />
        <EvalScoreBar label="成长性" score={score.growth} />
        <EvalScoreBar label="文档" score={score.docs} />
      </div>
    </div>
  );
}

function RelatedRepoCard({ item, onClick }: { item: GithubTrendingItem; onClick: () => void }) {
  const langColor = item.language ? (LANGUAGE_COLORS[item.language] ?? 'bg-gray-400') : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-700 to-neutral-900 text-white">
        <Github size={16} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-gray-900">{item.name}</span>
          {langColor && item.language && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
              <span className={`h-1.5 w-1.5 rounded-full ${langColor}`} />
              {item.language}
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{item.description}</p>
        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-gray-600">
          ★ {formatStars(item.stars)}
          {item.starsGrowth7d > 0 && (
            <span className="ml-1 text-emerald-600">↑ {formatStars(item.starsGrowth7d)}/周</span>
          )}
        </span>
      </div>
    </button>
  );
}

export default function GithubTrendingRepoPage() {
  const params = useParams();
  const router = useRouter();
  const { userName, authReady } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const repoId = typeof params?.repoId === 'string' ? params.repoId : Array.isArray(params?.repoId) ? params.repoId[0] : '';

  const [repo, setRepo] = useState<GithubTrendingItem | null>(null);
  const [allRepos, setAllRepos] = useState<GithubTrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady || !repoId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getGithubTrendingRepo(repoId),
      getGithubTrendingRepos({ limit: 40 }).catch(() => [] as GithubTrendingItem[]),
    ]).then(([repoData, allData]) => {
      if (cancelled) return;
      setRepo(repoData);
      setAllRepos(Array.isArray(allData) ? allData : []);
    }).catch((err: any) => {
      if (cancelled) return;
      setError(err?.message || 'Failed to load repository');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [authReady, repoId]);

  const relatedRepos = useMemo(() => {
    if (!repo) return [];
    return allRepos
      .filter((r) => r.id !== repo.id && r.topics.some((t) => repo.topics.includes(t)))
      .slice(0, 4);
  }, [repo, allRepos]);

  const daysSincePush = repo?.pushedAt
    ? Math.floor((Date.now() - new Date(repo.pushedAt).getTime()) / 86400000)
    : null;
  const activityLabel = daysSincePush == null ? '未知'
    : daysSincePush === 0 ? '今天'
      : daysSincePush === 1 ? '1 天前'
        : `${daysSincePush} 天前`;
  const activityColor = daysSincePush == null ? 'text-gray-400'
    : daysSincePush < 7 ? 'text-emerald-600'
      : daysSincePush < 30 ? 'text-amber-600'
        : 'text-rose-500';

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
          <div className="mx-auto flex w-full max-w-4xl items-center gap-2 px-5 py-4 sm:px-8">
            <button
              type="button"
              onClick={() => router.push('/ai-store')}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <ArrowLeft size={16} />
              AI Store
            </button>
            <span className="text-gray-300">/</span>
            <button
              type="button"
              onClick={() => router.push('/ai-store')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              GitHub 热门
            </button>
            <span className="text-gray-300">/</span>
            <span className="truncate text-sm font-medium text-gray-700">{repo?.name ?? '...'}</span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : loading ? (
            <div className="space-y-4">
              <div className="h-28 animate-pulse rounded-2xl bg-gray-100" />
              <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
              <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
            </div>
          ) : repo ? (
            <>
              {/* Header card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-5">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-neutral-700 to-neutral-900 text-white shadow-sm">
                    <Github size={30} className="text-white" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl font-bold text-gray-900">{repo.name}</h1>
                      {repo.language && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
                          <span className={`h-2 w-2 rounded-full ${LANGUAGE_COLORS[repo.language] ?? 'bg-gray-400'}`} />
                          {repo.language}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">{repo.repoFullName}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-gray-800">
                        <Star size={14} className="text-amber-400" />
                        {formatStars(repo.stars)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <GitFork size={14} />
                        {formatStars(repo.forks)}
                      </span>
                      {repo.starsGrowth7d > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                          <TrendingUp size={14} />
                          +{formatStars(repo.starsGrowth7d)}/周
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 text-xs ${activityColor}`}>
                        最近提交: {activityLabel}
                      </span>
                    </div>

                    {repo.topics.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {repo.topics.map((t) => (
                          <span key={t} className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* GitHub button */}
                  <a
                    href={repo.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                  >
                    <Github size={15} />
                    GitHub <ArrowUpRight size={13} />
                  </a>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* Left: AI analysis */}
                <div className="flex flex-col gap-5 lg:col-span-2">
                  {/* AI Summary */}
                  {repo.aiSummaryZh ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">AI 项目简介</h2>
                      <p className="text-sm leading-relaxed text-gray-700">{repo.aiSummaryZh}</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">项目描述</h2>
                      <p className="text-sm leading-relaxed text-gray-700">{repo.description}</p>
                    </div>
                  )}

                  {/* Key Features */}
                  {repo.keyFeatures.length > 0 && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">核心功能</h2>
                      <ul className="space-y-2">
                        {repo.keyFeatures.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Use Cases */}
                  {repo.useCases.length > 0 && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">适用场景</h2>
                      <ul className="space-y-2">
                        {repo.useCases.map((u, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <Globe size={14} className="mt-0.5 shrink-0 text-blue-500" />
                            <span>{u}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Limitations */}
                  {repo.limitations && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                      <div className="mb-2 flex items-center gap-2">
                        <AlertCircle size={15} className="text-amber-600" />
                        <h2 className="text-sm font-semibold text-amber-700">注意事项</h2>
                      </div>
                      <p className="text-sm leading-relaxed text-amber-800">{repo.limitations}</p>
                    </div>
                  )}
                </div>

                {/* Right sidebar */}
                <div className="flex flex-col gap-5">
                  {/* Stats */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">数据统计</h2>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <Star size={13} className="text-amber-400" />
                          Stars
                        </span>
                        <span className="font-bold text-gray-900">{formatStars(repo.stars)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <GitFork size={13} />
                          Forks
                        </span>
                        <span className="font-semibold text-gray-700">{formatStars(repo.forks)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Open Issues</span>
                        <span className="font-semibold text-gray-700">{repo.openIssues}</span>
                      </div>
                      {repo.starsGrowth7d > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-gray-500">
                            <TrendingUp size={13} className="text-emerald-500" />
                            本周增长
                          </span>
                          <span className="font-semibold text-emerald-600">+{formatStars(repo.starsGrowth7d)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">最近提交</span>
                        <span className={`font-medium text-xs ${activityColor}`}>{activityLabel}</span>
                      </div>
                    </div>
                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
                    >
                      <Github size={15} />
                      在 GitHub 查看
                    </a>
                  </div>

                  {/* Eval score */}
                  {repo.evalScore && <EvalScoreCard score={repo.evalScore} />}

                  {/* AI analyzed notice */}
                  {repo.aiAnalyzedAt && (
                    <p className="text-center text-[11px] text-gray-400">
                      AI 分析于 {new Date(repo.aiAnalyzedAt).toLocaleDateString('zh-CN')}
                    </p>
                  )}
                </div>
              </div>

              {/* Related repos */}
              {relatedRepos.length > 0 && (
                <div className="mt-8">
                  <h2 className="mb-4 text-base font-semibold text-gray-900">相关项目</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {relatedRepos.map((r) => (
                      <RelatedRepoCard
                        key={r.id}
                        item={r}
                        onClick={() => router.push(`/ai-store/gh/${r.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
