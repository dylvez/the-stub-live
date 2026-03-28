const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'REDACTED_KEY';
const MODEL = 'gemini-2.5-flash-image';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const ASSETS_DIR = path.join(__dirname, '..', 'public', 'images');

// Style template matching existing genre images
const STYLE = `Dark moody concert photography style, dramatic stage lighting, deep shadows,
warm amber and cool blue tones, cinematic feel, NO TEXT, NO WORDS, NO LETTERS,
dark background (#0D0D0D), aspect ratio roughly 3:4, high contrast,
atmospheric haze from stage fog, silhouetted crowd. This is a genre placeholder thumbnail.`;

const IMAGES = [
  {
    filename: 'genre-metal.png',
    prompt: `${STYLE} Heavy metal concert scene: dramatic overhead red and white stage lights cutting through fog,
silhouetted figure headbanging, mosh pit energy from below, intense aggressive atmosphere,
dark reds and harsh whites, high energy chaos. NO text.`,
  },
  {
    filename: 'genre-pop.png',
    prompt: `${STYLE} Pop concert scene: colorful vibrant stage with pink, purple, and blue LED lights,
confetti in the air, excited crowd with raised hands visible from behind,
sparkly glamorous atmosphere, upbeat energy, arena scale. NO text.`,
  },
  {
    filename: 'genre-classical.png',
    prompt: `${STYLE} Classical music performance: elegant warm-lit concert hall,
golden spotlight on an empty orchestra stage with music stands and chairs visible,
rich warm wood tones, chandeliers creating bokeh, refined intimate atmosphere. NO text.`,
  },
  {
    filename: 'genre-latin.png',
    prompt: `${STYLE} Latin music concert scene: warm tropical stage lighting in orange and red,
percussion instruments silhouetted, dancing crowd energy,
festive colorful atmosphere with warm golden glow, outdoor stage feel. NO text.`,
  },
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
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
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
  if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
  const toGenerate = only
    ? IMAGES.filter((i) => i.filename === only)
    : IMAGES.filter((i) => !fs.existsSync(path.join(ASSETS_DIR, i.filename)));

  if (toGenerate.length === 0) {
    console.log('All genre images already exist. Use --only=filename.png to regenerate.');
    return;
  }

  console.log(`Generating ${toGenerate.length} genre images...`);

  for (const img of toGenerate) {
    console.log(`  Generating ${img.filename}...`);
    try {
      const response = await makeRequest(img.prompt);
      const imageData = extractImageData(response);
      const filePath = path.join(ASSETS_DIR, img.filename);
      fs.writeFileSync(filePath, imageData);
      console.log(`  ✓ ${img.filename} (${(imageData.length / 1024).toFixed(0)} KB)`);
    } catch (err) {
      console.error(`  ✗ ${img.filename}: ${err.message}`);
    }
    // Rate limit delay
    await new Promise((r) => setTimeout(r, 2500));
  }

  console.log('Done!');
}

main();
