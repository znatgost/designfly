// Type catalogue: Google Fonts the fly knows, curated pairings, and a width estimate so
// layouts can fit text without a DOM (the generators also run in Node for tests).

// w = average advance width per character as a fraction of font size (caps ≈ ×1.25)
export const FONTS = {
  'Inter':              { cat: 'sans-serif', w: 0.56, weights: [400, 600, 800], style: ['modern', 'neutral', 'ui'] },
  'Manrope':            { cat: 'sans-serif', w: 0.57, weights: [400, 600, 800], style: ['modern', 'friendly'] },
  'Montserrat':         { cat: 'sans-serif', w: 0.62, weights: [400, 600, 800], style: ['geometric', 'modern'] },
  'Poppins':            { cat: 'sans-serif', w: 0.61, weights: [400, 600, 800], style: ['geometric', 'friendly'] },
  'Outfit':             { cat: 'sans-serif', w: 0.55, weights: [400, 600, 800], style: ['geometric', 'tech'] },
  'Space Grotesk':      { cat: 'sans-serif', w: 0.57, weights: [400, 600, 700], style: ['tech', 'quirky'] },
  'Sora':               { cat: 'sans-serif', w: 0.6, weights: [400, 600, 800], style: ['tech', 'futuristic'] },
  'Syne':               { cat: 'sans-serif', w: 0.6, weights: [400, 600, 800], style: ['art', 'bold'] },
  'Archivo Black':      { cat: 'sans-serif', w: 0.68, weights: [400], style: ['brutalist', 'bold'] },
  'Anton':              { cat: 'sans-serif', w: 0.44, weights: [400], style: ['condensed', 'bold', 'poster'] },
  'Bebas Neue':         { cat: 'sans-serif', w: 0.4, weights: [400], style: ['condensed', 'poster'] },
  'Oswald':             { cat: 'sans-serif', w: 0.45, weights: [400, 600, 700], style: ['condensed', 'sport'] },
  'Rubik':              { cat: 'sans-serif', w: 0.58, weights: [400, 600, 800], style: ['friendly', 'rounded'] },
  'Nunito':             { cat: 'sans-serif', w: 0.56, weights: [400, 700, 900], style: ['rounded', 'soft'] },
  'Quicksand':          { cat: 'sans-serif', w: 0.55, weights: [400, 600, 700], style: ['rounded', 'soft'] },
  'Fredoka':            { cat: 'sans-serif', w: 0.56, weights: [400, 600, 700], style: ['playful', 'rounded'] },
  'Baloo 2':            { cat: 'sans-serif', w: 0.55, weights: [400, 600, 800], style: ['playful'] },
  'Righteous':          { cat: 'sans-serif', w: 0.6, weights: [400], style: ['retro'] },
  'Unbounded':          { cat: 'sans-serif', w: 0.72, weights: [400, 600, 800], style: ['futuristic', 'bold'] },
  'Playfair Display':   { cat: 'serif', w: 0.55, weights: [400, 600, 800], style: ['classic', 'elegant', 'editorial'] },
  'DM Serif Display':   { cat: 'serif', w: 0.52, weights: [400], style: ['editorial', 'elegant'] },
  'Fraunces':           { cat: 'serif', w: 0.56, weights: [400, 600, 800], style: ['editorial', 'warm', 'retro'] },
  'Cormorant Garamond': { cat: 'serif', w: 0.47, weights: [400, 600, 700], style: ['luxury', 'classic'] },
  'Libre Baskerville':  { cat: 'serif', w: 0.6, weights: [400, 700], style: ['classic', 'books'] },
  'Lora':               { cat: 'serif', w: 0.54, weights: [400, 600, 700], style: ['classic', 'body'] },
  'Source Serif 4':     { cat: 'serif', w: 0.52, weights: [400, 600, 700], style: ['body', 'editorial'] },
  'Bodoni Moda':        { cat: 'serif', w: 0.5, weights: [400, 600, 800], style: ['luxury', 'fashion'] },
  'Cinzel':             { cat: 'serif', w: 0.7, weights: [400, 600, 800], style: ['luxury', 'classic'] },
  'Abril Fatface':      { cat: 'serif', w: 0.58, weights: [400], style: ['poster', 'editorial', 'retro'] },
  'JetBrains Mono':     { cat: 'monospace', w: 0.6, weights: [400, 700], style: ['mono', 'tech'] },
  'IBM Plex Mono':      { cat: 'monospace', w: 0.6, weights: [400, 600], style: ['mono', 'tech'] },
  'Caveat':             { cat: 'cursive', w: 0.42, weights: [400, 700], style: ['handwritten', 'sketch'] },
  'Pacifico':           { cat: 'cursive', w: 0.55, weights: [400], style: ['script', 'retro', 'playful'] },
  'Great Vibes':        { cat: 'cursive', w: 0.45, weights: [400], style: ['script', 'romantic', 'luxury'] },
  'Permanent Marker':   { cat: 'cursive', w: 0.6, weights: [400], style: ['handwritten', 'street'] },
};

