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

const STORAGE_KEY = 'gewu_teams_v1';
const MODEL_KEYS_STORAGE = 'gewu_model_keys_v1';
const CUSTOM_ASSISTANTS_STORAGE = 'gewu_custom_assistants_v1';

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
  // ---- American Providers ----
  {
    id: 'gpt-4.1', name: 'GPT 4.1', model: 'gpt-4.1', provider: 'OpenAI', type: 'chat',
    role: '总协调', summary: '负责统筹与任务拆解',
    iconText: 'GPT', accent: 'from-emerald-500 to-green-600',
    source: 'builtin', keyProvider: 'OpenAI', requiresKey: true,
  },
  {
    id: 'gpt-4o', name: 'GPT 4o', model: 'gpt-4o', provider: 'OpenAI', type: 'chat',
    role: '行业研究', summary: '趋势解读与洞察总结',
    iconText: '4O', accent: 'from-teal-500 to-emerald-600',
    source: 'builtin', keyProvider: 'OpenAI', requiresKey: true,
  },
  {
    id: 'gpt-4.1-mini', name: 'GPT 4.1 Mini', model: 'gpt-4.1-mini', provider: 'OpenAI', type: 'chat',
    role: '快检助手', summary: '快速补充与校验资料',
    iconText: '4.1', accent: 'from-cyan-500 to-sky-600',
    source: 'builtin', keyProvider: 'OpenAI', requiresKey: true,
  },
  {
    id: 'o3-mini', name: 'o3 Mini', model: 'o3-mini', provider: 'OpenAI', type: 'chat',
    role: '推理分析', summary: '复杂逻辑推理与数学',
    iconText: 'O3', accent: 'from-green-600 to-emerald-700',
    source: 'builtin', keyProvider: 'OpenAI', requiresKey: true,
  },
  {
    id: 'claude-opus-4-6', name: 'Claude Opus 4.6', model: 'claude-opus-4-6', provider: 'Anthropic', type: 'chat',
    role: '深度研究', summary: '长文分析与复杂推理',
    iconText: 'CL', accent: 'from-orange-500 to-amber-600',
    source: 'builtin', keyProvider: 'Anthropic', requiresKey: true,
  },
  {
    id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', model: 'claude-sonnet-4-6', provider: 'Anthropic', type: 'chat',
    role: '写作编辑', summary: '高质量文档与报告撰写',
    iconText: 'CL', accent: 'from-amber-500 to-yellow-600',
    source: 'builtin', keyProvider: 'Anthropic', requiresKey: true,
  },
  {
    id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', model: 'gemini-2.5-pro', provider: 'Google', type: 'chat',
    role: '技术路线', summary: '评估模型和技术突破',
    iconText: 'G', accent: 'from-sky-500 to-blue-600',
    source: 'builtin', keyProvider: 'Google', requiresKey: true,
  },
  {
    id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', model: 'gemini-2.5-flash', provider: 'Google', type: 'chat',
    role: '快速应答', summary: '轻量级高速推理',
    iconText: 'G', accent: 'from-blue-500 to-indigo-600',
    source: 'builtin', keyProvider: 'Google', requiresKey: true,
  },
  {
    id: 'grok-3', name: 'Grok 3', model: 'grok-3', provider: 'xAI', type: 'chat',
    role: '竞品情报', summary: '跟踪竞争格局与动态',
    iconText: 'X', accent: 'from-neutral-700 to-neutral-900',
    source: 'builtin', keyProvider: 'xAI', requiresKey: true,
  },
  {
    id: 'llama-3.3-70b', name: 'Llama 3.3 70B', model: 'llama-3.3-70b-versatile', provider: 'Groq', type: 'chat',
    role: '开源推理', summary: '开源模型高速推理',
    iconText: 'LL', accent: 'from-blue-600 to-violet-600',
    source: 'builtin', keyProvider: 'Groq', requiresKey: true,
  },
  // ---- Chinese Providers ----
  {
    id: 'deepseek-chat', name: 'DeepSeek V3', model: 'deepseek-chat', provider: 'DeepSeek', type: 'chat',
    role: '通用对话', summary: '高性价比通用对话模型',
    iconText: 'DS', accent: 'from-indigo-500 to-purple-600',
    source: 'builtin', keyProvider: 'DeepSeek', requiresKey: true,
  },
  {
    id: 'deepseek-reasoner', name: 'DeepSeek R1', model: 'deepseek-reasoner', provider: 'DeepSeek', type: 'chat',
    role: '商业化分析', summary: '测算商业机会与风险',
    iconText: 'DS', accent: 'from-purple-500 to-violet-600',
    source: 'builtin', keyProvider: 'DeepSeek', requiresKey: true,
  },
  {
    id: 'qwen-max', name: 'Qwen Max', model: 'qwen-max', provider: 'Qwen', type: 'chat',
    role: '中文旗舰', summary: '阿里通义千问旗舰模型',
    iconText: 'QW', accent: 'from-violet-500 to-purple-600',
    source: 'builtin', keyProvider: 'Qwen', requiresKey: true,
  },
  {
    id: 'qwen-plus', name: 'Qwen Plus', model: 'qwen-plus', provider: 'Qwen', type: 'chat',
    role: '中文增强', summary: '性价比极高的中文模型',
    iconText: 'QW', accent: 'from-fuchsia-500 to-pink-600',
    source: 'builtin', keyProvider: 'Qwen', requiresKey: true,
  },
  {
    id: 'glm-4-plus', name: 'GLM-4 Plus', model: 'glm-4-plus', provider: 'Zhipu', type: 'chat',
    role: '智谱旗舰', summary: '智谱清言旗舰推理模型',
    iconText: 'ZP', accent: 'from-blue-500 to-cyan-600',
    source: 'builtin', keyProvider: 'Zhipu', requiresKey: true,
  },
  {
    id: 'moonshot-v1-128k', name: 'Kimi 128K', model: 'moonshot-v1-128k', provider: 'Moonshot', type: 'chat',
    role: '长文理解', summary: '超长上下文理解与分析',
    iconText: 'KM', accent: 'from-slate-600 to-zinc-800',
    source: 'builtin', keyProvider: 'Moonshot', requiresKey: true,
  },
  {
    id: 'yi-large', name: 'Yi Large', model: 'yi-large', provider: 'Yi', type: 'chat',
    role: '双语理解', summary: '零一万物中英双语模型',
    iconText: 'YI', accent: 'from-lime-500 to-green-600',
    source: 'builtin', keyProvider: 'Yi', requiresKey: true,
  },
  {
    id: 'step-2-16k', name: 'Step-2 16K', model: 'step-2-16k', provider: 'Stepfun', type: 'chat',
    role: '多模态', summary: '阶跃星辰多模态模型',
    iconText: 'SF', accent: 'from-pink-500 to-rose-600',
    source: 'builtin', keyProvider: 'Stepfun', requiresKey: true,
  },
  {
    id: 'doubao-pro', name: 'Doubao Pro', model: 'doubao-pro-32k', provider: 'Doubao', type: 'chat',
    role: '中文整理', summary: '本地化内容重写与整理',
    iconText: 'DB', accent: 'from-rose-500 to-pink-500',
    source: 'builtin', keyProvider: 'Doubao', requiresKey: true,
  },
  // ---- Utility ----
  {
    id: 'cohere-rerank', name: 'Cohere', model: 'rerank', provider: 'Cohere', type: 'rerank',
    role: '资料排序', summary: '对资料进行相关度排序',
    iconText: 'CR', accent: 'from-amber-500 to-orange-500',
    source: 'builtin', keyProvider: 'Cohere', requiresKey: true,
  },
  {
    id: 'gemini-embedding', name: 'Gemini', model: 'embedding', provider: 'Google', type: 'embedding',
    role: '向量索引', summary: '知识库向量化',
    iconText: 'EM', accent: 'from-violet-500 to-purple-600',
    source: 'builtin', keyProvider: 'Google', requiresKey: true,
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
  anthropic: 'from-orange-500 to-amber-600',
  google: 'from-sky-500 to-blue-600',
  xai: 'from-neutral-700 to-neutral-900',
  groq: 'from-blue-600 to-violet-600',
  deepseek: 'from-indigo-500 to-purple-600',
  qwen: 'from-violet-500 to-purple-600',
  zhipu: 'from-blue-500 to-cyan-600',
  moonshot: 'from-slate-600 to-zinc-800',
  yi: 'from-lime-500 to-green-600',
  stepfun: 'from-pink-500 to-rose-600',
  doubao: 'from-rose-500 to-pink-500',
  bytedance: 'from-rose-500 to-pink-500',
  cohere: 'from-amber-500 to-orange-500',
};

