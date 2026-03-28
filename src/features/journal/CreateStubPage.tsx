import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, Calendar, Star, Zap, Users, Music,
  Camera, PenTool, Eye, ArrowLeft, ArrowRight, Check, Ticket, X, Image,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import { BrandedSpinner } from '@/components/ui/BrandedSpinner';
import { doc, setDoc, Timestamp as FsTimestamp } from 'firebase/firestore';
import { Button, Card, Input } from '@/components/ui';
import { SearchResults } from '@/components/search';
import { useSearch } from '@/hooks/useSearch';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/firebase/config';
import { uploadStubPhotos, MAX_PHOTOS, MAX_FILE_SIZE, ALLOWED_TYPES } from '@/services/firebase/storage';
import { searchSetlists } from '@/services/api/setlistfm';
import { enrichSetlistWithGenius } from '@/services/api/enrichSetlist';
import { isEventInFuture } from '@/utils/formatDate';
import type { EventData, ArtistData, VenueData } from '@/types';
import type { SetlistSong } from '@/types';

type Step = 'identify' | 'capture' | 'going' | 'setlist' | 'story' | 'publish';
type ResultCategory = 'events' | 'artists' | 'venues';

interface SelectedShow {
  event: EventData;
  artist: ArtistData | undefined;
  venue: VenueData | undefined;
}

interface PhotoItem {
  id: string;
  file: File;
  preview: string;
  caption: string;
}

type StepDef = { key: Step; label: string; icon: typeof Search };

const POST_EVENT_STEPS: StepDef[] = [
  { key: 'identify', label: 'The Show', icon: Search },
  { key: 'capture', label: 'Quick Capture', icon: Zap },
  { key: 'setlist', label: 'Setlist', icon: Music },
  { key: 'story', label: 'Your Story', icon: PenTool },
  { key: 'publish', label: 'Publish', icon: Eye },
];

const PRE_EVENT_STEPS: StepDef[] = [
  { key: 'identify', label: 'The Show', icon: Search },
  { key: 'going', label: "Going!", icon: Ticket },
  { key: 'publish', label: 'Publish', icon: Eye },
];

