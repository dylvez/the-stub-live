import { Timestamp } from 'firebase/firestore';
import { apiFetch, apiKeys } from './config';
import { sanitizeArtistImage } from '@/utils/artistImage';
import type { EventData, ArtistData, VenueData, VenueType } from '@/types';

// Use Vite dev proxy to avoid CORS — proxied at /api/jambase -> https://www.jambase.com/jb-api/v1
const JB_BASE = '/api/jambase';

// --- Jambase Response Types ---

interface JbGeo {
  latitude: number;
  longitude: number;
}

interface JbAddress {
  streetAddress?: string;
  addressLocality?: string;
  // API v1 returns addressRegion as either a string or a State object
  addressRegion?: string | { name?: string; alternateName?: string };
  postalCode?: string;
}

interface JbLocation {
  identifier: string;
  name: string;
  address?: JbAddress;
  geo?: JbGeo;
}

interface JbPerformer {
  identifier: string;
  name: string;
  image?: string;
  genre?: string | string[];
}

interface JbPriceSpec {
  price?: string;
  minPrice?: string;
  maxPrice?: string;
  priceCurrency?: string;
}

interface JbOffer {
  url?: string;
  // API v1 nests pricing under priceSpecification
  priceSpecification?: JbPriceSpec;
  // Legacy flat fields (kept for backwards compat)
  price?: number;
  priceCurrency?: string;
}

interface JbEvent {
  identifier: string;
  name: string;
  startDate: string;
  endDate?: string;
  url?: string;
  location: JbLocation;
  performer: JbPerformer[];
  offers?: JbOffer[];
}

interface JbPagination {
  totalItems: number;
  page: number;
  perPage: number;
  totalPages: number;
}

interface JbEventsResponse {
  success: boolean;
  pagination: JbPagination;
  events: JbEvent[];
}

interface JbVenuesResponse {
  success: boolean;
  pagination: JbPagination;
  venues: JbLocation[];
}

// --- Search Parameters ---

export interface JbEventSearchParams {
  geoLatitude?: number;
  geoLongitude?: number;
  geoRadiusAmount?: number;
  geoRadiusUnits?: 'mi' | 'km';
  artistName?: string;
  eventDateFrom?: string; // YYYY-MM-DD
  eventDateTo?: string;   // YYYY-MM-DD
  perPage?: number;
  page?: number;
  eventType?: string;
}

export interface JbVenueSearchParams {
  geoLatitude?: number;
  geoLongitude?: number;
  geoRadiusAmount?: number;
  geoRadiusUnits?: 'mi' | 'km';
  perPage?: number;
  page?: number;
}

// --- API Functions ---

/** Fetch events by a specific Jambase performer identifier (more precise than name search) */
export async function getJambaseEventsByPerformer(performerId: string): Promise<{
  events: JbEvent[];
  totalPages: number;
  totalItems: number;
  currentPage: number;
}> {
  // Jambase API uses `artistId` param with full "jambase:NNNNN" identifier format
  const fullId = performerId.startsWith('jambase:') ? performerId : `jambase:${performerId}`;
  const searchParams = new URLSearchParams();
  searchParams.set('apikey', apiKeys.jambase!);
  searchParams.set('artistId', fullId);
  searchParams.set('eventType', 'concert');
  searchParams.set('perPage', '25');
  searchParams.set('page', '1');

  const url = `${JB_BASE}/events?${searchParams.toString()}`;
  const data = await apiFetch<JbEventsResponse>(url, {
    rateLimitDomain: 'www.jambase.com',
  });

  return {
    events: data?.events ?? [],
    totalPages: data?.pagination?.totalPages ?? 0,
    totalItems: data?.pagination?.totalItems ?? 0,
    currentPage: data?.pagination?.page ?? 1,
  };
}

/** Fetch events at a specific Jambase venue by venue identifier */
export async function getJambaseEventsByVenue(venueId: string): Promise<{
  events: JbEvent[];
  totalPages: number;
  totalItems: number;
  currentPage: number;
}> {
  const fullId = venueId.startsWith('jambase:') ? venueId : `jambase:${venueId}`;
  const searchParams = new URLSearchParams();
  searchParams.set('apikey', apiKeys.jambase!);
  searchParams.set('venueId', fullId);
  searchParams.set('eventType', 'concert');
  searchParams.set('perPage', '50');
  searchParams.set('page', '1');

  const url = `${JB_BASE}/events?${searchParams.toString()}`;
  const data = await apiFetch<JbEventsResponse>(url, {
    rateLimitDomain: 'www.jambase.com',
  });

  return {
    events: data?.events ?? [],
    totalPages: data?.pagination?.totalPages ?? 0,
    totalItems: data?.pagination?.totalItems ?? 0,
    currentPage: data?.pagination?.page ?? 1,
  };
}

