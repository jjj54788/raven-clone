'use client';

import { useState } from 'react';
import {
  Globe,
  BookOpen,
  Wrench,
  ArrowUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  loading: boolean;
}

export default function ChatInput({ onSend, loading }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [webSearch, setWebSearch] = useState(false);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow focus-within:shadow-md focus-within:border-gray-300">
        {/* 输入区 */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          rows={1}
          className="w-full resize-none rounded-t-2xl px-5 py-4 text-gray-800 placeholder-gray-400 focus:outline-none"
          style={{ minHeight: '52px', maxHeight: '200px' }}
        />

        {/* 工具栏 */}
        <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
          <div className="flex items-center gap-1">
            {/* 模型选择 */}
            <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
              <Sparkles size={14} className="text-green-500" />
              <span>ChatGPT (GPT 5.1)</span>
              <ChevronDown size={12} className="text-gray-400" />
            </button>

            {/* Web Search */}
            <button
              onClick={() => setWebSearch(!webSearch)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                webSearch
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Globe size={14} />
              <span>Web Search</span>
            </button>

            {/* Knowledge */}
            <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
              <BookOpen size={14} />
              <span>Knowledge</span>
              <ChevronDown size={12} className="text-gray-400" />
            </button>

            {/* Tools */}
            <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
              <Wrench size={14} />
            </button>
          </div>

          {/* 发送按钮 */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white transition-all hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>

      {/* 提示文字 */}
      <p className="mt-2 text-center text-xs text-gray-400">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
