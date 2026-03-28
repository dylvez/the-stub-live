export interface GeniusSocialLinks {
  twitter?: string;
  instagram?: string;
  facebook?: string;
}

export interface GeniusArtistInfo {
  geniusId: number;
  name: string;
  alternateNames: string[];
  imageUrl?: string;
  headerImageUrl?: string;
  description?: string;
  socialLinks: GeniusSocialLinks;
}

export interface GeniusSongInfo {
  geniusId: number;
  title: string;
  artistName: string;
  description?: string;
  annotationCount: number;
  releaseDate?: string;
  albumName?: string;
  geniusUrl: string;
  featuredArtists: string[];
}
