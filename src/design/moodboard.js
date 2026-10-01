// Mood boards: a collage of procedural "photos", material swatches, palette, type and keywords.
import { el, g, rect, circle, line, path, text, doc } from './svg.js';
import { context, design, titleCase } from './common.js';
import { tile } from './pattern.js';
import { fontStack, fontsOf, fitSize } from './type.js';
import { mix, shade, readableOn, describe } from './color.js';
import { rng } from './rng.js';

const KEYWORDS = {
  calm: ['stillness', 'soft light', 'breathing room'], serene: ['quiet', 'morning mist', 'linen'], energetic: ['motion', 'pop', 'loud colour'], bold: ['contrast', 'statement', 'graphic'],
  playful: ['fun', 'curves', 'surprise'], luxury: ['brass', 'velvet', 'restraint'], elegant: ['silk', 'poise', 'thin lines'], minimal: ['less', 'negative space', 'precision'],
  natural: ['raw wood', 'clay', 'sunlight'], eco: ['plants', 'recycled', 'honest materials'], earthy: ['terracotta', 'sand', 'handmade'], tech: ['glow', 'grid', 'precision'],
  futuristic: ['chrome', 'neon edge', 'speed'], warm: ['golden hour', 'wool', 'embers'], cold: ['steel', 'ice', 'clarity'], retro: ['70s', 'film grain', 'rounded'], vintage: ['patina', 'paper', 'serif'],
  neon: ['night', 'glow', 'electric'], pastel: ['sorbet', 'powder', 'airy'], scandinavian: ['hygge', 'birch', 'white walls'], japandi: ['wabi-sabi', 'oak', 'washi'], industrial: ['concrete', 'steel', 'exposed'],
  mediterranean: ['whitewash', 'olive', 'sea breeze'], moody: ['shadow', 'deep tones', 'velvet'], romantic: ['blush', 'petals', 'candlelight'], brutalist: ['concrete', 'mass', 'raw'], coffee: ['roast', 'crema', 'ritual'],
};

function material(kind, x, y, w, h, base, seed, id) {
  const r = rng(seed);
  const out = [el('clipPath', { id }, rect(x, y, w, h, { rx: 10 })), rect(x, y, w, h, { rx: 10, fill: base })];
  const inner = [];
  if (kind === 'wood') for (let i = 0; i < 26; i++) { const yy = y + (i / 26) * h; inner.push(path(`M${x} ${yy}Q${x + w * 0.3} ${yy + r.float(-6, 6)} ${x + w * 0.6} ${yy + r.float(-4, 8)}T${x + w} ${yy + r.float(-6, 6)}`, { fill: 'none', stroke: shade(base, -0.08), strokeWidth: r.float(0.8, 2.2), opacity: 0.8 })); }
  if (kind === 'concrete') for (let i = 0; i < 120; i++) inner.push(circle(x + r.float(0, w), y + r.float(0, h), r.float(0.6, 2.2), { fill: r.chance(0.5) ? shade(base, -0.12) : shade(base, 0.08), opacity: 0.7 }));
  if (kind === 'linen') { for (let i = 0; i < w; i += 4) inner.push(line(x + i, y, x + i, y + h, { stroke: shade(base, -0.05), strokeWidth: 1, opacity: 0.6 })); for (let i = 0; i < h; i += 4) inner.push(line(x, y + i, x + w, y + i, { stroke: shade(base, 0.04), strokeWidth: 1, opacity: 0.6 })); }
  if (kind === 'marble') for (let i = 0; i < 7; i++) { let px = x + r.float(0, w), py = y; let d = `M${px} ${py}`; while (py < y + h) { px += r.float(-26, 26); py += r.float(18, 34); d += `L${px} ${py}`; } inner.push(path(d, { fill: 'none', stroke: shade(base, -0.18), strokeWidth: r.float(0.6, 2), opacity: 0.6 })); }
  if (kind === 'terrazzo') inner.push(g({ transform: `translate(${x} ${y})` }, tile('terrazzo', [base, shade(base, -0.2), mix(base, '#c9a14a', 0.5), shade(base, 0.15)], Math.max(w, h), seed)));
  if (kind === 'velvet') inner.push(rect(x, y, w, h, { fill: `url(#vg${id})` }), el('linearGradient', { id: 'vg' + id, x1: 0, y1: 0, x2: 1, y2: 1 }, el('stop', { offset: 0, stopColor: shade(base, 0.12) }), el('stop', { offset: 0.5, stopColor: shade(base, -0.1) }), el('stop', { offset: 1, stopColor: shade(base, 0.05) })));
  if (kind === 'brass') inner.push(el('linearGradient', { id: 'bg' + id, x1: 0, y1: 0, x2: 1, y2: 0.3 }, el('stop', { offset: 0, stopColor: '#8a6a2c' }), el('stop', { offset: 0.45, stopColor: '#e7c877' }), el('stop', { offset: 1, stopColor: '#9c7a35' })), rect(x, y, w, h, { fill: `url(#bg${id})` }), ...Array.from({ length: 40 }, (_, i) => line(x, y + i * (h / 40), x + w, y + i * (h / 40) + 3, { stroke: '#fff', strokeOpacity: 0.08 })));
  out.push(g({ clipPath: `url(#${id})` }, ...inner));
  return out.join('');
}

