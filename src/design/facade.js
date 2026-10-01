// Architecture: building elevations (façades) with scale figures, trees and level markers.
import { el, g, rect, circle, line, path, poly, text, doc } from './svg.js';
import { context, design, titleCase } from './common.js';
import { fontStack, fontsOf, fitSize } from './type.js';
import { mix, shade, describe } from './color.js';

export const FACADE_STYLES = ['modern', 'scandinavian', 'classic', 'brutalist', 'tower'];

function person(x, y, h, col, r) {
  const k = h / 1.75;
  const lean = r.float(-0.05, 0.05);
  return g({ transform: `translate(${x} ${y}) scale(${k})`, fill: col },
    circle(lean * 2, -1.6, 0.12), path(`M-0.2 -1.45Q0 -1.5 0.2 -1.45L0.24 -0.8L0.12 -0.8L0.1 0L0.02 0L0 -0.72L-0.02 0L-0.1 0L-0.12 -0.8L-0.24 -0.8Z`));
}
function tree(x, y, h, col, r, kind) {
  if (kind === 'conifer') return g({ fill: col }, rect(x - h * 0.03, y - h * 0.18, h * 0.06, h * 0.18), poly([[x, y - h], [x + h * 0.22, y - h * 0.15], [x - h * 0.22, y - h * 0.15]]));
  const blobs = Array.from({ length: 5 }, (_, i) => circle(x + r.float(-0.2, 0.2) * h, y - h * 0.62 + r.float(-0.18, 0.12) * h, h * r.float(0.2, 0.28)));
  return g({ fill: col }, rect(x - h * 0.025, y - h * 0.5, h * 0.05, h * 0.5), ...blobs);
}

