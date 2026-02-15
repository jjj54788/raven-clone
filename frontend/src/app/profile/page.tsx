'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Bookmark,
  Check,
  ChevronRight,
  FileText,
  Layers,
  MessageCircle,
  Palette,
  Plug,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  getMe,
  getSessions,
  getUser,
  setUser,
  updateProfile,
} from '@/lib/api';
import { loadExploreBookmarks } from '@/lib/ai-explore';
import { loadModelKeys, setModelKey, type ModelKeyMap, loadTeams } from '@/lib/teams';
import {
  DEFAULT_PROFILE_STORE,
  buildProfileStoreFromApi,
  getProfileUserKey,
  loadProfileStore,
  normalizeIntegrations,
  normalizeInterests,
  normalizeSettings,
  saveProfileStore,
  type ProfileStore,
} from '@/lib/profile';

type ProfileTab = 'profile' | 'settings' | 'stats' | 'api' | 'integrations';
type ApiErrorShape = { statusCode?: number; message?: string | string[] };

type BubbleOption = {
  id: string;
  swatch: string;
  bubble: string;
};

const USER_BUBBLE_OPTIONS: BubbleOption[] = [
  { id: 'purple', swatch: 'bg-purple-600', bubble: 'bg-purple-600 text-white' },
  { id: 'blue', swatch: 'bg-blue-600', bubble: 'bg-blue-600 text-white' },
  { id: 'orange', swatch: 'bg-orange-500', bubble: 'bg-orange-500 text-white' },
  { id: 'green', swatch: 'bg-emerald-600', bubble: 'bg-emerald-600 text-white' },
  { id: 'slate', swatch: 'bg-slate-700', bubble: 'bg-slate-700 text-white' },
];

const AI_BUBBLE_OPTIONS: BubbleOption[] = [
  { id: 'soft', swatch: 'bg-white border border-gray-200', bubble: 'bg-white border border-gray-200 text-gray-700' },
  { id: 'mist', swatch: 'bg-gray-50 border border-gray-200', bubble: 'bg-gray-50 border border-gray-200 text-gray-700' },
  { id: 'sky', swatch: 'bg-blue-50 border border-blue-100', bubble: 'bg-blue-50 border border-blue-100 text-blue-900' },
  { id: 'amber', swatch: 'bg-amber-50 border border-amber-100', bubble: 'bg-amber-50 border border-amber-100 text-amber-900' },
];

const API_PROVIDERS = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'google', label: 'Google Gemini' },
  { id: 'xai', label: 'xAI (Grok)' },
  { id: 'qwen', label: 'Qwen' },
  { id: 'cohere', label: 'Cohere' },
];