export const PROVIDER_OPTIONS = [
  { id: 'OpenAI', label: 'OpenAI' },
  { id: 'Anthropic', label: 'Anthropic' },
  { id: 'Google', label: 'Google' },
  { id: 'xAI', label: 'xAI' },
  { id: 'Groq', label: 'Groq' },
  { id: 'DeepSeek', label: 'DeepSeek' },
  { id: 'Qwen', label: 'Qwen (通义千问)' },
  { id: 'Zhipu', label: 'Zhipu (智谱)' },
  { id: 'Moonshot', label: 'Moonshot (Kimi)' },
  { id: 'Yi', label: 'Yi (零一万物)' },
  { id: 'Stepfun', label: 'Stepfun (阶跃星辰)' },
  { id: 'Doubao', label: 'Doubao (豆包)' },
  { id: 'Cohere', label: 'Cohere' },
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
    'gpt-4.1',
    'claude-sonnet-4-6',
    'deepseek-chat',
    'gemini-2.5-pro',
    'qwen-plus',
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

// ---- Backend → Frontend Adapters ----

function pickColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return pickColor(Math.abs(hash));
}

function iconTextForProvider(provider: string): string {
  const norm = normalizeProvider(provider);
  if (norm === 'openai') return 'GPT';
  if (norm === 'anthropic') return 'CL';
  if (norm === 'google') return 'G';
  if (norm === 'xai') return 'X';
  if (norm === 'groq') return 'LL';
  if (norm === 'deepseek') return 'DS';
  if (norm === 'qwen') return 'QW';
  if (norm === 'zhipu') return 'ZP';
  if (norm === 'moonshot') return 'KM';
  if (norm === 'yi') return 'YI';
  if (norm === 'stepfun') return 'SF';
  if (norm === 'doubao' || norm === 'bytedance') return 'DB';
  if (norm === 'cohere') return 'CR';
  return iconFromName(provider);
}

