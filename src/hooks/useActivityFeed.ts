import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import type { StubRecord } from '@/hooks/useStub';

export interface FeedItem extends StubRecord {
  authorName: string;
  authorAvatar: string;
}

export interface UseActivityFeedReturn {
  items: FeedItem[];
  isLoading: boolean;
}

/** Fetch recent public stubs from followed users */
export function useActivityFeed(following: string[]): UseActivityFeedReturn {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!following || following.length === 0) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchFeed(): Promise<void> {
      try {
        // Firestore `in` supports max 30 values — chunk if needed
        const chunks: string[][] = [];
        for (let i = 0; i < following.length; i += 30) {
          chunks.push(following.slice(i, i + 30));
        }

        const allStubs: StubRecord[] = [];

        for (const chunk of chunks) {
          const q = query(
            collection(db, 'stubs'),
            where('userId', 'in', chunk),
            where('visibility', '==', 'public'),
            orderBy('createdAt', 'desc'),
            limit(20),
          );
          const snapshot = await getDocs(q);
          for (const d of snapshot.docs) {
            allStubs.push(d.data() as StubRecord);
          }
        }

        if (cancelled) return;

        // Sort by createdAt desc and take top 20
        allStubs.sort((a, b) => {
          const aTime = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt.toDate().getTime();
          const bTime = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt.toDate().getTime();
          return bTime - aTime;
        });
        const top = allStubs.slice(0, 20);

        // Fetch author info
        const authorIds = [...new Set(top.map((s) => s.userId))];
        const authorMap = new Map<string, { name: string; avatar: string }>();

        await Promise.all(
          authorIds.map(async (uid) => {
            try {
              const snap = await getDoc(doc(db, 'users', uid));
              if (snap.exists()) {
                const data = snap.data();
                authorMap.set(uid, {
                  name: data.displayName ?? 'User',
                  avatar: data.avatar ?? '',
                });
              }
            } catch { /* ignore */ }
          }),
        );

        if (cancelled) return;

        const feedItems: FeedItem[] = top.map((stub) => ({
          ...stub,
          authorName: authorMap.get(stub.userId)?.name ?? 'User',
          authorAvatar: authorMap.get(stub.userId)?.avatar ?? '',
        }));

        setItems(feedItems);
      } catch (err) {
        console.warn('Activity feed fetch failed:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFeed();
    return () => { cancelled = true; };
  }, [following.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return { items, isLoading };
}
