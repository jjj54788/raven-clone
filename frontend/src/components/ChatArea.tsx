'use client';

import { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import type { Message, AIModel } from '@/hooks';

interface ChatAreaProps {
  messages: Message[];
  loading: boolean;
  onSend: (message: string) => void;
  selectedModel: AIModel | null;
  models: AIModel[];
  onSelectModel: (model: AIModel) => void;
}

function LoadingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
        <span className="text-xs text-white">AI</span>
      </div>
      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm border border-gray-100">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full bg-purple-300" style={{ animationDelay: '0ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-purple-300" style={{ animationDelay: '150ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-purple-300" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export default function ChatArea({
  messages, loading, onSend, selectedModel, models, onSelectModel,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
          ))}
          {loading && <LoadingIndicator />}
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
        />
      </div>
    </>
  );
}
