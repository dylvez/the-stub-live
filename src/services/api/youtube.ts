// YouTube Data API v3 — live performance video search

import { apiFetch, apiKeys, isYoutubeConfigured } from './config';
import { cacheGet, cacheSet, CacheTTL } from './cache';

const YT_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

interface YtSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
    channelTitle: string;
    publishedAt: string;
  };
}

export async function searchLivePerformances(artistName: string, limit = 5): Promise<YouTubeVideo[]> {
  if (!isYoutubeConfigured) return [];

  const cacheKey = `youtube:${artistName.toLowerCase()}`;
  const cached = cacheGet<YouTubeVideo[]>(cacheKey, true);
  if (cached) return cached;

  const params = new URLSearchParams({
    part: 'snippet',
    q: `${artistName} live performance`,
    type: 'video',
    maxResults: String(limit),
    order: 'relevance',
    videoCategoryId: '10', // Music
    key: apiKeys.youtube!,
  });

  const data = await apiFetch<{ items: YtSearchItem[] }>(`${YT_BASE}/search?${params}`, {
    rateLimitDomain: 'www.googleapis.com',
  });

  if (!data?.items) return [];

  const videos: YouTubeVideo[] = data.items.map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? '',
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
  }));

  cacheSet(cacheKey, videos, CacheTTL.YOUTUBE, true);
  return videos;
}
