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
  emitUserChanged();
}

export type RavenUser = {
  id: string;
  name: string;
  email: string;
  credits: number;
  isAdmin?: boolean;
  avatarUrl?: string | null;
  bio?: string | null;
  interests?: string[];
  settings?: ProfileSettings;
  integrations?: ProfileIntegrations;
  createdAt?: string;
};

export type ProfileSettings = {
  userBubble: string;
  aiBubble: string;
  notifyEmail: boolean;
  notifyProduct: boolean;
  notifyWeekly: boolean;
  darkMode: boolean;
  locale?: 'en' | 'zh';
};

export type ProfileIntegrations = {
  notion: boolean;
  drive: boolean;
  feishu: boolean;
  feishuOpenId: string;
};

export function getUser(): RavenUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('raven_user');
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user: RavenUser) {
  localStorage.setItem('raven_user', JSON.stringify(user));
  emitUserChanged();
}

const USER_EVENT = 'raven:user';

export function emitUserChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(USER_EVENT));
}

export function subscribeUserChanged(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(USER_EVENT, cb);
  return () => {
    window.removeEventListener(USER_EVENT, cb);
  };
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

export async function googleLogin(idToken: string) {
  const data = await apiFetch('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
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

export async function updateProfile(payload: {
  name?: string;
  bio?: string;
  interests?: string[];
  settings?: ProfileSettings;
  integrations?: ProfileIntegrations;
}) {
  return apiFetch('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ---- Admin ----
export async function adminGetAuthSettings() {
  return apiFetch('/admin/auth/settings');
}

export async function adminSetInviteOnly(inviteOnly: boolean) {
  return apiFetch('/admin/auth/settings', {
    method: 'PATCH',
    body: JSON.stringify({ inviteOnly }),
  });
}

export async function adminListAllowlistEmails() {
  return apiFetch('/admin/auth/allowlist');
}

export async function adminAddAllowlistEmail(email: string, note?: string) {
  return apiFetch('/admin/auth/allowlist', {
    method: 'POST',
    body: JSON.stringify({ email, note }),
  });
}

export async function adminDeleteAllowlistEmail(id: string) {
  return apiFetch(`/admin/auth/allowlist/${id}`, { method: 'DELETE' });
}

export async function adminListUsers(q?: string) {
  const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  return apiFetch(`/admin/users${qs}`);
}

export async function adminSetUserAdmin(userId: string, isAdmin: boolean) {
  return apiFetch(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isAdmin }),
  });
}

// ---- Store ----
export type StoreItemType = 'tool' | 'skill';
export type StoreItemSource = 'curated' | 'github' | 'internal' | 'custom';
export type StoreItemPricing = 'free' | 'freemium' | 'paid' | 'open_source';

export interface StoreItem {
  id: string;
  ownerUserId?: string;
  type: StoreItemType;
  source: StoreItemSource;
  name: string;
  description: string;
  url: string;
  iconText?: string;
  rating?: number;
  usersText?: string;
  pricing?: StoreItemPricing;
  featured?: boolean;
  categories: string[];
  tags: string[];
  links?: Array<{ label: string; url: string }>;
  trialNotesMarkdown?: string;
  recommendReasons?: string[];
  githubRepoUrl?: string;
  githubStars?: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function getStoreItems(): Promise<StoreItem[]> {
  return apiFetch('/store/items');
}

export async function createCustomStoreItem(payload: {
  type: StoreItemType;
  name: string;
  description: string;
  url: string;
  iconText?: string;
  pricing?: StoreItemPricing;
  categories?: string[];
  tags?: string[];
  trialNotesMarkdown?: string;
  recommendReasons?: string[];
}): Promise<StoreItem> {
  return apiFetch('/store/custom-items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomStoreItem(id: string) {
  return apiFetch(`/store/custom-items/${id}`, { method: 'DELETE' });
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

/**
 * SSE streaming chat - calls onChunk for each piece of content
 */
export async function sendStreamChat(
  message: string,
  model: string | undefined,
  sessionId: string | undefined,
  onChunk: (content: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  webSearch?: boolean,
  signal?: AbortSignal,
): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}/ai/stream-chat`, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify({ message, model, sessionId, webSearch }),
    });

    if (res.status === 401) {
      clearToken();
      if (typeof window !== 'undefined') window.location.href = '/login';
      onError('Unauthorized');
      return;
    }

    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        const msg = (data as any)?.message;
        if (msg) {
          errorMessage = Array.isArray(msg) ? msg.join('; ') : String(msg);
        }
      } catch {
        // ignore
      }
      onError(errorMessage);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError('No response body');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) {
              onError(data.error);
              return;
            }
            if (data.done) {
              onDone();
              return;
            }
            if (data.content) {
              onChunk(data.content);
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    }

    onDone();
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      onDone();
      return;
    }
    onError(err.message || 'Network error');
  }
}

// ---- Explore ----
export type YoutubeExploreItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  channel: string;
  publishedAt: string;
  thumbnailUrl?: string;
};

export type YoutubeExploreResponse = {
  items: YoutubeExploreItem[];
  nextPageToken?: string;
  prevPageToken?: string;
};

export async function getYoutubeExplore(params?: {
  q?: string;
  keywords?: string[];
  order?: 'latest' | 'oldest' | 'relevance';
  maxResults?: number;
  pageToken?: string;
}): Promise<YoutubeExploreResponse> {
  const qp = new URLSearchParams();
  if (params?.q) qp.set('q', params.q);
  if (params?.keywords && params.keywords.length > 0) qp.set('keywords', params.keywords.join(','));
  if (params?.order) qp.set('order', params.order);
  if (params?.maxResults) qp.set('maxResults', String(params.maxResults));
  if (params?.pageToken) qp.set('pageToken', params.pageToken);
  const qs = qp.toString();
  return apiFetch(`/explore/youtube${qs ? `?${qs}` : ''}`);
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

// ---- Todos ----
export type TodoStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ARCHIVED';

export interface TodoList {
  id: string;
  name: string;
  color?: string | null;
  isInbox: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
}

export interface TodoTask {
  id: string;
  title: string;
  description?: string | null;
  status: TodoStatus;
  priority: number;
  dueAt?: string | null;
  completedAt?: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  list: Pick<TodoList, 'id' | 'name' | 'color' | 'isInbox'>;
}

export interface TodoOverview {
  openCount: number;
  topTasks: TodoTask[];
}

export async function getTodoOverview(): Promise<TodoOverview> {
  return apiFetch('/todos/overview');
}

export async function listTodoLists(): Promise<TodoList[]> {
  return apiFetch('/todos/lists');
}

export async function createTodoList(payload: { name: string; color?: string }): Promise<TodoList> {
  return apiFetch('/todos/lists', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateTodoList(id: string, payload: { name?: string; color?: string | null }): Promise<TodoList> {
  return apiFetch(`/todos/lists/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteTodoList(id: string): Promise<{ message: string }> {
  return apiFetch(`/todos/lists/${id}`, { method: 'DELETE' });
}

export async function listTodoTasks(params?: {
  listId?: string;
  status?: 'open' | 'done' | 'all' | 'archived';
  q?: string;
  take?: number;
  dueAfter?: string;
  dueBefore?: string;
}): Promise<TodoTask[]> {
  const qp = new URLSearchParams();
  if (params?.listId) qp.set('listId', params.listId);
  if (params?.status) qp.set('status', params.status);
  if (params?.q) qp.set('q', params.q);
  if (params?.take) qp.set('take', String(params.take));
  if (params?.dueAfter) qp.set('dueAfter', params.dueAfter);
  if (params?.dueBefore) qp.set('dueBefore', params.dueBefore);
  const qs = qp.toString();
  return apiFetch(`/todos/tasks${qs ? `?${qs}` : ''}`);
}

export async function createTodoTask(payload: {
  title: string;
  description?: string;
  listId?: string;
  priority?: number;
  dueAt?: string;
}): Promise<TodoTask> {
  return apiFetch('/todos/tasks', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateTodoTask(
  id: string,
  payload: {
    title?: string;
    description?: string | null;
    status?: TodoStatus;
    priority?: number;
    dueAt?: string | null;
    listId?: string;
  },
): Promise<TodoTask> {
  return apiFetch(`/todos/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteTodoTask(id: string): Promise<{ message: string }> {
  return apiFetch(`/todos/tasks/${id}`, { method: 'DELETE' });
}

// ---- Daily Check-ins ----
export type CheckInListResponse = { dates: string[] };
export type CheckInResponse = { dateKey: string; created: boolean; createdAt: string };

export async function listCheckIns(params?: { from?: string; to?: string }): Promise<CheckInListResponse> {
  const qp = new URLSearchParams();
  if (params?.from) qp.set('from', params.from);
  if (params?.to) qp.set('to', params.to);
  const qs = qp.toString();
  return apiFetch(`/checkins${qs ? `?${qs}` : ''}`);
}

export async function createCheckIn(dateKey?: string): Promise<CheckInResponse> {
  return apiFetch('/checkins', {
    method: 'POST',
    body: JSON.stringify(dateKey ? { dateKey } : {}),
  });
}
