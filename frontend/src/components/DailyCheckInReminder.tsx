'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';

interface DailyCheckInReminderProps {
  collapsed: boolean;
  userName?: string;
}

function getTodayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTodayLabel(todayKey: string, locale: 'en' | 'zh'): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(todayKey)) {
    const [y, m, d] = todayKey.split('-');
    return locale === 'zh' ? `${y}年${m}月${d}日` : `${y}-${m}-${d}`;
  }
  return todayKey;
}

function PandaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
    >
      {/* ears */}
      <circle cx="36" cy="30" r="18" fill="#111827" />
      <circle cx="92" cy="30" r="18" fill="#111827" />

      {/* face */}
      <ellipse cx="64" cy="70" rx="50" ry="44" fill="#FFFFFF" stroke="#111827" strokeWidth="3" />

      {/* eye patches */}
      <ellipse cx="48" cy="64" rx="16" ry="20" fill="#111827" transform="rotate(-15 48 64)" />
      <ellipse cx="80" cy="64" rx="16" ry="20" fill="#111827" transform="rotate(15 80 64)" />

      {/* eyes */}
      <circle cx="46" cy="62" r="8" fill="#FFFFFF" opacity="0.95" />
      <circle cx="82" cy="62" r="8" fill="#FFFFFF" opacity="0.95" />
      <circle cx="48.5" cy="64" r="4.5" fill="#111827" />
      <circle cx="79.5" cy="64" r="4.5" fill="#111827" />
      <circle cx="46.8" cy="62.5" r="1.6" fill="#FFFFFF" />
      <circle cx="77.8" cy="62.5" r="1.6" fill="#FFFFFF" />

      {/* blush */}
      <circle cx="36" cy="80" r="9" fill="#FB7185" opacity="0.25" />
      <circle cx="92" cy="80" r="9" fill="#FB7185" opacity="0.25" />

      {/* nose + mouth */}
      <path
        d="M64 78c-6 0-10-4-10-8 0-6 4-10 10-10s10 4 10 10c0 4-4 8-10 8Z"
        fill="#111827"
      />
      <path
        d="M56 88c3.5 4.5 12.5 4.5 16 0"
        stroke="#111827"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function DailyCheckInReminder({ collapsed, userName }: DailyCheckInReminderProps) {
  const { t, locale } = useLanguage();

  const storageKey = useMemo(
    () => `raven_daily_checkin:${(userName || 'user').toLowerCase()}`,
    [userName],
  );

  const [checkedInToday, setCheckedInToday] = useState(false);
  const [todayKey, setTodayKey] = useState(() => getTodayKey());

  const todayLabel = useMemo(() => formatTodayLabel(todayKey, locale), [todayKey, locale]);

  useEffect(() => {
    const update = () => {
      const key = getTodayKey();
      setTodayKey(key);
      try {
        const last = localStorage.getItem(storageKey);
        setCheckedInToday(last === key);
      } catch {
        setCheckedInToday(false);
      }
    };

    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, [storageKey]);

  const handleCheckIn = () => {
    try {
      localStorage.setItem(storageKey, todayKey);
    } catch {
      // ignore
    }
    setCheckedInToday(true);
  };

  const tooltip = checkedInToday ? t('checkin.done') : `${t('checkin.reminder')} · ${todayLabel}`;

  if (collapsed) {
    return (
      <div className="flex justify-center py-2">
        <button
          type="button"
          onClick={!checkedInToday ? handleCheckIn : undefined}
          className={[
            'relative flex h-12 w-12 items-center justify-center rounded-xl border transition-colors',
            checkedInToday ? 'border-gray-100 bg-white' : 'border-amber-200 bg-amber-50 hover:bg-amber-100',
          ].join(' ')}
          title={tooltip}
          aria-label={tooltip}
        >
          {!checkedInToday && (
            <span className="absolute inset-2 rounded-full bg-amber-300/50 animate-ping" aria-hidden />
          )}
          <PandaIcon className={`h-10 w-10 drop-shadow-sm ${checkedInToday ? '' : 'animate-bounce'}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="px-2 pb-2">
      <div
        className={[
          'rounded-xl border p-3',
          checkedInToday ? 'border-gray-100 bg-white' : 'border-amber-200 bg-amber-50',
        ].join(' ')}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          {!checkedInToday && (
            <>
              <p className="text-xs font-medium text-amber-900/80">{todayLabel}</p>
              <p className="text-sm font-semibold text-amber-900">{t('checkin.reminder')}</p>
            </>
          )}
          <div className="relative h-12 w-12">
            {!checkedInToday && (
              <span className="absolute inset-0 rounded-full bg-amber-300/40 animate-ping" aria-hidden />
            )}
            <PandaIcon
              className={`absolute inset-0 h-12 w-12 drop-shadow-sm ${
                checkedInToday ? '' : 'animate-bounce'
              }`}
            />
          </div>
          {!checkedInToday && (
            <button
              type="button"
              onClick={handleCheckIn}
              className="mt-1 w-full rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 active:bg-amber-800"
            >
              {t('checkin.button')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

