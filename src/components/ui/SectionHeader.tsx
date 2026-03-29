import type { ReactNode } from 'react';

interface SectionHeaderProps {
  icon?: ReactNode;
  title: string;
  trailing?: ReactNode;
}

export function SectionHeader({ icon, title, trailing }: SectionHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon && <span className="shrink-0">{icon}</span>}
      <h2 className="font-display font-bold text-stub-text text-lg">{title}</h2>
      {trailing && <div className="ml-auto">{trailing}</div>}
    </div>
  );
}
