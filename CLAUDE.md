# CLAUDE.md — The Stub Live

## Project Overview
**The Stub Live** (thestub.live) is a live music companion PWA connecting discovery, journaling, and social sharing for concert-goers. React + TypeScript + Firebase + Perplexity AI API. See THE-STUB-LIVE-SPEC.md for the full product specification.

## Quick Reference

### What This App Does
1. **Discovery Engine** — Find upcoming shows, explore artists via rich media dossiers with AI-synthesized briefings
2. **Concert Journal** — Create "Stubs" (the core data object) to capture and narrate concert experiences with structured data, setlists, photos, and freeform storytelling
3. **Recommendation Layer** — AI-powered "what should I see?" via conversational chat and algorithmic scoring based on attendance history (not just streaming)
4. **Venue Profiles** — Venues as first-class entities with history, accessibility info, and community notes
5. **Social Layer** — Friends, activity feeds, shared experiences, reactions
6. **Analytics** — Personal concert stats, genre distribution, year-in-review

### The "Stub" Is Everything
The **Stub** is the atomic unit of this app. It's a user's record of a concert they attended — the digital evolution of a ticket stub. Every Stub contains structured data (artist, venue, date, ratings, vibe scores), a setlist, a freeform narrative, photos, and social engagement (reactions, comments). The entire app orbits the Stub: discovery leads to creating Stubs, Stubs feed the recommendation engine, Stubs populate the social feed, Stubs generate analytics. When in doubt about product decisions, ask: "Does this make the Stub better?"

## Tech Stack
- **React 18+** with TypeScript (strict mode)
- **Vite** for build tooling
- **Tailwind CSS** for styling (custom design tokens, no CSS modules)
- **Framer Motion** for animations
- **React Router v6** for navigation
- **Firebase**: Auth, Cloud Firestore, Cloud Storage, Cloud Functions, Hosting
- **Perplexity AI API** (sonar-pro) for AI features
- **PWA-enabled** with service worker for offline support

## File Structure
```
the-stub-live/
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
├── src/
│   ├── components/          # Shared UI components
│   │   ├── ui/              # Primitives (Button, Card, Input, Modal, etc.)
│   │   ├── layout/          # Shell, Nav, Sidebar, etc.
│   │   └── stub/            # Stub card component (THE core visual element)
│   ├── features/
│   │   ├── discovery/       # Event feed, search, explore, map view
│   │   ├── artist/          # Artist dossier, AI briefings, media tabs
│   │   ├── journal/         # Stub creation wizard, display, archive ("My Stubs")
│   │   ├── social/          # Activity feed, profiles, follow system, reactions
│   │   ├── recommendations/ # Taste profile, AI chat ("Ask Stub"), scoring
│   │   ├── venues/          # Venue profiles, notes, accessibility
│   │   └── analytics/       # Stats dashboard, "Your Year Live"
│   ├── hooks/               # Custom hooks (useAuth, useStubs, useEvents, etc.)
│   ├── services/
│   │   ├── firebase/        # Firebase config, Firestore helpers, security rules
│   │   ├── api/             # External API integrations (Spotify, Bandsintown, etc.)
│   │   └── ai/              # Claude API service layer
│   ├── types/               # TypeScript type definitions (stub.ts, event.ts, etc.)
│   ├── utils/               # Helpers, formatters, constants
│   ├── contexts/            # React contexts (AuthContext, ThemeContext, etc.)
│   ├── styles/              # Tailwind config extensions, global styles
│   ├── App.tsx
│   └── main.tsx
├── functions/               # Firebase Cloud Functions
│   ├── src/
│   │   ├── enrichment/      # Artist/venue data enrichment pipelines
│   │   ├── recommendations/ # Taste profile computation, scoring
│   │   ├── ingestion/       # Event ingestion from external APIs
│   │   └── ai/              # Claude API calls (briefings, prompts, reasoning)
│   └── index.ts
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── .env.local               # API keys (NEVER committed)
├── .env.example             # Template for required env vars
├── CLAUDE.md                # This file
├── THE-STUB-LIVE-SPEC.md    # Full product specification
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Code Style

### TypeScript
- Strict mode enabled
- Explicit return types on exported functions
- Interface over type for object shapes (except unions/intersections)
- Avoid `any` — use `unknown` and narrow

### React
- Functional components with hooks only (no class components)
- Custom hooks for shared/reusable logic (prefix with `use`)
- Barrel exports from feature directories (`index.ts` re-exports)
- Co-locate component, hook, and test files within features
- Prefer composition over prop drilling — use contexts for cross-cutting concerns

### Styling
- Tailwind CSS utility classes
- Custom design tokens in tailwind.config.ts for brand colors, fonts, spacing
- No CSS modules, no styled-components
- Dark mode is the default — use `dark:` prefix only for light mode overrides
- Responsive: mobile-first, breakpoints at sm/md/lg

### Naming
- Components: PascalCase (`StubCard.tsx`, `EventFeed.tsx`)
- Hooks: camelCase with `use` prefix (`useStubs.ts`, `useAuth.ts`)
- Utils: camelCase (`formatDate.ts`, `calculateTasteProfile.ts`)
- Types: PascalCase, suffixed where helpful (`StubData`, `EventFilters`)
- Firestore collections: camelCase (`stubs`, `users`, `events`, `venues`, `artists`)

### Environment Variables
All API keys go in `.env.local` (never committed). Prefix with `VITE_` for client-side access.
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_PERPLEXITY_API_KEY=
VITE_SPOTIFY_CLIENT_ID=
VITE_BANDSINTOWN_API_KEY=
VITE_TICKETMASTER_API_KEY=
VITE_YOUTUBE_API_KEY=
VITE_SETLISTFM_API_KEY=
VITE_LASTFM_API_KEY=
```

