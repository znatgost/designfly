// Fashion: technical flat sketches (tech-pack style) with colourways, prints and callouts.
import { el, g, rect, circle, line, path, text, doc } from './svg.js';
import { context, design, titleCase } from './common.js';
import { fontStack, fontsOf } from './type.js';
import { mix, shade, describe, readableOn } from './color.js';
import { patternDef } from './pattern.js';
import { drawMark } from './marks.js';

export const GARMENTS = ['tshirt', 'hoodie', 'dress', 'trousers', 'skirt', 'jacket'];

// right-half path (from top centre, down the right side, to bottom centre) → full symmetric path
function sym(segs, cx) {
  const fx = (x) => cx + x, mx = (x) => cx - x;
  let d = `M${fx(segs[0][1])} ${segs[0][2]}`;
  const pts = [[segs[0][1], segs[0][2]]];
  for (const s of segs.slice(1)) {
    if (s[0] === 'L') d += `L${fx(s[1])} ${s[2]}`;
    else if (s[0] === 'Q') d += `Q${fx(s[1])} ${s[2]} ${fx(s[3])} ${s[4]}`;
    else if (s[0] === 'C') d += `C${fx(s[1])} ${s[2]} ${fx(s[3])} ${s[4]} ${fx(s[5])} ${s[6]}`;
    pts.push([s[s.length - 2], s[s.length - 1]]);
  }
  for (let i = segs.length - 1; i >= 1; i--) {
    const s = segs[i], [px, py] = pts[i - 1];
    if (s[0] === 'L') d += `L${mx(px)} ${py}`;
    else if (s[0] === 'Q') d += `Q${mx(s[1])} ${s[2]} ${mx(px)} ${py}`;
    else if (s[0] === 'C') d += `C${mx(s[3])} ${s[4]} ${mx(s[1])} ${s[2]} ${mx(px)} ${py}`;
  }
  return d + 'Z';
}
const both = (fn) => fn(1) + fn(-1);

