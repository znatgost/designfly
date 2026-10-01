// Business cards, posters and full brand-identity boards — all built on the logo system.
import { el, g, rect, circle, text, path, poly, doc, line } from './svg.js';
import { context, design, titleCase } from './common.js';
import { logoSystem, variants } from './logo.js';
import { patternDef, PATTERNS } from './pattern.js';
import { fontStack, fontsOf, fitSize, wrapTextLines, textWidth, FONTS } from './type.js';
import { readableOn, mix, contrast, describe, shade } from './color.js';
import { drawMark } from './marks.js';

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '') || 'studio';

// ------------------------------------------------------------------ business card
function cardSides(ctx, L, V, pid) {
  const { C, pair, spec } = ctx;
  const W = 1050, H = 600;
  const body = fontStack(pair.body[0]), head = fontStack(pair.head[0]);
  const site = (spec.website || slugify(L.name) + '.com');
  const person = spec.person || 'Alex Morgan', role = spec.role || 'Founder';
  const front = rect(0, 0, W, H, { fill: V.reversed.bg }) + rect(0, 0, W, H, { fill: `url(#${pid})`, opacity: 0.16 }) +
    L.lockup(L.style === 'emblem' ? 'emblem' : L.style === 'wordmark' ? 'word' : 'stacked', 175, 90, 700, 420, V.reversed, 'cf');
  const back = rect(0, 0, W, H, { fill: C.paper }) + rect(0, H - 22, W, 22, { fill: C.primary }) + rect(0, H - 22, W * 0.2, 22, { fill: C.accent }) +
    L.lockup('mark', 80, 80, 130, 130, V.main, 'cb') +
    text(90, 320, person, { fontFamily: head, fontWeight: pair.head[1], fontSize: Math.min(52, fitSize(person, pair.head[0], 860, 52, { weight: pair.head[1] })), fill: C.ink }) +
    text(92, 362, role.toUpperCase(), { fontFamily: body, fontWeight: 600, fontSize: 20, letterSpacing: 4, fill: mix(C.ink, C.paper, 0.4) }) +
    [`hello@${site}`, spec.phone || '+1 555 0142', site].map((t, i) => text(92, 440 + i * 36, t, { fontFamily: body, fontSize: Math.min(24, fitSize(`hello@${site}`, pair.body[0], 640, 24)), fill: C.ink })).join('') +
    rect(W - 250, 400, 150, 150, { fill: 'none', stroke: mix(C.ink, C.paper, 0.6), strokeDasharray: '6 6', rx: 8 }) +
    text(W - 175, 482, 'QR', { fontFamily: body, fontSize: 22, fill: mix(C.ink, C.paper, 0.5), textAnchor: 'middle' });
  return { W, H, front, back };
}

export function generateCard(spec) {
  const ctx = context(spec);
  const { C, pair, palette, r } = ctx;
  const L = logoSystem(ctx), V = variants(ctx);
  const pk = r.pick(['dots', 'plus', 'terrazzo', 'arcs', 'waves', 'confetti']);
  const pid = 'cp' + ctx.seed;
  const defs = patternDef(pid, pk, [V.reversed.bg, C.paper, C.accent, C.secondary], 120, ctx.seed);
  const S = cardSides(ctx, L, V, pid);
  const W = 1600, H = 1000;
  const shadow = el('filter', { id: 'sh' }, el('feDropShadow', { dx: 0, dy: 18, stdDeviation: 22, floodOpacity: 0.28 }));
  const body = rect(0, 0, W, H, { fill: mix(C.secondary, '#e9e6df', 0.8) }) +
    g({ transform: 'translate(150 150) rotate(-6) scale(0.62)', filter: 'url(#sh)' }, S.front) +
    g({ transform: 'translate(760 420) rotate(4) scale(0.66)', filter: 'url(#sh)' }, S.back) +
    text(80, 930, `${L.name} · business card · 85 × 55 mm`, { fontFamily: fontStack(pair.body[0]), fontSize: 20, fill: mix(C.ink, '#ffffff', 0.35) });
  const fonts = fontsOf(pair);
  const sk = { fonts, seed: ctx.seed, sketch: spec.sketch };
  const svg = doc(W, H, body, { ...sk, defs: defs + shadow, title: `${L.name} business card` });
  return design({ kind: 'card', title: `${L.name} business card`, svg, spec, palette, pair, w: W, h: H,
    notes: `**Business card for ${L.name}.** Front: reversed logo over a quiet ${pk} pattern at 16% opacity. Back: name, role and contacts on paper, with a colour bar that echoes the palette.\nPrint: 85 × 55 mm (EU) or 3.5 × 2 in (US), add 3 mm bleed, keep text 4 mm from the edge. Placeholders are there for you to replace.`,
    assets: [{ name: 'card-front.svg', svg: doc(S.W, S.H, S.front, { ...sk, defs }) }, { name: 'card-back.svg', svg: doc(S.W, S.H, S.back, { ...sk, defs }) }] });
}

