'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  MessageSquare,
  ServerCog,
  Sparkles,
  Tag,
  Workflow,
  Zap,
} from 'lucide-react';
import AgentOrgChart from '@/components/AgentOrgChart';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  fetchOpenClawBridgeStatus,
  listKnowledgeNotes,
  type KnowledgeNote,
  type OpenClawBridgeStatus,
  type DebateAgent,
} from '@/lib/api';

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

type TemplateConfig = {
  id: string;
  titleKey: string;
  descKey: string;
  tags: string[];
  icon: IconComponent;
  accent: string;
};

type StepConfig = {
  id: string;
  titleKey: string;
  descKey: string;
  icon: IconComponent;
};

type OpenClawState = {
  connectionName: string;
  proxyUrl: string;
  webhookHost: string;
  webhookPort: string;
  webhookPath: string;
  deviceType: 'ipad' | 'mac';
  channelEnabled: boolean;
  enabledTemplates: string[];
};

type ActiveTab = 'setup' | 'monitor';

const TEMPLATE_COLORS: Record<string, string> = {
  support: '#0EA5E9',
  sales: '#F59E0B',
  ops: '#10B981',
  knowledge: '#8B5CF6',
};

const STORAGE_KEY = 'gewu_openclaw_state_v1';
const DEFAULT_WEBHOOK_PORT = '18790';
const DEFAULT_WEBHOOK_PATH = '/webhook/wechat';
const DEFAULT_DEVICE_TYPE: OpenClawState['deviceType'] = 'ipad';

const TEMPLATE_ITEMS: TemplateConfig[] = [
  {
    id: 'support',
    titleKey: 'openclaw.templates.support.title',
    descKey: 'openclaw.templates.support.desc',
    tags: ['openclaw.templates.support.tag1', 'openclaw.templates.support.tag2'],
    icon: MessageSquare,
    accent: 'from-sky-500 to-blue-600',
  },
  {
    id: 'sales',
    titleKey: 'openclaw.templates.sales.title',
    descKey: 'openclaw.templates.sales.desc',
    tags: ['openclaw.templates.sales.tag1', 'openclaw.templates.sales.tag2'],
    icon: Zap,
    accent: 'from-amber-500 to-orange-600',
  },
  {
    id: 'ops',
    titleKey: 'openclaw.templates.ops.title',
    descKey: 'openclaw.templates.ops.desc',
    tags: ['openclaw.templates.ops.tag1', 'openclaw.templates.ops.tag2'],
    icon: Workflow,
    accent: 'from-emerald-500 to-green-600',
  },
  {
    id: 'knowledge',
    titleKey: 'openclaw.templates.knowledge.title',
    descKey: 'openclaw.templates.knowledge.desc',
    tags: ['openclaw.templates.knowledge.tag1', 'openclaw.templates.knowledge.tag2'],
    icon: Sparkles,
    accent: 'from-violet-500 to-purple-600',
  },
];

const QUICK_STEPS: StepConfig[] = [
  {
    id: 'connect',
    titleKey: 'openclaw.quickstart.step1.title',
    descKey: 'openclaw.quickstart.step1.desc',
    icon: Link2,
  },
  {
    id: 'assist',
    titleKey: 'openclaw.quickstart.step2.title',
    descKey: 'openclaw.quickstart.step2.desc',
    icon: Bot,
  },
  {
    id: 'launch',
    titleKey: 'openclaw.quickstart.step3.title',
    descKey: 'openclaw.quickstart.step3.desc',
    icon: Workflow,
  },
];

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: IconComponent;
  accent: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
        {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
      </div>
    </div>
  );
}

