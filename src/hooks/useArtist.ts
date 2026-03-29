import { useState, useEffect } from 'react';
import { isTicketmasterConfigured, isLastFmConfigured, isDiscogsConfigured, isGeniusConfigured } from '@/services/api/config';
import { cacheGet, cacheSet, memGet, CacheTTL } from '@/services/api/cache';
import { getArtistInfo, type LastFmArtistInfo } from '@/services/api/lastfm';
import { searchArtist as searchMbArtist, type MusicBrainzArtist } from '@/services/api/musicbrainz';
import { searchDiscogsArtist } from '@/services/api/discogs';
import { searchGeniusArtist, getGeniusArtistTopSongs } from '@/services/api/genius';
import type { ArtistData } from '@/types';
import type { DiscogsArtistInfo } from '@/types/discogs';
import type { GeniusArtistInfo } from '@/types/genius';

export interface UseArtistReturn {
  artist: ArtistData | null;
  lastfmInfo: LastFmArtistInfo | null;
  mbArtist: MusicBrainzArtist | null;
  discogsInfo: DiscogsArtistInfo | null;
  geniusInfo: GeniusArtistInfo | null;
  isLoading: boolean;
  error: string | null;
}

export function useArtist(id: string | undefined): UseArtistReturn {
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [lastfmInfo, setLastfmInfo] = useState<LastFmArtistInfo | null>(null);
  const [mbArtist, setMbArtist] = useState<MusicBrainzArtist | null>(null);
  const [discogsInfo, setDiscogsInfo] = useState<DiscogsArtistInfo | null>(null);
  const [geniusInfo, setGeniusInfo] = useState<GeniusArtistInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const artistId = id; // capture narrowed value

    async function loadArtist(): Promise<void> {
      // Check enriched cache first
      const cached = cacheGet<ArtistData>(`artist:enriched:${artistId}`, true);
      if (cached) {
        setArtist(cached);
        const cachedLfm = cacheGet<LastFmArtistInfo>(`artist:lastfm:${artistId}`, true);
        if (cachedLfm) setLastfmInfo(cachedLfm);
        const cachedMb = cacheGet<MusicBrainzArtist>(`artist:mb:${artistId}`, true);
        if (cachedMb) setMbArtist(cachedMb);
        const cachedDiscogs = cacheGet<DiscogsArtistInfo>(`artist:discogs:${artistId}`, true);
        if (cachedDiscogs) setDiscogsInfo(cachedDiscogs);
        const cachedGenius = cacheGet<GeniusArtistInfo>(`artist:genius:${artistId}`, true);
        if (cachedGenius) setGeniusInfo(cachedGenius);
        setIsLoading(false);
        return;
      }

      let baseArtist: ArtistData | null = null;

      // 1. Check direct artist cache (memory + localStorage, written by useEvents)
      const directCached = cacheGet<ArtistData>(`artist:${artistId}`, true);
      if (directCached) {
        baseArtist = directCached;
      }

      // 2. Check memory-only cache (written by useSearch)
      if (!baseArtist) {
        const memCached = memGet<ArtistData>(`artist:${artistId}`);
        if (memCached) {
          baseArtist = memCached;
        }
      }

      // 3. Scan localStorage caches for the artist
      if (!baseArtist) {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key?.startsWith('stub_cache_')) continue;
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const entry = JSON.parse(raw);
            const data = entry.data;
            if (!data) continue;

            // Check [string, ArtistData][] arrays (events cache, search cache)
            for (const field of ['artists', 'eventArtistsArr']) {
              const arr = data[field] as unknown;
              if (Array.isArray(arr) && arr.length > 0 && Array.isArray(arr[0])) {
                const found = (arr as [string, ArtistData][]).find(([k]) => k === artistId);
                if (found) { baseArtist = found[1]; break; }
              }
            }
            if (baseArtist) break;
          }
        } catch { /* ignore */ }
      }

      // 4. For real TM attraction IDs, try fetching from TM API
      if (!baseArtist && artistId.startsWith('tm-') && !artistId.startsWith('tm-event-') && isTicketmasterConfigured) {
        try {
          const { searchEvents, parseTmEvents } = await import('@/services/api/ticketmaster');
          const tmId = artistId.slice(3);
          const result = await searchEvents({ attractionId: tmId, size: 1 });
          if (result.events.length > 0) {
            const parsed = parseTmEvents(result.events);
            baseArtist = parsed.artists.get(artistId) ?? null;
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch artist');
        }
      }

      // 5. For Jambase artist IDs, fetch events by performer to recover artist data
      if (!baseArtist && artistId.startsWith('jb-artist-')) {
        try {
          const { isJambaseConfigured } = await import('@/services/api/config');
          if (isJambaseConfigured) {
            const { getJambaseEventsByPerformer, parseJbEvents } = await import('@/services/api/jambase');
            const jbId = artistId.slice(10); // strip "jb-artist-"
            const result = await getJambaseEventsByPerformer(jbId);
            if (result.events.length > 0) {
              const parsed = parseJbEvents(result.events);
              baseArtist = parsed.artists.get(artistId) ?? null;
            }
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch artist');
        }
      }

      if (cancelled) return;
      if (!baseArtist) {
        setIsLoading(false);
        return;
      }

      setArtist(baseArtist);
      setIsLoading(false);

      // Enrich in parallel (non-blocking — UI shows base data immediately)
      const enrichmentPromises: Promise<void>[] = [];
      let lfmInfo: { bio?: string; listeners?: number } | null = null; // captured for AI briefing
      let discogsData: DiscogsArtistInfo | null = null; // captured for AI briefing
      let geniusData: GeniusArtistInfo | null = null; // captured for AI briefing
      let geniusSongDescs: string[] = []; // captured for AI briefing

      // Last.fm enrichment
      if (isLastFmConfigured) {
        enrichmentPromises.push(
          (async () => {
            try {
              const info = await getArtistInfo(baseArtist!.name);
              if (cancelled || !info) return;
              lfmInfo = info;
              setLastfmInfo(info);
              cacheSet(`artist:lastfm:${artistId}`, info, CacheTTL.LASTFM, true);

              // Merge tags into artist if they have more detail
              if (info.tags.length > 0) {
                setArtist((prev) => {
                  if (!prev) return prev;
                  const merged = {
                    ...prev,
                    tags: [...new Set([...info.tags, ...prev.tags])].slice(0, 10),
                  };
                  return merged;
                });
              }
            } catch { /* Last.fm enrichment is best-effort */ }
          })()
        );
      }

      // MusicBrainz (always available, no key needed)
      enrichmentPromises.push(
        (async () => {
          try {
            const mb = await searchMbArtist(baseArtist!.name);
            if (cancelled || !mb) return;
            setMbArtist(mb);
            cacheSet(`artist:mb:${artistId}`, mb, CacheTTL.LASTFM, true);
          } catch { /* MusicBrainz enrichment is best-effort */ }
        })()
      );

      // Discogs enrichment
      if (isDiscogsConfigured) {
        enrichmentPromises.push(
          (async () => {
            try {
              const info = await searchDiscogsArtist(baseArtist!.name);
              if (cancelled || !info) return;
              discogsData = info;
              setDiscogsInfo(info);
              cacheSet(`artist:discogs:${artistId}`, info, CacheTTL.DISCOGS, true);

              // Merge styles into tags
              if (info.styles.length > 0) {
                setArtist((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    tags: [...new Set([...info.styles, ...prev.tags])].slice(0, 15),
                    externalIds: { ...prev.externalIds, discogsId: String(info.discogsId) },
                  };
                });
              }
            } catch { /* Discogs enrichment is best-effort */ }
          })()
        );
      }

      // Genius enrichment
      if (isGeniusConfigured) {
        enrichmentPromises.push(
          (async () => {
            try {
              const info = await searchGeniusArtist(baseArtist!.name);
              if (cancelled || !info) return;
              geniusData = info;
              setGeniusInfo(info);
              cacheSet(`artist:genius:${artistId}`, info, CacheTTL.GENIUS, true);

              // Fetch top songs for briefing context
              const songs = await getGeniusArtistTopSongs(info.geniusId, 5);
              if (songs.length > 0) {
                geniusSongDescs = songs
                  .filter((s) => s.description)
                  .map((s) => `"${s.title}" — ${s.description!.slice(0, 150)}`);
              }

              // Store geniusId on artist
              setArtist((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  externalIds: { ...prev.externalIds, geniusId: String(info.geniusId) },
                };
              });
            } catch { /* Genius enrichment is best-effort */ }
          })()
        );
      }

      await Promise.allSettled(enrichmentPromises);

      // AI Briefing — generate after other enrichment provides context
      if (cancelled) return;
      try {
        const { generateArtistBriefing, isClaudeConfigured: claudeOk } = await import('@/services/ai/briefings');
        if (claudeOk) {
          // Get latest artist state for best context
          let currentArtist = baseArtist!;
          setArtist((prev) => { if (prev) currentArtist = prev; return prev; });

          if (!currentArtist.aiBriefing) {
            const briefing = await generateArtistBriefing(artistId, {
              name: currentArtist.name,
              genres: currentArtist.genres,
              tags: currentArtist.tags,
              lastfmBio: lfmInfo?.bio,
              listenerCount: lfmInfo?.listeners,
              // Discogs context
              discogsBio: discogsData?.profile,
              discogsStyles: discogsData?.styles,
              discographyHighlights: discogsData?.discography
                ?.filter((r) => r.role === 'Main' && r.year)
                .slice(0, 8)
                .map((r) => `${r.title} (${r.year}${r.label ? ', ' + r.label : ''})`),
              // Genius context
              geniusBio: geniusData?.description,
              geniusSongDescriptions: geniusSongDescs.length > 0 ? geniusSongDescs : undefined,
            });

            if (cancelled || !briefing) return;
            setArtist((prev) => {
              if (!prev) return prev;
              const enriched = { ...prev, aiBriefing: briefing };
              cacheSet(`artist:enriched:${artistId}`, enriched, CacheTTL.ARTIST, true);
              return enriched;
            });
          }
        }
      } catch { /* AI briefing is best-effort */ }
    }

    loadArtist();
    return () => { cancelled = true; };
  }, [id]);

  return { artist, lastfmInfo, mbArtist, discogsInfo, geniusInfo, isLoading, error };
}
