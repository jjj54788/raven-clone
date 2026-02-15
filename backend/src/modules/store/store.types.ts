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
  githubRepoUrl?: string;
  githubStars?: number;
  createdAt?: string;
  updatedAt?: string;
}

