'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Quote, Check } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useChatAppearance } from '@/hooks';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  provider?: string;
  isStreaming?: boolean;
  onQuote?: (content: string) => void;
}

/** Map provider name to a color class */
function providerColor(provider?: string): string {
  switch (provider?.toLowerCase()) {
    case 'openai': return 'text-green-600';
    case 'deepseek': return 'text-blue-600';
    case 'google': return 'text-yellow-600';
    default: return 'text-purple-600';
  }
}

function providerIcon(provider?: string): string {
  switch (provider?.toLowerCase()) {
    case 'openai': return '\u{1F7E2}';
    case 'deepseek': return '\u{1F535}';
    case 'google': return '\u{1F48E}';
    default: return '\u{1F7E3}';
  }
}

export default function ChatMessage({ role, content, model, provider, isStreaming, onQuote }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();
  const { userBubbleClass, aiBubbleClass } = useChatAppearance();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${userBubbleClass}`}>
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  if (!isStreaming && !content.trim()) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 max-w-[85%]">
      {/* Model identifier */}
      {model && (
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-sm">{providerIcon(provider)}</span>
          <span className={`text-xs font-medium ${providerColor(provider)}`}>
            {model}
          </span>
        </div>
      )}

      {/* Message body */}
      <div className={`rounded-2xl px-4 py-3 shadow-sm ${aiBubbleClass}`}>
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-purple-500 animate-pulse rounded-sm" />
          )}
        </div>
      </div>

      {/* Action buttons */}
      {!isStreaming && content && (
        <div className="flex items-center gap-2 px-1 mt-0.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? t('chat.copied') : t('chat.copy')}
          </button>
          <button
            onClick={() => onQuote?.(content)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <Quote size={12} />
            {t('chat.quote')}
          </button>
        </div>
      )}
    </div>
  );
}
