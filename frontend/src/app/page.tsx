'use client';

import { useState, useRef, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatHistory from '@/components/ChatHistory';
import ChatArea from '@/components/ChatArea';
import WelcomeScreen from '@/components/WelcomeScreen';
import { useAuth, useModels, useSessions } from '@/hooks';
import { sendStreamChat, createSession } from '@/lib/api';

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [quotedText, setQuotedText] = useState('');

  // Use a ref to track the current session ID reliably across renders
  const currentSessionIdRef = useRef<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const sendRunIdRef = useRef(0);

  const { userName, authReady } = useAuth();
  const { models, selectedModel, setSelectedModel } = useModels(authReady);
  const {
    sessions, activeSessionId, messages,
    loadSessions, selectSession, newChat: hookNewChat, removeSession,
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

  const handleQuote = (content: string) => {
    setQuotedText(content);
  };

  const handleClearQuote = () => {
    setQuotedText('');
  };

  const handleSend = async (message: string, options?: { webSearch?: boolean }) => {
    if (loading) return;

    const runId = sendRunIdRef.current + 1;
    sendRunIdRef.current = runId;

    const userMsg = { id: `u-${Date.now()}`, role: 'user' as const, content: message };
    addMessage(userMsg);
    setLoading(true);

    const aiMsgId = `a-${Date.now()}`;
    addMessage({
      id: aiMsgId,
      role: 'assistant',
      content: '',
      model: selectedModel?.name,
      provider: selectedModel?.provider,
    });
    setStreamingMessageId(aiMsgId);

    try {
      // Step 1: Ensure we have a session — use ref for latest value
      let sessionId = currentSessionIdRef.current;

      if (!sessionId) {
        console.log('[handleSend] No session, creating one...');
        const newSession = await createSession();
        if (runId !== sendRunIdRef.current) return;
        sessionId = newSession.id;
        currentSessionIdRef.current = sessionId;
        setActiveSessionId(sessionId);
        console.log('[handleSend] Created session:', sessionId);
      }

      if (runId !== sendRunIdRef.current) return;

      console.log('[handleSend] Using sessionId:', sessionId, 'model:', selectedModel?.id);

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

      // Step 3: Stream chat
      await sendStreamChat(
        message,
        selectedModel?.id,
        sessionId,
        // onChunk
        (chunk: string) => {
          if (runId !== sendRunIdRef.current) return;
          fullContent += chunk;
          flush();
        },
        // onDone
        () => {
          if (runId !== sendRunIdRef.current) return;
          console.log('[handleSend] Stream done, refreshing sessions');
          if (flushRaf != null) {
            window.cancelAnimationFrame(flushRaf);
            flushRaf = null;
          }
          updateMessage(aiMsgId, { content: fullContent });
          if (streamAbortRef.current === controller) streamAbortRef.current = null;
          setStreamingMessageId(null);
          setLoading(false);
          loadSessions();
        },
        // onError
        (error: string) => {
          if (runId !== sendRunIdRef.current) return;
          console.error('[handleSend] Stream error:', error);
          if (flushRaf != null) {
            window.cancelAnimationFrame(flushRaf);
            flushRaf = null;
          }
          updateMessage(aiMsgId, {
            content: fullContent || `**Error:** ${error}\n\nPlease ensure the backend is running (http://localhost:3001)`,
          });
          if (streamAbortRef.current === controller) streamAbortRef.current = null;
          setStreamingMessageId(null);
          setLoading(false);
          loadSessions();
        },
        // webSearch
        options?.webSearch,
        // signal
        controller.signal,
      );
    } catch (err: unknown) {
      if (runId !== sendRunIdRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[handleSend] Exception:', errorMessage);
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
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
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
      />

      <main className="flex flex-1 flex-col bg-[#FAFAFA]">
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
