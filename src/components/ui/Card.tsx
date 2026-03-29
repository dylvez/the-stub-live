import type { ReactNode, HTMLAttributes } from 'react';

type GlowColor = 'amber' | 'coral' | 'cyan' | 'violet';
type AccentColor = 'amber' | 'coral' | 'cyan' | 'violet' | 'green' | 'orange';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  /**
   * Glow effect for emphasis. Use sparingly:
   * - Primary content cards: StubCard (expanded), EventPage AI briefing, ArtistPage briefing
   * - Do NOT apply to list cards (EventCard, compact StubCard) or secondary containers
   */
  glow?: GlowColor;
  /** Genre-based accent color for border tinting */
  accent?: AccentColor;
  /** Apply torn-edge-right class (StubCard-specific ticket stub tear) */
  torn?: boolean;
  padding?: boolean;
}

const accentBorder: Record<AccentColor, string> = {
  amber: 'border-stub-amber/30 hover:border-stub-amber/50',
  coral: 'border-stub-coral/30 hover:border-stub-coral/50',
  cyan: 'border-stub-cyan/30 hover:border-stub-cyan/50',
  violet: 'border-stub-violet/30 hover:border-stub-violet/50',
  green: 'border-stub-green/30 hover:border-stub-green/50',
  orange: 'border-stub-orange/30 hover:border-stub-orange/50',
};

export function Card({
  children,
  hover = false,
  glow,
  accent,
  torn = false,
  padding = true,
  className = '',
  ...props
}: CardProps): React.JSX.Element {
  const borderClass = accent ? accentBorder[accent] : 'border-stub-border';
  return (
    <div
      className={`bg-stub-surface rounded-xl border paper-grain
        ${borderClass}
        ${hover ? 'hover:bg-stub-surface-hover hover:border-stub-border-light transition-colors cursor-pointer' : ''}
        ${glow ? `glow-${glow}` : ''}
        ${torn ? 'torn-edge-right' : ''}
        ${padding ? 'p-4' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
