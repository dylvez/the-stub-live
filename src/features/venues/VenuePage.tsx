import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, MapPin, Calendar, Accessibility, Star,
  ExternalLink, Clock, ChevronDown,
  StickyNote, Edit2, Check, X, Video, Play,
} from 'lucide-react';
import { BrandedSpinner } from '@/components/ui/BrandedSpinner';
import { StubItButton } from '@/components/ui/StubItButton';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { Card, Badge } from '@/components/ui';
import { useVenue } from '@/hooks/useVenue';
import { useEvents } from '@/hooks/useEvents';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/firebase/config';
import { isSetlistFmConfigured } from '@/services/api/config';
import { memScanByPrefix } from '@/services/api/cache';
import { searchSetlistsByVenue } from '@/services/api/setlistfm';
import { searchLivePerformances, type YouTubeVideo } from '@/services/api/youtube';
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

  // Shows tab
  type ShowsTab = 'upcoming' | 'recent' | 'youtube';
  const [showsTab, setShowsTab] = useState<ShowsTab>('upcoming');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);

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

  // Fetch YouTube videos when YouTube tab is selected
  useEffect(() => {
    if (showsTab === 'youtube' && venue && videos.length === 0) {
      searchLivePerformances(venue.name, 6).then(setVideos).catch(() => {});
    }
  }, [showsTab, venue, videos.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stub-amber border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-stub-muted">
        <img src="/images/empty-venue-notfound.png" alt="Venue not found" className="w-32 h-32 mb-4 opacity-80" />
        Venue not found.
      </div>
    );
  }

  const now = new Date();
  const upcomingEvents = allEvents
    .filter((e) => e.date.toDate() > now)
    .sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());

  // Combine TM past events with setlist.fm past events, sorted by date desc.
  // Filter out any "past" events whose dates are actually in the future (bad data from setlist.fm).
  const tmPastEvents = allEvents.filter((e) => e.date.toDate() <= now);
  const filteredSfmPast = sfmPastEvents.filter((e) => e.date.toDate() <= now);
  const allPastEvents = [...tmPastEvents, ...filteredSfmPast]
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
          {venue.googleRating && (
            <p className="text-sm text-stub-text/80 mt-1 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-stub-amber fill-stub-amber" />
              <span className="font-semibold">{venue.googleRating}</span>
              {venue.googleReviewCount && (
                <span className="text-stub-muted">({venue.googleReviewCount.toLocaleString()} reviews)</span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 -mt-2 relative z-10">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              bg-stub-green/10 text-stub-green hover:bg-stub-green/20 transition-colors"
          >
            📍 Directions
          </a>
          {venue.phone && (
            <a
              href={`tel:${venue.phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                bg-stub-cyan/10 text-stub-cyan hover:bg-stub-cyan/20 transition-colors"
            >
              📞 Call
            </a>
          )}
          {venue.website && (
            <a
              href={venue.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                bg-stub-amber/15 text-stub-amber hover:bg-stub-amber/25 transition-colors"
            >
              🌐 Website
            </a>
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

        {/* Shows — tabbed: Upcoming Shows | Recent Shows | YouTube: {name} */}
        <section className="mb-6">
          <div className="flex items-center gap-1 mb-4 border-b border-stub-border">
            {([
              { key: 'upcoming' as const, icon: Calendar, label: 'Upcoming Shows', count: upcomingEvents.length },
              { key: 'recent' as const, icon: Clock, label: 'Recent Shows', count: allPastEvents.length },
              { key: 'youtube' as const, icon: Video, label: `YouTube: ${venue.name}`, count: 0 },
            ]).map(({ key, icon: Icon, label, count }) => (
              <button
                key={key}
                onClick={() => setShowsTab(key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px
                  ${showsTab === key
                    ? 'text-stub-amber border-stub-amber'
                    : 'text-stub-muted border-transparent hover:text-stub-text'}`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate max-w-[120px]">{label}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full
                    ${showsTab === key ? 'bg-stub-amber/15 text-stub-amber' : 'bg-stub-border text-stub-muted'}`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {showsTab === 'upcoming' && (
            <>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-2">
                  {upcomingEvents.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      artist={allArtists.get(event.artistIds[0])}
                      onArtistClick={() => navigate(`/artist/${event.artistIds[0]}`)}
                      onEventClick={() => navigate(`/event/${event.id}`, { state: { event, artist: allArtists.get(event.artistIds[0]), venue } })}
                      onStubIt={() => handleStubIt(event)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-stub-muted text-sm">
                  No upcoming shows found at this venue.
                </div>
              )}
            </>
          )}

          {showsTab === 'recent' && (
            <>
              {sfmLoading && (
                <div className="flex items-center justify-center gap-2 py-4 text-stub-muted text-sm">
                  <BrandedSpinner size={16} />
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
                      onEventClick={() => navigate(`/event/${event.id}`, { state: { event, artist: allArtists.get(event.artistIds[0]), venue } })}
                      onStubIt={() => handleStubIt(event)}
                    />
                  ))}
                </div>
              ) : !sfmLoading ? (
                <div className="text-center py-6 text-stub-muted text-sm">
                  No recent shows found at this venue.
                </div>
              ) : null}
            </>
          )}

          {/* YouTube tab */}
          {showsTab === 'youtube' && (
            <div className="space-y-3">
              {videos.length > 0 ? (
                videos.map((video) => (
                  <a
                    key={video.id}
                    href={`https://www.youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-3 p-2 rounded-lg hover:bg-stub-surface-hover transition-colors"
                  >
                    <div className="w-32 h-20 rounded-lg overflow-hidden shrink-0 relative">
                      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-stub-text line-clamp-2">{video.title}</div>
                      <div className="text-xs text-stub-muted mt-1">{video.channelTitle}</div>
                    </div>
                  </a>
                ))
              ) : (
                <div className="text-center py-6 text-stub-muted text-sm">
                  Loading videos...
                </div>
              )}
            </div>
          )}
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
  onEventClick,
  onStubIt,
}: {
  event: EventData;
  artist: ArtistData | undefined;
  isPast?: boolean;
  onArtistClick: () => void;
  onEventClick?: () => void;
  onStubIt: () => void;
}): React.JSX.Element {
  const eventDate = event.date.toDate();
  const now = new Date();
  const isSetlistFm = event.source === 'setlistfm';

  return (
    <Card hover className={`${isPast ? 'opacity-80 hover:opacity-100 transition-opacity' : ''} ${onEventClick ? 'cursor-pointer' : ''}`} onClick={onEventClick}>
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
            {isSetlistFm && event.ticketUrl ? (
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Badge variant="cyan" className="text-[8px] hover:bg-stub-cyan/25 transition-colors cursor-pointer">setlist.fm</Badge>
              </a>
            ) : isSetlistFm ? (
              <Badge variant="cyan" className="text-[8px]">setlist.fm</Badge>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isPast && event.ticketUrl && (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                bg-stub-amber/15 text-stub-amber hover:bg-stub-amber/25 transition-colors"
            >
              🎟️ Tickets
            </a>
          )}
          <StubItButton onClick={onStubIt} />
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
