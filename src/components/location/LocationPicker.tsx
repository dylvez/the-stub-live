import { useState, useEffect, useRef } from 'react';
import { Navigation, Search, MapPin, Check } from 'lucide-react';
import { Modal, Input, Button } from '@/components/ui';
import { BrandedSpinner } from '@/components/ui/BrandedSpinner';
import { searchCities } from '@/utils/geo';
import type { CityEntry } from '@/utils/geo';
import type { UserLocation } from '@/types';

interface LocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: UserLocation;
  onSelect: (location: UserLocation) => void;
  onDetect: () => Promise<void>;
  isDetecting: boolean;
}

export function LocationPicker({
  isOpen,
  onClose,
  currentLocation,
  onSelect,
  onDetect,
  isDetecting,
}: LocationPickerProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [radius, setRadius] = useState(currentLocation.radiusMiles);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced async city search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchCities(query, 8).then((cities) => {
        setResults(cities);
        setSearching(false);
      }).catch(() => {
        setResults([]);
        setSearching(false);
      });
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function selectCity(city: CityEntry): void {
    onSelect({
      city: city.city,
      state: city.state,
      lat: city.lat,
      lng: city.lng,
      radiusMiles: radius,
    });
    setQuery('');
    setResults([]);
    onClose();
  }

  function handleRadiusChange(newRadius: number): void {
    setRadius(newRadius);
    onSelect({
      ...currentLocation,
      radiusMiles: newRadius,
    });
  }

  async function handleDetect(): Promise<void> {
    await onDetect();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Your Location">
      {/* Current location */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-stub-bg rounded-lg border border-stub-border">
        <MapPin className="w-4 h-4 text-stub-amber shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-stub-text">
            {currentLocation.city}{currentLocation.state ? `, ${currentLocation.state}` : ''}
          </div>
          <div className="text-xs text-stub-muted">{currentLocation.radiusMiles}mi radius</div>
        </div>
        <Check className="w-4 h-4 text-stub-amber shrink-0" />
      </div>

      {/* Detect location button */}
      <Button
        variant="secondary"
        size="sm"
        className="w-full mb-4"
        icon={<Navigation className="w-4 h-4" />}
        onClick={handleDetect}
        disabled={isDetecting}
      >
        {isDetecting ? 'Detecting...' : 'Use My Current Location'}
      </Button>

      {/* City search */}
      <div className="mb-4">
        <Input
          icon="search"
          placeholder="Search any US city or town..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
          {results.map((city) => {
            const isSelected = city.city === currentLocation.city && city.state === currentLocation.state;
            return (
              <button
                key={`${city.city}-${city.state}-${city.lat}`}
                onClick={() => selectCity(city)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                  ${isSelected
                    ? 'bg-stub-amber/10 border border-stub-amber/30'
                    : 'hover:bg-stub-surface-hover border border-transparent'
                  }`}
              >
                <MapPin className={`w-4 h-4 shrink-0 ${isSelected ? 'text-stub-amber' : 'text-stub-muted'}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-stub-text">{city.city}</span>
                  {city.state && <span className="text-sm text-stub-muted">, {city.state}</span>}
                </div>
                {isSelected && <Check className="w-4 h-4 text-stub-amber shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {searching && (
        <div className="flex items-center justify-center gap-2 py-4 text-stub-muted text-sm mb-4">
          <BrandedSpinner size={16} />
          Searching...
        </div>
      )}

      {query.length >= 2 && !searching && results.length === 0 && (
        <div className="text-center py-4 text-stub-muted text-sm mb-4">
          <Search className="w-5 h-5 mx-auto mb-1 text-stub-border-light" />
          No cities found for &ldquo;{query}&rdquo;
        </div>
      )}

      {/* Radius slider */}
      <div className="pt-3 border-t border-stub-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-stub-text">Search Radius</span>
          <span className="text-sm font-mono text-stub-amber">{radius}mi</span>
        </div>
        <input
          type="range"
          min={10}
          max={200}
          step={5}
          value={radius}
          onChange={(e) => handleRadiusChange(Number(e.target.value))}
          className="w-full h-1.5 bg-stub-border rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-stub-amber [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-stub-amber [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-stub-muted mt-1">
          <span>10mi</span>
          <span>100mi</span>
          <span>200mi</span>
        </div>
      </div>
    </Modal>
  );
}
