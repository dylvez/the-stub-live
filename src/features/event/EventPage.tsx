import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ExternalLink, MapPin, Calendar, Clock, Globe,
  Ticket, Music, Lightbulb, Headphones,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { StubItButton } from '@/components/ui/StubItButton';
import { useEvent } from '@/hooks/useEvent';
import { useTicketLookup } from '@/hooks/useTicketLookup';
import { isTicketPurchaseUrl, getTicketSourceLinks } from '@/utils/ticketUrl';
import { generateEventBriefing } from '@/services/ai/briefings';
import { getArtistDisplayImage } from '@/utils/artistImage';
import type { AiEventBriefing } from '@/types';

/** Remove footnote references like [1], [2][3], [10] from AI-generated text */
function stripFootnotes(text: string): string {
  return text.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Safely convert a Firebase Timestamp (or its serialized form from router state)
 * to a JS Date. Router state serialization strips Timestamp methods, leaving
 * a plain { seconds, nanoseconds } object.
 */
function toDate(ts: unknown): Date {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  if (typeof ts === 'object' && ts !== null) {
    // Firebase Timestamp with toDate method
    if ('toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
      return (ts as { toDate: () => Date }).toDate();
    }
    // Serialized Timestamp from router state: { seconds: number, nanoseconds: number }
    if ('seconds' in ts && typeof (ts as { seconds: number }).seconds === 'number') {
      return new Date((ts as { seconds: number }).seconds * 1000);
    }
  }
  if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts);
  return new Date();
}