export async function searchJambaseEvents(params: JbEventSearchParams): Promise<{
  events: JbEvent[];
  totalPages: number;
  totalItems: number;
  currentPage: number;
}> {
  const searchParams = new URLSearchParams();
  searchParams.set('apikey', apiKeys.jambase!);
  searchParams.set('eventType', params.eventType ?? 'concert');
  searchParams.set('perPage', String(params.perPage ?? 25));
  searchParams.set('page', String(params.page ?? 1));

  if (params.geoLatitude != null) searchParams.set('geoLatitude', String(params.geoLatitude));
  if (params.geoLongitude != null) searchParams.set('geoLongitude', String(params.geoLongitude));
  if (params.geoRadiusAmount != null) searchParams.set('geoRadiusAmount', String(params.geoRadiusAmount));
  if (params.geoRadiusUnits) searchParams.set('geoRadiusUnits', params.geoRadiusUnits);
  if (params.artistName) searchParams.set('artistName', params.artistName);
  if (params.eventDateFrom) searchParams.set('eventDateFrom', params.eventDateFrom);
  if (params.eventDateTo) searchParams.set('eventDateTo', params.eventDateTo);

  const url = `${JB_BASE}/events?${searchParams.toString()}`;
  const data = await apiFetch<JbEventsResponse>(url, {
    rateLimitDomain: 'www.jambase.com',
  });

  return {
    events: data?.events ?? [],
    totalPages: data?.pagination?.totalPages ?? 0,
    totalItems: data?.pagination?.totalItems ?? 0,
    currentPage: data?.pagination?.page ?? 1,
  };
}

export async function searchJambaseVenues(params: JbVenueSearchParams): Promise<{
  venues: JbLocation[];
  totalPages: number;
  totalItems: number;
  currentPage: number;
}> {
  const searchParams = new URLSearchParams();
  searchParams.set('apikey', apiKeys.jambase!);
  searchParams.set('perPage', String(params.perPage ?? 25));
  searchParams.set('page', String(params.page ?? 1));

  if (params.geoLatitude != null) searchParams.set('geoLatitude', String(params.geoLatitude));
  if (params.geoLongitude != null) searchParams.set('geoLongitude', String(params.geoLongitude));
  if (params.geoRadiusAmount != null) searchParams.set('geoRadiusAmount', String(params.geoRadiusAmount));
  if (params.geoRadiusUnits) searchParams.set('geoRadiusUnits', params.geoRadiusUnits);

  const url = `${JB_BASE}/venues?${searchParams.toString()}`;
  const data = await apiFetch<JbVenuesResponse>(url, {
    rateLimitDomain: 'www.jambase.com',
  });

  return {
    venues: data?.venues ?? [],
    totalPages: data?.pagination?.totalPages ?? 0,
    totalItems: data?.pagination?.totalItems ?? 0,
    currentPage: data?.pagination?.page ?? 1,
  };
}

// --- Mappers ---

/** Strip "jambase:" prefix from identifiers — API v1 returns "jambase:12345" */
function stripJbPrefix(id: string): string {
  return id.startsWith('jambase:') ? id.slice(8) : id;
}

function parseAddressRegion(region?: string | { name?: string; alternateName?: string }): string {
  if (!region) return '';
  if (typeof region === 'string') return region;
  return region.alternateName ?? region.name ?? '';
}

function parseJbDateTime(isoString: string): Date {
  if (isoString) {
    return new Date(isoString);
  }
  return new Date();
}

function guessVenueType(name: string): VenueType {
  const lower = name.toLowerCase();
  if (lower.includes('arena') || lower.includes('coliseum') || lower.includes('stadium')) return 'arena';
  if (lower.includes('theater') || lower.includes('theatre') || lower.includes('auditorium')) return 'theater';
  if (lower.includes('amphitheater') || lower.includes('pavilion') || lower.includes('park') || lower.includes('island')) return 'outdoor';
  if (lower.includes('bar') || lower.includes('pub') || lower.includes('tavern') || lower.includes('taphouse')) return 'bar';
  if (lower.includes('festival')) return 'festival';
  return 'club';
}

function parseGenres(genre?: string | string[]): string[] {
  if (!genre) return [];
  // Jambase API v1 returns genre as an array; handle both formats
  if (Array.isArray(genre)) {
    return genre.filter((g) => g && g !== 'Undefined');
  }
  return genre
    .split(/[,/]/)
    .map((g) => g.trim())
    .filter((g) => g.length > 0 && g !== 'Undefined');
}

function getTicketUrl(event: JbEvent): string | undefined {
  return event.url || event.offers?.[0]?.url || undefined;
}

function getPriceRange(offers?: JbOffer[]): EventData['priceRange'] {
  if (!offers || offers.length === 0) return undefined;

  const prices: number[] = [];
  let currency = 'USD';

  for (const o of offers) {
    // API v1 nests pricing under priceSpecification
    const spec = o.priceSpecification;
    if (spec) {
      if (spec.priceCurrency) currency = spec.priceCurrency;
      const price = spec.price ? parseFloat(spec.price) : NaN;
      if (!isNaN(price) && price > 0) prices.push(price);
      const minP = spec.minPrice ? parseFloat(spec.minPrice) : NaN;
      if (!isNaN(minP) && minP > 0) prices.push(minP);
      const maxP = spec.maxPrice ? parseFloat(spec.maxPrice) : NaN;
      if (!isNaN(maxP) && maxP > 0) prices.push(maxP);
    }
    // Legacy flat fields
    if (o.priceCurrency) currency = o.priceCurrency;
    if (o.price != null && o.price > 0) prices.push(o.price);
  }

  if (prices.length === 0) return undefined;
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    currency,
  };
}

