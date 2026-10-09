// The fly's offline brain: intent → reply text + designs to draw + follow-up chips + body language.
import { parse, applyModifiers, extract } from './intents.js';
import { subjectsIn } from './hand/concepts.js';
import { RU_NAME } from './hand/compose.js';
import { searchKB, byId } from './knowledge.js';
import { KINDS, normalize, generate as generateDesign } from './design/index.js';
import { hexToOklch, oklch, contrast, wcag, describe, namedColor, COLOR_WORDS, shade, readableOn, hexToRgb } from './design/color.js';
import { PAIRS, FONTS } from './design/type.js';

const NAMES = {
  coffee: ['Blue Bean', 'Crema & Co', 'Morning Ritual', 'Roast Nine', 'Bean There'], cafe: ['Little Fika', 'Corner Cup', 'Sunday Café'], bakery: ['Crumb', 'Golden Loaf', 'Flour Hour'], restaurant: ['Olive & Salt', 'Table 67', 'Ember'],
  tech: ['Nimbus', 'Vector Labs', 'Quanta', 'Byteforge'], software: ['Stackwise', 'Codeleaf', 'Shipyard'], ai: ['Neuron', 'Synapse', 'Mindful AI', 'Cortex'], startup: ['Launchpad', 'Kite', 'Northstar'], app: ['Pocket', 'Loop', 'Tapster'],
  finance: ['Ledger', 'Cornerstone', 'Clearwater Capital'], law: ['Harlow & Reed', 'Sterling Law'], health: ['Vital', 'Pulse Clinic'], wellness: ['Still', 'Breathe'], yoga: ['Lotus Room', 'Flow Studio'], fitness: ['Ironclad', 'Kinetic'],
  fashion: ['Maison Lior', 'Atelier Nove', 'Thread & Co'], beauty: ['Glow', 'Bloom Beauty'], jewelry: ['Aurum', 'Lune'], architecture: ['Atelier Nord', 'Form & Void', 'Studio Plan'], interior: ['Casa Calma', 'Nook'],
  eco: ['Terra Verde', 'Greenloop'], garden: ['Bloom', 'Wild Root'], pet: ['Pawsome', 'Good Boy Co'], kids: ['Little Stars', 'Kiddo'], music: ['Soundwave', 'Vinyl Club'], travel: ['Wanderlust', 'Far & Away'], surf: ['Swell', 'Saltwater'],
  gaming: ['Pixelforge', 'Level Up'], agency: ['Studio Nine', 'Bold Type'], books: ['Paper Moon', 'Inkwell'], realestate: ['Keystone Homes', 'Haven'],
};
const DEFAULT_NAMES = ['Studio Nine', 'Northwind', 'Lumen', 'Kite & Co', 'Fable', 'Orbit', 'Juniper', 'Atlas'];
const pick = (a, seed) => a[Math.abs(seed) % a.length];

const STYLE_KEY = { logo: 'logoStyle', poster: 'posterStyle', pattern: 'patternStyle', facade: 'facadeStyle', floorplan: 'planStyle', ui: 'uiStyle' };
const NEEDS_NAME = ['logo', 'identity', 'card', 'poster', 'ui'];

const LINES = {
  logo: ['Buzzing over to the easel…', 'Rubbing my front legs together — I have an idea.', 'Logo time. Compound eyes: focused.'],
  identity: ['A whole identity? My favourite kind of flight.', 'Laying out the brand board…'],
  palette: ['Tasting colours with my feet (flies can do that)…', 'Mixing pigments…'],
  typography: ['Flipping through my type specimens…', 'Kerning with six legs is easier than you think.'],
  poster: ['Poster incoming — stand three metres back.', 'Pinning a fresh sheet to the board…'],
  card: ['Business cards: small canvas, big impression.', 'Setting the card grid…'],
  pattern: ['Tiling… tiling… tiling…', 'Making it seamless — no fly-shaped gaps.'],
  floorplan: ['Pulling out the scale ruler…', 'Zoning first, walls second.'],
  facade: ['Sketching the street elevation…', 'Counting floors with all 4,000 ommatidia.'],
  fashion: ['Drafting the flat — symmetry first.', 'Measuring twice, cutting never (I have no scissors).'],
  product: ['Marker out. Construction lines first.', 'Sketchbook open…'],
  ui: ['Wireframing in my head, painting pixels on the board…', 'Thumb zone: respected.'],
  moodboard: ['Collecting textures and light…', 'Pinning references to the board…'],
  painting: ['Setting up a canvas — let me look properly first…', 'Squeezing out the paints…', 'Brushes ready. Don’t move.'],
  drawing: ['Pencil sharpened. Let me try…', 'Drawing from memory — a fly’s memory, so bear with me…', 'Hold still, I’m sketching.'],
};

