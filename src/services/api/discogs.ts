// Discogs API client — artist styles, discography, cultural metadata
// Auth: personal access token. Rate limit: 60 req/min authenticated, we use 1/sec to be safe.
// Docs: https://www.discogs.com/developers

import { apiFetch, apiKeys, isDiscogsConfigured } from './config';
import { cacheGet, cacheSet, CacheTTL } from './cache';
import type { DiscogsArtistInfo, DiscogsImage, DiscogsMember, DiscogsRelease } from '@/types/discogs';

const DISCOGS_BASE = 'https://api.discogs.com';
const USER_AGENT = 'TheStubLive/1.0 (thestub.live)';

// --- Raw Discogs API response types ---

interface DiscogsSearchResponse {
  results: {
    id: number;
    title: string;
    type: string;
    thumb: string;
    resource_url: string;
  }[];
}

interface DiscogsArtistResponse {
  id: number;
  name: string;
  realname?: string;
  profile?: string;
  images?: {
    type: string;
    uri: string;
    uri150: string;
    width: number;
    height: number;
  }[];
  urls?: string[];
  members?: {
    id: number;
    name: string;
    active: boolean;
    resource_url: string;
  }[];
  data_quality?: string;
}

interface DiscogsReleasesResponse {
  releases: {
    id: number;
    title: string;
    year?: number;
    type: string;
    role: string;
    artist: string;
    label?: string;
    format?: string;
    resource_url: string;
  }[];
  pagination: {
    items: number;
    page: number;
    pages: number;
  };
}

// --- Auth headers ---

function discogsHeaders(): Record<string, string> {
  return {
    'Authorization': `Discogs token=${apiKeys.discogs!}`,
    'User-Agent': USER_AGENT,
  };
}

// --- API functions ---

export async function searchDiscogsArtist(name: string): Promise<DiscogsArtistInfo | null> {
  if (!isDiscogsConfigured) return null;

  const cacheKey = `discogs:artist:${name.toLowerCase()}`;
  const cached = cacheGet<DiscogsArtistInfo>(cacheKey, true);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      type: 'artist',
      q: name,
      per_page: '3',
    });

    const data = await apiFetch<DiscogsSearchResponse>(
      `${DISCOGS_BASE}/database/search?${params}`,
      {
        headers: discogsHeaders(),
        rateLimitDomain: 'api.discogs.com',
      },
    );

    if (!data?.results?.length) return null;

    // Find best match — prefer exact name match
    const exactMatch = data.results.find(
      (r) => r.title.toLowerCase() === name.toLowerCase(),
    );
    const bestMatch = exactMatch ?? data.results[0];

    // Fetch full artist profile
    const artist = await getDiscogsArtist(bestMatch.id);
    if (!artist) return null;

    cacheSet(cacheKey, artist, CacheTTL.DISCOGS, true);
    return artist;
  } catch (err) {
    console.warn('Discogs artist search failed:', err);
    return null;
  }
}

export async function getDiscogsArtist(discogsId: number): Promise<DiscogsArtistInfo | null> {
  if (!isDiscogsConfigured) return null;

  try {
    const data = await apiFetch<DiscogsArtistResponse>(
      `${DISCOGS_BASE}/artists/${discogsId}`,
      {
        headers: discogsHeaders(),
        rateLimitDomain: 'api.discogs.com',
      },
    );

    if (!data) return null;

    // Fetch releases in parallel
    const releases = await getDiscogsArtistReleases(discogsId);

    const images: DiscogsImage[] = (data.images ?? []).map((img) => ({
      type: img.type === 'primary' ? 'primary' : 'secondary',
      uri: img.uri,
      width: img.width,
      height: img.height,
    }));

    const members: DiscogsMember[] | undefined = data.members?.map((m) => ({
      id: m.id,
      name: m.name,
      active: m.active,
    }));

    // Clean profile text — Discogs uses [a=Artist] style markup
    const cleanProfile = data.profile
      ? data.profile
          .replace(/\[a=([^\]]+)\]/g, '$1')   // [a=Artist Name] → Artist Name
          .replace(/\[l=([^\]]+)\]/g, '$1')   // [l=Label Name] → Label Name
          .replace(/\[url=([^\]]+)\]([^[]*)\[\/url\]/g, '$2') // [url=...]text[/url] → text
          .replace(/\[b\](.*?)\[\/b\]/g, '$1') // [b]bold[/b] → bold
          .replace(/\[i\](.*?)\[\/i\]/g, '$1') // [i]italic[/i] → italic
          .replace(/\r\n/g, '\n')
          .trim()
      : undefined;

    return {
      discogsId: data.id,
      name: data.name,
      realName: data.realname,
      profile: cleanProfile,
      images,
      genres: [], // genres come from releases, not artist endpoint
      styles: [], // styles come from releases, not artist endpoint
      urls: data.urls ?? [],
      members,
      discography: releases,
    };
  } catch (err) {
    console.warn('Discogs artist fetch failed:', err);
    return null;
  }
}

export async function getDiscogsArtistReleases(discogsId: number): Promise<DiscogsRelease[]> {
  if (!isDiscogsConfigured) return [];

  try {
    const params = new URLSearchParams({
      sort: 'year',
      sort_order: 'asc',
      per_page: '50',
    });

    const data = await apiFetch<DiscogsReleasesResponse>(
      `${DISCOGS_BASE}/artists/${discogsId}/releases?${params}`,
      {
        headers: discogsHeaders(),
        rateLimitDomain: 'api.discogs.com',
      },
    );

    if (!data?.releases?.length) return [];

    // Filter to main releases, prefer masters over individual pressings
    const mainReleases = data.releases
      .filter((r) => r.role === 'Main')
      .map((r): DiscogsRelease => ({
        id: r.id,
        title: r.title,
        year: r.year,
        type: r.type,
        role: r.role,
        label: r.label,
      }));

    // Deduplicate: if a master and release share same title, keep master
    const seen = new Map<string, DiscogsRelease>();
    for (const release of mainReleases) {
      const key = release.title.toLowerCase();
      const existing = seen.get(key);
      if (!existing || release.type === 'master') {
        seen.set(key, release);
      }
    }

    return Array.from(seen.values()).slice(0, 20);
  } catch (err) {
    console.warn('Discogs releases fetch failed:', err);
    return [];
  }
}
