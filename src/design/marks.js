// Logo marks, drawn in a 100×100 box centred on (0,0). Every mark is a function
// (r, cols, opts) → svg string, where cols = [main, second, accent] and opts = { letter, font, weight, id }.
import { el, g, rect, circle, path, poly, regularPolygon, star, arcPath, P, text } from './svg.js';
import { fontStack } from './type.js';
import { hashString, rng } from './rng.js';
import { genomeSVG, cleanGenome } from '../learn/genome.js';

const TAU = Math.PI * 2;

export const MARKS = {
  bauhaus(r, [a, b, c]) {
    const tile = (x, y, col, k, rot) => {
      const cx = x + 22.5, cy = y + 22.5;
      const shapes = [
        path(`M${x} ${y + 45}A45 45 0 0 1 ${x + 45} ${y}L${x + 45} ${y + 45}Z`, { fill: col }),   // quarter circle
        circle(cx, cy, 22.5, { fill: col }),
        path(`M${x} ${y + 45}A22.5 22.5 0 0 1 ${x + 45} ${y + 45}Z`, { fill: col }),              // half
        poly([[x, y + 45], [x + 45, y + 45], [x + 45, y]], { fill: col }),
        rect(x, y, 45, 45, { fill: col }),
      ];
      return g({ transform: `rotate(${rot} ${cx} ${cy})` }, shapes[k]);
    };
    const cols = r.shuffle([a, b, c, a]);
    const ks = [0, 1, 2, 3].map(() => r.pick([0, 0, 1, 2, 3, 4]));
    if (!ks.includes(0)) ks[r.int(0, 3)] = 0;
    return [[-47, -47], [2, -47], [-47, 2], [2, 2]].map(([x, y], i) => tile(x, y, cols[i], ks[i], r.pick([0, 90, 180, 270]))).join('');
  },
  orbit(r, [a, b, c]) {
    const tilt = r.pick([-28, -18, 20, 30]);
    return circle(0, 0, 26, { fill: a }) +
      el('ellipse', { cx: 0, cy: 0, rx: 46, ry: 15, fill: 'none', stroke: b, strokeWidth: 6, transform: `rotate(${tilt})` }) +
      circle(40 * Math.cos((tilt * Math.PI) / 180), 40 * Math.sin((tilt * Math.PI) / 180) - 4, 7, { fill: c });
  },
  layers(r, [a, b, c]) {
    const layer = (y, col) => poly([[0, y - 17], [44, y], [0, y + 17], [-44, y]], { fill: col });
    return layer(22, c) + layer(4, b) + layer(-14, a);
  },
  petal(r, [a, b, c]) {
    const n = r.pick([5, 6, 8]), cols = [a, b, c];
    return g({}, Array.from({ length: n }, (_, i) =>
      el('ellipse', { cx: 0, cy: -22, rx: 14, ry: 26, fill: cols[i % 3], opacity: 0.85, transform: `rotate(${(360 / n) * i})` })).join(''));
  },
  wave(r, [a, b, c], o) {
    const id = 'wv' + o.id;
    const w = (y, amp, col, ph) => path(`M-60 ${y}` + Array.from({ length: 13 }, (_, i) => { const x = -60 + i * 10; return `L${x} ${y + Math.sin(i * 0.9 + ph) * amp}`; }).join('') + 'L60 60L-60 60Z', { fill: col });
    return el('clipPath', { id }, circle(0, 0, 46)) + g({ clipPath: `url(#${id})` }, circle(0, 0, 46, { fill: c }), w(-8, 7, b, 0), w(10, 7, a, 1.4));
  },
  spark(r, [a, b, c]) {
    const n = r.pick([4, 4, 8]);
    const pts = []; for (let i = 0; i < n * 2; i++) { const rr = i % 2 ? (n === 4 ? 11 : 20) : 48, t = -Math.PI / 2 + (i * Math.PI) / n; pts.push([rr * Math.cos(t), rr * Math.sin(t)]); }
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i <= pts.length; i++) { const p = pts[i % pts.length]; d += `Q${pts[(i - 1) % pts.length][0] * 0.15} ${pts[(i - 1) % pts.length][1] * 0.15} ${p[0]} ${p[1]}`; }
    return path(d + 'Z', { fill: a }) + (r.chance(0.6) ? circle(30, -30, 8, { fill: c }) : '');
  },
  leaf(r, [a, b, c]) {
    const leaf = (rot, col, s = 1) => g({ transform: `rotate(${rot}) scale(${s})` },
      path('M0 42C-30 20-30-20 0-46C30-20 30 20 0 42Z', { fill: col }), path('M0 38L0-36', { stroke: '#fff', strokeOpacity: 0.55, strokeWidth: 3, strokeLinecap: 'round' }));
    return r.chance(0.5) ? leaf(-24, a) + leaf(28, b, 0.72) : leaf(0, a);
  },
  chevron(r, [a, b, c]) {
    const ch = (dy, col) => path(`M-40 ${dy + 14}L0 ${dy - 16}L40 ${dy + 14}`, { fill: 'none', stroke: col, strokeWidth: 13, strokeLinecap: r.chance(0.5) ? 'round' : 'butt', strokeLinejoin: 'round' });
    return ch(-18, a) + ch(6, b) + ch(30, c);
  },
  pixel(r, [a, b, c], o) {
    let h = hashString((o.letter || '') + o.id);
    const cells = [];
    for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) { h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0; if (h % 100 < 55) { cells.push([x, y, h % 7 === 0]); if (x < 2) cells.push([4 - x, y, h % 7 === 0]); } }
    if (cells.length < 6) cells.push([2, 0, false], [2, 2, false], [2, 4, false], [1, 1, false], [3, 1, false]);
    return cells.map(([x, y, acc]) => rect(-45 + x * 18.4, -45 + y * 18.4, 16, 16, { rx: 3.5, fill: acc ? c : y < 2 ? a : b })).join('');
  },
  rings(r, [a, b, c]) {
    const n = r.pick([2, 3]);
    return Array.from({ length: n }, (_, i) => { const t = (i / n) * TAU - Math.PI / 2; return circle(Math.cos(t) * 17, Math.sin(t) * 17, 27, { fill: 'none', stroke: [a, b, c][i], strokeWidth: 8 }); }).join('');
  },
  sun(r, [a, b, c], o) {
    const id = 'sn' + o.id;
    return el('clipPath', { id }, path('M-46 20A46 46 0 0 1 46 20Z')) +
      g({ clipPath: `url(#${id})` }, circle(0, 20, 46, { fill: a }), ...[0, 1, 2, 3].map((i) => rect(-50, -2 + i * 6.5, 100, 2 + i * 0.9, { fill: '#fff', opacity: 0.9 }))) +
      rect(-46, 26, 92, 7, { rx: 3.5, fill: b }) + rect(-30, 38, 60, 6, { rx: 3, fill: c });
  },
  drop(r, [a, b, c]) {
    return path('M0-46C18-22 34-6 34 12A34 34 0 0 1-34 12C-34-6-18-22 0-46Z', { fill: a }) + path('M-14 14A16 16 0 0 0 2 30', { fill: 'none', stroke: '#fff', strokeWidth: 6, strokeLinecap: 'round', opacity: 0.8 });
  },
  mountain(r, [a, b, c]) {
    return poly([[-48, 36], [-12, -30], [24, 36]], { fill: a }) + poly([[-4, 36], [22, -8], [48, 36]], { fill: b }) + poly([[-12, -30], [-22, -12], [-12, -18], [-2, -12]], { fill: '#fff', opacity: 0.9 }) + circle(28, -30, 9, { fill: c });
  },
  house(r, [a, b, c]) {
    return path('M-40 0L0-38L40 0', { fill: 'none', stroke: a, strokeWidth: 10, strokeLinejoin: 'round', strokeLinecap: 'round' }) + rect(-28, 2, 56, 40, { fill: b, rx: 3 }) + rect(-8, 16, 16, 26, { fill: c, rx: 2 });
  },
  bolt(r, [a, b, c]) {
    return circle(0, 0, 46, { fill: b }) + poly([[8, -38], [-22, 6], [-2, 6], [-10, 38], [22, -8], [2, -8]], { fill: a });
  },
  heart(r, [a, b, c]) {
    return path('M0 40C-60 2-30-52 0-18C30-52 60 2 0 40Z', { fill: a }) + circle(22, -32, 7, { fill: c });
  },
  cup(r, [a, b, c]) {
    return path('M-34-10H26V12A26 26 0 0 1 0 38H-8A26 26 0 0 1-34 12Z', { fill: a }) + path('M26-2A12 12 0 0 1 26 22', { fill: 'none', stroke: a, strokeWidth: 7 }) +
      path('M-18-22C-24-32-12-36-18-46M-2-22C-8-32 4-36-2-46', { fill: 'none', stroke: b, strokeWidth: 5, strokeLinecap: 'round' }) + rect(-42, 40, 76, 6, { rx: 3, fill: c });
  },
  bubble(r, [a, b, c]) {
    return path('M-40-30Q-40-42-28-42H28Q40-42 40-30V10Q40 22 28 22H-6L-24 40V22H-28Q-40 22-40 10Z', { fill: a }) + [-18, 0, 18].map((x, i) => circle(x, -10, 5.5, { fill: [b, c, b][i] })).join('');
  },
  play(r, [a, b, c]) {
    return circle(0, 0, 46, { fill: a }) + poly([[-12, -20], [24, 0], [-12, 20]], { fill: '#fff' }) + circle(0, 0, 46, { fill: 'none', stroke: c, strokeWidth: 4, strokeDasharray: '6 8' });
  },
  paw(r, [a, b, c]) {
    return el('ellipse', { cx: 0, cy: 16, rx: 22, ry: 19, fill: a }) + [[-28, -10], [-11, -30], [11, -30], [28, -10]].map(([x, y], i) => el('ellipse', { cx: x, cy: y, rx: 9, ry: 12, fill: i % 3 ? b : a })).join('');
  },
  monogram(r, [a, b, c], o) {
    const shape = o.shape || r.pick(['circle', 'rounded', 'hex', 'shield', 'diamond', 'arch']);
    const outline = o.outline ?? r.chance(0.35);
    const shp = {
      circle: circle(0, 0, 46), rounded: rect(-45, -45, 90, 90, { rx: 22 }), hex: poly(regularPolygon(0, 0, 49, 6, 0)),
      shield: path('M-40-40H40V2C40 26 20 40 0 48C-20 40-40 26-40 2Z'), diamond: poly([[0, -50], [48, 0], [0, 50], [-48, 0]]),
      arch: path('M-38 46V-6A38 38 0 0 1 38-6V46Z'),
    }[shape];
    const fillAttr = outline ? `fill="none" stroke="${a}" stroke-width="5"` : `fill="${a}"`;
    const s = shp.replace(/\/>$/, ` ${fillAttr}/>`);
    const L = o.letter || 'D';
    const size = (L.length > 1 ? 40 : 56) * ({ diamond: 0.78, hex: 0.9, circle: 0.92, shield: 0.88 }[shape] || 1);
    return s + text(0, size * 0.36 + (shape === 'shield' ? -2 : shape === 'arch' ? 6 : 0), L, {
      fontFamily: fontStack(o.font), fontWeight: o.weight, fontSize: size, textAnchor: 'middle', fill: outline ? a : o.onMain || '#fff', letterSpacing: L.length > 1 ? -1 : 0,
    }) + (r.chance(0.4) && !outline ? circle(30, -30, 6, { fill: c }) : '');
  },
  cut(r, [a, b, c], o) {
    const id = 'ct' + o.id, L = (o.letter || 'D')[0];
    const t = (fill, dx, dy) => text(dx, 36 + dy, L, { fontFamily: fontStack(o.font), fontWeight: o.weight, fontSize: 108, textAnchor: 'middle', fill });
    return el('clipPath', { id: id + 'a' }, poly([[-60, -60], [60, -60], [60, -12], [-60, 12]])) + el('clipPath', { id: id + 'b' }, poly([[-60, 12], [60, -12], [60, 60], [-60, 60]])) +
      g({ clipPath: `url(#${id}a)` }, t(a, -3, -3)) + g({ clipPath: `url(#${id}b)` }, t(b, 3, 3)) + circle(38, 38, 6, { fill: c });
  },
  grid(r, [a, b, c]) {
    const out = [];
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      const k = r.int(0, 3), cx = -32 + x * 32, cy = -32 + y * 32, col = [a, b, c, a][k];
      out.push(k === 0 ? circle(cx, cy, 13, { fill: col }) : k === 1 ? rect(cx - 13, cy - 13, 26, 26, { fill: col }) : k === 2 ? path(arcPath(cx, cy, 11, 0, Math.PI) , { fill: 'none', stroke: col, strokeWidth: 5 }) : circle(cx, cy, 5, { fill: col }));
    }
    return out.join('');
  },
};

