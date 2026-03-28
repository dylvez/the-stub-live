import type { Timestamp } from 'firebase/firestore';

export type VenueType = 'arena' | 'theater' | 'club' | 'bar' | 'outdoor' | 'festival' | 'house' | 'other';

export interface VenueAccessibility {
  wheelchairAccessible: boolean;
  wheelchairSeating?: string;
  assistiveListening: boolean;
  notes?: string;
}

export interface VenueStats {
  totalShowsTracked: number;
  topArtists: { artistId: string; count: number }[];
  genreBreakdown: { genre: string; percentage: number }[];
}

export interface VenueData {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  capacity?: number;
  venueType: VenueType;
  images: {
    primary: string;
    gallery: string[];
  };
  externalIds: {
    bandsintown?: string;
    ticketmasterId?: string;
    seatgeekId?: string;
    eventbriteId?: string;
    jambaseId?: string;
    songkickId?: string;
    googlePlaceId?: string;
  };
  accessibility: VenueAccessibility;
  stats: VenueStats;
  userNotes?: string;
  // Google Places enrichment
  googleRating?: number;
  googleReviewCount?: number;
  phone?: string;
  website?: string;
  hours?: string[];
  editorialSummary?: string;
  placesEnriched?: boolean;
  lastUpdated: Timestamp;
}
