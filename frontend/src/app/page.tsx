// ============================================================
// Phase 2: AI Ask 主页面 - 接入真实 AI
// 与 Phase 1 的区别: handleSend 改为调用后端 API
// ============================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatHistory from '@/components/ChatHistory';
import ChatInput from '@/components/ChatInput';
import ChatMessage from '@/components/ChatMessage';
import QuoteFooter from '@/components/QuoteFooter';

const API = 'http://localhost:3001/api/v1';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isChatting = messages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ===== Phase 2 改动: 真实 API 调用 =====
  const handleSend = async (message: string) => {
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: message,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // 构建历史消息上下文
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${API}/ai/simple-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, messages: history }),
      });

      const data = await res.json();

      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.content || 'No response from AI',
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: `**Error:** ${err.message}\n\n请确保后端已启动 (http://localhost:3001)`,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveSession(null);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onShowHistory={() => setHistoryVisible(!historyVisible)}
      />

      <ChatHistory
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        activeSessionId={activeSession}
        onSelectSession={(id) => setActiveSession(id)}
        onNewChat={handleNewChat}
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
              <ChatInput onSend={handleSend} loading={loading} />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col items-center justify-center px-4">
              <h1 className="mb-8 text-4xl font-light text-gray-800">
                <span className="bg-gradient-to-r from-purple-500 to-violet-500 bg-clip-text text-transparent font-normal">
                  {getGreeting()}
                </span>
                , User
              </h1>
              <ChatInput onSend={handleSend} loading={loading} />
            </div>
            <QuoteFooter />
          </div>
        )}
      </main>
    </div>
  );
}
