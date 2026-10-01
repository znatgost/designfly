// Logos: mark + wordmark lockups, badges, and a presentation sheet with colour variants.
import { el, g, rect, circle, text, doc, path } from './svg.js';
import { context, initials, design } from './common.js';
import { drawMark, INDUSTRY_MARKS, MARK_NAMES } from './marks.js';
import { fontStack, textWidth, fitSize, fontsOf, FONTS } from './type.js';
import { readableOn, contrast, mix, describe, shade } from './color.js';
import { esc } from './svg.js';

export const LOGO_STYLES = ['combination', 'wordmark', 'monogram', 'emblem', 'abstract'];

const MARK_WHY = {
  bauhaus: 'four Bauhaus tiles — circle, quarter-circle and triangle — a nod to modular, constructive thinking',
  orbit: 'a planet with an orbit: motion, reach and a system that keeps things in balance',
  layers: 'stacked isometric layers: structure, depth and building blocks',
  petal: 'overlapping translucent petals: growth, openness, many voices making one shape',
  wave: 'waves inside a circle: rhythm, sound, flow',
  spark: 'a soft four-point spark: the moment an idea lands',
  leaf: 'a clean leaf with a vein highlight: nature, health, care',
  chevron: 'stacked chevrons: forward motion, progress, rank',
  pixel: 'a symmetric pixel glyph generated from the name itself — unique like a fingerprint',
  rings: 'interlocking rings: partnership and connection',
  sun: 'a striped retro sun on the horizon: warmth, optimism, a new day',
  drop: 'a single drop: purity, freshness, essence',
  mountain: 'two peaks and a sun: adventure and the outdoors',
  house: 'a roofline over a door: home, shelter, craft',
  bolt: 'a lightning bolt: energy and speed',
  heart: 'a heart with a small accent dot: care with a human touch',
  cup: 'a steaming cup on a saucer: warmth and ritual',
  bubble: 'a speech bubble with three dots: conversation',
  play: 'a play button inside a dashed ring: media, motion, "press start"',
  paw: 'a paw print: pets and friendly care',
  monogram: 'a monogram in a solid container — classic, compact, works down to a favicon',
  cut: 'a sliced initial, offset along a diagonal: editorial tension and craft',
  grid: 'a 3×3 grid of primitives: a toolkit, modularity, play',
};

