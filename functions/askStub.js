const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const perplexityApiKey = defineSecret("PERPLEXITY_API_KEY");

const TM_API_KEY = "KtwO1AgR5iBSxQdZs1lII0MVBlv7kmUA";
const JB_API_KEY = "3c577d7a-9471-42b3-82e4-92b7af426d63";

/**
 * Fetch events from Ticketmaster with optional keyword search
 */
async function fetchTicketmasterEvents(lat, lng, radius = 50, keyword = "") {
  const now = new Date();
  const endDate = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000); // 120 days
  const startDateTime = now.toISOString().replace(/\.\d+Z$/, "Z");
  const endDateTime = endDate.toISOString().replace(/\.\d+Z$/, "Z");

  const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
  url.searchParams.set("apikey", TM_API_KEY);
  url.searchParams.set("latlong", `${lat},${lng}`);
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("unit", "miles");
  url.searchParams.set("startDateTime", startDateTime);
  url.searchParams.set("endDateTime", endDateTime);
  url.searchParams.set("classificationName", "music");
  url.searchParams.set("size", "50");
  url.searchParams.set("sort", "date,asc");
  if (keyword) url.searchParams.set("keyword", keyword);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    const events = data?._embedded?.events ?? [];
    return events.map((e) => {
      const artist = e._embedded?.attractions?.[0]?.name ?? e.name;
      const venue = e._embedded?.venues?.[0]?.name ?? "TBA";
      const city = e._embedded?.venues?.[0]?.city?.name ?? "";
      const date = e.dates?.start?.localDate ?? "";
      const time = e.dates?.start?.localTime ?? "";
      const genres = (e.classifications ?? [])
        .map((c) => c.genre?.name)
        .filter((g) => g && g !== "Undefined");
      const priceMin = e.priceRanges?.[0]?.min;
      const priceMax = e.priceRanges?.[0]?.max;
      const ticketUrl = e.url;
      return { artist, venue, city, date, time, genres, priceMin, priceMax, ticketUrl, source: "ticketmaster" };
    });
  } catch (err) {
    console.error("TM fetch failed:", err.message);
    return [];
  }
}

/**
 * Fetch events from Jambase with optional artist name search
 */
async function fetchJambaseEvents(lat, lng, radius = 50, artistName = "") {
  const now = new Date();
  const endDate = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
  const dateFrom = now.toISOString().split("T")[0];
  const dateTo = endDate.toISOString().split("T")[0];

  const url = new URL("https://www.jambase.com/jb-api/v1/events");
  url.searchParams.set("apikey", JB_API_KEY);
  url.searchParams.set("geoLatitude", String(lat));
  url.searchParams.set("geoLongitude", String(lng));
  url.searchParams.set("geoRadiusAmount", String(radius));
  url.searchParams.set("geoRadiusUnits", "mi");
  url.searchParams.set("perPage", "50");
  url.searchParams.set("eventType", "concert");
  url.searchParams.set("eventDateFrom", dateFrom);
  url.searchParams.set("eventDateTo", dateTo);
  if (artistName) url.searchParams.set("artistName", artistName);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    const events = data?.events ?? [];
    return events.map((e) => {
      const performers = (e.performer ?? []).map((p) => p.name);
      const artist = performers[0] ?? e.name ?? "Unknown";
      const venue = e.location?.name ?? "TBA";
      const city = e.location?.address?.addressLocality ?? "";
      const date = (e.startDate ?? "").split("T")[0];
      const time = (e.startDate ?? "").includes("T")
        ? e.startDate.split("T")[1]?.slice(0, 5) ?? ""
        : "";
      const ticketUrl = e.offers?.[0]?.url;
      return { artist, venue, city, date, time, genres: [], priceMin: undefined, priceMax: undefined, ticketUrl, source: "jambase" };
    });
  } catch (err) {
    console.error("JB fetch failed:", err.message);
    return [];
  }
}

/**
 * Deduplicate events across sources by artist+date
 */
function dedupeEvents(events) {
  const seen = new Map();
  for (const e of events) {
    const key = `${e.artist.toLowerCase()}|${e.date}`;
    if (!seen.has(key)) {
      seen.set(key, e);
    } else {
      const existing = seen.get(key);
      if (!existing.ticketUrl && e.ticketUrl) existing.ticketUrl = e.ticketUrl;
      if (existing.genres.length === 0 && e.genres.length > 0) existing.genres = e.genres;
      if (!existing.priceMin && e.priceMin) {
        existing.priceMin = e.priceMin;
        existing.priceMax = e.priceMax;
      }
    }
  }
  return Array.from(seen.values());
}

/**
 * Format events into a concise text block for Claude's context
 */
function formatEventsForPrompt(events, label) {
  if (events.length === 0) return `${label}: No events found.`;
  const lines = events.map((e) => {
    const parts = [e.date, e.artist, `@ ${e.venue}`];
    if (e.city) parts.push(e.city);
    if (e.genres.length > 0) parts.push(`[${e.genres.join(", ")}]`);
    if (e.priceMin) {
      parts.push(e.priceMax && e.priceMax !== e.priceMin
        ? `$${e.priceMin}-$${e.priceMax}`
        : `$${e.priceMin}`);
    }
    return parts.join(" | ");
  });
  return `${label} (${events.length} results):\n${lines.join("\n")}`;
}

/**
 * Extract likely search keywords from the user's latest message.
 * Simple heuristic: strip common question words, keep the rest.
 */
