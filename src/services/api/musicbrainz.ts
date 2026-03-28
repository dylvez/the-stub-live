// MusicBrainz API — canonical artist metadata + MBID lookup
// No API key needed; rate limit: 1 req/sec

import { apiFetch } from './config';
import { cacheGet, cacheSet, CacheTTL } from './cache';

const MB_BASE = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'TheStubLive/1.0 (thestub.live)';

interface MbArtist {
  id: string;
  name: string;
  'sort-name': string;
  type?: string;
  country?: string;
  tags?: { name: string; count: number }[];
}

export interface MusicBrainzArtist {
  mbid: string;
  name: string;
  sortName: string;
  country?: string;
  tags: string[];
}

export async function searchArtist(name: string): Promise<MusicBrainzArtist | null> {
  const cacheKey = `mb:${name.toLowerCase()}`;
  const cached = cacheGet<MusicBrainzArtist>(cacheKey, true);
  if (cached) return cached;

  const params = new URLSearchParams({
    query: `artist:${name}`,
    fmt: 'json',
    limit: '1',
  });

  const data = await apiFetch<{ artists: MbArtist[] }>(`${MB_BASE}/artist/?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
    rateLimitDomain: 'musicbrainz.org',
  });

  if (!data?.artists?.[0]) return null;

  const mb = data.artists[0];
  const result: MusicBrainzArtist = {
    mbid: mb.id,
    name: mb.name,
    sortName: mb['sort-name'],
    country: mb.country,
    tags: mb.tags?.sort((a, b) => b.count - a.count).map((t) => t.name).slice(0, 10) ?? [],
  };

  cacheSet(cacheKey, result, CacheTTL.LASTFM, true); // same long TTL
  return result;
}