const CHIPS = {
  logo: ['Another one', 'Evolve my own mark', 'Make it darker', 'Hand-drawn version', 'Business card for it', 'Full brand identity'],
  identity: ['Another direction', 'Warmer colours', 'Poster for it', 'Landing page for it'],
  palette: ['Another palette', 'Darker', 'Complementary', 'Type pairing to match'],
  typography: ['Another pairing', 'Serif', 'Rounded', 'Poster with these fonts'],
  poster: ['Another style', 'Swiss style', 'Brutalist', 'Minimal', 'Hand-drawn'],
  card: ['Another one', 'Dark version', 'Full brand identity'],
  pattern: ['Another pattern', 'Terrazzo', 'Memphis', 'Warmer'],
  floorplan: ['Another layout', 'Blueprint style', 'Add a bedroom', 'Bigger', 'Hand-drawn'],
  facade: ['Another façade', 'Taller', 'Brutalist', 'Scandinavian', 'Hand-drawn'],
  fashion: ['Another colourway', 'Graphic print', 'Stripes', 'Hoodie instead', 'Hand-drawn'],
  product: ['Another one', 'A lamp', 'A chair', 'Blue'],
  ui: ['Another one', 'Wireframe', 'Dashboard', 'Landing page', 'Dark mode'],
  moodboard: ['Another one', 'Luxury', 'Scandinavian', 'Palette from it'],
  painting: ['Paint another view', 'Practise painting', 'Imagine a painting', 'Научу тебя рисовать кота'],
  drawing: ['Draw another one', 'Make it darker', 'Draw a cat on the moon', 'Нарисуй ракету'],
};

const BRAND = new Set(['logo', 'identity', 'card', 'poster', 'ui', 'palette', 'typography', 'pattern', 'moodboard']);
function buildCreateSpec(kind, ex, last) {
  const s = { kind };
  const newBrand = ex.name || ex.industry;
  if (last && !newBrand && BRAND.has(kind) && BRAND.has(last.kind)) for (const k of ['name', 'industry', 'tagline', 'moods', 'colors', 'pair', 'dark', ...(last.mark === 'genome' && ['logo', 'identity', 'card', 'poster', 'ui'].includes(kind) ? ['mark', 'genome', 'evo'] : [])]) if (last[k] !== undefined && s[k] === undefined) s[k] = last[k];
  if ((ex.moods || ex.colors || ex.harmony) && s.kind === 'palette') { delete s.colors; delete s.moods; }
  for (const k of ['name', 'tagline', 'industry', 'moods', 'colors', 'dark', 'sketch', 'typeStyle', 'mark', 'bedrooms', 'floors', 'area', 'planType', 'garment', 'print', 'product', 'screen', 'harmony', 'date', 'hand', 'subject', 'caption', 'lang', 'scene']) if (ex[k] !== undefined) s[k] = ex[k];
  if (ex.typeStyle) delete s.pair;
  const st = ex[STYLE_KEY[kind]];
  if (st) s.style = st;
  if (kind === 'fashion' && ex.garment) s.garment = ex.garment;
  if (kind === 'typography' && ex.font) { const p = PAIRS.find((x) => x.head[0] === ex.font || x.body[0] === ex.font); if (p) s.pair = p.id; }
  s.seed = Math.floor(Math.random() * 1e6);
  if (NEEDS_NAME.includes(kind) && !s.name) s.name = pick(NAMES[s.industry] || DEFAULT_NAMES, s.seed);
  if (kind === 'floorplan' && !s.planType && s.industry === 'coffee') s.planType = 'cafe';
  return normalize(s);
}