function normalizePort(input: string): number {
  const parsed = Number.parseInt(input, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return Number(DEFAULT_WEBHOOK_PORT);
  return parsed;
}

export default function OpenClawPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { userName, authReady } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<ActiveTab>('setup');
  const [bridgeStatus, setBridgeStatus] = useState<OpenClawBridgeStatus | null>(null);
  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [recentNotes, setRecentNotes] = useState<KnowledgeNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const monitorFetchedRef = useRef(false);

  const [loaded, setLoaded] = useState(false);
  const [connectionName, setConnectionName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [webhookHost, setWebhookHost] = useState('');
  const [webhookPort, setWebhookPort] = useState(DEFAULT_WEBHOOK_PORT);
  const [webhookPath, setWebhookPath] = useState(DEFAULT_WEBHOOK_PATH);
  const [deviceType, setDeviceType] = useState<OpenClawState['deviceType']>(DEFAULT_DEVICE_TYPE);
  const [channelEnabled, setChannelEnabled] = useState(false);
  const [enabledTemplates, setEnabledTemplates] = useState<string[]>([]);
  const [configCopied, setConfigCopied] = useState(false);

  useEffect(() => {
    if (activeTab !== 'monitor' || !authReady) return;
    if (monitorFetchedRef.current) return;
    monitorFetchedRef.current = true;
    let cancelled = false;

    setBridgeLoading(true);
    fetchOpenClawBridgeStatus()
      .then((s) => { if (!cancelled) setBridgeStatus(s); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setBridgeLoading(false); });

    setNotesLoading(true);
    listKnowledgeNotes({ take: 5 })
      .then((notes) => { if (!cancelled) setRecentNotes(notes); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setNotesLoading(false); });

    return () => { cancelled = true; };
  }, [activeTab, authReady]);

  useEffect(() => {
    if (!authReady) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OpenClawState;
        if (typeof parsed.connectionName === 'string') {
          setConnectionName(parsed.connectionName);
        }
        if (typeof parsed.proxyUrl === 'string') {
          setProxyUrl(parsed.proxyUrl);
        }
        if (typeof parsed.webhookHost === 'string') {
          setWebhookHost(parsed.webhookHost);
        }
        if (typeof parsed.webhookPort === 'string') {
          setWebhookPort(parsed.webhookPort);
        }
        if (typeof parsed.webhookPath === 'string') {
          setWebhookPath(parsed.webhookPath);
        }
        if (parsed.deviceType === 'ipad' || parsed.deviceType === 'mac') {
          setDeviceType(parsed.deviceType);
        }
        if (typeof parsed.channelEnabled === 'boolean') {
          setChannelEnabled(parsed.channelEnabled);
        }
        if (Array.isArray(parsed.enabledTemplates)) {
          setEnabledTemplates(parsed.enabledTemplates.filter((id) => typeof id === 'string'));
        }
      }
    } catch {
      // Ignore invalid cached state.
    }
    setLoaded(true);
  }, [authReady]);

  useEffect(() => {
    if (!authReady || !loaded) return;
    const payload: OpenClawState = {
      connectionName,
      proxyUrl,
      webhookHost,
      webhookPort,
      webhookPath,
      deviceType,
      channelEnabled,
      enabledTemplates,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [authReady, loaded, connectionName, proxyUrl, webhookHost, webhookPort, webhookPath, deviceType, channelEnabled, enabledTemplates]);

  const isConfigured = apiKey.trim().length > 0 && proxyUrl.trim().length > 0;
  const isConnected = channelEnabled && isConfigured;
  const assistantCount = enabledTemplates.length;
  const automationCount = isConnected ? enabledTemplates.length : 0;
  const channelCount = isConnected ? 1 : 0;

  const enabledTemplateItems = useMemo(
    () => TEMPLATE_ITEMS.filter((item) => enabledTemplates.includes(item.id)),
    [enabledTemplates],
  );

  const templateAgents = useMemo((): DebateAgent[] => (
    enabledTemplateItems.map((item) => ({
      id: item.id,
      name: t(item.titleKey).slice(0, 8),
      profile: t(item.descKey).slice(0, 36),
      color: TEMPLATE_COLORS[item.id] ?? '#6366F1',
      category: 'SPECIALIST' as const,
    }))
  ), [enabledTemplateItems, t]);

  const configPreview = useMemo(() => {
    const safeApiKey = apiKey.trim() || 'wc_live_xxxxxxxxxxxxxxxx';
    const safeProxyUrl = proxyUrl.trim() || 'http://your-proxy:3000';
    const safeWebhookHost = webhookHost.trim() || '1.2.3.4';
    const safeWebhookPath = webhookPath.trim() || DEFAULT_WEBHOOK_PATH;
    const portValue = normalizePort(webhookPort);
    const accountKey = connectionName.trim();

    const lines = ['channels:', '  wechat:', `    enabled: ${channelEnabled ? 'true' : 'false'}`];

    if (accountKey) {
      lines.push(`    proxyUrl: "${safeProxyUrl}"`);
      lines.push(`    webhookPort: ${portValue}`);
      lines.push(`    webhookPath: "${safeWebhookPath}"`);
      lines.push(`    deviceType: "${deviceType}"`);
      lines.push('    accounts:');
      lines.push(`      ${accountKey}:`);
      lines.push(`        apiKey: "${safeApiKey}"`);
      lines.push(`        webhookHost: "${safeWebhookHost}"`);
    } else {
      lines.push(`    apiKey: "${safeApiKey}"`);
      lines.push(`    proxyUrl: "${safeProxyUrl}"`);
      lines.push(`    webhookHost: "${safeWebhookHost}"`);
      lines.push(`    webhookPort: ${portValue}`);
      lines.push(`    webhookPath: "${safeWebhookPath}"`);
      lines.push(`    deviceType: "${deviceType}"`);
    }

    return lines.join('\n');
  }, [apiKey, proxyUrl, webhookHost, webhookPort, webhookPath, deviceType, connectionName, channelEnabled]);

  const handleConnect = () => {
    if (!isConfigured) return;
    setChannelEnabled(true);
  };

  const handleDisconnect = () => {
    setChannelEnabled(false);
  };

  const toggleTemplate = (id: string) => {
    setEnabledTemplates((prev) => (
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    ));
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCopyConfig = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(configPreview);
      setConfigCopied(true);
      window.setTimeout(() => setConfigCopied(false), 1500);
    } catch {
      // Ignore clipboard errors.
    }
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
          <div className="mx-auto flex w-full max-w-6xl items-start justify-between gap-6 px-5 py-4 sm:px-8">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                  <Bot size={16} />
                </span>
                <h1 className="text-lg font-semibold text-gray-900">{t('openclaw.title')}</h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">{t('openclaw.subtitle')}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {activeTab === 'setup' && (
                <>
                  <button
                    type="button"
                    onClick={() => scrollToSection('openclaw-connection')}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
                  >
                    {t('openclaw.primaryAction')}
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection('openclaw-templates')}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                  >
                    {t('openclaw.secondaryAction')}
                  </button>
                </>
              )}
            </div>
          </div>
          {/* Tab bar */}
          <div className="mx-auto flex w-full max-w-6xl px-5 sm:px-8">
            {(['setup', 'monitor'] as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                  activeTab === tab
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t(`openclaw.tab.${tab}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Monitor Tab ─────────────────────────────────────────────── */}
          {activeTab === 'monitor' && (
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 pb-12 pt-6 sm:px-8">
              {/* Status cards */}
              <section className="grid gap-4 sm:grid-cols-3">
                {/* Bot config status */}
                <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    <Bot size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('openclaw.monitor.status.botConfig')}</p>
                    <p className={`mt-1 text-base font-semibold ${isConfigured ? 'text-emerald-700' : 'text-gray-700'}`}>
                      {isConfigured ? t('openclaw.monitor.status.botConfigured') : t('openclaw.monitor.status.botNotConfigured')}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {isConfigured ? t('openclaw.monitor.status.botConfigHint') : t('openclaw.monitor.status.botNotConfigHint')}
                    </p>
                  </div>
                </div>

                {/* Bridge status */}
                <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${bridgeStatus?.bridgeConfigured ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                    <ServerCog size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('openclaw.monitor.status.bridge')}</p>
                    <p className={`mt-1 text-base font-semibold ${bridgeStatus?.bridgeConfigured ? 'text-purple-700' : 'text-gray-700'}`}>
                      {bridgeLoading
                        ? t('openclaw.monitor.status.loading')
                        : bridgeStatus?.bridgeConfigured
                          ? t('openclaw.monitor.status.bridgeConfigured')
                          : t('openclaw.monitor.status.bridgeNotConfigured')}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {bridgeStatus?.bridgeConfigured ? t('openclaw.monitor.status.bridgeHint') : t('openclaw.monitor.status.bridgeNotHint')}
                    </p>
                  </div>
                </div>

                {/* Activity */}
                <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <Activity size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('openclaw.monitor.status.activity')}</p>
                    <p className="mt-1 text-base font-semibold text-gray-900">
                      {notesLoading ? '…' : recentNotes.length > 0 ? `${recentNotes.length}+` : '0'}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">{t('openclaw.monitor.status.activityHint')}</p>
                  </div>
                </div>
              </section>

              {/* Agent Network */}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                    <Workflow size={16} />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{t('openclaw.monitor.agents.title')}</h2>
                    <p className="text-sm text-gray-500">{t('openclaw.monitor.agents.subtitle')}</p>
                  </div>
                </div>
                <div className="mt-4">
                  {templateAgents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center">
                      <Bot size={28} className="text-gray-300" />
                      <p className="text-sm font-medium text-gray-500">{t('openclaw.monitor.agents.noAgents')}</p>
                      <p className="text-xs text-gray-400">{t('openclaw.monitor.agents.noAgentsHint')}</p>
                    </div>
                  ) : (
                    <AgentOrgChart agents={templateAgents} leaderId={templateAgents[0]?.id} height={280} />
                  )}
                </div>
              </section>

              {/* Recent Notes */}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                      <Sparkles size={16} />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">{t('openclaw.monitor.notes.title')}</h2>
                      <p className="text-sm text-gray-500">{t('openclaw.monitor.notes.subtitle')}</p>
                    </div>
                  </div>
                  <a
                    href="/my-library"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                  >
                    <ExternalLink size={12} />
                    {t('openclaw.monitor.notes.viewAll')}
                  </a>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {notesLoading ? (
                    <div className="py-8 text-center text-sm text-gray-400">{t('openclaw.monitor.status.loading')}</div>
                  ) : recentNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
                      <Sparkles size={24} className="text-gray-300" />
                      <p className="text-sm font-medium text-gray-500">{t('openclaw.monitor.notes.empty')}</p>
                      <p className="text-xs text-gray-400">{t('openclaw.monitor.notes.emptyHint')}</p>
                    </div>
                  ) : (
                    recentNotes.map((note) => (
                      <div key={note.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-1 text-sm font-semibold text-gray-900">{note.title}</p>
                          <span className="shrink-0 text-[11px] text-gray-400">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">{note.content}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {note.source && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                              <Activity size={10} />
                              {note.source}
                            </span>
                          )}
                          {note.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600">
                              <Tag size={9} />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ── Setup Tab ───────────────────────────────────────────────── */}
          {activeTab === 'setup' && (
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 pb-12 pt-6 sm:px-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500">
                <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-purple-700">
                  {t('openclaw.badge.wechat')}
                </span>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
                  {t('openclaw.badge.assistants')}
                </span>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
                  {t('openclaw.badge.automation')}
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  label={t('openclaw.stats.channels')}
                  value={channelCount}
                  hint={isConnected ? t('openclaw.stats.connected') : t('openclaw.stats.disconnected')}
                  icon={Link2}
                  accent="from-sky-500 to-blue-600"
                />
                <StatCard
                  label={t('openclaw.stats.assistants')}
                  value={assistantCount}
                  hint={assistantCount > 0 ? t('openclaw.templates.active') : t('openclaw.templates.emptyTitle')}
                  icon={Bot}
                  accent="from-emerald-500 to-green-600"
                />
                <StatCard
                  label={t('openclaw.stats.automations')}
                  value={automationCount}
                  hint={automationCount > 0 ? t('openclaw.templates.active') : t('openclaw.templates.emptyDesc')}
                  icon={Workflow}
                  accent="from-amber-500 to-orange-600"
                />
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
              <div
                id="openclaw-connection"
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                      <Link2 size={18} />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">{t('openclaw.connection.title')}</h2>
                      <p className="mt-1 text-sm text-gray-500">{t('openclaw.connection.desc')}</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    isConnected
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}
                  >
                    {isConnected ? t('openclaw.connection.connected') : t('openclaw.connection.disconnected')}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {t('openclaw.connection.accountLabel')}
                    </label>
                    <input
                      value={connectionName}
                      onChange={(event) => setConnectionName(event.target.value)}
                      placeholder={t('openclaw.connection.placeholder')}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {t('openclaw.connection.apiKey')}
                    </label>
                    <input
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      placeholder="wc_live_xxxxxxxxxxxxxxxx"
                      type="password"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                    <p className="text-[11px] text-gray-500">{t('openclaw.connection.apiKeyHint')}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {t('openclaw.connection.proxyUrl')}
                    </label>
                    <input
                      value={proxyUrl}
                      onChange={(event) => setProxyUrl(event.target.value)}
                      placeholder="http://your-proxy:3000"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {t('openclaw.connection.webhookHost')}
                    </label>
                    <input
                      value={webhookHost}
                      onChange={(event) => setWebhookHost(event.target.value)}
                      placeholder="1.2.3.4"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {t('openclaw.connection.webhookPort')}
                    </label>
                    <input
                      value={webhookPort}
                      onChange={(event) => setWebhookPort(event.target.value)}
                      inputMode="numeric"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {t('openclaw.connection.webhookPath')}
                    </label>
                    <input
                      value={webhookPath}
                      onChange={(event) => setWebhookPath(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {t('openclaw.connection.deviceType')}
                    </label>
                    <select
                      value={deviceType}
                      onChange={(event) => setDeviceType(event.target.value as OpenClawState['deviceType'])}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    >
                      <option value="ipad">{t('openclaw.connection.deviceTypeIpad')}</option>
                      <option value="mac">{t('openclaw.connection.deviceTypeMac')}</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={!isConfigured}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                      isConfigured
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-purple-300'
                    }`}
                  >
                    {t('openclaw.connection.connect')}
                  </button>
                  {channelEnabled && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                    >
                      {t('openclaw.connection.disconnect')}
                    </button>
                  )}
                  {isConnected && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      <CheckCircle2 size={16} />
                      <span>
                        {t('openclaw.connection.saved')} {connectionName || 'main'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{t('openclaw.connection.previewTitle')}</h3>
                      <p className="mt-1 text-xs text-gray-500">{t('openclaw.connection.helper')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyConfig}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                    >
                      <Copy size={14} />
                      {configCopied ? t('openclaw.connection.copied') : t('openclaw.connection.copyConfig')}
                    </button>
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-white/70 bg-white px-3 py-3 text-xs text-gray-700">
                    {configPreview}
                  </pre>
                  <div className="mt-3 rounded-xl border border-white/70 bg-white px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {t('openclaw.connection.noteTitle')}
                    </p>
                    <ul className="mt-2 flex flex-col gap-1 text-xs text-gray-600">
                      <li>{t('openclaw.connection.noteApiKey')}</li>
                      <li>{t('openclaw.connection.noteWebhook')}</li>
                      <li>{t('openclaw.connection.noteQr')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                    <Sparkles size={16} />
                  </span>
                  <h2 className="text-base font-semibold text-gray-900">{t('openclaw.quickstart.title')}</h2>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {QUICK_STEPS.map((step, index) => (
                    <div
                      key={step.id}
                      className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-gray-700 shadow-sm">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <step.icon size={14} className="text-purple-600" />
                          <p className="text-sm font-semibold text-gray-900">{t(step.titleKey)}</p>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{t(step.descKey)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section
              id="openclaw-templates"
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{t('openclaw.templates.title')}</h2>
                  <p className="mt-1 text-sm text-gray-500">{t('openclaw.templates.subtitle')}</p>
                </div>
                <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                  {assistantCount} {t('openclaw.templates.active')}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {TEMPLATE_ITEMS.map((item) => {
                  const enabled = enabledTemplates.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`flex h-full flex-col rounded-2xl border p-4 transition ${
                        enabled
                          ? 'border-purple-200 bg-purple-50/60'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-white`}>
                          <item.icon size={18} />
                        </span>
                        {enabled && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-600/10 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                            <CheckCircle2 size={12} />
                            {t('openclaw.templates.active')}
                          </span>
                        )}
                      </div>
                      <div className="mt-3">
                        <h3 className="text-sm font-semibold text-gray-900">{t(item.titleKey)}</h3>
                        <p className="mt-1 text-xs text-gray-500">{t(item.descKey)}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                          >
                            {t(tag)}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleTemplate(item.id)}
                        className={`mt-4 w-full rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                          enabled
                            ? 'border-purple-200 bg-white text-purple-700 hover:bg-purple-50'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {enabled ? t('openclaw.templates.disable') : t('openclaw.templates.enable')}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-purple-600 shadow-sm">
                    <Bot size={14} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t('openclaw.templates.active')}</p>
                    <p className="text-xs text-gray-500">{t('openclaw.templates.subtitle')}</p>
                  </div>
                </div>
                {enabledTemplateItems.length === 0 ? (
                  <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-white px-3 py-4 text-sm text-gray-500">
                    <p className="font-medium text-gray-700">{t('openclaw.templates.emptyTitle')}</p>
                    <p className="mt-1 text-xs text-gray-500">{t('openclaw.templates.emptyDesc')}</p>
                  </div>
                ) : (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {enabledTemplateItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-white/60 bg-white px-3 py-2 text-sm text-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <item.icon size={14} className="text-purple-600" />
                          <span className="font-medium">{t(item.titleKey)}</span>
                        </div>
                        <span className="text-xs text-gray-400">{t('openclaw.templates.active')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
          )}
        </div>
      </main>
    </div>
  );
}