// a mark the fly's mind evolved (src/learn): the genome travels in opts.genome
MARKS.genome = (r, [a, b, c], o) => { const g = cleanGenome(o.genome); return g ? genomeSVG(g, [a, b, c], o.id) : MARKS.spark(r, [a, b, c]); };

export const MARK_NAMES = Object.keys(MARKS);
export const INDUSTRY_MARKS = {
  coffee: ['cup', 'monogram', 'sun'], cafe: ['cup', 'monogram', 'petal'], bakery: ['monogram', 'sun', 'petal'], restaurant: ['monogram', 'sun', 'bauhaus'], food: ['monogram', 'leaf', 'sun'], tea: ['leaf', 'cup', 'drop'], bar: ['monogram', 'drop'], wine: ['monogram', 'drop'],
  tech: ['orbit', 'pixel', 'layers', 'chevron', 'spark'], software: ['layers', 'pixel', 'chevron', 'orbit'], startup: ['spark', 'chevron', 'orbit'], ai: ['spark', 'orbit', 'pixel', 'rings'], crypto: ['pixel', 'layers', 'bolt'], saas: ['layers', 'orbit', 'rings'], app: ['spark', 'rings', 'pixel'], game: ['pixel', 'play', 'spark'], gaming: ['pixel', 'bolt', 'chevron'], esports: ['chevron', 'bolt'],
  finance: ['layers', 'chevron', 'monogram'], bank: ['monogram', 'layers'], law: ['monogram'], consulting: ['monogram', 'rings', 'chevron'], insurance: ['monogram', 'heart'],
  health: ['heart', 'leaf', 'drop'], medical: ['heart', 'drop', 'monogram'], clinic: ['heart', 'monogram'], wellness: ['petal', 'leaf', 'drop'], yoga: ['petal', 'sun', 'leaf'], spa: ['drop', 'petal', 'leaf'], fitness: ['bolt', 'chevron', 'spark'], gym: ['bolt', 'chevron', 'monogram'], sport: ['chevron', 'bolt', 'spark'],
  fashion: ['monogram', 'cut'], beauty: ['petal', 'monogram', 'drop'], cosmetics: ['drop', 'petal'], jewelry: ['monogram', 'spark'], boutique: ['monogram', 'petal'], wedding: ['rings', 'monogram', 'heart'],
  architecture: ['bauhaus', 'house', 'layers', 'grid'], interior: ['bauhaus', 'house', 'grid'], construction: ['house', 'layers', 'chevron'], realestate: ['house', 'monogram'], furniture: ['bauhaus', 'grid'],
  eco: ['leaf', 'drop', 'sun'], garden: ['leaf', 'petal'], farm: ['sun', 'leaf', 'mountain'], organic: ['leaf', 'sun'], energy: ['bolt', 'sun'], pet: ['paw', 'heart'],
  kids: ['petal', 'spark', 'grid'], toys: ['bauhaus', 'grid', 'spark'], school: ['monogram', 'layers'], education: ['layers', 'spark', 'monogram'], university: ['monogram'],
  music: ['wave', 'play', 'rings'], studio: ['wave', 'cut', 'bauhaus'], art: ['bauhaus', 'grid', 'petal'], gallery: ['bauhaus', 'cut'], photo: ['rings', 'orbit'], film: ['play', 'rings'], podcast: ['bubble', 'wave', 'play'],
  travel: ['mountain', 'sun', 'orbit'], hotel: ['monogram', 'house'], airline: ['chevron', 'orbit'], surf: ['wave', 'sun'], outdoor: ['mountain', 'leaf', 'sun'],
  books: ['monogram', 'layers'], agency: ['cut', 'bauhaus', 'spark', 'grid'], marketing: ['spark', 'bubble', 'chevron'], media: ['bubble', 'play'], charity: ['heart', 'petal'], logistics: ['chevron', 'layers'], auto: ['chevron', 'bolt'], car: ['chevron', 'bolt'],
};

/** seed makes the mark identical across colour variants */
export function drawMark(name, seed, cols, opts, cx, cy, size) {
  const fn = MARKS[name] || MARKS.monogram;
  return g({ transform: `translate(${cx} ${cy}) scale(${size / 100})` }, fn(rng(seed), cols, opts));
}
