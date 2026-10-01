// Seeded randomness: every design is a pure function of (kind, params, seed), so the gallery
// only needs to store specs and "another one" is just seed + 1.

export function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function rng(seed) {
  let a = (typeof seed === 'string' ? hashString(seed) : seed >>> 0) || 0x9e3779b9;
  const next = () => {            // mulberry32
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = {
    next,
    float: (lo = 0, hi = 1) => lo + (hi - lo) * next(),
    int: (lo, hi) => Math.floor(lo + (hi - lo + 1) * next()),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle: (arr) => { const a2 = arr.slice(); for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; } return a2; },
    weighted: (pairs) => {          // [[item, weight], ...]
      const tot = pairs.reduce((s, p) => s + p[1], 0);
      let x = next() * tot;
      for (const [it, w] of pairs) { x -= w; if (x <= 0) return it; }
      return pairs[pairs.length - 1][0];
    },
    fork: (tag) => rng(hashString(String(tag)) ^ Math.floor(next() * 4294967296)),
  };
  return r;
}

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const round = (x, d = 2) => { const k = 10 ** d; return Math.round(x * k) / k; };
export const TAU = Math.PI * 2;
