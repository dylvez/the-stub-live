import { Timestamp } from 'firebase/firestore';
import { apiFetch, apiKeys } from './config';
import type { EventData, ArtistData, VenueData, VenueType } from '@/types';

const SG_BASE = 'https://api.seatgeek.com/2';

// --- SeatGeek Response Types ---

interface SgGenre {
  name: string;
}

interface SgPerformer {
  id: number;
  name: string;
  image: string;
  genres?: SgGenre[];
}

interface SgLocation {
  lat: number;
  lon: number;
}

interface SgVenue {
  id: number;
  name: string;
  city: string;
  state: string;
  address: string;
  location: SgLocation;
  capacity: number | null;
}

interface SgStats {
  lowest_price: number | null;
  highest_price: number | null;
}

interface SgEvent {
  id: number;
  title: string;
  datetime_utc: string;
  venue: SgVenue;
  performers: SgPerformer[];
  url: string;
  stats: SgStats;
  type: string;
}

interface SgMeta {
  total: number;
  page: number;
  per_page: number;
}

interface SgEventsResponse {
  events: SgEvent[];
  meta: SgMeta;
}

interface SgVenuesResponse {
  venues: SgVenue[];
  meta: SgMeta;
}

// --- Search Parameters ---

export interface SgEventSearchParams {
  lat?: number;
  lon?: number;
  range?: string;
  per_page?: number;
  page?: number;
  sort?: string;
  q?: string;
  'datetime_utc.gte'?: string;
  'datetime_utc.lte'?: string;
  type?: string;
}

export interface SgVenueSearchParams {
  lat?: number;
  lon?: number;
  range?: string;
  per_page?: number;
  page?: number;
  q?: string;
}

// --- API Functions ---

export async function searchSeatGeekEvents(params: SgEventSearchParams): Promise<{
  events: SgEvent[];
  total: number;
  page: number;
  perPage: number;
}> {
  const searchParams = new URLSearchParams();
  searchParams.set('client_id', apiKeys.seatgeek!);
  searchParams.set('per_page', String(params.per_page ?? 25));
  searchParams.set('page', String(params.page ?? 1));
  searchParams.set('sort', params.sort ?? 'score.desc');
  searchParams.set('type', params.type ?? 'concert');

  if (params.lat != null && params.lon != null) {
    searchParams.set('lat', String(params.lat));
    searchParams.set('lon', String(params.lon));
  }
  if (params.range) searchParams.set('range', params.range);
  if (params.q) searchParams.set('q', params.q);
  if (params['datetime_utc.gte']) searchParams.set('datetime_utc.gte', params['datetime_utc.gte']);
  if (params['datetime_utc.lte']) searchParams.set('datetime_utc.lte', params['datetime_utc.lte']);

  const url = `${SG_BASE}/events?${searchParams.toString()}`;
  const data = await apiFetch<SgEventsResponse>(url, {
    rateLimitDomain: 'api.seatgeek.com',
  });

  return {
    events: data?.events ?? [],
    total: data?.meta?.total ?? 0,
    page: data?.meta?.page ?? 1,
    perPage: data?.meta?.per_page ?? 25,
  };
}

export async function searchSeatGeekVenues(params: SgVenueSearchParams): Promise<{
  venues: SgVenue[];
  total: number;
  page: number;
  perPage: number;
}> {
  const searchParams = new URLSearchParams();
  searchParams.set('client_id', apiKeys.seatgeek!);
  searchParams.set('per_page', String(params.per_page ?? 25));
  searchParams.set('page', String(params.page ?? 1));

  if (params.lat != null && params.lon != null) {
    searchParams.set('lat', String(params.lat));
    searchParams.set('lon', String(params.lon));
  }
  if (params.range) searchParams.set('range', params.range);
  if (params.q) searchParams.set('q', params.q);

  const url = `${SG_BASE}/venues?${searchParams.toString()}`;
  const data = await apiFetch<SgVenuesResponse>(url, {
    rateLimitDomain: 'api.seatgeek.com',
  });

  return {
    venues: data?.venues ?? [],
    total: data?.meta?.total ?? 0,
    page: data?.meta?.page ?? 1,
    perPage: data?.meta?.per_page ?? 25,
  };
}

// --- Mappers ---

function parseDateTimeUtc(datetimeUtc: string): Date {
  // SeatGeek datetime_utc is ISO-like without timezone suffix: "2026-03-24T20:00:00"
  // Treat as UTC
  const normalized = datetimeUtc.endsWith('Z') ? datetimeUtc : `${datetimeUtc}Z`;
  return new Date(normalized);
}

