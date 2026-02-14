'use client';

import { useState, useEffect, useCallback } from 'react';
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

  const loadSessions = useCallback(async () => {
    try {
      const data = await getSessions();
      if (Array.isArray(data)) setSessions(data);
      return data;
    } catch (err) {
      console.error('Failed to load sessions:', err);
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
        // Restore the saved session
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
          console.error('Failed to restore session messages:', err);
        }
      }
      setInitialized(true);
    };

    init();
  }, [authReady, initialized, loadSessions]);

  const selectSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
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
      console.error('Failed to load messages:', err);
    }
  }, []);

  const newChat = useCallback(() => {
    setMessages([]);
    setActiveSessionId(null);
    saveSessionId(null);
  }, []);

  const removeSession = useCallback(async (sessionId: string) => {
    try {
      await apiDeleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
        saveSessionId(null);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }, [activeSessionId]);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (activeSessionId) return activeSessionId;
    const newSession = await createSession();
    setActiveSessionId(newSession.id);
    saveSessionId(newSession.id);
    return newSession.id;
  }, [activeSessionId]);

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
