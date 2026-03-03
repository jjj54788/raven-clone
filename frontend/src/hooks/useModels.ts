'use client';

import { useState, useEffect } from 'react';
import { getModels as fetchModels } from '@/lib/api';
import { getModelKey, loadUserModels } from '@/lib/teams';

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
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'Groq' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', provider: 'Groq' },
  { id: 'qwen-plus', name: 'Qwen Plus', provider: 'Qwen' },
  { id: 'qwen-turbo', name: 'Qwen Turbo', provider: 'Qwen' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'Anthropic' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'Anthropic' },
];

function resolveLocalModels(): AIModel[] {
  // Hardcoded fallbacks for known providers that have keys
  const providersWithKeys = new Set<string>();
  ['OpenAI', 'DeepSeek', 'Google', 'Groq', 'Qwen', 'Anthropic', 'xAI (Grok)', 'Cohere', 'Zhipu', 'Moonshot', 'Yi', 'StepFun', 'Doubao'].forEach((provider) => {
    if (getModelKey(provider)) providersWithKeys.add(provider);
  });
  const fallback = FALLBACK_MODELS.filter((m) => providersWithKeys.has(m.provider));

  // User-defined custom models — include only if provider has a key
  const userModels = loadUserModels().filter((m) => getModelKey(m.provider));

  // Deduplicate by id (fallback first, then user models)
  const merged = [...fallback];
  for (const um of userModels) {
    if (!merged.some((m) => m.id === um.id)) {
      merged.push(um);
    }
  }
  return merged;
}

export function useModels(authReady: boolean) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);

  useEffect(() => {
    if (!authReady) return;
    fetchModels()
      .then((data: AIModel[]) => {
        const fallback = resolveLocalModels();
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
        const fallback = resolveLocalModels();
        if (fallback.length > 0) {
          setModels(fallback);
          setSelectedModel(fallback[0]);
        }
      });
  }, [authReady]);

  return { models, selectedModel, setSelectedModel };
}
