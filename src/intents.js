// Natural-language → intent. Deliberately rule-based: it runs offline, instantly, and every
// decision is explainable. (With an API key the app hands the conversation to an LLM instead.)
import { COLOR_WORDS, namedColor, MOODS, industryOf } from './design/color.js';
import { PATTERNS } from './design/pattern.js';
import { POSTER_STYLES } from './design/brand.js';
import { FACADE_STYLES } from './design/facade.js';
import { FONTS } from './design/type.js';
import { subjectsIn } from './hand/concepts.js';

const KIND_WORDS = [
  ['identity', /\b(brand(ing)? (identity|kit|board|system|guide(lines)?|book)|visual identity|identity|branding|brand kit)\b|айдентик|брендинг|фирменн/i],
  ['card', /\b(business ?cards?|visiting cards?|name cards?)\b|визитк/i],
  ['palette', /\b(colou?r ?(palette|scheme|combination|combo)s?|palettes?|colou?rs? for|swatch(es)?)\b|палитр|цветов(ая|ую) (гамм|схем)/i],
  ['typography', /\b(font ?pair(ing)?s?|type ?pair(ing)?s?|typography|typefaces?|fonts? (for|combination|pair)|type specimen)\b|шрифт/i],
  ['poster', /\b(posters?|flyers?|placards?|gig poster|event poster)\b|постер|плакат|афиш/i],
  ['pattern', /\b(patterns?|seamless|textures? tile|wallpaper tile|print pattern)\b|паттерн|узор/i],
  ['floorplan', /\b(floor ?plans?|floorplans?|apartment (plan|layout)|house plan|layout of (an? )?(apartment|flat|house|office|cafe)|plan of (an? )?(apartment|flat|house)|room layout|blueprint)\b|планировк|план\S*(\s+\S+){0,3}\s+(квартир|дом|офис|кафе|студи|коттедж)|однушк|двушк|тр[её]шк|чертеж|чертёж/i],
  ['facade', /\b(fa[cç]ades?|elevations?|building exterior|exterior of|(draw|design|sketch) (a |an )?(building|house|tower|skyscraper))\b|фасад|здани/i],
  ['fashion', /\b(t-?shirts?|tees?|hoodies?|sweatshirts?|dress(es)?|trousers|pants|jeans|skirts?|jackets?|bombers?|coats?|garments?|outfits?|clothing|apparel|tech ?pack|fashion (flat|sketch|design))\b|футболк|худи|плать|брюк|юбк|куртк|одежд/i],
  ['product', /\b(vases?|bottles?|mugs?|lamps?|chairs?|stools?|product (design|sketch)|industrial design|packaging)\b|ваз|бутылк|кружк|ламп|стул/i],
  ['ui', /\b(ui|ux|app (screens?|design|mockup|ui)|mobile app|landing ?page|website|web ?site|home ?page|dashboard|wireframes?|mock-?ups?|interface|screens?)\b|интерфейс|лендинг|сайт|дашборд|приложени/i],
  ['moodboard', /\b(mood ?boards?|inspiration board|interior (design|concept|style|board)|vibe board)\b|мудборд|мood/i],
  ['logo', /\b(logos?|logotypes?|logomarks?|marks?|emblems?|monograms?|wordmarks?|badges?|icons? for (my|a|an|the))\b|логотип|лого\b|эмблем/i],
  ['painting', /\b(paint(?!\s+(it|this|that|them|one|another)\b)(ing|ings|s)?|canvas|artwork|self[- ]?portrait|portrait|landscape|still life|abstract (art|painting|piece))\b|картин(?!к)|живопис|красками|маслом|акварел|пейзаж|натюрморт|портрет|абстракц/i],
  ['drawing', /\b(draw(?!\s+(it|this|that|them|one|another)\b)|drawing|doodle|illustration|sketch of|picture of)\b|нарис(?!уй\s+(его|её|ее|это|ещ))|рисун|рисова|иллюстрац|дудл|картинк/i],
];
const CREATE = /\b(make|create|design|draw|sketch|generate|build|craft|produce|render|come up with|give me|show me|i need|i want|we need|can you (do|make|design|draw|create)|could you|would you|let'?s (do|make)|paint|mock ?up|lay ?out)\b|сдела|нарису|созда|придума|набросa|набросай|разработ|покажи/i;
const QUESTION = /^(how|what|why|which|when|where|who|should|is|are|does|do|can i|could i|tips?|advice|explain|tell me|help me (choose|understand|pick)|difference|compare|best way|any tips)\b|\?$|^(как|что|какой|какая|какие|каким|почему|зачем|сколько|когда|где|можно ли|стоит ли|посоветуй|подскажи|объясни|расскажи|в чём|чем)(?=[\s,]|$)/i;
const MODIFY = /\b(make it|make this|make that|change|another|again|different|variation|variant|regenerate|reroll|try (again|another)|one more|more|less|instead|swap|switch|use|rename|call it|now|it|this one|redo|tweak|adjust|darker|lighter|bolder|brighter|warmer|cooler|bigger|smaller)\b|ещё|еще|друг(ой|ую|ие)|измени|поменяй|сделай (его|её|ее)|темнее|светлее|ярче|спокойнее|мягче|проще|смелее|теплее|холоднее|крупнее|больше|меньше|выше|ниже|круглее|добавь|убери|назови|от руки|скетч|\b(add|remove|fewer|extra|taller|shorter|wider|narrower|without|with|round(er|ed)?|soft(er)?|sharp(er)?|hand[- ]?drawn|sketch(y|ed)?|clean|serif|sans|bold|minimal|simpler|thicker|thinner|blueprint|wireframe)\b/i;

const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, single: 1, double: 2 };
const n = (s) => (NUM[s?.toLowerCase()] ?? parseInt(s, 10));

