export type TeamMemberRole = 'owner' | 'member';
export type TeamAssistantType = 'chat' | 'embedding' | 'rerank' | 'tool';
export type TeamStatus = 'active' | 'paused' | 'archived';

export interface TeamMember {
  id: string;
  name: string;
  role: TeamMemberRole;
  avatar: string;
  color: string;
  online?: boolean;
}

export interface TeamAssistant {
  id: string;
  name: string;
  model: string;
  provider: string;
  type: TeamAssistantType;
  role: string;
  summary?: string;
  iconText: string;
  accent: string;
  status?: 'idle' | 'running' | 'done';
}

export interface TeamCanvasNode {
  id: string;
  assistantId?: string;
  iconText?: string;
  label: string;
  subtitle?: string;
  role?: string;
  kind: 'leader' | 'assistant';
  x: number;
  y: number;
  progress?: { done: number; total: number };
  status?: 'idle' | 'running' | 'done';
  accent?: string;
}

export interface TeamCanvasEdge {
  id: string;
  from: string;
  to: string;
  status?: 'idle' | 'active' | 'done';
}

export interface TeamCanvas {
  nodes: TeamCanvasNode[];
  edges: TeamCanvasEdge[];
}

export interface Team {
  id: string;
  name: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  members: TeamMember[];
  assistants: TeamAssistant[];
  leaderId?: string;
  goal?: string;
  alerts?: number;
  status?: TeamStatus;
  canvas?: TeamCanvas;
}

export interface TeamDraft {
  name: string;
  description: string;
  tags: string[];
  assistantIds: string[];
  goal?: string;
}

export interface TeamAssistantCatalogItem {
  id: string;
  name: string;
  model: string;
  provider: string;
  type: TeamAssistantType;
  role: string;
  summary: string;
  iconText: string;
  accent: string;
  source?: 'builtin' | 'custom';
  keyProvider?: string;
  requiresKey?: boolean;
}

const STORAGE_KEY = 'raven_teams_v1';
const MODEL_KEYS_STORAGE = 'raven_model_keys_v1';
const CUSTOM_ASSISTANTS_STORAGE = 'raven_custom_assistants_v1';

function looksCorrupted(text: string | undefined | null): boolean {
  if (!text) return false;
  if (text.includes('???')) return true;
  if (text.includes('\ufffd')) return true;
  const qCount = (text.match(/\?/g) || []).length;
  return qCount >= 3 && qCount >= Math.floor(text.length * 0.25);
}

function teamLooksCorrupted(team: Team): boolean {
  if (looksCorrupted(team.name) || looksCorrupted(team.description) || looksCorrupted(team.goal)) return true;
  if (team.tags.some((tag) => looksCorrupted(tag))) return true;
  if (team.assistants.some((assistant) => looksCorrupted(assistant.role) || looksCorrupted(assistant.summary))) return true;
  return false;
}

const MEMBER_COLORS = ['#7C3AED', '#10B981', '#3B82F6', '#F59E0B', '#EC4899'];