// ------------------------------------------------------------------ calculators
const swatch = (hex) => `[[${hex}]]`;
function colorIn(text) {
  const hex = text.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
  if (hex) return '#' + hex[1].toLowerCase();
  const w = text.toLowerCase().split(/[^a-z]+/).find((x) => COLOR_WORDS.includes(x));
  return w ? namedColor(w) : null;
}
function harmonyAnswer(hex) {
  const [L, C, H] = hexToOklch(hex);
  const c = Math.max(C, 0.08);
  const set = (name, hs) => `**${name}** ${hs.map((h) => swatch(oklch(L, c, H + h))).join(' ')}`;
  return [`${swatch(hex)} **${hex}** is a ${describe(hex)}. Colours that work with it:`,
    set('Complementary', [0, 180]), set('Analogous', [-30, 0, 30]), set('Split-complementary', [0, 150, 210]), set('Triadic', [0, 120, 240]),
    `**Neutrals** ${swatch(oklch(0.18, Math.min(0.03, c * 0.3), H))} ${swatch(oklch(0.97, 0.01, H))} ${swatch(oklch(0.6, 0.02, H))}`,
    `For text on it use ${swatch(readableOn(hex))} ${readableOn(hex)} (${contrast(hex, readableOn(hex)).toFixed(1)} : 1).`].join('\n');
}
function contrastAnswer(a, b) {
  const r = contrast(a, b), g = wcag(r);
  let fix = '';
  if (r < 4.5) {
    const [L] = hexToOklch(a), [Lb] = hexToOklch(b);
    let x = a; for (let i = 0; i < 40 && contrast(x, b) < 4.5; i++) x = shade(x, L > Lb ? 0.02 : -0.02);
    fix = `\nTo pass AA, nudge the text to ${swatch(x)} **${x}** (${contrast(x, b).toFixed(2)} : 1).`;
  }
  return `${swatch(a)} on ${swatch(b)} → **${r.toFixed(2)} : 1** — ${g === 'fail' ? '**fails** WCAG' : g === 'AA large' ? 'passes only for **large text** (AA large)' : `passes **${g}**`}.\nBody text needs 4.5 : 1, large text 3 : 1, AAA 7 : 1.${fix}`;
}
const PAPER = { a0: [841, 1189], a1: [594, 841], a2: [420, 594], a3: [297, 420], a4: [210, 297], a5: [148, 210], a6: [105, 148], letter: [215.9, 279.4], legal: [215.9, 355.6], tabloid: [279.4, 431.8], 'business card': [85, 55] };
const SOCIAL = [['instagram post', '1080 × 1350 (4 : 5) or 1080 × 1080'], ['instagram story', '1080 × 1920 (9 : 16)'], ['reel', '1080 × 1920'], ['tiktok', '1080 × 1920'], ['youtube thumbnail', '1280 × 720 (16 : 9)'], ['youtube banner', '2560 × 1440, safe area 1546 × 423'], ['twitter header', '1500 × 500'], ['x header', '1500 × 500'], ['linkedin banner', '1584 × 396'], ['facebook cover', '851 × 315'], ['favicon', '32 × 32 + 180 × 180 (Apple) + 512 × 512 (PWA)'], ['app icon', '1024 × 1024 master; iOS masks the corners'], ['og image', '1200 × 630']];

