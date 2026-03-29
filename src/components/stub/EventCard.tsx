import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Clock, ExternalLink, Users } from 'lucide-react';
import { Badge } from '@/components/ui';
import { StubItButton } from '@/components/ui/StubItButton';
import { getArtistDisplayImage } from '@/utils/artistImage';
import { isTicketPurchaseUrl } from '@/utils/ticketUrl';
import type { EventData, ArtistData, VenueData } from '@/types';

/** Map genre keywords to accent colors for visual variety */
function getGenreAccent(genres?: string[]): { border: string; glow: string; badge: string; text: string; bg: string } {
  if (!genres || genres.length === 0) return ACCENT_MAP.default;
  const g = genres[0].toLowerCase();
  if (g.includes('rock') || g.includes('metal') || g.includes('punk') || g.includes('alternative')) return ACCENT_MAP.rock;
  if (g.includes('jazz') || g.includes('blues') || g.includes('soul')) return ACCENT_MAP.jazz;
  if (g.includes('electronic') || g.includes('dance') || g.includes('edm') || g.includes('house')) return ACCENT_MAP.electronic;
  if (g.includes('hip') || g.includes('rap') || g.includes('r&b')) return ACCENT_MAP.hiphop;
  if (g.includes('country') || g.includes('folk') || g.includes('americana')) return ACCENT_MAP.folk;
  if (g.includes('pop')) return ACCENT_MAP.pop;
  if (g.includes('classical') || g.includes('orchestr')) return ACCENT_MAP.classical;
  return ACCENT_MAP.default;
}

const ACCENT_MAP = {
  rock:       { border: 'border-stub-orange/30', glow: 'hover:border-stub-orange/50', badge: 'bg-stub-orange/15 text-stub-orange', text: 'text-stub-orange', bg: 'from-stub-orange/5 to-transparent' },
  jazz:       { border: 'border-stub-cyan/30', glow: 'hover:border-stub-cyan/50', badge: 'bg-stub-cyan/15 text-stub-cyan', text: 'text-stub-cyan', bg: 'from-stub-cyan/5 to-transparent' },
  electronic: { border: 'border-stub-violet/30', glow: 'hover:border-stub-violet/50', badge: 'bg-stub-violet/15 text-stub-violet', text: 'text-stub-violet', bg: 'from-stub-violet/5 to-transparent' },
  hiphop:     { border: 'border-stub-amber/30', glow: 'hover:border-stub-amber/50', badge: 'bg-stub-amber/15 text-stub-amber', text: 'text-stub-amber', bg: 'from-stub-amber/5 to-transparent' },
  folk:       { border: 'border-stub-green/30', glow: 'hover:border-stub-green/50', badge: 'bg-stub-green/15 text-stub-green', text: 'text-stub-green', bg: 'from-stub-green/5 to-transparent' },
  pop:        { border: 'border-stub-violet/30', glow: 'hover:border-stub-violet/50', badge: 'bg-stub-violet/15 text-stub-violet', text: 'text-stub-violet', bg: 'from-stub-violet/5 to-transparent' },
  classical:  { border: 'border-stub-cyan/30', glow: 'hover:border-stub-cyan/50', badge: 'bg-stub-cyan/15 text-stub-cyan', text: 'text-stub-cyan', bg: 'from-stub-cyan/5 to-transparent' },
  default:    { border: 'border-stub-border', glow: 'hover:border-stub-border-light', badge: 'bg-stub-muted/15 text-stub-muted', text: 'text-stub-amber', bg: 'from-transparent to-transparent' },
};

interface EventCardProps {
  artistName: string;
  artistImage?: string;
  /** Names of supporting acts (shown as "w/ Act1, Act2" below headliner) */
  supportActs?: string[];
  venueName: string;
  venueNeighborhood?: string;
  date: Date;
  doorsTime?: Date;
  priceMin?: number;
  priceMax?: number;
  matchScore?: number;
  ticketUrl?: string;
  isTonight?: boolean;
  attendeeCount?: number;
  genres?: string[];
  /** Venue photo URL (e.g. from Google Places) — used as fallback before genre images */
  venueImage?: string;
  eventId?: string;
  /** Artist ID for linking to the artist page */
  artistId?: string;
  /** Venue ID for linking to the venue page */
  venueId?: string;
  /** Event data source — used to filter Jambase ticket URLs */
  source?: string;
  /** Full event/artist/venue objects for passing via router state to EventPage */
  event?: EventData;
  artist?: ArtistData;
  venue?: VenueData;
  /** @deprecated Use the built-in event page navigation instead */
  onClick?: () => void;
}

