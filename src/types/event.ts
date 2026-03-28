import type { Timestamp } from 'firebase/firestore';

export type EventStatus = 'scheduled' | 'cancelled' | 'postponed' | 'past';

export interface EventPriceRange {
  min: number;
  max: number;
  currency: string;
}

export interface EventData {
  id: string;
  artistIds: string[];
  venueId: string;
  date: Timestamp;
  doorsTime?: Timestamp;
  showTime?: Timestamp;
  endTime?: Timestamp;
  status: EventStatus;
  ticketUrl?: string;
  priceRange?: EventPriceRange;
  ageRestriction?: string;
  source: string;
  externalIds: {
    bandsintown?: string;
    ticketmasterId?: string;
    seatgeekId?: string;
    eventbriteId?: string;
    jambaseId?: string;
  };
  aiRecommendationScore?: number;
  aiRecommendationReason?: string;
  lastUpdated: Timestamp;
}

export interface AiEventBriefing {
  showPreview: string;
  venueInsight: string;
  proTips: string[];
  listeningGuide: string[];
  generatedAt?: Timestamp;
  modelVersion: string;
}
