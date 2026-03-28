import { NavLink } from 'react-router-dom';
import { Home, Search, PlusCircle, Ticket, Sparkles } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/create', icon: PlusCircle, label: 'Stub It' },
  { to: '/stubs', icon: Ticket, label: 'My Stubs' },
  { to: '/ask', icon: Sparkles, label: 'Ask Stub' },
];

export function BottomNav(): React.JSX.Element {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-stub-bg/95 backdrop-blur-md border-t border-stub-border">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-1">
        {navItems.map(({ to, icon: Icon, label }) => (
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
                {to === '/create' ? (
                  <PlusCircle
                    className={`w-7 h-7 ${isActive ? 'text-stub-amber' : 'text-stub-amber/70'}`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                ) : (
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
                )}
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
