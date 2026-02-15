'use client';

import { useState, useEffect } from 'react';
import { getModels as fetchModels } from '@/lib/api';
import { getModelKey } from '@/lib/teams';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
}

const FALLBACK_MODELS: AIModel[] = [
  { id: 'gpt-4.1-mini', name: 'GPT 4.1 Mini', provider: 'OpenAI' },
  { id: 'gpt-4.1-nano', name: 'GPT 4.1 Nano', provider: 'OpenAI' },
  { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek' },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'DeepSeek' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
];

function resolveFallbackModels(): AIModel[] {
  const providersWithKeys = new Set<string>();
  ['OpenAI', 'DeepSeek', 'Google'].forEach((provider) => {
    if (getModelKey(provider)) providersWithKeys.add(provider);
  });
  if (providersWithKeys.size === 0) return [];
  return FALLBACK_MODELS.filter((model) => providersWithKeys.has(model.provider));
}

export function useModels(authReady: boolean) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);

  useEffect(() => {
    if (!authReady) return;
    fetchModels()
      .then((data: AIModel[]) => {
        const fallback = resolveFallbackModels();
        const merged = [...(Array.isArray(data) ? data : [])];
        fallback.forEach((item) => {
          if (!merged.some((model) => model.id === item.id)) {
            merged.push(item);
          }
        });
        setModels(merged);
        if (merged.length > 0) setSelectedModel(merged[0]);
      })
      .catch((err) => {
        console.error(err);
        const fallback = resolveFallbackModels();
        if (fallback.length > 0) {
          setModels(fallback);
          setSelectedModel(fallback[0]);
        }
      });
  }, [authReady]);

  return { models, selectedModel, setSelectedModel };
}
