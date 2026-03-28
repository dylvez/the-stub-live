import { useState, useEffect, useRef } from 'react';
import { isTicketmasterConfigured, isSetlistFmConfigured, isBandsintownConfigured, isSeatGeekConfigured, isEventbriteConfigured, isJambaseConfigured } from '@/services/api/config';
import { useLocation } from '@/contexts/LocationContext';
import { searchEvents, searchAttractions, searchVenues as searchTmVenues, parseTmEvents, mapTmAttractionToArtistData, mapTmVenueToVenueData } from '@/services/api/ticketmaster';
import { searchSetlists } from '@/services/api/setlistfm';
import { getArtistEvents as getBitEvents } from '@/services/api/bandsintown';
import { searchSeatGeekEvents, parseSgEvents } from '@/services/api/seatgeek';
import { searchEventbriteEvents, parseEbEvents } from '@/services/api/eventbrite';
import { searchJambaseEvents, parseJbEvents } from '@/services/api/jambase';
import { cacheGet, cacheSet, memSet, CacheTTL } from '@/services/api/cache';
import { convertSetlistsToEvents } from '@/utils/setlistToEvent';
import { mergeArtistData, mergeVenueData } from '@/utils/entityMerge';
import type { ArtistData, VenueData, EventData } from '@/types';

export interface UseSearchReturn {
  artists: ArtistData[];
  venues: VenueData[];
  events: EventData[];
  /** Artists extracted from event results (keyed by ID) */
  eventArtists: Map<string, ArtistData>;
  /** Venues extracted from event results (keyed by ID) */
  eventVenues: Map<string, VenueData>;
  isSearching: boolean;
  error: string | null;
}

interface CachedSearch {
  artists: ArtistData[];
  venues: VenueData[];
  events: EventData[];
  eventArtistsArr: [string, ArtistData][];
  eventVenuesArr: [string, VenueData][];
}

