# Phase 1 Gaps — Design Spec

**Date:** 2026-03-25
**Scope:** Four features completing Phase 1 of The Stub Live

---

## 1. Photo Upload in Stub Creation

### Summary
Users can attach up to 10 photos when creating a Stub. Photos are compressed client-side before upload and stored in Firebase Cloud Storage.

### Flow
1. Step 2 of the create wizard gets a photo upload zone (drag-drop + file picker)
2. Client-side compression: canvas resize to max 1920px wide, JPEG at 0.8 quality
3. Photos held in component state as `File[]` with preview thumbnails
4. On publish (final step), upload all photos to Cloud Storage at `stubs/{stubId}/{photoId}.jpg`
5. Download URLs written to the stub document's `photos` array in Firestore

### Constraints
- Max 10 photos per stub — UI disables the add button at 10 with a message "Maximum 10 photos"
- Max 10MB per file (pre-compression) — reject with toast on selection
- Supported formats: JPEG, PNG, WebP — **no HEIC** (avoiding browser compat complexity)

### Upload Error Handling
- If any upload fails, retry once. If still failing, publish the stub with whatever photos succeeded and show a toast: "Some photos failed to upload"
- Never block stub creation on photo upload failure

### Type Alignment
Uses the existing `StubPhoto` interface from `src/types/stub.ts`:
```typescript
interface StubPhoto {
  url: string;
  caption?: string;
  timestamp?: Timestamp;
}
```
Add `storageRef: string` to this interface for cleanup/deletion support.

### New Files
- `src/services/firebase/storage.ts` — `compressImage(file, maxWidth, quality)` and `uploadStubPhotos(stubId, files[])` returning `StubPhoto[]`
- `storage.rules` — **new file** (does not exist yet). Auth users can write to `stubs/{stubId}/*`, public read for published stubs.
- `firebase.json` — add `"storage": { "rules": "storage.rules" }` to wire up the new rules file

### Modified Files
- `src/features/journal/CreateStubPage.tsx` — Step 2 gets photo upload UI; `handlePublish()` updated to call `uploadStubPhotos()` and include `photos` array in Firestore write
- `src/types/stub.ts` — add `storageRef?: string` to `StubPhoto`
- `src/features/journal/StubDetailPage.tsx` — render photo gallery

### Accessibility
- Photo remove buttons get `aria-label="Remove photo {index}"`
- File picker keyboard-accessible

---

## 2. Narrative Editor (Step 4)

### Summary
Wire up Step 4 with state management, prompt chip interactions, and character count.

### Design
- Textarea is currently uncontrolled — add `narrative` state variable and wire `value`/`onChange`
- Warm `stub-surface` background, generous padding, `font-body`, 12 rows tall
- Character count below textarea: subtle muted text showing `{count} / 2,000`. Text turns `text-stub-amber` at 1,800+ chars, `text-stub-coral` at 2,000+. No hard limit — purely visual guidance.
- **Use the existing prompt text** already in the codebase:
  - "What's the one moment you'll tell people about?"
  - "How did the energy shift throughout the set?"
  - "Was there a song that hit different live?"
- Tapping a chip: if textarea is empty, inserts prompt as opener. If text exists, appends on a new line with a blank line separator.
- `narrative.body` stores raw text. `narrative.aiPromptResponses` stays `[]` (future feature).

### Integration with handlePublish
Add `narrative` to the Firestore write payload:
```typescript
narrative: narrative.trim() ? { body: narrative.trim(), aiPromptResponses: [] } : undefined
```

### Modified Files
- `src/features/journal/CreateStubPage.tsx` — Step 4 state + UI

### No new dependencies or files needed.

### Accessibility
- Textarea gets `aria-label="Concert story"` and character count linked via `aria-describedby`

---

## 3. Setlist Entry + setlist.fm Import

### Summary
Wire up the setlist entry UI in Step 3 with manual song input and setlist.fm auto-import.

### Manual Entry
- Numbered song inputs with add/remove buttons
- "Add Song" button at bottom appends a new empty input
- Encore toggle per song (small amber badge, tappable)
- Up/down arrow buttons for reorder (no drag library)

### setlist.fm Import
- "Import from setlist.fm" button triggers lookup using artist name + event date from Step 1
- Uses existing `searchSetlists()` from `src/services/api/setlistfm.ts`
- **Match logic:** Call `searchSetlists(artistName)`, iterate results, parse the setlist.fm date (DD-MM-YYYY format) and compare to the event date (same calendar day). First match wins. Artist name comparison is case-insensitive.
- **Loading state:** Button shows spinner + "Searching..." during fetch
- If match found: populate all songs, set `source: 'setlistfm'`, user can edit after
- If no match: show toast "No setlist found for this show yet"

### Type Alignment — Uses Existing Types
The codebase already defines these in `src/types/stub.ts`:
```typescript
interface SetlistSong {
  title: string;       // NOT "name"
  encore: boolean;
  notes?: string;
  isCover: boolean;
  originalArtist?: string;
}
type SetlistSource = 'setlistfm' | 'user' | 'ai_assisted';  // NOT "manual"
```
Use `'user'` (not `'manual'`) for manually entered setlists.

### Integration with handlePublish
Add `setlist` to the Firestore write payload:
```typescript
setlist: songs.length > 0 ? { songs, source: setlistSource, setlistfmId } : undefined
```

