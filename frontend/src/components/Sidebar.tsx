'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Settings, Search, BookOpen, Eye, FlaskConical,
  FileText, Users, Target, LayoutGrid, PenTool,
  Store, Bell, Globe, ChevronLeft, ChevronRight, Monitor, Menu, LogOut, Shield, ListTodo,
  User, Wallet, CheckCircle2,
} from 'lucide-react';
import { clearToken, getUser } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { APP_VERSION } from '@/lib/version';
import { getUnreadCount, subscribeNotificationsChanged } from '@/lib/notifications';
import DailyCheckInReminder from '@/components/DailyCheckInReminder';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onShowHistory: () => void;
  userName?: string;
}

export default function Sidebar({ collapsed, onToggle, onShowHistory, userName }: SidebarProps) {
  const { t, toggleLocale, locale } = useLanguage();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const user = getUser();
  const isAdmin = !!user?.isAdmin;
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const userText = useMemo(() => {
    const zh = {
      profile: '\u4e2a\u4eba\u8d44\u6599',
      points: '\u79ef\u5206\u4e2d\u5fc3',
      checkIn: '\u7b7e\u5230',
      logout: '\u9000\u51fa\u767b\u5f55',
      balance: '\u4f59\u989d',
    };
    const en = {
      profile: 'Profile',
      points: 'Points',
      checkIn: 'Check-in',
      logout: 'Log out',
      balance: 'Balance',
    };
    return locale === 'zh' ? zh : en;
  }, [locale]);

  useEffect(() => {
    const update = () => setUnreadCount(getUnreadCount());
    update();
    return subscribeNotificationsChanged(update);
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (userMenuRef.current.contains(event.target as Node)) return;
      setUserMenuOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen]);

  const menuSections = [
    {
      titleKey: 'sidebar.aiEngine',
      items: [{ icon: Settings, labelKey: 'sidebar.aiAsk', href: '/', active: pathname === '/' }],
    },
    {
      titleKey: 'sidebar.knowledge',
      items: [
        { icon: Search, labelKey: 'sidebar.aiExplore', href: '/ai-explore', active: pathname.startsWith('/ai-explore') },
        { icon: BookOpen, labelKey: 'sidebar.myLibrary', href: '/my-library', active: pathname.startsWith('/my-library') },
      ],
    },
    {
      titleKey: 'sidebar.researchAnalysis',
      items: [
        { icon: Eye, labelKey: 'sidebar.aiInsights', href: '/ai-insights', active: pathname.startsWith('/ai-insights') },
        { icon: FlaskConical, labelKey: 'sidebar.aiResearch', href: '/coming-soon' },
        { icon: FileText, labelKey: 'sidebar.aiReports', href: '/coming-soon' },
        { icon: Users, labelKey: 'sidebar.myTeams', href: '/teams', active: pathname.startsWith('/teams') },
      ],
    },
    {
      titleKey: 'sidebar.planningDecision',
      items: [
        { icon: Target, labelKey: 'sidebar.aiPlanning', href: '/coming-soon' },
        { icon: LayoutGrid, labelKey: 'sidebar.aiDecision', href: '/coming-soon' },
        { icon: ListTodo, labelKey: 'sidebar.aiTodo', href: '/todos', active: pathname === '/todos' },
      ],
    },
    {
      titleKey: 'sidebar.creativeWriting',
      items: [{ icon: PenTool, labelKey: 'sidebar.aiWriting', href: '/coming-soon' }],
    },
    {
      titleKey: 'sidebar.toolStore',
      items: [{ icon: Store, labelKey: 'sidebar.aiStore', href: '/ai-store', active: pathname.startsWith('/ai-store') }],
    },
    ...(isAdmin
      ? [
          {
            titleKey: 'sidebar.admin',
            items: [{ icon: Shield, labelKey: 'sidebar.adminPanel', href: '/admin', active: pathname.startsWith('/admin') }],
          },
        ]
      : []),
  ];

  const handleLogout = () => {
    clearToken();
    window.location.href = '/login';
  };

  const notificationsActive = pathname === '/notifications' || pathname === '/whats-new';

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
          title={collapsed ? t('sidebar.expandSidebar') : undefined}
        >
          R
        </div>
        {collapsed ? (
          <>{/* Collapsed: show expand and history buttons below logo */}</>
        ) : (
          <>
            <span className="text-sm font-semibold text-gray-900">Raven</span>
            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
              {APP_VERSION}
            </span>
            <button onClick={onShowHistory} className="ml-auto rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title={t('sidebar.chatHistory')}>
              <Monitor size={14} />
            </button>
            <button onClick={onToggle} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title={t('sidebar.collapseSidebar')}>
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
            title={t('sidebar.expandSidebar')}
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={onShowHistory}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title={t('sidebar.chatHistory')}
          >
            <Menu size={16} />
          </button>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {menuSections.map((section) => (
          <div key={section.titleKey} className="mb-3">
            {!collapsed && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {t(section.titleKey)}
              </p>
            )}
            {section.items.map((item) => (
              <Link
                key={item.labelKey}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                  item.active
                    ? 'bg-purple-50 font-medium text-purple-700'
                    : 'text-gray-600 hover:bg-gray-50'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? t(item.labelKey) : undefined}
              >
                <item.icon size={16} />
                {!collapsed && <span>{t(item.labelKey)}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <DailyCheckInReminder collapsed={collapsed} userName={userName} />

      {/* Footer */}
      <div className="border-t border-gray-100 px-2 py-2 space-y-1">
        <Link
          href="/notifications"
          className={[
            'relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors',
            notificationsActive ? 'bg-purple-50 font-medium text-purple-700' : 'text-gray-600 hover:bg-gray-50',
            collapsed ? 'justify-center' : '',
          ].join(' ')}
          title={collapsed ? t('sidebar.notifications') : undefined}
        >
          <Bell size={16} />
          {!collapsed && <span>{t('sidebar.notifications')}</span>}
          {!collapsed && unreadCount > 0 && (
            <span className="ml-auto rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
          {collapsed && unreadCount > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-purple-600" />
          )}
        </Link>
        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 ${collapsed ? 'justify-center' : ''}`}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-700">
              {(userName || 'U')[0].toUpperCase()}
            </div>
            {!collapsed && <span className="flex-1 truncate">{userName || 'User'}</span>}
          </button>

          {userMenuOpen && (
            <div
              className={[
                'absolute left-0 bottom-12 z-50 w-60 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl',
                collapsed ? 'left-12' : '',
              ].join(' ')}
            >
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-900">{userName || user?.name || 'User'}</p>
                <p className="text-xs text-gray-400">{user?.email || '\u2014'}</p>
              </div>
              <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Wallet size={12} />
                    {userText.balance}
                  </span>
                  <span className="font-semibold text-gray-800">{user?.credits ?? 0}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <User size={14} />
                  {userText.profile}
                </Link>
                <Link
                  href="/coming-soon"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <Wallet size={14} />
                  {userText.points}
                </Link>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  {userText.checkIn}
                </button>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={14} />
                {userText.logout}
              </button>
            </div>
          )}
        </div>
        <button
          onClick={toggleLocale}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? t('sidebar.langSwitch') : undefined}
        >
          <Globe size={16} />
          {!collapsed && <span>{t('sidebar.langSwitch')}</span>}
        </button>
      </div>
    </aside>
  );
}

