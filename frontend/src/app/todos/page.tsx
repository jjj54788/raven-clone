'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Download,
  ListChecks,
  ListTodo,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  Smile,
  Sparkles,
  Square,
  Timer,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import TodoTaskDrawer from '@/components/TodoTaskDrawer';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  batchTodoTasks,
  createSubtask,
  createTodoList,
  createTodoTask,
  decomposeTodo,
  deleteSubtask,
  deleteTodoTask,
  getTodoSummary,
  listTodoLists,
  listTodoTasks,
  postponeOverdueTasks,
  rescheduleTasks,
  updateSubtask,
  updateTodoTask,
  type RepeatRule,
  type TodoList,
  type TodoSummary,
  type TodoTask,
} from '@/lib/api';

type TaskFilter = 'open' | 'done' | 'all';
const DEFAULT_FOCUS_MINUTES = 25;
const FOCUS_MINUTES_KEY = 'gewu_focus_minutes';
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TASK_COLORS = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#9ca3af'];

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

function isoToDateKey(iso: string): string {
  if (!iso) return '';
  const direct = iso.slice(0, 10);
  if (DATE_KEY_RE.test(direct)) return direct;
  try {
    return toLocalDateKey(new Date(iso));
  } catch {
    return '';
  }
}

function dateKeyToUtcEndIso(dateKey: string): string {
  const { y, m, d } = parseDateKey(dateKey);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)).toISOString();
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
    const dueKey = task.dueAt ? isoToDateKey(task.dueAt) : '';
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

function buildCsvExport(tasks: TodoTask[]): string {
  const header = 'Title,Status,Priority,Due Date,Completed At,List\n';
  const rows = tasks.map((t) => {
    const cols = [
      `"${t.title.replace(/"/g, '""')}"`,
      t.status,
      String(t.priority),
      t.dueAt ? isoToDateKey(t.dueAt) : '',
      t.completedAt ? isoToDateKey(t.completedAt) : '',
      `"${t.list?.name || ''}"`,
    ];
    return cols.join(',');
  });
  return header + rows.join('\n') + '\n';
}

