// Genius API client — cultural context, song descriptions, artist bios
// Auth: client access token (Bearer). Rate limit: generous, we use 3/sec.
// Docs: https://docs.genius.com

import { apiFetch, apiKeys, isGeniusConfigured } from './config';
import { cacheGet, cacheSet, CacheTTL } from './cache';
import type { GeniusArtistInfo, GeniusSongInfo, GeniusSocialLinks } from '@/types/genius';

const GENIUS_BASE = 'https://api.genius.com';

// --- Raw Genius API response types ---

interface GeniusSearchResponse {
  response: {
    hits: {
      type: string;
      result: {
        id: number;
        title: string;
        full_title: string;
        url: string;
        primary_artist: {
          id: number;
          name: string;
          url: string;
          image_url?: string;
          header_image_url?: string;
        };
      };
    }[];
  };
}

interface GeniusArtistResponse {
  response: {
    artist: {
      id: number;
      name: string;
      alternate_names?: string[];
      image_url?: string;
      header_image_url?: string;
      description?: { plain?: string; html?: string };
      twitter_name?: string;
      instagram_name?: string;
      facebook_name?: string;
    };
  };
}

interface GeniusArtistSongsResponse {
  response: {
    songs: {
      id: number;
      title: string;
      full_title: string;
      url: string;
      release_date_for_display?: string;
      album?: { name: string };
      stats?: { unreviewed_annotations: number; hot: boolean };
      featured_artists?: { name: string }[];
      primary_artist: { name: string };
    }[];
  };
}

interface GeniusSongResponse {
  response: {
    song: {
      id: number;
      title: string;
      url: string;
      description?: { plain?: string; html?: string };
      release_date_for_display?: string;
      album?: { name: string };
      stats?: { unreviewed_annotations: number; pageviews?: number };
      featured_artists?: { name: string }[];
      primary_artist: { name: string };
      annotation_count?: number;
    };
  };
}

// --- Auth headers ---

function geniusHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${apiKeys.genius!}`,
  };
}

// --- Helpers ---

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '').trim();
}

function extractDescription(desc?: { plain?: string; html?: string }): string | undefined {
  if (!desc) return undefined;
  if (desc.plain && desc.plain.trim().length > 0 && desc.plain.trim() !== '?') {
    return desc.plain.trim();
  }
  if (desc.html) {
    const stripped = stripHtml(desc.html);
    return stripped.length > 0 && stripped !== '?' ? stripped : undefined;
  }
  return undefined;
}

// --- API functions ---

export async function searchGeniusArtist(name: string): Promise<GeniusArtistInfo | null> {
  if (!isGeniusConfigured) return null;

  const cacheKey = `genius:artist:${name.toLowerCase()}`;
  const cached = cacheGet<GeniusArtistInfo>(cacheKey, true);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({ q: name });
    const data = await apiFetch<GeniusSearchResponse>(
      `${GENIUS_BASE}/search?${params}`,
      {
        headers: geniusHeaders(),
        rateLimitDomain: 'api.genius.com',
      },
    );

    if (!data?.response?.hits?.length) return null;

    // Find artist ID — search returns songs, extract primary_artist
    // Try to match artist name from hits
    const nameLower = name.toLowerCase();
    let artistId: number | null = null;

    for (const hit of data.response.hits) {
      if (hit.result.primary_artist.name.toLowerCase() === nameLower) {
        artistId = hit.result.primary_artist.id;
        break;
      }
    }

    // Fallback: take first hit's primary artist
    if (!artistId && data.response.hits.length > 0) {
      artistId = data.response.hits[0].result.primary_artist.id;
    }

    if (!artistId) return null;

    const artist = await getGeniusArtist(artistId);
    if (!artist) return null;

    cacheSet(cacheKey, artist, CacheTTL.GENIUS, true);
    return artist;
  } catch (err) {
    console.warn('Genius artist search failed:', err);
    return null;
  }
}

export async function getGeniusArtist(geniusId: number): Promise<GeniusArtistInfo | null> {
  if (!isGeniusConfigured) return null;

  try {
    const data = await apiFetch<GeniusArtistResponse>(
      `${GENIUS_BASE}/artists/${geniusId}`,
      {
        headers: geniusHeaders(),
        rateLimitDomain: 'api.genius.com',
      },
    );

    if (!data?.response?.artist) return null;

    const artist = data.response.artist;
    const socialLinks: GeniusSocialLinks = {};
    if (artist.twitter_name) socialLinks.twitter = artist.twitter_name;
    if (artist.instagram_name) socialLinks.instagram = artist.instagram_name;
    if (artist.facebook_name) socialLinks.facebook = artist.facebook_name;

    return {
      geniusId: artist.id,
      name: artist.name,
      alternateNames: artist.alternate_names ?? [],
      imageUrl: artist.image_url,
      headerImageUrl: artist.header_image_url,
      description: extractDescription(artist.description),
      socialLinks,
    };
  } catch (err) {
    console.warn('Genius artist fetch failed:', err);
    return null;
  }
}

export async function getGeniusArtistTopSongs(
  geniusId: number,
  count = 5,
): Promise<GeniusSongInfo[]> {
  if (!isGeniusConfigured) return [];

  const cacheKey = `genius:songs:${geniusId}`;
  const cached = cacheGet<GeniusSongInfo[]>(cacheKey, true);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      sort: 'popularity',
      per_page: String(count),
    });

    const data = await apiFetch<GeniusArtistSongsResponse>(
      `${GENIUS_BASE}/artists/${geniusId}/songs?${params}`,
      {
        headers: geniusHeaders(),
        rateLimitDomain: 'api.genius.com',
      },
    );

    if (!data?.response?.songs?.length) return [];

    // Fetch descriptions for each song (in parallel, best-effort)
    const songPromises = data.response.songs.map(async (song): Promise<GeniusSongInfo> => {
      let description: string | undefined;
      let annotationCount = 0;

      try {
        const songData = await apiFetch<GeniusSongResponse>(
          `${GENIUS_BASE}/songs/${song.id}`,
          {
            headers: geniusHeaders(),
            rateLimitDomain: 'api.genius.com',
          },
        );

        if (songData?.response?.song) {
          description = extractDescription(songData.response.song.description);
          annotationCount = songData.response.song.annotation_count ?? 0;
        }
      } catch {
        // Song detail fetch is best-effort
      }

      return {
        geniusId: song.id,
        title: song.title,
        artistName: song.primary_artist.name,
        description,
        annotationCount,
        releaseDate: song.release_date_for_display,
        albumName: song.album?.name,
        geniusUrl: song.url,
        featuredArtists: song.featured_artists?.map((a) => a.name) ?? [],
      };
    });

    const results = await Promise.all(songPromises);
    cacheSet(cacheKey, results, CacheTTL.GENIUS, true);
    return results;
  } catch (err) {
    console.warn('Genius top songs fetch failed:', err);
    return [];
  }
}

export async function searchGeniusSong(
  title: string,
  artistName: string,
): Promise<GeniusSongInfo | null> {
  if (!isGeniusConfigured) return null;

  const cacheKey = `genius:song:${artistName.toLowerCase()}:${title.toLowerCase()}`;
  const cached = cacheGet<GeniusSongInfo>(cacheKey, true);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({ q: `${title} ${artistName}` });
    const data = await apiFetch<GeniusSearchResponse>(
      `${GENIUS_BASE}/search?${params}`,
      {
        headers: geniusHeaders(),
        rateLimitDomain: 'api.genius.com',
      },
    );

    if (!data?.response?.hits?.length) return null;

    // Find best match — primary_artist name should fuzzy-match
    const artistLower = artistName.toLowerCase();
    const titleLower = title.toLowerCase();

    const match = data.response.hits.find((hit) => {
      const hitArtist = hit.result.primary_artist.name.toLowerCase();
      const hitTitle = hit.result.title.toLowerCase();
      return hitArtist.includes(artistLower) || artistLower.includes(hitArtist)
        ? hitTitle.includes(titleLower) || titleLower.includes(hitTitle)
        : false;
    }) ?? data.response.hits[0]; // fallback to top result

    // Verify the top result at least has the right artist
    const matchArtist = match.result.primary_artist.name.toLowerCase();
    if (!matchArtist.includes(artistLower) && !artistLower.includes(matchArtist)) {
      return null; // no good match
    }

    // Fetch full song details
    const songData = await apiFetch<GeniusSongResponse>(
      `${GENIUS_BASE}/songs/${match.result.id}`,
      {
        headers: geniusHeaders(),
        rateLimitDomain: 'api.genius.com',
      },
    );

    if (!songData?.response?.song) return null;

    const song = songData.response.song;
    const result: GeniusSongInfo = {
      geniusId: song.id,
      title: song.title,
      artistName: song.primary_artist.name,
      description: extractDescription(song.description),
      annotationCount: song.annotation_count ?? 0,
      releaseDate: song.release_date_for_display,
      albumName: song.album?.name,
      geniusUrl: song.url,
      featuredArtists: song.featured_artists?.map((a) => a.name) ?? [],
    };

    cacheSet(cacheKey, result, CacheTTL.GENIUS_SONG, true);
    return result;
  } catch (err) {
    console.warn('Genius song search failed:', err);
    return null;
  }
}
