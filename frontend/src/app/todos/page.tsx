'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  ListTodo,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Smile,
  Square,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import TodoTaskDrawer from '@/components/TodoTaskDrawer';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  createTodoList,
  createTodoTask,
  deleteTodoTask,
  listTodoLists,
  listTodoTasks,
  updateTodoTask,
  type TodoList,
  type TodoTask,
} from '@/lib/api';

type TaskFilter = 'open' | 'done' | 'all';
type ReminderRepeat = 'DAILY' | 'WEEKLY' | 'MONTHLY';

const DEFAULT_FOCUS_MINUTES = 25;
const FOCUS_MINUTES_KEY = 'raven_focus_minutes';
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatApiError(data: any): string {
  const msg = data?.message;
  if (!msg) return 'Request failed';
  if (Array.isArray(msg)) return msg.join('; ');
  return String(msg);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.max(0, Math.floor(totalSeconds / 60));
  const seconds = Math.max(0, totalSeconds % 60);
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

function toLocalDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDateKey(dateKey: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateKey.split('-').map((x) => Number(x));
  return { y, m, d };
}

function dateKeyToUtcIso(dateKey: string): string {
  const { y, m, d } = parseDateKey(dateKey);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString();
}

function isoToLocalDateKey(iso: string): string {
  try {
    return toLocalDateKey(new Date(iso));
  } catch {
    return '';
  }
}

function toUtcDateKey(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  // Convert JS Sunday=0..Saturday=6 to Monday=0..Sunday=6
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

function addDays(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function addMonths(month: Date, delta: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + delta, 1, 0, 0, 0, 0);
}

type MonthCell = { day: number; key: string } | null;

function buildMonthCells(month: Date): MonthCell[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const first = new Date(year, monthIndex, 1);
  const offset = (first.getDay() + 6) % 7;

  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const dayNum = i - offset + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push(null);
      continue;
    }
    const key = `${year}-${pad2(monthIndex + 1)}-${pad2(dayNum)}`;
    cells.push({ day: dayNum, key });
  }
  return cells;
}

function weekdayLabels(locale: 'en' | 'zh'): string[] {
  return locale === 'zh'
    ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
}

