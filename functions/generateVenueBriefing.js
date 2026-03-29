const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Initialize Firebase Admin (safe to call multiple times)
if (getApps().length === 0) {
  initializeApp();
}

const perplexityKey = defineSecret("PERPLEXITY_API_KEY");

const SYSTEM_PROMPT = `You are a knowledgeable live music venue guide. Given information about a music venue, produce a JSON object (no markdown, no code fences) with these fields:
- overview: A 2-3 sentence overview of the venue, its history, and what makes it special for live music. Be specific and informative.
- atmosphere: A 1-2 sentence description of the vibe and atmosphere concert-goers can expect.
- tips: An array of 2-3 short practical tips for attending shows at this venue (parking, best spots, food/drink, etc.)

Respond with raw JSON only. No explanation, no markdown fences.`;

function buildUserPrompt(params) {
  const { venueName, venueCity, venueState, venueType, editorialSummary } = params;

  const lines = [`Venue: ${venueName}`];
  if (venueCity) lines.push(`City: ${venueCity}${venueState ? `, ${venueState}` : ""}`);
  if (venueType) lines.push(`Type: ${venueType}`);
  if (editorialSummary) lines.push(`Additional context: ${editorialSummary.slice(0, 300)}`);
  lines.push("\nWrite a venue briefing as described in the system prompt.");

  return lines.join("\n");
}

/** Strip footnote references like [1], [2][3] from AI text */
function stripFootnotes(text) {
  return text.replace(/\[\d+\]/g, "").replace(/\s{2,}/g, " ").trim();
}

/** Build a stable cache key from venue name + city */
function buildCacheKey(venueName, venueCity) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${normalize(venueName)}_${normalize(venueCity)}`;
}

exports.generateVenueBriefing = onCall(
  {
    region: "us-east1",
    secrets: [perplexityKey],
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    const { venueName, venueCity, venueState, venueType, editorialSummary } = request.data ?? {};

    if (!venueName || typeof venueName !== "string") {
      throw new HttpsError("invalid-argument", "venueName is required");
    }
    if (!venueCity || typeof venueCity !== "string") {
      throw new HttpsError("invalid-argument", "venueCity is required");
    }

    const db = getFirestore();
    const cacheKey = buildCacheKey(venueName, venueCity);
    const docRef = db.collection("venueBriefings").doc(cacheKey);

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

      const userPrompt = buildUserPrompt({ venueName, venueCity, venueState, venueType, editorialSummary });

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
        overview: stripFootnotes(parsed.overview ?? ""),
        atmosphere: stripFootnotes(parsed.atmosphere ?? ""),
        tips: Array.isArray(parsed.tips) ? parsed.tips.map(stripFootnotes) : [],
      };

      // Persist to Firestore and clear lock
      await docRef.set({
        briefing,
        generatedAt: FieldValue.serverTimestamp(),
        generating: false,
        generatingAt: null,
        venueName,
        venueCity,
        venueState,
      });

      return { briefing, cached: false };
    } catch (err) {
      // Clear lock on failure
      await docRef.set(
        { generating: false, generatingAt: null },
        { merge: true }
      ).catch(() => {});

      console.error("generateVenueBriefing error:", err);
      throw new HttpsError("internal", err.message ?? "Venue briefing generation failed");
    }
  }
);
