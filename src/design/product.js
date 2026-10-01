// Product design sketches: revolved objects (vase, bottle, mug, lamp) and a chair, drawn like a
// designer's marker sketch — construction lines, hatching, orthographic views and notes.
import { el, g, rect, circle, line, path, text, doc, smooth, P } from './svg.js';
import { context, design, titleCase } from './common.js';
import { fontStack, fontsOf, fitSize } from './type.js';
import { mix, shade, describe, readableOn } from './color.js';

export const PRODUCTS = ['vase', 'bottle', 'mug', 'lamp', 'chair'];

function profileOf(kind, r) {
  const k = r.float(0.85, 1.15);
  switch (kind) {
    case 'vase': { const belly = r.float(0.3, 0.7); return { H: 300, pts: [[0, 44 * k], [0.12, 34], [0.25 + belly * 0.2, 60 + 40 * k], [0.55 + belly * 0.3, 92 * k], [0.9, 70], [1, 52]], mat: 'glazed stoneware' }; }
    case 'bottle': return { H: 330, pts: [[0, 16], [0.08, 16], [0.2, 20], [0.33, 58 * k], [0.4, 62 * k], [0.95, 62 * k], [1, 58 * k]], cap: 0.08, label: [0.45, 0.8], mat: 'recycled glass, aluminium cap' };
    case 'mug': return { H: 180, pts: [[0, 62], [1, 56]], handle: true, mat: 'porcelain' };
    default: return { H: 130, pts: [[0, 20], [0.2, 72 * k], [0.85, 118 * k], [1, 120 * k]], lamp: true, mat: 'powder-coated steel, opal diffuser' };
  }
}
const rAt = (pts, t) => { for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, r0] = pts[i - 1], [t1, r1] = pts[i]; const u = (t - t0) / (t1 - t0 || 1); const e = u * u * (3 - 2 * u); return r0 + (r1 - r0) * e; } return pts[pts.length - 1][1]; };

function revolved(prof, cx, top, sc, col, id) {
  const { H, pts } = prof;
  const N = 40, left = [], right = [];
  for (let i = 0; i <= N; i++) { const t = i / N, rr = rAt(pts, t) * sc, y = top + t * H * sc; right.push([cx + rr, y]); left.push([cx - rr, y]); }
  const out = [];
  const body = 'M' + right.map((p) => p.join(' ')).join('L') + 'L' + left.reverse().map((p) => p.join(' ')).join('L') + 'Z';
  const ell = (t, dashed, w = 1.4, front = false) => { const rr = rAt(pts, t) * sc, y = top + t * H * sc, ry = rr * 0.24; return front ? path(`M${cx - rr} ${y}A${rr} ${ry} 0 0 0 ${cx + rr} ${y}`, { fill: 'none', stroke: col.line, strokeWidth: w }) : el('ellipse', { cx, cy: y, rx: rr, ry, fill: 'none', stroke: col.line, strokeWidth: w, strokeDasharray: dashed ? '4 5' : undefined, opacity: dashed ? 0.45 : 1 }); };
  out.push(path(body, { fill: col.fill, stroke: 'none' }));
  // shading: hatching on the right third
  const hid = 'hc' + id;
  out.push(el('clipPath', { id: hid }, path(body)));
  const hatch = [];
  for (let i = 0; i < 26; i++) { const x = cx + (0.25 + i * 0.03) * 130 * sc; hatch.push(line(x, top - 10, x - 30 * sc, top + H * sc + 10, { stroke: col.shade, strokeWidth: 1.3, opacity: 0.55 })); }
  out.push(g({ clipPath: `url(#${hid})` }, rect(cx + 0.18 * 120 * sc, top - 20, 300, H * sc + 40, { fill: col.shade, opacity: 0.18 }), ...hatch,
    path(`M${cx - 0.55 * rAt(pts, 0.5) * sc} ${top + H * sc * 0.12}Q${cx - 0.62 * rAt(pts, 0.5) * sc} ${top + H * sc * 0.5} ${cx - 0.5 * rAt(pts, 0.8) * sc} ${top + H * sc * 0.86}`, { fill: 'none', stroke: '#ffffff', strokeWidth: 6 * sc, strokeLinecap: 'round', opacity: 0.7 })));
  out.push(path(body, { fill: 'none', stroke: col.line, strokeWidth: 2.6, strokeLinejoin: 'round' }));
  out.push(ell(0, false, 2.2), ell(1, false, 2.2, true));
  for (const t of [0.25, 0.5, 0.75]) out.push(ell(t, true));
  out.push(line(cx, top - 30, cx, top + H * sc + 30, { stroke: col.line, strokeWidth: 1, strokeDasharray: '10 4 2 4', opacity: 0.4 }));
  return { svg: out.join(''), H: H * sc };
}

