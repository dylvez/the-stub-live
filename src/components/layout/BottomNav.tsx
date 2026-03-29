import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home', emoji: '🏠' },
  { to: '/search', label: 'Search', emoji: '🔍' },
  { to: '/create', label: 'Stub It', emoji: '🎫' },
  { to: '/stubs', label: 'My Stubs', emoji: '🎟️' },
  { to: '/ask', label: 'The Roadie', emoji: '✨' },
];

export function BottomNav(): React.JSX.Element {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-stub-bg/95 backdrop-blur-md border-t border-stub-border">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-1">
        {navItems.map(({ to, label, emoji }) => (
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
                <span className={`text-xl ${isActive ? '' : 'opacity-40 grayscale'}`}>{emoji}</span>
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
