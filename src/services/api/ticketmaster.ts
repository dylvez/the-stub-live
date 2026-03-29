import { Timestamp } from 'firebase/firestore';
import { apiFetch, apiKeys } from './config';
import { sanitizeArtistImage } from '@/utils/artistImage';
import type { EventData, ArtistData, VenueData, VenueType } from '@/types';

const TM_BASE = 'https://app.ticketmaster.com/discovery/v2';

// --- Ticketmaster Response Types ---

interface TmImage {
  url: string;
  width: number;
  height: number;
  ratio?: string;
}

interface TmPriceRange {
  type: string;
  currency: string;
  min: number;
  max: number;
}

interface TmClassification {
  primary: boolean;
  segment?: { id: string; name: string };
  genre?: { id: string; name: string };
  subGenre?: { id: string; name: string };
}

interface TmExternalLink {
  url: string;
}

interface TmAttraction {
  id: string;
  name: string;
  type: string;
  locale: string;
  images?: TmImage[];
  classifications?: TmClassification[];
  externalLinks?: {
    spotify?: TmExternalLink[];
    youtube?: TmExternalLink[];
    musicbrainz?: TmExternalLink[];
    homepage?: TmExternalLink[];
    instagram?: TmExternalLink[];
    facebook?: TmExternalLink[];
  };
}

interface TmVenue {
  id: string;
  name: string;
  type: string;
  locale: string;
  address?: { line1: string };
  city?: { name: string };
  state?: { stateCode: string; name: string };
  country?: { countryCode: string };
  location?: { latitude: string; longitude: string };
  images?: TmImage[];
  generalInfo?: { generalRule?: string; childRule?: string };
  accessibleSeatingDetail?: string;
  boxOfficeInfo?: { openHoursDetail?: string };
}

interface TmDates {
  start?: {
    localDate?: string;
    localTime?: string;
    dateTime?: string;
    noSpecificTime?: boolean;
  };
  status?: { code: string };
}

interface TmEvent {
  id: string;
  name: string;
  type: string;
  url: string;
  locale: string;
  images?: TmImage[];
  dates?: TmDates;
  priceRanges?: TmPriceRange[];
  ageRestrictions?: { legalAgeEnforced: boolean };
  _embedded?: {
    venues?: TmVenue[];
    attractions?: TmAttraction[];
  };
}

interface TmSearchResponse {
  _embedded?: { events?: TmEvent[] };
  page: { size: number; totalElements: number; totalPages: number; number: number };
}

// --- Search Parameters ---

export interface TmSearchParams {
  latlong?: string;
  radius?: string;
  unit?: 'miles' | 'km';
  startDateTime?: string;
  endDateTime?: string;
  size?: number;
  page?: number;
  classificationName?: string;
  keyword?: string;
  sort?: string;
  venueId?: string;
  attractionId?: string;
}

// --- API Functions ---