export function generateFacade(spec) {
  const ctx = context(spec);
  const { C, pair, palette, r } = ctx;
  const style = FACADE_STYLES.includes(spec.style) ? spec.style : r.pick(FACADE_STYLES);
  const floors = Math.max(1, Math.min(14, spec.floors || { modern: r.int(2, 4), scandinavian: r.int(1, 2), classic: r.int(3, 5), brutalist: r.int(3, 6), tower: r.int(9, 14) }[style]));
  const bays = { modern: r.int(4, 6), scandinavian: r.int(3, 4), classic: r.int(5, 7), brutalist: r.int(4, 6), tower: r.int(5, 7) }[style];
  const bayW = style === 'tower' ? 3 : 3.4, fh = 3.1;
  const Wm = bays * bayW, Hm = floors * fh + (style === 'scandinavian' ? Wm * 0.32 : style === 'classic' ? 1.2 : 0.8);
  const PW = 1600, PH = 1000, ground = 820;
  const s = Math.min(1000 / Wm, 640 / Hm);
  const bx = (PW - Wm * s) / 2 - 120, W = Wm * s;
  const hand = spec.sketch ? "'Caveat', cursive" : fontStack(pair.body[0]);
  const P = [];
  const sky = spec.sketch ? '#f6f1e6' : ctx.dark ? shade(C.ink, 0.06) : mix(C.secondary, '#ffffff', 0.86);
  P.push(rect(0, 0, PW, PH, { fill: sky }));
  if (!spec.sketch) P.push(circle(PW * 0.1, 150, 60, { fill: mix(C.accent, '#ffffff', 0.4), opacity: 0.8 }));
  const wall = { modern: mix(C.paper, '#e8e6e1', 0.3), scandinavian: shade(C.primary, -0.12), classic: mix(C.secondary, '#f1e8d8', 0.75), brutalist: '#b9b6b0', tower: shade(C.primary, -0.3) }[style];
  const frame = style === 'scandinavian' ? '#1a1a1a' : style === 'tower' ? mix(C.primary, '#ffffff', 0.5) : C.ink;
  const glass = style === 'tower' ? mix(C.secondary, '#bfe0ff', 0.5) : mix('#9fc4dd', C.secondary, 0.25);
  const top = ground - floors * fh * s;
  // back trees
  for (let i = 0; i < 5; i++) P.push(tree(bx - 140 + r.float(0, W + 280), ground, r.float(90, 160), mix(C.secondary, sky, 0.55), r, r.pick(['round', 'conifer'])));
  // body
  P.push(rect(bx, top, W, floors * fh * s, { fill: wall, stroke: C.ink, strokeWidth: 2 }));
  if (style === 'scandinavian') {
    for (let x = 0; x < W; x += 0.22 * s) P.push(line(bx + x, top, bx + x, ground, { stroke: shade(wall, -0.06), strokeWidth: 1.2 }));
    const rh = Wm * 0.3 * s;
    P.push(poly([[bx - 14, top + 2], [bx + W / 2, top - rh], [bx + W + 14, top + 2]], { fill: '#2a2a2a', stroke: C.ink, strokeWidth: 2 }));
    P.push(rect(bx + W * 0.62, top - rh * 0.72, 0.6 * s, rh * 0.5, { fill: '#2a2a2a' }));
  } else if (style === 'classic') {
    P.push(rect(bx - 10, top - 0.9 * s, W + 20, 0.9 * s, { fill: shade(wall, -0.05), stroke: C.ink, strokeWidth: 2 }), rect(bx - 18, top - 1.2 * s, W + 36, 0.3 * s, { fill: shade(wall, -0.1), stroke: C.ink, strokeWidth: 2 }));
    P.push(rect(bx, ground - fh * s, W, fh * s, { fill: shade(wall, -0.08) }));
    for (let f = 1; f < floors; f++) P.push(rect(bx - 6, ground - f * fh * s - 6, W + 12, 10, { fill: shade(wall, -0.06), stroke: C.ink, strokeWidth: 1 }));
  } else if (style === 'brutalist') {
    for (let f = 0; f < floors; f++) { const off = (f % 2 ? 1 : -1) * r.float(0.3, 1.2) * s; P.push(rect(bx + off, ground - (f + 1) * fh * s, W, fh * s * 0.38, { fill: shade(wall, -0.04), stroke: C.ink, strokeWidth: 2 })); }
  } else {
    P.push(rect(bx - 8, top - 0.5 * s, W + 16, 0.5 * s, { fill: style === 'tower' ? shade(wall, -0.1) : C.ink }));
  }
  // windows
  for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
    const x0 = bx + b * bayW * s, y0 = ground - (f + 1) * fh * s;
    const ground0 = f === 0;
    if (style === 'tower') {
      P.push(rect(x0 + 2, y0 + 3, bayW * s - 4, fh * s - 6, { fill: glass, stroke: frame, strokeWidth: 1.5 }), line(x0 + bayW * s / 2, y0 + 3, x0 + bayW * s / 2, y0 + fh * s - 3, { stroke: frame, strokeWidth: 1 }),
        path(`M${x0 + 6} ${y0 + fh * s - 8}L${x0 + bayW * s * 0.45} ${y0 + 8}`, { stroke: '#ffffff', strokeOpacity: 0.35, strokeWidth: 3 }));
      continue;
    }
    if (ground0 && b === Math.floor(bays / 2)) {                      // entrance
      const dw = (style === 'classic' ? 1.6 : 1.4) * s, dh = 2.5 * s;
      const dx = x0 + (bayW * s - dw) / 2;
      if (style === 'classic') P.push(path(`M${dx} ${ground}V${ground - dh + dw / 2}A${dw / 2} ${dw / 2} 0 0 1 ${dx + dw} ${ground - dh + dw / 2}V${ground}Z`, { fill: shade(C.primary, -0.2), stroke: C.ink, strokeWidth: 2 }));
      else P.push(rect(dx, ground - dh, dw, dh, { fill: style === 'scandinavian' ? C.accent : shade(C.primary, -0.1), stroke: frame, strokeWidth: 2 }), rect(dx - 0.3 * s, ground - dh - 0.25 * s, dw + 0.6 * s, 0.2 * s, { fill: frame }));
      P.push(circle(dx + dw * 0.8, ground - dh / 2, 3, { fill: '#e8d9a8' }));
      continue;
    }
    let ww, wh, wy;
    if (style === 'modern') { ww = bayW * s * (ground0 ? 0.86 : r.chance(0.3) ? 0.86 : 0.55); wh = fh * s * (ground0 ? 0.7 : 0.55); wy = y0 + fh * s * (ground0 ? 0.2 : 0.22); }
    else if (style === 'scandinavian') { ww = bayW * s * 0.42; wh = fh * s * 0.5; wy = y0 + fh * s * 0.22; }
    else if (style === 'classic') { ww = bayW * s * 0.36; wh = fh * s * 0.56; wy = y0 + fh * s * 0.2; }
    else { ww = bayW * s * 0.64; wh = fh * s * 0.42; wy = y0 + fh * s * 0.44; }
    const wx = x0 + (bayW * s - ww) / 2;
    P.push(rect(wx, wy, ww, wh, { fill: glass, stroke: frame, strokeWidth: style === 'scandinavian' ? 3 : 2 }));
    if (style === 'classic') {
      P.push(line(wx + ww / 2, wy, wx + ww / 2, wy + wh, { stroke: frame, strokeWidth: 1.5 }), line(wx, wy + wh * 0.4, wx + ww, wy + wh * 0.4, { stroke: frame, strokeWidth: 1.5 }));
      P.push(poly([[wx - 6, wy - 4], [wx + ww / 2, wy - 16], [wx + ww + 6, wy - 4]], { fill: shade(wall, -0.08), stroke: C.ink, strokeWidth: 1.2 }), rect(wx - 4, wy + wh, ww + 8, 5, { fill: shade(wall, -0.1) }));
    } else if (style === 'modern' && !ground0 && r.chance(0.35)) {
      P.push(rect(wx - 6, wy + wh - 2, ww + 12, 4, { fill: C.ink }), ...Array.from({ length: 7 }, (_, k) => line(wx - 4 + k * (ww + 8) / 6, wy + wh * 0.62, wx - 4 + k * (ww + 8) / 6, wy + wh, { stroke: C.ink, strokeWidth: 1.2 })), line(wx - 6, wy + wh * 0.62, wx + ww + 6, wy + wh * 0.62, { stroke: C.ink, strokeWidth: 2 }));
    } else P.push(path(`M${wx + 4} ${wy + wh - 4}L${wx + ww * 0.4} ${wy + 4}`, { stroke: '#ffffff', strokeOpacity: 0.45, strokeWidth: 2.5 }));
    if (style === 'modern' && b === bays - 1 && !ground0) P.push(rect(x0 + bayW * s * 0.1, y0, bayW * s * 0.1, fh * s, { fill: C.accent, opacity: 0.85 }));
  }
  if (style === 'modern') P.push(rect(bx + W * 0.02, top + 4, W * 0.18, floors * fh * s - 4, { fill: 'none', stroke: shade(wall, -0.12), strokeWidth: 1 }));
  // ground, front trees, people
  P.push(rect(0, ground, PW, PH - ground, { fill: spec.sketch ? '#efe8d9' : mix(C.secondary, '#d9d6cf', 0.7) }), line(0, ground, PW, ground, { stroke: C.ink, strokeWidth: 3 }));
  for (let i = 0; i < 3; i++) P.push(tree(r.pick([bx - r.float(40, 120), bx + W + r.float(40, 140)]), ground, r.float(120, 190), mix(C.secondary, '#44533f', 0.5), r, r.pick(['round', 'conifer', 'round'])));
  for (let i = 0; i < 4; i++) P.push(person(bx + r.float(-60, W + 60), ground, 1.75 * s, C.ink, r));
  // level markers
  for (let f = 0; f <= floors; f += floors > 6 ? 2 : 1) {
    const y = ground - f * fh * s;
    P.push(line(bx + W + 30, y, bx + W + 90, y, { stroke: C.ink, strokeWidth: 1 }), poly([[bx + W + 30, y], [bx + W + 40, y - 8], [bx + W + 20, y - 8]], { fill: C.ink }),
      text(bx + W + 96, y + 4, `+${(f * fh).toFixed(2)}`, { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fill: C.ink }));
  }
  // title block
  const nm = spec.name || (style === 'tower' ? 'Glass tower' : `${titleCase(style)} ${floors > 2 ? 'building' : 'house'}`);
  P.push(rect(PW - 300, 60, 240, 250, { fill: 'rgba(255,255,255,.7)', stroke: C.ink, strokeOpacity: 0.3 }),
    text(PW - 280, 100, 'ELEVATION A', { fontFamily: fontStack(pair.body[0]), fontWeight: 600, fontSize: 13, letterSpacing: 3, fill: '#777' }),
    text(PW - 280, 136, nm.length > 26 ? nm.slice(0, 25) + '…' : nm, { fontFamily: spec.sketch ? hand : fontStack(pair.head[0]), fontWeight: pair.head[1], fontSize: Math.min(spec.sketch ? 30 : 22, fitSize(nm.length > 26 ? nm.slice(0, 25) + '…' : nm, spec.sketch ? 'Caveat' : pair.head[0], 200, 30, { weight: pair.head[1] })), fill: C.ink }),
    ...[['Floors', floors], ['Width', `${Wm.toFixed(1)} m`], ['Height', `${(floors * fh).toFixed(1)} m`], ['Style', style]].map(([k, v], i) =>
      text(PW - 280, 176 + i * 30, `${k}`, { fontFamily: fontStack(pair.body[0]), fontSize: 13, fill: '#777' }) + text(PW - 80, 176 + i * 30, String(v), { fontFamily: fontStack(pair.body[0]), fontWeight: 600, fontSize: 14, fill: C.ink, textAnchor: 'end' })));
  if (spec.sketch) P.push(text(bx, ground + 70, `${nm} — street elevation`, { fontFamily: hand, fontSize: 34, fill: C.ink }), path(`M${bx} ${ground + 84}q${W / 2} 10 ${W * 0.6} -4`, { fill: 'none', stroke: C.accent, strokeWidth: 3 }));
  const fonts = fontsOf(pair, [['JetBrains Mono', 400], ['Caveat', 400]]);
  const svg = doc(PW, PH, P.join(''), { fonts, seed: ctx.seed, sketch: spec.sketch, sketchStrength: 0.7, title: nm + ' elevation' });
  const why = { modern: 'Horizontal bands of glazing, flat roof, one accent fin — the grid does the ornament.', scandinavian: 'A pitched-roof volume with vertical timber cladding, black frames and a coloured door: warm, simple, archetypal.', classic: 'Symmetry, a strong cornice, a rusticated ground floor and pedimented windows — proportions over decoration.', brutalist: 'Raw concrete bands shifted floor by floor; deep windows cast the shadows that give the façade its rhythm.', tower: 'A unitised glass curtain wall on a 3 m module; reflections do the work.' }[style];
  return design({ kind: 'facade', title: `${nm} — elevation`, svg, spec: { ...spec, style, floors }, palette, pair, w: PW, h: PH,
    notes: `**${nm}**, ${floors} floor${floors > 1 ? 's' : ''}, ${bays} bays of ${bayW} m. ${why}\nPeople and trees are drawn to scale (1.75 m figures) so you can read the size at a glance. Concept only — not a construction drawing.`, assets: [] });
}