function garment(kind, cx, r) {
  const st = { fill: 'none', strokeDasharray: '5 4', strokeWidth: 1.4 };
  const X = (x, s) => cx + s * x;
  switch (kind) {
    case 'tshirt': {
      const fit = r.float(0.95, 1.08);
      const body = sym([['M', 0, 70], ['Q', 34, 68, 52, 30], ['L', 118, 48], ['L', 210 * fit, 128], ['L', 172 * fit, 200], ['L', 128, 170], ['L', 134, 480], ['L', 0, 486]], cx);
      return { body, zone: [cx - 100, 150, 200, 200], label: 'T-shirt', details: [
        path(`M${X(52, -1)} 30Q${cx} ${92} ${X(52, 1)} 30`, { ...st, strokeDasharray: undefined, fill: 'none' }), path(`M${X(46, -1)} 38Q${cx} ${84} ${X(46, 1)} 38`, st),
        both((s) => path(`M${X(128, s)} 170L${X(118, s)} 48`, { ...st, strokeDasharray: '2 5' }) + path(`M${X(180 * fit, s)} ${186}L${X(198 * fit, s)} ${146}`, st)),
        path(`M${X(134, -1)} 466L${X(134, 1)} 466`, st)],
        callouts: [['ribbed crew neck', cx, 60], ['set-in sleeve', X(165, 1), 110], ['double-needle hem', X(90, 1), 468]] };
    }
    case 'hoodie': {
      const body = sym([['M', 0, 118], ['Q', 40, 110, 58, 58], ['L', 128, 72], ['Q', 190, 110, 222, 420], ['L', 178, 432], ['L', 146, 214], ['L', 148, 460], ['L', 150, 510], ['L', 0, 514]], cx);
      const hood = sym([['M', 0, 118], ['Q', 40, 110, 58, 58], ['Q', 70, -6, 0, -10]], cx);
      return { body, extra: path(hood, { fill: 'var(--g)', stroke: 'var(--s)', strokeWidth: 2.4 }), zone: [cx - 90, 180, 180, 130], label: 'Hoodie', details: [
        path(`M${X(40, -1)} 70Q${cx} 6 ${X(40, 1)} 70`, st), path(`M${X(92, -1)} 346L${X(70, -1)} 300H${X(70, 1)}L${X(92, 1)} 346L${X(100, 1)} 430H${X(100, -1)}Z`, { fill: 'none', stroke: 'var(--s)', strokeWidth: 2 }),
        both((s) => line(X(10, s), 118, X(14, s), 196, { stroke: 'var(--s)', strokeWidth: 2 }) + circle(X(14, s), 200, 4, { fill: 'var(--s)' }) + path(`M${X(178, s)} 410L${X(220, s)} 398`, st)),
        path(`M${X(148, -1)} 480H${X(148, 1)}`, st), path(`M${X(150, -1)} 494H${X(150, 1)}`, st)],
        callouts: [['lined hood + flat cord', X(30, 1), 20], ['kangaroo pocket', X(96, 1), 380], ['rib cuffs & hem', X(200, 1), 420]] };
    }
    case 'dress': {
      const flare = r.float(0.9, 1.25);
      const body = sym([['M', 0, 64], ['Q', 30, 62, 42, 26], ['L', 70, 28], ['Q', 84, 90, 96, 110], ['Q', 84, 170, 78, 232], ['C', 110 * flare, 330, 170 * flare, 460, 196 * flare, 560], ['Q', 100, 580, 0, 574]], cx);
      return { body, zone: [cx - 150, 330, 300, 200], label: 'Dress', details: [
        path(`M${X(78, -1)} 232Q${cx} 246 ${X(78, 1)} 232`, { fill: 'none', stroke: 'var(--s)', strokeWidth: 2 }), path(`M${X(42, -1)} 26Q${cx} 84 ${X(42, 1)} 26`, st),
        both((s) => path(`M${X(40, s)} 120Q${X(46, s)} 180 ${X(40, s)} 232`, st) + path(`M${X(52, s)} 240Q${X(90 * flare, s)} 420 ${X(100 * flare, s)} 560`, { fill: 'none', stroke: 'var(--s)', strokeWidth: 1, opacity: 0.5 })),
        path(`M${X(190 * flare, -1)} 548Q${cx} 566 ${X(190 * flare, 1)} 548`, st)],
        callouts: [['scoop neck', cx, 54], ['fitted bodice, darts', X(60, 1), 170], ['A-line skirt', X(150 * flare, 1), 440]] };
    }
    case 'trousers': {
      const wide = r.float(0.9, 1.3);
      const body = sym([['M', 0, 20], ['L', 118, 20], ['Q', 130, 120, 128 * wide, 300], ['L', 124 * wide, 600], ['L', 26 * wide, 600], ['L', 8, 180], ['L', 0, 176]], cx);
      return { body, zone: null, label: 'Trousers', details: [
        path(`M${X(118, -1)} 58H${X(118, 1)}`, { fill: 'none', stroke: 'var(--s)', strokeWidth: 2 }), path(`M${X(118, -1)} 50H${X(118, 1)}`, st),
        path(`M${cx} 58V176`, { fill: 'none', stroke: 'var(--s)', strokeWidth: 1.6 }), path(`M${cx + 18} 60V150Q${cx + 18} 170 ${cx} 176`, st),
        both((s) => path(`M${X(80, s)} 58Q${X(96, s)} 100 ${X(124, s)} 108`, { fill: 'none', stroke: 'var(--s)', strokeWidth: 1.6 }) + path(`M${X(75 * wide, s)} 190L${X(75 * wide, s)} 596`, { fill: 'none', stroke: 'var(--s)', strokeWidth: 1, opacity: 0.45 }) +
          rect(X(s > 0 ? 50 : 70, s), 24, 20, 34, { fill: 'none', stroke: 'var(--s)', strokeWidth: 1.2 }) + path(`M${X(124 * wide, s)} 582H${X(26 * wide, s)}`, st))],
        callouts: [['2 cm waistband, belt loops', X(118, 1), 40], ['slant pockets', X(110, 1), 100], ['pressed crease', X(75 * wide, 1), 420]] };
    }
    case 'skirt': {
      const fl = r.float(1, 1.5);
      const body = sym([['M', 0, 60], ['L', 104, 60], ['Q', 118, 140, 130 * fl, 240], ['L', 170 * fl, 470], ['Q', 90, 486, 0, 484]], cx);
      return { body, zone: [cx - 120, 250, 240, 160], label: 'Skirt', details: [
        path(`M${X(104, -1)} 94H${X(104, 1)}`, { fill: 'none', stroke: 'var(--s)', strokeWidth: 2 }), path(`M${X(164 * fl, -1)} 456Q${cx} 470 ${X(164 * fl, 1)} 456`, st),
        ...[-2, -1, 0, 1, 2].map((k) => path(`M${cx + k * 36} 94L${cx + k * 36 * fl * 1.5} 480`, { fill: 'none', stroke: 'var(--s)', strokeWidth: 1, opacity: 0.4 }))],
        callouts: [['contour waistband', X(104, 1), 76], ['box pleats', X(80, 1), 300], ['blind hem', X(150 * fl, 1), 468]] };
    }
    default: {                                     // jacket (bomber)
      const body = sym([['M', 0, 70], ['Q', 36, 66, 54, 32], ['L', 130, 54], ['Q', 196, 110, 230, 410], ['L', 186, 426], ['L', 152, 212], ['L', 150, 440], ['L', 144, 470], ['L', 0, 474]], cx);
      return { body, zone: null, label: 'Bomber jacket', details: [
        path(`M${X(54, -1)} 32Q${cx} 100 ${X(54, 1)} 32`, { fill: 'none', stroke: 'var(--s)', strokeWidth: 2 }), path(`M${cx} 70V474`, { fill: 'none', stroke: 'var(--s)', strokeWidth: 2.4 }),
        path(`M${cx} 70V474`, { fill: 'none', stroke: 'var(--s)', strokeWidth: 7, strokeDasharray: '1.5 3', opacity: 0.5 }), rect(cx - 5, 80, 10, 18, { fill: 'var(--s)', rx: 2 }),
        both((s) => path(`M${X(150, s)} 432H${X(0, s)}`, st) + path(`M${X(84, s)} 250L${X(110, s)} 350`, { fill: 'none', stroke: 'var(--s)', strokeWidth: 2 }) + path(`M${X(188, s)} 396L${X(226, s)} 384`, st) +
          path(`M${X(140, s)} 60L${X(158, s)} 140`, { fill: 'none', stroke: 'var(--s)', strokeWidth: 1.4, strokeDasharray: '2 4' }))],
        callouts: [['rib collar', X(40, 1), 44], ['centre-front zip', cx, 180], ['welt pockets', X(100, 1), 300], ['rib cuffs & hem', X(210, 1), 406]] };
    }
  }
}

