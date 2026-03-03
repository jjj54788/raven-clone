'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Menu, AlertTriangle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import ChatHistory from '@/components/ChatHistory';
import ChatArea from '@/components/ChatArea';
import WelcomeScreen from '@/components/WelcomeScreen';
import { useAuth, useModels, useSessions } from '@/hooks';
import { sendStreamChat, sendMixChat, createSession } from '@/lib/api';
import { getModelKey } from '@/lib/teams';
import { useLanguage } from '@/i18n/LanguageContext';

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [quotedText, setQuotedText] = useState('');
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [mixMode, setMixMode] = useState(false);

  // Use a ref to track the current session ID reliably across renders
  const currentSessionIdRef = useRef<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const sendRunIdRef = useRef(0);

  const { t } = useLanguage();
  const { userName, authReady } = useAuth();
  const { models, selectedModel, setSelectedModel } = useModels(authReady);
  const {
    sessions, activeSessionId, messages,
    loadSessions, selectSession, newChat: hookNewChat, removeSession, renameSession,
    addMessage, updateMessage, setActiveSessionId,
  } = useSessions(authReady);

  useEffect(() => {
    currentSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const stopStreaming = () => {
    sendRunIdRef.current += 1;
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
    }
    streamAbortRef.current = null;
    setStreamingMessageId(null);
    setLoading(false);
  };

  const handleNewChat = () => {
    stopStreaming();
    hookNewChat();
    currentSessionIdRef.current = null;
  };

  const handleSelectSession = async (sessionId: string) => {
    stopStreaming();
    await selectSession(sessionId);
    currentSessionIdRef.current = sessionId;
  };

  const handleSaveWarning = useCallback((msg: string) => {
    setSaveWarning(msg);
    window.setTimeout(() => setSaveWarning(null), 6000);
  }, []);

  const handleQuote = (content: string) => {
    setQuotedText(content);
  };

  const handleClearQuote = () => {
    setQuotedText('');
  };

  const handleSend = async (message: string, options?: { webSearch?: boolean; mixMode?: boolean }) => {
    if (loading) return;

    const runId = sendRunIdRef.current + 1;
    sendRunIdRef.current = runId;

    const userMsg = { id: `u-${Date.now()}`, role: 'user' as const, content: message };
    addMessage(userMsg);
    setLoading(true);

    const aiMsgId = `a-${Date.now()}`;

    try {
      // Step 1: Ensure we have a session
      let sessionId = currentSessionIdRef.current;
      if (!sessionId) {
        const newSession = await createSession();
        if (runId !== sendRunIdRef.current) return;
        sessionId = newSession.id;
        currentSessionIdRef.current = sessionId;
        setActiveSessionId(sessionId);
      }
      if (runId !== sendRunIdRef.current) return;

      // ---- Mix Mode ----
      if (options?.mixMode && models.length >= 2) {
        addMessage({
          id: aiMsgId,
          role: 'assistant',
          content: '',
          model: 'Mix',
          provider: 'Mix',
          mixResults: [],
        });
        setStreamingMessageId(aiMsgId);

        const modelIds = models.map(m => m.id);
        const controller = new AbortController();
        streamAbortRef.current = controller;

        await sendMixChat(message, modelIds, {
          sessionId,
          webSearch: options.webSearch,
          signal: controller.signal,
          onModelResult: (result) => {
            if (runId !== sendRunIdRef.current) return;
            updateMessage(aiMsgId, (prev) => ({
              mixResults: [...(prev.mixResults || []), result],
            }));
          },
          onSynthesisResult: (content) => {
            if (runId !== sendRunIdRef.current) return;
            updateMessage(aiMsgId, { mixSynthesis: content, content });
          },
          onDone: () => {
            if (runId !== sendRunIdRef.current) return;
            if (streamAbortRef.current === controller) streamAbortRef.current = null;
            setStreamingMessageId(null);
            setLoading(false);
            loadSessions();
          },
          onError: (error) => {
            if (runId !== sendRunIdRef.current) return;
            updateMessage(aiMsgId, {
              content: `**Mix Error:** ${error}`,
            });
            if (streamAbortRef.current === controller) streamAbortRef.current = null;
            setStreamingMessageId(null);
            setLoading(false);
          },
        });

        return;
      }

      // ---- Normal streaming mode ----
      addMessage({
        id: aiMsgId,
        role: 'assistant',
        content: '',
        model: selectedModel?.name,
        provider: selectedModel?.provider,
      });
      setStreamingMessageId(aiMsgId);

      let fullContent = '';
      let flushRaf: number | null = null;

      const flush = () => {
        if (flushRaf != null) return;
        flushRaf = window.requestAnimationFrame(() => {
          flushRaf = null;
          if (runId !== sendRunIdRef.current) return;
          updateMessage(aiMsgId, { content: fullContent });
        });
      };

      if (runId !== sendRunIdRef.current) return;

      const controller = new AbortController();
      streamAbortRef.current = controller;

      const provider = selectedModel?.provider;
      const apiKey = provider ? getModelKey(provider) ?? undefined : undefined;

      await sendStreamChat(
        message,
        selectedModel?.id,
        sessionId,
        (chunk: string) => {
          if (runId !== sendRunIdRef.current) return;
          fullContent += chunk;
          flush();
        },
        () => {
          if (runId !== sendRunIdRef.current) return;
          if (flushRaf != null) { window.cancelAnimationFrame(flushRaf); flushRaf = null; }
          updateMessage(aiMsgId, { content: fullContent });
          if (streamAbortRef.current === controller) streamAbortRef.current = null;
          setStreamingMessageId(null);
          setLoading(false);
          loadSessions();
        },
        (error: string) => {
          if (runId !== sendRunIdRef.current) return;
          if (flushRaf != null) { window.cancelAnimationFrame(flushRaf); flushRaf = null; }
          updateMessage(aiMsgId, {
            content: fullContent || `**Error:** ${error}`,
          });
          if (streamAbortRef.current === controller) streamAbortRef.current = null;
          setStreamingMessageId(null);
          setLoading(false);
          loadSessions();
        },
        options?.webSearch,
        controller.signal,
        apiKey,
        provider,
        handleSaveWarning,
      );
    } catch (err: unknown) {
      if (runId !== sendRunIdRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      streamAbortRef.current = null;
      updateMessage(aiMsgId, {
        content: `**Error:** ${errorMessage}\n\nPlease ensure the backend is running (http://localhost:3001)`,
      });
      setStreamingMessageId(null);
      setLoading(false);
    }
  };

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F7]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const isChatting = messages.length > 0;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onShowHistory={() => setHistoryVisible(!historyVisible)}
        userName={userName}
      />

      <ChatHistory
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={removeSession}
        onRenameSession={renameSession}
      />

      <main className="relative flex flex-1 flex-col bg-[#FAF9F7]">
        {!historyVisible && (
          <button
            type="button"
            onClick={() => setHistoryVisible(true)}
            className="absolute left-4 top-4 z-10 rounded-lg border border-gray-200 bg-white/90 p-2 text-gray-500 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-gray-700"
            title={t('sidebar.chatHistory')}
            aria-label={t('sidebar.chatHistory')}
          >
            <Menu size={18} />
          </button>
        )}
        {saveWarning && (
          <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 shadow-md">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{t('chat.saveWarning')}</span>
            </div>
          </div>
        )}
        {isChatting ? (
          <ChatArea
            messages={messages}
            loading={loading}
            streamingMessageId={streamingMessageId}
            onSend={handleSend}
            onStop={stopStreaming}
            selectedModel={selectedModel}
            models={models}
            onSelectModel={setSelectedModel}
            quotedText={quotedText}
            onClearQuote={handleClearQuote}
            onQuote={handleQuote}
            mixMode={mixMode}
            onMixModeChange={setMixMode}
          />
        ) : (
          <WelcomeScreen
            userName={userName}
            onSend={handleSend}
            onStop={stopStreaming}
            loading={loading}
            selectedModel={selectedModel}
            models={models}
            onSelectModel={setSelectedModel}
            quotedText={quotedText}
            onClearQuote={handleClearQuote}
          />
        )}
      </main>
    </div>
  );
}
