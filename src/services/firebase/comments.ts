import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from './config';
import type { StubComment } from '@/types';

/** Add a comment to a stub */
export async function addComment(
  stubId: string,
  userId: string,
  body: string,
): Promise<StubComment> {
  const comment: StubComment = {
    userId,
    body: body.trim(),
    timestamp: Timestamp.now(),
  };

  const ref = doc(db, 'stubs', stubId);
  await updateDoc(ref, { comments: arrayUnion(comment) });
  return comment;
}