/** Persistent header showing the selected event on steps 2-5 */
function EventHeader({ show }: { show: SelectedShow }): React.JSX.Element {
  const eventDate = show.event.date.toDate();
  return (
    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-stub-border">
      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-stub-border">
        {show.artist?.images.primary ? (
          <img src={show.artist.images.primary} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stub-amber/20 to-stub-coral/20 flex items-center justify-center">
            <span className="text-sm font-bold text-stub-amber/40">{(show.artist?.name ?? '?').charAt(0)}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-sm text-stub-text truncate">
          {show.artist?.name ?? 'Unknown Artist'}
        </div>
        <div className="text-xs text-stub-muted flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{show.venue?.name ?? 'Unknown Venue'}</span>
        </div>
        <div className="text-xs font-mono text-stub-muted flex items-center gap-1 mt-0.5">
          <Calendar className="w-3 h-3" />
          {eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}

export function CreateStubPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('identify');
  const [rating, setRating] = useState(0);
  const [vibes, setVibes] = useState({ energy: 0, crowd: 0, sound: 0, intimacy: 0 });
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedHighlights, setSelectedHighlights] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Narrative (Step 4)
  const [narrative, setNarrative] = useState('');

  // Setlist (Step 3)
  interface SongItem extends SetlistSong {
    id: string;
  }
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [setlistSource, setSetlistSource] = useState<'user' | 'setlistfm'>('user');
  const [setlistfmId, setSetlistfmId] = useState<string | undefined>(undefined);
  const [setlistImporting, setSetlistImporting] = useState(false);

  // Companions
  const [companionsText, setCompanionsText] = useState('');

  const { user } = useAuth();

  // URL params — pre-populate from "Stub It" buttons
  const [searchParams] = useSearchParams();

  // Search state — same hook as SearchPage
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ResultCategory>('events');
  const { artists, venues, events, eventArtists, eventVenues, isSearching } = useSearch(query);
  const [selectedShow, setSelectedShow] = useState<SelectedShow | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualArtist, setManualArtist] = useState('');
  const [manualVenue, setManualVenue] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualSelectedArtist, setManualSelectedArtist] = useState<ArtistData | null>(null);
  const [manualSelectedVenue, setManualSelectedVenue] = useState<VenueData | null>(null);
  const [showArtistSuggestions, setShowArtistSuggestions] = useState(false);
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false);
  const { artists: artistSuggestions } = useSearch(manualEntry && manualArtist.length >= 2 && !manualSelectedArtist ? manualArtist : '');
  const { venues: venueSuggestions } = useSearch(manualEntry && manualVenue.length >= 2 && !manualSelectedVenue ? manualVenue : '');

  // Time-aware mode: pre-event shows streamlined flow, post-event shows full capture
  const isPreEvent = selectedShow ? isEventInFuture(selectedShow.event.date) : false;
  const STEPS = isPreEvent ? PRE_EVENT_STEPS : POST_EVENT_STEPS;

  // Auto-populate from URL params (from Stub It buttons)
  useEffect(() => {
    const artistName = searchParams.get('artist');
    const venueName = searchParams.get('venue');
    const dateStr = searchParams.get('date');
    const artistImage = searchParams.get('artistImage');
    const eventId = searchParams.get('eventId');

    if (artistName || venueName) {
      let parsedDate = new Date();
      if (dateStr) {
        const ddmmyyyy = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (ddmmyyyy) {
          parsedDate = new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`);
        } else {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) parsedDate = d;
        }
      }

      const fakeEvent: EventData = {
        id: eventId ?? `manual-${Date.now()}`,
        artistIds: [],
        venueId: '',
        date: Timestamp.fromDate(parsedDate),
        status: 'scheduled',
        source: 'ticketmaster',
        externalIds: {},
        lastUpdated: Timestamp.now(),
      };
      const fakeArtist: ArtistData | undefined = artistName ? {
        id: '',
        name: artistName,
        sortName: artistName,
        genres: [],
        tags: [],
        images: { primary: artistImage ?? '', gallery: [] },
        externalIds: {},
      } : undefined;
      const fakeVenue: VenueData | undefined = venueName ? {
        id: '',
        name: venueName,
        address: '',
        city: '',
        state: '',
        lat: 0,
        lng: 0,
        capacity: 0,
        venueType: 'club',
        images: { primary: '', gallery: [] },
        externalIds: {},
        accessibility: { wheelchairAccessible: false, assistiveListening: false },
        stats: { totalShowsTracked: 0, topArtists: [], genreBreakdown: [] },
        lastUpdated: Timestamp.now(),
      } : undefined;

      setSelectedShow({ event: fakeEvent, artist: fakeArtist, venue: fakeVenue });
    }
  }, [searchParams]);

  // Cleanup photo preview URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
    };
  }, [photos]);

  function selectEvent(event: EventData, artist?: ArtistData, venue?: VenueData): void {
    setSelectedShow({
      event,
      artist: artist ?? eventArtists.get(event.artistIds[0]),
      venue: venue ?? eventVenues.get(event.venueId),
    });
  }

  function confirmManualEntry(): void {
    if (!manualArtist.trim() || !manualDate) return;
    const parsedDate = new Date(manualDate + 'T20:00:00');

    const artist: ArtistData = manualSelectedArtist ?? {
      id: `manual-artist-${Date.now()}`,
      name: manualArtist.trim(),
      sortName: manualArtist.trim(),
      genres: [],
      tags: [],
      images: { primary: '', gallery: [] },
      externalIds: {},
      lastUpdated: Timestamp.now(),
    };

    const venue: VenueData | undefined = manualSelectedVenue ?? (manualVenue.trim() ? {
      id: `manual-venue-${Date.now()}`,
      name: manualVenue.trim(),
      address: '', city: '', state: '', lat: 0, lng: 0,
      venueType: 'other',
      images: { primary: '', gallery: [] },
      externalIds: {},
      accessibility: { wheelchairAccessible: false, assistiveListening: false },
      stats: { totalShowsTracked: 0, topArtists: [], genreBreakdown: [] },
      lastUpdated: Timestamp.now(),
    } : undefined);

    const fakeEvent: EventData = {
      id: `manual-${Date.now()}`,
      artistIds: [artist.id],
      venueId: venue?.id ?? '',
      date: Timestamp.fromDate(parsedDate),
      status: 'scheduled',
      source: 'manual',
      externalIds: {},
      lastUpdated: Timestamp.now(),
    };

    setSelectedShow({ event: fakeEvent, artist, venue });
    setManualEntry(false);
  }

  function toggleHighlight(h: string): void {
    setSelectedHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
  }

  async function handlePublish(): Promise<void> {
    if (!selectedShow || isPublishing || !user) return;
    setIsPublishing(true);

    try {
      const stubId = `stub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = FsTimestamp.now();

      // 1. Upload photos to Cloud Storage (post-event only)
      const { photos: uploadedPhotos, failedCount } = !isPreEvent && photos.length > 0
        ? await uploadStubPhotos(stubId, photos.map((p) => ({ file: p.file, caption: p.caption })))
        : { photos: [], failedCount: 0 };

      if (failedCount > 0) {
        console.warn(`${failedCount} photo(s) failed to upload.`);
      }

      // 2. Build setlist if any songs were entered
      const filledSongs = songs.filter((s) => s.title.trim().length > 0);
      const setlist = filledSongs.length > 0
        ? {
            songs: filledSongs.map(({ title, encore, isCover }) => ({
              title: title.trim(),
              encore,
              isCover,
            })),
            source: setlistSource,
            ...(setlistfmId ? { setlistfmId } : {}),
          }
        : undefined;

      // 3. Build narrative if anything was written
      const narrativeData = narrative.trim()
        ? { body: narrative.trim(), aiPromptResponses: [] }
        : undefined;

      // 4. Compose the StubData document — branched on pre/post-event
      const baseData = {
        id: stubId,
        userId: user.uid,
        eventId: selectedShow.event.id,
        artistIds: selectedShow.artist?.id ? [selectedShow.artist.id] : [],
        artistName: selectedShow.artist?.name ?? 'Unknown Artist',
        venueId: selectedShow.venue?.id ?? '',
        venueName: selectedShow.venue?.name ?? 'Unknown Venue',
        artistImage: selectedShow.artist?.images.primary ?? '',
        date: selectedShow.event.date,
        visibility,
        reactions: [],
        comments: [],
        shares: 0,
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
      };

      const stubData = isPreEvent
        ? {
            ...baseData,
            status: 'going' as const,
            companions: companionsText.split(',').map((c) => c.trim()).filter(Boolean),
            photos: [],
            highlights: [],
          }
        : {
            ...baseData,
            status: 'attended' as const,
            rating,
            vibeRating: vibes,
            highlights: Array.from(selectedHighlights),
            companions: companionsText.split(',').map((c) => c.trim()).filter(Boolean),
            photos: uploadedPhotos,
            ...(setlist ? { setlist } : {}),
            ...(narrativeData ? { narrative: narrativeData } : {}),
          };

      // Save to Firestore
      await setDoc(doc(db, 'stubs', stubId), stubData);

      // Fire-and-forget: enrich setlist songs with Genius metadata
      if (setlist && setlist.songs.length > 0 && selectedShow?.artist?.name) {
        enrichSetlistWithGenius(stubId, setlist.songs, selectedShow.artist.name).catch(() => {
          // Best-effort — don't block navigation or show errors
        });
      }

      // Also save locally as fallback
      const existing = JSON.parse(localStorage.getItem('stub:my-stubs') ?? '[]');
      existing.unshift({
        ...stubData,
        date: selectedShow.event.date.toDate().toISOString(),
        createdAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        photos: uploadedPhotos,
      });
      localStorage.setItem('stub:my-stubs', JSON.stringify(existing));

      navigate(`/stub/${stubId}`, { state: { justPublished: true } });
    } catch (err) {
      console.error('Failed to publish stub:', err);
      setIsPublishing(false);
    }
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>): void {
    const files = e.target.files;
    if (!files) return;

    const remaining = MAX_PHOTOS - photos.length;
    const accepted: PhotoItem[] = [];

    for (const file of Array.from(files)) {
      if (accepted.length >= remaining) break;
      if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) continue;
      if (file.size > MAX_FILE_SIZE) continue;
      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
        caption: '',
      });
    }

    if (accepted.length > 0) {
      setPhotos((prev) => [...prev, ...accepted]);
    }

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePhoto(id: string): void {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((p) => p.id !== id);
    });
  }

  function addSong(): void {
    setSongs((prev) => [
      ...prev,
      { id: `song-${Date.now()}`, title: '', encore: false, isCover: false },
    ]);
  }

  function removeSong(id: string): void {
    setSongs((prev) => prev.filter((s) => s.id !== id));
  }

  function updateSong(id: string, patch: Partial<SongItem>): void {
    setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function moveSong(id: string, direction: 'up' | 'down'): void {
    setSongs((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  async function handleSetlistImport(): Promise<void> {
    if (!selectedShow?.artist?.name || setlistImporting) return;
    setSetlistImporting(true);

    try {
      const results = await searchSetlists(selectedShow.artist.name, 20);
      if (results.length === 0) {
        setSetlistImporting(false);
        return;
      }

      // Try to match by date — setlist.fm uses DD-MM-YYYY
      const eventDate = selectedShow.event.date.toDate();
      const dd = String(eventDate.getDate()).padStart(2, '0');
      const mm = String(eventDate.getMonth() + 1).padStart(2, '0');
      const yyyy = eventDate.getFullYear();
      const targetDate = `${dd}-${mm}-${yyyy}`;

      const matched = results.find((r) => r.date === targetDate) ?? results[0];

      setSongs(
        matched.songs.map((s, i) => ({
          id: `sfm-${i}-${Date.now()}`,
          title: s.title,
          encore: s.encore,
          isCover: s.isCover,
          notes: s.notes,
          originalArtist: s.originalArtist,
        }))
      );
      setSetlistSource('setlistfm');
      setSetlistfmId(matched.id);
    } catch (err) {
      console.error('Setlist import failed:', err);
    } finally {
      setSetlistImporting(false);
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  function nextStep(): void {
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1].key);
    }
  }

  function prevStep(): void {
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1].key);
    } else {
      navigate(-1);
    }
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-6">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === stepIndex;
          const isDone = i < stepIndex;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
                  ${isDone ? 'bg-stub-amber text-stub-bg' : isActive ? 'bg-stub-amber/20 text-stub-amber border-2 border-stub-amber' : 'bg-stub-surface text-stub-muted border border-stub-border'}`}
              >
                {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] ${isActive ? 'text-stub-amber' : 'text-stub-muted'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Event header — visible on steps 2-5 when a show is selected */}
      {selectedShow && currentStep !== 'identify' && (
        <EventHeader show={selectedShow} />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 1: Identify the Show */}
          {currentStep === 'identify' && (
            <div>
              <h2 className="font-display font-bold text-stub-text text-xl mb-1">What show was it?</h2>
              <p className="text-sm text-stub-muted mb-4">Search for the artist, venue, or event.</p>

              <Input
                icon="search"
                placeholder="Search artist, venue, or event..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mb-3"
              />

              {/* Selected show card */}
              {selectedShow && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card glow="amber" className="mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-stub-border">
                        {selectedShow.artist?.images.primary && (
                          <img src={selectedShow.artist.images.primary} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-bold text-sm text-stub-text truncate">
                          {selectedShow.artist?.name ?? 'Unknown Artist'}
                        </div>
                        <div className="text-xs text-stub-muted flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {selectedShow.venue?.name ?? 'Unknown Venue'}
                        </div>
                        <div className="text-xs font-mono text-stub-muted mt-0.5">
                          {selectedShow.event.date.toDate().toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedShow(null)}
                        className="text-xs text-stub-muted hover:text-stub-text"
                      >
                        Change
                      </button>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* Search results */}
              {!selectedShow && (
                <>
                  {query.length >= 2 ? (
                    <SearchResults
                      artists={artists}
                      venues={venues}
                      events={events}
                      eventArtists={eventArtists}
                      eventVenues={eventVenues}
                      isSearching={isSearching}
                      query={query}
                      activeCategory={activeCategory}
                      onCategoryChange={setActiveCategory}
                      onArtistClick={(artist) => {
                        setQuery(artist.name);
                        setActiveCategory('events');
                      }}
                      onVenueClick={(venue) => {
                        setQuery(venue.name);
                        setActiveCategory('events');
                      }}
                      onEventClick={selectEvent}
                      compact
                    />
                  ) : (
                    <div className="text-center py-4 text-stub-muted text-sm">
                      <Ticket className="w-8 h-8 mx-auto mb-2 text-stub-border-light" />
                      <p>Search for a show to get started</p>
                    </div>
                  )}
                </>
              )}

              {/* Manual entry form */}
              {manualEntry ? (
                <div className="mt-4">
                  <Card>
                    <h3 className="font-display font-bold text-stub-text text-sm mb-3">Enter Show Details</h3>
                    <div className="space-y-3">
                      <div className="relative">
                        <label className="text-[10px] text-stub-muted uppercase tracking-wider block mb-1">Artist *</label>
                        <input
                          type="text"
                          value={manualArtist}
                          onChange={(e) => {
                            setManualArtist(e.target.value);
                            setManualSelectedArtist(null);
                            setShowArtistSuggestions(true);
                          }}
                          onFocus={() => setShowArtistSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowArtistSuggestions(false), 200)}
                          placeholder="Who did you see?"
                          className="w-full bg-stub-bg border border-stub-border rounded-lg px-3 py-2 text-sm text-stub-text
                            placeholder:text-stub-muted/50 focus:outline-none focus:border-stub-amber/50 transition-colors"
                          autoFocus
                        />
                        {showArtistSuggestions && artistSuggestions.length > 0 && !manualSelectedArtist && (
                          <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-stub-surface border border-stub-border rounded-lg shadow-xl max-h-40 overflow-y-auto">
                            {artistSuggestions.slice(0, 5).map((a) => (
                              <button
                                key={a.id}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setManualArtist(a.name);
                                  setManualSelectedArtist(a);
                                  setShowArtistSuggestions(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-stub-text hover:bg-stub-bg transition-colors"
                              >
                                <div className="w-7 h-7 rounded-md overflow-hidden shrink-0 bg-stub-border">
                                  {a.images.primary ? (
                                    <img src={a.images.primary} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-stub-amber/20 to-stub-coral/20" />
                                  )}
                                </div>
                                <div className="truncate">{a.name}</div>
                                {a.genres.length > 0 && (
                                  <span className="text-[10px] text-stub-muted ml-auto shrink-0">{a.genres[0]}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <label className="text-[10px] text-stub-muted uppercase tracking-wider block mb-1">Venue</label>
                        <input
                          type="text"
                          value={manualVenue}
                          onChange={(e) => {
                            setManualVenue(e.target.value);
                            setManualSelectedVenue(null);
                            setShowVenueSuggestions(true);
                          }}
                          onFocus={() => setShowVenueSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowVenueSuggestions(false), 200)}
                          placeholder="Where was the show?"
                          className="w-full bg-stub-bg border border-stub-border rounded-lg px-3 py-2 text-sm text-stub-text
                            placeholder:text-stub-muted/50 focus:outline-none focus:border-stub-amber/50 transition-colors"
                        />
                        {showVenueSuggestions && venueSuggestions.length > 0 && !manualSelectedVenue && (
                          <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-stub-surface border border-stub-border rounded-lg shadow-xl max-h-40 overflow-y-auto">
                            {venueSuggestions.slice(0, 5).map((v) => (
                              <button
                                key={v.id}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setManualVenue(v.name);
                                  setManualSelectedVenue(v);
                                  setShowVenueSuggestions(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-stub-text hover:bg-stub-bg transition-colors"
                              >
                                <MapPin className="w-4 h-4 text-stub-muted shrink-0" />
                                <div className="truncate">{v.name}</div>
                                <span className="text-[10px] text-stub-muted ml-auto shrink-0">{v.city}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] text-stub-muted uppercase tracking-wider block mb-1">Date *</label>
                        <input
                          type="date"
                          value={manualDate}
                          onChange={(e) => setManualDate(e.target.value)}
                          className="w-full bg-stub-bg border border-stub-border rounded-lg px-3 py-2 text-sm text-stub-text
                            focus:outline-none focus:border-stub-amber/50 transition-colors
                            [color-scheme:dark]"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setManualEntry(false)}
                          className="flex-1 px-3 py-2 rounded-lg border border-stub-border text-sm text-stub-muted hover:text-stub-text transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={confirmManualEntry}
                          disabled={!manualArtist.trim() || !manualDate}
                          className="flex-1 px-3 py-2 rounded-lg bg-stub-amber text-stub-bg text-sm font-semibold
                            hover:bg-stub-amber-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  </Card>
                </div>
              ) : !selectedShow && (
                <div className="mt-4 space-y-2">
                  <Card hover onClick={() => setManualEntry(true)} className="cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-stub-border flex items-center justify-center text-stub-muted">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-stub-text">Enter details manually</div>
                        <div className="text-xs text-stub-muted">Artist, venue, and date</div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Quick Capture */}
          {currentStep === 'capture' && (
            <div>
              <h2 className="font-display font-bold text-stub-text text-xl mb-1">How was it?</h2>
              <p className="text-sm text-stub-muted mb-6">Rate the show and capture the vibe.</p>

              <div className="text-center mb-6">
                <p className="text-xs text-stub-muted uppercase tracking-wider mb-2">Overall Rating</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button key={i} onClick={() => setRating(i)}>
                      <Star
                        className={`w-8 h-8 transition-colors ${i <= rating ? 'fill-stub-amber text-stub-amber' : 'text-stub-border-light hover:text-stub-muted'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {(['energy', 'crowd', 'sound', 'intimacy'] as const).map((key) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-stub-text capitalize">{key}</span>
                      <span className="text-xs font-mono text-stub-muted">{vibes[key]}/5</span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button
                          key={i}
                          onClick={() => setVibes((v) => ({ ...v, [key]: i }))}
                          className={`flex-1 h-3 rounded-full transition-colors
                            ${i <= vibes[key] ? 'bg-stub-amber' : 'bg-stub-border hover:bg-stub-border-light'}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-6">
                <p className="text-sm text-stub-text mb-2">Highlight moments</p>
                <div className="flex flex-wrap gap-2">
                  {['Incredible solo', 'Crowd energy', 'Surprise song', 'Sound was perfect', 'Emotional moment', 'Pit went off'].map((h) => (
                    <button
                      key={h}
                      onClick={() => toggleHighlight(h)}
                      className={`px-3 py-1.5 text-xs rounded-full transition-colors
                        ${selectedHighlights.has(h)
                          ? 'bg-stub-amber/20 border border-stub-amber text-stub-amber'
                          : 'bg-stub-surface border border-stub-border text-stub-muted hover:border-stub-amber hover:text-stub-amber'
                        }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo upload */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-stub-text flex items-center gap-1.5">
                    <Camera className="w-4 h-4" /> Photos from the show
                  </p>
                  <span className="text-xs font-mono text-stub-muted">
                    {photos.length}/{MAX_PHOTOS}
                  </span>
                </div>

                {/* Photo grid */}
                {photos.length > 0 && (
                  <div className="space-y-3 mb-3">
                    {photos.map((photo) => (
                      <div key={photo.id} className="flex gap-3 items-start">
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-stub-border flex-shrink-0 group">
                          <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => removePhoto(photo.id)}
                            aria-label="Remove photo"
                            className="absolute top-0.5 right-0.5 p-0.5 bg-stub-bg/80 rounded-full text-stub-muted hover:text-stub-text
                              opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={photo.caption}
                          onChange={(e) => setPhotos((prev) => prev.map((p) =>
                            p.id === photo.id ? { ...p, caption: e.target.value } : p
                          ))}
                          placeholder="Add a caption..."
                          className="flex-1 bg-stub-surface border border-stub-border rounded-lg px-3 py-2 text-sm text-stub-text
                            placeholder:text-stub-muted/50 focus:outline-none focus:border-stub-amber/50 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_TYPES.join(',')}
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                {photos.length < MAX_PHOTOS && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-stub-border rounded-xl text-center
                      hover:border-stub-amber/50 transition-colors"
                  >
                    <Image className="w-6 h-6 mx-auto mb-1.5 text-stub-muted" />
                    <p className="text-sm text-stub-muted">
                      {photos.length > 0 ? 'Add more photos' : 'Tap to add photos'}
                    </p>
                    <p className="text-xs text-stub-muted/60 mt-0.5">
                      JPEG, PNG or WebP · Max 10 MB each
                    </p>
                  </button>
                )}
              </div>

              <div className="mt-4">
                <p className="text-sm text-stub-text mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Who were you with?
                </p>
                <Input
                  placeholder="Names or handles, separated by commas..."
                  value={companionsText}
                  onChange={(e) => setCompanionsText(e.target.value)}
                />
                <p className="text-[10px] text-stub-muted mt-1">e.g. Sarah, @mikejones, my brother</p>
              </div>
            </div>
          )}

          {/* Step 3: Setlist */}
          {currentStep === 'setlist' && (
            <div>
              <h2 className="font-display font-bold text-stub-text text-xl mb-1">Setlist</h2>
              <p className="text-sm text-stub-muted mb-4">Add the songs they played. Partial is fine!</p>

              {/* Import from setlist.fm */}
              <button
                onClick={() => void handleSetlistImport()}
                disabled={setlistImporting || !selectedShow?.artist?.name}
                className="w-full mb-4 p-3 rounded-lg bg-stub-surface border border-stub-border flex items-center gap-3
                  hover:border-stub-amber/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {setlistImporting ? (
                  <BrandedSpinner size={20} className="text-stub-amber" />
                ) : (
                  <Music className="w-5 h-5 text-stub-amber" />
                )}
                <div className="text-left">
                  <div className="text-sm font-semibold text-stub-text">
                    {setlistImporting ? 'Importing…' : 'Import from setlist.fm'}
                  </div>
                  <div className="text-xs text-stub-muted">Auto-fill if available</div>
                </div>
              </button>

              {/* Song list */}
              <div className="space-y-2 mb-4">
                {songs.map((song, idx) => (
                  <div key={song.id} className="flex items-center gap-2">
                    <span className="w-6 text-center text-xs font-mono text-stub-muted shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      value={song.title}
                      onChange={(e) => updateSong(song.id, { title: e.target.value })}
                      placeholder={`Song ${idx + 1}…`}
                      className="flex-1 min-w-0 bg-stub-surface border border-stub-border rounded-lg px-3 py-2
                        text-sm text-stub-text placeholder:text-stub-muted/50
                        focus:outline-none focus:border-stub-amber/50 focus:ring-1 focus:ring-stub-amber/20"
                    />
                    {/* Encore toggle */}
                    <button
                      onClick={() => updateSong(song.id, { encore: !song.encore })}
                      aria-label={song.encore ? 'Remove encore' : 'Mark as encore'}
                      className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors
                        ${song.encore
                          ? 'bg-stub-amber/20 text-stub-amber border border-stub-amber'
                          : 'bg-stub-surface text-stub-muted border border-stub-border hover:border-stub-amber/50'
                        }`}
                    >
                      ENC
                    </button>
                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        onClick={() => moveSong(song.id, 'up')}
                        disabled={idx === 0}
                        aria-label="Move song up"
                        className="p-0.5 text-stub-muted hover:text-stub-text disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveSong(song.id, 'down')}
                        disabled={idx === songs.length - 1}
                        aria-label="Move song down"
                        className="p-0.5 text-stub-muted hover:text-stub-text disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                    {/* Remove */}
                    <button
                      onClick={() => removeSong(song.id)}
                      aria-label="Remove song"
                      className="shrink-0 p-1 text-stub-muted hover:text-stub-coral transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <Button variant="ghost" size="sm" className="w-full" onClick={addSong}>
                + Add song
              </Button>
            </div>
          )}

          {/* Step 4: Story */}
          {currentStep === 'story' && (
            <div>
              <h2 className="font-display font-bold text-stub-text text-xl mb-1">Tell the Story</h2>
              <p className="text-sm text-stub-muted mb-4">What made this show special?</p>

              {/* Prompt chips */}
              <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Story prompts">
                {[
                  "What's the one moment you'll tell people about?",
                  'How did the energy shift throughout the set?',
                  'Was there a song that hit different live?',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() =>
                      setNarrative((prev) =>
                        prev.trim() ? `${prev}\n\n${prompt} ` : `${prompt} `
                      )
                    }
                    className="text-left px-3 py-2 rounded-lg bg-stub-surface border border-stub-border text-sm text-stub-muted
                      hover:border-stub-amber/50 hover:text-stub-text transition-colors"
                  >
                    <span className="text-stub-amber mr-1">✦</span> {prompt}
                  </button>
                ))}
              </div>

              <div className="relative">
                <textarea
                  id="narrative-textarea"
                  aria-label="Your story about the show"
                  aria-describedby="narrative-char-count"
                  value={narrative}
                  onChange={(e) => setNarrative(e.target.value)}
                  className="w-full h-48 bg-stub-surface border border-stub-border rounded-lg p-3
                    text-stub-text placeholder:text-stub-muted/50 text-sm
                    focus:outline-none focus:border-stub-amber/50 focus:ring-1 focus:ring-stub-amber/20
                    resize-none"
                  placeholder="Write your story here…"
                  maxLength={2000}
                />
                <p
                  id="narrative-char-count"
                  className={`text-right text-xs mt-1 font-mono transition-colors
                    ${narrative.length >= 2000
                      ? 'text-stub-coral'
                      : narrative.length >= 1800
                        ? 'text-stub-amber'
                        : 'text-stub-muted'
                    }`}
                >
                  {narrative.length}/2000
                </p>
              </div>
            </div>
          )}

          {/* Pre-event: Going step */}
          {currentStep === 'going' && (
            <div>
              <h2 className="font-display font-bold text-stub-text text-xl mb-1">You're Going! 🎶</h2>
              <p className="text-sm text-stub-muted mb-6">Claim your spot and let people know.</p>

              <div className="mb-6">
                <p className="text-sm text-stub-text mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Who are you going with?
                </p>
                <Input
                  placeholder="Names or handles, separated by commas..."
                  value={companionsText}
                  onChange={(e) => setCompanionsText(e.target.value)}
                />
                <p className="text-[10px] text-stub-muted mt-1">e.g. Sarah, @mikejones, my brother</p>
              </div>

              <div>
                <p className="text-sm text-stub-text mb-2 flex items-center gap-1.5">
                  <Eye className="w-4 h-4" /> Who can see this?
                </p>
                <div className="space-y-2">
                  {([
                    { value: 'public' as const, label: 'Public', desc: 'Anyone can see this Stub' },
                    { value: 'friends' as const, label: 'Friends Only', desc: 'Only your followers' },
                    { value: 'private' as const, label: 'Private', desc: 'Just for you' },
                  ]).map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => setVisibility(value)}
                      className={`w-full text-left p-3 rounded-lg transition-colors
                        ${visibility === value
                          ? 'bg-stub-amber/10 border-2 border-stub-amber'
                          : 'bg-stub-surface border border-stub-border hover:border-stub-amber/50'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-stub-text">{label}</div>
                          <div className="text-xs text-stub-muted">{desc}</div>
                        </div>
                        {visibility === value && <Check className="w-4 h-4 text-stub-amber" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Publish */}
          {currentStep === 'publish' && (
            <div>
              <h2 className="font-display font-bold text-stub-text text-xl mb-1">Ready to publish?</h2>
              <p className="text-sm text-stub-muted mb-6">Choose who can see your Stub.</p>

              <div className="space-y-2 mb-6">
                {([
                  { value: 'public' as const, label: 'Public', desc: 'Anyone can see this Stub' },
                  { value: 'friends' as const, label: 'Friends Only', desc: 'Only your followers' },
                  { value: 'private' as const, label: 'Private', desc: 'Just for you' },
                ]).map(({ value, label, desc }) => (
                  <button
                    key={value}
                    onClick={() => setVisibility(value)}
                    className={`w-full text-left p-3 rounded-lg transition-colors
                      ${visibility === value
                        ? 'bg-stub-amber/10 border-2 border-stub-amber'
                        : 'bg-stub-surface border border-stub-border hover:border-stub-amber/50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-stub-text">{label}</div>
                        <div className="text-xs text-stub-muted">{desc}</div>
                      </div>
                      {visibility === value && <Check className="w-4 h-4 text-stub-amber" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Photo summary */}
              {photos.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-stub-muted uppercase tracking-wider mb-2">
                    {photos.length} photo{photos.length !== 1 ? 's' : ''} attached
                  </p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {photos.map((photo) => (
                      <div key={photo.id} className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                        <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Card glow="amber" className="mb-6">
                <p className="text-xs text-stub-muted text-center">Stub preview will appear here</p>
              </Card>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handlePublish}
                disabled={isPublishing}
              >
                {isPublishing ? 'Publishing...' : isPreEvent ? "I'm Going!" : 'Publish Stub'}
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={prevStep} icon={<ArrowLeft className="w-4 h-4" />}>
          {stepIndex === 0 ? 'Cancel' : 'Back'}
        </Button>
        {currentStep !== 'publish' && (
          <Button
            variant="primary"
            onClick={nextStep}
            icon={<ArrowRight className="w-4 h-4" />}
            disabled={currentStep === 'identify' && !selectedShow}
          >
            {currentStep === 'identify' ? 'Continue' : 'Next'}
          </Button>
        )}
      </div>
    </div>
  );
}
