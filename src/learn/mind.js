// The fly's design mind: proposes marks by evolution, judges them with its critic network,
// learns the user's taste from likes / dislikes, and "dreams" (keeps evolving on its own taste)
// while idle. Everything is local (browser storage); nothing is pre-trained on outside data —
// the network starts from an instinct distilled from a few written design rules, then from you.
import { rng } from '../design/rng.js';
import { MLP } from './mlp.js';
import { features, instinct, N_INPUT, FEATURE_NAMES, RETINA } from './features.js';
import { randomGenome, mutate, crossover, cleanGenome, genomeKey } from './genome.js';

export const LEVELS = ['Larva', 'Pupa', 'Intern', 'Junior designer', 'Designer', 'Middle designer', 'Senior designer', 'Art director', 'Creative director', 'Legend'];
export const SIZES = [N_INPUT, 24, 12, 1];
const DEFAULT_COLS = ['#1d1d1f', '#e8590c', '#2b6de0'];
const tick = () => new Promise((r) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => r()) : setTimeout(r, 0)));

export class Mind {
  constructor({ storage = null, cols = DEFAULT_COLS, seed = Date.now() } = {}) {
    this.storage = storage; this.cols = cols; this.r = rng(seed >>> 0);
    this.listeners = {}; this.cache = new Map(); this.nextId = 1;
    this.net = null; this.replay = []; this.history = []; this.lessons = 0; this.screens = 0; this.gen = 0; this.dreamGens = 0;
    this.elites = []; this.best = []; this.anchors = []; this.dreaming = false; this.born = null;
  }
  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); return this; }
  emit(ev, data) { for (const fn of this.listeners[ev] || []) try { fn(data); } catch (e) { console.error(e); } }

  // ---------------------------------------------------------------- lifecycle
  async init(progress = () => {}) {
    const saved = this.storage?.get();
    if (saved?.v === 1 && saved.net?.sizes?.[0] === N_INPUT) {
      this.net = MLP.fromJSON(saved.net);
      Object.assign(this, { history: saved.history || [], lessons: saved.lessons || 0, screens: saved.screens || 0, gen: saved.gen || 0, dreamGens: saved.dreamGens || 0, born: saved.born || Date.now() });
      this.replay = (saved.replay || []).map((it) => (it.kind === 'pair' ? { ...it, a: Float32Array.from(it.a), b: Float32Array.from(it.b) } : { ...it, x: Float32Array.from(it.x) }));
      this.elites = (saved.elites || []).map((e) => ({ ...e, genome: cleanGenome(e.genome) })).filter((e) => e.genome);
      this.best = (saved.best || []).map((e) => ({ ...e, genome: cleanGenome(e.genome) })).filter((e) => e.genome);
      await this._anchors(progress, 160);
      progress(1, 'mind restored');
      return 'restored';
    }
    await this.bootstrap(progress);
    return 'born';
  }
  /** a newborn mind: random weights, then distil the design-rule instinct into them */
  async bootstrap(progress = () => {}) {
    this.net = new MLP(SIZES, (this.r.next() * 1e9) | 0);
    this.replay = []; this.history = []; this.lessons = 0; this.screens = 0; this.gen = 0; this.dreamGens = 0; this.elites = []; this.best = []; this.born = Date.now();
    await this._anchors(progress, 420);
    const A = this.anchors;
    for (let s = 0; s < 500; s++) {
      const batch = Array.from({ length: 24 }, () => { const a = A[this.r.int(0, A.length - 1)]; return { kind: 'point', x: a.x, y: a.y }; });
      this.net.trainBatch(batch, 0.01);
      if (s % 50 === 0) { progress(0.6 + (0.4 * s) / 500, 'learning instinct'); this.emit('learn', { mean: 0 }); await tick(); }
    }
    this.save();
    progress(1, 'instinct learned');
  }
  async _anchors(progress, n) {
    this.anchors = [];
    for (let i = 0; i < n; i++) {
      let g = randomGenome(this.r);
      if (i % 3 === 0) g = mutate(g, this.r);
      const f = this.encode(g);
      this.anchors.push({ x: f.x, y: instinct(f.named) });
      if (i % 30 === 0) { progress((0.6 * i) / n, 'imagining shapes'); await tick(); }
    }
  }
  setColors(cols) { if (cols?.length >= 3 && cols.join() !== this.cols.join()) { this.cols = cols.slice(0, 3); this.cache.clear(); } }

  // ---------------------------------------------------------------- perception
  encode(g) {
    const k = genomeKey(g);
    let f = this.cache.get(k);
    if (!f) { f = features(g, this.cols); if (this.cache.size > 3000) this.cache.clear(); this.cache.set(k, f); }
    return f;
  }
  /** run the critic on a mark; emits 'think' so the brain view can light up */
  think(g, show = true) {
    const f = this.encode(g);
    const out = this.net.forward(f.x);
    if (show) this.emit('think', { genome: g, acts: out.acts, p: out.p, named: f.named, px: f.px });
    return { ...out, ...f };
  }

  // ---------------------------------------------------------------- evolution
  _child() {
    const r = this.r, E = this.elites, B = this.best;
    const pickE = () => E[Math.min(E.length - 1, Math.floor(Math.abs(r.next() - r.next()) * E.length))].genome;     // newer favourites more often
    const roll = r.next();
    if (E.length && roll < 0.62) return r.chance(0.35) && E.length > 1 ? mutate(crossover(pickE(), pickE(), r), r, 0.6) : mutate(pickE(), r, r.pick([0.5, 1, 1.5]));
    if (B.length && roll < 0.82) return mutate(B[r.int(0, B.length - 1)].genome, r, 1);
    return randomGenome(r);
  }
  _diverse(list, n, minD = 0.09) {
    const out = [];
    for (const c of list) {
      if (out.length >= n) break;
      if (out.every((o) => { let d = 0; for (let i = 0; i < RETINA * RETINA; i++) d += Math.abs(o.x[i] - c.x[i]); return d / (RETINA * RETINA) > minD; })) out.push(c);
    }
    return out;
  }
  /** the next set of proposals for the user: mostly what the mind expects you to like, plus wild cards */
  async propose(n = 8, pool = 160) {
    const cands = [];
    for (let i = 0; i < pool; i++) {
      const g = this._child(), t = this.think(g, false);
      cands.push({ genome: g, p: t.p, logit: t.logit, x: t.x });
      if (i % 20 === 19) { this.emit('think', { genome: g, acts: t.acts, p: t.p, named: t.named, px: t.px }); await tick(); }
    }
    cands.sort((a, b) => b.logit - a.logit);
    const exploit = this._diverse(cands, n - 2, 0.14);
    const mid = cands.slice(Math.floor(cands.length * 0.25), Math.floor(cands.length * 0.7));
    const wild = this._diverse(this.r.shuffle(mid).filter((c) => !exploit.includes(c)), 2, 0.05).map((c) => ({ ...c, wild: true }));
    this.gen++;
    const shown = [...exploit, ...wild].slice(0, n).map((c) => ({ ...c, id: this.nextId++ }));
    this.think(shown[0].genome);
    return shown;
  }

  // ---------------------------------------------------------------- learning from you
  /** shown: proposals; liked / disliked: Sets of ids. Returns what happened. */
  learn(shown, liked, disliked) {
    const L = shown.filter((c) => liked.has(c.id)), D = shown.filter((c) => disliked.has(c.id)), N = shown.filter((c) => !liked.has(c.id) && !disliked.has(c.id));
    const pairs = [];
    for (const a of L) for (const b of [...N, ...D]) pairs.push([a, b, b && D.includes(b) ? 1.2 : 1]);
    for (const a of N) for (const b of D) pairs.push([a, b, 0.6]);
    if (!pairs.length && !L.length && !D.length) return { lessons: 0, accuracy: null };
    // how well did I predict you, before learning?
    let hit = 0;
    for (const [a, b] of pairs) if (this.net.forward(a.x).logit > this.net.forward(b.x).logit) hit++;
    const accuracy = pairs.length ? hit / pairs.length : null;
    const now = this.screens;
    for (const [a, b, w] of pairs) this.replay.push({ kind: 'pair', a: a.x, b: b.x, w, s: now });
    for (const c of L) this.replay.push({ kind: 'point', x: c.x, y: 1, w: 0.7, s: now });
    for (const c of D) this.replay.push({ kind: 'point', x: c.x, y: 0, w: 0.7, s: now });
    if (this.replay.length > 450) this.replay.splice(0, this.replay.length - 450);
    this.lessons += L.length + D.length; this.screens++;
    if (accuracy !== null) this.history.push(Math.round(accuracy * 100) / 100);
    if (this.history.length > 200) this.history.shift();
    for (const c of L) this.elites.push({ genome: c.genome, t: Date.now() });
    if (this.elites.length > 16) this.elites.splice(0, this.elites.length - 16);
    const loss = this.train(50);
    this.save();
    return { lessons: L.length + D.length, accuracy, pairs: pairs.length, loss };
  }
  train(steps = 50) {
    const R = this.replay; if (!R.length) return 0;
    const recent = R.filter((it) => it.s >= this.screens - 3);
    const anchorW = Math.max(0, 0.35 * (1 - this.lessons / 60));
    let loss = 0;
    for (let s = 0; s < steps; s++) {
      const batch = [];
      for (let i = 0; i < 16; i++) batch.push(recent.length && this.r.chance(0.55) ? recent[this.r.int(0, recent.length - 1)] : R[this.r.int(0, R.length - 1)]);
      if (anchorW > 0) for (let i = 0; i < 4; i++) { const a = this.anchors[this.r.int(0, this.anchors.length - 1)]; batch.push({ kind: 'point', x: a.x, y: a.y, w: anchorW }); }
      loss = this.net.trainBatch(batch, 0.008);
    }
    this.emit('learn', { loss });
    return loss;
  }

  // ---------------------------------------------------------------- dreaming (self-improvement without you)
  async dream(ms = 20000, onGen = () => {}) {
    if (this.dreaming) return;
    this.dreaming = true;
    const r = this.r, t0 = Date.now();
    let pop = [...this.elites.map((e) => e.genome), ...this.best.map((b) => b.genome)];
    while (pop.length < 20) pop.push(randomGenome(r));
    pop = pop.map((g) => ({ genome: g, ...this.think(g, false) }));
    while (this.dreaming && Date.now() - t0 < ms) {
      const kids = [];
      for (let i = 0; i < 36; i++) {
        const tour = () => { const a = pop[r.int(0, pop.length - 1)], b = pop[r.int(0, pop.length - 1)]; return a.logit > b.logit ? a : b; };
        const g = r.chance(0.3) ? mutate(crossover(tour().genome, tour().genome, r), r, 0.6) : r.chance(0.1) ? randomGenome(r) : mutate(tour().genome, r, r.pick([0.4, 0.8, 1.4]));
        kids.push({ genome: g, ...this.think(g, false) });
      }
      pop = this._diverse([...pop, ...kids].sort((a, b) => b.logit - a.logit), 20, 0.05);
      while (pop.length < 12) { const g = randomGenome(r); pop.push({ genome: g, ...this.think(g, false) }); }
      this.dreamGens++;
      const top = pop[0];
      this.emit('think', { genome: top.genome, acts: top.acts, p: top.p, named: top.named, px: top.px, dream: true });
      this._remember(top);
      onGen({ gen: this.dreamGens, best: top.p, genome: top.genome });
      await new Promise((res) => setTimeout(res, 140));
    }
    this.dreaming = false;
    this.save();
  }
  stop() { this.dreaming = false; }
  _remember(c) {
    const x = c.x || this.encode(c.genome).x;
    const near = this.best.findIndex((b) => { const y = this.encode(b.genome).x; let d = 0; for (let i = 0; i < RETINA * RETINA; i++) d += Math.abs(x[i] - y[i]); return d / (RETINA * RETINA) < 0.12; });
    if (near >= 0) { if (this.best[near].p >= c.p) return; this.best.splice(near, 1); }
    this.best.push({ genome: c.genome, p: Math.round(c.p * 1000) / 1000 });
    this.best.sort((a, b) => b.p - a.p);
    if (this.best.length > 12) this.best.length = 12;
  }
  /** the mind's current favourite (re-scored with today's taste) */
  favourite() {
    const pool = [...this.best.map((b) => b.genome), ...this.elites.map((e) => e.genome)];
    if (!pool.length) return null;
    return pool.map((g) => ({ g, l: this.net.forward(this.encode(g).x).logit })).sort((a, b) => b.l - a.l)[0].g;
  }

  // ---------------------------------------------------------------- stats & storage
  get stats() {
    const lv = Math.min(LEVELS.length - 1, Math.floor(Math.sqrt(this.lessons / 10)));
    const recent = this.history.slice(-10);
    const acc = recent.length ? recent.reduce((s, v) => s + v, 0) / recent.length : null;
    const next = (lv + 1) ** 2 * 10;
    return { level: lv + 1, title: LEVELS[lv], lessons: this.lessons, toNext: Math.max(0, next - this.lessons), accuracy: acc, history: this.history.slice(), screens: this.screens, gen: this.gen, dreamGens: this.dreamGens, params: this.net?.nParams || 0, neurons: SIZES.reduce((a, b) => a + b, 0), born: this.born };
  }
  save() {
    if (!this.storage) return;
    const q = (a) => Array.from(a, (v) => Math.round(v * 1000) / 1000);
    this.storage.set({
      v: 1, net: this.net.toJSON(), history: this.history, lessons: this.lessons, screens: this.screens, gen: this.gen, dreamGens: this.dreamGens, born: this.born,
      replay: this.replay.map((it) => (it.kind === 'pair' ? { kind: 'pair', a: q(it.a), b: q(it.b), w: it.w, s: it.s } : { kind: 'point', x: q(it.x), y: it.y, w: it.w, s: it.s })),
      elites: this.elites, best: this.best,
    });
  }
  exportJSON() { this.save(); return JSON.stringify(this.storage ? this.storage.get() : { v: 1, net: this.net.toJSON() }); }
}
export { FEATURE_NAMES, RETINA, N_INPUT };
