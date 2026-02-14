'use client';

import { useState } from 'react';
import {
  Settings, Search, BookOpen, Eye, FlaskConical,
  FileText, Users, Target, LayoutGrid, PenTool,
  Store, Bell, Globe, ChevronLeft, ChevronRight, Monitor, Menu, LogOut,
} from 'lucide-react';
import { clearToken } from '@/lib/api';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onShowHistory: () => void;
  userName?: string;
}

const menuSections = [
  {
    title: 'AI ENGINE',
    items: [{ icon: Settings, label: 'AI Ask', href: '/', active: true }],
  },
  {
    title: 'KNOWLEDGE',
    items: [
      { icon: Search, label: 'AI Explore', href: '#' },
      { icon: BookOpen, label: 'My Library', href: '#' },
    ],
  },
  {
    title: 'RESEARCH & ANALYSIS',
    items: [
      { icon: Eye, label: 'AI Insights', href: '#' },
      { icon: FlaskConical, label: 'AI Research', href: '#' },
      { icon: FileText, label: 'AI Reports', href: '#' },
      { icon: Users, label: 'My Teams', href: '#' },
    ],
  },
  {
    title: 'PLANNING & DECISION',
    items: [
      { icon: Target, label: 'AI Planning', href: '#' },
      { icon: LayoutGrid, label: 'AI Decision', href: '#' },
    ],
  },
  {
    title: 'CREATIVE WRITING',
    items: [{ icon: PenTool, label: 'AI Writing', href: '#' }],
  },
  {
    title: 'TOOL STORE',
    items: [{ icon: Store, label: 'AI Store', href: '#' }],
  },
];

export default function Sidebar({ collapsed, onToggle, onShowHistory, userName }: SidebarProps) {
  const handleLogout = () => {
    clearToken();
    window.location.href = '/login';
  };

  return (
    <aside
      className={`flex flex-col border-r border-gray-100 bg-white transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-52'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-sm font-bold text-white cursor-pointer"
          onClick={collapsed ? onToggle : undefined}
          title={collapsed ? 'Expand sidebar' : undefined}
        >
          R
        </div>
        {collapsed ? (
          <>{/* Collapsed: show expand and history buttons below logo */}</>
        ) : (
          <>
            <span className="text-sm font-semibold text-gray-900">Raven</span>
            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
              v3.70.0
            </span>
            <button onClick={onShowHistory} className="ml-auto rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Chat History">
              <Monitor size={14} />
            </button>
            <button onClick={onToggle} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Collapse sidebar">
              <ChevronLeft size={14} />
            </button>
          </>
        )}
      </div>

      {/* Collapsed: action buttons */}
      {collapsed && (
        <div className="flex flex-col items-center gap-1 border-b border-gray-100 px-2 py-2">
          <button
            onClick={onToggle}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={onShowHistory}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Chat History"
          >
            <Menu size={16} />
          </button>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {menuSections.map((section) => (
          <div key={section.title} className="mb-3">
            {!collapsed && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {section.title}
              </p>
            )}
            {section.items.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                  item.active
                    ? 'bg-purple-50 font-medium text-purple-700'
                    : 'text-gray-600 hover:bg-gray-50'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={16} />
                {!collapsed && <span>{item.label}</span>}
              </a>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 px-2 py-2 space-y-1">
        <a href="#" className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 ${collapsed ? 'justify-center' : ''}`} title={collapsed ? 'Notifications' : undefined}>
          <Bell size={16} />
          {!collapsed && <span>Notifications</span>}
        </a>
        <div className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-gray-600 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-700">
            {(userName || 'U')[0].toUpperCase()}
          </div>
          {!collapsed && (
            <span className="flex-1 truncate">{userName || 'User'}</span>
          )}
          {!collapsed && (
            <button onClick={handleLogout} className="rounded p-1 text-gray-400 hover:text-red-500" title="Logout">
              <LogOut size={14} />
            </button>
          )}
        </div>
        <a href="#" className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 ${collapsed ? 'justify-center' : ''}`} title={collapsed ? '中文' : undefined}>
          <Globe size={16} />
          {!collapsed && <span>中文</span>}
        </a>
      </div>
    </aside>
  );
}