// ------------------------------------------------------------------ poster
export const POSTER_STYLES = ['swiss', 'bauhaus', 'minimal', 'brutalist', 'gradient', 'retro', 'editorial'];

const POSTER_PAIRS = { swiss: ['swiss', 'geo'], bauhaus: ['geo', 'art', 'swiss'], brutalist: ['brutal', 'poster'], retro: ['retro', 'warm', 'script'], editorial: ['editorial', 'fashion', 'luxe'], gradient: ['poster', 'future', 'geo', 'art'] };

export function generatePoster(spec) {
  const pre = context(spec);
  const style = POSTER_STYLES.includes(spec.style) ? spec.style : pre.r.pick(POSTER_STYLES);
  const forced = !spec.pair && !spec.typeStyle && POSTER_PAIRS[style] ? pre.r.pick(POSTER_PAIRS[style]) : null;
  const ctx = forced ? context({ ...spec, pair: forced }) : pre;
  const { C, pair, palette, r } = ctx;
  const W = 1000, H = 1414;
  const title = spec.name || r.pick(['Form & Void', 'New Wave', 'Design Week', 'Night Shift', 'Open Studio', 'Summer Sound']);
  const sub = spec.tagline || r.pick(['An exhibition of modern graphic design', 'Live music · art · talks', 'Ideas worth printing', 'A festival of light and colour']);
  const details = spec.details || [spec.date ? spec.date.replace(/^\p{Ll}/u, (c) => c.toUpperCase()) : `${r.pick(['12', '18', '24', '07'])} ${r.pick(['May', 'June', 'Sept', 'Oct'])} ${2026 + r.int(0, 1)}`, r.pick(['Gallery 67, Berlin', 'The Hangar, Lisbon', 'Studio North, Oslo', 'Warehouse 9, Tbilisi']), 'Free entry'];
  const head = fontStack(pair.head[0]), hw = pair.head[1], body = fontStack(pair.body[0]);
  const caps = !['cursive'].includes(FONTS[pair.head[0]]?.cat);
  const T = caps ? title.toUpperCase() : title;
  const P = [];
  let defs = '';
  const det = (x, y, col, anchor = 'start', size = 24) => details.map((d, i) => text(x, y + i * size * 1.45, d, { fontFamily: body, fontWeight: i ? pair.body[1] : 600, fontSize: size, fill: col, textAnchor: anchor })).join('');
  // best 1–3 line split of the title: whichever gives the largest type
  const bigLines = (str, x, y, maxW, maxSize, col, anchor = 'start', lh = 0.92, maxLines = 3) => {
    const words = str.split(/\s+/), n = words.length;
    const cands = [[str]];
    for (let i = 1; i < n; i++) cands.push([words.slice(0, i).join(' '), words.slice(i).join(' ')]);
    if (maxLines >= 3) for (let i = 1; i < n; i++) for (let j = i + 1; j < n; j++) cands.push([words.slice(0, i).join(' '), words.slice(i, j).join(' '), words.slice(j).join(' ')]);
    let best = null;
    for (const lines of cands) {
      const size = Math.min(maxSize, ...lines.map((l) => fitSize(l, pair.head[0], maxW, maxSize, { caps })));
      const score = size * (1 - 0.06 * (lines.length - 1));
      if (!best || score > best.score + 0.5) best = { lines, size, score };
    }
    const { lines, size } = best;
    return { svg: lines.map((l, i) => text(x, y + i * size * lh, l, { fontFamily: head, fontWeight: hw, fontSize: size, fill: col, textAnchor: anchor })).join(''), h: lines.length * size * lh, size, n: lines.length };
  };
  /** place a title block so that its last baseline sits at yEnd */
  const titleUp = (str, x, yEnd, maxW, maxSize, col, anchor, lh = 0.92) => { const t = bigLines(str, x, 0, maxW, maxSize, col, anchor, lh); return bigLines(str, x, yEnd - (t.n - 1) * t.size * lh, maxW, maxSize, col, anchor, lh); };
  if (style === 'swiss') {
    P.push(rect(0, 0, W, H, { fill: C.paper }));
    for (let i = 1; i < 6; i++) P.push(line((W / 6) * i, 0, (W / 6) * i, H, { stroke: C.ink, strokeOpacity: 0.06 }));
    P.push(circle(W * 0.66, H * 0.28, W * 0.3, { fill: C.primary }), circle(W * 0.66 + W * 0.2, H * 0.28 - W * 0.13, W * 0.1, { fill: C.accent }));
    P.push(rect(0, H * 0.28, W * 0.66, 18, { fill: C.ink }));
    const t = titleUp(T, 60, H - 330, W - 120, 170, C.ink);
    P.push(t.svg, text(62, H - 270, sub, { fontFamily: body, fontSize: 28, fill: C.ink }), det(62, H - 170, C.ink));
    P.push(text(W - 60, H - 60, '01', { fontFamily: head, fontWeight: hw, fontSize: 60, fill: C.primary, textAnchor: 'end' }));
  } else if (style === 'bauhaus') {
    P.push(rect(0, 0, W, H, { fill: C.paper }));
    const cols = [C.primary, C.secondary, C.accent, C.ink];
    const cell = W / 4;
    for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) {
      const k = r.int(0, 4), col = cols[(x + y + k) % 4], X = x * cell, Y = 120 + y * cell;
      P.push([rect(X, Y, cell, cell, { fill: col }), circle(X + cell / 2, Y + cell / 2, cell / 2, { fill: col }), path(`M${X} ${Y + cell}A${cell} ${cell} 0 0 1 ${X + cell} ${Y}L${X + cell} ${Y + cell}Z`, { fill: col }),
        poly([[X, Y + cell], [X + cell / 2, Y], [X + cell, Y + cell]], { fill: col }), path(`M${X} ${Y + cell / 2}A${cell / 2} ${cell / 2} 0 0 1 ${X + cell} ${Y + cell / 2}Z`, { fill: col })][k]);
    }
    const t = bigLines(T, 60, 120 + 3 * cell + 150, W - 120, 140, C.ink, 'start', 0.92, 2);
    P.push(t.svg, text(62, 120 + 3 * cell + 150 + t.h + 10, sub, { fontFamily: body, fontSize: 26, fill: C.ink }), det(W - 60, H - 150, C.ink, 'end'));
  } else if (style === 'minimal') {
    P.push(rect(0, 0, W, H, { fill: C.paper }));
    P.push(drawMark(r.pick(['spark', 'rings', 'orbit', 'petal', 'leaf']), ctx.seed, [C.primary, C.secondary, C.accent], { id: 'pm' }, W / 2, H * 0.4, 360));
    const s = fitSize(T, pair.head[0], W - 200, 72, { caps, tracking: 0.2 });
    P.push(text(W / 2, H * 0.68, T, { fontFamily: head, fontWeight: hw, fontSize: s, fill: C.ink, textAnchor: 'middle', letterSpacing: s * 0.2 }));
    P.push(text(W / 2, H * 0.68 + 56, sub, { fontFamily: body, fontSize: 24, fill: mix(C.ink, C.paper, 0.35), textAnchor: 'middle' }));
    P.push(line(W / 2 - 40, H * 0.8, W / 2 + 40, H * 0.8, { stroke: C.accent, strokeWidth: 4 }), det(W / 2, H * 0.86, C.ink, 'middle', 22));
  } else if (style === 'brutalist') {
    const bg = shade(C.accent, 0.15);
    P.push(rect(0, 0, W, H, { fill: bg }));
    const words = T.split(' ');
    const rows = (words.length > 4 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words.length > 1 ? words : [T]);
    let sizes = rows.map((wd) => Math.min(380, fitSize(wd, pair.head[0], W - 50, 380, { caps })));
    const avail = H - 470, tot = sizes.reduce((a, b) => a + b * 0.86, 0);
    if (tot > avail) sizes = sizes.map((v) => (v * avail) / tot);          // the stack must stay above the bar
    let y = 40;
    rows.forEach((wd, k) => { const s = sizes[k]; y += s * (k ? 0.95 : 0.86); P.push(text(22, y, wd, { fontFamily: head, fontWeight: hw, fontSize: s, fill: C.ink })); });
    P.push(rect(0, Math.min(y + 40, H - 380), W, 14, { fill: C.ink }));
    P.push(rect(40, H - 330, W - 80, 250, { fill: C.ink }));
    P.push(text(70, H - 270, sub.toUpperCase(), { fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fill: bg }), det(70, H - 210, bg, 'start', 26));
    P.push(text(W - 70, H - 110, '→', { fontFamily: body, fontSize: 90, fill: bg, textAnchor: 'end' }));
  } else if (style === 'gradient') {
    defs += el('filter', { id: 'bl', x: '-50%', y: '-50%', width: '200%', height: '200%' }, el('feGaussianBlur', { stdDeviation: 90 }));
    const base = ctx.dark ? C.ink : shade(C.primary, -0.25);
    P.push(rect(0, 0, W, H, { fill: base }));
    P.push(g({ filter: 'url(#bl)' }, circle(W * 0.2, H * 0.25, 360, { fill: C.primary }), circle(W * 0.85, H * 0.4, 330, { fill: C.accent }), circle(W * 0.4, H * 0.75, 380, { fill: C.secondary })));
    const fg = '#ffffff';
    const t = titleUp(T, 60, H * 0.62, W - 120, 170, fg);
    P.push(t.svg, text(62, H * 0.62 + 70, sub, { fontFamily: body, fontSize: 28, fill: fg, opacity: 0.85 }));
    P.push(rect(60, H - 220, W - 120, 1.5, { fill: fg, opacity: 0.5 }), det(62, H - 170, fg), text(W - 60, H - 170, '✦', { fontFamily: body, fontSize: 40, fill: fg, textAnchor: 'end' }));
  } else if (style === 'retro') {
    P.push(rect(0, 0, W, H, { fill: C.paper }));
    defs += el('clipPath', { id: 'rs' }, circle(W / 2, H * 0.52, W * 0.36));
    P.push(g({ clipPath: 'url(#rs)' }, ...[C.accent, C.primary, C.secondary, C.ink].map((c, i) => rect(0, H * 0.16 + i * W * 0.18, W, W * 0.18, { fill: c }))));
    for (let i = 0; i < 6; i++) P.push(rect(W * 0.1, H * 0.52 + 30 + i * 26, W * 0.8, 6 + i * 2.2, { fill: C.paper }));
    const s = Math.min(150, fitSize(T, pair.head[0], W - 120, 150, { caps }));
    P.push(text(W / 2, H * 0.14, T, { fontFamily: head, fontWeight: hw, fontSize: s, fill: C.ink, textAnchor: 'middle' }));
    P.push(text(W / 2, H * 0.14 + 50, sub, { fontFamily: body, fontSize: 24, fill: C.ink, textAnchor: 'middle' }), det(W / 2, H - 170, C.ink, 'middle'));
  } else {                                        // editorial
    P.push(rect(0, 0, W, H, { fill: C.paper }));
    P.push(rect(60, 200, W - 120, H * 0.5, { fill: C.primary }));
    P.push(drawMark(r.pick(['cut', 'bauhaus', 'petal', 'grid']), ctx.seed, [C.paper, C.accent, C.secondary], { letter: title[0].toUpperCase(), font: pair.head[0], weight: hw, id: 'pe' }, W / 2, 200 + H * 0.25, 420));
    P.push(text(60, 130, 'ISSUE Nº ' + r.int(1, 67), { fontFamily: body, fontWeight: 600, fontSize: 20, letterSpacing: 5, fill: C.ink }), text(W - 60, 130, details[0], { fontFamily: body, fontSize: 20, fill: C.ink, textAnchor: 'end' }));
    const t = bigLines(title, 60, 200 + H * 0.5 + 140, W - 120, 130, C.ink, 'start', 0.95, 2);
    P.push(t.svg);
    wrapTextLines(sub, pair.body[0], 26, W - 120).slice(0, 2).forEach((l, i) => P.push(text(60, 200 + H * 0.5 + 100 + t.h + 20 + i * 36, l, { fontFamily: body, fontSize: 26, fill: C.ink })));
  }
  const fonts = fontsOf(pair, [['JetBrains Mono', 400]]);
  const svg = doc(W, H, P.join(''), { defs, fonts, seed: ctx.seed, sketch: spec.sketch, title: `${title} poster` });
  const why = { swiss: 'International Typographic Style: a strict grid, big asymmetric type, one bold geometric shape.', bauhaus: 'Bauhaus: primary geometry — circle, square, triangle — as a modular composition.', minimal: 'Minimal: one mark, lots of air, small precise type. The whitespace is the design.', brutalist: 'Brutalist: oversized type pushed to the edges, raw blocks, no decoration.', gradient: 'Mesh-gradient glow with white type — contemporary and atmospheric.', retro: 'Seventies sunset: striped sun, horizon cuts, warm stacked type.', editorial: 'Editorial: magazine-cover hierarchy with a big image block and a serif headline.' }[style];
  return design({ kind: 'poster', title: `${title} — ${style} poster`, svg, spec: { ...spec, style }, palette, pair, w: W, h: H,
    notes: `**${style[0].toUpperCase() + style.slice(1)} poster** "${title}". ${why}\nFormat: A-series ratio (1 : √2) — prints at A3/A2 without cropping. Type: ${pair.head[0]} + ${pair.body[0]}.`, assets: [] });
}

