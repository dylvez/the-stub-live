// Spotify Web API client (uses Vite proxy for CORS)
// NOTE: Client credentials flow exposes client_secret in client bundle.
// Acceptable for dev; move to Cloud Functions for production.

import { apiFetch, apiKeys, isSpotifyConfigured } from './config';
import { memGet, memSet, cacheGet, cacheSet, CacheTTL } from './cache';
import type { SpotifyTrack, SpotifyAudioFeatures } from '@/types';

const PROXY_AUTH = '/api/spotify-auth';
const PROXY_API = '/api/spotify';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyArtistResponse {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  images: { url: string; width: number; height: number }[];
  followers: { total: number };
}

interface SpotifyTrackResponse {
  id: string;
  name: string;
  preview_url: string | null;
  duration_ms: number;
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
}

async function getAccessToken(): Promise<string> {
  const cached = memGet<string>('spotify:token');
  if (cached) return cached;

  if (!isSpotifyConfigured) throw new Error('Spotify not configured');

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: apiKeys.spotify.clientId!,
    client_secret: apiKeys.spotify.clientSecret!,
  });

  const data = await apiFetch<SpotifyTokenResponse>(`${PROXY_AUTH}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  memSet('spotify:token', data.access_token, (data.expires_in - 60) * 1000);
  return data.access_token;
}

export async function getSpotifyArtist(spotifyId: string): Promise<SpotifyArtistResponse | null> {
  if (!isSpotifyConfigured) return null;

  const cached = cacheGet<SpotifyArtistResponse>(`spotify:artist:${spotifyId}`, true);
  if (cached) return cached;

  const token = await getAccessToken();
  const data = await apiFetch<SpotifyArtistResponse>(`${PROXY_API}/v1/artists/${spotifyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (data) {
    cacheSet(`spotify:artist:${spotifyId}`, data, CacheTTL.ARTIST, true);
  }
  return data;
}

export async function getSpotifyTopTracks(spotifyId: string, market = 'US'): Promise<SpotifyTrack[]> {
  if (!isSpotifyConfigured) return [];

  const cacheKey = `spotify:tracks:${spotifyId}`;
  const cached = cacheGet<SpotifyTrack[]>(cacheKey, true);
  if (cached) return cached;

  const token = await getAccessToken();
  const data = await apiFetch<{ tracks: SpotifyTrackResponse[] }>(
    `${PROXY_API}/v1/artists/${spotifyId}/top-tracks?market=${market}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!data?.tracks) return [];

  const tracks: SpotifyTrack[] = data.tracks.map((t) => ({
    id: t.id,
    name: t.name,
    previewUrl: t.preview_url,
    albumName: t.album.name,
    albumImageUrl: t.album.images[t.album.images.length - 1]?.url ?? '',
    durationMs: t.duration_ms,
  }));

  cacheSet(cacheKey, tracks, CacheTTL.ARTIST, true);
  return tracks;
}

export async function getSpotifyAudioFeatures(trackIds: string[]): Promise<SpotifyAudioFeatures | null> {
  if (!isSpotifyConfigured || trackIds.length === 0) return null;

  const token = await getAccessToken();
  const data = await apiFetch<{ audio_features: { energy: number; valence: number; danceability: number; instrumentalness: number }[] }>(
    `${PROXY_API}/v1/audio-features?ids=${trackIds.join(',')}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!data?.audio_features) return null;

  const features = data.audio_features.filter(Boolean);
  if (features.length === 0) return null;

  const avg = (key: keyof typeof features[0]) =>
    features.reduce((sum, f) => sum + f[key], 0) / features.length;

  return {
    energy: avg('energy'),
    valence: avg('valence'),
    danceability: avg('danceability'),
    instrumentalness: avg('instrumentalness'),
  };
}