export function logoSystem(ctx) {
  const { r, spec, pair, C } = ctx;
  const name = (spec.name || 'Designfly').trim();
  const style = spec.style && LOGO_STYLES.includes(spec.style) ? spec.style : spec.mark === 'genome' ? 'combination' : r.weighted([['combination', 5], ['wordmark', 2], ['monogram', 2], ['emblem', 2]]);
  const cands = (spec.mark && MARK_NAMES.includes(spec.mark)) ? [spec.mark] : (INDUSTRY_MARKS[spec.industry] || ['bauhaus', 'orbit', 'spark', 'petal', 'rings', 'layers', 'pixel', 'grid', 'chevron', 'cut']);
  let markName = spec.mark === 'genome' && spec.genome ? 'genome' : style === 'monogram' ? (spec.mark && MARK_NAMES.includes(spec.mark) ? spec.mark : r.pick(['monogram', 'monogram', 'cut'])) : r.pick(cands);
  const markSeed = (ctx.seed * 104729 + 17) >>> 0;
  const head = pair.head[0], hw = pair.head[1];
  const upperPairs = ['luxe', 'classic', 'fashion', 'poster', 'brutal', 'sport', 'future'];
  const lowerPairs = ['techy', 'friendly'];
  let casing = spec.casing || (upperPairs.includes(pair.id) ? 'upper' : lowerPairs.includes(pair.id) ? r.pick(['lower', 'title']) : r.pick(['title', 'title', 'lower', 'upper']));
  if (FONTS[head]?.cat === 'cursive') casing = 'title';
  const tracking = casing === 'upper' ? (['luxe', 'classic', 'fashion'].includes(pair.id) ? 0.22 : 0.06) : casing === 'lower' ? -0.02 : 0.01;
  const shown = casing === 'upper' ? name.toUpperCase() : casing === 'lower' ? name.toLowerCase() : name;
  const accent = spec.accent || (style === 'wordmark' ? r.pick(['dot', 'first', 'bar', 'none']) : r.pick(['none', 'none', 'dot']));
  const letter = initials(name, markName === 'cut' ? 1 : 2);
  const shape = spec.shape || null;

  const mark = (cols, cx, cy, size, id, onMain) => drawMark(markName, markSeed, cols, { letter, font: head, weight: hw, id, shape, onMain, genome: spec.genome }, cx, cy, size);

  /** wordmark whose left/centre edge sits at x and baseline at y, exactly w wide */
  function word(x, y, size, col, anchor = 'start', accentCol = C.accent) {
    const w = textWidth(shown, head, size, { caps: casing === 'upper', tracking, weight: hw });
    const x0 = anchor === 'middle' ? x - w / 2 : x;
    const attrs = { fontFamily: fontStack(head), fontWeight: hw, fontSize: size, textLength: w, lengthAdjust: 'spacing' };
    let out;
    if (accent === 'first' && shown.length > 1) {
      out = el('text', { x: x0, y, ...attrs, fill: col }, el('tspan', { fill: accentCol }, esc(shown[0])), esc(shown.slice(1)));
    } else out = text(x0, y, shown, { ...attrs, fill: col });
    if (accent === 'dot') out += circle(x0 + w + size * 0.16, y - size * 0.08, size * 0.09, { fill: accentCol });
    if (accent === 'bar') out += rect(x0, y + size * 0.24, w * 0.32, size * 0.08, { fill: accentCol, rx: size * 0.04 });
    return { svg: out, w: w + (accent === 'dot' ? size * 0.3 : 0) };
  }
  const tagline = spec.tagline || '';
  function tag(x, y, size, col, anchor = 'start', maxW = 1e9) {
    if (!tagline) return '';
    const s = Math.min(size, fitSize(tagline.toUpperCase(), pair.body[0], maxW, size, { caps: true, tracking: 0.25 }));
    return text(x, y, tagline.toUpperCase(), { fontFamily: fontStack(pair.body[0]), fontWeight: pair.body[1], fontSize: s, fill: col, textAnchor: anchor, letterSpacing: s * 0.25 });
  }

  /** lockup inside a box; colors { mark:[...], text, sub, accent } */
  function lockup(kind, bx, by, bw, bh, col, id) {
    const onMain = readableOn(col.mark[0], '#111111', '#ffffff');
    if (kind === 'mark') { const s = Math.min(bw, bh) * 0.8; return mark(col.mark, bx + bw / 2, by + bh / 2, s, id, onMain); }
    if (style === 'emblem' || kind === 'emblem') return emblem(bx + bw / 2, by + bh / 2, Math.min(bw, bh) * 0.46, col, id, onMain);
    if (style === 'wordmark' || kind === 'word') {
      const size = Math.min(fitSize(shown, head, bw * 0.84, bh * 0.5, { caps: casing === 'upper', tracking, weight: hw }), bh * 0.5);
      const wd = word(bx + bw / 2, by + bh / 2 + size * 0.33 - (tagline ? size * 0.2 : 0), size, col.text, 'middle', col.accent);
      return wd.svg + tag(bx + bw / 2, by + bh / 2 + size * 0.95, size * 0.2, col.sub, 'middle', bw * 0.8);
    }
    if (kind === 'stacked') {
      const ms = bh * 0.46;
      const size = Math.min(fitSize(shown, head, bw * 0.86, bh * 0.2, { caps: casing === 'upper', tracking, weight: hw }), bh * 0.2);
      const top = by + bh * 0.08 + (tagline ? 0 : bh * 0.03);
      return mark(col.mark, bx + bw / 2, top + ms / 2, ms, id, onMain) +
        word(bx + bw / 2, top + ms + bh * 0.07 + size * 0.75, size, col.text, 'middle', col.accent).svg +
        tag(bx + bw / 2, top + ms + bh * 0.07 + size * 0.75 + size * 0.75, size * 0.34, col.sub, 'middle', bw * 0.8);
    }
    // horizontal
    const ms = Math.min(bh * 0.78, bw * 0.3);
    const gap = ms * 0.24;
    let size = fitSize(shown, head, bw - ms - gap - bw * 0.06, Math.min(bh * 0.44, ms * 0.62), { caps: casing === 'upper', tracking, weight: hw });
    const wtest = textWidth(shown, head, size, { caps: casing === 'upper', tracking, weight: hw }) + (accent === 'dot' ? size * 0.3 : 0);
    const total = ms + gap + wtest;
    const x0 = bx + (bw - total) / 2;
    const cy = by + bh / 2;
    const base = cy + size * 0.34 - (tagline ? size * 0.18 : 0);
    return mark(col.mark, x0 + ms / 2, cy, ms, id, onMain) + word(x0 + ms + gap, base, size, col.text, 'start', col.accent).svg +
      tag(x0 + ms + gap + size * 0.04, base + size * 0.62, size * 0.26, col.sub, 'start', wtest);
  }

  function emblem(cx, cy, R, col, id, onMain) {
    const rid = 'em' + id;
    const nm = name.toUpperCase();
    const fs = Math.min(R * 0.2, (Math.PI * R * 0.78 * 0.9) / Math.max(4, textWidth(nm, head, 1, { caps: true, tracking: 0.2 })));
    const tl = (tagline || `EST. ${2020 + (ctx.seed % 7)}`).toUpperCase();
    const tfs = Math.min(R * 0.12, (Math.PI * R * 0.78 * 0.7) / Math.max(4, textWidth(tl, pair.body[0], 1, { caps: true, tracking: 0.3 })));
    const rt = R * 0.78;
    return g({},
      circle(cx, cy, R, { fill: 'none', stroke: col.mark[0], strokeWidth: R * 0.045 }),
      circle(cx, cy, R * 0.9, { fill: 'none', stroke: col.mark[0], strokeWidth: R * 0.012 }),
      circle(cx, cy, R * 0.6, { fill: 'none', stroke: col.mark[0], strokeWidth: R * 0.012 }),
      el('path', { id: rid + 't', d: `M${cx - rt} ${cy}A${rt} ${rt} 0 0 1 ${cx + rt} ${cy}`, fill: 'none' }),
      el('path', { id: rid + 'b', d: `M${cx - rt * 0.97} ${cy}A${rt * 0.97} ${rt * 0.97} 0 0 0 ${cx + rt * 0.97} ${cy}`, fill: 'none' }),
      el('text', { fontFamily: fontStack(head), fontWeight: hw, fontSize: fs, fill: col.text, letterSpacing: fs * 0.2, dy: fs * 0.35, textAnchor: 'middle' },
        el('textPath', { href: `#${rid}t`, startOffset: '50%' }, esc(nm))),
      el('text', { fontFamily: fontStack(pair.body[0]), fontWeight: 600, fontSize: tfs, fill: col.sub, letterSpacing: tfs * 0.3, dy: tfs * 0.35, textAnchor: 'middle' },
        el('textPath', { href: `#${rid}b`, startOffset: '50%' }, esc(tl))),
      circle(cx - rt, cy, R * 0.035, { fill: col.accent }), circle(cx + rt, cy, R * 0.035, { fill: col.accent }),
      mark(col.mark, cx, cy, R * 0.82, id + 'm', onMain));
  }

  const why = markName === 'genome' ? `a mark the fly's mind evolved itself${spec.evo ? ` (generation ${spec.evo.gen}, it rated it ${Math.round(spec.evo.p * 100)}%)` : ''} — no template, built gene by gene from shapes and negative space` : MARK_WHY[markName] || '';
  return { name, style, markName, mark, lockup, word, shown, casing, letter, why, tagline, emblem };
}

