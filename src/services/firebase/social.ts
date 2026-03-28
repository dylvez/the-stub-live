import { doc, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './config';

/** Follow a user — updates both users' arrays in a batch */
export async function followUser(
  currentUserId: string,
  targetUserId: string,
): Promise<void> {
  if (currentUserId === targetUserId) return;

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', currentUserId), {
    following: arrayUnion(targetUserId),
  });
  batch.update(doc(db, 'users', targetUserId), {
    followers: arrayUnion(currentUserId),
  });
  await batch.commit();
}

/** Unfollow a user — removes from both arrays in a batch */
export async function unfollowUser(
  currentUserId: string,
  targetUserId: string,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', currentUserId), {
    following: arrayRemove(targetUserId),
  });
  batch.update(doc(db, 'users', targetUserId), {
    followers: arrayRemove(currentUserId),
  });
  await batch.commit();
}
