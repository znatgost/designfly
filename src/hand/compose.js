// Freehand design: the fly decides what to draw and where, then draws it stroke by stroke.
// No templates — layouts are chosen (and positions searched) per drawing, every line goes
// through the wobbly hand in pen.js, and the stroke list doubles as the live-drawing timeline.
import { rng } from '../design/rng.js';
import { context, initials, design } from '../design/common.js';
import { mix, describe } from '../design/color.js';
import { esc } from '../design/svg.js';
import { Pen, ellipsePts } from './pen.js';
import { MOTIF, kit } from './motifs.js';
import { textUnits, GLYPHS, GAP, canLetter } from './glyphs.js';
import { conceptsFor, subjectsIn } from './concepts.js';
import { opsToSVG, timeline } from './render.js';
import { shapes, randomGenome } from '../learn/genome.js';

export const HAND_KINDS = ['logo', 'poster', 'card', 'pattern', 'drawing'];
export const CHOICES = {
  layout: {
    logo: ['stack', 'side', 'badge', 'perch', 'monogram', 'wordmark'],
    poster: ['hero', 'grid', 'type', 'block', 'scatter'],
    card: ['classic', 'bold'],
    pattern: ['halfdrop', 'toss'],
    drawing: ['scene', 'study'],
  },
  fill: ['flat', 'riso', 'wash', 'hatch', 'scribble', 'none'],
  nib: ['pen', 'marker', 'brush'],
  letter: ['caps', 'bold', 'bounce', 'slant', 'shadow'],
  colour: ['palette', 'natural'],
};
const RU_IND = { coffee: 'КОФЕЙНЯ', cafe: 'КАФЕ', bakery: 'ПЕКАРНЯ', restaurant: 'РЕСТОРАН', bar: 'БАР', tea: 'ЧАЙ', fitness: 'ФИТНЕС', yoga: 'ЙОГА', beauty: 'САЛОН', music: 'МУЗЫКА', kids: 'ДЕТЯМ', eco: 'ЭКО', garden: 'САД', pet: 'ЗООМАГАЗИН', books: 'КНИГИ', tech: 'ТЕХНОЛОГИИ', travel: 'ПУТЕШЕСТВИЯ', fashion: 'МОДА', pizza: 'ПИЦЦА', flowers: 'ЦВЕТЫ' };
const RU_NAME = { cup: 'чашка', bean: 'кофе', bread: 'хлеб', croissant: 'круассан', bun: 'колобок', cake: 'торт', pizza: 'пицца', icecream: 'мороженое', leaf: 'листья', tree: 'дерево', flower: 'цветок', sun: 'солнце', moon: 'луна', star: 'звезда', cloud: 'облако', wave: 'волна', mountain: 'горы', fish: 'рыба', cat: 'кот', dog: 'пёс', bird: 'птица', fly: 'муха', house: 'дом', building: 'город', heart: 'сердце', note: 'музыка', headphones: 'наушники', bolt: 'молния', gear: 'шестерёнка', rocket: 'ракета', robot: 'робот', chip: 'чип', book: 'книга', pencil: 'карандаш', eye: 'глаз', camera: 'камера', glass: 'бокал', scissors: 'ножницы', dress: 'платье', crown: 'корона', diamond: 'алмаз', key: 'ключ', anchor: 'якорь', drop: 'капля', flame: 'огонь', paw: 'лапа', bike: 'велосипед', car: 'машина', plane: 'самолёт', dumbbell: 'гантель', tooth: 'зуб', cross: 'аптечка', coin: 'монеты', chat: 'чат', smile: 'улыбка', globe: 'глобус', snail: 'улитка', mushroom: 'гриб', apple: 'яблоко' };
const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const slugOf = (s) => ([...String(s).toLowerCase()].map((c) => TR[c] ?? c).join('').normalize('NFD').replace(/[^a-z0-9]/g, '') || 'studio').slice(0, 18);