function buildTextExport(tasks: TodoTask[], title: string): string {
  const groups: Record<string, TodoTask[]> = {};
  for (const task of tasks) {
    const dueKey = task.dueAt ? isoToDateKey(task.dueAt) : '';
    const key = DATE_KEY_RE.test(dueKey) ? dueKey : 'no-date';
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
  }
  const keys = Object.keys(groups).sort();
  const lines: string[] = [`=== ${title} ===`, ''];
  for (const key of keys) {
    lines.push(`--- ${key} ---`);
    for (const task of groups[key]) {
      const mark = task.status === 'DONE' ? '[x]' : '[ ]';
      lines.push(`  ${mark} ${task.title}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim() + '\n';
}

function MonthOverview({
  open,
  inline = false,
  month,
  taskMap,
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
  inline?: boolean;
  month: Date;
  taskMap: Record<string, Array<{ id: string; title: string; status: string; color: string | null }>>;
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
  const rows: MonthCell[][] = [];
  for (let i = 0; i < 6; i += 1) {
    rows.push(cells.slice(i * 7, i * 7 + 7));
  }

  const table = (
    <div className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="bg-white">
            {weekdays.map((w) => (
              <th
                key={w}
                className="border border-gray-200 px-2 py-2 text-center text-xs font-semibold text-gray-900 sm:text-sm"
              >
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, colIndex) => {
                const key = cell ? cell.key : `empty-${rowIndex}-${colIndex}`;
                const dayTasks = cell ? (taskMap[cell.key] || []) : [];
                const count = dayTasks.length;
                const isSelected = cell ? cell.key === selectedDateKey : false;
                const isToday = cell ? cell.key === todayKey : false;
                const dayClass = isToday
                  ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white'
                  : isSelected
                    ? 'text-emerald-700 text-sm font-semibold'
                    : 'text-gray-900 text-sm font-semibold';
                const visibleTasks = dayTasks.slice(0, 2);
                const extraCount = dayTasks.length - visibleTasks.length;
                return (
                  <td key={key} className="h-16 align-top border border-gray-200 p-0 sm:h-20">
                    {cell ? (
                      <button
                        type="button"
                        onClick={() => onSelectDate(cell.key)}
                        className={[
                          'relative flex h-full w-full flex-col gap-0.5 px-1.5 py-1 text-left text-xs transition-colors',
                          isSelected ? 'bg-emerald-50' : 'bg-white hover:bg-gray-50',
                        ].join(' ')}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className={dayClass}>{cell.day}</span>
                          {count > 0 && (
                            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-purple-100 px-1 text-[10px] font-bold text-purple-700">
                              {count > 99 ? '99+' : count}
                            </span>
                          )}
                        </div>
                        {visibleTasks.map((task) => (
                          <div key={task.id} className="flex w-full items-center gap-0.5 overflow-hidden" title={task.title}>
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: task.color || (task.status === 'DONE' ? '#9ca3af' : '#818cf8') }}
                            />
                            <span className="min-w-0 truncate text-[9px] leading-tight text-gray-600">
                              {task.title}
                            </span>
                          </div>
                        ))}
                        {extraCount > 0 && (
                          <span className="text-[9px] leading-tight text-gray-400">+{extraCount}</span>
                        )}
                      </button>
                    ) : (
                      <div className="h-full w-full bg-gray-50" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
          <p className="truncate text-base font-semibold text-gray-900 sm:text-lg">{monthTitle}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrev}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            title={locale === 'zh' ? '\u4e0a\u4e2a\u6708' : 'Previous month'}
            aria-label={locale === 'zh' ? '\u4e0a\u4e2a\u6708' : 'Previous month'}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            title={locale === 'zh' ? '\u4e0b\u4e2a\u6708' : 'Next month'}
            aria-label={locale === 'zh' ? '\u4e0b\u4e2a\u6708' : 'Next month'}
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            aria-label={locale === 'zh' ? '\u5173\u95ed' : 'Close'}
            title={locale === 'zh' ? '\u5173\u95ed' : 'Close'}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {table}

      {loading && <div className="mt-2 text-xs text-gray-400">{loadingLabel}</div>}
    </>
  );

  if (inline) {
    return (
      <div className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        {content}
      </div>
    );
  }

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
        {content}
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

  // AI Decompose
  const [decomposeOpen, setDecomposeOpen] = useState(false);
  const [decomposeGoal, setDecomposeGoal] = useState('');
  const [decomposeLoading, setDecomposeLoading] = useState(false);
  const [decomposeError, setDecomposeError] = useState<string | null>(null);

  const [showMonth, setShowMonth] = useState(true);
  const [monthCursor, setMonthCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [monthTaskMap, setMonthTaskMap] = useState<Record<string, Array<{ id: string; title: string; status: string; color: string | null }>>>({});
  const [monthLoading, setMonthLoading] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Batch selection
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);

  // Inline subtask add in task list
  const [subtaskOpenId, setSubtaskOpenId] = useState<string | null>(null);
  const [subtaskDraft, setSubtaskDraft] = useState('');

  // Repeat rule for quick-add
  const [newRepeatRule, setNewRepeatRule] = useState<RepeatRule>('NONE');

  // Postpone banner
  const [postponedCount, setPostponedCount] = useState(0);

  // AI Summary
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<TodoSummary | null>(null);

  // Countdown timer
  const COUNTDOWN_KEY = 'gewu_countdown_config';
  const [countdownOpen, setCountdownOpen] = useState(false);
  const [countdownName, setCountdownName] = useState('');
  const [countdownMinutes, setCountdownMinutes] = useState(5);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [countdownRunning, setCountdownRunning] = useState(false);

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
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);

  // AI Focus / Reschedule
  const [aiFocusOpen, setAiFocusOpen] = useState(false);
  const [aiFocusLoading, setAiFocusLoading] = useState(false);
  const [aiFocusOrdered, setAiFocusOrdered] = useState<Array<{ task: TodoTask; reason: string }>>([]);

  const quickInputRef = useRef<HTMLInputElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const countdownRef = useRef<HTMLDivElement | null>(null);

  const selectedListName = useMemo(() => {
    if (selectedListId === 'all') return t('todos.allLists');
    return lists.find((l) => l.id === selectedListId)?.name || t('todos.allLists');
  }, [lists, selectedListId, t]);

  const inboxListId = useMemo(() => lists.find((l) => l.isInbox)?.id, [lists]);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => task.dueAt && isoToDateKey(task.dueAt) === selectedDateKey);
  }, [tasks, selectedDateKey]);

  const weekCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of tasks) {
      if (!task.dueAt) continue;
      const k = isoToDateKey(task.dueAt);
      if (!k) continue;
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [tasks]);

  // Merge monthTaskMap with current week tasks so calendar always reflects loaded data
  const mergedMonthTaskMap = useMemo(() => {
    const merged = { ...monthTaskMap };
    for (const task of tasks) {
      if (!task.dueAt) continue;
      const k = isoToDateKey(task.dueAt);
      if (!k) continue;
      if (!merged[k]) merged[k] = [];
      if (!merged[k].some((t) => t.id === task.id)) {
        merged[k].push({ id: task.id, title: task.title, status: task.status, color: task.color ?? null });
      }
    }
    return merged;
  }, [monthTaskMap, tasks]);

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
      const weekStartKey = toLocalDateKey(weekStart);
      const weekEndKey = toLocalDateKey(addDays(weekStart, 6));
      const data = await listTodoTasks({
        status: filter,
        listId: selectedListId === 'all' ? undefined : selectedListId,
        take: 50,
        dueAfter: dateKeyToUtcIso(weekStartKey),
        dueBefore: dateKeyToUtcEndIso(weekEndKey),
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
        listId: inboxListId || (selectedListId === 'all' ? undefined : selectedListId),
        take: 200,
        dueAfter: dateKeyToUtcIso(toLocalDateKey(monthStart)),
        dueBefore: dateKeyToUtcEndIso(toLocalDateKey(monthEnd)),
      });
      if ((data as any)?.statusCode) throw new Error(formatApiError(data));
      const taskMap: Record<string, Array<{ id: string; title: string; status: string; color: string | null }>> = {};
      for (const task of data) {
        if (!task.dueAt) continue;
        const k = isoToDateKey(task.dueAt);
        if (!k) continue;
        if (!taskMap[k]) taskMap[k] = [];
        taskMap[k].push({ id: task.id, title: task.title, status: task.status, color: task.color ?? null });
      }
      setMonthTaskMap(taskMap);
    } catch {
      setMonthTaskMap({});
    } finally {
      setMonthLoading(false);
    }
  };

  const refreshMonthCounts = async () => {
    if (!showMonth) return;
    await loadMonthCounts();
  };

  const reloadAll = async () => {
    setError(null);
    try {
      await loadLists();
      await loadTasks();
      await refreshMonthCounts();
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

  // Auto-postpone overdue tasks on first load
  useEffect(() => {
    if (!authReady) return;
    postponeOverdueTasks().then((r) => {
      if (r?.affected > 0) setPostponedCount(r.affected);
    }).catch(() => {});
  }, [authReady]);

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

  // Load countdown config from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COUNTDOWN_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed?.name) setCountdownName(parsed.name);
      if (parsed?.minutes > 0) setCountdownMinutes(parsed.minutes);
    } catch {}
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

  // Countdown timer tick
  useEffect(() => {
    if (!countdownRunning) return;
    const timer = window.setInterval(() => {
      setCountdownRemaining((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          setCountdownRunning(false);
          try { new Notification(countdownName || 'Countdown', { body: 'Time\'s up!' }); } catch {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdownRunning, countdownName]);

  useEffect(() => {
    if (!quickAddOpen) return;
    quickInputRef.current?.focus();
  }, [quickAddOpen, selectedDateKey]);

  useEffect(() => {
    if (!showMonth) return;
    loadMonthCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMonth, monthCursor, selectedListId, inboxListId, filter, authReady]);

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
    if (!countdownOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!countdownRef.current) return;
      if (!countdownRef.current.contains(e.target as Node)) setCountdownOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setCountdownOpen(false); };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('mousedown', onClick); window.removeEventListener('keydown', onKeyDown); };
  }, [countdownOpen]);

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

  const handleQuickAddCancel = () => {
    setQuickAddOpen(false);
    setQuickExpanded(false);
    setQuickDone(false);
    setNewTitle('');
    setNewDescription('');
    setNewPriority(0);
  };

  const handleAiFocus = async () => {
    setAiFocusLoading(true);
    setAiFocusOpen(true);
    setAiFocusOrdered([]);
    try {
      const result = await rescheduleTasks();
      setAiFocusOrdered(result.ordered || []);
    } catch {
      setAiFocusOpen(false);
    } finally {
      setAiFocusLoading(false);
    }
  };

  const handleDecompose = async () => {
    const goal = decomposeGoal.trim();
    if (!goal || decomposeLoading) return;
    setDecomposeLoading(true);
    setDecomposeError(null);
    try {
      const listId = selectedListId !== 'all' ? selectedListId : undefined;
      const result = await decomposeTodo({ goal, listId });
      if ((result as any)?.statusCode) throw new Error(formatApiError(result));
      setTasks((prev) => [...result.tasks, ...prev]);
      setDecomposeOpen(false);
      setDecomposeGoal('');
    } catch (e: any) {
      setDecomposeError(e?.message || 'AI decompose failed');
    } finally {
      setDecomposeLoading(false);
    }
  };

  const handlePrevWeek = () => {
    setSelectedDateKey(toLocalDateKey(addDays(selectedDate, -7)));
  };

  const handleNextWeek = () => {
    setSelectedDateKey(toLocalDateKey(addDays(selectedDate, 7)));
  };

  const handleAddSubtaskInline = async (taskId: string) => {
    const text = subtaskDraft.trim();
    if (!text) return;
    try {
      const sub = await createSubtask(taskId, { title: text });
      setSubtaskDraft('');
      setSubtaskOpenId(null);
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, subtasks: [...(t.subtasks || []), sub] } : t));
    } catch {}
  };

  const handleToggleSubtaskInline = async (taskId: string, subId: string, currentDone: boolean) => {
    try {
      await updateSubtask(subId, { done: !currentDone });
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, subtasks: (t.subtasks || []).map((s) => s.id === subId ? { ...s, done: !currentDone } : s) } : t));
    } catch {}
  };

  const handleBatchAction = async (action: 'done' | 'todo' | 'delete') => {
    if (selectedIds.size === 0) return;
    setBatchBusy(true);
    try {
      await batchTodoTasks({ ids: Array.from(selectedIds), action });
      setSelectedIds(new Set());
      setSelectMode(false);
      await loadTasks();
      await refreshMonthCounts();
    } catch (e: any) {
      setError(e?.message || 'Batch operation failed');
    } finally {
      setBatchBusy(false);
    }
  };

  const handleLoadSummary = async (mode: 'week' | 'month') => {
    setSummaryLoading(true);
    setSummaryData(null);
    try {
      const from = mode === 'week' ? weekStartKey : toLocalDateKey(startOfMonth(selectedDate));
      const toDate = mode === 'week' ? toLocalDateKey(addDays(weekStart, 6)) : toLocalDateKey(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0));
      const data = await getTodoSummary(from, toDate);
      setSummaryData(data);
    } catch (e: any) {
      setSummaryData({ summary: e?.message || 'Failed', stats: { total: 0, completed: 0, overdue: 0, completionRate: 0 } });
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleCountdownStart = () => {
    if (countdownRunning) {
      setCountdownRunning(false);
      return;
    }
    setCountdownRemaining((prev) => (prev && prev > 0 ? prev : countdownMinutes * 60));
    setCountdownRunning(true);
    try { localStorage.setItem(COUNTDOWN_KEY, JSON.stringify({ name: countdownName, minutes: countdownMinutes })); } catch {}
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
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
        dueAfter: dateKeyToUtcIso(toLocalDateKey(monthStart)),
        dueBefore: dateKeyToUtcEndIso(toLocalDateKey(monthEnd)),
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
    await refreshMonthCounts();
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    setSubmitting(true);
    setError(null);
    try {
      const dueAt = dateKeyToUtcIso(selectedDateKey);
      let data = await createTodoTask({
        title,
        description: newDescription.trim() || undefined,
        listId: selectedListId === 'all' ? undefined : selectedListId,
        priority: newPriority || undefined,
        dueAt,
        repeatRule: newRepeatRule !== 'NONE' ? newRepeatRule : undefined,
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
      setQuickDone(false);
      setNewPriority(0);
      setNewRepeatRule('NONE');

      setTasks((prev) => [data, ...prev].slice(0, 50));
      await refreshMonthCounts();
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
      await refreshMonthCounts();
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
      await refreshMonthCounts();
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
                  <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase text-gray-400">Markdown</p>
                    <button type="button" onClick={handleExportWeek} className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">{t('todos.exportWeek')}</button>
                    <button type="button" onClick={handleExportMonth} className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">{t('todos.exportMonth')}</button>
                    <div className="my-1 border-t border-gray-100" />
                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase text-gray-400">CSV</p>
                    <button type="button" onClick={() => { const csv = buildCsvExport(tasks); downloadTextFile(csv, `todos-week-${weekStartKey}.csv`, 'text/csv'); setExportOpen(false); }} className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">{t('todos.exportCsv')}</button>
                    <div className="my-1 border-t border-gray-100" />
                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase text-gray-400">Text</p>
                    <button type="button" onClick={() => { const txt = buildTextExport(tasks, selectedListName); downloadTextFile(txt, `todos-week-${weekStartKey}.txt`); setExportOpen(false); }} className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">{t('todos.exportText')}</button>
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
              <button
                type="button"
                onClick={() => { setSelectMode((prev) => !prev); setSelectedIds(new Set()); }}
                className={['inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm', selectMode ? 'border-purple-200 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'].join(' ')}
                title={t('todos.selectMode')}
              >
                <ListChecks size={16} />
              </button>
              <button
                type="button"
                onClick={() => { setSummaryOpen(true); handleLoadSummary('week'); }}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                title={t('todos.aiSummary')}
              >
                <Bot size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-6 py-5 sm:px-8">
          {postponedCount > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <span>{t('todos.postponed').replace('{count}', String(postponedCount))}</span>
              <button type="button" onClick={() => setPostponedCount(0)} className="text-amber-500 hover:text-amber-700"><X size={14} /></button>
            </div>
          )}

          {selectMode && selectedIds.size > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3">
              <span className="text-sm font-medium text-purple-700">{selectedIds.size} {t('todos.selected')}</span>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={() => handleBatchAction('done')} disabled={batchBusy} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{t('todos.batchDone')}</button>
                <button type="button" onClick={() => handleBatchAction('todo')} disabled={batchBusy} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{t('todos.batchTodo')}</button>
                <button type="button" onClick={() => { if (window.confirm(t('todos.batchDeleteConfirm'))) handleBatchAction('delete'); }} disabled={batchBusy} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">{t('todos.batchDelete')}</button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            {/* Lists */}
            <section className="lg:col-span-5">
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
              <div className="mt-4">
                <MonthOverview
                  open={showMonth}
                  inline
                  month={monthCursor}
                  taskMap={mergedMonthTaskMap}
                  locale={locale}
                  selectedDateKey={selectedDateKey}
                  todayKey={todayKey}
                  loading={monthLoading}
                  title={t('todos.calendarOverview')}
                  loadingLabel={t('todos.loading')}
                  onSelectDate={(dateKey) => {
                    if (inboxListId) {
                      setSelectedListId(inboxListId);
                    }
                    setSelectedDateKey(dateKey);
                    setShowMonth(false);
                  }}
                  onClose={() => setShowMonth(false)}
                  onPrev={() => setMonthCursor((m) => addMonths(m, -1))}
                  onNext={() => setMonthCursor((m) => addMonths(m, 1))}
                />
              </div>
            </section>

            {/* Tasks */}
            <section className="lg:col-span-7">
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

                  {/* Pomodoro task selector */}
                  {tasks.filter((t) => t.status !== 'DONE' && t.status !== 'ARCHIVED').length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-400">专注任务：</span>
                      <select
                        value={focusTaskId || ''}
                        onChange={(e) => setFocusTaskId(e.target.value || null)}
                        className="h-7 flex-1 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-purple-300 focus:outline-none"
                      >
                        <option value="">— 未选择 —</option>
                        {tasks.filter((t) => t.status !== 'DONE' && t.status !== 'ARCHIVED').slice(0, 20).map((t) => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

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
                      {focusRunning && focusTaskId && (() => {
                        const ft = tasks.find((t) => t.id === focusTaskId);
                        return ft ? <span className="max-w-[100px] truncate text-xs font-normal opacity-75">· {ft.title}</span> : null;
                      })()}
                    </button>

                    {/* AI Focus button */}
                    <button
                      type="button"
                      onClick={handleAiFocus}
                      disabled={aiFocusLoading}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 px-3 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-50 disabled:opacity-60"
                      title="AI 智能排序今日任务"
                    >
                      {aiFocusLoading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      AI 专注
                    </button>

                    {/* Countdown Timer */}
                    <div ref={countdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (countdownRunning) { handleCountdownStart(); return; }
                          setCountdownOpen((prev) => !prev);
                        }}
                        className={['inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors', countdownRunning ? 'bg-amber-500 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'].join(' ')}
                        title={t('todos.countdownTimer')}
                      >
                        {countdownRunning ? <Pause size={16} /> : <Timer size={16} />}
                        {countdownRemaining != null && countdownRemaining > 0 ? formatCountdown(countdownRemaining) : t('todos.countdownTimer')}
                      </button>
                      {countdownOpen && !countdownRunning && (
                        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                          <div className="space-y-2">
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-500">{t('todos.countdownName')}</label>
                              <input value={countdownName} onChange={(e) => setCountdownName(e.target.value)} placeholder={t('todos.countdownNamePlaceholder')} className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-purple-300 focus:outline-none" />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-500">{t('todos.countdownMinutes')}</label>
                              <div className="flex items-center gap-2">
                                {[5, 10, 15, 30, 60].map((m) => (
                                  <button key={m} type="button" onClick={() => setCountdownMinutes(m)} className={['flex-1 rounded-lg border px-2 py-1 text-xs font-semibold', countdownMinutes === m ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'].join(' ')}>{m}</button>
                                ))}
                              </div>
                            </div>
                            <button type="button" onClick={handleCountdownStart} className="w-full rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600">{t('todos.countdownStart')}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Focus panel */}
                  {aiFocusOpen && (
                    <div className="mt-3 rounded-xl border border-purple-100 bg-purple-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-purple-700">
                          <Sparkles size={13} />AI 智能专注顺序
                        </span>
                        <button type="button" onClick={() => setAiFocusOpen(false)} className="text-purple-400 hover:text-purple-600"><X size={13} /></button>
                      </div>
                      {aiFocusLoading ? (
                        <p className="py-2 text-center text-xs text-purple-500"><RefreshCw size={12} className="inline animate-spin" /> AI 分析中…</p>
                      ) : aiFocusOrdered.length === 0 ? (
                        <p className="text-xs text-gray-500">暂无开放任务可排序</p>
                      ) : (
                        <ol className="space-y-1.5">
                          {aiFocusOrdered.map(({ task, reason }, idx) => (
                            <li key={task.id} className="flex items-start gap-2">
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-[11px] font-bold text-white">{idx + 1}</span>
                              <div className="min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() => { setFocusTaskId(task.id); setAiFocusOpen(false); setSelectedTask(task); }}
                                  className="text-left text-sm font-medium text-gray-900 hover:text-purple-700"
                                >
                                  {task.title}
                                </button>
                                {reason && <p className="text-xs text-gray-500">{reason}</p>}
                              </div>
                              <button
                                type="button"
                                onClick={() => { setFocusTaskId(task.id); setFocusRemaining(focusMinutes * 60); setFocusRunning(true); setAiFocusOpen(false); }}
                                className="shrink-0 rounded-lg bg-purple-600 px-2 py-1 text-xs text-white hover:bg-purple-700"
                              >
                                <Play size={10} className="inline" /> 专注
                              </button>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}

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
                            onChange={(e) => setNewTitle(e.target.value)}
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
                            <div className="sm:col-span-6">
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
                            <div className="sm:col-span-6">
                              <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-500">
                                <Repeat size={12} />
                                {t('todos.repeatLabel')}
                              </label>
                              <select
                                value={newRepeatRule}
                                onChange={(e) => setNewRepeatRule(e.target.value as RepeatRule)}
                                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                              >
                                <option value="NONE">{t('todos.repeatNone')}</option>
                                <option value="DAILY">{t('todos.repeatDaily')}</option>
                                <option value="WEEKLY">{t('todos.repeatWeekly')}</option>
                                <option value="MONTHLY">{t('todos.repeatMonthly')}</option>
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
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setQuickAddOpen(true)}
                          className="flex h-12 flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 text-gray-400 hover:border-purple-200 hover:text-purple-600"
                          title={t('todos.add')}
                        >
                          <Plus size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDecomposeOpen(true); setDecomposeError(null); }}
                          className="flex h-12 items-center gap-1.5 rounded-lg border border-dashed border-purple-200 px-3 text-sm text-purple-500 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700"
                          title="AI 任务拆解"
                        >
                          <Sparkles size={15} />
                          AI
                        </button>
                      </div>
                    )}

                    {/* AI Decompose Modal */}
                    {decomposeOpen && (
                      <div className="mt-3 rounded-xl border border-purple-100 bg-purple-50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-purple-700">
                            <Sparkles size={14} />
                            AI 任务拆解
                          </span>
                          <button type="button" onClick={() => { setDecomposeOpen(false); setDecomposeGoal(''); setDecomposeError(null); }} className="text-purple-400 hover:text-purple-600">
                            <X size={14} />
                          </button>
                        </div>
                        <textarea
                          value={decomposeGoal}
                          onChange={(e) => setDecomposeGoal(e.target.value)}
                          placeholder="描述你的目标或项目，AI 将自动拆解为可执行任务…"
                          rows={3}
                          className="w-full resize-none rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleDecompose(); }}
                        />
                        {decomposeError && (
                          <p className="mt-1.5 text-xs text-red-600">{decomposeError}</p>
                        )}
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={handleDecompose}
                            disabled={decomposeLoading || !decomposeGoal.trim()}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:bg-purple-300"
                          >
                            {decomposeLoading ? (
                              <><RefreshCw size={13} className="animate-spin" />拆解中…</>
                            ) : (
                              <><Sparkles size={13} />开始拆解</>
                            )}
                          </button>
                        </div>
                      </div>
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
                            const subs = task.subtasks || [];
                            const subDone = subs.filter((s) => s.done).length;
                            const showList = selectedListId === 'all';
                            const isSelected = selectedIds.has(task.id);
                            return (
                              <li
                                key={task.id}
                                className="flex items-start gap-3 rounded-xl border border-transparent bg-white px-3 py-2 pl-2 shadow-sm transition-colors hover:border-gray-200"
                                style={{ borderLeftWidth: 4, borderLeftColor: task.color || 'transparent' }}
                              >
                                {selectMode && (
                                  <button type="button" onClick={() => setSelectedIds((prev) => { const next = new Set(prev); if (next.has(task.id)) next.delete(task.id); else next.add(task.id); return next; })} className="mt-0.5">
                                    {isSelected ? <CheckSquare2 size={18} className="text-purple-600" /> : <Square size={18} className="text-gray-400" />}
                                  </button>
                                )}

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
                                    <div className="min-w-0">
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
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button type="button" onClick={() => { setSubtaskOpenId(subtaskOpenId === task.id ? null : task.id); setSubtaskDraft(''); }} className="rounded p-1 text-gray-300 hover:bg-gray-50 hover:text-purple-600" title={t('todos.subtaskAdd')}><Plus size={14} /></button>
                                      <button type="button" onClick={() => setSelectedTask(task)} className="rounded p-1 text-gray-300 hover:bg-gray-50 hover:text-purple-600" title={t('todos.detailsTitle')}><Pencil size={14} /></button>
                                      <button type="button" onClick={() => removeTask(task)} className="rounded p-1 text-gray-300 hover:bg-gray-50 hover:text-red-500" title={t('todos.delete')}><Trash2 size={16} /></button>
                                    </div>
                                  </div>

                                  {task.description && (
                                    <p className="mt-0.5 text-sm text-gray-500 whitespace-pre-wrap">{task.description}</p>
                                  )}

                                  {subs.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {subs.map((sub) => (
                                        <button key={sub.id} type="button" onClick={() => handleToggleSubtaskInline(task.id, sub.id, sub.done)} className="flex items-center gap-2 text-xs text-gray-500">
                                          <span className={['flex h-4 w-4 items-center justify-center rounded border', sub.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300'].join(' ')}>
                                            {sub.done && <CheckCircle2 size={12} />}
                                          </span>
                                          <span className={sub.done ? 'text-gray-400 line-through' : ''}>{sub.title}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {subtaskOpenId === task.id && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <input value={subtaskDraft} onChange={(e) => setSubtaskDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtaskInline(task.id); } }} placeholder={t('todos.subtaskPlaceholder')} className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100" />
                                      <button type="button" onClick={() => handleAddSubtaskInline(task.id)} className="rounded-lg bg-purple-600 px-2 py-1 text-xs font-semibold text-white hover:bg-purple-700">{t('todos.subtaskAdd')}</button>
                                    </div>
                                  )}

                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                                    {subs.length > 0 && (
                                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{subDone}/{subs.length}</span>
                                    )}
                                    {task.priority > 0 && (
                                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">{t('todos.priorityLabel').replace('{p}', String(task.priority))}</span>
                                    )}
                                    {task.dueAt && (() => {
                                      const today = toLocalDateKey();
                                      const taskDate = isoToDateKey(task.dueAt);
                                      const isOverdue = taskDate < today && task.status !== 'DONE';
                                      const isToday = taskDate === today;
                                      return (
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                                          isOverdue ? 'border border-red-200 bg-red-50 text-red-600' :
                                          isToday ? 'border border-amber-200 bg-amber-50 text-amber-700' :
                                          'border border-gray-200 bg-white text-gray-400'
                                        }`}>
                                          <CalendarDays size={10} />
                                          {isOverdue ? `↑ ${taskDate}` : isToday ? t('todos.setToday') : taskDate}
                                        </span>
                                      );
                                    })()}
                                    {task.repeatRule !== 'NONE' && (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-blue-500">
                                        <Repeat size={10} />{task.repeatRule.toLowerCase()}
                                      </span>
                                    )}
                                    {showList && (
                                      <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5">{task.list.name}</span>
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

      {/* AI Summary modal */}
      {summaryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSummaryOpen(false)}>
          <div className="relative mx-4 flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-gray-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('todos.summaryTitle')}</h3>
              <button type="button" onClick={() => setSummaryOpen(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-3">
              <button type="button" onClick={() => handleLoadSummary('week')} disabled={summaryLoading} className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50">{t('todos.summaryWeek')}</button>
              <button type="button" onClick={() => handleLoadSummary('month')} disabled={summaryLoading} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50">{t('todos.summaryMonth')}</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {summaryLoading && <p className="text-sm text-gray-500">{t('todos.summaryLoading')}</p>}
              {!summaryLoading && summaryData && (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">{summaryData.stats.total}</p>
                      <p className="text-xs text-gray-500">{t('todos.summaryTotal')}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{summaryData.stats.completed}</p>
                      <p className="text-xs text-emerald-600">{t('todos.summaryCompleted')}</p>
                    </div>
                    <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-center">
                      <p className="text-2xl font-bold text-red-700">{summaryData.stats.overdue}</p>
                      <p className="text-xs text-red-600">{t('todos.summaryOverdue')}</p>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center">
                      <p className="text-2xl font-bold text-blue-700">{Math.round(summaryData.stats.completionRate * 100)}%</p>
                      <p className="text-xs text-blue-600">{t('todos.summaryRate')}</p>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: summaryData.summary.replace(/\n/g, '<br/>') }} />
                </>
              )}
              {!summaryLoading && !summaryData && <p className="text-sm text-gray-400">{t('todos.summaryHint')}</p>}
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
          await refreshMonthCounts();
        }}
        onDeleted={async (_taskId) => {
          setSelectedTask(null);
          await loadLists();
          await loadTasks();
          await refreshMonthCounts();
        }}
      />
    </div>
  );
}
