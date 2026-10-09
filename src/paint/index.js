// Paintings as designs: a reference image (what the fly looked at) + the painter → a design object.
import { paint, PAINT_CHOICES } from './painter.js';
import { timeline, opsToSVG } from '../hand/render.js';
import { esc } from '../design/svg.js';
import { rng } from '../design/rng.js';
import { makePalette, hexToRgb } from '../design/color.js';
import { shapes, randomGenome, cleanGenome } from '../learn/genome.js';

export const SCENES = ['studio', 'self', 'photo', 'memory', 'abstract', 'imagine'];

export function cleanPaint(p, seed = 1) {
  const r = rng(seed * 313 + 1), o = {};
  for (const [k, cs] of Object.entries(PAINT_CHOICES)) o[k] = cs.includes(p?.[k]) ? p[k] : r.pick(cs);
  o.skill = Number.isFinite(+p?.skill) ? Math.max(0, Math.min(1, +p.skill)) : 0.1;
  return o;
}

function insidePoly(contours, x, y) {
  let c = false;
  for (const poly of contours) for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
/** an idea from the fly's own mind: one of its evolved shapes floating in a colour field */
export function imagine(spec, w = 160, h = 120) {
  const r = rng((spec.seed || 1) * 97 + 3);
  const pal = makePalette({ moods: spec.moods, colors: spec.colors, seed: spec.seed || 1 });
  const cols = pal.colors.map((c) => hexToRgb(c.hex));
  const g = cleanGenome(spec.genome) || randomGenome(r);
  const sh = shapes(g, 24), sc = r.float(0.75, 1.15), ox = w / 2 + r.float(-0.18, 0.18) * w, oy = h / 2 + r.float(-0.1, 0.1) * h, rot = r.float(-0.6, 0.6);
  const [top, bot] = r.shuffle([cols[4], cols[1], cols[3], cols[2]]).slice(0, 2);
  const data = new Uint8ClampedArray(w * h * 4), cs = Math.cos(-rot), sn = Math.sin(-rot);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = y / h + 0.15 * Math.sin(x * 0.05 + spec.seed);
    let c = top.map((v, k) => v + (bot[k] - v) * Math.max(0, Math.min(1, t)));
    const dx = (x - ox) / (h * 0.42 * sc) * 50, dy = (y - oy) / (h * 0.42 * sc) * 50, lx = dx * cs - dy * sn, ly = dx * sn + dy * cs;
    for (const s of sh) if (insidePoly(s.contours, lx, ly)) c = s.cut ? top : cols[[0, 1, 2][s.c] ?? 0];
    data.set([...c, 255], (y * w + x) * 4);
  }
  return { w, h, data };
}

const NAMES = { studio: 'Studio corner', self: 'Self-portrait', photo: 'From your photo', memory: 'From memory', abstract: 'Abstraction' };
/** img = { w, h, data }; spec.paint = brush habits; what = what the fly was looking at */
export function paintingDesign(img, spec, what = '') {
  const p = cleanPaint(spec.paint, spec.seed);
  const res = paint(img, { seed: spec.seed, ...p, levels: spec.scene === 'studio' || spec.scene === 'self', tone: spec.dark ? 'dark' : null, signature: spec.lang === 'ru' ? 'муха' : 'fly' });
  timeline(res.ops);
  const scene = SCENES.includes(spec.scene) ? spec.scene : 'abstract';
  const title = scene === 'memory' && spec.subject?.length ? `${spec.subject.join(' & ')} — from memory` : scene === 'abstract' ? `Abstraction No. ${(spec.seed % 997) + 1}` : NAMES[scene];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${res.w} ${res.h}" width="${res.w}" height="${res.h}"><title>${esc(title)} — painted by a fly</title>${opsToSVG(res.ops)}</svg>`;
  const how = {
    studio: `Painted from life: I looked at ${what || 'the studio'} and painted what I saw.`,
    self: 'A self-portrait — I looked at myself and painted what I saw (the beret came out well, I think).',
    photo: 'Painted from your photo, looking at it the whole time.',
    memory: `I've only seen ${spec.subject?.join(' and ') || 'it'} in my own sketches, so this is painted from memory — show me a photo and I'll paint it from life.`,
    abstract: 'No reference at all: an abstraction around one of the shapes my mind evolved.',
  }[scene];
  const notes = [`**${title}** — ${how}`,
    `${res.strokes} brush strokes in ${res.layers} layers (big brush → small), each one put where my canvas differed most from what I was looking at and pulled along the edges of the form. Colours mixed from ${res.tubes} tubes. Likeness to what I saw: **${Math.round(res.likeness * 100)} %**.`,
    `Brush: ${p.style}, colour: ${p.palette}, ground: ${p.ground}, skill ${Math.round(p.skill * 100)} % — I get better with every painting and every 👍.`].join('\n');
  const tubes = [...new Set(res.ops.filter((o) => o.nib === 'paint').map((o) => o.c))].slice(0, 6);
  const d = { kind: 'painting', title, svg, w: res.w, h: res.h, notes, assets: [], palette: tubes.map((hex, i) => ({ role: `paint ${i + 1}`, hex })), spec: { ...spec, scene, paint: p }, ops: res.ops, hand: true, bg: res.ground, likeness: res.likeness };
  return d;
}
/** synchronous path (abstractions, or any painting when there's nothing to look at) */
export function generatePainting(spec) { return paintingDesign(imagine(spec), { ...spec, scene: 'abstract' }); }
