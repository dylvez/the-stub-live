import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
  Ticket, PlusCircle, MapPin, Calendar, Star, Search, SlidersHorizontal,
  Music, Eye, Clock, List, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/firebase/config';
import type { StubVisibility } from '@/types';

interface StubRecord {
  id: string;
  artistName: string;
  venueName: string;
  date: { toDate?: () => Date } | string;
  rating: number;
  vibeRating: { energy: number; crowd: number; sound: number; intimacy: number };
  highlights: string[];
  photoCount: number;
  visibility: StubVisibility;
  createdAt: { toDate?: () => Date } | string;
}

function getDate(val: { toDate?: () => Date } | string): Date {
  if (typeof val === 'string') return new Date(val);
  if (val && typeof val.toDate === 'function') return val.toDate();
  return new Date();
}

type SortBy = 'newest' | 'oldest' | 'highest-rated';

export function MyStubsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stubs, setStubs] = useState<StubRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMinRating, setFilterMinRating] = useState(0);
  const [filterVisibility, setFilterVisibility] = useState<StubVisibility | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Fetch stubs from Firestore
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function fetchStubs(): Promise<void> {
      try {
        const q = query(
          collection(db, 'stubs'),
          where('userId', '==', user!.uid),
          orderBy('createdAt', 'desc'),
        );
        const snapshot = await getDocs(q);
        const firestoreStubs = snapshot.docs.map((d) => d.data() as StubRecord);

        if (firestoreStubs.length > 0) {
          setStubs(firestoreStubs);
        } else {
          const raw = localStorage.getItem('stub:my-stubs');
          if (raw) try { setStubs(JSON.parse(raw)); } catch { /* ignore */ }
        }
      } catch {
        const raw = localStorage.getItem('stub:my-stubs');
        if (raw) try { setStubs(JSON.parse(raw)); } catch { /* ignore */ }
      } finally {
        setLoading(false);
      }
    }

    fetchStubs();
  }, [user]);

  // Derived: unique years
  const years = useMemo(() => {
    const yearSet = new Set<string>();
    for (const s of stubs) {
      yearSet.add(String(getDate(s.date).getFullYear()));
    }
    return Array.from(yearSet).sort().reverse();
  }, [stubs]);

  // Derived: stats
  const stats = useMemo(() => {
    const artistSet = new Set<string>();
    const venueSet = new Set<string>();
    for (const s of stubs) {
      if (s.artistName) artistSet.add(s.artistName.toLowerCase());
      if (s.venueName) venueSet.add(s.venueName.toLowerCase());
    }
    return { total: stubs.length, artists: artistSet.size, venues: venueSet.size };
  }, [stubs]);

  // "On This Day" memory
  const onThisDay = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    const thisYear = now.getFullYear();
    return stubs.filter((s) => {
      const d = getDate(s.date);
      return d.getMonth() === month && d.getDate() === day && d.getFullYear() !== thisYear;
    });
  }, [stubs]);

  // Filtered + sorted stubs
  const filteredStubs = useMemo(() => {
    let result = [...stubs];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) => (s.artistName ?? '').toLowerCase().includes(q) || (s.venueName ?? '').toLowerCase().includes(q),
      );
    }

    // Year
    if (filterYear !== 'all') {
      result = result.filter((s) => String(getDate(s.date).getFullYear()) === filterYear);
    }

    // Min rating
    if (filterMinRating > 0) {
      result = result.filter((s) => s.rating >= filterMinRating);
    }

    // Visibility
    if (filterVisibility !== 'all') {
      result = result.filter((s) => s.visibility === filterVisibility);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => getDate(b.createdAt).getTime() - getDate(a.createdAt).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => getDate(a.createdAt).getTime() - getDate(b.createdAt).getTime());
        break;
      case 'highest-rated':
        result.sort((a, b) => b.rating - a.rating);
        break;
    }

    return result;
  }, [stubs, searchQuery, filterYear, filterMinRating, filterVisibility, sortBy]);

  // Map stubs by date string for calendar lookup
  const stubsByDate = useMemo(() => {
    const map = new Map<string, StubRecord[]>();
    for (const s of stubs) {
      const key = getDate(s.date).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [stubs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stub-amber border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Ticket className="w-6 h-6 text-stub-amber" />
          <h1 className="font-display font-bold text-stub-text text-xl">My Stubs</h1>
          {stubs.length > 0 && (
            <span className="text-xs font-mono text-stub-muted">{stubs.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {stubs.length > 0 && (
            <div className="flex bg-stub-surface border border-stub-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-stub-amber/10 text-stub-amber' : 'text-stub-muted hover:text-stub-text'}`}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-1.5 transition-colors ${viewMode === 'calendar' ? 'bg-stub-amber/10 text-stub-amber' : 'text-stub-muted hover:text-stub-text'}`}
                aria-label="Calendar view"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          )}
          {stubs.length > 0 && (
            <Button variant="primary" size="sm" icon={<PlusCircle className="w-3.5 h-3.5" />} onClick={() => navigate('/create')}>
              New Stub
            </Button>
          )}
        </div>
      </div>

      {stubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Ticket className="w-12 h-12 text-stub-border-light mb-4" />
          <h3 className="font-display font-bold text-stub-text text-lg mb-1">No stubs yet</h3>
          <p className="text-sm text-stub-muted max-w-xs mb-6">
            After your next show, create a Stub to capture the memory. Your collection starts here.
          </p>
          <Button variant="primary" icon={<PlusCircle className="w-4 h-4" />} onClick={() => navigate('/create')}>
            Create Your First Stub
          </Button>
        </div>
      ) : (
        <>
          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-stub-surface rounded-lg border border-stub-border p-2 text-center">
              <div className="text-lg font-display font-bold text-stub-amber">{stats.total}</div>
              <div className="text-[10px] text-stub-muted">Shows</div>
            </div>
            <div className="bg-stub-surface rounded-lg border border-stub-border p-2 text-center">
              <div className="text-lg font-display font-bold text-stub-cyan">{stats.artists}</div>
              <div className="text-[10px] text-stub-muted">Artists</div>
            </div>
            <div className="bg-stub-surface rounded-lg border border-stub-border p-2 text-center">
              <div className="text-lg font-display font-bold text-stub-coral">{stats.venues}</div>
              <div className="text-[10px] text-stub-muted">Venues</div>
            </div>
          </div>

          {/* "On This Day" card */}
          {onThisDay.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
              <Card glow="amber">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-stub-amber" />
                  <span className="text-xs font-mono text-stub-amber uppercase tracking-wider">On This Day</span>
                </div>
                {onThisDay.map((stub) => {
                  const d = getDate(stub.date);
                  return (
                    <div
                      key={stub.id}
                      onClick={() => navigate(`/stub/${stub.id}`)}
                      className="cursor-pointer hover:bg-stub-surface-hover rounded-lg p-2 -mx-2 transition-colors"
                    >
                      <div className="text-sm font-semibold text-stub-text">{stub.artistName}</div>
                      <div className="text-xs text-stub-muted">
                        {stub.venueName} — {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  );
                })}
              </Card>
            </motion.div>
          )}

          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <StubCalendar
              year={calMonth.year}
              month={calMonth.month}
              stubsByDate={stubsByDate}
              onPrevMonth={() => {
                setCalMonth((prev) => {
                  if (prev.month === 0) return { year: prev.year - 1, month: 11 };
                  return { ...prev, month: prev.month - 1 };
                });
              }}
              onNextMonth={() => {
                setCalMonth((prev) => {
                  if (prev.month === 11) return { year: prev.year + 1, month: 0 };
                  return { ...prev, month: prev.month + 1 };
                });
              }}
              onStubClick={(stub) => navigate(`/stub/${stub.id}`)}
            />
          )}

          {/* List View — Search + filter toggle */}
          <div className={viewMode !== 'list' ? 'hidden' : ''}>
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stub-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stubs..."
                className="w-full bg-stub-surface border border-stub-border rounded-lg pl-9 pr-3 py-2 text-sm text-stub-text
                  placeholder:text-stub-muted focus:outline-none focus:border-stub-amber/50 transition-colors"
              />
            </div>
            <button
              onClick={() => setShowFilters((p) => !p)}
              className={`p-2 rounded-lg border transition-colors ${
                showFilters
                  ? 'bg-stub-amber/10 border-stub-amber/30 text-stub-amber'
                  : 'bg-stub-surface border-stub-border text-stub-muted hover:text-stub-text'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Filter bar */}
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {/* Year */}
                <div>
                  <label className="text-[10px] text-stub-muted uppercase tracking-wider block mb-1">Year</label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="w-full bg-stub-surface border border-stub-border rounded-lg px-2 py-1.5 text-xs text-stub-text"
                  >
                    <option value="all">All</option>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                {/* Min Rating */}
                <div>
                  <label className="text-[10px] text-stub-muted uppercase tracking-wider block mb-1">Min Stars</label>
                  <select
                    value={filterMinRating}
                    onChange={(e) => setFilterMinRating(Number(e.target.value))}
                    className="w-full bg-stub-surface border border-stub-border rounded-lg px-2 py-1.5 text-xs text-stub-text"
                  >
                    <option value="0">Any</option>
                    {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r}+ stars</option>)}
                  </select>
                </div>

                {/* Visibility */}
                <div>
                  <label className="text-[10px] text-stub-muted uppercase tracking-wider block mb-1">Visibility</label>
                  <select
                    value={filterVisibility}
                    onChange={(e) => setFilterVisibility(e.target.value as StubVisibility | 'all')}
                    className="w-full bg-stub-surface border border-stub-border rounded-lg px-2 py-1.5 text-xs text-stub-text"
                  >
                    <option value="all">All</option>
                    <option value="public">Public</option>
                    <option value="friends">Friends</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>

              {/* Sort */}
              <div className="flex gap-1">
                {([
                  { key: 'newest' as const, label: 'Newest', icon: Calendar },
                  { key: 'oldest' as const, label: 'Oldest', icon: Calendar },
                  { key: 'highest-rated' as const, label: 'Top Rated', icon: Star },
                ]).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs transition-colors ${
                      sortBy === key
                        ? 'bg-stub-amber/10 text-stub-amber border border-stub-amber/30'
                        : 'bg-stub-surface text-stub-muted border border-stub-border hover:text-stub-text'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Filtered count */}
          {(searchQuery || filterYear !== 'all' || filterMinRating > 0 || filterVisibility !== 'all') && (
            <div className="text-xs text-stub-muted mb-2">
              Showing {filteredStubs.length} of {stubs.length} stubs
            </div>
          )}

          {/* Stub list */}
          <div className="space-y-3">
            {filteredStubs.length === 0 ? (
              <div className="text-center py-8 text-stub-muted text-sm">
                No stubs match your filters.
              </div>
            ) : (
              filteredStubs.map((stub) => {
                const stubDate = getDate(stub.date);
                return (
                  <motion.div key={stub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="paper-grain cursor-pointer" hover onClick={() => navigate(`/stub/${stub.id}`)}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-display font-bold text-stub-text text-base truncate">
                            {stub.artistName ?? 'Unknown Artist'}
                          </div>
                          <div className="text-xs text-stub-muted flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {stub.venueName ?? 'Unknown Venue'}
                          </div>
                          <div className="text-xs font-mono text-stub-muted flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {stubDate.toLocaleDateString('en-US', {
                              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </div>
                          {stub.rating > 0 && (
                            <div className="flex items-center gap-0.5 mt-2">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <Star key={i} className={`w-3.5 h-3.5 ${i <= stub.rating ? 'fill-stub-amber text-stub-amber' : 'text-stub-border'}`} />
                              ))}
                            </div>
                          )}
                          {stub.highlights.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {stub.highlights.map((h) => (
                                <Badge key={h} variant="amber" className="text-[9px]">{h}</Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="muted" className="text-[9px]">{stub.visibility}</Badge>
                            {stub.photoCount > 0 && (
                              <span className="text-[10px] text-stub-muted">{stub.photoCount} photo{stub.photoCount !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Month calendar grid showing stubs on their dates */
function StubCalendar({
  year,
  month,
  stubsByDate,
  onPrevMonth,
  onNextMonth,
  onStubClick,
}: {
  year: number;
  month: number;
  stubsByDate: Map<string, StubRecord[]>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onStubClick: (stub: StubRecord) => void;
}): React.JSX.Element {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });
  const yearStr = String(year);

  // Build the calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  // Previous month trailing days
  const prevMonthDays = new Date(year, month, 0).getDate();
  const trailingDays: { day: number; faded: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    trailingDays.push({ day: prevMonthDays - i, faded: true });
  }

  // Current month days
  const currentDays: { day: number; faded: boolean }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    currentDays.push({ day: d, faded: false });
  }

  // Next month leading days to fill the grid
  const totalCells = trailingDays.length + currentDays.length;
  const nextMonthDays: { day: number; faded: boolean }[] = [];
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    nextMonthDays.push({ day: d, faded: true });
  }

  const allDays = [...trailingDays, ...currentDays, ...nextMonthDays];

  const selectedStubs = selectedDay ? (stubsByDate.get(selectedDay) ?? []) : [];

  // Monthly stats
  let monthShowCount = 0;
  const monthVenues = new Set<string>();
  stubsByDate.forEach((stubs, dateKey) => {
    const d = new Date(dateKey);
    if (d.getMonth() === month && d.getFullYear() === year) {
      monthShowCount += stubs.length;
      stubs.forEach((s) => { if (s.venueName) monthVenues.add(s.venueName); });
    }
  });

  return (
    <div className="mb-4">
      {/* Month nav — elevated design */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="p-2 rounded-lg text-stub-muted hover:text-stub-text hover:bg-stub-surface transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h3 className="font-display font-bold text-stub-text text-xl tracking-tight">{monthName}</h3>
          <span className="text-xs text-stub-muted font-mono">{yearStr}</span>
        </div>
        <button
          onClick={onNextMonth}
          className="p-2 rounded-lg text-stub-muted hover:text-stub-text hover:bg-stub-surface transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Monthly summary strip */}
      {monthShowCount > 0 && (
        <div className="flex items-center justify-center gap-4 mb-4 py-2 px-3 bg-stub-amber/5 border border-stub-amber/15 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs">
            <Ticket className="w-3.5 h-3.5 text-stub-amber" />
            <span className="text-stub-text font-medium">{monthShowCount}</span>
            <span className="text-stub-muted">{monthShowCount === 1 ? 'show' : 'shows'}</span>
          </div>
          {monthVenues.size > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5 text-stub-cyan" />
              <span className="text-stub-text font-medium">{monthVenues.size}</span>
              <span className="text-stub-muted">{monthVenues.size === 1 ? 'venue' : 'venues'}</span>
            </div>
          )}
        </div>
      )}

      {/* Calendar grid */}
      <div className="bg-stub-surface rounded-xl border border-stub-border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-stub-border">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-[10px] text-stub-muted font-mono py-2 uppercase tracking-wider">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {allDays.map((cell, i) => {
            if (cell.faded) {
              return (
                <div key={`faded-${i}`} className="min-h-[4.5rem] p-1 flex flex-col items-start border-b border-r border-stub-border/30 last:border-r-0">
                  <span className="text-[11px] text-stub-muted/30">{cell.day}</span>
                </div>
              );
            }

            const dateObj = new Date(year, month, cell.day);
            const dateKey = dateObj.toDateString();
            const dayStubs = stubsByDate.get(dateKey);
            const hasStubs = dayStubs && dayStubs.length > 0;
            const stubCount = dayStubs?.length ?? 0;
            const isToday = dateObj.toDateString() === today.toDateString();
            const isSelected = dateKey === selectedDay;
            const isPast = dateObj < today && !isToday;

            return (
              <button
                key={cell.day}
                onClick={() => setSelectedDay(isSelected ? null : dateKey)}
                className={`relative min-h-[4.5rem] p-1 flex flex-col items-start transition-all duration-150
                  border-b border-r border-stub-border/30 last:border-r-0
                  ${isSelected
                    ? 'bg-stub-amber/15 ring-1 ring-inset ring-stub-amber/50'
                    : isToday
                      ? 'bg-stub-bg'
                      : hasStubs
                        ? 'hover:bg-stub-bg/50'
                        : 'hover:bg-stub-bg/30'
                  }`}
              >
                {/* Day number */}
                <span className={`text-[11px] leading-none mb-0.5
                  ${isSelected
                    ? 'text-stub-amber font-bold'
                    : isToday
                      ? 'text-stub-amber font-bold'
                      : isPast && !hasStubs
                        ? 'text-stub-muted/50'
                        : hasStubs
                          ? 'text-stub-text font-medium'
                          : 'text-stub-muted'
                  }`}>
                  {cell.day}
                </span>

                {/* Today indicator */}
                {isToday && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-stub-amber" />
                )}

                {/* Event names in cell */}
                {hasStubs && (
                  <div className="w-full space-y-0.5 overflow-hidden">
                    {dayStubs.slice(0, 2).map((stub, j) => (
                      <div
                        key={stub.id}
                        className={`w-full px-1 py-px rounded text-[8px] leading-tight truncate
                          ${j === 0
                            ? 'bg-stub-amber/20 text-stub-amber'
                            : 'bg-stub-coral/15 text-stub-coral'
                          }`}
                      >
                        {stub.artistName ?? 'Show'}
                      </div>
                    ))}
                    {stubCount > 2 && (
                      <span className="text-[8px] text-stub-muted pl-1">+{stubCount - 2} more</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail panel */}
      {selectedDay && selectedStubs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-3.5 h-3.5 text-stub-amber" />
            <span className="text-xs font-mono text-stub-muted">
              {new Date(selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <div className="space-y-2">
            {selectedStubs.map((stub) => (
              <motion.div
                key={stub.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Card hover className="cursor-pointer" onClick={() => onStubClick(stub)}>
                  <div className="flex items-center gap-3">
                    {/* Artist initial avatar */}
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-stub-amber/20 to-stub-coral/20 flex items-center justify-center flex-shrink-0 border border-stub-amber/20">
                      <span className="text-sm font-display font-bold text-stub-amber">
                        {(stub.artistName ?? 'U').charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-stub-text truncate">{stub.artistName ?? 'Unknown Artist'}</div>
                      <div className="text-xs text-stub-muted flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{stub.venueName ?? 'Unknown Venue'}</span>
                      </div>
                    </div>
                    {stub.rating > 0 && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Star className="w-3.5 h-3.5 fill-stub-amber text-stub-amber" />
                        <span className="text-xs font-medium text-stub-amber">{stub.rating}</span>
                      </div>
                    )}
                    {stub.status === 'going' && (
                      <Badge variant="default" className="text-[10px] flex-shrink-0">Going</Badge>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {selectedDay && selectedStubs.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center py-6 bg-stub-surface rounded-xl border border-stub-border"
        >
          <Calendar className="w-5 h-5 text-stub-muted mx-auto mb-1.5" />
          <span className="text-xs text-stub-muted">No stubs on this day</span>
        </motion.div>
      )}
    </div>
  );
}
