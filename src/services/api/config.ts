// API configuration, key checks, and shared fetch utilities

export const apiKeys = {
  ticketmaster: import.meta.env.VITE_TICKETMASTER_API_KEY as string | undefined,
  bandsintown: import.meta.env.VITE_BANDSINTOWN_API_KEY as string | undefined,
  seatgeek: import.meta.env.VITE_SEATGEEK_CLIENT_ID as string | undefined,
  spotify: {
    clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined,
    clientSecret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET as string | undefined,
  },
  setlistfm: import.meta.env.VITE_SETLISTFM_API_KEY as string | undefined,
  lastfm: import.meta.env.VITE_LASTFM_API_KEY as string | undefined,
  youtube: import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined,
  eventbrite: import.meta.env.VITE_EVENTBRITE_TOKEN as string | undefined,
  jambase: import.meta.env.VITE_JAMBASE_API_KEY as string | undefined,
  googleMaps: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined,
  discogs: import.meta.env.VITE_DISCOGS_TOKEN as string | undefined,
  genius: import.meta.env.VITE_GENIUS_ACCESS_TOKEN as string | undefined,
} as const;

export const isTicketmasterConfigured = !!apiKeys.ticketmaster;
// Bandsintown uses a public app_id (not a secret) — always available
export const isBandsintownConfigured = true;
export const isSpotifyConfigured = !!apiKeys.spotify.clientId && !!apiKeys.spotify.clientSecret;
export const isSetlistFmConfigured = !!apiKeys.setlistfm;
export const isLastFmConfigured = !!apiKeys.lastfm;
export const isYoutubeConfigured = !!apiKeys.youtube;
export const isSeatGeekConfigured = !!apiKeys.seatgeek;
export const isEventbriteConfigured = !!apiKeys.eventbrite;
export const isJambaseConfigured = !!apiKeys.jambase;
export const isGoogleMapsConfigured = !!apiKeys.googleMaps;
export const isDiscogsConfigured = !!apiKeys.discogs;
export const isGeniusConfigured = !!apiKeys.genius;

// Rate limiter: token bucket per domain
const rateLimiters = new Map<string, { tokens: number; lastRefill: number; maxTokens: number; refillRate: number }>();

function getRateLimiter(domain: string, maxPerSec: number): { tokens: number; lastRefill: number; maxTokens: number; refillRate: number } {
  if (!rateLimiters.has(domain)) {
    rateLimiters.set(domain, { tokens: maxPerSec, lastRefill: Date.now(), maxTokens: maxPerSec, refillRate: maxPerSec });
  }
  return rateLimiters.get(domain)!;
}

// Daily request counter — prevents burning through API quotas if a bug causes rapid requests
const dailyRequestCounts = new Map<string, { count: number; resetAt: number }>();
const DAILY_LIMITS: Record<string, number> = {
  'app.ticketmaster.com': 2000, // TM free tier is 5000/day — cap at 2000 for safety
};

function checkDailyLimit(domain: string): boolean {
  const limit = DAILY_LIMITS[domain];
  if (!limit) return true;
  const now = Date.now();
  let entry = dailyRequestCounts.get(domain);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 24 * 60 * 60 * 1000 };
    dailyRequestCounts.set(domain, entry);
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

async function waitForRateLimit(domain: string, maxPerSec: number): Promise<void> {
  if (!checkDailyLimit(domain)) {
    throw new Error(`Daily request limit reached for ${domain}`);
  }

  const limiter = getRateLimiter(domain, maxPerSec);
  const now = Date.now();
  const elapsed = (now - limiter.lastRefill) / 1000;
  limiter.tokens = Math.min(limiter.maxTokens, limiter.tokens + elapsed * limiter.refillRate);
  limiter.lastRefill = now;

  if (limiter.tokens < 1) {
    const waitMs = ((1 - limiter.tokens) / limiter.refillRate) * 1000;
    await new Promise((r) => setTimeout(r, waitMs));
    limiter.tokens = 1;
    limiter.lastRefill = Date.now();
  }
  limiter.tokens -= 1;
}

// Rate limits per API
const RATE_LIMITS: Record<string, number> = {
  'app.ticketmaster.com': 5,
  'rest.bandsintown.com': 5,
  'ws.audioscrobbler.com': 5,
  'musicbrainz.org': 1,
  'api.seatgeek.com': 5,
  'www.eventbriteapi.com': 5,
  'www.jambase.com': 3,
  'www.googleapis.com': 10,
  'places.googleapis.com': 5,
  'api.discogs.com': 1,
  'api.genius.com': 3,
};

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  rateLimitDomain?: string;
}

export async function apiFetch<T>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const { timeoutMs = 10000, retries = 2, rateLimitDomain, ...fetchOptions } = options;

  // Apply rate limiting
  if (rateLimitDomain && RATE_LIMITS[rateLimitDomain]) {
    await waitForRateLimit(rateLimitDomain, RATE_LIMITS[rateLimitDomain]);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
      clearTimeout(timeout);

      if (response.status === 429) {
        // Rate limited — wait and retry
        const retryAfter = parseInt(response.headers.get('Retry-After') ?? '2', 10);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }

      if (response.status === 404) {
        return null as T;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < retries && !controller.signal.aborted) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error('apiFetch failed');
}

// Default location: Richmond, VA
export const DEFAULT_LOCATION = {
  lat: 37.5407,
  lng: -77.4360,
  city: 'Richmond',
  state: 'VA',
  radiusMiles: 50,
} as const;
