// Bandsintown API client — supplemental events by artist name
// Uses public app_id (not a secret key)

import { Timestamp } from 'firebase/firestore';
import { apiFetch } from './config';
import { cacheGet, cacheSet, CacheTTL } from './cache';
import { sanitizeArtistImage } from '@/utils/artistImage';
import type { EventData, ArtistData, VenueData } from '@/types';

const BIT_BASE = 'https://rest.bandsintown.com';
const APP_ID = 'the-stub-live';

interface BitVenue {
  name: string;
  city: string;
  region: string;
  country: string;
  latitude: string;
  longitude: string;
  location: string;
  street_address?: string;
  postal_code?: string;
}

interface BitOffer {
  type: string;
  url: string;
  status: string;
}

interface BitArtist {
  id: string;
  name: string;
  image_url: string;
  thumb_url: string;
  tracker_count: number;
  upcoming_event_count: number;
}

interface BitEvent {
  id: string;
  artist_id: string;
  artist?: BitArtist;
  datetime: string;
  venue: BitVenue;
  offers: BitOffer[];
  lineup: string[];
  description: string;
  title?: string;
  sold_out?: boolean;
}

export interface BandsintownResults {
  events: EventData[];
  artists: Map<string, ArtistData>;
  venues: Map<string, VenueData>;
}

/** Search Bandsintown for events by artist name */
export async function getArtistEvents(artistName: string): Promise<BandsintownResults> {
  const cacheKey = `bit:${artistName.toLowerCase()}`;
  const cached = cacheGet<{ events: EventData[]; artists: [string, ArtistData][]; venues: [string, VenueData][] }>(cacheKey);
  if (cached) {
    return {
      events: cached.events,
      artists: new Map(cached.artists),
      venues: new Map(cached.venues),
    };
  }

  const encoded = encodeURIComponent(artistName);
  const url = `${BIT_BASE}/artists/${encoded}/events?app_id=${APP_ID}`;

  let data: BitEvent[];
  try {
    const result = await apiFetch<BitEvent[] | { Message?: string }>(url, {
      rateLimitDomain: 'rest.bandsintown.com',
    });
    if (!Array.isArray(result)) return { events: [], artists: new Map(), venues: new Map() };
    data = result;
  } catch {
    return { events: [], artists: new Map(), venues: new Map() };
  }

  const events: EventData[] = [];
  const artists = new Map<string, ArtistData>();
  const venues = new Map<string, VenueData>();

  for (const bit of data) {
    const artistId = `bit-${bit.artist_id}`;
    const venueId = `bit-venue-${bit.venue.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const date = new Date(bit.datetime);
    const ticketOffer = bit.offers.find((o) => o.type === 'Tickets' && o.status === 'available');

    // Create artist entry
    if (!artists.has(artistId)) {
      const bitArtist = bit.artist;
      artists.set(artistId, {
        id: artistId,
        name: bitArtist?.name ?? artistName,
        sortName: bitArtist?.name ?? artistName,
        genres: [],
        tags: [],
        images: {
          primary: sanitizeArtistImage(bitArtist?.image_url) ?? '',
          gallery: [],
        },
        externalIds: { bandsintown: bit.artist_id },
      });
    }

    // Create venue entry
    if (!venues.has(venueId)) {
      const lat = parseFloat(bit.venue.latitude);
      const lng = parseFloat(bit.venue.longitude);
      venues.set(venueId, {
        id: venueId,
        name: bit.venue.name,
        address: bit.venue.street_address ?? '',
        city: bit.venue.city,
        state: bit.venue.region,
        lat: isNaN(lat) ? 0 : lat,
        lng: isNaN(lng) ? 0 : lng,
        capacity: 0,
        venueType: 'club',
        images: { primary: '', gallery: [] },
        externalIds: {},
        accessibility: { wheelchairAccessible: false, assistiveListening: false },
        stats: { totalShowsTracked: 0, topArtists: [], genreBreakdown: [] },
        lastUpdated: Timestamp.now(),
      });
    }

    events.push({
      id: `bit-${bit.id}`,
      artistIds: [artistId],
      venueId,
      date: Timestamp.fromDate(date),
      status: bit.sold_out ? 'past' : 'scheduled',
      ticketUrl: ticketOffer?.url,
      source: 'bandsintown',
      externalIds: { bandsintown: bit.id },
      lastUpdated: Timestamp.now(),
    });
  }

  // Cache
  cacheSet(cacheKey, {
    events,
    artists: Array.from(artists.entries()),
    venues: Array.from(venues.entries()),
  }, CacheTTL.EVENTS);

  return { events, artists, venues };
}
