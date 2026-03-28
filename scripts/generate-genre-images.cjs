const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('Set GEMINI_API_KEY env var before running.'); process.exit(1); }
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
  {
    filename: 'genre-electronic.png',
    prompt: `${STYLE} Electronic / EDM concert scene: vivid neon blue and purple laser beams cutting through thick fog,
DJ booth silhouette with LED screens behind, dense crowd with raised hands,
electric blue and deep violet color palette, futuristic pulsating atmosphere. NO text.`,
  },
  {
    filename: 'genre-folk.png',
    prompt: `${STYLE} Intimate folk / acoustic concert in a warm small venue: single performer silhouette on stage
with acoustic guitar, warm golden amber spotlight, less fog than other genres,
cozy intimate feel, earthy warm amber tones, wooden stage elements visible, small close crowd. NO text.`,
  },
  {
    filename: 'genre-hiphop.png',
    prompt: `${STYLE} Hip-hop / rap concert scene: solo performer silhouette on stage with microphone,
commanding presence, bold dramatic lighting with amber gold and deep red tones,
heavy atmospheric haze, crowd with raised hands and phones, high energy urban concert feel. NO text.`,
  },
  {
    filename: 'genre-jazz.png',
    prompt: `${STYLE} Jazz club performance scene: intimate stage with silhouettes of musicians,
saxophone player and upright bass visible, moody blue and cyan stage lighting with warm accent spots,
smoky atmospheric haze, classic jazz club feel, sophisticated moody atmosphere. NO text.`,
  },
  {
    filename: 'genre-punk.png',
    prompt: `${STYLE} Punk rock concert in a small gritty venue: raw energy, performer silhouette leaning
into the crowd from a low stage, harsh red and white stage lights, intense aggressive lighting,
crowd pressed close to stage, harsh red and stark white with deep black shadows, gritty underground feel. NO text.`,
  },
  {
    filename: 'genre-rock.png',
    prompt: `${STYLE} Rock concert on a medium stage: band silhouettes with guitarist raising guitar dramatically,
drummer behind, classic rock concert lighting with red and amber tones, theatrical fog machines,
energetic crowd with fists raised, fiery red and warm amber tones, classic rock energy. NO text.`,
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
