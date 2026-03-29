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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
        bg-stub-violet/10 text-stub-violet hover:bg-stub-violet/20 transition-colors"
    >
      🎫 Stub It
    </button>
  );
}
