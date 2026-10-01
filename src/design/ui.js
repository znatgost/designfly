// UI/UX: app screens, landing pages and dashboards (hi-fi mockups or grey wireframes).
import { el, g, rect, circle, line, path, text, doc, poly } from './svg.js';
import { context, design } from './common.js';
import { logoSystem, variants } from './logo.js';
import { fontStack, fontsOf, fitSize, wrapTextLines } from './type.js';
import { mix, shade, readableOn, describe } from './color.js';
import { drawMark } from './marks.js';

export const UI_KINDS = ['mobile', 'landing', 'dashboard'];

export function generateUI(spec) {
  const ctx = context(spec);
  const { C, pair, palette, r } = ctx;
  const kind = UI_KINDS.includes(spec.screen) ? spec.screen : r.pick(UI_KINDS);
  const wf = spec.style === 'wireframe';
  const L = logoSystem(ctx), V = variants(ctx);
  const name = L.name;
  const head = fontStack(pair.head[0]), body = fontStack(pair.body[0]), hw = pair.head[1];
  const K = wf ? { primary: '#9a9a9a', accent: '#b5b5b5', secondary: '#cfcfcf', ink: '#333', paper: '#ffffff', soft: '#eeeeee', line: '#d0d0d0' }
    : { primary: C.primary, accent: C.accent, secondary: C.secondary, ink: C.ink, paper: '#ffffff', soft: mix(C.paper, C.secondary, 0.12), line: mix(C.ink, '#ffffff', 0.86) };
  const onP = readableOn(K.primary);
  let imgN = 0;
  const img = (x, y, w, h, i, rx = 12, n = imgN++) => wf
    ? rect(x, y, w, h, { fill: '#e2e2e2', rx }) + line(x, y, x + w, y + h, { stroke: '#c4c4c4' }) + line(x + w, y, x, y + h, { stroke: '#c4c4c4' })
    : g({}, el('clipPath', { id: `ui${ctx.seed}_${n}` }, rect(x, y, w, h, { rx })), g({ clipPath: `url(#ui${ctx.seed}_${n})` },
      rect(x, y, w, h, { fill: [K.primary, K.secondary, K.accent][i % 3] }), circle(x + w * 0.72, y + h * 0.3, Math.min(w, h) * 0.18, { fill: mix(K.accent, '#ffffff', 0.5) }),
      path(`M${x} ${y + h}L${x + w * 0.35} ${y + h * 0.5}L${x + w * 0.6} ${y + h * 0.78}L${x + w * 0.78} ${y + h * 0.6}L${x + w} ${y + h}Z`, { fill: shade([K.primary, K.secondary, K.accent][i % 3], -0.15) })));
  const T = (x, y, s, sz, fill = K.ink, weight = pair.body[1], fam = body, extra = {}) => text(x, y, s, { fontFamily: fam, fontWeight: weight, fontSize: sz, fill, ...extra });
  const btn = (x, y, w, h, label, filled = true) => rect(x, y, w, h, { rx: h / 2, fill: filled ? K.primary : 'none', stroke: filled ? 'none' : K.ink, strokeWidth: 1.5 }) + T(x + w / 2, y + h / 2 + h * 0.17, label, h * 0.36, filled ? onP : K.ink, 600, body, { textAnchor: 'middle' });
  const bar = (x, y, w, h = 10, c = K.soft) => rect(x, y, w, h, { rx: h / 2, fill: c });
  const P = [];
  const W = 1600, H = 1000;
  P.push(rect(0, 0, W, H, { fill: wf ? '#f4f4f4' : mix(C.secondary, '#eeeae3', 0.82) }));
  const markAt = (x, y, s, id) => L.lockup('mark', x, y, s, s, wf ? V.mono : V.main, id);
  if (kind === 'mobile') {
    const phone = (x, y, content, i) => g({}, rect(x - 10, y - 10, 340, 700, { rx: 52, fill: '#111' }), rect(x, y, 320, 680, { rx: 44, fill: K.paper }), el('clipPath', { id: `ph${ctx.seed}${i}` }, rect(x, y, 320, 680, { rx: 44 })),
      g({ clipPath: `url(#ph${ctx.seed}${i})` }, content(x, y)), rect(x + 120, y + 10, 80, 22, { rx: 11, fill: '#111' }), T(x + 32, y + 28, '9:41', 13, K.ink, 600));
    // 1 onboarding
    P.push(phone(130, 150, (x, y) => [rect(x, y, 320, 380, { fill: wf ? '#e8e8e8' : K.primary }), wf ? img(x + 60, y + 90, 200, 200, 0, 100) : markAt(x + 70, y + 90, 180, 'm1'),
      T(x + 32, y + 450, `Welcome to ${name}`, Math.min(28, fitSize(`Welcome to ${name}`, pair.head[0], 260, 28)), K.ink, hw, head), T(x + 32, y + 482, spec.tagline || 'Everything you need, one tap away.', 14, mix(K.ink, '#fff', 0.35)),
      ...[0, 1, 2].map((k) => rect(x + 32 + k * 18, y + 520, k ? 8 : 24, 8, { rx: 4, fill: k ? K.line : K.primary })), btn(x + 32, y + 580, 256, 52, 'Get started')].join(''), 0));
    // 2 home
    P.push(phone(640, 150, (x, y) => [rect(x, y, 320, 680, { fill: K.soft }), T(x + 24, y + 86, 'Good morning', 13, mix(K.ink, '#fff', 0.4)), T(x + 24, y + 116, 'Hi, Alex 👋'.replace(' 👋', ''), 26, K.ink, hw, head), circle(x + 280, y + 102, 20, { fill: K.secondary }),
      rect(x + 24, y + 140, 272, 44, { rx: 22, fill: '#fff', stroke: K.line }), circle(x + 48, y + 162, 7, { fill: 'none', stroke: mix(K.ink, '#fff', 0.5), strokeWidth: 2 }), T(x + 66, y + 167, 'Search', 14, mix(K.ink, '#fff', 0.5)),
      rect(x + 24, y + 204, 272, 150, { rx: 22, fill: K.primary }), T(x + 44, y + 244, 'Today', 14, onP, 600), T(x + 44, y + 280, spec.tagline ? spec.tagline.slice(0, 22) : 'Your daily pick', 22, onP, hw, head), btn(x + 44, y + 300, 110, 36, 'Open', false).replace(/stroke="[^"]*"/, `stroke="${onP}"`).replace(new RegExp(`fill="${K.ink}"`), `fill="${onP}"`),
      ...[0, 1].map((k) => rect(x + 24 + k * 142, y + 374, 130, 170, { rx: 18, fill: '#fff' }) + img(x + 34 + k * 142, y + 384, 110, 90, k + 1, 12) + T(x + 36 + k * 142, y + 500, ['Popular', 'New'][k], 15, K.ink, 600) + bar(x + 36 + k * 142, y + 514, 80, 8)),
      rect(x, y + 600, 320, 80, { fill: '#fff' }), ...[0, 1, 2, 3].map((k) => circle(x + 50 + k * 73, y + 632, k === 0 ? 14 : 11, { fill: k === 0 ? K.primary : K.line }))].join(''), 1));
    // 3 detail
    P.push(phone(1150, 150, (x, y) => [img(x, y, 320, 330, 2, 0), rect(x + 20, y + 50, 40, 40, { rx: 20, fill: 'rgba(255,255,255,.85)' }), path(`M${x + 44} ${y + 62}l-8 8 8 8`, { fill: 'none', stroke: K.ink, strokeWidth: 2.4 }),
      rect(x, y + 300, 320, 380, { rx: 30, fill: '#fff' }), T(x + 28, y + 350, 'Details', 26, K.ink, hw, head), ...[0, 1, 2, 3, 4].map((k) => path(`M${x + 30 + k * 18} ${y + 370}l4 8h9l-7 5 3 9-9-6-9 6 3-9-7-5h9z`, { fill: k < 4 ? K.accent : K.line })),
      ...wrapTextLines('A short description that explains the value in one or two lines of friendly copy.', pair.body[0], 14, 264).slice(0, 3).map((l, k) => T(x + 28, y + 420 + k * 22, l, 14, mix(K.ink, '#fff', 0.3))),
      rect(x + 28, y + 500, 80, 34, { rx: 17, fill: K.soft }), rect(x + 118, y + 500, 80, 34, { rx: 17, fill: mix(K.primary, '#fff', 0.8) }), T(x + 158, y + 522, 'M', 14, K.primary, 600, body, { textAnchor: 'middle' }), T(x + 68, y + 522, 'S', 14, K.ink, 600, body, { textAnchor: 'middle' }),
      T(x + 28, y + 600, '$24', 26, K.ink, hw, head), btn(x + 140, y + 572, 152, 52, 'Add to cart')].join(''), 2));
    P.push(T(130, 100, `${name} — mobile app`, 34, C.ink, hw, head), T(1470, 100, wf ? 'WIREFRAME · LO-FI' : 'UI · HI-FI', 14, '#888', 600, body, { textAnchor: 'end', letterSpacing: 3 }));
    ['Onboarding', 'Home', 'Detail'].forEach((t, i) => P.push(T(290 + i * 510, 900, t, 18, '#777', 600, body, { textAnchor: 'middle' })));
  } else if (kind === 'landing') {
    const x = 120, y = 90, w = 1360, h = 840;
    P.push(g({}, rect(x, y, w, h, { rx: 16, fill: K.paper, stroke: '#ccc' }), rect(x, y, w, 40, { rx: 16, fill: '#e8e6e2' }), rect(x, y + 24, w, 16, { fill: '#e8e6e2' }), ...[0, 1, 2].map((k) => circle(x + 24 + k * 20, y + 20, 6, { fill: ['#ff5f57', '#febc2e', '#28c840'][k] })), rect(x + 460, y + 10, 440, 20, { rx: 10, fill: '#fff' }), T(x + 680, y + 25, `${name.toLowerCase().replace(/\s+/g, '')}.com`, 12, '#888', 400, body, { textAnchor: 'middle' })));
    const nx = x + 60, ny = y + 80;
    P.push(markAt(nx - 6, ny - 26, 40, 'l1'), T(nx + 42, ny + 2, name, 22, K.ink, hw, head), ...['Product', 'Pricing', 'About', 'Blog'].map((t, k) => T(x + 760 + k * 110, ny + 2, t, 15, mix(K.ink, '#fff', 0.3))), btn(x + w - 190, ny - 22, 130, 42, 'Sign up'));
    const tag = spec.tagline || 'Design that works as hard as you do.';
    const hl = wrapTextLines(tag, pair.head[0], 62, 600).slice(0, 3);
    hl.forEach((l, k) => P.push(T(nx, y + 230 + k * 70, l, 62, K.ink, hw, head)));
    P.push(T(nx, y + 250 + hl.length * 70, 'A clear sentence about the product and who it is for.', 18, mix(K.ink, '#fff', 0.35)), btn(nx, y + 290 + hl.length * 70, 190, 56, 'Get started'), btn(nx + 210, y + 290 + hl.length * 70, 170, 56, 'Watch demo', false));
    P.push(img(x + 760, y + 150, 540, 380, 0, 24));
    if (!wf) P.push(g({ transform: `translate(${x + 700} ${y + 440})` }, rect(0, 0, 220, 120, { rx: 18, fill: '#fff', stroke: K.line }), T(20, 40, 'Growth', 14, mix(K.ink, '#fff', 0.4)), T(20, 80, '+67%', 34, K.ink, hw, head), path('M130 90l20-20 18 10 30-40', { fill: 'none', stroke: K.accent, strokeWidth: 4, strokeLinecap: 'round' })));
    ['Fast', 'Simple', 'Secure'].forEach((t, k) => { const fx = nx + k * 420, fy = y + 610; P.push(rect(fx, fy, 380, 170, { rx: 20, fill: K.soft }), rect(fx + 24, fy + 24, 48, 48, { rx: 14, fill: [K.primary, K.secondary, K.accent][k] }), T(fx + 24, fy + 110, t, 22, K.ink, hw, head), bar(fx + 24, fy + 130, 280, 9, K.line), bar(fx + 24, fy + 148, 200, 9, K.line)); });
  } else {
    const x = 80, y = 60, w = 1440, h = 880;
    P.push(rect(x, y, w, h, { rx: 20, fill: K.paper, stroke: '#ddd' }), rect(x, y, 240, h, { rx: 20, fill: wf ? '#e9e9e9' : shade(C.ink, 0.04) }), rect(x + 220, y, 20, h, { fill: wf ? '#e9e9e9' : shade(C.ink, 0.04) }));
    const side = wf ? '#777' : mix(C.paper, C.ink, 0.35);
    P.push(markAt(x + 26, y + 30, 40, 'd1'), T(x + 76, y + 58, name.length > 12 ? name.slice(0, 11) + '…' : name, 20, wf ? '#333' : C.paper, hw, head));
    ['Overview', 'Analytics', 'Customers', 'Orders', 'Settings'].forEach((t, k) => P.push(k === 0 ? rect(x + 16, y + 110 + k * 52, 208, 42, { rx: 10, fill: wf ? '#d6d6d6' : mix(C.primary, C.ink, 0.35) }) : '', circle(x + 42, y + 131 + k * 52, 7, { fill: k === 0 ? (wf ? '#555' : C.accent) : side }), T(x + 62, y + 136 + k * 52, t, 15, k === 0 ? (wf ? '#333' : C.paper) : side, 600)));
    const cx0 = x + 280;
    P.push(T(cx0, y + 70, 'Overview', 30, K.ink, hw, head), rect(x + w - 330, y + 40, 220, 40, { rx: 20, fill: K.soft }), circle(x + w - 60, y + 60, 20, { fill: K.secondary }));
    const kpis = [['Revenue', '$67.4k', '+12%'], ['Users', '8,210', '+4%'], ['Orders', '1,067', '+9%'], ['Churn', '1.8%', '−0.3']];
    kpis.forEach(([a, b, c2], k) => { const kx = cx0 + k * 285; P.push(rect(kx, y + 110, 265, 130, { rx: 16, fill: K.soft }), T(kx + 22, y + 146, a, 14, mix(K.ink, '#fff', 0.4)), T(kx + 22, y + 196, b, 34, K.ink, hw, head), T(kx + 243, y + 146, c2, 14, wf ? '#666' : shade(C.accent, -0.1), 600, body, { textAnchor: 'end' })); });
    // chart
    P.push(rect(cx0, y + 270, 760, 400, { rx: 16, fill: K.soft }), T(cx0 + 24, y + 310, 'Revenue, last 12 months', 16, K.ink, 600));
    const vals = Array.from({ length: 12 }, (_, i) => 0.35 + 0.5 * (i / 11) + r.float(-0.12, 0.12));
    for (let i = 0; i < 5; i++) P.push(line(cx0 + 40, y + 360 + i * 70, cx0 + 730, y + 360 + i * 70, { stroke: K.line }));
    vals.forEach((v, i) => P.push(rect(cx0 + 56 + i * 56, y + 640 - v * 260, 30, v * 260, { rx: 6, fill: i === 11 ? K.accent : K.primary, opacity: i === 11 ? 1 : 0.85 })));
    // donut
    const dcx = cx0 + 1010, dcy = y + 470, R = 110, parts = [0.46, 0.32, 0.22];
    let a0 = -Math.PI / 2;
    P.push(rect(cx0 + 790, y + 270, 350, 400, { rx: 16, fill: K.soft }), T(cx0 + 814, y + 310, 'Channels', 16, K.ink, 600));
    parts.forEach((p, k) => { const a1 = a0 + p * Math.PI * 2; const lg = p > 0.5 ? 1 : 0; P.push(path(`M${dcx + R * Math.cos(a0)} ${dcy + R * Math.sin(a0)}A${R} ${R} 0 ${lg} 1 ${dcx + R * Math.cos(a1)} ${dcy + R * Math.sin(a1)}`, { fill: 'none', stroke: [K.primary, K.secondary, K.accent][k], strokeWidth: 34 })); a0 = a1 + 0.02; });
    P.push(T(dcx, dcy + 10, '67%', 30, K.ink, hw, head, { textAnchor: 'middle' }));
    ['Organic', 'Paid', 'Social'].forEach((t, k) => P.push(rect(cx0 + 820 + k * 105, y + 620, 12, 12, { rx: 3, fill: [K.primary, K.secondary, K.accent][k] }), T(cx0 + 838 + k * 105, y + 631, t, 13, mix(K.ink, '#fff', 0.35))));
    // table
    P.push(rect(cx0, y + 700, 1140, 150, { rx: 16, fill: K.soft }));
    for (let i = 0; i < 3; i++) P.push(circle(cx0 + 40, y + 740 + i * 38, 12, { fill: [K.primary, K.secondary, K.accent][i] }), bar(cx0 + 66, y + 735 + i * 38, 200), bar(cx0 + 420, y + 735 + i * 38, 120), bar(cx0 + 700, y + 735 + i * 38, 90), rect(cx0 + 1000, y + 728 + i * 38, 90, 24, { rx: 12, fill: mix(K.accent, '#fff', 0.7) }));
  }
  const fonts = fontsOf(pair);
  const svg = doc(W, H, P.join(''), { fonts, seed: ctx.seed, sketch: spec.sketch, title: `${name} ${kind}` });
  const tag = wf ? 'wireframe' : 'hi-fi mockup';
  return design({ kind: 'ui', title: `${name} — ${kind} ${tag}`, svg, spec: { ...spec, screen: kind }, palette, pair, w: W, h: H,
    notes: `**${name} — ${kind} ${tag}.** ${{ mobile: 'Three key screens: onboarding → home → detail. Thumb zone respected: primary actions at the bottom, 44 pt+ tap targets.', landing: 'Classic hero: one headline, one sentence, one primary + one secondary CTA, proof card, then three benefits. F-pattern reading order.', dashboard: 'Sidebar navigation, KPI row first (what changed?), then trend, split and detail — overview before detail.' }[kind]}\nType: ${pair.head[0]} / ${pair.body[0]}. ${wf ? 'Grey on purpose: judge layout before colour.' : `Primary ${describe(C.primary)}, accent ${describe(C.accent)} for the one thing that matters.`}`, assets: [] });
}
