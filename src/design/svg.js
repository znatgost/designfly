// Tiny SVG string builder shared by all generators (no DOM needed).
import { round } from './rng.js';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const KEEP = new Set(['viewBox', 'textLength', 'lengthAdjust', 'startOffset', 'baseFrequency', 'numOctaves', 'xChannelSelector', 'yChannelSelector',
  'stdDeviation', 'patternUnits', 'patternContentUnits', 'patternTransform', 'gradientUnits', 'gradientTransform', 'preserveAspectRatio', 'clipPathUnits',
  'markerWidth', 'markerHeight', 'refX', 'refY', 'maskUnits', 'filterUnits', 'spreadMethod', 'tableValues', 'stitchTiles']);
const num = (v) => (typeof v === 'number' ? String(round(v, 2)) : v);

export function el(name, attrs = {}, ...children) {
  let a = '';
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    const key = KEEP.has(k) ? k : k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
    a += ` ${key === 'class-name' ? 'class' : key}="${esc(num(v))}"`;
  }
  const body = children.flat(Infinity).filter((c) => c !== undefined && c !== null && c !== false).join('');
  return body ? `<${name}${a}>${body}</${name}>` : `<${name}${a}/>`;
}
export const g = (attrs, ...c) => el('g', attrs, ...c);
export const rect = (x, y, w, h, attrs = {}) => el('rect', { x, y, width: w, height: h, ...attrs });
export const circle = (cx, cy, r, attrs = {}) => el('circle', { cx, cy, r, ...attrs });
export const line = (x1, y1, x2, y2, attrs = {}) => el('line', { x1, y1, x2, y2, ...attrs });
export const path = (d, attrs = {}) => el('path', { d, ...attrs });
export const poly = (pts, attrs = {}) => el('polygon', { points: pts.map((p) => p.map((v) => round(v, 2)).join(',')).join(' '), ...attrs });
export const polyline = (pts, attrs = {}) => el('polyline', { points: pts.map((p) => p.map((v) => round(v, 2)).join(',')).join(' '), fill: 'none', ...attrs });
export function text(x, y, str, attrs = {}) { return el('text', { x, y, ...attrs }, esc(str)); }
export const P = (pts, close = true) => 'M' + pts.map((p) => `${round(p[0], 2)} ${round(p[1], 2)}`).join('L') + (close ? 'Z' : '');

export function regularPolygon(cx, cy, r, n, rot = -Math.PI / 2) {
  return Array.from({ length: n }, (_, i) => [cx + r * Math.cos(rot + (i * 2 * Math.PI) / n), cy + r * Math.sin(rot + (i * 2 * Math.PI) / n)]);
}
export function star(cx, cy, r1, r2, n, rot = -Math.PI / 2) {
  return Array.from({ length: n * 2 }, (_, i) => { const r = i % 2 ? r2 : r1, a = rot + (i * Math.PI) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
}
export function arcPath(cx, cy, r, a0, a1) {
  const p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)], p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
  const large = Math.abs(a1 - a0) % (2 * Math.PI) > Math.PI ? 1 : 0;
  return `M${round(p0[0])} ${round(p0[1])}A${round(r)} ${round(r)} 0 ${large} ${a1 > a0 ? 1 : 0} ${round(p1[0])} ${round(p1[1])}`;
}
/** Catmull-Rom → cubic bezier path through points */
export function smooth(pts, close = false, k = 0.5) {
  const n = pts.length;
  if (n < 3) return P(pts, close);
  const at = (i) => pts[close ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${round(pts[0][0])} ${round(pts[0][1])}`;
  const segs = close ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) * k) / 3, p1[1] + ((p2[1] - p0[1]) * k) / 3];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * k) / 3, p2[1] - ((p3[1] - p1[1]) * k) / 3];
    d += `C${round(c1[0])} ${round(c1[1])} ${round(c2[0])} ${round(c2[1])} ${round(p2[0])} ${round(p2[1])}`;
  }
  return d + (close ? 'Z' : '');
}

// ------------------------------------------------------------------ sketch style
export function sketchDefs(id, seed, strength = 1, w = 1000) {
  const s = (w / 1000) * 3.2 * strength;
  return el('filter', { id, x: '-3%', y: '-3%', width: '106%', height: '106%' },
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.028 * (1000 / w) ** 0.3, numOctaves: 2, seed: seed % 997, result: 'n' }),
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: s, xChannelSelector: 'R', yChannelSelector: 'G' }));
}
export function paperDefs(id, seed) {
  return el('filter', { id, x: 0, y: 0, width: '100%', height: '100%' },
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.9, numOctaves: 3, seed: (seed * 7) % 991, result: 't' }),
    el('feColorMatrix', { in: 't', type: 'matrix', values: '0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0.09 0' }),
    el('feComposite', { in2: 'SourceGraphic', operator: 'in' }));
}

/**
 * Wrap a design body in a root <svg>. opts: { bg, defs, fonts:[{family,weight}], sketch, seed, title }
 * In sketch mode the whole artwork is run through a displacement filter on grainy paper.
 */
export function doc(w, h, body, opts = {}) {
  const fonts = (opts.fonts || []).map((f) => `${f.family}:${f.weight}`).join('|');
  const seed = opts.seed ?? 1;
  let defs = opts.defs || '';
  let content = body;
  let bg = opts.bg ? rect(0, 0, w, h, { fill: opts.bg }) : '';
  if (opts.sketch) {
    defs += sketchDefs('df-rough', seed, opts.sketchStrength ?? 1, Math.max(w, h)) + paperDefs('df-paper', seed);
    bg = rect(0, 0, w, h, { fill: opts.paper || '#f6f1e6' }) + rect(0, 0, w, h, { fill: '#000', filter: 'url(#df-paper)' });
    content = g({ filter: 'url(#df-rough)', opacity: 0.94 }, body);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${fonts ? ` data-fonts="${esc(fonts)}"` : ''}>` +
    (opts.title ? `<title>${esc(opts.title)}</title>` : '') +
    (defs ? `<defs>${defs}</defs>` : '') + bg + content + '</svg>';
}

/** multi-line text block with naive word wrap; returns svg */
export function wrapText(str, x, y, maxW, size, family, estimate, attrs = {}, lineH = 1.4) {
  const words = String(str).split(/\s+/);
  const lines = []; let cur = '';
  for (const wd of words) {
    const t = cur ? cur + ' ' + wd : wd;
    if (estimate(t) > maxW && cur) { lines.push(cur); cur = wd; } else cur = t;
  }
  if (cur) lines.push(cur);
  return { svg: lines.map((l, i) => text(x, y + i * size * lineH, l, { fontFamily: family, fontSize: size, ...attrs })).join(''), lines: lines.length, height: lines.length * size * lineH };
}