function chair(cx, base, sc, col, r) {
  const Wd = 46, D = 48, Sh = 45, Bh = 40, leg = 3.2;
  const ob = (x, y, z) => [cx + (x - Wd / 2) * sc + z * 0.55 * sc, base - y * sc - z * 0.32 * sc];
  const quad = (a, b, c, d, fill, st = 2.4) => path(P([ob(...a), ob(...b), ob(...c), ob(...d)]), { fill, stroke: col.line, strokeWidth: st, strokeLinejoin: 'round' });
  const out = [];
  const legs = [[0, 0], [Wd - leg, 0], [0, D - leg], [Wd - leg, D - leg]];
  const splay = r.float(0, 4);
  for (const [x, z] of legs.slice().reverse()) out.push(quad([x - (x ? -splay : splay), 0, z], [x + leg - (x ? -splay : splay), 0, z], [x + leg, Sh, z], [x, Sh, z], shade(col.fill, -0.1), 2));
  out.push(quad([0, Sh, 0], [Wd, Sh, 0], [Wd, Sh, D], [0, Sh, D], col.fill), quad([0, Sh - 3, 0], [Wd, Sh - 3, 0], [Wd, Sh, 0], [0, Sh, 0], shade(col.fill, -0.15), 2));
  const tilt = r.float(4, 9);
  out.push(quad([0, Sh + 6, D - 2], [Wd, Sh + 6, D - 2], [Wd, Sh + Bh, D + tilt], [0, Sh + Bh, D + tilt], mix(col.fill, col.accent, 0.35)));
  for (const x of [2, Wd - 5]) out.push(quad([x, Sh, D - 3], [x + 3, Sh, D - 3], [x + 3, Sh + Bh * 0.85, D + tilt * 0.85], [x, Sh + Bh * 0.85, D + tilt * 0.85], shade(col.fill, -0.1), 1.6));
  // construction box
  const bx = [ob(0, 0, 0), ob(Wd, 0, 0), ob(Wd, 0, D), ob(0, 0, D)];
  out.unshift(path(P(bx), { fill: 'none', stroke: col.line, strokeDasharray: '4 5', opacity: 0.35 }), el('ellipse', { cx: (bx[0][0] + bx[2][0]) / 2, cy: (bx[0][1] + bx[2][1]) / 2 + 6, rx: 200 * sc * 0.5, ry: 26 * sc * 0.6, fill: col.shade, opacity: 0.15 }));
  return { svg: out.join(''), dims: { Wd, D, Sh, Bh } };
}

