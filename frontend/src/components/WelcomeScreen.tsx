'use client';

import ChatInput from './ChatInput';
import QuoteFooter from './QuoteFooter';
import type { AIModel } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';

interface WelcomeScreenProps {
  userName: string;
  onSend: (message: string, options?: { webSearch?: boolean }) => void;
  onStop?: () => void;
  loading: boolean;
  selectedModel: AIModel | null;
  models: AIModel[];
  onSelectModel: (model: AIModel) => void;
  quotedText?: string;
  onClearQuote?: () => void;
}

const PROMPTS_ZH = [
  { icon: '📊', label: '分析数据', prompt: '帮我分析以下数据，并给出关键洞察：' },
  { icon: '✍️', label: '帮我写作', prompt: '帮我写一封专业的商务邮件，主题是：' },
  { icon: '🔍', label: '深度研究', prompt: '深入研究以下主题，列出核心观点和最新进展：' },
  { icon: '💡', label: '头脑风暴', prompt: '围绕以下话题帮我头脑风暴出10个创意想法：' },
];

const PROMPTS_EN = [
  { icon: '📊', label: 'Analyze data', prompt: 'Help me analyze this data and surface key insights:' },
  { icon: '✍️', label: 'Help me write', prompt: 'Help me write a professional email about:' },
  { icon: '🔍', label: 'Deep research', prompt: 'Do a deep dive on this topic and list the core ideas:' },
  { icon: '💡', label: 'Brainstorm', prompt: 'Help me brainstorm 10 creative ideas around:' },
];

export default function WelcomeScreen({
  userName, onSend, onStop, loading, selectedModel, models, onSelectModel, quotedText, onClearQuote,
}: WelcomeScreenProps) {
  const { t, locale } = useLanguage();
  const prompts = locale === 'zh' ? PROMPTS_ZH : PROMPTS_EN;

  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return t('welcome.goodMorning');
    if (hour < 18) return t('welcome.goodAfternoon');
    return t('welcome.goodEvening');
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <h1 className="mb-8 text-4xl font-light text-gray-800">
          <span className="bg-gradient-to-r from-purple-500 to-violet-500 bg-clip-text text-transparent font-normal">
            {getGreeting()}
          </span>
          , {userName}
        </h1>

        <ChatInput
          onSend={onSend}
          onStop={onStop}
          loading={loading}
          selectedModel={selectedModel}
          models={models}
          onSelectModel={onSelectModel}
          quotedText={quotedText}
          onClearQuote={onClearQuote}
        />

        {/* Suggested prompt chips */}
        <div className="mt-4 grid w-full max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
          {prompts.map(({ icon, label, prompt }) => (
            <button
              key={label}
              type="button"
              onClick={() => onSend(prompt)}
              disabled={loading}
              className="flex flex-col items-start gap-1 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md disabled:opacity-50"
            >
              <span className="text-lg leading-none">{icon}</span>
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </button>
          ))}
        </div>
      </div>
      <QuoteFooter />
    </div>
  );
}
