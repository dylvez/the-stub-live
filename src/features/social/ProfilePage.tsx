import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket, MapPin, Music, LogOut, Edit2, Check, X, Star, Link2, ExternalLink, ChevronRight,
} from 'lucide-react';
import { doc, updateDoc, Timestamp, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Card, Button, Input, Badge } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { db } from '@/services/firebase/config';
import type { StubVisibility, SocialLinks } from '@/types';

const SOCIAL_PLATFORMS = [
  { key: 'instagram' as const, label: 'Instagram', prefix: 'instagram.com/', iconPath: '/images/platform-instagram.svg', urlBase: 'https://instagram.com/' },
  { key: 'x' as const, label: 'X (Twitter)', prefix: 'x.com/', iconPath: '/images/platform-x.svg', urlBase: 'https://x.com/' },
  { key: 'facebook' as const, label: 'Facebook', prefix: 'facebook.com/', iconPath: '/images/platform-facebook.svg', urlBase: 'https://facebook.com/' },
  { key: 'tiktok' as const, label: 'TikTok', prefix: 'tiktok.com/@', iconPath: '/images/platform-tiktok.svg', urlBase: 'https://tiktok.com/@' },
  { key: 'threads' as const, label: 'Threads', prefix: 'threads.net/@', iconPath: '/images/platform-threads.svg', urlBase: 'https://threads.net/@' },
  { key: 'youtube' as const, label: 'YouTube', prefix: 'youtube.com/@', iconPath: '/images/platform-youtube.svg', urlBase: 'https://youtube.com/@' },
] as const;

interface StubRecord {
  id: string;
  artistName?: string;
  venueName?: string;
  artistImage?: string;
  date: { toDate?: () => Date } | string;
  rating?: number;
  highlights?: string[];
  visibility: StubVisibility;
  status?: string;
}

function getDate(val: { toDate?: () => Date } | string | undefined): Date {
  if (!val) return new Date();
  if (typeof val === 'string') return new Date(val);
  if (typeof val.toDate === 'function') return val.toDate();
  return new Date();
}