export function variants(ctx) {
  const { C, onBg } = ctx;
  const lightBg = C.paper, darkBg = contrast(C.primary, '#ffffff') >= 3 ? C.primary : C.ink;
  const onDark = (h) => (contrast(h, darkBg) >= 2.4 ? h : mix(h, '#ffffff', 0.7));
  return {
    main: { bg: lightBg, mark: [onBg(C.primary), C.secondary, C.accent].map((h) => (contrast(h, lightBg) < 1.25 ? shade(h, -0.25) : h)), text: C.ink, sub: mix(C.ink, lightBg, 0.35), accent: onBg(C.accent) },
    reversed: { bg: darkBg, mark: darkBg === C.primary ? ['#ffffff', onDark(C.secondary), onDark(C.accent)] : [onDark(C.primary), onDark(C.secondary), onDark(C.accent)], text: '#ffffff', sub: 'rgba(255,255,255,.72)', accent: onDark(C.accent) },
    ink: { bg: C.ink, mark: [onDark(C.accent), onDark(C.secondary), onDark(C.primary)].map((h) => (contrast(h, C.ink) < 2.4 ? mix(h, '#ffffff', 0.6) : h)), text: C.paper, sub: mix(C.paper, C.ink, 0.35), accent: C.accent },
    mono: { bg: '#ffffff', mark: ['#111111', '#6f6f6f', '#bdbdbd'], text: '#111111', sub: '#555555', accent: '#111111' },
  };
}

