// The fly paints. No recipes: it looks at a reference (the studio, itself, your photo, an idea),
// compares it with its canvas and puts each brush stroke where the two differ most, following
// the form (strokes run along edges, not across them). Coarse brushes first, finer ones later —
// how many layers, how precise the colour mixing and how steady the hand is depends on its skill.
import { rng } from '../design/rng.js';
import { Pen } from '../hand/pen.js';

const GROUND = { white: [244, 240, 232], sienna: [168, 98, 60], grey: [126, 122, 116], paper: [232, 218, 192] };
const STYLE = {
  broad:    { radii: [13, 8, 5, 3.2, 2.2], len: 12, fc: 0.6, min: 2 },
  fine:     { radii: [10, 6, 4, 2.6, 1.8], len: 10, fc: 0.5, min: 2 },
  dabs:     { radii: [9, 6, 4, 2.8, 2], len: 1, fc: 0, min: 0 },
  scribble: { radii: [12, 7, 4.5, 3, 2.2], len: 16, fc: 0.15, min: 3 },
};
export const PAINT_CHOICES = { style: Object.keys(STYLE), palette: ['true', 'warm', 'cool', 'vivid', 'muted'], ground: Object.keys(GROUND) };

const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

function toFloat(img, palette, levels) {
  const n = img.w * img.h, T = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) T[i * 3 + k] = img.data[i * 4 + k];
  if (levels) {         // stretch the tones like a painter squinting at a dim room
    const L = [];
    for (let i = 0; i < n; i++) L.push(0.3 * T[i * 3] + 0.59 * T[i * 3 + 1] + 0.11 * T[i * 3 + 2]);
    L.sort((a, b) => a - b);
    const lo = L[Math.floor(n * 0.03)], hi = L[Math.floor(n * 0.97)], s = 235 / Math.max(30, hi - lo);
    for (let i = 0; i < n * 3; i++) T[i] = (T[i] - lo) * s + 10;
  }
  for (let i = 0; i < n; i++) {
    let [r, g, b] = [T[i * 3], T[i * 3 + 1], T[i * 3 + 2]];
    const m = (r + g + b) / 3;
    if (palette === 'warm') { r += 18; b -= 16; }
    else if (palette === 'cool') { r -= 14; b += 18; }
    else if (palette === 'vivid') { r = m + (r - m) * 1.45; g = m + (g - m) * 1.45; b = m + (b - m) * 1.45; }
    else if (palette === 'muted') { r = m + (r - m) * 0.55 + 6; g = m + (g - m) * 0.55 + 4; b = m + (b - m) * 0.55; }
    T[i * 3] = Math.max(0, Math.min(255, r)); T[i * 3 + 1] = Math.max(0, Math.min(255, g)); T[i * 3 + 2] = Math.max(0, Math.min(255, b));
  }
  return T;
}
function blur(T, w, h, rad) {
  const R = Math.max(1, Math.round(rad)), out = new Float32Array(T.length), tmp = new Float32Array(T.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++) {
    let s = 0, c = 0; for (let dx = -R; dx <= R; dx++) { const xx = x + dx; if (xx >= 0 && xx < w) { s += T[(y * w + xx) * 3 + k]; c++; } } tmp[(y * w + x) * 3 + k] = s / c;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++) {
    let s = 0, c = 0; for (let dy = -R; dy <= R; dy++) { const yy = y + dy; if (yy >= 0 && yy < h) { s += tmp[(yy * w + x) * 3 + k]; c++; } } out[(y * w + x) * 3 + k] = s / c;
  }
  return out;
}
/** the fly's paint box: a few tubes squeezed from the colours it sees */
function tubes(T, n, k, r) {
  const px = []; for (let i = 0; i < n; i += 7) px.push([T[i * 3], T[i * 3 + 1], T[i * 3 + 2]]);
  const C0 = [px[Math.floor(r.next() * px.length)].slice()];               // spread the starting tubes (farthest-point)
  while (C0.length < k) { let best = px[0], bd = -1; for (const p of px) { const d = Math.min(...C0.map((c) => d2(p, c))); if (d > bd) { bd = d; best = p; } } C0.push(best.slice()); }
  let C = C0;
  for (let it = 0; it < 14; it++) {
    const S = C.map(() => [0, 0, 0, 0]);
    for (const p of px) { let bi = 0, bd = Infinity; C.forEach((c, j) => { const d = d2(p, c); if (d < bd) { bd = d; bi = j; } }); S[bi][0] += p[0]; S[bi][1] += p[1]; S[bi][2] += p[2]; S[bi][3]++; }
    C = C.map((c, j) => (S[j][3] ? [S[j][0] / S[j][3], S[j][1] / S[j][3], S[j][2] / S[j][3]] : c));
  }
  return [...C, [250, 248, 242], [26, 22, 24]];
}
/** mix the wanted colour from two tubes, as precisely as the fly can manage */
function mixFrom(want, tb, steps) {
  let best = tb[0], bd = Infinity;
  for (let i = 0; i < tb.length; i++) for (let j = i; j < tb.length; j++) {
    const a = tb[i], b = tb[j], ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
    let t = L ? ((want[0] - a[0]) * ab[0] + (want[1] - a[1]) * ab[1] + (want[2] - a[2]) * ab[2]) / L : 0;
    t = Math.round(Math.max(0, Math.min(1, t)) * steps) / steps;
    const c = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t], d = d2(c, want);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

/**
 * img: { w, h, data (RGBA) } — small (≈160 px on the long side).
 * o: { seed, skill 0..1, style, palette, ground, outW, levels, sign }
 */
export function paint(img, o = {}) {
  const r = rng((o.seed || 1) * 2654435761 % 4294967296 + 17);
  const w = img.w, h = img.h, n = w * h, skill = Math.max(0, Math.min(1, o.skill ?? 0.2));
  const st = STYLE[o.style] || STYLE.broad, k = (o.outW || 1200) / w, OW = Math.round(w * k), OH = Math.round(h * k);
  const T = toFloat(img, o.palette || 'true', o.levels);
  if (o.tone === 'dark') for (let i = 0; i < T.length; i++) T[i] *= 0.6;
  const tb = tubes(T, n, 5 + Math.round(skill * 5), r), steps = 3 + Math.round(skill * 6);
  const ground = GROUND[o.ground] || GROUND.white;
  const C = new Float32Array(n * 3); for (let i = 0; i < n; i++) C.set(ground, i * 3);
  const mark = new Int32Array(n); let sid = 0;
  const ops = [{ k: 'f', p: [[0, 0], [OW, 0], [OW, OH], [0, OH]], c: hex(ground), a: 1, z: 0 }];
  const nLayers = 3 + Math.round(skill * 2), radii = st.radii.slice(0, nLayers).map((v) => (v * w) / 160);
  const thresh = 30 - skill * 14, jit = 0.5 * (1 - skill), cap = 1000 + Math.round(skill * 1400);
  let strokes = 0;
  const at = (A, x, y) => { const i = (Math.max(0, Math.min(h - 1, Math.round(y))) * w + Math.max(0, Math.min(w - 1, Math.round(x)))) * 3; return [A[i], A[i + 1], A[i + 2]]; };
  for (const R of radii) {
    if (strokes >= cap) break;
    const ref = blur(T, w, h, R / 2);
    const lum = new Float32Array(n); for (let i = 0; i < n; i++) lum[i] = 0.3 * ref[i * 3] + 0.59 * ref[i * 3 + 1] + 0.11 * ref[i * 3 + 2];
    const L = (x, y) => lum[Math.max(0, Math.min(h - 1, y | 0)) * w + Math.max(0, Math.min(w - 1, x | 0))];
    const g = Math.max(1, Math.round(R)), cells = [];
    for (let y = 0; y < h; y += g) for (let x = 0; x < w; x += g) cells.push([x, y]);
    const layer = [];
    for (const [cx, cy] of r.shuffle(cells)) {
      let sum = 0, cnt = 0, mx = -1, bx = cx, by = cy;
      for (let y = cy; y < Math.min(h, cy + g); y++) for (let x = cx; x < Math.min(w, cx + g); x++) {
        const i = (y * w + x) * 3, e = Math.sqrt((C[i] - ref[i]) ** 2 + (C[i + 1] - ref[i + 1]) ** 2 + (C[i + 2] - ref[i + 2]) ** 2);
        sum += e; cnt++; if (e > mx) { mx = e; bx = x; by = y; }
      }
      if (sum / cnt < thresh) continue;
      // grow a stroke from the worst spot, along the edges of the form
      let x = bx + r.float(-1, 1) * R * jit, y = by + r.float(-1, 1) * R * jit;
      const want = at(ref, x, y), col = mixFrom(want.map((v) => v + r.float(-1, 1) * 22 * (1 - skill)), tb, steps);
      const pts = [[x, y]]; let ldx = 0, ldy = 0;
      for (let s = 1; s <= st.len; s++) {
        const here = at(ref, x, y), cur = at(C, x, y);
        if (s > st.min && d2(here, cur) < d2(here, col)) break;
        const gx = L(x + 1, y) - L(x - 1, y), gy = L(x, y + 1) - L(x, y - 1);
        if (Math.hypot(gx, gy) < 0.5) { if (s > st.min) break; }
        let dx = -gy, dy = gx; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
        if (!Math.hypot(gx, gy)) { const a = r.float(0, 6.28); dx = Math.cos(a); dy = Math.sin(a); }
        if (ldx * dx + ldy * dy < 0) { dx = -dx; dy = -dy; }
        dx = st.fc * dx + (1 - st.fc) * (ldx || dx); dy = st.fc * dy + (1 - st.fc) * (ldy || dy);
        const mm = Math.hypot(dx, dy) || 1; dx /= mm; dy /= mm;
        x += R * dx; y += R * dy;
        if (x < -R || y < -R || x > w + R || y > h + R) break;
        pts.push([x, y]); ldx = dx; ldy = dy;
      }
      layer.push({ pts, R, col });
      if (strokes + layer.length >= cap) break;
    }
    for (const s of layer) {
      const a = 0.9, P = s.pts.length > 1 ? s.pts : [s.pts[0], [s.pts[0][0] + s.R * 0.6, s.pts[0][1] + s.R * 0.2]];
      const each = (fn) => {
        sid++;
        for (let i = 1; i < P.length; i++) {
          const [x0, y0] = P[i - 1], [x1, y1] = P[i], segL = Math.hypot(x1 - x0, y1 - y0), ns = Math.max(1, Math.ceil(segL / (s.R / 2)));
          for (let q = 0; q <= ns; q++) {
            const px = x0 + ((x1 - x0) * q) / ns, py = y0 + ((y1 - y0) * q) / ns, rr = s.R;
            for (let yy = Math.max(0, Math.floor(py - rr)); yy <= Math.min(h - 1, Math.ceil(py + rr)); yy++) for (let xx = Math.max(0, Math.floor(px - rr)); xx <= Math.min(w - 1, Math.ceil(px + rr)); xx++) {
              const j = yy * w + xx;
              if (mark[j] === sid || (xx - px) ** 2 + (yy - py) ** 2 > rr * rr) continue;
              mark[j] = sid; fn(j);
            }
          }
        }
      };
      // look before you paint: would this stroke bring the canvas closer to what I see?
      let gain = 0;
      each((j) => { for (let c = 0; c < 3; c++) { const t = T[j * 3 + c], cur = C[j * 3 + c]; gain += Math.abs(cur - t) - Math.abs(cur * (1 - a) + s.col[c] * a - t); } });
      if (gain <= 0 && !(skill < 0.2 && r.chance(0.35))) continue;      // a beginner doesn't always check
      each((j) => { for (let c = 0; c < 3; c++) C[j * 3 + c] = C[j * 3 + c] * (1 - a) + s.col[c] * a; });
      // … and on the real one
      const wob = (1 - skill) * s.R * k * 0.25;
      const out = P.map(([px, py]) => [px * k + r.float(-wob, wob), py * k + r.float(-wob, wob)]);
      ops.push({ k: 's', p: out, w: 2 * s.R * k * r.float(0.82, 1), c: hex(s.col), a: 0.92, z: 2, nib: 'paint', seed: r.int(0, 9999) });
      if (s.R * k > 26 && r.chance(0.3)) ops.push({ k: 's', p: out.map(([px, py]) => [px + r.float(-2, 2), py - s.R * k * 0.25]), w: s.R * k * 0.35, c: hex(s.col.map((v) => v + 22)), a: 0.4, z: 2, nib: 'paint', seed: 1 });
      strokes++;
    }
    if (o.debug) { let e = 0; for (let i = 0; i < n * 3; i++) e += Math.abs(C[i] - T[i]); console.log('layer R', R.toFixed(2), 'strokes', layer.length, 'likeness', (1 - e / (n * 3) / 96).toFixed(3)); }
  }
  let err = 0; for (let i = 0; i < n * 3; i++) err += Math.abs(C[i] - T[i]);
  const likeness = Math.max(0, 1 - err / (n * 3) / 96);
  if (o.sign !== false) {
    const S = new Pen(r, { wobble: 1.5, ink: hex(tb[tb.length - 1]), w: 2.4, nib: 'pen', fill: 'none', guide: '#999' });
    const bl = at(C, w - 6, h - 4).reduce((a2, b2) => a2 + b2, 0) / 3;
    S.text(o.signature || 'fly', OW - 34, OH - 52, 26, { align: 'right', c: bl < 110 ? '#f1ece2' : '#2a2320', bounce: true, w: 2.6 });
    ops.push(...S.ops.map((op) => ({ ...op, z: 3 })));
  }
  return { ops, w: OW, h: OH, strokes, layers: radii.length, tubes: tb.length, likeness, ground: hex(ground) };
}
