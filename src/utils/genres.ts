/** Map raw genre strings (from APIs) to canonical display names */
export const GENRE_CANONICAL: Record<string, string> = {
  'rock': 'Rock',
  'alternative': 'Alt/Indie',
  'alt-rock': 'Alt/Indie',
  'alternative rock': 'Alt/Indie',
  'punk': 'Punk',
  'punk-rock': 'Punk',
  'pop-punk': 'Punk',
  'hardcore': 'Punk',
  'metal': 'Metal',
  'heavy-metal': 'Metal',
  'death-metal': 'Metal',
  'black-metal': 'Metal',
  'jazz': 'Jazz',
  'folk': 'Folk',
  'americana': 'Folk',
  'bluegrass': 'Folk',
  'country': 'Country',
  'country-music': 'Country',
  'electronic': 'Electronic',
  'dance/electronic': 'Electronic',
  'edm': 'Electronic',
  'house': 'Electronic',
  'techno': 'Electronic',
  'hip-hop': 'Hip-Hop',
  'hip-hop/rap': 'Hip-Hop',
  'hip-hop-rap': 'Hip-Hop',
  'rap': 'Hip-Hop',
  'r&b': 'R&B',
  'rnb': 'R&B',
  'soul': 'R&B',
  'pop': 'Pop',
  'indie': 'Alt/Indie',
  'indie-rock': 'Alt/Indie',
  'blues': 'Blues',
  'blues-rock': 'Blues',
  'reggae': 'Reggae',
  'classical': 'Classical',
  'latin': 'Latin',
  'urban': 'Hip-Hop',
};

/** Canonicalize raw genre strings into deduplicated display labels (max `limit`). */
export function canonicalizeGenres(raw: string[] | undefined, limit = 2): string[] {
  if (!raw || raw.length === 0) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const g of raw) {
    const canonical = GENRE_CANONICAL[g.toLowerCase()];
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      result.push(canonical);
      if (result.length >= limit) break;
    }
  }
  return result;
}
