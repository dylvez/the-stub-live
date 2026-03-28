import type { ArtistData, VenueData, VenueType } from '@/types';
import { isPlaceholderImage } from './artistImage';

// --- Artist Image Enrichment ---

/** Merge two ArtistData records, preferring non-empty images and richer metadata */
export function mergeArtistData(existing: ArtistData, incoming: ArtistData): ArtistData {
  // Choose the best primary image — prefer real images over placeholders
  const existingIsReal = !isPlaceholderImage(existing.images.primary);
  const incomingIsReal = !isPlaceholderImage(incoming.images.primary);
  let bestPrimary: string;
  if (existingIsReal) bestPrimary = existing.images.primary;
  else if (incomingIsReal) bestPrimary = incoming.images.primary;
  else bestPrimary = existing.images.primary || incoming.images.primary;

  return {
    ...existing,
    images: {
      primary: bestPrimary,
      gallery: mergeGallery(existing.images.gallery, incoming.images.gallery),
    },
    // Merge genres (dedupe)
    genres: mergeStringArrays(existing.genres, incoming.genres),
    tags: mergeStringArrays(existing.tags, incoming.tags),
    // Merge external IDs (fill in blanks)
    externalIds: {
      ...incoming.externalIds,
      ...existing.externalIds,
    },
    // Keep richer fields from whichever has them
    aiBriefing: existing.aiBriefing ?? incoming.aiBriefing,
    spotifyData: existing.spotifyData ?? incoming.spotifyData,
    lastEnriched: existing.lastEnriched ?? incoming.lastEnriched,
  };
}

// --- Venue Type Cross-Source Resolution ---

/** Confidence-ranked venue types: higher index = more reliable source */
const VENUE_TYPE_CONFIDENCE: VenueType[] = ['other', 'club', 'bar', 'house', 'outdoor', 'festival', 'theater', 'arena'];

/** Resolve venue type from multiple sources, preferring concrete over heuristic */
export function resolveVenueType(
  existingType: VenueType,
  incomingType: VenueType,
  capacity?: number,
): VenueType {
  // If one is the default heuristic fallback ('club') and the other is specific, prefer specific
  const existingIsDefault = existingType === 'club';
  const incomingIsDefault = incomingType === 'club';

  if (existingIsDefault && !incomingIsDefault) return incomingType;
  if (!existingIsDefault && incomingIsDefault) return existingType;

  // Both specific or both default — use capacity as tiebreaker
  if (capacity != null) {
    if (capacity >= 10000) return 'arena';
    if (capacity >= 2000) return 'theater';
    if (capacity >= 500) return 'club';
    if (capacity < 200) return 'bar';
  }

  // Use confidence ranking
  const existingConf = VENUE_TYPE_CONFIDENCE.indexOf(existingType);
  const incomingConf = VENUE_TYPE_CONFIDENCE.indexOf(incomingType);
  return existingConf >= incomingConf ? existingType : incomingType;
}

/** Merge two VenueData records, preferring non-empty fields and better type classification */
export function mergeVenueData(existing: VenueData, incoming: VenueData): VenueData {
  const mergedCapacity = existing.capacity ?? incoming.capacity;

  return {
    ...existing,
    // Prefer non-empty images
    images: {
      primary: existing.images.primary || incoming.images.primary,
      gallery: mergeGallery(existing.images.gallery, incoming.images.gallery),
    },
    // Resolve venue type with capacity awareness
    venueType: resolveVenueType(existing.venueType, incoming.venueType, mergedCapacity),
    // Fill in missing capacity
    capacity: mergedCapacity,
    // Merge external IDs
    externalIds: {
      ...incoming.externalIds,
      ...existing.externalIds,
    },
    // Prefer non-empty address info
    address: existing.address || incoming.address,
    city: existing.city || incoming.city,
    state: existing.state || incoming.state,
    lat: existing.lat || incoming.lat,
    lng: existing.lng || incoming.lng,
    // Prefer existing accessibility if it has data
    accessibility: existing.accessibility.wheelchairAccessible || existing.accessibility.assistiveListening
      ? existing.accessibility
      : incoming.accessibility,
  };
}

// --- Helpers ---

function mergeGallery(a: string[], b: string[]): string[] {
  const seen = new Set(a);
  const merged = [...a];
  for (const url of b) {
    if (url && !seen.has(url)) {
      seen.add(url);
      merged.push(url);
    }
  }
  return merged.slice(0, 10); // cap gallery size
}

function mergeStringArrays(a: string[], b: string[]): string[] {
  const seen = new Set(a.map((s) => s.toLowerCase()));
  const merged = [...a];
  for (const s of b) {
    if (s && !seen.has(s.toLowerCase())) {
      seen.add(s.toLowerCase());
      merged.push(s);
    }
  }
  return merged;
}