export function generateFashion(spec) {
  const ctx = context(spec);
  const { C, pair, palette, r } = ctx;
  const kind = GARMENTS.includes(spec.garment) ? spec.garment : r.pick(GARMENTS);
  const print = spec.print || r.pick(['none', 'none', 'stripes', 'dots', 'graphic', 'checker', 'confetti', 'leaves']);
  const W = 1600, H = 1000;
  const hand = "'Caveat', cursive";
  const main = C.primary, trim = shade(C.primary, -0.18);
  const gm = garment(kind, 0, r.fork('g'));
  const draw = (x, y, sc, fill, stroke, withPrint, id) => {
    const gg = garment(kind, 0, r.fork('g'));
    const clip = 'gc' + id;
    let printSvg = '';
    if (withPrint && print !== 'none') {
      if (print === 'graphic' && gg.zone) {
        const [zx, zy, zw, zh] = gg.zone;
        printSvg = drawMark(r.pick(['sun', 'spark', 'bauhaus', 'petal', 'wave', 'mountain']), ctx.seed + 3, [C.accent, C.paper, C.secondary], { id: 'fm' + id }, zx + zw / 2, zy + zh / 2, Math.min(zw, zh) * 0.9);
      } else if (print !== 'graphic') printSvg = rect(-300, -60, 600, 700, { fill: `url(#fp${ctx.seed})`, opacity: 0.9 });
    }
    return g({ transform: `translate(${x} ${y}) scale(${sc})` },
      el('clipPath', { id: clip }, path(gg.body)),
      gg.extra || '', path(gg.body, { fill, stroke, strokeWidth: 2.4, strokeLinejoin: 'round' }),
      g({ clipPath: `url(#${clip})` }, printSvg), ...gg.details).replaceAll('var(--s)', stroke).replaceAll('var(--g)', fill);
  };
  const defs = print !== 'none' && print !== 'graphic' ? patternDef('fp' + ctx.seed, print, [main, mix(C.paper, main, 0.1), C.accent, C.secondary], 46, ctx.seed) : '';
  const P = [rect(0, 0, W, H, { fill: spec.sketch ? '#f6f1e6' : '#f5f3ef' })];
  // main flat
  const scale = kind === 'trousers' || kind === 'dress' ? 1.35 : 1.5;
  const gx = 420, gy = 120;
  P.push(text(60, 80, (spec.name ? spec.name + ' — ' : '') + (gm.label), { fontFamily: fontStack(pair.head[0]), fontWeight: pair.head[1], fontSize: 38, fill: C.ink }));
  P.push(text(60, 112, 'FRONT VIEW · TECHNICAL FLAT', { fontFamily: fontStack(pair.body[0]), fontWeight: 600, fontSize: 13, letterSpacing: 3, fill: '#888' }));
  P.push(draw(gx, gy, scale, main, C.ink, true, 'm'));
  // callouts
  gm.callouts.forEach(([t, x, y], i) => {
    const px = gx + x * scale, py = gy + y * scale, tx = 800, ty = 190 + i * 110;
    P.push(circle(px, py, 4, { fill: C.accent }), path(`M${px} ${py}C${(px + tx) / 2} ${py} ${(px + tx) / 2} ${ty} ${tx - 12} ${ty}`, { fill: 'none', stroke: '#8a8580', strokeWidth: 1.2 }),
      text(tx, ty + 8, t, { fontFamily: hand, fontSize: 30, fill: C.ink }));
  });
  // colourways
  const ways = [[main, C.ink], [C.secondary, C.ink], [C.ink, mix(C.paper, C.ink, 0.25)], [C.paper, C.ink]];
  P.push(text(1150, 150, 'COLOURWAYS', { fontFamily: fontStack(pair.body[0]), fontWeight: 600, fontSize: 13, letterSpacing: 3, fill: '#888' }));
  ways.forEach(([f, s], i) => {
    const x = 1255 + (i % 2) * 225, y = 200 + Math.floor(i / 2) * 330, sc = kind === 'trousers' || kind === 'dress' || kind === 'skirt' ? 0.44 : 0.4;
    P.push(draw(x, y, sc, f, s, i === 0, 'w' + i), text(x, y + 300, describe(f), { fontFamily: fontStack(pair.body[0]), fontSize: 14, fill: '#666', textAnchor: 'middle' }));
  });
  // swatches
  P.push(text(800, 610, 'FABRIC & TRIMS', { fontFamily: fontStack(pair.body[0]), fontWeight: 600, fontSize: 13, letterSpacing: 3, fill: '#888' }));
  const fabric = { tshirt: '220 gsm cotton jersey', hoodie: '380 gsm brushed fleece', dress: 'viscose crepe, lined bodice', trousers: 'wool-blend twill', skirt: 'cotton poplin', jacket: 'nylon twill, quilted lining' }[kind];
  [[main, fabric], [trim, 'rib / trim'], [C.accent, 'stitching & labels']].forEach(([c, t], i) => P.push(rect(800, 630 + i * 70, 56, 56, { rx: 8, fill: c }), text(872, 666 + i * 70, t, { fontFamily: hand, fontSize: 26, fill: C.ink })));
  if (print !== 'none') P.push(text(800, 870, `print: ${print}`, { fontFamily: hand, fontSize: 26, fill: C.ink }));
  P.push(text(W - 60, H - 40, 'designfly · tech pack p.1', { fontFamily: hand, fontSize: 24, fill: '#aaa', textAnchor: 'end' }));
  const fonts = fontsOf(pair, [['Caveat', 400]]);
  const svg = doc(W, H, P.join(''), { defs, fonts, seed: ctx.seed, sketch: spec.sketch, sketchStrength: 0.8, title: gm.label + ' flat' });
  const single = doc(700, 760, draw(350, 90, 1.1, main, C.ink, true, 's'), { defs, seed: ctx.seed, sketch: spec.sketch, sketchStrength: 0.8 });
  return design({ kind: 'fashion', title: `${spec.name ? spec.name + ' ' : ''}${gm.label.toLowerCase()} flat`, svg, spec: { ...spec, garment: kind, print }, palette, pair, w: W, h: H,
    notes: `**${gm.label}** — technical flat, the drawing a factory works from.\nDetails: ${gm.callouts.map((c) => c[0]).join(', ')}. Fabric: ${fabric}${print !== 'none' ? `; ${print} print` : ''}.\nColourways: ${ways.map((w) => describe(w[0])).join(', ')}. Flats are drawn symmetric and front-on — no body, no pose — so proportions can be measured.`,
    assets: [{ name: `${kind}-flat.svg`, svg: single }] });
}
