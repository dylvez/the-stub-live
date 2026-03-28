import { Timestamp } from 'firebase/firestore';
import type { SetlistResult } from '@/services/api/setlistfm';
import type { EventData, ArtistData, VenueData } from '@/types';

/** Parse setlist.fm DD-MM-YYYY date to a Date object (local time, not UTC) */
export function parseSetlistDate(dateStr: string): Date {
  const [dd, mm, yyyy] = dateStr.split('-');
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

/** Format a setlist.fm DD-MM-YYYY date as a readable string */
export function formatSetlistDate(dateStr: string): string {
  const d = parseSetlistDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

interface ConvertedSetlistEvents {
  events: EventData[];
  artists: Map<string, ArtistData>;
  venues: Map<string, VenueData>;
}

/** Convert SetlistResults into EventData + artist/venue maps for consistent display */
export function convertSetlistsToEvents(setlists: SetlistResult[]): ConvertedSetlistEvents {
  const events: EventData[] = [];
  const artists = new Map<string, ArtistData>();
  const venues = new Map<string, VenueData>();

  for (const sl of setlists) {
    const eventDate = parseSetlistDate(sl.date);
    if (isNaN(eventDate.getTime())) continue;

    const eventId = `sfm-${sl.id}`;
    const artistName = sl.artistName ?? 'Unknown Artist';
    const artistId = `sfm-artist-${artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const venueId = `sfm-venue-${sl.venueName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    events.push({
      id: eventId,
      artistIds: [artistId],
      venueId,
      date: Timestamp.fromDate(eventDate),
      status: 'past',
      source: 'setlistfm',
      externalIds: {},
      lastUpdated: Timestamp.now(),
    });

    if (!artists.has(artistId)) {
      artists.set(artistId, {
        id: artistId,
        name: artistName,
        sortName: artistName,
        genres: [],
        tags: [],
        images: { primary: '', gallery: [] },
        externalIds: {},
      });
    }

    if (!venues.has(venueId)) {
      venues.set(venueId, {
        id: venueId,
        name: sl.venueName,
        address: '',
        city: sl.venueCity.split(',')[0]?.trim() ?? '',
        state: sl.venueCity.split(',')[1]?.trim() ?? '',
        lat: 0,
        lng: 0,
        capacity: 0,
        venueType: 'club',
        images: { primary: '', gallery: [] },
        externalIds: {},
        accessibility: { wheelchairAccessible: false, assistiveListening: false },
        stats: { totalShowsTracked: 0, topArtists: [], genreBreakdown: [] },
        lastUpdated: Timestamp.now(),
      });
    }
  }

  return { events, artists, venues };
}
