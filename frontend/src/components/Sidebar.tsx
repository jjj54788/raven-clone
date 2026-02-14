'use client';

import { useState } from 'react';
import {
  Settings,
  Search,
  BookOpen,
  Eye,
  FlaskConical,
  FileText,
  Users,
  Target,
  LayoutGrid,
  PenTool,
  ShoppingBag,
  Bell,
  Globe,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'AI ENGINE',
    items: [
      { icon: <Settings size={18} />, label: 'AI Ask', href: '/', active: true },
    ],
  },
  {
    title: 'KNOWLEDGE',
    items: [
      { icon: <Search size={18} />, label: 'AI Explore', href: '#' },
      { icon: <BookOpen size={18} />, label: 'My Library', href: '#' },
    ],
  },
  {
    title: 'RESEARCH & ANALYSIS',
    items: [
      { icon: <Eye size={18} />, label: 'AI Insights', href: '#' },
      { icon: <FlaskConical size={18} />, label: 'AI Research', href: '#' },
      { icon: <FileText size={18} />, label: 'AI Reports', href: '#' },
      { icon: <Users size={18} />, label: 'My Teams', href: '#' },
    ],
  },
  {
    title: 'PLANNING & DECISION',
    items: [
      { icon: <Target size={18} />, label: 'AI Planning', href: '#' },
      { icon: <LayoutGrid size={18} />, label: 'AI Decision', href: '#' },
    ],
  },
  {
    title: 'CREATIVE WRITING',
    items: [
      { icon: <PenTool size={18} />, label: 'AI Writing', href: '#' },
    ],
  },
  {
    title: 'TOOL STORE',
    items: [
      { icon: <ShoppingBag size={18} />, label: 'AI Store', href: '#' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onShowHistory: () => void;
}

export default function Sidebar({ collapsed, onToggle, onShowHistory }: SidebarProps) {
  return (
    <aside
      className={`flex flex-col border-r border-gray-100 bg-white transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo 区域 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
            <span className="text-xs font-bold text-white">R</span>
          </div>
          {!collapsed && (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-800">Raven</span>
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                v3.70.0
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!collapsed && (
            <button
              onClick={onShowHistory}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Chat history"
            >
              <MessageSquare size={16} />
            </button>
          )}
          <button
            onClick={onToggle}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-3">
            {!collapsed && (
              <p className="mb-1 px-3 text-[10px] font-semibold tracking-wider text-gray-400">
                {group.title}
              </p>
            )}
            {group.items.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  item.active
                    ? 'bg-purple-50 text-purple-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className={item.active ? 'text-purple-600' : 'text-gray-400'}>
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </a>
            ))}
          </div>
        ))}
      </nav>

      {/* 底部 */}
      <div className="border-t border-gray-100 px-2 py-2">
        <a
          href="#"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <Bell size={18} className="text-gray-400" />
          {!collapsed && <span>Notifications</span>}
        </a>
        <div
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
            U
          </div>
          {!collapsed && <span className="text-gray-700">User</span>}
        </div>
        {!collapsed && (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer">
            <Globe size={18} className="text-gray-400" />
            <span>中文</span>
          </div>
        )}
      </div>
    </aside>
  );
}
