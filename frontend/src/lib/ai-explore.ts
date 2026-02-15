export type ExploreCategory = 'youtube' | 'paper' | 'blog' | 'report' | 'policy' | 'news';

export type LocalizedText = {
  en: string;
  zh: string;
};

export type ExploreItem = {
  id: string;
  category: ExploreCategory;
  title: LocalizedText;
  summary: LocalizedText;
  source: string;
  url: string;
  publishedAt: string;
  tags: string[];
  channel?: string;
  thumbnailUrl?: string;
};

export const exploreCategoryMeta: Record<
  ExploreCategory,
  { label: LocalizedText; description: LocalizedText }
> = {
  youtube: {
    label: { en: 'YouTube', zh: 'YouTube' },
    description: { en: 'Video talks and interviews', zh: '视频访谈与演讲' },
  },
  paper: {
    label: { en: 'Papers', zh: '论文' },
    description: { en: 'Latest arXiv preprints', zh: '来自 arXiv 的最新论文' },
  },
  blog: {
    label: { en: 'Blogs', zh: '博客' },
    description: { en: 'Research blogs and commentary', zh: '研究博客与观点' },
  },
  report: {
    label: { en: 'Reports', zh: '报告' },
    description: { en: 'Industry and market reports', zh: '行业与市场报告' },
  },
  policy: {
    label: { en: 'Policy', zh: '政策' },
    description: { en: 'Regulation and policy updates', zh: '政策法规与监管动态' },
  },
  news: {
    label: { en: 'News', zh: '新闻' },
    description: { en: 'Newsroom highlights', zh: '新闻资讯与快讯' },
  },
};

