import type { EventData } from '@/types';

/** Returns true if the URL points to an actual ticket purchase platform (not Jambase event info). */
export function isTicketPurchaseUrl(url: string | undefined, source?: string): boolean {
  if (!url) return false;
  if (source === 'jambase' || url.includes('jambase.com')) return false;
  return true;
}

/** Derive a human-friendly platform name from a ticket URL. */
export function getTicketPlatformName(url: string): string {
  if (url.includes('ticketmaster.com')) return 'Ticketmaster';
  if (url.includes('seatgeek.com')) return 'SeatGeek';
  if (url.includes('eventbrite.com')) return 'Eventbrite';
  if (url.includes('axs.com')) return 'AXS';
  if (url.includes('dice.fm')) return 'DICE';
  if (url.includes('stubhub.com')) return 'StubHub';
  return 'Tickets';
}

interface TicketSourceLink {
  platform: string;
  url: string;
}

/** Build direct ticket links from the event's external IDs. */
export function getTicketSourceLinks(externalIds: EventData['externalIds']): TicketSourceLink[] {
  const links: TicketSourceLink[] = [];

  if (externalIds.ticketmasterId) {
    links.push({
      platform: 'Ticketmaster',
      url: `https://www.ticketmaster.com/event/${externalIds.ticketmasterId}`,
    });
  }
  if (externalIds.seatgeekId) {
    links.push({
      platform: 'SeatGeek',
      url: `https://seatgeek.com/e/${externalIds.seatgeekId}`,
    });
  }
  if (externalIds.eventbriteId) {
    links.push({
      platform: 'Eventbrite',
      url: `https://www.eventbrite.com/e/${externalIds.eventbriteId}`,
    });
  }
  // Intentionally exclude Jambase — their URLs are event info, not ticket purchase

  return links;
}