export function mapJbEventToEventData(jb: JbEvent): EventData {
  const date = parseJbDateTime(jb.startDate);
  const eventId = stripJbPrefix(jb.identifier);

  const artistIds = jb.performer.length > 0
    ? jb.performer.map((p) => `jb-artist-${stripJbPrefix(p.identifier)}`)
    : [`jb-event-${eventId}`];

  return {
    id: `jb-${eventId}`,
    artistIds,
    venueId: jb.location ? `jb-venue-${stripJbPrefix(jb.location.identifier)}` : '',
    date: Timestamp.fromDate(date),
    doorsTime: undefined,
    showTime: Timestamp.fromDate(date),
    endTime: jb.endDate ? Timestamp.fromDate(parseJbDateTime(jb.endDate)) : undefined,
    status: 'scheduled',
    ticketUrl: getTicketUrl(jb),
    priceRange: getPriceRange(jb.offers),
    ageRestriction: undefined,
    source: 'jambase',
    externalIds: { jambaseId: eventId },
    lastUpdated: Timestamp.now(),
  };
}

export function mapJbPerformerToArtistData(performer: JbPerformer): ArtistData {
  const genres = parseGenres(performer.genre);
  const perfId = stripJbPrefix(performer.identifier);
  return {
    id: `jb-artist-${perfId}`,
    name: performer.name,
    sortName: performer.name,
    genres,
    tags: genres,
    images: {
      primary: sanitizeArtistImage(performer.image) ?? '',
      gallery: sanitizeArtistImage(performer.image) ? [performer.image] : [],
    },
    externalIds: {
      jambaseId: perfId,
    },
  };
}

export function mapJbLocationToVenueData(location: JbLocation): VenueData {
  const locId = stripJbPrefix(location.identifier);
  return {
    id: `jb-venue-${locId}`,
    name: location.name,
    address: location.address?.streetAddress ?? '',
    city: location.address?.addressLocality ?? '',
    state: parseAddressRegion(location.address?.addressRegion),
    lat: location.geo?.latitude ?? 0,
    lng: location.geo?.longitude ?? 0,
    venueType: guessVenueType(location.name),
    images: {
      primary: '',
      gallery: [],
    },
    externalIds: { jambaseId: locId },
    accessibility: {
      wheelchairAccessible: false,
      assistiveListening: false,
    },
    stats: { totalShowsTracked: 0, topArtists: [], genreBreakdown: [] },
    lastUpdated: Timestamp.now(),
  };
}

// --- Convenience: extract all entities from a search response ---

export interface JambaseResults {
  events: EventData[];
  artists: Map<string, ArtistData>;
  venues: Map<string, VenueData>;
}

export function parseJbEvents(jbEvents: JbEvent[]): JambaseResults {
  const events: EventData[] = [];
  const artists = new Map<string, ArtistData>();
  const venues = new Map<string, VenueData>();
  const seenEvents = new Set<string>();

  for (const jbEvent of jbEvents) {
    // Extract artists from performers
    if (jbEvent.performer.length > 0) {
      for (const performer of jbEvent.performer) {
        const artistId = `jb-artist-${stripJbPrefix(performer.identifier)}`;
        if (!artists.has(artistId)) {
          artists.set(artistId, mapJbPerformerToArtistData(performer));
        }
      }
    } else {
      // No performers — create a synthetic artist from the event name
      const syntheticId = `jb-event-${stripJbPrefix(jbEvent.identifier)}`;
      if (!artists.has(syntheticId)) {
        artists.set(syntheticId, {
          id: syntheticId,
          name: jbEvent.name,
          sortName: jbEvent.name,
          genres: [],
          tags: [],
          images: { primary: '', gallery: [] },
          externalIds: {},
        });
      }
    }

    // Extract venue
    if (jbEvent.location) {
      const venueId = `jb-venue-${stripJbPrefix(jbEvent.location.identifier)}`;
      if (!venues.has(venueId)) {
        venues.set(venueId, mapJbLocationToVenueData(jbEvent.location));
      }
    }

    // Deduplicate: same performer(s) + venue name + date = same show
    const performerKey = jbEvent.performer.length > 0
      ? jbEvent.performer.map((p) => stripJbPrefix(p.identifier)).sort().join(',')
      : `event-${stripJbPrefix(jbEvent.identifier)}`;
    const venueName = (jbEvent.location?.name ?? '').toLowerCase();
    const dateStr = jbEvent.startDate?.split('T')[0] ?? '';
    const dedupeKey = `${performerKey}|${venueName}|${dateStr}`;

    if (seenEvents.has(dedupeKey)) continue;
    seenEvents.add(dedupeKey);

    events.push(mapJbEventToEventData(jbEvent));
  }

  return { events, artists, venues };
}
