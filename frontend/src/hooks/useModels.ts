'use client';

import { useState, useEffect } from 'react';
import { getModels as fetchModels } from '@/lib/api';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
}

export function useModels(authReady: boolean) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);

  useEffect(() => {
    if (!authReady) return;
    fetchModels()
      .then((data: AIModel[]) => {
        setModels(data);
        if (data.length > 0) setSelectedModel(data[0]);
      })
      .catch(console.error);
  }, [authReady]);

  return { models, selectedModel, setSelectedModel };
}