function calculators(text) {
  const low = text.toLowerCase();
  const hexes = [...text.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)].map((m) => '#' + m[1].toLowerCase());
  if (hexes.length >= 2 && /contrast|readable|legible|accessib|wcag|pass|on\b/.test(low)) return { text: contrastAnswer(hexes[0], hexes[1]), chips: ['Palette from ' + hexes[1], 'What is WCAG?'] };
  const col = colorIn(text);
  if (col && /(go(es)? (well )?with|pairs? (well )?with|match(es)?\b|complements? |colou?rs? (that|to go)|what colou?rs?|сочета|подходит к|подойд)/.test(low)) return { text: harmonyAnswer(col), chips: [`Make a palette from ${col}`, `Logo in ${col}`] };
  const fam = Object.keys(FONTS).find((f) => low.includes(f.toLowerCase()));
  if (fam && /(pair|go(es)? with|match|combine|partner|body font|heading font|with)/.test(low)) {
    const ps = PAIRS.filter((p) => p.head[0] === fam || p.body[0] === fam);
    const cat = FONTS[fam].cat;
    const alt = ps.length ? ps.map((p) => `**${p.head[0]}** + **${p.body[0]}** — ${p.why}`).join('\n') : `${fam} is a ${cat}. Pair it with a ${cat === 'serif' ? 'clean sans like **Inter** or **Manrope**' : cat === 'monospace' ? 'grotesk like **Space Grotesk**' : 'text serif like **Lora** or **Source Serif 4**, or a neutral sans like **Inter**'} — contrast in structure, similar proportions.`;
    return { text: `Good partners for **${fam}**:\n${alt}`, chips: [`Type pairing with ${fam}`] };
  }
  const tsc = low.match(/type ?scale|modular scale/);
  if (tsc) {
    const base = +(low.match(/(\d{1,2})\s*px/)?.[1] || 16), ratio = +(low.match(/\b(1\.\d{1,3})\b/)?.[1] || 1.25);
    const rows = ['h1', 'h2', 'h3', 'h4', 'body', 'small'].map((n2, i) => `${n2.padEnd(5)} ${(base * ratio ** (4 - i)).toFixed(1)} px`);
    return { text: `Type scale, base ${base} px × ${ratio}:\n\`\`\`\n${rows.join('\n')}\n\`\`\`\nRound to whole pixels in production.`, chips: ['Type pairing specimen'] };
  }
  const paper = Object.keys(PAPER).find((p) => new RegExp(`\\b${p}\\b`).test(low));
  if (paper && /(dpi|pixel|px|size|resolution|how big|dimension)/.test(low)) {
    const dpi = +(low.match(/(\d{2,4})\s*dpi/)?.[1] || 300);
    const [w, h] = PAPER[paper], px = (mm) => Math.round((mm / 25.4) * dpi);
    return { text: `**${paper.toUpperCase()}** = ${w} × ${h} mm (${(w / 25.4).toFixed(2)} × ${(h / 25.4).toFixed(2)} in).\nAt **${dpi} dpi**: **${px(w)} × ${px(h)} px**. With 3 mm bleed: ${px(w + 6)} × ${px(h + 6)} px.`, chips: ['Print checklist'] };
  }
  const soc = SOCIAL.find(([k]) => low.includes(k));
  if (soc && /(size|dimension|resolution|px|pixels|how big|format)/.test(low)) return { text: `**${soc[0]}**: ${soc[1]} px.`, chips: ['Poster', 'Palette'] };
  return null;
}

// Russian questions reach the English knowledge base through a small keyword bridge
const RU_EN = [[/шрифт/, 'font pairing'], [/типографи/, 'typography hierarchy'], [/кернинг|трекинг|интерлиньяж/, 'kerning'], [/засеч/, 'serif'], [/логотип|лого\b/, 'logo'], [/хорош\S* логотип|каким должен быть логотип/, 'good logo'], [/вид\S* логотип|тип\S* логотип/, 'types of logo'],
  [/айдентик|брендинг|фирменн/, 'brand identity'], [/названи/, 'naming'], [/цвет|палитр/, 'choose colors'], [/сочета/, 'color theory'], [/контраст|доступност|читаем/, 'contrast'], [/печат|блид|вылет|dpi/, 'print'], [/формат файл|svg|png/, 'file format'],
  [/сетк/, 'grid'], [/композиц|баланс/, 'composition'], [/пуст\S* мест|воздух/, 'white space'], [/интерфейс|ui|ux|юзабил/, 'ui design'], [/лендинг|посадочн/, 'landing page'], [/т[её]мн\S* тем/, 'dark mode'], [/дизайн.систем/, 'design system'], [/иконк/, 'icons'],
  [/визитк/, 'business card'], [/постер|плакат|афиш/, 'poster design'], [/архитектур/, 'architecture'], [/планировк|план квартир|план дом/, 'floor plan'], [/размер\S* комнат|площад|высот\S* потолк|ширин\S* двер/, 'room size'], [/фасад/, 'facade'],
  [/интерьер|обустро|ремонт/, 'interior design'], [/освещен|свет(?!л)|ламп/, 'lighting'], [/стил\S* интерьер|скандинав|джапанди|лофт/, 'interior style'], [/мод[аы]|одежд|коллекц/, 'fashion design'], [/техпак|тех.пак|лекал/, 'tech pack'], [/ткан/, 'fabric'],
  [/образ|гардероб|что надеть/, 'outfit'], [/предметн|промышленн/, 'product design'], [/упаковк|этикет/, 'packaging'], [/портфолио/, 'portfolio'], [/сколько брать|цен[аы] на|ставк/, 'pricing'], [/вдохновен|ступор/, 'inspiration'], [/программ|figma|фигм/, 'design tools'], [/баухаус|модерн|истори/, 'design history'], [/тренд/, 'trends'], [/кто ты|ты кто/, 'who are you']];
