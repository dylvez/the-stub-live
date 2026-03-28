const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Initialize Firebase Admin (safe to call multiple times)
if (getApps().length === 0) {
  initializeApp();
}

const perplexityKey = defineSecret("PERPLEXITY_API_KEY");

const SYSTEM_PROMPT = `You are a music journalist writing a concise pre-show briefing for concert-goers.
Given information about an upcoming concert (artist, venue, date), produce a JSON object (no markdown, no code fences) with these fields:
- showPreview: 2-3 sentences about what to expect at this specific show — the artist's current tour energy, what kind of set they typically play, and why this particular show is worth attending
- venueInsight: 1-2 sentences about the venue's vibe, reputation, and what makes it a good (or interesting) place to see this type of show
- proTips: array of 2-3 short practical tips for attending (e.g. parking, best spot to stand, nearby food, what time to arrive)
- listeningGuide: array of 3-5 song titles that are essential pre-show listening — focus on songs they're likely to play live or that define their sound

Respond with raw JSON only. No explanation, no markdown fences.`;

function buildUserPrompt(params) {
  const {
    artistName,
    artistGenres = [],
    venueName,
    venueCity,
    venueState,
    venueType,
    eventDate,
    artistBriefingSummary,
    artistLiveReputation,
  } = params;

  const lines = [`Artist: ${artistName}`];

  if (artistGenres.length > 0) lines.push(`Genres: ${artistGenres.join(", ")}`);
  lines.push(`Venue: ${venueName}`);
  if (venueCity) lines.push(`Location: ${venueCity}${venueState ? `, ${venueState}` : ""}`);
  if (venueType) lines.push(`Venue type: ${venueType}`);
  if (eventDate) lines.push(`Date: ${eventDate}`);
  if (artistBriefingSummary) lines.push(`Artist background: ${artistBriefingSummary.slice(0, 300)}`);
  if (artistLiveReputation) lines.push(`Live reputation: ${artistLiveReputation.slice(0, 200)}`);

  lines.push("\nWrite a pre-show briefing as described in the system prompt.");

  return lines.join("\n");
}

/** Build a stable cache key from artist + venue + date */
function buildCacheKey(artistName, venueName, eventDate) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${normalize(artistName)}_${normalize(venueName)}_${eventDate}`;
}

exports.generateEventBriefing = onCall(
  {
    region: "us-east1",
    secrets: [perplexityKey],
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    const { artistName, venueName, eventDate, ...params } = request.data ?? {};

    // Validate required fields
    if (!artistName || typeof artistName !== "string") {
      throw new HttpsError("invalid-argument", "artistName is required");
    }
    if (!venueName || typeof venueName !== "string") {
      throw new HttpsError("invalid-argument", "venueName is required");
    }
    if (!eventDate || typeof eventDate !== "string") {
      throw new HttpsError("invalid-argument", "eventDate is required (YYYY-MM-DD)");
    }

    const db = getFirestore();
    const cacheKey = buildCacheKey(artistName, venueName, eventDate);
    const docRef = db.collection("eventBriefings").doc(cacheKey);

    // Check for a cached briefing (< 30 days old)
    const snapshot = await docRef.get();
    if (snapshot.exists) {
      const data = snapshot.data();

      if (data.generating) {
        const lockAge = Date.now() - (data.generatingAt?.toMillis() ?? 0);
        if (lockAge < 5 * 60 * 1000) {
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

      const userPrompt = buildUserPrompt({ artistName, venueName, eventDate, ...params });

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
        showPreview: parsed.showPreview ?? "",
        venueInsight: parsed.venueInsight ?? "",
        proTips: Array.isArray(parsed.proTips) ? parsed.proTips : [],
        listeningGuide: Array.isArray(parsed.listeningGuide) ? parsed.listeningGuide : [],
      };

      // Persist to Firestore and clear lock
      await docRef.set({
        briefing,
        generatedAt: FieldValue.serverTimestamp(),
        generating: false,
        generatingAt: null,
        artistName,
        venueName,
        eventDate,
      });

      return { briefing, cached: false };
    } catch (err) {
      // Clear lock on failure
      await docRef.set(
        { generating: false, generatingAt: null },
        { merge: true }
      ).catch(() => {});

      console.error("generateEventBriefing error:", err);
      throw new HttpsError("internal", err.message ?? "Event briefing generation failed");
    }
  }
);
