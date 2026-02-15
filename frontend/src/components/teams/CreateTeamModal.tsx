'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import {
  getAssistantCatalog,
  hasModelKey,
  type TeamDraft,
  type TeamAssistantCatalogItem,
} from '@/lib/teams';
import ModelSettingsModal from '@/components/teams/ModelSettingsModal';
import { useLanguage } from '@/i18n/LanguageContext';

interface CreateTeamModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (draft: TeamDraft) => void;
}

const emptyDraft: TeamDraft = {
  name: '',
  description: '',
  tags: [],
  assistantIds: [],
  goal: '',
};

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

export default function CreateTeamModal({ open, onClose, onCreate }: CreateTeamModalProps) {
  const { locale } = useLanguage();
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [catalog, setCatalog] = useState<TeamAssistantCatalogItem[]>(() => getAssistantCatalog());
  const [draft, setDraft] = useState<TeamDraft>(emptyDraft);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [modelSettingsOpen, setModelSettingsOpen] = useState(false);

  const uiText = useMemo(() => {
    const zh = {
      title: '\u521b\u5efa\u65b0\u56e2\u961f',
      subtitle: '\u5b9a\u4e49\u66f4\u6e05\u6670\u7684\u89d2\u8272\u7ed3\u6784\uff0c\u5feb\u901f\u642d\u5efa AI \u4efb\u52a1\u5c0f\u7ec4\u3002',
      nameLabel: '\u56e2\u961f\u540d\u79f0 *',
      namePlaceholder: '\u4f8b\u5982\uff1a\u6280\u672f\u8bba\u8bc1\u3001\u5468\u4f1a',
      descLabel: '\u63cf\u8ff0',
      descPlaceholder: '\u8fd9\u4e2a\u56e2\u961f\u662f\u5173\u4e8e\u4ec0\u4e48\u7684\uff1f',
      tagLabel: '\u6807\u7b7e',
      tagPlaceholder: '\u6dfb\u52a0\u6807\u7b7e\uff08\u6309\u56de\u8f66\uff09',
      tagAdd: '\u6dfb\u52a0',
      assistantTitle: '\u6dfb\u52a0 AI \u52a9\u624b',
      assistantManage: '\u914d\u7f6e\u6a21\u578b',
      assistantCount: '\u5df2\u9009 {selected} / {total}',
      assistantKeyMissing: '\u672a\u914d\u7f6e Key',
      errorName: '\u8bf7\u8f93\u5165\u56e2\u961f\u540d\u79f0',
      errorAssistants: '\u8bf7\u9009\u62e9\u81f3\u5c11\u4e00\u4e2a AI \u52a9\u624b',
      cancel: '\u53d6\u6d88',
      create: '\u521b\u5efa\u56e2\u961f',
    };
    const en = {
      title: 'Create Team',
      subtitle: 'Define roles and quickly spin up an AI squad.',
      nameLabel: 'Team name *',
      namePlaceholder: 'e.g. Strategy review',
      descLabel: 'Description',
      descPlaceholder: 'What is this team about?',
      tagLabel: 'Tags',
      tagPlaceholder: 'Add tag (press Enter)',
      tagAdd: 'Add',
      assistantTitle: 'Add AI Assistants',
      assistantManage: 'Model settings',
      assistantCount: 'Selected {selected} / {total}',
      assistantKeyMissing: 'Key required',
      errorName: 'Please enter a team name',
      errorAssistants: 'Select at least one AI assistant',
      cancel: 'Cancel',
      create: 'Create Team',
    };
    return locale === 'zh' ? zh : en;
  }, [locale]);

  useEffect(() => {
    if (!open) return;
    setDraft(emptyDraft);
    setTagInput('');
    setError(null);
    setCatalog(getAssistantCatalog());
  }, [open]);

  useEffect(() => {
    setCatalog(getAssistantCatalog());
  }, [catalogVersion]);

  const toggleAssistant = (id: string) => {
    setDraft((prev) => {
      const exists = prev.assistantIds.includes(id);
      return {
        ...prev,
        assistantIds: exists
          ? prev.assistantIds.filter((x) => x !== id)
          : [...prev.assistantIds, id],
      };
    });
  };

  const addTag = () => {
    const next = tagInput.trim();
    if (!next) return;
    setDraft((prev) => {
      if (prev.tags.includes(next)) return prev;
      return { ...prev, tags: [...prev.tags, next] };
    });
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setDraft((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleSubmit = () => {
    const name = draft.name.trim();
    if (!name) {
      setError(uiText.errorName);
      return;
    }
    if (draft.assistantIds.length === 0) {
      setError(uiText.errorAssistants);
      return;
    }
    setError(null);
    onCreate({
      ...draft,
      name,
      description: draft.description.trim(),
      tags: draft.tags,
      goal: draft.goal?.trim(),
    });
  };

  const canSubmit = draft.name.trim().length > 0 && draft.assistantIds.length > 0;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
        <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl">
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
            <div />
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
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-purple-300"
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
              </div>
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
                return (
                  <button
                    key={assistant.id}
                    type="button"
                    onClick={() => {
                      if (!available) {
                        setModelSettingsOpen(true);
                        return;
                      }
                      toggleAssistant(assistant.id);
                    }}
                    disabled={!available}
                    className={[
                      'flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                      selected ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white',
                      available ? 'hover:border-purple-200' : 'cursor-not-allowed opacity-60',
                    ].join(' ')}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${assistant.accent} text-white`}
                    >
                      <span className="text-sm font-semibold">{assistant.iconText}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{assistant.name}</p>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                          {typeLabel(assistant.type)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {assistant.provider} - {assistant.model}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">{assistant.role}</p>
                      {!available && (
                        <p className="mt-1 text-[11px] text-amber-600">{uiText.assistantKeyMissing}</p>
                      )}
                    </div>
                    {selected ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white">
                        <Check size={14} />
                      </div>
                    ) : null}
                  </button>
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
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
          >
            {uiText.create}
          </button>
        </div>
        </div>
      </div>
      <ModelSettingsModal
        open={modelSettingsOpen}
        onClose={() => setModelSettingsOpen(false)}
        onSaved={() => setCatalogVersion((prev) => prev + 1)}
      />
    </>
  );
}

