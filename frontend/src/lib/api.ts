const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1';

// ---- Token 管理 ----
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gewu_token');
}

export function setToken(token: string) {
  localStorage.setItem('gewu_token', token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gewu_refresh_token');
}

export function setRefreshToken(token: string) {
  localStorage.setItem('gewu_refresh_token', token);
}

export function clearToken() {
  localStorage.removeItem('gewu_token');
  localStorage.removeItem('gewu_refresh_token');
  localStorage.removeItem('gewu_user');
  emitUserChanged();
}

export type GewuUser = {
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

export type IntegrationProvider = 'notion' | 'google-drive' | 'feishu';

export function getUser(): GewuUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('gewu_user');
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user: GewuUser) {
  localStorage.setItem('gewu_user', JSON.stringify(user));
  emitUserChanged();
}

const USER_EVENT = 'gewu:user';

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
const API_TIMEOUT_MS = 30_000;

// Perform a single fetch attempt with timeout
async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Extract error message from response body (supports unified envelope { success:false, error:{message} })
async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    // Unified envelope: { success: false, error: { message } }
    const errObj = (body as any)?.error;
    if (errObj) {
      const msg = errObj?.message;
      if (Array.isArray(msg)) return msg.join('; ');
      if (typeof msg === 'string' && msg) return msg;
    }
    // Legacy flat format
    const msg = (body as any)?.message;
    if (Array.isArray(msg)) return msg.join('; ');
    if (typeof msg === 'string' && msg) return msg;
  } catch {
    // ignore parse failure
  }
  return `HTTP ${res.status}`;
}

// Parse JSON response body, handling empty bodies and auto-unwrapping the unified envelope
async function parseResponseBody(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return undefined;
  const text = await res.text();
  if (!text.trim()) return undefined;
  const json = JSON.parse(text);
  // Auto-unwrap { success: true, data: T, meta: {...} }
  if (
    json !== null &&
    typeof json === 'object' &&
    'success' in json &&
    'data' in json &&
    'meta' in json
  ) {
    return json.data;
  }
  return json;
}

let _isRefreshing = false;
let _refreshQueue: Array<(token: string | null) => void> = [];