const MOOD_SYN = {
  modern: ['minimal', 'tech'], clean: ['minimal'], simple: ['minimal'], sleek: ['minimal', 'tech'], fun: ['playful'], funny: ['playful'], quirky: ['playful'], cute: ['candy', 'playful'], cheerful: ['playful', 'warm'],
  cozy: ['warm'], cosy: ['warm'], friendly: ['warm', 'playful'], premium: ['luxury'], 'high-end': ['luxury'], expensive: ['luxury'], classy: ['elegant'], sophisticated: ['elegant'], sustainable: ['eco'], green: ['eco'], organic: ['natural'],
  techy: ['tech'], digital: ['tech'], futurist: ['futuristic'], sci: ['futuristic'], nostalgic: ['retro'], '70s': ['retro'], '80s': ['neon', 'retro'], '90s': ['retro', 'playful'], rustic: ['earthy'], handmade: ['earthy'], artisan: ['earthy', 'warm'],
  professional: ['corporate'], serious: ['corporate'], trustworthy: ['trust'], reliable: ['trust'], relaxing: ['calm'], peaceful: ['serene'], zen: ['serene', 'japandi'], vibrant: ['energetic'], dynamic: ['energetic'], loud: ['bold'], strong: ['bold'],
  gloomy: ['moody'], mysterious: ['moody'], feminine: ['soft'], delicate: ['soft'], gentle: ['soft'], edgy: ['bold', 'dark'], punk: ['brutalist'], raw: ['brutalist'], nordic: ['scandinavian'], scandi: ['scandinavian'], summer: ['warm', 'fresh'], winter: ['cold'], spring: ['fresh', 'pastel'], autumn: ['earthy', 'warm'], fall: ['earthy', 'warm'], night: ['dark', 'neon'], beach: ['ocean', 'warm'], sea: ['ocean'], marine: ['ocean'], jungle: ['forest'], woods: ['forest'],
};
const MARK_SYN = { leaf: 'leaf', leaves: 'leaf', plant: 'leaf', mountain: 'mountain', mountains: 'mountain', peak: 'mountain', cup: 'cup', coffee: 'cup', bolt: 'bolt', lightning: 'bolt', heart: 'heart', wave: 'wave', waves: 'wave', sun: 'sun', sunset: 'sun', house: 'house', home: 'house', roof: 'house', paw: 'paw', drop: 'drop', water: 'drop', star: 'spark', spark: 'spark', sparkle: 'spark', planet: 'orbit', orbit: 'orbit', pixel: 'pixel', pixels: 'pixel', ring: 'rings', rings: 'rings', arrow: 'chevron', chevron: 'chevron', layers: 'layers', stack: 'layers', flower: 'petal', petals: 'petal', petal: 'petal', bubble: 'bubble', chat: 'bubble', play: 'play', grid: 'grid', geometric: 'bauhaus', bauhaus: 'bauhaus', letter: 'monogram', initials: 'monogram' };

