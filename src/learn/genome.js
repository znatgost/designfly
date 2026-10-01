// A logo mark as a genome: a short list of primitive "genes" (shapes, bands, blobs, cuts) plus a
// symmetry rule. No templates — every mark the mind proposes is assembled from these genes and
// changed by mutation and crossover. The same geometry feeds the SVG renderer and a tiny pure-JS
// rasterizer (what the fly "sees"), so it runs identically in the browser and in Node.
import { rng } from '../design/rng.js';

const TAU = Math.PI * 2;
export const TYPES = ['circle', 'ellipse', 'rect', 'tri', 'poly', 'star', 'ring', 'arc', 'blob', 'petal', 'bar', 'semi'];
const ROUND = new Set(['circle', 'ellipse', 'ring', 'arc', 'blob', 'petal', 'semi']);
const STROKE = new Set(['ring', 'arc', 'bar']);
export const isRound = (t) => ROUND.has(t);
export const isStroke = (t) => STROKE.has(t);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const R1 = (x) => Math.round(x * 10) / 10;

// ------------------------------------------------------------------ genes
export function randomGene(r, cut = false) {
  const t = r.weighted([['circle', 3], ['ellipse', 1], ['rect', 2], ['tri', 2], ['poly', 1.5], ['star', 1], ['ring', 2.5], ['arc', 2], ['blob', 1], ['petal', 2], ['bar', 2], ['semi', 2]]);
  return {
    t, x: R1(r.float(-22, 22)), y: R1(r.float(-22, 22)), s: R1(r.float(10, 40)), a: R1(r.float(0.5, 1.4) * 10) / 10,
    rot: Math.round(r.pick([0, 0, 45, 90, r.float(0, 360)])), p: Math.round(r.float(0.15, 0.85) * 100) / 100, n: r.int(3, 8),
    v: Array.from({ length: 6 }, () => Math.round(r.float(0.65, 1.15) * 100) / 100), c: r.int(0, 2), cut,
  };
}
export function randomGenome(r) {
  // a composition archetype gives the genes a relationship to each other (concentric, stacked,
  // orbiting, radial …) — otherwise random shapes rarely read as one mark
  const arch = r.weighted([['concentric', 3], ['stack', 2], ['orbit', 2], ['radial', 3], ['mirror', 3], ['free', 2], ['knockout', 2]]);
  const snap = (v) => Math.round(v / 4) * 4;
  const genes = [];
  const n = r.weighted([[1, 1], [2, 4], [3, 3], [4, 1]]);
  let sym = 'none', rn = 0;
  for (let i = 0; i < n; i++) {
    const ge = randomGene(r);
    if (arch === 'concentric') { ge.x = 0; ge.y = 0; ge.s = Math.max(6, 40 - i * r.float(8, 14)); ge.c = i % 3; if (i && r.chance(0.3)) ge.t = r.pick(['ring', 'circle', 'poly', 'star']); }
    else if (arch === 'stack') { ge.x = 0; ge.y = snap(-24 + (48 * i) / Math.max(1, n - 1)) * (n > 1 ? 1 : 0); ge.s = r.float(12, 26); ge.a = r.float(0.3, 0.8); ge.rot = r.pick([0, 0, 180]); }
    else if (arch === 'orbit') { if (i === 0) { ge.x = 0; ge.y = 0; ge.s = r.float(24, 36); } else { const t = r.float(0, Math.PI * 2), d = r.float(26, 36); ge.x = Math.cos(t) * d; ge.y = Math.sin(t) * d; ge.s = r.float(5, 12); ge.c = (genes[0].c + i) % 3; } }
    else if (arch === 'radial') { sym = 'radial'; rn = r.int(3, 8); ge.x = 0; ge.y = snap(-r.float(10, 26)); ge.s = r.float(8, 20); if (r.chance(0.5)) ge.t = r.pick(['petal', 'circle', 'tri', 'bar', 'arc']); ge.rot = ge.t === 'petal' || ge.t === 'bar' ? 90 : ge.rot; }
    else if (arch === 'mirror') { sym = 'mirror'; ge.x = snap(r.float(4, 22)); ge.y = snap(r.float(-20, 20)); ge.s = r.float(10, 26); }
    else if (arch === 'knockout') { if (i === 0) { ge.x = 0; ge.y = 0; ge.s = r.float(32, 42); ge.t = r.pick(['circle', 'rect', 'poly', 'blob', 'semi']); } else { ge.cut = true; ge.x = snap(r.float(-14, 14)); ge.y = snap(r.float(-14, 14)); ge.s = r.float(6, 18); } }
    else { ge.x = snap(ge.x); ge.y = snap(ge.y); }
    genes.push(ge);
  }
  if (arch === 'knockout' && genes.length < 2) genes.push({ ...randomGene(r, true), x: 0, y: 0, s: 14 });
  if (arch === 'free' || arch === 'concentric') { sym = r.weighted([['none', 3], ['mirror', 1]]); }
  if (r.chance(0.12) && arch !== 'knockout') genes.push({ ...randomGene(r, true), x: 0, y: 0 });
  return cleanGenome({ genes, sym, n: rn, blend: r.chance(0.15) ? 'multiply' : 'normal' }) || { genes: [randomGene(r)], sym: 'none', n: 0, blend: 'normal' };
}

