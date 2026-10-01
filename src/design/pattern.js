// Seamless patterns. patternDef() returns a <pattern> element usable as fill, plus the raw tile.
import { el, g, rect, circle, path, poly, doc, text } from './svg.js';
import { context, design } from './common.js';
import { rng } from './rng.js';
import { fontStack, fontsOf } from './type.js';
import { describe } from './color.js';

export const PATTERNS = ['dots', 'plus', 'waves', 'terrazzo', 'memphis', 'triangles', 'zigzag', 'scales', 'arcs', 'stripes', 'checker', 'confetti', 'rings', 'leaves'];

/** draw `fn(x,y)` at every wrap offset so elements crossing the edge stay seamless */
const wrap = (S, fn) => [-S, 0, S].flatMap((dx) => [-S, 0, S].map((dy) => fn(dx, dy))).join('');

export function tile(kind, cols, S, seed) {
  const r = rng(seed);
  const [bg, a, b, c] = cols;
  const T = {
    dots: () => circle(S / 4, S / 4, S * 0.1, { fill: a }) + circle((3 * S) / 4, (3 * S) / 4, S * 0.1, { fill: b }),
    plus: () => [[S / 4, S / 4, a], [(3 * S) / 4, (3 * S) / 4, b]].map(([x, y, col]) => path(`M${x - S * 0.09} ${y}H${x + S * 0.09}M${x} ${y - S * 0.09}V${y + S * 0.09}`, { stroke: col, strokeWidth: S * 0.035, strokeLinecap: 'round' })).join(''),
    waves: () => [0, 1, 2, 3].map((i) => { const y = (i + 0.5) * (S / 4); return path(`M0 ${y}Q${S / 4} ${y - S / 10} ${S / 2} ${y}T${S} ${y}`, { fill: 'none', stroke: i % 2 ? b : a, strokeWidth: S * 0.035, strokeLinecap: 'round' }); }).join(''),
    terrazzo: () => Array.from({ length: 16 }, () => {
      const x = r.float(0, S), y = r.float(0, S), s = r.float(0.03, 0.09) * S, col = r.pick([a, b, c]), n = r.int(3, 6), rot = r.float(0, 6.28);
      const pts = Array.from({ length: n }, (_, i) => { const t = rot + (i / n) * 6.28, rr = s * r.float(0.6, 1.1); return [rr * Math.cos(t), rr * Math.sin(t)]; });
      return wrap(S, (dx, dy) => poly(pts.map(([px, py]) => [x + px + dx, y + py + dy]), { fill: col }));
    }).join(''),
    memphis: () => Array.from({ length: 7 }, (_, k) => {
      const x = r.float(0, S), y = r.float(0, S), col = r.pick([a, b, c]), kind2 = k % 4, rot = r.int(0, 3) * 45, s = S * 0.08;
      return wrap(S, (dx, dy) => g({ transform: `translate(${x + dx} ${y + dy}) rotate(${rot})` },
        kind2 === 0 ? path(`M${-s * 1.5} 0q${s * 0.75} ${-s} ${s * 1.5} 0t${s * 1.5} 0`, { fill: 'none', stroke: col, strokeWidth: S * 0.025, strokeLinecap: 'round' })
          : kind2 === 1 ? poly([[0, -s], [s, s * 0.8], [-s, s * 0.8]], { fill: 'none', stroke: col, strokeWidth: S * 0.022, strokeLinejoin: 'round' })
            : kind2 === 2 ? circle(0, 0, s * 0.55, { fill: col }) : rect(-s * 0.5, -s * 1.1, s, s * 2.2, { fill: col, rx: s * 0.1 })));
    }).join(''),
    triangles: () => poly([[0, S], [S / 2, 0], [S, S]], { fill: a }) + poly([[S / 2, 0], [S, 0], [S, S]], { fill: b }) + poly([[0, 0], [S / 2, 0], [0, S]], { fill: b }),
    zigzag: () => [0, 1, 2, 3].map((i) => { const y0 = i * (S / 4) + S / 8, amp = S / 12; return path(`M0 ${y0 + amp}` + [1, 2, 3, 4].map((k) => `L${k * S / 4 - S / 8} ${y0 - amp}L${k * S / 4} ${y0 + amp}`).join(''), { fill: 'none', stroke: i % 2 ? b : a, strokeWidth: S * 0.04, strokeLinejoin: 'miter' }); }).join(''),
    scales: () => [[0, S / 2, a], [S, S / 2, a], [S / 2, 0, b], [S / 2, S, b], [0, S * 1.5, a], [S, S * 1.5, a]].map(([x, y, col]) => circle(x, y, S / 2 - S * 0.02, { fill: col, stroke: bg, strokeWidth: S * 0.04 })).join(''),
    arcs: () => [[0, 0, 0], [S / 2, 0, 90], [0, S / 2, 270], [S / 2, S / 2, 180]].map(([x, y, rot], i) => g({ transform: `rotate(${rot + r.int(0, 1) * 90} ${x + S / 4} ${y + S / 4})` },
      path(`M${x} ${y + S / 2}A${S / 2} ${S / 2} 0 0 1 ${x + S / 2} ${y}L${x + S / 2} ${y + S / 2}Z`, { fill: [a, b, c, a][i] }))).join(''),
    stripes: () => poly([[0, 0], [S / 4, 0], [0, S / 4]], { fill: a }) + poly([[S / 2, 0], [S * 0.75, 0], [0, S * 0.75], [0, S / 2]], { fill: a }) + poly([[S, 0], [S, S / 4], [S / 4, S], [0, S], [0, S]], { fill: a }) + poly([[S, S / 2], [S, S * 0.75], [S * 0.75, S], [S / 2, S]], { fill: a }),
    checker: () => rect(0, 0, S / 2, S / 2, { fill: a }) + rect(S / 2, S / 2, S / 2, S / 2, { fill: b }),
    confetti: () => Array.from({ length: 14 }, () => { const x = r.float(0, S), y = r.float(0, S), col = r.pick([a, b, c]), rot = r.int(0, 180), w = S * r.float(0.02, 0.035), h = S * r.float(0.06, 0.1); return wrap(S, (dx, dy) => rect(x + dx - w / 2, y + dy - h / 2, w, h, { fill: col, rx: w / 2, transform: `rotate(${rot} ${x + dx} ${y + dy})` })); }).join(''),
    rings: () => [[S / 2, S / 2, a], [0, 0, b], [S, 0, b], [0, S, b], [S, S, b]].map(([x, y, col]) => circle(x, y, S * 0.28, { fill: 'none', stroke: col, strokeWidth: S * 0.05 }) + circle(x, y, S * 0.12, { fill: c })).join(''),
    leaves: () => [[S / 4, S / 4, 30, a], [(3 * S) / 4, (3 * S) / 4, -40, b], [(3 * S) / 4, S / 4, 120, c], [S / 4, (3 * S) / 4, -140, a]].map(([x, y, rot, col]) =>
      g({ transform: `translate(${x} ${y}) rotate(${rot}) scale(${S / 260})` }, path('M0 42C-30 20-30-20 0-46C30-20 30 20 0 42Z', { fill: col }), path('M0 38L0-36', { stroke: bg, strokeWidth: 4, strokeLinecap: 'round' }))).join(''),
  };
  return rect(0, 0, S, S, { fill: bg }) + (T[kind] || T.dots)();
}

