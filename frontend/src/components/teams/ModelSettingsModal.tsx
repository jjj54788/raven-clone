'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  loadModelKeys,
  saveModelKeys,
  loadCustomAssistants,
  replaceCustomAssistants,
  type ModelKeyMap,
  type TeamAssistantCatalogItem,
  type TeamAssistantType,
  type CustomAssistantInput,
  buildCustomAssistant,
  PROVIDER_OPTIONS,
} from '@/lib/teams';
import { useLanguage } from '@/i18n/LanguageContext';

interface ModelSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const DEFAULT_CUSTOM_INPUT: CustomAssistantInput & { apiKey: string } = {
  name: '',
  model: '',
  provider: '',
  type: 'chat',
  role: '',
  summary: '',
  iconText: '',
  apiKey: '',
};

function normalizeProvider(provider: string): string {
  return provider.trim().toLowerCase();
}

export default function ModelSettingsModal({ open, onClose, onSaved }: ModelSettingsModalProps) {
  const { locale } = useLanguage();
  const [keys, setKeys] = useState<ModelKeyMap>({});
  const [customModels, setCustomModels] = useState<TeamAssistantCatalogItem[]>([]);
  const [customInput, setCustomInput] = useState(DEFAULT_CUSTOM_INPUT);
  const [error, setError] = useState<string | null>(null);

  const uiText = useMemo(() => {
    const zh = {
      title: '\u6a21\u578b\u914d\u7f6e',
      subtitle: '\u8f93\u5165 API Key \u4e4b\u540e\u6a21\u578b\u5373\u53ef\u542f\u7528\uff0c\u4ec5\u4fdd\u5b58\u5728\u672c\u5730\u6d4f\u89c8\u5668\u3002',
      keySection: 'API Keys',
      keyHint: '\u4e3a\u5bf9\u5e94\u4f9b\u5e94\u5546\u8f93\u5165 Key',
      keyPlaceholder: '\u8f93\u5165 Key',
      customSection: '\u81ea\u5b9a\u4e49\u6a21\u578b',
      customHint: '\u65b0\u589e\u81ea\u5b9a\u4e49\u6a21\u578b\u4ee5\u53c2\u4e0e\u56e2\u961f',
      customName: '\u6a21\u578b\u540d\u79f0',
      customProvider: '\u63d0\u4f9b\u5546',
      customModel: '\u6a21\u578b ID',
      customType: '\u7c7b\u578b',
      customRole: '\u89d2\u8272',
      customSummary: '\u7b80\u4ecb',
      customIcon: '\u56fe\u6807\u6587\u5b57',
      customKey: 'API Key',
      addCustom: '\u6dfb\u52a0\u6a21\u578b',
      remove: '\u79fb\u9664',
      save: '\u4fdd\u5b58',
      cancel: '\u53d6\u6d88',
      required: '\u8bf7\u586b\u5199\u5fc5\u586b\u4fe1\u606f',
      typeChat: '\u5bf9\u8bdd',
      typeEmbedding: '\u5411\u91cf',
      typeRerank: '\u6392\u5e8f',
      typeTool: '\u5de5\u5177',
      modelPlaceholder: '\u4f8b\u5982\uff1a gpt-4.1',
      rolePlaceholder: '\u4f8b\u5982\uff1a \u5206\u6790\u52a9\u624b',
      summaryPlaceholder: '\u7b80\u5355\u63cf\u8ff0\u80fd\u529b',
      providerPlaceholder: '\u4f8b\u5982\uff1a OpenAI',
      namePlaceholder: '\u4f8b\u5982\uff1a \u6211\u7684\u6a21\u578b',
      iconPlaceholder: '\u4f8b\u5982\uff1a AI',
    };
    const en = {
      title: 'Model Settings',
      subtitle: 'Keys are stored locally in your browser.',
      keySection: 'API Keys',
      keyHint: 'Provide API keys for each provider',
      keyPlaceholder: 'Enter API key',
      customSection: 'Custom Models',
      customHint: 'Add your own models to the team catalog',
      customName: 'Model name',
      customProvider: 'Provider',
      customModel: 'Model ID',
      customType: 'Type',
      customRole: 'Role',
      customSummary: 'Summary',
      customIcon: 'Icon text',
      customKey: 'API Key',
      addCustom: 'Add model',
      remove: 'Remove',
      save: 'Save',
      cancel: 'Cancel',
      required: 'Please fill in required fields',
      typeChat: 'Chat',
      typeEmbedding: 'Embedding',
      typeRerank: 'Rerank',
      typeTool: 'Tool',
      modelPlaceholder: 'e.g. gpt-4.1',
      rolePlaceholder: 'e.g. Analyst',
      summaryPlaceholder: 'Short description',
      providerPlaceholder: 'e.g. OpenAI',
      namePlaceholder: 'e.g. My Model',
      iconPlaceholder: 'e.g. AI',
    };
    return locale === 'zh' ? zh : en;
  }, [locale]);

  useEffect(() => {
    if (!open) return;
    setKeys(loadModelKeys());
    setCustomModels(loadCustomAssistants());
    setCustomInput(DEFAULT_CUSTOM_INPUT);
    setError(null);
  }, [open]);

  const providerOptions = useMemo(() => {
    const labels = new Map<string, string>();
    PROVIDER_OPTIONS.forEach((p) => labels.set(normalizeProvider(p.id), p.label));
    customModels.forEach((m) => labels.set(normalizeProvider(m.provider), m.provider));
    Object.keys(keys).forEach((p) => labels.set(normalizeProvider(p), labels.get(normalizeProvider(p)) || p));
    return Array.from(labels.entries()).map(([id, label]) => ({ id, label }));
  }, [customModels, keys]);

  const handleSave = () => {
    saveModelKeys(keys);
    replaceCustomAssistants(customModels);
    onSaved?.();
    onClose();
  };

  const handleAddCustom = () => {
    if (!customInput.name.trim() || !customInput.model.trim() || !customInput.provider.trim()) {
      setError(uiText.required);
      return;
    }
    const created = buildCustomAssistant({
      name: customInput.name,
      model: customInput.model,
      provider: customInput.provider,
      type: customInput.type as TeamAssistantType,
      role: customInput.role,
      summary: customInput.summary,
      iconText: customInput.iconText,
    });
    if (customInput.apiKey.trim()) {
      setKeys((prev) => ({
        ...prev,
        [normalizeProvider(customInput.provider)]: customInput.apiKey.trim(),
      }));
    }
    if (created) {
      setCustomModels((prev) => [created, ...prev]);
      setCustomInput(DEFAULT_CUSTOM_INPUT);
      setError(null);
    } else {
      setError(uiText.required);
    }
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
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{uiText.keySection}</h4>
            <p className="mt-1 text-xs text-gray-400">{uiText.keyHint}</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {providerOptions.map((provider) => (
                <label key={provider.id} className="text-xs font-semibold text-gray-500">
                  {provider.label}
                  <input
                    type="password"
                    value={keys[provider.id] || ''}
                    onChange={(e) =>
                      setKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none"
                    placeholder={uiText.keyPlaceholder}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-900">{uiText.customSection}</h4>
            <p className="mt-1 text-xs text-gray-400">{uiText.customHint}</p>

            <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-gray-500">
                {uiText.customName}
                <input
                  value={customInput.name}
                  onChange={(e) => setCustomInput((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none"
                  placeholder={uiText.namePlaceholder}
                />
              </label>
              <label className="text-xs font-semibold text-gray-500">
                {uiText.customProvider}
                <input
                  list="provider-options"
                  value={customInput.provider}
                  onChange={(e) => setCustomInput((prev) => ({ ...prev, provider: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none"
                  placeholder={uiText.providerPlaceholder}
                />
                <datalist id="provider-options">
                  {PROVIDER_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} />
                  ))}
                </datalist>
              </label>
              <label className="text-xs font-semibold text-gray-500">
                {uiText.customModel}
                <input
                  value={customInput.model}
                  onChange={(e) => setCustomInput((prev) => ({ ...prev, model: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none"
                  placeholder={uiText.modelPlaceholder}
                />
              </label>
              <label className="text-xs font-semibold text-gray-500">
                {uiText.customType}
                <select
                  value={customInput.type}
                  onChange={(e) =>
                    setCustomInput((prev) => ({ ...prev, type: e.target.value as TeamAssistantType }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none"
                >
                  <option value="chat">{uiText.typeChat}</option>
                  <option value="embedding">{uiText.typeEmbedding}</option>
                  <option value="rerank">{uiText.typeRerank}</option>
                  <option value="tool">{uiText.typeTool}</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-gray-500">
                {uiText.customRole}
                <input
                  value={customInput.role}
                  onChange={(e) => setCustomInput((prev) => ({ ...prev, role: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none"
                  placeholder={uiText.rolePlaceholder}
                />
              </label>
              <label className="text-xs font-semibold text-gray-500">
                {uiText.customSummary}
                <input
                  value={customInput.summary}
                  onChange={(e) => setCustomInput((prev) => ({ ...prev, summary: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none"
                  placeholder={uiText.summaryPlaceholder}
                />
              </label>
              <label className="text-xs font-semibold text-gray-500">
                {uiText.customIcon}
                <input
                  value={customInput.iconText}
                  onChange={(e) => setCustomInput((prev) => ({ ...prev, iconText: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none"
                  placeholder={uiText.iconPlaceholder}
                />
              </label>
              <label className="text-xs font-semibold text-gray-500">
                {uiText.customKey}
                <input
                  type="password"
                  value={customInput.apiKey}
                  onChange={(e) => setCustomInput((prev) => ({ ...prev, apiKey: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none"
                  placeholder={uiText.keyPlaceholder}
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddCustom}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-purple-600 px-4 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  <Plus size={16} />
                  {uiText.addCustom}
                </button>
              </div>
            </div>

            {customModels.length > 0 && (
              <div className="mt-4 space-y-2">
                {customModels.map((model) => (
                  <div
                    key={model.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm text-gray-600"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{model.name}</p>
                      <p className="text-xs text-gray-400">
                        {model.provider} - {model.model}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCustomModels((prev) => prev.filter((item) => item.id !== model.id))
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                      {uiText.remove}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
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
    </div>
  );
}