/** clamp / repair anything (stored, mutated or LLM-provided) into a valid genome */
export function cleanGenome(g) {
  if (!g || !Array.isArray(g.genes)) return null;
  const genes = g.genes.slice(0, 7).filter((x) => x && TYPES.includes(x.t)).map((x) => ({
    t: x.t, x: R1(clamp(+x.x || 0, -45, 45)), y: R1(clamp(+x.y || 0, -45, 45)), s: R1(clamp(+x.s || 20, 4, 48)), a: Math.round(clamp(+x.a || 1, 0.25, 2) * 100) / 100,
    rot: Math.round(((+x.rot || 0) % 360 + 360) % 360), p: Math.round(clamp(+x.p || 0.5, 0.05, 0.95) * 100) / 100, n: Math.round(clamp(+x.n || 5, 3, 9)),
    v: (Array.isArray(x.v) && x.v.length === 6 ? x.v : [1, 1, 1, 1, 1, 1]).map((k) => Math.round(clamp(+k || 1, 0.4, 1.4) * 100) / 100), c: Math.round(clamp(+x.c || 0, 0, 2)), cut: !!x.cut,
  }));
  if (!genes.some((x) => !x.cut)) return null;
  const sym = ['none', 'mirror', 'radial'].includes(g.sym) ? g.sym : 'none';
  return { genes, sym, n: sym === 'radial' ? Math.round(clamp(+g.n || 4, 2, 8)) : 0, blend: g.blend === 'multiply' ? 'multiply' : 'normal' };
}

