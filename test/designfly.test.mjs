import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, KINDS, normalize } from '../src/design/index.js';
import { contrast, hexToOklch, oklch, makePalette } from '../src/design/color.js';
import { respond } from '../src/brain.js';
import { parse, extract, applyModifiers } from '../src/intents.js';
import { parseReply, sanitizeSVG } from '../src/llm.js';
import { searchKB } from '../src/knowledge.js';

const wellFormed = (svg) => {
  // cheap XML sanity: balanced tags, no NaN/undefined leaking into attributes
  assert.ok(svg.startsWith('<svg'), 'starts with <svg');
  assert.ok(!/NaN|undefined|\[object/.test(svg), 'no NaN/undefined');
  const stack = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)[^>]*?(\/?)>/g)) {
    if (m[3]) continue;
    if (m[1]) assert.equal(stack.pop(), m[2], 'balanced </' + m[2] + '>'); else stack.push(m[2]);
  }
  assert.equal(stack.length, 0, 'all tags closed');
};

test('every kind generates well-formed SVG for many seeds', () => {
  for (const kind of Object.keys(KINDS)) for (let seed = 1; seed <= 25; seed++) {
    const d = generate({ kind, seed, name: seed % 3 ? 'Blue Bean' : 'Ωmega & Co', industry: ['coffee', 'tech', 'fashion', 'eco', 'music'][seed % 5], sketch: seed % 4 === 0, bedrooms: 1 + (seed % 5), floors: 1 + (seed % 12) });
    wellFormed(d.svg);
    for (const a of d.assets) if (a.svg) wellFormed(a.svg);
    assert.ok(d.title && d.notes, kind + ' has title + notes');
  }
});

test('designs are deterministic in (spec, seed)', () => {
  const a = generate({ kind: 'logo', name: 'Nimbus', industry: 'ai', seed: 42 });
  const b = generate({ kind: 'logo', name: 'Nimbus', industry: 'ai', seed: 42 });
  assert.equal(a.svg, b.svg);
  const c = generate({ kind: 'logo', name: 'Nimbus', industry: 'ai', seed: 43 });
  assert.notEqual(a.svg, c.svg);
});

test('colour math: WCAG contrast and OKLCH round trip', () => {
  assert.equal(Math.round(contrast('#000000', '#ffffff')), 21);
  assert.ok(Math.abs(contrast('#777777', '#ffffff') - 4.48) < 0.02);
  const [L, C, H] = hexToOklch('#2b6de0');
  assert.equal(oklch(L, C, H), '#2b6de0');
  const p = makePalette({ moods: ['calm'], seed: 3 });
  assert.equal(p.colors.length, 5);
  assert.ok(contrast(p.get('ink'), p.get('paper')) > 10, 'ink on paper is readable');
});

test('normalize() cleans untrusted specs (e.g. from an LLM)', () => {
  const s = normalize({ kind: 'nope', colors: ['#fff', 'red', '12ab3c'], moods: ['calm', 'evil'], bedrooms: 99, name: 'x'.repeat(200) });
  assert.equal(s.kind, 'logo');
  assert.deepEqual(s.colors, ['#fff', '#12ab3c']);
  assert.deepEqual(s.moods, ['calm']);
  assert.equal(s.bedrooms, 5);
  assert.equal(s.name.length, 40);
});

test('intent parsing', () => {
  assert.equal(parse('Make a logo for a coffee shop called Blue Bean').type, 'create');
  const ex = extract('Make a logo for a coffee shop called Blue Bean');
  assert.equal(ex.name, 'Blue Bean'); assert.equal(ex.industry, 'coffee'); assert.equal(ex.colors, undefined);
  assert.equal(parse('What makes a good logo?').type, 'advice');
  assert.equal(parse('make it darker', { kind: 'logo' }).type, 'modify');
  assert.equal(extract('3 bedroom house, 120 m2').bedrooms, 3);
  assert.equal(extract('3 bedroom house, 120 m2').area, 120);
  assert.equal(extract('a brutalist facade with 6 floors').floors, 6);
  assert.equal(extract('hoodie with stripes').print, 'stripes');
  assert.equal(parse('inspire me').type, 'muse'); assert.equal(parse('вдохнови меня').type, 'muse');
  const m = applyModifiers('another one, but blue', { kind: 'logo', seed: 5, name: 'X' });
  assert.notEqual(m.spec.seed, 5); assert.ok(m.spec.colors?.length);
});

