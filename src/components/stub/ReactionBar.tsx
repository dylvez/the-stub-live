import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { addReaction, getUserReactionTypes, getReactionCounts } from '@/services/firebase/reactions';
import { REACTION_EMOJIS } from '@/utils/constants';
import type { StubReaction, ReactionType } from '@/types';

interface ReactionBarProps {
  stubId: string;
  reactions: StubReaction[];
  currentUserId: string | null;
  onReactionsChange?: (reactions: StubReaction[]) => void;
}

export function ReactionBar({
  stubId,
  reactions,
  currentUserId,
  onReactionsChange,
}: ReactionBarProps): React.JSX.Element {
  const [localReactions, setLocalReactions] = useState(reactions);
  const [pending, setPending] = useState<Set<ReactionType>>(new Set());

  // Sync when parent updates
  if (reactions !== localReactions && !pending.size) {
    setLocalReactions(reactions);
  }

  const userReactions = currentUserId
    ? getUserReactionTypes(localReactions, currentUserId)
    : new Set<ReactionType>();
  const counts = getReactionCounts(localReactions);

  const handleReaction = useCallback(
    async (type: ReactionType) => {
      if (!currentUserId) return;
      if (pending.has(type)) return;

      // Haptic feedback
      navigator.vibrate?.(10);

      // Optimistic update
      const isActive = userReactions.has(type);
      const optimistic = isActive
        ? localReactions.filter(
            (r) => !(r.userId === currentUserId && r.type === type),
          )
        : [
            ...localReactions,
            {
              userId: currentUserId,
              type,
              timestamp: { toDate: () => new Date() } as StubReaction['timestamp'],
            },
          ];
      setLocalReactions(optimistic);
      onReactionsChange?.(optimistic);

      setPending((prev) => new Set(prev).add(type));
      try {
        const updated = await addReaction(stubId, currentUserId, type);
        setLocalReactions(updated);
        onReactionsChange?.(updated);
      } catch {
        // Revert on error
        setLocalReactions(localReactions);
        onReactionsChange?.(localReactions);
      } finally {
        setPending((prev) => {
          const next = new Set(prev);
          next.delete(type);
          return next;
        });
      }
    },
    [stubId, currentUserId, localReactions, userReactions, pending, onReactionsChange],
  );

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {REACTION_EMOJIS.map((emoji) => {
        const type = emoji as ReactionType;
        const count = counts.get(type) ?? 0;
        const isActive = userReactions.has(type);

        return (
          <button
            key={emoji}
            onClick={() => handleReaction(type)}
            disabled={!currentUserId}
            className={`
              flex items-center gap-1 px-2.5 py-1 rounded-full text-sm transition-all
              ${isActive
                ? 'bg-stub-amber/15 border border-stub-amber/40 scale-105'
                : 'bg-stub-surface border border-stub-border hover:border-stub-border-light'
              }
              ${!currentUserId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}
            `}
            title={!currentUserId ? 'Sign in to react' : undefined}
          >
            <span className="text-base">{emoji}</span>
            <AnimatePresence mode="wait">
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="text-xs font-mono text-stub-text min-w-[0.75rem] text-center"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        );
      })}
      {!currentUserId && (
        <p className="text-xs text-stub-muted mt-2">
          <Link to="/login" className="text-stub-amber hover:underline">Sign in</Link> to react
        </p>
      )}
    </div>
  );
}