export function EventPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { event, artist, venue, supportActNames, isLoading, error } = useEvent(id);
  const [briefing, setBriefing] = useState<AiEventBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  // Trigger AI event briefing generation
  useEffect(() => {
    if (!event || !artist || !venue || briefing) return;

    setBriefingLoading(true);
    const eventDate = toDate(event.date);

    generateEventBriefing({
      artistName: artist.name,
      artistGenres: artist.genres,
      venueName: venue.name,
      venueCity: venue.city,
      venueState: venue.state,
      venueType: venue.venueType,
      eventDate: eventDate.toISOString().split('T')[0],
      artistBriefingSummary: artist.aiBriefing?.summary,
      artistLiveReputation: artist.aiBriefing?.liveReputation,
    }).then((result) => {
      if (result) setBriefing(result);
    }).catch(() => {}).finally(() => setBriefingLoading(false));
  }, [event?.id, artist?.name, venue?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stub-amber border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-stub-muted">{error ?? 'Event not found.'}</p>
        <Button variant="secondary" onClick={() => navigate('/')}>Back to Discovery</Button>
      </div>
    );
  }

  const eventDate = toDate(event.date);
  const isTonight = eventDate.toDateString() === new Date().toDateString();
  const isCancelled = event.status === 'cancelled';
  const isPostponed = event.status === 'postponed';

  const dateStr = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const doorsTimeStr = event.doorsTime
    ? toDate(event.doorsTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;
  const showTimeStr = event.showTime
    ? toDate(event.showTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : doorsTimeStr;

  const hasSupportActs = supportActNames.length > 0 || event.artistIds.length > 1;
  const hasOriginalTicketUrl = isTicketPurchaseUrl(event.ticketUrl, event.source);
  const resolvedTicketUrl = useTicketLookup(
    artist?.name,
    venue?.name,
    eventDate,
    hasOriginalTicketUrl ? event.ticketUrl : undefined,
  );
  const hasTicketUrl = Boolean(resolvedTicketUrl);
  const ticketSources = getTicketSourceLinks(event.externalIds);
  const displayImage = artist
    ? getArtistDisplayImage(artist.images.primary, artist.genres, artist.name, venue?.images?.primary)
    : null;

  const priceStr = event.priceRange
    ? event.priceRange.min === event.priceRange.max
      ? `$${event.priceRange.min}`
      : `$${event.priceRange.min}–$${event.priceRange.max}`
    : null;

  function handleShare(): void {
    const title = `${artist?.name ?? 'Show'} at ${venue?.name ?? 'Venue'}`;
    const text = `${title} — ${dateStr}`;
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }

  function handleStubIt(): void {
    const params = new URLSearchParams();
    params.set('eventId', event!.id);
    if (artist) params.set('artist', artist.name);
    if (venue) params.set('venue', venue.name);
    params.set('date', eventDate.toISOString());
    if (artist?.images.primary) params.set('artistImage', artist.images.primary);
    navigate(`/create?${params.toString()}`);
  }

  const pageTitle = `${artist?.name ?? 'Show'} at ${venue?.name ?? 'Venue'} — ${eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="pb-8">
      <Helmet>
        <title>{`${pageTitle} — The Stub Live`}</title>
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={`${dateStr}${priceStr ? ` · ${priceStr}` : ''}`} />
        <meta property="og:type" content="event" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:site_name" content="The Stub Live" />
        {displayImage && <meta property="og:image" content={displayImage.url} />}
        <meta name="twitter:card" content={displayImage ? 'summary_large_image' : 'summary'} />
      </Helmet>

      {/* Hero */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        {displayImage ? (
          <img src={displayImage.url} alt={artist?.name ?? 'Event'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stub-amber/30 to-stub-coral/30 flex items-center justify-center">
            <Music className="w-12 h-12 text-stub-amber/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stub-bg via-stub-bg/40 to-transparent" />

        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 bg-stub-bg/60 backdrop-blur-sm rounded-full text-stub-text hover:bg-stub-bg/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="absolute bottom-4 left-4 right-4">
          {(isTonight || isCancelled || isPostponed) && (
            <div className="mb-2">
              {isTonight && <Badge variant="coral">TONIGHT</Badge>}
              {isCancelled && <Badge variant="coral">CANCELLED</Badge>}
              {isPostponed && <Badge variant="amber">POSTPONED</Badge>}
            </div>
          )}
          <Link
            to={`/artist/${event.artistIds[0]}`}
            className="hover:text-stub-amber transition-colors"
          >
            <h1 className="font-display font-bold text-stub-text text-3xl sm:text-4xl drop-shadow-lg hover:text-stub-amber transition-colors">
              {artist?.name ?? 'Unknown Artist'}
            </h1>
          </Link>
          {venue && (
            <Link
              to={`/venue/${venue.id}`}
              className="hover:text-stub-cyan transition-colors"
            >
              <p className="text-sm text-stub-text/80 mt-0.5 drop-shadow hover:text-stub-cyan transition-colors flex items-center gap-1">
                📍 {venue.name}
              </p>
            </Link>
          )}
          {hasSupportActs && (
            <p className="text-sm text-stub-muted mt-1">
              {supportActNames.length > 0
                ? `w/ ${supportActNames.slice(0, 3).join(', ')}${supportActNames.length > 3 ? ` +${supportActNames.length - 3} more` : ''}`
                : '+ special guests'}
            </p>
          )}
          <p className="text-sm text-stub-text/80 mt-1 font-mono">{dateStr}</p>
        </div>
      </div>

      <div className="px-4 -mt-2 relative z-10">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {hasTicketUrl && resolvedTicketUrl && (
            <a
              href={resolvedTicketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                bg-stub-amber/15 text-stub-amber hover:bg-stub-amber/25 transition-colors"
            >
              🎟️ Tickets
            </a>
          )}
          <StubItButton onClick={handleStubIt} />
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              bg-stub-cyan/10 text-stub-cyan hover:bg-stub-cyan/20 transition-colors"
          >
            📤 Share
          </button>
          {venue && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${venue.name} ${venue.address} ${venue.city} ${venue.state}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                bg-stub-green/10 text-stub-green hover:bg-stub-green/20 transition-colors"
            >
              📍 Directions
            </a>
          )}
          <div className="flex-1" />
          {artist && (
            <button
              onClick={() => navigate(`/artist/${event.artistIds[0]}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                bg-stub-surface text-stub-text border border-stub-border hover:border-stub-amber/30 hover:bg-stub-surface-hover transition-colors"
            >
              🎤 {artist.name}
            </button>
          )}
          {venue && (
            <button
              onClick={() => navigate(`/venue/${venue.id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                bg-stub-surface text-stub-text border border-stub-border hover:border-stub-cyan/30 hover:bg-stub-surface-hover transition-colors"
            >
              🏛️ {venue.name}
            </button>
          )}
        </div>

        {/* AI Event Briefing */}
        {(briefing || briefingLoading) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card glow="amber" className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-stub-amber/20 flex items-center justify-center">
                  <span className="text-xs">✦</span>
                </div>
                <span className="text-xs font-mono text-stub-amber uppercase tracking-wider">
                  Pre-Show Briefing
                </span>
              </div>

              {briefing ? (
                <div className="space-y-4">
                  {/* Show Preview */}
                  <div>
                    <p className="text-sm text-stub-text leading-relaxed">{stripFootnotes(briefing.showPreview)}</p>
                  </div>

                  {/* Venue Insight */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-stub-cyan" />
                      <span className="text-xs font-medium text-stub-cyan uppercase tracking-wider">Venue Insight</span>
                    </div>
                    <p className="text-sm text-stub-muted leading-relaxed">{stripFootnotes(briefing.venueInsight)}</p>
                  </div>

                  {/* Pro Tips */}
                  {briefing.proTips.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb className="w-3.5 h-3.5 text-stub-amber" />
                        <span className="text-xs font-medium text-stub-amber uppercase tracking-wider">Pro Tips</span>
                      </div>
                      <ul className="space-y-1.5">
                        {briefing.proTips.map((tip, i) => (
                          <li key={i} className="text-sm text-stub-muted flex items-start gap-2">
                            <span className="text-stub-amber/60 mt-0.5">•</span>
                            {stripFootnotes(tip)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Listening Guide */}
                  {briefing.listeningGuide.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Headphones className="w-3.5 h-3.5 text-stub-violet" />
                        <span className="text-xs font-medium text-stub-violet uppercase tracking-wider">Pre-Show Listening</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {briefing.listeningGuide.map((song) => (
                          <Link
                            key={song}
                            to={`/artist/${event.artistIds[0]}?tab=youtube`}
                            className="hover:opacity-80 transition-opacity"
                          >
                            <Badge variant="muted">{song}</Badge>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="h-4 bg-stub-border/40 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-stub-border/40 rounded animate-pulse w-full" />
                  <div className="h-4 bg-stub-border/40 rounded animate-pulse w-2/3" />
                </div>
              )}
            </Card>
          </motion.div>
        )}


        {/* Additional Ticket Sources */}
        {ticketSources.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <section className="mb-6">
              <h2 className="font-display font-bold text-stub-text text-sm mb-3 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-stub-amber" />
                Find Tickets
              </h2>
              <div className="space-y-2">
                {ticketSources.map(({ platform, url }) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3 bg-stub-surface rounded-lg border border-stub-border
                      hover:border-stub-amber/30 transition-colors group"
                  >
                    <span className="text-sm text-stub-text font-medium">{platform}</span>
                    <ExternalLink className="w-4 h-4 text-stub-muted group-hover:text-stub-amber transition-colors" />
                  </a>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {/* Age Restriction */}
        {event.ageRestriction && (
          <p className="text-xs text-stub-muted mb-4">
            Age Restriction: {event.ageRestriction}
          </p>
        )}
      </div>
    </div>
  );
}
