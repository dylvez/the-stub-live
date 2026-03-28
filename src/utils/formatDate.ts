import type { Timestamp } from 'firebase/firestore';

export function formatEventDate(date: Date | Timestamp): string {
  const d = 'toDate' in date ? date.toDate() : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatEventTime(date: Date | Timestamp): string {
  const d = 'toDate' in date ? date.toDate() : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatFullDate(date: Date | Timestamp): string {
  const d = 'toDate' in date ? date.toDate() : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatRelativeDate(date: Date | Timestamp): string {
  const d = 'toDate' in date ? date.toDate() : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatEventDate(d);
}

export function isTonight(date: Date | Timestamp): boolean {
  const d = 'toDate' in date ? date.toDate() : date;
  const now = new Date();
  return d.toDateString() === now.toDateString() && d.getTime() > now.getTime();
}

export function isThisWeek(date: Date | Timestamp): boolean {
  const d = 'toDate' in date ? date.toDate() : date;
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 86400000);
  return d >= now && d <= weekFromNow;
}

/** Returns true if the event is strictly in the future (not today). Today = could be at the show. */
export function isEventInFuture(date: Date | Timestamp): boolean {
  const d = 'toDate' in date ? date.toDate() : date;
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d >= tomorrow;
}