export function extract(text) {
  const t = text.trim(), low = t.toLowerCase();
  const spec = {};
  // name: quotes, "called/named X", "for X" (capitalised)
  const q = t.match(/["“«']([^"”»']{2,40})["”»']/);
  const called = t.match(/\b(?:called|named|brand(?:ed)?|name(?:d)? is|for (?:the )?brand)\s+([A-Z0-9][\w&'.-]*(?:\s+(?:&\s+)?[A-Z0-9][\w&'.-]*){0,3})/);
  const forCap = t.match(/\bfor\s+([A-Z][\w&'.-]*(?:\s+(?:&\s+)?[A-Z][\w&'.-]*){0,3})/);
  // Russian: «под названием Колобок», «называется Колобок», or any capitalised word after the first one
  const ru = t.match(/(?:под названием|называется|с названием|название)\s+([\p{Lu}][\p{L}\d&'.-]*(?:\s+[\p{Lu}][\p{L}\d&'.-]*){0,3})/u)
    || t.match(/^\S+(?:\s+\S+)*?\s+([\p{Lu}][\p{Ll}\d'-]+(?:\s+[\p{Lu}][\p{Ll}\d'-]+){0,2})/u);
  const NOT_NAMES = new Set(['I', 'AI', 'UI', 'UX', 'Swiss', 'Bauhaus', 'Scandinavian', 'Japandi', 'Memphis', 'Art', 'Deco', 'June', 'July', 'May', 'March', 'April', 'January', 'February', 'August', 'September', 'October', 'November', 'December', 'Monday', 'Friday', 'Saturday', 'Sunday', 'Make', 'Create', 'Design', 'Draw', 'Logo', 'Poster', 'Hi', 'Please', 'Now', 'A', 'An', 'The', 'My', 'SVG', 'PNG']);
  const capRun = [...t.matchAll(/(?:^|\s)([A-Z][\w&'.-]*(?:\s+(?:&\s+)?[A-Z][\w&'.-]*){0,3})/g)].map((m) => m[1].split(/\s+/).filter((w) => !NOT_NAMES.has(w)).join(' ')).filter((x, i) => x && (i > 0 || !/^[A-Z][a-z]+$/.test(x) || x.split(' ').length > 1));
  const name = q?.[1] || called?.[1] || forCap?.[1] || (/[а-яё]/i.test(t) ? ru?.[1] : capRun.find((x) => !/^(I|A)$/.test(x)) || null);
  if (name && !/^(a|an|the|my|our|me|us|it|this)$/i.test(name)) spec.name = name.trim();
  const tag = t.match(/\b(?:tagline|slogan|motto)\s*(?:is|:)?\s*["“«']?([^"”»'\n.]{3,60})/i);
  if (tag) spec.tagline = tag[1].trim();
  // colours
  const hexes = [...t.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)].map((m) => '#' + m[1].toLowerCase());
  const words = low.replace(/[^a-z0-9#&\s'-]/g, ' ').split(/\s+/).filter(Boolean);
  const named = [];
  const nameWords = new Set((name || '').toLowerCase().split(/\s+/));
  words.forEach((w, i) => { if (COLOR_WORDS.includes(w) && !nameWords.has(w) && !industryOf(w) && !(w === 'green' && /\b(eco|sustainab)/.test(low)) && !['mode', 'shop', 'house', 'print'].includes(words[i + 1])) named.push(namedColor(w)); });
  const RU_COL = [[/красн/, 'red'], [/оранжев/, 'orange'], [/ж[её]лт/, 'yellow'], [/зел[её]н/, 'green'], [/голуб/, 'sky'], [/бирюз/, 'turquoise'], [/син/, 'blue'], [/фиолет/, 'purple'], [/розов/, 'pink'], [/ч[её]рн/, 'black'], [/бел(ый|ая|ое|ым|ую|ом)/, 'white'], [/сер(ый|ая|ое|ым|ую|ом)/, 'grey'], [/коричнев/, 'brown'], [/золот/, 'gold'], [/бежев/, 'beige'], [/бордов/, 'burgundy'], [/мятн/, 'mint'], [/лаванд/, 'lavender']];
  for (const [re, c] of RU_COL) if (re.test(low) && !(name && re.test(name.toLowerCase()))) named.push(namedColor(c));
  const colors = [...hexes, ...named];
  if (colors.length) spec.colors = [...new Set(colors)];
  // industry (single words + a few bigrams)
  const bigram = { 'barber shop': 'beauty', barbershop: 'beauty', 'coffee shop': 'coffee', 'real estate': 'realestate', 'law firm': 'law', 'hair salon': 'beauty', 'ice cream': 'food', 'pet shop': 'pet', 'yoga studio': 'yoga', 'tattoo studio': 'art', 'flower shop': 'garden', 'book store': 'books', 'record label': 'music', 'web agency': 'agency', 'design studio': 'agency', 'game studio': 'gaming' };
  for (const [b, ind] of Object.entries(bigram)) if (low.includes(b)) spec.industry = ind;
  const RU = [[/коф/, 'coffee'], [/пекарн|булочн/, 'bakery'], [/ресторан|кафе/, 'restaurant'], [/фитнес|спортзал/, 'fitness'], [/йог/, 'yoga'], [/салон|красот/, 'beauty'], [/архитект/, 'architecture'], [/стартап/, 'startup'], [/банк|финанс/, 'finance'], [/юрист|адвокат/, 'law'], [/клиник|медиц/, 'medical'], [/одежд|мод[аы]/, 'fashion'], [/цвет(ы|оч)|флорист/, 'garden'], [/музык/, 'music'], [/игр/, 'gaming'], [/детск/, 'kids'], [/путешеств|туризм/, 'travel'], [/эко/, 'eco'], [/чай/, 'tea'], [/техн|айти|it-/, 'tech'], [/барбер|парикмах/, 'beauty'], [/спальн|гостин|кухн|интерьер|квартир.*дизайн/, 'interior'], [/мебел/, 'furniture'], [/ювелир/, 'jewelry'], [/свадеб/, 'wedding'], [/зоо|питом|собак|кошк/, 'pet'], [/книж|библиот/, 'books'], [/стомат/, 'dental'], [/аптек/, 'pharmacy'], [/автосервис|авто/, 'auto'], [/строител|ремонт/, 'construction'], [/недвиж/, 'realestate'], [/отел|гостиниц/, 'hotel'], [/школ|курс|обучен/, 'education'], [/бар(?![бх])/, 'bar'], [/пицц/, 'pizza'], [/суши|роллы/, 'sushi'], [/спа(?=\s|$)|массаж/, 'spa'], [/фото/, 'photo'], [/агентств|студи(я|и) дизайн/, 'agency']];
  if (!spec.industry) for (const [re, ind] of RU) if (re.test(low)) { spec.industry = ind; break; }
  if (!spec.industry) for (const w of words) { const ind = industryOf(w); if (ind && !(spec.name && spec.name.toLowerCase().split(/\s+/).includes(w) && ind !== 'coffee')) { spec.industry = ind; break; } }
  // moods
  const moods = new Set();
  for (const w of words) { if (MOODS[w]) moods.add(w); if (MOOD_SYN[w]) MOOD_SYN[w].forEach((m) => moods.add(m)); }
  const RU_MOOD = [[/скандинав|сканди/, 'scandinavian'], [/минимал|лаконич|прост(ой|ая|ое)/, 'minimal'], [/лофт|индастриал|индустриал/, 'industrial'], [/японск|джапанди/, 'japandi'], [/уютн|т[её]пл/, 'warm'], [/т[её]мн(ый|ая|ое|ые|ом|ую)|мрачн/, 'dark'], [/ярк|сочн/, 'energetic'], [/пастел/, 'pastel'], [/роскош|люкс|премиальн|дорог/, 'luxury'], [/элегант/, 'elegant'], [/ретро|винтаж/, 'retro'], [/неон/, 'neon'], [/спокойн|нежн/, 'calm'], [/игрив|весел|детск/, 'playful'], [/строг|деловой|корпоратив/, 'corporate'], [/футурист|технолог/, 'futuristic'], [/природн|натуральн|эко/, 'natural'], [/брутал/, 'brutalist'], [/романтич/, 'romantic'], [/киберпанк/, 'cyberpunk']];
  for (const [re, m] of RU_MOOD) if (re.test(low)) moods.add(m);
  if (moods.size) spec.moods = [...moods].slice(0, 3);
  if (/\b(dark (mode|background|theme|version)|on black|night mode|dark)\b/.test(low) && !/\bdark (blue|green|red|brown|grey|gray)\b/.test(low)) spec.dark = true;
  if (/\b(light (mode|background|version)|on white)\b/.test(low)) spec.dark = false;
  if (/\b(sketch(y|ed)?|hand[- ]?drawn|pencil|rough|doodle|by hand|marker)\b|скетч|набросок|от руки|карандаш/.test(low)) spec.sketch = true;
  if (/\b(clean|vector|digital|crisp) (version|look|lines)\b/.test(low)) spec.sketch = false;
  // freehand engine vs templates
  if (/\b(without (a |any )?templates?|no templates?|not (a )?templates?|by hand|freehand|free[- ]hand|draw (it|one) (yourself|by hand)|by yourself|on your own|yourself)\b|без шаблон|не шаблон|от руки|сам(а|и)? нарису|своими руками|вручную/.test(low)) spec.hand = true;
  else if (/\b(templates?|template version|clean template|vector template)\b|шаблон/.test(low)) spec.hand = false;
  const subj = subjectsIn(t);
  if (subj.length) spec.subject = subj;
  const cap = t.match(/(?:\bdraw|\bdoodle|\bsketch of|\bpicture of|\bpaint(?:ing)? of|нарисуй|нарисовать|рисунок|картину|картина)\s+(?:me\s+|мне\s+)?(?:an?\s+|the\s+|some\s+|my\s+)?([^,.!?]{2,28})/i);
  if (cap && !/^(something|anything|что-нибудь|что-то|чего-нибудь|it|this|that|one|another|logo|логотип|его|её|ее|это|ещ|картин|portrait|автопортрет|студи|studio)/i.test(cap[1]) && !subjectsIn(cap[1].split(/\s+/)[0]).length) spec.caption = cap[1].trim();
  if (/[а-яё]/i.test(t)) spec.lang = 'ru';
  if (/\b(imagine|imagination|from your head|dream up|your own idea|out of your head)\b|придумай|воображ|из головы|фантаз/.test(low)) spec.scene = 'imagine';
  else if (/\b(self[- ]?portrait|yourself|your own face)\b|автопортрет|себя/.test(low)) spec.scene = 'self';
  else if (/\babstract|абстрак/.test(low)) spec.scene = 'abstract';
  else if (/\b(studio|room|from life|still life|what you see|around you)\b|студи|комнат|натур|натюрморт|вокруг/.test(low)) spec.scene = 'studio';
  // type style
  const ts = low.match(/\b(serif|sans[- ]?serif|sans|script|handwritten|mono(space)?|rounded|condensed|elegant|geometric)\b/);
  if (ts) spec.typeStyle = ts[1].startsWith('sans') ? 'sans' : ts[1].startsWith('mono') ? 'mono' : ts[1] === 'handwritten' ? 'script' : ts[1];
  // styles
  const logoStyle = low.match(/\b(wordmark|word mark|lettermark|monogram|emblem|badge|seal|combination|abstract)\b/);
  if (logoStyle) spec.logoStyle = { 'word mark': 'wordmark', lettermark: 'monogram', badge: 'emblem', seal: 'emblem' }[logoStyle[1]] || logoStyle[1];
  const pst = POSTER_STYLES.find((s) => new RegExp(`\\b${s}\\b`).test(low)) || (/\bswiss|international style\b/.test(low) ? 'swiss' : null) || (/\b(70s|seventies|vintage)\b/.test(low) ? 'retro' : null);
  if (pst) spec.posterStyle = pst;
  const pat = PATTERNS.find((p) => new RegExp(`\\b${p}\\b`).test(low)) || (/\bpolka\b/.test(low) ? 'dots' : /\bchevrons?\b/.test(low) ? 'zigzag' : /\bgingham|plaid|check(ed)?\b/.test(low) ? 'checker' : /\bstriped?\b/.test(low) ? 'stripes' : null);
  if (pat) spec.patternStyle = pat;
  const fst = FACADE_STYLES.find((s) => low.includes(s)) || (/\b(glass|skyscraper|high-?rise|office tower)\b/.test(low) ? 'tower' : /\b(nordic|scandi|cabin|cottage|gable)\b/.test(low) ? 'scandinavian' : /\b(concrete|soviet)\b/.test(low) ? 'brutalist' : /\b(neoclassical|haussmann|historic)\b/.test(low) ? 'classic' : null);
  if (fst) spec.facadeStyle = fst;
  if (/\bblue ?print\b/.test(low)) spec.planStyle = 'blueprint';
  // marks
  const mk = words.find((w) => MARK_SYN[w] && new RegExp(`\\b(with|featuring|using|of)\\s+(an?\\s+|the\\s+|some\\s+)?${w}\\b|\\b${w}\\s+(icon|symbol|mark|shape|motif)\\b`).test(low));
  if (mk) spec.mark = MARK_SYN[mk];
  // architecture numbers
  const bed = low.match(/\b(\d|one|two|three|four|five|single|double)[\s-]*(?:bed(?:room)?s?|br|bdr|room)\b/);
  if (bed) spec.bedrooms = n(bed[1]);
  const ruRooms = low.match(/(\d|одно|двух|тр[её]х|четыр[её]х|пяти)[\s-]*(?:комнатн|комнат|к(?=[\s.,]|$))/) || (/однушк/.test(low) ? [0, 'одно'] : /двушк/.test(low) ? [0, 'двух'] : /тр[её]шк/.test(low) ? [0, 'трех'] : null);
  if (ruRooms) { const k = { одно: 1, двух: 2, трех: 3, трёх: 3, четырех: 4, четырёх: 4, пяти: 5 }[ruRooms[1]] ?? +ruRooms[1]; if (k === 1) spec.bedrooms = 1; else spec.bedrooms = Math.max(1, k - 1); }
  const ruBed = low.match(/(\d|одн|дв|тр|четыр)\D{0,3}\s*спал/); if (ruBed) spec.bedrooms = { одн: 1, дв: 2, тр: 3, четыр: 4 }[ruBed[1]] ?? +ruBed[1];
  if (/студи[яюи]/.test(low) && /план|квартир/.test(low)) spec.planType = 'studio';
  else if (/(^|\s)дом|коттедж|дач[аиу]/.test(low) && /план/.test(low)) spec.planType = 'house';
  else if (/офис/.test(low)) spec.planType = 'office';
  else if (/кафе|кофейн|ресторан/.test(low) && /план/.test(low)) spec.planType = 'cafe';
  const ruFl = low.match(/(\d{1,2})[\s-]*(?:этаж)/); if (ruFl) spec.floors = +ruFl[1];
  const fl = low.match(/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)[\s-]*(?:floors?|stor(?:e)?y|stories|levels?)\b/);
  if (fl) spec.floors = n(fl[1]);
  const ar = low.match(/\b(\d{2,3})\s*(?:m2|m²|sqm|sq\.? ?m|square met(?:er|re)s?|кв)/);
  if (ar) spec.area = +ar[1];
  const ft = low.match(/\b(\d{3,4})\s*(?:sq\.? ?ft|square feet|sqft)/);
  if (ft) spec.area = Math.round(+ft[1] * 0.0929);
  const pt = low.match(/\b(studio|loft|house|home|villa|cottage|cabin|office|cafe|café|coffee shop|restaurant|bistro|apartment|flat|condo)\b/);
  if (pt) spec.planType = { loft: 'studio', home: 'house', villa: 'house', cottage: 'house', cabin: 'house', café: 'cafe', 'coffee shop': 'cafe', restaurant: 'cafe', bistro: 'cafe', flat: 'apartment', condo: 'apartment' }[pt[1]] || pt[1];
  // fashion / product / ui
  const gm = low.match(/\b(t-?shirts?|tees?|hoodies?|sweatshirts?|dress(?:es)?|trousers|pants|jeans|skirts?|jackets?|bombers?|coats?)\b|футболк|худи|плать|брюк|юбк|куртк/);
  if (gm) { const g0 = gm[0]; spec.garment = /t-?shirt|tee|футболк/.test(g0) ? 'tshirt' : /hood|sweat|худи/.test(g0) ? 'hoodie' : /dress|плать/.test(g0) ? 'dress' : /trouser|pant|jean|брюк/.test(g0) ? 'trousers' : /skirt|юбк/.test(g0) ? 'skirt' : 'jacket'; }
  const pr = low.match(/\b(graphic|print(?:ed)?|stripes?|striped|dots|polka|checke?r(?:ed)?|gingham|confetti|floral|leaves|plain|solid)\b/);
  if (pr) spec.print = { graphic: 'graphic', print: 'graphic', printed: 'graphic', stripe: 'stripes', stripes: 'stripes', striped: 'stripes', dots: 'dots', polka: 'dots', checker: 'checker', checkered: 'checker', checkerd: 'checker', gingham: 'checker', confetti: 'confetti', floral: 'leaves', leaves: 'leaves', plain: 'none', solid: 'none' }[pr[1]];
  const prod = low.match(/\b(vases?|bottles?|mugs?|cups?|lamps?|lights?|chairs?|stools?|packaging)\b|ваз|бутылк|кружк|ламп|стул/);
  if (prod) { const p0 = prod[0]; spec.product = /vas|ваз/.test(p0) ? 'vase' : /bottl|packag|бутыл/.test(p0) ? 'bottle' : /mug|cup|кружк/.test(p0) ? 'mug' : /lamp|light|ламп/.test(p0) ? 'lamp' : 'chair'; }
  const sc = low.match(/\b(mobile|app|landing|website|web ?site|home ?page|dashboard|admin|analytics)\b/);
  if (sc) spec.screen = /mobile|app/.test(sc[1]) ? 'mobile' : /dash|admin|analytic/.test(sc[1]) ? 'dashboard' : 'landing';
  if (/\bwire ?frames?|lo-?fi|low fidelity\b/.test(low)) spec.uiStyle = 'wireframe';
  // poster: "poster for a jazz concert on 12 June"
  const ev = t.match(/\b(?:poster|flyer|afisha)\s+(?:for|about|announcing)\s+(?:a |an |the |our |my )?([^,.!?]+?)(?=\s+(?:on|at|in|this|next|with|,)\b|[,.!?]|$)/i) || t.match(/(?:постер|плакат|афиш\S*)\s+(?:для|про|к|на)\s+([^,.!?]+?)(?=\s+(?:в|на|\d)|[,.!?]|$)/i);
  if (ev && !spec.name) spec.name = ev[1].trim().replace(/^\p{Ll}/u, (c) => c.toUpperCase()).replace(/\s\p{Ll}/gu, (c) => c.toUpperCase()).slice(0, 34);
  const MON = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|январ\S*|феврал\S*|март\S*|апрел\S*|ма[яй]|июн\S*|июл\S*|август\S*|сентябр\S*|октябр\S*|ноябр\S*|декабр\S*';
  const dt = t.match(new RegExp(`\\b(\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MON})|(?:${MON})\\s+\\d{1,2}(?:st|nd|rd|th)?)`, 'i'));
  if (dt) spec.date = dt[1];
  // harmony
  const hm = low.match(/\b(analogous|complementary|split|triadic|tetradic|monochrome|monochromatic)\b/);
  if (hm) spec.harmony = hm[1] === 'monochromatic' ? 'monochrome' : hm[1];
  // font mentioned by name
  const fam = Object.keys(FONTS).find((f) => low.includes(f.toLowerCase()));
  if (fam) spec.font = fam;
  return spec;
}

export function detectKind(text) {
  for (const [k, re] of KIND_WORDS) if (re.test(text)) return k;
  return null;
}

/** → { type, kind, spec, raw } ; type ∈ create | modify | advice | greet | thanks | help | muse | explain | brain | dream | evolve | smalltalk */
export function parse(text, last) {
  const t = text.trim(), low = t.toLowerCase();
  if (!t) return { type: 'smalltalk', raw: t };
  if (/\b(inspire me|inspiration|find (your |some |me )?(muse|inspiration)|your muse|muse|give me an idea|another idea|any ideas?|surprise me|random idea|i'?m stuck|creative block)\b|вдохнов|муз[уаы]|подкинь идею|дай идею|идею|удиви|нет идей/i.test(t)) return { type: 'muse', raw: t };
  if (last && /^(what do you think|thoughts|your opinion|is it good|rate it|explain (it|this|the design)|why (this|these|that)|как тебе|что думаешь|оцени|почему так|объясни)/i.test(t)) return { type: 'explain', raw: t };
  if (/^(hi|hello|hey|yo|hiya|howdy|good (morning|afternoon|evening)|привет|здравствуй(те)?|хай|добрый (день|вечер)|доброе утро)(?=[\s!.,]|$)[!.\s]*$/i.test(t) || /^(hi|hello|hey)\s+(fly|there|designfly)\b/i.test(t)) return { type: 'greet', raw: t };
  if (/^(thanks|thank you|thx|ty|cool|great|nice|awesome|love it|perfect|amazing|спасибо|класс|круто|супер|отлично|огонь)(?=[\s!.,]|$)/i.test(t) && t.length < 40) return { type: 'thanks', raw: t };
  if (/^(help|what can you do|commands|\/help|what do you do|what can i ask|что ты умеешь|что умеешь|помощь|помоги|что ты можешь)(?=[\s!.,?]|$)/i.test(t)) return { type: 'help', raw: t };
  if (/\b(show (me )?(your |the )?(brain|mind|neurons)|your (brain|mind|neurons)|brain view|open (the |your )?brain|neurons?)\b|мозг|нейрон/i.test(t)) return { type: 'brain', raw: t };
  if (/\b(practi[cs]e (painting|drawing|your (brush|hand|painting))|learn (to|how to) (paint|draw)|go practi[cs]e|train (your )?(hand|brush|painting|artist)|practi[cs]e( more)?|keep practi[cs]ing|art (school|lesson))\b|учись рисовать|научись рисовать|тренируйся рисовать|потренируйся|практикуйся|поучись|иди учись|тренируй руку|урок рисования/i.test(t)) return { type: 'practice', raw: t };
  const teach = t.match(/\b(?:i'?ll teach you|let me (?:show|teach) you|teach you)\s+(?:to |how to )?(?:draw|paint)?\s*(?:an? |the )?([\p{L}-]{2,24})/iu) || t.match(/(?:научу тебя|покажу тебе|научить тебя|давай научу)\s+(?:рисовать |как выглядит |как выглядят )?([\p{L}-]{2,24})/iu);
  if (teach) return { type: 'teach', label: teach[1], raw: t };
  if (/\b(dream|self[- ]?train|train yourself|improve yourself|keep learning|go learn|learn on your own|get better)\b|мечта|снов|тренируйся|совершенствуйся|учись сам/i.test(t)) return { type: 'dream', raw: t };
  if (/\b(evolve|evolution|evolved|breed|teach you|learn my taste|my taste|your own (logo|mark|design|idea)|invent|from scratch|genetic)\b|эволю|обучи|научи|мой вкус|свой (знак|логотип)|сам(а)? (придумай|сделай)/i.test(t)) return { type: 'evolve', spec: extract(t), raw: t };
  const kind = detectKind(t);
  const spec = extract(t);
  const creates = CREATE.test(t);
  const howTo = /^(how (do|to|can|should|would)|как (нарисовать|сделать|создать|рисовать|придумать))(?=\s|$)/i.test(t);
  const question = howTo || (QUESTION.test(t) && !/\b(make|design|draw|create|sketch|generate) (me|us|one|a|an|some)\b/i.test(t) && !/^(can|could|would) you\b/i.test(t));
  if (kind && !howTo && (creates || (!question && t.split(/\s+/).length <= 12))) return { type: 'create', kind, spec, raw: t };
  if (!kind && last && !question && /^(сделай|сделать|make it|make this)/i.test(t) && MODIFY.test(t)) return { type: 'modify', spec, raw: t };
  if (!kind && last && !question && (MODIFY.test(t) || (Object.keys(spec).length && t.split(/\s+/).length <= 8))) return { type: 'modify', spec, raw: t };
  if (!kind && last && !question && t.split(/\s+/).length <= 4) return { type: 'modify', spec, raw: t };
  if (creates && !kind && !question) return { type: 'create', kind: null, spec, raw: t };
  return { type: 'advice', kind, spec, raw: t };
}

/** follow-up edits relative to the last spec */
export function applyModifiers(text, last) {
  const low = text.toLowerCase();
  const ex = extract(text);
  const s = { ...last };
  const notes = [];
  if (/\b(another|again|different|variation|variant|regenerate|reroll|try (again|another)|one more|new one|redo|next)\b|ещё|еще|друг/.test(low)) { s.seed = (last.seed || 1) + 1 + Math.floor(Math.random() * 1000); notes.push('new variation'); }
  if (ex.colors) { s.colors = ex.colors; notes.push('colour → ' + ex.colors.join(', ')); }
  if (ex.moods && /^(clean|clean version|vector|crisp)$/i.test(text.trim())) delete ex.moods;
  const styleWord = ex.posterStyle || ex.patternStyle || ex.facadeStyle;
  if (ex.moods && styleWord) { ex.moods = ex.moods.filter((m) => m !== styleWord); if (!ex.moods.length) delete ex.moods; }
  if (ex.moods) { s.moods = [...new Set([...ex.moods, ...(last.moods || [])])].slice(0, 3); if (!ex.colors) delete s.colors; notes.push('mood → ' + ex.moods.join(', ')); }
  if (/\bwarmer\b/.test(low)) { s.moods = ['warm', ...(last.moods || []).filter((m) => m !== 'cold')].slice(0, 3); delete s.colors; notes.push('warmer'); }
  if (/\b(cooler|colder)\b/.test(low)) { s.moods = ['cold', ...(last.moods || []).filter((m) => m !== 'warm')].slice(0, 3); delete s.colors; notes.push('cooler'); }
  if (/\b(darker|dark mode|dark version|on black)\b|темнее|т[её]мн(ый|ая|ое|ую) (верси|фон|тем)/.test(low)) { s.dark = true; notes.push('dark'); }
  if (/\b(lighter|light mode|light version|on white|brighter background)\b|светлее|светл(ый|ая|ое|ую) (верси|фон|тем)/.test(low)) { s.dark = false; notes.push('light'); }
  if (/теплее/.test(low)) { s.moods = ['warm', ...(last.moods || []).filter((m) => m !== 'cold')].slice(0, 3); delete s.colors; notes.push('warmer'); }
  if (/холоднее/.test(low)) { s.moods = ['cold', ...(last.moods || []).filter((m) => m !== 'warm')].slice(0, 3); delete s.colors; notes.push('cooler'); }
  if (/ярче|красочнее/.test(low)) { s.moods = ['energetic', ...(last.moods || [])].slice(0, 3); delete s.colors; notes.push('more colour'); }
  if (/спокойнее|мягче|приглуш/.test(low)) { s.moods = ['calm', 'soft']; delete s.colors; notes.push('softer'); }
  if (/проще|минималистичн/.test(low)) { s.moods = ['minimal']; if (last.kind === 'poster') s.style = 'minimal'; notes.push('simpler'); }
  if (/смелее|жирнее|мощнее/.test(low)) { s.moods = ['bold', ...(last.moods || [])].slice(0, 3); notes.push('bolder'); }
  if (/с засечками/.test(low)) { s.typeStyle = 'serif'; delete s.pair; notes.push('type → serif'); }
  if (/друг(ой|ие) шрифт/.test(low)) { delete s.pair; s.seed = (s.seed || 1) + 7; notes.push('new type'); }
  if (/добавь (ещ[её] )?(одну )?(спальн|комнат)/.test(low)) { s.bedrooms = Math.min(5, (last.bedrooms || 2) + 1); notes.push('+1 room'); }
  if (/убери (одну )?(спальн|комнат)/.test(low)) { s.bedrooms = Math.max(1, (last.bedrooms || 2) - 1); notes.push('−1 room'); }
  if (/больше|крупнее/.test(low) && last.kind === 'floorplan') { s.area = Math.round((last.area || 70) * 1.25); notes.push('bigger'); }
  if (/меньше/.test(low) && last.kind === 'floorplan') { s.area = Math.round((last.area || 70) * 0.8); notes.push('smaller'); }
  if (/выше/.test(low) && last.kind === 'facade') { s.floors = Math.min(14, (last.floors || 3) + 2); notes.push('taller'); }
  if (/ниже/.test(low) && last.kind === 'facade') { s.floors = Math.max(1, (last.floors || 3) - 1); notes.push('lower'); }
  const ruName = text.match(/(?:назови(?: его| её| ее)?|переименуй в|название)\s+[«"']?([^»"'.,!?]{2,40})/i);
  if (ruName) { s.name = ruName[1].trim(); notes.push('name → ' + s.name); }
  if (/\b(more colou?rful|brighter|vibrant|pop)\b/.test(low)) { s.moods = ['energetic', ...(last.moods || [])].slice(0, 3); delete s.colors; notes.push('more colour'); }
  if (/\b(muted|calmer|softer|desaturated|subtle)\b/.test(low)) { s.moods = ['calm', 'soft']; delete s.colors; notes.push('softer'); }
  if (/\b(simpler|more minimal|minimalist|less busy|cleaner)\b/.test(low)) { s.moods = ['minimal', ...(last.moods || []).filter((m) => m !== 'playful')].slice(0, 3); if (last.kind === 'poster') s.style = 'minimal'; if (last.kind === 'logo') s.style = s.style === 'emblem' ? 'combination' : s.style; notes.push('simpler'); }
  if (/\b(bolder|stronger|louder|more impact)\b/.test(low)) { s.moods = ['bold', ...(last.moods || [])].slice(0, 3); notes.push('bolder'); }
  if (ex.typeStyle) { s.typeStyle = ex.typeStyle; delete s.pair; notes.push('type → ' + ex.typeStyle); }
  if (/\b(other|different|new|change the) (font|typeface|type)\b/.test(low)) { delete s.pair; s.seed = (s.seed || 1) + 7; notes.push('new type'); }
  if ((/\bround(er|ed)?\b/.test(low) || /круглее|округл/.test(low)) && last.kind === 'logo') { s.shape = 'circle'; s.typeStyle = s.typeStyle || 'rounded'; notes.push('rounder'); }
  if (ex.sketch !== undefined) { s.sketch = ex.sketch; notes.push(ex.sketch ? 'hand-drawn' : 'clean'); }
  if (ex.hand !== undefined) { s.hand = ex.hand; notes.push(ex.hand ? 'drawn by hand' : 'template'); }
  if (/\b(clean|vector|digital|crisp|no sketch|not sketch)\b/.test(low) && !ex.sketch) { s.sketch = false; notes.push('clean'); }
  const rn = text.match(/\b(?:call it|rename (?:it )?(?:to)?|change the name to|name it|named)\s+["“«']?([^"”»'.,!?]{2,40})/i);
  if (rn) { s.name = rn[1].trim(); notes.push('name → ' + s.name); } else if (ex.name && !/^(it|this)$/i.test(ex.name)) { s.name = ex.name; notes.push('name → ' + ex.name); }
  if (ex.tagline) { s.tagline = ex.tagline; notes.push('tagline'); }
  if (ex.mark && last.kind === 'logo') { s.mark = ex.mark; s.style = s.style === 'wordmark' ? 'combination' : s.style; notes.push('mark → ' + ex.mark); }
  if (ex.logoStyle && last.kind === 'logo') { s.style = ex.logoStyle; notes.push(ex.logoStyle); }
  if (ex.posterStyle && last.kind === 'poster') { s.style = ex.posterStyle; notes.push(ex.posterStyle); }
  if (ex.patternStyle && last.kind === 'pattern') { s.style = ex.patternStyle; notes.push(ex.patternStyle); }
  if (ex.facadeStyle && last.kind === 'facade') { s.style = ex.facadeStyle; notes.push(ex.facadeStyle); }
  if (ex.planStyle && last.kind === 'floorplan') { s.style = 'blueprint'; notes.push('blueprint'); }
  if (/\b(clean|white) (plan|version|style)\b/.test(low) && last.kind === 'floorplan') { s.style = 'clean'; notes.push('clean plan'); }
  if (ex.bedrooms) { s.bedrooms = ex.bedrooms; notes.push(ex.bedrooms + ' bedrooms'); }
  if (/\b(more|extra|add (a|one|another)) (bed)?rooms?\b/.test(low)) { s.bedrooms = Math.min(5, (last.bedrooms || 2) + 1); notes.push('+1 room'); }
  if (/\b(fewer|less|remove (a|one)) (bed)?rooms?\b/.test(low)) { s.bedrooms = Math.max(1, (last.bedrooms || 2) - 1); notes.push('−1 room'); }
  if (ex.floors) { s.floors = ex.floors; notes.push(ex.floors + ' floors'); }
  if (/\b(taller|higher|more floors)\b/.test(low)) { s.floors = Math.min(14, (last.floors || 3) + 2); notes.push('taller'); }
  if (/\b(shorter|lower|fewer floors)\b/.test(low)) { s.floors = Math.max(1, (last.floors || 3) - 1); notes.push('lower'); }
  if (ex.area) { s.area = ex.area; notes.push(ex.area + ' m²'); }
  if (/\b(bigger|larger)\b/.test(low) && last.kind === 'floorplan') { s.area = Math.round((last.area || 70) * 1.25); notes.push('bigger'); }
  if (/\bsmaller\b/.test(low) && last.kind === 'floorplan') { s.area = Math.round((last.area || 70) * 0.8); notes.push('smaller'); }
  if (ex.garment && last.kind === 'fashion') { s.garment = ex.garment; notes.push(ex.garment); }
  if (ex.print && last.kind === 'fashion') { s.print = ex.print; notes.push('print → ' + ex.print); }
  if (ex.product && last.kind === 'product') { s.product = ex.product; notes.push(ex.product); }
  if (ex.screen && last.kind === 'ui') { s.screen = ex.screen; notes.push(ex.screen); }
  if (ex.uiStyle && last.kind === 'ui') { s.style = 'wireframe'; notes.push('wireframe'); }
  if (/\b(hi-?fi|high fidelity|colou?red|full colou?r)\b/.test(low) && last.kind === 'ui') { s.style = 'hifi'; notes.push('hi-fi'); }
  if (ex.harmony) { s.harmony = ex.harmony; delete s.colors; notes.push(ex.harmony); }
  if (ex.industry && ex.industry !== last.industry) { s.industry = ex.industry; notes.push('industry → ' + ex.industry); }
  if (!notes.length) { s.seed = (last.seed || 1) + 1 + Math.floor(Math.random() * 1000); notes.push('new variation'); }
  return { spec: s, notes: [...new Set(notes)] };
}
