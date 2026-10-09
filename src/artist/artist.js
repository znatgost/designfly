// The fly's artist brain. Two neural networks that learn on their own, in your browser:
//   • the HAND decides every brush stroke (where, how big, which colour) by looking at what it
//     wants and what is already on the canvas — it learns by practising on things it sees;
//   • the EYE remembers what it has seen and can imagine new pictures from that memory.
// No pictures, strokes or recipes are built in: a newborn brain only scribbles.
import { buildHand, handInput, stepLoss, decide, S, V } from './hand.js';
import { stroke as tfStroke, NP, R0, R1, K, ADJ } from './raster.js';
import { buildEye, eyeLoss, encode, E, LAT } from './eye.js';
import { rng } from '../design/rng.js';

export const GROUNDS = { white: [0.957, 0.941, 0.91], sienna: [0.66, 0.38, 0.235], grey: [0.49, 0.48, 0.455], paper: [0.91, 0.855, 0.753] };
export const LEVELS = ['Newborn', 'Scribbler', 'Smudger', 'Dauber', 'Sketcher', 'Student', 'Painter', 'Colourist', 'Impressionist', 'Master'];
const MAXV = 64;                       // pictures are remembered at ≤ 64 px on the long side
const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, '0')).join('');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** {w,h,data RGBA 0..255} → {w,h,px Float32 RGB 0..1} at ≤ max px */
export function toPicture(img, max = MAXV, levels = false) {
  const k = Math.min(1, max / Math.max(img.w, img.h)), w = Math.max(4, Math.round(img.w * k)), h = Math.max(4, Math.round(img.h * k));
  const px = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {           // box filter
    const x0 = Math.floor(x / k), x1 = Math.max(x0 + 1, Math.floor((x + 1) / k)), y0 = Math.floor(y / k), y1 = Math.max(y0 + 1, Math.floor((y + 1) / k));
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y0; yy < Math.min(img.h, y1); yy++) for (let xx = x0; xx < Math.min(img.w, x1); xx++) { const i = (yy * img.w + xx) * 4; r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; n++; }
    const j = (y * w + x) * 3; px[j] = r / n / 255; px[j + 1] = g / n / 255; px[j + 2] = b / n / 255;
  }
  if (levels) {       // squint at a dim room: stretch the tones
    const L = []; for (let i = 0; i < w * h; i++) L.push(0.3 * px[i * 3] + 0.59 * px[i * 3 + 1] + 0.11 * px[i * 3 + 2]);
    L.sort((a, b) => a - b);
    const lo = L[Math.floor(L.length * 0.03)], hi = L[Math.floor(L.length * 0.97)], s = 0.92 / Math.max(0.12, hi - lo);
    for (let i = 0; i < px.length; i++) px[i] = Math.max(0, Math.min(1, (px[i] - lo) * s + 0.04));
  }
  return { w, h, px };
}
/** bilinear sample of a region (fractions of the picture) into an n×m RGB patch */
function sample(pic, fx, fy, fw, fh, n, m = n, flip = false, out = new Float32Array(n * m * 3), off = 0) {
  for (let y = 0; y < m; y++) for (let x = 0; x < n; x++) {
    const u = fx + (((flip ? n - 1 - x : x) + 0.5) / n) * fw, v = fy + ((y + 0.5) / m) * fh;
    const sx = Math.max(0, Math.min(pic.w - 1.001, u * pic.w - 0.5)), sy = Math.max(0, Math.min(pic.h - 1.001, v * pic.h - 0.5));
    const x0 = Math.floor(sx), y0 = Math.floor(sy), ax = sx - x0, ay = sy - y0;
    for (let c = 0; c < 3; c++) {
      const p = (yy, xx) => pic.px[(yy * pic.w + xx) * 3 + c];
      out[off + (y * n + x) * 3 + c] = (p(y0, x0) * (1 - ax) + p(y0, x0 + 1) * ax) * (1 - ay) + (p(y0 + 1, x0) * (1 - ax) + p(y0 + 1, x0 + 1) * ax) * ay;
    }
  }
  return out;
}
const b64 = { enc: (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }, dec: (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) };

