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

/** Branded nav icon paths — set to 'heavy' or 'subtle' after review */
export const NAV_ICONS: Record<string, string> = {
  '/': '/images/nav-home-subtle.png',
  '/search': '/images/nav-search-subtle.png',
  '/create': '/images/nav-create-subtle.png',
  '/stubs': '/images/nav-stubs-subtle.png',
  '/ask': '/images/nav-askstub-subtle.png',
};

/** Section header icon paths */
export const SECTION_ICONS: Record<string, string> = {
  trending: '/images/section-trending.png',
  radar: '/images/section-radar.png',
  newToTown: '/images/section-new-to-town.png',
  discover: '/images/section-discover.png',
};

/** Action icon paths */
export const ACTION_ICONS: Record<string, string> = {
  stubIt: '/images/action-stub-it.png',
  share: '/images/action-share.png',
  save: '/images/action-save.png',
};

/** Star rating icon paths */
export const STAR_ICONS = {
  filled: '/images/star-filled.png',
  half: '/images/star-half.png',
  empty: '/images/star-empty.png',
  filledSmall: '/images/star-filled-small.png',
  emptySmall: '/images/star-empty-small.png',
};

/** Platform logo paths */
export const PLATFORM_ICONS: Record<string, string> = {
  instagram: '/images/platform-instagram.svg',
  x: '/images/platform-x.svg',
  facebook: '/images/platform-facebook.svg',
  tiktok: '/images/platform-tiktok.svg',
  threads: '/images/platform-threads.svg',
  spotify: '/images/platform-spotify.svg',
  youtube: '/images/platform-youtube.svg',
  ticketmaster: '/images/platform-ticketmaster.svg',
  seatgeek: '/images/platform-seatgeek.svg',
  eventbrite: '/images/platform-eventbrite.svg',
  axs: '/images/platform-axs.svg',
  dice: '/images/platform-dice.svg',
  stubhub: '/images/platform-stubhub.svg',
  setlistfm: '/images/platform-setlistfm.svg',
  bandsintown: '/images/platform-bandsintown.svg',
  lastfm: '/images/platform-lastfm.svg',
};