/** fill in any missing hand choices (deterministically from the seed) */
export function handChoices(spec) {
  const h = typeof spec.hand === 'object' && spec.hand ? spec.hand : {};
  const r = rng((spec.seed || 1) * 131 + 7);
  const kind = HAND_KINDS.includes(spec.kind) ? spec.kind : 'drawing';
  return {
    layout: CHOICES.layout[kind].includes(h.layout) ? h.layout : r.pick(CHOICES.layout[kind]),
    fill: CHOICES.fill.includes(h.fill) ? h.fill : r.pick(CHOICES.fill.slice(0, 5)),
    nib: CHOICES.nib.includes(h.nib) ? h.nib : r.pick(CHOICES.nib),
    letter: CHOICES.letter.includes(h.letter) ? h.letter : r.pick(CHOICES.letter),
    colour: CHOICES.colour.includes(h.colour) ? h.colour : r.pick(CHOICES.colour),
    skill: Number.isFinite(+h.skill) ? Math.max(0, Math.min(1, +h.skill)) : 0.25,
    guides: h.guides ?? r.chance(0.7),
  };
}

function setup(spec, W, H) {
  const c = context(spec), H_ = handChoices(spec), C = c.C;
  const r = rng((spec.seed || 1) * 977 + 31);
  const dark = c.dark;
  const bg = dark ? C.ink : C.paper, ink = dark ? C.paper : C.ink;
  const col = { a: C.primary, b: C.secondary, c: C.accent, k: ink, w: dark ? mix(C.paper, C.ink, 0.1) : '#ffffff', bg };
  const sc = Math.sqrt((W * H) / 1e6);
  const w = { pen: 3.4, marker: 6.5, brush: 6.5 }[H_.nib] * sc;
  const S = new Pen(r, { wobble: (5.2 - 3.8 * H_.skill) * sc, ink, w, nib: H_.nib, fill: H_.fill, guide: mix(ink, bg, 0.55) });
  const nat = H_.colour === 'natural';
  const motif = (id, x, y, size, flip = r.chance(0.35)) => { const g = kit(S, x, y, size, col, nat, flip); (MOTIF[id] || MOTIF.critter)(g); };
  const LS = { caps: {}, bold: { bold: true }, bounce: { bounce: true }, slant: { slant: 0.18 }, shadow: { bold: true, shadow: true } }[H_.letter];
  const letter = (str, cx, top, size, o = {}) => {
    const st = { ...LS, ...o };
    const m = S.text(str, cx, top, size, st);
    if (st.shadow && m.w) { const d = m.size * 0.07; S.text(str, cx + d, top + d, m.size, { ...st, c: col.c, z: 1.8, w: undefined }); }
    return m;
  };
  return { c, H: H_, r, S, col, bg, ink, motif, letter, sc, C };
}

