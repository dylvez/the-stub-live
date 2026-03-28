import { MapPin, ChevronDown } from 'lucide-react';
import { BrandedSpinner } from '@/components/ui/BrandedSpinner';

interface LocationChipProps {
  city: string;
  state: string;
  isDetecting?: boolean;
  onClick: () => void;
}

export function LocationChip({ city, state, isDetecting, onClick }: LocationChipProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-stub-surface border border-stub-border rounded-full
        text-xs text-stub-muted hover:text-stub-text hover:border-stub-amber/50 transition-colors"
    >
      {isDetecting ? (
        <BrandedSpinner size={14} className="text-stub-amber" />
      ) : (
        <MapPin className="w-3.5 h-3.5 text-stub-amber" />
      )}
      <span className="max-w-[120px] truncate">
        {isDetecting ? 'Detecting...' : `${city}, ${state}`}
      </span>
      <ChevronDown className="w-3 h-3" />
    </button>
  );
}
