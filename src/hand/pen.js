// The fly's hand. Every mark it makes goes through here: lines wobble, circles don't quite close,
// corners overshoot, colour is filled in afterwards (and slightly misses the outline).
// The result is a list of ops in the order they were drawn — the board replays them live.
import { GLYPHS, GAP, SPACE, glyphText, textUnits } from './glyphs.js';

const TAU = Math.PI * 2;
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

export function resample(pts, step) {
  if (pts.length < 2) return pts.slice();
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = dist(a, b);
    if (!L) continue;
    let s = step - carry;
    while (s < L) { out.push([a[0] + ((b[0] - a[0]) * s) / L, a[1] + ((b[1] - a[1]) * s) / L]); s += step; }
    carry = L - (s - step);
  }
  const last = pts[pts.length - 1];
  if (dist(out[out.length - 1], last) > step * 0.25) out.push(last); else out[out.length - 1] = last;
  return out;
}
export function smooth(pts, closed = false, n = 6) {
  if (pts.length < 3) return pts.slice();
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  const out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(closed ? out[0].slice() : pts[pts.length - 1]);
  return out;
}
export const ellipsePts = (cx, cy, rx, ry, n = 40, a0 = 0, sweep = TAU, rot = 0) => {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i <= n; i++) { const a = a0 + (sweep * i) / n, x = rx * Math.cos(a), y = ry * Math.sin(a); out.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return out;
};
export function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
/** parallel segments clipping a polygon (for hatching) */
export function scanlines(poly, angle, spacing) {
  const c = Math.cos(-angle), s = Math.sin(-angle);
  const R = poly.map(([x, y]) => [x * c - y * s, x * s + y * c]);
  const b = bbox(R), out = [];
  const ci = Math.cos(angle), si = Math.sin(angle), back = ([x, y]) => [x * ci - y * si, x * si + y * ci];
  for (let y = b.y0 + spacing * 0.5; y < b.y1; y += spacing) {
    const xs = [];
    for (let i = 0; i < R.length; i++) {
      const a = R[i], q = R[(i + 1) % R.length];
      if ((a[1] <= y && q[1] > y) || (q[1] <= y && a[1] > y)) xs.push(a[0] + ((y - a[1]) / (q[1] - a[1])) * (q[0] - a[0]));
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > 1) out.push([back([xs[i], y]), back([xs[i + 1], y])]);
  }
  return out;
}

