'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getSessions,
  createSession,
  getSessionMessages,
  deleteSession as apiDeleteSession,
} from '@/lib/api';

export interface Session {
  id: string;
  title: string;
  updatedAt: string;
  _count?: { messages: number };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  provider?: string;
}

function getSavedSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('raven_active_session');
}

function saveSessionId(id: string | null) {
  if (typeof window === 'undefined') return;
  if (id) {
    sessionStorage.setItem('raven_active_session', id);
  } else {
    sessionStorage.removeItem('raven_active_session');
  }
}

export function useSessions(authReady: boolean) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Use ref to always have current activeSessionId in callbacks
  const activeSessionIdRef = useRef<string | null>(null);
  activeSessionIdRef.current = activeSessionId;

  const loadSessions = useCallback(async () => {
    try {
      console.log('[useSessions] Loading sessions...');
      const data = await getSessions();
      if (Array.isArray(data)) {
        console.log(`[useSessions] Loaded ${data.length} sessions`);
        setSessions(data);
      }
      return data;
    } catch (err) {
      console.error('[useSessions] Failed to load sessions:', err);
      return [];
    }
  }, []);

  // On mount: load sessions and restore last active session
  useEffect(() => {
    if (!authReady || initialized) return;

    const init = async () => {
      const data = await loadSessions();
      const savedId = getSavedSessionId();
      console.log('[useSessions] Init: savedId =', savedId);

      if (savedId && Array.isArray(data) && data.some((s: Session) => s.id === savedId)) {
        setActiveSessionId(savedId);
        activeSessionIdRef.current = savedId;
        try {
          const msgs = await getSessionMessages(savedId);
          if (Array.isArray(msgs)) {
            setMessages(msgs.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              model: m.model,
            })));
            console.log(`[useSessions] Restored ${msgs.length} messages for session ${savedId}`);
          }
        } catch (err) {
          console.error('[useSessions] Failed to restore session messages:', err);
        }
      }
      setInitialized(true);
    };

    init();
  }, [authReady, initialized, loadSessions]);

  const selectSession = useCallback(async (sessionId: string) => {
    console.log('[useSessions] Selecting session:', sessionId);
    setActiveSessionId(sessionId);
    activeSessionIdRef.current = sessionId;
    saveSessionId(sessionId);
    try {
      const data = await getSessionMessages(sessionId);
      if (Array.isArray(data)) {
        setMessages(data.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          model: m.model,
        })));
      }
    } catch (err) {
      console.error('[useSessions] Failed to load messages:', err);
    }
  }, []);

  const newChat = useCallback(() => {
    console.log('[useSessions] New chat');
    setMessages([]);
    setActiveSessionId(null);
    activeSessionIdRef.current = null;
    saveSessionId(null);
  }, []);

  const removeSession = useCallback(async (sessionId: string) => {
    try {
      await apiDeleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionIdRef.current === sessionId) {
        setActiveSessionId(null);
        activeSessionIdRef.current = null;
        setMessages([]);
        saveSessionId(null);
      }
    } catch (err) {
      console.error('[useSessions] Failed to delete session:', err);
    }
  }, []);

  const ensureSession = useCallback(async (): Promise<string> => {
    // Use ref to get the latest value, not stale closure
    const currentId = activeSessionIdRef.current;
    if (currentId) {
      console.log('[useSessions] ensureSession: reusing existing session', currentId);
      return currentId;
    }

    console.log('[useSessions] ensureSession: creating new session...');
    const newSession = await createSession();
    console.log('[useSessions] ensureSession: created session', newSession.id);
    setActiveSessionId(newSession.id);
    activeSessionIdRef.current = newSession.id;
    saveSessionId(newSession.id);
    return newSession.id;
  }, []);

  const addMessage = useCallback((msg: Message) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const updateMessage = useCallback((id: string, update: Partial<Message>) => {
    setMessages(prev =>
      prev.map(m => (m.id === id ? { ...m, ...update } : m))
    );
  }, []);

  return {
    sessions,
    activeSessionId,
    messages,
    loadSessions,
    selectSession,
    newChat,
    removeSession,
    ensureSession,
    addMessage,
    updateMessage,
  };
}
