import { REACTION_ICONS } from '@/utils/constants';

interface ReactionIconProps {
  type: string;
  size?: number;
  className?: string;
}

/** Renders a reaction as an icon image (with emoji fallback) */
export function ReactionIcon({ type, size = 20, className = '' }: ReactionIconProps): React.JSX.Element {
  const iconPath = REACTION_ICONS[type];

  if (iconPath) {
    return (
      <img
        src={iconPath}
        alt={type}
        width={size}
        height={size}
        className={`inline-block ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // Fallback to emoji
  return <span className={className} style={{ fontSize: size * 0.8 }}>{type}</span>;
}