function photo(i, x, y, w, h, C, r, id) {
  const cols = [C.primary, C.secondary, C.accent, C.ink, C.paper];
  const bg = cols[i % 5 === 4 ? 1 : i % 5];
  const kind = i % 4;
  const out = [el('clipPath', { id }, rect(x, y, w, h, { rx: 12 })), rect(x, y, w, h, { rx: 12, fill: bg })];
  const inn = [];
  if (kind === 0) {           // arch + sun: "architecture"
    inn.push(rect(x, y + h * 0.62, w, h, { fill: shade(bg, -0.12) }), path(`M${x + w * 0.3} ${y + h}V${y + h * 0.45}A${w * 0.2} ${w * 0.2} 0 0 1 ${x + w * 0.7} ${y + h * 0.45}V${y + h}Z`, { fill: mix(C.paper, bg, 0.2) }), circle(x + w * 0.5, y + h * 0.45, w * 0.08, { fill: C.accent }));
  } else if (kind === 1) {    // still life: vase + fruit
    inn.push(rect(x, y + h * 0.7, w, h, { fill: shade(bg, 0.1) }), path(`M${x + w * 0.4} ${y + h * 0.72}C${x + w * 0.3} ${y + h * 0.55} ${x + w * 0.36} ${y + h * 0.38} ${x + w * 0.44} ${y + h * 0.32}H${x + w * 0.52}C${x + w * 0.6} ${y + h * 0.38} ${x + w * 0.66} ${y + h * 0.55} ${x + w * 0.56} ${y + h * 0.72}Z`, { fill: cols[(i + 2) % 4] }),
      circle(x + w * 0.7, y + h * 0.66, w * 0.07, { fill: C.accent }), path(`M${x + w * 0.48} ${y + h * 0.32}Q${x + w * 0.4} ${y + h * 0.12} ${x + w * 0.3} ${y + h * 0.1}M${x + w * 0.48} ${y + h * 0.32}Q${x + w * 0.58} ${y + h * 0.14} ${x + w * 0.66} ${y + h * 0.16}`, { stroke: shade(C.secondary, -0.2), strokeWidth: 3, fill: 'none' }));
  } else if (kind === 2) {    // landscape
    inn.push(circle(x + w * 0.72, y + h * 0.32, w * 0.12, { fill: mix(C.accent, '#fff', 0.3) }), path(`M${x} ${y + h * 0.7}Q${x + w * 0.25} ${y + h * 0.45} ${x + w * 0.5} ${y + h * 0.62}T${x + w} ${y + h * 0.52}V${y + h}H${x}Z`, { fill: shade(bg, -0.15) }), path(`M${x} ${y + h * 0.82}Q${x + w * 0.4} ${y + h * 0.66} ${x + w} ${y + h * 0.8}V${y + h}H${x}Z`, { fill: shade(bg, -0.3) }));
  } else {                     // light & shadow on a wall
    inn.push(path(`M${x + w * 0.1} ${y}L${x + w * 0.55} ${y}L${x + w * 0.95} ${y + h}L${x + w * 0.45} ${y + h}Z`, { fill: '#ffffff', opacity: 0.18 }), rect(x + w * 0.15, y + h * 0.55, w * 0.7, h * 0.08, { fill: shade(bg, -0.2) }), circle(x + w * 0.3, y + h * 0.5, w * 0.06, { fill: C.accent }));
  }
  inn.push(rect(x, y, w, h, { fill: '#000', opacity: 0.04 }));
  out.push(g({ clipPath: `url(#${id})` }, ...inn));
  return out.join('');
}

