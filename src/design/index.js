// Registry of everything the fly can make. generate(spec) → design object:
// { kind, title, svg, w, h, notes, assets[], palette, fonts, spec }
import { generateLogo, LOGO_STYLES } from './logo.js';
import { generatePalette } from './palette.js';
import { generateTypography } from './typography.js';
import { generatePattern, PATTERNS } from './pattern.js';
import { generateCard, generatePoster, generateIdentity, POSTER_STYLES } from './brand.js';
import { generateFloorplan, PLAN_TYPES } from './floorplan.js';
import { generateFacade, FACADE_STYLES } from './facade.js';
import { generateFashion, GARMENTS } from './fashion.js';
import { generateProduct, PRODUCTS } from './product.js';
import { generateUI, UI_KINDS } from './ui.js';
import { generateMoodboard } from './moodboard.js';
import { MOODS, INDUSTRIES, HARMONIES } from './color.js';
import { PAIRS } from './type.js';
import { MARK_NAMES } from './marks.js';
import { cleanGenome } from '../learn/genome.js';
import { HAND, HAND_KINDS, handChoices } from '../hand/compose.js';
import { MOTIFS } from '../hand/concepts.js';
import { generatePainting, cleanPaint, SCENES } from '../paint/index.js';

export const KINDS = {
  logo:       { fn: generateLogo, label: 'Logo', icon: '◎', styles: LOGO_STYLES, about: 'mark + wordmark, colour variants, app icon' },
  identity:   { fn: generateIdentity, label: 'Brand identity', icon: '▦', styles: [], about: 'logo, palette, type, pattern, stationery, merch' },
  palette:    { fn: generatePalette, label: 'Colour palette', icon: '◐', styles: HARMONIES, about: 'swatches, ramps, WCAG contrast, CSS tokens' },
  typography: { fn: generateTypography, label: 'Type pairing', icon: 'Aa', styles: PAIRS.map((p) => p.id), about: 'font pairing specimen + type scale' },
  poster:     { fn: generatePoster, label: 'Poster', icon: '▭', styles: POSTER_STYLES, about: 'A-series poster in a design movement style' },
  card:       { fn: generateCard, label: 'Business card', icon: '▬', styles: [], about: 'front + back, print-ready size' },
  pattern:    { fn: generatePattern, label: 'Pattern', icon: '▩', styles: PATTERNS, about: 'seamless tile in 3 colourways' },
  floorplan:  { fn: generateFloorplan, label: 'Floor plan', icon: '⌂', styles: ['clean', 'blueprint'], about: 'zoned plan with doors, windows, furniture, dimensions' },
  facade:     { fn: generateFacade, label: 'Façade', icon: '▥', styles: FACADE_STYLES, about: 'building elevation with scale figures' },
  fashion:    { fn: generateFashion, label: 'Fashion flat', icon: '👕', styles: GARMENTS, about: 'technical flat, colourways, trims' },
  product:    { fn: generateProduct, label: 'Product sketch', icon: '✎', styles: PRODUCTS, about: 'marker sketch with orthographic views' },
  ui:         { fn: generateUI, label: 'UI mockup', icon: '▢', styles: UI_KINDS, about: 'app screens, landing page or dashboard' },
  moodboard:  { fn: generateMoodboard, label: 'Mood board', icon: '✦', styles: [], about: 'collage, materials, palette, keywords' },
  painting:   { fn: generatePainting, label: 'Painting', icon: '🖌', styles: SCENES, about: 'a brush painting by the fly: scene ∈ {studio (from life), self (self-portrait), memory (of subject), abstract}' },
  drawing:    { fn: HAND.drawing, label: 'Drawing', icon: '✏', styles: [], about: 'a freehand drawing of anything (subject: list of things to draw, caption)' },
};
export { HAND_KINDS };

