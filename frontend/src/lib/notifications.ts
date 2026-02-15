import { APP_VERSION } from './version';

export type NotificationKind = 'update' | 'tip' | 'info';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: { en: string; zh: string };
  body: { en: string; zh: string };
  createdAt: string; // ISO string
  readAt?: string | null; // ISO string
  action?: { href: string; label: { en: string; zh: string } };
}

const STORAGE_KEY = 'raven_notifications_v1';
const EVENT_NAME = 'raven:notifications';

function safeParseJson(raw: string | null): unknown {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function nowIso(): string {
  return new Date().toISOString();
}

function getDefaultNotifications(): NotificationItem[] {
  const now = Date.now();
  return [
    {
      id: `update-${APP_VERSION}`,
      kind: 'update',
      title: { en: 'New Version Available', zh: '发现新版本' },
      body: {
        en: `Check out the latest features, bug fixes, and improvements in ${APP_VERSION}.`,
        zh: `查看 ${APP_VERSION} 的新功能、修复与改进。`,
      },
      createdAt: new Date(now - 60 * 1000).toISOString(),
      readAt: null,
      action: { href: '/whats-new', label: { en: 'View', zh: '查看' } },
    },
    {
      id: 'tip-ai-office',
      kind: 'tip',
      title: { en: 'Try AI Office', zh: '试试 AI Office' },
      body: {
        en: 'Create professional documents, presentations, and reports with AI assistance.',
        zh: '用 AI 协助生成专业文档、演示文稿和报告。',
      },
      createdAt: new Date(now - 60 * 60 * 1000).toISOString(),
      readAt: null,
      action: { href: '/coming-soon', label: { en: 'View', zh: '查看' } },
    },
  ];
}

export function loadNotifications(): NotificationItem[] {
  if (typeof window === 'undefined') return [];
  const data = safeParseJson(localStorage.getItem(STORAGE_KEY));
  if (!Array.isArray(data)) return [];

  return data
    .filter((x) => x && typeof x === 'object')
    .map((x: any) => ({
      id: String(x.id || ''),
      kind: (x.kind === 'update' || x.kind === 'tip' || x.kind === 'info') ? x.kind : 'info',
      title: x.title && typeof x.title === 'object'
        ? { en: String(x.title.en || ''), zh: String(x.title.zh || '') }
        : { en: '', zh: '' },
      body: x.body && typeof x.body === 'object'
        ? { en: String(x.body.en || ''), zh: String(x.body.zh || '') }
        : { en: '', zh: '' },
      createdAt: String(x.createdAt || ''),
      readAt: x.readAt === undefined ? null : (x.readAt ? String(x.readAt) : null),
      action: x.action && typeof x.action === 'object'
        ? {
          href: String(x.action.href || ''),
          label: x.action.label && typeof x.action.label === 'object'
            ? { en: String(x.action.label.en || ''), zh: String(x.action.label.zh || '') }
            : { en: 'View', zh: '查看' },
        }
        : undefined,
    }))
    .filter((x) => x.id);
}

export function saveNotifications(items: NotificationItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  emitNotificationsChanged();
}

export function loadOrSeedNotifications(): NotificationItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    const seeded = getDefaultNotifications();
    saveNotifications(seeded);
    return seeded;
  }

  const parsed = safeParseJson(raw);
  if (Array.isArray(parsed)) return loadNotifications();

  // Storage exists but is corrupt; reset to defaults.
  const seeded = getDefaultNotifications();
  saveNotifications(seeded);
  return seeded;
}

export function emitNotificationsChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function subscribeNotificationsChanged(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener(EVENT_NAME, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function getUnreadCount(): number {
  const items = loadOrSeedNotifications();
  return items.reduce((acc, n) => acc + (n.readAt ? 0 : 1), 0);
}

export function formatTimeAgo(dateIso: string, locale: 'en' | 'zh'): string {
  const ms = Date.now() - new Date(dateIso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return locale === 'zh' ? '刚刚' : 'just now';

  const sec = Math.floor(ms / 1000);
  if (sec < 45) return locale === 'zh' ? '刚刚' : 'just now';

  const min = Math.floor(sec / 60);
  if (min < 60) return locale === 'zh' ? `${min} 分钟前` : `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return locale === 'zh' ? `${hr} 小时前` : `${hr}h ago`;

  const day = Math.floor(hr / 24);
  return locale === 'zh' ? `${day} 天前` : `${day}d ago`;
}
