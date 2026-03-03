'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, CheckCircle, Circle, Link2, Link2Off, Plus, Repeat, Save, Search, Trash2, X } from 'lucide-react';
import {
  createSubtask,
  deleteSubtask,
  deleteTodoTask,
  linkTaskKnowledge,
  listKnowledgeNotes,
  updateSubtask,
  updateTodoTask,
  type KnowledgeNote,
  type RepeatRule,
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

const COLOR_OPTIONS = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#9ca3af'];

export default function TodoTaskDrawer({
  open,
  task,
  lists,
  onClose,
  onSaved,
  onDeleted,
}: TodoTaskDrawerProps) {
  const { t } = useLanguage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(0);
  const [listId, setListId] = useState('');
  const [status, setStatus] = useState<TodoStatus>('TODO');
  const [color, setColor] = useState<string | null>(null);
  const [repeatRule, setRepeatRule] = useState<RepeatRule>('NONE');
  const [repeatEndAt, setRepeatEndAt] = useState('');
  const [dueAt, setDueAt] = useState('');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Knowledge link state
  const [kbSearchOpen, setKbSearchOpen] = useState(false);
  const [kbQuery, setKbQuery] = useState('');
  const [kbResults, setKbResults] = useState<KnowledgeNote[]>([]);
  const [kbSearching, setKbSearching] = useState(false);
  const [kbLinking, setKbLinking] = useState(false);

  // Subtask state
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const [subtaskBusy, setSubtaskBusy] = useState(false);

  const listOptions = useMemo(() => {
    return (lists || []).map((l) => ({ id: l.id, name: l.name, isInbox: l.isInbox }));
  }, [lists]);

  useEffect(() => {
    if (!open || !task) return;
    setTitle(task.title || '');
    setDescription(task.description || '');
    setPriority(task.priority || 0);
    setListId(task.list?.id || '');
    setStatus(task.status || 'TODO');
    setColor(task.color || null);
    setRepeatRule(task.repeatRule || 'NONE');
    setRepeatEndAt(task.repeatEndAt ? task.repeatEndAt.slice(0, 10) : '');
    setDueAt(task.dueAt ? task.dueAt.slice(0, 10) : '');
    setSubtaskDraft('');
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

  const repeatOptions: Array<{ value: RepeatRule; label: string }> = [
    { value: 'NONE', label: t('todos.repeatNone') },
    { value: 'DAILY', label: t('todos.repeatDaily') },
    { value: 'WEEKLY', label: t('todos.repeatWeekly') },
    { value: 'MONTHLY', label: t('todos.repeatMonthly') },
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
      const payload: Parameters<typeof updateTodoTask>[1] = {
        title: nextTitle,
        description: description.trim() ? description.trim() : null,
        priority,
        status,
        listId: listId || undefined,
        color: color || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        repeatRule,
        repeatEndAt: repeatEndAt ? new Date(repeatEndAt).toISOString() : null,
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

  const handleAddSubtask = async () => {
    const text = subtaskDraft.trim();
    if (!text || subtaskBusy) return;
    setSubtaskBusy(true);
    try {
      const sub = await createSubtask(task.id, { title: text });
      setSubtaskDraft('');
      // Optimistically append to task subtasks
      onSaved({ ...task, subtasks: [...(task.subtasks || []), sub] });
    } catch {
      // silent
    } finally {
      setSubtaskBusy(false);
    }
  };

  const handleToggleSubtask = async (subId: string, currentDone: boolean) => {
    try {
      await updateSubtask(subId, { done: !currentDone });
      onSaved({
        ...task,
        subtasks: (task.subtasks || []).map((s) =>
          s.id === subId ? { ...s, done: !currentDone } : s,
        ),
      });
    } catch {
      // silent
    }
  };

  const handleDeleteSubtask = async (subId: string) => {
    try {
      await deleteSubtask(subId);
      onSaved({
        ...task,
        subtasks: (task.subtasks || []).filter((s) => s.id !== subId),
      });
    } catch {
      // silent
    }
  };

  const handleKbSearch = async (q: string) => {
    setKbQuery(q);
    if (!q.trim()) { setKbResults([]); return; }
    setKbSearching(true);
    try {
      const notes = await listKnowledgeNotes({ q: q.trim(), take: 8 });
      setKbResults(Array.isArray(notes) ? notes : []);
    } catch { setKbResults([]); }
    finally { setKbSearching(false); }
  };

  const handleKbLink = async (noteId: string) => {
    if (kbLinking) return;
    setKbLinking(true);
    try {
      const updated = await linkTaskKnowledge(task.id, noteId);
      onSaved(updated);
      setKbSearchOpen(false);
      setKbQuery('');
      setKbResults([]);
    } catch { /* silent */ }
    finally { setKbLinking(false); }
  };

  const handleKbUnlink = async () => {
    if (kbLinking) return;
    setKbLinking(true);
    try {
      const updated = await linkTaskKnowledge(task.id, null);
      onSaved(updated);
    } catch { /* silent */ }
    finally { setKbLinking(false); }
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
              <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-500">
                <CalendarDays size={12} />
                {t('todos.fieldDueDate')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                />
                {dueAt && (
                  <button
                    type="button"
                    onClick={() => setDueAt('')}
                    className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:text-gray-600"
                    title={t('todos.clear')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">{t('todos.color')}</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(color === c ? null : c)}
                    className={[
                      'h-6 w-6 rounded-full border border-gray-200',
                      color === c ? 'ring-2 ring-purple-500 ring-offset-2' : '',
                    ].join(' ')}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
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

            {/* Repeat Rule */}
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-500">
                <Repeat size={12} />
                {t('todos.repeatLabel')}
              </label>
              <select
                value={repeatRule}
                onChange={(e) => setRepeatRule(e.target.value as RepeatRule)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
              >
                {repeatOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {repeatRule !== 'NONE' && (
                <div className="mt-2">
                  <label className="mb-1 block text-xs text-gray-400">{t('todos.repeatEnd')}</label>
                  <input
                    type="date"
                    value={repeatEndAt}
                    onChange={(e) => setRepeatEndAt(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              )}
            </div>

            {/* Subtasks */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-500">{t('todos.subtaskLabel')}</label>
              <div className="space-y-1">
                {(task.subtasks || []).map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-50">
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(sub.id, sub.done)}
                      className="shrink-0 text-gray-400 hover:text-green-600"
                    >
                      {sub.done ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <Circle size={16} />
                      )}
                    </button>
                    <span
                      className={[
                        'flex-1 text-sm',
                        sub.done ? 'text-gray-400 line-through' : 'text-gray-700',
                      ].join(' ')}
                    >
                      {sub.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(sub.id)}
                      className="shrink-0 text-gray-300 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={subtaskDraft}
                  onChange={(e) => setSubtaskDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder={t('todos.subtaskPlaceholder')}
                  className="h-8 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-purple-300 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  disabled={subtaskBusy || !subtaskDraft.trim()}
                  className="rounded-lg bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Knowledge Link */}
            <div>
              <label className="mb-1 flex items-center justify-between text-xs font-semibold text-gray-500">
                <span className="flex items-center gap-1"><BookOpen size={12} />关联知识库</span>
                {task.knowledgeNote ? (
                  <button type="button" onClick={handleKbUnlink} disabled={kbLinking} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 disabled:opacity-50">
                    <Link2Off size={11} />取消关联
                  </button>
                ) : (
                  <button type="button" onClick={() => { setKbSearchOpen((p) => !p); setKbQuery(''); setKbResults([]); }} className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-700">
                    <Link2 size={11} />关联笔记
                  </button>
                )}
              </label>

              {task.knowledgeNote ? (
                <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                  <BookOpen size={13} className="shrink-0 text-blue-500" />
                  <span className="min-w-0 flex-1 truncate">{task.knowledgeNote.title}</span>
                </div>
              ) : kbSearchOpen ? (
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={kbQuery}
                      onChange={(e) => handleKbSearch(e.target.value)}
                      placeholder="搜索知识库笔记…"
                      autoFocus
                      className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                    {kbSearching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">搜索中…</span>}
                  </div>
                  {kbResults.length > 0 && (
                    <ul className="max-h-48 overflow-y-auto rounded-lg border border-gray-100 bg-white shadow-sm">
                      {kbResults.map((note) => (
                        <li key={note.id}>
                          <button
                            type="button"
                            onClick={() => handleKbLink(note.id)}
                            disabled={kbLinking}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-purple-50 disabled:opacity-60"
                          >
                            <BookOpen size={12} className="shrink-0 text-gray-400" />
                            <span className="truncate text-gray-800">{note.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">暂无关联笔记</p>
              )}
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