async function apiFetch(path: string, options: RequestInit = {}, _retry = true): Promise<any> {
  const token = getToken();
  const headers: any = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_BASE}${path}`, { ...options, headers });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  }

  if (res.status === 401 && _retry) {
    // Attempt to refresh the access token
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      if (_isRefreshing) {
        // Queue this request until refresh completes
        const newToken = await new Promise<string | null>((resolve) => {
          _refreshQueue.push(resolve);
        });
        if (newToken) return apiFetch(path, options, false);
      } else {
        _isRefreshing = true;
        try {
          const refreshRes = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            const newAccess: string = data?.accessToken ?? data?.data?.accessToken;
            const newRefresh: string = data?.refreshToken ?? data?.data?.refreshToken;
            if (newAccess) {
              setToken(newAccess);
              if (newRefresh) setRefreshToken(newRefresh);
              _refreshQueue.forEach((cb) => cb(newAccess));
              _refreshQueue = [];
              _isRefreshing = false;
              return apiFetch(path, options, false);
            }
          }
        } catch {
          // refresh request failed
        }
        _refreshQueue.forEach((cb) => cb(null));
        _refreshQueue = [];
        _isRefreshing = false;
      }
    }
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const message = await extractErrorMessage(res);
    throw new Error(message);
  }

  return parseResponseBody(res);
}

// ---- Auth ----
export async function login(email: string, password: string) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.accessToken) {
    setToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
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
    if (data.refreshToken) setRefreshToken(data.refreshToken);
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
    if (data.refreshToken) setRefreshToken(data.refreshToken);
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

export async function getIntegrationAuthUrl(provider: IntegrationProvider) {
  return apiFetch(`/integrations/${provider}/auth-url`);
}

export async function bindFeishuOpenId(openId: string) {
  return apiFetch('/integrations/feishu/open-id', {
    method: 'PATCH',
    body: JSON.stringify({ openId }),
  });
}

export async function disconnectIntegration(provider: IntegrationProvider) {
  return apiFetch(`/integrations/${provider}`, { method: 'DELETE' });
}

// ---- AISE ----
export type AiseStageId = 'requirements' | 'design' | 'implementation' | 'testing' | 'acceptance';
export type AiseStageStatus = 'done' | 'active' | 'review' | 'pending';
export type AiseRequirementStatus = 'done' | 'active' | 'review' | 'blocked';
export type AiseGateStatus = 'pass' | 'pending' | 'running' | 'queued';

export type AiseMetricId = 'lead_time' | 'deploy_frequency' | 'change_failure_rate' | 'mttr';
export type AiseGateId = 'unit_tests' | 'code_review' | 'security_scan' | 'deployment_check';
export type AiseAcceptanceId = 'coverage' | 'defect_closure' | 'signoff';

export interface AiseMetric {
  id: AiseMetricId;
  value: string;
  hint: string;
}

export interface AisePipelineStage {
  id: AiseStageId;
  status: AiseStageStatus;
  wip: string;
  wipCurrent?: number;
  wipLimit?: number;
  count: string;
  itemsCount?: number;
  desc: string;
}

export interface AiseQualityGate {
  id: AiseGateId;
  status: AiseGateStatus;
  value: string;
}

export interface AiseAcceptanceItem {
  id: AiseAcceptanceId;
  value: string;
}

export interface AiseRequirement {
  id: string;
  title: string;
  owner: string;
  stageId: AiseStageId;
  status: AiseRequirementStatus;
  progress: number;
  updatedAt: string;
}

export interface AiseFocusTrace {
  stageId: AiseStageId;
  status: AiseStageStatus;
}

export interface AiseFocus {
  requirementId: string;
  title: string;
  description: string;
  stageId: AiseStageId;
  status: AiseRequirementStatus;
  trace: AiseFocusTrace[];
}

export interface AiseOverview {
  asOf: string;
  metrics: AiseMetric[];
  pipeline: AisePipelineStage[];
  qualityGates: AiseQualityGate[];
  acceptance: AiseAcceptanceItem[];
  requirements: AiseRequirement[];
  focus: AiseFocus;
  ownersCount: number;
}

export async function getAiseOverview(): Promise<AiseOverview> {
  return apiFetch('/aise/overview');
}

export type AiseOverviewUpdate = Partial<
  Pick<AiseOverview, 'metrics' | 'pipeline' | 'qualityGates' | 'acceptance' | 'requirements' | 'focus'>
>;

export async function updateAiseOverview(payload: AiseOverviewUpdate): Promise<AiseOverview> {
  return apiFetch('/aise/overview', {
    method: 'PUT',
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
  usageExamples?: string[];
  evalScore?: ToolEvalScore;
  githubRepoUrl?: string;
  githubStars?: number;
  githubForks?: number;
  githubStarsGrowth7d?: number;
  githubLastPushedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ToolEvalScore {
  context: number;
  creativity: number;
  quality: number;
  multimodal: number;
  safety: number;
  grade: 'S' | 'A' | 'B' | 'C';
}

export interface GithubEvalScore {
  activity: number;
  community: number;
  growth: number;
  docs: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

export interface GithubTrendingItem {
  id: string;
  repoFullName: string;
  name: string;
  description: string;
  htmlUrl: string;
  language?: string;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  starsGrowth7d: number;
  pushedAt?: string;
  aiSummaryZh?: string;
  keyFeatures: string[];
  useCases: string[];
  limitations?: string;
  evalScore?: GithubEvalScore;
  aiAnalyzedAt?: string;
  createdAt: string;
  updatedAt: string;
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

export async function getStoreItem(id: string): Promise<StoreItem> {
  return apiFetch(`/store/items/${id}`);
}

export async function getStoreBookmarks(): Promise<StoreItem[]> {
  return apiFetch('/store/bookmarks');
}

export async function addStoreBookmark(itemId: string): Promise<void> {
  return apiFetch(`/store/bookmarks/${itemId}`, { method: 'POST' });
}

export async function removeStoreBookmark(itemId: string): Promise<void> {
  return apiFetch(`/store/bookmarks/${itemId}`, { method: 'DELETE' });
}

export async function getStoreRecommendations(): Promise<StoreItem[]> {
  return apiFetch('/store/recommendations');
}

export async function getGithubTrendingRepos(params?: {
  sort?: 'stars' | 'growth' | 'recent';
  language?: string;
  limit?: number;
}): Promise<GithubTrendingItem[]> {
  const q = new URLSearchParams();
  if (params?.sort) q.set('sort', params.sort);
  if (params?.language) q.set('language', params.language);
  if (params?.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiFetch(`/store/github-trending${qs ? `?${qs}` : ''}`);
}

export async function getGithubTrendingRepo(id: string): Promise<GithubTrendingItem> {
  return apiFetch(`/store/github-trending/${id}`);
}

export async function triggerGithubSync(): Promise<{ ok: boolean; message: string }> {
  return apiFetch('/store/github-trending/sync', { method: 'POST' });
}

// ---- AI ----
export async function getModels() {
  return apiFetch('/ai/models');
}

export async function sendChat(message: string, model?: string, sessionId?: string, apiKey?: string, provider?: string) {
  return apiFetch('/ai/simple-chat', {
    method: 'POST',
    body: JSON.stringify({ message, model, sessionId, apiKey, provider }),
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
  apiKey?: string,
  provider?: string,
  onSaveWarning?: (msg: string) => void,
): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}/ai/stream-chat`, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify({ message, model, sessionId, webSearch, apiKey, provider }),
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
              if (data.saveWarning && onSaveWarning) {
                onSaveWarning(data.saveWarning);
              }
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

