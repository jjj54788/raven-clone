'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save, Trash2, X } from 'lucide-react';
import {
  deleteTodoTask,
  updateTodoTask,
  type TodoList,
  type TodoStatus,
  type TodoTask,
} from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';

interface TodoTaskDrawerProps {
  open: boolean;
  task: TodoTask | null;
  lists: TodoList[];
  onClose: () => void;
  onSaved: (task: TodoTask) => void;
  onDeleted: (taskId: string) => void;
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

function dateKeyToUtcIso(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map((x) => Number(x));
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0)).toISOString();
}

export default function TodoTaskDrawer({ open, task, lists, onClose, onSaved, onDeleted }: TodoTaskDrawerProps) {
  const { t } = useLanguage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueKey, setDueKey] = useState('');
  const [priority, setPriority] = useState(0);
  const [listId, setListId] = useState('');
  const [status, setStatus] = useState<TodoStatus>('TODO');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listOptions = useMemo(() => {
    return (lists || []).map((l) => ({ id: l.id, name: l.name, isInbox: l.isInbox }));
  }, [lists]);

  useEffect(() => {
    if (!open || !task) return;
    setTitle(task.title || '');
    setDescription(task.description || '');
    setDueKey(task.dueAt ? toUtcDateKey(task.dueAt) : '');
    setPriority(task.priority || 0);
    setListId(task.list?.id || '');
    setStatus(task.status || 'TODO');
    setError(null);
  }, [open, task?.id]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !task) return null;

  const statusOptions: Array<{ value: TodoStatus; label: string }> = [
    { value: 'TODO', label: t('todos.statusTodo') },
    { value: 'IN_PROGRESS', label: t('todos.statusInProgress') },
    { value: 'DONE', label: t('todos.statusDone') },
    { value: 'ARCHIVED', label: t('todos.statusArchived') },
  ];

  const handleSave = async () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError(t('todos.requiredTitle'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: nextTitle,
        description: description.trim() ? description.trim() : null,
        dueAt: dueKey ? dateKeyToUtcIso(dueKey) : null,
        priority,
        status,
        listId: listId || undefined,
      };
      const data = await updateTodoTask(task.id, payload);
      if ((data as any)?.statusCode) throw new Error(formatApiError(data));
      onSaved(data);
    } catch (e: any) {
      setError(e?.message || 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('todos.deleteConfirm'))) return;
    setDeleting(true);
    setError(null);
    try {
      const data = await deleteTodoTask(task.id);
      if ((data as any)?.statusCode) throw new Error(formatApiError(data));
      onDeleted(task.id);
    } catch (e: any) {
      setError(e?.message || 'Request failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="fixed right-0 top-0 h-full w-full max-w-md overflow-hidden border-l border-gray-100 bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{t('todos.detailsTitle')}</p>
            <p className="truncate text-xs text-gray-400">{task.list?.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            title={t('todos.close')}
            aria-label={t('todos.close')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="h-full overflow-y-auto px-4 py-4 pb-28">
          {error && (
            <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">{t('todos.fieldTitle')}</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">{t('todos.fieldDescription')}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">{t('todos.fieldDueDate')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dueKey}
                    onChange={(e) => setDueKey(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                  />
                  <button
                    type="button"
                    onClick={() => setDueKey('')}
                    className="h-10 shrink-0 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 hover:bg-gray-50"
                    title={t('todos.clear')}
                  >
                    {t('todos.clear')}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">{t('todos.fieldPriority')}</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                >
                  <option value={0}>{t('todos.priorityNone')}</option>
                  <option value={1}>{t('todos.priorityLow')}</option>
                  <option value={2}>{t('todos.priorityMed')}</option>
                  <option value={3}>{t('todos.priorityHigh')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">{t('todos.fieldStatus')}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TodoStatus)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">{t('todos.fieldList')}</label>
                <select
                  value={listId}
                  onChange={(e) => setListId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                >
                  {listOptions.length === 0 ? (
                    <option value={listId}>{task.list?.name || t('todos.allLists')}</option>
                  ) : (
                    listOptions.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-white/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <Trash2 size={16} className="text-red-500" />
              {t('todos.delete')}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:bg-purple-300"
            >
              <Save size={16} />
              {saving ? t('todos.saving') : t('todos.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