// display/heading + body pairings, tagged by personality
export const PAIRS = [
  { id: 'swiss',      head: ['Inter', 800], body: ['Inter', 400], tags: ['minimal', 'modern', 'corporate', 'tech', 'ui'], why: 'One neo-grotesque family in two weights: maximum clarity, zero friction — the Swiss way.' },
  { id: 'geo',        head: ['Montserrat', 800], body: ['Inter', 400], tags: ['modern', 'bold', 'startup', 'architecture'], why: 'A wide geometric display face with a neutral workhorse underneath — confident headlines, calm text.' },
  { id: 'friendly',   head: ['Poppins', 600], body: ['Nunito', 400], tags: ['friendly', 'playful', 'kids', 'education', 'pet'], why: 'Round geometry everywhere: approachable and warm without looking childish.' },
  { id: 'techy',      head: ['Space Grotesk', 700], body: ['IBM Plex Mono', 400], tags: ['tech', 'software', 'ai', 'futuristic', 'crypto'], why: 'Quirky grotesk plus a monospace for the "built by engineers" feel.' },
  { id: 'future',     head: ['Unbounded', 800], body: ['Sora', 400], tags: ['futuristic', 'ai', 'gaming', 'bold', 'neon', 'cyberpunk'], why: 'Wide, extended letters read as speed and tomorrow; Sora keeps the body text tidy.' },
  { id: 'editorial',  head: ['Playfair Display', 800], body: ['Source Serif 4', 400], tags: ['editorial', 'elegant', 'books', 'classic', 'wine'], why: 'High-contrast display serif over a sturdy text serif: a magazine cover in two fonts.' },
  { id: 'luxe',       head: ['Cormorant Garamond', 600], body: ['Manrope', 400], tags: ['luxury', 'fashion', 'beauty', 'jewelry', 'elegant', 'hotel', 'wedding'], why: 'Delicate Garamond capitals whisper "expensive"; a clean sans keeps it from feeling old.' },
  { id: 'fashion',    head: ['Bodoni Moda', 600], body: ['Inter', 400], tags: ['fashion', 'luxury', 'editorial', 'beauty'], why: 'Bodoni is the typeface of fashion mastheads — pair it with a grotesk and let it breathe.' },
  { id: 'warm',       head: ['Fraunces', 800], body: ['Lora', 400], tags: ['warm', 'coffee', 'bakery', 'food', 'vintage', 'retro', 'books'], why: 'Soft, "wonky" old-style serif with a bookish body face: cosy, crafted, human.' },
  { id: 'poster',     head: ['Anton', 400], body: ['Inter', 400], tags: ['poster', 'bold', 'sport', 'energetic', 'marketing', 'gym'], why: 'Condensed all-caps headlines shout; a neutral sans explains the details.' },
  { id: 'brutal',     head: ['Archivo Black', 400], body: ['JetBrains Mono', 400], tags: ['brutalist', 'art', 'agency', 'bold', 'industrial'], why: 'Heavy blocky headlines and raw monospace: honest, loud, unpolished on purpose.' },
  { id: 'retro',      head: ['Righteous', 400], body: ['Rubik', 400], tags: ['retro', 'music', 'playful', 'podcast', 'film'], why: 'Seventies curves on top, a rounded modern sans below.' },
  { id: 'script',     head: ['Pacifico', 400], body: ['Quicksand', 400], tags: ['script', 'playful', 'surf', 'cafe', 'retro', 'candy'], why: 'A casual brush script for the name only, never for paragraphs; Quicksand stays light.' },
  { id: 'classic',    head: ['Cinzel', 600], body: ['Libre Baskerville', 400], tags: ['classic', 'law', 'university', 'luxury', 'realestate'], why: 'Roman inscription capitals + Baskerville: tradition, authority, permanence.' },
  { id: 'natural',    head: ['DM Serif Display', 400], body: ['Manrope', 400], tags: ['natural', 'eco', 'organic', 'wellness', 'garden', 'spa', 'calm'], why: 'A soft display serif feels organic; a humanist sans keeps things fresh.' },
  { id: 'art',        head: ['Syne', 800], body: ['Space Grotesk', 400], tags: ['art', 'gallery', 'agency', 'studio', 'bold'], why: 'Syne was made for an art centre — expressive at big sizes, fine in small print with a grotesk.' },
  { id: 'rounded',    head: ['Fredoka', 700], body: ['Nunito', 400], tags: ['kids', 'toys', 'playful', 'candy', 'game'], why: 'Bubbly rounded forms read as fun and safe.' },
  { id: 'sport',      head: ['Oswald', 700], body: ['Rubik', 400], tags: ['sport', 'fitness', 'auto', 'energetic', 'logistics'], why: 'Condensed, upright and fast — like a jersey number.' },
];

