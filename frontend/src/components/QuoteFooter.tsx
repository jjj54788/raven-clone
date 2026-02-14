'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';

const quotes = [
  {
    en: 'In the middle of difficulty lies opportunity.',
    zh: '困难之中蕴藏着机遇。',
    author: 'Albert Einstein',
    authorZh: '阿尔伯特·爱因斯坦',
  },
  {
    en: 'Do the right thing at the right time.',
    zh: '在正确的时间做正确的事。',
    author: 'Peter Drucker',
    authorZh: '彼得·德鲁克',
  },
  {
    en: 'The best way to predict the future is to create it.',
    zh: '预测未来的最好方式就是创造它。',
    author: 'Abraham Lincoln',
    authorZh: '亚伯拉罕·林肯',
  },
  {
    en: 'Innovation distinguishes between a leader and a follower.',
    zh: '创新是区分领导者和追随者的标准。',
    author: 'Steve Jobs',
    authorZh: '史蒂夫·乔布斯',
  },
  {
    en: 'The only way to do great work is to love what you do.',
    zh: '成就伟大事业的唯一途径是热爱你所做的事。',
    author: 'Steve Jobs',
    authorZh: '史蒂夫·乔布斯',
  },
  {
    en: 'Stay hungry, stay foolish.',
    zh: '求知若饥，虚心若愚。',
    author: 'Stewart Brand',
    authorZh: '斯图尔特·布兰德',
  },
  {
    en: 'Knowledge is power.',
    zh: '知识就是力量。',
    author: 'Francis Bacon',
    authorZh: '弗朗西斯·培根',
  },
  {
    en: 'The unexamined life is not worth living.',
    zh: '未经审视的人生不值得过。',
    author: 'Socrates',
    authorZh: '苏格拉底',
  },
];

export default function QuoteFooter() {
  const { locale } = useLanguage();

  const quote = useMemo(() => {
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, []);

  const primaryText = locale === 'zh' ? quote.zh : quote.en;
  const secondaryText = locale === 'zh' ? quote.en : quote.zh;

  return (
    <div className="relative overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-700/90 via-violet-600/85 to-purple-700/90" />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative px-8 py-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs text-purple-200 mb-2">&ldquo;</p>
          <p className="text-sm font-medium text-white leading-relaxed">
            {primaryText}
          </p>
          <p className="mt-1 text-sm text-purple-200">
            {secondaryText}
          </p>
          <p className="mt-3 text-right text-xs text-purple-300">
            —— {quote.author} {quote.authorZh}
          </p>
        </div>
      </div>
    </div>
  );
}
