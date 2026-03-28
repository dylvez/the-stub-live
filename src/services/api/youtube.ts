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

/** Decode HTML entities returned by the YouTube API (e.g. &amp; → &, &#39; → ') */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/** Normalize a string for matching: lowercase, strip punctuation, collapse whitespace */
function normalize(s: string): string {
  return decodeHtmlEntities(s).toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

/** Check if a video title or channel name contains the artist name */
function matchesArtist(artistName: string, title: string, channelTitle: string): boolean {
  const normArtist = normalize(artistName);
  const normTitle = normalize(title);
  const normChannel = normalize(channelTitle);
  return normTitle.includes(normArtist) || normChannel.includes(normArtist);
}

export async function searchLivePerformances(artistName: string, limit = 5): Promise<YouTubeVideo[]> {
  if (!isYoutubeConfigured) return [];

  const cacheKey = `youtube:${artistName.toLowerCase()}`;
  const cached = cacheGet<YouTubeVideo[]>(cacheKey, true);
  if (cached) return cached;

  // Use quoted artist name for exact match, request extra results to allow filtering
  const params = new URLSearchParams({
    part: 'snippet',
    q: `"${artistName}" live`,
    type: 'video',
    maxResults: String(limit * 3),
    order: 'relevance',
    videoCategoryId: '10', // Music
    key: apiKeys.youtube!,
  });

  const data = await apiFetch<{ items: YtSearchItem[] }>(`${YT_BASE}/search?${params}`, {
    rateLimitDomain: 'www.googleapis.com',
  });

  if (!data?.items) return [];

  // Filter to only videos that mention the artist in the title or channel name
  const videos: YouTubeVideo[] = data.items
    .filter((item) => matchesArtist(artistName, item.snippet.title, item.snippet.channelTitle))
    .slice(0, limit)
    .map((item) => ({
      id: item.id.videoId,
      title: decodeHtmlEntities(item.snippet.title),
      thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? '',
      channelTitle: decodeHtmlEntities(item.snippet.channelTitle),
      publishedAt: item.snippet.publishedAt,
    }));

  cacheSet(cacheKey, videos, CacheTTL.YOUTUBE, true);
  return videos;
}
