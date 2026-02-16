'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FlaskConical, Plus } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import { listDebateSessions, type DebateSession } from '@/lib/api';

function formatDate(value: string, locale: 'en' | 'zh') {
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

function statusBadge(status: DebateSession['status']) {
  if (status === 'COMPLETED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'RUNNING') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (status === 'ERROR') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
}

export default function AiResearchPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { locale } = useLanguage();
  const [sessions, setSessions] = useState<DebateSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    setLoading(true);
    listDebateSessions()
      .then((data) => {
        if (!cancelled) setSessions(Array.isArray(data) ? data : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  const uiText = useMemo(() => {
    if (locale === 'zh') {
      return {
        title: 'AI 研究',
        subtitle: '多智能体协商实验与分析报告',
        new: '新建协商',
        empty: '还没有协商记录，创建一个开始吧。',
        status: {
          PENDING: '待开始',
          RUNNING: '进行中',
          COMPLETED: '已完成',
          ERROR: '出错',
        },
      };
    }
    return {
      title: 'AI Research',
      subtitle: 'Multi-agent debate sessions and insights',
      new: 'New Debate',
      empty: 'No debate sessions yet. Create one to get started.',
      status: {
        PENDING: 'Pending',
        RUNNING: 'Running',
        COMPLETED: 'Completed',
        ERROR: 'Error',
      },
    };
  }, [locale]);

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
          <div className="mx-auto flex w-full max-w-6xl items-start justify-between gap-4 px-5 py-5 sm:px-8">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-sm">
                  <FlaskConical size={18} />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-semibold text-gray-900">{uiText.title}</h1>
                  <p className="mt-0.5 text-sm text-gray-500">{uiText.subtitle}</p>
                </div>
              </div>
            </div>

            <Link
              href="/ai-research/new"
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
            >
              <Plus size={16} />
              {uiText.new}
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            {loading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
                Loading...
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
                {uiText.empty}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/ai-research/${session.id}`}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatDate(session.updatedAt || session.createdAt, locale)}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadge(session.status)}`}>
                        {uiText.status[session.status]}
                      </span>
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-base font-semibold text-gray-900">
                      {session.topic}
                    </h3>
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      <span>Rounds {session.currentRound}/{session.maxRounds}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
