// In-memory + localStorage cache with TTL

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

const STORAGE_PREFIX = 'stub_cache_';
const MAX_STORAGE_BYTES = 4 * 1024 * 1024; // 4MB budget

// TTL presets (milliseconds)
export const CacheTTL = {
  EVENTS: 15 * 60 * 1000,        // 15 minutes
  ARTIST: 60 * 60 * 1000,        // 1 hour
  VENUE: 60 * 60 * 1000,         // 1 hour
  SEARCH: 5 * 60 * 1000,         // 5 minutes
  SPOTIFY_TOKEN: 0,              // set dynamically from expires_in
  LASTFM: 24 * 60 * 60 * 1000,  // 24 hours
  YOUTUBE: 6 * 60 * 60 * 1000,  // 6 hours
  SETLISTFM: 24 * 60 * 60 * 1000, // 24 hours
  AI_BRIEFING: 7 * 24 * 60 * 60 * 1000, // 7 days
  PLACES: 7 * 24 * 60 * 60 * 1000,     // 7 days
  DISCOGS: 24 * 60 * 60 * 1000,       // 24 hours
  GENIUS: 24 * 60 * 60 * 1000,        // 24 hours
  GENIUS_SONG: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

function isExpired<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.timestamp > entry.ttl;
}

// In-memory cache
export function memGet<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry || isExpired(entry)) {
    if (entry) memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

export function memSet<T>(key: string, data: T, ttl: number): void {
  memoryCache.set(key, { data, timestamp: Date.now(), ttl });
}

// localStorage-backed cache (for data that should survive page refresh)
export function storageGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (isExpired(entry)) {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function storageSet<T>(key: string, data: T, ttl: number): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
    const json = JSON.stringify(entry);

    // Check storage budget before writing
    if (json.length > MAX_STORAGE_BYTES / 4) {
      // Single entry too large, skip persistence
      memSet(key, data, ttl);
      return;
    }

    // Evict old entries if needed
    evictIfNeeded(json.length);
    localStorage.setItem(STORAGE_PREFIX + key, json);
  } catch {
    // localStorage full or unavailable — fall back to memory
    memSet(key, data, ttl);
  }
}

function evictIfNeeded(newBytes: number): void {
  try {
    let totalSize = 0;
    const entries: { key: string; size: number; timestamp: number }[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      const val = localStorage.getItem(key) ?? '';
      totalSize += val.length;
      try {
        const parsed = JSON.parse(val) as CacheEntry<unknown>;
        entries.push({ key, size: val.length, timestamp: parsed.timestamp });
      } catch {
        // Corrupted entry, remove
        localStorage.removeItem(key);
      }
    }

    // Evict oldest entries until we have room
    if (totalSize + newBytes > MAX_STORAGE_BYTES) {
      entries.sort((a, b) => a.timestamp - b.timestamp);
      for (const entry of entries) {
        if (totalSize + newBytes <= MAX_STORAGE_BYTES) break;
        localStorage.removeItem(entry.key);
        totalSize -= entry.size;
      }
    }
  } catch {
    // Ignore eviction errors
  }
}

/** Scan memory cache entries whose keys start with the given prefix. Returns non-expired data. */
export function memScanByPrefix<T>(prefix: string): T[] {
  const results: T[] = [];
  for (const [key, entry] of memoryCache) {
    if (key.startsWith(prefix) && !isExpired(entry)) {
      results.push(entry.data as T);
    }
  }
  return results;
}

// Combined cache: check memory first, then storage
export function cacheGet<T>(key: string, persistent = false): T | null {
  const mem = memGet<T>(key);
  if (mem !== null) return mem;
  if (persistent) return storageGet<T>(key);
  return null;
}

export function cacheSet<T>(key: string, data: T, ttl: number, persistent = false): void {
  memSet(key, data, ttl);
  if (persistent) storageSet(key, data, ttl);
}
