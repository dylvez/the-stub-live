# Discogs + Genius API Integration Spec

## Overview

Add Discogs and Genius as enrichment sources for artist profiles and setlist data. Both APIs are free-tier, no paid plans required. These integrations slot into the existing parallel enrichment pipeline in `useArtist` and extend the AI briefing prompt with richer cultural context.

## New Environment Variables

```
VITE_DISCOGS_TOKEN=          # Personal access token from discogs.com/settings/developers
VITE_GENIUS_ACCESS_TOKEN=    # Client access token from genius.com/api-clients
```

## New Files

| File | Purpose |
|---|---|
| `src/services/api/discogs.ts` | Discogs API client |
| `src/services/api/genius.ts` | Genius API client |
| `src/types/discogs.ts` | Discogs type definitions |
| `src/types/genius.ts` | Genius type definitions |

## Modified Files

| File | Change |
|---|---|
| `src/services/api/config.ts` | Add `discogs` and `genius` to `apiKeys`, `isDiscogsConfigured`, `isGeniusConfigured`, rate limit entries |
| `src/services/api/cache.ts` | Add `DISCOGS` and `GENIUS` TTL presets |
| `src/services/api/index.ts` | Add barrel exports for discogs and genius |
| `src/types/artist.ts` | Add `discogsId` and `geniusId` to `ArtistExternalIds` |
| `src/types/stub.ts` | Add Genius fields to `SetlistSong` |
| `src/services/ai/briefings.ts` | Extend `BriefingParams` with Discogs + Genius fields |
| `src/services/ai/prompts.ts` | Extend `buildBriefingUserPrompt()` to include new context |
| `src/hooks/useArtist.ts` | Add Discogs + Genius to parallel enrichment pipeline, pass new fields to briefing |
| `.env.example` | Add new env var placeholders |

---

## 1. Type Definitions

### `src/types/discogs.ts`

```typescript
export interface DiscogsArtistInfo {
  discogsId: number;
  name: string;
  realName?: string;
  profile?: string;               // bio text (can be long, truncate for briefing)
  images: DiscogsImage[];
  genres: string[];
  styles: string[];                // finer-grained than genres (e.g. "shoegaze", "dream pop")
  urls: string[];                  // external links
  members?: DiscogsMember[];       // band members (for groups)
  discography: DiscogsRelease[];   // key releases
}

export interface DiscogsImage {
  type: 'primary' | 'secondary';
  uri: string;
  width: number;
  height: number;
}

export interface DiscogsMember {
  id: number;
  name: string;
  active: boolean;
}

export interface DiscogsRelease {
  id: number;
  title: string;
  year?: number;
  type: string;                    // "master" | "release"
  role: string;                    // "Main" | "Appearance" | etc.
  label?: string;
}
```

### `src/types/genius.ts`

```typescript
export interface GeniusArtistInfo {
  geniusId: number;
  name: string;
  alternateNames: string[];
  imageUrl?: string;
  headerImageUrl?: string;
  description?: string;            // plain text bio
  socialLinks: GeniusSocialLinks;
}

export interface GeniusSocialLinks {
  twitter?: string;
  instagram?: string;
  facebook?: string;
}

export interface GeniusSongInfo {
  geniusId: number;
  title: string;
  artistName: string;
  description?: string;            // plain text song description/context
  annotationCount: number;
  releaseDate?: string;
  albumName?: string;
  geniusUrl: string;               // link out to Genius page
  featuredArtists: string[];
}
```

---

## 2. Type Modifications

### `src/types/artist.ts` — `ArtistExternalIds`

Add two new optional fields:

```typescript
export interface ArtistExternalIds {
  // ... existing fields unchanged
  discogsId?: string;
  geniusId?: string;
}
```

### `src/types/stub.ts` — `SetlistSong`

Add Genius enrichment fields:

```typescript
export interface SetlistSong {
  title: string;
  encore: boolean;
  notes?: string;
  isCover: boolean;
  originalArtist?: string;
  // Genius enrichment (populated async after Stub save)
  geniusId?: number;
  geniusSongDescription?: string;  // short blurb for "Did you know?" cards
  geniusUrl?: string;              // link out to full Genius page
}
```

---

## 3. API Clients

### `src/services/api/discogs.ts`

**Base URL:** `https://api.discogs.com`
**Auth:** `Authorization: Discogs token={VITE_DISCOGS_TOKEN}` header
**User-Agent:** `TheStubLive/1.0 (thestub.live)` (required by Discogs TOS)
**Rate limit domain:** `api.discogs.com` at 1 req/sec (conservative; actual limit is 60/min authenticated)

