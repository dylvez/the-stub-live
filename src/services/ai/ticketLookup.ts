import { callClaude, isClaudeConfigured } from './claude';

/** Cache to avoid duplicate lookups */
const ticketUrlCache = new Map<string, string | null>();

/**
 * Use Perplexity AI to find a ticket purchase URL for an event.
 * Returns the URL string or null if not found.
 */
export async function lookupTicketUrl(
  artistName: string,
  venueName: string,
  eventDate: Date,
): Promise<string | null> {
  if (!isClaudeConfigured) return null;

  const cacheKey = `${artistName}|${venueName}|${eventDate.toISOString().slice(0, 10)}`;
  if (ticketUrlCache.has(cacheKey)) return ticketUrlCache.get(cacheKey) ?? null;

  const dateStr = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  try {
    const result = await callClaude(
      'You are a helpful assistant that finds ticket purchase URLs for live music events. Return ONLY a single valid URL where tickets can be purchased. Prefer the venue\'s own website or official ticketing partner. If you cannot find a ticket URL, respond with exactly "NONE". Do not include any other text.',
      `Find a URL to buy tickets for: ${artistName} at ${venueName} on ${dateStr}`,
      { maxTokens: 256, temperature: 0.1 },
    );

    const trimmed = result.trim();
    if (trimmed === 'NONE' || !trimmed.startsWith('http')) {
      ticketUrlCache.set(cacheKey, null);
      return null;
    }

    ticketUrlCache.set(cacheKey, trimmed);
    return trimmed;
  } catch {
    ticketUrlCache.set(cacheKey, null);
    return null;
  }
}
