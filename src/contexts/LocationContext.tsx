import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { DEFAULT_LOCATION } from '@/services/api/config';
import type { UserLocation } from '@/types';

interface LocationContextValue {
  location: UserLocation;
  isDetecting: boolean;
  locationSource: 'auto' | 'manual' | 'default';
  setLocation: (location: UserLocation) => void;
  detectLocation: () => Promise<void>;
}

const STORAGE_KEY = 'stub:user-location';

const LocationContext = createContext<LocationContextValue | null>(null);

function loadSavedLocation(): UserLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number' && parsed.city) {
      return parsed as UserLocation;
    }
  } catch { /* ignore */ }
  return null;
}

function saveLocation(location: UserLocation): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch { /* ignore */ }
}

const defaultLocation: UserLocation = {
  city: DEFAULT_LOCATION.city,
  state: DEFAULT_LOCATION.state,
  lat: DEFAULT_LOCATION.lat,
  lng: DEFAULT_LOCATION.lng,
  radiusMiles: DEFAULT_LOCATION.radiusMiles,
};

/** Non-hook accessor for stored location — safe to call outside React components */
export function getStoredLocation(): UserLocation {
  return loadSavedLocation() ?? defaultLocation;
}

export function LocationProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [location, setLocationState] = useState<UserLocation>(() => loadSavedLocation() ?? defaultLocation);
  const [isDetecting, setIsDetecting] = useState(false);
  const [locationSource, setLocationSource] = useState<'auto' | 'manual' | 'default'>(() => {
    return loadSavedLocation() ? 'manual' : 'default';
  });

  const setLocation = useCallback((loc: UserLocation) => {
    setLocationState(loc);
    setLocationSource('manual');
    saveLocation(loc);
  }, []);

  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) return;

    setIsDetecting(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 300000, // 5 min cache
        });
      });

      // Dynamic import to avoid loading city data until needed
      const { findNearestCity } = await import('@/utils/geo');
      const nearest = await findNearestCity(position.coords.latitude, position.coords.longitude);

      const detectedLocation: UserLocation = {
        city: nearest.city,
        state: nearest.state,
        lat: nearest.lat,
        lng: nearest.lng,
        radiusMiles: location.radiusMiles, // preserve user's radius preference
      };

      setLocationState(detectedLocation);
      setLocationSource('auto');
      saveLocation(detectedLocation);
    } catch {
      // Geolocation denied or failed — keep current location
    } finally {
      setIsDetecting(false);
    }
  }, [location.radiusMiles]);

  // Auto-detect on first load if no saved location
  useEffect(() => {
    if (!loadSavedLocation() && navigator.geolocation) {
      detectLocation();
    }
  }, [detectLocation]);

  return (
    <LocationContext.Provider value={{ location, isDetecting, locationSource, setLocation, detectLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextValue {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
