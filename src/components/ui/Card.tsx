import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  glow?: 'amber' | 'coral' | 'cyan';
  padding?: boolean;
}

export function Card({
  children,
  hover = false,
  glow,
  padding = true,
  className = '',
  ...props
}: CardProps): React.JSX.Element {
  return (
    <div
      className={`bg-stub-surface rounded-xl border border-stub-border paper-grain
        ${hover ? 'hover:bg-stub-surface-hover hover:border-stub-border-light transition-colors cursor-pointer' : ''}
        ${glow ? `glow-${glow}` : ''}
        ${padding ? 'p-4' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