export function EventCard({
  artistName,
  artistImage,
  supportActs,
  venueName,
  venueNeighborhood,
  date,
  doorsTime,
  priceMin,
  priceMax,
  matchScore,
  ticketUrl,
  isTonight,
  attendeeCount,
  genres,
  venueImage,
  eventId,
  artistId,
  venueId,
  source,
  event,
  artist,
  venue,
  onClick,
}: EventCardProps): React.JSX.Element {
  const navigate = useNavigate();
  const accent = getGenreAccent(genres);
  const displayImage = getArtistDisplayImage(artistImage, genres, artistName, venueImage);

  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const timeStr = doorsTime
    ? doorsTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;

  const hasTicketUrl = isTicketPurchaseUrl(ticketUrl, source);

  function handleCardClick(): void {
    // If eventId is available, navigate to the event page
    if (eventId) {
      navigate(`/event/${eventId}`, {
        state: { event, artist, venue, supportActNames: supportActs },
      });
    } else if (onClick) {
      // Fallback to legacy onClick
      onClick();
    }
  }

  function handleArtistClick(e: React.MouseEvent): void {
    e.stopPropagation();
    if (artistId) {
      navigate(`/artist/${artistId}`);
    }
  }

  function handleVenueClick(e: React.MouseEvent): void {
    e.stopPropagation();
    if (venueId) {
      navigate(`/venue/${venueId}`);
    }
  }

  function handleStubIt(): void {
    const params = new URLSearchParams();
    if (eventId) params.set('eventId', eventId);
    params.set('artist', artistName);
    params.set('venue', venueName);
    params.set('date', date.toISOString());
    if (artistImage) params.set('artistImage', artistImage);
    navigate(`/create?${params.toString()}`);
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleCardClick}
      className={`bg-gradient-to-r ${accent.bg} bg-stub-surface rounded-xl ${accent.border} overflow-hidden cursor-pointer
        ${accent.glow} transition-all duration-300 paper-grain group`}
    >
      <div className="flex">
        {/* Artist image */}
        <div className="w-28 sm:w-36 relative shrink-0">
          <img
            src={displayImage.url}
            alt={artistName}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-stub-surface/60" />

          {/* Match score */}
          {matchScore !== undefined && matchScore > 0 && (
            <div className="absolute top-2 left-2 bg-stub-bg/80 backdrop-blur-sm rounded-full px-2 py-0.5">
              <span className="text-[11px] font-mono font-bold text-stub-cyan">{matchScore}%</span>
            </div>
          )}
        </div>

        {/* Event info */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                {isTonight && <Badge variant="coral" className="mb-1.5">TONIGHT</Badge>}
                <h3
                  className={`font-display font-bold text-stub-text text-base leading-tight ${artistId ? 'hover:text-stub-amber transition-colors' : ''}`}
                  onClick={artistId ? handleArtistClick : undefined}
                  role={artistId ? 'link' : undefined}
                >
                  {artistName}
                </h3>
                {supportActs && supportActs.length > 0 && (
                  <p className="text-[11px] text-stub-muted mt-0.5 truncate">
                    w/ {supportActs.slice(0, 3).join(', ')}
                    {supportActs.length > 3 ? ` +${supportActs.length - 3} more` : ''}
                  </p>
                )}
              </div>
            </div>

            <div
              className={`flex items-center gap-1 mt-1 text-stub-muted text-xs ${venueId ? 'hover:text-stub-text cursor-pointer transition-colors' : ''}`}
              onClick={venueId ? handleVenueClick : undefined}
              role={venueId ? 'link' : undefined}
            >
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{venueName}{venueNeighborhood ? ` · ${venueNeighborhood}` : ''}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3 text-xs text-stub-muted">
              <span className="flex items-center gap-1 font-mono">
                <Calendar className="w-3 h-3" />
                {dateStr}
              </span>
              {timeStr && (
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  {timeStr}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {attendeeCount !== undefined && attendeeCount > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-stub-muted">
                  <Users className="w-3 h-3" />
                  {attendeeCount}
                </span>
              )}
            </div>
          </div>

          {/* Genres + Actions row */}
          <div className="flex items-center justify-between mt-2">
            {genres && genres.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {genres.slice(0, 3).map((g) => (
                  <span key={g} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-stub-orange/15 text-stub-orange">
                    {g}
                  </span>
                ))}
              </div>
            ) : <div />}
            <div className="flex items-center gap-2 shrink-0">
              {hasTicketUrl && ticketUrl && (
                <a
                  href={ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-stub-amber hover:text-stub-amber-dim transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Tickets
                </a>
              )}
              <StubItButton onClick={handleStubIt} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
