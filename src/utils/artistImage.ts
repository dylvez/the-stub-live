// Artist image utilities — placeholder detection + genre-aware fallbacks
//
// Problem: APIs like Bandsintown return the same generic stock photo (a microphone)
// for every artist without an image. This creates a visually monotonous feed.
//
// Solution:
// 1. Detect known API placeholder URLs and treat them as "no image"
// 2. Provide genre-matched fallback images from /public/images/genre-*.png
// 3. Cycle through a pool of general concert images when genre is unknown

// --- Known placeholder URL patterns ---
// These are generic stock photos returned by APIs when an artist has no real image.
// Detected by substring match on the URL.
const PLACEHOLDER_PATTERNS = [
  // Bandsintown default mic/placeholder images
  'bandsintown.com/images/',
  'bandsintown.com/Assets/',
  'placeholder',
  'default_artist',
  'default-artist',
  'no-image',
  'noimage',
  'missing_artist',
  // Ticketmaster placeholder
  'tmwidgets.com/placeholders',
  // Common stock photo CDN patterns for defaults
  '/default.jpg',
  '/default.png',
  '/placeholder.jpg',
  '/placeholder.png',
];

// --- Duplicate image tracker ---
// Bandsintown returns the same stock mic photo URL for all artists without a real
// image. We can't pattern-match this URL because it looks like a normal photo URL
// (e.g. https://photos.bandsintown.com/large/12345.jpeg). Instead, we track how
// many times each URL appears. If more than MAX_DUPE_THRESHOLD artists share the
// same image URL, it's almost certainly a placeholder.
const imageUrlCounts = new Map<string, number>();
const MAX_DUPE_THRESHOLD = 3;

/**
 * Track an image URL and return whether it appears to be a shared placeholder.
 * Call this for each artist image URL when building the event feed.
 */
export function trackImageUrl(url: string): void {
  if (!url || url.trim() === '') return;
  imageUrlCounts.set(url, (imageUrlCounts.get(url) ?? 0) + 1);
}

/**
 * Returns true if the URL has been seen across many artists (likely a placeholder).
 */
export function isDuplicateImage(url: string | undefined): boolean {
  if (!url) return false;
  return (imageUrlCounts.get(url) ?? 0) > MAX_DUPE_THRESHOLD;
}

/**
 * Reset the duplicate tracker (e.g. on page refresh).
 */
export function resetImageTracker(): void {
  imageUrlCounts.clear();
}

/**
 * Returns true if the image URL looks like a generic API placeholder
 * rather than a real artist photo.
 */
export function isPlaceholderImage(url: string | undefined): boolean {
  if (!url || url.trim() === '') return true;
  const lower = url.toLowerCase();
  if (PLACEHOLDER_PATTERNS.some((p) => lower.includes(p))) return true;
  // Check if this URL is a shared default across many artists
  if (isDuplicateImage(url)) return true;
  return false;
}

/**
 * Returns the URL if it's a real artist image, or undefined if it's
 * empty or a known placeholder. Use this to sanitize API responses.
 */
export function sanitizeArtistImage(url: string | undefined): string | undefined {
  if (isPlaceholderImage(url)) return undefined;
  return url;
}

// --- Genre-based fallback images ---

/** Map from genre keyword → fallback image filename in /images/ */
const GENRE_IMAGE_MAP: Record<string, string> = {
  // Rock family
  rock: 'genre-rock.png',
  metal: 'genre-metal.png',
  alternative: 'genre-rock.png',
  indie: 'genre-rock.png',
  grunge: 'genre-rock.png',
  // Punk family
  punk: 'genre-punk.png',
  hardcore: 'genre-punk.png',
  emo: 'genre-punk.png',
  'post-punk': 'genre-punk.png',
  // Electronic family
  electronic: 'genre-electronic.png',
  edm: 'genre-electronic.png',
  house: 'genre-electronic.png',
  techno: 'genre-electronic.png',
  dance: 'genre-electronic.png',
  dubstep: 'genre-electronic.png',
  ambient: 'genre-electronic.png',
  dnb: 'genre-electronic.png',
  // Hip-hop family
  'hip-hop': 'genre-hiphop.png',
  hiphop: 'genre-hiphop.png',
  rap: 'genre-hiphop.png',
  'r&b': 'genre-hiphop.png',
  rnb: 'genre-hiphop.png',
  trap: 'genre-hiphop.png',
  // Jazz family
  jazz: 'genre-jazz.png',
  blues: 'genre-jazz.png',
  soul: 'genre-jazz.png',
  funk: 'genre-jazz.png',
  // Folk/country family
  folk: 'genre-folk.png',
  country: 'genre-folk.png',
  americana: 'genre-folk.png',
  bluegrass: 'genre-folk.png',
  singer: 'genre-folk.png', // matches "singer-songwriter"
  acoustic: 'genre-folk.png',
  // Pop family
  pop: 'genre-pop.png',
  // Classical family
  classical: 'genre-classical.png',
  orchestral: 'genre-classical.png',
  opera: 'genre-classical.png',
  chamber: 'genre-classical.png',
  // Latin family
  latin: 'genre-latin.png',
  reggaeton: 'genre-latin.png',
  salsa: 'genre-latin.png',
  cumbia: 'genre-latin.png',
};

/** General concert fallbacks cycled by artist name hash when genre is unknown */
const GENERAL_FALLBACKS = [
  'genre-rock.png',
  'genre-electronic.png',
  'genre-jazz.png',
  'genre-hiphop.png',
  'genre-punk.png',
  'genre-folk.png',
];

/**
 * Simple string hash for deterministic but varied fallback selection.
 * Same artist always gets the same fallback image.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Get a genre-appropriate fallback image path for an artist without a photo.
 *
 * @param genres - The artist's genre list (from Ticketmaster, Spotify, etc.)
 * @param artistName - Used as a hash seed for deterministic variety when genre is unknown
 * @returns Path like "/images/genre-rock.png"
 */
export function getGenreFallbackImage(genres?: string[], artistName = ''): string {
  // Try to match a genre
  if (genres && genres.length > 0) {
    for (const genre of genres) {
      const lower = genre.toLowerCase();
      // Direct match
      if (GENRE_IMAGE_MAP[lower]) {
        return `/images/${GENRE_IMAGE_MAP[lower]}`;
      }
      // Substring match (e.g. "alternative rock" contains "rock")
      for (const [keyword, image] of Object.entries(GENRE_IMAGE_MAP)) {
        if (lower.includes(keyword)) {
          return `/images/${image}`;
        }
      }
    }
  }

  // No genre match — pick from general pool using artist name hash
  const idx = simpleHash(artistName) % GENERAL_FALLBACKS.length;
  return `/images/${GENERAL_FALLBACKS[idx]}`;
}

/**
 * Get the best available image for an artist, with genre-aware fallback.
 * This is the main function to use in components.
 *
 * @param artistImage - The image URL from the API (may be placeholder)
 * @param genres - Artist's genres for fallback selection
 * @param artistName - Used for deterministic fallback variety
 * @returns An object with the image URL and whether it's a fallback
 */
export function getArtistDisplayImage(
  artistImage: string | undefined,
  genres?: string[],
  artistName = '',
): { url: string; isFallback: boolean } {
  if (!isPlaceholderImage(artistImage)) {
    return { url: artistImage!, isFallback: false };
  }
  return { url: getGenreFallbackImage(genres, artistName), isFallback: true };
}
