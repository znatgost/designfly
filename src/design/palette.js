// Colour palette sheet: swatches with codes, tint/shade ramps, WCAG contrast checks, UI preview.
import { rect, text, g, circle, doc } from './svg.js';
import { context, design } from './common.js';
import { fontStack, fontsOf, fitSize } from './type.js';
import { hexToRgb, rgbToHsl, hexToOklch, contrast, wcag, describe, shade, readableOn, mix } from './color.js';

export function ramp(hex, n = 9) {
  const [L] = hexToOklch(hex);
  return Array.from({ length: n }, (_, i) => { const t = i / (n - 1); return shade(hex, (0.96 - t * 0.8) - L); });
}

export function generatePalette(spec) {
  const ctx = context(spec);
  const { palette, pair, C } = ctx;
  const W = 1600, H = 1000;
  const mono = "'JetBrains Mono', monospace", body = fontStack(pair.body[0]), head = fontStack(pair.head[0]);
  const widths = [0.3, 0.22, 0.16, 0.16, 0.16];
  let x = 40; const sw = W - 80;
  const parts = [rect(0, 0, W, H, { fill: '#f4f2ee' })];
  parts.push(text(40, 64, spec.name ? `${spec.name} — colour palette` : 'Colour palette', { fontFamily: head, fontWeight: pair.head[1], fontSize: 34, fill: '#1b1b1b' }));
  parts.push(text(W - 40, 64, `${palette.harmony} harmony${ctx.moods.length ? ' · ' + ctx.moods.join(' / ') : ''}`, { fontFamily: body, fontSize: 16, fill: '#777', textAnchor: 'end' }));
  palette.colors.forEach((c, i) => {
    const w = sw * widths[i] - 12, fg = readableOn(c.hex, '#151515', '#ffffff');
    const [r, gg, b] = hexToRgb(c.hex), [h, s, l] = rgbToHsl([r, gg, b]), [L, Ch, Hh] = hexToOklch(c.hex);
    parts.push(rect(x, 96, w, 440, { rx: 20, fill: c.hex, stroke: c.role === 'paper' ? '#dcd8d0' : 'none' }));
    parts.push(text(x + 22, 136, c.role.toUpperCase(), { fontFamily: body, fontWeight: 600, fontSize: 13, letterSpacing: 2.5, fill: fg, opacity: 0.75 }));
    const nm = describe(c.hex);
    parts.push(text(x + 22, 452, nm, { fontFamily: head, fontWeight: pair.head[1], fontSize: Math.min(i === 0 ? 30 : 22, fitSize(nm, pair.head[0], w - 40, 30, { weight: pair.head[1] })), fill: fg }));
    [c.hex.toUpperCase(), `RGB ${r} ${gg} ${b}`, `HSL ${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`, `OKLCH ${(L * 100).toFixed(0)}% ${Ch.toFixed(3)} ${Math.round(Hh)}`]
      .forEach((t, k) => parts.push(text(x + 22, 484 + k * 0 + (k ? 18 * k : 0) - 10, t, { fontFamily: mono, fontSize: k ? 12 : 15, fill: fg, opacity: k ? 0.8 : 1 })));
    x += w + 12;
  });
  // ramps
  ['primary', 'secondary', 'accent'].forEach((role, j) => {
    const rr = ramp(C[role]);
    rr.forEach((hx, i) => parts.push(rect(40 + i * 82, 580 + j * 72, 76, 56, { rx: 8, fill: hx }), text(46 + i * 82, 628 + j * 72, (i + 1) * 100, { fontFamily: mono, fontSize: 10, fill: readableOn(hx), opacity: 0.7 })));
    parts.push(text(40, 574 + j * 72, role, { fontFamily: body, fontSize: 12, fill: '#888' }));
  });
  // contrast checks
  const pairs = [['ink', 'paper'], ['paper', 'primary'], ['ink', 'secondary'], ['paper', 'ink'], ['primary', 'paper'], ['ink', 'accent']];
  pairs.forEach(([f, b], i) => {
    const cx = 800 + (i % 3) * 262, cy = 572 + Math.floor(i / 3) * 110, ratio = contrast(C[f], C[b]), grade = wcag(ratio);
    parts.push(rect(cx, cy, 248, 96, { rx: 14, fill: C[b], stroke: '#dcd8d0' }));
    parts.push(text(cx + 18, cy + 44, 'Aa Text', { fontFamily: head, fontWeight: pair.head[1], fontSize: Math.min(28, fitSize('Aa Text', pair.head[0], 120, 28, { weight: pair.head[1] })), fill: C[f] }));
    parts.push(text(cx + 18, cy + 76, `${f} on ${b}`, { fontFamily: body, fontSize: 12, fill: C[f], opacity: 0.8 }));
    const badge = grade === 'fail' ? '#d6453d' : grade === 'AA large' ? '#d09a1e' : '#2f9e5b';
    parts.push(rect(cx + 150, cy + 16, 84, 26, { rx: 13, fill: badge }), text(cx + 192, cy + 34, grade, { fontFamily: body, fontWeight: 600, fontSize: 12, fill: '#fff', textAnchor: 'middle' }));
    parts.push(text(cx + 230, cy + 78, ratio.toFixed(2) + ':1', { fontFamily: mono, fontSize: 13, fill: C[f], textAnchor: 'end' }));
  });
  // mini UI preview
  const uy = 820;
  parts.push(rect(40, uy, 720, 140, { rx: 18, fill: C.paper, stroke: '#dcd8d0' }));
  parts.push(rect(64, uy + 30, 170, 48, { rx: 24, fill: C.primary }), text(149, uy + 60, 'Get started', { fontFamily: body, fontWeight: 600, fontSize: 16, fill: readableOn(C.primary), textAnchor: 'middle' }));
  parts.push(rect(250, uy + 30, 150, 48, { rx: 24, fill: 'none', stroke: C.ink, strokeWidth: 2 }), text(325, uy + 60, 'Learn more', { fontFamily: body, fontWeight: 600, fontSize: 16, fill: C.ink, textAnchor: 'middle' }));
  parts.push(rect(420, uy + 38, 64, 32, { rx: 16, fill: C.accent }), circle(468, uy + 54, 12, { fill: '#fff' }));
  parts.push(rect(504, uy + 34, 110, 40, { rx: 8, fill: mix(C.secondary, '#ffffff', 0.75) }), text(559, uy + 59, 'Badge', { fontFamily: body, fontWeight: 600, fontSize: 14, fill: shade(C.secondary, -0.25), textAnchor: 'middle' }));
  parts.push(text(64, uy + 112, 'Use it 60 · 30 · 10: paper and ink carry most of the page, primary leads, the accent is a spark.', { fontFamily: body, fontSize: 14, fill: C.ink, opacity: 0.8 }));
  parts.push(text(W - 40, 960, 'designfly', { fontFamily: "'Caveat', cursive", fontSize: 26, fill: '#aaa', textAnchor: 'end' }));

  const fonts = fontsOf(pair, [['JetBrains Mono', 400], ['Caveat', 400]]);
  const svg = doc(W, H, parts.join(''), { fonts, seed: ctx.seed, sketch: spec.sketch, title: 'Colour palette' });
  const css = ':root {\n' + palette.colors.map((c) => `  --color-${c.role}: ${c.hex};`).join('\n') + '\n' +
    ['primary', 'secondary', 'accent'].map((role) => ramp(C[role]).map((h, i) => `  --${role}-${(i + 1) * 100}: ${h};`).join('\n')).join('\n') + '\n}\n';
  const json = JSON.stringify({ harmony: palette.harmony, colors: palette.colors.map((c) => ({ role: c.role, hex: c.hex, name: describe(c.hex) })) }, null, 2);
  const strip = doc(1000, 200, palette.colors.map((c, i) => rect(i * 200, 0, 200, 200, { fill: c.hex })).join(''), {});
  const notes = [
    `**${palette.harmony[0].toUpperCase() + palette.harmony.slice(1)} palette**${ctx.moods.length ? ` for a ${ctx.moods.join(' + ')} mood` : ''}.`,
    palette.colors.map((c) => `${c.role}: ${describe(c.hex)} ${c.hex}`).join(' · '),
    `Body text: ink on paper = ${contrast(C.ink, C.paper).toFixed(1)}:1 (${wcag(contrast(C.ink, C.paper))}). Buttons: ${contrast(readableOn(C.primary), C.primary).toFixed(1)}:1 on primary.`,
    'Tip: keep the accent under ~10% of any layout, or it stops being an accent.',
  ].join('\n');
  return design({ kind: 'palette', title: spec.name ? `${spec.name} palette` : `${describe(C.primary)} palette`, svg, spec, notes, palette, pair, w: W, h: H,
    assets: [{ name: 'palette.css', text: css, mime: 'text/css' }, { name: 'palette.json', text: json, mime: 'application/json' }, { name: 'swatches.svg', svg: strip }] });
}
