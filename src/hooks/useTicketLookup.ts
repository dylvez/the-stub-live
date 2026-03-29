import { useState, useEffect } from 'react';
import { lookupTicketUrl } from '@/services/ai/ticketLookup';

/**
 * Hook that attempts to find a ticket URL via Perplexity AI
 * when an event doesn't already have one.
 */
export function useTicketLookup(
  artistName: string | undefined,
  venueName: string | undefined,
  eventDate: Date | undefined,
  existingTicketUrl: string | undefined,
): string | undefined {
  const [foundUrl, setFoundUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (existingTicketUrl || !artistName || !venueName || !eventDate) return;

    let cancelled = false;
    lookupTicketUrl(artistName, venueName, eventDate).then((url) => {
      if (!cancelled && url) setFoundUrl(url);
    });

    return () => { cancelled = true; };
  }, [artistName, venueName, eventDate?.toISOString(), existingTicketUrl]);

  return existingTicketUrl || foundUrl;
}
