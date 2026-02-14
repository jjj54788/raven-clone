const API_BASE = 'http://localhost:3001/api/v1';

// ---- Token 管理 ----
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('raven_token');
}

export function setToken(token: string) {
  localStorage.setItem('raven_token', token);
}

export function clearToken() {
  localStorage.removeItem('raven_token');
  localStorage.removeItem('raven_user');
}

export function getUser(): { id: string; name: string; email: string; credits: number } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('raven_user');
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user: any) {
  localStorage.setItem('raven_user', JSON.stringify(user));
}

// ---- 通用请求 ----
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: any = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  return res.json();
}

// ---- Auth ----
export async function login(email: string, password: string) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.accessToken) {
    setToken(data.accessToken);
    setUser(data.user);
  }
  return data;
}

export async function register(email: string, name: string, password: string) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, name, password }),
  });
  if (data.accessToken) {
    setToken(data.accessToken);
    setUser(data.user);
  }
  return data;
}

export async function getMe() {
  return apiFetch('/auth/me');
}

// ---- AI ----
export async function getModels() {
  return apiFetch('/ai/models');
}

export async function sendChat(message: string, model?: string, sessionId?: string) {
  return apiFetch('/ai/simple-chat', {
    method: 'POST',
    body: JSON.stringify({ message, model, sessionId }),
  });
}

// ---- Sessions ----
export async function getSessions() {
  return apiFetch('/ask/sessions');
}

export async function createSession() {
  return apiFetch('/ask/sessions', { method: 'POST' });
}

export async function getSessionMessages(sessionId: string) {
  return apiFetch(`/ask/sessions/${sessionId}/messages`);
}

export async function deleteSession(sessionId: string) {
  return apiFetch(`/ask/sessions/${sessionId}`, { method: 'DELETE' });
}
