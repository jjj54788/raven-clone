'use client';

import { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import type { Message, AIModel } from '@/hooks';

interface ChatAreaProps {
  messages: Message[];
  loading: boolean;
  streamingMessageId?: string | null;
  onSend: (message: string, options?: { webSearch?: boolean }) => void;
  selectedModel: AIModel | null;
  models: AIModel[];
  onSelectModel: (model: AIModel) => void;
  quotedText?: string;
  onClearQuote?: () => void;
  onQuote?: (content: string) => void;
}

export default function ChatArea({
  messages, loading, streamingMessageId, onSend, selectedModel, models, onSelectModel,
  quotedText, onClearQuote, onQuote,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messages.length > 0 ? messages[messages.length - 1].content : '']);

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              model={msg.role === 'assistant' ? (msg.model || selectedModel?.name) : undefined}
              provider={msg.role === 'assistant' ? (msg.provider || selectedModel?.provider) : undefined}
              isStreaming={msg.id === streamingMessageId}
              onQuote={msg.role === 'assistant' ? onQuote : undefined}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="border-t border-gray-100 bg-white px-4 py-4">
        <ChatInput
          onSend={onSend}
          loading={loading}
          selectedModel={selectedModel}
          models={models}
          onSelectModel={onSelectModel}
          quotedText={quotedText}
          onClearQuote={onClearQuote}
        />
      </div>
    </>
  );
}