function ruToEn(text) {
  if (!/[а-яё]/i.test(text)) return text;
  const low = text.toLowerCase();
  return text + ' ' + RU_EN.filter(([re]) => re.test(low)).map(([, en]) => en).join(' ');
}

// ------------------------------------------------------------------ the muse: ideas found around the studio
const IDEAS = {
  lamp: [() => `Draw a ${pick(['fly', 'bird', 'rocket'], rnd())} flying to the moon`, () => `swiss poster "${pick(['Night Shift', 'Afterglow', 'Slow Light', 'Moth Club', 'Golden Hour'], rnd())}"`, () => 'palette inspired by sunset', () => `gradient poster "${pick(['Afterglow', 'Warm Static', 'Lumen'], rnd())}"`, () => 'Sketch a lamp'],
  cup: [() => `stripes pattern in ${pick(['mustard', 'cobalt', 'coral', 'sage'], rnd())}`, () => `wordmark logo for a stationery shop called ${pick(['Graphite', 'HB Studio', 'Sharp & Co'], rnd())}`, () => 'Hoodie with stripes'],
  mug: [() => 'Draw a cup of coffee and a croissant', () => `emblem logo for a coffee shop called ${pick(['Crema', 'Night Owl Roasters', 'Second Cup', 'Bean Here'], rnd())}`, () => 'Sketch a mug', () => 'floor plan for a small cafe', () => 'palette inspired by coffee'],
  fan: [() => `${pick(['triadic', 'complementary', 'analogous', 'split'], rnd())} palette in ${pick(['coral', 'teal', 'mustard', 'lavender', 'sage', 'cobalt'], rnd())}`, () => `memphis pattern in ${pick(['pink', 'mint', 'yellow'], rnd())}`, () => 'candy palette'],
  notes: [() => `bauhaus poster "${pick(['To Do', 'Open Studio', 'Notes to Self', 'Sticky Ideas'], rnd())}"`, () => `brutalist poster "${pick(['Deadline', 'Draft 67', 'Post-it'], rnd())}"`, () => 'japandi interior mood board'],
  ruler: [() => `${pick(['2', '3'], rnd())} bedroom apartment floor plan, blueprint`, () => `${pick(['modern', 'scandinavian', 'brutalist'], rnd())} facade with ${pick(['3', '4', '6'], rnd())} floors`, () => 'swiss poster "Grid Systems"', () => 'dashboard wireframe'],
  wild: [() => `Draw a ${pick(['cat', 'snail', 'robot', 'rocket', 'mushroom', 'fish'], rnd())} looking at the stars`, () => `Evolve a logo for ${pick(['Swell', 'Moth & Lamp', 'Paper Plane', 'Nordlys'], rnd())}`, () => `dress with a leaves print`, () => 'Sketch a ceramic vase', () => `brand identity for a ${pick(['plant shop called Fern', 'record shop called Side B', 'bakery called Crumb', 'surf school called Swell'], rnd())}`],
};
const rnd = () => Math.floor(Math.random() * 1e6);
/** route: [{ k, what }] — the last stop is where the idea struck */
export function museIdea(route = []) {
  const last = route[route.length - 1]?.k || 'wild';
  const pool = [...(IDEAS[last] || IDEAS.wild), ...(Math.random() < 0.25 ? IDEAS.wild : [])];
  const prompt = pick(pool, rnd())();
  const where = route.length ? route[route.length - 1].what : 'nowhere in particular';
  const seen = route.slice(0, -1).map((r) => r.what);
  const text = `✦ **Found it!** ${!route.length ? 'An idea just landed on me:' : `${seen.length ? `I checked ${seen.join(' and ')} — nothing. Then ` : ''}${seen.length ? where : where.replace(/^./, (c) => c.toUpperCase())} gave me an idea:`}\n**${prompt.replace(/^./, (c) => c.toUpperCase())}**\nShall I draw it?`;
  return { text, prompt, chips: ['Draw this idea', 'Another idea'] };
}