## Design Tokens

### Colors (Tailwind config)
```js
colors: {
  stub: {
    bg: '#0D0D0D',           // Primary background
    surface: '#1A1816',       // Card surfaces (warm dark)
    amber: '#E8A838',         // Primary accent (stage lights, warmth)
    coral: '#FF4F4F',         // Secondary accent (energy, heat)
    cyan: '#4FC4FF',          // Tertiary accent (discovery, exploration)
    text: '#F0EDE8',          // Primary text (warm off-white)
    muted: '#8A8580',         // Secondary text (worn ink)
    border: '#2A2724',        // Subtle borders
  }
}
```

### Typography
```js
fontFamily: {
  display: ['"Druk Wide"', '"Tusker Grotesk"', 'system-ui'],  // Bold headers, gig poster energy
  body: ['"Satoshi"', '"General Sans"', 'system-ui'],           // Clean, warm body text
  mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],  // Dates, venues, metadata (ticket feel)
}
```

### The Stub Card Component
This is the single most important visual element in the app. It should feel like a stylized concert ticket stub — not literally skeuomorphic, but carrying that DNA:
- Subtle torn/perforated edge detail on one side (CSS clip-path or SVG)
- Artist/venue/date laid out with ticket typography hierarchy
- Warm paper-grain texture overlay (subtle, not heavy)
- Hero photo with dramatic concert lighting treatment
- Expandable: compact card in feeds, full detail on tap
- Shareable: generates an OG image for social sharing

## Key Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Database | Cloud Firestore | Real-time sync, speed of development, Dylan's Firebase experience from Can I Go There |
| AI Model | Perplexity sonar-pro | Web-grounded AI with real-time search for accurate artist and concert information |
| Deployment | PWA on Firebase Hosting | Cross-platform, faster to ship than native, installable, offline-capable |
| Dark mode | Default | Concerts are dark; the app should feel native to that environment |
| Reactions | Emoji set (🔥🎶💀🤘❤️😭) | More expressive than binary likes, fits music culture |
| Auth | Firebase Auth (Google + Apple + email) | Minimum friction onboarding |
| State | React Context + Firestore real-time | Avoid Redux complexity; Firestore handles most shared state |
| Routing | Feature-based lazy loading | Each feature directory is a route chunk for performance |

## Testing
- **Vitest** for unit tests
- **React Testing Library** for component tests
- **Firebase Emulator Suite** for Firestore rules and Cloud Functions
- **Manual QA** for AI-generated content quality (briefings, prompts, recommendations)
- Coverage targets: 80%+ for services and hooks, lighter coverage for UI components

## Firestore Security Rules
- Users can only read/write their own user document
- Stubs: owner can CRUD; public stubs readable by anyone; friends-only stubs readable by followers
- Events, Artists, Venues: readable by all authenticated users; writable only by Cloud Functions
- Rate limiting on stub creation (prevent spam): max 10 per day per user
- Validate all writes against schema (required fields, field types, enum values)

## Implementation Order (Phase 1 Focus)
When starting this project, build in this order:
1. `vite` + `react` + `typescript` + `tailwind` scaffold
2. Firebase project config + Auth (Google sign-in)
3. Core types (`types/stub.ts`, `types/event.ts`, `types/artist.ts`, `types/venue.ts`, `types/user.ts`)
4. Firestore service layer (`services/firebase/`)
5. Brand identity: design tokens, fonts, StubCard component shell
6. Bandsintown API integration → event ingestion Cloud Function
7. Event feed (home screen) with basic filtering
8. Artist page with Spotify data (top tracks, images, genres)
9. Basic search
10. PWA manifest + service worker

## Notes for Claude Code

### About the Developer
Dylan is a product leader at a SaaS company who understands technology, data, and process deeply. He builds iteratively with comprehensive specs and clear phase gates. He is comfortable with Firebase (built Can I Go There on it), React, and TypeScript. He writes detailed specs designed for direct Claude Code handoff. Communicate concisely — he doesn't need hand-holding on concepts, just clear implementation guidance when asked.

### Common Patterns
- Dylan prefers spec-first, implement-second
- He'll often ask to build a specific phase or feature — reference THE-STUB-LIVE-SPEC.md for full context
- He values accessibility (WCAG 2.1 AA) — his other project is literally an accessibility review app
- When generating UI, lean into the brand identity hard — dark mode, warm amber accents, ticket stub aesthetic, concert photography vibes
- Firestore security rules should be written alongside data model implementation, not as an afterthought

### Don't
- Don't use Inter, Roboto, or system default fonts
- Don't use pure black (#000) or pure white (#FFF) — always use the warm brand values
- Don't create light/bright UI by default — dark mode is primary
- Don't over-abstract early — keep it simple until a pattern repeats 3+ times
- Don't skip TypeScript types — everything should be typed