export function mutate(g0, r, strength = 1) {
  const g = JSON.parse(JSON.stringify(g0));
  const k = r.int(1, 2 + Math.round(strength));
  for (let i = 0; i < k; i++) {
    const op = r.weighted([['tweak', 8], ['color', 2], ['type', 1.5], ['add', 1.2], ['remove', 1], ['sym', 1], ['order', 0.6], ['cut', 0.6], ['dup', 0.6], ['blend', 0.2]]);
    const gi = r.int(0, g.genes.length - 1), ge = g.genes[gi];
    if (op === 'tweak') {
      const f = r.pick(['x', 'y', 's', 'a', 'rot', 'p', 'n', 'v']);
      const sd = strength;
      if (f === 'x' || f === 'y') ge[f] += r.float(-8, 8) * sd;
      else if (f === 's') ge.s *= Math.exp(r.float(-0.3, 0.3) * sd);
      else if (f === 'a') ge.a *= Math.exp(r.float(-0.25, 0.25) * sd);
      else if (f === 'rot') ge.rot += r.pick([-45, -15, 15, 45, 90, r.float(-30, 30)]);
      else if (f === 'p') ge.p += r.float(-0.15, 0.15) * sd;
      else if (f === 'n') ge.n += r.pick([-1, 1]);
      else ge.v[r.int(0, 5)] *= Math.exp(r.float(-0.25, 0.25) * sd);
    } else if (op === 'color') ge.c = (ge.c + r.int(1, 2)) % 3;
    else if (op === 'type') ge.t = r.pick(TYPES);
    else if (op === 'add' && g.genes.length < 6) g.genes.splice(r.int(0, g.genes.length), 0, randomGene(r, r.chance(0.2)));
    else if (op === 'remove' && g.genes.length > 1) g.genes.splice(gi, 1);
    else if (op === 'sym') { g.sym = r.pick(['none', 'mirror', 'radial']); g.n = g.sym === 'radial' ? r.int(3, 6) : 0; }
    else if (op === 'order' && g.genes.length > 1) { const j = r.int(0, g.genes.length - 1); [g.genes[gi], g.genes[j]] = [g.genes[j], g.genes[gi]]; }
    else if (op === 'cut') ge.cut = !ge.cut;
    else if (op === 'dup' && g.genes.length < 6) { const d = JSON.parse(JSON.stringify(ge)); d.s *= 0.6; d.c = (d.c + 1) % 3; g.genes.push(d); }
    else if (op === 'blend') g.blend = g.blend === 'multiply' ? 'normal' : 'multiply';
  }
  return cleanGenome(g) || g0;
}

export function crossover(a, b, r) {
  const genes = [];
  const n = Math.max(a.genes.length, b.genes.length);
  for (let i = 0; i < n; i++) { const src = r.chance(0.5) ? a : b; if (src.genes[i]) genes.push(JSON.parse(JSON.stringify(src.genes[i]))); }
  const s = r.chance(0.5) ? a : b;
  return cleanGenome({ genes: genes.slice(0, 6), sym: s.sym, n: s.n, blend: (r.chance(0.5) ? a : b).blend }) || a;
}

