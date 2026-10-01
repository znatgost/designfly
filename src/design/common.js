// Shared context for generators: spec → { r, palette, pair, colors, tags, ... }
import { rng } from './rng.js';
import { makePalette, INDUSTRIES, MOODS, readableOn, contrast, mix } from './color.js';
import { pickPair, pairFromStyle } from './type.js';

export function context(spec) {
  const seed = spec.seed ?? 1;
  const r = rng(seed * 7919 + 13);
  const industryMoods = spec.industry ? INDUSTRIES[spec.industry] || [] : [];
  const moods = [...new Set([...(spec.moods || []), ...industryMoods])].filter((m) => MOODS[m]);
  const palette = makePalette({ moods, colors: spec.colors, harmony: spec.harmony, dark: spec.dark, seed: seed * 31 + 7 });
  const tags = [...moods, spec.industry, spec.style, spec.typeStyle].filter(Boolean);
  const pair = pickPair(r.fork('type'), tags, spec.pair || pairFromStyle(spec.typeStyle));
  const C = Object.fromEntries(palette.colors.map((c) => [c.role, c.hex]));
  const dark = !!(spec.dark ?? palette.dark);
  const bg = dark ? C.ink : C.paper, fg = dark ? C.paper : C.ink;
  // a primary that reads on the background (for text/marks)
  const onBg = (hex) => (contrast(hex, bg) >= 2.2 ? hex : mix(hex, fg, 0.45));
  return { spec, seed, r, palette, pair, C, dark, bg, fg, onBg, moods, tags, readableOn };
}

export function initials(name, max = 2) {
  const words = String(name || 'D').replace(/[^\p{L}\p{N}\s&-]/gu, '').split(/[\s&-]+/).filter(Boolean);
  if (!words.length) return 'D';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return words.slice(0, max).map((w) => w[0].toUpperCase()).join('');
}

export function titleCase(s) { return String(s).replace(/\b\p{L}/gu, (c) => c.toUpperCase()); }

export function design({ kind, title, svg, spec, notes, assets = [], palette, pair, w, h }) {
  return { kind, title, svg, spec, notes, assets, w, h, palette: palette?.colors, fonts: pair ? { head: pair.head[0], body: pair.body[0] } : null };
}
