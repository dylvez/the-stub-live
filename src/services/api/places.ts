import { apiKeys, isGoogleMapsConfigured } from './config';
import { cacheGet, cacheSet, CacheTTL } from './cache';
import type { VenueData } from '@/types';

const PLACES_API_BASE = 'https://places.googleapis.com/v1';

interface PlacesSearchResult {
  places?: {
    id: string;
    displayName?: { text: string };
  }[];
}

interface PlacesDetailsResult {
  id: string;
  displayName?: { text: string };
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: {
    weekdayDescriptions?: string[];
    openNow?: boolean;
  };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  editorialSummary?: { text: string };
  photos?: { name: string; widthPx: number; heightPx: number }[];
  accessibilityOptions?: {
    wheelchairAccessibleEntrance?: boolean;
    wheelchairAccessibleRestroom?: boolean;
    wheelchairAccessibleSeating?: boolean;
  };
  formattedAddress?: string;
}

export interface PlacesEnrichment {
  googlePlaceId: string;
  googleRating?: number;
  googleReviewCount?: number;
  phone?: string;
  website?: string;
  hours?: string[];
  editorialSummary?: string;
  photoUrls: string[];
  wheelchairAccessible?: boolean;
}

/** Search for a place by venue name and location */
async function searchPlace(name: string, city: string, state: string): Promise<string | null> {
  if (!isGoogleMapsConfigured) return null;

  const res = await fetch(`${PLACES_API_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKeys.googleMaps!,
      'X-Goog-FieldMask': 'places.id,places.displayName',
    },
    body: JSON.stringify({
      textQuery: `${name} ${city}, ${state}`,
    }),
  });

  if (!res.ok) return null;
  const data: PlacesSearchResult = await res.json();
  return data.places?.[0]?.id ?? null;
}

/** Get detailed place information */
async function getPlaceDetails(placeId: string): Promise<PlacesDetailsResult | null> {
  if (!isGoogleMapsConfigured) return null;

  const fieldMask = [
    'displayName', 'rating', 'userRatingCount',
    'currentOpeningHours', 'nationalPhoneNumber', 'websiteUri',
    'editorialSummary', 'photos', 'accessibilityOptions', 'formattedAddress',
  ].join(',');

  const res = await fetch(`${PLACES_API_BASE}/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': apiKeys.googleMaps!,
      'X-Goog-FieldMask': fieldMask,
    },
  });

  if (!res.ok) return null;
  return res.json();
}

/** Build a photo URL from a Places photo resource name */
export function getPlacePhotoUrl(photoName: string, maxWidth = 800): string {
  return `${PLACES_API_BASE}/${photoName}/media?maxWidthPx=${maxWidth}&key=${apiKeys.googleMaps}`;
}

/** Enrich a venue with Google Places data. Returns enriched venue or original if Places fails. */
export async function enrichVenueWithPlaces(venue: VenueData): Promise<VenueData> {
  if (!isGoogleMapsConfigured) return venue;
  if (venue.placesEnriched) return venue;

  // Check cache first
  const cached = cacheGet<PlacesEnrichment>(`places:${venue.id}`, true);
  if (cached) return applyEnrichment(venue, cached);

  try {
    // Step 1: Find place ID
    const placeId = venue.externalIds.googlePlaceId ?? await searchPlace(venue.name, venue.city, venue.state);
    if (!placeId) return venue;

    // Step 2: Get details
    const details = await getPlaceDetails(placeId);
    if (!details) return venue;

    // Step 3: Build enrichment
    const enrichment: PlacesEnrichment = {
      googlePlaceId: placeId,
      googleRating: details.rating,
      googleReviewCount: details.userRatingCount,
      phone: details.nationalPhoneNumber,
      website: details.websiteUri,
      hours: details.currentOpeningHours?.weekdayDescriptions,
      editorialSummary: details.editorialSummary?.text,
      photoUrls: (details.photos ?? []).slice(0, 6).map((p) => getPlacePhotoUrl(p.name)),
      wheelchairAccessible: details.accessibilityOptions?.wheelchairAccessibleEntrance,
    };

    // Cache for 7 days
    cacheSet(`places:${venue.id}`, enrichment, CacheTTL.PLACES);

    return applyEnrichment(venue, enrichment);
  } catch {
    // Places enrichment is best-effort — never block venue page
    return venue;
  }
}

/** Merge Places enrichment into VenueData */
function applyEnrichment(venue: VenueData, enrichment: PlacesEnrichment): VenueData {
  return {
    ...venue,
    externalIds: { ...venue.externalIds, googlePlaceId: enrichment.googlePlaceId },
    googleRating: enrichment.googleRating,
    googleReviewCount: enrichment.googleReviewCount,
    phone: enrichment.phone,
    website: enrichment.website,
    hours: enrichment.hours,
    editorialSummary: enrichment.editorialSummary,
    images: {
      primary: venue.images.primary || enrichment.photoUrls[0] || '',
      gallery: enrichment.photoUrls.length > 0 ? enrichment.photoUrls : venue.images.gallery,
    },
    accessibility: {
      ...venue.accessibility,
      wheelchairAccessible: enrichment.wheelchairAccessible ?? venue.accessibility.wheelchairAccessible,
    },
    placesEnriched: true,
  };
}