export const exploreItems: ExploreItem[] = [
  {
    id: 'yt-saas-2026',
    category: 'youtube',
    title: {
      en: 'AI org design for SaaS in 2026',
      zh: '2026 年 SaaS 组织的 AI 化设计',
    },
    summary: {
      en: 'A discussion on restructuring product, ops, and GTM for AI-first workflows.',
      zh: '讨论在 AI 优先流程下重构产品、运营与增长。',
    },
    source: 'YouTube',
    url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    publishedAt: '2026-02-13',
    tags: ['SaaS', 'Org', 'Strategy'],
    channel: 'AI Business Lab',
    thumbnailUrl: 'https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg',
  },
  {
    id: 'yt-macro-2026',
    category: 'youtube',
    title: {
      en: 'AI macro outlook: what leaders ask in 2026',
      zh: 'AI 宏观展望：2026 领导者关注的问题',
    },
    summary: {
      en: 'Panel highlights from global economic forums.',
      zh: '来自全球经济论坛的讨论要点。',
    },
    source: 'YouTube',
    url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
    publishedAt: '2026-02-11',
    tags: ['Macro', 'Leadership'],
    channel: 'Global Forum',
    thumbnailUrl: 'https://i.ytimg.com/vi/ysz5S6PUM-U/hqdefault.jpg',
  },
  {
    id: 'yt-agents-2026',
    category: 'youtube',
    title: {
      en: 'Building AI agents with safe tool chains',
      zh: '用安全工具链构建 AI Agent',
    },
    summary: {
      en: 'Hands-on walkthrough for safer agent workflows and evaluations.',
      zh: '演示更安全的 Agent 工作流与评估流程。',
    },
    source: 'YouTube',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    publishedAt: '2026-02-08',
    tags: ['Agents', 'Safety', 'Tools'],
    channel: 'AI Engineering',
    thumbnailUrl: 'https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg',
  },
  {
    id: 'arxiv-epiplexity',
    category: 'paper',
    title: {
      en: 'From Entropy to Epiplexity: Rethinking Information for Bounded Intelligence',
      zh: '从熵到 Epiplexity：重新思考有限智能的信息量',
    },
    summary: {
      en: 'Proposes epiplexity as a new measure for useful information in bounded learning.',
      zh: '提出 epiplexity 作为有限学习中的有用信息度量。',
    },
    source: 'arXiv',
    url: 'https://arxiv.org/abs/2501.01234',
    publishedAt: '2026-01-06',
    tags: ['Theory', 'Information'],
  },
  {
    id: 'arxiv-human-ai',
    category: 'paper',
    title: {
      en: 'Human-AI Collaboration for AIGC Image Production',
      zh: 'AIGC 图像生成的人机协作机制研究',
    },
    summary: {
      en: 'Explores collaboration workflows and credibility risks in AIGC production.',
      zh: '分析 AIGC 生产中的协作流程与可信度风险。',
    },
    source: 'arXiv',
    url: 'https://arxiv.org/abs/2512.13739',
    publishedAt: '2025-12-16',
    tags: ['AIGC', 'Collaboration'],
  },
  {
    id: 'blog-proxy',
    category: 'blog',
    title: {
      en: 'Customizing AI agent browsing with proxies and profiles',
      zh: '通过代理与配置文件定制 AI Agent 浏览',
    },
    summary: {
      en: 'A practical guide to safer, more controlled agent browsing.',
      zh: '介绍更安全可控的 Agent 浏览配置实践。',
    },
    source: 'AWS Blog',
    url: 'https://aws.amazon.com/blogs/machine-learning/',
    publishedAt: '2026-02-13',
    tags: ['Agents', 'Security'],
  },
  {
    id: 'blog-deploy-safety',
    category: 'blog',
    title: {
      en: 'Building safer deployment pipelines for AI systems',
      zh: '构建更安全的 AI 部署流水线',
    },
    summary: {
      en: 'Notes on policy checks, evaluations, and staged rollouts.',
      zh: '讨论政策检查、评估与分阶段发布。',
    },
    source: 'OpenAI Blog',
    url: 'https://openai.com/blog',
    publishedAt: '2026-01-22',
    tags: ['Safety', 'Ops'],
  },
  {
    id: 'report-ai-index-2026',
    category: 'report',
    title: {
      en: 'AI Index Report 2026',
      zh: 'AI Index 2026 报告',
    },
    summary: {
      en: 'Trends in research, industry adoption, and investment.',
      zh: '覆盖研究、产业应用与投资趋势。',
    },
    source: 'Stanford HAI',
    url: 'https://aiindex.stanford.edu/report/',
    publishedAt: '2026-02-01',
    tags: ['Report', 'Trends'],
  },
  {
    id: 'report-ai-governance',
    category: 'report',
    title: {
      en: 'Global AI Governance Outlook',
      zh: '全球 AI 治理展望',
    },
    summary: {
      en: 'A landscape of AI governance initiatives across regions.',
      zh: '梳理各地区 AI 治理倡议。',
    },
    source: 'World Economic Forum',
    url: 'https://www.weforum.org/reports',
    publishedAt: '2025-12-20',
    tags: ['Governance', 'Policy'],
  },
  {
    id: 'policy-us-eo',
    category: 'policy',
    title: {
      en: 'Executive order on safe, secure, and trustworthy AI',
      zh: '美国关于安全可信 AI 的行政令',
    },
    summary: {
      en: 'Outlines federal guardrails and agency responsibilities.',
      zh: '概述联邦护栏与机构职责。',
    },
    source: 'The White House',
    url: 'https://www.whitehouse.gov/briefing-room/',
    publishedAt: '2025-10-30',
    tags: ['US', 'Regulation'],
  },
  {
    id: 'policy-eu-ai-act',
    category: 'policy',
    title: {
      en: 'EU AI Act: regulatory framework overview',
      zh: '欧盟 AI 法案：监管框架概览',
    },
    summary: {
      en: 'A risk-based approach for high-impact AI systems.',
      zh: '基于风险的高影响 AI 监管框架。',
    },
    source: 'European Commission',
    url: 'https://digital-strategy.ec.europa.eu/en/policies/european-approach-artificial-intelligence',
    publishedAt: '2026-01-15',
    tags: ['EU', 'Compliance'],
  },
  {
    id: 'news-cloud-spend',
    category: 'news',
    title: {
      en: 'AI investment drives record cloud spending in 2026',
      zh: 'AI 投资推动 2026 云支出新高',
    },
    summary: {
      en: 'Cloud providers report surging demand for AI infrastructure.',
      zh: '云厂商报告 AI 基础设施需求激增。',
    },
    source: 'Reuters',
    url: 'https://www.reuters.com',
    publishedAt: '2026-02-10',
    tags: ['Cloud', 'Market'],
  },
  {
    id: 'news-startup-security',
    category: 'news',
    title: {
      en: 'AI startups focus on enterprise data security',
      zh: 'AI 初创公司聚焦企业数据安全',
    },
    summary: {
      en: 'Startups pivot to compliance-first enterprise offerings.',
      zh: '初创公司转向合规优先的企业方案。',
    },
    source: 'TechCrunch',
    url: 'https://techcrunch.com',
    publishedAt: '2026-02-08',
    tags: ['Startups', 'Security'],
  },
];

