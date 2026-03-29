# Stub Edit & "Going → Attended" Transition

## Problem

Two critical gaps in the stub lifecycle:

1. **Editing is broken.** StubDetailPage navigates to `/create?editId={id}` but CreateStubPage ignores the `editId` param. The form doesn't pre-populate; saving creates a duplicate.
2. **No "going → attended" transition.** Users who mark "going" to a future event have no prompt to fill in their experience after the event happens. The "going" stub sits permanently incomplete.

Both of these block the core product concept: signal intent for upcoming shows, then capture your experience afterward.

## Design

### 1. Edit Mode in CreateStubPage

**Entry:** `editId` URL param triggers edit mode.

**On mount with editId:**
- Fetch stub document from Firestore `stubs/{editId}`
- Validate ownership (`stub.userId === user.uid`)
- Pre-populate all form state from the fetched document:
  - `selectedShow`: reconstructed from stub's `artistName`, `venueName`, `date`, `eventId`, `artistImage`
  - `rating`, `vibeRating`, `highlights`, `companions` (joined back to comma string)
  - `setlistSongs`: from `stub.setlist.songs`
  - `narrative`: from `stub.narrative.body`
  - `visibility`: from `stub.visibility`
  - `existingPhotos`: array of `{ url, storageRef, caption }` displayed as read-only thumbnails
- Skip the identify step — start at capture (post-event) or going (pre-event)
- Determine post-event vs pre-event based on the stub's event date vs now

**Photo handling in edit mode:**
- Existing photos render as thumbnails from their URLs (no re-upload)
- Users can mark existing photos for removal (tracked in `photosToDelete: string[]` by storageRef)
- Users can add new photos (same upload flow as create)
- On save: upload new photos, delete removed photos from Cloud Storage, merge into final photos array

**Save behavior:**
- Use `setDoc(doc(db, 'stubs', editId), updatedData, { merge: true })` — updates in place
- Set `updatedAt: Timestamp.now()`
- If transitioning from `going` to `attended`, set `status: 'attended'`
- Navigate to `/stub/{editId}` after save

**UI changes in edit mode:**
- Page heading: "Edit Stub" instead of implicit "Create"
- Publish button: "Update Stub" instead of "Publish Stub"
- Progress bar starts at step 2 (capture) not step 1 (identify)

### 2. "Going → Attended" Banner on MyStubsPage

**Data:** Filter the already-fetched stubs list for `status === 'going'` AND `date` is in the past.

**Banner rendering (above the filter controls, below stats):**

Single past-going stub:
```
[Zap icon] You went to {artistName} — how was it?  [Capture It]
```

Multiple past-going stubs:
```
[Zap icon] {count} shows happened — capture your experience!
  - {artistName} at {venueName} — {date}  [Capture It]
  - {artistName} at {venueName} — {date}  [Capture It]
```

**Styling:** Amber border-left, `bg-stub-amber/5`, subtle glow. CTA uses `Button variant="tinted" tintColor="amber"`.

**Navigation:** "Capture It" links to `/create?editId={stubId}`. CreateStubPage loads in edit mode, detects past date, shows post-event steps starting at capture.

### 3. Visual Distinction for "Going" Stubs on MyStubsPage

Stubs with `status === 'going'` in the list view:
- Dashed left border in cyan (`border-l-2 border-dashed border-stub-cyan`)
- "Going" badge (cyan variant) instead of star rating
- Show formatted date with "Upcoming" label if in future
- No rating, highlights, or photo count (they don't exist yet)

## Files Modified

| File | Change |
|------|--------|
| `src/features/journal/CreateStubPage.tsx` | Add edit mode: detect `editId`, fetch stub, pre-populate form, update on save |
| `src/features/journal/MyStubsPage.tsx` | Add past-going banner, visual distinction for going stubs |
| `src/services/firebase/storage.ts` | Add `deleteStubPhoto(storageRef)` function for photo cleanup |

## Verification

1. Create a "going" stub for a past event date (or wait for one to pass)
2. Verify banner appears on My Stubs page with correct artist/venue info
3. Click "Capture It" — verify CreateStubPage opens at capture step with event info pre-filled
4. Fill in rating, vibes, photos, setlist, story — publish
5. Verify stub updates in place (same ID, not a duplicate)
6. Verify status changed from "going" to "attended"
7. Open an existing attended stub, click Edit from detail page menu
8. Verify all fields are pre-populated
9. Modify rating and add a photo — save
10. Verify updates persisted, new photo uploaded, old data intact
