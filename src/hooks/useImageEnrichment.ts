// Lightweight background image enrichment for artists in the event feed.
//
// After the event feed loads, many artists may have no image (or a detected
// placeholder). This hook runs a background pass that attempts to fetch real
// images from Discogs (already integrated) for artists that need them.
//
// Key design choices:
// - Runs AFTER initial feed render (non-blocking)
// - Only targets artists with missing/placeholder images
// - Batched with delays to respect rate limits
// - Cached aggressively so repeat views don't re-fetch
// - Progressive: updates state as each image is found

import { useEffect, useRef } from 'react';
import { isDiscogsConfigured } from '@/services/api/config';
import { cacheGet, cacheSet, CacheTTL } from '@/services/api/cache';
import { isPlaceholderImage, sanitizeArtistImage } from '@/utils/artistImage';
import type { ArtistData } from '@/types';

interface ImageEnrichmentResult {
  artistId: string;
  imageUrl: string;
}

/**
 * Background image enrichment for artists in the event feed.
 * Fires after initial load, finds real images for artists missing them.
 *
 * @param artists - Current artist map from useEvents
 * @param onImageFound - Callback when a real image is found for an artist
 * @param enabled - Whether to run enrichment (disable during loading)
 */
export function useImageEnrichment(
  artists: Map<string, ArtistData>,
  onImageFound: (results: ImageEnrichmentResult[]) => void,
  enabled: boolean,
): void {
  const processedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || artists.size === 0) return;
    if (!isDiscogsConfigured) return;

    let cancelled = false;

    async function enrichImages(): Promise<void> {
      // Find artists that need images
      const needsImage: ArtistData[] = [];
      artists.forEach((artist) => {
        if (processedRef.current.has(artist.id)) return;
        if (isPlaceholderImage(artist.images.primary)) {
          needsImage.push(artist);
        }
      });

      if (needsImage.length === 0) return;

      // Limit batch size to avoid hammering APIs
      const batch = needsImage.slice(0, 10);
      const results: ImageEnrichmentResult[] = [];

      for (const artist of batch) {
        if (cancelled) break;
        processedRef.current.add(artist.id);

        // Check if we already have a cached Discogs result for this artist
        const cachedKey = `img:discogs:${artist.name.toLowerCase()}`;
        const cached = cacheGet<string>(cachedKey, true);
        if (cached) {
          results.push({ artistId: artist.id, imageUrl: cached });
          continue;
        }

        try {
          // Dynamic import to avoid loading Discogs client if not needed
          const { searchDiscogsArtist } = await import('@/services/api/discogs');
          const discogs = await searchDiscogsArtist(artist.name);

          if (cancelled) break;

          if (discogs?.images && discogs.images.length > 0) {
            // Find primary image, fall back to first available
            const primary = discogs.images.find((i) => i.type === 'primary');
            const imageUrl = sanitizeArtistImage(primary?.uri ?? discogs.images[0].uri);

            if (imageUrl) {
              results.push({ artistId: artist.id, imageUrl });
              cacheSet(cachedKey, imageUrl, CacheTTL.DISCOGS, true);
            }
          }
        } catch {
          // Best-effort — skip this artist
        }

        // Small delay between requests to respect rate limits
        if (!cancelled) {
          await new Promise((r) => setTimeout(r, 1200));
        }
      }

      if (!cancelled && results.length > 0) {
        onImageFound(results);
      }
    }

    // Delay start to let the feed render first
    const timer = setTimeout(enrichImages, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [artists, onImageFound, enabled]);
}
