'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getSessions,
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
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Wrapper to also persist to sessionStorage
  const setActiveSessionId = useCallback((id: string | null) => {
    setActiveSessionIdState(id);
    saveSessionId(id);
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const data = await getSessions();
      if (Array.isArray(data)) {
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

      if (savedId && Array.isArray(data) && data.some((s: Session) => s.id === savedId)) {
        setActiveSessionId(savedId);
        try {
          const msgs = await getSessionMessages(savedId);
          if (Array.isArray(msgs)) {
            setMessages(msgs.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              model: m.model,
            })));
          }
        } catch (err) {
          console.error('[useSessions] Failed to restore session messages:', err);
        }
      }
      setInitialized(true);
    };

    init();
  }, [authReady, initialized, loadSessions, setActiveSessionId]);

  const selectSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
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
  }, [setActiveSessionId]);

  const newChat = useCallback(() => {
    setMessages([]);
    setActiveSessionId(null);
  }, [setActiveSessionId]);

  const removeSession = useCallback(async (sessionId: string) => {
    try {
      await apiDeleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      // Check via callback to avoid stale closure
      setActiveSessionIdState(prev => {
        if (prev === sessionId) {
          setMessages([]);
          saveSessionId(null);
          return null;
        }
        return prev;
      });
    } catch (err) {
      console.error('[useSessions] Failed to delete session:', err);
    }
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
    setActiveSessionId,
    addMessage,
    updateMessage,
  };
}
