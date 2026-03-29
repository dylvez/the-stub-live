import { callClaude, isClaudeConfigured } from './claude';

/** Cache to avoid duplicate lookups */
const ticketUrlCache = new Map<string, string | null>();

/** Simple serial queue to avoid rate limiting */
const pendingQueue: Array<{ key: string; resolve: (url: string | null) => void; fn: () => Promise<string | null> }> = [];
let isProcessing = false;

async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  while (pendingQueue.length > 0) {
    const item = pendingQueue.shift()!;
    // Check cache again (may have been resolved by a duplicate)
    if (ticketUrlCache.has(item.key)) {
      item.resolve(ticketUrlCache.get(item.key) ?? null);
      continue;
    }
    try {
      const result = await item.fn();
      ticketUrlCache.set(item.key, result);
      item.resolve(result);
    } catch {
      ticketUrlCache.set(item.key, null);
      item.resolve(null);
    }
    // Delay between requests to respect rate limits
    await new Promise((r) => setTimeout(r, 1500));
  }

  isProcessing = false;
}

/**
 * Use Perplexity AI to find a ticket purchase URL for an event.
 * Requests are serialized with a delay to avoid rate limiting.
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

  return new Promise((resolve) => {
    pendingQueue.push({
      key: cacheKey,
      resolve,
      fn: async () => {
        const result = await callClaude(
          'You are a helpful assistant that finds ticket purchase URLs for live music events. Return ONLY a single valid URL where tickets can be purchased. Prefer the venue\'s own website or official ticketing partner. If you cannot find a ticket URL, respond with exactly "NONE". Do not include any other text.',
          `Find a URL to buy tickets for: ${artistName} at ${venueName} on ${dateStr}`,
          { maxTokens: 256, temperature: 0.1 },
        );

        const trimmed = result.trim();
        if (trimmed === 'NONE' || !trimmed.startsWith('http')) {
          return null;
        }
        return trimmed;
      },
    });
    processQueue();
  });
}
