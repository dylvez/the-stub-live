import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AppShell } from '@/components/layout';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { RequireAuth } from '@/components/auth/RequireAuth';

const DiscoveryPage = lazy(() => import('@/features/discovery/DiscoveryPage').then((m) => ({ default: m.DiscoveryPage })));
const SearchPage = lazy(() => import('@/features/discovery/SearchPage').then((m) => ({ default: m.SearchPage })));
const ArtistPage = lazy(() => import('@/features/artist/ArtistPage').then((m) => ({ default: m.ArtistPage })));
const MyStubsPage = lazy(() => import('@/features/journal/MyStubsPage').then((m) => ({ default: m.MyStubsPage })));
const CreateStubPage = lazy(() => import('@/features/journal/CreateStubPage').then((m) => ({ default: m.CreateStubPage })));
const VenuePage = lazy(() => import('@/features/venues/VenuePage').then((m) => ({ default: m.VenuePage })));
const ProfilePage = lazy(() => import('@/features/social/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const LoginPage = lazy(() => import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const StubDetailPage = lazy(() => import('@/features/journal/StubDetailPage').then((m) => ({ default: m.StubDetailPage })));
const UserProfilePage = lazy(() => import('@/features/social/UserProfilePage').then((m) => ({ default: m.UserProfilePage })));
const AnalyticsPage = lazy(() => import('@/features/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const AskStubPage = lazy(() => import('@/features/recommendations/AskStubPage').then((m) => ({ default: m.AskStubPage })));
const EventPage = lazy(() => import('@/features/event/EventPage').then((m) => ({ default: m.EventPage })));

function LoadingSpinner(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-stub-amber border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App(): React.JSX.Element {
  return (
    <HelmetProvider>
    <AuthProvider>
      <LocationProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Login — no shell */}
            <Route path="/login" element={<LoginPage />} />

            {/* App shell routes */}
            <Route element={<AppShell />}>
              {/* Public */}
              <Route path="/" element={<DiscoveryPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/artist/:id" element={<ArtistPage />} />
              <Route path="/event/:id" element={<EventPage />} />
              <Route path="/venue/:id" element={<VenuePage />} />
              <Route path="/stub/:id" element={<StubDetailPage />} />
              <Route path="/user/:id" element={<UserProfilePage />} />

              {/* Protected — require sign-in */}
              <Route path="/create" element={<RequireAuth><CreateStubPage /></RequireAuth>} />
              <Route path="/stubs" element={<RequireAuth><MyStubsPage /></RequireAuth>} />
              <Route path="/analytics" element={<RequireAuth><AnalyticsPage /></RequireAuth>} />
              <Route path="/ask" element={<RequireAuth><AskStubPage /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
    </HelmetProvider>
  );
}
