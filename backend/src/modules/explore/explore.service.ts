import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Parser from 'rss-parser';
import { YoutubeExploreQueryDto } from './dto/youtube-explore-query.dto';

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

type RssChannel = {
  id: string;
  label: string;
};

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

@Injectable()
export class ExploreService {
  private readonly rssParser = new Parser();

  async searchYoutube(query: YoutubeExploreQueryDto): Promise<YoutubeExploreResponse> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return this.searchYoutubeRss(query);
    }

    try {
      const q = this.buildQuery(query);
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
    } catch (error) {
      return this.searchYoutubeRss(query);
    }
  }

  private buildQuery(query: YoutubeExploreQueryDto): string {
    const parts: string[] = [];
    if (query.q?.trim()) parts.push(query.q.trim());

    if (query.keywords) {
      const keywords = query.keywords
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      parts.push(...keywords);
    }

    const merged = parts.join(' ').trim();
    return merged || 'AI';
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
      return {
        id,
        title,
        description,
        url,
        channel: channelLabel,
        publishedAt,
        thumbnailUrl,
      };
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
}
