import { NAV_ICONS } from '@/utils/constants';

interface StubItButtonProps {
  onClick: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md';
}

/** Consistent "Stub It" CTA button used across all show/event cards */
export function StubItButton({ onClick, size = 'sm' }: StubItButtonProps): React.JSX.Element {
  const isSmall = size === 'sm';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={`inline-flex items-center gap-1 rounded-full font-medium
        bg-stub-violet/10 text-stub-violet hover:bg-stub-violet/20 transition-colors
        ${isSmall ? 'px-2 py-0.5 text-xs' : 'px-3 py-1.5 text-sm'}`}
    >
      <img
        src={NAV_ICONS['/create']}
        alt=""
        className={isSmall ? 'w-3.5 h-3.5' : 'w-5 h-5'}
        style={{ mixBlendMode: 'screen', filter: 'contrast(2)' }}
      />
      Stub It
    </button>
  );
}
