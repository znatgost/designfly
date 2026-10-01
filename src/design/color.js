// Color science for the fly: sRGB ⇄ HSL ⇄ OKLCH, WCAG contrast, harmony rules and
// "palette from words" (mood / industry / named colors → a 5-color brand palette).
import { rng, clamp } from './rng.js';

// ------------------------------------------------------------------ conversions
export function hexToRgb(hex) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}
export function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}
export function hslToRgb([h, s, l]) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const delin = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function rgbToOklch([r, g, b]) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, Bb), ((Math.atan2(Bb, A) * 180) / Math.PI + 360) % 360];
}
function oklchToLinear([L, C, H]) {
  const h = (H * Math.PI) / 180, a = C * Math.cos(h), b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
/** OKLCH → sRGB, reducing chroma until the color fits the gamut (keeps hue and lightness). */
export function oklchToRgb([L, C, H]) {
  let lo = 0, hi = C, c = C;
  const inGamut = (v) => v.every((x) => x >= -1e-4 && x <= 1 + 1e-4);
  if (!inGamut(oklchToLinear([L, C, H]))) {
    for (let i = 0; i < 24; i++) { c = (lo + hi) / 2; if (inGamut(oklchToLinear([L, c, H]))) lo = c; else hi = c; }
    c = lo;
  }
  return oklchToLinear([L, c, H]).map((x) => delin(clamp(x, 0, 1)));
}
export const oklch = (L, C, H) => rgbToHex(oklchToRgb([L, C, ((H % 360) + 360) % 360]));
export const hexToOklch = (hex) => rgbToOklch(hexToRgb(hex));

export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}
export function shade(hex, dL) {                  // move lightness in OKLCH
  const [L, C, H] = hexToOklch(hex);
  return oklch(clamp(L + dL, 0, 1), C, H);
}

