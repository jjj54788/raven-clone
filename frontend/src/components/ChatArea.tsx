'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import MixChatPanel from './MixChatPanel';
import type { Message, AIModel } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';

interface ChatAreaProps {
  messages: Message[];
  loading: boolean;
  streamingMessageId?: string | null;
  onSend: (message: string, options?: { webSearch?: boolean; mixMode?: boolean }) => void;
  onStop?: () => void;
  selectedModel: AIModel | null;
  models: AIModel[];
  onSelectModel: (model: AIModel) => void;
  quotedText?: string;
  onClearQuote?: () => void;
  onQuote?: (content: string) => void;
  mixMode?: boolean;
  onMixModeChange?: (enabled: boolean) => void;
}

const STICKY_THRESHOLD_PX = 120;

export default function ChatArea({
  messages, loading, streamingMessageId, onSend, onStop, selectedModel, models, onSelectModel,
  quotedText, onClearQuote, onQuote, mixMode, onMixModeChange,
}: ChatAreaProps) {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  const updateStickiness = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStickToBottom(distanceToBottom < STICKY_THRESHOLD_PX);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const requestScrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (scrollRafRef.current != null) return;
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      scrollToBottom(behavior);
    });
  }, [scrollToBottom]);

  useEffect(() => {
    if (!stickToBottom) return;
    requestScrollToBottom('auto');
  }, [messages, stickToBottom, requestScrollToBottom]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current != null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={updateStickiness}
          className="h-full overflow-y-auto px-4 py-6"
        >
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((msg, idx) => {
              const precedingUserMsg =
                msg.role === 'assistant'
                  ? messages.slice(0, idx).findLast((m) => m.role === 'user')
                  : undefined;

              // Render mix chat results with special panel
              if (msg.role === 'assistant' && msg.mixResults && msg.mixResults.length > 0) {
                return (
                  <MixChatPanel
                    key={msg.id}
                    results={msg.mixResults}
                    synthesis={msg.mixSynthesis || null}
                    isLoading={msg.id === streamingMessageId}
                  />
                );
              }

              return (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  model={msg.role === 'assistant' ? (msg.model || selectedModel?.name) : undefined}
                  provider={msg.role === 'assistant' ? (msg.provider || selectedModel?.provider) : undefined}
                  isStreaming={msg.id === streamingMessageId}
                  onQuote={msg.role === 'assistant' ? onQuote : undefined}
                  userQuestion={precedingUserMsg?.content}
                />
              );
            })}
          </div>
        </div>

        {!stickToBottom && messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              scrollToBottom('smooth');
              setStickToBottom(true);
            }}
            className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/90 px-3 py-2 text-xs text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-white"
            title={t('chat.scrollToBottom')}
            aria-label={t('chat.scrollToBottom')}
          >
            <ArrowDown size={14} />
            <span>{t('chat.scrollToBottom')}</span>
          </button>
        )}
      </div>
      <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-4">
        <ChatInput
          onSend={onSend}
          onStop={onStop}
          loading={loading}
          selectedModel={selectedModel}
          models={models}
          onSelectModel={onSelectModel}
          quotedText={quotedText}
          onClearQuote={onClearQuote}
          mixMode={mixMode}
          onMixModeChange={onMixModeChange}
        />
      </div>
    </div>
  );
}