export const TEAM_ASSISTANT_CATALOG: TeamAssistantCatalogItem[] = [
  {
    id: 'gpt-5.1',
    name: 'ChatGPT',
    model: 'gpt-5.1',
    provider: 'OpenAI',
    type: 'chat',
    role: '\u603b\u534f\u8c03',
    summary: '\u8d1f\u8d23\u7edf\u7b79\u4e0e\u4efb\u52a1\u62c6\u89e3',
    iconText: 'GPT',
    accent: 'from-emerald-500 to-green-600',
    source: 'builtin',
    keyProvider: 'OpenAI',
    requiresKey: true,
  },
  {
    id: 'gpt-4o',
    name: 'ChatGPT',
    model: 'gpt-4o',
    provider: 'OpenAI',
    type: 'chat',
    role: '\u884c\u4e1a\u7814\u7a76',
    summary: '\u8d8b\u52bf\u89e3\u8bfb\u4e0e\u6d1e\u5bdf\u603b\u7ed3',
    iconText: '4O',
    accent: 'from-teal-500 to-emerald-600',
    source: 'builtin',
    keyProvider: 'OpenAI',
    requiresKey: true,
  },
  {
    id: 'gpt-4.1-mini',
    name: 'ChatGPT',
    model: 'gpt-4.1-mini',
    provider: 'OpenAI',
    type: 'chat',
    role: '\u5feb\u68c0\u52a9\u624b',
    summary: '\u5feb\u901f\u8865\u5145\u4e0e\u6821\u9a8c\u8d44\u6599',
    iconText: '4.1',
    accent: 'from-cyan-500 to-sky-600',
    source: 'builtin',
    keyProvider: 'OpenAI',
    requiresKey: true,
  },
  {
    id: 'grok-4.1',
    name: 'Grok',
    model: 'grok-4.1',
    provider: 'xAI',
    type: 'chat',
    role: '\u7ade\u54c1\u60c5\u62a5',
    summary: '\u8ddf\u8e2a\u7ade\u4e89\u683c\u5c40\u4e0e\u52a8\u6001',
    iconText: 'X',
    accent: 'from-neutral-700 to-neutral-900',
    source: 'builtin',
    keyProvider: 'xAI',
    requiresKey: true,
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini',
    model: 'gemini-3-pro',
    provider: 'Google',
    type: 'chat',
    role: '\u6280\u672f\u8def\u7ebf',
    summary: '\u8bc4\u4f30\u6a21\u578b\u548c\u6280\u672f\u7a81\u7834',
    iconText: 'G',
    accent: 'from-sky-500 to-blue-600',
    source: 'builtin',
    keyProvider: 'Google',
    requiresKey: true,
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek',
    model: 'r1',
    provider: 'DeepSeek',
    type: 'chat',
    role: '\u5546\u4e1a\u5316\u5206\u6790',
    summary: '\u6d4b\u7b97\u5546\u4e1a\u673a\u4f1a\u4e0e\u98ce\u9669',
    iconText: 'DS',
    accent: 'from-indigo-500 to-purple-600',
    source: 'builtin',
    keyProvider: 'DeepSeek',
    requiresKey: true,
  },
  {
    id: 'cohere-rerank',
    name: 'Cohere',
    model: 'rerank',
    provider: 'Cohere',
    type: 'rerank',
    role: '\u8d44\u6599\u6392\u5e8f',
    summary: '\u5bf9\u8d44\u6599\u8fdb\u884c\u76f8\u5173\u5ea6\u6392\u5e8f',
    iconText: 'CR',
    accent: 'from-amber-500 to-orange-500',
    source: 'builtin',
    keyProvider: 'Cohere',
    requiresKey: true,
  },
  {
    id: 'doubao',
    name: 'Doubao',
    model: 'pro',
    provider: 'ByteDance',
    type: 'chat',
    role: '\u4e2d\u6587\u6574\u7406',
    summary: '\u672c\u5730\u5316\u5185\u5bb9\u91cd\u5199\u4e0e\u6574\u7406',
    iconText: 'DB',
    accent: 'from-rose-500 to-pink-500',
    source: 'builtin',
    keyProvider: 'ByteDance',
    requiresKey: true,
  },
  {
    id: 'gemini-embedding',
    name: 'Gemini',
    model: 'embedding',
    provider: 'Google',
    type: 'embedding',
    role: '\u5411\u91cf\u7d22\u5f15',
    summary: '\u77e5\u8bc6\u5e93\u5411\u91cf\u5316',
    iconText: 'EM',
    accent: 'from-violet-500 to-purple-600',
    source: 'builtin',
    keyProvider: 'Google',
    requiresKey: true,
  },
];

export interface ModelKeyMap {
  [provider: string]: string;
}

export interface CustomAssistantInput {
  name: string;
  model: string;
  provider: string;
  type: TeamAssistantType;
  role?: string;
  summary?: string;
  iconText?: string;
}

const PROVIDER_ACCENTS: Record<string, string> = {
  openai: 'from-emerald-500 to-green-600',
  google: 'from-sky-500 to-blue-600',
  xai: 'from-neutral-700 to-neutral-900',
  deepseek: 'from-indigo-500 to-purple-600',
  cohere: 'from-amber-500 to-orange-500',
  bytedance: 'from-rose-500 to-pink-500',
  anthropic: 'from-orange-500 to-amber-600',
};

