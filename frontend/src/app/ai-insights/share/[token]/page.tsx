'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { getSharedInsight } from '@/lib/api';
import type { SharedInsightData } from '@/lib/ai-insights-data';

export default function SharedInsightPage() {
  const params = useParams<{ token?: string | string[] }>();
  const rawToken = params?.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  const [data, setData] = useState<SharedInsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    getSharedInsight(token)
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FAFAFA] p-8 text-center">
        <div className="text-2xl font-semibold text-gray-700">洞察不存在或链接已失效</div>
        <Link href="/" className="text-sm text-purple-600 hover:underline">返回格物首页</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Public header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3 sm:px-8">
          <Link href="/" className="text-sm font-bold text-purple-700 hover:text-purple-800">格物</Link>
          <span className="text-xs text-gray-400">AI 洞察报告</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        {/* Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-medium text-purple-600 mb-2">
            <Sparkles size={13} />
            {data.category}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{data.title}</h1>
          {data.subtitle && <p className="mt-1 text-gray-500">{data.subtitle}</p>}
        </div>

        {/* Executive Summary */}
        {data.executiveSummary && (
          <div className="mb-6 rounded-2xl border border-purple-200 bg-purple-50 p-5">
            <div className="text-sm font-semibold text-purple-800 mb-2">核心洞察</div>
            <p className="text-sm text-purple-700 leading-relaxed">{data.executiveSummary}</p>
          </div>
        )}

        {/* Key Findings */}
        {data.keyFindings.length > 0 && (
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <CheckCircle2 size={15} className="text-emerald-600" />
              关键发现
            </div>
            <ul className="space-y-2">
              {data.keyFindings.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Opportunities + Risks side by side */}
        {(data.opportunities.length > 0 || data.risks.length > 0) && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {data.opportunities.length > 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-sm font-semibold text-emerald-800 mb-2">机会</div>
                <ul className="space-y-1.5">
                  {data.opportunities.map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-emerald-700">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.risks.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm font-semibold text-amber-800 mb-2">风险</div>
                <ul className="space-y-1.5">
                  {data.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* References */}
        {data.references.length > 0 && (
          <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-800 mb-3">参考来源</div>
            <div className="flex flex-wrap gap-2">
              {data.references.map((r, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">
                  <ExternalLink size={10} className="text-gray-400" />
                  {r.domain}
                  <span className="rounded-full bg-emerald-50 px-1.5 text-emerald-600">{r.score}%</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-100 pt-6 text-center">
          <p className="text-xs text-gray-400">
            由{' '}
            <Link href="/" className="font-semibold text-purple-600 hover:underline">格物 AI</Link>
            {' '}生成 · AI 研究与知识管理平台
          </p>
          <Link href="/" className="mt-2 inline-block text-xs text-gray-400 hover:text-gray-600">
            访问格物，开始你的 AI 洞察研究 →
          </Link>
        </div>
      </main>
    </div>
  );
}
