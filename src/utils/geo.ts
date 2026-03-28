import { US_CITIES, type CityEntry } from '@/data/cities';

const EARTH_RADIUS_MILES = 3958.8;

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
 * Finds the nearest city from the US_CITIES list to the given coordinates.
 */
export function findNearestCity(lat: number, lng: number): CityEntry {
  let nearest = US_CITIES[0];
  let minDistance = Infinity;

  for (const city of US_CITIES) {
    const distance = haversineDistance(lat, lng, city.lat, city.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = city;
    }
  }

  return nearest;
}

/**
 * Searches cities by case-insensitive prefix match on city name or "city, state" format.
 * @param query - Search string
 * @param limit - Maximum results to return (default 8)
 */
export function searchCities(query: string, limit: number = 8): CityEntry[] {
  if (!query.trim()) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();
  const results: CityEntry[] = [];

  for (const city of US_CITIES) {
    if (results.length >= limit) break;

    const cityName = city.city.toLowerCase();
    const cityState = `${city.city}, ${city.state}`.toLowerCase();

    if (cityName.startsWith(normalizedQuery) || cityState.startsWith(normalizedQuery)) {
      // Avoid duplicates (some cities appear more than once in the list)
      const isDuplicate = results.some(
        (r) => r.city === city.city && r.state === city.state
      );
      if (!isDuplicate) {
        results.push(city);
      }
    }
  }

  return results;
}
