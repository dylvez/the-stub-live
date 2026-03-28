interface BrandedSpinnerProps {
  size?: number;
  className?: string;
}

export function BrandedSpinner({ size = 16, className = '' }: BrandedSpinnerProps): React.JSX.Element {
  return (
    <img
      src="/images/loading-spinner.png"
      alt="Loading"
      role="status"
      className={`animate-spin ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
