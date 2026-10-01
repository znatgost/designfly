// The hand's habits: which layouts, nibs, colouring and lettering the fly reaches for.
// 👍 / 👎 on a hand-drawn design nudges those weights; every drawing is practice (steadier lines).
import { CHOICES, HAND_KINDS } from './compose.js';
import { PAINT_CHOICES } from '../paint/painter.js';

const KEYS = ['fill', 'nib', 'letter', 'colour'];
export class Taste {
  constructor(storage = null, key = 'designfly.hand') {
    this.storage = storage; this.key = key;
    let s = null;
    try { s = JSON.parse(storage?.getItem(key) || 'null'); } catch {}
    this.n = Number.isFinite(s?.n) ? s.n : 0;
    this.likes = s?.likes | 0; this.dislikes = s?.dislikes | 0;
    this.w = {};
    for (const k of KEYS) this.w[k] = Object.fromEntries(CHOICES[k].map((c) => [c, k === 'fill' && c === 'none' ? 0.35 : +(s?.w?.[k]?.[c]) || 1]));
    this.w.layout = {};
    for (const kind of HAND_KINDS) this.w.layout[kind] = Object.fromEntries(CHOICES.layout[kind].map((c) => [c, +(s?.w?.layout?.[kind]?.[c]) || 1]));
    this.w.paint = {};
    for (const [k, cs] of Object.entries(PAINT_CHOICES)) this.w.paint[k] = Object.fromEntries(cs.map((c) => [c, +(s?.w?.paint?.[k]?.[c]) || 1]));
    this.paintings = s?.paintings | 0;
  }
  /** painting has its own learning curve, helped a little by all the drawing practice */
  get paintSkill() { return Math.min(0.95, 0.05 + 0.75 * (1 - Math.exp(-this.paintings / 25)) + 0.15 * (1 - Math.exp(-this.n / 60))); }
  practicePainting() { this.paintings++; this.n++; this.save(); }
  get skill() { return Math.min(0.95, 0.15 + 0.8 * (1 - Math.exp(-this.n / 40))); }
  _pick(ws, rnd) {
    const e = Object.entries(ws), tot = e.reduce((a, [, w]) => a + w, 0);
    let x = rnd() * tot;
    for (const [c, w] of e) { x -= w; if (x <= 0) return c; }
    return e[e.length - 1][0];
  }
  sample(kind, rnd = Math.random) {
    if (kind === 'painting') { const o = { skill: Math.round(this.paintSkill * 100) / 100 }; for (const k of Object.keys(PAINT_CHOICES)) o[k] = this._pick(this.w.paint[k], rnd); return o; }
    const out = { layout: this._pick(this.w.layout[kind] || { scene: 1 }, rnd), skill: Math.round(this.skill * 100) / 100, guides: rnd() < 0.7 };
    for (const k of KEYS) out[k] = this._pick(this.w[k], rnd);
    return out;
  }
  practice() { this.n++; this.save(); }
  /** sign = +1 (liked) or −1 (disliked) */
  feedback(kind, hand, sign) {
    if (!hand) return;
    if (kind === 'painting') {
      for (const k of Object.keys(PAINT_CHOICES)) if (this.w.paint[k][hand[k]] !== undefined) this.w.paint[k][hand[k]] = Math.max(0.15, Math.min(8, this.w.paint[k][hand[k]] * (sign > 0 ? 1.4 : 0.7)));
      if (sign > 0) { this.likes++; this.paintings += 2; } else this.dislikes++;
      this.save(); return;
    }
    const f = sign > 0 ? 1.4 : 0.7, cl = (v) => Math.max(0.15, Math.min(8, v));
    for (const k of KEYS) if (this.w[k][hand[k]] !== undefined) this.w[k][hand[k]] = cl(this.w[k][hand[k]] * f);
    const L = this.w.layout[kind];
    if (L && L[hand.layout] !== undefined) L[hand.layout] = cl(L[hand.layout] * f);
    if (sign > 0) { this.likes++; this.n += 2; } else this.dislikes++;
    this.save();
  }
  favourites(kind) {
    const top = (ws) => Object.entries(ws).sort((a, b) => b[1] - a[1])[0];
    if (kind === 'painting') return Object.entries(this.w.paint).map(([k, ws]) => [k, ...top(ws)]).filter(([, , w]) => w > 1.2).map(([k, c]) => `${c} ${k === 'style' ? 'brushwork' : k === 'palette' ? 'colour' : 'ground'}`);
    return KEYS.map((k) => [k, ...top(this.w[k])]).filter(([, , w]) => w > 1.2).map(([k, c]) => `${c} ${k === 'colour' ? 'colours' : k === 'letter' ? 'lettering' : k}`);
  }
  save() { try { this.storage?.setItem(this.key, JSON.stringify({ n: this.n, paintings: this.paintings, likes: this.likes, dislikes: this.dislikes, w: this.w })); } catch {} }
  reset() { try { this.storage?.removeItem(this.key); } catch {} Object.assign(this, new Taste(this.storage, this.key)); }
}
