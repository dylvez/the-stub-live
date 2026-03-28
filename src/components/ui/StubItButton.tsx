import { NAV_ICONS } from '@/utils/constants';

interface StubItButtonProps {
  onClick: (e: React.MouseEvent) => void;
}

/** Consistent "Stub It" CTA button used across all show/event cards */
export function StubItButton({ onClick }: StubItButtonProps): React.JSX.Element {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
        bg-stub-violet/10 text-stub-violet hover:bg-stub-violet/20 transition-colors"
    >
      <img
        src={NAV_ICONS['/create']}
        alt=""
        className="w-6 h-6"
        style={{ mixBlendMode: 'screen', filter: 'contrast(2)' }}
      />
      Stub It
    </button>
  );
}
