import { useState, useEffect, useCallback, useRef } from 'react';
import { isTicketmasterConfigured, isSeatGeekConfigured, isEventbriteConfigured, isJambaseConfigured } from '@/services/api/config';
import { useLocation } from '@/contexts/LocationContext';
import { searchEvents, parseTmEvents } from '@/services/api/ticketmaster';
import { searchSeatGeekEvents, parseSgEvents } from '@/services/api/seatgeek';
import { searchEventbriteEvents, parseEbEvents } from '@/services/api/eventbrite';
import { searchJambaseEvents, getJambaseEventsByPerformer, getJambaseEventsByVenue, parseJbEvents } from '@/services/api/jambase';
import { cacheGet, cacheSet, CacheTTL } from '@/services/api/cache';
import { mergeArtistData, mergeVenueData } from '@/utils/entityMerge';
import { trackImageUrl, isDuplicateImage, resetImageTracker } from '@/utils/artistImage';
import { useImageEnrichment } from './useImageEnrichment';
import type { EventData, ArtistData, VenueData } from '@/types';

export interface UseEventsOptions {
  lat?: number;
  lng?: number;
  radius?: number;
  genre?: string;
  startDate?: Date;
  endDate?: Date;
  keyword?: string;
  artistId?: string;
  venueId?: string;
  pageSize?: number;
}

export interface UseEventsReturn {
  events: EventData[];
  artists: Map<string, ArtistData>;
  venues: Map<string, VenueData>;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  totalResults: number;
}

function buildCacheKey(opts: UseEventsOptions, lat: number, lng: number, radius: number): string {
  return ['events-multi', lat, lng, radius, opts.genre ?? 'all', opts.keyword ?? '', opts.artistId ?? '', opts.venueId ?? ''].join(':');
}

/** Deduplicate events from multiple sources by artist+venue+date, merging entity data */
/** Normalize a venue name for dedup comparison */
function normalizeVenueName(name: string): string {
  return name.toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/['']/g, "'")
    .replace(/&/g, 'and')
    .replace(/café|cafe/gi, 'cafe')
    .trim();
}

/** Check if two venue names likely refer to the same place */
function venueNamesMatch(a: string, b: string): boolean {
  const na = normalizeVenueName(a);
  const nb = normalizeVenueName(b);
  if (na === nb) return true;
  // Check if one is a substring/prefix of the other (e.g. "Southern" vs "Southern Café & Music Hall")
  if (na.length >= 4 && nb.length >= 4) {
    if (na.startsWith(nb) || nb.startsWith(na)) return true;
  }
  return false;
}

function dedupeEvents(
  events: EventData[],
  artists: Map<string, ArtistData>,
  venues: Map<string, VenueData>,
): EventData[] {
  // Map from exact key → event, plus a secondary index for fuzzy venue matching
  const seen = new Map<string, EventData>();
  // artist+date → array of { venueName, key } for fuzzy venue matching
  const artistDateIndex = new Map<string, { venueName: string; key: string }[]>();
  const result: EventData[] = [];

  function mergeInto(existing: EventData, e: EventData, key: string): void {
    const existingArtist = artists.get(existing.artistIds[0]);
    const newArtist = artists.get(e.artistIds[0]);
    if (existingArtist && newArtist) {
      artists.set(existing.artistIds[0], mergeArtistData(existingArtist, newArtist));
    }
    const existingVenue = venues.get(existing.venueId);
    const newVenue = venues.get(e.venueId);
    if (existingVenue && newVenue) {
      venues.set(existing.venueId, mergeVenueData(existingVenue, newVenue));
    }
    // Prefer TM events over Jambase
    const existIsTm = existing.source.includes('ticketmaster');
    const newIsTm = e.source.includes('ticketmaster');
    if (newIsTm && !existIsTm) {
      const idx = result.indexOf(existing);
      if (idx !== -1) result[idx] = e;
      seen.set(key, e);
    }
  }

  for (const e of events) {
    const artist = artists.get(e.artistIds[0]);
    const venue = venues.get(e.venueId);
    const artistName = artist?.name?.toLowerCase().trim() ?? '';
    const venueName = venue?.name ?? '';
    const dateStr = e.date.toDate().toDateString();
    const normalizedVenue = normalizeVenueName(venueName);
    const key = `${artistName}|${normalizedVenue}|${dateStr}`;

    // Check exact match first
    const existing = seen.get(key);
    if (existing) {
      mergeInto(existing, e, key);
      continue;
    }

    // Check fuzzy venue match: same artist + date, similar venue name
    const artistDateKey = `${artistName}|${dateStr}`;
    const candidates = artistDateIndex.get(artistDateKey) ?? [];
    let fuzzyMatch: { venueName: string; key: string } | undefined;
    for (const c of candidates) {
      if (venueNamesMatch(venueName, c.venueName)) {
        fuzzyMatch = c;
        break;
      }
    }

    if (fuzzyMatch) {
      const existingEvent = seen.get(fuzzyMatch.key);
      if (existingEvent) {
        mergeInto(existingEvent, e, fuzzyMatch.key);
        continue;
      }
    }

    // No match — add as new event
    seen.set(key, e);
    result.push(e);
    if (!artistDateIndex.has(artistDateKey)) artistDateIndex.set(artistDateKey, []);
    artistDateIndex.get(artistDateKey)!.push({ venueName, key });
  }
  return result;
}