// ---- Mix Chat (Multi-model comparison) ----

export interface MixModelResult {
  modelId: string;
  modelName: string;
  provider: string;
  content: string;
  error?: string;
}

export interface MixChatResult {
  modelResults: MixModelResult[];
  synthesis: string | null;
}

export async function sendMixChat(
  message: string,
  models: string[],
  opts?: {
    synthesisModel?: string;
    sessionId?: string;
    webSearch?: boolean;
    signal?: AbortSignal;
    onModelResult?: (result: MixModelResult) => void;
    onSynthesisStart?: (modelName: string) => void;
    onSynthesisResult?: (content: string) => void;
    onDone?: () => void;
    onError?: (error: string) => void;
  },
): Promise<MixChatResult> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const modelResults: MixModelResult[] = [];
  let synthesis: string | null = null;

  try {
    const res = await fetch(`${API_BASE}/ai/mix-chat`, {
      method: 'POST',
      headers,
      signal: opts?.signal,
      body: JSON.stringify({
        message,
        models,
        synthesisModel: opts?.synthesisModel,
        sessionId: opts?.sessionId,
        webSearch: opts?.webSearch,
      }),
    });

    if (res.status === 401) {
      clearToken();
      if (typeof window !== 'undefined') window.location.href = '/login';
      opts?.onError?.('Unauthorized');
      return { modelResults, synthesis };
    }
    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}`;
      try { const d = await res.json(); errorMessage = (d as any)?.message || errorMessage; } catch { /* ignore */ }
      opts?.onError?.(errorMessage);
      return { modelResults, synthesis };
    }

    const reader = res.body?.getReader();
    if (!reader) { opts?.onError?.('No response body'); return { modelResults, synthesis }; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'model-result') {
            const r: MixModelResult = { modelId: data.modelId, modelName: data.modelName, provider: data.provider, content: data.content, error: data.error };
            modelResults.push(r);
            opts?.onModelResult?.(r);
          } else if (data.type === 'synthesis-start') {
            opts?.onSynthesisStart?.(data.model);
          } else if (data.type === 'synthesis-result') {
            synthesis = data.content;
            opts?.onSynthesisResult?.(data.content);
          } else if (data.type === 'done') {
            opts?.onDone?.();
          } else if (data.type === 'error') {
            opts?.onError?.(data.error);
          }
        } catch { /* skip */ }
      }
    }

    if (!synthesis) opts?.onDone?.();
  } catch (err: any) {
    if (err?.name === 'AbortError') { opts?.onDone?.(); return { modelResults, synthesis }; }
    opts?.onError?.(err.message || 'Network error');
  }

  return { modelResults, synthesis };
}

// ---- Debate (AI Research) ----
export type DebateAgent = {
  id: string;
  userId?: string | null;
  name: string;
  profile: string;
  systemPrompt?: string;
  description?: string | null;
  color?: string | null;
  category: 'DEBATER' | 'EVALUATOR' | 'SPECIALIST';
  displayOrder?: number;
};

export type DebateSession = {
  id: string;
  topic: string;
  agentIds: string[];
  maxRounds: number;
  currentRound: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';
  summary?: string | null;
  keyPoints: string[];
  consensus?: string | null;
  disagreements: string[];
  bestViewpoint?: string | null;
  mostInnovative?: string | null;
  goldenQuotes: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};

export type DebateMessage = {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  round: number;
  logicScore?: number | null;
  innovationScore?: number | null;
  expressionScore?: number | null;
  totalScore?: number | null;
  scoringReasons?: { logic?: string; innovation?: string; expression?: string } | null;
  createdAt: string;
};

export async function getDebateAgents(): Promise<DebateAgent[]> {
  return apiFetch('/debate/agents');
}

export async function createDebateAgent(payload: {
  name: string;
  profile: string;
  systemPrompt: string;
  description?: string;
  color?: string;
  category?: DebateAgent['category'];
}): Promise<DebateAgent> {
  return apiFetch('/debate/agents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDebateAgent(
  id: string,
  payload: Partial<{
    name: string;
    profile: string;
    systemPrompt: string;
    description: string;
    color: string;
    category: DebateAgent['category'];
  }>,
): Promise<DebateAgent> {
  return apiFetch(`/debate/agents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function listDebateSessions(): Promise<DebateSession[]> {
  return apiFetch('/debate/sessions');
}

