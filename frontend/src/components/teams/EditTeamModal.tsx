'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Crown, Plus, X } from 'lucide-react';
import {
  buildTeamCanvas,
  getAssistantCatalog,
  resolveAssistants,
  hasModelKey,
  type Team,
  type TeamAssistant,
  type TeamAssistantCatalogItem,
} from '@/lib/teams';
import { useLanguage } from '@/i18n/LanguageContext';
import ModelSettingsModal from '@/components/teams/ModelSettingsModal';

interface EditTeamModalProps {
  open: boolean;
  team: Team;
  onClose: () => void;
  onSave: (next: Team) => void;
}

type AssistantStatus = NonNullable<TeamAssistant['status']>;

interface DraftState {
  name: string;
  description: string;
  goal: string;
  tags: string[];
  assistantIds: string[];
  leaderId?: string;
  roles: Record<string, string>;
  statuses: Record<string, AssistantStatus>;
}

const DEFAULT_STATUS: AssistantStatus = 'idle';

function typeLabel(type: string): string {
  switch (type) {
    case 'embedding':
      return 'Embedding';
    case 'rerank':
      return 'Rerank';
    case 'tool':
      return 'Tool';
    default:
      return 'Chat';
  }
}

function makeDraft(team: Team): DraftState {
  const roles: Record<string, string> = {};
  const statuses: Record<string, AssistantStatus> = {};
  team.assistants.forEach((assistant) => {
    roles[assistant.id] = assistant.role;
    statuses[assistant.id] = assistant.status || DEFAULT_STATUS;
  });

  return {
    name: team.name,
    description: team.description,
    goal: team.goal || '',
    tags: team.tags || [],
    assistantIds: team.assistants.map((assistant) => assistant.id),
    leaderId: team.leaderId,
    roles,
    statuses,
  };
}

function normalizeTags(tags: string[]): string[] {
  return tags.map((t) => t.trim()).filter(Boolean);
}

