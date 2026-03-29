const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

if (getApps().length === 0) {
  initializeApp();
}

const perplexityKey = defineSecret("PERPLEXITY_API_KEY");

/**
 * Pick the best image from Perplexity's images array.
 * Prefers larger images and known reliable CDNs.
 */
function pickBestImage(images) {
  if (!Array.isArray(images) || images.length === 0) return null;

  // Score each image
  const scored = images.map((img) => {
    let score = 0;
    const url = (img.image_url || "").toLowerCase();
    const w = img.width || 0;
    const h = img.height || 0;

    // Prefer larger images
    score += Math.min(w * h, 2000000) / 10000; // cap at ~2MP

    // Prefer known reliable CDNs
    if (url.includes("upload.wikimedia.org")) score += 50;
    if (url.includes("lastfm")) score += 40;
    if (url.includes("bcbits.com")) score += 30; // Bandcamp
    if (url.includes("discogs")) score += 30;

    // Penalize tiny images (icons, thumbnails)
    if (w > 0 && w < 150) score -= 50;
    if (h > 0 && h < 150) score -= 50;

    // Penalize social media CDNs (often restricted/ephemeral)
    if (url.includes("instagram") || url.includes("fbcdn")) score -= 30;

    return { ...img, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

/**
 * Dedicated artist image search via Perplexity's return_images feature.
 * Uses the API's built-in image search instead of asking the model to guess URLs.
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

    // Check cache first
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

      // Use return_images: true to get structured image results from Perplexity
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "sonar-pro",
          max_tokens: 128,
          temperature: 0.1,
          return_images: true,
          messages: [
            {
              role: "system",
              content: "You are a music image researcher. Find photos of the requested music artist.",
            },
            {
              role: "user",
              content: `${artistName} artist images press photos band photo`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error ${response.status}: ${errorText}`);
      }

      const aiData = await response.json();

      // Extract images from the structured images array
      const images = aiData.images || [];
      console.log(`searchArtistImage [${artistName}]: got ${images.length} images from Perplexity`);

      const best = pickBestImage(images);
      const imageUrl = best ? best.image_url : null;
      const source = best ? (best.origin_url || "Perplexity") : null;

      if (imageUrl) {
        console.log(`searchArtistImage [${artistName}]: selected ${imageUrl.substring(0, 150)} (${best.width}x${best.height})`);
      } else {
        console.log(`searchArtistImage [${artistName}]: no suitable images found`);
      }

      // Cache the result
      if (artistId) {
        await db.collection("artistImages").doc(artistId).set({
          imageUrl,
          source,
          artistName,
          searchedAt: FieldValue.serverTimestamp(),
        });
      }

      return { imageUrl, cached: false };
    } catch (err) {
      console.error("searchArtistImage error:", err);
      return { imageUrl: null, cached: false };
    }
  }
);