export function apiAssistantToFrontend(a: {
  id: string; displayName: string; modelId: string; provider?: string | null;
  roleTitle?: string | null; isLeader: boolean; sortOrder: number;
  iconText?: string | null; accent?: string | null; asStatus?: string | null;
}): TeamAssistant {
  return {
    id: a.id,
    name: a.displayName,
    model: a.modelId,
    provider: a.provider ?? '',
    type: 'chat',
    role: a.roleTitle ?? '',
    iconText: a.iconText ?? iconTextForProvider(a.provider ?? ''),
    accent: a.accent ?? accentForProvider(a.provider ?? ''),
    status: ((a.asStatus ?? 'IDLE').toLowerCase() as 'idle' | 'running' | 'done'),
  };
}

export function apiMemberToFrontend(m: {
  id: string; role: string; user: { id: string; name: string; email: string; avatarUrl?: string | null };
}): TeamMember {
  return {
    id: m.user.id,
    name: m.user.name,
    role: (m.role.toLowerCase() === 'owner' ? 'owner' : 'member') as TeamMemberRole,
    avatar: initialsFromName(m.user.name),
    color: pickColorFromId(m.user.id),
    online: false,
  };
}

export function apiTeamSummaryToTeam(api: {
  id: string; name: string; description?: string | null; tags: string[];
  goal?: string | null; status?: string | null; canvasJson?: unknown;
  ownerUserId: string; createdAt: string; updatedAt: string;
}): Team {
  return {
    id: api.id,
    name: api.name,
    description: api.description ?? '',
    tags: api.tags ?? [],
    goal: api.goal ?? undefined,
    status: ((api.status ?? 'ACTIVE').toLowerCase() as TeamStatus),
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
    members: [],
    assistants: [],
    canvas: api.canvasJson ? (api.canvasJson as TeamCanvas) : undefined,
  };
}

export function apiTeamDetailToTeam(api: {
  id: string; name: string; description?: string | null; tags: string[];
  goal?: string | null; status?: string | null; canvasJson?: unknown;
  ownerUserId: string; createdAt: string; updatedAt: string;
  members?: Array<{ id: string; role: string; user: { id: string; name: string; email: string; avatarUrl?: string | null } }>;
  assistants?: Array<{ id: string; displayName: string; modelId: string; provider?: string | null; roleTitle?: string | null; isLeader: boolean; sortOrder: number; iconText?: string | null; accent?: string | null; asStatus?: string | null }>;
}): Team {
  const assistants = (api.assistants ?? []).map(apiAssistantToFrontend);
  const leader = (api.assistants ?? []).find((a) => a.isLeader);
  return {
    id: api.id,
    name: api.name,
    description: api.description ?? '',
    tags: api.tags ?? [],
    goal: api.goal ?? undefined,
    status: ((api.status ?? 'ACTIVE').toLowerCase() as TeamStatus),
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
    members: (api.members ?? []).map(apiMemberToFrontend),
    assistants,
    leaderId: leader?.id ?? assistants[0]?.id,
    canvas: api.canvasJson
      ? (api.canvasJson as TeamCanvas)
      : buildTeamCanvas(assistants, leader?.id ?? assistants[0]?.id),
  };
}

