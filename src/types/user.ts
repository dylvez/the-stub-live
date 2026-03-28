import type { Timestamp } from 'firebase/firestore';

export interface UserLocation {
  city: string;
  state: string;
  lat: number;
  lng: number;
  radiusMiles: number;
}

export interface MusicPreferences {
  genres: string[];
  moods: string[];
  freeformDescription: string;
}

export interface UserStats {
  totalShows: number;
  totalVenues: number;
  totalArtists: number;
  memberSince: Timestamp;
}

export interface SocialLinks {
  instagram?: string;
  x?: string;
  tiktok?: string;
  spotify?: string;
  threads?: string;
  youtube?: string;
  facebook?: string;
}

export interface UserData {
  id: string;
  displayName: string;
  handle: string;
  avatar: string;
  bio: string;
  location: UserLocation;
  musicPreferences: MusicPreferences;
  spotifyConnected: boolean;
  spotifyRefreshToken?: string;
  appleMusicConnected: boolean;
  socialLinks?: SocialLinks;
  stats: UserStats;
  following: string[];
  followers: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