export class Artist {
  /** store: { get(key) → Promise<any>, set(key, value) → Promise } (IndexedDB in the app, none in tests) */
  constructor(tf, { store = null, batch = 16, seed = Date.now() } = {}) {
    this.tf = tf; this.store = store; this.B = batch; this.r = rng(seed % 2147483647);
    this.views = []; this.examples = []; this.liked = [];
    this.stats = { steps: 0, eyeSteps: 0, seen: 0, paintings: 0, history: [], born: Date.now() };
    this.listeners = {};
  }
  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, d) { for (const f of this.listeners[ev] || []) try { f(d); } catch {} }
  async init() {
    const tf = this.tf;
    this.hand = buildHand(tf); this.eye = buildEye(tf);
    this.hopt = tf.train.adam(0.001); this.eopt = tf.train.adam(0.001);
    const saved = this.store && await this.store.get('artist').catch(() => null);
    if (saved) try { this.load(saved); } catch (e) { console.warn('artist brain could not be loaded, starting fresh', e); }
    this.ready = true;
    return this;
  }
  get level() { return Math.min(LEVELS.length - 1, Math.floor(Math.log2(1 + this.stats.steps / 150))); }
  get title() { return LEVELS[this.level]; }
  get params() { return [this.hand, this.eye.enc, this.eye.dec].reduce((s, m) => s + m.countParams(), 0); }

  // ---------------------------------------------------------------- memory of pictures
  /** something the fly looked at (studio views, your photos) — used for practice */
  see(img, source = 'studio') {
    this.views.push({ ...toPicture(img, MAXV, source === 'studio' || source === 'self'), source });
    if (this.views.length > 160) this.views.splice(0, this.views.length - 160);
    this.stats.seen++;
  }
  /** something you showed it with a name: it remembers these */
  teach(img, label) {
    const pic = toPicture(img, 32), lab = String(label).toLowerCase().slice(0, 30);
    this.examples.push({ label: lab, ...pic });
    if (this.examples.length > 80) this.examples.shift();
    this.views.push({ ...toPicture(img), source: 'taught' });
    this.save();
    return this.examples.filter((e) => e.label === lab).length;
  }
  knows(label) { return this.examples.filter((e) => e.label === String(label).toLowerCase()).length; }
  get concepts() { const m = {}; for (const e of this.examples) m[e.label] = (m[e.label] || 0) + 1; return m; }

  _pool() { return [...this.views, ...this.examples, ...this.examples]; }
  /** a random practice target: a crop of something it has seen */
  _target(out, off) {
    const pool = this._pool(), r = this.r, pic = pool[Math.floor(r.next() * pool.length)];
    if (!pic) throw new Error('nothing to look at yet');
    if (r.chance(0.3)) return sample(pic, 0, 0, 1, 1, S, S, r.chance(0.5), out, off);
    const side = r.float(0.3, 1) * Math.min(pic.w, pic.h), w = side / pic.w, h = side / pic.h;
    return sample(pic, r.float(0, 1 - w), r.float(0, 1 - h), w, h, S, S, r.chance(0.5), out, off);
  }
  _ground(out, off, target) {
    const r = this.r, g = r.chance(0.75) ? Object.values(GROUNDS)[Math.floor(r.next() * 4)] : [r.next(), r.next(), r.next()];
    const block = r.chance(0.3);           // sometimes start half-done (like a tile being refined)
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) for (let c = 0; c < 3; c++) {
      let v = g[c];
      if (block) { const bx = Math.floor(x / 8) * 8 + 4, by = Math.floor(y / 8) * 8 + 4; v = 0.35 * g[c] + 0.65 * target[off + (by * S + bx) * 3 + c]; }
      out[off + (y * S + x) * 3 + c] = v;
    }
  }

  // ---------------------------------------------------------------- practice
  /** practise for ms milliseconds; onTick({ stats, preview }) is called a few times a second */
  async practice({ ms = 30000, onTick = null, isStopped = () => false, yieldEvery = 2 } = {}) {
    const tf = this.tf, B = this.B, r = this.r;
    if (!this._pool().length) throw new Error('nothing to look at yet');
    const T = new Float32Array(B * S * S * 3), C = new Float32Array(B * S * S * 3), steps = new Int32Array(B), N = new Int32Array(B);
    const reset = (i) => { this._target(T, i * S * S * 3); this._ground(C, i * S * S * 3, T); steps[i] = 0; N[i] = 12 + Math.floor(r.next() * 28); };
    for (let i = 0; i < B; i++) { reset(i); steps[i] = Math.floor(r.next() * N[i]); }
    const t0 = Date.now(), first = this.stats.steps;
    let lastTick = 0, lossSum = 0, lossN = 0, it = 0;
    while (Date.now() - t0 < ms && !isStopped()) {
      const lossT = tf.tidy(() => {
        const tt = tf.tensor4d(T, [B, S, S, 3]), cc = tf.tensor4d(C, [B, S, S, 3]);
        this.hopt.learningRate = 0.001 / (1 + this.stats.steps / 1000);
        const cost = this.hopt.minimize(() => stepLoss(tf, this.hand, tt, cc), true);
        // advance every canvas by one (slightly shaky) stroke of the current hand
        const p = decide(tf, this.hand, tt, cc, 0.3);
        const c2 = tfStroke(tf, cc, p, tt);
        C.set(c2.dataSync());
        if (it % 2 === 0) {            // the eye practises remembering at the same time
          const ec = this.eopt.minimize(() => eyeLoss(tf, this.eye, tt), true);
          this.stats.eyeSteps++; ec.dispose?.();
        }
        return cost;
      });
      it++; this.stats.steps++;
      if (it % 10 === 0) { const v = lossT.dataSync()[0]; lossSum += v; lossN++; (this._run ||= []).push(v); if (this._run.length >= 5) { this.stats.history.push(Math.round((this._run.reduce((x, y) => x + y, 0) / this._run.length) * 1e5) / 1e5); this._run = []; } }
      lossT.dispose();
      for (let i = 0; i < B; i++) if (++steps[i] >= N[i]) reset(i);
      if (Date.now() - lastTick > 400 && onTick) {
        lastTick = Date.now();
        onTick({ stats: this.stats, level: this.level, title: this.title, preview: { target: T.slice(0, S * S * 3), canvas: C.slice(0, S * S * 3), size: S } });
      }
      if (it % yieldEvery === 0) await sleep(0);
    }
    if (this.stats.history.length > 200) this.stats.history.splice(0, this.stats.history.length - 200);
    this.emit('learn', { steps: this.stats.steps - first });
    await this.save();
    return { steps: this.stats.steps - first, loss: lossN ? lossSum / lossN : null };
  }

  /** how well can it paint right now? (mean error painting fresh targets, lower is better) */
  async exam(n = 8, strokes = 24) {
    if (!this._pool().length) return null;
    const tf = this.tf, T = new Float32Array(n * S * S * 3), C = new Float32Array(n * S * S * 3), keep = this.r;
    this.r = rng(12345);                 // the same exam every time (for the pictures it currently remembers)
    for (let i = 0; i < n; i++) { this._target(T, i * S * S * 3); for (let j = 0; j < S * S; j++) C.set(GROUNDS.white, i * S * S * 3 + j * 3); }
    const e = tf.tidy(() => {
      const t = tf.tensor4d(T, [n, S, S, 3]); let c = tf.tensor4d(C, [n, S, S, 3]);
      for (let k = 0; k < strokes; k++) c = tfStroke(tf, c, decide(tf, this.hand, t, c), t);
      return tf.mean(tf.abs(tf.sub(t, c)));
    });
    this.r = keep;
    const v = e.dataSync()[0]; e.dispose();
    return v;
  }

  // ---------------------------------------------------------------- painting
  /**
   * Paint a picture: coarse to fine. At each step the hand looks at every tile of the canvas and
   * proposes one stroke per tile; strokes that would make things worse are not painted.
   * img {w,h,data RGBA}; o: { ground, outW, levels (tiles × steps), stretch (tones) }
   */
  async paint(img, o = {}) {
    const tf = this.tf, pic = toPicture(img, 128, o.stretch), long = 96, a = pic.w / pic.h;
    const W = a >= 1 ? long : Math.round(long * a), H = a >= 1 ? Math.round(long / a) : long;
    const tgt = sample(pic, 0, 0, 1, 1, W, H);
    const g = GROUNDS[o.ground] || GROUNDS.white, can = new Float32Array(W * H * 3);
    for (let i = 0; i < W * H; i++) can.set(g, i * 3);
    const outW = o.outW || 1200, k = outW / W, OH = Math.round(H * k);
    const ops = [{ k: 'f', p: [[0, 0], [outW, 0], [outW, OH], [0, OH]], c: hex(g), a: 1, z: 0 }];
    const levels = o.levels || [[1, 1, 28], [2, 2, 12], [4, 3, 6], [8, 6, 3]];
    let kept = 0, tried = 0;
    const err0 = meanErr(tgt, can);
    for (const [gx, gy, steps] of levels) {
      const tw = W / gx, th = H / gy, nT = gx * gy;
      for (let s = 0; s < steps; s++) {
        const TT = new Float32Array(nT * S * S * 3), CC = new Float32Array(nT * S * S * 3);
        for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
          const id = j * gx + i;
          sample({ w: W, h: H, px: tgt }, (i * tw) / W, (j * th) / H, tw / W, th / H, S, S, false, TT, id * S * S * 3);
          sample({ w: W, h: H, px: can }, (i * tw) / W, (j * th) / H, tw / W, th / H, S, S, false, CC, id * S * S * 3);
        }
        // the hand proposes a few strokes per tile (its own idea + variations); the fly keeps the best one
        const nC = o.candidates ?? 4;
        const P = tf.tidy(() => {
          const t4 = tf.tensor4d(TT, [nT, S, S, 3]), c4 = tf.tensor4d(CC, [nT, S, S, 3]);
          const logits = this.hand.predict(handInput(tf, t4, c4));
          const outs = [tf.sigmoid(logits)];
          for (let q = 1; q < nC; q++) outs.push(tf.sigmoid(tf.add(logits, tf.randomNormal(logits.shape, 0, 0.6))));
          return tf.concat(outs, 0).dataSync();
        });
        for (let id = 0; id < nT; id++) {
          const i = id % gx, j = Math.floor(id / gx);
          const toW = (u, v) => [i * tw + u * tw, j * th + v * th];
          let best = null;
          for (let q = 0; q < nC; q++) {
            const p = P.subarray((q * nT + id) * NP, (q * nT + id) * NP + NP);
            const pts = bezier(p).map(([u, v]) => toW(u, v));
            const rad = (R0 + R1 * p[6]) * Math.sqrt(tw * th), alpha = 0.55 + 0.45 * p[10], adj = [p[7], p[8], p[9]];
            const ev = evalStroke(can, tgt, W, H, pts, rad, adj, alpha);
            tried++;
            if (ev && ev.gain > 0 && (!best || ev.gain > best.ev.gain)) best = { ev, pts, rad, alpha };
          }
          if (best) {
            commit(can, best.ev, best.alpha);
            kept++;
            ops.push({ k: 's', p: best.pts.filter((_, q) => q % 2 === 0 || q === best.pts.length - 1).map(([x, y]) => [x * k, y * k]), w: best.rad * 2 * k * 0.92, c: hex(best.ev.col), a: Math.round(best.alpha * 100) / 100, z: 2, nib: 'paint', seed: id });
          }
        }
        if (s % 4 === 3) await sleep(0);
      }
    }
    const err = meanErr(tgt, can);
    this.stats.paintings++; this.save();
    return { ops, w: outW, h: OH, strokes: kept, tried, likeness: Math.max(0, 1 - err * 2.2), improvement: err0 ? 1 - err / err0 : 0, canvas: { w: W, h: H, px: can } };
  }

  // ---------------------------------------------------------------- imagination
  /** imagine a picture: a point in the eye's memory space, near something it knows or you liked */
  imagine({ label = null, seed = Date.now(), spread = 1 } = {}) {
    const tf = this.tf, r = rng(seed % 2147483647);
    const known = label ? this.examples.filter((e) => e.label === String(label).toLowerCase()) : [];
    let base = null;
    if (known.length) base = tf.tidy(() => encode(tf, this.eye, tf.tensor4d(sample(r.pick(known), 0, 0, 1, 1, E, E, r.chance(0.5)), [1, E, E, 3])).mu.dataSync());
    else if (this.liked.length && r.chance(0.6)) base = r.pick(this.liked);
    const z = Array.from({ length: LAT }, (_, i) => (base ? base[i] : 0) + gauss(r) * spread * (base ? 0.45 : 1));
    const out = tf.tidy(() => this.eye.dec.predict(tf.tensor2d([z], [1, LAT])).dataSync());
    const data = new Uint8ClampedArray(E * E * 4);
    for (let i = 0; i < E * E; i++) { data[i * 4] = out[i * 3] * 255; data[i * 4 + 1] = out[i * 3 + 1] * 255; data[i * 4 + 2] = out[i * 3 + 2] * 255; data[i * 4 + 3] = 255; }
    return { img: { w: E, h: E, data }, z };
  }
  /** one of the pictures you taught it, as an RGBA image (mirrored sometimes) */
  recall(label, seed = Date.now()) {
    const r = rng(seed % 2147483647), ex = this.examples.filter((e) => e.label === String(label).toLowerCase());
    if (!ex.length) return null;
    const e = r.pick(ex), n = 64, m = Math.round((n * e.h) / e.w), px = sample(e, 0, 0, 1, 1, n, m, r.chance(0.5));
    const data = new Uint8ClampedArray(n * m * 4);
    for (let i = 0; i < n * m; i++) { data[i * 4] = px[i * 3] * 255; data[i * 4 + 1] = px[i * 3 + 1] * 255; data[i * 4 + 2] = px[i * 3 + 2] * 255; data[i * 4 + 3] = 255; }
    return { w: n, h: m, data };
  }
  like(z) { if (z) { this.liked.push(Array.from(z)); if (this.liked.length > 30) this.liked.shift(); this.save(); } }

  // ---------------------------------------------------------------- persistence
  /** raw = keep Float32Arrays (for IndexedDB); otherwise base64 (for a JSON file) */
  dump(raw = false) {
    const ws = (m) => m.getWeights().map((w) => (raw ? { s: w.shape, f: new Float32Array(w.dataSync()) } : { s: w.shape, d: b64.enc(new Uint8Array(new Float32Array(w.dataSync()).buffer)) }));
    return {
      v: 1, stats: this.stats, liked: this.liked,
      examples: this.examples.map((e) => ({ label: e.label, w: e.w, h: e.h, d: b64.enc(Uint8Array.from(e.px, (v) => Math.round(v * 255))) })), views: raw ? this.views.filter((v) => v.source !== 'taught').slice(-60).map((v) => ({ w: v.w, h: v.h, source: v.source, u: Uint8Array.from(v.px, (x) => Math.round(x * 255)) })) : [],
      hand: ws(this.hand), enc: ws(this.eye.enc), dec: ws(this.eye.dec),
    };
  }
  load(j) {
    if (!j || j.v !== 1) throw new Error('not an artist brain');
    const tf = this.tf;
    const set = (m, ws) => { if (!ws || ws.length !== m.getWeights().length || ws.some((w, i) => w.s.join() !== m.getWeights()[i].shape.join())) return; m.setWeights(ws.map((w) => tf.tensor(w.f ? Float32Array.from(w.f) : new Float32Array(b64.dec(w.d).buffer), w.s))); };
    set(this.hand, j.hand); set(this.eye.enc, j.enc); set(this.eye.dec, j.dec);
    this.stats = { ...this.stats, ...j.stats };
    this.liked = j.liked || [];
    this.examples = (j.examples || []).map((e) => ({ label: e.label, w: e.w, h: e.h, px: Float32Array.from(b64.dec(e.d), (v) => v / 255) }));
    for (const e of this.examples) this.views.push({ w: e.w, h: e.h, px: e.px, source: 'taught' });
    for (const v of j.views || []) this.views.push({ w: v.w, h: v.h, source: v.source, px: Float32Array.from(v.u, (x) => x / 255) });
  }
  async save() { if (this.store) try { await this.store.set('artist', this.dump(true)); } catch (e) { console.warn('artist save failed', e); } }
  async reset() { this.hand = buildHand(this.tf); this.eye = buildEye(this.tf); this.hopt = this.tf.train.adam(0.001); this.eopt = this.tf.train.adam(0.001); this.examples = []; this.liked = []; this.stats = { steps: 0, eyeSteps: 0, seen: this.views.length, paintings: 0, history: [], born: Date.now() }; await this.save(); }
}

