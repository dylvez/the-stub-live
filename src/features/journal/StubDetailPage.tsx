import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, Star, MapPin, Calendar, Share2, Music, BookOpen,
  Camera, Sparkles, ChevronDown, ChevronUp, Eye, Users, Lock,
  MoreVertical, Pencil, Trash2, Copy, Check, ExternalLink,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { ReactionBar } from '@/components/stub/ReactionBar';
import { CommentSection } from '@/components/stub/CommentSection';
import { useStub, stubToDate } from '@/hooks/useStub';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/firebase/config';

const VIBE_LABELS = [
  { key: 'energy' as const, label: 'Energy', color: 'bg-stub-coral' },
  { key: 'crowd' as const, label: 'Crowd', color: 'bg-stub-amber' },
  { key: 'sound' as const, label: 'Sound', color: 'bg-stub-cyan' },
  { key: 'intimacy' as const, label: 'Intimacy', color: 'bg-purple-400' },
];

const VISIBILITY_ICONS = {
  public: Eye,
  friends: Users,
  private: Lock,
};

export function StubDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData } = useAuth();
  const { stub, isLoading } = useStub(id);
  const [showSuccess, setShowSuccess] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['highlights']));
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [copied, setCopied] = useState(false);

  // Shared experiences — other public stubs from the same event
  const [sharedStubs, setSharedStubs] = useState<{ id: string; userId: string; displayName?: string; rating?: number }[]>([]);

  useEffect(() => {
    if (!stub?.eventId || !user) return;
    const q = query(
      collection(db, 'stubs'),
      where('eventId', '==', stub.eventId),
      where('visibility', '==', 'public'),
    );
    getDocs(q).then((snap) => {
      const others = snap.docs
        .map((d) => ({ id: d.id, userId: d.data().userId, displayName: d.data().displayName, rating: d.data().rating }))
        .filter((s) => s.userId !== user.uid);
      setSharedStubs(others);
    }).catch(() => {});
  }, [stub?.eventId, user]);

  // Show success toast if just published
  useEffect(() => {
    if ((location.state as { justPublished?: boolean })?.justPublished) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 4000);
      window.history.replaceState({}, '');
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  function toggleSection(section: string): void {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  function getShareText(): { text: string; url: string } {
    const artistName = stub?.artistName ?? 'a show';
    const venueName = stub?.venueName ?? '';
    const url = window.location.href;
    const text = venueName
      ? `Just saw ${artistName} at ${venueName} 🎶`
      : `Just saw ${artistName} 🎶`;
    return { text, url };
  }

  async function handleCopyLink(): Promise<void> {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Only platforms that support web share intents (pre-filled content)
  const SHAREABLE_PLATFORMS: Record<string, { icon: string; label: string; getUrl: (text: string, url: string) => string }> = {
    x: { icon: '𝕏', label: 'X', getUrl: (text, url) => `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
    facebook: { icon: '📘', label: 'Facebook', getUrl: (_, url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    threads: { icon: '🧵', label: 'Threads', getUrl: (text, url) => `https://threads.net/intent/post?text=${encodeURIComponent(text + '\n' + url)}` },
  };

  // Get only shareable platforms the user has linked
  function getLinkedSharePlatforms(): { key: string; icon: string; label: string }[] {
    const links = userData?.socialLinks;
    if (!links) return [];
    return Object.keys(SHAREABLE_PLATFORMS)
      .filter((k) => links[k as keyof typeof links])
      .map((k) => ({ key: k, icon: SHAREABLE_PLATFORMS[k].icon, label: SHAREABLE_PLATFORMS[k].label }));
  }

  function handleShareTo(platform: string): void {
    const { text, url } = getShareText();

    if (platform === 'native' && navigator.share) {
      navigator.share({ title: 'The Stub Live', text, url }).catch(() => {});
      setShowShareSheet(false);
      return;
    }

    const config = SHAREABLE_PLATFORMS[platform];
    if (config) {
      window.open(config.getUrl(text, url), '_blank', 'width=600,height=400');
      setShowShareSheet(false);
    }
  }

  const isOwner = user && stub && stub.userId === user.uid;

  async function handleDelete(): Promise<void> {
    if (!stub?.id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'stubs', stub.id));
      // Remove just this stub from localStorage cache (don't wipe all stubs)
      try {
        const raw = localStorage.getItem('stub:my-stubs');
        if (raw) {
          const arr = JSON.parse(raw) as { id: string }[];
          const filtered = arr.filter((s) => s.id !== stub.id);
          localStorage.setItem('stub:my-stubs', JSON.stringify(filtered));
        }
      } catch { /* ignore */ }
      navigate('/stubs', { replace: true });
    } catch {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  function handleEdit(): void {
    if (!stub) return;
    // Navigate to create page with stub data pre-populated for editing
    const params = new URLSearchParams();
    params.set('editId', stub.id);
    params.set('artist', stub.artistName ?? '');
    params.set('venue', stub.venueName ?? '');
    if (stub.date) {
      const d = stubToDate(stub.date);
      params.set('date', d.toISOString());
    }
    if (stub.artistImage) params.set('artistImage', stub.artistImage);
    if (stub.eventId) params.set('eventId', stub.eventId);
    navigate(`/create?${params.toString()}`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stub-amber border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stub) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-stub-muted gap-2">
        <p>{error ?? 'Stub not found.'}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-stub-amber hover:underline">Go back</button>
      </div>
    );
  }

  const date = stubToDate(stub.date);
  const VisIcon = VISIBILITY_ICONS[stub.visibility];
  const hasSetlist = stub.setlist && stub.setlist.songs.length > 0;
  const hasNarrative = stub.narrative && stub.narrative.body.trim().length > 0;
  const hasPhotos = (stub.photos && stub.photos.length > 0) || (stub.photoCount ?? 0) > 0;
  const reactions = stub.reactions ?? [];
  const comments = stub.comments ?? [];

  return (
    <div className="pb-8">
      {/* OG Meta Tags for public stubs */}
      {stub.visibility === 'public' && (stub.artistName || stub.venueName) && (
        <Helmet>
          <title>{`${stub.artistName ?? 'Show'} at ${stub.venueName ?? 'Venue'} — The Stub Live`}</title>
          <meta property="og:title" content={`${stub.artistName ?? 'Show'} at ${stub.venueName ?? 'Venue'}`} />
          <meta property="og:description" content={(() => {
            const parts: string[] = [];
            if (date) parts.push(date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
            if (stub.rating) parts.push(`${'★'.repeat(stub.rating)}${'☆'.repeat(5 - stub.rating)}`);
            if (stub.narrative?.body) parts.push(stub.narrative.body.slice(0, 120) + (stub.narrative.body.length > 120 ? '...' : ''));
            else if (stub.highlights?.length) parts.push(stub.highlights.join(', '));
            return parts.join(' · ') || 'A concert experience on The Stub Live';
          })()} />
          <meta property="og:type" content="article" />
          <meta property="og:url" content={window.location.href} />
          <meta property="og:site_name" content="The Stub Live" />
          {stub.artistImage && <meta property="og:image" content={stub.artistImage} />}
          {stub.photos?.[0]?.url && <meta property="og:image" content={stub.photos[0].url} />}
          <meta name="twitter:card" content={stub.photos?.[0]?.url || stub.artistImage ? 'summary_large_image' : 'summary'} />
          <meta name="twitter:title" content={`${stub.artistName ?? 'Show'} at ${stub.venueName ?? 'Venue'}`} />
          <meta name="twitter:description" content={stub.narrative?.body?.slice(0, 200) ?? `A live music experience captured on The Stub Live`} />
          {(stub.photos?.[0]?.url ?? stub.artistImage) && <meta name="twitter:image" content={stub.photos?.[0]?.url ?? stub.artistImage ?? ''} />}
        </Helmet>
      )}

      {/* Success toast */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-16 left-4 right-4 z-30 p-3 bg-stub-amber/10 border border-stub-amber/30 rounded-lg text-center backdrop-blur-sm"
        >
          <p className="text-sm text-stub-amber font-semibold">🎶 Stub published!</p>
        </motion.div>
      )}

      {/* Hero */}
      <div className="relative h-48 sm:h-64 overflow-hidden">
        {stub.artistImage ? (
          <img src={stub.artistImage} alt={stub.artistName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stub-amber/30 via-stub-coral/20 to-stub-cyan/20 flex items-center justify-center">
            <Music className="w-16 h-16 text-stub-amber/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stub-bg via-stub-bg/50 to-transparent" />

        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 bg-stub-bg/60 backdrop-blur-sm rounded-full text-stub-text hover:bg-stub-bg/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={() => setShowShareSheet(true)}
            className="p-2 bg-stub-bg/60 backdrop-blur-sm rounded-full text-stub-text hover:bg-stub-bg/80 transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 bg-stub-bg/60 backdrop-blur-sm rounded-full text-stub-text hover:bg-stub-bg/80 transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-stub-surface border border-stub-border rounded-lg shadow-xl overflow-hidden min-w-[140px]">
                    <button
                      onClick={() => { setShowMenu(false); handleEdit(); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-stub-text hover:bg-stub-bg transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-stub-amber" />
                      Edit Stub
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-stub-coral hover:bg-stub-bg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Stub
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="font-display font-bold text-stub-text text-2xl sm:text-3xl drop-shadow-lg">
            {stub.artistName ?? 'Unknown Artist'}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-stub-muted">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {stub.venueName ?? 'Unknown Venue'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {date.toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-2 relative z-10">
        {/* Rating + Visibility */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${i <= stub.rating ? 'fill-stub-amber text-stub-amber' : 'text-stub-border'}`}
              />
            ))}
            {stub.rating > 0 && (
              <span className="text-sm text-stub-muted ml-2">{stub.rating}/5</span>
            )}
          </div>
          <Badge variant="muted" className="flex items-center gap-1">
            <VisIcon className="w-3 h-3" />
            {stub.visibility}
          </Badge>
        </div>

        {/* Standout Song */}
        {stub.standoutSong && (
          <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-stub-amber/5 border border-stub-amber/10">
            <Sparkles className="w-4 h-4 text-stub-amber shrink-0" />
            <span className="text-sm text-stub-text">
              Standout: <span className="font-semibold text-stub-amber">{stub.standoutSong}</span>
            </span>
          </div>
        )}

        {/* Vibe Bars */}
        {stub.vibeRating && (
          <Card className="mb-4">
            <h3 className="text-xs font-mono text-stub-muted uppercase tracking-wider mb-3">Vibe Check</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {VIBE_LABELS.map(({ key, label, color }) => (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-stub-muted">{label}</span>
                    <span className="text-stub-text font-mono">{stub.vibeRating[key]}/5</span>
                  </div>
                  <div className="h-1.5 bg-stub-border rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(stub.vibeRating[key] / 5) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Highlights */}
        {stub.highlights.length > 0 && (
          <CollapsibleSection
            title="Highlights"
            icon={<Sparkles className="w-4 h-4 text-stub-amber" />}
            expanded={expandedSections.has('highlights')}
            onToggle={() => toggleSection('highlights')}
          >
            <div className="flex flex-wrap gap-1.5">
              {stub.highlights.map((h) => (
                <Badge key={h} variant="amber">{h}</Badge>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Setlist */}
        {hasSetlist && (
          <CollapsibleSection
            title={`Setlist (${stub.setlist!.songs.length} songs)`}
            icon={<Music className="w-4 h-4 text-stub-cyan" />}
            expanded={expandedSections.has('setlist')}
            onToggle={() => toggleSection('setlist')}
          >
            <div className="space-y-0.5">
              {stub.setlist!.songs.map((song, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-5 text-right font-mono text-stub-muted text-xs">{i + 1}</span>
                  <span className={`text-stub-text ${song.encore ? 'italic' : ''}`}>
                    {song.title}
                    {song.isCover && (
                      <span className="text-stub-muted ml-1">({song.originalArtist} cover)</span>
                    )}
                  </span>
                  {song.encore && <Badge variant="amber" className="text-[9px]">Encore</Badge>}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Narrative */}
        {hasNarrative && (
          <CollapsibleSection
            title="The Story"
            icon={<BookOpen className="w-4 h-4 text-stub-coral" />}
            expanded={expandedSections.has('narrative')}
            onToggle={() => toggleSection('narrative')}
          >
            <p className="text-sm text-stub-text leading-relaxed whitespace-pre-wrap">
              {stub.narrative!.body}
            </p>
          </CollapsibleSection>
        )}

        {/* Photos */}
        {hasPhotos && stub.photos && stub.photos.length > 0 && (
          <CollapsibleSection
            title={`Photos (${stub.photos.length})`}
            icon={<Camera className="w-4 h-4 text-stub-muted" />}
            expanded={expandedSections.has('photos')}
            onToggle={() => toggleSection('photos')}
          >
            <div className="grid grid-cols-2 gap-2">
              {stub.photos.map((photo, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-stub-surface">
                  <img src={photo.url} alt={photo.caption ?? ''} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Shared experiences */}
        {sharedStubs.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-mono text-stub-muted uppercase tracking-wider mb-2">
              Others at this show
            </h3>
            <div className="flex flex-wrap gap-2">
              {sharedStubs.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/stub/${s.id}`)}
                  className="flex items-center gap-2 px-3 py-2 bg-stub-surface border border-stub-border rounded-lg
                    hover:border-stub-amber/50 transition-colors text-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-stub-amber/20 to-stub-coral/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-stub-amber">
                      {(s.displayName ?? 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-stub-text">{s.displayName ?? 'Someone'}</span>
                  {s.rating != null && s.rating > 0 && (
                    <span className="text-xs text-stub-amber flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-stub-amber" />{s.rating}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reactions */}
        <div className="mt-4">
          <h3 className="text-xs font-mono text-stub-muted uppercase tracking-wider mb-2">Reactions</h3>
          <ReactionBar
            stubId={stub.id}
            reactions={reactions}
            currentUserId={user?.uid ?? null}
          />
        </div>

        {/* Comments */}
        <CommentSection
          stubId={stub.id}
          comments={comments}
          currentUserId={user?.uid ?? null}
        />
      </div>

      {/* Share sheet */}
      {showShareSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-stub-bg/80 backdrop-blur-sm" onClick={() => setShowShareSheet(false)} />
          <div className="relative bg-stub-surface border border-stub-border rounded-t-2xl sm:rounded-xl p-5 w-full max-w-sm shadow-2xl mb-0 sm:mb-auto">
            <h3 className="font-display font-bold text-stub-text text-lg text-center mb-1">Share this Stub</h3>
            <p className="text-xs text-stub-muted text-center mb-4">
              {stub.artistName ?? 'Show'} at {stub.venueName ?? 'Venue'}
            </p>

            {(() => {
              const linked = getLinkedSharePlatforms();
              const shareOptions = [
                ...linked,
                ...(navigator.share ? [{ key: 'native', icon: '📤', label: 'More' }] : []),
              ];
              return shareOptions.length > 0 ? (
                <div className={`grid gap-3 mb-4 ${shareOptions.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                  {shareOptions.map(({ key, icon, label }) => (
                    <button
                      key={key}
                      onClick={() => handleShareTo(key)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-stub-bg transition-colors"
                    >
                      <span className="text-2xl">{icon}</span>
                      <span className="text-[10px] text-stub-muted">{label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stub-muted text-center mb-4 py-2">
                  <a href="/profile" className="text-stub-amber hover:underline">Link social accounts</a> to share directly
                </p>
              );
            })()}

            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-stub-border
                text-sm text-stub-text hover:bg-stub-bg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </button>

            <button
              onClick={() => setShowShareSheet(false)}
              className="w-full mt-2 px-4 py-2 text-sm text-stub-muted hover:text-stub-text transition-colors text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-stub-bg/80 backdrop-blur-sm" onClick={() => !isDeleting && setShowDeleteConfirm(false)} />
          <div className="relative bg-stub-surface border border-stub-border rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <Trash2 className="w-10 h-10 text-stub-coral mx-auto mb-3" />
            <h3 className="font-display font-bold text-stub-text text-lg text-center mb-1">Delete this stub?</h3>
            <p className="text-sm text-stub-muted text-center mb-6">
              Your stub for {stub.artistName ?? 'this show'} at {stub.venueName ?? 'this venue'} will be permanently removed. This can't be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 rounded-lg border border-stub-border text-sm text-stub-text hover:bg-stub-bg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 rounded-lg bg-stub-coral text-white text-sm font-medium hover:bg-stub-coral/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Collapsible section wrapper */
function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Card className="mb-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-stub-text">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-stub-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stub-muted" />
        )}
      </button>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3"
        >
          {children}
        </motion.div>
      )}
    </Card>
  );
}
