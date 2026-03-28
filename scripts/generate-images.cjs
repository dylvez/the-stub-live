const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('Set GEMINI_API_KEY env var before running.'); process.exit(1); }
const MODEL = 'gemini-2.5-flash-image';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const ASSETS_DIR = path.join(__dirname, '..', 'public', 'images');

if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

const PALETTE = 'Use colors: amber #E8A838, rose-pink #FF4F6D, violet #7B68EE, cyan #4FC4FF, deep navy #0A0A12, dark purple #161324. ';
const STYLE = 'Flat illustrated style, clean vector shapes, minimal detail, bold geometric forms. Dark background #0A0A12. No text, no words, no letters. ';

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
  { filename: 'genre-hiphop.png', prompt: STYLE + 'A flat stylized microphone icon on dark background #0A0A12. Rose-pink #FF4F6D color. Simple bold design. 128x128.' },
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
