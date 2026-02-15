import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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

@Injectable()
export class ExploreService {
  async searchYoutube(query: YoutubeExploreQueryDto): Promise<YoutubeExploreResponse> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('YOUTUBE_API_KEY is not configured in backend/.env');
    }

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
}
