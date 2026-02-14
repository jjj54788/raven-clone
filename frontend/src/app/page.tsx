'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatHistory from '@/components/ChatHistory';
import ChatInput from '@/components/ChatInput';
import ChatMessage from '@/components/ChatMessage';
import QuoteFooter from '@/components/QuoteFooter';
import {
  getToken, getUser, getModels as fetchModels,
  sendChat, getSessions, createSession,
  getSessionMessages, deleteSession as apiDeleteSession,
} from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
}

interface Session {
  id: string;
  title: string;
  updatedAt: string;
  _count?: { messages: number };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auth
  const [userName, setUserName] = useState('User');
  const [authReady, setAuthReady] = useState(false);

  // Models
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // 检查登录状态
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    const user = getUser();
    if (user) setUserName(user.name);
    setAuthReady(true);
  }, [router]);

  // 加载模型列表
  useEffect(() => {
    if (!authReady) return;
    fetchModels()
      .then((data: AIModel[]) => {
        setModels(data);
        if (data.length > 0) setSelectedModel(data[0]);
      })
      .catch(console.error);
  }, [authReady]);

  // 加载会话列表
  useEffect(() => {
    if (!authReady) return;
    loadSessions();
  }, [authReady]);

  const loadSessions = async () => {
    try {
      const data = await getSessions();
      if (Array.isArray(data)) setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  // 自动滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 选择会话 → 加载消息
  const handleSelectSession = async (sessionId: string) => {
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
  };

  // 新建聊天
  const handleNewChat = () => {
    setMessages([]);
    setActiveSessionId(null);
  };

  // 删除会话
  const handleDeleteSession = async (sessionId: string) => {
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
  };

  // 发送消息
  const handleSend = async (message: string) => {
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: message };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // 如果没有活跃会话，先创建一个
      let sessionId = activeSessionId;
      if (!sessionId) {
        const newSession = await createSession();
        sessionId = newSession.id;
        setActiveSessionId(sessionId);
      }

      const data = await sendChat(message, selectedModel?.id, sessionId!);

      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.content || 'No response from AI',
      };
      setMessages(prev => [...prev, aiMsg]);

      // 刷新会话列表（标题可能更新了）
      loadSessions();
    } catch (err: any) {
      const errMsg: Message = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: `**Error:** ${err.message}\n\n请确保后端已启动 (http://localhost:3001)`,
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
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
        onDeleteSession={handleDeleteSession}
      />

      <main className="flex flex-1 flex-col bg-[#FAFAFA]">
        {isChatting ? (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="mx-auto max-w-3xl space-y-6">
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
                      <span className="text-xs text-white">AI</span>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm border border-gray-100">
                      <div className="flex gap-1.5">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-purple-300" style={{ animationDelay: '0ms' }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-purple-300" style={{ animationDelay: '150ms' }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-purple-300" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>
            <div className="border-t border-gray-100 bg-white px-4 py-4">
              <ChatInput
                onSend={handleSend}
                loading={loading}
                selectedModel={selectedModel}
                models={models}
                onSelectModel={setSelectedModel}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col items-center justify-center px-4">
              <h1 className="mb-8 text-4xl font-light text-gray-800">
                <span className="bg-gradient-to-r from-purple-500 to-violet-500 bg-clip-text text-transparent font-normal">
                  {getGreeting()}
                </span>
                , {userName}
              </h1>
              <ChatInput
                onSend={handleSend}
                loading={loading}
                selectedModel={selectedModel}
                models={models}
                onSelectModel={setSelectedModel}
              />
            </div>
            <QuoteFooter />
          </div>
        )}
      </main>
    </div>
  );
}
