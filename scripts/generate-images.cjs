const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('Set GEMINI_API_KEY env var before running.'); process.exit(1); }
const MODEL = 'gemini-2.5-flash-image';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const ASSETS_DIR = path.join(__dirname, '..', 'public', 'images');

if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

const PALETTE = 'Use colors: amber #E8A838, coral #FF4F4F, violet #7B68EE, cyan #4FC4FF, deep navy #0A0A12, dark purple #161324, muted gray #8A8580. ';
const STYLE = 'Flat illustrated style, clean vector shapes, minimal detail, bold geometric forms. Dark background #0A0A12. No text, no words, no letters. ';
const ICON_STYLE = 'Flat illustrated style, bold simple silhouette, minimal detail, single geometric shape centered on a solid dark background with exact hex color #0D0D0D. No text, no words, no letters. ';

const IMAGES = [
  { filename: 'logo-stub.png', prompt: STYLE + PALETTE + 'A stylized concert ticket stub icon. The stub has a torn/perforated right edge. Use amber #E8A838 as the primary color with violet #7B68EE accents. Modern app icon — simple, bold, recognizable. Dark navy background #0A0A12.' },
  { filename: 'empty-no-stubs.png', prompt: STYLE + PALETTE + 'An illustration of an empty concert venue stage with spotlights on but no performer. Moody dark purple atmosphere with amber stage lights casting warm glow. Minimalist, atmospheric.' },
  { filename: 'empty-no-results.png', prompt: STYLE + PALETTE + 'A dimmed spotlight on an empty stage with scattered musical notes fading away. Dark navy background. Spotlight beam in amber/gold. Conveys nothing found.' },
  { filename: 'empty-no-shows.png', prompt: STYLE + PALETTE + 'An empty concert calendar with a small guitar leaning against it. Dark background with subtle violet and amber accents. Conveys no upcoming shows.' },
  { filename: 'reaction-fire.png', prompt: STYLE + 'A single stylized flame icon on dark background #0A0A12. Bold amber #E8A838 and orange-red gradient. Simple flat design. 256x256 icon.' },
  { filename: 'reaction-music.png', prompt: STYLE + 'A single pair of musical notes (eighth notes) icon on dark background #0A0A12. Violet #7B68EE color. Simple flat design. 256x256 icon.' },
  { filename: 'reaction-skull.png', prompt: STYLE + 'A single stylized skull icon on dark background #0A0A12. White/light gray with subtle violet tint. Simple flat rock aesthetic. 256x256 icon.' },
  { filename: 'reaction-rock.png', prompt: STYLE + 'A single rock hand gesture (devil horns) icon on dark background #0A0A12. Rose-pink #FF4F6D color. Simple flat design. 256x256 icon.' },
  { filename: 'reaction-heart.png', prompt: STYLE + 'A single heart icon on dark background #0A0A12. Rose-pink #FF4F6D with subtle glow. Simple flat design. 256x256 icon.' },
  { filename: 'reaction-crying.png', prompt: STYLE + 'A single teardrop icon on dark background #0A0A12. Cyan #4FC4FF color. Simple flat emotional design. 256x256 icon.' },
  { filename: 'login-hero.png', prompt: STYLE + PALETTE + 'A wide concert crowd silhouette seen from behind, arms raised, facing a bright stage with colorful lights. Stage lights in amber #E8A838 and violet #7B68EE beams cutting through dark atmosphere. Crowd is simple dark silhouettes. Atmospheric and exciting.' },
  { filename: 'genre-rock.png', prompt: STYLE + 'A flat stylized electric guitar icon on dark background #0A0A12. Amber #E8A838 color. Simple bold design. 128x128.' },
  { filename: 'genre-jazz.png', prompt: STYLE + 'A flat stylized saxophone icon on dark background #0A0A12. Violet #7B68EE color. Simple bold design. 128x128.' },
  { filename: 'genre-punk.png', prompt: STYLE + 'A flat stylized lightning bolt icon on dark background #0A0A12. Rose-pink #FF4F6D color. Simple bold design. 128x128.' },
  { filename: 'genre-electronic.png', prompt: STYLE + 'A flat stylized synthesizer waveform icon on dark background #0A0A12. Cyan #4FC4FF color. Simple bold design. 128x128.' },
  { filename: 'genre-folk.png', prompt: STYLE + 'A flat stylized acoustic guitar icon on dark background #0A0A12. Amber #E8A838 warm tones. Simple bold design. 128x128.' },
  { filename: 'genre-hiphop.png', prompt: STYLE + 'A flat stylized microphone icon on dark background #0A0A12. Coral #FF4F4F color. Simple bold design. 128x128.' },

  // --- Bottom Nav: Heavily Themed ---
  { filename: 'nav-home-heavy.png', prompt: ICON_STYLE + PALETTE + 'A venue marquee arch with small round lights along the arch edge. Amber #E8A838 color. 128x128 icon.' },
  { filename: 'nav-search-heavy.png', prompt: ICON_STYLE + PALETTE + 'A dramatic spotlight beam sweeping down from above onto a small stage area. Cyan #4FC4FF color. 128x128 icon.' },
  { filename: 'nav-create-heavy.png', prompt: ICON_STYLE + PALETTE + 'A torn concert ticket stub with a bold plus sign in the center. Torn perforated edge on right side. Amber #E8A838 color. 128x128 icon.' },
  { filename: 'nav-stubs-heavy.png', prompt: ICON_STYLE + PALETTE + 'A stack of three overlapping concert ticket stubs fanned out. Violet #7B68EE color. 128x128 icon.' },
  { filename: 'nav-askstub-heavy.png', prompt: ICON_STYLE + PALETTE + 'A starburst sparkle with radiating light rays, like a stage pyro effect. Cyan #4FC4FF color. 128x128 icon.' },

  // --- Bottom Nav: Subtly Themed ---
  { filename: 'nav-home-subtle.png', prompt: ICON_STYLE + PALETTE + 'A clean simple house icon shape with a subtle arched top like a theater marquee. Amber #E8A838 color. 128x128 icon.' },
  { filename: 'nav-search-subtle.png', prompt: ICON_STYLE + PALETTE + 'A magnifying glass icon with a subtle spotlight glow emanating from the lens. Cyan #4FC4FF color. 128x128 icon.' },
  { filename: 'nav-create-subtle.png', prompt: ICON_STYLE + PALETTE + 'A simple ticket stub outline shape with a small plus sign. Clean geometric. Amber #E8A838 color. 128x128 icon.' },
  { filename: 'nav-stubs-subtle.png', prompt: ICON_STYLE + PALETTE + 'A single clean concert ticket stub icon, simple rectangular shape with one torn edge. Violet #7B68EE color. 128x128 icon.' },
  { filename: 'nav-askstub-subtle.png', prompt: ICON_STYLE + PALETTE + 'A clean four-pointed sparkle star shape, simple and geometric. Cyan #4FC4FF color. 128x128 icon.' },

  // --- Discovery Section Headers ---
  { filename: 'section-trending.png', prompt: ICON_STYLE + PALETTE + 'Rising heat lines or flame chart, three wavy vertical lines ascending with warmth. Coral #FF4F4F color. 128x128 icon.' },
  { filename: 'section-radar.png', prompt: ICON_STYLE + PALETTE + 'Concentric radar pulse rings radiating outward from a center point. Cyan #4FC4FF color. 128x128 icon.' },
  { filename: 'section-new-to-town.png', prompt: ICON_STYLE + PALETTE + 'A small suitcase with a guitar neck poking out the top. Amber #E8A838 color. 128x128 icon.' },
  { filename: 'section-discover.png', prompt: ICON_STYLE + PALETTE + 'A pair of binoculars with small stage light reflections in the lenses. Cyan #4FC4FF color. 128x128 icon.' },

  // --- Empty State Illustrations ---
  { filename: 'empty-no-feed.png', prompt: STYLE + PALETTE + 'An empty dark concert hall viewed from the back, rows of empty seats, a dim stage in the distance with a single faint amber spotlight. Moody and atmospheric. No people.' },
  { filename: 'empty-artist-notfound.png', prompt: STYLE + PALETTE + 'A single broken guitar pick cracked in half on a dark surface. Coral #FF4F4F color tones. Dramatic spotlight on the broken pick. Moody and minimal.' },
  { filename: 'empty-venue-notfound.png', prompt: STYLE + PALETTE + 'A closed venue door with a dim marquee above it, lights turned off. Dark tonight feeling. Violet #7B68EE tones. Atmospheric and moody.' },
  { filename: 'empty-user-notfound.png', prompt: STYLE + PALETTE + 'An empty concert venue seat in a spotlight beam. The seat is empty, spotlight illuminating dust particles. Cyan #4FC4FF spotlight color. Lonely atmospheric feel.' },
  { filename: 'empty-no-setlists.png', prompt: STYLE + PALETTE + 'A blank piece of setlist paper lying on a dark stage floor next to a microphone stand base. Amber #E8A838 warm tones. Atmospheric concert stage lighting.' },

  // --- Action Icons ---
  { filename: 'action-stub-it.png', prompt: ICON_STYLE + PALETTE + 'A pen or pencil writing on a small ticket stub shape. Amber #E8A838 color. Bold simple design. 128x128 icon.' },
  { filename: 'action-share.png', prompt: ICON_STYLE + PALETTE + 'A concert ticket being handed forward, shown from the side as if passing it to someone. Cyan #4FC4FF color. 128x128 icon.' },
  { filename: 'action-save.png', prompt: ICON_STYLE + PALETTE + 'A ticket stub being slipped into a pocket or collection slot. Violet #7B68EE color. 128x128 icon.' },

  // --- Loading Spinner ---
  { filename: 'loading-spinner.png', prompt: ICON_STYLE + PALETTE + 'A vinyl record viewed from directly above, perfectly centered. Concentric groove circles. Small center hole. Amber #E8A838 highlight on grooves. Must be perfectly center-symmetric for rotation animation. 128x128 icon.' },

  // --- Star Rating: Guitar Pick Style ---
  { filename: 'star-filled.png', prompt: ICON_STYLE + 'A guitar pick shape (rounded triangle pointing down), completely filled solid. Amber #E8A838 color on black background #0A0A12. 64x64 icon.' },
  { filename: 'star-half.png', prompt: ICON_STYLE + 'A guitar pick shape (rounded triangle pointing down). Left half filled solid amber #E8A838, right half is just a thin outline in muted gray #8A8580. Black background #0A0A12. 64x64 icon.' },
  { filename: 'star-empty.png', prompt: ICON_STYLE + 'A guitar pick shape (rounded triangle pointing down), outline only with thin stroke. Muted gray #8A8580 color on black background #0A0A12. 64x64 icon.' },
  { filename: 'star-filled-small.png', prompt: ICON_STYLE + 'A guitar pick shape (rounded triangle pointing down), completely filled solid. Amber #E8A838 color on black background #0A0A12. Very simple bold shape. 32x32 icon.' },
  { filename: 'star-empty-small.png', prompt: ICON_STYLE + 'A guitar pick shape (rounded triangle pointing down), outline only. Muted gray #8A8580 color on black background #0A0A12. Very simple. 32x32 icon.' },
];

function makeRequest(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    });
    const url = new URL(`${ENDPOINT}?key=${API_KEY}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

function extractImageData(response) {
  if (response.error) throw new Error(`API error: ${response.error.message}`);
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error('No parts in response');
  for (const part of parts) {
    if (part.inlineData) return Buffer.from(part.inlineData.data, 'base64');
  }
  throw new Error('No image data in response');
}

async function main() {
  const only = process.argv.find(a => a.startsWith('--only='))?.slice(7);
  for (const img of IMAGES) {
    if (only && img.filename !== only) continue;
    const outPath = path.join(ASSETS_DIR, img.filename);
    if (!only && fs.existsSync(outPath)) {
      console.log(`skip ${img.filename} (exists)`);
      continue;
    }
    console.log(`generating ${img.filename}...`);
    try {
      const response = await makeRequest(img.prompt);
      const imageBuffer = extractImageData(response);
      fs.writeFileSync(outPath, imageBuffer);
      console.log(`done ${img.filename} (${(imageBuffer.length / 1024).toFixed(0)} KB)`);
    } catch (err) {
      console.error(`FAIL ${img.filename}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 2500));
  }
  console.log('\nAll done!');
}

main().catch(console.error);
