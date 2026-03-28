import type { InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: 'search';
  /** Show a clear (X) button and call this when clicked */
  onClear?: () => void;
}

export function Input({
  label,
  icon,
  onClear,
  className = '',
  id,
  ...props
}: InputProps): React.JSX.Element {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const showClear = onClear && props.value && String(props.value).length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm text-stub-muted font-medium">
          {label}
        </label>
      )}
      <div className="relative">
        {icon === 'search' && (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stub-muted" />
        )}
        <input
          id={inputId}
          className={`w-full bg-stub-surface border border-stub-border rounded-lg px-3 py-2
            text-stub-text placeholder:text-stub-muted/50
            focus:outline-none focus:border-stub-amber/50 focus:ring-1 focus:ring-stub-amber/20
            transition-colors
            ${icon ? 'pl-10' : ''}
            ${showClear ? 'pr-9' : ''}
            ${className}`}
          {...props}
        />
        {showClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stub-muted hover:text-stub-text transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
