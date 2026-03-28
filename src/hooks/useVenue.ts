import { useState, useEffect } from 'react';
import { cacheGet, cacheSet, memGet, CacheTTL } from '@/services/api/cache';
import { isGoogleMapsConfigured } from '@/services/api/config';
import { enrichVenueWithPlaces } from '@/services/api/places';
import type { VenueData } from '@/types';

export interface UseVenueReturn {
  venue: VenueData | null;
  isLoading: boolean;
  error: string | null;
}

export function useVenue(id: string | undefined): UseVenueReturn {
  const [venue, setVenue] = useState<VenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const venueId = id;

    async function loadVenue(): Promise<void> {
      // 1. Check direct venue cache (memory + storage)
      const cached = cacheGet<VenueData>(`venue:${venueId}`, true);
      if (cached) {
        setVenue(cached);
        setIsLoading(false);
        return;
      }

      // 2. Check memory-only venue cache (written by useEvents/useSearch)
      const memCached = memGet<VenueData>(`venue:${venueId}`);
      if (memCached) {
        setVenue(memCached);
        setIsLoading(false);
        return;
      }

      // 3. Scan localStorage for venue in events/search caches
      let foundVenue: VenueData | null = null;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key?.startsWith('stub_cache_')) continue;
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const entry = JSON.parse(raw);
          const data = entry.data;
          if (!data) continue;

          for (const field of ['venues', 'eventVenuesArr']) {
            const arr = data[field] as unknown;
            if (Array.isArray(arr) && arr.length > 0 && Array.isArray(arr[0])) {
              const found = (arr as [string, VenueData][]).find(([k]) => k === venueId);
              if (found) {
                foundVenue = found[1];
                break;
              }
            }
          }
          if (foundVenue) break;
        }
      } catch { /* ignore */ }

      if (foundVenue) {
        setVenue(foundVenue);
        cacheSet(`venue:${venueId}`, foundVenue, CacheTTL.VENUE, true);
        setIsLoading(false);
        return;
      }

      // 4. For Jambase venue IDs, search Jambase events using user's geo and extract venue
      if (venueId.startsWith('jb-venue-')) {
        try {
          const { isJambaseConfigured } = await import('@/services/api/config');
          if (isJambaseConfigured) {
            const { searchJambaseEvents, parseJbEvents } = await import('@/services/api/jambase');
            // Load user location for geo search
            const { getStoredLocation } = await import('@/contexts/LocationContext');
            const loc = getStoredLocation();
            const result = await searchJambaseEvents({
              geoLatitude: loc.lat,
              geoLongitude: loc.lng,
              geoRadiusAmount: loc.radiusMiles,
              geoRadiusUnits: 'mi',
              perPage: 50, // larger page to increase chance of finding our venue
            });
            if (result.events.length > 0) {
              const parsed = parseJbEvents(result.events);
              foundVenue = parsed.venues.get(venueId) ?? null;
            }
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch venue');
        }
      }

      if (cancelled) return;
      if (foundVenue) {
        setVenue(foundVenue);
        cacheSet(`venue:${venueId}`, foundVenue, CacheTTL.VENUE, true);
      }
      setIsLoading(false);
    }

    loadVenue();
    return () => { cancelled = true; };
  }, [id]);

  // Places enrichment — runs after base venue loads
  useEffect(() => {
    if (!venue || !isGoogleMapsConfigured || venue.placesEnriched) return;
    let cancelled = false;

    enrichVenueWithPlaces(venue).then((enriched) => {
      if (!cancelled && enriched !== venue) {
        setVenue(enriched);
      }
    });

    return () => { cancelled = true; };
  }, [venue?.id, venue?.placesEnriched]);

  return { venue, isLoading, error };
}
