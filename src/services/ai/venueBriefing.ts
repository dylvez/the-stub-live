import { httpsCallable, getFunctions } from 'firebase/functions';
import app from '@/services/firebase/config';

export interface VenueBriefing {
  overview: string;
  atmosphere: string;
  tips: string[];
}

const functions = getFunctions(app, 'us-east1');
const generateVenueBriefingFn = httpsCallable(functions, 'generateVenueBriefing');

interface VenueBriefingResponse {
  briefing?: {
    overview: string;
    atmosphere: string;
    tips: string[];
  };
  cached?: boolean;
  status?: string;
}

/**
 * Generate an AI briefing for a venue via Cloud Function.
 */
export async function generateVenueBriefing(
  venueName: string,
  venueCity: string,
  venueState: string,
  venueType: string,
  editorialSummary?: string,
): Promise<VenueBriefing | null> {
  try {
    const result = await generateVenueBriefingFn({
      venueName,
      venueCity,
      venueState,
      venueType,
      editorialSummary,
    });
    const data = result.data as VenueBriefingResponse;
    if (data.status === 'generating') return null;
    if (!data.briefing) return null;
    return {
      overview: data.briefing.overview ?? '',
      atmosphere: data.briefing.atmosphere ?? '',
      tips: Array.isArray(data.briefing.tips) ? data.briefing.tips : [],
    };
  } catch (err) {
    console.warn('Venue briefing generation failed:', err);
    return null;
  }
}