function extractKeywords(message) {
  const stopWords = new Set([
    "when", "where", "are", "is", "the", "a", "an", "in", "at", "to", "for",
    "of", "and", "or", "my", "me", "i", "do", "does", "did", "will", "can",
    "could", "should", "would", "what", "which", "who", "how", "any", "some",
    "there", "here", "this", "that", "it", "its", "be", "been", "being",
    "have", "has", "had", "was", "were", "am", "not", "no", "but", "if",
    "with", "from", "by", "on", "about", "into", "up", "out", "so", "just",
    "than", "then", "too", "very", "also", "now", "next", "near", "nearby",
    "around", "show", "shows", "concert", "concerts", "playing", "play",
    "performing", "perform", "performance", "gig", "gigs", "event", "events",
    "tonight", "today", "tomorrow", "week", "month", "year", "live",
    "see", "watch", "go", "going", "want", "like", "love", "recommend",
    "recommendation", "suggest", "suggestion", "tell", "know", "find",
    "looking", "look", "check", "get", "got", "come", "coming",
  ]);

  const words = message.toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));

  return words.join(" ").trim();
}

const SYSTEM_PROMPT = `You are Stub, a friendly and knowledgeable concert discovery assistant for The Stub Live app. You help users find live music shows to attend.

Your personality:
- Enthusiastic about live music but not over-the-top
- Opinionated — you have taste and aren't afraid to recommend
- Concise — keep responses to 2-3 short paragraphs max
- You speak like a knowledgeable friend, not a search engine

When recommending shows:
- ALWAYS reference the actual upcoming events data provided below — these are REAL shows with confirmed dates and venues
- Focus on what makes the artist's LIVE show special
- Mention the date and venue name so the user can find the show
- If you have TARGETED SEARCH RESULTS, prioritize those — they match what the user asked about
- If you have NEARBY UPCOMING EVENTS, use those for broader recommendations
- If asked about an artist with no results, say you don't see them on the current schedule

LINKING: You can link to pages within The Stub Live app using markdown links. Use these URL patterns:
- Search for an artist: [Artist Name](/search?q=Artist+Name)
- Search for a venue: [Venue Name](/search?q=Venue+Name)
When mentioning an artist or venue, make the FIRST mention a link. Don't over-link — one link per artist/venue is enough.

You're chatting with a user in {city}, {state}.

{events}`;

exports.askStub = onCall(
  {
    region: "us-east1",
    secrets: [perplexityApiKey],
    timeoutSeconds: 90,
    memory: "256MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in to use Ask Stub.");
    }

    const { messages, location } = request.data;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError("invalid-argument", "Messages array is required.");
    }

    const city = location?.city ?? "your area";
    const state = location?.state ?? "";
    const lat = location?.lat ?? 37.5407;
    const lng = location?.lng ?? -77.436;

    // Extract keywords from the user's latest message, stripping location words
    const latestMessage = messages[messages.length - 1]?.content ?? "";
    // Remove city/state from the keywords so they don't pollute the artist search
    const locationWords = [city.toLowerCase(), state.toLowerCase()]
      .flatMap((w) => w.split(/\s+/))
      .filter((w) => w.length > 1);
    let keywords = extractKeywords(latestMessage);
    // Strip location words from keywords
    for (const lw of locationWords) {
      keywords = keywords.replace(new RegExp(`\\b${lw}\\b`, "gi"), "").trim();
    }
    keywords = keywords.replace(/\s+/g, " ").trim();

    console.log(`askStub: user="${latestMessage}", keywords="${keywords}", location=${city},${state}`);

    // Run three searches in parallel:
    // 1. Keyword search on TM (if keywords exist)
    // 2. Keyword search on JB (if keywords exist)
    // 3. General nearby events (always — for broader context)
    const promises = [
      fetchTicketmasterEvents(lat, lng, 100, ""), // broad nearby
    ];

    if (keywords) {
      promises.push(
        fetchTicketmasterEvents(lat, lng, 200, keywords), // targeted TM search (wider radius)
        fetchJambaseEvents(lat, lng, 200, keywords),       // targeted JB search (wider radius)
      );
    }

    const results = await Promise.all(promises);
    const nearbyEvents = results[0];
    const targetedTmEvents = results[1] ?? [];
    const targetedJbEvents = results[2] ?? [];

    // Combine targeted results
    const targetedEvents = dedupeEvents([...targetedTmEvents, ...targetedJbEvents]);
    targetedEvents.sort((a, b) => a.date.localeCompare(b.date));

    // Dedupe and sort nearby
    const nearbyDeduped = dedupeEvents(nearbyEvents);
    nearbyDeduped.sort((a, b) => a.date.localeCompare(b.date));

    console.log(`askStub: targeted=${targetedEvents.length}, nearby=${nearbyDeduped.length}`);

    // Build events context
    const eventSections = [];
    if (targetedEvents.length > 0) {
      eventSections.push(formatEventsForPrompt(targetedEvents, "TARGETED SEARCH RESULTS"));
    }
    // Include first 50 nearby for broader context/recs
    eventSections.push(formatEventsForPrompt(nearbyDeduped.slice(0, 50), "NEARBY UPCOMING EVENTS"));

    const eventsText = eventSections.join("\n\n");

    const systemPrompt = SYSTEM_PROMPT
      .replace("{city}", city)
      .replace("{state}", state)
      .replace("{events}", eventsText);

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${perplexityApiKey.value()}`,
        },
        body: JSON.stringify({
          model: "sonar-pro",
          max_tokens: 1024,
          messages: chatMessages,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error("Perplexity API error:", response.status, errBody);
        throw new HttpsError("internal", "AI service error.");
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? "I'm not sure how to answer that. Try asking about upcoming shows!";

      return { response: text };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      console.error("askStub error:", err);
      throw new HttpsError("internal", "Failed to generate response.");
    }
  }
);
