import type { Timestamp } from 'firebase/firestore';

export type StubVisibility = 'public' | 'friends' | 'private';
export type ReactionType = '🔥' | '🎶' | '💀' | '🤘' | '❤️' | '😭';
export type SetlistSource = 'setlistfm' | 'user' | 'ai_assisted';

export interface VibeRating {
  energy: number;
  crowd: number;
  sound: number;
  intimacy: number;
}

export interface SetlistSong {
  title: string;
  encore: boolean;
  notes?: string;
  isCover: boolean;
  originalArtist?: string;
}

export interface StubSetlist {
  songs: SetlistSong[];
  source: SetlistSource;
  setlistfmId?: string;
}

export interface StubNarrative {
  body: string;
  aiPromptResponses: {
    prompt: string;
    response: string;
  }[];
}

export interface StubPhoto {
  url: string;
  storageRef?: string;
  caption?: string;
  timestamp?: Timestamp;
}

export interface StubReaction {
  userId: string;
  type: ReactionType;
  timestamp: Timestamp;
}

export interface StubComment {
  userId: string;
  body: string;
  timestamp: Timestamp;
}

export interface StubData {
  id: string;
  userId: string;
  eventId?: string;
  artistIds: string[];
  venueId: string;
  date: Timestamp;
  rating?: number;
  vibeRating?: VibeRating;
  companions: string[];
  highlights: string[];
  standoutSong?: string;
  setlist?: StubSetlist;
  narrative?: StubNarrative;
  photos: StubPhoto[];
  visibility: StubVisibility;
  reactions: StubReaction[];
  comments: StubComment[];
  shares: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
}
