'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, ListTodo, Plus, RefreshCw, Trash2 } from 'lucide-react';
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

function formatApiError(data: any): string {
  const msg = data?.message;
  if (!msg) return 'Request failed';
  if (Array.isArray(msg)) return msg.join('; ');
  return String(msg);
}

function dateKeyToUtcIso(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map((x) => Number(x));
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0)).toISOString();
}

function toUtcDateKey(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

export default function TodosPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { t } = useLanguage();

  const [lists, setLists] = useState<TodoList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | 'all'>('all');
  const [filter, setFilter] = useState<TaskFilter>('open');

  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TodoTask | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueKey, setNewDueKey] = useState('');
  const [newPriority, setNewPriority] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const selectedListName = useMemo(() => {
    if (selectedListId === 'all') return t('todos.allLists');
    return lists.find((l) => l.id === selectedListId)?.name || t('todos.allLists');
  }, [lists, selectedListId, t]);

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
      const data = await listTodoTasks({
        status: filter,
        listId: selectedListId === 'all' ? undefined : selectedListId,
        take: 50,
      });
      if ((data as any)?.statusCode) throw new Error(formatApiError(data));
      setTasks(data);
    } catch (e: any) {
      setError(e?.message || 'Request failed');
    } finally {
      setLoading(false);
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
  }, [authReady, selectedListId, filter]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    setSubmitting(true);
    setError(null);
    try {
      const dueAt = newDueKey ? dateKeyToUtcIso(newDueKey) : undefined;
      const data = await createTodoTask({
        title,
        description: newDescription.trim() || undefined,
        listId: selectedListId === 'all' ? undefined : selectedListId,
        priority: newPriority || undefined,
        dueAt,
      });
      if ((data as any)?.statusCode) throw new Error(formatApiError(data));

      setNewTitle('');
      setNewDescription('');
      setNewDueKey('');
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
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-gray-900">{selectedListName}</h2>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {t('todos.countLabel').replace('{count}', String(tasks.length))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(['open', 'done', 'all'] as TaskFilter[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setFilter(k)}
                        className={[
                          'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                          filter === k
                            ? 'border-purple-200 bg-purple-50 text-purple-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                        ].join(' ')}
                      >
                        {k === 'open' ? t('todos.filterOpen') : k === 'done' ? t('todos.filterDone') : t('todos.filterAll')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add task */}
                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <form onSubmit={addTask} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                    <div className="sm:col-span-12">
                      <input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder={t('todos.newTaskPlaceholder')}
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <input
                        type="date"
                        value={newDueKey}
                        onChange={(e) => setNewDueKey(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(Number(e.target.value))}
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                      >
                        <option value={0}>{t('todos.priorityNone')}</option>
                        <option value={1}>{t('todos.priorityLow')}</option>
                        <option value={2}>{t('todos.priorityMed')}</option>
                        <option value={3}>{t('todos.priorityHigh')}</option>
                      </select>
                    </div>

                    <div className="sm:col-span-4 sm:flex sm:justify-end">
                      <button
                        type="submit"
                        disabled={submitting || !newTitle.trim()}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 text-sm font-medium text-white hover:bg-purple-700 disabled:bg-purple-300 sm:w-auto"
                      >
                        <Plus size={16} />
                        {t('todos.add')}
                      </button>
                    </div>

                    <div className="sm:col-span-12">
                      <textarea
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder={t('todos.notesPlaceholder')}
                        rows={2}
                        className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                      />
                    </div>
                  </form>
                </div>

                {/* Tasks list */}
                <div className="mt-4">
                  {loading ? (
                    <p className="py-6 text-center text-sm text-gray-400">{t('todos.loading')}</p>
                  ) : tasks.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm font-medium text-gray-700">{t('todos.emptyTitle')}</p>
                      <p className="mt-1 text-sm text-gray-500">{t('todos.emptyHint')}</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {tasks.map((task) => {
                        const dueKey = task.dueAt ? toUtcDateKey(task.dueAt) : null;
                        const showList = selectedListId === 'all';
                        return (
                          <li key={task.id} className="flex items-start gap-3 py-3">
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
                                <button
                                  type="button"
                                  onClick={() => removeTask(task)}
                                  className="rounded p-1 text-gray-300 hover:bg-gray-50 hover:text-red-500"
                                  title={t('todos.delete')}
                                >
                                  <Trash2 size={16} />
                                </button>
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
            </section>
          </div>
        </div>
      </main>

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
