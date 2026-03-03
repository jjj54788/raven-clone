"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  FileText,
  Lightbulb,
  Loader2,
  MessageCircle,
  PauseCircle,
  Play,
  Search,
  Sparkles,
  StopCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import AgentOrgChart from '@/components/AgentOrgChart';
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
  const [activeTab, setActiveTab] = useState<'discussion' | 'evidence' | 'ideas' | 'demo' | 'report'>('discussion');
  const [teamTab, setTeamTab] = useState<'all' | 'active' | 'idle'>('all');

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
        start: '开始',
        continue: '继续',
        stop: '停止',
        statusLabel: '状态',
        teamTitle: '研究团队',
        teamTabs: {
          all: '总览',
          active: '工作中',
          idle: '待命',
        },
        teamWaitingTitle: '等待研究开始',
        teamWaitingDesc: '团队将在研究启动后显示',
        realtime: '实时状态',
        researchInput: '输入研究问题，开始多 Agent 讨论...',
        researchAction: '研究',
        emptyTitle: '开始你的第一次研究',
        emptyDesc: '输入一个研究问题，AI 研究团队将展开多角度讨论，深度搜索并产出报告',
        tabs: {
          discussion: '讨论',
          evidence: '观点查实',
          ideas: '研究创意',
          demo: '演示',
          report: '报告',
        },
        timeline: '讨论记录',
        summary: '讨论总结',
        keyPoints: '关键观点',
        disagreements: '分歧点',
        noMessages: '暂无讨论内容',
        stageTitles: ['创意构思阶段', '观点碰撞阶段', '深入推演阶段', '综合成稿阶段'],
        stageDescs: ['团队开始围绕课题进行头脑风暴', '多方视角深入论证与补强', '聚焦关键问题形成结论', '整合输出最终研究报告'],
        thinking: '研究总监 正在思考...',
      };
    }
    return {
      back: 'Back',
      start: 'Start',
      continue: 'Continue',
      stop: 'Stop',
      statusLabel: 'Status',
      teamTitle: 'Research Team',
      teamTabs: {
        all: 'Overview',
        active: 'Working',
        idle: 'Idle',
      },
      teamWaitingTitle: 'Waiting to start',
      teamWaitingDesc: 'Team members will appear after the research starts',
      realtime: 'Realtime Status',
      researchInput: 'Enter a research question to start multi-agent discussion...',
      researchAction: 'Research',
      emptyTitle: 'Start your first research',
      emptyDesc: 'Enter a research question and the AI team will explore it from multiple angles',
      tabs: {
        discussion: 'Discussion',
        evidence: 'Evidence Check',
        ideas: 'Research Ideas',
        demo: 'Demo',
        report: 'Report',
      },
      timeline: 'Discussion',
      summary: 'Summary',
      keyPoints: 'Key Points',
      disagreements: 'Disagreements',
      noMessages: 'No messages yet.',
      stageTitles: ['Ideation', 'Perspective Clash', 'Deep Reasoning', 'Synthesis'],
      stageDescs: ['Brainstorm around the topic', 'Strengthen arguments from multiple views', 'Focus on key questions and conclusions', 'Synthesize the final report'],
      thinking: 'Research lead is thinking...',
    };
  }, [locale]);

  const agentStatusText = useMemo(() => {
    if (locale === 'zh') {
      return {
        idle: '待命',
        thinking: '思考中',
        speaking: '发言中',
        waiting: '等待中',
      };
    }
    return {
      idle: 'Idle',
      thinking: 'Thinking',
      speaking: 'Speaking',
      waiting: 'Waiting',
    };
  }, [locale]);

  const tabs = useMemo(
    () => [
      { id: 'discussion', label: uiText.tabs.discussion, icon: MessageCircle },
      { id: 'evidence', label: uiText.tabs.evidence, icon: CheckCircle2 },
      { id: 'ideas', label: uiText.tabs.ideas, icon: Lightbulb },
      { id: 'demo', label: uiText.tabs.demo, icon: Play },
      { id: 'report', label: uiText.tabs.report, icon: FileText },
    ],
    [uiText],
  );

  const stageOptions = useMemo(
    () =>
      uiText.stageTitles.map((title, index) => ({
        title,
        desc: uiText.stageDescs[index] ?? '',
      })),
    [uiText],
  );

  const agentMap = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);
  const progress = session ? Math.min(100, Math.round((session.currentRound / session.maxRounds) * 100)) : 0;
  const isPending = session?.status === 'PENDING';
  const isRunning = session?.status === 'RUNNING';
  const isCompleted = session?.status === 'COMPLETED';
  const stageIndex = Math.max(0, Math.min(stageOptions.length - 1, (session?.currentRound ?? 1) - 1));
  const stage = stageOptions[stageIndex];

  const filteredAgents = useMemo(() => {
    if (teamTab === 'all') return agents;
    return agents.filter((agent) => {
      const status = agentStatuses[agent.id] || 'idle';
      const working = status === 'thinking' || status === 'speaking';
      return teamTab === 'active' ? working : !working;
    });
  }, [agents, agentStatuses, teamTab]);

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
                {session?.topic || '-'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {uiText.statusLabel}: {session ? statusText(session.status, locale) : '--'}
              </p>
            </div>
            {isCompleted && (
              <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 size={14} />
                {statusText('COMPLETED', locale)}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            {loading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
                Loading...
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
                <aside className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">{uiText.teamTitle}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-gray-500">
                      {(['all', 'active', 'idle'] as const).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setTeamTab(key)}
                          className={`rounded-full px-2.5 py-1 ${
                            teamTab === key ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {uiText.teamTabs[key]}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4">
                      {isPending ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 py-8 text-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                            <Crown size={18} />
                          </div>
                          <div className="mt-2 text-sm font-semibold text-gray-700">{uiText.teamWaitingTitle}</div>
                          <div className="text-xs text-gray-400">{uiText.teamWaitingDesc}</div>
                        </div>
                      ) : (
                        <AgentOrgChart agents={agents} leaderId={agents[0]?.id} statuses={agentStatuses} height={220} />
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-gray-700">{uiText.realtime}</div>
                    <div className="mt-3 space-y-2">
                      {filteredAgents.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-3 py-3 text-xs text-gray-400">
                          {uiText.teamWaitingDesc}
                        </div>
                      ) : (
                        filteredAgents.map((agent) => {
                          const status = agentStatuses[agent.id] || 'idle';
                          const active = status === 'thinking' || status === 'speaking';
                          return (
                            <div
                              key={agent.id}
                              className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: agent.color || '#A1A1AA' }}
                                />
                                <span className="text-xs font-semibold text-gray-700">{agent.name}</span>
                              </div>
                              <span className={`text-[11px] ${active ? 'text-purple-600' : 'text-gray-400'}`}>
                                {agentStatusText[status as keyof typeof agentStatusText] ?? status}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={handleStart}
                        disabled={!isPending || starting}
                        className="inline-flex items-center justify-center gap-1 rounded-xl bg-purple-600 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {starting ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                        {uiText.start}
                      </button>
                      <button
                        type="button"
                        disabled
                        title="Coming soon"
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 px-2 py-2 text-xs font-semibold text-gray-400"
                      >
                        <PauseCircle size={12} />
                        {uiText.continue}
                      </button>
                      <button
                        type="button"
                        disabled
                        title="Coming soon"
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 px-2 py-2 text-xs font-semibold text-gray-400"
                      >
                        <StopCircle size={12} />
                        {uiText.stop}
                      </button>
                    </div>
                  </div>
                </aside>

                <section className="space-y-4">
                  {streamError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {streamError}
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 pb-3 text-sm">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                              active ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'
                            }`}
                          >
                            <Icon size={14} />
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 space-y-4">
                      {activeTab === 'discussion' && (
                        <>
                          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
                            <Search size={16} className="text-gray-400" />
                            <input
                              value={session?.topic ?? ''}
                              readOnly
                              placeholder={uiText.researchInput}
                              className="w-full border-none bg-transparent text-sm text-gray-700 outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleStart}
                              disabled={!isPending || starting}
                              className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              {starting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                              {uiText.researchAction}
                            </button>
                          </div>

                          {isPending ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                                <Search size={24} />
                              </div>
                              <div className="mt-4 text-base font-semibold text-gray-900">{uiText.emptyTitle}</div>
                              <p className="mt-1 max-w-md text-xs text-gray-500">{uiText.emptyDesc}</p>
                            </div>
                          ) : (
                            <>
                              <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-purple-700">
                                  <Sparkles size={14} />
                                  {stage?.title}
                                </div>
                                <p className="mt-1 text-xs text-purple-600/80">{stage?.desc}</p>
                                <div className="mt-3 h-2 w-full rounded-full bg-white">
                                  <div className="h-2 rounded-full bg-purple-500" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="mt-2 text-xs text-gray-400">
                                  {formatDate(session?.createdAt, locale)} - {formatDate(session?.updatedAt, locale)}
                                </div>
                              </div>

                              {isRunning && messages.length === 0 ? (
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <Loader2 size={12} className="animate-spin" />
                                  {uiText.thinking}
                                </div>
                              ) : null}

                              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                <div className="text-sm font-semibold text-gray-700">{uiText.timeline}</div>
                                <div className="mt-4 space-y-4">
                                  {messages.length === 0 ? (
                                    <div className="text-sm text-gray-400">{uiText.noMessages}</div>
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
                                              <div>{locale === 'zh' ? '逻辑' : 'Logic'} {msg.logicScore?.toFixed(1) ?? '0'}</div>
                                              <div>{locale === 'zh' ? '创新' : 'Innovation'} {msg.innovationScore?.toFixed(1) ?? '0'}</div>
                                              <div>{locale === 'zh' ? '表达' : 'Expression'} {msg.expressionScore?.toFixed(1) ?? '0'}</div>
                                              <div className="col-span-3 text-xs text-gray-400">
                                                {locale === 'zh' ? '总分' : 'Total'} {msg.totalScore?.toFixed(1) ?? '0'}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      )}

                      {activeTab === 'report' && (
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                          {isCompleted ? (
                            <>
                              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <Sparkles size={14} />
                                {uiText.summary}
                              </div>
                              {session?.summary && (
                                <div className="mt-3 text-sm text-gray-700">
                                  <ReactMarkdown>{session.summary}</ReactMarkdown>
                                </div>
                              )}
                              {session?.keyPoints && session.keyPoints.length > 0 && (
                                <div className="mt-4">
                                  <div className="text-xs font-semibold text-gray-500">{uiText.keyPoints}</div>
                                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                                    {session.keyPoints.map((item, idx) => (
                                      <li key={`${item}-${idx}`}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {session?.disagreements && session.disagreements.length > 0 && (
                                <div className="mt-4">
                                  <div className="text-xs font-semibold text-gray-500">{uiText.disagreements}</div>
                                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                                    {session.disagreements.map((item, idx) => (
                                      <li key={`${item}-${idx}`}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-sm text-gray-400">{locale === 'zh' ? '报告将在研究完成后生成。' : 'Report will be available after completion.'}</div>
                          )}
                        </div>
                      )}

                      {activeTab === 'evidence' && (
                        <div className="space-y-4">
                          {messages.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-10 text-center text-sm text-gray-400">
                              {locale === 'zh' ? '观点数据将在研究开始后生成。' : 'Evidence will appear once the research begins.'}
                            </div>
                          ) : (
                            (() => {
                              // Group messages by agent, pick strongest by logicScore
                              const byAgent = new Map<string, DebateMessage[]>();
                              for (const msg of messages) {
                                const list = byAgent.get(msg.senderId) ?? [];
                                list.push(msg);
                                byAgent.set(msg.senderId, list);
                              }
                              const agentEntries = Array.from(byAgent.entries()).map(([agentId, msgs]) => {
                                const sorted = [...msgs].sort((a, b) => (b.logicScore ?? 0) - (a.logicScore ?? 0));
                                return { agent: agentMap.get(agentId), msgs: sorted };
                              });
                              const hasScores = messages.some((m) => m.logicScore != null);
                              return (
                                <>
                                  {hasScores && (
                                    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                                      <div className="text-xs font-semibold text-gray-500 mb-3">
                                        {locale === 'zh' ? '逻辑论证排名' : 'Logic Ranking'}
                                      </div>
                                      <div className="space-y-2">
                                        {[...messages]
                                          .filter((m) => m.logicScore != null)
                                          .sort((a, b) => (b.logicScore ?? 0) - (a.logicScore ?? 0))
                                          .slice(0, 5)
                                          .map((msg, i) => {
                                            const agent = agentMap.get(msg.senderId);
                                            const score = msg.logicScore ?? 0;
                                            return (
                                              <div key={msg.id} className="flex items-center gap-3">
                                                <span className="w-5 text-xs font-bold text-gray-400">#{i + 1}</span>
                                                <span
                                                  className="h-2 w-2 shrink-0 rounded-full"
                                                  style={{ backgroundColor: agent?.color || '#A1A1AA' }}
                                                />
                                                <span className="min-w-0 flex-1 truncate text-xs text-gray-700">{agent?.name || msg.senderId}</span>
                                                <div className="flex items-center gap-1.5">
                                                  <div className="h-1.5 w-20 rounded-full bg-gray-200">
                                                    <div
                                                      className="h-1.5 rounded-full bg-purple-500"
                                                      style={{ width: `${Math.min(100, score * 10)}%` }}
                                                    />
                                                  </div>
                                                  <span className="w-8 text-right text-xs font-semibold text-purple-700">{score.toFixed(1)}</span>
                                                </div>
                                              </div>
                                            );
                                          })}
                                      </div>
                                    </div>
                                  )}
                                  <div className="space-y-3">
                                    {agentEntries.map(({ agent, msgs }) => (
                                      <div key={agent?.id ?? msgs[0]?.senderId} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                          <span
                                            className="h-3 w-3 rounded-full shrink-0"
                                            style={{ backgroundColor: agent?.color || '#A1A1AA' }}
                                          />
                                          <span className="text-sm font-semibold text-gray-800">{agent?.name || msgs[0]?.senderId}</span>
                                          <span className="ml-auto text-xs text-gray-400">
                                            {msgs.length} {locale === 'zh' ? '条论点' : 'arguments'}
                                          </span>
                                        </div>
                                        <div className="space-y-2">
                                          {msgs.slice(0, 3).map((msg) => (
                                            <div key={msg.id} className="rounded-lg bg-gray-50 p-3">
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-gray-400">
                                                  Round {msg.round}
                                                </span>
                                                {msg.logicScore != null && (
                                                  <span className={`text-xs font-semibold ${msg.logicScore >= 8 ? 'text-emerald-600' : msg.logicScore >= 5 ? 'text-amber-600' : 'text-rose-500'}`}>
                                                    {locale === 'zh' ? '逻辑' : 'Logic'} {msg.logicScore.toFixed(1)}
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-xs text-gray-600 line-clamp-3">{msg.content}</p>
                                            </div>
                                          ))}
                                          {msgs.length > 3 && (
                                            <p className="text-xs text-gray-400 text-center">
                                              +{msgs.length - 3} {locale === 'zh' ? '更多' : 'more'}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              );
                            })()
                          )}
                        </div>
                      )}

                      {activeTab === 'ideas' && (
                        <div className="space-y-4">
                          {messages.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-10 text-center text-sm text-gray-400">
                              {locale === 'zh' ? '创意内容将在研究开始后出现。' : 'Creative ideas will appear once the research begins.'}
                            </div>
                          ) : (
                            (() => {
                              const hasScores = messages.some((m) => m.innovationScore != null);
                              const sorted = hasScores
                                ? [...messages].sort((a, b) => (b.innovationScore ?? 0) - (a.innovationScore ?? 0))
                                : [...messages];
                              const high = sorted.filter((m) => (m.innovationScore ?? 0) >= 8);
                              const mid = sorted.filter((m) => (m.innovationScore ?? 0) >= 5 && (m.innovationScore ?? 0) < 8);
                              const low = sorted.filter((m) => (m.innovationScore ?? 0) < 5);
                              const groups = hasScores
                                ? [
                                    { label: locale === 'zh' ? '高创意' : 'High Innovation', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', items: high },
                                    { label: locale === 'zh' ? '中等创意' : 'Moderate', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', items: mid },
                                    { label: locale === 'zh' ? '常规贡献' : 'Standard', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', items: low },
                                  ].filter((g) => g.items.length > 0)
                                : [{ label: locale === 'zh' ? '研究想法' : 'Research Ideas', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', items: sorted }];
                              return (
                                <>
                                  {hasScores && (
                                    <div className="flex items-center gap-2 rounded-xl border border-purple-100 bg-purple-50/60 px-4 py-3">
                                      <Lightbulb size={14} className="text-purple-600 shrink-0" />
                                      <p className="text-xs text-purple-700">
                                        {locale === 'zh'
                                          ? `共 ${messages.length} 条研究贡献，其中 ${high.length} 条高创意观点`
                                          : `${messages.length} contributions total — ${high.length} high-innovation ideas`}
                                      </p>
                                    </div>
                                  )}
                                  {groups.map((group) => (
                                    <div key={group.label}>
                                      <div className={`mb-2 text-xs font-semibold ${group.color}`}>{group.label}</div>
                                      <div className="space-y-2">
                                        {group.items.slice(0, 5).map((msg) => {
                                          const agent = agentMap.get(msg.senderId);
                                          return (
                                            <div key={msg.id} className={`rounded-xl border ${group.border} ${group.bg} p-4`}>
                                              <div className="flex items-center gap-2 mb-2">
                                                <span
                                                  className="h-2 w-2 rounded-full shrink-0"
                                                  style={{ backgroundColor: agent?.color || '#A1A1AA' }}
                                                />
                                                <span className="text-xs font-semibold text-gray-700">{agent?.name || msg.senderId}</span>
                                                <span className="text-xs text-gray-400 ml-auto">R{msg.round}</span>
                                                {msg.innovationScore != null && (
                                                  <span className={`text-xs font-bold ${group.color}`}>
                                                    ✦ {msg.innovationScore.toFixed(1)}
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-sm text-gray-700 line-clamp-4">{msg.content}</p>
                                            </div>
                                          );
                                        })}
                                        {group.items.length > 5 && (
                                          <p className="text-xs text-gray-400 text-center py-1">
                                            +{group.items.length - 5} {locale === 'zh' ? '更多' : 'more'}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </>
                              );
                            })()
                          )}
                        </div>
                      )}

                      {activeTab === 'demo' && (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-10 text-center text-sm text-gray-400">
                          {locale === 'zh' ? '演示模块正在准备中。' : 'Demo module coming soon.'}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
