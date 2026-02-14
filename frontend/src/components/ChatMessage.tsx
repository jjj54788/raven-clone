'use client';

import ReactMarkdown from 'react-markdown';
import { User } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[70%] rounded-2xl bg-purple-600 px-4 py-3 text-white">
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100">
          <User size={16} className="text-purple-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
        <span className="text-xs text-white font-bold">AI</span>
      </div>
      <div className="max-w-[80%] rounded-2xl bg-white px-4 py-3 shadow-sm border border-gray-100">
        <div className="prose prose-sm max-w-none text-gray-800">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
