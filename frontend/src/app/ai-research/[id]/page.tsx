"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Play,
  Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  getDebateAgents,
  getDebateMessages,
  getDebateSession,
  startDebateSession,
  subscribeDebateStream,
  type DebateAgent,
  type DebateMessage,
  type DebateSession,
} from '@/lib/api';

function statusText(status: DebateSession['status'], locale: 'en' | 'zh') {
  if (locale === 'zh') {
    return {
      PENDING: '待开始',
      RUNNING: '进行中',
      COMPLETED: '已完成',
      ERROR: '出错',
    }[status];
  }
  return {
    PENDING: 'Pending',
    RUNNING: 'Running',
    COMPLETED: 'Completed',
    ERROR: 'Error',
  }[status];
}

function formatDate(value?: string | null, locale?: 'en' | 'zh') {
  if (!value) return '--';
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

export default function AiResearchDetailPage() {
  const params = useParams();
  const sessionId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params?.id[0] : '';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { locale } = useLanguage();

  const [session, setSession] = useState<DebateSession | null>(null);
  const [agents, setAgents] = useState<DebateAgent[]>([]);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [streamError, setStreamError] = useState('');

  useEffect(() => {
    if (!authReady || !sessionId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getDebateSession(sessionId), getDebateMessages(sessionId), getDebateAgents()])
      .then(([sessionData, messageData, agentData]) => {
        if (cancelled) return;
        setSession(sessionData as DebateSession);
        setMessages(Array.isArray(messageData) ? messageData : []);
        setAgents(Array.isArray(agentData) ? agentData : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, sessionId]);

  useEffect(() => {
    if (!authReady || !sessionId) return;
    const close = subscribeDebateStream(sessionId, {
      onAgentStatus: (data) => {
        setAgentStatuses((prev) => ({ ...prev, [data.agentId]: data.status }));
      },
      onNewMessage: (data) => {
        setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
      },
      onScoreUpdate: (data) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId ? { ...m, ...data } : m)),
        );
      },
      onRoundComplete: (data) => {
        setSession((prev) => (prev ? { ...prev, currentRound: data.round } : prev));
      },
      onComplete: (data) => {
        setSession(data);
      },
      onError: (message) => setStreamError(message),
    });
    return () => {
      close();
    };
  }, [authReady, sessionId]);

  const uiText = useMemo(() => {
    if (locale === 'zh') {
      return {
        back: '返回',
        start: '开始协商',
        progress: '讨论进度',
        agents: '参与智能体',
        timeline: '讨论记录',
        summary: '讨论总结',
        keyPoints: '关键观点',
        disagreements: '分歧点',
        statusLabel: '状态',
      };
    }
    return {
      back: 'Back',
      start: 'Start',
      progress: 'Progress',
      agents: 'Agents',
      timeline: 'Discussion',
      summary: 'Summary',
      keyPoints: 'Key Points',
      disagreements: 'Disagreements',
      statusLabel: 'Status',
    };
  }, [locale]);

  const agentMap = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);
  const progress = session ? Math.min(100, Math.round((session.currentRound / session.maxRounds) * 100)) : 0;

  const handleStart = async () => {
    if (!sessionId) return;
    setStarting(true);
    try {
      await startDebateSession(sessionId);
      setSession((prev) => (prev ? { ...prev, status: 'RUNNING' } : prev));
    } catch (err: any) {
      setStreamError(err?.message || 'Failed to start');
    } finally {
      setStarting(false);
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
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
            <div className="min-w-0">
              <Link
                href="/ai-research"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft size={14} />
                {uiText.back}
              </Link>
              <h1 className="mt-2 truncate text-xl font-semibold text-gray-900">
                {session?.topic || '—'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {uiText.statusLabel}: {session ? statusText(session.status, locale) : '--'}
              </p>
            </div>
            {session?.status === 'PENDING' && (
              <button
                type="button"
                onClick={handleStart}
                disabled={starting}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60"
              >
                {starting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {uiText.start}
              </button>
            )}
            {session?.status === 'COMPLETED' && (
              <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 size={14} />
                {statusText('COMPLETED', locale)}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            {loading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
                Loading...
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{uiText.progress}</span>
                    <span>
                      {session?.currentRound ?? 0}/{session?.maxRounds ?? 0}
                    </span>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-purple-500" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    {formatDate(session?.createdAt, locale)} · {formatDate(session?.updatedAt, locale)}
                  </div>
                </div>

                {streamError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {streamError}
                  </div>
                ) : null}

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-gray-700">{uiText.agents}</div>
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {agents.map((agent) => {
                      const status = agentStatuses[agent.id] || 'idle';
                      const active = status === 'thinking' || status === 'speaking';
                      return (
                        <div
                          key={agent.id}
                          className={`rounded-xl border px-3 py-2 text-xs ${active ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: agent.color || '#A1A1AA' }}
                            />
                            <span className="font-semibold text-gray-700">{agent.name}</span>
                          </div>
                          <div className="mt-1 text-[11px] text-gray-400">{status}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-gray-700">{uiText.timeline}</div>
                  <div className="mt-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-sm text-gray-400">No messages yet.</div>
                    ) : (
                      messages.map((msg) => {
                        const agent = agentMap.get(msg.senderId);
                        return (
                          <div key={msg.id} className="rounded-xl border border-gray-200 bg-gray-50/40 p-4">
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span className="font-semibold text-gray-700">
                                {agent?.name || msg.senderId}
                              </span>
                              <span>Round {msg.round}</span>
                            </div>
                            <div className="mt-2 text-sm text-gray-700">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                            {msg.totalScore != null && (
                              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-500">
                                <div>逻辑 {msg.logicScore?.toFixed(1) ?? '0'}</div>
                                <div>创新 {msg.innovationScore?.toFixed(1) ?? '0'}</div>
                                <div>表达 {msg.expressionScore?.toFixed(1) ?? '0'}</div>
                                <div className="col-span-3 text-xs text-gray-400">总分 {msg.totalScore?.toFixed(1) ?? '0'}</div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {session?.status === 'COMPLETED' && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Sparkles size={14} />
                      {uiText.summary}
                    </div>
                    {session.summary && (
                      <div className="mt-3 text-sm text-gray-700">
                        <ReactMarkdown>{session.summary}</ReactMarkdown>
                      </div>
                    )}
                    {session.keyPoints && session.keyPoints.length > 0 && (
                      <div className="mt-4">
                        <div className="text-xs font-semibold text-gray-500">{uiText.keyPoints}</div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                          {session.keyPoints.map((item, idx) => (
                            <li key={`${item}-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {session.disagreements && session.disagreements.length > 0 && (
                      <div className="mt-4">
                        <div className="text-xs font-semibold text-gray-500">{uiText.disagreements}</div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                          {session.disagreements.map((item, idx) => (
                            <li key={`${item}-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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
