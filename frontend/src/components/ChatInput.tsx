'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Globe, BookOpen, Wrench, ArrowUp, ChevronDown, Square,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface AIModel {
  id: string;
  name: string;
  provider: string;
}

interface ChatInputProps {
  onSend: (message: string, options?: { webSearch?: boolean }) => void;
  onStop?: () => void;
  loading: boolean;
  selectedModel: AIModel | null;
  models: AIModel[];
  onSelectModel: (model: AIModel) => void;
  quotedText?: string;
  onClearQuote?: () => void;
}

function getProviderIcon(provider: string): string {
  switch (provider) {
    case 'OpenAI': return '🟢';
    case 'DeepSeek': return '🔵';
    case 'Google': return '💎';
    default: return '🟣';
  }
}

export default function ChatInput({ onSend, onStop, loading, selectedModel, models, onSelectModel, quotedText, onClearQuote }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [webSearch, setWebSearch] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (quotedText) {
      const quoted = quotedText.split('\n').map(line => `> ${line}`).join('\n') + '\n\n';
      setInput(prev => quoted + prev);
      onClearQuote?.();
      textareaRef.current?.focus();
    }
  }, [quotedText, onClearQuote]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    onSend(input.trim(), { webSearch });
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
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.askAnything')}
          rows={1}
          className="w-full resize-none rounded-t-2xl px-5 py-4 text-gray-800 placeholder-gray-400 focus:outline-none"
          style={{ minHeight: '52px', maxHeight: '200px' }}
        />
        <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
          <div className="flex items-center gap-1">
            {/* Model Selector */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowModelMenu(!showModelMenu)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm">{selectedModel ? getProviderIcon(selectedModel.provider) : '🟣'}</span>
                <span className="font-medium">
                  {selectedModel ? `${selectedModel.name}` : t('chat.noModel')}
                </span>
                <ChevronDown size={12} className={`text-gray-400 transition-transform ${showModelMenu ? 'rotate-180' : ''}`} />
              </button>
              {showModelMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-gray-200 bg-white py-1 shadow-lg z-50">
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    {t('chat.chatModels')}
                  </p>
                  {models.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-gray-400 text-center">
                      {t('chat.noModels')}
                    </p>
                  ) : (
                    models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { onSelectModel(m); setShowModelMenu(false); }}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                          selectedModel?.id === m.id ? 'bg-purple-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-base">{getProviderIcon(m.provider)}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${selectedModel?.id === m.id ? 'text-purple-700' : 'text-gray-800'}`}>
                            {m.name}
                          </p>
                          <p className="text-[11px] text-gray-400">{m.provider}</p>
                        </div>
                        {selectedModel?.id === m.id && (
                          <span className="text-purple-500 text-sm">✓</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Web Search */}
            <button
              onClick={() => setWebSearch(!webSearch)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                webSearch ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Globe size={14} />
              <span>{t('chat.webSearch')}</span>
            </button>

            {/* Knowledge */}
            <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
              <BookOpen size={14} />
              <span>{t('chat.knowledgeLabel')}</span>
              <ChevronDown size={12} className="text-gray-400" />
            </button>

            {/* Tools */}
            <button
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
              title={t('chat.toolsComingSoon')}
            >
              <Wrench size={14} />
            </button>
          </div>

          {/* Send */}
          {loading ? (
            <button
              onClick={() => onStop?.()}
              disabled={!onStop}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-all hover:bg-gray-300 disabled:opacity-50 disabled:hover:bg-gray-200"
              title={t('chat.stopGenerating')}
              aria-label={t('chat.stopGenerating')}
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white transition-all hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400"
            >
              <ArrowUp size={16} />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-gray-400">
        {t('chat.sendHint')}
      </p>
    </div>
  );
}
