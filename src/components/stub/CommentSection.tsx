import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { MessageCircle, Send } from 'lucide-react';
import { db } from '@/services/firebase/config';
import { addComment } from '@/services/firebase/comments';
import { timeAgo } from '@/utils/timeAgo';
import type { StubComment } from '@/types';

interface CommentSectionProps {
  stubId: string;
  comments: StubComment[];
  currentUserId: string | null;
}

interface AuthorInfo {
  displayName: string;
  avatar: string;
}

export function CommentSection({
  stubId,
  comments,
  currentUserId,
}: CommentSectionProps): React.JSX.Element {
  const [localComments, setLocalComments] = useState(comments);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [authors, setAuthors] = useState<Map<string, AuthorInfo>>(new Map());

  // Sync with parent
  if (comments !== localComments && !sending) {
    setLocalComments(comments);
  }

  // Fetch author info for comment users
  useEffect(() => {
    const userIds = [...new Set(localComments.map((c) => c.userId))];
    const missing = userIds.filter((id) => !authors.has(id));
    if (missing.length === 0) return;

    Promise.all(
      missing.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) {
            const data = snap.data();
            return [uid, { displayName: data.displayName ?? 'User', avatar: data.avatar ?? '' }] as const;
          }
        } catch { /* ignore */ }
        return [uid, { displayName: 'User', avatar: '' }] as const;
      }),
    ).then((results) => {
      setAuthors((prev) => {
        const next = new Map(prev);
        for (const [uid, info] of results) next.set(uid, info);
        return next;
      });
    });
  }, [localComments, authors]);

  const handleSubmit = useCallback(async () => {
    if (!currentUserId || !newComment.trim() || sending) return;

    setSending(true);
    const body = newComment.trim();
    setNewComment('');

    // Optimistic add
    const optimistic: StubComment = {
      userId: currentUserId,
      body,
      timestamp: { toDate: () => new Date() } as StubComment['timestamp'],
    };
    setLocalComments((prev) => [...prev, optimistic]);

    try {
      await addComment(stubId, currentUserId, body);
    } catch {
      // Revert on error
      setLocalComments((prev) => prev.filter((c) => c !== optimistic));
      setNewComment(body);
    } finally {
      setSending(false);
    }
  }, [stubId, currentUserId, newComment, sending]);

  function getTimestamp(c: StubComment): Date {
    if (typeof c.timestamp === 'string') return new Date(c.timestamp);
    if (c.timestamp && typeof c.timestamp.toDate === 'function') return c.timestamp.toDate();
    return new Date();
  }

  return (
    <div className="mt-4">
      <h3 className="text-xs font-mono text-stub-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <MessageCircle className="w-3.5 h-3.5" />
        Comments {localComments.length > 0 && `(${localComments.length})`}
      </h3>

      {!currentUserId && localComments.length === 0 && (
        <p className="text-sm text-stub-muted text-center py-4">
          <Link to="/login" className="text-stub-amber hover:underline">Sign in</Link> to join the conversation
        </p>
      )}

      {localComments.length === 0 && currentUserId && (
        <p className="text-sm text-stub-muted text-center py-2">Be the first to comment</p>
      )}

      {/* Comment list */}
      <div className="space-y-3 mb-4">
        {localComments.map((comment, i) => {
          const author = authors.get(comment.userId);
          const ts = getTimestamp(comment);

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2.5"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-stub-border">
                {author?.avatar ? (
                  <img src={author.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-stub-amber/30 to-stub-coral/30 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-stub-amber/60">
                      {(author?.displayName ?? 'U').charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stub-text">{author?.displayName ?? 'User'}</span>
                  <span className="text-[10px] text-stub-muted">{timeAgo(ts)}</span>
                </div>
                <p className="text-sm text-stub-text/90 mt-0.5">{comment.body}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Comment input */}
      {currentUserId && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Add a comment..."
            className="flex-1 bg-stub-surface border border-stub-border rounded-full px-4 py-2 text-sm text-stub-text
              placeholder:text-stub-muted focus:outline-none focus:border-stub-amber/50 transition-colors"
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || sending}
            className="p-2 rounded-full bg-stub-amber text-stub-bg hover:bg-stub-amber-dim transition-colors
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
      {!currentUserId && localComments.length > 0 && (
        <p className="text-sm text-stub-muted text-center py-3 border-t border-stub-border mt-2">
          <Link to="/login" className="text-stub-amber hover:underline">Sign in</Link> to join the conversation
        </p>
      )}
    </div>
  );
}
