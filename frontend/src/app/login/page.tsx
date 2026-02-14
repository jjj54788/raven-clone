// ============================================================
// Phase 1: 登录页面 - 纯静态 UI
// 点击登录直接跳转到主页 (无真实认证)
// ============================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Phase 1: 直接跳转，不做真实认证
    router.push('/');
  };

  return (
    <main className="flex min-h-screen">
      {/* 左侧品牌区 */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 p-12 lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <span className="text-lg font-bold text-white">R</span>
            </div>
            <span className="text-2xl font-bold text-white">Raven AI</span>
          </div>
        </div>

        <div>
          <h2 className="text-4xl font-bold leading-tight text-white">
            AI-Powered
            <br />
            Research Platform
          </h2>
          <p className="mt-4 text-lg text-purple-200">
            Unlock the power of artificial intelligence for your research,
            analysis, and decision-making.
          </p>
        </div>

        <p className="text-sm text-purple-300">
          &copy; 2026 Raven AI Engine. All rights reserved.
        </p>
      </div>

      {/* 右侧表单区 */}
      <div className="flex w-full items-center justify-center px-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-800">
            {isRegister ? 'Create Account' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-gray-500">
            {isRegister
              ? 'Sign up to get started with Raven AI'
              : 'Sign in to continue to Raven AI'}
          </p>

          {/* Google 登录按钮 */}
          <button className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-sm text-gray-400">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <input
                type="text"
                placeholder="Full name"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            )}
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />

            <button
              type="submit"
              className="w-full rounded-xl bg-purple-600 py-3 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
            >
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="font-medium text-purple-600 hover:underline"
            >
              {isRegister ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
