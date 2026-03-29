const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

if (getApps().length === 0) {
  initializeApp();
}

const perplexityKey = defineSecret("PERPLEXITY_API_KEY");

const SYSTEM_PROMPT = `You are a music image researcher. Your ONLY job is to find a working direct image URL for a music artist.

Search aggressively across ALL of these sources:
1. Wikipedia / Wikimedia Commons (upload.wikimedia.org) — most artists have a photo here
2. Last.fm artist pages (lastfm.freetls.fastly.net or similar CDN)
3. Bandcamp artist/album art
4. Music festival photography
5. Music publication press photos (Pitchfork, NME, Rolling Stone, etc.)
6. Official artist websites and labels
7. Discogs artist photos
8. MusicBrainz cover art archive

CRITICAL RULES:
- You MUST return a direct image file URL, not a webpage URL
- Valid URLs end in .jpg, .jpeg, .png, .webp, or are from known image CDNs (upload.wikimedia.org, lastfm.freetls.fastly.net, i.scdn.co, f4.bcbits.com, etc.)
- Do NOT return social media page URLs (instagram.com, facebook.com, twitter.com)
- Do NOT return Google Image search result URLs
- Try VERY hard to find something — even album artwork or a band logo is better than null

Return ONLY a JSON object:
{"imageUrl": "<direct_image_url>", "source": "<source_name>"}

Only return null if you truly cannot find ANY image of this artist anywhere on the internet.
Return raw JSON only. No explanation, no markdown fences.`;

/**
 * Dedicated artist image search via Perplexity.
 * Called as a fallback when no image is available from Spotify/Bandsintown/Ticketmaster.
 */
exports.searchArtistImage = onCall(
  {
    region: "us-east1",
    secrets: [perplexityKey],
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (request) => {
    const { artistName, artistId } = request.data ?? {};

    if (!artistName || typeof artistName !== "string") {
      throw new HttpsError("invalid-argument", "artistName is required");
    }

    const db = getFirestore();

    // Check cache first (stored alongside briefings)
    if (artistId) {
      const cacheDoc = await db.collection("artistImages").doc(artistId).get();
      if (cacheDoc.exists) {
        const data = cacheDoc.data();
        if (data.imageUrl) return { imageUrl: data.imageUrl, cached: true };
        // If we previously searched and found nothing, don't retry for 7 days
        if (data.searchedAt) {
          const ageMs = Date.now() - data.searchedAt.toMillis();
          if (ageMs < 7 * 24 * 60 * 60 * 1000) {
            return { imageUrl: null, cached: true };
          }
        }
      }
    }

    try {
      const apiKey = perplexityKey.value();
      if (!apiKey) {
        throw new HttpsError("failed-precondition", "PERPLEXITY_API_KEY secret not configured");
      }

      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "sonar-pro",
          max_tokens: 256,
          temperature: 0.1,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Find a direct image URL (photo or press image) for the music artist "${artistName}". Search Wikipedia, Last.fm, Bandcamp, Discogs, and music publications. Return the best direct image file URL you can find.` },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error ${response.status}: ${errorText}`);
      }

      const aiData = await response.json();
      let jsonStr = aiData.choices?.[0]?.message?.content ?? "";

      if (jsonStr.includes("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      jsonStr = jsonStr.trim();

      console.log(`searchArtistImage [${artistName}] raw response:`, jsonStr.substring(0, 500));

      const parsed = JSON.parse(jsonStr);
      let imageUrl = parsed.imageUrl || null;
      console.log(`searchArtistImage [${artistName}] candidate:`, imageUrl ? imageUrl.substring(0, 200) : "null");

      // Validate the image URL actually loads
      if (imageUrl) {
        try {
          const imgResponse = await fetch(imageUrl, { method: "HEAD", signal: AbortSignal.timeout(8000) });
          const contentType = imgResponse.headers.get("content-type") || "";
          if (!imgResponse.ok || !contentType.startsWith("image/")) {
            console.log(`searchArtistImage [${artistName}] URL failed validation: status=${imgResponse.status} type=${contentType}`);
            imageUrl = null;
          } else {
            console.log(`searchArtistImage [${artistName}] URL validated: ${contentType}`);
          }
        } catch (validationErr) {
          console.log(`searchArtistImage [${artistName}] URL validation error:`, validationErr.message);
          imageUrl = null;
        }
      }

      // Cache the result
      if (artistId) {
        await db.collection("artistImages").doc(artistId).set({
          imageUrl,
          source: parsed.source || null,
          artistName,
          searchedAt: FieldValue.serverTimestamp(),
        });
      }

      return { imageUrl, cached: false };
    } catch (err) {
      console.error("searchArtistImage error:", err);
      // Don't throw — just return null so the UI can use its fallback
      return { imageUrl: null, cached: false };
    }
  }
);
