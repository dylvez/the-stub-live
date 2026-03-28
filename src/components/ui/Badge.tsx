import type { ReactNode } from 'react';

type BadgeVariant = 'amber' | 'coral' | 'cyan' | 'muted';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  amber: 'bg-stub-amber/15 text-stub-amber border-stub-amber/20',
  coral: 'bg-stub-coral/15 text-stub-coral border-stub-coral/20',
  cyan: 'bg-stub-cyan/15 text-stub-cyan border-stub-cyan/20',
  muted: 'bg-stub-surface text-stub-muted border-stub-border',
};

export function Badge({ children, variant = 'muted', className = '' }: BadgeProps): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border
        ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
