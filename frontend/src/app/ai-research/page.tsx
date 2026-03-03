'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FlaskConical, Plus, Search, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { ResearchCardSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import { createDebateSession, getDebateAgents, listDebateSessions, type DebateAgent, type DebateSession } from '@/lib/api';

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
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { locale } = useLanguage();
  const [agents, setAgents] = useState<DebateAgent[]>([]);
  const [sessions, setSessions] = useState<DebateSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([listDebateSessions(), getDebateAgents()])
      .then(([sessionData, agentData]) => {
        if (cancelled) return;
        setSessions(Array.isArray(sessionData) ? sessionData : []);
        setAgents(Array.isArray(agentData) ? agentData : []);
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
        new: '新建研究',
        empty: '还没有研究记录，创建一个开始吧。',
        search: '搜索研究项目...',
        createCard: '新建研究',
        createTitle: '创建新研究项目',
        createDesc: '开始一个新的研究项目来整理你的资料和见解',
        createLabel: '项目名称',
        createPlaceholder: '例如：LLM 推理优化研究',
        createConfirm: '创建项目',
        createCancel: '取消',
        noResult: '没有找到匹配的研究项目',
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
      new: 'New Research',
      empty: 'No research sessions yet. Create one to get started.',
      search: 'Search research projects...',
      createCard: 'New Research',
      createTitle: 'Create Research Project',
      createDesc: 'Start a new research project to organize your insights',
      createLabel: 'Project name',
      createPlaceholder: 'e.g. LLM Reasoning Optimization',
      createConfirm: 'Create',
      createCancel: 'Cancel',
      noResult: 'No matching research projects',
      status: {
        PENDING: 'Pending',
        RUNNING: 'Running',
        COMPLETED: 'Completed',
        ERROR: 'Error',
      },
    };
  }, [locale]);

  const filteredSessions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return sessions;
    return sessions.filter((item) => item.topic.toLowerCase().includes(keyword));
  }, [sessions, query]);

  const openCreate = () => {
    setCreateName('');
    setCreateError('');
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateError('');
  };

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) {
      setCreateError(locale === 'zh' ? '请输入项目名称' : 'Please enter a project name');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const agentPool = agents.length ? agents : (await getDebateAgents());
      const list = Array.isArray(agentPool) ? agentPool : [];
      const debaters = list.filter((agent) => agent.category === 'DEBATER');
      const selected = (debaters.length ? debaters : list).slice(0, 3).map((agent) => agent.id);
      if (selected.length < 2) {
        throw new Error(locale === 'zh' ? '未找到足够的智能体' : 'Not enough agents available');
      }
      const session = await createDebateSession({
        topic: name,
        agentIds: selected,
        maxRounds: 5,
      });
      setCreateOpen(false);
      router.push(`/ai-research/${session.id}`);
    } catch (err: any) {
      setCreateError(err?.message || (locale === 'zh' ? '创建失败' : 'Failed to create'));
    } finally {
      setCreating(false);
    }
  };

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

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
            >
              <Plus size={16} />
              {uiText.new}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <Search size={16} className="text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={uiText.search}
                className="w-full border-none bg-transparent text-sm text-gray-700 outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                  aria-label="Clear"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            {loading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ResearchCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredSessions.map((session) => (
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
                <button
                  type="button"
                  onClick={openCreate}
                  className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white text-sm font-semibold text-gray-500 transition hover:border-purple-300 hover:text-purple-600"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-gray-300">
                    <Plus size={18} />
                  </div>
                  {uiText.createCard}
                </button>
              </div>
            )}
            {!loading && filteredSessions.length === 0 ? (
              <div className="mt-4 text-center text-sm text-gray-400">{query ? uiText.noResult : uiText.empty}</div>
            ) : null}
          </div>
        </div>
      </main>

      {createOpen && (
        <div className="overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="modal-in w-full max-w-md rounded-2xl border border-gray-200/60 bg-white/95 backdrop-blur-xl p-6 shadow-2xl shadow-black/15">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{uiText.createTitle}</h3>
                <p className="mt-1 text-xs text-gray-500">{uiText.createDesc}</p>
              </div>
              <button
                type="button"
                onClick={closeCreate}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-gray-600">{uiText.createLabel}</label>
              <input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder={uiText.createPlaceholder}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
              />
            </div>

            {createError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {createError}
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeCreate}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {uiText.createCancel}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
              >
                {creating ? '...' : uiText.createConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
