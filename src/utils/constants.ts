export const REACTION_EMOJIS = ['🔥', '🎶', '💀', '🤘', '❤️', '😭'] as const;

/** Map reaction types to their icon image paths */
export const REACTION_ICONS: Record<string, string> = {
  '🔥': '/images/reaction-fire.png',
  '🎶': '/images/reaction-music.png',
  '💀': '/images/reaction-skull.png',
  '🤘': '/images/reaction-rock.png',
  '❤️': '/images/reaction-heart.png',
  '😭': '/images/reaction-crying.png',
};

export const GENRE_LIST = [
  'Rock', 'Indie', 'Alternative', 'Metal', 'Punk', 'Pop', 'Hip-Hop',
  'R&B', 'Jazz', 'Blues', 'Electronic', 'Dance', 'Folk', 'Country',
  'Soul', 'Funk', 'Reggae', 'Classical', 'Latin', 'World',
  'Experimental', 'Ambient', 'Hardcore', 'Emo', 'Shoegaze',
  'Post-Rock', 'Math Rock', 'Noise', 'Afrobeat', 'Psychedelic',
] as const;

export const VENUE_TYPES = [
  { value: 'arena', label: 'Arena' },
  { value: 'theater', label: 'Theater' },
  { value: 'club', label: 'Club' },
  { value: 'bar', label: 'Bar' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'festival', label: 'Festival' },
  { value: 'house', label: 'House Show' },
  { value: 'other', label: 'Other' },
] as const;

export const DEFAULT_RADIUS_MILES = 50;

export const MAX_STUBS_PER_DAY = 10;
