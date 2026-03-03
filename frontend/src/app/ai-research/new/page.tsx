"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Loader2, Pencil, Plus, X } from 'lucide-react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import AgentOrgChart from '@/components/AgentOrgChart';
import {
  createDebateAgent,
  createDebateSession,
  getDebateAgents,
  updateDebateAgent,
  type DebateAgent,
} from '@/lib/api';

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
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<DebateAgent | null>(null);
  const [agentDraft, setAgentDraft] = useState({
    name: '',
    profile: '',
    systemPrompt: '',
    description: '',
    color: '#8B5CF6',
    category: 'DEBATER' as DebateAgent['category'],
  });
  const [agentSaving, setAgentSaving] = useState(false);
  const [agentError, setAgentError] = useState('');

  const refreshAgents = async (autoSelect = false) => {
    const data = await getDebateAgents();
    const list = Array.isArray(data) ? data : [];
    setAgents(list);
    if (autoSelect) {
      setSelectedAgents(list.filter((a) => a.category === 'DEBATER').slice(0, 3).map((a) => a.id));
    }
    return list;
  };

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    setLoading(true);
    refreshAgents(true)
      .catch(() => {})
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
        orgTitle: '组织视图',
        agentManage: '智能体管理',
        agentCreate: '新建智能体',
        agentEdit: '编辑',
        agentModalTitleNew: '创建智能体',
        agentModalTitleEdit: '编辑智能体',
        agentName: '智能体名称',
        agentProfile: '职责/角色',
        agentPrompt: '系统提示词',
        agentDescription: '描述',
        agentColor: '颜色',
        agentCategory: '类型',
        agentSave: '保存',
        agentCancel: '取消',
        agentNamePlaceholder: '例如：运营分析专家',
        agentProfilePlaceholder: '例如：竞品观察',
        agentPromptPlaceholder: '请描述该智能体的行为角色与语气',
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
      orgTitle: 'Organization View',
      agentManage: 'Agent Management',
      agentCreate: 'New Agent',
      agentEdit: 'Edit',
      agentModalTitleNew: 'Create Agent',
      agentModalTitleEdit: 'Edit Agent',
      agentName: 'Agent name',
      agentProfile: 'Role',
      agentPrompt: 'System prompt',
      agentDescription: 'Description',
      agentColor: 'Color',
      agentCategory: 'Category',
      agentSave: 'Save',
      agentCancel: 'Cancel',
      agentNamePlaceholder: 'e.g. Market Analyst',
      agentProfilePlaceholder: 'e.g. Competitive tracking',
      agentPromptPlaceholder: 'Describe the behavior and tone for this agent',
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

  const selectedAgentObjects = useMemo(
    () => agents.filter((agent) => selectedAgents.includes(agent.id)),
    [agents, selectedAgents],
  );
  const leaderId = selectedAgentObjects[0]?.id;

  const openCreateAgent = () => {
    setEditingAgent(null);
    setAgentDraft({
      name: '',
      profile: '',
      systemPrompt: '',
      description: '',
      color: '#8B5CF6',
      category: 'DEBATER',
    });
    setAgentError('');
    setAgentModalOpen(true);
  };

  const openEditAgent = (agent: DebateAgent) => {
    setEditingAgent(agent);
    setAgentDraft({
      name: agent.name,
      profile: agent.profile,
      systemPrompt: agent.systemPrompt || '',
      description: agent.description || '',
      color: agent.color || '#8B5CF6',
      category: agent.category,
    });
    setAgentError('');
    setAgentModalOpen(true);
  };

  const closeAgentModal = () => {
    setAgentModalOpen(false);
    setEditingAgent(null);
    setAgentError('');
  };

  const saveAgent = async () => {
    if (!agentDraft.name.trim() || !agentDraft.profile.trim() || !agentDraft.systemPrompt.trim()) {
      setAgentError(locale === 'zh' ? '请填写必填字段' : 'Please fill in required fields');
      return;
    }
    setAgentSaving(true);
    setAgentError('');
    try {
      const payload = {
        name: agentDraft.name.trim(),
        profile: agentDraft.profile.trim(),
        systemPrompt: agentDraft.systemPrompt.trim(),
        description: agentDraft.description.trim(),
        color: agentDraft.color,
        category: agentDraft.category,
      };
      const saved = editingAgent
        ? await updateDebateAgent(editingAgent.id, payload)
        : await createDebateAgent(payload);

      await refreshAgents();
      if (!editingAgent) {
        setSelectedAgents((prev) => (prev.includes(saved.id) ? prev : [...prev, saved.id]));
      }
      closeAgentModal();
    } catch (err: any) {
      setAgentError(err?.message || (locale === 'zh' ? '保存失败' : 'Save failed'));
    } finally {
      setAgentSaving(false);
    }
  };

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
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-gray-500">{uiText.agentsLabel}</div>
                    <button
                      type="button"
                      onClick={openCreateAgent}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      <Plus size={12} />
                      {uiText.agentCreate}
                    </button>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {Object.entries(grouped).map(([category, groupAgents]) => (
                      <div key={category} className="space-y-3">
                        <div className="text-xs font-semibold text-gray-400">{uiText.group[category as keyof typeof uiText.group]}</div>
                        {groupAgents.map((agent) => {
                          const active = selectedAgents.includes(agent.id);
                          const isCustom = Boolean(agent.userId);
                          return (
                            <div
                              key={agent.id}
                              className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                                active ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => toggleAgent(agent.id)}
                                className="flex flex-1 items-start gap-3 text-left"
                              >
                                <span className={`mt-1 flex h-4 w-4 items-center justify-center rounded border ${active ? 'border-purple-500 bg-purple-600 text-white' : 'border-gray-300'}`}>
                                  {active && <Check size={12} />}
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold">{agent.name}</span>
                                  <span className="block text-xs text-gray-500">{agent.profile}</span>
                                </span>
                              </button>
                              {isCustom && (
                                <button
                                  type="button"
                                  onClick={() => openEditAgent(agent)}
                                  className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                                  title={uiText.agentEdit}
                                  aria-label={uiText.agentEdit}
                                >
                                  <Pencil size={14} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500">{uiText.orgTitle}</div>
                  <div className="mt-4">
                    <AgentOrgChart agents={selectedAgentObjects} leaderId={leaderId} />
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

      {agentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {editingAgent ? uiText.agentModalTitleEdit : uiText.agentModalTitleNew}
                </h3>
                <p className="text-xs text-gray-500">{uiText.agentManage}</p>
              </div>
              <button
                type="button"
                onClick={closeAgentModal}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">{uiText.agentName}</label>
                <input
                  value={agentDraft.name}
                  onChange={(e) => setAgentDraft((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={uiText.agentNamePlaceholder}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">{uiText.agentProfile}</label>
                <input
                  value={agentDraft.profile}
                  onChange={(e) => setAgentDraft((prev) => ({ ...prev, profile: e.target.value }))}
                  placeholder={uiText.agentProfilePlaceholder}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">{uiText.agentPrompt}</label>
                <textarea
                  value={agentDraft.systemPrompt}
                  onChange={(e) => setAgentDraft((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                  placeholder={uiText.agentPromptPlaceholder}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">{uiText.agentDescription}</label>
                <input
                  value={agentDraft.description}
                  onChange={(e) => setAgentDraft((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder={uiText.agentProfilePlaceholder}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600">{uiText.agentColor}</label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="color"
                      value={agentDraft.color}
                      onChange={(e) => setAgentDraft((prev) => ({ ...prev, color: e.target.value }))}
                      className="h-10 w-12 rounded-lg border border-gray-200 bg-white p-1"
                    />
                    <input
                      value={agentDraft.color}
                      onChange={(e) => setAgentDraft((prev) => ({ ...prev, color: e.target.value }))}
                      className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">{uiText.agentCategory}</label>
                  <select
                    value={agentDraft.category}
                    onChange={(e) => setAgentDraft((prev) => ({ ...prev, category: e.target.value as DebateAgent['category'] }))}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                  >
                    <option value="DEBATER">{uiText.group.DEBATER}</option>
                    <option value="SPECIALIST">{uiText.group.SPECIALIST}</option>
                    <option value="EVALUATOR">{uiText.group.EVALUATOR}</option>
                  </select>
                </div>
              </div>
            </div>

            {agentError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {agentError}
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeAgentModal}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {uiText.agentCancel}
              </button>
              <button
                type="button"
                onClick={saveAgent}
                disabled={agentSaving}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
              >
                {agentSaving ? '...' : uiText.agentSave}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
