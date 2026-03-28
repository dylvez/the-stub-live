// Setlist enrichment — enriches setlist songs with Genius metadata
// Called fire-and-forget after Stub save. Updates Firestore async.

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { isGeniusConfigured } from './config';
import { searchGeniusSong } from './genius';
import type { SetlistSong } from '@/types';

/**
 * Enriches a Stub's setlist songs with Genius song descriptions and links.
 * Runs as a fire-and-forget operation after Stub creation — the UI doesn't wait.
 * Updates the Stub document in Firestore once enrichment is complete.
 */
export async function enrichSetlistWithGenius(
  stubId: string,
  songs: SetlistSong[],
  artistName: string,
): Promise<void> {
  if (!isGeniusConfigured || songs.length === 0) return;

  try {
    const enrichedSongs = await Promise.all(
      songs.map(async (song): Promise<SetlistSong> => {
        try {
          // For covers, search with the original artist name
          const searchArtist = song.isCover && song.originalArtist
            ? song.originalArtist
            : artistName;

          const match = await searchGeniusSong(song.title, searchArtist);
          if (!match) return song;

          return {
            ...song,
            geniusId: match.geniusId,
            geniusSongDescription: match.description?.slice(0, 200),
            geniusUrl: match.geniusUrl,
          };
        } catch {
          return song; // best-effort per song
        }
      }),
    );

    // Only update Firestore if at least one song was enriched
    const hasEnrichment = enrichedSongs.some((s) => s.geniusId != null);
    if (!hasEnrichment) return;

    await updateDoc(doc(db, 'stubs', stubId), {
      'setlist.songs': enrichedSongs,
    });
  } catch (err) {
    // Entire enrichment failed — this is best-effort, don't throw
    console.warn('Setlist Genius enrichment failed:', err);
  }
}
