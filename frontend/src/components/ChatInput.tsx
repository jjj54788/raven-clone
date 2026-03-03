'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Globe, BookOpen, Wrench, ArrowUp, ChevronDown, Square, Blend,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface AIModel {
  id: string;
  name: string;
  provider: string;
}

interface ChatInputProps {
  onSend: (message: string, options?: { webSearch?: boolean; mixMode?: boolean }) => void;
  onStop?: () => void;
  loading: boolean;
  selectedModel: AIModel | null;
  models: AIModel[];
  onSelectModel: (model: AIModel) => void;
  quotedText?: string;
  onClearQuote?: () => void;
  mixMode?: boolean;
  onMixModeChange?: (enabled: boolean) => void;
}

function getProviderIcon(provider: string): string {
  switch (provider) {
    case 'OpenAI': return '🟢';
    case 'DeepSeek': return '🔵';
    case 'Google': return '💎';
    case 'Groq': return '⚡';
    case 'Qwen': return '🟠';
    case 'Anthropic': return '🟤';
    default: return '🟣';
  }
}

export { getProviderIcon };

export default function ChatInput({ onSend, onStop, loading, selectedModel, models, onSelectModel, quotedText, onClearQuote, mixMode, onMixModeChange }: ChatInputProps) {
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
    onSend(input.trim(), { webSearch, mixMode });
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
      <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_2px_14px_rgba(0,0,0,0.06)] transition-all duration-200 focus-within:shadow-[0_4px_24px_rgba(0,0,0,0.10)] focus-within:border-gray-300 focus-within:ring-[3px] focus-within:ring-purple-500/[0.07]">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.askAnything')}
          rows={1}
          className="w-full resize-none rounded-t-2xl px-5 pt-4 pb-2 text-gray-800 placeholder-gray-400 focus:outline-none"
          style={{ minHeight: '52px', maxHeight: '200px' }}
        />
        <div className="flex items-center justify-between px-3 pb-2.5 pt-0">
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
                <div className="modal-in absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-gray-200/60 bg-white/95 backdrop-blur-xl py-1 shadow-2xl shadow-black/10 z-50">
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

            {/* Mix Mode */}
            {models.length >= 2 && (
              <button
                onClick={() => onMixModeChange?.(!mixMode)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                  mixMode ? 'bg-amber-50 text-amber-700' : 'text-gray-500 hover:bg-gray-50'
                }`}
                title={t('chat.mixMode')}
              >
                <Blend size={14} />
                <span>Mix</span>
              </button>
            )}

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
