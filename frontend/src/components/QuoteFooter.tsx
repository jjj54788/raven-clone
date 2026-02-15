'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
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

const themes = [
  {
    id: 'violet-night',
    backgroundImage: [
      'radial-gradient(900px 260px at 20% 10%, rgba(168, 85, 247, 0.55), transparent 60%)',
      'radial-gradient(700px 220px at 80% 30%, rgba(59, 130, 246, 0.40), transparent 55%)',
      'linear-gradient(110deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.92), rgba(17, 24, 39, 0.95))',
    ].join(', '),
  },
  {
    id: 'ember-dawn',
    backgroundImage: [
      'radial-gradient(900px 260px at 25% 20%, rgba(251, 113, 133, 0.45), transparent 62%)',
      'radial-gradient(700px 220px at 75% 25%, rgba(245, 158, 11, 0.40), transparent 58%)',
      'linear-gradient(115deg, rgba(24, 24, 27, 0.95), rgba(30, 41, 59, 0.92), rgba(24, 24, 27, 0.95))',
    ].join(', '),
  },
  {
    id: 'emerald-ink',
    backgroundImage: [
      'radial-gradient(900px 260px at 15% 25%, rgba(34, 197, 94, 0.40), transparent 62%)',
      'radial-gradient(700px 220px at 85% 30%, rgba(14, 165, 233, 0.35), transparent 58%)',
      'linear-gradient(120deg, rgba(2, 6, 23, 0.95), rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.95))',
    ].join(', '),
  },
  {
    id: 'golden-hour',
    backgroundImage: [
      'radial-gradient(900px 260px at 20% 10%, rgba(245, 158, 11, 0.45), transparent 62%)',
      'radial-gradient(700px 220px at 80% 30%, rgba(236, 72, 153, 0.25), transparent 58%)',
      'linear-gradient(115deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.92), rgba(17, 24, 39, 0.95))',
    ].join(', '),
  },
  {
    id: 'arctic-glow',
    backgroundImage: [
      'radial-gradient(900px 260px at 20% 20%, rgba(56, 189, 248, 0.45), transparent 62%)',
      'radial-gradient(700px 220px at 80% 15%, rgba(129, 140, 248, 0.35), transparent 58%)',
      'linear-gradient(120deg, rgba(3, 7, 18, 0.95), rgba(15, 23, 42, 0.92), rgba(3, 7, 18, 0.95))',
    ].join(', '),
  },
] as const;

const STORAGE_KEY = 'raven_quote_paused';
const ROTATE_MS = 12000;
const FADE_MS = 280;

function pickNextIndex(prev: number, len: number): number {
  if (len <= 1) return prev;
  let next = Math.floor(Math.random() * len);
  if (next === prev) next = (prev + 1) % len;
  return next;
}

export default function QuoteFooter() {
  const { locale } = useLanguage();

  const [index, setIndex] = useState(() => Math.floor(Math.random() * quotes.length));
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const [manualPaused, setManualPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const fadeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      setManualPaused(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {}
  }, []);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;

    const update = () => setReduceMotion(!!mq.matches);
    update();

    // Safari < 14 fallback.
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }

    // eslint-disable-next-line deprecation/deprecation
    mq.addListener(update);
    // eslint-disable-next-line deprecation/deprecation
    return () => mq.removeListener(update);
  }, []);

  const paused = manualPaused || hoverPaused || reduceMotion;

  useEffect(() => {
    if (paused) setPhase('in');
  }, [paused]);

  useEffect(() => {
    if (paused) return;

    const intervalId = window.setInterval(() => {
      setPhase('out');
      if (fadeTimeoutRef.current) window.clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = window.setTimeout(() => {
        setIndex((prev) => pickNextIndex(prev, quotes.length));
        setPhase('in');
      }, FADE_MS);
    }, ROTATE_MS);

    return () => {
      window.clearInterval(intervalId);
      if (fadeTimeoutRef.current) window.clearTimeout(fadeTimeoutRef.current);
    };
  }, [paused]);

  const quote = quotes[index];
  const theme = themes[index % themes.length];

  const primaryText = locale === 'zh' ? quote.zh : quote.en;
  const secondaryText = locale === 'zh' ? quote.en : quote.zh;

  const authorLine = useMemo(() => {
    const a = quote.author?.trim();
    const azh = quote.authorZh?.trim();
    if (!a) return azh || '';
    if (!azh) return a;
    return locale === 'zh' ? `${azh}  ${a}` : `${a}  ${azh}`;
  }, [locale, quote.author, quote.authorZh]);

  const togglePaused = () => {
    setManualPaused((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  return (
    <div className="px-4 pb-4 sm:px-6 sm:pb-6">
      <div
        className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 shadow-[0_14px_40px_rgba(0,0,0,0.18)]"
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
      >
        {/* Background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: theme.backgroundImage,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Readability overlay */}
        <div className="absolute inset-0 bg-black/35" />
        {/* Subtle texture */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.12) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.12) 75%, transparent 75%)',
            backgroundSize: '18px 18px',
          }}
        />

        <div className="relative px-5 py-5 sm:px-8 sm:py-6">
          <button
            type="button"
            onClick={togglePaused}
            className="absolute left-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/15 hover:text-white"
            title={locale === 'zh' ? (paused ? '继续轮播名言' : '暂停轮播名言') : (paused ? 'Resume rotating quotes' : 'Pause rotating quotes')}
            aria-label={locale === 'zh' ? (paused ? '继续' : '暂停') : (paused ? 'Resume' : 'Pause')}
          >
            {paused ? <Play size={16} className="translate-x-[1px]" /> : <Pause size={16} />}
          </button>

          <div
            className={[
              'transition-[opacity,transform,filter] duration-500 motion-reduce:transition-none',
              phase === 'out' ? 'opacity-0 translate-y-1 blur-[1px]' : 'opacity-100 translate-y-0 blur-0',
            ].join(' ')}
          >
            <div className="flex items-start gap-4 sm:gap-6">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white/55 mb-2">&ldquo;</p>
                <p className="text-sm sm:text-[15px] font-medium text-white/95 leading-relaxed">
                  {primaryText}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-white/70 italic">
                  {secondaryText}
                </p>
              </div>

              <div className="shrink-0 text-right text-xs text-white/70">
                <p className="whitespace-nowrap">
                  — {authorLine}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom edge fade to match page bg */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-[#FAFAFA]" />
      </div>
    </div>
  );
}
