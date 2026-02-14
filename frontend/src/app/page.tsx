'use client';

import { useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatHistory from '@/components/ChatHistory';
import ChatArea from '@/components/ChatArea';
import WelcomeScreen from '@/components/WelcomeScreen';
import { useAuth, useModels, useSessions } from '@/hooks';
import { sendStreamChat, createSession } from '@/lib/api';

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Use a ref to track the current session ID reliably across renders
  const currentSessionIdRef = useRef<string | null>(null);

  const { userName, authReady } = useAuth();
  const { models, selectedModel, setSelectedModel } = useModels(authReady);
  const {
    sessions, activeSessionId, messages,
    loadSessions, selectSession, newChat: hookNewChat, removeSession,
    addMessage, updateMessage, setActiveSessionId,
  } = useSessions(authReady);

  // Keep ref in sync with hook state
  if (activeSessionId !== undefined) {
    currentSessionIdRef.current = activeSessionId;
  }

  const handleNewChat = () => {
    hookNewChat();
    currentSessionIdRef.current = null;
  };

  const handleSelectSession = async (sessionId: string) => {
    await selectSession(sessionId);
    currentSessionIdRef.current = sessionId;
  };

  const handleSend = async (message: string) => {
    const userMsg = { id: `u-${Date.now()}`, role: 'user' as const, content: message };
    addMessage(userMsg);
    setLoading(true);

    const aiMsgId = `a-${Date.now()}`;

    try {
      // Step 1: Ensure we have a session — use ref for latest value
      let sessionId = currentSessionIdRef.current;

      if (!sessionId) {
        console.log('[handleSend] No session, creating one...');
        const newSession = await createSession();
        sessionId = newSession.id;
        currentSessionIdRef.current = sessionId;
        setActiveSessionId(sessionId);
        console.log('[handleSend] Created session:', sessionId);
      }

      console.log('[handleSend] Using sessionId:', sessionId, 'model:', selectedModel?.id);

      // Step 2: Add empty AI message for streaming
      addMessage({
        id: aiMsgId,
        role: 'assistant',
        content: '',
        model: selectedModel?.name,
        provider: selectedModel?.provider,
      });
      setStreamingMessageId(aiMsgId);

      let fullContent = '';

      // Step 3: Stream chat
      await sendStreamChat(
        message,
        selectedModel?.id,
        sessionId,
        // onChunk
        (chunk: string) => {
          fullContent += chunk;
          updateMessage(aiMsgId, { content: fullContent });
        },
        // onDone
        () => {
          console.log('[handleSend] Stream done, refreshing sessions');
          setStreamingMessageId(null);
          setLoading(false);
          loadSessions();
        },
        // onError
        (error: string) => {
          console.error('[handleSend] Stream error:', error);
          updateMessage(aiMsgId, {
            content: fullContent || `**Error:** ${error}\n\nPlease ensure the backend is running (http://localhost:3001)`,
          });
          setStreamingMessageId(null);
          setLoading(false);
          loadSessions();
        },
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[handleSend] Exception:', errorMessage);
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
            selectedModel={selectedModel}
            models={models}
            onSelectModel={setSelectedModel}
          />
        ) : (
          <WelcomeScreen
            userName={userName}
            onSend={handleSend}
            loading={loading}
            selectedModel={selectedModel}
            models={models}
            onSelectModel={setSelectedModel}
          />
        )}
      </main>
    </div>
  );
}