export async function createDebateSession(payload: {
  topic: string;
  agentIds: string[];
  maxRounds?: number;
}): Promise<DebateSession> {
  return apiFetch('/debate/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getDebateSession(id: string): Promise<DebateSession> {
  return apiFetch(`/debate/sessions/${id}`);
}

export async function getDebateMessages(id: string): Promise<DebateMessage[]> {
  return apiFetch(`/debate/sessions/${id}/messages`);
}

export async function startDebateSession(id: string): Promise<{ status: string }> {
  return apiFetch(`/debate/sessions/${id}/start`, { method: 'POST' });
}

export function subscribeDebateStream(
  sessionId: string,
  handlers: {
    onReady?: () => void;
    onAgentStatus?: (data: { agentId: string; status: string }) => void;
    onNewMessage?: (data: DebateMessage) => void;
    onScoreUpdate?: (data: any) => void;
    onRoundComplete?: (data: { round: number }) => void;
    onComplete?: (data: DebateSession) => void;
    onError?: (message: string) => void;
  },
) {
  const token = getToken();
  if (!token) throw new Error('Unauthorized');

  const url = `${API_BASE}/debate/sessions/${sessionId}/stream?token=${encodeURIComponent(token)}`;
  const es = new EventSource(url);

  es.addEventListener('ready', () => handlers.onReady?.());
  es.addEventListener('agent-status', (event) => {
    try {
      handlers.onAgentStatus?.(JSON.parse((event as MessageEvent).data));
    } catch {}
  });
  es.addEventListener('new-message', (event) => {
    try {
      handlers.onNewMessage?.(JSON.parse((event as MessageEvent).data));
    } catch {}
  });
  es.addEventListener('score-update', (event) => {
    try {
      handlers.onScoreUpdate?.(JSON.parse((event as MessageEvent).data));
    } catch {}
  });
  es.addEventListener('round-complete', (event) => {
    try {
      handlers.onRoundComplete?.(JSON.parse((event as MessageEvent).data));
    } catch {}
  });
  es.addEventListener('debate-complete', (event) => {
    try {
      handlers.onComplete?.(JSON.parse((event as MessageEvent).data));
    } catch {}
  });

  es.addEventListener('error', (event) => {
    handlers.onError?.('Stream error');
  });

  return () => es.close();
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
  const data = await apiFetch(`/explore/youtube${qs ? `?${qs}` : ''}`);
  if (data && typeof data === 'object' && 'statusCode' in data && !('items' in data)) {
    const message = typeof data.message === 'string' ? data.message : 'YouTube data is unavailable';
    throw new Error(message);
  }
  return data as YoutubeExploreResponse;
}

export type PaperItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  tags: string[];
};

export type PapersExploreResponse = { items: PaperItem[] };

export async function getPapersExplore(params?: {
  q?: string;
  keywords?: string[];
  max?: number;
}): Promise<PapersExploreResponse> {
  const qp = new URLSearchParams();
  if (params?.q) qp.set('q', params.q);
  if (params?.keywords && params.keywords.length > 0) qp.set('keywords', params.keywords.join(','));
  if (params?.max) qp.set('max', String(params.max));
  const qs = qp.toString();
  const data = await apiFetch(`/explore/papers${qs ? `?${qs}` : ''}`);
  return (data as PapersExploreResponse) ?? { items: [] };
}

export type BlogItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  tags: string[];
};

export type BlogsExploreResponse = { items: BlogItem[] };

