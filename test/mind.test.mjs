import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MLP } from '../src/learn/mlp.js';
import { Mind } from '../src/learn/mind.js';
import { randomGenome, mutate, crossover, cleanGenome, genomeSVG, rasterize } from '../src/learn/genome.js';
import { features, N_INPUT } from '../src/learn/features.js';
import { generate } from '../src/design/index.js';
import { rng } from '../src/design/rng.js';

test('MLP gradients match finite differences', () => {
  const m = new MLP([5, 4, 3, 1], 3), r = rng(1);
  const a = Float32Array.from({ length: 5 }, () => r.float(-1, 1)), b = Float32Array.from({ length: 5 }, () => r.float(-1, 1));
  const loss = () => { const d = m.forward(a).logit - m.forward(b).logit; return Math.log(1 + Math.exp(-d)); };
  m.zeroGrad();
  const A = m.forward(a), B = m.forward(b), p = 1 / (1 + Math.exp(-(A.logit - B.logit)));
  m.backward(A.acts, -(1 - p)); m.backward(B.acts, 1 - p);
  for (const [l, i] of [[0, 3], [1, 5], [2, 1]]) {
    const w0 = m.W[l][i], h = 1e-3;
    m.W[l][i] = w0 + h; const lp = loss(); m.W[l][i] = w0 - h; const lm = loss(); m.W[l][i] = w0;
    assert.ok(Math.abs((lp - lm) / (2 * h) - m.gW[l][i]) < 2e-3, `dW[${l}][${i}]`);
  }
});

test('genomes: random, mutated and crossed genomes stay valid and render', () => {
  const r = rng(7);
  let g = randomGenome(r);
  for (let i = 0; i < 300; i++) {
    g = i % 5 ? mutate(g, r, 1.5) : crossover(g, randomGenome(r), r);
    assert.ok(cleanGenome(g), 'valid');
    const svg = genomeSVG(g, ['#111', '#e85', '#28f'], 'x' + i);
    assert.ok(!/NaN|undefined/.test(svg));
    const f = features(g);
    assert.equal(f.x.length, N_INPUT);
    assert.ok(f.x.every((v) => v >= -1 && v <= 1 && Number.isFinite(v)));
  }
});

test('features see symmetry', () => {
  const sym = { genes: [{ t: 'circle', x: 14, y: 0, s: 12, a: 1, rot: 0, p: 0.5, n: 5, v: [1, 1, 1, 1, 1, 1], c: 0, cut: false }], sym: 'mirror', n: 0, blend: 'normal' };
  const asym = { ...sym, sym: 'none', genes: [...sym.genes, { ...sym.genes[0], t: 'tri', x: -10, y: 18, rot: 30 }] };
  assert.ok(features(sym).named['mirror symmetry'] > 0.9);
  assert.ok(features(asym).named['mirror symmetry'] < features(sym).named['mirror symmetry']);
  assert.ok(rasterize(sym).px.some((v) => v === 0));
});

test('the mind learns a simulated taste (accuracy rises above chance)', async () => {
  const m = new Mind({ seed: 11 });
  await m.init();
  const taste = (c) => { const f = m.encode(c.genome).named; return 2 * f.roundness - 1.5 * f['line work'] + f['mirror symmetry']; };
  const acc = [];
  for (let s = 0; s < 14; s++) {
    const shown = await m.propose(8, 80);
    const sorted = shown.slice().sort((a, b) => taste(b) - taste(a));
    const r = m.learn(shown, new Set(sorted.slice(0, 2).map((c) => c.id)), new Set(sorted.slice(-2).map((c) => c.id)));
    acc.push(r.accuracy);
  }
  const late = acc.slice(-5).reduce((a, b) => a + b) / 5;
  assert.ok(late > 0.7, `late accuracy ${late}`);
  assert.ok(m.stats.lessons === 14 * 4);
  // persistence round trip
  let store = null;
  m.storage = { get: () => store, set: (v) => { store = JSON.parse(JSON.stringify(v)); } };
  m.save();
  const m2 = new Mind({ storage: m.storage });
  assert.equal(await m2.init(), 'restored');
  const g = randomGenome(rng(3));
  assert.ok(Math.abs(m2.think(g, false).p - m.think(g, false).p) < 0.01);
});

test('evolved marks flow into the logo pipeline', () => {
  const g = randomGenome(rng(5));
  for (const kind of ['logo', 'identity', 'card']) {
    const d = generate({ kind, name: 'Swell', industry: 'surf', mark: 'genome', genome: g, evo: { gen: 3, p: 0.8 }, seed: 2 });
    assert.ok(d.svg.includes('fill-rule="evenodd"'), kind + ' contains the evolved mark');
    assert.ok(!/NaN|undefined/.test(d.svg));
  }
});
