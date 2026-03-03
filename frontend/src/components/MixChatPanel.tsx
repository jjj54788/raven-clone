'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Blend, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { MixModelAnswer } from '@/hooks';
import { getProviderIcon } from './ChatInput';
import { useLanguage } from '@/i18n/LanguageContext';

interface MixChatPanelProps {
  results: MixModelAnswer[];
  synthesis: string | null;
  isLoading?: boolean;
}

export default function MixChatPanel({ results, synthesis, isLoading }: MixChatPanelProps) {
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const { locale } = useLanguage();

  const successResults = results.filter(r => !r.error && r.content);
  const failedResults = results.filter(r => r.error);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Blend size={16} className="text-amber-600" />
        <span className="font-semibold text-gray-700">
          {locale === 'zh' ? `Mix 模式 — ${results.length} 个模型并行回答` : `Mix Mode — ${results.length} models compared`}
        </span>
        {isLoading && !synthesis && <Loader2 size={14} className="animate-spin text-purple-500" />}
      </div>

      {/* Model answer cards — grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {successResults.map((r) => {
          const isExpanded = expandedModel === r.modelId;
          const preview = r.content.slice(0, 200);
          const needsTruncation = r.content.length > 200;

          return (
            <div
              key={r.modelId}
              className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
                <span className="text-sm">{getProviderIcon(r.provider)}</span>
                <span className="text-sm font-semibold text-gray-800">{r.modelName}</span>
                <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                  {r.provider}
                </span>
              </div>

              {/* Card body */}
              <div className="px-3 py-2 text-sm text-gray-700">
                {isExpanded ? (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:mt-2 prose-headings:mb-1">
                    <ReactMarkdown>{r.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-gray-600">
                    {preview}{needsTruncation ? '…' : ''}
                  </p>
                )}
              </div>

              {/* Expand/Collapse */}
              {needsTruncation && (
                <button
                  type="button"
                  onClick={() => setExpandedModel(isExpanded ? null : r.modelId)}
                  className="flex w-full items-center justify-center gap-1 border-t border-gray-100 py-1.5 text-xs text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  {isExpanded ? (
                    <><ChevronUp size={12} />{locale === 'zh' ? '收起' : 'Collapse'}</>
                  ) : (
                    <><ChevronDown size={12} />{locale === 'zh' ? '展开全文' : 'Show full answer'}</>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Failed models */}
      {failedResults.length > 0 && (
        <div className="space-y-1">
          {failedResults.map((r) => (
            <div key={r.modelId} className="flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-600">
              <span>{getProviderIcon(r.provider)}</span>
              <span className="font-medium">{r.modelName}</span>
              <span className="text-rose-400">— {r.error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Synthesis */}
      {synthesis && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Blend size={14} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">
              {locale === 'zh' ? '综合分析' : 'Synthesis'}
            </span>
          </div>
          <div className="prose prose-sm max-w-none text-gray-800 prose-p:my-1 prose-headings:mt-3 prose-headings:mb-1">
            <ReactMarkdown>{synthesis}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Loading synthesis */}
      {isLoading && !synthesis && successResults.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/30 px-4 py-3 text-sm text-amber-700">
          <Loader2 size={14} className="animate-spin" />
          {locale === 'zh' ? '正在综合分析各模型回答…' : 'Synthesizing answers from all models…'}
        </div>
      )}
    </div>
  );
}
