// Things the fly knows how to draw. Each one is built from strokes with its own proportions,
// details and colouring decided on the spot, so no two cats come out the same.
// Local coordinates: a 100 × 100 box centred on (0, 0), y grows downwards.
const D = Math.PI / 180;
export const NAT = { brown: '#7a4a2a', crust: '#d99a52', bun: '#f2bf5e', cream: '#fbe7c6', green: '#5d9b4c', leaf: '#7cb653', yellow: '#f6c945', orange: '#f08a3a', red: '#e0533d', pink: '#f4a3b5', sky: '#8fcbea', blue: '#3f7fd0', grey: '#9aa0a8', white: '#ffffff', night: '#2d3352', purple: '#8e6bd1', wood: '#b07a4a', snow: '#f4f7fb', gold: '#e9b949', skin: '#f6d2b0' };

export function kit(S, x, y, s, col, natural, flip = false) {
  const u = s / 100, fx = flip ? -1 : 1, r = S.r;
  const m = (pts) => pts.map(([a, b]) => [x + a * u * fx, y + b * u]);
  const pal = [col.a, col.b, col.c];
  const g = {
    S, r, u, col, w: S.w,
    nat: (k) => (natural ? NAT[k] : pal[[...k].reduce((h, c) => h + c.charCodeAt(0), 0) % 3]),
    any: () => r.pick(pal),
    arc: (cx, cy, rx, ry, a0, a1, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + ((a1 - a0) * i) / n) * D; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; }),
    shape: (pts, o = {}) => S.shape(m(pts), o),
    blob: (pts, o = {}) => S.shape(m(pts), { ...o, smooth: true }),
    line: (pts, o = {}) => S.line(m(pts), o),
    curve: (pts, o = {}) => S.curve(m(pts), o),
    ell: (cx, cy, rx, ry, o = {}) => S.ellipse(x + cx * u * fx, y + cy * u, rx * u, ry * u, { ...o, rot: (o.rot || 0) * fx }),
    dot: (cx, cy, rad, o = {}) => S.dot(x + cx * u * fx, y + cy * u, rad * u, o),
    rect: (x0, y0, w, h, o = {}) => S.shape(m([[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]]), o),
    thin: () => S.w * 0.6,
  };
  g.heart = (cx, cy, sz, o = {}) => g.blob([[cx, cy + sz * 0.9], [cx - sz * 0.9, cy + sz * 0.05], [cx - sz * 0.8, cy - sz * 0.6], [cx - sz * 0.35, cy - sz * 0.75], [cx, cy - sz * 0.35], [cx + sz * 0.35, cy - sz * 0.75], [cx + sz * 0.8, cy - sz * 0.6], [cx + sz * 0.9, cy + sz * 0.05]], o);
  g.star = (cx, cy, R, ri, n = 5, o = {}) => g.shape(Array.from({ length: n * 2 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? ri : R; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; }), o);
  g.leafShape = (cx, cy, len, wid, ang, o = {}) => {
    const c = Math.cos(ang * D), s2 = Math.sin(ang * D), T = ([a, b]) => [cx + a * c - b * s2, cy + a * s2 + b * c];
    const pts = [[0, 0], [len * 0.3, -wid], [len * 0.7, -wid * 0.8], [len, 0], [len * 0.7, wid * 0.8], [len * 0.3, wid]].map(T);
    g.blob(pts, o);
    if (o.vein !== false) g.line([[0, 0], [len * 0.85, 0]].map(T), { w: g.thin() });
  };
  g.face = (cx, cy, sz, o = {}) => {
    const e = o.eyes || r.pick(['dot', 'dot', 'oval', 'happy']), ex = sz * r.float(0.32, 0.45), ey = cy - sz * 0.12;
    for (const sx of [-1, 1]) {
      if (e === 'happy') g.curve([[cx + sx * ex - sz * 0.12, ey + sz * 0.03], [cx + sx * ex, ey - sz * 0.1], [cx + sx * ex + sz * 0.12, ey + sz * 0.03]], { w: g.thin() * 1.3 });
      else if (e === 'oval') { g.ell(cx + sx * ex, ey, sz * 0.11, sz * 0.15, { fill: g.col.w, solid: true }); g.dot(cx + sx * ex + sz * 0.03, ey + sz * 0.03, sz * 0.06); }
      else g.dot(cx + sx * ex, ey, sz * 0.07);
    }
    const mt = o.mouth || r.pick(['smile', 'smile', 'open', 'o']);
    if (mt === 'open') g.blob([[cx - sz * 0.22, cy + sz * 0.15], [cx + sz * 0.22, cy + sz * 0.15], [cx + sz * 0.1, cy + sz * 0.38], [cx - sz * 0.1, cy + sz * 0.38]], { fill: g.nat('red'), solid: true, w: g.thin() });
    else if (mt === 'o') g.ell(cx, cy + sz * 0.25, sz * 0.07, sz * 0.09, { w: g.thin() });
    else g.curve([[cx - sz * 0.22, cy + sz * 0.15], [cx, cy + sz * 0.3], [cx + sz * 0.22, cy + sz * 0.15]], { w: g.thin() * 1.2 });
    if (o.blush ?? r.chance(0.6)) for (const sx of [-1, 1]) g.ell(cx + sx * sz * 0.55, cy + sz * 0.12, sz * 0.12, sz * 0.07, { fill: g.nat('pink'), solid: true, ink: false });
  };
  return g;
}