// Convert a backend /ai/models item to a catalog item
export function modelToCatalogItem(m: { id: string; name: string; provider: string }): TeamAssistantCatalogItem {
  return {
    id: m.id,
    name: m.name,
    model: m.id,
    provider: m.provider,
    type: 'chat',
    role: '',
    summary: '',
    iconText: iconTextForProvider(m.provider),
    accent: accentForProvider(m.provider),
    source: 'builtin',
    keyProvider: m.provider,
    requiresKey: false,
  };
}

// ---- User Custom Models ----

const USER_MODELS_STORAGE = 'gewu_user_models_v1';

export interface UserCustomModel {
  id: string;       // model ID sent to API (e.g. "gpt-4o")
  name: string;     // display name (e.g. "GPT 4o")
  provider: string; // provider label matching API_PROVIDERS (e.g. "OpenAI")
}

const PROVIDER_MODEL_SUGGESTIONS: Record<string, { id: string; name: string }[]> = {
  openai: [
    { id: 'gpt-4.1', name: 'GPT 4.1' },
    { id: 'gpt-4.1-mini', name: 'GPT 4.1 Mini' },
    { id: 'gpt-4o', name: 'GPT 4o' },
    { id: 'gpt-4o-mini', name: 'GPT 4o Mini' },
    { id: 'o3-mini', name: 'o3 Mini' },
  ],
  anthropic: [
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
  ],
  google: [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  ],
  xai: [
    { id: 'grok-3', name: 'Grok 3' },
    { id: 'grok-3-mini', name: 'Grok 3 Mini' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek V3' },
    { id: 'deepseek-reasoner', name: 'DeepSeek R1' },
  ],
  qwen: [
    { id: 'qwen-max', name: 'Qwen Max' },
    { id: 'qwen-plus', name: 'Qwen Plus' },
    { id: 'qwen-turbo', name: 'Qwen Turbo' },
  ],
  zhipu: [
    { id: 'glm-4-plus', name: 'GLM-4 Plus' },
    { id: 'glm-4-flash', name: 'GLM-4 Flash' },
  ],
  moonshot: [
    { id: 'moonshot-v1-128k', name: 'Kimi 128K' },
    { id: 'moonshot-v1-32k', name: 'Kimi 32K' },
    { id: 'moonshot-v1-8k', name: 'Kimi 8K' },
  ],
  yi: [
    { id: 'yi-large', name: 'Yi Large' },
    { id: 'yi-medium', name: 'Yi Medium' },
  ],
  stepfun: [
    { id: 'step-2-16k', name: 'Step-2 16K' },
    { id: 'step-1-8k', name: 'Step-1 8K' },
  ],
  doubao: [
    { id: 'doubao-pro-32k', name: 'Doubao Pro' },
    { id: 'doubao-lite-32k', name: 'Doubao Lite' },
  ],
  cohere: [
    { id: 'command-r-plus', name: 'Command R+' },
    { id: 'command-r', name: 'Command R' },
  ],
};

export function getProviderModelSuggestions(provider: string): { id: string; name: string }[] {
  return PROVIDER_MODEL_SUGGESTIONS[normalizeProvider(provider)] ?? [];
}

export function loadUserModels(): UserCustomModel[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USER_MODELS_STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m): m is UserCustomModel =>
      m && typeof m.id === 'string' && typeof m.name === 'string' && typeof m.provider === 'string'
    );
  } catch { return []; }
}

export function saveUserModels(models: UserCustomModel[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_MODELS_STORAGE, JSON.stringify(models));
}

export function addUserModel(model: UserCustomModel): void {
  const existing = loadUserModels();
  if (existing.some((m) => m.id === model.id)) return;
  saveUserModels([...existing, model]);
}

export function removeUserModel(modelId: string): void {
  saveUserModels(loadUserModels().filter((m) => m.id !== modelId));
}