function maskKey(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}****`;
  return `${trimmed.slice(0, 3)}...${trimmed.slice(-4)}`;
}

function formatJoinDate(value: string, locale: 'en' | 'zh'): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  try {
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(date);
  } catch {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return locale === 'zh' ? `${year}年${month}月` : `${year}-${month}`;
  }
}

function findBubbleOption(options: BubbleOption[], id: string) {
  return options.find((option) => option.id === id) || options[0];
}

function readApiErrorMessage(data: unknown): string | null {
  const d = data as ApiErrorShape | null;
  if (!d?.statusCode) return null;
  const msg = d.message;
  if (Array.isArray(msg)) return msg.join('; ');
  if (typeof msg === 'string') return msg;
  return 'Request failed';
}

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      className={[
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        checked ? 'bg-rose-500' : 'bg-gray-200',
        disabled ? 'opacity-60' : 'hover:opacity-90',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-4 w-4 rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  );
}

export default function ProfilePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { locale, setLocale } = useLanguage();

  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const [userKey, setUserKey] = useState('guest');
  const [user, setUserState] = useState(() => getUser());

  const [store, setStore] = useState<ProfileStore>({ ...DEFAULT_PROFILE_STORE });
  const [profileDraft, setProfileDraft] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: '',
    interests: [] as string[],
  });
  const [interestInput, setInterestInput] = useState('');
  const [profileDirty, setProfileDirty] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);

  const [modelKeys, setModelKeys] = useState<ModelKeyMap>({});
  const [apiModal, setApiModal] = useState<{ id: string; label: string } | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState('');

  const [stats, setStats] = useState({
    bookmarks: 0,
    resources: 0,
    comments: 0,
    notes: 0,
    reports: 0,
    chats: 0,
    images: 0,
    teams: 0,
  });

  const uiText = useMemo(() => {
    if (locale === 'zh') {
      return {
        title: '个人资料与设置',
        subtitle: '管理你的账户信息与个性化偏好',
        tabs: {
          profile: '个人资料',
          settings: '设置',
          stats: '统计数据',
          api: 'API 密钥',
          integrations: '集成',
        },
        profile: {
          avatar: '头像',
          avatarHint: '头像来自你的账户资料',
          basic: '基本信息',
          name: '姓名',
          email: '邮箱',
          emailHint: '邮箱不可更改',
          bio: '简介',
          interests: '研究兴趣',
          interestPlaceholder: '输入兴趣...',
          add: '添加',
          save: '保存资料',
          saved: '已保存',
          localOnly: '资料保存在本地浏览器，用于展示与个性化设置。',
        },
        settings: {
          appearance: '聊天外观',
          myBubble: '我的消息样式',
          aiBubble: 'AI 消息样式',
          preview: '预览',
          notifications: '通知偏好',
          emailUpdates: '邮件通知',
          emailHint: '接收有关活动的邮件更新',
          productUpdates: '推荐通知',
          productHint: '获取新功能与推荐更新',
          weeklySummary: '每周摘要',
          weeklyHint: '接收每周热门讨论摘要',
          appearanceSection: '外观',
          darkMode: '深色模式',
          darkHint: '在整个应用中使用深色主题',
          language: '语言',
          save: '保存设置',
          saved: '已保存',
        },
        stats: {
          cards: {
            bookmarks: '已收藏',
            resources: '已查看资源',
            comments: '评论',
            joined: '加入时间',
            notes: '笔记',
            reports: '报告',
            chats: 'AI 对话',
            images: '生成的图片',
          },
          recent: '最近活动（30 天）',
          recentHint: '过去 30 天的总活动数',
          teams: '创建的 AI 团队',
        },
        api: {
          hint: '配置自己的 API Key，可直接使用对应的模型（不计入平台额度）。',
          configured: '已配置',
          empty: '未配置',
          configure: '配置',
          update: '更新',
          remove: '移除',
          save: '保存',
          cancel: '取消',
          modalTitle: '配置 API 密钥',
          modalHint: '密钥仅保存在本地浏览器中。',
          inputPlaceholder: '粘贴你的 API Key',
        },
        integrations: {
          title: '集成',
          connect: '连接',
          connected: '已连接',
          connectNotion: '连接 Notion',
          connectDrive: '连接 Google Drive',
          connectFeishu: '绑定账号',
          more: '更多集成',
          comingSoon: '即将推出',
          notionDesc: '将 Notion 页面同步到 AI Teams Engine',
          driveDesc: '同步并管理 Google Drive 文件',
          feishuDesc: '将飞书 Wiki 与文档同步到知识库',
          feishuPlaceholder: '请输入你的飞书 Open ID',
          feishuHint: 'Open ID 可用于同步团队内的内容',
          steps: {
            notion: ['点击下方“连接 Notion”', '选择需要共享的页面', '开始同步'],
            drive: ['点击“连接 Google Drive”', '授权访问你的 Drive', '开始同步文件'],
            feishu: ['首次与机器人对话时会显示 Open ID', '或在飞书后台管理员里查看', '格式类似：ou_xxxxxxxxx'],
          },
          moreItems: ['Obsidian', 'Zotero', 'Roam Research'],
        },
      } as const;
    }

    return {
      title: 'Profile & Settings',
      subtitle: 'Manage your account info and personalization',
      tabs: {
        profile: 'Profile',
        settings: 'Settings',
        stats: 'Stats',
        api: 'API Keys',
        integrations: 'Integrations',
      },
      profile: {
        avatar: 'Avatar',
        avatarHint: 'Avatar comes from your account profile',
        basic: 'Basic Info',
        name: 'Name',
        email: 'Email',
        emailHint: 'Email cannot be changed',
        bio: 'Bio',
        interests: 'Research Interests',
        interestPlaceholder: 'Add an interest...',
        add: 'Add',
        save: 'Save Profile',
        saved: 'Saved',
        localOnly: 'Profile details are stored locally for display and personalization.',
      },
      settings: {
        appearance: 'Chat Appearance',
        myBubble: 'My Message Style',
        aiBubble: 'AI Message Style',
        preview: 'Preview',
        notifications: 'Notification Preferences',
        emailUpdates: 'Email Updates',
        emailHint: 'Get email updates about activity',
        productUpdates: 'Product Updates',
        productHint: 'Get new feature and recommendation updates',
        weeklySummary: 'Weekly Summary',
        weeklyHint: 'Receive weekly discussion highlights',
        appearanceSection: 'Appearance',
        darkMode: 'Dark Mode',
        darkHint: 'Use a dark theme across the app',
        language: 'Language',
        save: 'Save Settings',
        saved: 'Saved',
      },
      stats: {
        cards: {
          bookmarks: 'Bookmarks',
          resources: 'Viewed Resources',
          comments: 'Comments',
          joined: 'Member Since',
          notes: 'Notes',
          reports: 'Reports',
          chats: 'AI Chats',
          images: 'Images Generated',
        },
        recent: 'Recent Activity (30 days)',
        recentHint: 'Total activity in the last 30 days',
        teams: 'AI Teams Created',
      },
      api: {
        hint: 'Add your own API keys to use models directly (not counted against platform credits).',
        configured: 'Configured',
        empty: 'Not configured',
        configure: 'Configure',
        update: 'Update',
        remove: 'Remove',
        save: 'Save',
        cancel: 'Cancel',
        modalTitle: 'Configure API Key',
        modalHint: 'Keys are stored locally in your browser.',
        inputPlaceholder: 'Paste your API key',
      },
      integrations: {
        title: 'Integrations',
        connect: 'Connect',
        connected: 'Connected',
        connectNotion: 'Connect Notion',
        connectDrive: 'Connect Google Drive',
        connectFeishu: 'Bind Account',
        more: 'More Integrations',
        comingSoon: 'Coming soon',
        notionDesc: 'Sync Notion pages into AI Teams Engine',
        driveDesc: 'Sync and manage Google Drive files',
        feishuDesc: 'Sync Feishu wiki and docs into the knowledge base',
        feishuPlaceholder: 'Enter your Feishu Open ID',
        feishuHint: 'Open ID is used to sync team content',
        steps: {
          notion: ['Click “Connect Notion” below', 'Select the pages to share', 'Start syncing'],
          drive: ['Click “Connect Google Drive”', 'Grant Drive permissions', 'Start syncing files'],
          feishu: ['Find Open ID from the first bot reply', 'Or check in Feishu admin console', 'Format example: ou_xxxxxxxxx'],
        },
        moreItems: ['Obsidian', 'Zotero', 'Roam Research'],
      },
    } as const;
  }, [locale]);

  const applyUser = (data: any) => {
    if (!data?.id) return;
    const nextUser = {
      id: data.id,
      name: data.name,
      email: data.email,
      credits: data.credits,
      isAdmin: data.isAdmin,
      avatarUrl: data.avatarUrl,
      bio: data.bio,
      interests: data.interests,
      settings: data.settings,
      integrations: data.integrations,
      createdAt: data.createdAt,
    };
    setUser(nextUser);
    setUserState(nextUser);
  };

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    const currentUser = getUser();
    setUserState(currentUser);
    const key = getProfileUserKey(currentUser);
    setUserKey(key);
    setProfileError(null);
    setSettingsError(null);
    setIntegrationsError(null);

    const loaded = loadProfileStore(key);
    setStore(loaded);

    setProfileDraft({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      bio: loaded.bio || '',
      interests: loaded.interests || [],
    });
    setProfileDirty(false);
    setSettingsDirty(false);

    setModelKeys(loadModelKeys());

    const bookmarks = loadExploreBookmarks(currentUser?.id || null);
    const teams = loadTeams(currentUser?.name).length;

    const loadStats = async () => {
      let chats = 0;
      try {
        const sessions = await getSessions();
        chats = Array.isArray(sessions) ? sessions.length : 0;
      } catch {
        chats = 0;
      }
      if (cancelled) return;
      setStats((prev) => ({
        ...prev,
        bookmarks: bookmarks.length,
        chats,
        teams,
      }));
    };

    const loadRemoteProfile = async () => {
      try {
        const res = await getMe();
        const err = readApiErrorMessage(res);
        if (cancelled) return;
        if (err) {
          setProfileError(err);
          return;
        }
        const data = res as any;
        if (!data?.id) return;

        const nextStore = buildProfileStoreFromApi(data, loaded);

        setStore(nextStore);
        saveProfileStore(key, nextStore);

        if (nextStore.settings.locale && nextStore.settings.locale !== locale) {
          setLocale(nextStore.settings.locale);
        }

        setProfileDraft({
          name: data.name || '',
          email: data.email || '',
          bio: nextStore.bio,
          interests: nextStore.interests,
        });
        setProfileDirty(false);
        setSettingsDirty(false);

        applyUser(data);
      } catch (error: any) {
        if (!cancelled) {
          setProfileError(error?.message || 'Failed to load profile');
        }
      }
    };

    loadStats();
    loadRemoteProfile();

    return () => {
      cancelled = true;
    };
  }, [authReady]);

  const userBubble = findBubbleOption(USER_BUBBLE_OPTIONS, store.settings.userBubble);
  const aiBubble = findBubbleOption(AI_BUBBLE_OPTIONS, store.settings.aiBubble);

  const saveProfile = async () => {
    setProfileError(null);
    const nextName = profileDraft.name.trim() || user?.name || '';
    const nextBio = profileDraft.bio.trim();
    const nextInterests = normalizeInterests(profileDraft.interests);

    try {
      const res = await updateProfile({
        name: nextName || undefined,
        bio: nextBio,
        interests: nextInterests,
      });
      const err = readApiErrorMessage(res);
      if (err) {
        setProfileError(err);
        return;
      }

      const data = res as any;
      const resolvedBio = typeof data?.bio === 'string' ? data.bio : nextBio;
      const resolvedInterests = normalizeInterests(data?.interests ?? nextInterests);

      const nextStore: ProfileStore = {
        ...store,
        bio: resolvedBio,
        interests: resolvedInterests,
      };
      setStore(nextStore);
      saveProfileStore(userKey, nextStore);
      setProfileDraft((prev) => ({
        ...prev,
        name: data?.name || nextName,
        email: data?.email || prev.email,
        bio: resolvedBio,
        interests: resolvedInterests,
      }));
      setProfileDirty(false);
      applyUser(data);
    } catch (error: any) {
      setProfileError(error?.message || 'Failed to save profile');
    }
  };

  const saveSettings = async () => {
    setSettingsError(null);
    const normalizedSettings = normalizeSettings(store.settings);

    try {
      const res = await updateProfile({ settings: normalizedSettings });
      const err = readApiErrorMessage(res);
      if (err) {
        setSettingsError(err);
        return;
      }

      const data = res as any;
      const resolvedSettings = normalizeSettings(data?.settings ?? normalizedSettings);
      const nextStore: ProfileStore = { ...store, settings: resolvedSettings };
      setStore(nextStore);
      saveProfileStore(userKey, nextStore);
      setSettingsDirty(false);
      if (resolvedSettings.locale && resolvedSettings.locale !== locale) {
        setLocale(resolvedSettings.locale);
      }
      applyUser(data);
    } catch (error: any) {
      setSettingsError(error?.message || 'Failed to save settings');
    }
  };

  const updateStoreSettings = (nextSettings: ProfileStore['settings']) => {
    setStore((prev) => ({
      ...prev,
      settings: nextSettings,
    }));
    setSettingsDirty(true);
    if (settingsError) setSettingsError(null);
  };

  const updateIntegrations = (nextIntegrations: ProfileStore['integrations']) => {
    const nextStore: ProfileStore = { ...store, integrations: nextIntegrations };
    setStore(nextStore);
    saveProfileStore(userKey, nextStore);
    if (integrationsError) setIntegrationsError(null);
  };

  const persistIntegrations = async (nextIntegrations: ProfileStore['integrations']) => {
    setIntegrationsError(null);
    const normalized = normalizeIntegrations(nextIntegrations);
    try {
      const res = await updateProfile({ integrations: normalized });
      const err = readApiErrorMessage(res);
      if (err) {
        setIntegrationsError(err);
        return;
      }
      const data = res as any;
      const resolvedIntegrations = normalizeIntegrations(data?.integrations ?? normalized);
      const nextStore: ProfileStore = { ...store, integrations: resolvedIntegrations };
      setStore(nextStore);
      saveProfileStore(userKey, nextStore);
      applyUser(data);
    } catch (error: any) {
      setIntegrationsError(error?.message || 'Failed to save integrations');
    }
  };

  const addInterest = () => {
    const trimmed = interestInput.trim();
    if (!trimmed) return;
    setProfileDraft((prev) => ({
      ...prev,
      interests: normalizeInterests([...prev.interests, trimmed]),
    }));
    setInterestInput('');
    setProfileDirty(true);
  };

  const removeInterest = (item: string) => {
    setProfileDraft((prev) => ({
      ...prev,
      interests: prev.interests.filter((i) => i !== item),
    }));
    setProfileDirty(true);
  };

  const openApiModal = (provider: { id: string; label: string }) => {
    const existing = modelKeys[provider.id] || '';
    setApiModal(provider);
    setApiKeyDraft(existing);
  };

  const saveApiKey = () => {
    if (!apiModal) return;
    setModelKey(apiModal.id, apiKeyDraft);
    const next = loadModelKeys();
    setModelKeys(next);
    setApiModal(null);
    setApiKeyDraft('');
  };

  const removeApiKey = (providerId: string) => {
    setModelKey(providerId, '');
    setModelKeys(loadModelKeys());
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
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-5 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-sm">
                    <User size={18} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-xl font-semibold text-gray-900">{uiText.title}</h1>
                    <p className="mt-0.5 text-sm text-gray-500">{uiText.subtitle}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {(Object.keys(uiText.tabs) as ProfileTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={[
                    'relative pb-2 text-sm font-semibold transition-colors',
                    activeTab === tab ? 'text-purple-700' : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                >
                  {uiText.tabs[tab]}
                  {activeTab === tab && <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-purple-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            {activeTab === 'profile' && (
              <>
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-900">{uiText.profile.avatar}</h2>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-lg font-semibold text-purple-700">
                      {user?.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user?.name || 'User'}
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        (profileDraft.name || 'U').slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{profileDraft.name || user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500">{uiText.profile.avatarHint}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-900">{uiText.profile.basic}</h2>
                  <div className="mt-4 grid grid-cols-1 gap-4">
                    <label className="text-sm text-gray-700">
                      {uiText.profile.name}
                      <input
                        value={profileDraft.name}
                        onChange={(e) => {
                          setProfileDraft((prev) => ({ ...prev, name: e.target.value }));
                          setProfileDirty(true);
                        }}
                        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                      />
                    </label>
                    <label className="text-sm text-gray-700">
                      {uiText.profile.email}
                      <input
                        value={profileDraft.email}
                        disabled
                        className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400"
                      />
                      <span className="mt-1 block text-xs text-gray-400">{uiText.profile.emailHint}</span>
                    </label>
                    <label className="text-sm text-gray-700">
                      {uiText.profile.bio}
                      <textarea
                        value={profileDraft.bio}
                        onChange={(e) => {
                          setProfileDraft((prev) => ({ ...prev, bio: e.target.value }));
                          setProfileDirty(true);
                        }}
                        rows={3}
                        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p className="text-xs text-gray-400">{uiText.profile.localOnly}</p>
                    <button
                      type="button"
                      onClick={saveProfile}
                      className="ml-auto rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                    >
                      {profileDirty ? uiText.profile.save : uiText.profile.saved}
                    </button>
                  </div>
                  {profileError && (
                    <p className="mt-2 text-xs text-rose-600">{profileError}</p>
                  )}
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-900">{uiText.profile.interests}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profileDraft.interests.length === 0 ? (
                      <span className="text-xs text-gray-400">{locale === 'zh' ? '暂无兴趣标签' : 'No interests yet'}</span>
                    ) : (
                      profileDraft.interests.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => removeInterest(item)}
                            className="rounded-full px-1 text-gray-400 hover:text-gray-600"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={interestInput}
                      onChange={(e) => setInterestInput(e.target.value)}
                      placeholder={uiText.profile.interestPlaceholder}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                    />
                    <button
                      type="button"
                      onClick={addInterest}
                      className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                    >
                      {uiText.profile.add}
                    </button>
                  </div>
                </section>
              </>
            )}
            {activeTab === 'settings' && (
              <>
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900">{uiText.settings.appearance}</h2>
                    <Palette size={16} className="text-purple-500" />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-500">{uiText.settings.myBubble}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {USER_BUBBLE_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => updateStoreSettings({ ...store.settings, userBubble: option.id })}
                            className={[
                              'relative flex h-9 w-9 items-center justify-center rounded-full border',
                              option.id === store.settings.userBubble ? 'border-purple-400' : 'border-gray-200',
                            ].join(' ')}
                          >
                            <span className={`h-7 w-7 rounded-full ${option.swatch}`} />
                            {option.id === store.settings.userBubble && (
                              <span className="absolute inset-0 flex items-center justify-center text-white">
                                <Check size={14} />
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500">{uiText.settings.aiBubble}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {AI_BUBBLE_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => updateStoreSettings({ ...store.settings, aiBubble: option.id })}
                            className={[
                              'relative flex h-9 w-9 items-center justify-center rounded-full border',
                              option.id === store.settings.aiBubble ? 'border-purple-400' : 'border-gray-200',
                            ].join(' ')}
                          >
                            <span className={`h-7 w-7 rounded-full ${option.swatch}`} />
                            {option.id === store.settings.aiBubble && (
                              <span className="absolute inset-0 flex items-center justify-center text-gray-700">
                                <Check size={14} />
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-semibold text-gray-500">{uiText.settings.preview}</p>
                    <div className="mt-3 flex flex-col gap-3">
                      <div className={`ml-auto max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm ${userBubble.bubble}`}>
                        {locale === 'zh' ? '如何自定义聊天外观？' : 'How do I customize my chat appearance?'}
                      </div>
                      <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm ${aiBubble.bubble}`}>
                        {locale === 'zh'
                          ? '你可以在上方选择不同的颜色样式，设置会在本地保存。'
                          : 'Pick colors above and your choices will be saved locally.'}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900">{uiText.settings.notifications}</h2>
                    <Bell size={16} className="text-rose-500" />
                  </div>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{uiText.settings.emailUpdates}</p>
                        <p className="text-xs text-gray-500">{uiText.settings.emailHint}</p>
                      </div>
                      <Toggle
                        checked={store.settings.notifyEmail}
                        onChange={(next) => updateStoreSettings({ ...store.settings, notifyEmail: next })}
                        label={uiText.settings.emailUpdates}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{uiText.settings.productUpdates}</p>
                        <p className="text-xs text-gray-500">{uiText.settings.productHint}</p>
                      </div>
                      <Toggle
                        checked={store.settings.notifyProduct}
                        onChange={(next) => updateStoreSettings({ ...store.settings, notifyProduct: next })}
                        label={uiText.settings.productUpdates}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{uiText.settings.weeklySummary}</p>
                        <p className="text-xs text-gray-500">{uiText.settings.weeklyHint}</p>
                      </div>
                      <Toggle
                        checked={store.settings.notifyWeekly}
                        onChange={(next) => updateStoreSettings({ ...store.settings, notifyWeekly: next })}
                        label={uiText.settings.weeklySummary}
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900">{uiText.settings.appearanceSection}</h2>
                    <Settings size={16} className="text-gray-500" />
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{uiText.settings.darkMode}</p>
                        <p className="text-xs text-gray-500">{uiText.settings.darkHint}</p>
                      </div>
                      <Toggle
                        checked={store.settings.darkMode}
                        onChange={(next) => updateStoreSettings({ ...store.settings, darkMode: next })}
                        label={uiText.settings.darkMode}
                      />
                    </div>
                    <label className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      <span className="block text-sm font-medium text-gray-900">{uiText.settings.language}</span>
                      <select
                        value={locale}
                        onChange={(e) => {
                          const nextLocale = e.target.value as 'en' | 'zh';
                          setLocale(nextLocale);
                          updateStoreSettings({ ...store.settings, locale: nextLocale });
                        }}
                        className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="zh">中文</option>
                        <option value="en">English</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={saveSettings}
                      className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                    >
                      {settingsDirty ? uiText.settings.save : uiText.settings.saved}
                    </button>
                  </div>
                  {settingsError && (
                    <p className="mt-2 text-xs text-rose-600">{settingsError}</p>
                  )}
                </section>
              </>
            )}
            {activeTab === 'stats' && (
              <>
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">{uiText.stats.cards.bookmarks}</p>
                      <Bookmark size={14} className="text-purple-500" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-gray-900">{stats.bookmarks}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">{uiText.stats.cards.resources}</p>
                      <Layers size={14} className="text-blue-500" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-gray-900">{stats.resources}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">{uiText.stats.cards.comments}</p>
                      <MessageCircle size={14} className="text-emerald-500" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-gray-900">{stats.comments}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">{uiText.stats.cards.joined}</p>
                      <ShieldCheck size={14} className="text-amber-500" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-gray-900">
                      {formatJoinDate(store.joinedAt, locale)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">{uiText.stats.cards.notes}</p>
                      <FileText size={14} className="text-purple-500" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-gray-900">{stats.notes}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">{uiText.stats.cards.reports}</p>
                      <BarChart3 size={14} className="text-indigo-500" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-gray-900">{stats.reports}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">{uiText.stats.cards.chats}</p>
                      <Sparkles size={14} className="text-sky-500" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-gray-900">{stats.chats}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">{uiText.stats.cards.images}</p>
                      <Layers size={14} className="text-rose-500" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-gray-900">{stats.images}</p>
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{uiText.stats.recent}</p>
                        <p className="text-xs text-gray-500">{uiText.stats.recentHint}</p>
                      </div>
                      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">0</span>
                    </div>
                    <div className="mt-6 flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                        <BarChart3 size={18} />
                      </div>
                      <div className="text-sm text-gray-500">
                        {locale === 'zh' ? '暂无活动记录' : 'No activity recorded yet'}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{uiText.stats.teams}</p>
                        <p className="text-xs text-gray-500">{locale === 'zh' ? '你创建的团队总数' : 'Total teams created'}</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {stats.teams}
                      </span>
                    </div>
                    <div className="mt-6 flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Users size={18} />
                      </div>
                      <div className="text-sm text-gray-500">
                        {locale === 'zh' ? '团队数据来自本地缓存' : 'Team data is loaded from local cache'}
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}
            {activeTab === 'api' && (
              <>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  {uiText.api.hint}
                </div>

                <section className="space-y-3">
                  {API_PROVIDERS.map((provider) => {
                    const key = modelKeys[provider.id] || '';
                    const configured = !!key;
                    return (
                      <div key={provider.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-900 text-sm font-semibold text-white">
                              {provider.label.slice(0, 1)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{provider.label}</p>
                              <p className="text-xs text-gray-500">
                                {configured ? `${uiText.api.configured} · ${maskKey(key)}` : uiText.api.empty}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {configured && (
                              <button
                                type="button"
                                onClick={() => removeApiKey(provider.id)}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                              >
                                {uiText.api.remove}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openApiModal(provider)}
                              className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-purple-700"
                            >
                              {configured ? uiText.api.update : uiText.api.configure}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </section>
              </>
            )}
            {activeTab === 'integrations' && (
              <>
                {integrationsError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {integrationsError}
                  </div>
                )}
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">Notion {uiText.integrations.title}</h2>
                      <p className="text-xs text-gray-500">{uiText.integrations.notionDesc}</p>
                    </div>
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                      {store.integrations.notion ? uiText.integrations.connected : uiText.integrations.comingSoon}
                    </span>
                  </div>
                  <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                    <ol className="list-decimal space-y-1 pl-4">
                      {uiText.integrations.steps.notion.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...store.integrations, notion: !store.integrations.notion };
                      updateIntegrations(next);
                      void persistIntegrations(next);
                    }}
                    className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                  >
                    {uiText.integrations.connectNotion}
                  </button>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">Google Drive</h2>
                      <p className="text-xs text-gray-500">{uiText.integrations.driveDesc}</p>
                    </div>
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                      {store.integrations.drive ? uiText.integrations.connected : uiText.integrations.comingSoon}
                    </span>
                  </div>
                  <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                    <ol className="list-decimal space-y-1 pl-4">
                      {uiText.integrations.steps.drive.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...store.integrations, drive: !store.integrations.drive };
                      updateIntegrations(next);
                      void persistIntegrations(next);
                    }}
                    className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    {uiText.integrations.connectDrive}
                  </button>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">{locale === 'zh' ? '飞书集成' : 'Feishu Integration'}</h2>
                      <p className="text-xs text-gray-500">{uiText.integrations.feishuDesc}</p>
                    </div>
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                      {store.integrations.feishu ? uiText.integrations.connected : uiText.integrations.comingSoon}
                    </span>
                  </div>

                  <div className="mt-4">
                    <label className="text-xs font-semibold text-gray-600">{locale === 'zh' ? '飞书 Open ID' : 'Feishu Open ID'}</label>
                    <input
                      value={store.integrations.feishuOpenId}
                      onChange={(e) => updateIntegrations({ ...store.integrations, feishuOpenId: e.target.value })}
                      placeholder={uiText.integrations.feishuPlaceholder}
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
                    />
                    <p className="mt-1 text-xs text-gray-500">{uiText.integrations.feishuHint}</p>
                  </div>
                  <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                    <ol className="list-decimal space-y-1 pl-4">
                      {uiText.integrations.steps.feishu.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...store.integrations, feishu: !store.integrations.feishu };
                      updateIntegrations(next);
                      void persistIntegrations(next);
                    }}
                    className="mt-4 w-full rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-600"
                  >
                    {uiText.integrations.connectFeishu}
                  </button>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900">{uiText.integrations.more}</h2>
                    <Plug size={16} className="text-gray-500" />
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {uiText.integrations.moreItems.map((item) => (
                      <div key={item} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        <span>{item}</span>
                        <span className="text-xs text-gray-400">{uiText.integrations.comingSoon}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </main>
      {apiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{uiText.api.modalTitle}</h3>
                <p className="text-xs text-gray-500">{uiText.api.modalHint}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setApiModal(null);
                  setApiKeyDraft('');
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                aria-label="Close"
              >
                <ChevronRight size={18} className="rotate-180" />
              </button>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">{apiModal.label}</label>
              <input
                value={apiKeyDraft}
                onChange={(e) => setApiKeyDraft(e.target.value)}
                placeholder={uiText.api.inputPlaceholder}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setApiModal(null);
                  setApiKeyDraft('');
                }}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {uiText.api.cancel}
              </button>
              <button
                type="button"
                onClick={saveApiKey}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
              >
                {uiText.api.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