// ------------------------------------------------------------------ main
export function respond(text, state = {}) {
  const last = state.last || null;
  const it = parse(text, last);
  const seed = Math.floor(Math.random() * 1e6);
  if (it.type !== 'create' || !/\b(make|create|design|draw|sketch|generate)\b/i.test(text)) { const calc = calculators(text); if (calc) return { ...calc, mood: 'talk' }; }
  if (it.type === 'brain') return { text: `This is my head. **121 neurons, 2,353 synapses** — an 8×8 retina in the optic lobes, 20 design senses in the antennal lobes, a memory layer in the mushroom bodies, a judgement ring in the central complex and one **taste neuron** at the bottom. Hover a neuron to see what it does; watch it fire when I look at a mark and flash where I learn.`, view: 'brain', mood: 'talk', chips: ['Evolve a logo with me', 'Dream for a minute', 'Back to the studio'] };
  if (it.type === 'practice') return { text: /[а-яё]/i.test(text) ? 'Иду тренироваться: посмотрю вокруг и буду пробовать писать то, что вижу. Каждая попытка учит мою руку — смотри, как уменьшается ошибка.' : `Off to practise: I'll look around the studio and try to paint what I see. Every attempt trains my hand network — watch the error go down.`, practice: true, mood: 'think' };
  if (it.type === 'teach') {
    const ru = /[а-яё]/i.test(text), id = subjectsIn(it.label)[0], name = id ? (ru ? RU_NAME[id] : id) : it.label.toLowerCase();
    return { text: ru ? `Покажи мне, как выглядит «${name}»: нарисуй в окошке или пришли фото со словами «это ${name}».` : `Show me what a “${name}” looks like: draw it in the pad, or send a photo saying “this is a ${name}”.`, teach: id || it.label.toLowerCase(), teachName: name, mood: 'talk' };
  }
  if (it.type === 'dream') return { text: `Going to dream for a minute: I'll breed marks on my own and judge them with my current taste. My taste only changes when **you** rate things — dreaming improves the *designs*, not the judge.`, dream: true, mood: 'think', chips: ['Show your brain', 'Evolve a logo with me'] };
  if (it.type === 'evolve') {
    const ex = it.spec || {};
    const brand = normalize({ kind: 'logo', name: ex.name || last?.name || pick(NAMES[ex.industry || last?.industry] || DEFAULT_NAMES, seed), industry: ex.industry || (ex.name ? undefined : last?.industry), colors: ex.colors?.length ? ex.colors : ex.name || ex.industry ? undefined : last?.colors, moods: ex.moods?.length ? ex.moods : undefined, seed });
    return { text: `No templates this time — I'll **evolve** a mark from raw shapes for **${brand.name}**. Tap ♥ on the ones you like and ✕ on the ones you don't, then **Breed**. Every round my critic network learns your taste and the next generation grows from your favourites. Hover a mark to watch my neurons judge it.`, evolve: brand, mood: 'think', chips: ['Show your brain', 'Dream for a minute'] };
  }
  if (it.type === 'explain' && last) {
    const d = generateDesign(last);
    return { text: `Here's my thinking on the ${KINDS[last.kind]?.label.toLowerCase() || 'design'}:\n${d.notes}\nIf something feels off, tell me what — *"darker"*, *"simpler"*, *"serif"*, *"another one"* — and I'll adjust.`, mood: 'talk', chips: CHIPS[last.kind] };
  }
  if (it.type === 'muse') return { text: pick(['Hold on — I need to find my muse. Back in a few wingbeats…', 'Let me fly around the studio and look for inspiration…', 'Inspiration is never on the desk. Let me look around…'], seed), muse: true, mood: 'think' };
  if (it.type === 'greet' && /[а-яё]/i.test(text)) return { text: `Hi! I'm the **Designfly** — a fruit fly who designs. I speak English, but I understand Russian requests: *«создай логотип пекарни Колобок»*, *«план 2-комнатной квартиры»*, *«сделай темнее»*. Ask me about design or ask me to draw something.`, mood: 'talk', chips: ['Логотип для кофейни «Синий Боб»', 'Научись рисовать', 'Напиши автопортрет', 'Сам придумай логотип без шаблонов', 'Покажи мозг', 'What makes a good logo?'] };
  if (it.type === 'greet') return { text: `Hi! I'm the **Designfly** — a fruit fly with strong opinions about kerning. Ask me anything about design, or ask me to make something: a logo, palette, poster, floor plan, fashion flat, product sketch, UI…`, mood: 'talk', chips: ['Logo for a coffee shop called Blue Bean', 'Draw a cat looking at the moon', 'Practise painting', 'Paint a self-portrait', 'Evolve a logo without templates', 'Inspire me', 'Show your brain', '2-bedroom apartment floor plan', 'What makes a good logo?'] };
  if (it.type === 'thanks') return { text: pick(['Happy to help — buzz me any time.', 'My pleasure. Want a variation?', 'Glad you like it! Download it from the card below the drawing.'], seed), mood: 'happy', chips: last ? CHIPS[last.kind] : [] };
  if (it.type === 'help') return { text: helpText(), mood: 'talk', chips: ['Brand identity for a surf school called Swell', 'Swiss poster "Form & Void"', 'Hoodie flat with a graphic print', 'Sketch a ceramic vase'] };
  if (it.type === 'create') {
    let kind = it.kind;
    if (!kind) {                         // "make something for my bakery" → logo; "make it for a house" → facade
      kind = it.spec.planType || it.spec.bedrooms ? 'floorplan' : it.spec.garment ? 'fashion' : it.spec.product ? 'product' : it.spec.screen ? 'ui' : last ? last.kind : 'logo';
    }
    const spec = buildCreateSpec(kind, it.spec, last);
    return { text: `${pick(LINES[kind], seed)}`, specs: [spec], mood: 'draw', chips: CHIPS[kind] };
  }
  if (it.type === 'modify' && last) {
    const { spec, notes } = applyModifiers(text, last);
    if ((last.kind === 'drawing' || last.kind === 'painting') && spec.hand === false) return { text: `There's no template for a ${last.kind} — I always do those by hand. Want another one?`, mood: 'talk', chips: CHIPS[last.kind] };
    return { text: `On it — ${notes.join(', ')}.`, specs: [normalize({ ...spec, kind: last.kind })], variation: notes.includes('new variation') && spec.mark === 'genome', mood: 'draw', chips: CHIPS[last.kind] };
  }
  // advice
  const calc = calculators(text);
  if (calc) return { ...calc, mood: 'talk' };
  const hits = searchKB(ruToEn(text));
  if (hits.length && hits[0].s >= 2) {
    const e = hits[0].e;
    const rel = [...(e.see || []).map(byId).filter(Boolean), ...hits.slice(1).map((h) => h.e)].filter((x, i, a) => x.id !== e.id && a.findIndex((y) => y.id === x.id) === i).slice(0, 2);
    const chips = [...rel.map((x) => x.k[0][0].toUpperCase() + x.k[0].slice(1)), ...(it.kind ? [`Make a ${KINDS[it.kind].label.toLowerCase()}`] : [])];
    return { text: e.a, mood: 'talk', chips };
  }
  if (it.kind === 'drawing') { const sub = it.spec.subject?.[0]; return { text: `The best lesson is watching: I'll draw it slowly on the board — first the outline in one confident line, then details, then colour. Construction lines help: start from simple shapes (circles, boxes), then refine.`, mood: 'talk', chips: [sub ? `Draw a ${sub}` : 'Draw a cat', 'Draw a rocket', 'Draw a cat on the moon'] }; }
  if (it.kind) return { text: `Want me to draw one? Give me a name and what it's for — e.g. *"${KINDS[it.kind].label.toLowerCase()} for a bakery called Crumb"*. Or ask me how to design one.`, mood: 'talk', chips: [`Make a ${KINDS[it.kind].label.toLowerCase()}`, `Tips for a ${KINDS[it.kind].label.toLowerCase()}`] };
  return { text: `Hmm, my offline brain doesn't have a sharp answer for that one. I'm best at graphic design, branding, colour, type, UI, architecture, interiors, fashion and product design — and at drawing things. For open-ended chat, plug an AI model into **Settings** and I'll think with it.`, mood: 'think', chips: ['What can you do?', 'Colour theory', 'Font pairing tips', 'Make me a logo'] };
}

