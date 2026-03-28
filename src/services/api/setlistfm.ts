// setlist.fm API client (uses Vite proxy for CORS)

import { apiFetch, apiKeys, isSetlistFmConfigured } from './config';
import { cacheGet, cacheSet, CacheTTL } from './cache';
import type { SetlistSong } from '@/types';

const PROXY_BASE = '/api/setlistfm/rest/1.0';

interface SfmSong {
  name: string;
  info?: string;
  cover?: { name: string };
}

interface SfmSet {
  song: SfmSong[];
  encore?: number;
}

interface SfmSetlist {
  id: string;
  eventDate: string;
  artist: { name: string; mbid: string };
  venue: { name: string; city: { name: string; state?: string; country: { code: string } } };
  sets: { set: SfmSet[] };
}

export interface SetlistResult {
  id: string;
  date: string;
  artistName?: string;
  venueName: string;
  venueCity: string;
  songs: SetlistSong[];
}

/** Convert a raw setlist.fm setlist into our SetlistResult shape */
function mapSetlist(s: SfmSetlist): SetlistResult {
  return {
    id: s.id,
    date: s.eventDate,
    artistName: s.artist.name,
    venueName: s.venue.name,
    venueCity: `${s.venue.city.name}${s.venue.city.state ? `, ${s.venue.city.state}` : ''}`,
    songs: s.sets.set.flatMap((set) =>
      set.song.map((song) => ({
        title: song.name,
        encore: !!set.encore,
        notes: song.info,
        isCover: !!song.cover,
        originalArtist: song.cover?.name,
      }))
    ),
  };
}

/** Fetch raw setlists from a setlist.fm endpoint */
async function fetchSetlists(path: string): Promise<SfmSetlist[]> {
  if (!isSetlistFmConfigured) return [];

  const data = await apiFetch<{ setlist: SfmSetlist[] }>(
    `${PROXY_BASE}${path}`,
    {
      headers: {
        'x-api-key': apiKeys.setlistfm!,
        'Accept': 'application/json',
      },
    }
  );

  return data?.setlist ?? [];
}

/** Search setlists by artist name — returns past shows with venue/date/setlist data */
export async function searchSetlists(artistName: string, limit = 10): Promise<SetlistResult[]> {
  if (!isSetlistFmConfigured) return [];

  const cacheKey = `setlistfm:search:${artistName.toLowerCase()}`;
  const cached = cacheGet<SetlistResult[]>(cacheKey, true);
  if (cached) return cached;

  const raw = await fetchSetlists(`/search/setlists?artistName=${encodeURIComponent(artistName)}&p=1`);
  const results = raw.slice(0, limit).map(mapSetlist);

  cacheSet(cacheKey, results, CacheTTL.SETLISTFM, true);
  return results;
}

/** Search setlists by venue name — returns past shows at that venue */
export async function searchSetlistsByVenue(venueName: string, limit = 15): Promise<SetlistResult[]> {
  if (!isSetlistFmConfigured) return [];

  const cacheKey = `setlistfm:venue:${venueName.toLowerCase()}`;
  const cached = cacheGet<SetlistResult[]>(cacheKey, true);
  if (cached) return cached;

  const raw = await fetchSetlists(`/search/setlists?venueName=${encodeURIComponent(venueName)}&p=1`);
  const results = raw.slice(0, limit).map(mapSetlist);

  cacheSet(cacheKey, results, CacheTTL.SETLISTFM, true);
  return results;
}

/** Get setlists for a specific artist by MusicBrainz ID */
export async function getArtistSetlists(mbid: string, limit = 5): Promise<SetlistResult[]> {
  if (!isSetlistFmConfigured) return [];

  const cacheKey = `setlistfm:${mbid}`;
  const cached = cacheGet<SetlistResult[]>(cacheKey, true);
  if (cached) return cached;

  const raw = await fetchSetlists(`/artist/${mbid}/setlists?p=1`);
  const results = raw
    .filter((s) => s.sets.set.length > 0)
    .slice(0, limit)
    .map(mapSetlist);

  cacheSet(cacheKey, results, CacheTTL.SETLISTFM, true);
  return results;
}
