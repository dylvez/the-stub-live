# The Stub Live — Product Specification

## Brand

**Name**: The Stub Live
**Domain**: thestub.live
**Shorthand**: "Stub" — as in "I stubbed that show" or "Check my Stub"
**Tagline**: Your proof you were there.

**Defensive domains to register**:
- thestub.live (primary)
- thestublive.com (redirect)
- thestub.app (backup)

**Social handles to claim**: @thestublive everywhere (Instagram, X, TikTok, Bluesky, Threads, YouTube)

**Trademark filing**: Class 42 (SaaS) + Class 41 (entertainment services). "The Stub Live" in the context of concert discovery, journaling, and social sharing. Distinct from StubHub (Class 35, ticket resale marketplace).

---

## Vision

The Stub Live is the definitive live music companion — connecting the full lifecycle of **discover → explore → attend → remember → share**. No existing product owns the lived concert experience as a first-class data object that feeds back into discovery. The Stub Live does.

The core bet: concert-goers are underserved by fragmented tools (Bandsintown for listings, Spotify for streaming, Instagram for sharing, memory for everything else). The Stub Live unifies these into a single experience where every show you attend makes your next discovery smarter, and every story you tell deepens the community.

The name says it all: your ticket stub — that torn piece of proof you were in the room — brought to life. Alive with your story, your photos, your memory of the setlist, the crowd energy, the moment the lights went down. A living document of your life in live music.

---

## Architecture Overview

### Three Pillars (Equal Weight)

| Pillar | Core Experience | Key Differentiator |
|---|---|---|
| **Discovery Engine** | Find shows, explore artists via rich media dossiers | AI-synthesized artist briefings + taste-aware surfacing |
| **Concert Journal** | Capture and narrate your concert experiences | Structured "Stubs" with freeform storytelling + AI prompts |
| **Recommendation Layer** | "What should I see?" via conversational + algorithmic AI | Preference graph built from your actual concert history, not just streaming |

### Feature Extensions

- **Venue Profiles** — venues as first-class entities with history, character, accessibility info
- **Setlist Tracking** — actual songs played at shows, sourced from setlist.fm + user contributions
- **Streaming Integration** — Spotify/Apple Music listening data as a taste signal
- **Concert Analytics** — personal stats dashboard (shows/year, genre spread, venue frequency, artist repeats)
- **Full Social Layer** — friends, feeds, shared experiences, reactions

---

## Tech Stack

### Frontend
- **React 18+** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for utility styling + custom design tokens
- **Framer Motion** for animations and transitions
- **React Router v6** for navigation
- **PWA-enabled** — installable, offline-capable for concert venues with bad signal

### Backend / Infrastructure
- **Firebase**
  - Authentication (Google, Apple, email/password)
  - Cloud Firestore (primary datastore)
  - Cloud Storage (user photos, media)
  - Cloud Functions (API orchestration, data enrichment, scheduled jobs)
  - Firebase Hosting
- **Anthropic Claude API** (claude-sonnet-4-20250514)
  - Artist profile synthesis
  - Recommendation reasoning
  - Journal prompt generation
  - Ad-hoc conversational queries against user data

### External APIs
- **Bandsintown Artist Events API** — primary event discovery
- **Ticketmaster Discovery API** — supplemental events + venue data
- **Spotify Web API** — artist data, top tracks, audio features, user listening history
- **Apple Music API** (MusicKit JS) — artist catalog, user library (stretch)
- **setlist.fm API** — historical setlists by artist/venue/date
- **YouTube Data API v3** — live performance videos, official videos
- **MusicBrainz API** — canonical artist metadata, genre tagging, relationships
- **Songkick API** (if available) — additional event coverage
- **Instagram Basic Display API / oEmbed** — artist social content
- **Last.fm API** — supplemental genre/tag data, similar artists

### Data Enrichment Pipeline
Cloud Functions run on a schedule and on-demand to:
1. Ingest upcoming events for the user's metro area(s)
2. Enrich artist profiles with cross-API data (Spotify + MusicBrainz + YouTube + social)
3. Generate AI artist briefings via Claude API
4. Match user listening history against upcoming shows
5. Update venue profiles with show history