export function useSearch(query: string, debounceMs = 300): UseSearchReturn {
  const { location: userLocation } = useLocation();
  const [artists, setArtists] = useState<ArtistData[]>([]);
  const [venues, setVenues] = useState<VenueData[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [eventArtists, setEventArtists] = useState<Map<string, ArtistData>>(new Map());
  const [eventVenues, setEventVenues] = useState<Map<string, VenueData>>(new Map());
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setArtists([]);
      setVenues([]);
      setEvents([]);
      setEventArtists(new Map());
      setEventVenues(new Map());
      setIsSearching(false);
      return;
    }

    if (!isTicketmasterConfigured) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    setIsSearching(true);

    timerRef.current = setTimeout(async () => {
      const cacheKey = `search:${query.toLowerCase()}:${userLocation.lat},${userLocation.lng}:${userLocation.radiusMiles}`;
      const cached = cacheGet<CachedSearch>(cacheKey);
      if (cached) {
        setArtists(cached.artists);
        setVenues(cached.venues);
        setEvents(cached.events);
        setEventArtists(new Map(cached.eventArtistsArr));
        setEventVenues(new Map(cached.eventVenuesArr));
        setIsSearching(false);
        return;
      }

      try {
        // Search all in parallel: TM attractions, TM venues, TM future events, TM past events, setlist.fm past shows
        const now = new Date();
        const sixMonthsAgo = new Date(now.getTime() - 180 * 86400000);
        const pastStart = sixMonthsAgo.toISOString().replace(/\.\d+Z$/, 'Z');
        const nowStr = now.toISOString().replace(/\.\d+Z$/, 'Z');

        const emptyResult = { events: [] as EventData[], artists: new Map<string, ArtistData>(), venues: new Map<string, VenueData>() };
        const emptyTmResult = { events: [], totalPages: 0, totalElements: 0, currentPage: 0 };
        const emptySgResult = { events: [] as never[], total: 0, page: 1, perPage: 20 };
        const emptyEbResult = { events: [] as never[], totalCount: 0, pageCount: 0, currentPage: 1, hasMore: false };
        const emptyJbResult = { events: [] as never[], totalPages: 0, totalItems: 0, currentPage: 1 };

        const [tmAttractions, tmVenues, tmFutureResult, tmPastResult, sfmResults, bitResults, sgResult, ebResult, jbResult] = await Promise.all([
          searchAttractions(query).catch(() => []),
          searchTmVenues(query).catch(() => []),
          isTicketmasterConfigured ? searchEvents({ keyword: query, size: 20, sort: 'date,asc', latlong: `${userLocation.lat},${userLocation.lng}`, radius: String(userLocation.radiusMiles), unit: 'miles' }).catch(() => emptyTmResult) : Promise.resolve(emptyTmResult),
          isTicketmasterConfigured ? searchEvents({ keyword: query, size: 20, startDateTime: pastStart, endDateTime: nowStr, sort: 'date,desc' }).catch(() => emptyTmResult) : Promise.resolve(emptyTmResult),
          isSetlistFmConfigured ? searchSetlists(query, 15).catch(() => []) : Promise.resolve([]),
          isBandsintownConfigured ? getBitEvents(query).catch(() => emptyResult) : Promise.resolve(emptyResult),
          isSeatGeekConfigured ? searchSeatGeekEvents({ q: query, per_page: 20, lat: userLocation.lat, lon: userLocation.lng, range: `${userLocation.radiusMiles}mi`, type: 'concert' }).catch(() => emptySgResult) : Promise.resolve(emptySgResult),
          isEventbriteConfigured ? searchEventbriteEvents({ q: query, latitude: userLocation.lat, longitude: userLocation.lng, within: `${userLocation.radiusMiles}mi` }).catch(() => emptyEbResult) : Promise.resolve(emptyEbResult),
          isJambaseConfigured ? searchJambaseEvents({ artistName: query, geoLatitude: userLocation.lat, geoLongitude: userLocation.lng, geoRadiusAmount: userLocation.radiusMiles, geoRadiusUnits: 'mi', perPage: 20, eventType: 'concert' }).catch(() => emptyJbResult) : Promise.resolve(emptyJbResult),
        ]);

        // Merge TM future + past events
        const tmEventResult = {
          events: [...tmFutureResult.events, ...tmPastResult.events],
          totalPages: tmFutureResult.totalPages + tmPastResult.totalPages,
          totalElements: tmFutureResult.totalElements + tmPastResult.totalElements,
          currentPage: 0,
        };

        const apiArtists = tmAttractions.map(mapTmAttractionToArtistData);
        const apiVenues = tmVenues.map(mapTmVenueToVenueData);
        const parsed = parseTmEvents(tmEventResult.events);

        // Convert setlist.fm results into EventData + artist/venue maps
        const sfmConverted = convertSetlistsToEvents(sfmResults);

        // Merge, deduplicating against TM events (same artist + same date)
        const allEventArtists = new Map(parsed.artists);
        const allEventVenues = new Map(parsed.venues);
        sfmConverted.artists.forEach((v, k) => {
          const existing = allEventArtists.get(k);
          allEventArtists.set(k, existing ? mergeArtistData(existing, v) : v);
        });
        sfmConverted.venues.forEach((v, k) => {
          const existing = allEventVenues.get(k);
          allEventVenues.set(k, existing ? mergeVenueData(existing, v) : v);
        });

        const sfmEvents = sfmConverted.events.filter((sfmEvent) => {
          const sfmDate = sfmEvent.date.toDate();
          const sfmArtist = sfmConverted.artists.get(sfmEvent.artistIds[0])?.name?.toLowerCase();
          return !parsed.events.some((e) => {
            const tmDate = e.date.toDate();
            return tmDate.toDateString() === sfmDate.toDateString()
              && allEventArtists.get(e.artistIds[0])?.name?.toLowerCase() === sfmArtist;
          });
        });

        // Merge Bandsintown events + artists + venues (dedupe against TM by artist+venue+date)
        bitResults.artists.forEach((v, k) => {
          const existing = allEventArtists.get(k);
          allEventArtists.set(k, existing ? mergeArtistData(existing, v) : v);
        });
        bitResults.venues.forEach((v, k) => {
          const existing = allEventVenues.get(k);
          allEventVenues.set(k, existing ? mergeVenueData(existing, v) : v);
        });

        const existingEventKeys = new Set(
          parsed.events.map((e) => {
            const a = allEventArtists.get(e.artistIds[0])?.name?.toLowerCase() ?? '';
            const v = allEventVenues.get(e.venueId)?.name?.toLowerCase() ?? '';
            return `${a}|${v}|${e.date.toDate().toDateString()}`;
          })
        );

        const bitEvents = bitResults.events.filter((be) => {
          const a = bitResults.artists.get(be.artistIds[0])?.name?.toLowerCase() ?? '';
          const v = bitResults.venues.get(be.venueId)?.name?.toLowerCase() ?? '';
          const key = `${a}|${v}|${be.date.toDate().toDateString()}`;
          return !existingEventKeys.has(key);
        });

        // Parse SeatGeek, Eventbrite, Jambase results
        const sgParsed = parseSgEvents(sgResult.events);
        sgParsed.artists.forEach((v, k) => {
          const existing = allEventArtists.get(k);
          allEventArtists.set(k, existing ? mergeArtistData(existing, v) : v);
        });
        sgParsed.venues.forEach((v, k) => {
          const existing = allEventVenues.get(k);
          allEventVenues.set(k, existing ? mergeVenueData(existing, v) : v);
        });

        const ebParsed = parseEbEvents(ebResult.events);
        ebParsed.artists.forEach((v, k) => {
          const existing = allEventArtists.get(k);
          allEventArtists.set(k, existing ? mergeArtistData(existing, v) : v);
        });
        ebParsed.venues.forEach((v, k) => {
          const existing = allEventVenues.get(k);
          allEventVenues.set(k, existing ? mergeVenueData(existing, v) : v);
        });

        const jbParsed = parseJbEvents(jbResult.events);
        jbParsed.artists.forEach((v, k) => {
          const existing = allEventArtists.get(k);
          allEventArtists.set(k, existing ? mergeArtistData(existing, v) : v);
        });
        jbParsed.venues.forEach((v, k) => {
          const existing = allEventVenues.get(k);
          allEventVenues.set(k, existing ? mergeVenueData(existing, v) : v);
        });

        // Dedupe supplemental source events against existing keys
        for (const supplemental of [sgParsed.events, ebParsed.events, jbParsed.events]) {
          for (const se of supplemental) {
            const a = allEventArtists.get(se.artistIds[0])?.name?.toLowerCase() ?? '';
            const v = allEventVenues.get(se.venueId)?.name?.toLowerCase() ?? '';
            const key = `${a}|${v}|${se.date.toDate().toDateString()}`;
            if (!existingEventKeys.has(key)) {
              existingEventKeys.add(key);
              bitEvents.push(se); // reuse bitEvents as the "supplemental" bucket
            }
          }
        }

        // Merge: TM events first, then supplemental (BIT + SG + EB + JB), then setlist.fm past shows
        const allEvents = [...parsed.events, ...bitEvents, ...sfmEvents];

        // Merge attraction-level artists with event-embedded artists
        const mergedArtists = dedupeArtists([...apiArtists, ...Array.from(allEventArtists.values())]);
        const mergedVenues = dedupeVenues([...apiVenues, ...Array.from(allEventVenues.values())]);

        setArtists(mergedArtists);
        setVenues(mergedVenues);
        setEvents(allEvents);
        setEventArtists(allEventArtists);
        setEventVenues(allEventVenues);

        // Cache individual venues and artists in memory so detail pages can find them
        for (const v of mergedVenues) {
          memSet(`venue:${v.id}`, v, CacheTTL.VENUE);
        }
        for (const a of mergedArtists) {
          memSet(`artist:${a.id}`, a, CacheTTL.ARTIST);
        }

        // Cache (maps stored as arrays for JSON compat)
        cacheSet(cacheKey, {
          artists: mergedArtists,
          venues: mergedVenues,
          events: allEvents,
          eventArtistsArr: Array.from(allEventArtists.entries()),
          eventVenuesArr: Array.from(allEventVenues.entries()),
        } satisfies CachedSearch, CacheTTL.SEARCH);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setIsSearching(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs, userLocation.lat, userLocation.lng, userLocation.radiusMiles]);

  return { artists, venues, events, eventArtists, eventVenues, isSearching, error };
}

/** Dedupe venues by normalized name + city, merging data from multiple sources */
function dedupeVenues(venues: VenueData[]): VenueData[] {
  const seen = new Map<string, number>(); // key -> index in result
  const result: VenueData[] = [];
  for (const v of venues) {
    const key = `${v.name.toLowerCase().trim()}|${v.city.toLowerCase().trim()}`;
    const existingIdx = seen.get(key);
    if (existingIdx !== undefined) {
      result[existingIdx] = mergeVenueData(result[existingIdx], v);
    } else {
      seen.set(key, result.length);
      result.push(v);
    }
  }
  return result;
}

/** Dedupe artists by normalized name, merging data from multiple sources */
function dedupeArtists(artists: ArtistData[]): ArtistData[] {
  const seen = new Map<string, number>(); // key -> index in result
  const result: ArtistData[] = [];
  for (const a of artists) {
    const key = a.name.toLowerCase().trim();
    const existingIdx = seen.get(key);
    if (existingIdx !== undefined) {
      result[existingIdx] = mergeArtistData(result[existingIdx], a);
    } else {
      seen.set(key, result.length);
      result.push(a);
    }
  }
  return result;
}
