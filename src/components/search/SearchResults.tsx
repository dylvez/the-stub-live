import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, MapPin, Music, Loader2, ExternalLink, Ticket, PenTool,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import type { ArtistData, VenueData, EventData } from '@/types';

type ResultCategory = 'events' | 'artists' | 'venues';

interface SearchResultsProps {
  artists: ArtistData[];
  venues: VenueData[];
  events: EventData[];
  /** Map of artist IDs to ArtistData — used to resolve names/images on event rows */
  eventArtists?: Map<string, ArtistData>;
  /** Map of venue IDs to VenueData — used to resolve venue names on event rows */
  eventVenues?: Map<string, VenueData>;
  isSearching: boolean;
  query: string;
  /** Which category is active (default: events) */
  activeCategory?: ResultCategory;
  onCategoryChange?: (cat: ResultCategory) => void;
  onArtistClick?: (artist: ArtistData) => void;
  onVenueClick?: (venue: VenueData) => void;
  onEventClick?: (event: EventData, artist?: ArtistData, venue?: VenueData) => void;
  /** Max results per category */
  limit?: number;
  /** Whether this is inside the Create Stub page (compact mode — hides Stub It buttons) */
  compact?: boolean;
  /** Empty state message override */
  emptyMessage?: string;
}

const CATEGORIES: { key: ResultCategory; label: string; icon: typeof Music }[] = [
  { key: 'events', label: 'Events', icon: Ticket },
  { key: 'artists', label: 'Artists', icon: Music },
  { key: 'venues', label: 'Venues', icon: MapPin },
];

/** Build a /create URL pre-populated with event data */
function buildStubUrl(event: EventData, artist?: ArtistData, venue?: VenueData): string {
  const params = new URLSearchParams();
  params.set('eventId', event.id);
  if (artist) params.set('artist', artist.name);
  if (venue) params.set('venue', venue.name);
  params.set('date', event.date.toDate().toISOString());
  if (artist?.images.primary) params.set('artistImage', artist.images.primary);
  return `/create?${params.toString()}`;
}

