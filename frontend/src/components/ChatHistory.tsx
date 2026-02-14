'use client';

import { MessageSquare, Plus, Trash2, X } from 'lucide-react';

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ChatHistory({
  visible, onClose, sessions, activeSessionId,
  onSelectSession, onNewChat, onDeleteSession,
}: ChatHistoryProps) {
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
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <MessageSquare size={32} className="mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <button
              onClick={onNewChat}
              className="mt-3 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-100"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`group mb-1 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 transition-colors ${
                activeSessionId === session.id
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <MessageSquare size={14} className="shrink-0 opacity-50" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm">{session.title}</p>
                <p className="text-[11px] text-gray-400">
                  {session._count?.messages || 0} msgs · {timeAgo(session.updatedAt)}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                className="hidden rounded p-1 text-gray-300 hover:text-red-500 group-hover:block"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
