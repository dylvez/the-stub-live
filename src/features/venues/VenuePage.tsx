import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, MapPin, Users, Calendar, Accessibility, Star,
  Navigation, PenTool, ExternalLink, Clock, Loader2, Phone, Globe, ChevronDown,
  StickyNote, Edit2, Check, X,
} from 'lucide-react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { Card, Badge, Button } from '@/components/ui';
import { useVenue } from '@/hooks/useVenue';
import { useEvents } from '@/hooks/useEvents';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/firebase/config';
import { isSetlistFmConfigured } from '@/services/api/config';
import { memScanByPrefix } from '@/services/api/cache';
import { searchSetlistsByVenue } from '@/services/api/setlistfm';
import { convertSetlistsToEvents } from '@/utils/setlistToEvent';
import type { EventData, ArtistData } from '@/types';

export function VenuePage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { venue, isLoading } = useVenue(id);

  // Upcoming events from APIs (may miss cross-source events)
  const { events: apiEvents, artists: apiArtists } = useEvents({ venueId: id });

  // Supplement with cached events that match this venue by name or ID.
  // This catches events from other sources (e.g. Jambase events when viewing a TM venue)
  // by scanning the in-memory event cache from the discovery page.
  const { allEvents, artists } = useMemo(() => {
    if (!venue) return { allEvents: apiEvents, artists: apiArtists };

    const mergedEvents = [...apiEvents];
    const mergedArtists = new Map(apiArtists);
    const existingIds = new Set(apiEvents.map((e) => e.id));
    const venueName = venue.name.toLowerCase().trim();

    interface CachedEventData {
      events: EventData[];
      artists: [string, ArtistData][];
      venues: [string, import('@/types').VenueData][];
    }

    try {
      const cachedEntries = memScanByPrefix<CachedEventData>('events-multi:');

      for (const cached of cachedEntries) {
        if (!cached?.events) continue;

        const cachedVenueMap = new Map(cached.venues);
        const cachedArtistMap = new Map(cached.artists);

        for (const event of cached.events) {
          if (existingIds.has(event.id)) continue;

          // Match by venue ID or by venue name
          const eventVenue = cachedVenueMap.get(event.venueId);
          const matchesId = event.venueId === id;
          const matchesName = eventVenue && eventVenue.name.toLowerCase().trim() === venueName;

          if (matchesId || matchesName) {
            mergedEvents.push(event);
            existingIds.add(event.id);
            // Bring along the artist data
            const primaryArtistId = event.artistIds[0];
            if (primaryArtistId && !mergedArtists.has(primaryArtistId)) {
              const cachedArtist = cachedArtistMap.get(primaryArtistId);
              if (cachedArtist) mergedArtists.set(primaryArtistId, cachedArtist);
            }
          }
        }
      }
    } catch { /* cache scan errors are non-fatal */ }

    return { allEvents: mergedEvents, artists: mergedArtists };
  }, [apiEvents, apiArtists, venue?.name, id]);

  const { user } = useAuth();

  // Personal venue notes
  const [venueNote, setVenueNote] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [editNoteText, setEditNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    const noteRef = doc(db, 'venueNotes', `${user.uid}_${id}`);
    getDoc(noteRef).then((snap) => {
      if (snap.exists()) setVenueNote(snap.data().note ?? '');
    }).catch(() => {});
  }, [user, id]);

  async function handleSaveNote(): Promise<void> {
    if (!user || !id) return;
    setNoteSaving(true);
    try {
      await setDoc(doc(db, 'venueNotes', `${user.uid}_${id}`), {
        userId: user.uid,
        venueId: id,
        note: editNoteText.trim(),
        updatedAt: Timestamp.now(),
      });
      setVenueNote(editNoteText.trim());
      setEditingNote(false);
    } catch (err) {
      console.error('Failed to save venue note:', err);
    } finally {
      setNoteSaving(false);
    }
  }

  // Past events from setlist.fm
  const [sfmPastEvents, setSfmPastEvents] = useState<EventData[]>([]);
  const [sfmArtists, setSfmArtists] = useState<Map<string, ArtistData>>(new Map());
  const [sfmLoading, setSfmLoading] = useState(false);

  useEffect(() => {
    if (!venue?.name || !isSetlistFmConfigured) return;

    setSfmLoading(true);
    searchSetlistsByVenue(venue.name, 20)
      .then((results) => {
        const converted = convertSetlistsToEvents(results);
        setSfmPastEvents(converted.events);
        setSfmArtists(converted.artists);
      })
      .catch(() => {})
      .finally(() => setSfmLoading(false));
  }, [venue?.name]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stub-amber border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="flex items-center justify-center h-64 text-stub-muted">Venue not found.</div>
    );
  }

  const now = new Date();
  const upcomingEvents = allEvents
    .filter((e) => e.date.toDate() > now)
    .sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());

  // Combine TM past events with setlist.fm past events, sorted by date desc
  const tmPastEvents = allEvents.filter((e) => e.date.toDate() <= now);
  const allPastEvents = [...tmPastEvents, ...sfmPastEvents]
    .sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());

  // Merge all artist maps
  const allArtists = new Map(artists);
  sfmArtists.forEach((v, k) => allArtists.set(k, v));

  function handleStubIt(event: EventData): void {
    const artist = allArtists.get(event.artistIds[0]);
    const params = new URLSearchParams();
    params.set('eventId', event.id);
    if (artist) params.set('artist', artist.name);
    params.set('venue', venue!.name);
    params.set('date', event.date.toDate().toISOString());
    if (artist?.images.primary) params.set('artistImage', artist.images.primary);
    navigate(`/create?${params.toString()}`);
  }

  return (
    <div className="pb-8">
      <Helmet>
        <title>{`${venue.name} — The Stub Live`}</title>
        <meta property="og:title" content={venue.name} />
        <meta property="og:description" content={`${venue.city}, ${venue.state} · Live music venue`} />
        <meta property="og:type" content="place" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:site_name" content="The Stub Live" />
        {venue.images.primary && <meta property="og:image" content={venue.images.primary} />}
        <meta name="twitter:card" content={venue.images.primary ? 'summary_large_image' : 'summary'} />
      </Helmet>
      {/* Hero */}
      <div className="relative h-56 overflow-hidden">
        {venue.images.primary ? (
          <img src={venue.images.primary} alt={venue.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stub-cyan/20 to-stub-amber/20 flex items-center justify-center">
            <MapPin className="w-16 h-16 text-stub-cyan/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stub-bg via-stub-bg/40 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 bg-stub-bg/60 backdrop-blur-sm rounded-full text-stub-text"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="absolute bottom-4 left-4 right-4">
          <Badge variant="cyan" className="mb-2">{venue.venueType}</Badge>
          <h1 className="font-display font-bold text-stub-text text-2xl drop-shadow-lg">{venue.name}</h1>
          <p className="text-sm text-stub-muted mt-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {venue.address}, {venue.city}, {venue.state}
          </p>
        </div>
      </div>

      <div className="px-4 -mt-2 relative z-10">
        {/* Quick info */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {venue.googleRating ? (
            <Card className="text-center">
              <Star className="w-5 h-5 text-stub-amber mx-auto mb-1" />
              <div className="text-lg font-display font-bold text-stub-text">{venue.googleRating}</div>
              <div className="text-[10px] text-stub-muted">{venue.googleReviewCount?.toLocaleString()} reviews</div>
            </Card>
          ) : (
            <Card className="text-center">
              <Users className="w-5 h-5 text-stub-amber mx-auto mb-1" />
              <div className="text-lg font-display font-bold text-stub-text">{venue.capacity?.toLocaleString() ?? '—'}</div>
              <div className="text-[10px] text-stub-muted">Capacity</div>
            </Card>
          )}
          <Card className="text-center">
            <Calendar className="w-5 h-5 text-stub-cyan mx-auto mb-1" />
            <div className="text-lg font-display font-bold text-stub-text">{upcomingEvents.length}</div>
            <div className="text-[10px] text-stub-muted">Upcoming</div>
          </Card>
          <Card className="text-center">
            <Clock className="w-5 h-5 text-stub-coral mx-auto mb-1" />
            <div className="text-lg font-display font-bold text-stub-text">{allPastEvents.length || '—'}</div>
            <div className="text-[10px] text-stub-muted">Past Shows</div>
          </Card>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-6">
          <Button
            variant="primary"
            icon={<Navigation className="w-4 h-4" />}
            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`, '_blank')}
          >
            Directions
          </Button>
          {venue.phone && (
            <Button
              variant="secondary"
              icon={<Phone className="w-4 h-4" />}
              onClick={() => window.open(`tel:${venue.phone}`, '_self')}
            >
              Call
            </Button>
          )}
          {venue.website && (
            <Button
              variant="secondary"
              icon={<Globe className="w-4 h-4" />}
              onClick={() => window.open(venue.website, '_blank')}
            >
              Website
            </Button>
          )}
        </div>

        {/* Editorial summary */}
        {venue.editorialSummary && (
          <section className="mb-6">
            <p className="text-sm text-stub-muted leading-relaxed">{venue.editorialSummary}</p>
          </section>
        )}

        {/* Personal venue notes */}
        {user && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-stub-text flex items-center gap-1.5">
                <StickyNote className="w-4 h-4 text-stub-amber" />
                My Notes
              </h3>
              {!editingNote && (
                <button
                  onClick={() => { setEditingNote(true); setEditNoteText(venueNote); }}
                  className="text-xs text-stub-muted hover:text-stub-text transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  {venueNote ? 'Edit' : 'Add note'}
                </button>
              )}
            </div>
            {editingNote ? (
              <div>
                <textarea
                  value={editNoteText}
                  onChange={(e) => setEditNoteText(e.target.value)}
                  placeholder="Parking tips, best spots to stand, drink specials..."
                  rows={3}
                  className="w-full bg-stub-surface border border-stub-border rounded-lg p-3 text-sm text-stub-text
                    placeholder:text-stub-muted/50 focus:outline-none focus:border-stub-amber/50 resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveNote}
                    disabled={noteSaving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-stub-amber text-stub-bg text-xs font-semibold rounded-lg hover:bg-stub-amber/90 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditingNote(false)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-stub-muted hover:text-stub-text transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : venueNote ? (
              <p className="text-sm text-stub-muted bg-stub-surface rounded-lg p-3 border border-stub-border whitespace-pre-wrap">{venueNote}</p>
            ) : null}
          </section>
        )}

        {/* Photo gallery */}
        {venue.images.gallery.length > 0 && (
          <section className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              {venue.images.gallery.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${venue.name} photo ${i + 1}`}
                  className="h-32 w-auto rounded-lg object-cover shrink-0"
                  loading="lazy"
                />
              ))}
            </div>
          </section>
        )}

        {/* Hours */}
        {venue.hours && venue.hours.length > 0 && (
          <VenueHours hours={venue.hours} />
        )}

        {/* Accessibility */}
        <section className="mb-6">
          <h2 className="font-display font-bold text-stub-text text-lg mb-3 flex items-center gap-2">
            <Accessibility className="w-5 h-5 text-stub-cyan" />
            Accessibility
          </h2>
          <Card>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-stub-muted">Wheelchair Accessible</span>
                <span className={venue.accessibility.wheelchairAccessible ? 'text-green-400' : 'text-stub-muted'}>
                  {venue.accessibility.wheelchairAccessible ? 'Yes' : 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stub-muted">Assistive Listening</span>
                <span className={venue.accessibility.assistiveListening ? 'text-green-400' : 'text-stub-muted'}>
                  {venue.accessibility.assistiveListening ? 'Yes' : 'Unknown'}
                </span>
              </div>
            </div>
          </Card>
        </section>

        {/* Upcoming shows */}
        <section className="mb-6">
          <h2 className="font-display font-bold text-stub-text text-lg mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-stub-amber" />
            Upcoming Shows
            {upcomingEvents.length > 0 && (
              <span className="text-xs font-mono text-stub-muted ml-auto">{upcomingEvents.length}</span>
            )}
          </h2>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  artist={allArtists.get(event.artistIds[0])}
                  onArtistClick={() => navigate(`/artist/${event.artistIds[0]}`)}
                  onStubIt={() => handleStubIt(event)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-stub-muted text-sm">
              No upcoming shows found at this venue.
            </div>
          )}
        </section>

        {/* Past shows */}
        <section className="mb-6">
          <h2 className="font-display font-bold text-stub-text text-lg mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-stub-muted" />
            Recent Shows
            {allPastEvents.length > 0 && (
              <span className="text-xs font-mono text-stub-muted ml-auto">{allPastEvents.length}</span>
            )}
          </h2>
          {sfmLoading && (
            <div className="flex items-center justify-center gap-2 py-4 text-stub-muted text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading past shows...
            </div>
          )}
          {!sfmLoading && allPastEvents.length > 0 ? (
            <div className="space-y-2">
              {allPastEvents.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  artist={allArtists.get(event.artistIds[0])}
                  isPast
                  onArtistClick={() => navigate(`/artist/${event.artistIds[0]}`)}
                  onStubIt={() => handleStubIt(event)}
                />
              ))}
            </div>
          ) : !sfmLoading ? (
            <div className="text-center py-6 text-stub-muted text-sm">
              No recent shows found at this venue.
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

/** Shared event row used for both upcoming and past shows */
function EventRow({
  event,
  artist,
  isPast,
  onArtistClick,
  onStubIt,
}: {
  event: EventData;
  artist: ArtistData | undefined;
  isPast?: boolean;
  onArtistClick: () => void;
  onStubIt: () => void;
}): React.JSX.Element {
  const eventDate = event.date.toDate();
  const now = new Date();
  const isSetlistFm = event.source === 'setlistfm';

  return (
    <Card hover className={isPast ? 'opacity-80 hover:opacity-100 transition-opacity' : ''}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-stub-border">
          {artist?.images.primary ? (
            <img src={artist.images.primary} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-stub-amber/20 to-stub-coral/20 flex items-center justify-center">
              <span className="text-xs font-bold text-stub-amber/40">{(artist?.name ?? '?').charAt(0)}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <button
            onClick={onArtistClick}
            className="text-sm font-semibold text-stub-text hover:text-stub-amber transition-colors truncate block"
          >
            {artist?.name ?? 'Unknown Artist'}
          </button>
          <div className="text-xs font-mono text-stub-muted flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {eventDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: eventDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
              })}
            </span>
            {isSetlistFm && <Badge variant="cyan" className="text-[8px]">setlist.fm</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {event.priceRange && (
            <span className="text-xs font-mono text-stub-muted">${event.priceRange.min}</span>
          )}
          {event.ticketUrl && (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-stub-amber hover:text-stub-amber-dim transition-colors"
              title="Get Tickets"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={onStubIt}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
              bg-stub-amber/10 text-stub-amber hover:bg-stub-amber/20 transition-colors"
          >
            <PenTool className="w-3 h-3" />
            Stub It
          </button>
        </div>
      </div>
    </Card>
  );
}

/** Collapsible hours section */
function VenueHours({ hours }: { hours: string[] }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Find today's hours line
  const todayLine = hours.find((h) => h.toLowerCase().startsWith(today.toLowerCase()));

  return (
    <section className="mb-6">
      <h2 className="font-display font-bold text-stub-text text-lg mb-3 flex items-center gap-2">
        <Clock className="w-5 h-5 text-stub-amber" />
        Hours
      </h2>
      <Card>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-sm"
        >
          <span className="text-stub-text font-medium">
            {todayLine ?? hours[0]}
          </span>
          <ChevronDown className={`w-4 h-4 text-stub-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        {expanded && (
          <div className="mt-2 pt-2 border-t border-stub-border space-y-1">
            {hours.map((line, i) => {
              const isToday = line.toLowerCase().startsWith(today.toLowerCase());
              return (
                <div
                  key={i}
                  className={`text-xs ${isToday ? 'text-stub-amber font-medium' : 'text-stub-muted'}`}
                >
                  {line}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );
}
