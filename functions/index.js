const { onRequest } = require("firebase-functions/v2/https");
const { generateArtistBriefing } = require("./generateBriefing");
const { generateEventBriefing } = require("./generateEventBriefing");
const { generateVenueBriefing } = require("./generateVenueBriefing");
const { searchArtistImage } = require("./searchArtistImage");
const { askStub } = require("./askStub");
exports.generateArtistBriefing = generateArtistBriefing;
exports.generateEventBriefing = generateEventBriefing;
exports.generateVenueBriefing = generateVenueBriefing;
exports.searchArtistImage = searchArtistImage;
exports.askStub = askStub;

/**
 * Proxy for setlist.fm API (CORS-restricted).
 * Firebase Hosting rewrites /api/setlistfm/** → this function.
 */
exports.setlistfmProxy = onRequest(
  { cors: true, region: "us-east1", invoker: "public" },
  async (req, res) => {
    let apiPath = req.path;
    if (apiPath.startsWith("/api/setlistfm")) {
      apiPath = apiPath.replace("/api/setlistfm", "");
    }

    const queryString = new URL(req.url, "http://localhost").search;
    const targetUrl = `https://api.setlist.fm${apiPath}${queryString}`;

    const headers = { Accept: "application/json" };
    if (req.headers["x-api-key"]) {
      headers["x-api-key"] = req.headers["x-api-key"];
    }

    try {
      const response = await fetch(targetUrl, { headers });
      const body = await response.text();
      res.status(response.status).set("Content-Type", "application/json").send(body);
    } catch (err) {
      res.status(502).json({ error: "Proxy failed", message: err.message });
    }
  }
);

/**
 * Proxy for Jambase API (CORS-restricted).
 * Firebase Hosting rewrites /api/jambase/** → this function.
 * Rewrites /api/jambase/... to www.jambase.com/jb-api/v1/...
 */
exports.jambaseProxy = onRequest(
  { cors: true, region: "us-east1", invoker: "public" },
  async (req, res) => {
    let apiPath = req.path;
    if (apiPath.startsWith("/api/jambase")) {
      apiPath = apiPath.replace("/api/jambase", "");
    }

    const queryString = new URL(req.url, "http://localhost").search;
    const targetUrl = `https://www.jambase.com/jb-api/v1${apiPath}${queryString}`;

    try {
      const response = await fetch(targetUrl, {
        headers: { Accept: "application/json" },
      });
      const body = await response.text();
      res.status(response.status).set("Content-Type", "application/json").send(body);
    } catch (err) {
      res.status(502).json({ error: "Proxy failed", message: err.message });
    }
  }
);

/**
 * Proxy for Spotify API (CORS-restricted in some contexts).
 * Firebase Hosting rewrites /api/spotify/** → this function.
 */
exports.spotifyProxy = onRequest(
  { cors: true, region: "us-east1", invoker: "public" },
  async (req, res) => {
    let apiPath = req.path;
    if (apiPath.startsWith("/api/spotify")) {
      apiPath = apiPath.replace("/api/spotify", "");
    }

    const queryString = new URL(req.url, "http://localhost").search;
    const targetUrl = `https://api.spotify.com${apiPath}${queryString}`;

    // Forward auth headers
    const headers = { Accept: "application/json" };
    if (req.headers["authorization"]) {
      headers["Authorization"] = req.headers["authorization"];
    }

    try {
      const response = await fetch(targetUrl, { headers });
      const body = await response.text();
      res.status(response.status).set("Content-Type", "application/json").send(body);
    } catch (err) {
      res.status(502).json({ error: "Proxy failed", message: err.message });
    }
  }
);

/**
 * Proxy for Spotify Auth token exchange (CORS-restricted).
 * Firebase Hosting rewrites /api/spotify-auth/** → this function.
 */
exports.spotifyAuthProxy = onRequest(
  { cors: true, region: "us-east1", invoker: "public" },
  async (req, res) => {
    let apiPath = req.path;
    if (apiPath.startsWith("/api/spotify-auth")) {
      apiPath = apiPath.replace("/api/spotify-auth", "");
    }

    const targetUrl = `https://accounts.spotify.com${apiPath}`;

    // Forward the body and content-type for token exchange
    const headers = {};
    if (req.headers["authorization"]) {
      headers["Authorization"] = req.headers["authorization"];
    }
    if (req.headers["content-type"]) {
      headers["Content-Type"] = req.headers["content-type"];
    }

    try {
      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: req.method !== "GET" ? req.rawBody : undefined,
      });
      const body = await response.text();
      res.status(response.status).set("Content-Type", "application/json").send(body);
    } catch (err) {
      res.status(502).json({ error: "Proxy failed", message: err.message });
    }
  }
);