---

## Data Model

### Core Entities

```
User {
  id: string (Firebase Auth UID)
  displayName: string
  handle: string (unique, @-prefixed)
  avatar: string (storage URL)
  bio: string
  location: {
    city: string
    state: string
    lat: number
    lng: number
    radiusMiles: number (default 50)
  }
  musicPreferences: {
    genres: string[]
    moods: string[]
    freeformDescription: string  // "I like weird heavy stuff and jazz"
  }
  spotifyConnected: boolean
  spotifyRefreshToken: string (encrypted)
  appleMusicConnected: boolean
  stats: {
    totalShows: number
    totalVenues: number
    totalArtists: number
    memberSince: timestamp
  }
  following: string[] (user IDs)
  followers: string[] (user IDs)
  createdAt: timestamp
  updatedAt: timestamp
}

Artist {
  id: string (MusicBrainz MBID preferred, fallback generated)
  name: string
  sortName: string
  genres: string[]
  tags: string[] (more granular than genres — e.g., "math rock", "Afrobeat")
  images: {
    primary: string
    gallery: string[]
  }
  externalIds: {
    spotifyId: string
    musicbrainzId: string
    bandsintown: string
    songkickId: string
    youtubeChannelId: string
    instagramHandle: string
    bandcampUrl: string
    websiteUrl: string
  }
  aiBriefing: {
    summary: string          // 2-3 sentence hook
    soundDescription: string // "sounds like X meets Y"
    liveReputation: string   // what to expect at a show
    forFansOf: string[]      // similar artist names
    generatedAt: timestamp
    modelVersion: string
  }
  spotifyData: {
    popularity: number
    topTracks: Track[]
    audioFeatures: {         // averaged across top tracks
      energy: number
      valence: number
      danceability: number
      instrumentalness: number
    }
  }
  lastEnriched: timestamp
}

Venue {
  id: string
  name: string
  address: string
  city: string
  state: string
  lat: number
  lng: number
  capacity: number
  venueType: enum [arena, theater, club, bar, outdoor, festival, house, other]
  images: {
    primary: string
    gallery: string[]
  }
  externalIds: {
    bandsintown: string
    ticketmasterId: string
    songkickId: string
    googlePlaceId: string
  }
  accessibility: {
    wheelchairAccessible: boolean
    wheelchairSeating: string
    assistiveListening: boolean
    notes: string
  }
  stats: {
    totalShowsTracked: number
    topArtists: { artistId: string, count: number }[]
    genreBreakdown: { genre: string, percentage: number }[]
  }
  userNotes: string  // per-user, stored in subcollection
  lastUpdated: timestamp
}

Event {
  id: string
  artistIds: string[] (headliner first, then support)
  venueId: string
  date: timestamp
  doorsTime: timestamp
  showTime: timestamp
  endTime: timestamp
  status: enum [scheduled, cancelled, postponed, past]
  ticketUrl: string
  priceRange: { min: number, max: number, currency: string }
  ageRestriction: string
  source: string (which API provided this)
  externalIds: {
    bandsintown: string
    ticketmasterId: string
  }
  aiRecommendationScore: number  // per-user, computed
  aiRecommendationReason: string // per-user, computed
  lastUpdated: timestamp
}

Stub {
  id: string
  userId: string
  eventId: string (nullable — can create for shows not in our DB)
  artistIds: string[]
  venueId: string
  date: timestamp

  // Structured capture
  rating: number (1-5, optional)
  vibeRating: {
    energy: number (1-5)
    crowd: number (1-5)
    sound: number (1-5)
    intimacy: number (1-5)
  }
  companions: string[] (user IDs of friends who were there)
  highlights: string[] (short bullet moments)
  standoutSong: string
  
  // Setlist
  setlist: {
    songs: {
      title: string
      encore: boolean
      notes: string
      isCover: boolean
      originalArtist: string
    }[]
    source: enum [setlistfm, user, ai_assisted]
    setlistfmId: string
  }

  // Storytelling layer
  narrative: {
    body: string (rich text / markdown)
    aiPromptResponses: {
      prompt: string
      response: string
    }[]
  }
  
  // Media
  photos: {
    url: string
    caption: string
    timestamp: timestamp
  }[]
  
  // Social
  visibility: enum [public, friends, private]
  reactions: {
    userId: string
    type: enum [🔥, 🎶, 💀, 🤘, ❤️, 😭]
    timestamp: timestamp
  }[]
  comments: {
    userId: string
    body: string
    timestamp: timestamp
  }[]
  shares: number
  
  // Metadata
  createdAt: timestamp
  updatedAt: timestamp
  publishedAt: timestamp
}

// Feed item (denormalized for fast reads)
FeedItem {
  id: string
  type: enum [stub_published, friend_attending, recommendation, milestone]
  userId: string
  targetId: string (stub ID, event ID, etc.)
  preview: {
    title: string
    subtitle: string
    imageUrl: string
    snippet: string
  }
  timestamp: timestamp
}

// Taste Profile (computed, per-user)
TasteProfile {
  userId: string
  genreWeights: { genre: string, weight: number }[]     // from stubs + streaming
  venueTypePreferences: { type: string, weight: number }[]
  energyPreference: number      // avg from spotify audio features + vibe ratings
  adventurousness: number       // how often they see new artists vs repeats
  showFrequency: number         // shows per month, trailing 12mo
  topArtists: string[]          // by stub count
  topVenues: string[]           // by stub count
  neighborhoodPreferences: string[]
  lastComputed: timestamp
}
```

