'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell, CheckCheck, Trash2, RotateCcw, Zap, Info, Check,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import type { NotificationItem, NotificationKind } from '@/lib/notifications';
import {
  formatTimeAgo,
  loadOrSeedNotifications,
  saveNotifications,
} from '@/lib/notifications';

type FilterKey = 'all' | 'unread';

function kindMeta(kind: NotificationKind): {
  badge: { en: string; zh: string; className: string };
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconWrapClassName: string;
} {
  switch (kind) {
    case 'update':
      return {
        badge: { en: 'Update', zh: '更新', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
        icon: RotateCcw,
        iconWrapClassName: 'bg-emerald-100 text-emerald-700',
      };
    case 'tip':
      return {
        badge: { en: 'Tip', zh: '提示', className: 'bg-amber-50 text-amber-700 border-amber-100' },
        icon: Zap,
        iconWrapClassName: 'bg-amber-100 text-amber-700',
      };
    default:
      return {
        badge: { en: 'Info', zh: '信息', className: 'bg-sky-50 text-sky-700 border-sky-100' },
        icon: Info,
        iconWrapClassName: 'bg-sky-100 text-sky-700',
      };
  }
}

export default function NotificationsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { locale, t } = useLanguage();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    if (!authReady) return;
    setItems(loadOrSeedNotifications());
  }, [authReady]);

  const unreadCount = useMemo(
    () => items.reduce((acc, n) => acc + (n.readAt ? 0 : 1), 0),
    [items],
  );

  const filtered = useMemo(() => {
    if (filter === 'unread') return items.filter((n) => !n.readAt);
    return items;
  }, [items, filter]);

  const setAllRead = () => {
    if (unreadCount === 0) return;
    const now = new Date().toISOString();
    const next = items.map((n) => (n.readAt ? n : { ...n, readAt: now }));
    setItems(next);
    saveNotifications(next);
  };

  const clearAll = () => {
    if (items.length === 0) return;
    setItems([]);
    saveNotifications([]);
  };

  const markRead = (id: string) => {
    const now = new Date().toISOString();
    const next = items.map((n) => (n.id === id ? { ...n, readAt: now } : n));
    setItems(next);
    saveNotifications(next);
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

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-6 px-5 py-4 sm:px-8">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-purple-600" />
                <h1 className="text-lg font-semibold text-gray-900">{t('notifications.title')}</h1>
              </div>
              <p className="mt-0.5 text-sm text-gray-500">
                {unreadCount === 0
                  ? t('notifications.noneUnread')
                  : locale === 'zh'
                    ? `${unreadCount} 条未读通知`
                    : `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              {/* Filters */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={[
                    'rounded-lg border px-3 py-1 text-sm transition-colors',
                    filter === 'all'
                      ? 'border-purple-200 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {t('notifications.filterAll')}
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('unread')}
                  className={[
                    'flex items-center gap-2 rounded-lg border px-3 py-1 text-sm transition-colors',
                    filter === 'unread'
                      ? 'border-purple-200 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                  ].join(' ')}
                >
                  <span>{t('notifications.filterUnread')}</span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-purple-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={setAllRead}
                  disabled={unreadCount === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCheck size={16} className="text-gray-500" />
                  {t('notifications.markAllRead')}
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={items.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={16} className="text-gray-500" />
                  {t('notifications.clearAll')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-5xl">
            {filtered.length === 0 ? (
              <div className="mx-auto mt-16 max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50">
                  <Bell size={22} className="text-purple-600" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-gray-900">
                  {t('notifications.emptyTitle')}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {t('notifications.emptyHint')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((n) => {
                  const meta = kindMeta(n.kind);
                  const Icon = meta.icon;
                  const title = locale === 'zh' ? n.title.zh : n.title.en;
                  const body = locale === 'zh' ? n.body.zh : n.body.en;
                  const badgeText = locale === 'zh' ? meta.badge.zh : meta.badge.en;

                  return (
                    <div
                      key={n.id}
                      className={[
                        'rounded-2xl border bg-white p-5 shadow-sm transition-colors',
                        n.readAt ? 'border-gray-200' : 'border-purple-200',
                      ].join(' ')}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${meta.iconWrapClassName}`}>
                          <Icon size={18} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-gray-900">
                                  {title}
                                </p>
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.badge.className}`}>
                                  {badgeText}
                                </span>
                                {!n.readAt && (
                                  <span className="inline-flex items-center rounded-full bg-purple-600/10 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                                    {t('notifications.unread')}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-gray-600">
                                {body}
                              </p>
                            </div>

                            <div className="shrink-0 text-xs text-gray-400">
                              {formatTimeAgo(n.createdAt, locale)}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-4">
                            {n.action?.href ? (
                              <Link
                                href={n.action.href}
                                className="text-sm font-medium text-purple-700 hover:text-purple-800"
                              >
                                {locale === 'zh' ? n.action.label.zh : n.action.label.en}
                              </Link>
                            ) : null}

                            {!n.readAt && (
                              <button
                                type="button"
                                onClick={() => markRead(n.id)}
                                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                              >
                                <Check size={14} />
                                {t('notifications.markRead')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

