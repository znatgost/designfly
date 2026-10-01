// What the critic network receives about a mark: an 8×8 "retina" (ink coverage per cell) plus 20
// named design features measured on the 32×32 raster. Also the "instinct": a hand-written score
// from design rules that bootstraps the network before the user has taught it anything.
import { rasterize, RES, isRound, isStroke } from './genome.js';
import { hexToOklch } from '../design/color.js';

export const RETINA = 8;
export const FEATURE_NAMES = [
  'ink coverage', 'mirror symmetry', 'top–bottom symmetry', 'rotational symmetry', 'off-centre', 'compactness', 'squareness', 'edge density',
  'separate pieces', 'holes / negative space', 'colours used', 'dominant colour share', 'colour contrast', 'roundness', 'line work',
  'complexity', 'radial order', 'outer weight', 'overflow', 'small-size legibility',
];
export const N_INPUT = RETINA * RETINA + FEATURE_NAMES.length;

function components(mask, W) {
  const seen = new Uint8Array(mask.length); let n = 0, holes = 0; const sizes = [];
  for (let i = 0; i < mask.length; i++) {
    if (seen[i]) continue;
    const v = mask[i]; seen[i] = 1; const st = [i]; let sz = 0, border = false;
    while (st.length) {
      const k = st.pop(); sz++; const x = k % W, y = (k / W) | 0;
      if (x === 0 || y === 0 || x === W - 1 || y === W - 1) border = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= W) continue; const q = ny * W + nx; if (!seen[q] && mask[q] === v) { seen[q] = 1; st.push(q); } }
    }
    if (v) { n++; sizes.push(sz); } else if (!border && sz >= 2) holes++;
  }
  return { n, holes, sizes };
}

/** → { x: Float32Array(N_INPUT), named: {...}, px } ; cols = brand colours [c0, c1, c2] */
export function features(g, cols = ['#1d1d1f', '#e8590c', '#2b6de0']) {
  const { px, overflow } = rasterize(g);
  const W = RES, N = W * W;
  const ink = new Uint8Array(N); let area = 0, cx = 0, cy = 0, x0 = W, x1 = -1, y0 = W, y1 = -1, edges = 0, inner = 0;
  const cc = [0, 0, 0];
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, v = px[k];
    if (v < 0) continue;
    ink[k] = 1; area++; cx += i; cy += j; cc[v]++;
    if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j;
    const r = Math.hypot(i + 0.5 - W / 2, j + 0.5 - W / 2); if (r < W * 0.25) inner++;
  }
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (i < W - 1 && ink[k] !== ink[k + 1]) edges++; if (j < W - 1 && ink[k] !== ink[k + W]) edges++; }
  const cov = area / N;
  let mir = 0, tb = 0, rot = 0;
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { const a = px[j * W + i]; if (a === px[j * W + (W - 1 - i)]) mir++; if (a === px[(W - 1 - j) * W + i]) tb++; if (a === px[(W - 1 - j) * W + (W - 1 - i)]) rot++; }
  const symScore = (m) => (area ? Math.max(0, (m / N - (1 - cov)) / Math.max(cov, 1e-3)) : 0);
  const comp = components(ink, W);
  const off = area ? Math.hypot(cx / area + 0.5 - W / 2, cy / area + 0.5 - W / 2) / (W / 2) : 0;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const used = cc.filter((c) => c > 0).length;
  const Ls = cc.map((c, i) => (c ? hexToOklch(cols[i] || cols[0])[0] : null)).filter((l) => l !== null);
  let lc = 0; if (Ls.length > 1) { lc = 1; for (let a = 0; a < Ls.length; a++) for (let b = a + 1; b < Ls.length; b++) lc = Math.min(lc, Math.abs(Ls[a] - Ls[b])); }
  const fillGenes = g.genes.filter((x) => !x.cut);
  // small-size legibility: pieces surviving a 8×8 downsample vs. at full res
  const R = RETINA, cell = W / R, retina = new Float32Array(R * R);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) if (ink[j * W + i]) retina[((j / cell) | 0) * R + ((i / cell) | 0)] += 1 / (cell * cell);
  const small = new Uint8Array(R * R); for (let i = 0; i < R * R; i++) small[i] = retina[i] > 0.4 ? 1 : 0;
  const cs = components(small, R);
  const legible = comp.n ? Math.min(1, cs.n / comp.n) * (1 - Math.min(1, comp.holes ? Math.max(0, comp.holes - cs.holes) / comp.holes : 0) * 0.5) : 0;
  const named = {
    'ink coverage': cov, 'mirror symmetry': symScore(mir), 'top–bottom symmetry': symScore(tb), 'rotational symmetry': symScore(rot),
    'off-centre': Math.min(1, off * 2), compactness: area ? area / (bw * bh) : 0, squareness: area ? Math.min(bw, bh) / Math.max(bw, bh) : 0,
    'edge density': area ? Math.min(1, edges / (area * 1.2)) : 0, 'separate pieces': Math.min(1, comp.n / 6), 'holes / negative space': Math.min(1, comp.holes / 4),
    'colours used': used / 3, 'dominant colour share': area ? Math.max(...cc) / area : 0, 'colour contrast': lc,
    roundness: fillGenes.filter((x) => isRound(x.t)).length / Math.max(1, fillGenes.length), 'line work': fillGenes.filter((x) => isStroke(x.t)).length / Math.max(1, fillGenes.length),
    complexity: Math.min(1, (g.genes.length * (g.sym === 'radial' ? g.n : g.sym === 'mirror' ? 2 : 1)) / 16), 'radial order': g.sym === 'radial' ? g.n / 8 : 0,
    'outer weight': area ? 1 - inner / area : 0, overflow: Math.min(1, overflow), 'small-size legibility': legible,
  };
  const x = new Float32Array(N_INPUT);
  for (let i = 0; i < R * R; i++) x[i] = retina[i] * 2 - 1;
  FEATURE_NAMES.forEach((n, i) => { x[R * R + i] = Math.max(0, Math.min(1, named[n])) * 2 - 1; });
  return { x, named, px };
}

const bump = (v, mu, sd) => Math.exp(-(((v - mu) / sd) ** 2) / 2);
/** design-rule instinct in 0..1 (what the fly "knows" before anyone teaches it) */
export function instinct(named) {
  const f = named;
  let s = 0;
  s += 1.2 * bump(f['ink coverage'], 0.36, 0.14);
  s += 0.9 * Math.max(f['mirror symmetry'], f['rotational symmetry'], f['radial order'] > 0 ? 0.75 : 0);
  s += 0.6 * (1 - f['off-centre']);
  s += 0.5 * (f['separate pieces'] * 6 <= 3 ? 1 : 0.3);
  s += 0.6 * f['small-size legibility'];
  s += 0.3 * (f['colours used'] > 0.5 && f['colours used'] < 1 ? 1 : 0.5);
  s += 0.3 * f['colour contrast'];
  s += 0.35 * f['holes / negative space'];
  s += 0.3 * (f.complexity > 0.1 && f.complexity < 0.55 ? 1 : 0);
  s -= 0.3 * Math.max(0, f.roundness - 0.8) * (1 - f['holes / negative space']);
  s -= 1.2 * f.overflow;
  s -= 0.5 * Math.max(0, f.complexity - 0.6);
  s -= 0.4 * Math.max(0, f['edge density'] - 0.55);
  return Math.max(0, Math.min(1, (s + 0.6) / 4.6));
}
