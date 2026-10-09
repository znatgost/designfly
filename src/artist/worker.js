// The artist brain runs here, off the main thread, so practising never freezes the studio.
import { Artist } from './artist.js';
import { idbStore } from './store.js';

let artist = null, stop = false;
const summary = () => ({ title: artist.title, level: artist.level, steps: artist.stats.steps, paintings: artist.stats.paintings, seen: artist.stats.seen, params: artist.params, concepts: artist.concepts, history: artist.stats.history.slice(-80), views: artist.views.length, backend: artist.tf.getBackend() });
const H = {
  async init() {
    if (artist) return summary();
    const tf = await import('../vendor/tf.fesm.min.js');
    try { if (!(await tf.setBackend('webgl'))) throw 0; } catch { await tf.setBackend('cpu'); }
    await tf.ready();
    if (tf.getBackend() === 'webgl') {        // some machines only emulate WebGL in workers: check it's really fast
      const t0 = Date.now();
      tf.tidy(() => tf.sigmoid(tf.matMul(tf.randomNormal([16, 256]), tf.randomNormal([256, 128]))).sum()).dataSync();
      if (Date.now() - t0 > 1500) await tf.setBackend('cpu');
    }
    let store = null; try { store = idbStore(); } catch {}
    artist = await new Artist(tf, { store, batch: tf.getBackend() === 'cpu' ? 8 : 16 }).init();
    return summary();
  },
  see(img, source) { artist.see(img, source); return summary(); },
  teach(img, label) { const n = artist.teach(img, label); return { n, ...summary() }; },
  recall(label, seed) { return artist.recall(label, seed); },
  imagine(o) { return artist.imagine(o); },
  like(z) { artist.like(z); return true; },
  exam(n, strokes) { return artist.exam(n, strokes); },
  async practice(o, id) {
    stop = false;
    const r = await artist.practice({ ms: o.ms, yieldEvery: o.yieldEvery || 2, isStopped: () => stop, onTick: o.ticks === false ? null : ({ preview }) => postMessage({ id, tick: { preview, ...summary() } }) });
    return { ...r, ...summary() };
  },
  stop() { stop = true; return true; },
  async paint(img, o) { const r = await artist.paint(img, o); delete r.canvas; return { ...r, ...summary() }; },
  dump() { return artist.dump(); },
  async load(j) { artist.load(j); await artist.save(); return summary(); },
  async reset() { await artist.reset(); return summary(); },
  summary() { return summary(); },
};
onmessage = async (e) => {
  const { id, cmd, args = [] } = e.data;
  try { postMessage({ id, ok: true, res: await H[cmd](...args, id) }); }
  catch (err) { postMessage({ id, ok: false, err: String(err?.message || err) }); }
};
