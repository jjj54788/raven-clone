'use client';

import ChatInput from './ChatInput';
import QuoteFooter from './QuoteFooter';
import type { AIModel } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';

interface WelcomeScreenProps {
  userName: string;
  onSend: (message: string, options?: { webSearch?: boolean }) => void;
  loading: boolean;
  selectedModel: AIModel | null;
  models: AIModel[];
  onSelectModel: (model: AIModel) => void;
  quotedText?: string;
  onClearQuote?: () => void;
}

export default function WelcomeScreen({
  userName, onSend, loading, selectedModel, models, onSelectModel, quotedText, onClearQuote,
}: WelcomeScreenProps) {
  const { t } = useLanguage();

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
          loading={loading}
          selectedModel={selectedModel}
          models={models}
          onSelectModel={onSelectModel}
          quotedText={quotedText}
          onClearQuote={onClearQuote}
        />
      </div>
      <QuoteFooter />
    </div>
  );
}