export function helpText() {
  return `Things I can **make** (all downloadable as SVG + PNG, some with a ZIP of extra files):
${Object.values(KINDS).map((k) => `- **${k.label}** — ${k.about}`).join('\n')}

Talk to me like a designer: *"logo for a coffee shop called Blue Bean, warm and minimal"*, then *"make it darker"*, *"another one"*, *"hand-drawn"*, *"now a business card"*.
Logos, posters, cards, patterns and drawings I **draw myself, stroke by stroke** (crooked but mine — 👍 / 👎 teaches my hand); say *"template version"* for the clean engine. Ask me to *"draw a cat looking at the moon"* or *«нарисуй ракету»*.
I also **paint** — with my own neural network: a hand that decides every brush stroke and an eye that remembers and imagines. A newborn brain only scribbles; it learns by practising (*"practise painting"*, *«научись рисовать»*), and you can **teach** it things (*«научу тебя рисовать кота»* opens a drawing pad, or send a photo with *«это кот»*). Then: *"paint the studio"*, *«напиши автопортрет»*, *"imagine a painting"*, *«нарисуй кота»*.
I also **answer**: colour theory, contrast checks (*"#777 on #fff"*), what goes with a colour, font pairing, type scales, print sizes, social sizes, UI/UX, floor plans and room sizes, interiors, fashion, product design, portfolio and pricing.
Drop an **image** and I'll critique it.`;
}