export const MOTIF = {
  cup(g) {
    const { r } = g, w = r.float(25, 33), h = r.float(32, 44), top = -h / 2 + 6, bot = top + h, tp = r.float(0, 8), mug = r.chance(0.5);
    if (!mug) g.ell(-4, bot + 2, w + 18, 6, { fill: g.col.b });
    g.ell(w + 6 - tp / 2, top + h * 0.42, 10, 12, { w: g.w * 1.1 });
    g.shape([[-w - 4, top], [w - 4, top], [w - 4 - tp, bot - 7], [w - 10 - tp, bot], [-w + 2 + tp, bot], [-w - 4 + tp, bot - 7]], { fill: g.nat('cream') === g.col.w ? g.col.a : r.pick([g.col.a, g.nat('cream'), g.col.c]) });
    g.ell(-4, top, w, 5, { fill: g.nat('brown') });
    const n = r.int(2, 3);
    for (let i = 0; i < n; i++) { const sx = -4 + (i - (n - 1) / 2) * 13, a = r.float(4, 7); g.curve([[sx, top - 9], [sx + a, top - 17], [sx - a, top - 26], [sx + a * 0.6, top - 36]], { w: g.thin() * 1.2 }); }
    if (r.chance(0.5)) g.heart(-4, top + h * 0.48, 7, { fill: g.col.c, solid: true, w: g.thin() });
  },
  bean(g) {
    const { r } = g, n = r.int(1, 3);
    for (let i = 0; i < n; i++) {
      const cx = n === 1 ? 0 : (i - (n - 1) / 2) * 30, cy = n === 1 ? 0 : r.float(-8, 8), a = r.float(-50, 50), rx = n === 1 ? 34 : 18, ry = rx * r.float(0.62, 0.75);
      g.ell(cx, cy, rx, ry, { rot: a * D, fill: g.nat('brown') });
      const c = Math.cos(a * D), s = Math.sin(a * D), T = ([p, q]) => [cx + p * c - q * s, cy + p * s + q * c];
      g.curve([[-rx * 0.8, 0], [-rx * 0.3, -ry * 0.25], [rx * 0.3, ry * 0.25], [rx * 0.8, 0]].map(T), { w: g.thin() });
    }
  },
  bread(g) {
    const { r } = g;
    if (r.chance(0.4)) {      // baguette
      const a = r.float(-30, -15);
      g.ell(0, 0, 46, 13, { rot: a * D, fill: g.nat('crust') });
      for (let i = -2; i <= 2; i++) { const c = Math.cos(a * D), s = Math.sin(a * D), px = i * 15; g.curve([[px - 5, 5], [px, 0], [px + 5, -5]].map(([p, q]) => [p * c - q * s, p * s + q * c]), { w: g.thin() }); }
      return;
    }
    const w = r.float(36, 46), h = r.float(28, 40);
    g.blob([[-w, 18], [-w - 2, 0], [-w * 0.75, -h * 0.75], [0, -h], [w * 0.75, -h * 0.75], [w + 2, 0], [w, 18]], { fill: g.nat('crust') });
    g.line([[-w + 2, 18], [w - 2, 18]], {});
    const n = r.int(2, 4);
    for (let i = 0; i < n; i++) { const px = (i - (n - 1) / 2) * (w * 1.3 / n); g.curve([[px - 8, -h * 0.35], [px, -h * 0.55], [px + 8, -h * 0.75]], { w: g.thin() * 1.2 }); }
    if (r.chance(0.5)) for (let i = 0; i < 9; i++) g.dot(r.float(-w * 0.7, w * 0.7), r.float(-h * 0.6, 8), 1.1, { c: g.col.w });
  },
  croissant(g) {
    const { r } = g, R = r.float(40, 46), ri = R * r.float(0.3, 0.38), cy = 24, segs = 5;
    const outer = []; for (let i = 0; i <= 30; i++) { const t = i / 30, a = (195 + t * 150) * D, k = R * (0.8 + 0.2 * Math.sin(Math.PI * t)) + 7 * Math.abs(Math.sin(t * Math.PI * segs)); outer.push([k * Math.cos(a), cy + k * 0.85 * Math.sin(a)]); }
    const inner = g.arc(0, cy + 4, ri, ri * 0.7, 345, 195, 8);
    g.blob([...outer, ...inner], { fill: g.nat('crust') });
    for (let j = 1; j < segs; j++) { const a = (195 + (j / segs) * 150) * D, p = [ri * 1.05 * Math.cos(a), cy + 4 + ri * 0.75 * Math.sin(a)], k = R * (0.8 + 0.2 * Math.sin((Math.PI * j) / segs)), q = [k * 0.97 * Math.cos(a), cy + k * 0.83 * Math.sin(a)]; g.curve([p, [(p[0] + q[0]) / 2 + 3, (p[1] + q[1]) / 2 - 2], q], { w: g.thin() }); }
  },
  bun(g) {
    const { r } = g, R = r.float(34, 42);
    g.blob(g.arc(0, 2, R, R * r.float(0.88, 1), 0, 350, 16), { fill: g.nat('bun') });
    g.face(0, 4, R * 0.75, {});
    if (r.chance(0.4)) for (let i = 0; i < 7; i++) { const a = r.float(200, 340) * D; g.dot(R * 0.75 * Math.cos(a), 2 + R * 0.7 * Math.sin(a), 1.2, { c: g.nat('cream') }); }
  },
  cake(g) {
    const { r } = g, w = r.float(32, 40), h = r.float(18, 26), tiers = r.int(1, 2);
    let base = 34;
    for (let t = 0; t < tiers; t++) {
      const ww = w * (1 - t * 0.3), top = base - h;
      g.rect(-ww, top, ww * 2, h, { fill: t ? g.col.b : g.col.a });
      const drip = [[-ww, top]]; for (let i = 0; i <= 8; i++) drip.push([-ww + (ww * 2 * i) / 8, top + (i % 2 ? r.float(6, 11) : 3)]); drip.push([ww, top]);
      g.shape([...drip, [ww, top - 3], [-ww, top - 3]], { fill: g.nat('cream'), smooth: true, w: g.thin() });
      base = top - 3;
    }
    const n = r.int(1, 3);
    for (let i = 0; i < n; i++) { const px = (i - (n - 1) / 2) * 12; g.rect(px - 2.5, base - 18, 5, 18, { fill: g.col.c, w: g.thin() }); g.blob([[px, base - 30], [px + 4, base - 22], [px, base - 19], [px - 4, base - 22]], { fill: g.nat('yellow'), w: g.thin() }); }
  },
  pizza(g) {
    const { r } = g;
    g.shape([[-36, -30], [36, -30], [0, 42]], { fill: g.nat('yellow') });
    g.blob([[-40, -30], [-36, -42], [0, -46], [36, -42], [40, -30], [0, -32]], { fill: g.nat('crust') });
    for (let i = 0; i < r.int(3, 5); i++) { const t = r.float(0.1, 0.75), px = r.float(-1, 1) * 30 * (1 - t), py = -26 + t * 60; g.ell(px, py, 6, 6, { fill: g.nat('red'), w: g.thin() }); }
    if (r.chance(0.6)) for (let i = 0; i < 4; i++) g.leafShape(r.float(-14, 14), r.float(-20, 10), 7, 3, r.float(0, 360), { fill: g.nat('green'), vein: false, w: g.thin() * 0.8 });
  },
  icecream(g) {
    const { r } = g, n = r.int(1, 3);
    g.shape([[-18, 0], [18, 0], [0, 50]], { fill: g.nat('crust') });
    for (let i = 1; i < 4; i++) { g.line([[-18 + i * 9, 0], [-9 + i * 3, 50 - i * 12]].map(([a, b]) => [a, b]), { w: g.thin() * 0.8 }); }
    for (let i = 0; i < n; i++) { const cy = -8 - i * 20; g.blob(g.arc(0, cy, 21 - i * 2, 16, 170, 370, 12), { fill: r.pick([g.nat('pink'), g.col.a, g.nat('cream'), g.col.c]) }); }
    g.ell(3, -8 - n * 20 - 4, 5, 5, { fill: g.nat('red'), w: g.thin() });
  },
  leaf(g) {
    const { r } = g, n = r.weighted([[1, 3], [2, 2], [3, 2]]);
    if (n === 1) { g.leafShape(-40, 18, 86, r.float(22, 30), -r.float(25, 40), { fill: g.nat('leaf') }); g.curve([[-40, 18], [-46, 30], [-44, 40]], { w: g.thin() }); return; }
    g.curve([[0, 46], [r.float(-6, 6), 10], [0, -40]], {});
    for (let i = 0; i < n * 2 - 1; i++) { const py = 30 - i * (60 / (n * 2)), sx = i % 2 ? 1 : -1; g.leafShape(0, py, r.float(30, 40), r.float(10, 14), sx > 0 ? -r.float(20, 45) : 180 + r.float(20, 45), { fill: r.chance(0.7) ? g.nat('leaf') : g.nat('green') }); }
  },
  tree(g) {
    const { r } = g, kind = r.pick(['round', 'pine', 'cloud']);
    g.rect(-6, 10, 12, 38, { fill: g.nat('wood') });
    if (kind === 'pine') for (let i = 0; i < 3; i++) { const y0 = 18 - i * 20, w = 36 - i * 8; g.shape([[-w, y0], [w, y0], [0, y0 - 32]], { fill: g.nat('green') }); }
    else if (kind === 'round') g.blob(g.arc(0, -16, 36, 34, 0, 345, 14).map(([a, b], i) => [a + (i % 2 ? 2 : -2), b]), { fill: g.nat('leaf') });
    else { const pts = []; for (let i = 0; i < 7; i++) pts.push(...g.arc(Math.cos((i / 7) * 2 * Math.PI) * 24, -16 + Math.sin((i / 7) * 2 * Math.PI) * 20, 14, 14, (i / 7) * 360 - 70, (i / 7) * 360 + 70, 4)); g.blob(pts, { fill: g.nat('green') }); }
    if (r.chance(0.4)) for (let i = 0; i < 4; i++) g.ell(r.float(-22, 22), r.float(-34, 2), 4, 4, { fill: g.nat('red'), w: g.thin() });
  },
  flower(g) {
    const { r } = g, n = r.int(5, 8), pl = r.float(16, 24), cy = -14, round = r.chance(0.5), pc = r.pick([g.nat('pink'), g.col.a, g.col.c, g.nat('yellow')]);
    g.curve([[0, cy], [r.float(-8, 8), 18], [0, 50]], { w: g.w * 1.1 });
    g.leafShape(0, 26, 22, 8, -r.float(20, 40), { fill: g.nat('leaf') });
    for (let i = 0; i < n; i++) { const a = (i / n) * 360 + r.float(-6, 6), c = Math.cos(a * D), s = Math.sin(a * D); g.ell(c * pl, cy + s * pl, round ? pl * 0.6 : pl * 0.75, round ? pl * 0.6 : pl * 0.35, { rot: a * D, fill: pc }); }
    g.ell(0, cy, pl * 0.5, pl * 0.5, { fill: g.nat('yellow') });
  },
  sun(g) {
    const { r } = g, R = r.float(20, 26), n = r.int(8, 14), tri = r.chance(0.5);
    for (let i = 0; i < n; i++) {
      const a = ((i / n) * 360 + r.float(-4, 4)) * D, c = Math.cos(a), s = Math.sin(a), r0 = R + 6, r1 = R + r.float(14, 22);
      if (tri) g.shape([[c * r0 - s * 5, s * r0 + c * 5], [c * r1, s * r1], [c * r0 + s * 5, s * r0 - c * 5]], { fill: g.nat('orange'), w: g.thin() });
      else g.line([[c * r0, s * r0], [c * r1, s * r1]], {});
    }
    g.ell(0, 0, R, R, { fill: g.nat('yellow') });
    if (r.chance(0.5)) g.face(0, 0, R * 0.8, { blush: true });
  },
  moon(g) {
    const { r } = g, R = 36, k = r.float(0.55, 0.75);
    g.blob([...g.arc(0, 0, R, R, 60, 300, 18), ...g.arc(R * 0.55, -R * 0.1, R * k, R * k * 1.05, 260, 100, 12)], { fill: g.nat('yellow') });
    if (r.chance(0.5)) { g.dot(-12, -6, 2.5); g.curve([[-20, 10], [-12, 15], [-5, 11]], { w: g.thin() }); }
    for (let i = 0; i < r.int(1, 3); i++) g.star(r.float(20, 44), r.float(-40, 30), 6, 2.6, 4, { fill: g.col.c, solid: true, w: g.thin() * 0.8 });
  },
  star(g) {
    const { r } = g, n = r.weighted([[5, 4], [6, 1], [4, 2], [8, 1]]);
    g.star(0, 2, 44, 44 * r.float(0.38, 0.5), n, { fill: g.nat('yellow'), smooth: r.chance(0.3) });
    if (r.chance(0.6)) for (const [px, py] of [[38, -38], [-40, 30]]) { g.line([[px - 7, py], [px + 7, py]], { w: g.thin() }); g.line([[px, py - 7], [px, py + 7]], { w: g.thin() }); }
  },
  cloud(g) {
    const { r } = g, n = r.int(3, 4), pts = [[40, 18], [-40, 18]];
    for (let i = 0; i < n; i++) { const cx = -40 + ((i + 0.5) * 80) / n, R = i === 0 || i === n - 1 ? r.float(13, 17) : r.float(20, 27); pts.push(...g.arc(cx, 18 - R * 0.9, R, R, 180, 360, 6).filter((_, j) => j > 0 && j < 6)); }
    g.blob(pts, { fill: g.col.w === '#ffffff' ? NAT.sky : r.pick([g.nat('sky'), g.col.w]) });
    if (r.chance(0.4)) for (let i = 0; i < 4; i++) { const px = -24 + i * 15; g.line([[px, 28], [px - 4, 40]], { c: g.nat('blue'), w: g.thin() }); }
  },
  wave(g) {
    const { r } = g;
    if (r.chance(0.5)) {
      g.blob([[-50, 40], [-44, 12], [-26, -14], [0, -32], [24, -34], [40, -22], [40, -6], [28, 0], [22, -10], [28, -18], [14, -20], [0, -6], [4, 18], [24, 30], [50, 40]], { fill: g.nat('blue') });
      for (let i = 0; i < 6; i++) g.dot(r.float(-30, 30), r.float(-34, -18), 1.6, { c: g.col.w });
      return;
    }
    const bands = r.int(3, 4), amp = r.float(5, 9);
    for (let b = 0; b < bands; b++) {
      const y = -26 + b * (64 / bands), ph = r.float(0, 6), th = r.float(7, 11), top = [], bot = [];
      for (let i = 0; i <= 16; i++) { const x = -48 + i * 6, yy = y + Math.sin(i * 0.8 + ph) * amp; top.push([x, yy]); bot.unshift([x, yy + th]); }
      g.shape([...top, ...bot], { fill: b % 2 ? g.nat('sky') : g.nat('blue'), smooth: true, w: b ? g.thin() : g.w });
      if (r.chance(0.5)) g.curve(top.slice(2, 7).map(([a, q]) => [a, q - 5]), { w: g.thin() * 0.7 });
    }
  },
  mountain(g) {
    const { r } = g, n = r.int(2, 3);
    if (r.chance(0.5)) g.ell(r.float(14, 30), -30, 10, 10, { fill: g.nat('orange'), w: g.thin() });
    for (let i = 0; i < n; i++) {
      const cx = (i - (n - 1) / 2) * 34 + r.float(-6, 6), h = r.float(50, 78) * (i === Math.floor(n / 2) ? 1 : 0.75), w = r.float(30, 42), base = 36;
      g.shape([[cx - w, base], [cx, base - h], [cx + w, base]], { fill: i % 2 ? g.nat('green') : g.nat('grey') });
      if (h > 50) { const t = 0.3; g.shape([[cx - w * t, base - h * (1 - t)], [cx, base - h], [cx + w * t, base - h * (1 - t)], [cx + w * t * 0.4, base - h * (1 - t) + 5], [cx, base - h * (1 - t) - 2], [cx - w * t * 0.4, base - h * (1 - t) + 6]], { fill: g.nat('snow'), w: g.thin() }); }
    }
    g.line([[-50, 36], [50, 36]], {});
  },
  fish(g) {
    const { r } = g, L = r.float(34, 40), H = r.float(16, 24);
    g.shape([[28, 0], [48, -16], [44, 0], [48, 16]], { fill: g.col.c });
    g.blob([[-L, 0], [-L * 0.4, -H], [L * 0.4, -H * 0.8], [L * 0.85, 0], [L * 0.4, H * 0.8], [-L * 0.4, H]], { fill: r.pick([g.nat('orange'), g.col.a, g.nat('blue')]) });
    g.ell(-L * 0.55, -H * 0.2, 4, 4, { fill: g.col.w, solid: true, w: g.thin() }); g.dot(-L * 0.57, -H * 0.2, 1.8);
    g.curve([[-L * 0.3, -H * 0.7], [-L * 0.2, 0], [-L * 0.3, H * 0.7]], { w: g.thin() });
    if (r.chance(0.6)) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) g.curve(g.arc(-4 + i * 9, -6 + j * 10 + (i % 2) * 5, 4, 4, -60, 60, 4), { w: g.thin() * 0.8 });
    if (r.chance(0.5)) for (let i = 0; i < 3; i++) g.ell(-L - 6 - i * 4, -10 - i * 9, 2 + i, 2 + i, { w: g.thin() * 0.8 });
  },
  cat(g) {
    const { r } = g, fur = r.pick([g.nat('orange'), g.nat('grey'), g.col.a, g.nat('night'), g.nat('cream')]), body = r.chance(0.6);
    const hy = body ? -16 : 0, hr = body ? 24 : 34;
    if (body) {
      g.curve([[20, 40], [42, 34], [46, 10], [36, -2]], { w: g.w * 1.6, c: g.col.k });
      g.blob([[-24, 44], [-28, 20], [-14, hy + 10], [14, hy + 10], [28, 20], [24, 44]], { fill: fur });
      g.line([[-6, 44], [-6, 30]], { w: g.thin() }); g.line([[6, 44], [6, 30]], { w: g.thin() });
    }
    for (const sx of [-1, 1]) g.shape([[sx * hr * 0.85, hy - hr * 0.35], [sx * hr * 0.8, hy - hr * 1.25], [sx * hr * 0.2, hy - hr * 0.85]], { fill: fur });
    g.blob(g.arc(0, hy, hr, hr * 0.85, 0, 340, 14), { fill: fur });
    const ey = hy - hr * 0.1;
    for (const sx of [-1, 1]) { g.ell(sx * hr * 0.38, ey, hr * 0.17, hr * 0.2, { fill: g.nat('yellow') === g.col.w ? g.col.c : NAT.yellow, solid: true, w: g.thin() }); g.line([[sx * hr * 0.38, ey - hr * 0.12], [sx * hr * 0.38, ey + hr * 0.12]], { w: g.w * 1.2 }); }
    g.shape([[-hr * 0.1, hy + hr * 0.18], [hr * 0.1, hy + hr * 0.18], [0, hy + hr * 0.3]], { fill: g.nat('pink'), solid: true, w: g.thin() });
    g.curve([[-hr * 0.22, hy + hr * 0.42], [-hr * 0.1, hy + hr * 0.5], [0, hy + hr * 0.32], [hr * 0.1, hy + hr * 0.5], [hr * 0.22, hy + hr * 0.42]], { w: g.thin() });
    for (const sx of [-1, 1]) for (const k of [-1, 1]) g.line([[sx * hr * 0.35, hy + hr * 0.3 + k * 4], [sx * hr * 1.15, hy + hr * 0.25 + k * 9]], { w: g.thin() * 0.7 });
  },
  dog(g) {
    const { r } = g, fur = r.pick([g.nat('crust'), g.nat('cream'), g.col.a, g.nat('wood')]), R = 30;
    g.blob(g.arc(0, 0, R, R * 1.05, 0, 340, 14), { fill: fur });
    for (const sx of [-1, 1]) g.blob([[sx * R * 0.7, -R * 0.75], [sx * R * 1.25, -R * 0.4], [sx * R * 1.2, R * 0.5], [sx * R * 0.85, R * 0.4]], { fill: g.nat('brown') });
    g.ell(0, R * 0.38, R * 0.45, R * 0.32, { fill: g.col.w, solid: true });
    g.ell(0, R * 0.22, R * 0.16, R * 0.11, { fill: g.col.k, solid: true });
    g.curve([[0, R * 0.32], [0, R * 0.5]], { w: g.thin() });
    g.curve([[-R * 0.2, R * 0.55], [0, R * 0.62], [R * 0.2, R * 0.55]], { w: g.thin() });
    if (r.chance(0.6)) g.blob([[-R * 0.1, R * 0.6], [R * 0.1, R * 0.6], [R * 0.08, R * 0.85], [-R * 0.08, R * 0.85]], { fill: g.nat('pink'), solid: true, w: g.thin() });
    for (const sx of [-1, 1]) g.dot(sx * R * 0.38, -R * 0.15, R * 0.09);
  },
  bird(g) {
    const { r } = g, c = r.pick([g.col.a, g.nat('blue'), g.nat('red'), g.nat('yellow')]);
    g.line([[-6, 26], [-8, 42]], { w: g.thin() }); g.line([[6, 26], [8, 42]], { w: g.thin() });
    g.shape([[-30, 2], [-50, -8], [-46, 10]], { fill: g.col.k === c ? g.col.b : c });
    g.blob([[-34, 4], [-16, -20], [12, -26], [30, -12], [26, 14], [0, 28], [-24, 20]], { fill: c });
    g.curve([[-18, 0], [0, -8], [10, 10], [-12, 14]], { w: g.thin() });
    g.shape([[28, -18], [44, -12], [28, -6]], { fill: g.nat('orange'), w: g.thin() });
    g.dot(17, -14, 2.4);
  },
  fly(g) {
    const { r } = g;
    for (const sx of [-1, 1]) g.ell(-4 + sx * 0, -22 + (sx > 0 ? 0 : 6), 26, 11, { rot: (sx > 0 ? -20 : 15) * D, fill: g.nat('sky'), w: g.thin() });
    for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) g.curve([[-8 + i * 10, 8], [-12 + i * 12 + sx * 4, 20], [-16 + i * 14 + sx * 6, 30]], { w: g.thin() * 0.8 });
    g.ell(-8, 4, 26, 13, { fill: g.nat('crust') });
    for (let i = 0; i < 3; i++) g.curve([[-20 + i * 8, -8], [-18 + i * 8, 16]], { w: g.thin() * 0.8 });
    g.ell(24, 0, 12, 12, { fill: g.nat('crust') });
    g.ell(28, -4, 6, 7, { fill: g.nat('red'), solid: true, w: g.thin() });
    if (r.chance(0.6)) g.blob([[14, -10], [20, -20], [34, -20], [38, -12]], { fill: g.col.k, solid: true, w: g.thin() });
  },
  house(g) {
    const { r } = g, w = r.float(30, 38), h = r.float(30, 38), base = 40, top = base - h;
    g.rect(w * 0.45, top - 30, 10, 22, { fill: g.col.c, w: g.thin() });
    if (r.chance(0.6)) for (let i = 0; i < 2; i++) g.ell(w * 0.45 + 6 + i * 6, top - 38 - i * 9, 4 + i * 2, 3 + i * 1.5, { w: g.thin() * 0.8 });
    g.rect(-w, top, w * 2, h, { fill: r.pick([g.col.w, g.nat('cream'), g.col.b]) });
    g.shape([[-w - 8, top + 2], [0, top - r.float(26, 36)], [w + 8, top + 2]], { fill: g.nat('red') });
    g.rect(-8, base - 22, 16, 22, { fill: g.col.a, w: g.thin() * 1.2 });
    for (const sx of [-1, 1]) { g.rect(sx * w * 0.62 - 7, top + 8, 14, 12, { fill: g.nat('yellow'), w: g.thin() }); }
  },
  building(g) {
    const { r } = g, n = r.int(3, 5); let x = -48;
    const ws = Array.from({ length: n }, () => r.float(0.6, 1.4)), tot = ws.reduce((a, b) => a + b, 0);
    ws.forEach((wk, i) => {
      const w = (96 * wk) / tot, h = r.float(40, 90), top = 44 - h;
      g.rect(x, top, w - 2, h, { fill: r.pick([g.col.a, g.col.b, g.nat('grey'), g.col.c]) });
      for (let yy = top + 7; yy < 36; yy += 10) for (let xx = x + 5; xx < x + w - 7; xx += 8) if (r.chance(0.75)) g.rect(xx, yy, 4, 5, { fill: g.nat('yellow'), solid: true, ink: false });
      x += w;
    });
    g.line([[-50, 44], [50, 44]], {});
  },
  heart(g) { const { r } = g; g.heart(0, 0, 42, { fill: g.nat('red') }); if (r.chance(0.5)) g.curve([[-22, -18], [-26, -8]], { w: g.thin(), c: g.col.w }); },
  note(g) {
    const { r } = g;
    if (r.chance(0.5)) {
      for (const [px, py] of [[-22, 28], [20, 18]]) { g.ell(px, py, 12, 9, { rot: -25 * D, fill: g.col.k, solid: true }); g.line([[px + 10, py - 2], [px + 10, py - 58]], {}); }
      g.shape([[-12, -32], [30, -42], [30, -34], [-12, -24]], { fill: g.col.k, solid: true });
    } else { g.ell(-6, 28, 15, 11, { rot: -25 * D, fill: g.col.k, solid: true }); g.line([[7, 25], [7, -40]], {}); g.curve([[7, -40], [24, -28], [26, -10], [18, 0]], {}); }
  },
  headphones(g) {
    const { r } = g, c = r.pick([g.col.a, g.col.c, g.nat('red')]);
    g.curve(g.arc(0, 4, 36, 40, 190, 350, 10), { w: g.w * 2.2 });
    for (const sx of [-1, 1]) g.blob([[sx * 26, -6], [sx * 46, -4], [sx * 46, 30], [sx * 26, 32]], { fill: c });
  },
  bolt(g) { g.shape([[8, -48], [-26, 6], [-2, 6], [-12, 48], [26, -10], [2, -10]], { fill: g.nat('yellow') }); },
  gear(g) {
    const { r } = g, n = r.int(7, 10), R = 40, ri = 32, pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI, d = Math.PI / n; for (const [aa, rr] of [[a - d * 0.9, ri], [a - d * 0.45, R], [a + d * 0.45, R], [a + d * 0.9, ri]]) pts.push([Math.cos(aa) * rr, Math.sin(aa) * rr]); }
    g.shape(pts, { fill: r.pick([g.nat('grey'), g.col.a]) });
    g.ell(0, 0, 13, 13, { fill: g.col.w, solid: true });
  },
  rocket(g) {
    const { r } = g;
    g.blob([[-10, 34], [0, 52], [10, 34], [4, 40], [0, 34], [-4, 40]], { fill: g.nat('orange'), w: g.thin() });
    for (const sx of [-1, 1]) g.shape([[sx * 14, 8], [sx * 30, 30], [sx * 14, 26]], { fill: g.nat('red') });
    g.blob([[-15, 30], [-17, 0], [-10, -30], [0, -48], [10, -30], [17, 0], [15, 30]], { fill: r.pick([g.col.w, g.nat('cream'), g.col.b]) });
    g.ell(0, -8, 8, 8, { fill: g.nat('sky'), w: g.thin() * 1.2 });
    for (let i = 0; i < 4; i++) g.dot(r.float(-46, 46), r.float(-44, 44), 1.4, { c: g.col.c });
  },
  robot(g) {
    const { r } = g, c = r.pick([g.col.a, g.nat('grey'), g.col.b]);
    g.line([[0, -30], [0, -44]], {}); g.ell(0, -46, 4, 4, { fill: g.nat('red'), w: g.thin() });
    g.rect(-30, -30, 60, 48, { fill: c });
    for (const sx of [-1, 1]) { g.ell(sx * 13, -10, 8, 8, { fill: g.col.w, solid: true, w: g.thin() }); g.dot(sx * 13, -10, 3.5); }
    g.rect(-14, 4, 28, 8, { fill: g.col.w, solid: true, w: g.thin() }); for (let i = 1; i < 4; i++) g.line([[-14 + i * 7, 4], [-14 + i * 7, 12]], { w: g.thin() * 0.7 });
    for (const sx of [-1, 1]) g.rect(sx > 0 ? 30 : -36, -16, 6, 16, { fill: g.col.c, w: g.thin() });
    if (r.chance(0.5)) { g.rect(-20, 22, 40, 24, { fill: c }); g.ell(0, 34, 5, 5, { fill: g.nat('red'), w: g.thin() }); }
  },
  chip(g) {
    const { r } = g;
    for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { const p = -18 + i * 12; g.line([[p, sd * 30], [p, sd * 42]], { w: g.thin() }); g.line([[sd * 30, p], [sd * 42, p]], { w: g.thin() }); }
    g.rect(-30, -30, 60, 60, { fill: r.pick([g.col.a, g.nat('night')]) });
    g.rect(-14, -14, 28, 28, { fill: g.col.c, w: g.thin() });
  },
  book(g) {
    const { r } = g, c = r.pick([g.col.a, g.nat('red'), g.nat('blue')]);
    g.shape([[-46, -24], [0, -18], [46, -24], [46, 30], [0, 36], [-46, 30]], { fill: c });
    for (const sx of [-1, 1]) { g.shape([[0, -22], [sx * 42, -30], [sx * 42, 24], [0, 30]], { fill: g.col.w, solid: true, smooth: false }); for (let i = 0; i < 4; i++) g.line([[sx * 8, -14 + i * 9], [sx * 34, -20 + i * 9]], { w: g.thin() * 0.6 }); }
    g.line([[0, -22], [0, 30]], {});
  },
  pencil(g) {
    const { r } = g, a = -r.float(30, 50) * D, c = Math.cos(a), s = Math.sin(a), T = ([p, q]) => [p * c - q * s, p * s + q * c];
    g.shape([[-36, -8], [24, -8], [24, 8], [-36, 8]].map(T), { fill: g.nat('yellow') });
    g.shape([[24, -8], [46, 0], [24, 8]].map(T), { fill: g.nat('cream') });
    g.shape([[40, -2.5], [46, 0], [40, 2.5]].map(T), { fill: g.col.k, solid: true, w: g.thin() });
    g.shape([[-48, -8], [-36, -8], [-36, 8], [-48, 8]].map(T), { fill: g.nat('pink') });
    g.line([[-36, 0], [24, 0]].map(T), { w: g.thin() * 0.7 });
  },
  eye(g) {
    const { r } = g;
    g.shape([...g.arc(0, 26, 50, 44, 213, 327, 12), ...g.arc(0, -26, 50, 44, 33, 147, 12)], { fill: g.col.w, solid: true, smooth: true });
    g.ell(0, 0, 17, 17, { fill: r.pick([g.col.a, g.nat('blue'), g.nat('green'), g.nat('brown')]) });
    g.ell(0, 0, 7, 7, { fill: g.col.k, solid: true }); g.dot(5, -5, 2.4, { c: g.col.w });
    for (let i = 0; i < 5; i++) { const a = (215 + i * 27.5) * D; g.line([[50 * Math.cos(a), 26 + 44 * Math.sin(a)], [58 * Math.cos(a), 26 + 52 * Math.sin(a)]], { w: g.thin() }); }
  },
  camera(g) {
    const { r } = g;
    g.rect(-14, -32, 22, 10, { fill: g.col.b, w: g.thin() });
    g.rect(-44, -24, 88, 56, { fill: r.pick([g.col.a, g.nat('grey'), g.nat('night')]) });
    g.ell(2, 4, 21, 21, { fill: g.col.w, solid: true }); g.ell(2, 4, 13, 13, { fill: g.nat('sky') }); g.dot(-3, -1, 2.6, { c: g.col.w });
    g.rect(28, -18, 9, 6, { fill: g.nat('yellow'), w: g.thin() });
  },
  glass(g) {
    const { r } = g;
    if (r.chance(0.5)) {   // wine
      g.line([[0, 6], [0, 38]], {}); g.ell(0, 40, 16, 4, { fill: g.col.w, solid: true });
      g.shape([...g.arc(0, -20, 22, 26, 0, 180, 10)], { fill: g.nat('red') === NAT.red ? '#8e2a3c' : g.col.a, smooth: true });
      g.curve(g.arc(0, -20, 22, 26, 180, 360, 8), { w: g.thin() });
    } else {               // cocktail
      g.line([[0, 0], [0, 38]], {}); g.ell(0, 40, 16, 4, {});
      g.shape([[-30, -32], [30, -32], [0, 0]], { fill: g.nat('pink') });
      g.line([[10, -48], [-6, -12]], { w: g.thin() }); g.ell(-2, -22, 6, 6, { fill: g.nat('green'), w: g.thin() });
    }
  },
  scissors(g) {
    const { r } = g, a = r.float(14, 24) * D;
    for (const sx of [-1, 1]) {
      const c = Math.cos(sx * a), s = Math.sin(sx * a), T = ([p, q]) => [p * c - q * s, p * s + q * c];
      g.shape([[-4, -4], [48, -1], [-4, 6]].map(T), { fill: g.nat('grey') });
      const [hx, hy] = T([-24, 0]); g.ell(hx, hy, 12, 9, { fill: g.col.a, w: g.w });
      const [ix, iy] = T([-24, 0]); g.ell(ix, iy, 5.5, 3.5, { fill: g.col.w, solid: true, w: g.thin() });
    }
    g.dot(0, 0, 2.4);
  },
  dress(g) {
    const { r } = g;
    g.curve([[0, -44], [0, -50], [5, -52], [8, -48]], { w: g.thin() }); g.line([[-24, -32], [0, -44], [24, -32]], { w: g.thin() });
    g.blob([[-10, -36], [-16, -18], [-10, -2], [-30, 44], [30, 44], [10, -2], [16, -18], [10, -36], [0, -30]], { fill: r.pick([g.col.a, g.nat('red'), g.col.c, g.nat('pink')]) });
    g.curve([[-10, -2], [0, 2], [10, -2]], { w: g.thin() });
    if (r.chance(0.5)) for (let i = 0; i < 6; i++) g.dot(r.float(-18, 18), r.float(8, 38), 1.8, { c: g.col.w });
  },
  crown(g) {
    const { r } = g, n = r.int(3, 5), pts = [[-40, 26], [-40, -18]];
    for (let i = 0; i < n; i++) { const x0 = -40 + (80 * i) / n; pts.push([x0 + 40 / n, 6], [x0 + 80 / n, -18]); }
    pts.push([40, 26]);
    g.shape(pts, { fill: g.nat('gold') });
    for (let i = 0; i <= n; i++) g.ell(-40 + (80 * i) / n, -22, 4, 4, { fill: g.nat('red'), w: g.thin() });
    g.line([[-40, 16], [40, 16]], { w: g.thin() });
  },
  diamond(g) {
    g.shape([[-40, -12], [-22, -32], [22, -32], [40, -12], [0, 40]], { fill: g.nat('sky') });
    g.line([[-40, -12], [40, -12]], { w: g.thin() });
    g.line([[-22, -32], [-12, -12], [0, -32], [12, -12], [22, -32]], { w: g.thin() });
    g.line([[-12, -12], [0, 40], [12, -12]], { w: g.thin() });
  },
  key(g) {
    const { r } = g, c = g.nat('gold');
    g.shape([[-6, -5], [44, -5], [44, 5], [-6, 5]], { fill: c });
    g.shape([[30, 5], [30, 18], [36, 18], [36, 5]], { fill: c, w: g.thin() });
    if (r.chance(0.6)) g.shape([[20, 5], [20, 14], [25, 14], [25, 5]], { fill: c, w: g.thin() });
    g.ell(-22, 0, 20, 20, { fill: c }); g.ell(-24, 0, 7, 7, { fill: g.col.w, solid: true, w: g.thin() });
  },
  anchor(g) {
    g.ell(0, -38, 8, 8, { w: g.w * 1.3 });
    g.line([[0, -30], [0, 40]], { w: g.w * 1.5 });
    g.line([[-18, -16], [18, -16]], { w: g.w * 1.3 });
    g.curve([...g.arc(0, 8, 36, 32, 160, 20, 10)], { w: g.w * 1.5 });
    for (const sx of [-1, 1]) g.shape([[sx * 34, 20], [sx * 42, 10], [sx * 28, 12]], { fill: g.col.k, solid: true, w: g.thin() });
  },
  drop(g) {
    const { r } = g;
    g.blob([[0, -46], [16, -16], [30, 10], [24, 32], [0, 42], [-24, 32], [-30, 10], [-16, -16]], { fill: g.nat('blue') });
    g.curve([[-16, 10], [-14, 24], [-4, 30]], { c: g.col.w, w: g.thin() * 1.4 });
    if (r.chance(0.4)) g.face(0, 14, 16, { blush: true });
  },
  flame(g) {
    g.blob([[0, -48], [14, -22], [30, 0], [26, 28], [0, 42], [-26, 28], [-28, 0], [-14, -16], [-8, -2]], { fill: g.nat('orange') });
    g.blob([[2, -12], [12, 6], [12, 24], [0, 32], [-12, 24], [-10, 8]], { fill: g.nat('yellow'), w: g.thin() });
  },
  paw(g) {
    const c = g.r.pick([g.col.a, g.nat('brown'), g.col.k]);
    g.blob([[-24, 20], [-18, 2], [0, -4], [18, 2], [24, 20], [12, 34], [0, 30], [-12, 34]], { fill: c });
    for (const [px, py, rr] of [[-30, -12, 9], [-12, -30, 10], [12, -30, 10], [30, -12, 9]]) g.ell(px, py, rr * 0.85, rr, { fill: c });
  },
  bike(g) {
    const { r } = g, c = r.pick([g.col.a, g.nat('red'), g.col.c]);
    for (const sx of [-1, 1]) { g.ell(sx * 28, 16, 20, 20, { w: g.w * 1.2 }); g.dot(sx * 28, 16, 2); }
    g.line([[-28, 16], [-6, 16], [12, -10], [-14, -10], [-28, 16]], { c, w: g.w * 1.2 });
    g.line([[-6, 16], [-16, -18]], { c, w: g.w * 1.2 }); g.line([[28, 16], [16, -22]], { c, w: g.w * 1.2 });
    g.line([[-24, -20], [-10, -20]], { w: g.w * 1.6 }); g.curve([[12, -22], [20, -24], [24, -18]], {});
  },
  car(g) {
    const { r } = g, c = r.pick([g.col.a, g.nat('red'), g.nat('blue'), g.col.c]);
    g.blob([[-48, 18], [-46, -2], [-26, -6], [-14, -26], [18, -26], [30, -6], [46, -2], [48, 18]], { fill: c });
    g.shape([[-10, -22], [-2, -22], [-2, -8], [-20, -8]], { fill: g.nat('sky'), w: g.thin() });
    g.shape([[4, -22], [16, -22], [24, -8], [4, -8]], { fill: g.nat('sky'), w: g.thin() });
    for (const sx of [-1, 1]) { g.ell(sx * 26, 18, 11, 11, { fill: g.col.k, solid: true }); g.ell(sx * 26, 18, 4, 4, { fill: g.nat('grey'), solid: true, w: g.thin() }); }
    g.ell(44, 4, 3.5, 3, { fill: g.nat('yellow'), w: g.thin() });
  },
  plane(g) {
    const { r } = g;
    if (r.chance(0.5)) {  // paper plane
      g.shape([[-46, 4], [46, -30], [-6, 14]], { fill: g.col.w === '#ffffff' ? NAT.sky : g.col.w });
      g.shape([[-6, 14], [46, -30], [4, 34]], { fill: g.col.b });
      g.curve([[-48, 30], [-30, 34], [-20, 26], [-34, 22]], { w: g.thin() * 0.8, c: g.col.c });
      return;
    }
    g.blob([[-46, 0], [-30, -8], [36, -8], [48, 0], [36, 8], [-30, 8]], { fill: g.col.w === '#ffffff' ? NAT.grey : g.col.w });
    g.shape([[-4, -6], [10, -42], [18, -42], [16, -6]], { fill: g.col.a }); g.shape([[-4, 6], [10, 42], [18, 42], [16, 6]], { fill: g.col.a });
    g.shape([[-40, -4], [-46, -22], [-38, -22], [-30, -4]], { fill: g.col.c, w: g.thin() });
  },
  dumbbell(g) {
    g.line([[-30, 0], [30, 0]], { w: g.w * 2 });
    for (const sx of [-1, 1]) { g.rect(sx > 0 ? 22 : -32, -22, 10, 44, { fill: g.col.a }); g.rect(sx > 0 ? 32 : -42, -14, 10, 28, { fill: g.col.b }); }
  },
  tooth(g) {
    g.blob([[-30, -30], [-10, -36], [0, -30], [10, -36], [30, -30], [32, -6], [22, 14], [18, 40], [8, 40], [0, 18], [-8, 40], [-18, 40], [-22, 14], [-32, -6]], { fill: g.col.w === '#ffffff' ? NAT.white : g.col.w });
    g.curve([[16, -24], [22, -14]], { w: g.thin(), c: g.col.c });
  },
  cross(g) {
    g.ell(0, 0, 44, 44, { fill: g.r.pick([g.col.w, g.col.b]) });
    g.shape([[-10, -30], [10, -30], [10, -10], [30, -10], [30, 10], [10, 10], [10, 30], [-10, 30], [-10, 10], [-30, 10], [-30, -10], [-10, -10]], { fill: g.nat('red') });
  },
  coin(g) {
    const { r } = g, n = r.int(2, 4);
    for (let i = 0; i < n; i++) { const y = 30 - i * 10; g.ell(i % 2 ? 2 : -2, y, 34, 10, { fill: g.nat('gold') }); g.curve(g.arc(i % 2 ? 2 : -2, y, 34, 10, 0, 180, 8).map(([a, b]) => [a, b + 4]), { w: g.thin() * 0.8 }); }
    g.ell(16, -34, 18, 18, { fill: g.nat('gold') }); g.ell(16, -34, 12, 12, { w: g.thin() });
  },
  chat(g) {
    const { r } = g;
    g.blob([[-44, -30], [44, -30], [44, 18], [-6, 18], [-24, 38], [-20, 18], [-44, 18]], { fill: r.pick([g.col.a, g.col.b, g.nat('sky')]) });
    for (let i = -1; i <= 1; i++) g.dot(i * 16, -6, 4.5);
  },
  smile(g) { const R = 40; g.ell(0, 0, R, R, { fill: g.nat('yellow') }); g.face(0, 4, R * 0.8, {}); },
  globe(g) {
    const R = 40; g.ell(0, 0, R, R, { fill: g.nat('sky') });
    for (const k of [0.45, 0.85]) g.curve(g.arc(0, 0, R * k, R, 270, 450, 10), { w: g.thin() });
    g.curve(g.arc(0, 0, R * 0.45, R, 270, 90, 10).reverse(), { w: g.thin() });
    g.line([[-R, 0], [R, 0]], { w: g.thin() }); g.curve(g.arc(0, -R * 0.2, R * 0.9, R * 0.2, 180, 0, 8).map(([a, b]) => [a, b - 18]), { w: g.thin() });
    g.blob([[-24, -18], [-6, -26], [4, -12], [-8, 4], [-20, 0]], { fill: g.nat('green'), w: g.thin() });
    g.blob([[8, 8], [24, 4], [28, 20], [14, 28]], { fill: g.nat('green'), w: g.thin() });
  },
  snail(g) {
    const { r } = g;
    g.blob([[-46, 34], [-40, 22], [30, 22], [42, 8], [48, 18], [44, 34]], { fill: g.nat('cream') });
    for (const sx of [0, 8]) { g.line([[38 + sx * 0.5, 10], [36 + sx, -6]], { w: g.thin() }); g.dot(36 + sx, -8, 2.4); }
    g.ell(-6, -2, 28, 26, { fill: g.nat('crust') });
    const sp = []; for (let i = 0; i < 40; i++) { const t = i / 39, a = t * 4.2 * Math.PI, rr = 24 * (1 - t); sp.push([-6 + rr * Math.cos(a), -2 + rr * Math.sin(a) * 0.95]); }
    g.curve(sp, { w: g.thin() * 1.2 });
  },
  mushroom(g) {
    const { r } = g;
    g.blob([[-12, 6], [12, 6], [16, 40], [-16, 40]], { fill: g.nat('cream') });
    g.blob([[-46, 10], ...g.arc(0, 10, 46, 46, 180, 360, 12), [46, 10]], { fill: g.nat('red') });
    for (let i = 0; i < r.int(4, 7); i++) g.ell(r.float(-30, 30), r.float(-26, 0), r.float(3, 6), r.float(3, 5), { fill: g.col.w === '#ffffff' ? NAT.white : g.col.w, solid: true, w: g.thin() * 0.8 });
  },
  apple(g) {
    const { r } = g;
    g.curve([[0, -26], [2, -40], [6, -46]], { w: g.w * 1.3 });
    g.leafShape(4, -38, 22, 8, -30, { fill: g.nat('leaf') });
    g.blob([[0, -26], [18, -34], [36, -18], [34, 14], [16, 38], [0, 32], [-16, 38], [-34, 14], [-36, -18], [-18, -34]], { fill: r.chance(0.6) ? g.nat('red') : g.nat('leaf') });
    g.curve([[-22, -14], [-24, 0]], { c: g.col.w, w: g.thin() * 1.4 });
  },
  /** something the fly doesn't know: a cheerful creature, invented on the spot */
  critter(g) {
    const { r } = g, c = r.pick([g.col.a, g.col.b, g.col.c, g.nat('leaf')]), legs = r.int(2, 6), R = r.float(28, 36);
    for (let i = 0; i < legs; i++) { const px = -R * 0.7 + (i * R * 1.4) / Math.max(1, legs - 1); g.curve([[px, R * 0.5], [px + r.float(-6, 6), R * 0.9], [px + r.float(-4, 8), R + 10]], { w: g.thin() * 1.1 }); }
    const pts = []; const k = r.int(3, 6);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * 2 * Math.PI; const rr = R * (1 + 0.12 * Math.sin(a * k + r.float(0, 1))); pts.push([rr * Math.cos(a) * 1.15, rr * Math.sin(a) * 0.85]); }
    g.blob(pts, { fill: c });
    if (r.chance(0.6)) for (const sx of [-1, 1]) { g.curve([[sx * 8, -R * 0.8], [sx * 14, -R * 1.2], [sx * 10, -R * 1.45]], { w: g.thin() }); g.dot(sx * 10, -R * 1.45, 2.4); }
    g.face(0, 0, R * 0.7, {});
  },
};
