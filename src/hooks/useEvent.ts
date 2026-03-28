import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { EventData, ArtistData, VenueData } from '@/types';

interface EventRouterState {
  event?: EventData;
  artist?: ArtistData;
  venue?: VenueData;
  supportActNames?: string[];
}

interface UseEventResult {
  event: EventData | null;
  artist: ArtistData | null;
  venue: VenueData | null;
  supportActNames: string[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Resolves a single event by ID.
 * Priority: router state (passed from EventCard) > localStorage cache scan > not found.
 */
export function useEvent(id: string | undefined): UseEventResult {
  const location = useLocation();
  const routerState = location.state as EventRouterState | null;

  const [event, setEvent] = useState<EventData | null>(null);
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [venue, setVenue] = useState<VenueData | null>(null);
  const [supportActNames, setSupportActNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('No event ID provided');
      setIsLoading(false);
      return;
    }

    // 1. Try router state (most common — user navigated from EventCard)
    if (routerState?.event && routerState.event.id === id) {
      setEvent(routerState.event);
      setArtist(routerState.artist ?? null);
      setVenue(routerState.venue ?? null);
      setSupportActNames(routerState.supportActNames ?? []);
      setIsLoading(false);
      return;
    }

    // 2. Scan localStorage caches for the event
    const found = scanCacheForEvent(id);
    if (found) {
      setEvent(found.event);
      setArtist(found.artist);
      setVenue(found.venue);
      setIsLoading(false);
      return;
    }

    // 3. Not found
    setError('Event not found. It may have expired from cache.');
    setIsLoading(false);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { event, artist, venue, supportActNames, isLoading, error };
}

const STORAGE_PREFIX = 'stub_cache_';

/** Scan all localStorage cache entries to find an event by ID. */
function scanCacheForEvent(eventId: string): EventRouterState | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(`${STORAGE_PREFIX}events-multi:`)) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const cached = JSON.parse(raw) as {
        data: {
          events: EventData[];
          artists: [string, ArtistData][];
          venues: [string, VenueData][];
        };
        timestamp: number;
        ttl: number;
      };

      // Check if entry is expired
      if (!cached?.data || Date.now() - cached.timestamp > cached.ttl) continue;

      const { events, artists, venues } = cached.data;
      const matchedEvent = events?.find((e: EventData) => e.id === eventId);
      if (matchedEvent) {
        const primaryArtistId = matchedEvent.artistIds?.[0];
        const artistMap = new Map(artists);
        const venueMap = new Map(venues);
        return {
          event: matchedEvent,
          artist: primaryArtistId ? artistMap.get(primaryArtistId) ?? null : null,
          venue: matchedEvent.venueId ? venueMap.get(matchedEvent.venueId) ?? null : null,
        };
      }
    }
  } catch {
    // localStorage parse errors are non-fatal
  }
  return null;
}
