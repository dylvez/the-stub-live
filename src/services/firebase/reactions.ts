import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './config';
import type { StubReaction, ReactionType } from '@/types';

/** Add a reaction to a stub (or toggle off if already reacted with this type) */
export async function addReaction(
  stubId: string,
  userId: string,
  type: ReactionType,
): Promise<StubReaction[]> {
  const ref = doc(db, 'stubs', stubId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Stub not found');

  const data = snap.data();
  const reactions: StubReaction[] = data.reactions ?? [];

  // Check if user already has this reaction
  const existing = reactions.findIndex(
    (r) => r.userId === userId && r.type === type,
  );

  let updated: StubReaction[];
  if (existing >= 0) {
    // Remove it (toggle off)
    updated = reactions.filter((_, i) => i !== existing);
  } else {
    // Add it
    updated = [...reactions, { userId, type, timestamp: Timestamp.now() }];
  }

  await updateDoc(ref, { reactions: updated });
  return updated;
}

/** Get the set of reaction types the current user has on a stub */
export function getUserReactionTypes(
  reactions: StubReaction[],
  userId: string,
): Set<ReactionType> {
  const set = new Set<ReactionType>();
  for (const r of reactions) {
    if (r.userId === userId) set.add(r.type);
  }
  return set;
}

/** Get reaction counts grouped by type */
export function getReactionCounts(
  reactions: StubReaction[],
): Map<ReactionType, number> {
  const counts = new Map<ReactionType, number>();
  for (const r of reactions) {
    counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
  }
  return counts;
}