export async function getBlogsExplore(params?: {
  q?: string;
  keywords?: string[];
  max?: number;
}): Promise<BlogsExploreResponse> {
  const qp = new URLSearchParams();
  if (params?.q) qp.set('q', params.q);
  if (params?.keywords && params.keywords.length > 0) qp.set('keywords', params.keywords.join(','));
  if (params?.max) qp.set('max', String(params.max));
  const qs = qp.toString();
  const data = await apiFetch(`/explore/blogs${qs ? `?${qs}` : ''}`);
  return (data as BlogsExploreResponse) ?? { items: [] };
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

export async function renameSession(sessionId: string, title: string) {
  return apiFetch(`/ask/sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify({ title }) });
}

export async function deleteSession(sessionId: string) {
  return apiFetch(`/ask/sessions/${sessionId}`, { method: 'DELETE' });
}

// ---- Todos ----
export type TodoStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ARCHIVED';
export type RepeatRule = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface SubTaskItem {
  id: string;
  title: string;
  done: boolean;
  position: number;
}

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
  color?: string | null;
  repeatRule: RepeatRule;
  repeatEndAt?: string | null;
  knowledgeNoteId?: string | null;
  knowledgeNote?: { id: string; title: string } | null;
  createdAt: string;
  updatedAt: string;
  list: Pick<TodoList, 'id' | 'name' | 'color' | 'isInbox'>;
  subtasks: SubTaskItem[];
}

export interface TodoOverview {
  openCount: number;
  topTasks: TodoTask[];
}

export interface TodoSummary {
  summary: string;
  stats: { total: number; completed: number; overdue: number; completionRate: number };
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
  color?: string;
  repeatRule?: RepeatRule;
  repeatEndAt?: string;
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
    color?: string | null;
    repeatRule?: RepeatRule;
    repeatEndAt?: string | null;
  },
): Promise<TodoTask> {
  return apiFetch(`/todos/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteTodoTask(id: string): Promise<{ message: string }> {
  return apiFetch(`/todos/tasks/${id}`, { method: 'DELETE' });
}

// ---- Subtasks ----
export async function createSubtask(taskId: string, payload: { title: string }): Promise<SubTaskItem> {
  return apiFetch(`/todos/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateSubtask(subtaskId: string, payload: { title?: string; done?: boolean; position?: number }): Promise<SubTaskItem> {
  return apiFetch(`/todos/subtasks/${subtaskId}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteSubtask(subtaskId: string): Promise<{ message: string }> {
  return apiFetch(`/todos/subtasks/${subtaskId}`, { method: 'DELETE' });
}

// ---- Batch & Postpone ----
export async function batchTodoTasks(payload: { ids: string[]; action: 'done' | 'todo' | 'delete' }): Promise<{ affected: number }> {
  return apiFetch('/todos/tasks/batch', { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function postponeOverdueTasks(): Promise<{ affected: number }> {
  return apiFetch('/todos/tasks/postpone-overdue', { method: 'POST' });
}

// ---- AI Summary ----
export async function getTodoSummary(from: string, to: string): Promise<TodoSummary> {
  return apiFetch(`/todos/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

// ---- AI Decompose ----
export async function decomposeTodo(payload: {
  goal: string;
  listId?: string;
}): Promise<{ tasks: TodoTask[]; count: number }> {
  return apiFetch('/todos/tasks/decompose', { method: 'POST', body: JSON.stringify(payload) });
}

export async function rescheduleTasks(): Promise<{ ordered: Array<{ task: TodoTask; reason: string }> }> {
  return apiFetch('/todos/reschedule', { method: 'POST' });
}

export async function linkTaskKnowledge(taskId: string, noteId: string | null): Promise<TodoTask> {
  return apiFetch(`/todos/tasks/${taskId}/link-knowledge`, {
    method: 'PATCH',
    body: JSON.stringify({ noteId }),
  });
}

export async function createTaskFromNote(noteId: string, noteTitle: string): Promise<TodoTask> {
  const task = await createTodoTask({ title: `阅读：${noteTitle}` });
  return linkTaskKnowledge(task.id, noteId);
}

// ---- Knowledge ----
export type KnowledgeNote = {
  id: string;
  title: string;
  content: string;
  source?: string | null;
  sourceUrl?: string | null;
  tags: string[];
  metadata?: Record<string, any> | null;
  embeddedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeSearchResult = KnowledgeNote & { score: number };

export type KnowledgeEmbedStats = {
  total: number;
  embedded: number;
  ready: boolean;
};

export async function listKnowledgeNotes(params?: { q?: string; take?: number }): Promise<KnowledgeNote[]> {
  const qp = new URLSearchParams();
  if (params?.q) qp.set('q', params.q);
  if (params?.take) qp.set('take', String(params.take));
  const qs = qp.toString();
  return apiFetch(`/knowledge/notes${qs ? `?${qs}` : ''}`);
}

export async function createKnowledgeNote(payload: {
  title: string;
  content: string;
  source?: string;
  sourceUrl?: string;
  tags?: string[];
}): Promise<KnowledgeNote> {
  return apiFetch('/knowledge/notes', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateKnowledgeNote(
  id: string,
  payload: Partial<{ title: string; content: string; source: string; sourceUrl: string; tags: string[] }>,
): Promise<KnowledgeNote> {
  return apiFetch(`/knowledge/notes/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteKnowledgeNote(id: string): Promise<void> {
  return apiFetch(`/knowledge/notes/${id}`, { method: 'DELETE' });
}

export async function searchKnowledgeNotes(
  query: string,
  take?: number,
): Promise<KnowledgeSearchResult[]> {
  return apiFetch('/knowledge/search', {
    method: 'POST',
    body: JSON.stringify({ q: query, ...(take ? { take } : {}) }),
  });
}

export async function getKnowledgeEmbedStatus(): Promise<KnowledgeEmbedStats> {
  return apiFetch('/knowledge/embed-status');
}

export async function embedKnowledgeNote(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/knowledge/notes/${id}/embed`, { method: 'POST' });
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

// ---- Teams ----
export type TeamSummary = {
  id: string;
  name: string;
  description?: string | null;
  tags: string[];
  isPublic: boolean;
  ownerUserId: string;
  goal?: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  canvasJson?: unknown;
  createdAt: string;
  updatedAt: string;
  _count: { members: number; assistants: number; missions: number };
};

export type TeamMemberItem = {
  id: string;
  role: 'OWNER' | 'MEMBER';
  createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl?: string | null };
};

export type TeamAssistantItem = {
  id: string;
  teamId: string;
  displayName: string;
  modelId: string;
  provider?: string | null;
  roleTitle?: string | null;
  roleDescription?: string | null;
  isLeader: boolean;
  sortOrder: number;
  catalogId?: string | null;
  iconText?: string | null;
  accent?: string | null;
  asStatus: 'IDLE' | 'RUNNING' | 'DONE';
  createdAt: string;
};

export type TeamMissionItem = {
  id: string;
  teamId: string;
  title: string;
  description?: string | null;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
  totalTasks: number;
  completedTasks: number;
  leaderAssistant?: { id: string; displayName: string; isLeader: boolean } | null;
  _count?: { tasks: number; activities: number };
  createdAt: string;
};

export async function listTeams(): Promise<TeamSummary[]> {
  return apiFetch('/teams');
}

export async function createTeam(payload: {
  name: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  goal?: string;
}): Promise<TeamSummary> {
  return apiFetch('/teams', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getTeam(teamId: string): Promise<TeamSummary & { members: TeamMemberItem[]; assistants: TeamAssistantItem[] }> {
  return apiFetch(`/teams/${teamId}`);
}

export async function updateTeam(
  teamId: string,
  payload: Partial<{ name: string; description: string; tags: string[]; isPublic: boolean; goal: string; status: string; canvasJson: unknown }>,
): Promise<TeamSummary> {
  return apiFetch(`/teams/${teamId}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteTeam(teamId: string): Promise<void> {
  return apiFetch(`/teams/${teamId}`, { method: 'DELETE' });
}

export async function addTeamMember(teamId: string, payload: { email: string; role?: 'OWNER' | 'MEMBER' }): Promise<TeamMemberItem> {
  return apiFetch(`/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function removeTeamMember(teamId: string, targetUserId: string): Promise<void> {
  return apiFetch(`/teams/${teamId}/members/${targetUserId}`, { method: 'DELETE' });
}

export async function listTeamAssistants(teamId: string): Promise<TeamAssistantItem[]> {
  return apiFetch(`/teams/${teamId}/assistants`);
}

export async function createTeamAssistant(
  teamId: string,
  payload: { displayName: string; modelId: string; provider?: string; roleTitle?: string; roleDescription?: string; isLeader?: boolean; sortOrder?: number; catalogId?: string; iconText?: string; accent?: string; asStatus?: string },
): Promise<TeamAssistantItem> {
  return apiFetch(`/teams/${teamId}/assistants`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateTeamAssistant(
  teamId: string,
  assistantId: string,
  payload: { displayName?: string; roleTitle?: string; roleDescription?: string; isLeader?: boolean; asStatus?: string; sortOrder?: number },
): Promise<TeamAssistantItem> {
  return apiFetch(`/teams/${teamId}/assistants/${assistantId}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteTeamAssistant(teamId: string, assistantId: string): Promise<void> {
  return apiFetch(`/teams/${teamId}/assistants/${assistantId}`, { method: 'DELETE' });
}

export async function listTeamMissions(teamId: string): Promise<TeamMissionItem[]> {
  return apiFetch(`/teams/${teamId}/missions`);
}

export async function createTeamMission(
  teamId: string,
  payload: { title: string; description?: string; leaderAssistantId?: string; notificationEmail?: string },
): Promise<TeamMissionItem> {
  return apiFetch(`/teams/${teamId}/missions`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function getTeamMission(teamId: string, missionId: string): Promise<TeamMissionItem> {
  return apiFetch(`/teams/${teamId}/missions/${missionId}`);
}

// ─── AI Insights ──────────────────────────────────────────────────────────────

import type {
  InsightTopicSummary,
  InsightTopicDetail,
  NewInsightPayload,
  ResearchMember,
  AiTeamMember,
  ResearchTask,
  ResearchDirection,
  ReportSection,
  ReferenceItem,
  CredibilityData,
} from './ai-insights-data';

export async function listInsights(): Promise<InsightTopicSummary[]> {
  return apiFetch('/insights');
}

export async function createInsight(payload: NewInsightPayload): Promise<InsightTopicSummary> {
  return apiFetch('/insights', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getInsightDetail(id: string): Promise<InsightTopicDetail & { researchStatus?: string }> {
  return apiFetch(`/insights/${id}`);
}

export async function updateInsight(
  id: string,
  payload: Partial<NewInsightPayload>,
): Promise<InsightTopicSummary> {
  return apiFetch(`/insights/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteInsight(id: string): Promise<void> {
  return apiFetch(`/insights/${id}`, { method: 'DELETE' });
}

export async function updateInsightTeam(id: string, members: ResearchMember[]): Promise<void> {
  return apiFetch(`/insights/${id}/team`, {
    method: 'PUT',
    body: JSON.stringify({ members: members.map((m) => ({ name: m.name, role: m.role, status: m.status, tasks: m.tasks })) }),
  });
}

export async function updateInsightAiTeam(id: string, agents: AiTeamMember[]): Promise<void> {
  return apiFetch(`/insights/${id}/ai-team`, {
    method: 'PUT',
    body: JSON.stringify({ agents: agents.map((a) => ({ name: a.name, role: a.role, model: a.model, status: a.status, isLeader: a.isLeader ?? false, focus: a.focus })) }),
  });
}

export async function updateInsightTasks(id: string, tasks: ResearchTask[]): Promise<void> {
  return apiFetch(`/insights/${id}/tasks`, {
    method: 'PUT',
    body: JSON.stringify({ tasks: tasks.map((t) => ({ taskId: t.id, title: t.title, subtitle: t.subtitle, owner: t.owner, model: t.model, status: t.status })) }),
  });
}

export async function updateInsightDirections(id: string, directions: ResearchDirection[]): Promise<void> {
  return apiFetch(`/insights/${id}/directions`, {
    method: 'PUT',
    body: JSON.stringify({ directions: directions.map((d) => ({ title: d.title, status: d.status })) }),
  });
}

export async function updateInsightReport(id: string, sections: ReportSection[]): Promise<void> {
  return apiFetch(`/insights/${id}/report`, {
    method: 'PUT',
    body: JSON.stringify({ sections }),
  });
}

export async function updateInsightReferences(id: string, refs: ReferenceItem[]): Promise<void> {
  return apiFetch(`/insights/${id}/references`, {
    method: 'PUT',
    body: JSON.stringify({
      refs: refs.map((r) => ({ refId: String(r.id), title: r.title, domain: r.domain, excerpt: r.excerpt, score: r.score, tag: r.tag })),
    }),
  });
}

export async function updateInsightCredibility(id: string, data: CredibilityData): Promise<void> {
  return apiFetch(`/insights/${id}/credibility`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function startInsightResearch(
  id: string,
  opts?: { useWebSearch?: boolean; pauseAfterStages?: number[]; quickMode?: boolean },
): Promise<void> {
  return apiFetch(`/insights/${id}/research/start`, {
    method: 'POST',
    body: JSON.stringify(opts ?? {}),
  });
}

// Phase F1: Resume a paused research session with optional expert notes
export async function resumeInsightResearch(
  id: string,
  opts?: { userNotes?: string; modifiedAssignments?: Array<{ directionLabel: string; agentName: string; focus: string; approach: string }> },
): Promise<void> {
  return apiFetch(`/insights/${id}/research/resume`, {
    method: 'POST',
    body: JSON.stringify(opts ?? {}),
  });
}

export function streamInsightResearch(id: string, token: string): EventSource {
  const base = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1').replace('/api/v1', '');
  return new EventSource(`${base}/api/v1/insights/${id}/research/stream?token=${token}`);
}

export async function getInsightResearchStatus(id: string): Promise<{ status: string; progress: number; canResume: boolean }> {
  return apiFetch(`/insights/${id}/research/status`);
}

export async function runInsightPlan(
  id: string,
  modelIds: string[],
): Promise<{
  directions: string[];
  summary: string;
  teamSetup: Array<{ name: string; role: string; model: string; isLeader: boolean; focus: string; status: string }>;
}> {
  return apiFetch(`/insights/${id}/plan`, {
    method: 'POST',
    body: JSON.stringify({ modelIds }),
  });
}

export async function getInsightHealthCheck(): Promise<{
  tavilyConfigured: boolean;
  kbEnabled: boolean;
  defaultModel: string;
  defaultModelId: string;
}> {
  return apiFetch('/insights/health-check');
}

export async function suggestInsightDirections(id: string): Promise<{
  suggestions: Array<{ title: string; reason: string }>;
}> {
  return apiFetch(`/insights/${id}/suggest-directions`, { method: 'POST' });
}

export function followupInsightStream(
  id: string,
  question: string,
  token: string,
  onChunk: (text: string) => void,
  onDone: () => void,
): () => void {
  const base = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api/v1').replace('/api/v1', '');
  const ctrl = new AbortController();
  fetch(`${base}/api/v1/insights/${id}/followup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ question }),
    signal: ctrl.signal,
  })
    .then(async (res) => {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') { onDone(); return; }
            try { const obj = JSON.parse(data); if (obj.content) onChunk(obj.content); } catch { /* raw text */ if (data) onChunk(data); }
          }
        }
      }
      onDone();
    })
    .catch(() => onDone());
  return () => ctrl.abort();
}

export async function compareInsights(
  topicIdA: string,
  topicIdB: string,
): Promise<{
  similarities: string[];
  differences: string[];
  recommendation: string;
  confidenceA?: number;
  confidenceB?: number;
  topicA: { title: string; summary: string };
  topicB: { title: string; summary: string };
}> {
  return apiFetch('/insights/compare', { method: 'POST', body: JSON.stringify({ topicIdA, topicIdB }) });
}

export async function createInsightShareLink(id: string): Promise<{ shareToken: string }> {
  return apiFetch(`/insights/${id}/share`, { method: 'POST' });
}

export async function getSharedInsight(token: string): Promise<{
  title: string;
  subtitle?: string;
  category: string;
  icon: string;
  executiveSummary: string;
  keyFindings: string[];
  opportunities: string[];
  risks: string[];
  actionItems: string[];
  references: Array<{ title: string; domain: string; score: number }>;
  researchStatus: string;
}> {
  return apiFetch(`/insights/share/${token}`);
}

export async function cancelInsightResearch(id: string): Promise<void> {
  return apiFetch(`/insights/${id}/research`, { method: 'DELETE' });
}

export async function exportInsightMarkdown(id: string): Promise<void> {
  const token = getToken();
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  const res = await fetch(`${base}/api/v1/insights/${id}/export/markdown`, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
  });
  if (!res.ok) throw new Error('Markdown export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${id}-report.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- OpenClaw ----
export type OpenClawBridgeStatus = {
  bridgeConfigured: boolean;
  hasBridgeUser: boolean;
};

export async function fetchOpenClawBridgeStatus(): Promise<OpenClawBridgeStatus> {
  return apiFetch('/openclaw/bridge-status');
}

// ---- Frostland Game ----
export async function saveGame(data: {
  name?: string;
  gameState: Record<string, unknown>;
  daysSurvived: number;
  score: number;
  isAutosave?: boolean;
  isCompleted?: boolean;
  saveId?: string;
}) {
  return apiFetch('/game/saves', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listGameSaves(): Promise<
  {
    id: string;
    name: string;
    daysSurvived: number;
    score: number;
    isAutosave: boolean;
    isCompleted: boolean;
    createdAt: string;
    updatedAt: string;
  }[]
> {
  return apiFetch('/game/saves');
}

export async function loadGameSave(
  id: string,
): Promise<{ id: string; gameState: Record<string, unknown>; [key: string]: unknown }> {
  return apiFetch(`/game/saves/${id}`);
}

export async function deleteGameSave(id: string): Promise<{ deleted: boolean }> {
  return apiFetch(`/game/saves/${id}`, { method: 'DELETE' });
}

export async function getGameLeaderboard(
  limit = 20,
): Promise<
  {
    id: string;
    daysSurvived: number;
    score: number;
    updatedAt: string;
    user: { id: string; name: string; avatarUrl: string | null };
  }[]
> {
  return apiFetch(`/game/leaderboard?limit=${limit}`);
}
