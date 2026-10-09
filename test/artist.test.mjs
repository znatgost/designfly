import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
globalThis.require = createRequire(import.meta.url);     // tfjs' node shim expects CommonJS require

function scene(seed) {
  const w = 80, h = 60, data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = y < 35 ? [90 + y, 150, 230] : [70, 140 - (y - 35), 60];
    if ((x - 20 - seed * 7) ** 2 + (y - 20) ** 2 < 90) c = [250, 210, 60];
    if (x > 40 && x < 60 && y > 30 && y < 50) c = [200, 60, 50];
    data.set([...c, 255], (y * w + x) * 4);
  }
  return { w, h, data };
}

test('artist brain: practises, paints, imagines, remembers what it was taught', async () => {
  const tf = await import('../src/vendor/tf.fesm.min.js');
  await tf.setBackend('cpu');
  const { Artist, toPicture } = await import('../src/artist/artist.js');
  const a = await new Artist(tf, { batch: 4, seed: 3 }).init();
  for (let i = 0; i < 4; i++) a.see(scene(i));
  assert.equal(a.title, 'Newborn');
  const before = await a.exam(4, 8);
  const r = await a.practice({ ms: 2500 });
  assert.ok(r.steps >= 1 && Number.isFinite(r.loss ?? 0));
  const after = await a.exam(4, 8);
  assert.ok(Number.isFinite(before) && Number.isFinite(after));
  const p = await a.paint(scene(1), { ground: 'white', levels: [[1, 1, 6], [2, 2, 2]] });
  assert.ok(p.ops.length >= 2 && p.ops.every((o) => o.k === 'f' || o.p.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))), 'strokes are real numbers');
  assert.ok(p.tried === (6 + 8) * 4 && p.strokes <= 6 + 8, 'one kept stroke per tile and step, chosen from 4 proposals');
  assert.equal(a.imagine({ seed: 1 }).img.data.length, 32 * 32 * 4);
  assert.equal(a.teach(scene(2), 'Sun'), 1); assert.equal(a.knows('sun'), 1); assert.ok(a.recall('sun', 1).w === 64);
  const j = JSON.parse(JSON.stringify(a.dump()));
  const b = await new Artist(tf, { batch: 4 }).init(); b.load(j);
  assert.equal(b.stats.steps, a.stats.steps); assert.equal(b.knows('sun'), 1);
  const w1 = a.hand.getWeights()[0].dataSync().slice(0, 5), w2 = b.hand.getWeights()[0].dataSync().slice(0, 5);
  assert.deepEqual(Array.from(w1), Array.from(w2), 'weights survive a save/load');
  assert.equal(toPicture(scene(0), 32).w, 32);
});
