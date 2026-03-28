export const ARTIST_BRIEFING_SYSTEM_PROMPT = `You are a music journalist writing concise, opinionated artist profiles for concert-goers deciding what to see. You write with authority and personality — think Pitchfork meets a knowledgeable friend. Your goal is to help someone decide whether to see this artist live.

Always respond with ONLY valid JSON (no markdown, no code fences). The JSON must match this exact shape:
{
  "summary": "2-3 sentence hook about the artist",
  "soundDescription": "What they sound like — use vivid comparisons",
  "liveReputation": "What to expect at their show",
  "forFansOf": ["Artist 1", "Artist 2", "Artist 3"]
}`;

export function buildBriefingUserPrompt(params: {
  name: string;
  genres: string[];
  tags: string[];
  spotifyPopularity?: number;
  lastfmBio?: string;
  topTrackNames?: string[];
  listenerCount?: number;
  discogsBio?: string;
  discogsStyles?: string[];
  discographyHighlights?: string[];
  geniusBio?: string;
  geniusSongDescriptions?: string[];
}): string {
  const parts = [`Write a concert-goer briefing for: ${params.name}`];

  if (params.genres.length > 0) {
    parts.push(`Genres: ${params.genres.join(', ')}`);
  }
  if (params.tags.length > 0) {
    parts.push(`Tags: ${params.tags.join(', ')}`);
  }
  if (params.spotifyPopularity != null) {
    parts.push(`Spotify popularity: ${params.spotifyPopularity}/100`);
  }
  if (params.listenerCount) {
    parts.push(`Last.fm listeners: ${params.listenerCount.toLocaleString()}`);
  }
  if (params.topTrackNames && params.topTrackNames.length > 0) {
    parts.push(`Top tracks: ${params.topTrackNames.slice(0, 5).join(', ')}`);
  }
  if (params.lastfmBio) {
    // Truncate bio to avoid using too many tokens
    const truncated = params.lastfmBio.slice(0, 500);
    parts.push(`Bio excerpt: ${truncated}`);
  }
  if (params.discogsStyles && params.discogsStyles.length > 0) {
    parts.push(`Discogs styles: ${params.discogsStyles.join(', ')}`);
  }
  if (params.discographyHighlights && params.discographyHighlights.length > 0) {
    parts.push(`Key releases: ${params.discographyHighlights.slice(0, 8).join('; ')}`);
  }
  if (params.discogsBio) {
    const truncated = params.discogsBio.slice(0, 400);
    parts.push(`Discogs bio: ${truncated}`);
  }
  if (params.geniusBio) {
    const truncated = params.geniusBio.slice(0, 400);
    parts.push(`Genius cultural context: ${truncated}`);
  }
  if (params.geniusSongDescriptions && params.geniusSongDescriptions.length > 0) {
    parts.push(`Notable song context:\n${params.geniusSongDescriptions.slice(0, 3).join('\n')}`);
  }

  return parts.join('\n');
}