export function generateProduct(spec) {
  const ctx = context(spec);
  const { C, pair, palette, r } = ctx;
  const kind = PRODUCTS.includes(spec.product) ? spec.product : r.pick(PRODUCTS);
  const W = 1600, H = 1000;
  const hand = "'Caveat', cursive";
  const col = { fill: mix(C.primary, '#ffffff', 0.15), line: '#2a2826', shade: shade(C.primary, -0.35), accent: C.accent };
  const Pp = [rect(0, 0, W, H, { fill: '#f7f3ea' })];
  // faint grid
  for (let i = 0; i < 40; i++) Pp.push(line(i * 40, 0, i * 40, H, { stroke: '#cfc7b6', strokeWidth: 0.5, opacity: 0.35 }));
  for (let i = 0; i < 26; i++) Pp.push(line(0, i * 40, W, i * 40, { stroke: '#cfc7b6', strokeWidth: 0.5, opacity: 0.35 }));
  const name = spec.name || { vase: 'Vessel 01', bottle: 'Bottle concept', mug: 'Daily mug', lamp: 'Dome lamp', chair: 'Side chair' }[kind];
  Pp.push(text(60, 90, name, { fontFamily: hand, fontWeight: 700, fontSize: 64, fill: '#2a2826' }), path('M60 108q180 14 360 -2', { fill: 'none', stroke: C.accent, strokeWidth: 5, strokeLinecap: 'round' }));
  let notes = [], dims = '';
  if (kind === 'chair') {
    const c = chair(300, 800, 5.4, col, r.fork('c'));
    Pp.push(c.svg);
    notes = ['solid oak frame, 3° splayed legs', `seat height ${c.dims.Sh} cm`, 'backrest tilted for lumbar support', 'stackable ×4'];
    // orthographic front + side
    const fx = 1000, fy = 560, s2 = 3.2, { Wd, D, Sh, Bh } = c.dims;
    Pp.push(rect(fx, fy - Sh * s2, Wd * s2, 3 * s2, { fill: col.fill, stroke: col.line, strokeWidth: 1.8 }), rect(fx + 2, fy - Sh * s2, 3 * s2, Sh * s2, { fill: 'none', stroke: col.line, strokeWidth: 1.8 }), rect(fx + Wd * s2 - 3 * s2 - 2, fy - Sh * s2, 3 * s2, Sh * s2, { fill: 'none', stroke: col.line, strokeWidth: 1.8 }), rect(fx, fy - (Sh + Bh) * s2, Wd * s2, Bh * 0.55 * s2, { fill: mix(col.fill, C.accent, 0.35), stroke: col.line, strokeWidth: 1.8 }));
    const sx = 1260;
    Pp.push(path(`M${sx} ${fy}L${sx + 2} ${fy - Sh * s2}H${sx + D * s2}L${sx + D * s2 - 2} ${fy}M${sx + D * s2 - 4} ${fy - Sh * s2}L${sx + D * s2 + 8 * s2} ${fy - (Sh + Bh) * s2}`, { fill: 'none', stroke: col.line, strokeWidth: 2.2 }));
    dims = [[fx, fy + 24, fx + Wd * s2, `${Wd} cm`], [sx, fy + 24, sx + D * s2, `${D} cm`]].map(([a, y, b, t]) => line(a, y, b, y, { stroke: '#555', strokeWidth: 1 }) + text((a + b) / 2, y + 22, t, { fontFamily: hand, fontSize: 22, fill: '#555', textAnchor: 'middle' })).join('') +
      text(fx, fy - (Sh + Bh) * s2 - 20, 'front', { fontFamily: hand, fontSize: 24, fill: '#777' }) + text(sx, fy - (Sh + Bh) * s2 - 20, 'side', { fontFamily: hand, fontSize: 24, fill: '#777' });
  } else {
    const prof = profileOf(kind, r.fork('p'));
    const sc = prof.lamp ? 1.6 : Math.min(1.7, 560 / prof.H);
    const top = 200, cx = 430;
    if (prof.lamp) {
      const shadeH = prof.H * sc;
      Pp.push(path(`M${cx - 116 * sc} ${top + shadeH}L${cx - 260} ${top + 640}H${cx + 260}L${cx + 116 * sc} ${top + shadeH}Z`, { fill: mix(C.accent, '#fff8dc', 0.6), opacity: 0.35 }));
      Pp.push(line(cx, top + shadeH, cx, top + 560, { stroke: col.line, strokeWidth: 7 }), el('ellipse', { cx, cy: top + 575, rx: 90, ry: 20, fill: col.fill, stroke: col.line, strokeWidth: 2.4 }), path(`M${cx - 90} ${top + 575}v14a90 20 0 0 0 180 0v-14`, { fill: shade(col.fill, -0.1), stroke: col.line, strokeWidth: 2.4 }));
    }
    const rv = revolved(prof, cx, top, sc, col, 'm');
    Pp.push(rv.svg);
    if (prof.cap) { const cr = rAt(prof.pts, 0) * sc + 3; Pp.push(rect(cx - cr, top - prof.cap * prof.H * sc, cr * 2, prof.cap * prof.H * sc + 6, { rx: 4, fill: shade(C.ink, 0.1), stroke: col.line, strokeWidth: 2.2 })); }
    if (prof.label) {
      const [a, b] = prof.label, rr = rAt(prof.pts, (a + b) / 2) * sc, y0 = top + a * prof.H * sc, y1 = top + b * prof.H * sc;
      Pp.push(path(`M${cx - rr} ${y0}A${rr} ${rr * 0.24} 0 0 0 ${cx + rr} ${y0}V${y1}A${rr} ${rr * 0.24} 0 0 1 ${cx - rr} ${y1}Z`, { fill: C.paper, stroke: col.line, strokeWidth: 2 }));
      const nm = (spec.name || 'Botanica').toUpperCase(), fsz = fitSize(nm, pair.head[0], rr * 1.5, 34, { caps: true });
      Pp.push(text(cx - 6, (y0 + y1) / 2 + 8, nm, { fontFamily: fontStack(pair.head[0]), fontWeight: pair.head[1], fontSize: fsz, fill: C.ink, textAnchor: 'middle' }), rect(cx - rr * 0.5, (y0 + y1) / 2 + 24, rr, 4, { fill: C.accent }));
    }
    if (prof.handle) { const y0 = top + 0.18 * prof.H * sc, y1 = top + 0.78 * prof.H * sc, x0 = cx + rAt(prof.pts, 0.2) * sc - 4; Pp.push(path(`M${x0} ${y0}C${x0 + 110} ${y0 - 10} ${x0 + 110} ${y1 + 10} ${x0 - 4} ${y1}`, { fill: 'none', stroke: col.line, strokeWidth: 20 }), path(`M${x0} ${y0}C${x0 + 110} ${y0 - 10} ${x0 + 110} ${y1 + 10} ${x0 - 4} ${y1}`, { fill: 'none', stroke: col.fill, strokeWidth: 14 })); }
    notes = { vase: ['thrown on the wheel, then trimmed', 'matte outside, glossy inside', 'widest point at 2/3 height = stable', 'foot ring raises it off the table'], bottle: ['shoulder angle ≈ 35° for easy pour', 'label band on the straight section', 'embossed logo on the base', '500 ml'], mug: ['wall 4 mm, lip 2 mm (thin drinking edge)', 'handle fits 3 fingers', 'slight taper = stackable', '350 ml'], lamp: ['dome shade throws light down, no glare', 'opal diffuser inside', 'weighted base ≈ 1.2 kg', 'E27 · warm 2700 K'] }[kind];
    // front orthographic + top view
    const fx = 1080, fy = 200, s2 = 0.62 * sc, Hh = prof.H * s2;
    const outline = [];
    for (let i = 0; i <= 30; i++) { const t = i / 30; outline.push([fx + rAt(prof.pts, t) * s2, fy + t * Hh]); }
    const mirror = outline.map(([x, y]) => [2 * fx - x, y]).reverse();
    Pp.push(path(P([...outline, ...mirror]), { fill: 'none', stroke: col.line, strokeWidth: 2 }), line(fx, fy - 20, fx, fy + Hh + 20, { stroke: '#888', strokeDasharray: '8 4 2 4' }));
    const maxR = Math.max(...prof.pts.map((p) => p[1])) * s2;
    Pp.push(circle(1340, fy + maxR, maxR, { fill: 'none', stroke: col.line, strokeWidth: 2 }), circle(1340, fy + maxR, rAt(prof.pts, 0) * s2, { fill: 'none', stroke: col.line, strokeWidth: 1.5, strokeDasharray: '4 4' }));
    dims = line(fx + maxR + 30, fy, fx + maxR + 30, fy + Hh, { stroke: '#555' }) + text(fx + maxR + 40, fy + Hh / 2, `${Math.round(prof.H / 10 * (kind === 'mug' ? 0.55 : 1))} cm`, { fontFamily: hand, fontSize: 22, fill: '#555' }) +
      text(fx - 40, fy - 28, 'front', { fontFamily: hand, fontSize: 24, fill: '#777' }) + text(1300, fy - 28, 'top', { fontFamily: hand, fontSize: 24, fill: '#777' });
    col.mat = prof.mat;
  }
  Pp.push(dims);
  notes.forEach((n, i) => Pp.push(circle(1010, 640 + i * 52, 5, { fill: C.accent }), text(1030, 648 + i * 52, n, { fontFamily: hand, fontSize: 30, fill: '#2a2826' })));
  [[col.fill, 'body'], [shade(col.fill, -0.2), 'detail'], [C.accent, 'accent']].forEach(([c, t], i) => Pp.push(rect(60 + i * 120, H - 120, 90, 60, { rx: 6, fill: c, stroke: '#2a2826', strokeWidth: 1 }), text(60 + i * 120, H - 40, t, { fontFamily: hand, fontSize: 22, fill: '#555' })));
  Pp.push(text(W - 60, H - 40, 'designfly · sketchbook', { fontFamily: hand, fontSize: 24, fill: '#aaa', textAnchor: 'end' }));
  const fonts = fontsOf(pair, [['Caveat', 400], ['Caveat', 700]]);
  const svg = doc(W, H, Pp.join(''), { fonts, seed: ctx.seed, sketch: spec.sketch ?? true, sketchStrength: 0.9, paper: '#f7f3ea', title: name + ' sketch' });
  return design({ kind: 'product', title: `${name} — product sketch`, svg, spec: { ...spec, product: kind }, palette, pair, w: W, h: H,
    notes: `**${name}** — ${kind} concept sketch.\n${notes.join(' · ')}.\nThe 3/4 view shows form and shading; the front/top orthographic views are what you'd dimension for a prototype.`, assets: [] });
}
