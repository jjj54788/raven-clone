'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, GitCompare, Loader2, Sparkles } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import { compareInsights, listInsights } from '@/lib/api';
import type { CompareResult, InsightTopicSummary } from '@/lib/ai-insights-data';

export default function CompareInsightsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  const [topics, setTopics] = useState<InsightTopicSummary[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [selectedA, setSelectedA] = useState(searchParams.get('a') ?? '');
  const [selectedB, setSelectedB] = useState(searchParams.get('b') ?? '');
  const [result, setResult] = useState<CompareResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    listInsights()
      .then(setTopics)
      .catch(() => {})
      .finally(() => setTopicsLoading(false));
  }, []);

  // Auto-run if both IDs are in URL
  useEffect(() => {
    const a = searchParams.get('a');
    const b = searchParams.get('b');
    if (a && b && !result && !compareLoading) {
      setSelectedA(a);
      setSelectedB(b);
      handleCompare(a, b);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCompare = async (a?: string, b?: string) => {
    const idA = a ?? selectedA;
    const idB = b ?? selectedB;
    if (!idA || !idB || idA === idB) return;
    setCompareLoading(true);
    setResult(null);
    try {
      const res = await compareInsights(idA, idB);
      setResult(res);
    } catch {
      /* ignore */
    } finally {
      setCompareLoading(false);
    }
  };

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <Loader2 size={24} className="animate-spin text-gray-400" />
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
          <div className="mx-auto flex w-full max-w-4xl items-center gap-4 px-5 py-4 sm:px-8">
            <Link href="/ai-insights" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <GitCompare size={18} className="text-purple-600" />
              <h1 className="text-lg font-semibold text-gray-900">{t('aiInsights.compareTitle')}</h1>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-4xl space-y-6">
            {/* Topic selectors */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-gray-700 mb-4">{t('aiInsights.compareSelect')}</div>
              {topicsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" />加载中...</div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">课题 A</label>
                    <select
                      value={selectedA}
                      onChange={(e) => setSelectedA(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-purple-300"
                    >
                      <option value="">选择课题...</option>
                      {topics.map((t) => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">课题 B</label>
                    <select
                      value={selectedB}
                      onChange={(e) => setSelectedB(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-purple-300"
                    >
                      <option value="">选择课题...</option>
                      {topics.filter((t) => t.id !== selectedA).map((t) => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleCompare()}
                disabled={compareLoading || !selectedA || !selectedB || selectedA === selectedB}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {compareLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {t('aiInsights.compareRun')}
              </button>
            </div>

            {/* Topic summaries side-by-side */}
            {result && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-blue-500 mb-2">课题 A</div>
                    <h2 className="text-sm font-semibold text-blue-800">{result.topicA.title}</h2>
                    <p className="mt-2 text-sm text-blue-700">{result.topicA.summary || '暂无摘要'}</p>
                    {result.confidenceA != null && (
                      <div className="mt-2 text-xs text-blue-500">置信度：{result.confidenceA}%</div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-purple-500 mb-2">课题 B</div>
                    <h2 className="text-sm font-semibold text-purple-800">{result.topicB.title}</h2>
                    <p className="mt-2 text-sm text-purple-700">{result.topicB.summary || '暂无摘要'}</p>
                    {result.confidenceB != null && (
                      <div className="mt-2 text-xs text-purple-500">置信度：{result.confidenceB}%</div>
                    )}
                  </div>
                </div>

                {/* Similarities */}
                {result.similarities.length > 0 && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-sm font-semibold text-emerald-800 mb-3">{t('aiInsights.compareSimilarities')}</div>
                    <ul className="space-y-2">
                      {result.similarities.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-emerald-700">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Differences */}
                {result.differences.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="text-sm font-semibold text-amber-800 mb-3">{t('aiInsights.compareDifferences')}</div>
                    <ul className="space-y-2">
                      {result.differences.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendation */}
                {result.recommendation && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                      <Sparkles size={14} className="text-purple-600" />
                      {t('aiInsights.compareRecommendation')}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{result.recommendation}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