// ------------------------------------------------------------------ geometry
function circlePts(rx, ry, N, a0 = 0, a1 = TAU) {
  const out = [];
  for (let i = 0; i < N; i++) { const t = a0 + ((a1 - a0) * i) / (a1 - a0 >= TAU - 1e-9 ? N : N - 1); out.push([rx * Math.cos(t), ry * Math.sin(t)]); }
  return out;
}
/** local contours (before transform) for a gene; returns array of polygons (evenodd) */
function localContours(ge, N) {
  const s = ge.s, a = ge.a, p = ge.p;
  switch (ge.t) {
    case 'circle': return [circlePts(s, s, N)];
    case 'ellipse': return [circlePts(s, s * a, N)];
    case 'rect': {
      const w = s, h = s * a, rr = Math.min(w, h) * p * 0.9, q = Math.max(3, Math.round(N / 8)), pts = [];
      for (const [cx, cy, a0] of [[w - rr, h - rr, 0], [-w + rr, h - rr, Math.PI / 2], [-w + rr, -h + rr, Math.PI], [w - rr, -h + rr, Math.PI * 1.5]])
        for (let i = 0; i <= q; i++) { const t = a0 + (i / q) * (Math.PI / 2); pts.push([cx + rr * Math.cos(t), cy + rr * Math.sin(t)]); }
      return [pts];
    }
    case 'tri': return [[0, 1, 2].map((i) => { const t = -Math.PI / 2 + (i * TAU) / 3; return [s * Math.cos(t), s * a * Math.sin(t) + s * 0.15]; })];
    case 'poly': return [Array.from({ length: ge.n }, (_, i) => { const t = -Math.PI / 2 + (i * TAU) / ge.n; return [s * Math.cos(t), s * Math.sin(t)]; })];
    case 'star': { const n = Math.max(3, ge.n), ri = s * (0.3 + 0.5 * p); return [Array.from({ length: n * 2 }, (_, i) => { const t = -Math.PI / 2 + (i * Math.PI) / n, r = i % 2 ? ri : s; return [r * Math.cos(t), r * Math.sin(t)]; })]; }
    case 'ring': { const th = Math.max(1.5, s * (0.1 + 0.35 * p)); return [circlePts(s, s * a, N), circlePts(s - th, (s - th) * a, N).reverse()]; }
    case 'arc': {
      const th = Math.max(1.5, s * (0.12 + 0.3 * a * 0.5)), sweep = Math.PI * (0.4 + 1.3 * p), a0 = -sweep / 2, M = Math.max(6, Math.round((N * sweep) / TAU));
      const outer = circlePts(s, s, M, a0, a0 + sweep), inner = circlePts(s - th, s - th, M, a0, a0 + sweep).reverse();
      return [[...outer, ...inner]];
    }
    case 'blob': {
      const out = [];
      for (let i = 0; i < N; i++) {
        const t = (i / N) * TAU, u = (t / TAU) * 6, k = Math.floor(u), f = u - k, e = (1 - Math.cos(f * Math.PI)) / 2;
        const rr = s * (ge.v[k % 6] * (1 - e) + ge.v[(k + 1) % 6] * e);
        out.push([rr * Math.cos(t), rr * a * Math.sin(t)]);
      }
      return [out];
    }
    case 'petal': {
      const L = s, W = s * (0.25 + 0.5 * p), M = Math.max(8, N / 2), out = [];
      for (let i = 0; i <= M; i++) { const t = i / M, x = -L + 2 * L * t; out.push([x, -W * Math.sin(Math.PI * t)]); }
      for (let i = M - 1; i > 0; i--) { const t = i / M, x = -L + 2 * L * t; out.push([x, W * Math.sin(Math.PI * t)]); }
      return [out];
    }
    case 'bar': {
      const L = s, th = Math.max(2, s * (0.1 + 0.3 * p) * a), q = Math.max(4, Math.round(N / 6)), out = [];
      for (let i = 0; i <= q; i++) { const t = -Math.PI / 2 + (i / q) * Math.PI; out.push([L - th + th * Math.cos(t), th * Math.sin(t)]); }
      for (let i = 0; i <= q; i++) { const t = Math.PI / 2 + (i / q) * Math.PI; out.push([-L + th + th * Math.cos(t), th * Math.sin(t)]); }
      return [out];
    }
    case 'semi': return [[...circlePts(s, s * a, Math.max(8, N / 2), Math.PI, TAU), [s, 0], [-s, 0]]];
    default: return [circlePts(s, s, N)];
  }
}
/** all shapes of a genome after transform + symmetry: [{ contours, c, cut }] in mark space (−50..50) */
export function shapes(g, N = 48) {
  const out = [];
  for (const ge of g.genes) {
    const rot = (ge.rot * Math.PI) / 180, cs = Math.cos(rot), sn = Math.sin(rot);
    const base = localContours(ge, N).map((poly) => poly.map(([x, y]) => [x * cs - y * sn + ge.x, x * sn + y * cs + ge.y]));
    const copies = [base];
    if (g.sym === 'mirror') copies.push(base.map((poly) => poly.map(([x, y]) => [-x, y]).reverse()));
    if (g.sym === 'radial') for (let k = 1; k < g.n; k++) { const t = (k * TAU) / g.n, c2 = Math.cos(t), s2 = Math.sin(t); copies.push(base.map((poly) => poly.map(([x, y]) => [x * c2 - y * s2, x * s2 + y * c2]))); }
    for (const contours of copies) out.push({ contours, c: ge.c, cut: ge.cut });
  }
  // auto-fit: centre the ink's bounding box and shrink it into the 92-unit safe area (a designer
  // always centres and sizes the mark; how much shrinking was needed is reported as "overflow")
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const sh of out) if (!sh.cut) for (const poly of sh.contours) for (const [x, y] of poly) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const ext = Math.max(x1 - x0, y1 - y0) / 2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const k = ext > 46 ? 46 / ext : ext < 24 ? Math.min(1.6, 30 / Math.max(ext, 1)) : 1;
  out.overflow = Math.max(0, ext - 50) / 50;
  if (Number.isFinite(cx)) for (const sh of out) sh.contours = sh.contours.map((poly) => poly.map(([x, y]) => [(x - cx) * k, (y - cy) * k]));
  return out;
}