// ------------------------------------------------------------------ image critique (analysis done in critique.js)
export function critiqueText(a) {
  const out = [`I looked at your image with all 8,000 ommatidia. Here's what I see:`];
  out.push(`**Palette** ${a.palette.slice(0, 6).map((p) => swatch(p.hex)).join(' ')} — ${a.palette.length} main colours${a.palette.length > 5 ? ', which is a lot; try limiting to 3 + neutrals' : ''}.`);
  const [dark, light] = [a.darkest, a.lightest];
  const cr = contrast(dark, light);
  out.push(`**Contrast** between the darkest and lightest areas: ${cr.toFixed(1)} : 1${cr < 4.5 ? ' — low. Text in this image may be hard to read; push the darks darker or the lights lighter.' : cr > 15 ? ' — very punchy. Good for impact, tiring for long reading.' : ' — healthy.'}`);
  out.push(`**Brightness** ${Math.round(a.brightness * 100)}%${a.brightness < 0.25 ? ' — a dark, moody piece.' : a.brightness > 0.8 ? ' — very light and airy.' : '.'} **Saturation** ${Math.round(a.saturation * 100)}%${a.saturation > 0.6 ? ' — vivid; make sure one colour leads.' : a.saturation < 0.12 ? ' — nearly monochrome; a single accent colour would add a focal point.' : '.'}`);
  out.push(`**Busyness** ${a.busy > 0.22 ? 'high — lots of edges and detail. Consider more empty space around the key element.' : a.busy < 0.06 ? 'very low — calm and minimal; check there is a clear focal point.' : 'balanced.'}`);
  out.push(`**Whitespace** ≈ ${Math.round(a.space * 100)}% of the canvas is near the background colour${a.space < 0.25 ? ' — it feels crowded; aim for 30–50%.' : a.space > 0.75 ? ' — very spacious; make sure the content is big enough.' : '.'}`);
  out.push(`**Balance** the visual weight sits ${a.cx < 0.42 ? 'left' : a.cx > 0.58 ? 'right' : 'centred'} and ${a.cy < 0.42 ? 'high' : a.cy > 0.58 ? 'low' : 'in the middle'}${Math.abs(a.cx - 0.5) > 0.12 ? ' — fine if it is intentional asymmetry; otherwise counterweight the other side.' : '.'}`);
  out.push(`Format: ${a.w} × ${a.h} px (${a.ratio}).`);
  out.push(`Want me to build a proper palette from these colours?`);
  return out.join('\n');
}
