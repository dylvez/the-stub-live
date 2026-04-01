import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, MapPin, RefreshCw, AlertCircle, Map as MapIcon, List, Sparkles } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { EventCard } from '@/components/stub';
import { Button, SectionHeader, HorizontalScroll, FilterChip } from '@/components/ui';
import { BrandedSpinner } from '@/components/ui/BrandedSpinner';
import { useEvents } from '@/hooks/useEvents';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation as useAppLocation } from '@/contexts/LocationContext';
import { isGoogleMapsConfigured } from '@/services/api/config';
import { enrichVenueWithPlaces } from '@/services/api/places';
import type { VenueData } from '@/types';

// FeedPage removed — sharing is now via social platforms
const EventMap = lazy(() => import('@/components/map/EventMap').then((m) => ({ default: m.EventMap })));

import { GENRE_CANONICAL } from '@/utils/genres';

function EventSkeleton(): React.JSX.Element {
  return (
    <div className="bg-stub-surface rounded-xl border border-stub-border overflow-hidden animate-pulse">
      <div className="flex">
        <div className="w-28 sm:w-36 h-28 bg-stub-border" />
        <div className="flex-1 p-3 space-y-2">
          <div className="h-4 bg-stub-border rounded w-3/4" />
          <div className="h-3 bg-stub-border rounded w-1/2" />
          <div className="h-3 bg-stub-border rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

// Feed tab removed — social sharing is via external platforms

export function DiscoveryPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [activeGenre, setActiveGenre] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'map'>(
    searchParams.get('view') === 'map' ? 'map' : 'list'
  );
  const [carouselTab, setCarouselTab] = useState<'tonight' | 'venues'>('venues');
  const { location: userLocation } = useAppLocation();

  const { events, artists, venues, isLoading, error, hasMore, loadMore, refresh, totalResults } = useEvents({
    genre: activeGenre !== 'All' ? activeGenre : undefined,
  });

  const now = new Date();
  const tonightEvents = events.filter((e) => {
    const d = e.date.toDate();
    return d.toDateString() === now.toDateString() && d.getTime() > now.getTime();
  });

  const upcomingEvents = useMemo(() => {
    const future = events.filter((e) => e.date.toDate() > now);
    if (activeGenre === 'All') return future;
    const lower = activeGenre.toLowerCase();
    return future.filter((e) => {
      const artist = artists.get(e.artistIds[0]);
      if (!artist) return false;
      return artist.genres.some((g) => {
        const canonical = GENRE_CANONICAL[g.toLowerCase()];
        return canonical?.toLowerCase() === lower || g.toLowerCase().includes(lower);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, artists, activeGenre, now.toDateString()]);

  // Dynamic genre filters derived from artist data
  const genreFilters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [, artist] of artists) {
      for (const g of artist.genres) {
        const canonical = GENRE_CANONICAL[g.toLowerCase()] ?? null;
        if (canonical) {
          counts.set(canonical, (counts.get(canonical) ?? 0) + 1);
        }
      }
    }
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name]) => name);
    return ['All', ...sorted];
  }, [artists]);

  // Rank venues by number of upcoming shows
  const popularVenues = useMemo(() => {
    // Normalize venue names for dedup: lowercase, strip "the ", trim
    const normalizeName = (name: string): string =>
      name.toLowerCase().replace(/^the\s+/, '').replace(/['']/g, "'").trim();

    const counts = new Map<string, { venue: VenueData; showCount: number; isTm: boolean }>();
    for (const e of events) {
      if (e.date.toDate() <= now) continue;
      const v = venues.get(e.venueId);
      if (!v) continue;
      const key = normalizeName(v.name);
      const isTm = v.id.startsWith('tm-');
      const existing = counts.get(key);
      if (existing) {
        existing.showCount++;
        // Prefer TM venue data over Jambase
        if (isTm && !existing.isTm) {
          existing.venue = v;
          existing.isTm = true;
        }
      } else {
        counts.set(key, { venue: v, showCount: 1, isTm });
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.showCount - a.showCount)
      .slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length, venues.size]);

  // Enrich popular venues with Google Places photos
  // Keyed by normalized venue name so all ID variants (TM, Jambase, etc.) resolve to the same enriched data
  const [enrichedVenues, setEnrichedVenues] = useState<Map<string, VenueData>>(new Map());
  const normalizeVenueName = useCallback((name: string): string =>
    name.toLowerCase().replace(/^the\s+/, '').replace(/['']/g, "'").trim(), []);

  const enrichPopularVenues = useCallback(async (venueList: { venue: VenueData; showCount: number }[]) => {
    if (!isGoogleMapsConfigured) return;
    const toEnrich = venueList.filter((v) => !v.venue.placesEnriched && !enrichedVenues.has(normalizeVenueName(v.venue.name)));
    if (toEnrich.length === 0) return;

    // Enrich sequentially to avoid hammering the API
    for (const { venue: v } of toEnrich) {
      try {
        const enriched = await enrichVenueWithPlaces(v);
        if (enriched !== v) {
          setEnrichedVenues((prev) => new Map(prev).set(normalizeVenueName(v.name), enriched));
        }
      } catch { /* best effort */ }
    }
  }, [enrichedVenues, normalizeVenueName]);

  useEffect(() => {
    if (popularVenues.length > 0) {
      enrichPopularVenues(popularVenues);
    }
  }, [popularVenues.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recommended for You — score events based on user's taste profile from stubs
  const [tasteGenres, setTasteGenres] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'stubs'), where('userId', '==', user.uid));
    getDocs(q).then((snap) => {
      const genreCounts = new Map<string, number>();
      for (const d of snap.docs) {
        const data = d.data();
        const ids: string[] = data.artistIds ?? [];
        for (const aid of ids) {
          const a = artists.get(aid);
          if (a) {
            for (const g of a.genres) {
              genreCounts.set(g.toLowerCase(), (genreCounts.get(g.toLowerCase()) ?? 0) + 1);
            }
          }
        }
      }
      setTasteGenres(genreCounts);
    }).catch(() => {});
  }, [user, artists.size]); // eslint-disable-line react-hooks/exhaustive-deps

  const recommendedEvents = useMemo(() => {
    if (tasteGenres.size === 0) return [];
    const scored = events
      .filter((e) => e.date.toDate() > now)
      .map((e) => {
        const artist = artists.get(e.artistIds[0]);
        if (!artist) return { event: e, score: 0 };
        let score = 0;
        for (const g of artist.genres) {
          score += tasteGenres.get(g.toLowerCase()) ?? 0;
        }
        return { event: e, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    return scored;
  }, [events, artists, tasteGenres, now.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="px-4 py-4">
      {/* Shows content */}
      {<>


      {/* Map view */}
      {viewMode === 'map' && isGoogleMapsConfigured && (
        <Suspense fallback={<div className="flex items-center justify-center h-96"><BrandedSpinner size={32} /></div>}>
          <EventMap
            events={events}
            venues={venues}
            artists={artists}
            centerLat={userLocation.lat}
            centerLng={userLocation.lng}
          />
        </Suspense>
      )}

      {viewMode === 'list' && <>
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-stub-coral/10 border border-stub-coral/20 rounded-lg text-sm text-stub-coral">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={refresh} className="p-1 hover:bg-stub-coral/20 rounded">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tonight / Popular Venues tabbed carousel */}
      {(tonightEvents.length > 0 || popularVenues.length > 0) && (
        <section className="mb-6">
          {/* Tab strip */}
          <div className="flex items-center gap-1 mb-3">
            {popularVenues.length > 0 && (
              <button
                onClick={() => setCarouselTab('venues')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  carouselTab === 'venues'
                    ? 'bg-stub-cyan/15 text-stub-cyan border border-stub-cyan/30'
                    : 'text-stub-muted border border-stub-border hover:text-stub-text hover:border-stub-amber/30'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Popular Venues
              </button>
            )}
            {tonightEvents.length > 0 && (
              <button
                onClick={() => setCarouselTab('tonight')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  carouselTab === 'tonight'
                    ? 'bg-stub-coral/15 text-stub-coral border border-stub-coral/30'
                    : 'text-stub-muted border border-stub-border hover:text-stub-text hover:border-stub-amber/30'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Tonight
                <span className="text-[10px] opacity-70">{tonightEvents.length}</span>
              </button>
            )}
          </div>

          {/* Tonight carousel */}
          {carouselTab === 'tonight' && tonightEvents.length > 0 && (
            <HorizontalScroll>
              {tonightEvents.map((event) => {
                const artist = artists.get(event.artistIds[0]);
                const venue = venues.get(event.venueId);
                const supportActs = event.artistIds.slice(1).map((id) => artists.get(id)?.name).filter(Boolean) as string[];
                return (
                  <motion.div
                    key={event.id}
                    whileHover={{ y: -4 }}
                    className="min-w-[220px] max-w-[220px] bg-stub-surface rounded-xl border border-stub-border
                      overflow-hidden cursor-pointer group"
                    onClick={() => navigate(`/event/${event.id}`, { state: { event, artist, venue } })}
                  >
                    <div className="h-28 relative">
                      {artist?.images.primary ? (
                        <img
                          src={artist.images.primary}
                          alt={artist.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-stub-coral/15 to-stub-amber/15 flex items-center justify-center">
                          <Flame className="w-6 h-6 text-stub-coral/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-stub-surface via-transparent to-transparent" />
                      <div className="absolute top-2 left-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-stub-coral/80 text-white px-1.5 py-0.5 rounded">
                          Tonight
                        </span>
                      </div>
                      <div className="absolute bottom-1.5 left-2.5 right-2.5">
                        <h3 className="font-display font-bold text-stub-text text-xs drop-shadow-lg truncate">
                          {artist?.name ?? 'Unknown Artist'}
                        </h3>
                      </div>
                    </div>
                    <div className="px-2.5 py-2">
                      <div className="flex items-center gap-1 text-[10px] text-stub-muted truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {venue?.name ?? 'Unknown Venue'}
                      </div>
                      {supportActs.length > 0 && (
                        <p className="text-[9px] text-stub-muted/70 mt-0.5 truncate">w/ {supportActs.join(', ')}</p>
                      )}
                      {event.priceRange && (
                        <p className="text-[10px] font-mono text-stub-amber mt-0.5">
                          ${event.priceRange.min}{event.priceRange.max && event.priceRange.max !== event.priceRange.min ? `–$${event.priceRange.max}` : ''}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </HorizontalScroll>
          )}

          {/* Popular Venues carousel */}
          {carouselTab === 'venues' && popularVenues.length > 0 && (
            <HorizontalScroll>
              {popularVenues.map(({ venue: baseVenue, showCount }) => {
                const v = enrichedVenues.get(normalizeVenueName(baseVenue.name)) ?? baseVenue;
                return (
                  <motion.div
                    key={v.id}
                    whileHover={{ y: -4 }}
                    className="min-w-[200px] max-w-[200px] bg-stub-surface rounded-xl border border-stub-border
                      overflow-hidden cursor-pointer group"
                    onClick={() => navigate(`/venue/${v.id}`)}
                  >
                    <div className="h-24 relative">
                      {v.images.primary ? (
                        <img
                          src={v.images.primary}
                          alt={v.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-stub-cyan/15 to-stub-violet/15 flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-stub-cyan/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-stub-surface to-transparent" />
                      <div className="absolute bottom-1.5 left-2.5 right-2.5">
                        <h3 className="font-display font-bold text-stub-text text-xs drop-shadow-lg truncate">
                          {v.name}
                        </h3>
                      </div>
                    </div>
                    <div className="px-2.5 py-2 flex items-center justify-between">
                      <span className="text-[10px] text-stub-muted truncate">{v.city}{v.state ? `, ${v.state}` : ''}</span>
                      <span className="text-[10px] font-mono text-stub-cyan shrink-0">{showCount} shows</span>
                    </div>
                  </motion.div>
                );
              })}
            </HorizontalScroll>
          )}
        </section>
      )}

      {/* Recommended for You */}
      {recommendedEvents.length > 0 && (
        <section className="mb-6">
          <SectionHeader
            icon={<Sparkles className="w-5 h-5 text-stub-amber" />}
            title="Recommended for You"
          />
          <div className="space-y-2">
            {recommendedEvents.map(({ event }) => {
              const artist = artists.get(event.artistIds[0]);
              const venue = venues.get(event.venueId);
              const supportActs = event.artistIds.slice(1).map((aid) => artists.get(aid)?.name).filter(Boolean) as string[];
              return (
                <EventCard
                  key={event.id}
                  eventId={event.id}
                  artistName={artist?.name ?? 'Unknown Artist'}
                  artistImage={artist?.images.primary}
                  artistId={event.artistIds[0]}
                  venueId={event.venueId}
                  supportActs={supportActs.length > 0 ? supportActs : undefined}
                  venueName={venue?.name ?? 'Unknown Venue'}
                  venueNeighborhood={venue?.city}
                  date={event.date.toDate()}
                  doorsTime={event.doorsTime?.toDate()}
                  priceMin={event.priceRange?.min}
                  priceMax={event.priceRange?.max}
                  ticketUrl={event.ticketUrl}
                  source={event.source}
                  genres={artist?.genres}
                  event={event}
                  artist={artist}
                  venue={venue}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Genre filter bar */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4">
        {isGoogleMapsConfigured && (<>
          <div className="flex bg-stub-surface rounded-lg border border-stub-border overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${
                viewMode === 'list' ? 'bg-stub-amber/10 text-stub-amber' : 'text-stub-muted hover:text-stub-text'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${
                viewMode === 'map' ? 'bg-stub-amber/10 text-stub-amber' : 'text-stub-muted hover:text-stub-text'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Map
            </button>
          </div>
          <div className="w-px h-5 bg-stub-border shrink-0" />
        </>)}
        {genreFilters.map((genre) => (
          <FilterChip
            key={genre}
            label={genre}
            isActive={activeGenre === genre}
            onClick={() => setActiveGenre(genre)}
          />
        ))}
      </div>

      {/* Upcoming shows list */}
      <section>
        <SectionHeader
          title="Upcoming Shows"
          trailing={upcomingEvents.length > 0 ? (
            <span className="text-xs text-stub-muted font-mono">{upcomingEvents.length} events</span>
          ) : undefined}
        />
        <div className="space-y-3">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => <EventSkeleton key={i} />)}
            </>
          ) : (
            <>
              {upcomingEvents.map((event) => {
                const artist = artists.get(event.artistIds[0]);
                const baseVenue = venues.get(event.venueId);
                const venue = (baseVenue && enrichedVenues.get(normalizeVenueName(baseVenue.name))) ?? baseVenue;
                const supportActs = event.artistIds.slice(1).map((id) => artists.get(id)?.name).filter(Boolean) as string[];
                return (
                  <EventCard
                    key={event.id}
                    eventId={event.id}
                    artistName={artist?.name ?? 'Unknown Artist'}
                    artistImage={artist?.images.primary}
                    artistId={event.artistIds[0]}
                    venueId={event.venueId}
                    supportActs={supportActs.length > 0 ? supportActs : undefined}
                    venueName={venue?.name ?? 'Unknown Venue'}
                    venueNeighborhood={venue?.city}
                    venueImage={venue?.images?.primary || undefined}
                    date={event.date.toDate()}
                    doorsTime={event.doorsTime?.toDate()}
                    priceMin={event.priceRange?.min}
                    priceMax={event.priceRange?.max}
                    ticketUrl={event.ticketUrl}
                    source={event.source}
                    genres={artist?.genres}
                    event={event}
                    artist={artist}
                    venue={venue}
                  />
                );
              })}
              {hasMore && (
                <Button variant="secondary" onClick={loadMore} className="w-full mt-2">
                  Load More Shows
                </Button>
              )}
              {upcomingEvents.length === 0 && !isLoading && (
                <div className="text-center py-8 text-stub-muted text-sm">
                  No upcoming shows found for this filter.
                </div>
              )}
            </>
          )}
        </div>
      </section>

      </>}
      </>}
    </div>
  );
}
