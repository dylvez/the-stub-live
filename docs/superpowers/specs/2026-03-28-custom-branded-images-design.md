# Custom Branded Images Design

**Date:** 2026-03-28
**Status:** Approved

## Overview

Replace generic Lucide icons, emojis, and plain text links across the app with custom branded images that reinforce The Stub Live's concert ticket aesthetic. Platform logos (Spotify, Ticketmaster, etc.) will use official brand assets; all other images will be generated via the Gemini API using the existing `scripts/generate-images.cjs` pattern.

## Constraints

- All generated images use solid black (`#0A0A12`) backgrounds — no transparency
- Follow existing STYLE (flat illustrated, clean vector, bold geometric, no text) and PALETTE constants
- Platform logos downloaded as official SVGs/PNGs, not AI-generated
- Fix `PALETTE` constant: update `#FF4F6D` (rose-pink) to `#FF4F4F` (coral) and add `#8A8580` (muted) to match brand tokens

## Generation Dimensions

| Category | Generation Size | Display Size | Notes |
|---|---|---|---|
| Nav icons | 128x128 | 20-28px (`w-5`/`w-7`) | Bold silhouettes, minimal detail for clarity at small sizes |
| Section headers | 128x128 | 20px (`w-5 h-5`) | Simple recognizable shapes |
| Action icons | 128x128 | 16-20px | Clear at small size |
| Star ratings | 64x64 | 14-20px | Guitar pick is a simple shape |
| Star ratings (small) | 32x32 | 16px | Compact card variant |
| Empty states | 512x512 | ~200px display | Atmospheric illustrations, more detail OK |
| Loading spinner | 128x128 | 24-48px | Must be center-symmetric for CSS rotation |

## Image Inventory

### 1. Bottom Nav Icons — Heavily Themed (5 images)

Used in `src/components/layout/BottomNav.tsx`. User will compare against subtle set and pick one.

| Filename | Concept | Primary Color |
|---|---|---|
| `nav-home-heavy.png` | Venue marquee arch with lights | Amber #E8A838 |
| `nav-search-heavy.png` | Spotlight beam sweeping a stage | Cyan #4FC4FF |
| `nav-create-heavy.png` | Torn ticket stub with a "+" mark | Amber #E8A838 |
| `nav-stubs-heavy.png` | Stack of overlapping ticket stubs | Violet #7B68EE |
| `nav-askstub-heavy.png` | Stage sparkle / starburst | Cyan #4FC4FF |

### 2. Bottom Nav Icons — Subtly Themed (5 images)

Same usage as above. Clean geometric shapes with concert DNA.

| Filename | Concept | Primary Color |
|---|---|---|
| `nav-home-subtle.png` | Clean house shape with marquee arch top | Amber #E8A838 |
| `nav-search-subtle.png` | Magnifying glass with spotlight glow | Cyan #4FC4FF |
| `nav-create-subtle.png` | Simple stub outline with "+" | Amber #E8A838 |
| `nav-stubs-subtle.png` | Single clean ticket stub icon | Violet #7B68EE |
| `nav-askstub-subtle.png` | Clean sparkle/star shape | Cyan #4FC4FF |

**Active/inactive handling:** Generate one set per style. Active state shown at full opacity; inactive state rendered with CSS `opacity-50 grayscale` filter. No separate image variants needed — the Lucide icons currently use `strokeWidth` changes which are too subtle to warrant separate PNGs.

### 3. Discovery Section Header Icons (4 images)

Used in `src/features/discovery/SearchPage.tsx` for section headers.

| Filename | Concept | Primary Color | Replaces |
|---|---|---|---|
| `section-trending.png` | Flame chart / rising heat lines | Coral #FF4F4F | `TrendingUp` Lucide icon |
| `section-radar.png` | Radar/sonar pulse rings | Cyan #4FC4FF | `Radio` Lucide icon |
| `section-new-to-town.png` | Suitcase with guitar neck poking out | Amber #E8A838 | `MapPin` Lucide icon |
| `section-discover.png` | Binoculars with stage light reflections | Cyan #4FC4FF | `Sparkles` Lucide icon |