// ------------------------------------------------------------------ WCAG
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
export const wcag = (ratio) => (ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large' : 'fail');
export const readableOn = (bg, dark = '#111111', light = '#ffffff') => (contrast(bg, dark) >= contrast(bg, light) ? dark : light);

// ------------------------------------------------------------------ naming
const NAMED = {
  black: '#111111', white: '#ffffff', grey: '#8a8a8a', gray: '#8a8a8a', silver: '#c0c4cc', charcoal: '#2b2d31',
  red: '#e0312f', crimson: '#b3122e', scarlet: '#ff2400', burgundy: '#6d1a2b', maroon: '#6b1d1d', wine: '#722f37',
  pink: '#f27ba6', rose: '#e8a0a8', blush: '#f4c6c3', magenta: '#d4148f', fuchsia: '#e0249b',
  orange: '#f47a20', coral: '#ff7f61', peach: '#ffb38a', apricot: '#f6a96b', rust: '#b5471f', terracotta: '#c8653f',
  yellow: '#ffd21f', gold: '#c9a14a', mustard: '#d6a21e', lemon: '#fff04d', amber: '#ffb000', cream: '#f5ecd7', beige: '#e3d3b6', sand: '#d9c3a0', ivory: '#fbf6ea',
  green: '#2fa35a', lime: '#9fd83a', olive: '#6b7a2e', sage: '#9caf88', mint: '#9fe3c4', emerald: '#119c6b', forest: '#1f4d33', teal: '#12867e', jade: '#00a86b',
  blue: '#2b6de0', navy: '#15254d', cobalt: '#0047ab', azure: '#2e9bff', sky: '#7cc4ff', cyan: '#18c1e0', turquoise: '#2ac7c0', aqua: '#4fe0d8', indigo: '#3f2fa8', ultramarine: '#3a3fe0',
  purple: '#7b3fe4', violet: '#8f5cff', lavender: '#b9a4ec', lilac: '#c8a2c8', plum: '#6e2a67', mauve: '#b784a7',
  brown: '#7a4b2a', chocolate: '#4e2b18', coffee: '#6f4e37', caramel: '#b8753a', tan: '#c7a17a', khaki: '#b8ad7c', camel: '#c19a6b', taupe: '#8b7d73',
};
export function namedColor(word) { return NAMED[word.toLowerCase()] || null; }
export const COLOR_WORDS = Object.keys(NAMED);

export function describe(hex) {
  const [L, C, H] = hexToOklch(hex);
  if (C < 0.03) return L > 0.93 ? (C > 0.008 ? 'off-white' : 'white') : L < 0.22 ? 'black' : L > 0.7 ? 'light grey' : L < 0.4 ? 'charcoal' : 'grey';
  let name;
  if (H < 15 || H >= 350) name = L > 0.72 ? 'pink' : 'red';
  else if (H < 42) name = L > 0.72 ? 'coral' : 'red';
  else if (H < 72) name = L < 0.55 ? 'brown' : L > 0.8 ? 'peach' : 'orange';
  else if (H < 95) name = L < 0.6 ? 'ochre' : 'amber';
  else if (H < 118) name = L < 0.6 ? 'olive' : 'yellow';
  else if (H < 160) name = 'green';
  else if (H < 190) name = 'teal';
  else if (H < 235) name = 'cyan';
  else if (H < 275) name = 'blue';
  else if (H < 310) name = 'violet';
  else name = L > 0.72 ? 'pink' : 'magenta';
  const light = L > 0.85 ? 'pale ' : L > 0.74 ? 'light ' : L < 0.33 ? 'deep ' : L < 0.46 ? 'dark ' : '';
  const soft = C < 0.06 ? 'dusty ' : C > 0.2 ? 'vivid ' : '';
  return (light + soft + name).trim();
}

// ------------------------------------------------------------------ mood lexicon
// hue: preferred OKLCH hue(s); c: chroma; l: base lightness; harmony preference
export const MOODS = {
  calm:       { hue: [210, 180, 150], c: 0.07, l: 0.62, harmony: 'analogous' },
  serene:     { hue: [200, 170], c: 0.06, l: 0.7, harmony: 'analogous' },
  energetic:  { hue: [30, 60, 330], c: 0.2, l: 0.65, harmony: 'triadic' },
  bold:       { hue: [25, 260, 300], c: 0.22, l: 0.58, harmony: 'complementary' },
  playful:    { hue: [340, 60, 200, 140], c: 0.17, l: 0.72, harmony: 'triadic' },
  luxury:     { hue: [85, 300, 20], c: 0.08, l: 0.45, harmony: 'monochrome', dark: true, gold: true },
  elegant:    { hue: [330, 85, 270], c: 0.06, l: 0.5, harmony: 'analogous', dark: true },
  minimal:    { hue: [250, 60], c: 0.02, l: 0.4, harmony: 'monochrome' },
  natural:    { hue: [140, 120, 65], c: 0.09, l: 0.55, harmony: 'analogous' },
  eco:        { hue: [150, 135, 165], c: 0.12, l: 0.55, harmony: 'analogous' },
  earthy:     { hue: [55, 40, 110], c: 0.08, l: 0.5, harmony: 'analogous' },
  tech:       { hue: [260, 285, 200], c: 0.19, l: 0.58, harmony: 'split', dark: true },
  futuristic: { hue: [290, 200, 330], c: 0.22, l: 0.62, harmony: 'split', dark: true },
  trust:      { hue: [255, 230], c: 0.14, l: 0.48, harmony: 'analogous' },
  corporate:  { hue: [255, 240, 200], c: 0.12, l: 0.45, harmony: 'analogous' },
  warm:       { hue: [45, 25, 70], c: 0.15, l: 0.63, harmony: 'analogous' },
  cold:       { hue: [230, 210, 260], c: 0.1, l: 0.6, harmony: 'analogous' },
  retro:      { hue: [55, 25, 180, 90], c: 0.13, l: 0.62, harmony: 'tetradic' },
  vintage:    { hue: [60, 30, 170], c: 0.08, l: 0.58, harmony: 'analogous' },
  neon:       { hue: [330, 150, 210, 290], c: 0.3, l: 0.72, harmony: 'triadic', dark: true },
  pastel:     { hue: [340, 200, 100, 280], c: 0.07, l: 0.86, harmony: 'triadic' },
  soft:       { hue: [350, 20, 300], c: 0.07, l: 0.8, harmony: 'analogous' },
  dark:       { hue: [260, 300], c: 0.1, l: 0.4, harmony: 'analogous', dark: true },
  moody:      { hue: [250, 330, 160], c: 0.08, l: 0.38, harmony: 'analogous', dark: true },
  fresh:      { hue: [155, 110, 190], c: 0.15, l: 0.72, harmony: 'analogous' },
  romantic:   { hue: [355, 15, 330], c: 0.12, l: 0.7, harmony: 'analogous' },
  sunset:     { hue: [30, 5, 330, 290], c: 0.18, l: 0.64, harmony: 'analogous' },
  ocean:      { hue: [220, 200, 185], c: 0.13, l: 0.55, harmony: 'analogous' },
  forest:     { hue: [150, 130, 70], c: 0.1, l: 0.42, harmony: 'analogous' },
  desert:     { hue: [55, 40, 70], c: 0.09, l: 0.7, harmony: 'analogous' },
  candy:      { hue: [350, 300, 200], c: 0.17, l: 0.78, harmony: 'triadic' },
  scandinavian:{ hue: [70, 220, 40], c: 0.03, l: 0.78, harmony: 'monochrome' },
  japandi:    { hue: [65, 50, 140], c: 0.04, l: 0.7, harmony: 'analogous' },
  brutalist:  { hue: [100, 25], c: 0.2, l: 0.6, harmony: 'monochrome' },
  industrial: { hue: [50, 230], c: 0.03, l: 0.45, harmony: 'monochrome', dark: true },
  mediterranean:{ hue: [230, 40, 95], c: 0.14, l: 0.6, harmony: 'complementary' },
  coffee:     { hue: [50, 40, 65], c: 0.07, l: 0.42, harmony: 'analogous' },
  cyberpunk:  { hue: [335, 195, 290], c: 0.28, l: 0.65, harmony: 'complementary', dark: true },
};
// industry → mood mix
export const INDUSTRIES = {
  coffee: ['coffee', 'warm'], cafe: ['coffee', 'warm'], bakery: ['warm', 'soft'], restaurant: ['warm', 'bold'], food: ['warm', 'fresh'], pizza: ['bold', 'warm'], sushi: ['minimal', 'bold'], tea: ['natural', 'calm'], bar: ['moody', 'luxury'], wine: ['elegant', 'moody'],
  tech: ['tech'], software: ['tech', 'trust'], startup: ['bold', 'tech'], ai: ['futuristic'], crypto: ['futuristic', 'neon'], saas: ['trust', 'tech'], app: ['tech', 'playful'], game: ['neon', 'playful'], gaming: ['neon', 'bold'], esports: ['cyberpunk'],
  finance: ['trust', 'corporate'], bank: ['trust', 'corporate'], law: ['corporate', 'elegant'], consulting: ['corporate', 'minimal'], insurance: ['trust'],
  health: ['calm', 'fresh'], medical: ['calm', 'trust'], clinic: ['calm', 'trust'], dental: ['fresh', 'calm'], pharmacy: ['fresh', 'trust'], wellness: ['calm', 'natural'], yoga: ['serene', 'natural'], spa: ['serene', 'soft'], fitness: ['energetic', 'bold'], gym: ['bold', 'dark'], sport: ['energetic', 'bold'],
  fashion: ['elegant', 'minimal'], beauty: ['soft', 'elegant'], cosmetics: ['soft', 'romantic'], jewelry: ['luxury'], boutique: ['elegant', 'soft'], wedding: ['romantic', 'soft'],
  architecture: ['minimal', 'industrial'], interior: ['japandi', 'warm'], construction: ['bold', 'industrial'], realestate: ['trust', 'elegant'], furniture: ['japandi', 'earthy'],
  eco: ['eco'], garden: ['natural', 'fresh'], farm: ['earthy', 'natural'], organic: ['eco', 'earthy'], energy: ['energetic', 'eco'], pet: ['playful', 'warm'],
  kids: ['playful', 'candy'], toys: ['playful', 'candy'], school: ['playful', 'trust'], education: ['trust', 'fresh'], university: ['corporate', 'elegant'],
  music: ['moody', 'neon'], studio: ['moody', 'minimal'], art: ['bold', 'playful'], gallery: ['minimal'], photo: ['minimal', 'moody'], film: ['moody', 'retro'], podcast: ['bold', 'retro'],
  travel: ['ocean', 'warm'], hotel: ['elegant', 'calm'], airline: ['trust', 'cold'], surf: ['ocean', 'fresh'], outdoor: ['forest', 'earthy'],
  books: ['vintage', 'elegant'], agency: ['bold', 'minimal'], marketing: ['bold', 'energetic'], media: ['bold'], charity: ['warm', 'trust'], logistics: ['corporate', 'bold'], auto: ['dark', 'bold'], car: ['dark', 'bold'],
};
export const INDUSTRY_ALIASES = {
  coffeeshop: 'coffee', espresso: 'coffee', barista: 'coffee', patisserie: 'bakery', bistro: 'restaurant', burger: 'food', kitchen: 'food', brewery: 'bar', pub: 'bar', winery: 'wine',
  technology: 'tech', developer: 'software', devtools: 'software', dev: 'software', web: 'tech', cloud: 'saas', data: 'tech', robotics: 'ai', blockchain: 'crypto', fintech: 'finance', invest: 'finance', investment: 'finance', accounting: 'finance', lawyer: 'law', legal: 'law',
  hospital: 'medical', doctor: 'medical', therapy: 'wellness', meditation: 'yoga', salon: 'beauty', barber: 'beauty', skincare: 'cosmetics', clothing: 'fashion', apparel: 'fashion', streetwear: 'fashion',
  architect: 'architecture', architects: 'architecture', property: 'realestate', 'real-estate': 'realestate', homes: 'realestate', builder: 'construction', plants: 'garden', flowers: 'garden', florist: 'garden', vegan: 'organic', solar: 'energy', dog: 'pet', cat: 'pet', vet: 'pet',
  children: 'kids', baby: 'kids', toy: 'toys', academy: 'education', course: 'education', courses: 'education', band: 'music', records: 'music', dj: 'music', label: 'music', photography: 'photo', cinema: 'film', video: 'film', tourism: 'travel', resort: 'hotel', hostel: 'travel', bookstore: 'books', library: 'books', publishing: 'books', ngo: 'charity', delivery: 'logistics', shipping: 'logistics', garage: 'auto', automotive: 'auto',
};
export function industryOf(word) {
  const w = word.toLowerCase().replace(/[^a-z-]/g, '');
  if (INDUSTRIES[w]) return w;
  if (INDUSTRY_ALIASES[w]) return INDUSTRY_ALIASES[w];
  if (w.endsWith('s') && INDUSTRIES[w.slice(0, -1)]) return w.slice(0, -1);
  return null;
}

// ------------------------------------------------------------------ palettes
const HARMONY = {
  analogous: [0, 28, -28, 55],
  complementary: [0, 180, 20, 200],
  split: [0, 150, 210, 30],
  triadic: [0, 120, 240, 60],
  tetradic: [0, 90, 180, 270],
  monochrome: [0, 0, 8, -8],
};
export const HARMONIES = Object.keys(HARMONY);

/**
 * Build a 5-role palette. opts: { moods:[], colors:[hex], harmony, dark, seed }
 * roles: primary, secondary, accent, ink (dark text), paper (light background)
 */
export function makePalette(opts = {}) {
  const r = rng(opts.seed ?? 1);
  const moods = (opts.moods || []).map((m) => MOODS[m]).filter(Boolean);
  const base = moods.length ? moods : [r.pick(Object.values(MOODS))];
  const avg = (k) => base.reduce((s, m) => s + m[k], 0) / base.length;
  const harmony = opts.harmony || r.pick(base).harmony;
  const dark = opts.dark ?? base.some((m) => m.dark);
  const gold = base.some((m) => m.gold);
  let c = avg('c'), l = avg('l');
  let h;
  const given = (opts.colors || []).filter(Boolean);
  if (given.length) {
    const [L0, C0, H0] = hexToOklch(given[0]);
    h = H0; c = Math.max(C0, 0.02); l = L0;
  } else {
    const hues = base.flatMap((m) => m.hue);
    h = r.pick(hues) + r.float(-12, 12);
  }
  const offs = HARMONY[harmony] || HARMONY.analogous;
  const primary = given[0] || oklch(clamp(l, 0.35, 0.75), c, h);
  const secondary = given[1] || oklch(clamp(l + (harmony === 'monochrome' ? 0.18 : r.float(-0.08, 0.12)), 0.3, 0.88), c * (harmony === 'monochrome' ? 0.7 : 0.85), h + offs[1]);
  let accent = given[2] || (gold ? oklch(0.74, 0.11, 85) : oklch(clamp(l + r.float(0.02, 0.15), 0.55, 0.85), Math.max(c * 1.2, 0.12), h + offs[2] + (harmony === 'monochrome' ? 180 : 0)));
  if (harmony === 'monochrome' && !given[2] && !gold && c < 0.04) accent = oklch(0.62, 0.17, h + r.pick([150, 180, 200]));
  const ink = given[3] || oklch(r.float(0.16, 0.24), Math.min(0.03, c * 0.35), h);
  const paper = given[4] || oklch(r.float(0.955, 0.985), Math.min(0.018, c * 0.2), h + offs[3] * 0.3);
  const colors = [
    { role: 'primary', hex: primary }, { role: 'secondary', hex: secondary }, { role: 'accent', hex: accent },
    { role: 'ink', hex: ink }, { role: 'paper', hex: paper },
  ];
  return { harmony, dark, colors, get: (role) => colors.find((x) => x.role === role).hex };
}

export function paletteFromSpec(spec, seed) {
  return makePalette({ moods: spec.moods, colors: spec.colors, harmony: spec.harmony, dark: spec.dark, seed });
}

// ------------------------------------------------------------------ extraction (for critique)
/** k-means on an array of [r,g,b]; returns clusters sorted by weight */
export function kmeans(pixels, k = 6, iters = 12, seed = 7) {
  const r = rng(seed);
  if (!pixels.length) return [];
  let cents = Array.from({ length: k }, () => pixels[Math.floor(r.next() * pixels.length)].slice());
  let counts = new Array(k).fill(0);
  for (let it = 0; it < iters; it++) {
    const sums = cents.map(() => [0, 0, 0]); counts = new Array(k).fill(0);
    for (const p of pixels) {
      let bi = 0, bd = Infinity;
      for (let j = 0; j < k; j++) { const c = cents[j]; const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; bi = j; } }
      sums[bi][0] += p[0]; sums[bi][1] += p[1]; sums[bi][2] += p[2]; counts[bi]++;
    }
    cents = cents.map((c, j) => counts[j] ? sums[j].map((s) => s / counts[j]) : pixels[Math.floor(r.next() * pixels.length)].slice());
  }
  const tot = pixels.length;
  return cents.map((c, j) => ({ hex: rgbToHex(c), weight: counts[j] / tot })).filter((x) => x.weight > 0.005).sort((a, b) => b.weight - a.weight);
}