export function SearchResults({
  artists,
  venues,
  events,
  eventArtists = new Map(),
  eventVenues = new Map(),
  isSearching,
  query,
  activeCategory = 'events',
  onCategoryChange,
  onArtistClick,
  onVenueClick,
  onEventClick,
  limit = 20,
  compact = false,
  emptyMessage,
}: SearchResultsProps): React.JSX.Element {
  const navigate = useNavigate();

  const counts = {
    events: events.length,
    artists: artists.length,
    venues: venues.length,
  };

  const hasResults = counts.events + counts.artists + counts.venues > 0;

  return (
    <div>
      {/* Category tabs */}
      {(hasResults || isSearching) && (
        <div className="flex gap-1 mb-3">
          {CATEGORIES.map(({ key, label, icon: Icon }) => {
            const isActive = activeCategory === key;
            const count = counts[key];
            return (
              <button
                key={key}
                onClick={() => onCategoryChange?.(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                  ${isActive
                    ? 'bg-stub-amber text-stub-bg'
                    : 'bg-stub-surface text-stub-muted border border-stub-border hover:border-stub-amber/50 hover:text-stub-text'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {count > 0 && (
                  <span className={`ml-0.5 text-[10px] ${isActive ? 'text-stub-bg/70' : 'text-stub-muted'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {isSearching && (
        <div className="flex items-center justify-center gap-2 py-6 text-stub-muted text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Searching...
        </div>
      )}

      {/* Results */}
      {!isSearching && hasResults && (
        <div className={`space-y-2 ${compact ? 'max-h-80 overflow-y-auto' : ''}`}>
          {/* Events */}
          {activeCategory === 'events' && events.slice(0, limit).map((event) => {
            const artist = eventArtists.get(event.artistIds[0]);
            const venue = eventVenues.get(event.venueId);
            const supportActs = event.artistIds.slice(1).map((id) => eventArtists.get(id)?.name).filter(Boolean) as string[];
            const eventDate = event.date.toDate();
            const isPast = eventDate < new Date();

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 bg-stub-surface rounded-xl border border-stub-border
                  hover:border-stub-amber/50 transition-colors"
              >
                <button
                  onClick={() => onEventClick?.(event, artist, venue)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-stub-border">
                    {artist?.images.primary ? (
                      <img src={artist.images.primary} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-stub-amber/20 to-stub-coral/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-stub-amber/40">
                          {(artist?.name ?? '?').charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-stub-text truncate">
                      {artist?.name ?? 'Unknown Artist'}
                    </div>
                    {supportActs.length > 0 && (
                      <div className="text-[10px] text-stub-muted/70 truncate">
                        w/ {supportActs.slice(0, 2).join(', ')}{supportActs.length > 2 ? ` +${supportActs.length - 2}` : ''}
                      </div>
                    )}
                    <div className="text-xs text-stub-muted truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {venue?.name ?? 'Unknown Venue'}{venue?.city ? `, ${venue.city}` : ''}
                    </div>
                  </div>
                </button>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <div className="text-xs font-mono text-stub-muted">
                    {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: eventDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isPast && <Badge variant="muted" className="text-[9px]">Past</Badge>}
                    {event.source === 'setlistfm' && <Badge variant="cyan" className="text-[9px]">setlist.fm</Badge>}
                    {event.source === 'bandsintown' && <Badge variant="amber" className="text-[9px]">bandsintown</Badge>}
                    {event.ticketUrl && !isPast && (
                      <a
                        href={event.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-0.5 text-[10px] text-stub-amber hover:underline"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        Tickets
                      </a>
                    )}
                    {!compact && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(buildStubUrl(event, artist, venue));
                        }}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium
                          bg-stub-amber/10 text-stub-amber hover:bg-stub-amber/20 transition-colors"
                        title="Create a Stub for this show"
                      >
                        <PenTool className="w-2.5 h-2.5" />
                        Stub It
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Artists */}
          {activeCategory === 'artists' && artists.slice(0, limit).map((artist) => (
            <motion.button
              key={artist.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onArtistClick?.(artist)}
              className="w-full text-left flex items-center gap-3 p-3 bg-stub-surface rounded-xl border border-stub-border
                hover:border-stub-amber/50 transition-colors"
            >
              <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0">
                {artist.images.primary ? (
                  <img src={artist.images.primary} alt={artist.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-stub-amber/20 to-stub-coral/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-stub-amber/40">{artist.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-sm text-stub-text truncate">{artist.name}</div>
                {artist.genres.length > 0 && (
                  <div className="flex gap-1 mt-0.5 flex-wrap">
                    {artist.genres.slice(0, 3).map((g) => (
                      <Badge key={g} variant="muted" className="text-[10px]">{g}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </motion.button>
          ))}

          {/* Venues */}
          {activeCategory === 'venues' && venues.slice(0, limit).map((venue) => (
            <motion.button
              key={venue.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onVenueClick?.(venue)}
              className="w-full text-left flex items-center gap-3 p-3 bg-stub-surface rounded-xl border border-stub-border
                hover:border-stub-amber/50 transition-colors"
            >
              <div className="w-11 h-11 rounded-lg bg-stub-border flex items-center justify-center text-stub-muted">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-sm text-stub-text truncate">{venue.name}</div>
                <div className="text-xs text-stub-muted">
                  {venue.city}{venue.state ? `, ${venue.state}` : ''}
                  {venue.venueType ? ` · ${venue.venueType}` : ''}
                </div>
              </div>
              {venue.capacity && (
                <div className="text-xs font-mono text-stub-muted shrink-0">
                  {venue.capacity.toLocaleString()} cap
                </div>
              )}
            </motion.button>
          ))}

          {/* Empty category */}
          {activeCategory === 'events' && counts.events === 0 && (
            <EmptyCategoryMessage category="events" query={query} />
          )}
          {activeCategory === 'artists' && counts.artists === 0 && (
            <EmptyCategoryMessage category="artists" query={query} />
          )}
          {activeCategory === 'venues' && counts.venues === 0 && (
            <EmptyCategoryMessage category="venues" query={query} />
          )}
        </div>
      )}

      {/* No results at all */}
      {!isSearching && !hasResults && query.length >= 2 && (
        <div className="text-center py-8 text-stub-muted text-sm">
          <Search className="w-6 h-6 mx-auto mb-2 text-stub-border-light" />
          <p>{emptyMessage ?? `No results for \u201c${query}\u201d`}</p>
        </div>
      )}
    </div>
  );
}

function EmptyCategoryMessage({ category, query }: { category: string; query: string }): React.JSX.Element {
  return (
    <div className="text-center py-6 text-stub-muted text-sm">
      <p>No {category} found for &ldquo;{query}&rdquo;</p>
      <p className="text-xs mt-1">Try a different search term</p>
    </div>
  );
}
