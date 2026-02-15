'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface DailyCheckInReminderProps {
  collapsed: boolean;
  userName?: string;
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const CHECKIN_DAY_START_HOUR = 5;

function getTodayKey(date = new Date()): string {
  // Treat 00:00–04:59 as the previous day (day rolls over at 05:00 local time).
  const shifted = new Date(date.getTime() - CHECKIN_DAY_START_HOUR * 60 * 60 * 1000);
  const year = shifted.getFullYear();
  const month = String(shifted.getMonth() + 1).padStart(2, '0');
  const day = String(shifted.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTodayLabel(todayKey: string, locale: 'en' | 'zh'): string {
  if (DATE_KEY_RE.test(todayKey)) {
    const [y, m, d] = todayKey.split('-');
    return locale === 'zh' ? `${y}年${m}月${d}日` : `${y}-${m}-${d}`;
  }
  return todayKey;
}

function safeParseJson(value: string | null): unknown {
  if (value == null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeDateKeys(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const items = input.filter((x) => typeof x === 'string' && DATE_KEY_RE.test(x)) as string[];
  return Array.from(new Set(items)).sort();
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(month: Date, delta: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + delta, 1);
}

function formatMonthTitle(month: Date, locale: 'en' | 'zh'): string {
  try {
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(month);
  } catch {
    const y = month.getFullYear();
    const m = String(month.getMonth() + 1).padStart(2, '0');
    return locale === 'zh' ? `${y}年${m}月` : `${y}-${m}`;
  }
}

function formatMonthShort(month: Date, locale: 'en' | 'zh'): string {
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(month);
  } catch {
    return String(month.getMonth() + 1);
  }
}

function getWeekdayLabels(locale: 'en' | 'zh'): string[] {
  return locale === 'zh'
    ? ['一', '二', '三', '四', '五', '六', '日']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
}

function dateKeyFor(year: number, monthIndex: number, day: number): string {
  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

type MonthCell = { day: number; key: string } | null;

function buildMonthCells(month: Date): MonthCell[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const first = new Date(year, monthIndex, 1);
  // Convert JS Sunday=0..Saturday=6 to Monday=0..Sunday=6
  const offset = (first.getDay() + 6) % 7;

  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const dayNum = i - offset + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push(null);
      continue;
    }
    cells.push({ day: dayNum, key: dateKeyFor(year, monthIndex, dayNum) });
  }
  return cells;
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
      <circle cx="36" cy="30" r="18" fill="#111827" />
      <circle cx="92" cy="30" r="18" fill="#111827" />

      <ellipse cx="64" cy="70" rx="50" ry="44" fill="#FFFFFF" stroke="#111827" strokeWidth="3" />

      <ellipse cx="48" cy="64" rx="16" ry="20" fill="#111827" transform="rotate(-15 48 64)" />
      <ellipse cx="80" cy="64" rx="16" ry="20" fill="#111827" transform="rotate(15 80 64)" />

      <circle cx="46" cy="62" r="8" fill="#FFFFFF" opacity="0.95" />
      <circle cx="82" cy="62" r="8" fill="#FFFFFF" opacity="0.95" />
      <circle cx="48.5" cy="64" r="4.5" fill="#111827" />
      <circle cx="79.5" cy="64" r="4.5" fill="#111827" />
      <circle cx="46.8" cy="62.5" r="1.6" fill="#FFFFFF" />
      <circle cx="77.8" cy="62.5" r="1.6" fill="#FFFFFF" />

      <circle cx="36" cy="80" r="9" fill="#FB7185" opacity="0.25" />
      <circle cx="92" cy="80" r="9" fill="#FB7185" opacity="0.25" />

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

function MiniCalendarButton({
  month,
  checkedSet,
  todayKey,
  locale,
  onOpen,
  size = 'md',
}: {
  month: Date;
  checkedSet: Set<string>;
  todayKey: string;
  locale: 'en' | 'zh';
  onOpen: () => void;
  size?: 'xs' | 'sm' | 'md';
}) {
  const cells = useMemo(() => buildMonthCells(month), [month]);
  const isXs = size === 'xs';
  const isSm = size === 'sm';
  const showHeader = size === 'md';

  return (
    <button
      type="button"
      onClick={onOpen}
      className={[
        'flex flex-col overflow-hidden border border-gray-100 bg-white hover:bg-gray-50 transition-colors',
        !showHeader ? 'justify-center' : '',
        isXs ? 'h-[22px] w-16 rounded-lg' : isSm ? 'h-9 w-9 rounded-lg' : 'h-12 w-12 rounded-xl',
      ].join(' ')}
      title={locale === 'zh' ? '查看打卡日历' : 'Open check-in calendar'}
      aria-label={locale === 'zh' ? '查看打卡日历' : 'Open check-in calendar'}
    >
      {showHeader && (
        <div className={`flex items-center justify-between ${isSm ? 'px-1 pt-0.5' : 'px-1.5 pt-1'}`}>
          <span className={`${isSm ? 'text-[8px] leading-none' : 'text-[10px]'} font-semibold text-gray-700`}>
            {formatMonthShort(month, locale)}
          </span>
          <span className={`${isSm ? 'h-1 w-1' : 'h-1.5 w-1.5'} rounded-full bg-gray-300`} aria-hidden />
        </div>
      )}

      <div
        className={[
          'grid grid-cols-7 gap-[1px]',
          !showHeader ? 'p-1 place-content-center' : 'mt-1 px-1.5 pb-1.5',
        ].join(' ')}
      >
        {cells.map((cell, idx) => {
          const dot = isXs ? 'h-[2px] w-[2px]' : isSm ? 'h-[3px] w-[3px]' : 'h-[5px] w-[5px]';
          if (!cell) return <span key={idx} className={dot} aria-hidden />;

          const checked = checkedSet.has(cell.key);
          const isToday = cell.key === todayKey;
          return (
            <span
              key={idx}
              className={[
                dot,
                'rounded-[2px]',
                checked ? 'bg-emerald-500' : 'bg-gray-200',
                isToday && !isXs ? 'ring-1 ring-amber-500' : '',
              ].join(' ')}
              aria-hidden
            />
          );
        })}
      </div>
    </button>
  );
}

function CalendarModal({
  open,
  month,
  checkedSet,
  todayKey,
  locale,
  title,
  onClose,
  onPrev,
  onNext,
}: {
  open: boolean;
  month: Date;
  checkedSet: Set<string>;
  todayKey: string;
  locale: 'en' | 'zh';
  title: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const cells = useMemo(() => buildMonthCells(month), [month]);
  const weekdays = useMemo(() => getWeekdayLabels(locale), [locale]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, onPrev, onNext]);

  if (!open) return null;

  const monthTitle = formatMonthTitle(month, locale);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs text-gray-500">{title}</div>
            <div className="truncate text-sm font-semibold text-gray-900">{monthTitle}</div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              onClick={onPrev}
              aria-label={locale === 'zh' ? '上个月' : 'Previous month'}
              title={locale === 'zh' ? '上个月' : 'Previous month'}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              onClick={onNext}
              aria-label={locale === 'zh' ? '下个月' : 'Next month'}
              title={locale === 'zh' ? '下个月' : 'Next month'}
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              onClick={onClose}
              aria-label={locale === 'zh' ? '关闭' : 'Close'}
              title={locale === 'zh' ? '关闭' : 'Close'}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-500">
          {weekdays.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1 text-center">
          {cells.map((cell, idx) => {
            if (!cell) return <div key={idx} className="h-9 w-9" aria-hidden />;

            const checked = checkedSet.has(cell.key);
            const isToday = cell.key === todayKey;

            return (
              <div
                key={idx}
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-lg text-sm',
                  checked ? 'bg-emerald-500 text-white' : 'bg-gray-50 text-gray-700',
                  isToday ? 'ring-2 ring-amber-500 ring-offset-1' : '',
                ].join(' ')}
                title={cell.key}
              >
                {cell.day}
              </div>
            );
          })}
        </div>

        <div className="mt-3 text-xs text-gray-500">
          {locale === 'zh'
            ? '绿色表示已打卡；方向键可切换月份（←/→）。'
            : 'Green means checked in; use arrow keys to switch months (←/→).'}
        </div>
      </div>
    </div>
  );
}

export default function DailyCheckInReminder({ collapsed, userName }: DailyCheckInReminderProps) {
  const { t, locale } = useLanguage();

  const userKey = useMemo(() => (userName || 'user').toLowerCase(), [userName]);
  const lastCheckInKey = useMemo(() => `raven_daily_checkin:${userKey}`, [userKey]);
  const historyKey = useMemo(() => `raven_daily_checkin_history:${userKey}`, [userKey]);

  const [todayKey, setTodayKey] = useState(() => getTodayKey());
  const [checkedDates, setCheckedDates] = useState<string[]>([]);
  const checkedSet = useMemo(() => new Set(checkedDates), [checkedDates]);
  const checkedInToday = checkedSet.has(todayKey);
  const isAnimating = !checkedInToday;

  const monthForToday = useMemo(() => {
    if (DATE_KEY_RE.test(todayKey)) {
      const [y, m] = todayKey.split('-');
      return new Date(Number(y), Number(m) - 1, 1);
    }
    return startOfMonth(new Date());
  }, [todayKey]);

  const todayLabel = useMemo(() => formatTodayLabel(todayKey, locale), [todayKey, locale]);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));

  useEffect(() => {
    const loadHistory = () => {
      try {
        const parsed = safeParseJson(localStorage.getItem(historyKey));
        const fromHistory = normalizeDateKeys(parsed);
        if (fromHistory.length > 0) {
          setCheckedDates(fromHistory);
          return;
        }

        const last = localStorage.getItem(lastCheckInKey);
        if (last && DATE_KEY_RE.test(last)) {
          const migrated = [last];
          setCheckedDates(migrated);
          try {
            localStorage.setItem(historyKey, JSON.stringify(migrated));
          } catch {
            // ignore
          }
          return;
        }

        setCheckedDates([]);
      } catch {
        setCheckedDates([]);
      }
    };

    const tick = () => setTodayKey(getTodayKey());

    loadHistory();
    tick();
    const interval = window.setInterval(tick, 60_000);

    const onStorage = (e: StorageEvent) => {
      if (e.key === historyKey || e.key === lastCheckInKey) loadHistory();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [historyKey, lastCheckInKey]);

  const openCalendar = () => {
    setViewMonth(monthForToday);
    setCalendarOpen(true);
  };

  const closeCalendar = () => setCalendarOpen(false);

  const handleCheckIn = () => {
    try {
      localStorage.setItem(lastCheckInKey, todayKey);
    } catch {
      // ignore
    }

    setCheckedDates((prev) => {
      if (prev.includes(todayKey)) return prev;
      const next = [...prev, todayKey].filter((x) => DATE_KEY_RE.test(x));
      next.sort();
      try {
        localStorage.setItem(historyKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleResetToday = () => {
    setCheckedDates((prev) => {
      if (!prev.includes(todayKey)) return prev;
      const next = prev.filter((x) => x !== todayKey);

      try {
        if (next.length === 0) {
          localStorage.removeItem(historyKey);
          localStorage.removeItem(lastCheckInKey);
        } else {
          localStorage.setItem(historyKey, JSON.stringify(next));
          localStorage.setItem(lastCheckInKey, next[next.length - 1]);
        }
      } catch {
        // ignore
      }

      return next;
    });
  };

  const tooltip = checkedInToday ? t('checkin.done') : `${t('checkin.reminder')} · ${todayLabel}`;
  const calendarTitle = t('checkin.calendarTitle');
  const resetTooltip = locale === 'zh' ? '恢复为未打卡' : 'Reset today';

  return (
    <>
      <CalendarModal
        open={calendarOpen}
        month={viewMonth}
        checkedSet={checkedSet}
        todayKey={todayKey}
        locale={locale}
        title={calendarTitle}
        onClose={closeCalendar}
        onPrev={() => setViewMonth((m) => addMonths(m, -1))}
        onNext={() => setViewMonth((m) => addMonths(m, 1))}
      />

      {collapsed ? (
        <div className="relative flex justify-center py-2">
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
            {isAnimating && (
              <span className="absolute inset-2 rounded-full bg-amber-300/50 animate-ping" aria-hidden />
            )}
            <PandaIcon className={`h-10 w-10 drop-shadow-sm ${isAnimating ? 'panda-wiggle' : ''}`} />
          </button>

          <div className="absolute left-2 bottom-2">
            <MiniCalendarButton
              size="sm"
              month={monthForToday}
              checkedSet={checkedSet}
              todayKey={todayKey}
              locale={locale}
              onOpen={openCalendar}
            />
          </div>
        </div>
      ) : (
        <div className="px-2 pb-2">
          <div
            className={[
              'relative rounded-2xl border p-3',
              checkedInToday
                ? 'border-gray-100 bg-white shadow-sm'
                : 'border-amber-200 bg-gradient-to-b from-amber-50 to-white shadow-sm',
            ].join(' ')}
          >
            {checkedInToday && (
              <button
                type="button"
                onClick={handleResetToday}
                className="absolute left-3 bottom-3 flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-gray-50/80 active:bg-gray-50"
                title={resetTooltip}
                aria-label={resetTooltip}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm" aria-hidden />
              </button>
            )}

            <div className="flex flex-col items-center gap-2">
              <div className="flex justify-center">
                <span
                  className={[
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 whitespace-nowrap',
                    checkedInToday
                      ? 'bg-gray-50 text-gray-600 ring-gray-200'
                      : 'bg-amber-50 text-amber-800 ring-amber-200',
                  ].join(' ')}
                >
                  {todayLabel}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12">
                  {isAnimating && (
                    <span className="absolute inset-0 rounded-full bg-amber-300/35 animate-ping" aria-hidden />
                  )}
                  <PandaIcon
                    className={`absolute inset-0 h-12 w-12 drop-shadow-sm ${isAnimating ? 'panda-wiggle' : ''}`}
                  />
                </div>

                <div className="flex h-12 w-16 flex-col justify-between">
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={checkedInToday}
                    className={[
                      'inline-flex h-[22px] w-full items-center justify-center rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap',
                      checkedInToday
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 cursor-not-allowed'
                        : 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800',
                    ].join(' ')}
                    title={tooltip}
                    aria-label={tooltip}
                  >
                    {checkedInToday ? t('checkin.buttonDone') : t('checkin.button')}
                  </button>

                  <MiniCalendarButton
                    size="xs"
                    month={monthForToday}
                    checkedSet={checkedSet}
                    todayKey={todayKey}
                    locale={locale}
                    onOpen={openCalendar}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes panda-wiggle {
          0% {
            transform: rotate(-8deg) translateY(0px);
          }
          50% {
            transform: rotate(8deg) translateY(-1px);
          }
          100% {
            transform: rotate(-8deg) translateY(0px);
          }
        }
        .panda-wiggle {
          transform-origin: 50% 85%;
          animation: panda-wiggle 900ms ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .panda-wiggle {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}