export function fontStack(family) {
  const f = FONTS[family];
  return `'${family}', ${f ? (f.cat === 'cursive' ? 'cursive' : f.cat) : 'sans-serif'}`;
}
// In the browser the app installs a real measurer (canvas measureText with the vendored fonts);
// in Node the estimate below is used.
let measurer = null;
export function setMeasurer(fn) { measurer = fn; }
export function textWidth(text, family, size, { caps = false, tracking = 0, weight } = {}) {
  if (measurer) {
    const fw = weight || (FONTS[family]?.weights.length === 1 ? FONTS[family].weights[0] : 700);
    const m = measurer(String(text), family, fw);
    if (m > 0) return m * size + tracking * size * Math.max(0, [...String(text)].length - 1);
  }
  const f = FONTS[family] || { w: 0.58 };
  let w = 0;
  for (const ch of String(text)) {
    const up = ch !== ch.toLowerCase();
    const narrow = 'iljtfr.,:;!|\'I1 '.includes(ch);
    const wide = 'mwMW@'.includes(ch);
    w += f.w * (caps || up ? 1.22 : 1) * (narrow ? 0.55 : wide ? 1.45 : 1);
  }
  return w * size + tracking * size * Math.max(0, [...String(text)].length - 1);
}
/** largest size ≤ maxSize so that text fits maxWidth */
export function fitSize(text, family, maxWidth, maxSize, opts) {
  const w1 = textWidth(text, family, 1, opts);
  return Math.max(6, Math.min(maxSize, maxWidth / Math.max(w1, 0.01)));
}

export function pickPair(r, tags = [], preferId) {
  if (preferId) { const p = PAIRS.find((x) => x.id === preferId); if (p) return p; }
  const scored = PAIRS.map((p) => [p, 1 + 4 * p.tags.filter((t) => tags.includes(t)).length]);
  return r.weighted(scored);
}
export function pairFromStyle(style) {
  const map = { serif: 'editorial', sans: 'swiss', script: 'script', mono: 'techy', rounded: 'rounded', condensed: 'poster', elegant: 'luxe', geometric: 'geo', handwritten: null };
  return map[style] ?? null;
}

/** fonts used by a design, for embedding: [{family, weight}] */
export function fontsOf(pair, extra = []) {
  const out = new Map();
  const add = (fam, w) => out.set(fam + ':' + w, { family: fam, weight: w });
  if (pair) { add(pair.head[0], pair.head[1]); add(pair.body[0], pair.body[1]); if (FONTS[pair.body[0]]?.weights.includes(600)) add(pair.body[0], 600); }
  for (const [f, w] of extra) add(f, w);
  return [...out.values()];
}

/** greedy word wrap using the width estimate; returns lines */
export function wrapTextLines(str, family, size, maxW, opts) {
  const lines = []; let cur = '';
  for (const wd of String(str).split(/\s+/)) {
    const t = cur ? cur + ' ' + wd : wd;
    if (textWidth(t, family, size, opts) > maxW && cur) { lines.push(cur); cur = wd; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