function guessVenueType(venue: SgVenue): VenueType {
  const name = venue.name.toLowerCase();
  if (name.includes('arena') || name.includes('coliseum') || name.includes('stadium')) return 'arena';
  if (name.includes('theater') || name.includes('theatre') || name.includes('auditorium')) return 'theater';
  if (name.includes('amphitheater') || name.includes('pavilion') || name.includes('park') || name.includes('island')) return 'outdoor';
  if (name.includes('bar') || name.includes('pub') || name.includes('tavern') || name.includes('taphouse')) return 'bar';
  if (name.includes('festival')) return 'festival';
  return 'club';
}

export function mapSgEventToEventData(sg: SgEvent): EventData {
  const date = parseDateTimeUtc(sg.datetime_utc);
  const artistIds = sg.performers.length > 0
    ? sg.performers.map((p) => `sg-artist-${p.id}`)
    : [`sg-event-${sg.id}`];

  return {
    id: `sg-${sg.id}`,
    artistIds,
    venueId: `sg-venue-${sg.venue.id}`,
    date: Timestamp.fromDate(date),
    doorsTime: undefined,
    showTime: Timestamp.fromDate(date),
    status: 'scheduled',
    ticketUrl: sg.url,
    priceRange:
      sg.stats.lowest_price != null && sg.stats.highest_price != null
        ? { min: sg.stats.lowest_price, max: sg.stats.highest_price, currency: 'USD' }
        : undefined,
    ageRestriction: undefined,
    source: 'seatgeek',
    externalIds: { seatgeekId: String(sg.id) },
    lastUpdated: Timestamp.now(),
  };
}

export function mapSgPerformerToArtistData(performer: SgPerformer): ArtistData {
  const genres = performer.genres?.map((g) => g.name).filter(Boolean) ?? [];
  return {
    id: `sg-artist-${performer.id}`,
    name: performer.name,
    sortName: performer.name,
    genres,
    tags: genres,
    images: {
      primary: performer.image ?? '',
      gallery: performer.image ? [performer.image] : [],
    },
    externalIds: {},
  };
}

export function mapSgVenueToVenueData(venue: SgVenue): VenueData {
  return {
    id: `sg-venue-${venue.id}`,
    name: venue.name,
    address: venue.address ?? '',
    city: venue.city ?? '',
    state: venue.state ?? '',
    lat: venue.location?.lat ?? 0,
    lng: venue.location?.lon ?? 0,
    capacity: venue.capacity ?? undefined,
    venueType: guessVenueType(venue),
    images: {
      primary: '',
      gallery: [],
    },
    externalIds: { seatgeekId: String(venue.id) },
    accessibility: {
      wheelchairAccessible: false,
      assistiveListening: false,
    },
    stats: { totalShowsTracked: 0, topArtists: [], genreBreakdown: [] },
    lastUpdated: Timestamp.now(),
  };
}

// --- Convenience: extract all entities from a search response ---

export interface SeatGeekResults {
  events: EventData[];
  artists: Map<string, ArtistData>;
  venues: Map<string, VenueData>;
}

export function parseSgEvents(sgEvents: SgEvent[]): SeatGeekResults {
  const events: EventData[] = [];
  const artists = new Map<string, ArtistData>();
  const venues = new Map<string, VenueData>();
  const seenEvents = new Set<string>();

  for (const sgEvent of sgEvents) {
    // Extract artists from performers
    if (sgEvent.performers.length > 0) {
      for (const performer of sgEvent.performers) {
        const artistId = `sg-artist-${performer.id}`;
        if (!artists.has(artistId)) {
          artists.set(artistId, mapSgPerformerToArtistData(performer));
        }
      }
    } else {
      // No performers — create a synthetic artist from the event title
      const syntheticId = `sg-event-${sgEvent.id}`;
      if (!artists.has(syntheticId)) {
        artists.set(syntheticId, {
          id: syntheticId,
          name: sgEvent.title,
          sortName: sgEvent.title,
          genres: [],
          tags: [],
          images: { primary: '', gallery: [] },
          externalIds: {},
        });
      }
    }

    // Extract venue
    if (sgEvent.venue) {
      const venueId = `sg-venue-${sgEvent.venue.id}`;
      if (!venues.has(venueId)) {
        venues.set(venueId, mapSgVenueToVenueData(sgEvent.venue));
      }
    }

    // Deduplicate: same performer(s) + venue name + date = same show
    const performerKey = sgEvent.performers.length > 0
      ? sgEvent.performers.map((p) => p.id).sort().join(',')
      : `event-${sgEvent.id}`;
    const venueName = (sgEvent.venue?.name ?? '').toLowerCase();
    const dateStr = sgEvent.datetime_utc?.split('T')[0] ?? '';
    const dedupeKey = `${performerKey}|${venueName}|${dateStr}`;

    if (seenEvents.has(dedupeKey)) continue;
    seenEvents.add(dedupeKey);

    events.push(mapSgEventToEventData(sgEvent));
  }

  return { events, artists, venues };
}
