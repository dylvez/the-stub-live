import type { ReactNode } from 'react';

type ChipColor = 'amber' | 'cyan' | 'coral';

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: ReactNode;
  count?: number;
  activeColor?: ChipColor;
}

const activeStyles: Record<ChipColor, string> = {
  amber: 'bg-stub-amber text-stub-bg font-semibold',
  cyan: 'bg-stub-cyan text-stub-bg font-semibold',
  coral: 'bg-stub-coral text-stub-bg font-semibold',
};

export function FilterChip({
  label,
  isActive,
  onClick,
  icon,
  count,
  activeColor = 'cyan',
}: FilterChipProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors inline-flex items-center gap-1.5 font-medium
        ${isActive
          ? activeStyles[activeColor]
          : 'bg-stub-surface text-stub-muted border border-stub-border hover:text-stub-text hover:border-stub-amber/30'
        }`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {label}
      {count !== undefined && (
        <span className="text-[10px] opacity-70">{count}</span>
      )}
    </button>
  );
}