// ------------------------------------------------------------------ SVG
const d = (contours) => contours.map((poly) => 'M' + poly.map(([x, y]) => `${R1(x)} ${R1(y)}`).join('L') + 'Z').join('');
/** svg fragment in a 100×100 box centred on 0 (same convention as design/marks.js) */
export function genomeSVG(g, cols, id = 'g') {
  const sh = shapes(g, 72);
  const fills = sh.filter((x) => !x.cut), cuts = sh.filter((x) => x.cut);
  const body = fills.map((x) => `<path d="${d(x.contours)}" fill="${cols[x.c] || cols[0]}" fill-rule="evenodd"/>`).join('');
  // "multiply" genomes overlap translucently (true multiply would vanish on dark backgrounds)
  const style = g.blend === 'multiply' ? ' opacity=".88"' : '';
  if (!cuts.length) return `<g${style}>${body}</g>`;
  const mid = 'gm' + id;
  return `<mask id="${mid}" maskUnits="userSpaceOnUse" x="-60" y="-60" width="120" height="120"><rect x="-60" y="-60" width="120" height="120" fill="#fff"/>${cuts.map((x) => `<path d="${d(x.contours)}" fill="#000" fill-rule="evenodd"/>`).join('')}</mask><g mask="url(#${mid})"${style}>${body}</g>`;
}
export function genomeDoc(g, cols, size = 200, bg = '#ffffff', id = 't') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120" width="${size}" height="${size}"><rect x="-60" y="-60" width="120" height="120" fill="${bg}"/>${genomeSVG(g, cols, id)}</svg>`;
}

// ------------------------------------------------------------------ raster (what the fly sees)
export const RES = 32;
function inside(contours, x, y) {
  let c = false;
  for (const poly of contours) for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
/** Int8Array RES×RES: −1 background, 0..2 colour index (topmost wins); also counts overflow beyond ±50 */
export function rasterize(g) {
  const sh = shapes(g, 20);
  const px = new Int8Array(RES * RES).fill(-1);
  const overflow = sh.overflow || 0;
  for (const s of sh) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const poly of s.contours) for (const [x, y] of poly) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    s.bb = [x0, x1, y0, y1];
  }
  const step = 100 / RES;
  const paint = (s, val) => {
    const [x0, x1, y0, y1] = s.bb;
    const i0 = Math.max(0, Math.floor((x0 + 50) / step)), i1 = Math.min(RES - 1, Math.ceil((x1 + 50) / step));
    const j0 = Math.max(0, Math.floor((y0 + 50) / step)), j1 = Math.min(RES - 1, Math.ceil((y1 + 50) / step));
    for (let j = j0; j <= j1; j++) { const y = -50 + (j + 0.5) * step; for (let i = i0; i <= i1; i++) { const x = -50 + (i + 0.5) * step; if (inside(s.contours, x, y)) px[j * RES + i] = val; } }
  };
  for (const s of sh) if (!s.cut) paint(s, s.c);
  for (const s of sh) if (s.cut) paint(s, -1);
  return { px, overflow };
}
export const genomeKey = (g) => JSON.stringify(g);
export const seedRng = (s) => rng(s);
