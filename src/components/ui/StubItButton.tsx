import { PenLine } from 'lucide-react';

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
      className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium
        bg-stub-violet/10 text-stub-violet hover:bg-stub-violet/20 transition-colors"
    >
      <PenLine className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Stub It
    </button>
  );
}
