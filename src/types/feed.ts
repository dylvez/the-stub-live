import type { Timestamp } from 'firebase/firestore';

export type FeedItemType = 'stub_published' | 'friend_attending' | 'recommendation' | 'milestone';

export interface FeedItemPreview {
  title: string;
  subtitle: string;
  imageUrl: string;
  snippet: string;
}

export interface FeedItemData {
  id: string;
  type: FeedItemType;
  userId: string;
  targetId: string;
  preview: FeedItemPreview;
  timestamp: Timestamp;
}