### 4. Empty State Illustrations (5 new images)

Added to the existing set of 3 (`empty-no-stubs`, `empty-no-results`, `empty-no-shows`).

| Filename | Concept | Primary Colors | Context |
|---|---|---|---|
| `empty-no-feed.png` | Dark concert hall with no crowd | Violet/Amber | Empty social feed (FeedPage) |
| `empty-artist-notfound.png` | Broken guitar pick | Coral #FF4F4F | Artist 404 (ArtistPage) |
| `empty-venue-notfound.png` | Closed venue door, "dark tonight" vibe | Violet #7B68EE | Venue 404 (VenuePage) |
| `empty-user-notfound.png` | Empty spotlight on an empty seat | Cyan #4FC4FF | User 404 (UserProfilePage) |
| `empty-no-setlists.png` | Blank setlist paper on a stage floor | Amber #E8A838 | No setlists found (ArtistPage) |

### 5. Action Icons (3 images)

Used on primary interaction buttons across EventCard, StubCard, etc.

| Filename | Concept | Primary Color | Replaces |
|---|---|---|---|
| `action-stub-it.png` | Pen writing on a ticket stub | Amber #E8A838 | `PenTool` Lucide icon |
| `action-share.png` | Concert ticket being handed forward | Cyan #4FC4FF | `Share2` Lucide icon |
| `action-save.png` | Ticket slipped into a pocket/collection | Violet #7B68EE | `Bookmark` Lucide icon |

### 6. Loading Spinner (1 image)

Static frame animated via CSS `rotate` animation. **Must be center-symmetric** — the vinyl record groove highlight should be concentric, not off-center, so the rotation looks smooth.

| Filename | Concept | Primary Color | Replaces |
|---|---|---|---|
| `loading-spinner.png` | Vinyl record with concentric groove pattern, centered spindle hole, amber highlight on grooves | Amber #E8A838 | `Loader2` Lucide icon |

### 7. Star Rating — Guitar Pick Style (5 images)

Used in `StarRating` component within StubCard and stub detail views.

| Filename | Concept | Primary Color | Replaces |
|---|---|---|---|
| `star-filled.png` | Guitar pick shape, fully filled | Amber #E8A838 | Lucide `Star` (filled) |
| `star-half.png` | Guitar pick shape, left half filled amber, right half outline only | Amber #E8A838 | Lucide `Star` (half) |
| `star-empty.png` | Guitar pick shape, outline only | Muted #8A8580 | Lucide `Star` (empty) |
| `star-filled-small.png` | Same as star-filled at 32x32 | Amber #E8A838 | — |
| `star-empty-small.png` | Same as star-empty at 32x32 | Muted #8A8580 | — |

### 8. Platform Logos — Official Assets (~16 files)

Downloaded from official brand resource pages. Saved to `public/images/platform-*.svg` (or `.png`). Rendered via `<img>` tags (not inline SVG) — no CSS fill/color manipulation needed.

**Social platforms (7):**
- `platform-instagram.svg` — Instagram
- `platform-x.svg` — X / Twitter
- `platform-facebook.svg` — Facebook
- `platform-tiktok.svg` — TikTok
- `platform-threads.svg` — Threads
- `platform-spotify.svg` — Spotify
- `platform-youtube.svg` — YouTube

**Ticket platforms (6):**
- `platform-ticketmaster.svg` — Ticketmaster
- `platform-seatgeek.svg` — SeatGeek
- `platform-eventbrite.svg` — Eventbrite
- `platform-axs.svg` — AXS
- `platform-dice.svg` — DICE
- `platform-stubhub.svg` — StubHub

**Music data platforms (3):**
- `platform-setlistfm.svg` — setlist.fm
- `platform-bandsintown.svg` — Bandsintown
- `platform-lastfm.svg` — Last.fm