export function useEvents(options: UseEventsOptions = {}): UseEventsReturn {
  const { location: userLocation } = useLocation();
  const [events, setEvents] = useState<EventData[]>([]);
  const [artists, setArtists] = useState<Map<string, ArtistData>>(new Map());
  const [venues, setVenues] = useState<Map<string, VenueData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  // Use refs to avoid stale closures without adding deps that cause loops
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const locationRef = useRef(userLocation);
  locationRef.current = userLocation;

  const fetchEvents = useCallback(async (page: number, append: boolean) => {
    const loc = locationRef.current;
    const opts = optionsRef.current;

    if (!isTicketmasterConfigured && !isSeatGeekConfigured && !isEventbriteConfigured && !isJambaseConfigured) {
      setEvents([]);
      setArtists(new Map());
      setVenues(new Map());
      setIsLoading(false);
      setTotalResults(0);
      return;
    }

    const cacheKey = `${buildCacheKey(opts, loc.lat, loc.lng, loc.radiusMiles)}:page${page}`;

    // Check cache
    const cached = cacheGet<{ events: EventData[]; artists: [string, ArtistData][]; venues: [string, VenueData][]; totalPages: number; totalElements: number }>(cacheKey);
    if (cached && !append) {
      setEvents(cached.events);
      setArtists(new Map(cached.artists));
      setVenues(new Map(cached.venues));
      setTotalPages(cached.totalPages);
      setTotalResults(cached.totalElements);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const lat = opts.lat ?? loc.lat;
      const lng = opts.lng ?? loc.lng;
      const radius = opts.radius ?? loc.radiusMiles;

      const now = new Date();
      const startDateTime = opts.startDate
        ? opts.startDate.toISOString().replace(/\.\d+Z$/, 'Z')
        : now.toISOString().replace(/\.\d+Z$/, 'Z');

      const endDate = opts.endDate ?? new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const endDateTime = endDate.toISOString().replace(/\.\d+Z$/, 'Z');

      const allEvents: EventData[] = [];
      const allArtists = new Map<string, ArtistData>();
      const allVenues = new Map<string, VenueData>();
      let maxTotalPages = 0;
      let maxTotalElements = 0;

      const promises: Promise<void>[] = [];

      // Ticketmaster
      if (isTicketmasterConfigured) {
        promises.push(
          searchEvents({
            latlong: `${lat},${lng}`,
            radius: String(radius),
            unit: 'miles',
            startDateTime,
            endDateTime,
            size: opts.pageSize ?? 20,
            page,
            classificationName: opts.genre && opts.genre !== 'All' ? opts.genre : 'music',
            keyword: opts.keyword,
            venueId: opts.venueId?.startsWith('tm-') ? opts.venueId.slice(3) : opts.venueId,
            attractionId: opts.artistId?.startsWith('tm-') ? opts.artistId.slice(3) : opts.artistId,
          }).then((result) => {
            const parsed = parseTmEvents(result.events);
            allEvents.push(...parsed.events);
            parsed.artists.forEach((v, k) => {
              const existing = allArtists.get(k);
              allArtists.set(k, existing ? mergeArtistData(existing, v) : v);
            });
            parsed.venues.forEach((v, k) => {
              const existing = allVenues.get(k);
              allVenues.set(k, existing ? mergeVenueData(existing, v) : v);
            });
            maxTotalPages = Math.max(maxTotalPages, result.totalPages);
            maxTotalElements += result.totalElements;
          }).catch(() => { /* TM failed silently */ })
        );
      }

      // SeatGeek
      if (isSeatGeekConfigured) {
        promises.push(
          searchSeatGeekEvents({
            lat,
            lon: lng,
            range: `${radius}mi`,
            per_page: opts.pageSize ?? 20,
            page: page + 1,
            sort: 'score.desc',
            type: 'concert',
            'datetime_utc.gte': startDateTime.replace('Z', ''),
            'datetime_utc.lte': endDateTime.replace('Z', ''),
            q: opts.keyword,
          }).then((result) => {
            const parsed = parseSgEvents(result.events);
            allEvents.push(...parsed.events);
            parsed.artists.forEach((v, k) => {
              const existing = allArtists.get(k);
              allArtists.set(k, existing ? mergeArtistData(existing, v) : v);
            });
            parsed.venues.forEach((v, k) => {
              const existing = allVenues.get(k);
              allVenues.set(k, existing ? mergeVenueData(existing, v) : v);
            });
            maxTotalElements += result.total ?? parsed.events.length;
          }).catch(() => { /* SG failed silently */ })
        );
      }

      // Eventbrite
      if (isEventbriteConfigured) {
        promises.push(
          searchEventbriteEvents({
            latitude: lat,
            longitude: lng,
            within: `${radius}mi`,
            startDateRangeStart: startDateTime,
            startDateRangeEnd: endDateTime,
            q: opts.keyword,
          }).then((result) => {
            const parsed = parseEbEvents(result.events);
            allEvents.push(...parsed.events);
            parsed.artists.forEach((v, k) => {
              const existing = allArtists.get(k);
              allArtists.set(k, existing ? mergeArtistData(existing, v) : v);
            });
            parsed.venues.forEach((v, k) => {
              const existing = allVenues.get(k);
              allVenues.set(k, existing ? mergeVenueData(existing, v) : v);
            });
            maxTotalElements += result.totalCount ?? parsed.events.length;
          }).catch(() => { /* EB failed silently */ })
        );
      }

      // Jambase — use performer ID when available for more precise results
      if (isJambaseConfigured) {
        // Check if we have a Jambase performer ID for the requested artist
        const cachedArtist = opts.artistId ? cacheGet<ArtistData>(`artist:${opts.artistId}`, true) : null;
        const jbPerformerId = cachedArtist?.externalIds?.jambaseId
          // Also extract from the ID itself if it's a jb-artist ID
          ?? (opts.artistId?.startsWith('jb-artist-') ? opts.artistId.slice(10) : undefined);

        let jbPromise;
        if (jbPerformerId) {
          // Precise performer lookup
          jbPromise = getJambaseEventsByPerformer(jbPerformerId);
        } else if (opts.artistId) {
          // Artist filter is set but no Jambase performer ID — skip Jambase
          // to avoid returning unrelated events from a broad geo search
          jbPromise = null;
        } else if (opts.venueId?.startsWith('jb-venue-')) {
          // Jambase venue — use precise venue ID lookup
          const jbVenueId = opts.venueId.slice(9); // strip "jb-venue-"
          jbPromise = getJambaseEventsByVenue(jbVenueId);
        } else if (opts.venueId) {
          // TM venue — skip Jambase (TM handles it)
          jbPromise = null;
        } else {
          // General discovery search
          jbPromise = searchJambaseEvents({
            geoLatitude: lat,
            geoLongitude: lng,
            geoRadiusAmount: radius,
            geoRadiusUnits: 'mi',
            perPage: opts.pageSize ?? 20,
            eventType: 'concert',
            eventDateFrom: startDateTime.split('T')[0],
            eventDateTo: endDateTime.split('T')[0],
            artistName: opts.keyword,
          });
        }

        if (jbPromise) {
          promises.push(
            jbPromise.then((result) => {
              const parsed = parseJbEvents(result.events);
              allEvents.push(...parsed.events);
              parsed.artists.forEach((v, k) => {
                const existing = allArtists.get(k);
                allArtists.set(k, existing ? mergeArtistData(existing, v) : v);
              });
              parsed.venues.forEach((v, k) => {
                const existing = allVenues.get(k);
                allVenues.set(k, existing ? mergeVenueData(existing, v) : v);
              });
              maxTotalElements += result.totalItems ?? parsed.events.length;
            }).catch(() => { /* JB failed silently */ })
          );
        }
      }

      await Promise.all(promises);

      // Track image URLs across all artists to detect shared placeholders
      // (e.g. Bandsintown's default mic photo used for every artist without a real image)
      resetImageTracker();
      allArtists.forEach((a) => trackImageUrl(a.images.primary));

      // Re-sanitize: any image URL now flagged as a shared duplicate gets cleared
      allArtists.forEach((a, k) => {
        if (isDuplicateImage(a.images.primary)) {
          allArtists.set(k, {
            ...a,
            images: { ...a.images, primary: '' },
          });
        }
      });

      // Deduplicate across sources and sort by date
      const deduped = dedupeEvents(allEvents, allArtists, allVenues);
      deduped.sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());

      if (append) {
        setEvents((prev) => {
          const merged = [...prev, ...deduped];
          const allA = new Map(allArtists);
          const allV = new Map(allVenues);
          return dedupeEvents(merged, allA, allV).sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());
        });
        setArtists((prev) => {
          const next = new Map(prev);
          allArtists.forEach((v, k) => next.set(k, v));
          return next;
        });
        setVenues((prev) => {
          const next = new Map(prev);
          allVenues.forEach((v, k) => next.set(k, v));
          return next;
        });
      } else {
        setEvents(deduped);
        setArtists(allArtists);
        setVenues(allVenues);
      }

      setTotalPages(Math.max(maxTotalPages, 1));
      setCurrentPage(page);
      setTotalResults(maxTotalElements);

      // Cache individual artists and venues so detail pages can find them
      allArtists.forEach((a, k) => cacheSet(`artist:${k}`, a, CacheTTL.ARTIST, true));
      allVenues.forEach((v, k) => cacheSet(`venue:${k}`, v, CacheTTL.VENUE, true));

      // Cache first page
      if (page === 0) {
        cacheSet(cacheKey, {
          events: deduped,
          artists: Array.from(allArtists.entries()),
          venues: Array.from(allVenues.entries()),
          totalPages: Math.max(maxTotalPages, 1),
          totalElements: maxTotalElements,
        }, CacheTTL.EVENTS);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger fetch when location or filter options change
  const genre = options.genre;
  const keyword = options.keyword;
  const artistId = options.artistId;
  const venueId = options.venueId;
  const lat = userLocation.lat;
  const lng = userLocation.lng;
  const radiusMiles = userLocation.radiusMiles;

  useEffect(() => {
    fetchEvents(0, false);
  }, [fetchEvents, genre, keyword, artistId, venueId, lat, lng, radiusMiles]);

  const loadMore = useCallback(() => {
    if (currentPage < totalPages - 1) {
      fetchEvents(currentPage + 1, true);
    }
  }, [fetchEvents, currentPage, totalPages]);

  const refresh = useCallback(() => {
    fetchEvents(0, false);
  }, [fetchEvents]);

  // Background image enrichment — fetches real images for artists with placeholders
  const handleImageFound = useCallback((results: { artistId: string; imageUrl: string }[]) => {
    setArtists((prev) => {
      const next = new Map(prev);
      for (const { artistId: aid, imageUrl } of results) {
        const existing = next.get(aid);
        if (existing) {
          next.set(aid, {
            ...existing,
            images: { ...existing.images, primary: imageUrl },
          });
          // Update individual artist cache too
          cacheSet(`artist:${aid}`, { ...existing, images: { ...existing.images, primary: imageUrl } }, CacheTTL.ARTIST, true);
        }
      }
      return next;
    });
  }, []);

  useImageEnrichment(artists, handleImageFound, !isLoading);

  return {
    events,
    artists,
    venues,
    isLoading,
    error,
    hasMore: currentPage < totalPages - 1,
    loadMore,
    refresh,
    totalResults,
  };
}