test('offline brain: create → modify → switch kind keeps the brand', () => {
  const r1 = respond('logo for a bakery called Crumb');
  assert.equal(r1.specs[0].kind, 'logo'); assert.equal(r1.specs[0].name, 'Crumb');
  const d = generate(r1.specs[0]);
  const r2 = respond('now a business card', { last: d.spec });
  assert.equal(r2.specs[0].kind, 'card'); assert.equal(r2.specs[0].name, 'Crumb');
  const r3 = respond('contrast #777777 on #ffffff', { last: d.spec });
  assert.ok(!r3.specs && /4\.48/.test(r3.text));
  assert.ok(/good logo|distinctive/i.test(respond('what makes a good logo?').text));
  assert.ok(searchKB('ideal bedroom size')[0].e.id === 'room-sizes');
});

test('LLM replies: design blocks and SVG are extracted and sanitised', () => {
  const r = parseReply('Here!\n```design\n{"kind":"poster","name":"Night",}\n```\n```svg\n<svg viewBox="0 0 10 10" onload="alert(1)"><script>x</script><image href="http://evil"/></svg>\n```');
  assert.equal(r.specs[0].kind, 'poster');
  assert.equal(r.text, 'Here!');
  assert.ok(!/script|onload|evil/.test(r.svgs[0]));
  assert.equal(sanitizeSVG('<div>no</div>'), null);
});

test('Russian requests and follow-ups', () => {
  const r1 = respond('создай логотип пекарни Колобок');
  assert.equal(r1.specs[0].kind, 'logo'); assert.equal(r1.specs[0].name, 'Колобок'); assert.equal(r1.specs[0].industry, 'bakery');
  const d = generate(r1.specs[0]);
  assert.equal(respond('сделай темнее', { last: d.spec }).specs[0].dark, true);
  assert.equal(respond('привет').mood, 'talk');
  assert.ok(/font|Pairing/i.test(respond('как выбрать шрифт').text));
  const fp = respond('план 3-комнатной квартиры 85 кв');
  assert.equal(fp.specs[0].kind, 'floorplan'); assert.equal(fp.specs[0].bedrooms, 2); assert.equal(fp.specs[0].area, 85);
  assert.equal(respond('сам придумай логотип для пекарни').evolve.industry, 'bakery');
});

test('English follow-ups, names and poster details', () => {
  assert.equal(respond('A logo for my startup Quantum Leap that does AI').specs[0].name, 'Quantum Leap');
  const p = respond('poster for a jazz concert on 12 June').specs[0];
  assert.equal(p.name, 'Jazz Concert'); assert.ok(generate(p).svg.includes('12 June'));
  const last = generate(respond('logo for Neon Cat bar').specs[0]).spec;
  assert.equal(respond('hand drawn', { last }).specs[0].sketch, true);
  assert.ok(/thinking/i.test(respond('what do you think?', { last }).text));
  assert.ok(/Colour associations/.test(respond('is red good for a food brand?').text));
});

test('every muse idea is something the fly can actually draw', async () => {
  const { museIdea } = await import('../src/brain.js');
  for (let i = 0; i < 150; i++) for (const k of ['lamp', 'cup', 'mug', 'fan', 'notes', 'ruler', null]) {
    const idea = museIdea(k ? [{ k, what: 'x' }] : []);
    const r = respond(idea.prompt, {});
    assert.ok(r.specs || r.evolve, `idea "${idea.prompt}" must produce a design`);
    if (r.specs) assert.ok(generate(r.specs[0]).svg.startsWith('<svg'));
  }
});

