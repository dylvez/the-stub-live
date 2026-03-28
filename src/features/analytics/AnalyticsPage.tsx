import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, Ticket, MapPin, Music, Calendar, Star, TrendingUp,
  BarChart3, Award, Flame,
} from 'lucide-react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { Card } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/firebase/config';

interface StubRecord {
  id: string;
  artistName?: string;
  venueName?: string;
  venueId: string;
  date: Timestamp;
  rating: number;
  status?: string;
  highlights: string[];
  artistIds: string[];
}

export function AnalyticsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stubs, setStubs] = useState<StubRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'stubs'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
    );
    getDocs(q).then((snap) => {
      setStubs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as StubRecord)));
    }).catch((err) => {
      console.error('Analytics query failed:', err.code, err.message);
      // If composite index is needed, try without orderBy
      const fallbackQ = query(collection(db, 'stubs'), where('userId', '==', user.uid));
      return getDocs(fallbackQ).then((snap) => {
        const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StubRecord));
        results.sort((a, b) => {
          const da = a.date && typeof a.date !== 'string' && 'toDate' in a.date ? a.date.toDate().getTime() : 0;
          const db2 = b.date && typeof b.date !== 'string' && 'toDate' in b.date ? b.date.toDate().getTime() : 0;
          return db2 - da;
        });
        setStubs(results);
      });
    }).catch((err) => {
      console.error('Analytics fallback also failed:', err);
    }).finally(() => setLoading(false));
  }, [user]);

  const stats = useMemo(() => {
    const attended = stubs.filter((s) => s.status === 'attended');
    const totalShows = attended.length;
    const uniqueVenues = new Set(attended.map((s) => s.venueName).filter(Boolean));
    const uniqueArtists = new Set(attended.flatMap((s) => s.artistIds ?? []).filter(Boolean));
    const avgRating = totalShows > 0
      ? attended.reduce((sum, s) => sum + (s.rating || 0), 0) / attended.filter((s) => s.rating > 0).length
      : 0;

    // Top venues by frequency
    const venueCounts = new Map<string, number>();
    attended.forEach((s) => {
      if (s.venueName) venueCounts.set(s.venueName, (venueCounts.get(s.venueName) ?? 0) + 1);
    });
    const topVenues = Array.from(venueCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Top artists by frequency
    const artistCounts = new Map<string, number>();
    attended.forEach((s) => {
      if (s.artistName) artistCounts.set(s.artistName, (artistCounts.get(s.artistName) ?? 0) + 1);
    });
    const topArtists = Array.from(artistCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Shows by month (last 12 months)
    const monthCounts = new Map<string, number>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthCounts.set(key, 0);
    }
    attended.forEach((s) => {
      const d = s.date.toDate();
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (monthCounts.has(key)) monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
    });

    // Highlights frequency
    const highlightCounts = new Map<string, number>();
    attended.forEach((s) => {
      (s.highlights ?? []).forEach((h) => {
        highlightCounts.set(h, (highlightCounts.get(h) ?? 0) + 1);
      });
    });
    const topHighlights = Array.from(highlightCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Highest rated show
    const highestRated = attended.filter((s) => s.rating > 0).sort((a, b) => b.rating - a.rating)[0];

    // Going count
    const goingCount = stubs.filter((s) => s.status === 'going').length;

    return {
      totalShows, uniqueVenues: uniqueVenues.size, uniqueArtists: uniqueArtists.size,
      avgRating, topVenues, topArtists, monthCounts, topHighlights, highestRated, goingCount,
    };
  }, [stubs]);

  if (!user) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-stub-muted">Sign in to see your concert analytics.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 pb-24">
      <Helmet>
        <title>My Concert Stats — The Stub Live</title>
      </Helmet>

      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-stub-muted hover:text-stub-text transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="font-display font-bold text-stub-text text-2xl mb-1">Your Concert Stats</h1>
      <p className="text-sm text-stub-muted mb-6">Your live music journey, by the numbers.</p>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-stub-amber border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stubs.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Ticket className="w-8 h-8 text-stub-muted mx-auto mb-2" />
            <p className="text-stub-muted text-sm">No stubs yet. Create your first stub to see your stats!</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Big numbers */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { icon: Ticket, value: stats.totalShows, label: 'Shows Attended', color: 'text-stub-amber' },
              { icon: MapPin, value: stats.uniqueVenues, label: 'Venues Visited', color: 'text-stub-cyan' },
              { icon: Music, value: stats.uniqueArtists, label: 'Artists Seen', color: 'text-stub-coral' },
              { icon: Star, value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—', label: 'Avg Rating', color: 'text-stub-amber' },
            ].map(({ icon: Icon, value, label, color }) => (
              <Card key={label}>
                <div className="text-center py-2">
                  <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
                  <div className="text-2xl font-display font-bold text-stub-text">{value}</div>
                  <div className="text-[10px] text-stub-muted uppercase tracking-wider">{label}</div>
                </div>
              </Card>
            ))}
          </div>

          {/* Upcoming */}
          {stats.goingCount > 0 && (
            <Card className="mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-stub-amber" />
                <div>
                  <span className="text-lg font-display font-bold text-stub-text">{stats.goingCount}</span>
                  <span className="text-sm text-stub-muted ml-1.5">{stats.goingCount === 1 ? 'show' : 'shows'} coming up</span>
                </div>
              </div>
            </Card>
          )}

          {/* Monthly activity chart */}
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-stub-text flex items-center gap-1.5 mb-3">
              <BarChart3 className="w-4 h-4 text-stub-amber" />
              Monthly Activity
            </h2>
            <Card>
              <div className="flex items-end gap-1 h-28 px-1">
                {Array.from(stats.monthCounts.entries()).map(([month, count]) => {
                  const maxCount = Math.max(...Array.from(stats.monthCounts.values()), 1);
                  const height = count > 0 ? Math.max((count / maxCount) * 100, 8) : 4;
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t transition-all ${count > 0 ? 'bg-stub-amber' : 'bg-stub-border'}`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-[8px] text-stub-muted">{month.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>

          {/* Top venues */}
          {stats.topVenues.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-stub-text flex items-center gap-1.5 mb-3">
                <MapPin className="w-4 h-4 text-stub-cyan" />
                Top Venues
              </h2>
              <div className="space-y-2">
                {stats.topVenues.map(([name, count], i) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-5 text-center text-xs font-mono text-stub-muted">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-stub-text">{name}</span>
                        <span className="text-xs font-mono text-stub-amber">{count}x</span>
                      </div>
                      <div className="mt-1 h-1 bg-stub-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-stub-cyan rounded-full"
                          style={{ width: `${(count / stats.topVenues[0][1]) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Top artists */}
          {stats.topArtists.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-stub-text flex items-center gap-1.5 mb-3">
                <Music className="w-4 h-4 text-stub-coral" />
                Most Seen Artists
              </h2>
              <div className="space-y-2">
                {stats.topArtists.map(([name, count], i) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-5 text-center text-xs font-mono text-stub-muted">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-stub-text">{name}</span>
                        <span className="text-xs font-mono text-stub-coral">{count}x</span>
                      </div>
                      <div className="mt-1 h-1 bg-stub-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-stub-coral rounded-full"
                          style={{ width: `${(count / stats.topArtists[0][1]) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Highest rated */}
          {stats.highestRated && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-stub-text flex items-center gap-1.5 mb-3">
                <Award className="w-4 h-4 text-stub-amber" />
                Highest Rated Show
              </h2>
              <Card hover className="cursor-pointer" onClick={() => navigate(`/stub/${stats.highestRated.id}`)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-stub-amber/20 to-stub-coral/20 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-stub-amber" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-stub-text truncate">{stats.highestRated.artistName ?? 'Unknown'}</div>
                    <div className="text-xs text-stub-muted">{stats.highestRated.venueName ?? 'Unknown Venue'}</div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-4 h-4 fill-stub-amber text-stub-amber" />
                    <span className="text-sm font-bold text-stub-amber">{stats.highestRated.rating}</span>
                  </div>
                </div>
              </Card>
            </section>
          )}

          {/* Top highlights */}
          {stats.topHighlights.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-stub-text flex items-center gap-1.5 mb-3">
                <TrendingUp className="w-4 h-4 text-stub-amber" />
                Common Highlights
              </h2>
              <div className="flex flex-wrap gap-2">
                {stats.topHighlights.map(([highlight, count]) => (
                  <span
                    key={highlight}
                    className="px-3 py-1.5 bg-stub-surface border border-stub-border rounded-full text-xs text-stub-text"
                  >
                    {highlight} <span className="text-stub-muted ml-1">×{count}</span>
                  </span>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