export function generateMoodboard(spec) {
  const ctx = context(spec);
  const { C, pair, palette, r, moods } = ctx;
  const W = 1600, H = 1000;
  const topic = spec.name || (spec.industry ? titleCase(spec.industry) : moods[0] ? titleCase(moods[0]) : 'Studio');
  const words = [...new Set(moods.flatMap((m) => KEYWORDS[m] || []))].slice(0, 6);
  if (words.length < 3) words.push('texture', 'light', 'craft');
  const mats = { interior: ['wood', 'linen', 'terrazzo'], furniture: ['wood', 'linen', 'brass'], luxury: ['marble', 'velvet', 'brass'], industrial: ['concrete', 'wood', 'brass'], japandi: ['wood', 'linen', 'concrete'], scandinavian: ['wood', 'linen', 'concrete'], fashion: ['linen', 'velvet', 'brass'] };
  const matKinds = mats[spec.industry] || mats[moods.find((m) => mats[m])] || r.shuffle(['wood', 'concrete', 'linen', 'marble', 'terrazzo', 'velvet', 'brass']).slice(0, 3);
  const P = [rect(0, 0, W, H, { fill: '#efebe4' })];
  P.push(photo(0, 40, 40, 520, 600, C, r, 'mp0'), photo(1, 580, 40, 380, 290, C, r, 'mp1'), photo(2, 580, 350, 380, 290, C, r, 'mp2'), photo(3, 980, 40, 580, 380, C, r, 'mp3'));
  // title card
  P.push(rect(980, 440, 580, 200, { rx: 12, fill: C.ink }));
  const ts = Math.min(64, fitSize(topic, pair.head[0], 520, 64));
  P.push(text(1010, 530, topic, { fontFamily: fontStack(pair.head[0]), fontWeight: pair.head[1], fontSize: ts, fill: C.paper }), text(1012, 580, words.slice(0, 3).join(' · '), { fontFamily: fontStack(pair.body[0]), fontSize: 20, fill: mix(C.paper, C.ink, 0.3) }), text(1012, 612, 'MOOD BOARD', { fontFamily: fontStack(pair.body[0]), fontWeight: 600, fontSize: 13, letterSpacing: 4, fill: C.accent }));
  // palette row
  palette.colors.forEach((c, i) => P.push(circle(90 + i * 110, 730, 44, { fill: c.hex, stroke: '#d9d4ca', strokeWidth: 2 }), text(90 + i * 110, 800, c.hex.toUpperCase(), { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fill: '#555', textAnchor: 'middle' })));
  // materials
  matKinds.forEach((m, i) => { const base = m === 'wood' ? '#b58b5c' : m === 'concrete' ? '#a9a6a0' : m === 'linen' ? '#dcd2c0' : m === 'marble' ? '#ece9e3' : m === 'velvet' ? shade(C.primary, -0.15) : m === 'brass' ? '#c9a14a' : '#e5ddd0'; P.push(material(m, 620 + i * 190, 680, 170, 170, base, ctx.seed + i, 'mm' + i), text(620 + i * 190, 880, m, { fontFamily: "'Caveat', cursive", fontSize: 28, fill: '#444' })); });
  // type
  P.push(text(40, 900, `${pair.head[0]} × ${pair.body[0]}`, { fontFamily: fontStack(pair.head[0]), fontWeight: pair.head[1], fontSize: 30, fill: C.ink }), text(40, 940, 'The quick brown fly jumps over the lazy grid.', { fontFamily: fontStack(pair.body[0]), fontSize: 18, fill: '#555' }));
  // keywords
  words.slice(0, 5).forEach((w, i) => P.push(rect(1200, 680 + i * 52, 360, 42, { rx: 21, fill: i % 2 ? 'none' : mix(C.secondary, '#ffffff', 0.7), stroke: C.ink, strokeOpacity: 0.3 }), text(1222, 708 + i * 52, w, { fontFamily: "'Caveat', cursive", fontSize: 26, fill: C.ink })));
  const fonts = fontsOf(pair, [['JetBrains Mono', 400], ['Caveat', 400]]);
  const svg = doc(W, H, P.join(''), { fonts, seed: ctx.seed, sketch: spec.sketch, title: topic + ' mood board' });
  return design({ kind: 'moodboard', title: `${topic} mood board`, svg, spec, palette, pair, w: W, h: H,
    notes: `**${topic} mood board.** Keywords: ${words.join(', ')}.\nMaterials: ${matKinds.join(', ')}. Palette: ${palette.colors.map((c) => describe(c.hex)).join(', ')}. Type: ${pair.head[0]} + ${pair.body[0]}.\nThe "photos" are abstract placeholders for the atmosphere — swap in your own references and keep the palette and materials as the brief.`, assets: [] });
}