export class Pen {
  /** o: { wobble (px), ink, w, nib: pen|marker|brush, fill: flat|riso|wash|hatch|scribble|none, bg } */
  constructor(r, o) {
    this.r = r; this.o = o;
    this.ops = []; this.fills = [];
    this.wob = o.wobble; this.ink = o.ink; this.w = o.w; this.nib = o.nib || 'pen';
    this.fillStyle = o.fill || 'flat';
    this.risoOff = [r.float(-1, 1), r.float(-1, 1)];
  }
  // ---------------------------------------------------------------- strokes
  /** a hand-drawn polyline; returns the points actually drawn */
  line(pts, o = {}) {
    const r = this.r;
    if (pts.length < 2) return pts;
    let P = o.smooth ? smooth(pts, o.closed) : pts.slice();
    if (o.closed && !o.smooth) P.push(P[0]);
    let L = 0; for (let i = 1; i < P.length; i++) L += dist(P[i - 1], P[i]);
    if (L < 0.5) { this.dot(P[0][0], P[0][1], (o.w ?? this.w) * 0.6, o); return P; }
    const ws = o.wob ?? 1;
    const A = this.wob * ws * Math.min(1, L / 50) * r.float(0.6, 1.2);
    // overshoot (the hand doesn't stop exactly where it meant to)
    const ov = o.over ?? (o.closed ? 0 : this.wob * ws * r.float(0, 1.4));
    if (ov > 0.3 && P.length >= 2) {
      const ext = (a, b, k) => { const d = dist(a, b) || 1; return [b[0] + ((b[0] - a[0]) / d) * k, b[1] + ((b[1] - a[1]) / d) * k]; };
      if (r.chance(0.6)) P.push(ext(P[P.length - 2], P[P.length - 1], ov));
      if (r.chance(0.4)) P.unshift(ext(P[1], P[0], ov * 0.7));
    }
    const step = Math.max(2.5, Math.min(9, L / 40));
    P = resample(P, step);
    const l1 = r.float(140, 280), l2 = r.float(35, 80), f1 = r.float(0, TAU), f2 = r.float(0, TAU);
    let s = 0;
    const out = P.map((p, i) => {
      if (i) s += dist(P[i - 1], p);
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
      const d = dist(a, b) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
      const off = A * (0.65 * Math.sin((TAU * s) / l1 + f1) + 0.35 * Math.sin((TAU * s) / l2 + f2));
      return [p[0] + nx * off, p[1] + ny * off];
    });
    const nib = o.nib || this.nib;
    this.ops.push({ k: 's', p: out, w: o.w ?? this.w, c: o.c ?? this.ink, a: o.a ?? (nib === 'marker' ? 0.94 : 1), z: o.z ?? 2, nib, seed: r.int(0, 9999) });
    return out;
  }
  seg(x1, y1, x2, y2, o) { return this.line([[x1, y1], [x2, y2]], o); }
  curve(pts, o = {}) { return this.line(pts, { ...o, smooth: true }); }
  dot(x, y, rad, o = {}) {
    this.ops.push({ k: 'f', p: ellipsePts(x, y, rad * this.r.float(0.85, 1.15), rad * this.r.float(0.85, 1.15), 12, this.r.float(0, TAU)), c: o.c ?? this.ink, a: o.a ?? 1, z: o.z ?? 2 });
  }
  /** an ellipse drawn in one go, rarely closing exactly */
  ellipseStroke(cx, cy, rx, ry, o = {}) {
    const r = this.r, a0 = r.float(0, TAU), sweep = TAU + (o.exact ? 0 : r.float(0.08, 0.45) * Math.min(1, this.wob / 2 + 0.3));
    const n = Math.max(16, Math.min(64, Math.round((rx + ry) / 3)));
    const pts = ellipsePts(cx, cy, rx * r.float(0.97, 1.03), ry * r.float(0.97, 1.03), n, a0, sweep, o.rot || 0);
    return this.line(pts, { ...o, over: 0 });
  }
  // ---------------------------------------------------------------- shapes (outline now, colour later)
  /** closed shape: inked outline + a queued fill. o.fill = colour, o.solid = always flat */
  shape(pts, o = {}) {
    if (o.fill) this.fills.push({ p: o.smooth ? smooth(pts, true, 4) : pts, c: o.fill, solid: o.solid, z: o.fz });
    if (o.ink !== false) {
      if (o.ell) this.ellipseStroke(...o.ell, o);
      else this.line(pts, { ...o, closed: true, smooth: o.smooth });
    }
    return pts;
  }
  circle(cx, cy, rad, o = {}) { return this.ellipse(cx, cy, rad, rad, o); }
  ellipse(cx, cy, rx, ry, o = {}) {
    const pts = ellipsePts(cx, cy, rx, ry, 36, 0, TAU, o.rot || 0);
    return this.shape(pts.slice(0, -1), { ...o, ell: [cx, cy, rx, ry] });
  }
  rect(x, y, w, h, o = {}) {
    const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    if (o.fill) this.fills.push({ p: pts, c: o.fill, solid: o.solid, z: o.fz });
    if (o.ink !== false) {
      if (this.r.chance(0.5)) for (let i = 0; i < 4; i++) this.line([pts[i], pts[(i + 1) % 4]], o);
      else this.line(pts, { ...o, closed: true });
    }
    return pts;
  }
  /** colour fills queued since the last call, in the current fill style */
  colourIn(style = this.fillStyle) {
    const q = this.fills; this.fills = [];
    for (const f of q) this.fill(f.p, f.c, f.solid ? 'flat' : style, f.z);
  }
  fill(poly, c, style = this.fillStyle, z = 1) {
    const r = this.r, b = bbox(poly), size = Math.max(b.w, b.h);
    z = z ?? 1;
    const jit = (k) => poly.map(([x, y]) => [x + r.float(-k, k), y + r.float(-k, k)]);
    if (style === 'none') return;
    if (style === 'flat' || size < 26) { this.ops.push({ k: 'f', p: jit(this.wob * 0.25), c, a: 1, z }); return; }
    if (style === 'riso') {
      const k = Math.min(size * 0.05, 3 + this.wob * 1.6);
      this.ops.push({ k: 'f', p: jit(this.wob * 0.4).map(([x, y]) => [x + this.risoOff[0] * k, y + this.risoOff[1] * k]), c, a: 0.92, z });
      return;
    }
    if (style === 'wash') {
      for (let i = 0; i < 2; i++) { const dx = r.float(-1, 1) * size * 0.02, dy = r.float(-1, 1) * size * 0.02; this.ops.push({ k: 'f', p: jit(size * 0.015).map(([x, y]) => [x + dx, y + dy]), c, a: i ? 0.45 : 0.55, z }); }
      return;
    }
    const ang = (this.hatchAng ??= r.float(0.5, 1.1) * (r.chance(0.5) ? 1 : -1));
    if (style === 'hatch') {
      const sp = Math.max(6, Math.min(14, size / 14));
      for (const [a, q] of scanlines(poly, ang + r.float(-0.06, 0.06), sp)) this.line([a, q], { w: Math.max(1.6, this.w * 0.45), c, z, wob: 0.4, over: r.float(0, 3), nib: 'pen' });
      return;
    }
    // scribble: one zig-zagging stroke
    const sp = Math.max(5, Math.min(12, size / 16)), segs = scanlines(poly, ang, sp), zig = [];
    segs.forEach(([a, q], i) => { if (i % 2) zig.push(q, a); else zig.push(a, q); });
    if (zig.length >= 2) this.line(zig, { w: sp * 1.15, c, a: 0.9, z, wob: 0.3, over: 0, nib: 'marker' });
  }
  // ---------------------------------------------------------------- lettering
  /** hand-lettered caps. (cx, top) = centre-top; size = cap height in px. o: { w, c, align, track, bounce, slant, z, maxW } */
  text(str, cx, top, size, o = {}) {
    const r = this.r, chars = glyphText(str);
    if (!chars.length) return { w: 0, h: 0 };
    const track = o.track ?? 0;
    let units = textUnits(str, track);
    if (o.maxW && units * (size / 10) > o.maxW) size = (o.maxW / units) * 10;
    const k = size / 10, W = units * k;
    let x = o.align === 'left' ? cx : o.align === 'right' ? cx - W : cx - W / 2;
    const w = o.w ?? Math.max(1.6, size * (o.bold ? 0.15 : 0.085));
    const slant = o.slant ?? 0, drift = o.bounce ? r.float(-1, 1) * size * 0.04 : 0;
    chars.forEach((ch, i) => {
      if (ch === ' ') { x += (SPACE + GAP + track) * k; return; }
      const G = GLYPHS[ch];
      const dy = o.bounce ? r.float(-1, 1) * size * 0.07 + (drift * (i - chars.length / 2)) / chars.length : 0;
      const rot = o.bounce ? r.float(-0.08, 0.08) : 0, cs = Math.cos(rot), sn = Math.sin(rot);
      const gx = x, gw = G.w * k;
      for (const s of G.s) {
        const pts = [];
        for (let j = 0; j < s.length; j += 2) {
          let lx = s[j] * k - gw / 2, ly = (s[j + 1] - 5) * k;
          lx += -ly * slant;
          pts.push([gx + gw / 2 + lx * cs - ly * sn, top + size / 2 + dy + lx * sn + ly * cs]);
        }
        this.line(pts, { w, c: o.c, z: o.z, wob: (o.wob ?? 0.45) * Math.min(1, size / 60), over: this.wob * r.float(0, 0.5), nib: o.nib });
      }
      x += (G.w + GAP + track) * k;
    });
    return { w: W, h: size, size };
  }
  /** lettering along a circle (top or bottom arc), letters upright */
  arcText(str, cx, cy, R, size, o = {}) {
    const chars = glyphText(str), k = size / 10, track = o.track ?? 1.2;
    const tot = textUnits(str, track) * k, w = o.w ?? Math.max(1.6, size * (o.bold ? 0.14 : 0.085));
    let s = 0;
    chars.forEach((ch) => {
      const G = ch === ' ' ? null : GLYPHS[ch], gw = (G ? G.w : SPACE) * k;
      const sc = s + gw / 2;
      if (G) {
        const th = o.bottom ? Math.PI / 2 - (sc - tot / 2) / R : -Math.PI / 2 + (sc - tot / 2) / R;
        const Rx = Math.cos(th), Ry = Math.sin(th), Tx = o.bottom ? Math.sin(th) : -Math.sin(th), Ty = o.bottom ? -Math.cos(th) : Math.cos(th);
        for (const st of G.s) {
          const pts = [];
          for (let j = 0; j < st.length; j += 2) {
            const u = st[j] * k - gw / 2, v = (10 - st[j + 1]) * k;
            const rr = o.bottom ? R - v + size : R + v;
            pts.push([cx + Rx * rr + Tx * u, cy + Ry * rr + Ty * u]);
          }
          this.line(pts, { w, c: o.c, z: o.z, wob: 0.35, over: 0 });
        }
      }
      s += gw + (GAP + track) * k;
    });
    return { w: tot };
  }
  /** a pencil guide (faint construction line) */
  guide(pts, o = {}) { return this.line(pts, { w: 1.3, c: this.o.guide, a: 0.5, z: 0.5, wob: 0.6, nib: 'pen', ...o }); }
}