function gauss(r) { const u = Math.max(1e-9, r.next()), v = r.next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function bezier(p) {
  return Array.from({ length: K + 2 }, (_, i) => { const t = i / (K + 1), u = 1 - t; return [u * u * p[0] + 2 * u * t * p[2] + t * t * p[4], u * u * p[1] + 2 * u * t * p[3] + t * t * p[5]]; });
}
function meanErr(t, c) { let e = 0; for (let i = 0; i < t.length; i++) e += Math.abs(t[i] - c[i]); return e / t.length; }
/** what would this stroke do? (colour it would pick up, the pixels it covers, how much closer it gets) */
function evalStroke(can, tgt, W, H, pts, rad, adj, alpha) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const X0 = Math.max(0, Math.floor(x0 - rad - 1)), X1 = Math.min(W - 1, Math.ceil(x1 + rad + 1)), Y0 = Math.max(0, Math.floor(y0 - rad - 1)), Y1 = Math.min(H - 1, Math.ceil(y1 + rad + 1));
  if (X1 < X0 || Y1 < Y0) return null;
  const cells = [], sharp = 1.6, seen = [0, 0, 0];
  let ms = 0;
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    let d2 = Infinity;
    for (const [px, py] of pts) { const dd = (x + 0.5 - px) ** 2 + (y + 0.5 - py) ** 2; if (dd < d2) d2 = dd; }
    const m = 1 / (1 + Math.exp(-(rad - Math.sqrt(d2)) * sharp));
    if (m < 0.02) continue;
    const i = (y * W + x) * 3;
    for (let c = 0; c < 3; c++) seen[c] += tgt[i + c] * m;
    ms += m; cells.push(i, m);
  }
  if (!ms) return null;
  const col = seen.map((v, c) => Math.max(0, Math.min(1, v / ms + ADJ * (adj[c] - 0.5))));    // the colour under the brush, adjusted
  let gain = 0;
  for (let q = 0; q < cells.length; q += 2) { const i = cells[q], m = cells[q + 1] * alpha; for (let c = 0; c < 3; c++) { const nv = can[i + c] * (1 - m) + col[c] * m; gain += Math.abs(can[i + c] - tgt[i + c]) - Math.abs(nv - tgt[i + c]); } }
  return { cells, col, gain };
}
function commit(can, ev, alpha) { for (let q = 0; q < ev.cells.length; q += 2) { const i = ev.cells[q], m = ev.cells[q + 1] * alpha; for (let c = 0; c < 3; c++) can[i + c] = can[i + c] * (1 - m) + ev.col[c] * m; } }