### Modified Files
- `src/features/journal/CreateStubPage.tsx` — Step 3 state + UI + import logic

### Accessibility
- Reorder buttons: `aria-label="Move song {title} up/down"`
- Remove buttons: `aria-label="Remove song {title}"`
- Keyboard navigation through song list

---

## 4. Reactions/Comments Auth Gating + AI Briefings

### 4a. Reactions & Comments Auth Gating

#### Summary
The components exist and partially gate on auth. Fix: replace silent failures with visible sign-in prompts.

#### Specific Changes
- **ReactionBar:** Line 36 currently does `if (!currentUserId) return;` silently. Replace with showing an inline message: "Sign in to react" with a `<Link to="/login">` styled as a subtle text link. Keep existing optimistic update + rollback logic (already implemented in catch block).
- **CommentSection:** Lines 100-103 show an empty state for no comments. When user is not authenticated, show "Sign in to join the conversation" with login link *where the input field would be* (lines 146+). When authenticated, show the input as it currently works.

#### Modified Files
- `src/components/stub/ReactionBar.tsx`
- `src/components/stub/CommentSection.tsx`

### 4b. AI Artist Briefings via Cloud Function

#### Summary
Move Claude API calls from the browser to a Firebase Cloud Function (v2). Artist pages check Firestore for a cached briefing; if none exists, call the function to generate one.

#### Cloud Function: `generateArtistBriefing`
- **Type:** v2 `onCall` (uses `firebase-functions/v2/https`) — deliberate deviation from existing `onRequest` proxy pattern since this is an authenticated callable, not a CORS proxy
- **Runtime:** Node 20 (matches existing functions)
- **Language:** Plain JS (matches existing `functions/index.js` pattern)
- **Input:** `{ artistId, name, genres[], tags[], spotifyPopularity?, lastfmBio?, topTrackNames?, listenerCount? }` — matches the existing `BriefingParams` shape from `src/services/ai/briefings.ts` (uses `name`, not `artistName`, to stay aligned with client code)
- **Process:**
  1. Check `briefings/{artistId}` in Firestore — if exists and `generatedAt` < 30 days old, return cached
  2. Check `generating` lock — if `true` and `generatedAt` < 5 minutes ago, return `{ status: 'generating' }`. If lock is stale (>5 min), treat as expired and proceed.
  3. Set `generating: true` in Firestore
  4. Build prompt using same logic as `src/services/ai/prompts.ts` (duplicated into function, not shared package — keeps it simple)
  5. Call Claude Sonnet 4 via raw `fetch` to `https://api.anthropic.com/v1/messages` (avoid adding Anthropic SDK dependency to functions)
  6. Parse JSON response, write briefing + `generatedAt` + clear `generating` flag
  7. Return briefing
- **API key:** Stored as Firebase Functions secret via `defineSecret('ANTHROPIC_API_KEY')` (v2 pattern)
- **Lock cleanup:** If function crashes, the `generating` flag has an implicit 5-minute TTL — subsequent requests after 5 minutes will ignore a stale lock.

#### Firestore Schema
```
briefings/{artistId}:
  artistId: string
  artistName: string
  briefingText: string        // JSON string with summary, soundDescription, liveReputation, forFansOf
  generatedAt: Timestamp
  generating: boolean
```

#### Security Rules
Add to `firestore.rules`: `briefings/{artistId}` readable by any authenticated user. Writes only happen via admin SDK (Cloud Function), which bypasses rules.

#### Client-Side Changes
- `src/services/ai/briefings.ts` — replace direct Claude API call with `httpsCallable('generateArtistBriefing')`. Remove client-side in-memory cache (Firestore is now the cache; the function handles cache checks).
- `src/features/artist/ArtistPage.tsx` — show loading skeleton while briefing generates (~10-15s for cold generation, instant for cached). Handle `{ status: 'generating' }` response by polling or showing "Briefing is being generated..."

#### New Files
- `functions/generateBriefing.js` — the Cloud Function (added as export in `functions/index.js`)

#### Modified Files
- `functions/index.js` — add `generateArtistBriefing` export
- `functions/package.json` — add `firebase-admin` (already there), no new deps needed
- `src/services/ai/briefings.ts` — switch to callable function
- `src/features/artist/ArtistPage.tsx` — update briefing fetch flow

---

## Cross-Cutting: handlePublish() Updates

The `handlePublish()` function in CreateStubPage currently writes a minimal payload. Features 1-3 all add data to this payload. The unified changes:

```typescript
// Current payload fields (keep):
artistName, venueName, rating, vibeRating, highlights, visibility, photoCount

// Add from Feature 1 (Photos):
photos: StubPhoto[]  // uploaded URLs from uploadStubPhotos()

// Add from Feature 2 (Narrative):
narrative: StubNarrative | undefined

// Add from Feature 3 (Setlist):
setlist: StubSetlist | undefined

// Also persist (already in StubData type but not in publish):
artistIds, venueId, date, companions, standoutSong
```

---

## Out of Scope
- Spotify integration (not doing)
- Map view (deferred)
- Rich text editor for narratives (simple textarea for now)
- Photo editing/cropping (upload as-is after compression)
- AI prompt responses in narrative (future feature)
- HEIC photo format support (avoiding browser compat complexity)