export async function searchEvents(params: TmSearchParams): Promise<{
  events: TmEvent[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
}> {
  const searchParams = new URLSearchParams();
  searchParams.set('apikey', apiKeys.ticketmaster!);
  searchParams.set('classificationName', params.classificationName ?? 'music');
  searchParams.set('size', String(params.size ?? 20));
  searchParams.set('page', String(params.page ?? 0));
  searchParams.set('sort', params.sort ?? 'date,asc');

  if (params.latlong) searchParams.set('latlong', params.latlong);
  if (params.radius) searchParams.set('radius', params.radius);
  if (params.unit) searchParams.set('unit', params.unit);
  if (params.startDateTime) searchParams.set('startDateTime', params.startDateTime);
  if (params.endDateTime) searchParams.set('endDateTime', params.endDateTime);
  if (params.keyword) searchParams.set('keyword', params.keyword);
  if (params.venueId) searchParams.set('venueId', params.venueId);
  if (params.attractionId) searchParams.set('attractionId', params.attractionId);

  const url = `${TM_BASE}/events.json?${searchParams.toString()}`;
  const data = await apiFetch<TmSearchResponse>(url, {
    rateLimitDomain: 'app.ticketmaster.com',
  });

  return {
    events: data?._embedded?.events ?? [],
    totalPages: data?.page?.totalPages ?? 0,
    totalElements: data?.page?.totalElements ?? 0,
    currentPage: data?.page?.number ?? 0,
  };
}

export async function searchAttractions(keyword: string): Promise<TmAttraction[]> {
  const searchParams = new URLSearchParams({
    apikey: apiKeys.ticketmaster!,
    keyword,
    classificationName: 'music',
    size: '10',
  });

  const url = `${TM_BASE}/attractions.json?${searchParams.toString()}`;
  const data = await apiFetch<{ _embedded?: { attractions?: TmAttraction[] } }>(url, {
    rateLimitDomain: 'app.ticketmaster.com',
  });

  return data?._embedded?.attractions ?? [];
}

export async function searchVenues(keyword: string): Promise<TmVenue[]> {
  const searchParams = new URLSearchParams({
    apikey: apiKeys.ticketmaster!,
    keyword,
    size: '10',
  });

  const url = `${TM_BASE}/venues.json?${searchParams.toString()}`;
  const data = await apiFetch<{ _embedded?: { venues?: TmVenue[] } }>(url, {
    rateLimitDomain: 'app.ticketmaster.com',
  });

  return data?._embedded?.venues ?? [];
}

// --- Mappers ---

function getBestImage(images?: TmImage[]): string {
  if (!images || images.length === 0) return '';
  // Prefer 16:9 ratio, then largest
  const sorted = [...images].sort((a, b) => {
    if (a.ratio === '16_9' && b.ratio !== '16_9') return -1;
    if (b.ratio === '16_9' && a.ratio !== '16_9') return 1;
    return (b.width ?? 0) - (a.width ?? 0);
  });
  return sorted[0].url;
}

function parseGenres(classifications?: TmClassification[]): string[] {
  if (!classifications) return [];
  const genres = new Set<string>();
  for (const c of classifications) {
    if (c.genre?.name && c.genre.name !== 'Undefined') genres.add(c.genre.name);
    if (c.subGenre?.name && c.subGenre.name !== 'Undefined') genres.add(c.subGenre.name);
  }
  return Array.from(genres);
}

function parseDateTime(dates?: TmDates): Date {
  if (dates?.start?.dateTime) {
    return new Date(dates.start.dateTime);
  }
  if (dates?.start?.localDate) {
    const time = dates.start.localTime ?? '20:00:00';
    return new Date(`${dates.start.localDate}T${time}`);
  }
  return new Date();
}

function mapTmStatus(code?: string): EventData['status'] {
  switch (code) {
    case 'cancelled': return 'cancelled';
    case 'postponed': case 'rescheduled': return 'postponed';
    default: return 'scheduled';
  }
}

function guessVenueType(venue: TmVenue): VenueType {
  const name = venue.name.toLowerCase();
  if (name.includes('arena') || name.includes('coliseum') || name.includes('stadium')) return 'arena';
  if (name.includes('theater') || name.includes('theatre') || name.includes('auditorium')) return 'theater';
  if (name.includes('amphitheater') || name.includes('pavilion') || name.includes('park') || name.includes('island')) return 'outdoor';
  if (name.includes('bar') || name.includes('pub') || name.includes('tavern') || name.includes('taphouse')) return 'bar';
  if (name.includes('festival')) return 'festival';
  return 'club';
}

export function mapTmEventToEventData(tm: TmEvent): EventData {
  const venue = tm._embedded?.venues?.[0];
  const attractions = tm._embedded?.attractions ?? [];
  const date = parseDateTime(tm.dates);

  // Use attraction IDs if available, otherwise use synthetic event-based ID
  const artistIds = attractions.length > 0
    ? attractions.map((a) => `tm-${a.id}`)
    : [`tm-event-${tm.id}`];

  return {
    id: `tm-${tm.id}`,
    artistIds,
    venueId: venue ? `tm-${venue.id}` : '',
    date: Timestamp.fromDate(date),
    doorsTime: undefined,
    showTime: Timestamp.fromDate(date),
    status: mapTmStatus(tm.dates?.status?.code),
    ticketUrl: tm.url,
    priceRange: tm.priceRanges?.[0]
      ? { min: tm.priceRanges[0].min, max: tm.priceRanges[0].max, currency: tm.priceRanges[0].currency }
      : undefined,
    ageRestriction: tm.ageRestrictions?.legalAgeEnforced ? 'All Ages Enforced' : undefined,
    source: 'ticketmaster',
    externalIds: { ticketmasterId: tm.id },
    lastUpdated: Timestamp.now(),
  };
}

export function mapTmAttractionToArtistData(tm: TmAttraction): ArtistData {
  const genres = parseGenres(tm.classifications);
  return {
    id: `tm-${tm.id}`,
    name: tm.name,
    sortName: tm.name,
    genres,
    tags: genres,
    images: {
      primary: sanitizeArtistImage(getBestImage(tm.images)) ?? '',
      gallery: (tm.images ?? []).map((i) => i.url).filter((u) => !!sanitizeArtistImage(u)).slice(0, 5),
    },
    externalIds: {
      youtubeChannelId: tm.externalLinks?.youtube?.[0]?.url,
      instagramHandle: tm.externalLinks?.instagram?.[0]?.url,
      websiteUrl: tm.externalLinks?.homepage?.[0]?.url,
    },
  };
}

export function mapTmVenueToVenueData(tm: TmVenue): VenueData {
  return {
    id: `tm-${tm.id}`,
    name: tm.name,
    address: tm.address?.line1 ?? '',
    city: tm.city?.name ?? '',
    state: tm.state?.stateCode ?? '',
    lat: tm.location ? parseFloat(tm.location.latitude) : 0,
    lng: tm.location ? parseFloat(tm.location.longitude) : 0,
    venueType: guessVenueType(tm),
    images: {
      primary: getBestImage(tm.images),
      gallery: [],
    },
    externalIds: { ticketmasterId: tm.id },
    accessibility: {
      wheelchairAccessible: !!tm.accessibleSeatingDetail,
      wheelchairSeating: tm.accessibleSeatingDetail,
      assistiveListening: false,
    },
    stats: { totalShowsTracked: 0, topArtists: [], genreBreakdown: [] },
    lastUpdated: Timestamp.now(),
  };
}

// --- Convenience: extract all entities from a search response ---

export interface TmParsedResults {
  events: EventData[];
  artists: Map<string, ArtistData>;
  venues: Map<string, VenueData>;
}

export function parseTmEvents(tmEvents: TmEvent[]): TmParsedResults {
  const events: EventData[] = [];
  const artists = new Map<string, ArtistData>();
  const venues = new Map<string, VenueData>();
  const seenEvents = new Set<string>();

  for (const tmEvent of tmEvents) {
    const attractions = tmEvent._embedded?.attractions ?? [];

    // Extract artists from attractions
    if (attractions.length > 0) {
      for (const attraction of attractions) {
        const artistId = `tm-${attraction.id}`;
        if (!artists.has(artistId)) {
          artists.set(artistId, mapTmAttractionToArtistData(attraction));
        }
      }
    } else {
      // No attractions — create a synthetic artist from the event name
      const syntheticId = `tm-event-${tmEvent.id}`;
      if (!artists.has(syntheticId)) {
        artists.set(syntheticId, {
          id: syntheticId,
          name: tmEvent.name,
          sortName: tmEvent.name,
          genres: parseGenres(undefined),
          tags: [],
          images: {
            primary: getBestImage(tmEvent.images),
            gallery: (tmEvent.images ?? []).map((i) => i.url).slice(0, 3),
          },
          externalIds: {},
        });
      }
    }

    // Extract venue
    const tmVenue = tmEvent._embedded?.venues?.[0];
    if (tmVenue) {
      const venueId = `tm-${tmVenue.id}`;
      if (!venues.has(venueId)) {
        venues.set(venueId, mapTmVenueToVenueData(tmVenue));
      }
    }

    // Deduplicate: same artist(s) + venue name + date = same show
    // Use venue name (not ID) because Ticketmaster often has multiple IDs for the same physical venue
    const attractionKey = attractions.length > 0
      ? attractions.map((a) => a.id).sort().join(',')
      : `event-${tmEvent.id}`;
    const venueName = (tmEvent._embedded?.venues?.[0]?.name ?? '').toLowerCase();
    const dateStr = tmEvent.dates?.start?.localDate ?? tmEvent.dates?.start?.dateTime ?? '';
    const dedupeKey = `${attractionKey}|${venueName}|${dateStr}`;

    if (seenEvents.has(dedupeKey)) continue;
    seenEvents.add(dedupeKey);

    events.push(mapTmEventToEventData(tmEvent));
  }

  return { events, artists, venues };
}
