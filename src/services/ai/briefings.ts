import { httpsCallable, getFunctions } from 'firebase/functions';
import app from '@/services/firebase/config';
import type { AiBriefing } from '@/types';

const functions = getFunctions(app, 'us-east1');
const generateBriefingFn = httpsCallable(functions, 'generateArtistBriefing');

export interface BriefingParams {
  name: string;
  genres: string[];
  tags: string[];
  spotifyPopularity?: number;
  lastfmBio?: string;
  topTrackNames?: string[];
  listenerCount?: number;
}

interface BriefingResponse {
  briefing?: {
    summary: string;
    soundDescription: string;
    liveReputation: string;
    forFansOf: string[];
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
      modelVersion: 'claude-sonnet-4-20250514',
    };
  } catch (err) {
    console.warn('AI briefing generation failed:', err);
    return null;
  }
}

export const isClaudeConfigured = true;
