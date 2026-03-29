import type { Timestamp } from 'firebase/firestore';

export interface ArtistImages {
  primary: string;
  gallery: string[];
}

export interface ArtistExternalIds {
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
  websiteUrl?: string | null;
  imageUrl?: string | null;
  generatedAt?: Timestamp;
  modelVersion: string;
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
  lastEnriched?: Timestamp;
}
