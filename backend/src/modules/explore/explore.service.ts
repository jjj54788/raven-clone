import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Parser from 'rss-parser';
import { YoutubeExploreQueryDto } from './dto/youtube-explore-query.dto';
import { PapersExploreQueryDto } from './dto/papers-explore-query.dto';
import { BlogsExploreQueryDto } from './dto/blogs-explore-query.dto';

// ── YouTube types ──────────────────────────────────────────────────────────────
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

// ── Paper types ────────────────────────────────────────────────────────────────
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

// ── Blog types ─────────────────────────────────────────────────────────────────
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

// ── Internal helpers ───────────────────────────────────────────────────────────
type RssChannel = { id: string; label: string };
type BlogFeed   = { url: string; label: string };

type YoutubeSearchResponse = {
  nextPageToken?: string;
  prevPageToken?: string;
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      publishedAt?: string;
      thumbnails?: {
        medium?: { url?: string };
        high?: { url?: string };
        default?: { url?: string };
      };
    };
  }>;
};

const DEFAULT_RSS_CHANNELS: RssChannel[] = [
  { id: 'UCXZCJLdBC09xxGZ6gcdrc6A', label: 'OpenAI' },
  { id: 'UCcIXc5mJsHVYTZR1maL5l9w', label: 'DeepLearning.AI' },
  { id: 'UCbfYPyITQ-7l4upoX8nvctg', label: 'Two Minute Papers' },
  { id: 'UCZHmQk67mSJgfCCTn7xBfew', label: 'Yannic Kilcher' },
  { id: 'UCSHZKyawb77ixDdsGog4iWA', label: 'Lex Fridman' },
  { id: 'UC0rqucBdTuFTjJiefW5t-IQ', label: 'TensorFlow' },
];

const DEFAULT_BLOG_FEEDS: BlogFeed[] = [
  { url: 'https://huggingface.co/blog/feed.xml',                    label: 'HuggingFace' },
  { url: 'https://openai.com/news/rss.xml',                         label: 'OpenAI' },
  { url: 'https://www.anthropic.com/rss.xml',                       label: 'Anthropic' },
  { url: 'https://blog.research.google/feeds/posts/default',        label: 'Google Research' },
  { url: 'https://thegradient.pub/rss/',                            label: 'The Gradient' },
  { url: 'https://bair.berkeley.edu/blog/feed.xml',                 label: 'BAIR' },
];

@Injectable()
export class ExploreService {
  private readonly rssParser = new Parser();

  // ── Simple in-memory TTL cache ─────────────────────────────────────────────
  private readonly _cache = new Map<string, { data: unknown; exp: number }>();

  private ttlGet<T>(key: string): T | null {
    const entry = this._cache.get(key);
    if (!entry || Date.now() > entry.exp) {
      this._cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private ttlSet(key: string, data: unknown, ttlMs = 3_600_000): void {
    this._cache.set(key, { data, exp: Date.now() + ttlMs });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // YouTube
  // ══════════════════════════════════════════════════════════════════════════════

  async searchYoutube(query: YoutubeExploreQueryDto): Promise<YoutubeExploreResponse> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return this.searchYoutubeRss(query);
    }

    try {
      const q = this.buildYoutubeQuery(query);
      const maxResults = query.maxResults ?? 12;
      const order = query.order === 'relevance' ? 'relevance' : 'date';

      const params = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        q,
        maxResults: String(maxResults),
        order,
        safeSearch: 'moderate',
        key: apiKey,
      });
      if (query.pageToken) params.set('pageToken', query.pageToken);

      const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new ServiceUnavailableException(`YouTube API error (${res.status})`);
      }

      const data = await res.json() as YoutubeSearchResponse;
      const items = (data.items ?? []).map((item) => {
        const videoId = item.id?.videoId || '';
        const snippet = item.snippet || {};
        const thumbnailUrl = snippet.thumbnails?.high?.url
          || snippet.thumbnails?.medium?.url
          || snippet.thumbnails?.default?.url;
        return {
          id: videoId,
          title: snippet.title || 'Untitled',
          description: snippet.description || '',
          url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
          channel: snippet.channelTitle || 'YouTube',
          publishedAt: snippet.publishedAt || '',
          thumbnailUrl,
        };
      }).filter((item) => item.id && item.url);

      let finalItems = items;
      if (query.order === 'oldest') {
        finalItems = items.sort((a, b) => {
          const aTime = new Date(a.publishedAt).getTime();
          const bTime = new Date(b.publishedAt).getTime();
          if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return 0;
          return aTime - bTime;
        });
      }

