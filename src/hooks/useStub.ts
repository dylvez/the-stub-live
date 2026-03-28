import { useState, useEffect } from 'react';
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/services/firebase/config';
import type { StubReaction, StubComment, VibeRating, StubVisibility, StubStatus } from '@/types';

/** Shape stored in Firestore (flat strings, not full StubData) */
export interface StubRecord {
  id: string;
  userId: string;
  eventId?: string;
  artistName: string;
  venueName: string;
  artistImage?: string;
  date: Timestamp | string;
  rating: number;
  vibeRating: VibeRating;
  highlights: string[];
  standoutSong?: string;
  photoCount: number;
  photos?: { url: string; storageRef?: string; caption?: string }[];
  setlist?: { songs: { title: string; encore: boolean; isCover: boolean; originalArtist?: string; notes?: string }[]; source: string };
  narrative?: { body: string; aiPromptResponses?: { prompt: string; response: string }[] };
  companions?: string[];
  status?: StubStatus;
  visibility: StubVisibility;
  reactions?: StubReaction[];
  comments?: StubComment[];
  shares?: number;
  displayName?: string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  publishedAt?: Timestamp | string;
}

export interface UseStubReturn {
  stub: StubRecord | null;
  isLoading: boolean;
  error: string | null;
}

function toDate(val: Timestamp | string | undefined): Date {
  if (!val) return new Date();
  if (typeof val === 'string') return new Date(val);
  if (typeof (val as Timestamp).toDate === 'function') return (val as Timestamp).toDate();
  return new Date();
}

export { toDate as stubToDate };

export function useStub(id: string | undefined): UseStubReturn {
  const [stub, setStub] = useState<StubRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    // Try localStorage first for immediate render
    try {
      const raw = localStorage.getItem('stub:my-stubs');
      if (raw) {
        const arr = JSON.parse(raw) as StubRecord[];
        const found = arr.find((s) => s.id === id);
        if (found) {
          setStub(found);
          setIsLoading(false);
        }
      }
    } catch { /* ignore */ }

    // Wait for auth to resolve before subscribing to Firestore
    // This prevents permission-denied errors when auth hasn't loaded yet
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, () => {
      // Auth state resolved (user or null) — now subscribe to Firestore
      if (unsubFirestore) unsubFirestore(); // clean up any prior listener

      unsubFirestore = onSnapshot(
        doc(db, 'stubs', id),
        (snapshot) => {
          if (snapshot.exists()) {
            setStub({ id: snapshot.id, ...snapshot.data() } as StubRecord);
            setError(null);
          } else {
            setError('Stub not found');
          }
          setIsLoading(false);
        },
        (err) => {
          console.error('useStub snapshot error:', err.code, err.message);
          if (err.code === 'permission-denied') {
            setError('Sign in to view this stub');
          } else {
            setError(err.message);
          }
          setIsLoading(false);
        },
      );
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, [id]);

  return { stub, isLoading, error };
}
