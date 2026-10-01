// Architecture: parametric floor plans (apartment / house / studio / office / café).
// Typology: a public zone (living / open space) + a corridor with private rooms on both sides,
// so every room is reachable — then walls, doors with swings, windows, furniture, dimensions.
import { el, g, rect, circle, line, path, text, doc } from './svg.js';
import { context, design, titleCase } from './common.js';
import { fontStack, fontsOf, fitSize } from './type.js';
import { mix, shade } from './color.js';
import { round } from './rng.js';

const PROGRAMS = {
  studio: (n) => ({ pub: [['Living / Kitchen', 'studio', 1]], priv: [['Bath', 'bath', 0.22], ['Wardrobe', 'storage', 0.12]], area: 34 }),
  apartment: (n) => ({ pub: [['Living', 'living', 0.62], ['Kitchen / Dining', 'kitchen', 0.38]], priv: [['Bedroom', 'master', 0.2], ...Array.from({ length: Math.max(0, n - 1) }, (_, i) => [`Bedroom ${i + 2}`, 'bedroom', 0.15]), ['Bath', 'bath', 0.08], ...(n >= 2 ? [['WC', 'wc', 0.035]] : []), ...(n >= 3 ? [['Storage', 'storage', 0.04]] : [])], area: 38 + n * 17 }),
  house: (n) => ({ pub: [['Living', 'living', 0.5], ['Kitchen', 'kitchen', 0.28], ['Dining', 'dining', 0.22]], priv: [['Master bedroom', 'master', 0.2], ...Array.from({ length: Math.max(0, n - 1) }, (_, i) => [`Bedroom ${i + 2}`, 'bedroom', 0.14]), ['Bath', 'bath', 0.08], ['WC', 'wc', 0.035], ['Study', 'study', 0.1], ['Laundry', 'laundry', 0.05]], area: 70 + n * 22 }),
  office: () => ({ pub: [['Open office', 'office', 0.75], ['Reception', 'reception', 0.25]], priv: [['Meeting', 'meeting', 0.16], ['Director', 'study', 0.11], ['Kitchen', 'pantry', 0.09], ['WC', 'wc', 0.04], ['WC', 'wc', 0.04], ['Storage', 'storage', 0.05]], area: 180 }),
  cafe: () => ({ pub: [['Seating', 'seating', 0.78], ['Counter', 'counter', 0.22]], priv: [['Kitchen', 'cafekitchen', 0.2], ['Storage', 'storage', 0.07], ['WC', 'wc', 0.05], ['Staff', 'study', 0.06]], area: 120 }),
};
export const PLAN_TYPES = Object.keys(PROGRAMS);

function layout(type, bedrooms, area, r) {
  const prog = PROGRAMS[type](bedrooms);
  const A = area || prog.area;
  const privShare = prog.priv.reduce((s, x) => s + x[2], 0) * (type === 'studio' ? 1 : 1);
  const corridorW = type === 'studio' ? 1.4 : type === 'office' || type === 'cafe' ? 1.6 : 1.25;
  const ar = r.float(1.3, 1.65);
  let W = Math.sqrt(A * ar), D = A / W;
  D = Math.max(D, type === 'studio' ? 5 : 7); W = A / D;
  // public zone width
  const pubFrac = type === 'studio' ? 0.62 : 1 - Math.min(0.7, privShare + corridorW * 0.9 / D);
  const Wp = round(W * pubFrac, 2);
  const rooms = [];
  // public: stacked along y
  const pubTot = prog.pub.reduce((s, x) => s + x[2], 0);
  let y = 0;
  const pubOrder = prog.pub.slice().reverse();
  pubOrder.forEach(([name, kind, f], i) => {
    const h = i === pubOrder.length - 1 ? D - y : round(D * (f / pubTot), 2);
    rooms.push({ name, kind, x: 0, y, w: Wp, h, zone: 'pub' });
    y += h;
  });
  // private: two rows around a corridor
  const Wr = W - Wp;
  const priv = prog.priv.slice();
  const top = [], bot = [];
  let st = 0, sb = 0;
  for (const p of priv.sort((a, b) => b[2] - a[2])) { if (st <= sb) { top.push(p); st += p[2]; } else { bot.push(p); sb += p[2]; } }
  if (type === 'studio') { top.push(...bot.splice(0)); sb = 0; st = 1; }
  const avail = D - corridorW;
  const dt = bot.length ? round(avail * st / (st + sb), 2) : avail;
  const place = (row, y0, h) => {
    const tot = row.reduce((s, x) => s + x[2], 0);
    let x = Wp;
    // wet rooms next to each other: bath & wc first
    row.sort((a, b) => (['bath', 'wc'].includes(b[1]) ? 1 : 0) - (['bath', 'wc'].includes(a[1]) ? 1 : 0));
    row.forEach(([name, kind, f], i) => {
      const w = i === row.length - 1 ? W - x : round(Wr * (f / tot), 2);
      rooms.push({ name, kind, x, y: y0, w, h, zone: 'priv' });
      x += w;
    });
  };
  place(top, 0, dt);
  if (bot.length) place(bot, dt + corridorW, D - dt - corridorW);
  const corridor = { name: type === 'studio' ? 'Entry' : 'Hall', kind: 'hall', x: Wp, y: dt, w: Wr, h: bot.length ? corridorW : D - dt, zone: 'hall' };
  rooms.push(corridor);
  return { W: round(W, 2), D: round(D, 2), rooms, corridor, Wp, dt, hasBot: bot.length > 0 };
}