export function patternDef(id, kind, cols, S, seed, scale = 1) {
  return el('pattern', { id, width: S, height: S, patternUnits: 'userSpaceOnUse', patternTransform: scale !== 1 ? `scale(${scale})` : undefined }, tile(kind, cols, S, seed));
}

export function generatePattern(spec) {
  const ctx = context(spec);
  const { C, r, pair, palette } = ctx;
  const kind = PATTERNS.includes(spec.style) ? spec.style : r.pick(PATTERNS);
  const S = 200, W = 1600, H = 1000;
  const bgc = ctx.dark ? C.ink : C.paper;
  const cols = [bgc, C.primary, C.secondary, C.accent];
  const alt = [C.primary, C.paper, C.accent, C.secondary];
  const u = 'pt' + ctx.seed;
  const defs = patternDef(u + 'a', kind, cols, S, ctx.seed) + patternDef(u + 'b', kind, alt, S, ctx.seed, 0.6) + patternDef(u + 'c', kind, [C.ink, C.accent, C.secondary, C.paper], S, ctx.seed, 1.6);
  const body = rect(0, 0, W, H, { fill: '#eeebe4' }) +
    rect(40, 40, 1000, 920, { fill: `url(#${u}a)`, rx: 20 }) +
    rect(1070, 40, 490, 440, { fill: `url(#${u}b)`, rx: 20 }) +
    rect(1070, 510, 490, 330, { fill: `url(#${u}c)`, rx: 20 }) +
    text(1070, 900, `${kind} pattern`, { fontFamily: fontStack(pair.head[0]), fontWeight: pair.head[1], fontSize: 38, fill: C.ink }) +
    text(1070, 934, 'seamless 200 px tile · 3 colourways', { fontFamily: fontStack(pair.body[0]), fontSize: 16, fill: '#777' });
  const fonts = fontsOf(pair);
  const svg = doc(W, H, body, { defs, fonts, seed: ctx.seed, sketch: spec.sketch, title: `${kind} pattern` });
  const tileSvg = (cs, name) => ({ name, svg: doc(S, S, tile(kind, cs, S, ctx.seed), {}) });
  const notes = `**${kind[0].toUpperCase() + kind.slice(1)} pattern**, seamless — the tile repeats with no visible seam, so you can use it as a CSS background, fabric print or packaging wrap.\nColours: ${describe(C.primary)}, ${describe(C.secondary)} and ${describe(C.accent)} on ${describe(bgc)}.\nCSS: \`background: url(tile.svg); background-size: 120px;\``;
  return design({ kind: 'pattern', title: `${kind} pattern`, svg, spec: { ...spec, style: kind }, notes, palette, pair, w: W, h: H,
    assets: [tileSvg(cols, 'tile.svg'), tileSvg(alt, 'tile-alt.svg'), tileSvg([C.ink, C.accent, C.secondary, C.paper], 'tile-dark.svg')] });
}
