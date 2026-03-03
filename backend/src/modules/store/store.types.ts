export type StoreItemType = 'tool' | 'skill';

export type StoreItemSource = 'curated' | 'github' | 'internal' | 'custom';

export type StoreItemPricing = 'free' | 'freemium' | 'paid' | 'open_source';

export interface StoreItemLink {
  label: string;
  url: string;
}

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
  links?: StoreItemLink[];
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

