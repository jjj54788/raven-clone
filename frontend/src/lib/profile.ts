'use client';

import type { ProfileIntegrations, ProfileSettings, RavenUser } from '@/lib/api';

export type ProfileStore = {
  bio: string;
  interests: string[];
  settings: ProfileSettings;
  integrations: ProfileIntegrations;
  joinedAt: string;
};

export const PROFILE_STORAGE_PREFIX = 'raven_profile_v1';
const PROFILE_EVENT = 'raven:profile';

export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  userBubble: 'purple',
  aiBubble: 'soft',
  notifyEmail: true,
  notifyProduct: true,
  notifyWeekly: false,
  darkMode: false,
  locale: 'en',
};

export const DEFAULT_PROFILE_INTEGRATIONS: ProfileIntegrations = {
  notion: false,
  drive: false,
  feishu: false,
  feishuOpenId: '',
};

export const DEFAULT_PROFILE_STORE: ProfileStore = {
  bio: '',
  interests: [],
  settings: { ...DEFAULT_PROFILE_SETTINGS },
  integrations: { ...DEFAULT_PROFILE_INTEGRATIONS },
  joinedAt: new Date().toISOString(),
};

export function getProfileUserKey(user?: RavenUser | null): string {
  const key = String(user?.id || user?.email || 'guest').toLowerCase();
  return key;
}

export function profileStorageKey(userKey: string) {
  return `${PROFILE_STORAGE_PREFIX}:${userKey || 'guest'}`;
}

function safeParse(raw: string | null): any {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function normalizeInterests(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const unique = new Set<string>();
  input.forEach((item) => {
    if (typeof item !== 'string') return;
    const trimmed = item.trim();
    if (!trimmed) return;
    unique.add(trimmed);
  });
  return Array.from(unique).slice(0, 12);
}

export function normalizeSettings(input: unknown): ProfileSettings {
  const base: ProfileSettings = { ...DEFAULT_PROFILE_SETTINGS };
  if (!input || typeof input !== 'object') return base;
  const settings = input as Record<string, any>;
  if (typeof settings.userBubble === 'string') base.userBubble = settings.userBubble.trim() || base.userBubble;
  if (typeof settings.aiBubble === 'string') base.aiBubble = settings.aiBubble.trim() || base.aiBubble;
  if (typeof settings.notifyEmail === 'boolean') base.notifyEmail = settings.notifyEmail;
  if (typeof settings.notifyProduct === 'boolean') base.notifyProduct = settings.notifyProduct;
  if (typeof settings.notifyWeekly === 'boolean') base.notifyWeekly = settings.notifyWeekly;
  if (typeof settings.darkMode === 'boolean') base.darkMode = settings.darkMode;
  if (settings.locale === 'en' || settings.locale === 'zh') base.locale = settings.locale;
  return base;
}

export function normalizeIntegrations(input: unknown): ProfileIntegrations {
  const base: ProfileIntegrations = { ...DEFAULT_PROFILE_INTEGRATIONS };
  if (!input || typeof input !== 'object') return base;
  const integrations = input as Record<string, any>;
  if (typeof integrations.notion === 'boolean') base.notion = integrations.notion;
  if (typeof integrations.drive === 'boolean') base.drive = integrations.drive;
  if (typeof integrations.feishu === 'boolean') base.feishu = integrations.feishu;
  if (typeof integrations.feishuOpenId === 'string') base.feishuOpenId = integrations.feishuOpenId.trim();
  return base;
}

export function loadProfileStore(userKey: string): ProfileStore {
  if (typeof window === 'undefined') return { ...DEFAULT_PROFILE_STORE };
  const raw = safeParse(localStorage.getItem(profileStorageKey(userKey)));
  const merged: ProfileStore = {
    ...DEFAULT_PROFILE_STORE,
    ...raw,
    settings: normalizeSettings(raw?.settings),
    integrations: normalizeIntegrations(raw?.integrations),
  };
  merged.bio = typeof raw?.bio === 'string' ? raw.bio : merged.bio;
  merged.interests = normalizeInterests(raw?.interests ?? merged.interests);
  merged.joinedAt = typeof raw?.joinedAt === 'string' ? raw.joinedAt : merged.joinedAt;
  return merged;
}

export function buildProfileStoreFromApi(data: any, fallback?: ProfileStore): ProfileStore {
  const base = fallback ?? DEFAULT_PROFILE_STORE;
  return {
    bio: typeof data?.bio === 'string' ? data.bio : base.bio,
    interests: normalizeInterests(data?.interests ?? base.interests),
    settings: normalizeSettings(data?.settings ?? base.settings),
    integrations: normalizeIntegrations(data?.integrations ?? base.integrations),
    joinedAt: typeof data?.createdAt === 'string' ? data.createdAt : base.joinedAt,
  };
}

export function saveProfileStore(userKey: string, store: ProfileStore) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(profileStorageKey(userKey), JSON.stringify(store));
  emitProfileChanged();
}

export function emitProfileChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PROFILE_EVENT));
}

export function subscribeProfileChanged(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(PROFILE_EVENT, cb);
  return () => {
    window.removeEventListener(PROFILE_EVENT, cb);
  };
}

const USER_BUBBLE_CLASS: Record<string, string> = {
  purple: 'bg-purple-600 text-white',
  blue: 'bg-blue-600 text-white',
  orange: 'bg-orange-500 text-white',
  green: 'bg-emerald-600 text-white',
  slate: 'bg-slate-700 text-white',
};

const AI_BUBBLE_CLASS: Record<string, string> = {
  soft: 'bg-white border border-gray-100 text-gray-800',
  mist: 'bg-gray-50 border border-gray-200 text-gray-700',
  sky: 'bg-blue-50 border border-blue-100 text-blue-900',
  amber: 'bg-amber-50 border border-amber-100 text-amber-900',
};

export function resolveChatBubbleClasses(settings: ProfileSettings) {
  const userBubbleClass = USER_BUBBLE_CLASS[settings.userBubble] || USER_BUBBLE_CLASS.purple;
  const aiBubbleClass = AI_BUBBLE_CLASS[settings.aiBubble] || AI_BUBBLE_CLASS.soft;
  return { userBubbleClass, aiBubbleClass };
}
