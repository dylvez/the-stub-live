import { callClaude, isClaudeConfigured } from './claude';

export interface VenueBriefing {
  overview: string;
  atmosphere: string;
  tips: string[];
}

const cache = new Map<string, VenueBriefing | null>();

/** Strip footnote references like [1], [2][3] from AI text */
function stripFootnotes(text: string): string {
  return text.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Generate an AI overview for a venue using Perplexity.
 */
export async function generateVenueBriefing(
  venueName: string,
  venueCity: string,
  venueState: string,
  venueType: string,
  editorialSummary?: string,
): Promise<VenueBriefing | null> {
  if (!isClaudeConfigured) return null;

  const cacheKey = `${venueName}|${venueCity}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;

  try {
    const result = await callClaude(
      `You are a knowledgeable live music venue guide. Return a JSON object with exactly these fields:
- "overview": A 2-3 sentence overview of the venue, its history, and what makes it special for live music. Be specific and informative.
- "atmosphere": A 1-2 sentence description of the vibe and atmosphere concert-goers can expect.
- "tips": An array of 2-3 short practical tips for attending shows at this venue (parking, best spots, food/drink, etc.)

Return ONLY valid JSON, no markdown, no code fences.`,
      `Tell me about ${venueName} in ${venueCity}, ${venueState}. It is a ${venueType} venue.${editorialSummary ? ` Additional context: ${editorialSummary}` : ''}`,
      { maxTokens: 512, temperature: 0.3 },
    );

    const cleaned = result.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned);

    const briefing: VenueBriefing = {
      overview: stripFootnotes(parsed.overview ?? ''),
      atmosphere: stripFootnotes(parsed.atmosphere ?? ''),
      tips: Array.isArray(parsed.tips) ? parsed.tips.map(stripFootnotes) : [],
    };

    cache.set(cacheKey, briefing);
    return briefing;
  } catch {
    cache.set(cacheKey, null);
    return null;
  }
}
