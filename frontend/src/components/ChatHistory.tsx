'use client';

import { useState, useMemo, useRef } from 'react';
import { MessageSquare, Plus, Trash2, ChevronsLeft, Search, Pencil, Check, X } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface Session {
  id: string;
  title: string;
  updatedAt: string;
  _count?: { messages: number };
}

interface ChatHistoryProps {
  visible: boolean;
  onClose: () => void;
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
}

type DateGroupKey = 'today' | 'yesterday' | 'older';

function getDateGroupKey(dateStr: string): DateGroupKey {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const sessionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (sessionDate.getTime() >= today.getTime()) return 'today';
  if (sessionDate.getTime() >= yesterday.getTime()) return 'yesterday';
  return 'older';
}

const groupOrder: DateGroupKey[] = ['today', 'yesterday', 'older'];
const groupI18nKeys: Record<DateGroupKey, string> = {
  today: 'history.today',
  yesterday: 'history.yesterday',
  older: 'history.older',
};

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  session: Session;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(session.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const confirmEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== session.title) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditValue(session.title);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  };

  if (editing) {
    return (
      <div
        className={`mb-0.5 flex items-center gap-1 rounded-lg px-2 py-1.5 ${
          isActive ? 'bg-purple-50' : 'bg-gray-50'
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={confirmEdit}
          className="flex-1 min-w-0 bg-transparent text-sm text-gray-800 outline-none"
          maxLength={100}
          autoFocus
        />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); confirmEdit(); }}
          className="shrink-0 rounded p-1 text-emerald-500 hover:text-emerald-700"
          title={t('history.renameHint')}
        >
          <Check size={12} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); cancelEdit(); }}
          className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-600"
          title={t('history.renameCancel')}
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={`group mb-0.5 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
        isActive
          ? 'bg-purple-50 text-purple-700'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <MessageSquare size={14} className="shrink-0 opacity-50" />
      <p className="flex-1 min-w-0 truncate text-sm">{session.title}</p>
      <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
        <button
          onClick={startEdit}
          className="rounded p-1 text-gray-300 hover:text-blue-500"
          title={t('history.rename')}
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="rounded p-1 text-gray-300 hover:text-red-500"
          title={t('history.delete')}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

export default function ChatHistory({
  visible, onClose, sessions, activeSessionId,
  onSelectSession, onNewChat, onDeleteSession, onRenameSession,
}: ChatHistoryProps) {
  const [search, setSearch] = useState('');
  const { t } = useLanguage();

  const filteredSessions = useMemo(() => {
    if (!search.trim()) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(s => s.title.toLowerCase().includes(q));
  }, [sessions, search]);

  const grouped = useMemo(() => {
    const groups: Record<DateGroupKey, Session[]> = { today: [], yesterday: [], older: [] };
    for (const s of filteredSessions) {
      const group = getDateGroupKey(s.updatedAt);
      groups[group].push(s);
    }
    return groups;
  }, [filteredSessions]);

  if (!visible) return null;

  return (
    <div className="flex w-72 flex-col border-r border-gray-100 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">{t('history.title')}</h3>
        <div className="flex gap-1">
          <button
            onClick={onNewChat}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-colors"
            title={t('history.newChat')}
          >
            <Plus size={16} />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title={t('history.hideSidebar')}
          >
            <ChevronsLeft size={16} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            placeholder={t('history.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <MessageSquare size={32} className="mb-2 opacity-50" />
            <p className="text-sm">{search ? t('history.noMatching') : t('history.noConversations')}</p>
            {!search && (
              <button
                onClick={onNewChat}
                className="mt-3 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-100"
              >
                {t('history.startNew')}
              </button>
            )}
          </div>
        ) : (
          groupOrder.map((groupKey) => {
            const items = grouped[groupKey];
            if (items.length === 0) return null;
            return (
              <div key={groupKey} className="mb-2">
                <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {t(groupI18nKeys[groupKey])}
                </p>
                {items.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={activeSessionId === session.id}
                    onSelect={() => onSelectSession(session.id)}
                    onDelete={() => onDeleteSession(session.id)}
                    onRename={(title) => onRenameSession(session.id, title)}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