export function ProfilePage(): React.JSX.Element {
  const navigate = useNavigate();
  const { user, userData, signOut } = useAuth();
  const { location: userLocation } = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState(userData?.bio ?? '');
  const [editHandle, setEditHandle] = useState(userData?.handle ?? '');
  const [editSocialLinks, setEditSocialLinks] = useState<SocialLinks>(userData?.socialLinks ?? {});
  const [stubs, setStubs] = useState<StubRecord[]>([]);
  const [stubsLoading, setStubsLoading] = useState(true);

  // Fetch user's stubs
  useEffect(() => {
    if (!user) { setStubsLoading(false); return; }
    getDocs(
      query(collection(db, 'stubs'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
    ).then((snapshot) => {
      setStubs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as StubRecord));
    }).catch(() => {
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem('stub:my-stubs');
        if (raw) setStubs(JSON.parse(raw));
      } catch { /* ignore */ }
    }).finally(() => setStubsLoading(false));
  }, [user]);

  // Compute stats from actual stubs
  const computedStats = useMemo(() => {
    const artistSet = new Set<string>();
    const venueSet = new Set<string>();
    for (const s of stubs) {
      if (s.artistName) artistSet.add(s.artistName.toLowerCase());
      if (s.venueName) venueSet.add(s.venueName.toLowerCase());
    }
    return { totalShows: stubs.length, totalArtists: artistSet.size, totalVenues: venueSet.size };
  }, [stubs]);

  async function handleSignOut(): Promise<void> {
    await signOut();
    navigate('/');
  }

  async function handleSaveProfile(): Promise<void> {
    if (!user) return;
    try {
      // Clean empty strings from social links
      const cleanedLinks: SocialLinks = {};
      for (const [k, v] of Object.entries(editSocialLinks)) {
        if (v && v.trim()) (cleanedLinks as Record<string, string>)[k] = v.trim();
      }
      await updateDoc(doc(db, 'users', user.uid), {
        bio: editBio,
        handle: editHandle,
        socialLinks: cleanedLinks,
        updatedAt: Timestamp.now(),
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  }

  const displayName = userData?.displayName ?? user?.displayName ?? 'Music Fan';
  const handle = isEditing ? editHandle : (userData?.handle ?? user?.email?.split('@')[0] ?? 'user');
  const avatar = userData?.avatar ?? user?.photoURL ?? '';
  const bio = isEditing ? editBio : (userData?.bio ?? '');
  const stats = userData?.stats;

  return (
    <div className="px-4 py-4">
      {/* Profile header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-stub-amber">
            {avatar ? (
              <img src={avatar} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-stub-amber to-stub-coral flex items-center justify-center">
                <span className="text-2xl font-display font-bold text-stub-bg">{displayName.charAt(0)}</span>
              </div>
            )}
          </div>
          <div>
            <h1 className="font-display font-bold text-stub-text text-xl">{displayName}</h1>
            {isEditing ? (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-sm text-stub-muted">@</span>
                <input
                  value={editHandle}
                  onChange={(e) => setEditHandle(e.target.value)}
                  className="bg-stub-surface border border-stub-border rounded px-1.5 py-0.5 text-sm text-stub-text w-28
                    focus:outline-none focus:border-stub-amber/50"
                />
              </div>
            ) : (
              <p className="text-sm text-stub-muted">@{handle}</p>
            )}
            <p className="text-xs text-stub-muted flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" /> {userLocation.city}, {userLocation.state}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveProfile}
                className="p-2 text-stub-amber hover:bg-stub-amber/10 transition-colors rounded-lg"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => { setIsEditing(false); setEditBio(userData?.bio ?? ''); setEditHandle(userData?.handle ?? ''); setEditSocialLinks(userData?.socialLinks ?? {}); }}
                className="p-2 text-stub-muted hover:text-stub-text transition-colors rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setIsEditing(true); setEditBio(userData?.bio ?? ''); setEditHandle(userData?.handle ?? ''); setEditSocialLinks(userData?.socialLinks ?? {}); }}
                className="p-2 text-stub-muted hover:text-stub-text transition-colors rounded-lg hover:bg-stub-surface"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bio */}
      {isEditing ? (
        <div className="mb-6">
          <Input
            placeholder="Write something about your music taste..."
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
          />
        </div>
      ) : bio ? (
        <p className="text-sm text-stub-muted mb-6 italic">
          &ldquo;{bio}&rdquo;
        </p>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm text-stub-muted mb-6 italic hover:text-stub-text transition-colors"
        >
          + Add a bio...
        </button>
      )}

      {/* Social links */}
      {isEditing ? (
        <div className="mb-6">
          <h3 className="text-xs text-stub-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" />
            Social Accounts
          </h3>
          <div className="space-y-2">
            {SOCIAL_PLATFORMS.map(({ key, label, iconPath }) => (
              <div key={key} className="flex items-center gap-2">
                <img src={iconPath} alt={label} className="w-4 h-4 ml-1" />
                <input
                  type="text"
                  value={editSocialLinks[key] ?? ''}
                  onChange={(e) => setEditSocialLinks((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={`${label} username`}
                  className="flex-1 bg-stub-surface border border-stub-border rounded-lg px-3 py-1.5 text-sm text-stub-text
                    placeholder:text-stub-muted/50 focus:outline-none focus:border-stub-amber/50 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        (() => {
          const links = userData?.socialLinks;
          const activeLinks = links ? SOCIAL_PLATFORMS.filter((p) => links[p.key]) : [];
          return activeLinks.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-6">
              {activeLinks.map(({ key, label, iconPath, urlBase }) => (
                <a
                  key={key}
                  href={`${urlBase}${links![key]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-stub-surface border border-stub-border rounded-full text-xs text-stub-muted hover:text-stub-text hover:border-stub-amber/50 transition-colors"
                >
                  <img src={iconPath} alt={label} className="w-4 h-4" />
                  <span>@{links![key]}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          ) : !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-sm text-stub-muted mb-6 hover:text-stub-text transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              + Link your social accounts
            </button>
          ) : null;
        })()
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { icon: Ticket, label: 'Shows', value: String(computedStats.totalShows), color: 'text-stub-amber' },
          { icon: Music, label: 'Artists', value: String(computedStats.totalArtists), color: 'text-stub-coral' },
          { icon: MapPin, label: 'Venues', value: String(computedStats.totalVenues), color: 'text-stub-cyan' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="text-center !p-3">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <div className={`text-lg font-display font-bold ${color}`}>{value}</div>
            <div className="text-[10px] text-stub-muted">{label}</div>
          </Card>
        ))}
      </div>

      {/* Recent Stubs */}
      {stubsLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-stub-amber border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Ticket className="w-10 h-10 text-stub-border-light mb-3" />
          <h3 className="font-display font-bold text-stub-text mb-1">Your concert story starts here</h3>
          <p className="text-sm text-stub-muted max-w-xs mb-4">
            Create stubs from shows you attend to build your taste profile, stats, and concert history.
          </p>
          <Button variant="primary" icon={<Ticket className="w-4 h-4" />} onClick={() => navigate('/create')}>
            Create Your First Stub
          </Button>
        </div>
      ) : (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-stub-text text-lg">Recent Stubs</h2>
            <button
              onClick={() => navigate('/stubs')}
              className="text-xs text-stub-amber hover:text-stub-text transition-colors"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {stubs.slice(0, 5).map((stub) => {
              const stubDate = getDate(stub.date);
              return (
                <Card key={stub.id} hover className="cursor-pointer" onClick={() => navigate(`/stub/${stub.id}`)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-stub-border">
                      {stub.artistImage ? (
                        <img src={stub.artistImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-stub-amber/20 to-stub-coral/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-stub-amber/40">
                            {(stub.artistName ?? '?').charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-stub-text truncate">
                        {stub.artistName ?? 'Unknown Artist'}
                      </div>
                      <div className="text-xs text-stub-muted flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {stub.venueName ?? 'Unknown Venue'}
                        </span>
                        <span className="font-mono">
                          {stubDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {stub.status === 'going' ? (
                        <Badge variant="cyan" className="text-[9px]">Going</Badge>
                      ) : stub.rating && stub.rating > 0 ? (
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-stub-amber text-stub-amber" />
                          <span className="text-xs font-mono text-stub-amber">{stub.rating}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Analytics link */}
      <Card hover className="cursor-pointer mt-6" onClick={() => navigate('/analytics')}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stub-amber/10 flex items-center justify-center">
            <Star className="w-5 h-5 text-stub-amber" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-stub-text">Concert Stats</div>
            <div className="text-xs text-stub-muted">Your live music journey, by the numbers</div>
          </div>
          <ChevronRight className="w-4 h-4 text-stub-muted" />
        </div>
      </Card>

      {/* Sign out */}
      <div className="mt-6 pt-6 border-t border-stub-border">
        <Button
          variant="ghost"
          className="w-full text-stub-muted hover:text-stub-coral"
          icon={<LogOut className="w-4 h-4" />}
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
