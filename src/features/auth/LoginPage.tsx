import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

export function LoginPage(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signInWithGoogle, loading } = useAuth();

  // Redirect if already signed in
  const from = (location.state as { from?: string })?.from ?? '/';
  useEffect(() => {
    if (user && !loading) {
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, from]);

  async function handleGoogleSignIn(): Promise<void> {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign-in failed:', err);
    }
  }

  return (
    <div className="min-h-screen bg-stub-bg flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center"
      >
        {/* Hero image */}
        <div className="mb-6">
          <img
            src="/images/login-hero.png"
            alt=""
            className="w-full max-w-xs mx-auto rounded-2xl mb-4 opacity-90"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <img src="/images/logo-stub-v4.png" alt="The Stub Live" className="w-16 h-16 rounded-2xl mx-auto mb-4" />
          <h1 className="font-display font-bold text-stub-text text-2xl tracking-tight">THE STUB LIVE</h1>
          <p className="text-stub-muted text-sm mt-2">Your live music companion</p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-8">
          {[
            'Discover shows near you',
            'Catalog your concert experiences',
            'Share your live music story',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-3 text-left">
              <Music className="w-4 h-4 text-stub-amber shrink-0" />
              <span className="text-sm text-stub-text">{feature}</span>
            </div>
          ))}
        </div>

        {/* Sign in button */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleGoogleSignIn}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </Button>

        <p className="text-xs text-stub-muted mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