---

## Feature Specifications

### 1. Discovery Engine

#### 1.1 Event Feed (Home Screen)
- Default view: upcoming shows within user's radius, sorted by date
- Filter controls: date range, genre, venue, price range
- Each event card shows:
  - Artist name + primary image
  - Venue name + neighborhood
  - Date/time
  - Price range badge
  - "Match score" indicator (from recommendation layer)
  - Quick actions: bookmark, share, "I'm going"
- Pull-to-refresh, infinite scroll
- "Happening Tonight" featured section at top

#### 1.2 Artist Dossier (Deep Dive)
When a user taps an artist, they get a rich exploration page:

**Header Section**
- Hero image, name, genre tags
- AI Briefing card: 2-3 sentence hook + "sounds like" + live reputation
- Action buttons: Follow, Share, Spotify/Apple Music link

**Media Section (Tabbed)**
- **Listen** — Embedded Spotify player (top tracks), Bandcamp embed if available
- **Watch** — YouTube live performance videos (auto-queried: "{artist} live performance")
- **Social** — Instagram feed embed, latest posts

**Show History**
- Past setlists from setlist.fm
- Average setlist length, common openers/closers
- "Your history with this artist" if applicable

**Upcoming Shows**
- All scheduled events for this artist in user's area
- "Also on tour near you" for regional shows

**Community**
- Stubs from other users who've seen this artist
- Average community rating

#### 1.3 Search & Explore
- Full-text search across artists, venues, events
- Genre/mood browse pages
- "New to Town" — artists playing their first show in your market
- "Under the Radar" — low-Spotify-popularity artists with upcoming shows
- Map view of upcoming shows

### 2. Concert Journal

#### 2.1 Stub Creation Flow

**Step 1: Identify the Show**
- Search by artist, venue, or date
- Auto-match to known events in the database
- Manual entry if not found (artist name, venue, date)
- "I'm at a show right now" quick-start mode

**Step 2: Quick Capture (can be done at the show)**
- Rating (1-5 stars)
- Vibe sliders (energy, crowd, sound, intimacy)
- Highlight moments (quick-add chips)
- Standout song
- Photo upload (multi-select from camera roll)
- Tag companions (@mention friends)

**Step 3: Setlist (optional, can be added later)**
- Auto-import from setlist.fm if available
- Manual entry with autocomplete from artist's known songs
- Mark encores, covers, guests
- "I don't remember the full setlist" is fine — partial is encouraged

