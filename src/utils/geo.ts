import { apiKeys } from '@/services/api/config';

export interface CityEntry {
  city: string;
  state: string;
  lat: number;
  lng: number;
}

const EARTH_RADIUS_MILES = 3958.8;
const PLACES_API_BASE = 'https://places.googleapis.com/v1';

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates the great-circle distance between two points using the haversine formula.
 * @returns Distance in miles
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

/**
 * Reverse-geocode coordinates to a city name using Google Places Nearby Search.
 * Falls back to a generic label if the API isn't configured or fails.
 */
export async function findNearestCity(lat: number, lng: number): Promise<CityEntry> {
  if (apiKeys.googleMaps) {
    try {
      const res = await fetch(`${PLACES_API_BASE}/places:searchNearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKeys.googleMaps,
          'X-Goog-FieldMask': 'places.displayName,places.addressComponents,places.location',
        },
        body: JSON.stringify({
          locationRestriction: {
            circle: { center: { latitude: lat, longitude: lng }, radiusMeters: 50000 },
          },
          includedTypes: ['locality'],
          maxResultCount: 1,
        }),
      });
      const data = await res.json();
      const place = data.places?.[0];
      if (place) {
        return parsePlaceResult(place, lat, lng);
      }
    } catch { /* fall through */ }
  }
  return { city: 'My Location', state: '', lat, lng };
}

/**
 * Search for US cities/towns by name using Google Places Text Search (New) API.
 * Accepts any city, town, or place name — not limited to a preset list.
 */
export async function searchCities(query: string, limit: number = 8): Promise<CityEntry[]> {
  const trimmed = query.trim();
  if (!trimmed || !apiKeys.googleMaps) return [];

  try {
    const res = await fetch(`${PLACES_API_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKeys.googleMaps,
        'X-Goog-FieldMask': 'places.displayName,places.addressComponents,places.location,places.formattedAddress',
      },
      body: JSON.stringify({
        textQuery: `${trimmed} city`,
        includedType: 'locality',
        languageCode: 'en',
        regionCode: 'US',
        maxResultCount: limit,
      }),
    });
    const data = await res.json();

    if (!data.places) return [];

    const cities: CityEntry[] = [];
    const seen = new Set<string>();

    for (const place of data.places) {
      if (cities.length >= limit) break;
      const entry = parsePlaceResult(place);
      if (!entry.city) continue;
      // Filter to US results only
      const isUS = place.addressComponents?.some(
        (c: { types: string[]; shortText: string }) => c.types.includes('country') && c.shortText === 'US'
      );
      if (!isUS) continue;
      const key = `${entry.city}|${entry.state}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cities.push(entry);
    }

    return cities;
  } catch {
    return [];
  }
}

/** Extract city, state, lat, lng from a Google Places (New) API result */
function parsePlaceResult(
  place: {
    displayName?: { text: string };
    addressComponents?: Array<{ types: string[]; longText: string; shortText: string }>;
    location?: { latitude: number; longitude: number };
  },
  fallbackLat?: number,
  fallbackLng?: number,
): CityEntry {
  let city = place.displayName?.text ?? '';
  let state = '';

  if (place.addressComponents) {
    for (const comp of place.addressComponents) {
      if (comp.types.includes('locality')) {
        city = comp.longText;
      } else if (comp.types.includes('administrative_area_level_1')) {
        state = comp.shortText;
      }
    }
  }

  return {
    city,
    state,
    lat: place.location?.latitude ?? fallbackLat ?? 0,
    lng: place.location?.longitude ?? fallbackLng ?? 0,
  };
}
