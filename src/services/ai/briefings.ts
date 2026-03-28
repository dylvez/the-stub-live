import { httpsCallable, getFunctions } from 'firebase/functions';
import app from '@/services/firebase/config';
import type { AiBriefing, AiEventBriefing } from '@/types';

const functions = getFunctions(app, 'us-east1');
const generateBriefingFn = httpsCallable(functions, 'generateArtistBriefing');
const generateEventBriefingFn = httpsCallable(functions, 'generateEventBriefing');

export interface BriefingParams {
  name: string;
  genres: string[];
  tags: string[];
  spotifyPopularity?: number;
  lastfmBio?: string;
  topTrackNames?: string[];
  listenerCount?: number;
  // Discogs enrichment
  discogsBio?: string;
  discogsStyles?: string[];
  discographyHighlights?: string[];
  // Genius enrichment
  geniusBio?: string;
  geniusSongDescriptions?: string[];
}

interface BriefingResponse {
  briefing?: {
    summary: string;
    soundDescription: string;
    liveReputation: string;
    forFansOf: string[];
    websiteUrl?: string | null;
    imageUrl?: string | null;
  };
  cached?: boolean;
  status?: string;
}

export async function generateArtistBriefing(
  artistId: string,
  params: BriefingParams,
): Promise<AiBriefing | null> {
  try {
    const result = await generateBriefingFn({ artistId, ...params });
    const data = result.data as BriefingResponse;
    if (data.status === 'generating') return null;
    if (!data.briefing) return null;
    return {
      summary: data.briefing.summary ?? '',
      soundDescription: data.briefing.soundDescription ?? '',
      liveReputation: data.briefing.liveReputation ?? '',
      forFansOf: Array.isArray(data.briefing.forFansOf) ? data.briefing.forFansOf : [],
      websiteUrl: data.briefing.websiteUrl ?? null,
      imageUrl: data.briefing.imageUrl ?? null,
      modelVersion: 'sonar-pro',
    };
  } catch (err) {
    console.warn('AI briefing generation failed:', err);
    return null;
  }
}

export interface EventBriefingParams {
  artistName: string;
  artistGenres: string[];
  venueName: string;
  venueCity?: string;
  venueState?: string;
  venueType?: string;
  eventDate: string;
  artistBriefingSummary?: string;
  artistLiveReputation?: string;
}

interface EventBriefingResponse {
  briefing?: {
    showPreview: string;
    venueInsight: string;
    proTips: string[];
    listeningGuide: string[];
  };
  cached?: boolean;
  status?: string;
}

export async function generateEventBriefing(
  params: EventBriefingParams,
): Promise<AiEventBriefing | null> {
  try {
    const result = await generateEventBriefingFn(params);
    const data = result.data as EventBriefingResponse;
    if (data.status === 'generating') return null;
    if (!data.briefing) return null;
    return {
      showPreview: data.briefing.showPreview ?? '',
      venueInsight: data.briefing.venueInsight ?? '',
      proTips: Array.isArray(data.briefing.proTips) ? data.briefing.proTips : [],
      listeningGuide: Array.isArray(data.briefing.listeningGuide) ? data.briefing.listeningGuide : [],
      modelVersion: 'sonar-pro',
    };
  } catch (err) {
    console.warn('AI event briefing generation failed:', err);
    return null;
  }
}

export const isClaudeConfigured = true;
