import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Map as MapIcon, ChevronRight, Filter, TrendingUp, Compass, Radio, Sparkles } from 'lucide-react';
import { Input, Card, SectionHeader, HorizontalScroll, FilterChip } from '@/components/ui';
import { SearchResults } from '@/components/search';
import { useSearch } from '@/hooks/useSearch';
import { useEvents } from '@/hooks/useEvents';
import { useLocation } from '@/contexts/LocationContext';
import { isGoogleMapsConfigured } from '@/services/api/config';
import type { ArtistData, EventData } from '@/types';

type ResultCategory = 'events' | 'artists' | 'venues';
type DateFilter = 'all' | 'today' | 'this-week' | 'this-month';

const GENRE_FILTERS = ['All', 'Rock', 'Punk', 'Metal', 'Jazz', 'Folk', 'Electronic', 'Hip-Hop', 'R&B', 'Country'] as const;

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'all', label: 'Any Date' },
  { key: 'today', label: 'Today' },
  { key: 'this-week', label: 'This Week' },
  { key: 'this-month', label: 'This Month' },
];

export function SearchPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ResultCategory>('events');

  // Pre-populate from URL param (e.g. /search?q=ArtistName)
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !query) {
      setQuery(q);
      setActiveCategory('artists');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [activeDiscover, setActiveDiscover] = useState<'none' | 'radar' | 'newToTown'>('none');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [genreFilter, setGenreFilter] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);

  const { location: userLocation } = useLocation();
  const { artists, venues, events, eventArtists, eventVenues, isSearching } = useSearch(query);
  const { events: allEvents, artists: allArtists } = useEvents({ pageSize: 50 });
  // Legacy alias for trending section
  const trendingArtists = allArtists;

  // Apply date and genre filters to search results
  const filteredEvents = useMemo(() => {
    let filtered: EventData[] = events;

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter((e) => {
        const eventDate = e.date.toDate();
        if (dateFilter === 'today') {
          return eventDate.toDateString() === now.toDateString();
        }
        if (dateFilter === 'this-week') {
          const weekEnd = new Date(today.getTime() + 7 * 86400000);
          return eventDate >= today && eventDate <= weekEnd;
        }
        if (dateFilter === 'this-month') {
          return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // Genre filter — match against artist genres
    if (genreFilter !== 'All') {
      const lower = genreFilter.toLowerCase();
      filtered = filtered.filter((e) => {
        const artist = eventArtists.get(e.artistIds[0]);
        return artist?.genres.some((g) => g.toLowerCase().includes(lower));
      });
    }

    return filtered;
  }, [events, dateFilter, genreFilter, eventArtists]);

  // Helper: find the next upcoming event date for an artist
  function getNextEventDate(artistId: string): Date | null {
    const now = new Date();
    const upcoming = allEvents
      .filter((e) => e.artistIds.includes(artistId) && e.date.toDate() >= now)
      .sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());
    return upcoming.length > 0 ? upcoming[0].date.toDate() : null;
  }

  function formatShortDate(d: Date): string {
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Tonight';
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // Under the Radar: lesser-known artists with upcoming shows
  const radarArtists = useMemo(() => {
    const results: (ArtistData & { eventCount: number; nextDate: Date | null })[] = [];
    const seen = new Set<string>();
    for (const [id, artist] of allArtists) {
      if (seen.has(id)) continue;
      // Show all artists as potential "Under the Radar" discoveries
      {
        const eventCount = allEvents.filter((e) => e.artistIds.includes(id)).length;
        if (eventCount > 0) {
          results.push({ ...artist, eventCount, nextDate: getNextEventDate(id) });
          seen.add(id);
        }
      }
    }
    return results.sort((a, b) => b.eventCount - a.eventCount).slice(0, 12);
  }, [allArtists, allEvents]);

  // New to Town: artists with only 1 event in the area
  const newToTownArtists = useMemo(() => {
    const artistEventCounts = new Map<string, number>();
    for (const e of allEvents) {
      for (const aid of e.artistIds) {
        artistEventCounts.set(aid, (artistEventCounts.get(aid) ?? 0) + 1);
      }
    }
    const results: (ArtistData & { eventCount: number; nextDate: Date | null })[] = [];
    for (const [id, count] of artistEventCounts) {
      if (count === 1) {
        const artist = allArtists.get(id);
        if (artist) results.push({ ...artist, eventCount: 1, nextDate: getNextEventDate(id) });
      }
    }
    return results.slice(0, 12);
  }, [allArtists, allEvents]);

  return (
    <div className="px-4 py-4">
      <Input
        icon="search"
        placeholder="Search artists, venues, events..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery('')}
        className="mb-3"
      />

      {/* Filters — always visible */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-xs text-stub-muted hover:text-stub-text transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {(dateFilter !== 'all' || genreFilter !== 'All') && (
              <span className="w-1.5 h-1.5 bg-stub-amber rounded-full" />
            )}
          </button>
          {(dateFilter !== 'all' || genreFilter !== 'All') && (
            <button
              onClick={() => { setDateFilter('all'); setGenreFilter('All'); }}
              className="text-[10px] text-stub-amber hover:text-stub-text transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {showFilters && (
          <div className="space-y-2 mb-3 p-3 bg-stub-surface rounded-lg border border-stub-border">
            {/* Date filter */}
            <div>
              <span className="text-[10px] text-stub-muted uppercase tracking-wider">Date</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {DATE_FILTERS.map(({ key, label }) => (
                  <FilterChip
                    key={key}
                    label={label}
                    isActive={dateFilter === key}
                    onClick={() => setDateFilter(key)}
                    activeColor="amber"
                  />
                ))}
              </div>
            </div>

            {/* Genre filter */}
            <div>
              <span className="text-[10px] text-stub-muted uppercase tracking-wider">Genre</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {GENRE_FILTERS.map((genre) => (
                  <FilterChip
                    key={genre}
                    label={genre}
                    isActive={genreFilter === genre}
                    onClick={() => setGenreFilter(genre)}
                    activeColor="amber"
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {query.length < 2 ? (
        <>
          {/* Browse sections */}
          <section className="mb-6">
            <SectionHeader
              icon={<TrendingUp className="w-5 h-5 text-stub-amber" />}
              title={`Trending in ${userLocation.city}`}
            />
            <div className="grid grid-cols-2 gap-2">
              {Array.from(trendingArtists.values()).slice(0, 4).map((artist) => (
                <Card
                  key={artist.id}
                  hover
                  padding={false}
                  onClick={() => navigate(`/artist/${artist.id}`)}
                  className="overflow-hidden"
                >
                  <div className="h-24 relative">
                    {artist.images.primary ? (
                      <img src={artist.images.primary} alt={artist.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-stub-amber/20 to-stub-coral/20" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-stub-surface to-transparent" />
                    <span className="absolute bottom-2 left-2 font-display font-bold text-xs text-stub-text drop-shadow">
                      {artist.name}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <SectionHeader
              icon={<Compass className="w-5 h-5 text-stub-cyan" />}
              title="Discover"
            />
            <div className="space-y-2">
              {/* Under the Radar */}
              <Card
                hover
                onClick={() => setActiveDiscover(activeDiscover === 'radar' ? 'none' : 'radar')}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-stub-cyan/10 flex items-center justify-center text-stub-cyan">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-stub-text">Under the Radar</div>
                    <div className="text-xs text-stub-muted">Low-profile artists with upcoming shows</div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-stub-muted transition-transform ${activeDiscover === 'radar' ? 'rotate-90' : ''}`} />
                </div>
              </Card>
              {activeDiscover === 'radar' && (
                <HorizontalScroll>
                  {radarArtists.length > 0 ? radarArtists.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => navigate(`/artist/${a.id}`)}
                      className="flex-shrink-0 w-32 bg-stub-surface border border-stub-border rounded-lg p-3 cursor-pointer hover:border-stub-amber/30 transition-colors"
                    >
                      <div className="w-full h-20 rounded-lg overflow-hidden bg-stub-border mb-2">
                        {a.images.primary ? (
                          <img src={a.images.primary} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-stub-cyan/20 to-stub-amber/20 flex items-center justify-center">
                            <span className="text-lg font-bold text-stub-cyan/40">{a.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-stub-text truncate">{a.name}</div>
                      {a.genres.length > 0 && (
                        <div className="text-[10px] text-stub-muted truncate mt-0.5">{a.genres[0]}</div>
                      )}
                      <div className="text-[10px] text-stub-cyan mt-1">
                        {a.nextDate ? formatShortDate(a.nextDate) : `${a.eventCount} show${a.eventCount !== 1 ? 's' : ''}`}
                      </div>
                    </div>
                  )) : (
                    <div className="text-xs text-stub-muted py-2">No under-the-radar artists found nearby.</div>
                  )}
                </HorizontalScroll>
              )}

              {/* New to Town */}
              <Card
                hover
                onClick={() => setActiveDiscover(activeDiscover === 'newToTown' ? 'none' : 'newToTown')}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-stub-cyan/10 flex items-center justify-center text-stub-cyan">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-stub-text">New to Town</div>
                    <div className="text-xs text-stub-muted">Playing here for the first time</div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-stub-muted transition-transform ${activeDiscover === 'newToTown' ? 'rotate-90' : ''}`} />
                </div>
              </Card>
              {activeDiscover === 'newToTown' && (
                <HorizontalScroll>
                  {newToTownArtists.length > 0 ? newToTownArtists.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => navigate(`/artist/${a.id}`)}
                      className="flex-shrink-0 w-32 bg-stub-surface border border-stub-border rounded-lg p-3 cursor-pointer hover:border-stub-amber/30 transition-colors"
                    >
                      <div className="w-full h-20 rounded-lg overflow-hidden bg-stub-border mb-2">
                        {a.images.primary ? (
                          <img src={a.images.primary} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-stub-amber/20 to-stub-coral/20 flex items-center justify-center">
                            <span className="text-lg font-bold text-stub-amber/40">{a.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-stub-text truncate">{a.name}</div>
                      {a.genres.length > 0 && (
                        <div className="text-[10px] text-stub-muted truncate mt-0.5">{a.genres[0]}</div>
                      )}
                      <div className="text-[10px] text-stub-amber mt-1">
                        {a.nextDate ? formatShortDate(a.nextDate) : 'New to town'}
                      </div>
                    </div>
                  )) : (
                    <div className="text-xs text-stub-muted py-2">No first-time visitors found nearby.</div>
                  )}
                </HorizontalScroll>
              )}

              {/* Map View — only show when Google Maps is configured */}
              {isGoogleMapsConfigured && (
                <Card hover onClick={() => navigate('/?view=map')} className="cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-stub-cyan/10 flex items-center justify-center text-stub-cyan">
                      <MapIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-stub-text">Map View</div>
                      <div className="text-xs text-stub-muted">See shows near you on a map</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stub-muted" />
                  </div>
                </Card>
              )}
            </div>
          </section>
        </>
      ) : (
        <>
          <SearchResults
            artists={artists}
            venues={venues}
            events={filteredEvents}
            eventArtists={eventArtists}
            eventVenues={eventVenues}
            isSearching={isSearching}
            query={query}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            onArtistClick={(artist) => navigate(`/artist/${artist.id}`)}
            onVenueClick={(venue) => navigate(`/venue/${venue.id}`)}
            onEventClick={(event) => navigate(`/artist/${event.artistIds[0]}`)}
          />
        </>
      )}
    </div>
  );
}
