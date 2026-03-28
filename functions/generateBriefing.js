const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Initialize Firebase Admin (safe to call multiple times)
if (getApps().length === 0) {
  initializeApp();
}

const perplexityKey = defineSecret("PERPLEXITY_API_KEY");

const SYSTEM_PROMPT = `You are a music journalist writing concise briefings for concert-goers.
Given information about an artist, produce a JSON object (no markdown, no code fences) with these fields:
- summary: 2-3 sentence overview of who they are and what makes them compelling live
- soundDescription: 1-2 sentences describing their sonic palette and genre influences
- liveReputation: 1-2 sentences about their reputation as a live act
- forFansOf: array of 3-5 similar artist names (strings only)

Respond with raw JSON only. No explanation, no markdown fences.`;

function buildUserPrompt(params) {
  const {
    name,
    genres = [],
    tags = [],
    spotifyPopularity,
    lastfmBio,
    topTrackNames = [],
    listenerCount,
  } = params;

  const lines = [`Artist: ${name}`];

  if (genres.length > 0) lines.push(`Genres: ${genres.join(", ")}`);
  if (tags.length > 0) lines.push(`Tags: ${tags.join(", ")}`);
  if (spotifyPopularity != null) lines.push(`Spotify popularity score: ${spotifyPopularity}/100`);
  if (listenerCount != null) lines.push(`Last.fm monthly listeners: ${listenerCount.toLocaleString()}`);
  if (topTrackNames.length > 0) lines.push(`Top tracks: ${topTrackNames.slice(0, 5).join(", ")}`);
  if (lastfmBio) lines.push(`Bio excerpt: ${lastfmBio.slice(0, 500)}`);

  lines.push("\nWrite a concert-goer briefing as described in the system prompt.");

  return lines.join("\n");
}

exports.generateArtistBriefing = onCall(
  {
    region: "us-east1",
    secrets: [perplexityKey],
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    const { artistId, name, ...params } = request.data ?? {};

    // Validate required fields
    if (!artistId || typeof artistId !== "string") {
      throw new HttpsError("invalid-argument", "artistId is required");
    }
    if (!name || typeof name !== "string") {
      throw new HttpsError("invalid-argument", "name is required");
    }

    const db = getFirestore();
    const docRef = db.collection("briefings").doc(artistId);

    // Check for a cached briefing (< 30 days old)
    const snapshot = await docRef.get();
    if (snapshot.exists) {
      const data = snapshot.data();

      if (data.generating) {
        const lockAge = Date.now() - (data.generatingAt?.toMillis() ?? 0);
        if (lockAge < 5 * 60 * 1000) {
          // Lock is fresh — another invocation is generating
          return { status: "generating" };
        }
        // Stale lock — fall through and regenerate
      } else if (data.briefing && data.generatedAt) {
        const ageMs = Date.now() - data.generatedAt.toMillis();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        if (ageMs < thirtyDaysMs) {
          return { briefing: data.briefing, cached: true };
        }
      }
    }

    // Set generating lock
    await docRef.set(
      { generating: true, generatingAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    try {
      const apiKey = perplexityKey.value();
      if (!apiKey) {
        throw new HttpsError("failed-precondition", "PERPLEXITY_API_KEY secret not configured");
      }

      const userPrompt = buildUserPrompt({ name, ...params });

      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "sonar-pro",
          max_tokens: 512,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error ${response.status}: ${errorText}`);
      }

      const aiData = await response.json();
      let jsonStr = aiData.choices?.[0]?.message?.content ?? "";

      // Strip markdown code fences if present
      if (jsonStr.includes("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      jsonStr = jsonStr.trim();

      const parsed = JSON.parse(jsonStr);
      const briefing = {
        summary: parsed.summary ?? "",
        soundDescription: parsed.soundDescription ?? "",
        liveReputation: parsed.liveReputation ?? "",
        forFansOf: Array.isArray(parsed.forFansOf) ? parsed.forFansOf : [],
      };

      // Persist to Firestore and clear lock
      await docRef.set({
        briefing,
        generatedAt: FieldValue.serverTimestamp(),
        generating: false,
        generatingAt: null,
        artistId,
        artistName: name,
      });

      return { briefing, cached: false };
    } catch (err) {
      // Clear lock on failure
      await docRef.set(
        { generating: false, generatingAt: null },
        { merge: true }
      ).catch(() => {});

      console.error("generateArtistBriefing error:", err);
      throw new HttpsError("internal", err.message ?? "Briefing generation failed");
    }
  }
);
