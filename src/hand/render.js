// Ops → SVG (for export) and → canvas, partially, for the live drawing on the board.
const R1 = (v) => Math.round(v * 10) / 10;
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

const stroked = (op) => op.nib === 'marker' || op.nib === 'paint' || op.w < 2.4;
function widthAt(op, i, n) {
  if (op.nib === 'brush') { const t = n > 1 ? i / (n - 1) : 0.5; return op.w * (0.22 + 0.78 * Math.pow(Math.sin(Math.PI * t), 0.55)) * (0.85 + 0.15 * Math.sin(i * 0.7 + op.seed)); }
  const e = Math.min(1, (i + 0.6) / 4, (n - i - 0.4) / 4);
  return op.w * (0.55 + 0.45 * Math.max(0, e)) * (0.92 + 0.08 * Math.sin(i * 0.5 + op.seed));
}
/** variable-width outline polygon of the first `upto` points of a stroke */
function outline(op, upto = op.p.length) {
  const p = op.p, n = Math.min(upto, p.length), L = [], Rr = [];
  for (let i = 0; i < n; i++) {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)], d = dist(a, b) || 1;
    const nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d, w = widthAt(op, i, op.p.length) / 2;
    L.push([p[i][0] + nx * w, p[i][1] + ny * w]); Rr.push([p[i][0] - nx * w, p[i][1] - ny * w]);
  }
  return L.concat(Rr.reverse());
}
const pathD = (pts, close) => 'M' + pts.map(([x, y]) => `${R1(x)} ${R1(y)}`).join('L') + (close ? 'Z' : '');

export function opsToSVG(ops) {
  return [...ops].sort((a, b) => a.z - b.z).map((op) => {
    const op_ = op.a < 1 ? ` opacity="${op.a}"` : '';
    if (op.k === 'f') return `<path d="${pathD(op.p, true)}" fill="${op.c}"${op_}/>`;
    if (op.p.length < 2) return '';
    if (stroked(op)) return `<path d="${pathD(op.p)}" fill="none" stroke="${op.c}" stroke-width="${R1(op.w)}" stroke-linecap="round" stroke-linejoin="round"${op_}/>`;
    return `<path d="${pathD(outline(op), true)}" fill="${op.c}"${op_}/>`;
  }).join('');
}

/** give every op a slot on a 0..1 timeline (longer strokes take longer; lifting the pen costs a little) */
export function timeline(ops) {
  let T = 0;
  for (const op of ops) {
    let d;
    if (op.k === 's') { let L = 0; for (let i = 1; i < op.p.length; i++) L += dist(op.p[i - 1], op.p[i]); d = Math.pow(L, 0.85) + 22; }
    else { const xs = op.p.map((q) => q[0]), ys = op.p.map((q) => q[1]); d = Math.sqrt((Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))) * 0.9 + 14; }
    op.t0 = T; T += d; op.t1 = T;
  }
  for (const op of ops) { op.t0 /= T || 1; op.t1 /= T || 1; }
  return T;
}

function find(ops, T) {
  let lo = 0, hi = ops.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (ops[m].t1 <= T) lo = m + 1; else hi = m; }
  return lo;
}
/** where the pencil tip is at time T (design px) */
export function tipAt(ops, T) {
  if (!ops.length) return [0, 0];
  const op = ops[find(ops, Math.min(T, 0.99999))], f = Math.max(0, Math.min(1, (T - op.t0) / ((op.t1 - op.t0) || 1)));
  if (op.k === 's') {
    const x = f * (op.p.length - 1), i = Math.floor(x), j = Math.min(op.p.length - 1, i + 1), u = x - i;
    return [op.p[i][0] + (op.p[j][0] - op.p[i][0]) * u, op.p[i][1] + (op.p[j][1] - op.p[i][1]) * u];
  }
  const xs = op.p.map((q) => q[0]), ys = op.p.map((q) => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const tri = Math.abs(((f * 7) % 2) - 1);
  return [x0 + (x1 - x0) * (0.15 + 0.7 * tri), y0 + (y1 - y0) * (0.15 + 0.7 * f)];
}

function paintOp(x, op, frac = 1) {
  x.globalAlpha = op.a ?? 1;
  if (op.k === 'f') {
    x.globalAlpha *= frac;
    x.fillStyle = op.c; x.beginPath(); op.p.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill();
  } else {
    const n = Math.max(2, Math.ceil(frac * op.p.length));
    if (stroked(op)) {
      x.strokeStyle = op.c; x.lineWidth = op.w; x.lineCap = 'round'; x.lineJoin = 'round';
      x.beginPath(); for (let i = 0; i < n; i++) (i ? x.lineTo : x.moveTo).call(x, op.p[i][0], op.p[i][1]); x.stroke();
    } else {
      const o = outline(op, n);
      x.fillStyle = op.c; x.beginPath(); o.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill();
    }
  }
  x.globalAlpha = 1;
}

/** incremental painter for the board: finished ops are baked into two layers (under / over the ink) */
export class LivePainter {
  constructor(ops, dw, dh, W, H, mk) {
    this.ops = ops; this.k = W / dw; this.W = W; this.H = H;
    this.lo = mk(W, H); this.hi = mk(W, H); this.i = 0;
  }
  _layer(op) { return op.z < 2 ? this.lo : this.hi; }
  frame(ctx, T) {
    while (this.i < this.ops.length && this.ops[this.i].t1 <= T) {
      const c = this._layer(this.ops[this.i]).getContext('2d');
      c.setTransform(this.k, 0, 0, this.k, 0, 0); paintOp(c, this.ops[this.i]); this.i++;
    }
    const cur = this.i < this.ops.length && this.ops[this.i].t0 < T ? this.ops[this.i] : null;
    const f = cur ? (T - cur.t0) / ((cur.t1 - cur.t0) || 1) : 0;
    ctx.drawImage(this.lo, 0, 0);
    if (cur && cur.z < 2) { ctx.save(); ctx.setTransform(this.k, 0, 0, this.k, 0, 0); paintOp(ctx, cur, f); ctx.restore(); }
    ctx.drawImage(this.hi, 0, 0);
    if (cur && cur.z >= 2) { ctx.save(); ctx.setTransform(this.k, 0, 0, this.k, 0, 0); paintOp(ctx, cur, f); ctx.restore(); }
    return cur;
  }
}