function formatMmDd(date: Date): string {
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatMonthTitle(month: Date, locale: 'en' | 'zh'): string {
  try {
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(month);
  } catch {
    return `${month.getFullYear()}-${pad2(month.getMonth() + 1)}`;
  }
}

function downloadTextFile(content: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildMarkdownExport(tasks: TodoTask[], title: string): string {
  const groups: Record<string, TodoTask[]> = {};
  for (const task of tasks) {
    const dueKey = task.dueAt ? toUtcDateKey(task.dueAt) : '';
    const key = DATE_KEY_RE.test(dueKey) ? dueKey : 'no-date';
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
  }

  const keys = Object.keys(groups).sort();
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push('');
  for (const key of keys) {
    lines.push(`## ${key}`);
    for (const task of groups[key]) {
      const mark = task.status === 'DONE' ? 'x' : ' ';
      lines.push(`- [${mark}] ${task.title}`);
    }
    lines.push('');
  }
  return `${lines.join('\n').trim()}\n`;
}

function parseImportText(text: string, defaultDateKey: string) {
  const items: Array<{ title: string; done: boolean; dateKey: string }> = [];
  let currentDateKey = DATE_KEY_RE.test(defaultDateKey) ? defaultDateKey : toLocalDateKey(new Date());
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const headerMatch = line.match(/^#+\s*(\d{4}-\d{2}-\d{2})/);
    if (headerMatch) {
      currentDateKey = headerMatch[1];
      continue;
    }
    if (line.startsWith('>')) continue;

    let done = false;
    let title = line;

    const checkboxMatch = line.match(/^[-*]\s*\[(x|X| )\]\s*(.+)$/);
    if (checkboxMatch) {
      done = checkboxMatch[1].toLowerCase() === 'x';
      title = checkboxMatch[2].trim();
    } else if (/^[-*]\s+/.test(line)) {
      title = line.replace(/^[-*]\s+/, '').trim();
    }

    const dateMatch = title.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
    const dateKey = dateMatch ? dateMatch[1] : currentDateKey;
    const cleanTitle = dateMatch ? dateMatch[2].trim() : title;
    if (!cleanTitle) continue;

    items.push({ title: cleanTitle, done, dateKey });
  }
  return items;
}

function MonthOverview({
  open,
  month,
  counts,
  locale,
  selectedDateKey,
  todayKey,
  loading,
  title,
  loadingLabel,
  onSelectDate,
  onClose,
  onPrev,
  onNext,
}: {
  open: boolean;
  month: Date;
  counts: Record<string, number>;
  locale: 'en' | 'zh';
  selectedDateKey: string;
  todayKey: string;
  loading: boolean;
  title: string;
  loadingLabel: string;
  onSelectDate: (dateKey: string) => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const cells = useMemo(() => buildMonthCells(month), [month]);
  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);

  if (!open) return null;

  const monthTitle = formatMonthTitle(month, locale);

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/20 p-4 lg:absolute lg:inset-auto lg:left-0 lg:top-0 lg:z-10 lg:translate-x-[-calc(100%+16px)] lg:bg-transparent lg:p-0"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-4 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
            <p className="truncate text-sm font-semibold text-gray-900">{monthTitle}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrev}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              title={locale === 'zh' ? '上个月' : 'Previous month'}
              aria-label={locale === 'zh' ? '上个月' : 'Previous month'}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              title={locale === 'zh' ? '下个月' : 'Next month'}
              aria-label={locale === 'zh' ? '下个月' : 'Next month'}
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              aria-label={locale === 'zh' ? '关闭' : 'Close'}
              title={locale === 'zh' ? '关闭' : 'Close'}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2 text-center text-[11px] font-medium text-gray-400">
          {weekdays.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2 text-center">
          {cells.map((cell, idx) => {
            if (!cell) return <div key={idx} className="h-10" aria-hidden />;
            const count = counts[cell.key] || 0;
            const isSelected = cell.key === selectedDateKey;
            const isToday = cell.key === todayKey;
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => onSelectDate(cell.key)}
                className={[
                  'relative flex h-10 flex-col items-center justify-center rounded-xl text-sm transition-colors',
                  isSelected
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100',
                  isToday ? 'ring-2 ring-amber-400 ring-offset-1' : '',
                ].join(' ')}
              >
                <span>{cell.day}</span>
                {count > 0 && (
                  <span className="absolute bottom-1 right-1 rounded-full bg-purple-100 px-1 text-[10px] font-semibold text-purple-700">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading && <div className="mt-2 text-xs text-gray-400">{loadingLabel}</div>}
      </div>
    </div>
  );
}

export default function TodosPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { t, locale } = useLanguage();

  const todayKey = useMemo(() => toLocalDateKey(new Date()), []);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  const selectedDate = useMemo(() => {
    const { y, m, d } = parseDateKey(selectedDateKey);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }, [selectedDateKey]);

  const weekStart = useMemo(() => startOfWeekMonday(selectedDate), [selectedDate]);
  const weekStartKey = useMemo(() => toLocalDateKey(weekStart), [weekStart]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);

  const [lists, setLists] = useState<TodoList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | 'all'>('all');
  const [filter, setFilter] = useState<TaskFilter>('open');

  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TodoTask | null>(null);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickDone, setQuickDone] = useState(false);
  const [quickExpanded, setQuickExpanded] = useState(false);

  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderRepeat, setReminderRepeat] = useState<ReminderRepeat>('DAILY');
  const [reminderTime, setReminderTime] = useState('18:00');
  const [reminderError, setReminderError] = useState<string | null>(null);

  const [showMonth, setShowMonth] = useState(false);
  const [monthCursor, setMonthCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [monthCounts, setMonthCounts] = useState<Record<string, number>>({});
  const [monthLoading, setMonthLoading] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueKey, setNewDueKey] = useState('');
  const [newPriority, setNewPriority] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [newTaskError, setNewTaskError] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [focusMinutes, setFocusMinutes] = useState(DEFAULT_FOCUS_MINUTES);
  const [focusRemaining, setFocusRemaining] = useState<number | null>(null);
  const [focusRunning, setFocusRunning] = useState(false);

  const quickInputRef = useRef<HTMLInputElement | null>(null);
  const quickInitRef = useRef(false);
  const reminderRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  const selectedListName = useMemo(() => {
    if (selectedListId === 'all') return t('todos.allLists');
    return lists.find((l) => l.id === selectedListId)?.name || t('todos.allLists');
  }, [lists, selectedListId, t]);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => task.dueAt && isoToLocalDateKey(task.dueAt) === selectedDateKey);
  }, [tasks, selectedDateKey]);

  const weekCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of tasks) {
      if (!task.dueAt) continue;
      const k = isoToLocalDateKey(task.dueAt);
      if (!k) continue;
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [tasks]);

  const focusLabel = useMemo(() => {
    if (focusRemaining == null) return t('todos.focusStart');
    return formatCountdown(focusRemaining);
  }, [focusRemaining, t]);

  const loadLists = async () => {
    const data = await listTodoLists();
    if ((data as any)?.statusCode) throw new Error(formatApiError(data));
    setLists(data);

    setSelectedListId((prev) => {
      if (prev !== 'all' && data.some((l) => l.id === prev)) return prev;
      const inbox = data.find((l) => l.isInbox);
      return inbox?.id || 'all';
    });
  };

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const weekEnd = addDays(weekStart, 6);
      const data = await listTodoTasks({
        status: filter,
        listId: selectedListId === 'all' ? undefined : selectedListId,
        take: 50,
        dueAfter: new Date(
          weekStart.getFullYear(),
          weekStart.getMonth(),
          weekStart.getDate(),
          0,
          0,
          0,
          0,
        ).toISOString(),
        dueBefore: new Date(
          weekEnd.getFullYear(),
          weekEnd.getMonth(),
          weekEnd.getDate(),
          23,
          59,
          59,
          999,
        ).toISOString(),
      });
      if ((data as any)?.statusCode) throw new Error(formatApiError(data));
      setTasks(data);
    } catch (e: any) {
      setError(e?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const loadMonthCounts = async () => {
    if (!authReady) return;
    setMonthLoading(true);
    try {
      const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1, 0, 0, 0, 0);
      const monthEnd = new Date(
        monthCursor.getFullYear(),
        monthCursor.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      const data = await listTodoTasks({
        status: filter,
        listId: selectedListId === 'all' ? undefined : selectedListId,
        take: 200,
        dueAfter: monthStart.toISOString(),
        dueBefore: monthEnd.toISOString(),
      });
      if ((data as any)?.statusCode) throw new Error(formatApiError(data));
      const counts: Record<string, number> = {};
      for (const task of data) {
        if (!task.dueAt) continue;
        const k = isoToLocalDateKey(task.dueAt);
        if (!k) continue;
        counts[k] = (counts[k] || 0) + 1;
      }
      setMonthCounts(counts);
    } catch {
      setMonthCounts({});
    } finally {
      setMonthLoading(false);
    }
  };

  const reloadAll = async () => {
    setError(null);
    try {
      await loadLists();
      await loadTasks();
    } catch (e: any) {
      setError(e?.message || 'Request failed');
    }
  };

  useEffect(() => {
    if (!authReady) return;
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, selectedListId, filter, weekStartKey]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FOCUS_MINUTES_KEY);
      if (!stored) return;
      const value = Number(stored);
      if (!Number.isFinite(value) || value <= 0) return;
      setFocusMinutes(value);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!focusRunning) return;
    const timer = window.setInterval(() => {
      setFocusRemaining((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          setFocusRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [focusRunning]);

  useEffect(() => {
    if (!quickAddOpen) {
      quickInitRef.current = false;
      return;
    }
    if (!quickInitRef.current) {
      setNewDueKey((prev) => prev || selectedDateKey);
      quickInitRef.current = true;
    }
    quickInputRef.current?.focus();
  }, [quickAddOpen, selectedDateKey]);

  useEffect(() => {
    if (!reminderOpen) return;
    setReminderError(null);
    const onClick = (e: MouseEvent) => {
      if (!reminderRef.current) return;
      if (!reminderRef.current.contains(e.target as Node)) {
        setReminderOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setReminderOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [reminderOpen]);

  useEffect(() => {
    if (!showMonth) return;
    loadMonthCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMonth, monthCursor, selectedListId, filter, authReady]);

  useEffect(() => {
    if (!exportOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!exportRef.current) return;
      if (!exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [exportOpen]);

  useEffect(() => {
    if (!importOpen) return;
    setImportError(null);
    setImportResult(null);
  }, [importOpen]);

  const handleFocusToggle = () => {
    if (focusRunning) {
      setFocusRunning(false);
      return;
    }
    setFocusRemaining((prev) => (prev && prev > 0 ? prev : focusMinutes * 60));
    setFocusRunning(true);
  };

  const handleReminderStart = () => {
    if (!reminderTitle.trim()) {
      setReminderError(t('todos.reminderRequired'));
      return;
    }
    setReminderError(null);
    setReminderOpen(false);
  };

  const handleReminderStop = () => {
    setReminderTitle('');
    setReminderError(null);
    setReminderOpen(false);
  };

  const handleQuickAddCancel = () => {
    setQuickAddOpen(false);
    setQuickExpanded(false);
    setQuickDone(false);
    setNewTitle('');
    setNewDescription('');
    setNewDueKey('');
    setNewPriority(0);
    setNewTaskError(null);
  };

  const handlePrevWeek = () => {
    setSelectedDateKey(toLocalDateKey(addDays(selectedDate, -7)));
  };

  const handleNextWeek = () => {
    setSelectedDateKey(toLocalDateKey(addDays(selectedDate, 7)));
  };

  const handleExportWeek = () => {
    const title = `${selectedListName} · ${weekStartKey}`;
    const markdown = buildMarkdownExport(tasks, title);
    downloadTextFile(markdown, `todos-week-${weekStartKey}.md`, 'text/markdown');
    setExportOpen(false);
  };

  const handleExportMonth = async () => {
    setExporting(true);
    setExportOpen(false);
    try {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      const data = await listTodoTasks({
        status: filter,
        listId: selectedListId === 'all' ? undefined : selectedListId,
        take: 500,
        dueAfter: monthStart.toISOString(),
        dueBefore: monthEnd.toISOString(),
      });
      if ((data as any)?.statusCode) throw new Error(formatApiError(data));
      const title = `${selectedListName} · ${formatMonthTitle(monthStart, locale)}`;
      const markdown = buildMarkdownExport(data, title);
      const filename = `todos-month-${toLocalDateKey(monthStart)}.md`;
      downloadTextFile(markdown, filename, 'text/markdown');
    } catch (e: any) {
      setError(e?.message || t('todos.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setImportText(String(reader.result || ''));
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    const source = importText.trim();
    if (!source) {
      setImportError(t('todos.importEmpty'));
      return;
    }
    const items = parseImportText(source, selectedDateKey);
    if (items.length === 0) {
      setImportError(t('todos.importEmpty'));
      return;
    }

    setImportBusy(true);
    setImportError(null);
    let success = 0;
    let failed = 0;
    for (const item of items) {
      const dateKey = DATE_KEY_RE.test(item.dateKey) ? item.dateKey : selectedDateKey;
      try {
        let data = await createTodoTask({
          title: item.title,
          listId: selectedListId === 'all' ? undefined : selectedListId,
          dueAt: dateKeyToUtcIso(dateKey),
        });
        if ((data as any)?.statusCode) throw new Error(formatApiError(data));
        if (item.done) {
          try {
            const updated = await updateTodoTask(data.id, { status: 'DONE' });
            if (!(updated as any)?.statusCode) {
              data = updated;
            }
          } catch {
            // ignore
          }
        }
        success += 1;
      } catch {
        failed += 1;
      }
    }
    setImportResult(
      t('todos.importResult')
        .replace('{success}', String(success))
        .replace('{failed}', String(failed)),
    );
    setImportBusy(false);
    await loadTasks();
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    const dueKey = newDueKey || selectedDateKey;
    if (!DATE_KEY_RE.test(dueKey)) {
      setNewTaskError(t('todos.requiredDueDate'));
      return;
    }

    setSubmitting(true);
    setError(null);
    setNewTaskError(null);
    try {
      const dueAt = dueKey ? dateKeyToUtcIso(dueKey) : undefined;
      let data = await createTodoTask({
        title,
        description: newDescription.trim() || undefined,
        listId: selectedListId === 'all' ? undefined : selectedListId,
        priority: newPriority || undefined,
        dueAt,
      });
      if ((data as any)?.statusCode) throw new Error(formatApiError(data));

      if (quickDone) {
        try {
          const updated = await updateTodoTask(data.id, { status: 'DONE' });
          if (!(updated as any)?.statusCode) {
            data = updated;
          }
        } catch {
          // ignore quick done failure
        }
      }

      setNewTitle('');
      setNewDescription('');
      setNewDueKey((prev) => (prev ? prev : selectedDateKey));
      setQuickDone(false);
      setNewPriority(0);

      setTasks((prev) => [data, ...prev].slice(0, 50));
    } catch (e2: any) {
      setError(e2?.message || 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDone = async (task: TodoTask) => {
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    setTasks((prev) => prev.map((t0) => (t0.id === task.id ? { ...t0, status: nextStatus } : t0)));
    try {
      const data = await updateTodoTask(task.id, { status: nextStatus });
      if ((data as any)?.statusCode) throw new Error(formatApiError(data));
      setTasks((prev) => prev.map((t0) => (t0.id === task.id ? data : t0)));
    } catch (e: any) {
      setTasks((prev) => prev.map((t0) => (t0.id === task.id ? task : t0)));
      setError(e?.message || 'Request failed');
    }
  };

  const removeTask = async (task: TodoTask) => {
    setError(null);
    const prev = tasks;
    setTasks((t0) => t0.filter((x) => x.id !== task.id));
    try {
      const data = await deleteTodoTask(task.id);
      if ((data as any)?.statusCode) throw new Error(formatApiError(data));
      if (selectedTask?.id === task.id) setSelectedTask(null);
    } catch (e: any) {
      setTasks(prev);
      setError(e?.message || 'Request failed');
    }
  };

  const handleCreateList = async () => {
    const name = window.prompt(t('todos.newListPrompt'));
    if (!name?.trim()) return;
    setError(null);
    try {
      const data = await createTodoList({ name: name.trim() });
      if ((data as any)?.statusCode) throw new Error(formatApiError(data));
      await loadLists();
      setSelectedListId(data.id);
    } catch (e: any) {
      setError(e?.message || 'Request failed');
    }
  };

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFA]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onShowHistory={() => {}}
        userName={userName}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ListTodo size={18} className="text-purple-600" />
                <h1 className="text-lg font-semibold text-gray-900">{t('todos.title')}</h1>
              </div>
              <p className="mt-0.5 text-sm text-gray-500">{t('todos.subtitle')}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleCreateList}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Plus size={16} />
                {t('todos.newList')}
              </button>
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                title={t('todos.import')}
              >
                <Upload size={16} />
                {t('todos.import')}
              </button>
              <div ref={exportRef} className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen((prev) => !prev)}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  title={t('todos.export')}
                >
                  <Download size={16} />
                  {t('todos.export')}
                </button>
                {exportOpen && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                    <button
                      type="button"
                      onClick={handleExportWeek}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {t('todos.exportWeek')}
                    </button>
                    <button
                      type="button"
                      onClick={handleExportMonth}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {t('todos.exportMonth')}
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={reloadAll}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                title={t('todos.refresh')}
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8">
          {error && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Lists */}
            <section className="lg:col-span-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {t('todos.lists')}
                </p>
                <div className="mt-3 space-y-1">
                  <button
                    type="button"
                    onClick={() => setSelectedListId('all')}
                    className={[
                      'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      selectedListId === 'all'
                        ? 'bg-purple-50 font-medium text-purple-700'
                        : 'text-gray-700 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {t('todos.allLists')}
                  </button>
                  {lists.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setSelectedListId(l.id)}
                      className={[
                        'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                        selectedListId === l.id
                          ? 'bg-purple-50 font-medium text-purple-700'
                          : 'text-gray-700 hover:bg-gray-50',
                      ].join(' ')}
                    >
                      <span className="min-w-0 truncate">{l.name}</span>
                      <span className="shrink-0 text-xs text-gray-400">{l._count?.tasks ?? ''}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Tasks */}
            <section className="lg:col-span-8">
              <div className="relative">
                <MonthOverview
                  open={showMonth}
                  month={monthCursor}
                  counts={monthCounts}
                  locale={locale}
                  selectedDateKey={selectedDateKey}
                  todayKey={todayKey}
                  loading={monthLoading}
                  title={t('todos.calendarOverview')}
                  loadingLabel={t('todos.loading')}
                  onSelectDate={(dateKey) => {
                    setSelectedDateKey(dateKey);
                    setShowMonth(false);
                  }}
                  onClose={() => setShowMonth(false)}
                  onPrev={() => setMonthCursor((m) => addMonths(m, -1))}
                  onNext={() => setMonthCursor((m) => addMonths(m, 1))}
                />

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-gray-900">{selectedListName}</h2>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {t('todos.countLabel').replace('{count}', String(visibleTasks.length))}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(['open', 'done', 'all'] as TaskFilter[]).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setFilter(k)}
                          className={[
                            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                            filter === k
                              ? 'border-purple-200 bg-purple-50 text-purple-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                          ].join(' ')}
                        >
                          {k === 'open'
                            ? t('todos.filterOpen')
                            : k === 'done'
                              ? t('todos.filterDone')
                              : t('todos.filterAll')}
                        </button>
                      ))}
                      <div className="hidden h-6 w-px bg-gray-200 sm:block" aria-hidden />
                      <button
                        type="button"
                        onClick={() => {
                          setMonthCursor(startOfMonth(selectedDate));
                          setShowMonth((prev) => !prev);
                        }}
                        className={[
                          'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                          showMonth
                            ? 'border-purple-200 bg-purple-50 text-purple-700'
                            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
                        ].join(' ')}
                        title={t('todos.calendarOverview')}
                        aria-label={t('todos.calendarOverview')}
                      >
                        <CalendarDays size={16} />
                      </button>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                        <Smile size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleFocusToggle}
                      className={[
                        'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                        focusRunning
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                      ].join(' ')}
                      title={t('todos.focusTooltip')}
                    >
                      {focusRunning ? <Pause size={16} /> : <Play size={16} />}
                      {focusLabel}
                    </button>

                    <div ref={reminderRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setReminderOpen((prev) => !prev)}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        title={t('todos.reminderAdd')}
                      >
                        <Bell size={16} />
                        {t('todos.reminderAdd')}
                      </button>

                      {reminderOpen && (
                        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                          <div className="space-y-2">
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-500">
                                {t('todos.reminderItem')}
                              </label>
                              <input
                                value={reminderTitle}
                                onChange={(e) => {
                                  setReminderTitle(e.target.value);
                                  if (reminderError) setReminderError(null);
                                }}
                                placeholder={t('todos.reminderPlaceholder')}
                                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-500">
                                {t('todos.reminderRepeat')}
                              </label>
                              <div className="flex items-center gap-2">
                                {(['DAILY', 'WEEKLY', 'MONTHLY'] as ReminderRepeat[]).map((opt) => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setReminderRepeat(opt)}
                                    className={[
                                      'flex-1 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors',
                                      reminderRepeat === opt
                                        ? 'border-purple-200 bg-purple-50 text-purple-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                                    ].join(' ')}
                                  >
                                    {opt === 'DAILY'
                                      ? t('todos.reminderDaily')
                                      : opt === 'WEEKLY'
                                        ? t('todos.reminderWeekly')
                                        : t('todos.reminderMonthly')}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-500">
                                {t('todos.reminderTime')}
                              </label>
                              <input
                                type="time"
                                value={reminderTime}
                                onChange={(e) => setReminderTime(e.target.value)}
                                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                              />
                            </div>

                            {reminderError && <p className="text-xs text-red-600">{reminderError}</p>}

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={handleReminderStart}
                                className="flex-1 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700"
                              >
                                {t('todos.reminderStart')}
                              </button>
                              <button
                                type="button"
                                onClick={handleReminderStop}
                                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                              >
                                {t('todos.reminderStop')}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrevWeek}
                      className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50"
                      title={t('todos.weekPrev')}
                      aria-label={t('todos.weekPrev')}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="grid flex-1 grid-cols-7 gap-2">
                      {weekDays.map((day, idx) => {
                        const dateKey = toLocalDateKey(day);
                        const count = weekCounts[dateKey] || 0;
                        const isSelected = dateKey === selectedDateKey;
                        const isToday = dateKey === todayKey;
                        return (
                          <button
                            key={dateKey}
                            type="button"
                            onClick={() => setSelectedDateKey(dateKey)}
                            className={[
                              'flex flex-col items-center justify-center rounded-xl px-2 py-1 text-xs transition-colors',
                              isSelected
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-50 text-gray-700 hover:bg-gray-100',
                              isToday ? 'ring-2 ring-amber-400 ring-offset-1' : '',
                            ].join(' ')}
                          >
                            <span className="text-[11px] opacity-80">{weekdays[idx]}</span>
                            <span className="text-sm font-semibold">{formatMmDd(day)}</span>
                            {count > 0 && (
                              <span
                                className={[
                                  'mt-1 rounded-full px-1 text-[10px] font-semibold',
                                  isSelected ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700',
                                ].join(' ')}
                              >
                                {count > 9 ? '9+' : count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={handleNextWeek}
                      className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50"
                      title={t('todos.weekNext')}
                      aria-label={t('todos.weekNext')}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
                    {quickAddOpen ? (
                      <form onSubmit={addTask} className="rounded-lg border border-gray-200 bg-white p-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQuickDone((prev) => !prev)}
                            className="text-gray-400 hover:text-emerald-600"
                            title={quickDone ? t('todos.markUndone') : t('todos.markDone')}
                          >
                            {quickDone ? <CheckSquare2 size={18} /> : <Square size={18} />}
                          </button>
                          <input
                            ref={quickInputRef}
                            value={newTitle}
                            onChange={(e) => {
                              setNewTitle(e.target.value);
                              if (newTaskError) setNewTaskError(null);
                            }}
                            placeholder={t('todos.newTaskPlaceholder')}
                            className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                          />
                          <div className="ml-auto flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setQuickExpanded((prev) => !prev)}
                              className={[
                                'rounded-md p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600',
                                quickExpanded ? 'bg-gray-50 text-gray-600' : '',
                              ].join(' ')}
                              title={t('todos.moreOptions')}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={handleQuickAddCancel}
                              className="rounded-md p-2 text-gray-400 hover:bg-gray-50 hover:text-red-500"
                              title={t('todos.cancel')}
                            >
                              <Trash2 size={16} />
                            </button>
                            <button
                              type="submit"
                              disabled={submitting || !newTitle.trim()}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:bg-purple-300"
                              title={t('todos.add')}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>

                        {quickExpanded && (
                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-12">
                            <div className="sm:col-span-4">
                              <label className="mb-1 block text-xs font-semibold text-gray-500">
                                {t('todos.fieldDueDate')}
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="date"
                                  value={newDueKey}
                                  onChange={(e) => {
                                    setNewDueKey(e.target.value);
                                    if (newTaskError) setNewTaskError(null);
                                  }}
                                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                                />
                              </div>
                            </div>
                            <div className="sm:col-span-4">
                              <label className="mb-1 block text-xs font-semibold text-gray-500">
                                {t('todos.fieldPriority')}
                              </label>
                              <select
                                value={newPriority}
                                onChange={(e) => setNewPriority(Number(e.target.value))}
                                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                              >
                                <option value={0}>{t('todos.priorityNone')}</option>
                                <option value={1}>{t('todos.priorityLow')}</option>
                                <option value={2}>{t('todos.priorityMed')}</option>
                                <option value={3}>{t('todos.priorityHigh')}</option>
                              </select>
                            </div>
                            <div className="sm:col-span-12">
                              <label className="mb-1 block text-xs font-semibold text-gray-500">
                                {t('todos.fieldDescription')}
                              </label>
                              <textarea
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder={t('todos.notesPlaceholder')}
                                rows={2}
                                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                              />
                            </div>
                          </div>
                        )}
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setQuickAddOpen(true)}
                        className="flex h-12 w-full items-center justify-center rounded-lg border border-dashed border-gray-200 text-gray-400 hover:border-purple-200 hover:text-purple-600"
                        title={t('todos.add')}
                      >
                        <Plus size={18} />
                      </button>
                    )}

                    {newTaskError && (
                      <p className="mt-2 text-xs text-red-600">{newTaskError}</p>
                    )}

                    <div className="mt-3">
                      {loading ? (
                        <p className="py-6 text-center text-sm text-gray-400">{t('todos.loading')}</p>
                      ) : visibleTasks.length === 0 ? (
                        <div className="py-10 text-center">
                          <p className="text-sm font-medium text-gray-700">{t('todos.emptyTitle')}</p>
                          <p className="mt-1 text-sm text-gray-500">{t('todos.emptyHint')}</p>
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {visibleTasks.map((task) => {
                            const dueKey = task.dueAt ? toUtcDateKey(task.dueAt) : null;
                            const showList = selectedListId === 'all';
                            return (
                              <li
                                key={task.id}
                                className="flex items-start gap-3 rounded-xl border border-transparent bg-white px-3 py-2 shadow-sm transition-colors hover:border-gray-200"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleDone(task)}
                                  className="mt-0.5 text-gray-400 hover:text-emerald-600"
                                  title={task.status === 'DONE' ? t('todos.markUndone') : t('todos.markDone')}
                                >
                                  {task.status === 'DONE' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                </button>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTask(task)}
                                      className={`text-left text-sm font-medium hover:text-purple-700 ${
                                        task.status === 'DONE' ? 'text-gray-400 line-through' : 'text-gray-900'
                                      }`}
                                      title={t('todos.detailsTitle')}
                                    >
                                      {task.title}
                                    </button>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedTask(task)}
                                        className="rounded p-1 text-gray-300 hover:bg-gray-50 hover:text-purple-600"
                                        title={t('todos.detailsTitle')}
                                      >
                                        <Pencil size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeTask(task)}
                                        className="rounded p-1 text-gray-300 hover:bg-gray-50 hover:text-red-500"
                                        title={t('todos.delete')}
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>

                                  {task.description && (
                                    <p className="mt-0.5 text-sm text-gray-500 whitespace-pre-wrap">
                                      {task.description}
                                    </p>
                                  )}

                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                                    {dueKey && (
                                      <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5">
                                        {t('todos.due')} {dueKey}
                                      </span>
                                    )}
                                    {task.priority > 0 && (
                                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                                        {t('todos.priorityLabel').replace('{p}', String(task.priority))}
                                      </span>
                                    )}
                                    {showList && (
                                      <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5">
                                        {task.list.name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>

      {importOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={() => setImportOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{t('todos.importTitle')}</p>
                <p className="mt-0.5 text-xs text-gray-400">{t('todos.importHint')}</p>
              </div>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                title={t('todos.close')}
                aria-label={t('todos.close')}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <input
                ref={importFileRef}
                type="file"
                accept=".txt,.md"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                  e.currentTarget.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => importFileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Upload size={16} />
                {t('todos.importChoose')}
              </button>

              <textarea
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  if (importError) setImportError(null);
                }}
                placeholder={t('todos.importPlaceholder')}
                rows={6}
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />

              {importError && <p className="text-xs text-red-600">{importError}</p>}
              {importResult && <p className="text-xs text-emerald-600">{importResult}</p>}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  disabled={importBusy}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:bg-purple-300"
                >
                  {importBusy ? t('todos.importing') : t('todos.importConfirm')}
                </button>
                <button
                  type="button"
                  onClick={() => setImportOpen(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {t('todos.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TodoTaskDrawer
        open={!!selectedTask}
        task={selectedTask}
        lists={lists}
        onClose={() => setSelectedTask(null)}
        onSaved={async (updated) => {
          setSelectedTask(updated);
          await loadLists();
          await loadTasks();
        }}
        onDeleted={async (_taskId) => {
          setSelectedTask(null);
          await loadLists();
          await loadTasks();
        }}
      />
    </div>
  );
}
