import { Timestamp } from 'firebase/firestore';
import { apiFetch, apiKeys } from './config';
import type { EventData, ArtistData, VenueData, VenueType } from '@/types';

const EB_BASE = 'https://www.eventbriteapi.com/v3';

// --- Eventbrite Response Types ---

interface EbName {
  text: string;
  html?: string;
}

interface EbDescription {
  text: string;
  html?: string;
}

interface EbDateTime {
  utc: string;
  local: string;
  timezone?: string;
}

interface EbAddress {
  address_1?: string;
  address_2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
}

interface EbVenue {
  id: string;
  name: string;
  address?: EbAddress;
  capacity?: number;
}

interface EbOrganizer {
  id: string;
  name: string;
  description?: EbDescription;
  logo?: { url: string };
  url?: string;
}

interface EbLogo {
  url: string;
  original?: { url: string };
}

interface EbTicketPrice {
  value: number;
  currency: string;
  display: string;
  major_value: string;
}

interface EbTicketAvailability {
  minimum_ticket_price?: EbTicketPrice;
  maximum_ticket_price?: EbTicketPrice;
  has_available_tickets?: boolean;
  is_sold_out?: boolean;
}

interface EbEvent {
  id: string;
  name: EbName;
  description?: EbDescription;
  start: EbDateTime;
  end?: EbDateTime;
  url: string;
  venue_id?: string;
  venue?: EbVenue;
  organizer_id?: string;
  organizer?: EbOrganizer;
  logo?: EbLogo;
  is_free: boolean;
  ticket_availability?: EbTicketAvailability;
  status?: string;
  capacity?: number;
}

interface EbPagination {
  object_count: number;
  page_number: number;
  page_size: number;
  page_count: number;
  has_more_items: boolean;
}

interface EbSearchResponse {
  events: EbEvent[];
  pagination: EbPagination;
}

interface EbVenueResponse extends EbVenue {}

// --- Search Parameters ---

export interface EbSearchParams {
  latitude?: number;
  longitude?: number;
  within?: string;
  q?: string;
  startDateRangeStart?: string;
  startDateRangeEnd?: string;
  sortBy?: 'date' | 'best';
  page?: number;
}

export interface EbVenueSearchParams {
  keyword?: string;
  venueId?: string;
}

// --- Auth helper ---

function ebHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKeys.eventbrite!}`,
  };
}

// --- API Functions ---

export async function searchEventbriteEvents(params: EbSearchParams): Promise<{
  events: EbEvent[];
  totalCount: number;
  pageCount: number;
  currentPage: number;
  hasMore: boolean;
}> {
  const searchParams = new URLSearchParams();
  searchParams.set('categories', '103'); // Music
  searchParams.set('expand', 'venue,organizer');

  if (params.latitude != null && params.longitude != null) {
    searchParams.set('location.latitude', String(params.latitude));
    searchParams.set('location.longitude', String(params.longitude));
    searchParams.set('location.within', params.within ?? '50mi');
  }
  if (params.q) searchParams.set('q', params.q);
  if (params.startDateRangeStart) searchParams.set('start_date.range_start', params.startDateRangeStart);
  if (params.startDateRangeEnd) searchParams.set('start_date.range_end', params.startDateRangeEnd);
  if (params.sortBy) searchParams.set('sort_by', params.sortBy);
  if (params.page) searchParams.set('page', String(params.page));

  const url = `${EB_BASE}/events/search/?${searchParams.toString()}`;
  const data = await apiFetch<EbSearchResponse>(url, {
    headers: ebHeaders(),
    rateLimitDomain: 'www.eventbriteapi.com',
  });

  return {
    events: data?.events ?? [],
    totalCount: data?.pagination?.object_count ?? 0,
    pageCount: data?.pagination?.page_count ?? 0,
    currentPage: data?.pagination?.page_number ?? 1,
    hasMore: data?.pagination?.has_more_items ?? false,
  };
}

export async function searchEventbriteVenues(params: EbVenueSearchParams): Promise<EbVenue[]> {
  if (params.venueId) {
    const url = `${EB_BASE}/venues/${params.venueId}/`;
    const data = await apiFetch<EbVenueResponse>(url, {
      headers: ebHeaders(),
      rateLimitDomain: 'www.eventbriteapi.com',
    });
    return data ? [data] : [];
  }
  // Eventbrite does not have a direct venue search endpoint —
  // venues are discovered via event search. Return empty for keyword-only queries.
  return [];
}

// --- Mappers ---

function parseEbDateTime(dt: EbDateTime): Date {
  return new Date(dt.utc);
}

function mapEbStatus(status?: string): EventData['status'] {
  switch (status) {
    case 'canceled': return 'cancelled';
    case 'postponed': return 'postponed';
    case 'completed': return 'past';
    default: return 'scheduled';
  }
}

function guessVenueType(venue: EbVenue): VenueType {
  const name = venue.name.toLowerCase();
  if (name.includes('arena') || name.includes('coliseum') || name.includes('stadium')) return 'arena';
  if (name.includes('theater') || name.includes('theatre') || name.includes('auditorium')) return 'theater';
  if (name.includes('amphitheater') || name.includes('pavilion') || name.includes('park') || name.includes('island')) return 'outdoor';
  if (name.includes('bar') || name.includes('pub') || name.includes('tavern') || name.includes('taphouse')) return 'bar';
  if (name.includes('festival')) return 'festival';
  return 'club';
}

export function mapEbEventToEventData(eb: EbEvent): EventData {
  const date = parseEbDateTime(eb.start);
  const organizerId = eb.organizer?.id ?? eb.organizer_id ?? eb.id;
  const venueId = eb.venue?.id ?? eb.venue_id ?? '';

  return {
    id: `eb-${eb.id}`,
    artistIds: [`eb-org-${organizerId}`],
    venueId: venueId ? `eb-venue-${venueId}` : '',
    date: Timestamp.fromDate(date),
    doorsTime: undefined,
    showTime: Timestamp.fromDate(date),
    endTime: eb.end ? Timestamp.fromDate(parseEbDateTime(eb.end)) : undefined,
    status: mapEbStatus(eb.status),
    ticketUrl: eb.url,
    priceRange: eb.ticket_availability?.minimum_ticket_price && eb.ticket_availability?.maximum_ticket_price
      ? {
          min: eb.ticket_availability.minimum_ticket_price.value,
          max: eb.ticket_availability.maximum_ticket_price.value,
          currency: eb.ticket_availability.minimum_ticket_price.currency,
        }
      : eb.is_free
        ? { min: 0, max: 0, currency: 'USD' }
        : undefined,
    ageRestriction: undefined,
    source: 'eventbrite',
    externalIds: { eventbriteId: eb.id },
    lastUpdated: Timestamp.now(),
  };
}

export function mapEbOrganizerToArtistData(eb: EbEvent): ArtistData {
  const organizer = eb.organizer;
  const organizerId = organizer?.id ?? eb.organizer_id ?? eb.id;
  const name = organizer?.name ?? eb.name.text;

  return {
    id: `eb-org-${organizerId}`,
    name,
    sortName: name,
    genres: [],
    tags: [],
    images: {
      primary: eb.logo?.url ?? organizer?.logo?.url ?? '',
      gallery: [eb.logo?.url, organizer?.logo?.url].filter(Boolean) as string[],
    },
    externalIds: {
      websiteUrl: organizer?.url,
    },
  };
}

export function mapEbVenueToVenueData(venue: EbVenue): VenueData {
  return {
    id: `eb-venue-${venue.id}`,
    name: venue.name,
    address: venue.address?.address_1 ?? '',
    city: venue.address?.city ?? '',
    state: venue.address?.region ?? '',
    lat: venue.address?.latitude ? parseFloat(venue.address.latitude) : 0,
    lng: venue.address?.longitude ? parseFloat(venue.address.longitude) : 0,
    capacity: venue.capacity,
    venueType: guessVenueType(venue),
    images: {
      primary: '',
      gallery: [],
    },
    externalIds: { eventbriteId: venue.id },
    accessibility: {
      wheelchairAccessible: false,
      assistiveListening: false,
    },
    stats: { totalShowsTracked: 0, topArtists: [], genreBreakdown: [] },
    lastUpdated: Timestamp.now(),
  };
}

// --- Convenience: extract all entities from a search response ---

export interface EventbriteResults {
  events: EventData[];
  artists: Map<string, ArtistData>;
  venues: Map<string, VenueData>;
}

export function parseEbEvents(ebEvents: EbEvent[]): EventbriteResults {
  const events: EventData[] = [];
  const artists = new Map<string, ArtistData>();
  const venues = new Map<string, VenueData>();
  const seenEvents = new Set<string>();

  for (const ebEvent of ebEvents) {
    // Extract artist from organizer
    const organizerId = ebEvent.organizer?.id ?? ebEvent.organizer_id ?? ebEvent.id;
    const artistId = `eb-org-${organizerId}`;
    if (!artists.has(artistId)) {
      artists.set(artistId, mapEbOrganizerToArtistData(ebEvent));
    }

    // Extract venue
    const ebVenue = ebEvent.venue;
    if (ebVenue) {
      const venueId = `eb-venue-${ebVenue.id}`;
      if (!venues.has(venueId)) {
        venues.set(venueId, mapEbVenueToVenueData(ebVenue));
      }
    }

    // Deduplicate: same organizer + venue name + date = same show
    const venueName = (ebEvent.venue?.name ?? '').toLowerCase();
    const dateStr = ebEvent.start.utc.slice(0, 10);
    const dedupeKey = `${organizerId}|${venueName}|${dateStr}`;

    if (seenEvents.has(dedupeKey)) continue;
    seenEvents.add(dedupeKey);

    events.push(mapEbEventToEventData(ebEvent));
  }

  return { events, artists, venues };
}
