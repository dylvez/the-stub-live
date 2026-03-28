import type { LucideIcon } from 'lucide-react';

interface BrandedIconProps {
  src: string;
  fallbackIcon?: LucideIcon;
  fallbackEmoji?: string;
  size?: number;
  alt: string;
  className?: string;
}

/** Renders a branded image icon with Lucide or emoji fallback */
export function BrandedIcon({
  src,
  fallbackIcon: FallbackIcon,
  fallbackEmoji,
  size = 20,
  alt,
  className = '',
}: BrandedIconProps): React.JSX.Element {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}
