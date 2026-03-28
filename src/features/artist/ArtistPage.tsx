import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ExternalLink, Share2, Video, Play,
  Calendar, MapPin, ListMusic, PenTool, Loader2,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { useArtist } from '@/hooks/useArtist';
import { useEvents } from '@/hooks/useEvents';
import { generateArtistBriefing } from '@/services/ai/briefings';
import type { AiBriefing } from '@/types';
import { formatSetlistDate } from '@/utils/setlistToEvent';
import { searchLivePerformances, type YouTubeVideo } from '@/services/api/youtube';
import { getArtistSetlists, type SetlistResult } from '@/services/api/setlistfm';

type ArtistTab = 'shows' | 'watch' | 'setlists';

export function ArtistPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { artist, lastfmInfo, mbArtist, isLoading: artistLoading } = useArtist(id);
  const { events: allEvents, venues } = useEvents({ artistId: id });
  const [activeTab, setActiveTab] = useState<ArtistTab>('shows');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [setlists, setSetlists] = useState<SetlistResult[]>([]);
  const [briefing, setBriefing] = useState<AiBriefing | null>(artist?.aiBriefing ?? null);

  // Fetch YouTube videos when Watch tab is selected
  useEffect(() => {
    if (activeTab === 'watch' && artist && videos.length === 0) {
      searchLivePerformances(artist.name, 6).then(setVideos).catch(() => {});
    }
  }, [activeTab, artist, videos.length]);

  // Fetch setlists when Setlists tab is selected
  useEffect(() => {
    if (activeTab === 'setlists' && mbArtist && setlists.length === 0) {
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
      <div className="flex items-center justify-center h-64 text-stub-muted">
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
        {artist.images.primary ? (
          <img src={artist.images.primary} alt={artist.name} className="w-full h-full object-cover" />
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
        <div className="flex gap-2 mb-6">
          <Button
            variant="secondary"
            icon={<Share2 className="w-4 h-4" />}
            onClick={() => {
              const url = window.location.href;
              if (navigator.share) {
                navigator.share({ title: artist.name, text: `Check out ${artist.name} on The Stub Live`, url }).catch(() => {});
              } else {
                navigator.clipboard.writeText(url).then(() => {
                  // Could show toast — for now, button text feedback
                }).catch(() => {});
              }
            }}
          >
            Share
          </Button>
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
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
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

        {/* Tabs: Upcoming Shows | Watch | Setlists */}
        <section className="mb-6">
          <div className="flex border-b border-stub-border mb-4">
            {([
              { key: 'shows' as const, icon: Calendar, label: 'Upcoming Shows' },
              { key: 'watch' as const, icon: Video, label: 'Watch' },
              { key: 'setlists' as const, icon: ListMusic, label: 'Setlists' },
            ]).map(({ key, icon: Icon, label }) => (
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
                {label}
                {key === 'shows' && upcomingEvents.length > 0 && (
                  <span className="text-[10px] font-mono text-stub-muted">{upcomingEvents.length}</span>
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
                    <Card key={event.id} hover>
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
                          {event.priceRange && (
                            <span className="text-xs font-mono text-stub-muted">
                              ${event.priceRange.min}
                              {event.priceRange.max !== event.priceRange.min && `–$${event.priceRange.max}`}
                            </span>
                          )}
                          {event.ticketUrl && (
                            <a
                              href={event.ticketUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-stub-amber hover:text-stub-amber-dim transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => {
                              const params = new URLSearchParams();
                              params.set('eventId', event.id);
                              params.set('artist', artist?.name ?? '');
                              params.set('venue', venue?.name ?? '');
                              params.set('date', event.date.toDate().toISOString());
                              if (artist?.images.primary) params.set('artistImage', artist.images.primary);
                              navigate(`/create?${params.toString()}`);
                            }}
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
                })
              ) : (
                <div className="text-center py-6 text-stub-muted text-sm">
                  No upcoming shows found
                </div>
              )}
            </div>
          )}

          {/* Watch tab: YouTube live videos */}
          {activeTab === 'watch' && (
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

          {/* Setlists tab */}
          {activeTab === 'setlists' && (
            <div className="space-y-4">
              {setlists.length > 0 ? (
                setlists.map((setlist) => (
                  <Card key={setlist.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-xs font-mono text-stub-muted">
                          {formatSetlistDate(setlist.date)}
                        </div>
                        <div className="text-sm text-stub-text flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {setlist.venueName}, {setlist.venueCity}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {setlist.songs.length > 0 && (
                          <Badge variant="muted">{setlist.songs.length} songs</Badge>
                        )}
                        <button
                          onClick={() => {
                            const params = new URLSearchParams();
                            params.set('artist', artist?.name ?? '');
                            params.set('venue', setlist.venueName);
                            const [dd, mm, yyyy] = setlist.date.split('-');
                            const isoDate = new Date(`${yyyy}-${mm}-${dd}`).toISOString();
                            params.set('date', isoDate);
                            if (artist?.images.primary) params.set('artistImage', artist.images.primary);
                            navigate(`/create?${params.toString()}`);
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                            bg-stub-amber/10 text-stub-amber hover:bg-stub-amber/20 transition-colors"
                        >
                          <PenTool className="w-3 h-3" />
                          Stub It
                        </button>
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
                  </Card>
                ))
              ) : (
                <div className="text-center py-6 text-stub-muted text-sm">
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
