// What to draw: words (English + Russian stems) and industries → things the fly knows how to draw.
export const WORDS = {
  cup: /\b(coffee|cups?|mugs?|espresso|latte|cappuccino|caf[eé])\b|коф|чашк|кружк|капучин|латте/,
  bean: /\bbeans?\b|зерн/,
  bread: /\b(bread|loaf|loaves|baguette|bakery|sourdough)\b|хлеб|батон|багет|пекар/,
  croissant: /\b(croissants?|pastry|pastries|patisserie)\b|круассан|выпечк/,
  bun: /\b(buns?|kolobok|dumpling|donuts?|doughnuts?)\b|колоб|булоч|пончик/,
  cake: /\b(cakes?|cupcakes?|desserts?|birthday|sweets?|confectionery)\b|торт|пирожн|кекс|десерт|сладост|кондитер/,
  pizza: /\bpizz/i,
  icecream: /\b(ice ?cream|gelato)\b|морожен/,
  leaf: /\b(leaf|leaves|eco|plants?|organic|vegan|herbs?|tea)\b|\bлист(ь|ок|ья|ик)|эко|растени|органик|\bча[йяю]\b/,
  tree: /\b(trees?|forest|woods?|outdoors?|pine)\b|дерев|лес[ауо]?\b|\b[её]лк/,
  flower: /\b(flowers?|florist|bloom|roses?|garden|daisy|tulips?)\b|цвет(ы|ок|оч)|роз[аы]|сад\b|флорист|ромаш|тюльпан/,
  sun: /\b(sun|sunny|summer|solar|sunshine|sunrise|sunset)\b|солн|\bлет[оа]\b|\bлетн/,
  moon: /\b(moon|night|sleep|dreams?|lunar)\b|лун[аыу]|ночь|ночн|\bсон\b|\bсна\b/,
  star: /\b(stars?|space|sparkle|galaxy|cosmos)\b|звезд|звёзд|космос|галакт/,
  cloud: /\b(clouds?|sky|weather|saas)\b|облак|\bнеб[оа]\b|погод/,
  wave: /\b(waves?|surf(ing)?|sea|ocean|beach|swell)\b|волн|серф|мор[еяю]|океан|пляж/,
  mountain: /\b(mountains?|hik(e|ing)|peaks?|alps|climb(ing)?)\b|\bгор[аыу]\b|\bгорн|поход|альпин/,
  fish: /\b(fish|sushi|seafood|fishing)\b|рыб|суши/,
  cat: /\b(cats?|kittens?|kitty)\b|\bкот(ик|ики|ы|а|у|ом|е|ёнок|енок|ята)?\b|кошк|котён|котен/,
  dog: /\b(dogs?|pupp(y|ies)|doggy)\b|собак|\bпёс|\bпес\b|щен/,
  bird: /\b(birds?|tweet|wings?|sparrow|crow|owl)\b|птиц|ворон|\bсов[аыу]\b|воробей/,
  fly: /\b(fly|flies|insects?|bugs?)\b|\bмух/,
  house: /\b(house|home|homes|real ?estate|cottage|cabin)\b|\bдом(ик|а|у)?\b|недвиж|коттедж/,
  building: /\b(city|buildings?|architecture|towers?|skyline|urban)\b|город|здани|архитект|небоскр/,
  heart: /\b(love|hearts?|wedding|romantic|dating|valentine)\b|любов|сердц|свадь|свадеб|романт/,
  note: /\b(music|songs?|notes?|band|melody|jazz|concert|records?)\b|музык|\bнот[аы]?\b|песн|мелод|джаз|концерт/,
  headphones: /\b(headphones?|podcast|dj|audio|sound)\b|наушник|подкаст|звук/,
  bolt: /\b(bolt|lightning|power|electric|energy|fast|flash)\b|молни|энерг|электр/,
  gear: /\b(gears?|settings|engineering|mechanic|repair|auto|garage)\b|шестер|механ|ремонт|автосерв/,
  rocket: /\b(rockets?|startup|launch|spaceship)\b|ракет|стартап|запуск/,
  robot: /\b(robots?|ai|bots?|android)\b|робот|\bии\b|нейросет|искусствен/,
  chip: /\b(tech|chips?|software|code|coding|developer|cyber)\b|техн|айти|\bчип|\bкод\b|программ/,
  book: /\b(books?|library|education|school|reading|stories)\b|книг|библиот|школ|обучен|чтени/,
  pencil: /\b(pencils?|artist|sketchbook|illustrator)\b|карандаш|художн/,
  eye: /\b(eyes?|vision|optics?|optician)\b|глаз|оптик|зрени/,
  camera: /\b(cameras?|photo(graphy)?|photographer|film)\b|камер|фото/,
  glass: /\b(wine|bar|cocktails?|glass|drinks?|pub)\b|вин[оа]|\bбар\b|бокал|коктейл|напит/,
  scissors: /\b(scissors|barber|hair|salon|tailor|haircut)\b|ножниц|барбер|парикмах|стрижк|ателье/,
  dress: /\b(fashion|dress(es)?|clothing|boutique|apparel)\b|мод[аы]\b|одежд|плать|бутик/,
  crown: /\b(crowns?|king|queen|royal|luxury|premium)\b|корон|корол|царь|люкс|роскош/,
  diamond: /\b(diamonds?|jewel(le)?ry|gems?|jeweller)\b|бриллиант|ювелир|алмаз/,
  key: /\b(keys?|security|locks?|locksmith)\b|\bключ|замок|охран/,
  anchor: /\b(anchors?|marine|sailing|ships?|boats?|nautical)\b|якор|корабл|лодк|морск/,
  drop: /\b(water|drops?|rain|aqua)\b|капл|\bвод[аыу]|дожд|чистк/,
  flame: /\b(fire|hot|flames?|grill|bbq|spicy|candles?)\b|огон|огн|гриль|остр(ый|ая|ое|ые)|свеч/,
  paw: /\b(paws?|pets?|vet|veterinary)\b|лап[аык]|зоо|питом|ветерин/,
  bike: /\b(bikes?|bicycles?|cycling|cyclist)\b|велосипед|вело/,
  car: /\b(cars?|taxi|delivery|driving|automotive)\b|машин|такси|доставк|автомоб/,
  plane: /\b(planes?|travel|airline|flights?|airport|trip)\b|самол|авиа|путешеств|туризм|полёт|полет/,
  dumbbell: /\b(gym|fitness|dumbbells?|workout|training)\b|гантел|спортзал|фитнес|трениров|качалк/,
  tooth: /\b(dental|dentist|teeth|tooth)\b|зуб|стомат/,
  cross: /\b(medical|clinic|health|hospital|pharmacy|doctor)\b|медиц|клиник|здоровь|больниц|аптек|врач/,
  coin: /\b(finance|bank|money|coins?|invest(ment)?|accounting|crypto)\b|деньг|банк|финанс|монет|инвест|бухгал|крипт/,
  chat: /\b(chat|talk|messages?|messenger|community|social)\b|чат|сообщ|общени|мессендж/,
  smile: /\b(happy|kids|children|joy|smile|toys?|fun)\b|улыб|дет[иск]|радост|игрушк|весел/,
  globe: /\b(globe|world|global|planet|earth|international|languages?)\b|глобус|\bмир[аоу]?\b|планет|земл|язык/,
  snail: /\b(snails?|slow)\b|улитк|медлен/,
  mushroom: /\b(mushrooms?|fungi)\b|гриб/,
  apple: /\b(apples?|fruits?|farm|orchard)\b|яблок|фрукт|ферм/,
};
const B = '(?:(?<=[a-zа-яё0-9])(?![a-zа-яё0-9])|(?<![a-zа-яё0-9])(?=[a-zа-яё0-9]))';
for (const k of Object.keys(WORDS)) WORDS[k] = new RegExp(WORDS[k].source.replaceAll('\\b', B));   // a \b that understands Cyrillic
export const MOTIFS = Object.keys(WORDS);

