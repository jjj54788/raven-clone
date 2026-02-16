'use client';

import Script from 'next/script';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChatKit,
  useChatKit,
  type StartScreenPrompt,
  type UseChatKitOptions,
} from '@openai/chatkit-react';
import { Sparkles } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import { createChatKitSession, getChatKitStatus } from '@/lib/api';

type ChatStatus = 'idle' | 'connecting' | 'ready' | 'error';

function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

function NativeChatPanel({ scriptReady }: { scriptReady: boolean }) {
  const { t } = useLanguage();
  const isDark = useIsDarkMode();
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sessionNonce, setSessionNonce] = useState(0);
  const [configLines, setConfigLines] = useState<string[]>([]);
  const [checkingConfig, setCheckingConfig] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [lastLog, setLastLog] = useState<{ name: string; data?: Record<string, unknown> } | null>(null);
  const [lastThreadId, setLastThreadId] = useState<string | null>(null);
  const [logEntries, setLogEntries] = useState<Array<{ time: string; name: string; data?: Record<string, unknown> }>>([]);
  const [copied, setCopied] = useState(false);

  const appendLog = useCallback((name: string, data?: Record<string, unknown>) => {
    setLogEntries((prev) => {
      const entry = { time: new Date().toISOString(), name, data };
      return [entry, ...prev].slice(0, 8);
    });
  }, []);

  const getClientSecret = useCallback(async () => {
    setStatus('connecting');
    setError(null);
    try {
      const data = await createChatKitSession();
      appendLog('session.created', { expires_at: data.expires_at ?? null });
      return data.client_secret;
    } catch (err) {
      const message = err instanceof Error ? err.message : t('nativeChat.errorGeneric');
      setStatus('error');
      setError(message);
      appendLog('session.error', { message });
      throw err;
    }
  }, [appendLog, t]);

  const prompts = useMemo<StartScreenPrompt[]>(() => ([
    { label: t('nativeChat.promptSummary'), prompt: t('nativeChat.promptSummaryText'), icon: 'sparkle' },
    { label: t('nativeChat.promptPlan'), prompt: t('nativeChat.promptPlanText'), icon: 'calendar' },
    { label: t('nativeChat.promptReply'), prompt: t('nativeChat.promptReplyText'), icon: 'write' },
  ]), [t]);

  const options = useMemo<UseChatKitOptions>(() => {
    const colorScheme: 'dark' | 'light' = isDark ? 'dark' : 'light';
    return {
      api: { getClientSecret },
      theme: {
        colorScheme,
        radius: 'soft',
        density: 'normal',
        color: { accent: { primary: '#7c3aed', level: 3 as const } },
      },
      header: {
        title: { enabled: true, text: t('nativeChat.headerTitle') },
      },
      history: { enabled: true, showDelete: true, showRename: true },
      composer: { placeholder: t('nativeChat.composerPlaceholder') },
      startScreen: { greeting: t('nativeChat.startGreeting'), prompts },
      onReady: () => {
        setStatus('ready');
        appendLog('ready');
      },
      onThreadChange: (event: { threadId: string | null }) => {
        setLastThreadId(event.threadId ?? null);
        appendLog('thread.change', { threadId: event.threadId ?? null });
      },
      onLog: (event: { name: string; data?: Record<string, unknown> }) => {
        setLastLog({ name: event.name, data: event.data });
        appendLog(`log:${event.name}`, event.data);
      },
      onEffect: (event: { name: string; data?: Record<string, unknown> }) => {
        appendLog(`effect:${event.name}`, event.data);
      },
      onResponseStart: () => {
        appendLog('response.start');
      },
      onResponseEnd: () => {
        appendLog('response.end');
      },
      onThreadLoadStart: (event: { threadId: string }) => {
        appendLog('thread.load.start', { threadId: event.threadId });
      },
      onThreadLoadEnd: (event: { threadId: string }) => {
        appendLog('thread.load.end', { threadId: event.threadId });
      },
      onError: (event: { error: Error }) => {
        setStatus('error');
        const message = event?.error?.message || t('nativeChat.errorGeneric');
        setError(message);
        appendLog('error', { message });
      },
    };
  }, [appendLog, getClientSecret, isDark, prompts, t]);

  const { control } = useChatKit(options);

  const statusLabel = status === 'ready'
    ? t('nativeChat.statusReady')
    : status === 'error'
      ? t('nativeChat.statusError')
      : t('nativeChat.statusConnecting');

  const handleCheckConfig = async () => {
    setCheckingConfig(true);
    setConfigLines([]);
    try {
      const info = await getChatKitStatus();
      const lines: string[] = [];
      if (!info.hasApiKey) lines.push(t('nativeChat.missingApiKey'));
      if (!info.hasWorkflowId) lines.push(t('nativeChat.missingWorkflowId'));
      if (lines.length === 0) {
        lines.push(t('nativeChat.configOk'));
        lines.push(t('nativeChat.configHintWorkflow'));
      }
      if (!info.hasWorkflowVersion) lines.push(t('nativeChat.missingWorkflowVersionHint'));
      setConfigLines(lines);
    } catch (err) {
      setConfigLines([t('nativeChat.checkFailed')]);
    } finally {
      setCheckingConfig(false);
    }
  };

  const handleCopyDiagnostics = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    const payload = {
      status,
      scriptReady,
      error,
      lastThreadId,
      lastLog,
      configLines,
      logEntries,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('nativeChat.panelTitle')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('nativeChat.panelDesc')}</p>
        </div>
        <span
          className={[
            'rounded-full px-3 py-1 text-xs font-semibold',
            status === 'ready'
              ? 'bg-emerald-50 text-emerald-700'
              : status === 'error'
                ? 'bg-rose-50 text-rose-700'
                : 'bg-amber-50 text-amber-700',
          ].join(' ')}
        >
          {statusLabel}
        </span>
      </div>

      {!scriptReady && (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-sm text-gray-500">
          {t('nativeChat.loadingSdk')}
        </div>
      )}

      {scriptReady && status === 'error' && (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <p className="font-semibold">{t('nativeChat.errorTitle')}</p>
          <p className="mt-1">{error || t('nativeChat.errorGeneric')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSessionNonce((prev) => prev + 1)}
              className="inline-flex items-center rounded-lg border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              {t('nativeChat.retry')}
            </button>
          </div>
          {configLines.length > 0 && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs text-rose-700">
              {configLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowDiagnostics((prev) => !prev)}
          className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          {showDiagnostics ? t('nativeChat.hideDiagnostics') : t('nativeChat.showDiagnostics')}
        </button>
        <button
          type="button"
          onClick={handleCheckConfig}
          className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          disabled={checkingConfig}
        >
          {checkingConfig ? t('nativeChat.checking') : t('nativeChat.checkConfig')}
        </button>
        <button
          type="button"
          onClick={handleCopyDiagnostics}
          className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          {copied ? t('nativeChat.diagnosticsCopied') : t('nativeChat.diagnosticsCopy')}
        </button>
      </div>
      {showDiagnostics && (
        <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
          <p>{t('nativeChat.diagnosticsThread')}: {lastThreadId || t('nativeChat.diagnosticsEmpty')}</p>
          <p className="mt-1">{t('nativeChat.diagnosticsLog')}: {lastLog?.name || t('nativeChat.diagnosticsEmpty')}</p>
          {lastLog?.data && (
            <pre className="mt-2 whitespace-pre-wrap text-[11px] text-gray-500">{JSON.stringify(lastLog.data, null, 2)}</pre>
          )}
          {error && <p className="mt-2 text-rose-600">{t('nativeChat.diagnosticsError')}: {error}</p>}
          {configLines.length > 0 && (
            <div className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-600">
              {configLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}
          {logEntries.length > 0 && (
            <div className="mt-3">
              <p className="font-semibold text-gray-700">{t('nativeChat.diagnosticsRecent')}</p>
              <div className="mt-1 space-y-1 text-[11px] text-gray-500">
                {logEntries.map((entry) => (
                  <div key={`${entry.time}-${entry.name}`}>
                    <span className="font-semibold text-gray-600">{entry.time}</span>
                    <span className="ml-2">{entry.name}</span>
                    {entry.data && (
                      <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(entry.data, null, 2)}</pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {scriptReady && (
        <div className="mt-5 h-[calc(100vh-320px)] min-h-[520px] overflow-hidden rounded-2xl border border-gray-100">
          <ChatKit key={sessionNonce} control={control} className="h-full w-full" />
        </div>
      )}
    </section>
  );
}

export default function AiNativePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const { userName, authReady } = useAuth();
  const { t } = useLanguage();

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFA]">
      <Script
        src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onShowHistory={() => {}}
        userName={userName}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-gray-100 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-start gap-4 px-5 py-5 sm:px-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-500 text-white shadow-sm">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-gray-900">{t('nativeChat.title')}</h1>
              <p className="mt-1 text-sm text-gray-500">{t('nativeChat.subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <NativeChatPanel scriptReady={scriptReady} />
          </div>
        </div>
      </main>
    </div>
  );
}