**Functions:**

```typescript
searchDiscogsArtist(name: string): Promise<DiscogsArtistInfo | null>
```
- Endpoint: `GET /database/search?type=artist&q={name}&per_page=1`
- Returns top match. If a match is found, chains to `getDiscogsArtist(id)` for full profile.
- Cache key: `discogs:artist:{name.toLowerCase()}`
- Cache TTL: `CacheTTL.DISCOGS` (24 hours)

```typescript
getDiscogsArtist(discogsId: number): Promise<DiscogsArtistInfo | null>
```
- Endpoint: `GET /artists/{discogsId}`
- Returns full artist profile with bio, images, genres, styles, members, URLs.
- Chains to `getDiscogsArtistReleases(discogsId)` to populate `discography`.

```typescript
getDiscogsArtistReleases(discogsId: number): Promise<DiscogsRelease[]>
```
- Endpoint: `GET /artists/{discogsId}/releases?sort=year&sort_order=asc&per_page=50`
- Filters to `role: "Main"`, maps to `DiscogsRelease[]`.
- Returns top 20 by relevance (masters preferred over individual releases).

**Pattern:** Follows `lastfm.ts` / `musicbrainz.ts` — uses `apiFetch()` with `rateLimitDomain`, cache-first reads via `cacheGet/cacheSet`.

### `src/services/api/genius.ts`

**Base URL:** `https://api.genius.com`
**Auth:** `Authorization: Bearer {VITE_GENIUS_ACCESS_TOKEN}` header
**Rate limit domain:** `api.genius.com` at 3 req/sec
**Note:** Genius API returns HTML-formatted descriptions. Strip HTML to plain text using the same regex pattern as Last.fm bio: `.replace(/<[^>]+>/g, '').trim()`

**Functions:**

```typescript
searchGeniusArtist(name: string): Promise<GeniusArtistInfo | null>
```
- Endpoint: `GET /search?q={name}`
- Filters `hits` for `type: "artist"`. If no artist-type hit, takes top song hit's `primary_artist`.
- Chains to `getGeniusArtist(id)` for full profile.
- Cache key: `genius:artist:{name.toLowerCase()}`
- Cache TTL: `CacheTTL.GENIUS` (24 hours)

```typescript
getGeniusArtist(geniusId: number): Promise<GeniusArtistInfo | null>
```
- Endpoint: `GET /artists/{geniusId}`
- Returns artist bio (plain text), image, alternate names, social links.

```typescript
getGeniusArtistTopSongs(geniusId: number, count?: number): Promise<GeniusSongInfo[]>
```
- Endpoint: `GET /artists/{geniusId}/songs?sort=popularity&per_page={count || 5}`
- For each song, fetches `GET /songs/{songId}` to get description.
- Returns array of `GeniusSongInfo` with descriptions.
- These feed into the AI briefing as cultural context.
- Cache key: `genius:songs:{geniusId}`
- Cache TTL: `CacheTTL.GENIUS` (24 hours)

```typescript
searchGeniusSong(title: string, artistName: string): Promise<GeniusSongInfo | null>
```
- Endpoint: `GET /search?q={title} {artistName}`
- Matches best result where `primary_artist.name` fuzzy-matches `artistName`.
- Used for setlist enrichment (per-song lookup).
- Cache key: `genius:song:{artistName.toLowerCase()}:{title.toLowerCase()}`
- Cache TTL: 7 days (song metadata is stable)

---

## 4. Config Changes

### `src/services/api/config.ts`

Add to `apiKeys`:
```typescript
discogs: import.meta.env.VITE_DISCOGS_TOKEN as string | undefined,
genius: import.meta.env.VITE_GENIUS_ACCESS_TOKEN as string | undefined,
```

Add config checks:
```typescript
export const isDiscogsConfigured = !!apiKeys.discogs;
export const isGeniusConfigured = !!apiKeys.genius;
```

Add rate limits:
```typescript
'api.discogs.com': 1,
'api.genius.com': 3,
```

### `src/services/api/cache.ts`

Add TTL presets:
```typescript
DISCOGS: 24 * 60 * 60 * 1000,   // 24 hours
GENIUS: 24 * 60 * 60 * 1000,    // 24 hours
GENIUS_SONG: 7 * 24 * 60 * 60 * 1000, // 7 days
```