// ------------------------------------------------------------------ furniture (metres, room-local)
function furniture(room, s, col, r) {
  const { x, y, w, h, kind } = room;
  const X = (v) => (x + v) * s, Y = (v) => (y + v) * s;
  const R = (a, b, c, d, extra = {}) => rect(X(a), Y(b), c * s, d * s, { fill: col.furn, stroke: col.furnLine, strokeWidth: 1.2, ...extra });
  const C = (a, b, rad, extra = {}) => circle(X(a), Y(b), rad * s, { fill: col.furn, stroke: col.furnLine, strokeWidth: 1.2, ...extra });
  const out = [];
  const along = w >= h;
  if (kind === 'studio') {
    out.push(R(0.05, 0.05, Math.min(w - 0.2, 3), 0.62), C(0.8, 0.36, 0.13, { fill: 'none' }), C(1.2, 0.36, 0.13, { fill: 'none' }), rect(X(1.8), Y(0.14), 0.55 * s, 0.4 * s, { fill: 'none', stroke: col.furnLine, rx: 3 }));
    out.push(R(w - 1.7, 1.3, 1.4, 0.8, { rx: 0.05 * s }), C(w - 1.3, 1.05, 0.2), C(w - 0.7, 1.05, 0.2), C(w - 1.3, 2.35, 0.2), C(w - 0.7, 2.35, 0.2));
    out.push(R(0.2, h - 1.05, Math.min(2.4, w * 0.5), 0.9, { rx: 0.12 * s }), R(0.2, h - 1.05, Math.min(2.4, w * 0.5), 0.25), R(Math.min(2.4, w * 0.5) + 0.5, h - 2.3, 1.45, 2.05, { rx: 0.06 * s }));
  } else if (kind === 'living') {
    const sw = Math.min(2.6, w * 0.55);
    out.push(R(w / 2 - sw / 2, h - 1.25, sw, 0.9, { rx: 0.12 * s }), R(w / 2 - sw / 2, h - 1.25, sw, 0.25), R(w / 2 - 0.6, h - 2.4, 1.2, 0.6, { rx: 0.08 * s }));
    out.push(rect(X(w / 2 - sw / 2 - 0.2), Y(h - 2.9), (sw + 0.4) * s, 2.1 * s, { fill: 'none', stroke: col.furnLine, strokeDasharray: '4 3', strokeWidth: 1 }));
    out.push(R(w / 2 - 0.9, 0.12, 1.8, 0.35), C(0.6, h - 0.6, 0.35));
  } else if (kind === 'kitchen' || kind === 'pantry' || kind === 'cafekitchen') {
    const cl = Math.min(w - 0.2, 3.6);
    out.push(R(0.05, 0.05, cl, 0.62), R(0.05, 0.05, 0.62, Math.min(h - 0.2, 2.6)));
    out.push(C(0.9, 0.36, 0.13, { fill: 'none' }), C(1.3, 0.36, 0.13, { fill: 'none' }), rect(X(2.0), Y(0.14), 0.55 * s, 0.4 * s, { fill: 'none', stroke: col.furnLine, rx: 3 }));
    if (kind !== 'cafekitchen' && h > 3 && w > 2.6) {
      const tx = w / 2 + 0.3, ty = h / 2 + 0.4;
      out.push(R(tx - 0.8, ty - 0.45, 1.6, 0.9, { rx: 0.05 * s }), ...[-0.5, 0.5].flatMap((dx) => [C(tx + dx, ty - 0.75, 0.22), C(tx + dx, ty + 0.75, 0.22)]));
    }
    if (kind === 'cafekitchen') out.push(R(w / 2 - 0.9, h / 2 - 0.4, 1.8, 0.8));
  } else if (kind === 'dining') {
    const tx = w / 2, ty = h / 2;
    out.push(R(tx - 1, ty - 0.5, 2, 1, { rx: 0.05 * s }), ...[-0.6, 0, 0.6].flatMap((dx) => [C(tx + dx, ty - 0.8, 0.22), C(tx + dx, ty + 0.8, 0.22)]));
  } else if (kind === 'master' || kind === 'bedroom') {
    const bw = kind === 'master' ? 1.6 : 0.95, bl = 2.05;
    const bx = Math.max(0.5, w / 2 - bw / 2), top = room.y === 0;
    const by = top ? 0.1 : h - bl - 0.1;
    out.push(R(bx, by, bw, bl, { rx: 0.06 * s }), R(bx + 0.1, top ? by + 0.1 : by + bl - 0.5, bw - 0.2, 0.4, { rx: 0.1 * s, fill: col.paper }));
    if (kind === 'master') out.push(R(bx - 0.5, top ? 0.1 : h - 0.55, 0.42, 0.45), R(bx + bw + 0.08, top ? 0.1 : h - 0.55, 0.42, 0.45));
    if (w > 2.6) out.push(R(w - 0.65, top ? 0.1 : h - Math.min(1.8, h - 0.3) - 0.1, 0.6, Math.min(1.8, h - 0.3)));
  } else if (kind === 'bath') {
    const top = room.y === 0;
    if (w > 2.2) out.push(R(0.05, top ? 0.05 : h - 0.8, 1.7, 0.75, { rx: 0.3 * s }));
    else out.push(R(0.05, top ? 0.05 : h - 0.95, 0.9, 0.9), line(X(0.05), Y(top ? 0.05 : h - 0.95), X(0.95), Y(top ? 0.95 : h - 0.05), { stroke: col.furnLine }));
    out.push(el('ellipse', { cx: X(w - 0.35), cy: Y(top ? 0.4 : h - 0.4), rx: 0.2 * s, ry: 0.3 * s, fill: col.furn, stroke: col.furnLine }), R(w - 0.62, top ? 0.03 : h - 0.2, 0.55, 0.17));
    if (h > 1.8) out.push(R(w - 0.6, h / 2 - 0.25, 0.5, 0.5, { rx: 0.2 * s }));
  } else if (kind === 'wc') {
    const top = room.y === 0;
    out.push(el('ellipse', { cx: X(w / 2), cy: Y(top ? 0.42 : h - 0.42), rx: 0.2 * s, ry: 0.3 * s, fill: col.furn, stroke: col.furnLine }), R(w / 2 - 0.28, top ? 0.03 : h - 0.2, 0.56, 0.17));
  } else if (kind === 'study') {
    out.push(R(0.1, 0.1, Math.min(1.6, w - 0.3), 0.7), C(0.9, 1.2, 0.28), R(w - 0.45, 0.1, 0.35, Math.min(2, h - 0.3)));
  } else if (kind === 'laundry') {
    out.push(R(0.1, 0.1, 0.6, 0.6), C(0.4, 0.4, 0.22, { fill: 'none' }), R(0.8, 0.1, 0.6, 0.6), C(1.1, 0.4, 0.22, { fill: 'none' }));
  } else if (kind === 'storage') {
    for (let i = 0; i < Math.floor(w / 0.5); i++) out.push(line(X(0.25 + i * 0.5), Y(0.08), X(0.25 + i * 0.5), Y(0.5), { stroke: col.furnLine, strokeWidth: 1 }));
    out.push(R(0.05, 0.05, w - 0.1, 0.5, { fill: 'none' }));
  } else if (kind === 'office') {
    const cols = Math.max(1, Math.floor((w - 1) / 1.8)), rows = Math.max(1, Math.floor((h - 1.5) / 2.2));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const dx = 0.8 + i * 1.8, dy = 0.9 + j * 2.2; out.push(R(dx, dy, 1.4, 0.7), C(dx + 0.7, dy + 1.05, 0.25)); }
  } else if (kind === 'meeting') {
    const tw = Math.min(w - 1.4, 3), tx = w / 2 - tw / 2, ty = h / 2 - 0.55;
    out.push(R(tx, ty, tw, 1.1, { rx: 0.5 * s }));
    for (let i = 0; i < Math.floor(tw / 0.7); i++) out.push(C(tx + 0.35 + i * 0.7, ty - 0.3, 0.22), C(tx + 0.35 + i * 0.7, ty + 1.4, 0.22));
  } else if (kind === 'reception') {
    out.push(path(`M${X(w / 2 - 1.2)} ${Y(h / 2 + 0.6)}Q${X(w / 2)} ${Y(h / 2 - 0.9)} ${X(w / 2 + 1.2)} ${Y(h / 2 + 0.6)}`, { fill: 'none', stroke: col.furnLine, strokeWidth: 0.55 * s, strokeLinecap: 'round', opacity: 0.35 }), C(w / 2, h / 2 + 0.7, 0.26));
    out.push(R(0.2, h - 0.9, 2, 0.75, { rx: 0.1 * s }));
  } else if (kind === 'seating') {
    const cols = Math.max(1, Math.floor((w - 0.8) / 1.6)), rows = Math.max(1, Math.floor((h - 0.8) / 1.6));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const cx = 0.9 + i * 1.6, cy = 0.9 + j * 1.6;
      if ((i + j) % 3 === 2) { out.push(R(cx - 0.4, cy - 0.4, 0.8, 0.8)); continue; }
      out.push(C(cx, cy, 0.35), C(cx - 0.55, cy, 0.18), C(cx + 0.55, cy, 0.18));
    }
  } else if (kind === 'counter') {
    out.push(R(0.4, h / 2 - 0.35, w - 0.8, 0.7, { rx: 0.1 * s }));
    for (let i = 0; i < Math.floor((w - 1) / 0.7); i++) out.push(C(0.85 + i * 0.7, h / 2 + 0.7, 0.18));
  }
  return out.join('');
}

