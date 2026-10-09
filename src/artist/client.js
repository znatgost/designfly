// Main-thread handle on the artist brain. Prefers a Web Worker (smooth UI); falls back to running
// the networks right here if workers can't load modules.
export class ArtistClient {
  constructor() { this.n = 0; this.pending = new Map(); this.s = { title: 'Newborn', steps: 0, concepts: {}, params: 0, history: [] }; }
  async start() {
    try {
      this.w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      this.w.onmessage = (e) => this._msg(e.data);
      this.w.onerror = (e) => { for (const p of this.pending.values()) p.rej(new Error(e.message || 'worker error')); this.pending.clear(); };
      this._take(await this._call('init', [], 60000));
    } catch (e) {
      console.warn('artist worker unavailable, running on the main thread', e);
      this.w?.terminate(); this.w = null;
      const tf = await import('../vendor/tf.fesm.min.js');
      const { Artist } = await import('./artist.js');
      const { idbStore } = await import('./store.js');
      try { if (!(await tf.setBackend('webgl'))) throw 0; } catch { await tf.setBackend('cpu'); }
      let store = null; try { store = idbStore(); } catch {}
      this.local = await new Artist(tf, { store }).init();
      this._takeLocal();
    }
    return this;
  }
  _msg({ id, ok, res, err, tick }) {
    const p = this.pending.get(id);
    if (!p) return;
    if (tick) { this._take(tick); p.onTick?.(tick); return; }
    this.pending.delete(id);
    ok ? p.res(res) : p.rej(new Error(err));
  }
  _call(cmd, args = [], timeout = 0, onTick = null) {
    const id = ++this.n;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej, onTick });
      this.w.postMessage({ id, cmd, args });
      if (timeout) setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); rej(new Error(cmd + ' timed out')); } }, timeout);
    });
  }
  _take(s) { if (s && typeof s === 'object' && 'title' in s) Object.assign(this.s, { title: s.title, level: s.level, steps: s.steps, paintings: s.paintings, seen: s.seen, params: s.params, concepts: s.concepts, history: s.history, views: s.views, backend: s.backend }); return s; }
  _takeLocal() { const a = this.local; this._take({ title: a.title, level: a.level, steps: a.stats.steps, paintings: a.stats.paintings, seen: a.stats.seen, params: a.params, concepts: a.concepts, history: a.stats.history.slice(-80), views: a.views.length, backend: a.tf.getBackend() }); }
  async _do(cmd, args, local) { if (this.local) { const r = await local(); this._takeLocal(); return r; } return this._take(await this._call(cmd, args)); }

  get title() { return this.s.title; }
  get steps() { return this.s.steps; }
  get params() { return this.s.params; }
  get concepts() { return this.s.concepts || {}; }
  get history() { return this.s.history || []; }
  knows(label) { return this.concepts[String(label).toLowerCase()] || 0; }
  see(img, source = 'studio') { return this._do('see', [img, source], () => this.local.see(img, source)); }
  async teach(img, label) { const r = await this._do('teach', [img, label], () => ({ n: this.local.teach(img, label) })); return r.n; }
  recall(label, seed) { return this._do('recall', [label, seed], () => this.local.recall(label, seed)); }
  imagine(o) { return this._do('imagine', [o], () => this.local.imagine(o)); }
  like(z) { return this._do('like', [z], () => this.local.like(z)); }
  exam(n, strokes) { return this._do('exam', [n, strokes], () => this.local.exam(n, strokes)); }
  practice({ ms, onTick = null, yieldEvery, ticks } = {}) {
    if (this.local) { this._stop = false; return this.local.practice({ ms, yieldEvery, isStopped: () => this._stop, onTick: onTick && ((t) => { this._takeLocal(); onTick({ ...this.s, preview: t.preview }); }) }).then((r) => { this._takeLocal(); return r; }); }
    return this._call('practice', [{ ms, yieldEvery, ticks: !!onTick }], ms + 600000, onTick).then((r) => this._take(r));
  }
  stop() { if (this.local) { this._stop = true; return Promise.resolve(true); } return this._call('stop'); }
  paint(img, o) { return this._do('paint', [img, o], () => this.local.paint(img, o)); }
  dump() { return this._do('dump', [], () => this.local.dump()); }
  load(j) { return this._do('load', [j], async () => { this.local.load(j); await this.local.save(); }); }
}