export const PROVIDER_OPTIONS = [
  { id: 'OpenAI', label: 'OpenAI' },
  { id: 'Google', label: 'Google' },
  { id: 'xAI', label: 'xAI' },
  { id: 'DeepSeek', label: 'DeepSeek' },
  { id: 'Cohere', label: 'Cohere' },
  { id: 'ByteDance', label: 'ByteDance' },
  { id: 'Anthropic', label: 'Anthropic' },
];

function normalizeProvider(provider: string): string {
  return provider.trim().toLowerCase();
}

function accentForProvider(provider: string): string {
  const normalized = normalizeProvider(provider);
  return PROVIDER_ACCENTS[normalized] || 'from-slate-500 to-gray-600';
}

function iconFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'AI';
  const compact = trimmed.replace(/[^A-Za-z0-9\u4e00-\u9fa5]/g, '');
  if (compact.length >= 2) return compact.slice(0, 2).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

function createId(prefix: string) {
  const base = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${base}`;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function pickColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toIso(date: Date): string {
  return date.toISOString();
}

function formatSeedDate(): string {
  return new Date('2026-01-26T08:00:00.000Z').toISOString();
}

export function getAssistantCatalog(): TeamAssistantCatalogItem[] {
  return [...TEAM_ASSISTANT_CATALOG, ...loadCustomAssistants()];
}

export function loadModelKeys(): ModelKeyMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MODEL_KEYS_STORAGE);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ModelKeyMap;
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.entries(parsed).reduce<ModelKeyMap>((acc, [provider, key]) => {
      if (typeof key === 'string' && key.trim()) {
        acc[normalizeProvider(provider)] = key.trim();
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function saveModelKeys(keys: ModelKeyMap) {
  if (typeof window === 'undefined') return;
  const normalized: ModelKeyMap = {};
  Object.entries(keys).forEach(([provider, key]) => {
    if (key && key.trim()) {
      normalized[normalizeProvider(provider)] = key.trim();
    }
  });
  localStorage.setItem(MODEL_KEYS_STORAGE, JSON.stringify(normalized));
}

export function setModelKey(provider: string, key: string) {
  const keys = loadModelKeys();
  const normalized = normalizeProvider(provider);
  if (!key || !key.trim()) {
    delete keys[normalized];
  } else {
    keys[normalized] = key.trim();
  }
  saveModelKeys(keys);
}

export function getModelKey(provider: string): string | null {
  const keys = loadModelKeys();
  const normalized = normalizeProvider(provider);
  return keys[normalized] || null;
}

export function hasModelKey(provider?: string): boolean {
  if (!provider) return true;
  return !!getModelKey(provider);
}

export function loadCustomAssistants(): TeamAssistantCatalogItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_ASSISTANTS_STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const items = parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const name = String(item.name || '').trim();
        const model = String(item.model || '').trim();
        const provider = String(item.provider || '').trim();
        const type = String(item.type || '').trim() as TeamAssistantType;
        if (!name || !model || !provider) return null;
        return {
          id: String(item.id || createId('custom')),
          name,
          model,
          provider,
          type: (type || 'chat') as TeamAssistantType,
          role: String(item.role || '\u81ea\u5b9a\u4e49').trim() || '\u81ea\u5b9a\u4e49',
          summary: String(item.summary || '').trim() || '',
          iconText: String(item.iconText || '').trim() || iconFromName(name),
          accent: String(item.accent || '').trim() || accentForProvider(provider),
          source: 'custom' as const,
          keyProvider: provider,
          requiresKey: true,
        } as TeamAssistantCatalogItem;
      })
      .filter((item) => !!item) as TeamAssistantCatalogItem[];
    return items;
  } catch {
    return [];
  }
}

function saveCustomAssistants(items: TeamAssistantCatalogItem[]) {
  if (typeof window === 'undefined') return;
  const payload = items.map((item) => ({
    id: item.id,
    name: item.name,
    model: item.model,
    provider: item.provider,
    type: item.type,
    role: item.role,
    summary: item.summary,
    iconText: item.iconText,
    accent: item.accent,
  }));
  localStorage.setItem(CUSTOM_ASSISTANTS_STORAGE, JSON.stringify(payload));
}

export function buildCustomAssistant(input: CustomAssistantInput): TeamAssistantCatalogItem | null {
  const name = input.name.trim();
  const model = input.model.trim();
  const provider = input.provider.trim();
  if (!name || !model || !provider) return null;

  const next: TeamAssistantCatalogItem = {
    id: createId('custom'),
    name,
    model,
    provider,
    type: input.type,
    role: input.role?.trim() || '\u81ea\u5b9a\u4e49',
    summary: input.summary?.trim() || '',
    iconText: input.iconText?.trim() || iconFromName(name),
    accent: accentForProvider(provider),
    source: 'custom',
    keyProvider: provider,
    requiresKey: true,
  };
  return next;
}

export function addCustomAssistant(input: CustomAssistantInput): TeamAssistantCatalogItem | null {
  const existing = loadCustomAssistants();
  const next = buildCustomAssistant(input);
  if (!next) return null;
  saveCustomAssistants([next, ...existing]);
  return next;
}

export function removeCustomAssistant(id: string) {
  const existing = loadCustomAssistants();
  const next = existing.filter((item) => item.id !== id);
  saveCustomAssistants(next);
}

export function replaceCustomAssistants(items: TeamAssistantCatalogItem[]) {
  saveCustomAssistants(items);
}

export function resolveAssistants(ids: string[]): TeamAssistant[] {
  const catalog = getAssistantCatalog();
  return ids
    .map((id) => catalog.find((item) => item.id === id))
    .filter((item): item is TeamAssistantCatalogItem => !!item)
    .map((item) => ({
      id: item.id,
      name: item.name,
      model: item.model,
      provider: item.provider,
      type: item.type,
      role: item.role,
      summary: item.summary,
      iconText: item.iconText,
      accent: item.accent,
      status: 'idle' as const,
    }));
}

export function buildTeamCanvas(
  assistants: TeamAssistant[],
  leaderId?: string,
  options?: { progress?: { done: number; total: number }; status?: 'idle' | 'running' | 'done' },
): TeamCanvas {
  if (assistants.length === 0) return { nodes: [], edges: [] };

  const leader = assistants.find((a) => a.id === leaderId) || assistants[0];
  const followers = assistants.filter((a) => a.id !== leader.id);
  const progress = options?.progress ?? { done: 2, total: 2 };
  const status = options?.status ?? 'done';

  const leaderNode: TeamCanvasNode = {
    id: `node_${leader.id}`,
    assistantId: leader.id,
    iconText: leader.iconText,
    label: leader.name,
    subtitle: leader.model,
    role: leader.role,
    kind: 'leader',
    x: 50,
    y: 24,
    progress: { ...progress },
    status,
    accent: leader.accent,
  };

  const nodes: TeamCanvasNode[] = [leaderNode];

  const count = followers.length;
  const maxPerRow = 6;
  const rowCount = Math.max(1, Math.ceil(count / maxPerRow));
  const baseRowSize = Math.floor(count / rowCount);
  const remainder = count % rowCount;
  const rowYs = rowCount === 1
    ? [68]
    : Array.from({ length: rowCount }, (_, index) => {
      const top = 58;
      const bottom = 82;
      return top + (index * (bottom - top)) / (rowCount - 1);
    });

  let cursor = 0;
  rowYs.forEach((y, rowIndex) => {
    const rowSize = baseRowSize + (rowIndex < remainder ? 1 : 0);
    if (rowSize <= 0) return;
    const span = rowSize === 1 ? 0 : clamp(28 + (rowSize - 1) * 12, 28, 72);
    const xStart = rowSize === 1 ? 50 : 50 - span / 2;
    const xEnd = rowSize === 1 ? 50 : 50 + span / 2;
    for (let i = 0; i < rowSize; i += 1) {
      const assistant = followers[cursor + i];
      if (!assistant) continue;
      const x = rowSize === 1 ? 50 : xStart + (i * (xEnd - xStart)) / (rowSize - 1);
      nodes.push({
        id: `node_${assistant.id}`,
        assistantId: assistant.id,
        iconText: assistant.iconText,
        label: assistant.name,
        subtitle: assistant.model,
        role: assistant.role,
        kind: 'assistant',
        x,
        y,
        progress: { ...progress },
        status,
        accent: assistant.accent,
      });
    }
    cursor += rowSize;
  });

  const edges: TeamCanvasEdge[] = followers.map((assistant) => ({
    id: `edge_${leader.id}_${assistant.id}`,
    from: leaderNode.id,
    to: `node_${assistant.id}`,
    status: status === 'done' ? 'done' : status === 'running' ? 'active' : 'idle',
  }));

  return { nodes, edges };
}

export function createTeamFromDraft(draft: TeamDraft, ownerName?: string): Team {
  const assistants = resolveAssistants(draft.assistantIds);
  const leaderId = assistants[0]?.id;
  const now = toIso(new Date());

  return {
    id: createId('team'),
    name: draft.name.trim(),
    description: draft.description.trim(),
    tags: draft.tags,
    createdAt: now,
    updatedAt: now,
    members: [
      {
        id: createId('member'),
        name: ownerName || 'Owner',
        role: 'owner',
        avatar: initialsFromName(ownerName || 'Owner'),
        color: pickColor(0),
        online: true,
      },
    ],
    assistants,
    leaderId,
    goal: draft.goal?.trim() || draft.description.trim(),
    alerts: 0,
    status: 'active',
    canvas: buildTeamCanvas(assistants, leaderId, { progress: { done: 0, total: 2 }, status: 'idle' }),
  };
}

export function seedTeams(ownerName?: string): Team[] {
  const seedAssistants = resolveAssistants([
    'gpt-5.1',
    'grok-4.1',
    'gpt-4.1-mini',
    'gpt-4o',
    'gemini-3-pro',
  ]).map((assistant) => ({ ...assistant, status: 'done' as const }));
  const leaderId = seedAssistants[0]?.id;
  const seededAt = formatSeedDate();

  const memberOwnerName = ownerName || 'JUNJIE DUAN';
  const members: TeamMember[] = [
    {
      id: createId('member'),
      name: memberOwnerName,
      role: 'owner',
      avatar: initialsFromName(memberOwnerName),
      color: pickColor(0),
      online: true,
    },
    {
      id: createId('member'),
      name: 'Jiang Yi',
      role: 'member',
      avatar: initialsFromName('Jiang Yi'),
      color: pickColor(1),
      online: false,
    },
  ];

  const team: Team = {
    id: 'team-computing-industry',
    name: '\u8ba1\u7b97\u4ea7\u4e1a\u5206\u6790',
    description: '\u5206\u6790 2026 \u5e74 AI \u884c\u4e1a\u53d1\u5c55\u8d8b\u52bf\u3001\u6280\u672f\u7a81\u7834\u3001\u5e02\u573a\u89c4\u6a21\u4e0e\u6295\u8d44\u70ed\u70b9\u3002',
    tags: ['\u884c\u4e1a\u5206\u6790', 'AI', '\u6295\u8d44\u8d8b\u52bf'],
    createdAt: seededAt,
    updatedAt: seededAt,
    members,
    assistants: seedAssistants,
    leaderId,
    goal: '\u5206\u6790 2026 \u5e74 AI \u884c\u4e1a\u53d1\u5c55\u8d8b\u52bf\uff0c\u8986\u76d6\u6280\u672f\u7a81\u7834\u3001\u5e02\u573a\u89c4\u6a21\u4e0e\u6295\u8d44\u70ed\u70b9\u3002',
    alerts: 99,
    status: 'active',
    canvas: buildTeamCanvas(seedAssistants, leaderId),
  };

  return [team];
}

function safeParse(raw: string | null): Team[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as Team[];
  } catch {
    return null;
  }
}

export function loadTeams(ownerName?: string): Team[] {
  if (typeof window === 'undefined') return seedTeams(ownerName);
  const cached = safeParse(localStorage.getItem(STORAGE_KEY));
  if (cached && cached.length > 0) {
    const hasCorruption = cached.some((team) => teamLooksCorrupted(team));
    if (!hasCorruption) return cached;
  }
  const seeded = seedTeams(ownerName);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

export function saveTeams(teams: Team[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

export function findTeamById(teams: Team[], id: string): Team | undefined {
  return teams.find((team) => team.id === id);
}