const STORAGE_PREFIX = 'raven_ai_explore_bookmarks';
const EVENT_NAME = 'raven:ai-explore-bookmarks';
const KEYWORDS_PREFIX = 'raven_ai_explore_keywords';
const KEYWORDS_EVENT = 'raven:ai-explore-keywords';

function storageKey(userId?: string | null): string {
  return `${STORAGE_PREFIX}_${userId || 'guest'}`;
}

function keywordsKey(userId?: string | null): string {
  return `${KEYWORDS_PREFIX}_${userId || 'guest'}`;
}

function normalizeBookmarks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item === 'string' && item.trim()) {
      unique.add(item);
    }
  }
  return Array.from(unique);
}

function normalizeKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!unique.has(key)) unique.set(key, trimmed);
  }
  return Array.from(unique.values());
}

export function loadExploreBookmarks(userId?: string | null): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    return normalizeBookmarks(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveExploreBookmarks(userId: string | null | undefined, items: string[]): string[] {
  if (typeof window === 'undefined') return [];
  const normalized = normalizeBookmarks(items);
  window.localStorage.setItem(storageKey(userId), JSON.stringify(normalized));
  emitExploreBookmarksChanged();
  return normalized;
}

export function toggleExploreBookmark(userId: string | null | undefined, itemId: string): string[] {
  const current = loadExploreBookmarks(userId);
  const set = new Set(current);
  if (set.has(itemId)) {
    set.delete(itemId);
  } else {
    set.add(itemId);
  }
  return saveExploreBookmarks(userId, Array.from(set));
}

export function emitExploreBookmarksChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function subscribeExploreBookmarks(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key && event.key.startsWith(STORAGE_PREFIX)) {
      cb();
    }
  };
  window.addEventListener(EVENT_NAME, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function loadExploreKeywords(userId?: string | null): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(keywordsKey(userId));
    if (!raw) return [];
    return normalizeKeywords(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveExploreKeywords(userId: string | null | undefined, items: string[]): string[] {
  if (typeof window === 'undefined') return [];
  const normalized = normalizeKeywords(items);
  window.localStorage.setItem(keywordsKey(userId), JSON.stringify(normalized));
  emitExploreKeywordsChanged();
  return normalized;
}

export function addExploreKeyword(userId: string | null | undefined, keyword: string): string[] {
  const current = loadExploreKeywords(userId);
  return saveExploreKeywords(userId, [...current, keyword]);
}

export function removeExploreKeyword(userId: string | null | undefined, keyword: string): string[] {
  const current = loadExploreKeywords(userId);
  const target = keyword.trim().toLowerCase();
  const next = current.filter((item) => item.trim().toLowerCase() !== target);
  return saveExploreKeywords(userId, next);
}

export function emitExploreKeywordsChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(KEYWORDS_EVENT));
}

export function subscribeExploreKeywords(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key && event.key.startsWith(KEYWORDS_PREFIX)) {
      cb();
    }
  };
  window.addEventListener(KEYWORDS_EVENT, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(KEYWORDS_EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function isExploreCategory(value: string | null | undefined): value is ExploreCategory {
  return (
    value === 'youtube'
    || value === 'paper'
    || value === 'blog'
    || value === 'report'
    || value === 'policy'
    || value === 'news'
  );
}

export function getExploreCategoryLabel(category: ExploreCategory, locale: 'en' | 'zh'): string {
  return locale === 'zh' ? exploreCategoryMeta[category].label.zh : exploreCategoryMeta[category].label.en;
}

export function getExploreCategoryDescription(category: ExploreCategory, locale: 'en' | 'zh'): string {
  return locale === 'zh'
    ? exploreCategoryMeta[category].description.zh
    : exploreCategoryMeta[category].description.en;
}

export function countBookmarksByCategory(bookmarks: string[]): Record<ExploreCategory, number> {
  const counts: Record<ExploreCategory, number> = {
    youtube: 0,
    paper: 0,
    blog: 0,
    report: 0,
    policy: 0,
    news: 0,
  };
  const set = new Set(bookmarks);
  for (const item of exploreItems) {
    if (set.has(item.id)) {
      counts[item.category] += 1;
    }
  }
  return counts;
}
