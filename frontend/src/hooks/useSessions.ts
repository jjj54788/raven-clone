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
}

export function useSessions(authReady: boolean) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await getSessions();
      if (Array.isArray(data)) setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    loadSessions();
  }, [authReady, loadSessions]);

  const selectSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
    try {
      const data = await getSessionMessages(sessionId);
      if (Array.isArray(data)) {
        setMessages(data.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })));
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  const newChat = useCallback(() => {
    setMessages([]);
    setActiveSessionId(null);
  }, []);

  const removeSession = useCallback(async (sessionId: string) => {
    try {
      await apiDeleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }, [activeSessionId]);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (activeSessionId) return activeSessionId;
    const newSession = await createSession();
    setActiveSessionId(newSession.id);
    return newSession.id;
  }, [activeSessionId]);

  const addMessage = useCallback((msg: Message) => {
    setMessages(prev => [...prev, msg]);
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
  };
}
