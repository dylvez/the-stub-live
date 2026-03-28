// Last.fm API client — genre tags + similar artists

import { apiFetch, apiKeys, isLastFmConfigured } from './config';
import { cacheGet, cacheSet, CacheTTL } from './cache';

const LFM_BASE = 'https://ws.audioscrobbler.com/2.0/';

interface LfmTag {
  name: string;
  url: string;
}

interface LfmSimilarArtist {
  name: string;
  match: string;
}

interface LfmArtistInfoResponse {
  artist: {
    name: string;
    mbid?: string;
    tags?: { tag: LfmTag[] };
    similar?: { artist: LfmSimilarArtist[] };
    bio?: { summary: string };
    stats?: { listeners: string; playcount: string };
  };
}

export interface LastFmArtistInfo {
  name: string;
  mbid?: string;
  tags: string[];
  similarArtists: string[];
  bio?: string;
  listeners: number;
  playcount: number;
}

export async function getArtistInfo(artistName: string): Promise<LastFmArtistInfo | null> {
  if (!isLastFmConfigured) return null;

  const cacheKey = `lastfm:${artistName.toLowerCase()}`;
  const cached = cacheGet<LastFmArtistInfo>(cacheKey, true);
  if (cached) return cached;

  const params = new URLSearchParams({
    method: 'artist.getinfo',
    artist: artistName,
    api_key: apiKeys.lastfm!,
    format: 'json',
  });

  const data = await apiFetch<LfmArtistInfoResponse>(`${LFM_BASE}?${params}`, {
    rateLimitDomain: 'ws.audioscrobbler.com',
  });

  if (!data?.artist) return null;

  const result: LastFmArtistInfo = {
    name: data.artist.name,
    mbid: data.artist.mbid,
    tags: data.artist.tags?.tag?.map((t) => t.name) ?? [],
    similarArtists: data.artist.similar?.artist?.map((a) => a.name) ?? [],
    bio: data.artist.bio?.summary?.replace(/<[^>]+>/g, '').trim(),
    listeners: parseInt(data.artist.stats?.listeners ?? '0', 10),
    playcount: parseInt(data.artist.stats?.playcount ?? '0', 10),
  };

  cacheSet(cacheKey, result, CacheTTL.LASTFM, true);
  return result;
}