/** Clean a spec from any source (intent parser, LLM JSON, gallery storage). */
export function normalize(spec = {}) {
  const s = { ...spec };
  s.kind = KINDS[s.kind] ? s.kind : 'logo';
  s.seed = Number.isFinite(+s.seed) ? Math.abs(Math.floor(+s.seed)) % 1e9 : Math.floor(Math.random() * 1e6);
  s.moods = Array.isArray(s.moods) ? s.moods.filter((m) => MOODS[m]).slice(0, 4) : [];
  s.colors = Array.isArray(s.colors) ? s.colors.filter((c) => /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(c))).map((c) => (c[0] === '#' ? c : '#' + c).toLowerCase()).slice(0, 5) : [];
  if (s.industry && !INDUSTRIES[s.industry]) delete s.industry;
  if (s.name) s.name = String(s.name).slice(0, 40);
  if (s.tagline) s.tagline = String(s.tagline).slice(0, 70);
  if (s.date) s.date = String(s.date).slice(0, 24);
  if (s.mark && !MARK_NAMES.includes(s.mark)) delete s.mark;
  if (s.genome) { s.genome = cleanGenome(s.genome); if (!s.genome) { delete s.genome; if (s.mark === 'genome') delete s.mark; } }
  if (s.mark === 'genome' && !s.genome) delete s.mark;
  if (s.evo) s.evo = { gen: +s.evo.gen | 0, p: Math.max(0, Math.min(1, +s.evo.p || 0)) };
  if (s.pair && !PAIRS.find((p) => p.id === s.pair)) delete s.pair;
  if (s.bedrooms) s.bedrooms = Math.max(1, Math.min(5, +s.bedrooms | 0));
  if (s.floors) s.floors = Math.max(1, Math.min(14, +s.floors | 0));
  if (s.area) s.area = Math.max(20, Math.min(400, +s.area));
  if (s.planType && !PLAN_TYPES.includes(s.planType)) delete s.planType;
  s.sketch = !!s.sketch;
  if (Array.isArray(s.subject)) s.subject = s.subject.filter((m) => MOTIFS.includes(m)).slice(0, 3); else delete s.subject;
  if (s.subject && !s.subject.length) delete s.subject;
  if (s.caption) s.caption = String(s.caption).slice(0, 30);
  if (s.lang !== 'ru') delete s.lang;
  if (s.kind === 'painting') { if (!SCENES.includes(s.scene)) s.scene = s.subject?.length ? 'memory' : 'studio'; if (s.paint) s.paint = cleanPaint(s.paint, s.seed); } else { delete s.scene; delete s.paint; }
  if (s.hand && typeof s.hand === 'object' && HAND_KINDS.includes(s.kind)) s.hand = handChoices(s);
  else if (!HAND_KINDS.includes(s.kind) || (s.hand !== true && (s.hand !== false || s.kind === 'drawing'))) delete s.hand;
  for (const k of Object.keys(s)) if (s[k] === undefined || s[k] === null || s[k] === '') delete s[k];
  return s;
}

export function generate(spec) {
  const s = normalize(spec);
  const d = (s.hand && HAND[s.kind] ? HAND[s.kind] : KINDS[s.kind].fn)(s);
  d.spec = normalize({ ...s, ...d.spec, kind: s.kind, seed: s.seed });
  d.id = `${s.kind}-${s.seed}-${Math.random().toString(36).slice(2, 7)}`;
  return d;
}

/** a compact schema the LLM gets in its system prompt */
export function schemaText() {
  return Object.entries(KINDS).map(([k, v]) => `- ${k}: ${v.about}${v.styles.length ? ` · style ∈ {${v.styles.join(', ')}}` : ''}`).join('\n') +
    `\nCommon fields: name, tagline, industry ∈ {${Object.keys(INDUSTRIES).join(', ')}}, moods ⊂ {${Object.keys(MOODS).join(', ')}}, colors (hex list, first = primary), dark (bool), sketch (bool = pencil filter on templates), hand (bool: true = the fly draws it freehand stroke by stroke — logo, poster, card, pattern; drawing is always freehand), seed (int).` +
    `\nExtra: logo.mark ∈ {${MARK_NAMES.filter((m) => m !== 'genome').join(', ')}}, typography/any.pair ∈ {${PAIRS.map((p) => p.id).join(', ')}}, typeStyle ∈ {serif, sans, script, mono, rounded, condensed, elegant, geometric}, floorplan.planType ∈ {${PLAN_TYPES.join(', ')}}, floorplan.bedrooms (1-5), floorplan.area (m²), facade.floors, fashion.garment ∈ {${GARMENTS.join(', ')}}, fashion.print ∈ {none, graphic, stripes, dots, checker, confetti, leaves}, product.product ∈ {${PRODUCTS.join(', ')}}, ui.screen ∈ {${UI_KINDS.join(', ')}}, ui.style ∈ {hifi, wireframe}, poster.details (3 short lines), drawing.subject ⊂ {${MOTIFS.join(', ')}} (things to draw), drawing.caption (short text).`;
}