// ------------------------------------------------------------------ brand identity board
export function generateIdentity(spec) {
  const ctx = context(spec);
  const { C, pair, palette, r } = ctx;
  const L = logoSystem(ctx), V = variants(ctx);
  const W = 1800, H = 1200;
  const head = fontStack(pair.head[0]), body = fontStack(pair.body[0]), hw = pair.head[1];
  const pk = spec.pattern && PATTERNS.includes(spec.pattern) ? spec.pattern : r.pick(['dots', 'arcs', 'terrazzo', 'waves', 'memphis', 'rings', 'plus', 'confetti', 'leaves']);
  const pid = 'ip' + ctx.seed;
  const defs = patternDef(pid, pk, [C.primary, C.paper, C.accent, C.secondary], 140, ctx.seed) + patternDef(pid + 'b', pk, [V.reversed.bg, C.paper, C.accent, C.secondary], 120, ctx.seed) +
    el('filter', { id: 'ish' }, el('feDropShadow', { dx: 0, dy: 10, stdDeviation: 14, floodOpacity: 0.22 }));
  const mainKind = L.style === 'emblem' ? 'emblem' : L.style === 'wordmark' ? 'word' : 'horizontal';
  const S = cardSides(ctx, L, V, pid + 'b');
  const label = (x, y, t) => text(x, y, t, { fontFamily: body, fontWeight: 600, fontSize: 13, letterSpacing: 3, fill: '#8b877f' });
  const P = [rect(0, 0, W, H, { fill: '#efece6' })];
  // header
  P.push(text(50, 70, L.name, { fontFamily: head, fontWeight: hw, fontSize: 44, fill: C.ink }), text(W - 50, 70, 'BRAND IDENTITY · v1', { fontFamily: body, fontWeight: 600, fontSize: 15, letterSpacing: 4, fill: '#8b877f', textAnchor: 'end' }));
  // logo main + reversed
  P.push(rect(50, 100, 820, 460, { rx: 18, fill: V.main.bg }), L.lockup(mainKind, 80, 130, 760, 400, V.main, 'ia'));
  P.push(rect(890, 100, 400, 220, { rx: 18, fill: V.reversed.bg }), L.lockup(L.style === 'emblem' ? 'mark' : mainKind === 'word' ? 'word' : 'horizontal', 910, 120, 360, 180, V.reversed, 'ib'));
  P.push(rect(890, 340, 400, 220, { rx: 18, fill: '#ffffff' }), L.lockup(L.style === 'wordmark' ? 'word' : 'mark', 910, 360, 360, 180, V.mono, 'ic'));
  // app icon + social avatar
  P.push(rect(1310, 100, 440, 460, { rx: 18, fill: `url(#${pid})` }));
  P.push(g({ filter: 'url(#ish)' }, rect(1370, 160, 150, 150, { rx: 36, fill: V.reversed.bg }), L.lockup('mark', 1390, 180, 110, 110, V.reversed, 'id')));
  P.push(g({ filter: 'url(#ish)' }, circle(1650, 235, 75, { fill: C.paper }), L.lockup('mark', 1600, 185, 100, 100, V.main, 'ie')));
  P.push(g({ filter: 'url(#ish)' }, rect(1370, 350, 320, 170, { rx: 14, fill: C.ink })));
  const soc = spec.tagline || r.pick(['Made with care.', 'Hello, world.', 'Small details, big difference.', 'Now open.']);
  const ss = Math.min(40, fitSize(soc, pair.head[0], 270, 40));
  P.push(text(1395, 420, soc, { fontFamily: head, fontWeight: hw, fontSize: ss, fill: C.paper }), rect(1395, 450, 60, 6, { rx: 3, fill: C.accent }), L.lockup('mark', 1640, 468, 36, 36, V.ink, 'if'));
  // palette
  P.push(label(50, 610, 'COLOUR'));
  palette.colors.forEach((c, i) => {
    const x = 50 + i * 166;
    P.push(rect(x, 625, 154, 190, { rx: 14, fill: c.hex, stroke: c.role === 'paper' ? '#d8d4cc' : 'none' }));
    P.push(text(x + 14, 790, c.hex.toUpperCase(), { fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fill: readableOn(c.hex) }), text(x + 14, 770, c.role, { fontFamily: body, fontSize: 13, fill: readableOn(c.hex), opacity: 0.75 }));
  });
  // typography
  P.push(label(890, 610, 'TYPOGRAPHY'));
  P.push(rect(890, 625, 400, 190, { rx: 14, fill: '#ffffff' }), text(915, 720, 'Aa', { fontFamily: head, fontWeight: hw, fontSize: Math.min(96, fitSize('Aa', pair.head[0], 130, 96)), fill: C.ink }),
    text(1060, 680, pair.head[0], { fontFamily: head, fontWeight: hw, fontSize: Math.min(28, fitSize(pair.head[0], pair.head[0], 210, 28)), fill: C.ink }), text(1060, 704, 'headlines', { fontFamily: body, fontSize: 13, fill: '#8b877f' }),
    text(1060, 748, pair.body[0], { fontFamily: body, fontWeight: pair.body[1], fontSize: 22, fill: C.ink }), text(1060, 770, 'text & UI', { fontFamily: body, fontSize: 13, fill: '#8b877f' }));
  // pattern swatch
  P.push(label(1310, 610, 'PATTERN'), rect(1310, 625, 440, 190, { rx: 14, fill: `url(#${pid}b)` }));
  // stationery
  P.push(label(50, 865, 'STATIONERY'));
  P.push(g({ transform: 'translate(50 880) scale(0.4)', filter: 'url(#ish)' }, S.front), g({ transform: 'translate(490 880) scale(0.4)', filter: 'url(#ish)' }, S.back));
  // tote bag mockup
  P.push(label(950, 865, 'MERCH'));
  P.push(g({ transform: 'translate(950 880)' },
    path('M70 60C70-10 170-10 170 60', { fill: 'none', stroke: shade(C.secondary, -0.1), strokeWidth: 10 }),
    rect(20, 60, 200, 230, { rx: 6, fill: C.paper, stroke: '#d8d4cc' }), L.lockup(L.style === 'wordmark' ? 'word' : 'stacked', 40, 110, 160, 150, V.main, 'ig')));
  P.push(g({ transform: 'translate(1200 880)' }, path('M40 20L90 0Q120 18 150 0L200 20L230 80L195 95V290H45V95L10 80Z', { fill: V.reversed.bg }), L.lockup('mark', 95, 90, 50, 50, V.reversed, 'ih')));
  P.push(g({ transform: 'translate(1480 900)' }, rect(0, 0, 260, 260, { rx: 16, fill: C.accent }), text(24, 60, 'SALE', { fontFamily: head, fontWeight: hw, fontSize: 40, fill: readableOn(C.accent) }),
    text(24, 100, 'on everything', { fontFamily: body, fontSize: 18, fill: readableOn(C.accent) }), L.lockup('mark', 170, 170, 70, 70, { ...V.main, mark: [readableOn(C.accent), C.paper, C.ink] }, 'ii')));
  P.push(text(1740, 1180, 'designfly', { fontFamily: "'Caveat', cursive", fontSize: 24, fill: '#aaa', textAnchor: 'end' }));
  const fonts = fontsOf(pair, [['JetBrains Mono', 400], ['Caveat', 400]]);
  const sk = { fonts, seed: ctx.seed, sketch: spec.sketch };
  const svg = doc(W, H, P.join(''), { ...sk, defs, title: `${L.name} brand identity` });
  const logo = generateLogoAssets(L, V, sk, mainKind);
  const guide = `${L.name} — brand guide\n\nLOGO\n${L.style} · ${L.why || 'wordmark'}\nClear space: the height of the mark's inner shape on every side. Minimum size: 24 px / 8 mm.\n\nCOLOUR\n${palette.colors.map((c) => `${c.role.padEnd(10)} ${c.hex}  ${describe(c.hex)}`).join('\n')}\nRatio 60 / 30 / 10 — paper & ink / primary / accent.\n\nTYPE\nHeadlines: ${pair.head[0]} ${pair.head[1]}\nText & UI: ${pair.body[0]} ${pair.body[1]}\n${pair.why}\n\nPATTERN\n${pk}, used at low opacity behind the reversed logo or as packaging wrap.\n`;
  return design({ kind: 'identity', title: `${L.name} brand identity`, svg, spec: { ...spec, pattern: pk }, palette, pair, w: W, h: H,
    notes: `**${L.name} — full identity.** ${L.style !== 'wordmark' ? 'The mark is ' + L.why + '.' : ''}\nColour: ${describe(C.primary)} leads, ${describe(C.accent)} as the accent. Type: ${pair.head[0]} + ${pair.body[0]}. Pattern: ${pk}.\nThe ZIP has every logo variant, the app icon, both card sides, the pattern tile and a short text brand guide.`,
    assets: [...logo, { name: 'card-front.svg', svg: doc(S.W, S.H, S.front, { ...sk, defs }) }, { name: 'card-back.svg', svg: doc(S.W, S.H, S.back, { ...sk, defs }) },
      { name: 'pattern-tile.svg', svg: doc(140, 140, `<rect width="140" height="140" fill="url(#${pid})"/>`, { defs }) }, { name: 'brand-guide.txt', text: guide, mime: 'text/plain' }] });
}

function generateLogoAssets(L, V, sk, mainKind) {
  const k = mainKind === 'emblem' ? 'emblem' : mainKind === 'word' ? 'word' : 'horizontal';
  return [
    { name: 'logo.svg', svg: doc(1200, 400, L.lockup(k, 30, 30, 1140, 340, V.main, 'x1'), sk) },
    { name: 'logo-reversed.svg', svg: doc(1200, 400, L.lockup(k, 30, 30, 1140, 340, V.reversed, 'x2'), { ...sk, bg: V.reversed.bg }) },
    { name: 'mark.svg', svg: doc(600, 600, L.lockup('mark', 40, 40, 520, 520, V.main, 'x3'), sk) },
    { name: 'app-icon.svg', svg: doc(512, 512, rect(0, 0, 512, 512, { rx: 116, fill: V.reversed.bg }) + L.lockup('mark', 70, 70, 372, 372, V.reversed, 'x4'), sk) },
  ];
}