function finish({ S, bg, c, H, r }, spec, W, H2, kind, title, notes, extra = {}) {
  S.colourIn();
  const ops = S.ops;
  timeline(ops);
  const strokes = ops.filter((o) => o.k === 's').length, fills = ops.length - strokes;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H2}" width="${W}" height="${H2}"><title>${esc(title)}</title><rect width="${W}" height="${H2}" fill="${bg}"/>${opsToSVG(ops)}</svg>`;
  const how = `Drawn by hand, stroke by stroke — ${strokes} strokes and ${fills} colour patches, no templates or fonts: the lettering is my own handwriting. Hand: ${H.nib}, colouring: ${H.fill}, layout: ${H.layout}, steadiness ${Math.round(H.skill * 100)} %.`;
  const d = design({ kind, title, svg, spec: { ...spec, hand: H }, notes: [notes, how].filter(Boolean).join('\n'), assets: extra.assets || [], palette: c.palette, w: W, h: H2 });
  d.ops = ops; d.hand = true; d.bg = bg;
  return d;
}
const mono = (ops, colour, bg, W, H, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><title>${esc(title)}</title>${bg ? `<rect width="${W}" height="${H}" fill="${bg}"/>` : ''}${opsToSVG(ops.filter((o) => o.z >= 2).map((o) => ({ ...o, c: colour })))}</svg>`;

/** draw a genome (the mind's abstract mark) freehand */
function genomeMotif(T, genome, x, y, size) {
  const sh = shapes(genome, 28), cols = [T.col.a, T.col.b, T.col.c];
  for (const s of sh) for (const poly of s.contours) T.S.shape(poly.map(([a, b]) => [x + (a * size) / 100, y + (b * size) / 100]), { fill: s.cut ? T.bg : cols[s.c] || cols[0], smooth: false });
}
function pickConcept(T, spec) {
  const cs = conceptsFor(spec);
  if (!cs.length) return null;
  return T.r.chance(0.7) ? cs[0] : T.r.pick(cs.slice(0, 3));
}

// ------------------------------------------------------------------ logo
export function handLogo(spec) {
  const W = 1200, H = 900, T = setup(spec, W, H), { S, r, col, letter } = T;
  const name = spec.name || 'Studio', tag = spec.tagline || '';
  const concept = spec.mark === 'genome' && spec.genome ? null : pickConcept(T, spec);
  const mark = (x, y, size) => { if (concept) T.motif(concept, x, y, size); else genomeMotif(T, spec.genome || randomGenome(rng((spec.seed || 1) + 99)), x, y, size * 0.95); };
  const words = name.split(/\s+/);
  const twoLines = (maxW, size) => (words.length > 1 && textUnits(name) * (size / 10) > maxW ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [name]);
  let L = T.H.layout;
  if (L === 'perch' && (!/[OО0]/i.test(name) || name.length > 11)) L = 'stack';
  if (T.H.guides) { S.guide([[80, 450], [1120, 450]]); S.guide([[600, 70], [600, 830]]); }
  if (L === 'stack') {
    if (T.H.guides) S.guide(ellipsePts(600, 290, 180, 180, 30).slice(0, -1), { closed: true });
    mark(600, 290, 340);
    const lines = twoLines(980, 130);
    let y = 520;
    for (const ln of lines) { const m = letter(ln, 600, y, lines.length > 1 ? 104 : 130, { maxW: 1000 }); y += m.size * 1.32; }
    if (tag) letter(tag, 600, y + 6, 34, { bold: false, bounce: false, shadow: false, maxW: 900, track: 2 });
    else if (r.chance(0.6)) S.curve([[600 - 220, y + 10], [600, y + r.float(18, 34)], [600 + 220, y + 6]], { w: S.w * 1.2, c: col.c });
  } else if (L === 'side') {
    mark(300, 450, 340);
    const lines = twoLines(620, 120), size = lines.length > 1 ? 100 : 120;
    let y = 450 - (lines.length * size * 1.3) / 2 + (tag ? -20 : 0);
    for (const ln of lines) { const m = letter(ln, 520, y, size, { align: 'left', maxW: 620 }); y += m.size * 1.3; }
    if (tag) letter(tag, 524, y + 10, 32, { align: 'left', bold: false, bounce: false, shadow: false, maxW: 600, track: 1.5 });
    S.line([[500, 450 - 170], [500 + r.float(-6, 6), 450 + 170]], { w: S.w * 0.8, c: col.c });
  } else if (L === 'badge') {
    const R = 330, cx = 600, cy = 450, ring = r.pick(['double', 'single', 'dotted']);
    S.circle(cx, cy, R, { fill: r.chance(0.5) ? col.w : null, w: S.w * 1.3 });
    if (ring === 'double') S.ellipseStroke(cx, cy, R - 26, R - 26, { w: S.w * 0.8 });
    if (ring === 'dotted') for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; S.dot(cx + Math.cos(a) * (R - 22), cy + Math.sin(a) * (R - 22), 3.4 * T.sc); }
    const size = Math.min(76, ((R - 70) * 2.3) / (textUnits(name, 1.2) / 10 + 2.3));
    if (size > 34) S.arcText(name, cx, cy, R - 70 - size, size, { bold: T.H.letter === 'bold' || T.H.letter === 'shadow' });
    else { S.rect(cx - 300, cy - 300, 600, 92, { fill: col.a }); letter(name, cx, cy - 280, 54, { maxW: 560, c: col.w, shadow: false }); }
    const bottom = tag || (/[а-яё]/i.test(name) ? RU_IND[spec.industry] : spec.industry) || '';
    if (bottom) S.arcText(String(bottom).toUpperCase().slice(0, 24), cx, cy, R - 70 - 34, 34, { bottom: true });
    for (const sx of [-1, 1]) MOTIF.star(kit(S, cx + sx * (R - 70), cy + 8, 30, col, false, false));
    mark(cx, cy + 8, 280);
  } else if (L === 'perch') {
    const up = name.toUpperCase(), i = [...up].findIndex((ch) => /[OО0]/.test(ch));
    let size = 170; const units = textUnits(up); if (units * size / 10 > 1040) size = 10400 / units;
    const k = size / 10, x0 = 600 - (units * k) / 2, top = 450 - size / 2 + 40;
    const pre = up.slice(0, i), post = up.slice(i + 1);
    const preU = pre ? textUnits(pre) + GAP : 0;
    if (pre) letter(pre, x0, top, size, { align: 'left' });
    if (post) letter(post, x0 + (preU + GLYPHS.O.w + GAP) * k, top, size, { align: 'left' });
    mark(x0 + (preU + GLYPHS.O.w / 2) * k, top + size / 2, size * 1.5);
    if (tag) letter(tag, 600, top + size + 70, 34, { bold: false, bounce: false, shadow: false, maxW: 900, track: 2 });
  } else if (L === 'monogram') {
    const ini = initials(name, 2), shape = r.pick(['circle', 'square', 'blob']);
    if (shape === 'circle') S.circle(600, 360, 230, { fill: col.a });
    else if (shape === 'square') S.rect(370, 130, 460, 460, { fill: col.a });
    else { const pts = []; for (let j = 0; j < 12; j++) { const a = (j / 12) * Math.PI * 2; const rr = 230 * (1 + r.float(-0.08, 0.08)); pts.push([600 + Math.cos(a) * rr, 360 + Math.sin(a) * rr]); } S.shape(pts, { fill: col.a, smooth: true }); }
    letter(ini, 600, 360 - 110, 220, { maxW: 380, c: col.w, shadow: false });
    if (concept) T.motif(concept, 600 + 190, 360 + 170, 150);
    letter(name, 600, 670, 74, { maxW: 980, bold: false, shadow: false, track: 3 });
    if (tag) letter(tag, 600, 780, 30, { bold: false, bounce: false, shadow: false, maxW: 900 });
  } else {      // wordmark
    const lines = twoLines(1000, 170); let y = 450 - (lines.length * 170 * 1.25) / 2 + 20;
    const textTop = y; let mw = 0;
    for (const ln of lines) { const m = letter(ln, 600, y, lines.length > 1 ? 140 : 170, { maxW: 1020, bold: true }); mw = Math.max(mw, m.w); y += m.size * 1.25; }
    S.curve([[600 - mw / 2, y + 4], [600 - mw / 6, y + 26], [600 + mw / 4, y + 4], [600 + mw / 2 + 30, y + 22]], { w: S.w * 1.6, c: col.a, nib: 'brush' });
    if (tag) letter(tag, 600, y + 60, 34, { bold: false, bounce: false, shadow: false, maxW: 900, track: 2 });
    if (concept) T.motif(concept, Math.min(1060, 600 + mw / 2 - 20), Math.max(100, textTop - 105), 170);
  }
  if (r.chance(0.35) && L !== 'badge') for (let j = 0; j < r.int(2, 4); j++) { const x = r.pick([r.float(90, 300), r.float(900, 1110)]), y = r.float(90, 810); S.line([[x - 9, y], [x + 9, y]], { w: S.w * 0.7, c: col.c }); S.line([[x, y - 9], [x, y + 9]], { w: S.w * 0.7, c: col.c }); }
  const title = `${name} — hand-drawn logo`;
  const what = concept ? `I drew a ${concept === 'bun' ? 'kolobok' : concept} because it says “${spec.industry || spec.name}” at a glance` : 'No obvious object for this one, so I drew an abstract mark from my own evolved shapes';
  const notes = `**${name}** — a ${L} logo, drawn freehand. ${what}.\nColour: ${describe(T.C.primary)} (${T.C.primary}) with ${describe(T.C.accent)} as the spark.`;
  T.S.colourIn();
  const assets = [
    { name: 'logo-mono.svg', svg: mono(T.S.ops, T.ink, T.bg, W, H, `${name} — mono`) },
    { name: 'logo-reversed.svg', svg: mono(T.S.ops, T.bg, T.ink, W, H, `${name} — reversed`) },
  ];
  return finish(T, spec, W, H, 'logo', title, notes, { assets });
}

// ------------------------------------------------------------------ poster
/** best-candidate placement: each new item goes where it's furthest from everything already placed */
function place(r, n, sizes, box, avoid = []) {
  const out = [];
  for (let i = 0; i < n; i++) {
    let best = null, bs = -Infinity;
    for (let k = 0; k < 40; k++) {
      const s = sizes[i], x = r.float(box.x0 + s / 2, box.x1 - s / 2), y = r.float(box.y0 + s / 2, box.y1 - s / 2);
      let d = Infinity;
      for (const p of out) d = Math.min(d, Math.hypot(p.x - x, p.y - y) - (p.s + s) / 2);
      for (const a of avoid) { const dx = Math.max(a.x0 - x, 0, x - a.x1), dy = Math.max(a.y0 - y, 0, y - a.y1); d = Math.min(d, Math.hypot(dx, dy) - s / 2); }
      if (d > bs) { bs = d; best = { x, y, s }; }
    }
    out.push(best);
  }
  return out;
}

export function handPoster(spec) {
  const W = 840, H = 1188, T = setup(spec, W, H), { S, r, col, letter } = T;
  const title = spec.name || 'Untitled';
  const details = [spec.date, spec.tagline, ...(Array.isArray(spec.details) ? spec.details : [])].filter(Boolean).slice(0, 3);
  const cs = conceptsFor(spec); const concept = cs[0] || 'critter';
  const L = T.H.layout;
  const block = (y, size, maxW = 720) => { let yy = y; for (const ln of details) { letter(ln, W / 2, yy, size, { maxW, bold: false, shadow: false, bounce: false }); yy += size * 1.6; } return yy; };
  if (r.chance(0.5)) S.rect(28, 28, W - 56, H - 56, { w: S.w * 0.9 });
  if (L === 'hero') {
    if (T.H.guides) S.guide([[W / 2, 90], [W / 2, 760]]);
    if (r.chance(0.5)) S.circle(W / 2, 430, 300, { fill: col.b, ink: r.chance(0.5) });
    T.motif(concept, W / 2, 430, 520);
    const m = letter(title, W / 2, 820, 110, { maxW: 740 });
    block(820 + m.size + 50, 34);
  } else if (L === 'grid') {
    const n = 3, cell = 220, x0 = W / 2 - cell * 1.5, y0 = 90, hi = r.int(0, 8);
    for (let i = 0; i < 9; i++) { const gx = x0 + (i % 3) * cell + cell / 2, gy = y0 + Math.floor(i / 3) * cell + cell / 2; if (i === hi) S.circle(gx, gy, cell * 0.44, { fill: col.c, ink: false }); T.motif(cs.length > 1 && i % 2 ? cs[1] : concept, gx, gy, cell * 0.72); }
    const m = letter(title, W / 2, y0 + cell * n + 50, 100, { maxW: 740 });
    block(y0 + cell * n + 50 + m.size + 44, 32);
  } else if (L === 'type') {
    const words = title.split(/\s+/).slice(0, 4); let y = 110;
    for (const w of words) { const m = letter(w, W / 2, y, 200, { maxW: 740, bold: true }); y += m.size * 1.25; }
    T.motif(concept, W - 240, Math.max(y + 170, 820), 300);
    let yy = Math.max(y + 60, 900);
    for (const ln of details) { letter(ln, 80, yy, 32, { align: 'left', maxW: 400, bold: false, shadow: false, bounce: false }); yy += 52; }
  } else if (L === 'block') {
    const pts = [[60, 60], [W - 60, 60], [W - 60, 700 + r.float(-30, 30)], [60, 680 + r.float(-30, 30)]];
    S.shape(pts, { fill: col.a, ink: r.chance(0.5) });
    T.motif(concept, W / 2, 380, 470);
    const m = letter(title, W / 2, 770, 104, { maxW: 740 });
    block(770 + m.size + 44, 32);
  } else {      // scatter
    const labelH = 150 + Math.min(2, details.length) * 46, lab = { x0: 90, y0: H / 2 - labelH / 2, x1: W - 90, y1: H / 2 + labelH / 2 };
    const ids = cs.length ? cs.slice(0, 3) : ['star', 'critter'];
    const n = r.int(6, 9), sizes = Array.from({ length: n }, (_, i) => (i < 2 ? 230 : r.float(110, 170)));
    for (const [i, p] of place(r, n, sizes, { x0: 40, y0: 40, x1: W - 40, y1: H - 40 }, [lab]).entries()) T.motif(ids[i % ids.length], p.x, p.y, p.s);
    S.rect(lab.x0, lab.y0, lab.x1 - lab.x0, labelH, { fill: col.w });
    const m = letter(title, W / 2, lab.y0 + 40, 96, { maxW: lab.x1 - lab.x0 - 60 });
    let yy = lab.y0 + 40 + m.size + 30;
    for (const ln of details.slice(0, 2)) { letter(ln, W / 2, yy, 28, { maxW: 560, bold: false, shadow: false, bounce: false }); yy += 44; }
  }
  const notes = `**${title}** — a hand-drawn poster (${L} layout). ${L === 'scatter' ? 'I placed the doodles one by one wherever there was the most room left (best-candidate search), keeping the label clear.' : L === 'grid' ? 'Nine of the same thing, each drawn separately — no two come out alike, which is the point.' : 'One big image, one big line of lettering, everything else small.'}`;
  return finish(T, spec, W, H, 'poster', `${title} — hand-drawn poster`, notes);
}

// ------------------------------------------------------------------ business card
export function handCard(spec) {
  const W = 1050, CH = 600, GAPY = 70, H = CH * 2 + GAPY + 80, T = setup(spec, W, H), { S, r, col, letter } = T;
  const name = spec.name || 'Studio', concept = pickConcept(T, spec) || 'star', slug = slugOf(name);
  const y1 = 40, y2 = 40 + CH + GAPY, bold = T.H.layout === 'bold';
  S.rect(40, y1, W - 80, CH, { fill: bold ? col.a : col.w });
  T.motif(concept, W / 2, y1 + 230, 250);
  letter(name, W / 2, y1 + 400, 84, { maxW: 820, c: bold ? col.w : undefined, shadow: false });
  S.rect(40, y2, W - 80, CH, { fill: bold ? col.w : col.b });
  letter(name, 110, y2 + 90, 54, { align: 'left', maxW: 600, shadow: false });
  if (spec.tagline) letter(spec.tagline, 110, y2 + 170, 28, { align: 'left', maxW: 760, bold: false, bounce: false, shadow: false });
  S.line([[110, y2 + 240], [W - 110, y2 + 240 + r.float(-6, 6)]], { w: S.w * 0.8, c: col.c });
  [`HELLO@${slug}.COM`, `WWW.${slug}.COM`, '+1 555 0142'].forEach((t, i) => letter(t, 110, y2 + 300 + i * 70, 34, { align: 'left', maxW: 760, bold: false, bounce: false, shadow: false }));
  T.motif(concept, W - 200, y2 + 400, 170);
  const notes = `**${name}** — business card, front and back (85 × 55 mm proportions), drawn by hand. The contact lines are placeholders — tell me the real ones.`;
  return finish(T, spec, W, H, 'card', `${name} — hand-drawn business card`, notes);
}

// ------------------------------------------------------------------ pattern / wrapping paper
export function handPattern(spec) {
  const W = 1000, H = 1000, T = setup(spec, W, H), { S, r, col } = T;
  const cs = conceptsFor(spec), ids = cs.length ? cs.slice(0, 3) : r.shuffle(['star', 'heart', 'leaf', 'flower', 'sun', 'cloud', 'fish']).slice(0, 3);
  S.rect(0, 0, W, H, { fill: r.chance(0.5) ? col.w : mix(col.b, '#ffffff', 0.55), ink: false, solid: true });
  S.colourIn('flat');
  const n = 4, cell = W / n;
  const pos = [];
  if (T.H.layout === 'halfdrop') { for (let i = 0; i < n; i++) for (let j = -1; j < n; j++) pos.push([cell * (i + 0.5), cell * (j + 0.5 + (i % 2) * 0.5)]); }
  else for (const p of place(r, 18, Array(18).fill(cell * 0.62), { x0: 0, y0: 0, x1: W, y1: H })) pos.push([p.x, p.y]);
  pos.forEach(([x, y], i) => { if (y < -cell * 0.2 || y > H + cell * 0.2) return; T.motif(ids[i % ids.length], x, y, cell * r.float(0.5, 0.62)); });
  for (let i = 0; i < 40; i++) { const x = r.float(10, W - 10), y = r.float(10, H - 10); if (r.chance(0.5)) S.dot(x, y, 4 * T.sc, { c: col.c }); else S.line([[x - 6, y + 3], [x + 6, y - 3]], { w: S.w * 0.7, c: col.a }); }
  const notes = `Wrapping-paper style sheet of ${ids.join(', ')} — every repeat drawn separately, so it isn't seamless (that's the charm). For a mathematically seamless tile, ask for the template version.`;
  return finish(T, spec, W, H, 'pattern', 'Hand-drawn pattern sheet', notes);
}

// ------------------------------------------------------------------ free drawing
export function handDrawing(spec) {
  const W = 1200, H = 900, T = setup(spec, W, H), { S, r, col, letter } = T;
  const known = conceptsFor(spec);
  const unknownFirst = spec.caption && !subjectsIn(spec.caption.split(/\s+/)[0]).length;
  const ids = (unknownFirst ? ['critter', ...known] : known.length ? known : ['critter']).slice(0, 3);
  const n = ids.length, ground = r.float(700, 760);
  if (T.H.layout === 'scene') {
    S.curve([[40, ground + r.float(-10, 10)], [400, ground + r.float(-14, 14)], [800, ground + r.float(-14, 14)], [1160, ground + r.float(-10, 10)]], { w: S.w * 0.9 });
    for (let i = 0; i < r.int(4, 8); i++) { const x = r.float(60, 1140), y = ground + r.float(4, 40); S.line([[x - 6, y], [x - 2, y - 14]], { w: S.w * 0.6 }); S.line([[x + 4, y], [x + 6, y - 12]], { w: S.w * 0.6 }); }
  }
  const size = n === 1 ? 560 : n === 2 ? 420 : 340;
  const xs = n === 1 ? [600] : n === 2 ? [380, 820] : [260, 600, 940];
  ids.forEach((id, i) => {
    const y = ground - size / 2 + (id === 'moon' || id === 'star' || id === 'cloud' || id === 'sun' || id === 'bird' || id === 'plane' ? -170 : 0);
    if (T.H.layout === 'scene') S.fill([[xs[i] - size * 0.35, ground + 4], [xs[i] + size * 0.35, ground + 4], [xs[i] + size * 0.3, ground + 22], [xs[i] - size * 0.3, ground + 22]], mix(T.ink, T.bg, 0.75), 'hatch', 1);
    T.motif(id, xs[i], Math.max(size / 2 + 30, y), size);
  });
  const decorIds = ids.some((x) => x === 'moon' || x === 'star') ? ['star', 'star'] : r.shuffle(['cloud', 'sun', 'bird', 'star']).slice(0, r.int(0, 2));
  const spots = place(r, decorIds.length, decorIds.map(() => 130), { x0: 40, y0: 30, x1: W - 40, y1: ground - 380 }, xs.map((x) => ({ x0: x - size / 2, y0: ground - size, x1: x + size / 2, y1: ground })));
  decorIds.forEach((id, i) => { if (spots[i]) T.motif(id, spots[i].x, spots[i].y, id === 'star' ? 60 : 120); });
  const cap = spec.caption || ids.filter((x) => x !== 'critter').map((x) => (spec.lang === 'ru' ? RU_NAME[x] : x === 'bun' ? 'kolobok' : x === 'icecream' ? 'ice cream' : x)).join(spec.lang === 'ru' ? ' и ' : ' & ');
  if (cap && canLetter(cap)) letter(cap, 600, ground + 70, 52, { maxW: 900, bold: false, shadow: false });
  letter(spec.lang === 'ru' ? '– муха' : '– fly', 1120, 845, 26, { align: 'right', bold: false, shadow: false, bounce: false, c: col.c });
  const unknown = unknownFirst;
  const notes = unknown ? `I've never seen a “${spec.caption.split(/\s+/)[0]}”, so this is my best guess — an invented creature. Tell me what it looks like (or pick something I know: cat, dog, bird, fish, house, tree, flower, rocket, robot…).` : `A freehand drawing of ${ids.join(', ')}.`;
  return finish(T, spec, W, H, 'drawing', `${cap ? cap[0].toUpperCase() + cap.slice(1) : 'Drawing'} — sketch`, notes);
}

export const HAND = { logo: handLogo, poster: handPoster, card: handCard, pattern: handPattern, drawing: handDrawing };
