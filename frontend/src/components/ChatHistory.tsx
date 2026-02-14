'use client';

import { useState, useMemo } from 'react';
import { MessageSquare, Plus, Trash2, ChevronsLeft, Search } from 'lucide-react';

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
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const sessionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (sessionDate.getTime() >= today.getTime()) return 'Today';
  if (sessionDate.getTime() >= yesterday.getTime()) return 'Yesterday';
  return 'Older';
}

export default function ChatHistory({
  visible, onClose, sessions, activeSessionId,
  onSelectSession, onNewChat, onDeleteSession,
}: ChatHistoryProps) {
  const [search, setSearch] = useState('');

  const filteredSessions = useMemo(() => {
    if (!search.trim()) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(s => s.title.toLowerCase().includes(q));
  }, [sessions, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, Session[]> = { Today: [], Yesterday: [], Older: [] };
    for (const s of filteredSessions) {
      const group = getDateGroup(s.updatedAt);
      groups[group].push(s);
    }
    return groups;
  }, [filteredSessions]);

  if (!visible) return null;

  return (
    <div className="flex w-72 flex-col border-r border-gray-100 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">Chat History</h3>
        <div className="flex gap-1">
          <button
            onClick={onNewChat}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-colors"
            title="New Chat"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Hide sidebar"
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
            placeholder="Search chats..."
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
            <p className="text-sm">{search ? 'No matching chats' : 'No conversations yet'}</p>
            {!search && (
              <button
                onClick={onNewChat}
                className="mt-3 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-100"
              >
                Start a new chat
              </button>
            )}
          </div>
        ) : (
          (['Today', 'Yesterday', 'Older'] as const).map((groupName) => {
            const items = grouped[groupName];
            if (items.length === 0) return null;
            return (
              <div key={groupName} className="mb-2">
                <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {groupName}
                </p>
                {items.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={`group mb-0.5 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                      activeSessionId === session.id
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <MessageSquare size={14} className="shrink-0 opacity-50" />
                    <p className="flex-1 min-w-0 truncate text-sm">{session.title}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                      className="hidden rounded p-1 text-gray-300 hover:text-red-500 group-hover:block"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
