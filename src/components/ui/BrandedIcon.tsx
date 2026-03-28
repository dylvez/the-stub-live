interface BrandedIconProps {
  src: string;
  size?: number;
  alt: string;
  className?: string;
}

/** Renders a branded image icon */
export function BrandedIcon({
  src,
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