export const BY_INDUSTRY = {
  coffee: ['cup', 'bean'], cafe: ['cup', 'croissant'], bakery: ['bread', 'croissant', 'bun', 'cake'], restaurant: ['flame', 'glass', 'fish'], food: ['apple', 'flame', 'pizza'], pizza: ['pizza', 'flame'], sushi: ['fish', 'wave'], tea: ['leaf', 'cup'], bar: ['glass', 'moon'], wine: ['glass', 'moon'],
  tech: ['chip', 'bolt', 'rocket'], software: ['chip', 'chat'], startup: ['rocket', 'bolt'], ai: ['robot', 'eye', 'star'], crypto: ['coin', 'bolt'], saas: ['cloud', 'chip'], app: ['chat', 'smile'], game: ['star', 'robot'], gaming: ['robot', 'bolt'], esports: ['bolt', 'crown'],
  finance: ['coin', 'key'], bank: ['coin', 'key', 'building'], law: ['key', 'book'], consulting: ['chat', 'eye'], insurance: ['key', 'house'],
  health: ['cross', 'heart'], medical: ['cross', 'heart'], clinic: ['cross'], dental: ['tooth'], pharmacy: ['cross', 'leaf'], wellness: ['leaf', 'sun'], yoga: ['sun', 'leaf', 'moon'], spa: ['drop', 'leaf', 'flower'], fitness: ['dumbbell', 'bolt'], gym: ['dumbbell'], sport: ['bolt', 'star'],
  fashion: ['dress', 'scissors'], beauty: ['flower', 'scissors', 'eye'], cosmetics: ['drop', 'flower'], jewelry: ['diamond', 'crown'], boutique: ['dress', 'heart'], wedding: ['heart', 'flower', 'diamond'],
  architecture: ['building', 'house', 'pencil'], interior: ['house', 'leaf'], construction: ['house', 'gear'], realestate: ['house', 'key'], furniture: ['house', 'leaf'],
  eco: ['leaf', 'tree', 'globe'], garden: ['flower', 'leaf', 'tree'], farm: ['apple', 'sun', 'tree'], organic: ['leaf', 'apple'], energy: ['bolt', 'sun'], pet: ['paw', 'cat', 'dog'],
  kids: ['smile', 'star', 'sun'], toys: ['smile', 'star'], school: ['book', 'pencil'], education: ['book', 'pencil', 'globe'], university: ['book', 'globe'],
  music: ['note', 'headphones'], studio: ['note', 'pencil'], art: ['pencil', 'eye', 'star'], gallery: ['eye', 'pencil'], photo: ['camera', 'eye'], film: ['camera', 'star'], podcast: ['headphones', 'chat'],
  travel: ['plane', 'globe', 'mountain'], hotel: ['key', 'moon', 'star'], airline: ['plane', 'cloud'], surf: ['wave', 'sun'], outdoor: ['mountain', 'tree'],
  books: ['book', 'eye'], agency: ['eye', 'pencil', 'star'], marketing: ['chat', 'star'], media: ['chat', 'camera'], charity: ['heart', 'globe'], logistics: ['car', 'globe'], auto: ['car', 'gear'], car: ['car', 'gear'],
};
const MARK_TO = { leaf: 'leaf', mountain: 'mountain', cup: 'cup', bolt: 'bolt', heart: 'heart', wave: 'wave', sun: 'sun', house: 'house', paw: 'paw', drop: 'drop', spark: 'star', orbit: 'globe', petal: 'flower', bubble: 'chat' };

/** motifs mentioned in a piece of text, in order of appearance */
export function subjectsIn(text) {
  const low = ' ' + String(text).toLowerCase() + ' ';
  const hits = [];
  for (const [id, re] of Object.entries(WORDS)) { const m = low.match(re); if (m) hits.push([m.index, id]); }
  return hits.sort((a, b) => a[0] - b[0]).map((h) => h[1]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
}
/** what the fly will draw for a spec: explicit subjects, words in the name, the mark, then the industry */
export function conceptsFor(spec) {
  const out = [...(spec.subject || [])];
  if (spec.name) out.push(...subjectsIn(spec.name));
  if (spec.mark && MARK_TO[spec.mark]) out.push(MARK_TO[spec.mark]);
  if (spec.industry) out.push(...(BY_INDUSTRY[spec.industry] || []));
  return [...new Set(out)].filter((m) => WORDS[m]);
}