**Step 4: Storytelling (optional, can be added later)**
- Freeform rich text editor (markdown supported)
- AI-assisted prompts that adapt based on the show:
  - "What's the one moment you'll tell people about?"
  - "How did the energy shift throughout the set?"
  - "Was there a song that hit different live?"
  - "What was the crowd like? Any memorable characters?"
  - "How does this compare to the last time you saw them?"
  - For first-time artists: "Did they live up to what you expected?"
- Prompts are generated via Claude API, context-aware (knows the artist, venue, user's history)

**Step 5: Publish**
- Set visibility (public / friends / private)
- Preview card
- Share to feed + optional cross-post links (copy for Instagram stories, X, etc.)

#### 2.2 Stub Display
- Beautiful card layout styled as an evolved ticket stub — hero photo, date, venue, torn-edge aesthetic detail
- Expandable sections: highlights, setlist, narrative, media
- Social engagement: reactions (emoji set: 🔥🎶💀🤘❤️😭), comments
- "I was there too" button — links to another user's stub for the same show
- Shareable link (public stubs get a permalink at thestub.live/s/{id})

#### 2.3 Concert Archive ("My Stubs")
- Chronological timeline of all your stubs
- Filter by year, artist, venue, genre, rating
- "On This Day" memories
- Search within your archive
- Visual: stubs displayed like a collection — fanned out, overlapping, tactile

### 3. Recommendation Layer

#### 3.1 Taste Profile Computation
Inputs (weighted):
- **Stubs** (highest weight) — what you actually attend, how you rate it
- **Spotify/Apple Music** (medium weight) — listening patterns, saved artists
- **Explicit preferences** (medium weight) — stated genres, moods, freeform description
- **Browsing behavior** (low weight) — artists explored, events bookmarked
- **Social signals** (low weight) — what friends attend, overlapping taste

The taste profile is recomputed nightly via Cloud Function and on-demand after stub creation.

#### 3.2 Show Recommendations
Each upcoming event gets a per-user recommendation score (0-100) and a natural-language reason.

**Scoring Pipeline:**
1. Genre/tag affinity match
2. Audio feature similarity (Spotify audio features vs user's average)
3. Venue type preference match
4. Social signal boost (friends attending or interested)
5. Novelty bonus (haven't seen this artist before + adventurousness score)
6. Claude API reasoning pass — takes top candidates and generates human-readable "why" text

**Display:**
- "Recommended for You" carousel on home feed
- Match percentage badge on event cards
- Tap for full recommendation reasoning

#### 3.3 Conversational Discovery (AI Chat)
A chat interface where users can ask:
- "What should I see this weekend?"
- "Find me something heavy and weird in Richmond this month"
- "I'm in a jazz mood — what's coming up?"
- "Show me something I've never heard of"
- "My friend likes indie folk and I like metal — what show could we both enjoy?"

**Implementation:**
- Claude API with a system prompt containing:
  - User's taste profile (serialized)
  - Recent stubs (last 10)
  - Upcoming events in area (filtered to relevant window)
  - User's stated preferences
- Streaming response for conversational feel
- Inline event cards rendered within the chat response
- "Add to calendar" / "Bookmark" actions on recommended events

### 4. Venue Profiles

#### 4.1 Venue Page
- Hero image, name, address, capacity, type
- Map embed with directions
- Accessibility info section (wheelchair, hearing, notes)
- "The Vibe" — AI-generated description of the venue's character based on show history and user reviews
- Photo gallery (user-contributed)

#### 4.2 Venue History
- Timeline of tracked shows
- Genre breakdown chart
- Top artists who've played there
- "Your History Here" — your stubs from this venue

#### 4.3 Venue Notes (Per-User)
- Private notes: "Parking is bad, use the lot on 3rd" / "Sound is best stage left"
- Shared tips section (community-contributed)

### 5. Social Layer

#### 5.1 User Profiles
- Display name, handle, avatar, bio
- Public stats: shows attended, top genres, top venues, member since
- Stub feed (public stubs)
- "Taste DNA" visualization — genre/mood radar chart
- Follow/unfollow

#### 5.2 Activity Feed
- Chronological feed of followed users' activity:
  - Published stubs
  - "Going to" announcements
  - Milestones ("100th show!", "First jazz show!")
- Reaction and comment inline
- "Friends attending" callouts on event pages

#### 5.3 Shared Experiences
- When multiple users create stubs for the same event:
  - Auto-link stubs as "Shared Experience"
  - Combined view showing all perspectives
  - "We were both there" badge

#### 5.4 Social Discovery
- "People with Similar Taste" suggestions
- "Trending in Richmond" — most bookmarked/attended shows in your area
- "Friends' Top Shows This Month"

### 6. Concert Analytics Dashboard

#### 6.1 Personal Stats
- Shows attended (all time, this year, by month)
- Unique artists seen
- Unique venues visited
- Genre distribution (pie/donut chart)
- Shows by day of week
- Average rating over time
- Longest streak (consecutive weeks with a show)
- "New artist" vs "repeat artist" ratio
- Money spent estimate (if ticket price data available)

#### 6.2 Year in Review ("Your Year Live")
- Annual summary card (shareable, styled as an oversized concert ticket)
- Top artist, top venue, highest-rated show
- Genre journey — how your taste evolved
- Map of venues visited
- Total shows + comparison to previous year

#### 6.3 Comparisons
- Compare your stats with friends
- "You and [friend] have seen 12 of the same artists"

---

## AI Integration Specifications

### Claude API Usage Patterns

#### 1. Artist Briefing Generation
```
System: You are a music journalist writing concise, opinionated artist profiles for
concert-goers deciding what to see. Be specific about sound, not generic. Reference
comparable artists. Comment on live reputation if data exists.

Input context:
- Artist name and basic metadata
- Genre tags from MusicBrainz
- Spotify audio feature averages
- Top track names
- Recent setlist.fm data (if available)
- Any user reviews/stubs in our system

Output (JSON):
{
  "summary": "2-3 punchy sentences",
  "soundDescription": "sounds-like comparison",
  "liveReputation": "what to expect live",
  "forFansOf": ["artist1", "artist2", "artist3"]
}
```

#### 2. Show Recommendation Reasoning
```
System: You are a knowledgeable music friend helping someone decide what concerts
to attend. You know their taste deeply. Be conversational, specific, and honest —
if a match is only partial, say why it's still worth considering.

Input context:
- User taste profile
- Candidate event details
- Artist briefing
- User's history with this artist/genre/venue

Output: 2-3 sentence recommendation reason
```

#### 3. Journal Prompt Generation
```
System: You are helping a concert-goer capture their experience while it's fresh.
Generate 3-5 prompts that are specific to THIS show — reference the artist, venue,
and any context you have. Mix emotional and factual prompts. Be conversational,
not clinical.

Input context:
- Artist name and genre
- Venue name and type
- User's prior stubs for this artist (if any)
- User's rating and vibe scores (if already entered)

Output: Array of prompt strings
```

#### 4. Conversational Discovery
```
System: You are The Stub Live's AI concert advisor. You have access to the user's
taste profile, their concert history, and upcoming events in their area. Help them
find their next great show. Be opinionated. If they ask something vague, suggest
unexpected options. Always reference specific upcoming events with dates and venues.

Available context (injected per-request):
- User taste profile
- Last 10 stubs
- Upcoming events (filtered by user's area and date range)
- User's bookmarked events
- Friends' upcoming events

Output: Conversational response with embedded event references (structured for
inline card rendering)
```

---

## UI/UX Design Direction

### Brand Identity
The Stub Live is built on the metaphor of the **concert ticket stub** — a physical artifact that proves you were in the room. The entire visual language should evoke that tactile, analog, slightly worn quality, electrified by the energy of live performance.

### Aesthetic
- **Tone**: Gritty editorial meets warm personal archive — a well-loved gig poster collection meets a beautifully designed music magazine, with the warmth of a shoebox full of old ticket stubs
- **Dark mode primary** (concerts are dark), with light mode option
- **Typography**:
  - Display: A bold, slightly condensed face with character — think knockout, Druk, or Tusker Grotesk. Something that looks at home on a gig poster.
  - Body: A clean humanist sans — something warm but readable. Not Inter. Consider Satoshi, General Sans, or Cabinet Grotesk.
  - Accent: A monospaced or slab-serif for metadata (dates, venues, stats) — gives that ticket/receipt feel
- **Color palette**:
  - **Primary background**: Deep charcoal (#0D0D0D) with warm undertone, not pure black
  - **Card surfaces**: Slightly warm dark (#1A1816) — like aged paper in the dark
  - **Primary accent**: Warm amber/gold (#E8A838) — the color of stage lights, old paper, whiskey
  - **Secondary accent**: Electric coral (#FF4F4F) — the red of a live recording LED, energy, heat
  - **Tertiary accent**: Cool cyan (#4FC4FF) — discovery, exploration, the glow of a screen in a dark venue
  - **Text**: Off-white (#F0EDE8) — not pure white, slightly warm like aged ticket stock
  - **Muted text**: (#8A8580) — worn ink on an old stub
- **Stub card design**: The core visual element. Each stub should feel like a stylized ticket — subtle torn/perforated edge on one side, the artist/venue/date laid out like ticket typography, with the user's story and photos expanding below. Not literally skeuomorphic — evolved, digital-native, but with that DNA.
- **Photography forward**: big hero images, blur-behind overlays, concert photography aesthetic (high contrast, dramatic lighting, grain)
- **Texture**: Subtle paper grain overlay on cards. Not heavy — just enough to feel tactile.
- **Micro-interactions**: haptic feedback on reactions, smooth card transitions, parallax on scroll, torn-edge reveal animation when opening a stub
- **Iconography**: Custom, slightly hand-drawn feel — not generic material icons. Think Sharpie-on-a-setlist energy.

### Key Screens
1. **Home Feed** — event cards + friend activity interleaved, "Tonight" section pinned
2. **Explore** — search, browse genres, map view
3. **Artist Dossier** — full media + show history + AI briefing
4. **Event Detail** — full event info + recommendations + "who's going"
5. **Create Stub** — multi-step wizard with progressive disclosure
6. **Stub View** — rich display with social engagement, shareable permalink
7. **My Stubs** — timeline/grid of all stubs, collection aesthetic
8. **Venue Profile** — venue info + history + accessibility
9. **Profile** — user stats + public feed + taste DNA
10. **Your Year Live** — analytics dashboard + year in review
11. **AI Chat** — conversational discovery interface ("Ask Stub")
12. **Settings** — account, connections, preferences, privacy

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-3)
**Goal: Core data model + event ingestion + basic discovery**
- Firebase project setup (auth, Firestore, hosting)
- Data model implementation (Firestore collections + security rules)
- Bandsintown API integration — ingest events for Richmond metro
- Basic event feed with date/genre filtering
- Artist pages with Spotify data (top tracks, images)
- User auth (Google + email/password)
- Basic search
- PWA setup
- Brand identity implementation (fonts, colors, stub card component)

### Phase 2: Artist Exploration (Weeks 4-5)
**Goal: Rich artist dossiers that make you want to go to shows**
- YouTube API integration — live performance videos on artist pages
- MusicBrainz integration for canonical metadata + genre tagging
- setlist.fm integration — past setlists on artist pages
- Claude API artist briefing generation pipeline
- Instagram/social embed on artist pages
- Spotify audio feature ingestion for taste modeling

### Phase 3: Concert Journal (Weeks 6-8)
**Goal: Capture and narrate concert experiences**
- Stub creation flow (all 5 steps)
- Photo upload to Cloud Storage
- Setlist entry (manual + setlist.fm auto-import)
- Claude API journal prompt generation
- Rich text narrative editor
- Stub display component (the core visual — ticket stub aesthetic)
- My Stubs archive view (collection layout)
- Visibility controls (public/friends/private)
- Shareable permalinks (thestub.live/s/{id})

### Phase 4: Social Layer (Weeks 9-11)
**Goal: Friends, feeds, shared experiences**
- User profiles with public stats
- Follow/unfollow system
- Activity feed (followed users' stubs + events)
- Reactions (emoji set) + comments on stubs
- "I'm going" / "I was there" on events
- Companion tagging on stubs
- Shared experience linking (same event, multiple stubs)
- Open Graph meta tags for social sharing

### Phase 5: Recommendation Engine (Weeks 12-14)
**Goal: AI-powered "what should I see?"**
- Taste profile computation (Cloud Function)
- Spotify listening history integration (OAuth + data pull)
- Recommendation scoring pipeline
- Claude API recommendation reasoning
- "Recommended for You" carousel on home feed
- Conversational discovery chat interface ("Ask Stub")
- Friend-based recommendations ("friends are going")

### Phase 6: Venues + Analytics (Weeks 15-17)
**Goal: Venue profiles + personal concert stats**
- Venue profile pages with show history
- Venue accessibility information (bridge to Can I Go There data layer)
- Per-user venue notes
- Analytics dashboard — personal stats
- Genre distribution charts
- "Your Year Live" review card generation
- Concert map (all venues you've been to)

### Phase 7: Polish + Scale (Weeks 18-20)
**Goal: Production-ready, delightful, shareable**
- UI polish pass — animations, transitions, loading states
- Performance optimization (Firestore indexes, query optimization, caching)
- Offline support (service worker, cached event data)
- Push notifications (show reminders, friend activity, recommendations)
- Apple Music integration (stretch)
- Social sharing optimization (OG tags, share cards with stub preview)
- Onboarding flow (connect Spotify, set location, import past shows)
- Error handling + edge cases
- WCAG 2.1 AA compliance audit

---

## API Key Requirements

| Service | Key Type | Free Tier | Notes |
|---|---|---|---|
| Firebase | Project config | Spark plan (generous) | Upgrade to Blaze for Cloud Functions |
| Anthropic Claude | API key | Pay-per-use | Sonnet 4 for all AI features |
| Spotify | Client ID + Secret | Free | Requires OAuth for user data |
| Bandsintown | API key | Free for non-commercial | Apply at artists.bandsintown.com |
| Ticketmaster | API key | Free (5 req/sec) | developer.ticketmaster.com |
| YouTube Data API | API key | Free (10k units/day) | Google Cloud Console |
| setlist.fm | API key | Free | api.setlist.fm |
| MusicBrainz | No key needed | Rate limited (1 req/sec) | musicbrainz.org/doc/MusicBrainz_API |
| Last.fm | API key | Free | last.fm/api |

---

## Resolved Decisions

1. **App name**: The Stub Live (thestub.live)
2. **Monetization**: Build first, figure it out later. When ready: freemium with premium tier (advanced analytics, unlimited AI chat, ad-free, custom stub themes).
3. **Festival support**: Defer to v2. Multi-day/multi-stage events are structurally different. For v1, users can create individual stubs per day/stage.
4. **Accessibility**: WCAG 2.1 AA compliant from day one. Venue accessibility data is a feature, not just an obligation. Natural bridge to Can I Go There data layer.
5. **Content moderation**: Claude-assisted moderation for user-generated narratives and comments. Flag + human review queue. Community reporting.

## Open Questions

1. **Setlist.fm licensing**: Their API ToS needs review — some restrictions on data display.
2. **Spotify OAuth scope**: Need `user-top-read`, `user-library-read`, `user-read-recently-played`. Privacy implications to communicate clearly in onboarding.
3. **Historical import**: Should users be able to bulk-import past shows from Spotify listening history or setlist.fm attendance? Could seed the archive with years of data. Significant onboarding value but complex implementation.
4. **Can I Go There data bridge**: Define the API contract and data sharing model between Stub venue accessibility data and CIGT's accessibility review system.