test('freehand engine: every kind and motif draws, deterministically', async () => {
  const { MOTIFS } = await import('../src/hand/concepts.js');
  for (const kind of ['logo', 'poster', 'card', 'pattern', 'drawing']) for (let seed = 1; seed <= 12; seed++) {
    const spec = { kind, seed, hand: { skill: seed / 12 }, name: seed % 2 ? 'Blue Bean' : 'Колобок', industry: ['coffee', 'bakery', 'surf', 'music'][seed % 4], subject: kind === 'drawing' ? [MOTIFS[seed % MOTIFS.length]] : undefined };
    const d = generate(spec);
    wellFormed(d.svg);
    assert.ok(d.hand && d.ops.length > 10 && !d.svg.includes('<text'), kind + ' is drawn, not typeset');
    assert.equal(generate(spec).svg, d.svg, 'same spec → same drawing');
    assert.ok(d.ops.every((o) => o.t1 >= o.t0 && o.t1 <= 1.0000001), 'timeline is ordered');
  }
  for (const m of MOTIFS) for (let seed = 1; seed <= 6; seed++) assert.ok(!/NaN/.test(generate({ kind: 'drawing', seed, subject: [m] }).svg), m);
  assert.notEqual(generate({ kind: 'drawing', seed: 1, subject: ['cat'] }).svg, generate({ kind: 'drawing', seed: 2, subject: ['cat'] }).svg, 'no two cats alike');
  assert.ok(generate({ kind: 'logo', seed: 3, name: 'X', hand: false }).svg.includes('<text'), 'hand: false → template engine');
});

test('drawing requests, hand/template switches and the hand learning', async () => {
  const r = respond('нарисуй кота который смотрит на луну');
  assert.equal(r.specs[0].kind, 'drawing'); assert.deepEqual(r.specs[0].subject, ['cat', 'moon']);
  assert.equal(respond('draw a giraffe').specs[0].caption, 'giraffe');
  assert.equal(respond('логотип пекарни Колобок без шаблонов').specs[0].hand, true);
  const last = generate({ kind: 'logo', name: 'Crumb', seed: 4, hand: {} }).spec;
  assert.equal(respond('Template version', { last }).specs[0].hand, false);
  assert.equal(respond('how to draw a circle?').specs, undefined);
  assert.equal(respond('Draw a logo for a cat cafe').specs[0].kind, 'logo');
  const { Taste } = await import('../src/hand/taste.js');
  const mem = new Map(), st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const t = new Taste(st), s0 = t.skill;
  for (let i = 0; i < 5; i++) t.feedback('logo', { layout: 'badge', fill: 'riso', nib: 'marker', letter: 'bold', colour: 'natural' }, +1);
  t.practice();
  const t2 = new Taste(st);
  assert.ok(t2.skill > s0 && t2.w.layout.logo.badge > 4 && t2.w.fill.riso > 4, 'likes and practice persist');
  let badges = 0; for (let i = 0; i < 400; i++) if (t2.sample('logo').layout === 'badge') badges++;
  assert.ok(badges > 200, 'liked layout is drawn more often');
});

test('the painter: looks, paints, and gets better with skill', async () => {
  const { paint } = await import('../src/paint/painter.js');
  const w = 120, h = 90, data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = y < 55 ? [100 + y, 160, 235] : [70, 140 - (y - 55), 60];
    if ((x - 85) ** 2 + (y - 22) ** 2 < 150) c = [250, 210, 60];
    if (x > 20 && x < 52 && y > 38 && y < 70) c = [200, 60, 50];
    data.set([...c, 255], (y * w + x) * 4);
  }
  const img = { w, h, data };
  const lo = paint(img, { seed: 1, skill: 0, style: 'broad' }), hi = paint(img, { seed: 1, skill: 1, style: 'fine' });
  assert.ok(hi.likeness > lo.likeness + 0.03, `skill helps (${lo.likeness.toFixed(2)} → ${hi.likeness.toFixed(2)})`);
  assert.ok(hi.strokes > lo.strokes && lo.strokes > 50);
  assert.deepEqual(paint(img, { seed: 1, skill: 0.5 }).ops, paint(img, { seed: 1, skill: 0.5 }).ops, 'deterministic');
  const d = generate({ kind: 'painting', seed: 5, scene: 'abstract' });
  wellFormed(d.svg); assert.ok(d.ops.length > 100 && /Abstraction/.test(d.title));
  const r = respond('напиши автопортрет'); assert.equal(r.specs[0].kind, 'painting'); assert.equal(r.specs[0].scene, 'self');
  assert.equal(respond('paint a cat').specs[0].scene, 'memory');
  assert.equal(respond('нарисуй картину').specs[0].scene, 'studio');
});
