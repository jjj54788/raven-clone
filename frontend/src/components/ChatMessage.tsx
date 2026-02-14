'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Quote, Check } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  provider?: string;
  isStreaming?: boolean;
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
    case 'openai': return '🟢';
    case 'deepseek': return '🔵';
    case 'google': return '💎';
    default: return '🟣';
  }
}

export default function ChatMessage({ role, content, model, provider, isStreaming }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] rounded-2xl bg-purple-600 px-4 py-3 text-white">
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
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
      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm border border-gray-100">
        <div className="prose prose-sm max-w-none text-gray-800">
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
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <Quote size={12} />
            Quote
          </button>
        </div>
      )}
    </div>
  );
}
