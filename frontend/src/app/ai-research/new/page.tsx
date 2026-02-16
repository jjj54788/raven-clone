"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import { createDebateSession, getDebateAgents, type DebateAgent } from '@/lib/api';

export default function AiResearchNewPage() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { locale } = useLanguage();

  const [topic, setTopic] = useState('');
  const [agents, setAgents] = useState<DebateAgent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [maxRounds, setMaxRounds] = useState(5);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    setLoading(true);
    getDebateAgents()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setAgents(list);
        setSelectedAgents(list.filter((a) => a.category === 'DEBATER').slice(0, 3).map((a) => a.id));
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
        title: '新建协商',
        subtitle: '选择智能体与轮次，启动多智能体讨论',
        topicLabel: '协商话题',
        topicPlaceholder: '例如：AI Agent 是否会成为主流工作方式？',
        agentsLabel: '选择智能体',
        roundsLabel: '讨论轮次',
        submit: '创建协商',
        back: '返回',
        error: '请至少选择 2 个智能体并填写话题',
        group: {
          DEBATER: '观点论证组',
          EVALUATOR: '质量评估组',
          SPECIALIST: '专业分析组',
        },
      };
    }
    return {
      title: 'New Debate',
      subtitle: 'Select agents and rounds to start a multi-agent discussion',
      topicLabel: 'Topic',
      topicPlaceholder: 'e.g. Will AI agents become the mainstream workflow?',
      agentsLabel: 'Agents',
      roundsLabel: 'Rounds',
      submit: 'Create Debate',
      back: 'Back',
      error: 'Select at least 2 agents and enter a topic',
      group: {
        DEBATER: 'Debaters',
        EVALUATOR: 'Evaluators',
        SPECIALIST: 'Specialists',
      },
    };
  }, [locale]);

  const grouped = useMemo(() => {
    const groups: Record<string, DebateAgent[]> = { DEBATER: [], EVALUATOR: [], SPECIALIST: [] };
    agents.forEach((agent) => {
      if (groups[agent.category]) groups[agent.category].push(agent);
    });
    return groups;
  }, [agents]);

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    if (selectedAgents.length < 2 || !topic.trim()) {
      setError(uiText.error);
      return;
    }
    setError('');
    setCreating(true);
    try {
      const session = await createDebateSession({
        topic: topic.trim(),
        agentIds: selectedAgents,
        maxRounds,
      });
      router.push(`/ai-research/${session.id}`);
    } catch (err: any) {
      setError(err?.message || uiText.error);
    } finally {
      setCreating(false);
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
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-gray-900">{uiText.title}</h1>
              <p className="mt-0.5 text-sm text-gray-500">{uiText.subtitle}</p>
            </div>
            <Link
              href="/ai-research"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <ArrowLeft size={14} />
              {uiText.back}
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-4xl space-y-6">
            {loading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
                Loading...
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <label className="text-xs font-semibold text-gray-500">{uiText.topicLabel}</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={uiText.topicPlaceholder}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-purple-300"
                  />
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500">{uiText.agentsLabel}</div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {Object.entries(grouped).map(([category, groupAgents]) => (
                      <div key={category} className="space-y-3">
                        <div className="text-xs font-semibold text-gray-400">{uiText.group[category as keyof typeof uiText.group]}</div>
                        {groupAgents.map((agent) => {
                          const active = selectedAgents.includes(agent.id);
                          return (
                            <button
                              type="button"
                              key={agent.id}
                              onClick={() => toggleAgent(agent.id)}
                              className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                                active ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <span className={`mt-1 flex h-4 w-4 items-center justify-center rounded border ${active ? 'border-purple-500 bg-purple-600 text-white' : 'border-gray-300'}`}>
                                {active && <Check size={12} />}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold">{agent.name}</span>
                                <span className="block text-xs text-gray-500">{agent.profile}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <label className="text-xs font-semibold text-gray-500">{uiText.roundsLabel}</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxRounds}
                    onChange={(e) => setMaxRounds(Number(e.target.value))}
                    className="mt-2 w-24 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-purple-300"
                  />
                </div>

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60"
                >
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  {uiText.submit}
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
