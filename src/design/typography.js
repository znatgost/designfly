// Typography: font pairing specimen with a modular type scale and CSS.
import { rect, text, line, doc } from './svg.js';
import { context, design } from './common.js';
import { fontStack, fontsOf, wrapTextLines, textWidth, fitSize } from './type.js';

const SCALES = { 'minor third': 1.2, 'major third': 1.25, 'perfect fourth': 1.333, 'golden ratio': 1.618 };
const HEADLINES = ['Good design is as little design as possible', 'Form follows function', 'Make it simple, but significant', 'Less, but better', 'Design is intelligence made visible', 'The details are not the details'];

export function generateTypography(spec) {
  const ctx = context(spec);
  const { pair, C, r } = ctx;
  const W = 1600, H = 1000;
  const [hf, hw] = pair.head, [bf, bw] = pair.body;
  const head = fontStack(hf), body = fontStack(bf);
  const scaleName = spec.scale && SCALES[spec.scale] ? spec.scale : r.pick(Object.keys(SCALES).slice(0, 3));
  const ratio = SCALES[scaleName];
  const headline = spec.name ? (spec.tagline ? `${spec.name}: ${spec.tagline}` : spec.name) : r.pick(HEADLINES);
  const bg = ctx.dark ? C.ink : C.paper, fg = ctx.dark ? C.paper : C.ink, sub = ctx.dark ? 'rgba(255,255,255,.6)' : 'rgba(0,0,0,.55)';
  const P = [rect(0, 0, W, H, { fill: bg })];
  P.push(rect(0, 0, 640, H, { fill: C.primary }));
  const onP = ctx.readableOn(C.primary, '#111', '#fff');
  P.push(text(60, 420, 'Aa', { fontFamily: head, fontWeight: hw, fontSize: Math.min(330, fitSize('Aa', hf, 540, 330, { weight: hw })), fill: onP }));
  P.push(text(64, 520, hf, { fontFamily: head, fontWeight: hw, fontSize: Math.min(44, fitSize(hf, hf, 520, 44, { weight: hw })), fill: onP }));
  P.push(text(66, 552, `display · weight ${hw} · ${pair.id} pairing`, { fontFamily: body, fontSize: 16, fill: onP, opacity: 0.75 }));
  ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', 'abcdefghijklm', 'nopqrstuvwxyz', '0123456789 &@!?'].forEach((s, i) =>
    P.push(text(64, 640 + i * 52, s, { fontFamily: head, fontWeight: hw, fontSize: Math.min(38, fitSize(s, hf, 500, 38, { weight: hw, tracking: 0.05 })), fill: onP, opacity: 0.92, letterSpacing: 2 })));
  // scale
  const steps = [['H1', 5], ['H2', 4], ['H3', 3], ['H4', 2], ['Body', 0], ['Small', -1]];
  let y = 100; const base = 19;
  P.push(text(700, 70, `Type scale · ${scaleName} (×${ratio})`, { fontFamily: body, fontWeight: 600, fontSize: 15, fill: sub, letterSpacing: 1.5 }));
  for (const [lab, k] of steps) {
    const sz = Math.min(base * ratio ** k, 86);
    const fam = k > 0 ? head : body, wt = k > 0 ? hw : bw;
    const sample = k > 0 ? headline : 'The quick brown fly jumps over the lazy grid.';
    let str = sample;
    while (textWidth(str, k > 0 ? hf : bf, sz) > 760 && str.length > 8) str = str.slice(0, str.lastIndexOf(' ', str.length - 2)) + '…';
    y += sz * 1.15 + 18;
    P.push(text(700, y, lab, { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fill: sub }), text(700, y + 16, Math.round(sz) + 'px', { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fill: sub }));
    P.push(text(790, y, str, { fontFamily: fam, fontWeight: wt, fontSize: sz, fill: fg }));
  }
  P.push(line(700, y + 36, W - 60, y + 36, { stroke: fg, strokeOpacity: 0.15 }));
  // paragraph
  const para = `${bf} carries the reading. Set body text at 16–20 px with a line height around 1.5 and 45–75 characters per line; let ${hf} do the talking at the top. ${pair.why}`;
  const L = wrapTextLines(para, bf, 17, 820);
  L.forEach((ln, i) => P.push(text(700, y + 80 + i * 27, ln, { fontFamily: body, fontWeight: bw, fontSize: 17, fill: fg })));
  // "in use" card
  const cy = y + 100 + L.length * 27, ch = H - 70 - cy;
  if (ch > 160) {
    P.push(rect(700, cy, W - 760, ch, { rx: 22, fill: ctx.dark ? 'rgba(255,255,255,.06)' : '#ffffff' }));
    P.push(rect(740, cy + 40, 56, 6, { fill: C.accent, rx: 3 }));
    P.push(text(740, cy + 76, 'IN USE', { fontFamily: body, fontWeight: 600, fontSize: 13, letterSpacing: 3, fill: sub }));
    const hs = Math.min(64, (ch - 150) / 2.3);
    wrapTextLines(headline, hf, hs, W - 860).slice(0, 2).forEach((ln, i) => P.push(text(740, cy + 90 + hs * 1.05 * (i + 1), ln, { fontFamily: head, fontWeight: hw, fontSize: hs, fill: fg })));
    const by = cy + 110 + hs * 2.2;
    wrapTextLines('Typography is the voice of a brand before anyone reads a word. Contrast in size and weight creates hierarchy; consistency creates trust.', bf, 17, W - 860).slice(0, Math.max(1, Math.floor((cy + ch - by - 20) / 26))).forEach((ln, i) =>
      P.push(text(740, by + i * 26, ln, { fontFamily: body, fontWeight: bw, fontSize: 17, fill: fg, opacity: 0.8 })));
  }
  P.push(text(W - 60, H - 40, 'designfly', { fontFamily: "'Caveat', cursive", fontSize: 26, fill: sub, textAnchor: 'end' }));
  const fonts = fontsOf(pair, [['JetBrains Mono', 400], ['Caveat', 400]]);
  const svg = doc(W, H, P.join(''), { fonts, seed: ctx.seed, sketch: spec.sketch, title: `${hf} + ${bf}` });
  const q = (f, w) => `family=${f.replace(/ /g, '+')}:wght@${w}`;
  const css = `/* ${hf} + ${bf} — ${scaleName} scale */\n@import url('https://fonts.googleapis.com/css2?${q(hf, hw)}&${q(bf, bw + ';600')}&display=swap');\n\n:root {\n  --font-display: ${head};\n  --font-text: ${body};\n` +
    steps.map(([lab, k]) => `  --size-${lab.toLowerCase()}: ${(base * ratio ** k / 16).toFixed(3)}rem;`).join('\n') + '\n}\nh1, h2, h3, h4 { font-family: var(--font-display); font-weight: ' + hw + '; line-height: 1.1; }\nbody { font-family: var(--font-text); font-size: var(--size-body); line-height: 1.55; }\n' +
    steps.slice(0, 4).map(([lab]) => `${lab.toLowerCase()} { font-size: var(--size-${lab.toLowerCase()}); }`).join('\n') + '\n';
  const notes = `**${hf} + ${bf}.** ${pair.why}\nScale: ${scaleName} (×${ratio}) from an 18 px base. Download the CSS for the Google Fonts import and the size tokens.`;
  return design({ kind: 'typography', title: `${hf} + ${bf}`, svg, spec, notes, pair, palette: ctx.palette, w: W, h: H, assets: [{ name: 'typography.css', text: css, mime: 'text/css' }] });
}
