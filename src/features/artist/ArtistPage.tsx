import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ExternalLink, Video, Play,
  Calendar, Clock, MapPin, Share2, Globe, Ticket,
} from 'lucide-react';
import { BrandedSpinner } from '@/components/ui/BrandedSpinner';
import { Card, Badge } from '@/components/ui';
import { StubItButton } from '@/components/ui/StubItButton';
import { useArtist } from '@/hooks/useArtist';
import { useEvents } from '@/hooks/useEvents';
import { generateArtistBriefing } from '@/services/ai/briefings';
import type { AiBriefing } from '@/types';
import { formatSetlistDate } from '@/utils/setlistToEvent';
import { searchLivePerformances, type YouTubeVideo } from '@/services/api/youtube';
import { getArtistSetlists, type SetlistResult } from '@/services/api/setlistfm';

type ArtistTab = 'shows' | 'recent' | 'youtube';

export function ArtistPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as ArtistTab) || 'shows';
  const { artist, lastfmInfo, mbArtist, isLoading: artistLoading } = useArtist(id);
  const { events: allEvents, venues } = useEvents({ artistId: id });
  const [activeTab, setActiveTab] = useState<ArtistTab>(initialTab);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [setlists, setSetlists] = useState<SetlistResult[]>([]);
  const [briefing, setBriefing] = useState<AiBriefing | null>(artist?.aiBriefing ?? null);

  // Fetch YouTube videos when YouTube tab is selected
  useEffect(() => {
    if (activeTab === 'youtube' && artist && videos.length === 0) {
      searchLivePerformances(artist.name, 6).then(setVideos).catch(() => {});
    }
  }, [activeTab, artist, videos.length]);

  // Fetch setlists when Recent Shows tab is selected
  useEffect(() => {
    if (activeTab === 'recent' && mbArtist && setlists.length === 0) {
      getArtistSetlists(mbArtist.mbid, 5).then(setSetlists).catch(() => {});
    }
  }, [activeTab, mbArtist, setlists.length]);

  // Trigger AI briefing generation via Cloud Function if not already available
  useEffect(() => {
    if (artist && !briefing && id) {
      generateArtistBriefing(id, {
        name: artist.name,
        genres: artist.genres,
        tags: artist.tags,
      }).then((result) => {
        if (result) setBriefing(result);
      }).catch(() => {});
    }
  }, [artist?.name, id]);

  if (artistLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stub-amber border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-stub-muted">
        <img src="/images/empty-artist-notfound.png" alt="Artist not found" className="w-32 h-32 mb-4 opacity-80" />
        Artist not found.
      </div>
    );
  }

  // AI briefing loading state — shows skeleton while Claude generates
  const briefingLoading = !briefing && !lastfmInfo?.bio;

  const now = new Date();
  const upcomingEvents = allEvents.filter((e) => e.date.toDate() > now);
  // Past events available for future use
  // const pastEvents = allEvents.filter((e) => e.date.toDate() <= now);

  // Deduplicate genres vs tags
  const genreSet = new Set(artist.genres.map((g) => g.toLowerCase()));
  const uniqueTags = artist.tags.filter((t) => !genreSet.has(t.toLowerCase()));

  // Similar artists from Last.fm or AI briefing
  const similarArtists = lastfmInfo?.similarArtists ?? briefing?.forFansOf ?? [];

  return (
    <div className="pb-8">
      <Helmet>
        <title>{`${artist.name} — The Stub Live`}</title>
        <meta property="og:title" content={artist.name} />
        <meta property="og:description" content={artist.genres.length > 0 ? artist.genres.join(', ') : 'Artist on The Stub Live'} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:site_name" content="The Stub Live" />
        {artist.images.primary && <meta property="og:image" content={artist.images.primary} />}
        <meta name="twitter:card" content={artist.images.primary ? 'summary_large_image' : 'summary'} />
      </Helmet>
      {/* Hero */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        {(artist.images.primary || briefing?.imageUrl) ? (
          <img src={artist.images.primary || briefing?.imageUrl || ''} alt={artist.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stub-amber/30 to-stub-coral/30 flex items-center justify-center">
            <span className="text-6xl font-display font-bold text-stub-amber/30">{artist.name.charAt(0)}</span>
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
          <div className="flex flex-wrap gap-1.5 mb-2">
            {artist.genres.slice(0, 4).map((g) => (
              <Badge key={g} variant="amber">{g}</Badge>
            ))}
            {uniqueTags.slice(0, 3).map((t) => (
              <Badge key={t} variant="muted">{t}</Badge>
            ))}
          </div>
          <h1 className="font-display font-bold text-stub-text text-3xl sm:text-4xl drop-shadow-lg">
            {artist.name}
          </h1>
        </div>
      </div>

      <div className="px-4 -mt-2 relative z-10">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => {
              const url = window.location.href;
              if (navigator.share) {
                navigator.share({ title: artist.name, text: `Check out ${artist.name} on The Stub Live`, url }).catch(() => {});
              } else {
                navigator.clipboard.writeText(url).catch(() => {});
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              bg-stub-cyan/10 text-stub-cyan hover:bg-stub-cyan/20 transition-colors"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
          {(artist.externalIds.websiteUrl || briefing?.websiteUrl) && (
            <a
              href={artist.externalIds.websiteUrl || briefing?.websiteUrl || ''}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                bg-stub-amber/15 text-stub-amber hover:bg-stub-amber/25 transition-colors"
            >
              <Globe className="w-4 h-4" /> Website
            </a>
          )}
        </div>

        {/* Last.fm bio or AI Briefing */}
        {(lastfmInfo?.bio || briefing || briefingLoading) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card glow="amber" className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-stub-amber/20 flex items-center justify-center">
                  <span className="text-xs">✦</span>
                </div>
                <span className="text-xs font-mono text-stub-amber uppercase tracking-wider">
                  {briefing ? 'AI Briefing' : 'About'}
                </span>
              </div>

              {briefing ? (
                <>
                  <p className="text-stub-text text-sm leading-relaxed mb-3">{briefing.summary}</p>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-stub-muted uppercase tracking-wider">Sounds Like</span>
                      <p className="text-sm text-stub-text mt-0.5">{briefing.soundDescription}</p>
                    </div>
                    <div>
                      <span className="text-xs text-stub-muted uppercase tracking-wider">Live</span>
                      <p className="text-sm text-stub-text mt-0.5">{briefing.liveReputation}</p>
                    </div>
                  </div>
                </>
              ) : lastfmInfo?.bio ? (
                <p className="text-stub-text text-sm leading-relaxed line-clamp-4">{lastfmInfo.bio}</p>
              ) : briefingLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="flex items-center gap-2 text-xs text-stub-amber">
                    <BrandedSpinner size={14} />
                    Generating AI Briefing...
                  </div>
                  <div className="h-3 bg-stub-border rounded w-full" />
                  <div className="h-3 bg-stub-border rounded w-4/5" />
                  <div className="h-3 bg-stub-border rounded w-3/5" />
                </div>
              ) : null}

              {/* Similar artists */}
              {similarArtists.length > 0 && (
                <div className="mt-3 pt-3 border-t border-stub-border">
                  <span className="text-xs text-stub-muted uppercase tracking-wider">For Fans Of</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {similarArtists.slice(0, 5).map((name) => (
                      <button
                        key={name}
                        onClick={() => navigate(`/search?q=${encodeURIComponent(name)}`)}
                        className="cursor-pointer"
                      >
                        <Badge variant="cyan">{name}</Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Last.fm stats */}
              {lastfmInfo && (
                <div className="flex gap-4 mt-3 pt-3 border-t border-stub-border">
                  <div>
                    <div className="text-sm font-display font-bold text-stub-text">
                      {lastfmInfo.listeners.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-stub-muted">Listeners</div>
                  </div>
                  <div>
                    <div className="text-sm font-display font-bold text-stub-text">
                      {lastfmInfo.playcount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-stub-muted">Plays</div>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Tabs: Upcoming Shows | Recent Shows | YouTube: {name} */}
        <section className="mb-6">
          <div className="flex border-b border-stub-border mb-4">
            {([
              { key: 'shows' as const, icon: Calendar, label: 'Upcoming Shows', count: upcomingEvents.length },
              { key: 'recent' as const, icon: Clock, label: 'Recent Shows', count: setlists.length },
              { key: 'youtube' as const, icon: Video, label: `YouTube: ${artist.name}`, count: 0 },
            ]).map(({ key, icon: Icon, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm transition-colors border-b-2
                  ${activeTab === key
                    ? 'text-stub-amber border-stub-amber'
                    : 'text-stub-muted border-transparent hover:text-stub-text'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate max-w-[120px]">{label}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full
                    ${activeTab === key ? 'bg-stub-amber/15 text-stub-amber' : 'bg-stub-border text-stub-muted'}`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Upcoming Shows tab */}
          {activeTab === 'shows' && (
            <div className="space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => {
                  const venue = venues.get(event.venueId);
                  return (
                    <Card
                      key={event.id}
                      hover
                      className="cursor-pointer"
                      onClick={() => navigate(`/event/${event.id}`, { state: { event, artist, venue } })}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-sm text-stub-text">
                            <MapPin className="w-3.5 h-3.5 text-stub-muted" />
                            {venue?.name ?? 'Unknown Venue'}
                            {venue?.city && <span className="text-stub-muted">· {venue.city}</span>}
                          </div>
                          <div className="text-xs font-mono text-stub-muted mt-1">
                            {event.date.toDate().toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.ticketUrl && (
                            <a
                              href={event.ticketUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                bg-stub-amber/15 text-stub-amber hover:bg-stub-amber/25 transition-colors"
                            >
                              <Ticket className="w-4 h-4" /> Tickets
                            </a>
                          )}
                          <StubItButton onClick={() => {
                              const params = new URLSearchParams();
                              params.set('eventId', event.id);
                              params.set('artist', artist?.name ?? '');
                              params.set('venue', venue?.name ?? '');
                              params.set('date', event.date.toDate().toISOString());
                              if (artist?.images.primary) params.set('artistImage', artist.images.primary);
                              navigate(`/create?${params.toString()}`);
                            }} />
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-6 text-stub-muted text-sm">
                  No upcoming shows found
                </div>
              )}
            </div>
          )}

          {/* YouTube tab */}
          {activeTab === 'youtube' && (
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

          {/* Recent Shows tab */}
          {activeTab === 'recent' && (
            <div className="space-y-4">
              {setlists.length > 0 ? (
                setlists.map((setlist) => (
                  <Card key={setlist.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-xs font-mono text-stub-muted">
                          {formatSetlistDate(setlist.date)}
                        </div>
                        <button
                          onClick={() => navigate(`/search?q=${encodeURIComponent(setlist.venueName)}`)}
                          className="text-sm text-stub-cyan hover:text-stub-cyan/80 flex items-center gap-1 transition-colors"
                        >
                          <MapPin className="w-3 h-3" />
                          {setlist.venueName}, {setlist.venueCity}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        {setlist.songs.length > 0 && (
                          <Badge variant="muted">{setlist.songs.length} songs</Badge>
                        )}
                        <StubItButton onClick={() => {
                            const params = new URLSearchParams();
                            params.set('artist', artist?.name ?? '');
                            params.set('venue', setlist.venueName);
                            const [dd, mm, yyyy] = setlist.date.split('-');
                            const isoDate = new Date(`${yyyy}-${mm}-${dd}`).toISOString();
                            params.set('date', isoDate);
                            if (artist?.images.primary) params.set('artistImage', artist.images.primary);
                            navigate(`/create?${params.toString()}`);
                          }} />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      {setlist.songs.slice(0, 8).map((song, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-4 text-right font-mono text-stub-muted">{i + 1}</span>
                          <span className={`text-stub-text ${song.encore ? 'italic' : ''}`}>
                            {song.title}
                            {song.isCover && <span className="text-stub-muted ml-1">({song.originalArtist} cover)</span>}
                          </span>
                          {song.encore && <Badge variant="amber" className="text-[9px]">Encore</Badge>}
                        </div>
                      ))}
                      {setlist.songs.length > 8 && (
                        <div className="text-xs text-stub-muted pl-6">+{setlist.songs.length - 8} more</div>
                      )}
                    </div>
                    <div className="flex items-center justify-end mt-2 pt-2 border-t border-stub-border/50">
                      <a
                        href={setlist.url || `https://www.setlist.fm/setlist/-/-${setlist.id}.html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] hover:opacity-80 transition-opacity"
                        style={{ color: '#85b146' }}
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        via setlist.fm
                      </a>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="flex flex-col items-center text-center py-6 text-stub-muted text-sm">
                  <img src="/images/empty-no-setlists.png" alt="No setlists found" className="w-32 h-32 mb-4 opacity-80" />
                  {mbArtist ? 'Loading setlists...' : 'No setlist data available'}
                </div>
              )}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