## Implementation Approach

### Phase 1: Generate Images
1. Fix `PALETTE` constant: update coral to `#FF4F4F`, add muted `#8A8580`
2. Add all 28 custom image prompts to the `IMAGES` array in `scripts/generate-images.cjs`
3. All prompts use `STYLE` + `PALETTE` prefixes with explicit dimension callouts and "black background #0A0A12"
4. Nav and action icon prompts emphasize "bold silhouette, minimal detail" for clarity at small sizes
5. Run `node scripts/generate-images.cjs` to generate missing images
6. User reviews generated images and re-runs `--only=filename.png` for any that need regeneration

### Phase 2: Download Platform Logos
1. Download official brand assets from each platform's press/brand page
2. Save as SVGs where available, PNGs otherwise
3. Store in `public/images/platform-*.{svg,png}`

### Phase 3: Integrate into Components

#### BottomNav (`src/components/layout/BottomNav.tsx`)
- Change `navItems` data structure: replace `icon: LucideIcon` with `iconPath: string` pointing to the chosen nav image set
- Render `<img>` with `w-5 h-5` (or `w-7 h-7` for create)
- Active state: full opacity. Inactive state: `className="opacity-50 grayscale"`
- Retain Lucide imports as fallback until images are confirmed working
- Alt text: use the `label` value (e.g., `alt="Home"`, `alt="Search"`)

#### SearchPage section headers
- Replace Lucide icon components with `<img>` tags using section images
- Size: `w-5 h-5` to match current icon sizing
- Alt text: section name (e.g., `alt="Trending"`)

#### EventCard/StubCard action buttons
- Replace Lucide icons in action buttons with custom action images
- Alt text: action name (e.g., `alt="Stub It"`, `alt="Share"`, `alt="Save"`)

#### StarRating component
- Replace Lucide Star with guitar pick images
- Fallback: retain Lucide Star if image fails to load

#### Loading states
- Create `BrandedSpinner` component in `src/components/ui/`
- Render vinyl record image with `animate-spin` Tailwind class
- Alt text: `alt="Loading"`

#### Empty states
- Add the 5 new empty state images to their respective pages
- Follow existing pattern from `empty-no-stubs` usage
- Alt text: descriptive (e.g., `alt="No upcoming shows found"`)

#### ProfilePage social links
- Replace emoji prefixes with platform logo `<img>` tags at `w-4 h-4`
- Alt text: platform name

#### SearchResults/EventCard source badges
- Replace text badges with small platform logos at `w-4 h-4`

#### EventCard ticket links
- Add platform logo next to "Get Tickets" links at `w-4 h-4`

### Accessibility

All `<img>` tags must include meaningful `alt` text. Pattern:
- Nav icons: `alt="{label}"` (Home, Search, Stub It, My Stubs, Ask Stub)
- Action icons: `alt="{action}"` (Stub It, Share, Save)
- Section headers: `alt="{section name}"`
- Empty states: `alt="{descriptive message}"`
- Platform logos: `alt="{platform name}"`
- Star ratings: `alt="{N} of 5"` on the container, individual picks `alt=""`  (decorative)
- Loading spinner: `alt="Loading"` with `role="status"`

### Fallback Behavior

All image-based icons retain their current Lucide icon or emoji as a fallback. Pattern from `ReactionIcon`:
- Attempt to render `<img>`
- On error or missing path, render the original Lucide component or emoji
- Lucide imports stay in the codebase until full image coverage is confirmed

## Totals

| Category | Count | Source |
|---|---|---|
| Nav icons (heavy) | 5 | Gemini |
| Nav icons (subtle) | 5 | Gemini |
| Section headers | 4 | Gemini |
| Empty states | 5 | Gemini |
| Action icons | 3 | Gemini |
| Loading spinner | 1 | Gemini |
| Star ratings | 5 | Gemini |
| Platform logos | 16 | Official assets |
| **Total** | **44** | — |
| **Gemini-generated** | **28** | — |