export function generateFloorplan(spec) {
  const ctx = context(spec);
  const { C, pair, palette, r } = ctx;
  const type = PLAN_TYPES.includes(spec.planType) ? spec.planType : 'apartment';
  const bedrooms = Math.max(1, Math.min(5, spec.bedrooms || 2));
  const Lay = layout(type, bedrooms, spec.area, r);
  const style = spec.style === 'blueprint' || spec.style === 'clean' ? spec.style : (spec.sketch ? 'clean' : r.pick(['blueprint', 'clean', 'clean']));
  const bp = style === 'blueprint';
  const col = bp
    ? { bg: '#16406f', floor: '#1b4a7e', wall: '#f2f6ff', furn: 'none', furnLine: 'rgba(230,240,255,.75)', text: '#f2f6ff', sub: 'rgba(230,240,255,.7)', paper: 'rgba(230,240,255,.15)', wet: '#1f5590', dim: 'rgba(230,240,255,.8)' }
    : { bg: spec.sketch ? '#f6f1e6' : '#fbfaf7', floor: '#ffffff', wall: '#1d1d1f', furn: '#ffffff', furnLine: '#6b6b70', text: '#1d1d1f', sub: '#76767b', paper: '#f1f0ec', wet: mix(C.secondary, '#ffffff', 0.82), dim: '#555' };
  const PW = 1600, PH = 1000;
  const s = Math.min((PW - 600) / Lay.W, (PH - 240) / Lay.D);
  const ox = 120, oy = 130;
  const hand = spec.sketch ? "'Caveat', cursive" : fontStack(pair.body[0]);
  const G = [];
  const tint = (k) => bp ? (['bath', 'wc', 'laundry'].includes(k) ? col.wet : col.floor) : ['bath', 'wc', 'laundry'].includes(k) ? col.wet : k === 'hall' ? '#f4f3ef' : ['living', 'seating', 'office'].includes(k) ? mix(C.primary, '#ffffff', 0.9) : ['kitchen', 'dining', 'counter', 'pantry', 'cafekitchen'].includes(k) ? mix(C.accent, '#ffffff', 0.88) : '#ffffff';
  const defs = el('pattern', { id: 'tile' + ctx.seed, width: 0.3 * s, height: 0.3 * s, patternUnits: 'userSpaceOnUse' }, path(`M${0.3 * s} 0V${0.3 * s}H0`, { fill: 'none', stroke: bp ? 'rgba(230,240,255,.18)' : 'rgba(0,0,0,.08)', strokeWidth: 1 }));
  // floors
  for (const rm of Lay.rooms) {
    G.push(rect(rm.x * s, rm.y * s, rm.w * s, rm.h * s, { fill: tint(rm.kind) }));
    if (['bath', 'wc', 'laundry', 'kitchen', 'pantry', 'cafekitchen'].includes(rm.kind)) G.push(rect(rm.x * s, rm.y * s, rm.w * s, rm.h * s, { fill: `url(#tile${ctx.seed})` }));
  }
  for (const rm of Lay.rooms) if (rm.kind !== 'hall') G.push(furniture(rm, s, col, r));
  // inner walls: every room edge except the open living–hall and public-zone joints
  const t = 0.12 * s, T = 0.3 * s;
  const segs = [];
  for (const rm of Lay.rooms) {
    if (rm.zone === 'hall') continue;
    const x0 = rm.x, y0 = rm.y, x1 = rm.x + rm.w, y1 = rm.y + rm.h;
    segs.push([x0, y0, x1, y0], [x0, y1, x1, y1], [x0, y0, x0, y1], [x1, y0, x1, y1]);
  }
  const onOuter = ([a, b, c, d]) => (a === c && (Math.abs(a) < 1e-6 || Math.abs(a - Lay.W) < 1e-6)) || (b === d && (Math.abs(b) < 1e-6 || Math.abs(b - Lay.D) < 1e-6));
  const wallsSvg = segs.filter((sg) => !onOuter(sg)).map(([a, b, c, d]) => line(a * s, b * s, c * s, d * s, { stroke: col.wall, strokeWidth: t, strokeLinecap: 'square' })).join('');
  G.push(wallsSvg);
  // public zone ↔ hall: opening across the corridor
  const hall = Lay.corridor;
  G.push(rect(hall.x * s - t, (hall.y + 0.02) * s, t * 2, (hall.h - 0.04) * s, { fill: tint('hall') }));
  // kitchen ↔ living: wide opening
  const pubs = Lay.rooms.filter((x) => x.zone === 'pub');
  for (let i = 1; i < pubs.length; i++) { const yy = pubs[i].y, ow = Math.min(2.4, Lay.Wp * 0.5); G.push(rect((Lay.Wp - ow - 0.4) * s, yy * s - t, ow * s, t * 2, { fill: tint(pubs[i].kind) })); }
  // outer walls
  G.push(rect(-T / 2, -T / 2, Lay.W * s + T, Lay.D * s + T, { fill: 'none', stroke: col.wall, strokeWidth: T }));
  // doors from the hall into private rooms
  const doorSvg = [];
  const door = (hx, hy, wdt, dir, swing) => {           // hinge point (m), width (m), wall along x ('h') or y ('v'), swing sign
    const H = [hx * s, hy * s], wpx = wdt * s;
    if (dir === 'h') {
      doorSvg.push(rect(H[0], H[1] - t * 0.8, wpx, t * 1.6, { fill: col.floor === '#ffffff' ? '#ffffff' : col.floor }));
      doorSvg.push(line(H[0], H[1], H[0], H[1] + swing * wpx, { stroke: col.wall, strokeWidth: 2 }), path(`M${H[0]} ${H[1] + swing * wpx}A${wpx} ${wpx} 0 0 ${swing > 0 ? 0 : 1} ${H[0] + wpx} ${H[1]}`, { fill: 'none', stroke: col.furnLine, strokeWidth: 1, strokeDasharray: '3 3' }));
    } else {
      doorSvg.push(rect(H[0] - t * 0.8, H[1], t * 1.6, wpx, { fill: col.floor === '#ffffff' ? '#ffffff' : col.floor }));
      doorSvg.push(line(H[0], H[1], H[0] + swing * wpx, H[1], { stroke: col.wall, strokeWidth: 2 }), path(`M${H[0] + swing * wpx} ${H[1]}A${wpx} ${wpx} 0 0 ${swing > 0 ? 1 : 0} ${H[0]} ${H[1] + wpx}`, { fill: 'none', stroke: col.furnLine, strokeWidth: 1, strokeDasharray: '3 3' }));
    }
  };
  for (const rm of Lay.rooms.filter((x) => x.zone === 'priv')) {
    const dw = ['bath', 'wc', 'storage', 'laundry'].includes(rm.kind) ? 0.7 : 0.85;
    const hx = rm.x + Math.min(0.25, Math.max(0.1, rm.w - dw - 0.1));
    if (Math.abs(rm.y + rm.h - hall.y) < 1e-3) door(hx, hall.y, Math.min(dw, rm.w - 0.2), 'h', -1);          // room above the hall
    else if (Math.abs(rm.y - (hall.y + hall.h)) < 1e-3) door(hx, rm.y, Math.min(dw, rm.w - 0.2), 'h', 1);     // room below
  }
  // entrance
  const ent = hall.w > 0.5 ? [Lay.W, hall.y + Math.max(0.15, (hall.h - 0.95) / 2)] : [Lay.W, Lay.D / 2];
  doorSvg.push(rect(ent[0] * s - T * 0.6, ent[1] * s, T * 1.2, 0.95 * s, { fill: tint('hall') }), line(ent[0] * s, ent[1] * s, ent[0] * s - 0.95 * s, ent[1] * s, { stroke: col.wall, strokeWidth: 3 }),
    path(`M${ent[0] * s - 0.95 * s} ${ent[1] * s}A${0.95 * s} ${0.95 * s} 0 0 0 ${ent[0] * s} ${(ent[1] + 0.95) * s}`, { fill: 'none', stroke: col.furnLine, strokeDasharray: '3 3' }),
    path(`M${ent[0] * s + 22} ${(ent[1] + 0.475) * s}h26m-9-7l9 7-9 7`, { fill: 'none', stroke: col.text, strokeWidth: 2 }), text(ent[0] * s + 56, (ent[1] + 0.475) * s + 5, 'ENTRY', { fontFamily: hand, fontSize: 13, fill: col.sub, fontWeight: 600, letterSpacing: 1.5 }));
  G.push(doorSvg.join(''));
  // windows on exterior walls
  const win = [];
  const addWin = (x0, y0, x1, y1) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const wl = Math.min(len * 0.55, 1.8); if (wl < 0.6) return;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hz = y0 === y1;
    const a = hz ? [(cx - wl / 2) * s, cy * s] : [cx * s, (cy - wl / 2) * s];
    if (hz) win.push(rect(a[0], a[1] - T / 2 - 1, wl * s, T + 2, { fill: col.bg === '#16406f' ? col.floor : '#ffffff', stroke: col.wall, strokeWidth: 1.5 }), line(a[0], a[1], a[0] + wl * s, a[1], { stroke: col.wall, strokeWidth: 1.5 }));
    else win.push(rect(a[0] - T / 2 - 1, a[1], T + 2, wl * s, { fill: col.bg === '#16406f' ? col.floor : '#ffffff', stroke: col.wall, strokeWidth: 1.5 }), line(a[0], a[1], a[0], a[1] + wl * s, { stroke: col.wall, strokeWidth: 1.5 }));
  };
  for (const rm of Lay.rooms) {
    if (['storage', 'hall', 'wc'].includes(rm.kind)) continue;
    const edges = [];
    if (rm.y < 1e-3) edges.push([rm.x, 0, rm.x + rm.w, 0]);
    if (Math.abs(rm.y + rm.h - Lay.D) < 1e-3) edges.push([rm.x, Lay.D, rm.x + rm.w, Lay.D]);
    if (rm.x < 1e-3) edges.push([0, rm.y, 0, rm.y + rm.h]);
    if (Math.abs(rm.x + rm.w - Lay.W) < 1e-3 && !(rm.y <= ent[1] && rm.y + rm.h >= ent[1] + 0.95)) edges.push([Lay.W, rm.y, Lay.W, rm.y + rm.h]);
    edges.sort((a, b) => Math.hypot(b[2] - b[0], b[3] - b[1]) - Math.hypot(a[2] - a[0], a[3] - a[1]));
    edges.slice(0, ['living', 'seating', 'office'].includes(rm.kind) ? 2 : 1).forEach((e) => addWin(...e));
  }
  G.push(win.join(''));
  // labels
  const lab = [];
  for (const rm of Lay.rooms) {
    const a = rm.w * rm.h;
    if (rm.w < 1.1 || rm.h < 1.0) continue;
    const cx = (rm.x + rm.w / 2) * s, cy = (rm.y + rm.h * (['living', 'studio'].includes(rm.kind) ? 0.36 : 0.5)) * s;
    const nm = spec.sketch ? rm.name : rm.name.toUpperCase();
    const fs = Math.max(10, Math.min(15, rm.w * s / (nm.length * 0.75)));
    lab.push(text(cx, cy - 2, nm, { fontFamily: hand, fontWeight: 600, fontSize: spec.sketch ? fs * 1.5 : fs, letterSpacing: spec.sketch ? 0 : 1.2, fill: col.text, textAnchor: 'middle', stroke: tint(rm.kind), strokeWidth: 4, paintOrder: 'stroke', strokeLinejoin: 'round' }));
    lab.push(text(cx, cy + 16, `${a.toFixed(1)} m²`, { fontFamily: hand, fontSize: spec.sketch ? 18 : 12, fill: col.sub, textAnchor: 'middle', stroke: tint(rm.kind), strokeWidth: 4, paintOrder: 'stroke' }));
  }
  G.push(lab.join(''));
  // dimensions
  const dims = [];
  const dim = (x0, y0, x1, y1, label, off) => {
    const hz = y0 === y1, o = off;
    const A = hz ? [x0 * s, y0 * s + o] : [x0 * s + o, y0 * s], B = hz ? [x1 * s, y1 * s + o] : [x1 * s + o, y1 * s];
    dims.push(line(A[0], A[1], B[0], B[1], { stroke: col.dim, strokeWidth: 1 }));
    for (const P2 of [A, B]) dims.push(line(P2[0] - 5, P2[1] + 5, P2[0] + 5, P2[1] - 5, { stroke: col.dim, strokeWidth: 1.4 }), hz ? line(P2[0], P2[1] - 8, P2[0], P2[1] + 8, { stroke: col.dim, strokeWidth: 0.8 }) : line(P2[0] - 8, P2[1], P2[0] + 8, P2[1], { stroke: col.dim, strokeWidth: 0.8 }));
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
    dims.push(text(hz ? mx : mx - 8, hz ? my - 6 : my, label, { fontFamily: hand, fontSize: 12, fill: col.dim, textAnchor: 'middle', transform: hz ? undefined : `rotate(-90 ${mx - 8} ${my})` }));
  };
  dim(0, 0, Lay.W, 0, Lay.W.toFixed(2) + ' m', -52);
  dim(0, 0, 0, Lay.D, Lay.D.toFixed(2) + ' m', -52);
  const topRow = Lay.rooms.filter((x) => x.y < 1e-3).sort((a, b) => a.x - b.x);
  for (const rm of topRow) if (rm.w * s > 50) dim(rm.x, 0, rm.x + rm.w, 0, rm.w.toFixed(2), -26);
  G.push(dims.join(''));
  // sheet
  const plan = g({ transform: `translate(${ox} ${oy})` }, G.join(''));
  const total = Lay.W * Lay.D;
  const nm = spec.name || (type === 'apartment' ? `${bedrooms}-bedroom apartment` : type === 'house' ? `${bedrooms}-bedroom house` : titleCase(type));
  const tbX = PW - 340;
  const sbN = Math.max(1, Math.min(5, Math.floor(250 / s)));
  const sheet = [
    rect(0, 0, PW, PH, { fill: col.bg }),
    bp ? g({ opacity: 0.08 }, ...Array.from({ length: 40 }, (_, i) => line(i * 40, 0, i * 40, PH, { stroke: '#fff' })), ...Array.from({ length: 26 }, (_, i) => line(0, i * 40, PW, i * 40, { stroke: '#fff' }))) : '',
    plan,
    rect(tbX, 60, 300, PH - 120, { fill: 'none', stroke: col.text, strokeOpacity: 0.35 }),
    text(tbX + 24, 110, 'FLOOR PLAN', { fontFamily: fontStack(pair.body[0]), fontWeight: 600, fontSize: 14, letterSpacing: 4, fill: col.sub }),
    text(tbX + 24, 150, nm.length > 30 ? nm.slice(0, 29) + '…' : nm, { fontFamily: spec.sketch ? hand : fontStack(pair.head[0]), fontWeight: pair.head[1], fontSize: Math.min(spec.sketch ? 34 : 26, fitSize(nm.length > 30 ? nm.slice(0, 29) + '…' : nm, spec.sketch ? 'Caveat' : pair.head[0], 252, 34, { weight: pair.head[1] })), fill: col.text }),
    ...[['Total area', `${total.toFixed(1)} m²`], ['Footprint', `${Lay.W.toFixed(1)} × ${Lay.D.toFixed(1)} m`], ['Rooms', String(Lay.rooms.filter((x) => x.zone !== 'hall').length)], ['Scale', `1 : ${Math.round((1000 * (PW / 420)) / s / 5) * 5} at A3`], ['Drawn by', 'the fly']]
      .map(([k, v], i) => text(tbX + 24, 210 + i * 50, k, { fontFamily: fontStack(pair.body[0]), fontSize: 13, fill: col.sub }) + text(tbX + 24, 230 + i * 50, v, { fontFamily: fontStack(pair.body[0]), fontWeight: 600, fontSize: 18, fill: col.text })),
    // room schedule
    ...Lay.rooms.filter((x) => x.zone !== 'hall').slice(0, 10).map((rm, i) => text(tbX + 24, 500 + i * 24, rm.name, { fontFamily: fontStack(pair.body[0]), fontSize: 13, fill: col.text }) + text(tbX + 276, 500 + i * 24, (rm.w * rm.h).toFixed(1) + ' m²', { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fill: col.sub, textAnchor: 'end' })),
    // north arrow + scale bar
    g({ transform: `translate(${tbX + 250} ${PH - 150})` }, circle(0, 0, 26, { fill: 'none', stroke: col.text, strokeWidth: 1.5 }), path('M0-22L9 12L0 5L-9 12Z', { fill: col.text }), text(0, -32, 'N', { fontFamily: fontStack(pair.body[0]), fontWeight: 600, fontSize: 14, fill: col.text, textAnchor: 'middle' })),
    g({ transform: `translate(${tbX + 24} ${PH - 120})` }, ...Array.from({ length: sbN }, (_, i) => rect(i * s, 0, s, 8, { fill: i % 2 ? 'none' : col.text, stroke: col.text, strokeWidth: 1 })), ...[0, sbN].map((m) => text(m * s, 26, m + (m === sbN ? ' m' : ''), { fontFamily: fontStack(pair.body[0]), fontSize: 12, fill: col.sub, textAnchor: 'middle' }))),
  ].join('');
  const fonts = fontsOf(pair, [['JetBrains Mono', 400], ['Caveat', 400], ['Caveat', 700]]);
  const svg = doc(PW, PH, sheet, { defs, fonts, seed: ctx.seed, sketch: spec.sketch, sketchStrength: 0.6, paper: '#f6f1e6', title: nm + ' floor plan' });
  const rooms = Lay.rooms.filter((x) => x.zone !== 'hall');
  const notes = [
    `**${nm}**, ${total.toFixed(0)} m² — ${style === 'blueprint' ? 'blueprint' : 'presentation'} plan.`,
    `Zoning: the ${pubs.map((p) => p.name.toLowerCase()).join(' + ')} forms the public zone along one façade; a ${hall.h.toFixed(1)} m hall separates it from the private rooms so every room opens off circulation, not through another room.`,
    `Wet rooms (${rooms.filter((x) => ['bath', 'wc', 'laundry'].includes(x.kind)).map((x) => x.name).join(', ') || '—'}) are grouped together to share one service shaft.`,
    'Rooms: ' + rooms.map((x) => `${x.name} ${(x.w * x.h).toFixed(1)} m²`).join(' · '),
    'It is a concept sketch — structure, codes and exact dimensions need an architect.',
  ].join('\n');
  return design({ kind: 'floorplan', title: `${nm} — floor plan`, svg, spec: { ...spec, planType: type, bedrooms, style }, notes, palette, pair, w: PW, h: PH, assets: [] });
}
