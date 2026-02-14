'use client';

import { X, Plus, MessageSquare, Trash2 } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  time: string;
}

// 模拟数据
const mockSessions: Session[] = [
  { id: '1', title: 'React 性能优化方案', time: '2 hours ago' },
  { id: '2', title: 'PostgreSQL vs MySQL 对比', time: '5 hours ago' },
  { id: '3', title: 'NestJS 项目架构设计', time: 'Yesterday' },
  { id: '4', title: 'Docker 容器化部署指南', time: '2 days ago' },
  { id: '5', title: 'TailwindCSS 自定义主题', time: '3 days ago' },
];

interface ChatHistoryProps {
  visible: boolean;
  onClose: () => void;
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
}

export default function ChatHistory({
  visible,
  onClose,
  activeSessionId,
  onSelectSession,
  onNewChat,
}: ChatHistoryProps) {
  if (!visible) return null;

  return (
    <div className="flex w-72 flex-col border-r border-gray-100 bg-white">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-700">Chat History</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewChat}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-purple-600"
            title="New chat"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {mockSessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`group mb-1 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
              activeSessionId === session.id
                ? 'bg-purple-50 text-purple-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <MessageSquare size={15} className="shrink-0 text-gray-400" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm">{session.title}</p>
              <p className="text-[11px] text-gray-400">{session.time}</p>
            </div>
            <button className="hidden shrink-0 rounded p-1 text-gray-300 hover:text-red-500 group-hover:block">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