      return {
        items: finalItems,
        nextPageToken: data.nextPageToken,
        prevPageToken: data.prevPageToken,
      };
    } catch {
      return this.searchYoutubeRss(query);
    }
  }

  private buildYoutubeQuery(query: YoutubeExploreQueryDto): string {
    const parts: string[] = [];
    if (query.q?.trim()) parts.push(query.q.trim());
    if (query.keywords) {
      const keywords = query.keywords
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      parts.push(...keywords);
    }
    return parts.join(' ').trim() || 'AI';
  }

  private getRssChannels(): RssChannel[] {
    const raw = process.env.YOUTUBE_RSS_CHANNELS;
    if (!raw) return DEFAULT_RSS_CHANNELS;
    const parsed = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [id, label] = entry.split('|').map((part) => part.trim());
        if (!id) return null;
        return { id, label: label || id };
      })
      .filter((entry): entry is RssChannel => Boolean(entry));
    return parsed.length > 0 ? parsed : DEFAULT_RSS_CHANNELS;
  }

  private extractVideoId(link?: string, guid?: string): string {
    const fromLink = link?.match(/[?&]v=([^&]+)/)?.[1];
    if (fromLink) return fromLink;
    const fromGuid = guid?.match(/[?&]v=([^&]+)/)?.[1];
    if (fromGuid) return fromGuid;
    return '';
  }

  private async fetchRssChannel(channel: RssChannel): Promise<YoutubeExploreItem[]> {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`;
    const res = await fetch(feedUrl);
    if (!res.ok) {
      throw new ServiceUnavailableException(`YouTube RSS error (${res.status})`);
    }
    const xml = await res.text();
    const feed = await this.rssParser.parseString(xml);
    const items = (feed.items ?? []).map((item) => {
      const id = this.extractVideoId(item.link, item.guid) || item.id || '';
      const title = item.title || 'Untitled';
      const description = item.contentSnippet || item.content || '';
      const publishedAt = item.isoDate || item.pubDate || '';
      const url = item.link || (id ? `https://www.youtube.com/watch?v=${id}` : '');
      const channelLabel = item.author || channel.label;
      const thumbnailUrl = id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined;
      return { id, title, description, url, channel: channelLabel, publishedAt, thumbnailUrl };
    }).filter((item) => item.id && item.url);
    return items;
  }

  private async searchYoutubeRss(query: YoutubeExploreQueryDto): Promise<YoutubeExploreResponse> {
    const channels = this.getRssChannels();
    const maxResults = query.maxResults ?? 12;
    const offset = Number.parseInt(query.pageToken ?? '0', 10);
    const safeOffset = Number.isFinite(offset) && offset > 0 ? offset : 0;

    const results = await Promise.allSettled(channels.map((channel) => this.fetchRssChannel(channel)));
    const merged = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));

    const deduped = new Map<string, YoutubeExploreItem>();
    for (const item of merged) {
      if (!deduped.has(item.id)) deduped.set(item.id, item);
    }

    const q = query.q?.trim().toLowerCase() || '';
    const keywords = query.keywords
      ? query.keywords.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)
      : [];

    const filtered = Array.from(deduped.values()).filter((item) => {
      const hay = `${item.title} ${item.description} ${item.channel}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (keywords.length > 0 && !keywords.some((keyword) => hay.includes(keyword))) return false;
      return true;
    });

    const sorted = filtered.sort((a, b) => {
      const aTime = new Date(a.publishedAt).getTime();
      const bTime = new Date(b.publishedAt).getTime();
      if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return 0;
      return query.order === 'oldest' ? aTime - bTime : bTime - aTime;
    });

    const page = sorted.slice(safeOffset, safeOffset + maxResults);
    const next = safeOffset + maxResults < sorted.length ? String(safeOffset + maxResults) : undefined;

    return { items: page, nextPageToken: next };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // Papers (arXiv)
  // ══════════════════════════════════════════════════════════════════════════════

  async searchPapers(query: PapersExploreQueryDto): Promise<PapersExploreResponse> {
    const max = query.max ?? 12;
    const cacheKey = `papers:${query.q ?? ''}:${query.keywords ?? ''}:${max}`;
    const cached = this.ttlGet<PapersExploreResponse>(cacheKey);
    if (cached) return cached;

    try {
      const items = await this.fetchArxivRss(query, max);
      const result: PapersExploreResponse = { items };
      // Cache for 30 min — arXiv RSS updates daily, no need for 1h
      this.ttlSet(cacheKey, result, 30 * 60 * 1000);
      return result;
    } catch {
      // Return empty — frontend falls back to static data
      return { items: [] };
    }
  }

  // arXiv RSS feeds per category (standard RSS 2.0, much more reliable than the Atom API)
  private readonly ARXIV_RSS_FEEDS = [
    { url: 'https://arxiv.org/rss/cs.AI', tag: 'cs.AI' },
    { url: 'https://arxiv.org/rss/cs.LG', tag: 'cs.LG' },
    { url: 'https://arxiv.org/rss/cs.CL', tag: 'cs.CL' },
    { url: 'https://arxiv.org/rss/cs.CV', tag: 'cs.CV' },
  ];

  private async fetchArxivRss(query: PapersExploreQueryDto, max: number): Promise<PaperItem[]> {
    const results = await Promise.allSettled(
      this.ARXIV_RSS_FEEDS.map(async (feed) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch(feed.url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'GewuAI/1.0' },
          });
          if (!res.ok) return [];
          const xml = await res.text();
          const parsed = await this.rssParser.parseString(xml);
          return (parsed.items ?? []).map((item) => {
            const url = (item.link || item.guid || '').replace(/\s/g, '');
            const shortId = url.split('/abs/').pop() || url;
            const title = (item.title || 'Untitled').replace(/\s+/g, ' ').trim();
            const summary = (item.contentSnippet || item.content || '').replace(/\s+/g, ' ').trim();
            return {
              id: shortId,
              title,
              summary,
              url,
              source: 'arXiv',
              publishedAt: item.isoDate || item.pubDate || '',
              tags: [feed.tag],
            } satisfies PaperItem;
          }).filter((p) => p.id && p.url);
        } finally {
          clearTimeout(timer);
        }
      }),
    );

    const merged = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

    // Dedup by URL
    const deduped = new Map<string, PaperItem>();
    for (const item of merged) {
      if (!deduped.has(item.url)) deduped.set(item.url, item);
    }

    const q = query.q?.trim().toLowerCase() || '';
    const keywords = query.keywords
      ? query.keywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)
      : [];

    const filtered = Array.from(deduped.values()).filter((item) => {
      const hay = `${item.title} ${item.summary}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (keywords.length > 0 && !keywords.some((kw) => hay.includes(kw))) return false;
      return true;
    });

    // Sort newest first, take up to max
    return filtered
      .sort((a, b) => {
        const aT = new Date(a.publishedAt).getTime();
        const bT = new Date(b.publishedAt).getTime();
        return Number.isFinite(bT - aT) ? bT - aT : 0;
      })
      .slice(0, max);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // Blogs (RSS aggregation)
  // ══════════════════════════════════════════════════════════════════════════════

  async searchBlogs(query: BlogsExploreQueryDto): Promise<BlogsExploreResponse> {
    const max = query.max ?? 12;
    const cacheKey = `blogs:${query.q ?? ''}:${query.keywords ?? ''}:${max}`;
    const cached = this.ttlGet<BlogsExploreResponse>(cacheKey);
    if (cached) return cached;

    try {
      const feeds = this.getBlogFeeds();
      const results = await Promise.allSettled(feeds.map((feed) => this.fetchBlogFeed(feed)));
      const merged = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

      // Dedup by URL
      const deduped = new Map<string, BlogItem>();
      for (const item of merged) {
        if (!deduped.has(item.url)) deduped.set(item.url, item);
      }

      const q = query.q?.trim().toLowerCase() || '';
      const keywords = query.keywords
        ? query.keywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)
        : [];

      const filtered = Array.from(deduped.values()).filter((item) => {
        const hay = `${item.title} ${item.summary} ${item.source}`.toLowerCase();
        if (q && !hay.includes(q)) return false;
        if (keywords.length > 0 && !keywords.some((kw) => hay.includes(kw))) return false;
        return true;
      });

      const sorted = filtered.sort((a, b) => {
        const aTime = new Date(a.publishedAt).getTime();
        const bTime = new Date(b.publishedAt).getTime();
        if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return 0;
        return bTime - aTime;
      });

      const items = sorted.slice(0, max);
      const result: BlogsExploreResponse = { items };
      this.ttlSet(cacheKey, result);
      return result;
    } catch {
      return { items: [] };
    }
  }

  private getBlogFeeds(): BlogFeed[] {
    const raw = process.env.BLOG_RSS_FEEDS;
    if (!raw) return DEFAULT_BLOG_FEEDS;
    const parsed = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [url, label] = entry.split('|').map((p) => p.trim());
        if (!url) return null;
        return { url, label: label || url };
      })
      .filter((entry): entry is BlogFeed => Boolean(entry));
    return parsed.length > 0 ? parsed : DEFAULT_BLOG_FEEDS;
  }

  private async fetchBlogFeed(feed: BlogFeed): Promise<BlogItem[]> {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'GewuAI/1.0 (research tool)' },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parsed = await this.rssParser.parseString(xml);

    return (parsed.items ?? []).map((item) => {
      const url = item.link || item.guid || '';
      const id = url || `${feed.label}-${item.title ?? ''}`;
      const title = (item.title || 'Untitled').replace(/\s+/g, ' ').trim();
      const summary = (item.contentSnippet || item.content || '').replace(/\s+/g, ' ').slice(0, 300).trim();
      const publishedAt = item.isoDate || item.pubDate || '';
      return { id, title, summary, url, source: feed.label, publishedAt, tags: [] };
    }).filter((item) => item.url);
  }
}