### `src/services/api/index.ts`

Add exports:
```typescript
export { searchDiscogsArtist } from './discogs';
export type { DiscogsArtistInfo } from '../types/discogs';
export { searchGeniusArtist, searchGeniusSong } from './genius';
export type { GeniusArtistInfo, GeniusSongInfo } from '../types/genius';
```

---

## 5. AI Briefing Enrichment

### `src/services/ai/briefings.ts` — `BriefingParams`

Extend the interface:

```typescript
export interface BriefingParams {
  name: string;
  genres: string[];
  tags: string[];
  spotifyPopularity?: number;
  lastfmBio?: string;
  topTrackNames?: string[];
  listenerCount?: number;
  // Discogs enrichment
  discogsBio?: string;
  discogsStyles?: string[];
  discographyHighlights?: string[];
  // Genius enrichment
  geniusBio?: string;
  geniusSongDescriptions?: string[];
}
```

### `src/services/ai/prompts.ts` — `buildBriefingUserPrompt()`

Extend the function params type to include the new fields, then add these blocks:

```typescript
if (params.discogsStyles && params.discogsStyles.length > 0) {
  parts.push(`Discogs styles: ${params.discogsStyles.join(', ')}`);
}
if (params.discographyHighlights && params.discographyHighlights.length > 0) {
  parts.push(`Key releases: ${params.discographyHighlights.slice(0, 8).join('; ')}`);
}
if (params.discogsBio) {
  const truncated = params.discogsBio.slice(0, 400);
  parts.push(`Discogs bio: ${truncated}`);
}
if (params.geniusBio) {
  const truncated = params.geniusBio.slice(0, 400);
  parts.push(`Genius cultural context: ${truncated}`);
}
if (params.geniusSongDescriptions && params.geniusSongDescriptions.length > 0) {
  parts.push(`Notable song context:\n${params.geniusSongDescriptions.slice(0, 3).join('\n')}`);
}
```

---

## 6. Artist Enrichment Pipeline

### `src/hooks/useArtist.ts`

**New state:**

```typescript
const [discogsInfo, setDiscogsInfo] = useState<DiscogsArtistInfo | null>(null);
const [geniusInfo, setGeniusInfo] = useState<GeniusArtistInfo | null>(null);
```

**New return fields on `UseArtistReturn`:**

```typescript
discogsInfo: DiscogsArtistInfo | null;
geniusInfo: GeniusArtistInfo | null;
```

**New enrichment blocks** (added alongside Spotify, Last.fm, MusicBrainz in `enrichmentPromises`):

Discogs:
```
if (isDiscogsConfigured) {
  enrichmentPromises.push(async () => {
    const info = await searchDiscogsArtist(baseArtist.name);
    if (cancelled || !info) return;
    discogsData = info;  // capture for briefing
    setDiscogsInfo(info);
    cacheSet(`artist:discogs:${artistId}`, info, CacheTTL.DISCOGS, true);
    // Merge styles into tags
    if (info.styles.length > 0) {
      setArtist(prev => prev ? {
        ...prev,
        tags: [...new Set([...info.styles, ...prev.tags])].slice(0, 15),
        externalIds: { ...prev.externalIds, discogsId: String(info.discogsId) },
      } : prev);
    }
  });
}
```

Genius:
```
if (isGeniusConfigured) {
  enrichmentPromises.push(async () => {
    const info = await searchGeniusArtist(baseArtist.name);
    if (cancelled || !info) return;
    geniusData = info;  // capture for briefing
    setGeniusInfo(info);
    cacheSet(`artist:genius:${artistId}`, info, CacheTTL.GENIUS, true);
    // Also fetch top songs for briefing context
    const { getGeniusArtistTopSongs } = await import('./genius');
    const songs = await getGeniusArtistTopSongs(info.geniusId, 5);
    if (songs.length > 0) {
      geniusSongDescs = songs
        .filter(s => s.description)
        .map(s => `"${s.title}" — ${s.description!.slice(0, 150)}`);
    }
    setArtist(prev => prev ? {
      ...prev,
      externalIds: { ...prev.externalIds, geniusId: String(info.geniusId) },
    } : prev);
  });
}
```

**Updated AI Briefing call** — after `Promise.allSettled(enrichmentPromises)`:

```typescript
const briefing = await generateArtistBriefing(artistId, {
  name: currentArtist.name,
  genres: currentArtist.genres,
  tags: currentArtist.tags,
  spotifyPopularity: currentArtist.spotifyData?.popularity,
  topTrackNames: currentArtist.spotifyData?.topTracks?.map(t => t.name),
  lastfmBio: lfmInfo?.bio,
  listenerCount: lfmInfo?.listeners,
  // New fields
  discogsBio: discogsData?.profile,
  discogsStyles: discogsData?.styles,
  discographyHighlights: discogsData?.discography
    ?.filter(r => r.role === 'Main' && r.year)
    .slice(0, 8)
    .map(r => `${r.title} (${r.year}${r.label ? ', ' + r.label : ''})`),
  geniusBio: geniusData?.description,
  geniusSongDescriptions: geniusSongDescs,
});
```

**Cache restoration** — add to the cached-artist early return:

```typescript
const cachedDiscogs = cacheGet<DiscogsArtistInfo>(`artist:discogs:${artistId}`, true);
if (cachedDiscogs) setDiscogsInfo(cachedDiscogs);
const cachedGenius = cacheGet<GeniusArtistInfo>(`artist:genius:${artistId}`, true);
if (cachedGenius) setGeniusInfo(cachedGenius);
```

---

## 7. Setlist Enrichment Pipeline

### Where: `src/hooks/useCreateStub.ts` (or wherever Stub save logic lives)

After writing the Stub to Firestore, fire-and-forget a setlist enrichment pass:

```typescript
async function enrichSetlistWithGenius(
  stubId: string,
  songs: SetlistSong[],
  artistName: string,
): Promise<void> {
  if (!isGeniusConfigured || songs.length === 0) return;

  const enrichedSongs = await Promise.all(
    songs.map(async (song) => {
      try {
        const match = await searchGeniusSong(song.title, artistName);
        if (!match) return song;
        return {
          ...song,
          geniusId: match.geniusId,
          geniusSongDescription: match.description?.slice(0, 200),
          geniusUrl: match.geniusUrl,
        };
      } catch {
        return song; // best-effort per song
      }
    }),
  );

  // Only update if at least one song was enriched
  const hasEnrichment = enrichedSongs.some(s => s.geniusId != null);
  if (!hasEnrichment) return;

  // Batch update the Stub document in Firestore
  await updateDoc(doc(db, 'stubs', stubId), {
    'setlist.songs': enrichedSongs,
  });
}
```

**Invocation:** Called after `addDoc()` returns the new Stub ID. Non-blocking — the UI navigates to the Stub view immediately. Enriched data appears on next load.

---

## 8. `.env.example` Update

Add under `# Music APIs`:

```
VITE_DISCOGS_TOKEN=
VITE_GENIUS_ACCESS_TOKEN=
```

---

## Data Flow Summary

### Artist Page Load

```
useArtist(artistId)
  ├── [cache hit?] → return immediately with all cached data
  │
  ├── [cache miss] → load base artist, show UI immediately, then:
  │
  ├── Promise.allSettled([
  │     Spotify   → images, popularity, top tracks, audio features
  │     Last.fm   → bio, tags, similar artists, listener stats
  │     MusicBrainz → MBID, sort name, country, community tags
  │     Discogs   → styles, discography, labels, alt bio        [NEW]
  │     Genius    → cultural bio, top song descriptions          [NEW]
  │   ])
  │
  └── generateArtistBriefing({
        ...existing fields,
        discogsBio, discogsStyles, discographyHighlights,        [NEW]
        geniusBio, geniusSongDescriptions,                       [NEW]
      })
      → AI briefing with richer cultural context
```

### Stub Save

```
useCreateStub.save(stubData)
  ├── addDoc(stubs, stubData)  → returns stubId (immediate)
  │
  └── enrichSetlistWithGenius(stubId, setlist.songs, artistName)
        → For each song: searchGeniusSong(title, artistName)
        → Batch update Stub with geniusId, description, URL
        → Viewer sees "Did you know?" cards on next load
```

---

## Error Handling

All enrichment is best-effort. Pattern matches existing codebase:
- Each enrichment promise is wrapped in try/catch, logs to console.warn, returns gracefully
- `Promise.allSettled()` ensures one failing API doesn't block others
- Missing API keys skip enrichment entirely (checked via `isDiscogsConfigured` / `isGeniusConfigured`)
- Rate limits enforced via existing `apiFetch()` + `rateLimitDomain` mechanism
- Setlist enrichment failures are per-song — one failed lookup doesn't prevent others
