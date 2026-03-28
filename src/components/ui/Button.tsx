import { motion } from 'framer-motion';
import type { ReactNode, MouseEventHandler } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-stub-amber text-stub-bg hover:bg-stub-amber-dim font-semibold',
  secondary: 'bg-stub-surface text-stub-text border border-stub-border hover:bg-stub-surface-hover',
  ghost: 'text-stub-muted hover:text-stub-text hover:bg-stub-surface',
  danger: 'bg-stub-coral/10 text-stub-coral border border-stub-coral/20 hover:bg-stub-coral/20',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  loading,
  disabled,
  className = '',
  onClick,
  type = 'button',
}: ButtonProps): React.JSX.Element {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      type={type}
      className={`inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer
        ${variantStyles[variant]} ${sizeStyles[size]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </motion.button>
  );
}
