import type { Timestamp } from 'firebase/firestore';

export interface ArtistImages {
  primary: string;
  gallery: string[];
}

export interface ArtistExternalIds {
  spotifyId?: string;
  musicbrainzId?: string;
  bandsintown?: string;
  songkickId?: string;
  youtubeChannelId?: string;
  instagramHandle?: string;
  bandcampUrl?: string;
  websiteUrl?: string;
  jambaseId?: string;
  discogsId?: string;
  geniusId?: string;
}

export interface AiBriefing {
  summary: string;
  soundDescription: string;
  liveReputation: string;
  forFansOf: string[];
  generatedAt?: Timestamp;
  modelVersion: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  previewUrl: string | null;
  albumName: string;
  albumImageUrl: string;
  durationMs: number;
}

export interface SpotifyAudioFeatures {
  energy: number;
  valence: number;
  danceability: number;
  instrumentalness: number;
}

export interface SpotifyData {
  popularity: number;
  topTracks: SpotifyTrack[];
  audioFeatures: SpotifyAudioFeatures;
}

export interface ArtistData {
  id: string;
  name: string;
  sortName: string;
  genres: string[];
  tags: string[];
  images: ArtistImages;
  externalIds: ArtistExternalIds;
  aiBriefing?: AiBriefing;
  spotifyData?: SpotifyData;
  lastEnriched?: Timestamp;
}