export function generateLogo(spec) {
  const ctx = context(spec);
  const { C, pair, palette } = ctx;
  const L = logoSystem(ctx);
  const V = variants(ctx);
  const fonts = fontsOf(pair);
  const W = 1600, H = 1000;
  const mainKind = L.style === 'emblem' ? 'emblem' : L.style === 'wordmark' ? 'word' : L.style === 'monogram' ? 'stacked' : 'horizontal';
  const tile = (x, y, w, h, v, kind, id) => rect(x, y, w, h, { fill: v.bg, rx: 18 }) + L.lockup(kind, x + 20, y + 16, w - 40, h - 32, v, id);
  const body = [
    rect(0, 0, W, H, { fill: '#eeebe4' }),
    tile(40, 40, 960, 700, V.main, mainKind, 'a'),
    tile(1030, 40, 530, 220, V.reversed, L.style === 'emblem' ? 'mark' : L.style === 'wordmark' ? 'word' : 'horizontal', 'b'),
    tile(1030, 280, 530, 220, V.mono, L.style === 'emblem' ? 'emblem' : L.style === 'wordmark' ? 'word' : 'horizontal', 'c'),
    rect(1030, 520, 530, 220, { fill: '#ffffff', rx: 18 }),
    // app icon + favicon sizes
    ...[[1080, 548, 164], [1270, 578, 104], [1400, 604, 52], [1482, 618, 24]].map(([x, y, s], i) =>
      rect(x, y, s, s, { rx: s * 0.23, fill: V.reversed.bg }) + L.lockup('mark', x + s * 0.12, y + s * 0.12, s * 0.76, s * 0.76, V.reversed, 'ic' + i)),
    text(1080, 730, 'APP ICON · 180 / 120 / 64 / 32', { fontFamily: fontStack(pair.body[0]), fontSize: 13, letterSpacing: 2, fill: '#8a8a8a', fontWeight: 600 }),
    // palette + type strip
    ...palette.colors.map((c, i) => rect(40 + i * 150, 780, 136, 120, { rx: 14, fill: c.hex }) +
      text(52 + i * 150, 930, c.hex.toUpperCase(), { fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fill: '#333' }) +
      text(52 + i * 150, 952, c.role, { fontFamily: fontStack(pair.body[0]), fontSize: 13, fill: '#8a8a8a' })),
    text(830, 820, pair.head[0], { fontFamily: fontStack(pair.head[0]), fontWeight: pair.head[1], fontSize: 38, fill: C.ink }),
    text(830, 850, `headline · ${pair.head[1]}`, { fontFamily: fontStack(pair.body[0]), fontSize: 14, fill: '#8a8a8a' }),
    text(830, 900, pair.body[0], { fontFamily: fontStack(pair.body[0]), fontWeight: pair.body[1], fontSize: 30, fill: C.ink }),
    text(830, 926, `text · ${pair.body[1]}`, { fontFamily: fontStack(pair.body[0]), fontSize: 14, fill: '#8a8a8a' }),
    text(1560, 960, 'designed by a fly · designfly', { fontFamily: "'Caveat', cursive", fontSize: 26, fill: '#9a9a9a', textAnchor: 'end' }),
  ].join('');
  const sk = { fonts, seed: ctx.seed, sketch: spec.sketch, paper: '#f3eee3' };
  const svg = doc(W, H, body, { ...sk, title: `${L.name} — logo` });
  const asset = (fname, w, h, b, bg) => ({ name: fname, svg: doc(w, h, b, { ...sk, bg, sketch: spec.sketch && !!bg }) });
  const assets = [
    asset('logo-horizontal.svg', 1200, 400, L.lockup(mainKind === 'emblem' ? 'emblem' : mainKind === 'word' ? 'word' : 'horizontal', 30, 30, 1140, 340, V.main, 'h')),
    asset('logo-stacked.svg', 800, 800, L.lockup(mainKind === 'emblem' ? 'emblem' : mainKind === 'word' ? 'word' : 'stacked', 60, 60, 680, 680, V.main, 's')),
    asset('logo-reversed.svg', 1200, 400, L.lockup(mainKind === 'emblem' ? 'emblem' : mainKind === 'word' ? 'word' : 'horizontal', 30, 30, 1140, 340, V.reversed, 'r'), V.reversed.bg),
    asset('logo-mono.svg', 1200, 400, L.lockup(mainKind === 'emblem' ? 'emblem' : mainKind === 'word' ? 'word' : 'horizontal', 30, 30, 1140, 340, V.mono, 'm')),
    asset('mark.svg', 600, 600, L.lockup('mark', 40, 40, 520, 520, V.main, 'k')),
    asset('app-icon.svg', 512, 512, rect(0, 0, 512, 512, { rx: 116, fill: V.reversed.bg }) + L.lockup('mark', 70, 70, 372, 372, V.reversed, 'i')),
  ];
  const notes = [
    `**${L.name}** — ${L.style} logo.`,
    L.style !== 'wordmark' ? `Mark: ${L.why}.` : `Pure wordmark in ${pair.head[0]}, ${L.casing === 'upper' ? 'all caps with open tracking' : L.casing === 'lower' ? 'lowercase and tightly set' : 'title case'}.`,
    `Type: ${pair.head[0]} ${pair.head[1]} for the name, ${pair.body[0]} for everything else. ${pair.why}`,
    `Colour: ${describe(C.primary)} (${C.primary}) leads, ${describe(C.secondary)} supports, ${describe(C.accent)} is the spark — ${palette.harmony} harmony.`,
    'Check it at 32 px (the favicon row) — if it survives there, it survives anywhere.',
  ].join('\n');
  return design({ kind: 'logo', title: `${L.name} logo`, svg, spec, notes, assets, palette, pair, w: W, h: H });
}
