import { NavLink } from 'react-router-dom';
import { NAV_ICONS } from '@/utils/constants';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/search', label: 'Search' },
  { to: '/create', label: 'Stub It' },
  { to: '/stubs', label: 'My Stubs' },
  { to: '/ask', label: 'Ask Stub' },
];

export function BottomNav(): React.JSX.Element {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-stub-bg/95 backdrop-blur-md border-t border-stub-border">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-1">
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors
              ${isActive ? 'text-stub-amber' : 'text-stub-muted hover:text-stub-text'}`
            }
          >
            {({ isActive }) => (
              <>
                <img
                  src={NAV_ICONS[to]}
                  alt={label}
                  className={`${to === '/create' ? 'w-10 h-10' : 'w-8 h-8'} ${isActive ? '' : 'opacity-40 grayscale'}`}
                  style={{ mixBlendMode: 'screen', filter: 'contrast(2)' }}
                />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
