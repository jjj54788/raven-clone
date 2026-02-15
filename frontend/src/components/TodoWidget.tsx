'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Circle, ListTodo, Plus } from 'lucide-react';
import {
  createTodoTask,
  getTodoOverview,
  updateTodoTask,
  type TodoOverview,
  type TodoTask,
} from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';

interface TodoWidgetProps {
  collapsed: boolean;
}

function formatApiError(data: any): string {
  const msg = data?.message;
  if (!msg) return 'Request failed';
  if (Array.isArray(msg)) return msg.join('; ');
  return String(msg);
}

function toUtcDateKey(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

export default function TodoWidget({ collapsed }: TodoWidgetProps) {
  const { t } = useLanguage();
  const [overview, setOverview] = useState<TodoOverview>({ openCount: 0, topTasks: [] });
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayKey = new Date().toISOString().slice(0, 10);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTodoOverview();
      if ((data as any)?.statusCode) throw new Error(formatApiError(data));
      setOverview(data);
    } catch (e: any) {
      setError(e?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (collapsed) return;
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

  const toggleDone = async (task: TodoTask) => {
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    const prevOverview = overview;

    setOverview((o) => ({
      ...o,
      openCount: Math.max(0, o.openCount + (nextStatus === 'DONE' ? -1 : 1)),
      topTasks:
        nextStatus === 'DONE'
          ? o.topTasks.filter((x) => x.id !== task.id)
          : o.topTasks.map((x) => (x.id === task.id ? { ...x, status: nextStatus } : x)),
    }));

    try {
      const data = await updateTodoTask(task.id, { status: nextStatus });
      if ((data as any)?.statusCode) throw new Error(formatApiError(data));
    } catch (e: any) {
      setOverview(prevOverview);
      setError(e?.message || 'Request failed');
      return;
    }

    await loadOverview();
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    setSubmitting(true);
    setError(null);
    try {
      const data = await createTodoTask({ title });
      if ((data as any)?.statusCode) throw new Error(formatApiError(data));
      setNewTitle('');
      await loadOverview();
    } catch (e2: any) {
      setError(e2?.message || 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (collapsed) {
    return (
      <div className="flex justify-center py-2">
        <Link
          href="/todos"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-500 hover:bg-gray-50 hover:text-purple-700"
          title={t('todos.title')}
        >
          <ListTodo size={18} />
        </Link>
      </div>
    );
  }

  const topTasks = overview.topTasks || [];

  return (
    <div className="px-2 pb-2">
      <div className="rounded-xl border border-gray-100 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ListTodo size={16} className="text-purple-600" />
            <p className="text-sm font-semibold text-gray-900">{t('todos.widgetTitle')}</p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/todos"
              className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-purple-700"
              title={t('todos.open')}
              aria-label={t('todos.open')}
            >
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        <form onSubmit={addTask} className="mt-2 flex items-center gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('todos.quickAddPlaceholder')}
            className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
          />
          <button
            type="submit"
            disabled={submitting || !newTitle.trim()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:bg-purple-300"
            title={t('todos.add')}
          >
            <Plus size={16} />
          </button>
        </form>

        {error && (
          <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        <div className="mt-2">
          {loading ? (
            <p className="px-1 py-2 text-xs text-gray-400">{t('todos.loading')}</p>
          ) : topTasks.length === 0 ? (
            <p className="px-1 py-2 text-xs text-gray-400">{t('todos.empty')}</p>
          ) : (
            <ul className="space-y-1">
              {topTasks.map((task) => {
                const dueKey = task.dueAt ? toUtcDateKey(task.dueAt) : null;
                const dueState = !dueKey
                  ? null
                  : dueKey < todayKey
                    ? 'overdue'
                    : dueKey === todayKey
                      ? 'today'
                      : 'future';
                return (
                  <li
                    key={task.id}
                    className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50"
                  >
                    <button
                      type="button"
                      onClick={() => toggleDone(task)}
                      className="mt-0.5 text-gray-400 hover:text-emerald-600"
                      title={task.status === 'DONE' ? t('todos.markUndone') : t('todos.markDone')}
                    >
                      {task.status === 'DONE' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${task.status === 'DONE' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                        {task.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-gray-400">
                        {dueKey && (
                          <span
                            className={[
                              'rounded-full border px-2 py-0.5',
                              dueState === 'overdue'
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : dueState === 'today'
                                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                                  : 'border-gray-200 bg-white text-gray-500',
                            ].join(' ')}
                          >
                            {t('todos.due')} {dueKey}
                          </span>
                        )}
                        {task.priority > 0 && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                            {t('todos.priorityLabel').replace('{p}', String(task.priority))}
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

        {!loading && (
          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
            <span>
              {t('todos.openCount').replace('{count}', String(overview.openCount || 0))}
            </span>
            <button type="button" onClick={loadOverview} className="hover:text-purple-700">
              {t('todos.refresh')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