export default function EditTeamModal({ open, team, onClose, onSave }: EditTeamModalProps) {
  const { locale } = useLanguage();
  const [catalog, setCatalog] = useState<TeamAssistantCatalogItem[]>(() => getAssistantCatalog());
  const [draft, setDraft] = useState<DraftState>(() => makeDraft(team));
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [modelSettingsOpen, setModelSettingsOpen] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState(0);

  const uiText = useMemo(() => {
    const zh = {
      title: '\u7f16\u8f91\u56e2\u961f',
      subtitle: '\u8c03\u6574\u56e2\u961f\u76ee\u6807\u4e0e AI \u89d2\u8272\u914d\u7f6e\uff0c\u66f4\u65b0\u56e2\u961f\u8fd0\u4f5c\u65b9\u5f0f\u3002',
      nameLabel: '\u56e2\u961f\u540d\u79f0 *',
      namePlaceholder: '\u4f8b\u5982\uff1a\u6280\u672f\u8bba\u8bc1\u3001\u5468\u4f1a',
      goalLabel: '\u56e2\u961f\u76ee\u6807',
      goalPlaceholder: '\u4f8b\u5982\uff1a\u8981\u89e3\u51b3\u7684\u95ee\u9898 / \u8f93\u51fa',
      descLabel: '\u63cf\u8ff0',
      descPlaceholder: '\u8fd9\u4e2a\u56e2\u961f\u662f\u5173\u4e8e\u4ec0\u4e48\u7684\uff1f',
      tagLabel: '\u6807\u7b7e',
      tagPlaceholder: '\u6dfb\u52a0\u6807\u7b7e',
      tagAdd: '\u6dfb\u52a0',
      assistantTitle: '\u914d\u7f6e AI \u52a9\u624b',
      assistantManage: '\u914d\u7f6e\u6a21\u578b',
      assistantCount: '\u5df2\u9009 {selected} / {total}',
      assistantRole: '\u89d2\u8272',
      assistantStatus: '\u72b6\u6001',
      leaderLabel: '\u7ec4\u957f',
      assistantKeyMissing: '\u672a\u914d\u7f6e Key',
      statusIdle: '\u5f85\u547d',
      statusRunning: '\u8fd0\u884c\u4e2d',
      statusDone: '\u5df2\u5b8c\u6210',
      errorName: '\u8bf7\u8f93\u5165\u56e2\u961f\u540d\u79f0',
      errorAssistants: '\u8bf7\u9009\u62e9\u81f3\u5c11\u4e00\u4e2a AI \u52a9\u624b',
      cancel: '\u53d6\u6d88',
      save: '\u4fdd\u5b58\u66f4\u65b0',
      selected: '\u5df2\u9009',
      notSelected: '\u672a\u9009',
    };
    const en = {
      title: 'Edit Team',
      subtitle: 'Adjust goals and AI roles for this team.',
      nameLabel: 'Team name *',
      namePlaceholder: 'e.g. Strategy review',
      goalLabel: 'Team goal',
      goalPlaceholder: 'What should this team deliver?',
      descLabel: 'Description',
      descPlaceholder: 'What is this team about?',
      tagLabel: 'Tags',
      tagPlaceholder: 'Add tag',
      tagAdd: 'Add',
      assistantTitle: 'AI Assistants',
      assistantManage: 'Model settings',
      assistantCount: 'Selected {selected} / {total}',
      assistantRole: 'Role',
      assistantStatus: 'Status',
      leaderLabel: 'Leader',
      assistantKeyMissing: 'Key required',
      statusIdle: 'Idle',
      statusRunning: 'Running',
      statusDone: 'Done',
      errorName: 'Please enter a team name',
      errorAssistants: 'Select at least one AI assistant',
      cancel: 'Cancel',
      save: 'Save changes',
      selected: 'Selected',
      notSelected: 'Not selected',
    };
    return locale === 'zh' ? zh : en;
  }, [locale]);

  useEffect(() => {
    if (!open) return;
    setDraft(makeDraft(team));
    setTagInput('');
    setError(null);
    setCatalog(getAssistantCatalog());
  }, [open, team]);

  useEffect(() => {
    setCatalog(getAssistantCatalog());
  }, [catalogVersion]);

  const toggleAssistant = (id: string) => {
    setDraft((prev) => {
      const exists = prev.assistantIds.includes(id);
      const nextIds = exists
        ? prev.assistantIds.filter((x) => x !== id)
        : [...prev.assistantIds, id];

      const nextLeaderId = prev.leaderId && nextIds.includes(prev.leaderId)
        ? prev.leaderId
        : nextIds[0];

      return {
        ...prev,
        assistantIds: nextIds,
        leaderId: nextLeaderId,
      };
    });
  };

  const setAssistantRole = (id: string, role: string) => {
    setDraft((prev) => ({
      ...prev,
      roles: { ...prev.roles, [id]: role },
    }));
  };

  const setAssistantStatus = (id: string, status: AssistantStatus) => {
    setDraft((prev) => ({
      ...prev,
      statuses: { ...prev.statuses, [id]: status },
    }));
  };

  const addTag = () => {
    const next = tagInput.trim();
    if (!next) return;
    setDraft((prev) => ({
      ...prev,
      tags: normalizeTags([...prev.tags, next]),
    }));
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setDraft((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleSave = () => {
    const name = draft.name.trim();
    if (!name) {
      setError(uiText.errorName);
      return;
    }
    if (draft.assistantIds.length === 0) {
      setError(uiText.errorAssistants);
      return;
    }
    const assistantsBase = resolveAssistants(draft.assistantIds);
    const assistants = assistantsBase.map((assistant) => {
      const existing = team.assistants.find((a) => a.id === assistant.id);
      return {
        ...assistant,
        role: draft.roles[assistant.id] || existing?.role || assistant.role,
        status: draft.statuses[assistant.id] || existing?.status || DEFAULT_STATUS,
      };
    });

    const leaderId = draft.leaderId && assistants.some((a) => a.id === draft.leaderId)
      ? draft.leaderId
      : assistants[0]?.id;

    const hasRunning = assistants.some((a) => a.status === 'running');
    const hasDone = assistants.some((a) => a.status === 'done');
    const canvasStatus: AssistantStatus = hasRunning ? 'running' : hasDone ? 'done' : 'idle';

    const nextTeam: Team = {
      ...team,
      name,
      description: draft.description.trim(),
      goal: draft.goal.trim(),
      tags: normalizeTags(draft.tags),
      assistants,
      leaderId,
      updatedAt: new Date().toISOString(),
      canvas: buildTeamCanvas(assistants, leaderId, {
        status: canvasStatus,
        progress: { done: canvasStatus === 'done' ? 2 : 0, total: 2 },
      }),
    };

    setError(null);
    onSave(nextTeam);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{uiText.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{uiText.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm text-gray-700">
              {uiText.nameLabel}
              <input
                value={draft.name}
                onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                placeholder={uiText.namePlaceholder}
              />
            </label>
            <label className="text-sm text-gray-700">
              {uiText.goalLabel}
              <input
                value={draft.goal}
                onChange={(e) => setDraft((prev) => ({ ...prev, goal: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                placeholder={uiText.goalPlaceholder}
              />
            </label>
          </div>

          <label className="mt-4 block text-sm text-gray-700">
            {uiText.descLabel}
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
              placeholder={uiText.descPlaceholder}
            />
          </label>

          <div className="mt-4">
            <label className="text-sm text-gray-700">{uiText.tagLabel}</label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="h-9 w-48 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-purple-300"
                placeholder={uiText.tagPlaceholder}
              />
              <button
                type="button"
                onClick={addTag}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-purple-600 px-3 text-sm font-semibold text-white hover:bg-purple-700"
              >
                <Plus size={14} />
                {uiText.tagAdd}
              </button>
              {draft.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600 hover:border-purple-200 hover:text-purple-700"
                >
                  {tag}
                  <X size={12} />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">{uiText.assistantTitle}</h4>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <button
                  type="button"
                  onClick={() => setModelSettingsOpen(true)}
                  className="rounded-full border border-purple-200 px-2 py-0.5 text-[11px] font-semibold text-purple-600 hover:bg-purple-50"
                >
                  {uiText.assistantManage}
                </button>
                <span>
                  {uiText.assistantCount
                    .replace('{selected}', String(draft.assistantIds.length))
                    .replace('{total}', String(catalog.length))}
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {catalog.map((assistant: TeamAssistantCatalogItem) => {
                const selected = draft.assistantIds.includes(assistant.id);
                const keyReady = assistant.keyProvider ? hasModelKey(assistant.keyProvider) : true;
                const available = assistant.requiresKey === false ? true : keyReady;
                const locked = !available && !selected;
                const roleValue = draft.roles[assistant.id] || assistant.role;
                const statusValue = draft.statuses[assistant.id] || DEFAULT_STATUS;
                const isLeader = draft.leaderId === assistant.id;
                return (
                  <div
                    key={assistant.id}
                    className={[
                      'rounded-xl border px-3 py-3 text-left transition-colors',
                      selected ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white',
                      locked ? 'opacity-60' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (locked) {
                            setModelSettingsOpen(true);
                            return;
                          }
                          toggleAssistant(assistant.id);
                        }}
                        disabled={locked}
                        className="flex items-center gap-3 text-left"
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${assistant.accent} text-white`}
                        >
                          <span className="text-sm font-semibold">{assistant.iconText}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">{assistant.name}</p>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                              {typeLabel(assistant.type)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {assistant.provider} - {assistant.model}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            {selected ? uiText.selected : uiText.notSelected}
                          </p>
                          {!available && (
                            <p className="mt-1 text-[11px] text-amber-600">{uiText.assistantKeyMissing}</p>
                          )}
                        </div>
                      </button>

                      <div className="ml-auto flex items-center gap-2">
                        {selected && (
                          <button
                            type="button"
                            onClick={() => setDraft((prev) => ({ ...prev, leaderId: assistant.id }))}
                            className={[
                              'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold',
                              isLeader
                                ? 'border-amber-200 bg-amber-100 text-amber-800'
                                : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
                            ].join(' ')}
                            title={uiText.leaderLabel}
                          >
                            <Crown size={12} />
                            {uiText.leaderLabel}
                          </button>
                        )}
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white">
                          {selected ? <Check size={14} /> : null}
                        </div>
                      </div>
                    </div>

                    {selected && (
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        <label className="text-xs font-semibold text-gray-500">
                          {uiText.assistantRole}
                          <input
                            value={roleValue}
                            onChange={(e) => setAssistantRole(assistant.id, e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 focus:border-purple-300 focus:outline-none"
                          />
                        </label>
                        <label className="text-xs font-semibold text-gray-500">
                          {uiText.assistantStatus}
                          <select
                            value={statusValue}
                            onChange={(e) => setAssistantStatus(assistant.id, e.target.value as AssistantStatus)}
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 focus:border-purple-300 focus:outline-none"
                          >
                            <option value="idle">{uiText.statusIdle}</option>
                            <option value="running">{uiText.statusRunning}</option>
                            <option value="done">{uiText.statusDone}</option>
                          </select>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            {uiText.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
          >
            {uiText.save}
          </button>
        </div>
      </div>

      <ModelSettingsModal
        open={modelSettingsOpen}
        onClose={() => setModelSettingsOpen(false)}
        onSaved={() => setCatalogVersion((prev) => prev + 1)}
      />
    </div>
  );
}
