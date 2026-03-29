import { motion } from 'framer-motion';
import type { ReactNode, MouseEventHandler } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'tinted';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonShape = 'default' | 'pill';
type TintColor = 'amber' | 'coral' | 'cyan' | 'green' | 'violet';

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  tintColor?: TintColor;
  children: ReactNode;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

interface ButtonAsButton extends ButtonBaseProps {
  href?: undefined;
  target?: undefined;
  rel?: undefined;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

interface ButtonAsAnchor extends ButtonBaseProps {
  href: string;
  target?: string;
  rel?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const baseVariantStyles: Record<Exclude<ButtonVariant, 'tinted'>, string> = {
  primary: 'bg-stub-amber text-stub-bg hover:bg-stub-amber-dim font-semibold',
  secondary: 'bg-stub-surface text-stub-text border border-stub-border hover:bg-stub-surface-hover',
  ghost: 'text-stub-muted hover:text-stub-text hover:bg-stub-surface',
  danger: 'bg-stub-coral/10 text-stub-coral border border-stub-coral/20 hover:bg-stub-coral/20',
};

const tintStyles: Record<TintColor, string> = {
  amber: 'bg-stub-amber/15 text-stub-amber hover:bg-stub-amber/25',
  coral: 'bg-stub-coral/15 text-stub-coral hover:bg-stub-coral/25',
  cyan: 'bg-stub-cyan/15 text-stub-cyan hover:bg-stub-cyan/25',
  green: 'bg-stub-green/15 text-stub-green hover:bg-stub-green/25',
  violet: 'bg-stub-violet/15 text-stub-violet hover:bg-stub-violet/25',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

export function Button(props: ButtonProps): React.JSX.Element {
  const {
    variant = 'primary',
    size = 'md',
    shape = 'default',
    tintColor = 'amber',
    children,
    icon,
    loading,
    disabled,
    className = '',
    type = 'button',
  } = props;

  const variantClass = variant === 'tinted'
    ? tintStyles[tintColor]
    : baseVariantStyles[variant];
  const shapeClass = shape === 'pill' ? 'rounded-full' : 'rounded-lg';

  const classes = `inline-flex items-center justify-center transition-colors cursor-pointer
    ${variantClass} ${sizeStyles[size]} ${shapeClass}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}`;

  const content = (
    <>
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </>
  );

  if (props.href) {
    return (
      <motion.a
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        href={props.href}
        target={props.target}
        rel={props.rel}
        className={classes}
        onClick={props.onClick as MouseEventHandler<HTMLAnchorElement>}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={(props as ButtonAsButton).onClick}
    >
      {content}
    </motion.button>
  );
}
