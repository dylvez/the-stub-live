import { motion } from 'framer-motion';
import { Star, MapPin, Calendar, Music, MessageCircle, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui';
import { ReactionIcon } from '@/components/ui/ReactionIcon';
import type { StubData } from '@/types';

interface StubCardProps {
  stub: StubData;
  artistName: string;
  venueName: string;
  venueCity?: string;
  heroImage?: string;
  compact?: boolean;
  onClick?: () => void;
}

function formatStubDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StarRating({ rating }: { rating: number }): React.JSX.Element {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= rating ? 'fill-stub-amber text-stub-amber' : 'text-stub-border-light'}`}
        />
      ))}
    </div>
  );
}

export function StubCard({
  stub,
  artistName,
  venueName,
  venueCity,
  heroImage,
  compact = false,
  onClick,
}: StubCardProps): React.JSX.Element {
  const date = 'toDate' in stub.date ? stub.date.toDate() : new Date(stub.date as unknown as string);
  const reactionCount = stub.reactions.length;
  const commentCount = stub.comments.length;

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="cursor-pointer"
      >
        <div className="bg-stub-surface rounded-xl border border-stub-border overflow-hidden paper-grain torn-edge-right">
          <div className="flex">
            {/* Left: stub info */}
            <div className="flex-1 p-4 perf-edge">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-display font-bold text-stub-text text-sm leading-tight">
                    {artistName}
                  </h3>
                  <div className="flex items-center gap-1 mt-1 text-stub-muted text-xs">
                    <MapPin className="w-3 h-3" />
                    <span>{venueName}</span>
                  </div>
                </div>
                {stub.rating && <StarRating rating={stub.rating} />}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="font-mono text-[11px] text-stub-muted tracking-wide">
                  {formatStubDate(date)}
                </span>
              </div>
            </div>

            {/* Right: hero thumbnail */}
            {heroImage && (
              <div className="w-24 relative">
                <img
                  src={heroImage}
                  alt={artistName}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-stub-surface/80 to-transparent" />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <div className="bg-stub-surface rounded-2xl border border-stub-border overflow-hidden paper-grain torn-edge-right glow-amber">
        {/* Hero image */}
        {heroImage && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={heroImage}
              alt={artistName}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stub-surface via-stub-surface/20 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <h3 className="font-display font-bold text-stub-text text-xl leading-tight drop-shadow-lg">
                {artistName}
              </h3>
            </div>
          </div>
        )}

        {/* Stub body */}
        <div className="p-4 perf-edge">
          {!heroImage && (
            <h3 className="font-display font-bold text-stub-text text-xl mb-2">{artistName}</h3>
          )}

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 text-sm text-stub-muted">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {venueName}{venueCity ? `, ${venueCity}` : ''}
              </span>
              <span className="flex items-center gap-1 font-mono text-xs">
                <Calendar className="w-3.5 h-3.5" />
                {formatStubDate(date)}
              </span>
            </div>
          </div>

          {/* Rating */}
          {stub.rating && (
            <div className="mb-3">
              <StarRating rating={stub.rating} />
            </div>
          )}

          {/* Highlights */}
          {stub.highlights.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {stub.highlights.slice(0, 3).map((h) => (
                <Badge key={h} variant="amber">{h}</Badge>
              ))}
              {stub.highlights.length > 3 && (
                <Badge variant="muted">+{stub.highlights.length - 3}</Badge>
              )}
            </div>
          )}

          {/* Narrative preview */}
          {stub.narrative?.body && (
            <p className="text-sm text-stub-muted line-clamp-2 mb-3 italic">
              &ldquo;{stub.narrative.body}&rdquo;
            </p>
          )}

          {/* Vibe bars */}
          {stub.vibeRating && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              {(['energy', 'crowd', 'sound', 'intimacy'] as const).map((key) => (
                <div key={key} className="text-center">
                  <div className="h-1.5 bg-stub-border rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-stub-amber rounded-full transition-all"
                      style={{ width: `${((stub.vibeRating?.[key] ?? 0) / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-stub-muted capitalize">{key}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer: social + meta */}
          <div className="flex items-center justify-between pt-3 border-t border-stub-border">
            <div className="flex items-center gap-3">
              {reactionCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-stub-muted">
                  <span className="flex items-center gap-0.5">
                    {stub.reactions.slice(0, 3).map((r, i) => (
                      <ReactionIcon key={i} type={r.type} size={16} />
                    ))}
                  </span>
                  {reactionCount > 3 && <span>+{reactionCount - 3}</span>}
                </span>
              )}
              {commentCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-stub-muted">
                  <MessageCircle className="w-3.5 h-3.5" />
                  {commentCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {stub.setlist && (
                <Badge variant="cyan">
                  <Music className="w-3 h-3 mr-1" />
                  {stub.setlist.songs.length} songs
                </Badge>
              )}
              <button
                className="p-1 text-stub-muted hover:text-stub-text transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
