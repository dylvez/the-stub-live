import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LogIn } from 'lucide-react';
import { Button } from '@/components/ui';
import { LocationChip, LocationPicker } from '@/components/location';
import { useLocation } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';

export function TopBar(): React.JSX.Element {
  const { location, isDetecting, setLocation, detectLocation } = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 bg-stub-bg/95 backdrop-blur-md border-b border-stub-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <button
            onClick={() => {
              if (window.location.pathname === '/') {
                // Already on home — force full reload to reset state
                window.location.reload();
              } else {
                navigate('/');
              }
            }}
            className="flex items-center gap-2"
          >
            <img src="/images/logo-stub-v4.png" alt="The Stub Live" className="w-8 h-8 rounded-lg hidden sm:block" />
            <span className="font-display font-bold text-stub-text text-sm tracking-tight">
              THE STUB LIVE
            </span>
          </button>

          <LocationChip
            city={location.city}
            state={location.state}
            isDetecting={isDetecting}
            onClick={() => setPickerOpen(true)}
          />

          <div className="flex items-center gap-1">
            {user ? (
              <>
                <button
                  onClick={() => navigate('/search')}
                  className="p-2 text-stub-muted hover:text-stub-text transition-colors rounded-lg hover:bg-stub-surface"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="w-8 h-8 rounded-full overflow-hidden ml-1 border-2 border-transparent hover:border-stub-amber transition-colors"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-stub-amber to-stub-coral flex items-center justify-center">
                      <span className="text-xs font-bold text-stub-bg">
                        {(user.displayName ?? 'U').charAt(0)}
                      </span>
                    </div>
                  )}
                </button>
              </>
            ) : (
              <Button variant="primary" shape="pill" size="sm"
                onClick={() => navigate('/login')}
                icon={<LogIn className="w-3.5 h-3.5" />}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <LocationPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentLocation={location}
        onSelect={setLocation}
        onDetect={detectLocation}
        isDetecting={isDetecting}
      />
    </>
  );
}
