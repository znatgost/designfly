// UI glue: chat ⇄ brain (offline or LLM) ⇄ design engine ⇄ 3D studio, gallery, viewer, exports.
import { Studio3D } from './studio3d.js';
import { respond, critiqueText, museIdea } from './brain.js';
import { askLLM, PROVIDERS } from './llm.js';
import { generate, normalize, KINDS } from './design/index.js';
import { embedFonts, svgToCanvas, svgToPngBlob, svgUrl, svgSize, download, zip, slug, loadImage } from './export.js';
import { paintingDesign } from './paint/index.js';
import { RU_NAME } from './hand/compose.js';
import { ArtistClient } from './artist/client.js';
import { subjectsIn } from './hand/concepts.js';
import { opsToSVG, timeline } from './hand/render.js';
import { analyzeImage, fileToDataUrl } from './critique.js';
import { setMeasurer, FONTS } from './design/type.js';
import { Mind } from './learn/mind.js';
import { genomeDoc, mutate, randomGenome } from './learn/genome.js';
import { Brain3D } from './brain3d.js';
import { context } from './design/common.js';
import { parse } from './intents.js';
import { rng } from './design/rng.js';
import { Taste } from './hand/taste.js';
import { HAND_KINDS } from './hand/compose.js';
import { conceptsFor } from './hand/concepts.js';
import { canLetter } from './hand/glyphs.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const LS = { get: (k, d) => { try { return JSON.parse(localStorage.getItem('designfly.' + k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem('designfly.' + k, JSON.stringify(v)); } catch {} } };

let studio = null;
const designs = [];                 // { id, kind, title, svg, notes, assets, palette, spec, url, embedded }
const history = [];                 // chat history for the LLM: { role, text }
let last = LS.get('last', null);    // last engine spec (design context)
let attached = null;                // dataURL of an attached image
let busy = false;
let cfg = { provider: 'offline', key: '', model: '', base: '', muse: true, hand: true, practice: true, ...LS.get('cfg', {}) };
delete cfg.six;
let manual = false;
let taste = null, lastPhoto = null, restoring = false;
try { taste = new Taste(localStorage); } catch { taste = new Taste(null); }
let mind = null, brain3d = null, view = 'studio', evoBrand = null, museReq = null, lastIdea = null;

boot();

async function boot() {
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]); } catch {}
  await Promise.all(['Caveat', 'Space Grotesk', 'JetBrains Mono'].map((f) => document.fonts.load(`400 40px "${f}"`).catch(() => {})));
  // load every vendored face so the design engine can measure real text widths
  $('#load-msg').textContent = 'unpacking 35 typefaces';
  await Promise.race([Promise.all(Object.entries(FONTS).flatMap(([f, v]) => v.weights.map((w) => document.fonts.load(`${w} 40px "${f}"`, 'AaBb').catch(() => {})))), new Promise((r) => setTimeout(r, 6000))]);
  const mctx = document.createElement('canvas').getContext('2d'), mcache = new Map();
  setMeasurer((text, family, weight) => {
    const key = family + weight + text;
    if (mcache.has(key)) return mcache.get(key);
    if (!document.fonts.check(`${weight} 20px "${family}"`)) return 0;
    mctx.font = `${weight} 100px "${family}"`;
    const w = mctx.measureText(text).width / 100;
    if (mcache.size > 5000) mcache.clear();
    mcache.set(key, w); return w;
  });
  try {
    studio = new Studio3D($('#studio'));
    studio.onBoardClick = () => { const d = designs[designs.length - 1]; if (d) openViewer(d); };
    studio.onMuse = (route) => postIdea(route);
  } catch (e) {
    console.warn('WebGL unavailable', e);
    $('#studio').replaceWith(Object.assign(document.createElement('div'), { className: 'no3d', innerHTML: '<p class="muted" style="padding:40px;text-align:center">3D needs WebGL — the fly still designs, see the gallery.</p>' }));
  }
  // the fly's own design mind (src/learn) — restored from this browser or born now
  $('#load-msg').textContent = 'growing 121 neurons';
  mind = new Mind({ storage: { get: () => LS.get('mind', null), set: (v) => LS.set('mind', v) } });
  try { await mind.init((p, msg) => { $('#load-msg').textContent = msg; }); }
  catch (e) { console.warn('stored mind unreadable, starting a new one', e); LS.set('mind', null); await mind.bootstrap((p, msg) => { $('#load-msg').textContent = msg; }); }
  try { brain3d = new Brain3D($('#brain'), mind, $('#b-overlay')); } catch (e) { console.warn('brain view unavailable', e); }
  buildUI();
  buildBrainUI();
  restoreGallery();
  setTimeout(() => { if (cfg.practice !== false) getArtist(); }, 8000);     // wake the artist brain so it can practise when idle
  greet();
  $('#loading').classList.add('done');
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ render loop
let lastT = performance.now(), stateTick = 0;
function frame(t) {
  const dt = t - lastT; lastT = t;
  if (studio && !manual) { if (view === 'brain') studio.tick(t, dt); else studio.draw(t, dt); }
  if (brain3d && view === 'brain' && !manual) brain3d.draw(t);
  if (studio && (stateTick += dt) > 250) { stateTick = 0; $('#st-state').textContent = studio.stateLabel(); $('#drawing').classList.toggle('hidden', studio.mode !== 'drawing'); studio.museAllowed = cfg.muse !== false && !busy; }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ UI
function buildUI() {
  const make = $('#make');
  const quick = [['logo', 'Logo', 'Make a logo for '], ['identity', 'Identity', 'Brand identity for '], ['palette', 'Palette', 'Colour palette for '], ['typography', 'Fonts', 'Font pairing for '], ['poster', 'Poster', 'Swiss poster "'],
    ['floorplan', 'Floor plan', '2-bedroom apartment floor plan'], ['facade', 'Façade', 'Scandinavian house façade'], ['fashion', 'Fashion', 'Hoodie flat with a graphic print'], ['product', 'Product', 'Sketch a ceramic vase'], ['ui', 'UI', 'Mobile app for '], ['moodboard', 'Mood board', 'Japandi interior mood board'], ['pattern', 'Pattern', 'Terrazzo pattern'], ['drawing', 'Drawing', 'Draw a '], ['painting', 'Painting', 'Paint ']];
  for (const [, label, prompt] of quick) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    b.onclick = () => { const i = $('#input'); i.value = prompt; i.focus(); i.setSelectionRange(prompt.length, prompt.length); autosize(); };
    make.appendChild(b);
  }
  document.querySelectorAll('.views button').forEach((b) => b.onclick = () => setView(b.dataset.view));
  $('#btn-muse').onclick = () => { $('#input').value = 'Inspire me'; send(); };
  $('#composer').onsubmit = (e) => { e.preventDefault(); send(); };
  $('#input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  $('#input').addEventListener('input', autosize);
  $('#file').onchange = async (e) => { const f = e.target.files[0]; if (f) setAttached(await fileToDataUrl(f)); e.target.value = ''; };
  $('#unattach').onclick = () => setAttached(null);
  document.addEventListener('paste', async (e) => { const it = [...(e.clipboardData?.items || [])].find((x) => x.type.startsWith('image/')); if (it) setAttached(await fileToDataUrl(it.getAsFile())); });
  $('.chat').addEventListener('dragover', (e) => e.preventDefault());
  $('.chat').addEventListener('drop', async (e) => { e.preventDefault(); const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/')); if (f) setAttached(await fileToDataUrl(f)); });
  $('#btn-clear').onclick = () => { if (!designs.length || !confirm('Clear the gallery?')) return; for (const d of designs) URL.revokeObjectURL(d.url); designs.length = 0; LS.set('gallery', []); renderGallery(); $('#st-made').textContent = 0; };
  document.querySelectorAll('[data-close]').forEach((b) => b.onclick = () => b.closest('dialog').close());
  for (const d of document.querySelectorAll('dialog')) d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  // settings
  const sel = $('#set-provider');
  for (const [k, p] of Object.entries(PROVIDERS)) sel.add(new Option(p.label, k));
  $('#btn-settings').onclick = openSettings;
  sel.onchange = syncSettingsRows;
  $('#set-form').onsubmit = (e) => { e.preventDefault(); readSettings(); LS.set('cfg', cfg); updateEngine(); $('#settings').close(); toast('Saved'); };
  $('#set-test').onclick = testSettings;
  updateEngine();
}
function autosize() { const i = $('#input'); i.style.height = 'auto'; i.style.height = Math.min(140, i.scrollHeight) + 'px'; }
function setAttached(url) { attached = url; $('#attached').classList.toggle('hidden', !url); if (url) $('#attached img').src = url; }
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1900); }
function updateEngine() { $('#st-engine').textContent = cfg.provider === 'offline' ? 'offline' : (cfg.model || PROVIDERS[cfg.provider].model); }

function openSettings() {
  $('#set-provider').value = cfg.provider; $('#set-key').value = cfg.key || ''; $('#set-model').value = cfg.model || ''; $('#set-base').value = cfg.base || ''; $('#set-muse').checked = cfg.muse !== false; $('#set-hand').checked = cfg.hand !== false; $('#set-practice').checked = cfg.practice !== false;
  syncSettingsRows(); $('#set-status').textContent = ''; $('#settings').showModal();
}
function syncSettingsRows() {
  const p = PROVIDERS[$('#set-provider').value];
  const off = $('#set-provider').value === 'offline';
  $('#row-key').classList.toggle('hidden', off); $('#row-model').classList.toggle('hidden', off); $('#set-note').classList.toggle('hidden', off);
  $('#row-base').classList.toggle('hidden', !['custom', 'openai', 'openrouter'].includes($('#set-provider').value));
  $('#set-model').placeholder = p.model || ''; $('#set-base').placeholder = p.base || '';
}
function readSettings() { cfg = { provider: $('#set-provider').value, key: $('#set-key').value.trim(), model: $('#set-model').value.trim(), base: $('#set-base').value.trim(), muse: $('#set-muse').checked, hand: $('#set-hand').checked, practice: $('#set-practice').checked }; }
async function testSettings() {
  readSettings(); const st = $('#set-status');
  if (cfg.provider === 'offline') { st.textContent = 'offline brain is always on ✓'; return; }
  st.textContent = 'asking…';
  try { const r = await askLLM(cfg, [], 'Say hi in five words.', null, null); st.textContent = '✓ ' + (r.text || 'ok').slice(0, 60); }
  catch (e) { st.textContent = '✗ ' + e.message.slice(0, 120); }
}

// ------------------------------------------------------------------ chat rendering
function md(src) {
  const blocks = [];
  let s = esc(src).replace(/```(\w*)\n?([\s\S]*?)```/g, (_, l, c) => { blocks.push(`<pre><code>${c.replace(/\n$/, '')}</code></pre>`); return `\u0000${blocks.length - 1}\u0000`; });
  s = s.replace(/\[\[(#[0-9a-fA-F]{3,6})\]\]/g, '<i class="sw" style="background:$1" title="$1" data-hex="$1"></i>')
    .replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out = []; let list = null;
  for (const line of s.split('\n')) {
    const li = line.match(/^\s*(?:[-•]|\d+\.)\s+(.*)/);
    if (li) { if (!list) { list = /^\s*\d/.test(line) ? 'ol' : 'ul'; out.push(`<${list}>`); } out.push(`<li>${li[1]}</li>`); continue; }
    if (list) { out.push(`</${list}>`); list = null; }
    if (line.trim()) out.push(`<p>${line}</p>`);
  }
  if (list) out.push(`</${list}>`);
  return out.join('').replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[+i]);
}
function addMsg(who, html, cls = '') {
  const el = document.createElement('div');
  el.className = `msg ${who} ${cls}`;
  el.innerHTML = (who === 'fly' ? '<span class="who">DESIGNFLY</span>' : '') + html;
  el.querySelectorAll('.sw').forEach((s) => s.onclick = () => { navigator.clipboard?.writeText(s.dataset.hex); toast(s.dataset.hex + ' copied'); });
  $('#messages').appendChild(el);
  $('#messages').scrollTop = 1e9;
  return el;
}
function setChips(list = []) {
  const c = $('#chips'); c.innerHTML = '';
  for (const t of list.slice(0, 6)) { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.onclick = () => { $('#input').value = t; send(); }; c.appendChild(b); }
}
function greet() {
  const r = respond('hi', {});
  addMsg('fly', md(r.text) + (cfg.provider === 'offline' ? '<p class="muted small">Thinking offline (built-in engine + design knowledge). Connect a language model under ⚙ Brain for free-form conversation.</p>' : ''));
  setChips(r.chips);
  setTimeout(() => studio?.setMood('talk'), 600);
}

// ------------------------------------------------------------------ send
async function send() {
  const text = $('#input').value.trim();
  if ((!text && !attached) || busy) return;
  if (/^(draw (this|the|that) idea|нарисуй (эту )?идею)$/i.test(text) && lastIdea) { $('#input').value = lastIdea.prompt; return send(); }
  if (/^(another idea|ещ[её] идею)$/i.test(text)) { $('#input').value = 'Inspire me'; return send(); }
  if (/^✦ /.test(text)) { $('#input').value = text.slice(2); return send(); }
  if (/^(back to (the )?studio|studio|close (the )?brain)$/i.test(text)) { $('#input').value = ''; setView('studio'); return; }
  const img = attached;
  $('#input').value = ''; autosize(); setAttached(null); setChips([]);
  addMsg('user', (img ? `<img class="up" src="${img}" alt="attached image">` : '') + md(text || 'Critique this, please.'));
  busy = true; $('#send').disabled = true;
  studio?.setMood('think');
  const typing = addMsg('fly', '<span class="typing"><i></i><i></i><i></i></span>');
  let reply;
  try {
    const local = text && !img && ['brain', 'dream', 'evolve'].includes(parse(text, last).type);
    if (local) reply = respond(text, { last });
    const teachM = img && text.match(/^(?:это|вот|this is|it'?s|that'?s|запомни[,:]?|remember[,:]?)\s+(?:an?\s+|the\s+|мой\s+|my\s+)?([\p{L}-]{2,24})/iu);
    if (teachM) reply = { text: '', teachPhoto: { img, label: teachM[1] }, mood: 'happy' };
    if (!reply && img && /\b(paint|draw|sketch|portrait)|нарису|картин|напиши|портрет|маслом|красками|акварел/i.test(text) && !/\b(critique|review|feedback|rate|opinion|what do you think|analy[sz]e)\b|оцени|критик|мнение|что скажешь|разбери|как тебе/i.test(text)) {
      const ru = /[а-яё]/i.test(text);
      reply = { text: ru ? 'Сначала хорошенько посмотрю… теперь пишу.' : 'Let me look at it properly first… painting now.', specs: [normalize({ kind: 'painting', scene: 'photo', seed: Math.floor(Math.random() * 1e6), lang: ru ? 'ru' : undefined })], photo: img, mood: 'draw', chips: ['Paint it again', 'Abstract painting', 'Self-portrait'] };
    }
    if (!reply && cfg.provider !== 'offline') {
      try {
        const r = await askLLM(cfg, history, text || 'Please critique this design image. Be specific and actionable.', img, last);
        reply = { text: r.text, specs: r.specs, svgs: r.svgs, mood: r.specs.length || r.svgs.length ? 'draw' : 'talk', chips: r.specs.length ? chipsFor(r.specs[0].kind) : [] };
      } catch (e) {
        addMsg('fly', md(`My ${PROVIDERS[cfg.provider].label} brain didn't answer (*${e.message}*). Falling back to my offline brain.`), 'err');
      }
    }
    if (!reply) reply = img ? await critique(img, text) : respond(text, { last });
  } catch (e) { console.error(e); reply = { text: 'Ouch, I bumped into the window: ' + e.message, mood: 'think' }; }
  typing.remove();
  history.push({ role: 'user', text: text || '[image]' });
  const el = addMsg('fly', md(reply.text || (reply.specs?.length || reply.svgs?.length ? 'Here you go:' : '…')));
  history.push({ role: 'assistant', text: reply.text + (reply.specs?.length ? '\n```design\n' + JSON.stringify(reply.specs[0]) + '\n```' : '') });
  setChips(reply.chips);
  if (reply.view) setView(reply.view);
  if (reply.evolve) startEvolution(reply.evolve, el);
  if (reply.dream) startDream(el);
  if (reply.muse) startMuse(el);
  if (reply.practice) startPractice(el, 45000);
  if (reply.teach) openTeachPad(reply.teach, reply.teachName);
  if (reply.teachPhoto) await teachFromPhoto(el, reply.teachPhoto);
  if (reply.variation && reply.specs?.[0]?.genome) reply.specs[0].genome = mindVariation(reply.specs[0].genome);
  const made = [];
  for (const sp of reply.specs || []) { try { const knownSub = sp.kind === 'drawing' && artist && sp.subject?.find((s2) => artist.knows(s2));
    made.push(sp.kind === 'painting' || knownSub ? await makePainting(knownSub ? { ...sp, kind: 'painting', scene: 'memory', subject: [knownSub] } : sp, reply.photo, el) : makeDesign(sp)); } catch (e) { console.error(e); addMsg('fly', md('I tried to draw that but my pencil broke: ' + e.message), 'err'); } }
  for (const svg of reply.svgs || []) made.push(customDesign(svg));
  for (const d of made) attachCard(el, d);
  if (made.length && reply.chips) setChips(handChips(reply.chips, made[made.length - 1]));
  busy = false; $('#send').disabled = false;
  if (made.length) await showOnBoard(made[made.length - 1], true);
  else if (!reply.dream) studio?.setMood(reply.mood || 'talk');
}
function handChips(list, d) {
  if (!HAND_KINDS.includes(d.kind) || d.kind === 'drawing') return list;
  const swap = d.hand ? 'Template version' : 'Draw it by hand';
  const out = list.map((c) => (/^hand-drawn( version)?$/i.test(c) ? swap : c));
  if (!out.includes(swap)) out.splice(Math.min(3, out.length), 0, swap);
  return out;
}
const chipsFor = (kind) => ({ logo: ['Another one', 'Make it darker', 'Hand-drawn version', 'Business card for it'], floorplan: ['Another layout', 'Blueprint style', 'Add a bedroom'] }[kind] || ['Another one', 'Hand-drawn version']);

async function critique(img, text) {
  const a = await analyzeImage(img);
  const r = { text: critiqueText(a), mood: 'talk', chips: ['Palette from this image', 'What makes a good layout?'] };
  last = normalize({ kind: 'palette', colors: a.palette.slice(0, 3).map((p) => p.hex), seed: 1 });
  if (/palette|colou?rs/i.test(text)) { r.specs = [normalize({ kind: 'palette', colors: a.palette.slice(0, 5).map((p) => p.hex), seed: Math.floor(Math.random() * 1e6), name: 'From your image' })]; r.mood = 'draw'; }
  return r;
}

// ------------------------------------------------------------------ designs
function makeDesign(spec) {
  spec = { ...spec };
  if (HAND_KINDS.includes(spec.kind)) {
    const obj = spec.hand && typeof spec.hand === 'object';
    const letterable = spec.kind === 'drawing' || canLetter([spec.name, spec.tagline].filter(Boolean).join(' '));
    if (spec.kind === 'drawing' || (letterable && (spec.hand === true || obj || (spec.hand === undefined && cfg.hand !== false)))) {
      const styled = spec.style && ['poster', 'pattern'].includes(spec.kind) && !obj && spec.hand !== true;      // "swiss poster", "terrazzo pattern" → that's a template style
      if (styled) { delete spec.hand; return makeTemplate(spec); }
      if (!(obj && last && last.kind === spec.kind && last.seed === spec.seed)) {
        spec.hand = taste.sample(spec.kind); taste.practice(); updateHandStat();
        const L = { wordmark: 'wordmark', monogram: 'monogram', emblem: 'badge', combination: r01() < 0.5 ? 'stack' : 'side' }[spec.style];
        if (spec.kind === 'logo' && L) spec.hand.layout = L;
      }
      if (spec.kind === 'logo' && !spec.genome && !conceptsFor(spec).length && mind) { const g = mind.favourite(); if (g) spec.genome = g; }
    } else if (spec.hand !== false) delete spec.hand;
  }
  return makeTemplate(spec);
}
const r01 = () => Math.random();
function makeTemplate(spec) {
  const d = generate(spec);
  if (d.kind !== 'svg') { last = d.spec; LS.set('last', last); }
  return addDesign(d);
}
async function imageRef(src, what = '', long = 160) {
  const im = await loadImage(src);
  const k = long / Math.max(im.naturalWidth || im.width, im.naturalHeight || im.height);
  const w = Math.max(40, Math.round((im.naturalWidth || im.width) * k)), h = Math.max(30, Math.round((im.naturalHeight || im.height) * k));
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h }), x = c.getContext('2d');
  x.drawImage(im, 0, 0, w, h);
  const url = c.toDataURL('image/jpeg', 0.9), back = await loadImage(url);      // paint from exactly what the gallery will store
  x.clearRect(0, 0, w, h); x.drawImage(back, 0, 0, w, h);
  return { img: { w, h, data: x.getImageData(0, 0, w, h).data }, url, what };
}
async function paintingRef(spec, photo) {
  if (photo || spec.scene === 'photo') { const src = photo || lastPhoto; if (!src) return null; lastPhoto = src; spec.scene = 'photo'; return imageRef(src, 'your photo'); }
  if (spec.scene === 'memory' && spec.subject?.length) {
    const dd = generate({ kind: 'drawing', subject: spec.subject, seed: spec.seed, caption: ' ', hand: { layout: 'study', colour: 'natural', fill: 'flat', nib: 'marker', letter: 'caps', skill: 0.9, guides: false } });
    return imageRef((await svgToCanvas(dd.svg, 480)).toDataURL('image/png'), spec.subject.join(' and '));
  }
  if ((spec.scene === 'studio' || spec.scene === 'self') && studio) { const snap = studio.snapshot(spec.scene); if (snap) return imageRef(snap.url, snap.what); }
  return null;
}
const sawAsset = (d) => d.ref ? [{ name: 'what-i-looked-at.svg', svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${d.w} ${d.h}" width="${d.w}" height="${d.h}"><title>What the fly looked at</title><image href="${d.ref}" xlink:href="${d.ref}" width="${d.w}" height="${d.h}" preserveAspectRatio="none"/></svg>` }] : [];
const labelOf = (w) => subjectsIn(w)[0] || String(w).toLowerCase();
async function makePainting(spec, photo, msgEl = null) {
  spec = { ...spec };
  const fresh = !(spec.paint && last && last.kind === 'painting' && last.seed === spec.seed);
  if (fresh) spec.paint = taste.sample('painting');
  const a = await getArtist();
  if (!a) return makeClassicPainting(spec, photo);
  // a newborn hand has never held a brush: practise first
  if (a.steps < 250) {
    const el = msgEl || addMsg('fly', md(spec.lang === 'ru' ? 'Я ещё ни разу не держала кисть — сначала потренируюсь…' : "I've never held a brush — let me practise first…"));
    await startPractice(el, 25000, true);
  }
  let ref = null, z = null, note = '';
  const prev = !fresh && designs.findLast((x) => x.kind === 'painting' && x.spec.seed === spec.seed && x.ref);
  const sub = spec.subject?.[0];
  try {
    if (prev) ref = { ...(await imageRef(prev.ref, prev.what)), url: prev.ref };
    else if ((spec.scene === 'memory' || spec.scene === 'imagine') && sub && a.knows(sub)) { const im = await a.recall(sub, spec.seed); ref = await imageRef(picUrl(im), `my memory of a ${sub}`); }
    else if (spec.scene === 'imagine' || spec.scene === 'abstract' || (spec.scene === 'memory' && sub)) {
      const im = await a.imagine({ seed: spec.seed }); z = im.z; ref = await imageRef(picUrl(im.img, 4), 'my imagination');
      spec.scene = 'imagine';
      if (sub) note = spec.lang === 'ru' ? `Я пока не знаю, как выглядит «${sub}» — нарисовала то, что пришло в голову. Научи меня: пришли фото со словами «это ${sub}» или нарисуй сам.` : `I don't know what a “${sub}” looks like yet, so I painted what came to mind. Teach me: send a photo saying “this is a ${sub}”, or draw one for me.`;
    } else ref = await paintingRef(spec, photo);
  } catch (e) { console.warn('no reference', e); }
  if (!ref) { const im = await a.imagine({ seed: spec.seed }); z = im.z; ref = await imageRef(picUrl(im.img, 4), 'my imagination'); spec.scene = 'imagine'; }
  if (spec.scene !== 'imagine') a.see(ref.img, spec.scene === 'self' ? 'studio' : spec.scene);
  const target = spec.dark ? { ...ref.img, data: ref.img.data.map((v, i) => (i % 4 === 3 ? v : v * 0.6)) } : ref.img;
  const res = await a.paint(target, { ground: spec.dark ? 'grey' : spec.paint.ground, stretch: !spec.dark && (spec.scene === 'studio' || spec.scene === 'self') });
  timeline(res.ops);
  spec = normalize({ ...spec, kind: 'painting' });
  const title = { studio: 'Studio corner', self: 'Self-portrait', photo: 'From your photo', memory: `${spec.lang === 'ru' && sub ? (RU_NAME[sub] || sub) : sub || 'Something'} — from memory`, imagine: 'From my imagination', abstract: 'From my imagination' }[spec.scene] || 'Painting';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${res.w} ${res.h}" width="${res.w}" height="${res.h}"><title>${esc(title)} — painted by a fly</title>${opsToSVG(res.ops)}</svg>`;
  const notes = [`**${title}** — painted by my own neural network, stroke by stroke: ${res.strokes} strokes (${res.tried - res.strokes} more I considered and decided against). I looked at ${ref.what || 'it'} the whole time.`,
    `My hand is a **${a.title}** after ${a.steps.toLocaleString()} practice steps. Likeness to what I looked at: **${Math.round(res.likeness * 100)} %**. Practise with me (*"practise painting"*) and it gets better.`, note].filter(Boolean).join('\n');
  const d = { kind: 'painting', title, svg, w: res.w, h: res.h, notes, assets: [], palette: [...new Set(res.ops.filter((o) => o.nib === 'paint').map((o) => o.c))].slice(0, 6).map((hex, i) => ({ role: `paint ${i + 1}`, hex })), spec, ops: res.ops, hand: true, bg: res.ops[0].c, neural: true, z };
  d.ref = ref.url; d.what = ref.what; d.assets = sawAsset(d);
  if (fresh) { taste.practicePainting(); updateHandStat(); }
  d.id = `painting-${spec.seed}-${Math.random().toString(36).slice(2, 7)}`;
  last = d.spec; LS.set('last', last);
  updateArtStat();
  return addDesign(d);
}
/** the older, rule-based painter — used only if the neural brain can't run */
async function makeClassicPainting(spec, photo) {
  let ref = null;
  try { ref = await paintingRef(spec, photo); } catch {}
  if (!ref) spec.scene = 'abstract';
  const d = ref ? paintingDesign(ref.img, normalize({ ...spec, kind: 'painting', scene: spec.scene === 'imagine' ? 'abstract' : spec.scene }), ref.what) : generate({ ...spec, kind: 'painting', scene: 'abstract' });
  if (ref) { d.ref = ref.url; d.what = ref.what; d.assets = sawAsset(d); }
  d.id = `painting-${d.spec.seed}-${Math.random().toString(36).slice(2, 7)}`;
  last = d.spec; LS.set('last', last);
  return addDesign(d);
}
/** a small RGBA picture → data URL (scaled up so the browser smooths it) */
function picUrl(img, scale = 1) {
  const c = Object.assign(document.createElement('canvas'), { width: img.w, height: img.h });
  const x = c.getContext('2d'), id = x.createImageData(img.w, img.h); id.data.set(img.data); x.putImageData(id, 0, 0);
  if (scale === 1) return c.toDataURL('image/png');
  const c2 = Object.assign(document.createElement('canvas'), { width: img.w * scale, height: img.h * scale }), x2 = c2.getContext('2d');
  x2.imageSmoothingQuality = 'high'; x2.drawImage(c, 0, 0, c2.width, c2.height); return c2.toDataURL('image/png');
}

// ------------------------------------------------------------------ the artist brain (src/artist)
let artist = null, artistLoading = null, practising = false, stopPractice = false;
function getArtist() {
  if (artist) return Promise.resolve(artist);
  return (artistLoading ||= (async () => {
    const a = await new ArtistClient().start();
    if ((a.s.views || 0) < 16) lookAround(a, 16);
    artist = a; updateArtStat();
    return a;
  })().catch((e) => { console.warn('artist brain unavailable', e); artistLoading = null; return null; }));
}
/** the fly glances around the studio — one view per frame so the page never stalls */
async function lookAround(a, n) {
  if (!studio) return;
  for (let i = 0; i < n; i++) {
    await new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 600 }) : setTimeout(r, 60)));
    if (view === 'brain' || document.hidden) continue;          // the studio isn't on screen: don't render it twice
    const s = studio.snapshot(Math.random() < 0.2 ? 'self' : 'studio', 96, 72);
    if (s) a.see(s.img, 'studio').catch(() => {});
  }
}
function updateArtStat() { const el = $('#st-art'); if (el && artist) { el.textContent = artist.title; el.parentElement.title = `The fly's artist brain: ${artist.params.toLocaleString()} weights, ${artist.steps.toLocaleString()} practice steps, ${Object.keys(artist.concepts).length} things you taught it`; } }
const toRGBA = (px, n) => { const d = new Uint8ClampedArray(n * n * 4); for (let i = 0; i < n * n; i++) { d[i * 4] = px[i * 3] * 255; d[i * 4 + 1] = px[i * 3 + 1] * 255; d[i * 4 + 2] = px[i * 3 + 2] * 255; d[i * 4 + 3] = 255; } return d; };
function drawSpark(cv, hist) {
  const x = cv.getContext('2d'), w = cv.width, h = cv.height; x.clearRect(0, 0, w, h);
  if (hist.length < 2) return;
  const lo = Math.min(...hist), hi = Math.max(...hist);
  x.strokeStyle = '#8be9c1'; x.lineWidth = 2; x.beginPath();
  hist.forEach((v, i) => { const px = (i / (hist.length - 1)) * (w - 4) + 2, py = h - 3 - ((v - lo) / ((hi - lo) || 1)) * (h - 6); i ? x.lineTo(px, py) : x.moveTo(px, py); });
  x.stroke();
}
/** a practice session with a live card: what it looks at, its attempt, the error going down */
async function startPractice(msgEl, ms = 45000, quietIntro = false) {
  const a = await getArtist();
  if (!a) { msgEl?.appendChild(Object.assign(document.createElement('p'), { className: 'muted small', textContent: 'My artist brain could not start in this browser (TensorFlow.js failed to load).' })); return; }
  if (practising) return;
  practising = true; stopPractice = false;
  try { if ((a.s.views || 0) < 8) await lookAround(a, 8); } catch {}
  const card = document.createElement('div'); card.className = 'evo art';
  card.innerHTML = `<div class="evo-top"><b>🎨 Practising · <span class="lv">${a.title}</span></b><span class="acc">error <span class="err">—</span></span></div>
    <div class="art-row"><figure><canvas class="tgt" width="32" height="32"></canvas><figcaption>what I look at</figcaption></figure><figure><canvas class="att" width="32" height="32"></canvas><figcaption>my attempt</figcaption></figure><figure><canvas class="img" width="32" height="32"></canvas><figcaption>I imagine…</figcaption></figure><div class="art-side"><canvas class="spark" width="150" height="46"></canvas><span class="small muted st"></span></div></div>
    <div class="evo-foot"><button class="btn stop">■ Stop</button><button class="btn teachb">✎ Teach me something</button><button class="btn exp" title="Download the artist brain">⇩</button><label class="btn" title="Load an artist brain">⇧<input type="file" class="imp" accept="application/json" hidden></label><span class="muted small evo-hint">a real neural network (${a.params.toLocaleString()} weights) learning in your browser — nothing is built in</span></div>`;
  (msgEl || addMsg('fly', '')).appendChild(card); $('#messages').scrollTop = 1e9;
  card.querySelector('.stop').onclick = () => { stopPractice = true; a.stop(); };
  card.querySelector('.teachb').onclick = () => openTeachPad('', '');
  card.querySelector('.exp').onclick = async () => download('designfly-artist-brain.json', JSON.stringify(await a.dump()), 'application/json');
  card.querySelector('.imp').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { await a.load(JSON.parse(await f.text())); updateArtStat(); toast('Artist brain loaded'); } catch (err) { toast('Not an artist brain file'); } };
  const put = (cv, px) => { const id = new ImageData(toRGBA(px, 32), 32, 32); cv.getContext('2d').putImageData(id, 0, 0); };
  const board = Object.assign(document.createElement('canvas'), { width: 640, height: 320 }), bx = board.getContext('2d');
  const small = Object.assign(document.createElement('canvas'), { width: 32, height: 32 });
  studio?.startPractice();
  let before = null, after = null, t0 = Date.now(), lastBoard = 0, steps0 = a.steps;
  const update = ({ preview }) => {
    put(card.querySelector('.tgt'), preview.target); put(card.querySelector('.att'), preview.canvas);
    card.querySelector('.st').textContent = `${a.steps.toLocaleString()} practice steps · ${Math.max(0, Math.round((ms - (Date.now() - t0)) / 1000))} s left`;
    card.querySelector('.lv').textContent = a.title;
    if (Date.now() - (update.im || 0) > 2500) { update.im = Date.now(); a.imagine({ seed: Date.now() }).then((im) => card.querySelector('.img').getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(im.img.data), 32, 32), 0, 0)).catch(() => {}); }
    if (studio && Date.now() - lastBoard > 900) {        // show the attempt on the easel
      lastBoard = Date.now();
      bx.fillStyle = '#f7f3ea'; bx.fillRect(0, 0, 640, 320); bx.imageSmoothingEnabled = true;
      for (const [k, px] of [[0, preview.target], [1, preview.canvas]]) { small.getContext('2d').putImageData(new ImageData(toRGBA(px, 32), 32, 32), 0, 0); bx.drawImage(small, 20 + k * 310, 20, 290, 280); }
      bx.fillStyle = '#555'; bx.font = '18px Caveat, cursive'; bx.fillText('what I see', 24, 316); bx.fillText('my attempt', 334, 316);
      studio.setImage(board, 2, false);
    }
  };
  try {
    before = await a.exam(); after = before;
    while (Date.now() - t0 < ms && !stopPractice) {
      lookAround(a, 3);
      await a.practice({ ms: Math.min(8000, ms - (Date.now() - t0)), onTick: update });
      after = await a.exam();
      if (before != null && after != null) card.querySelector('.err').textContent = `${before.toFixed(3)} → ${after.toFixed(3)}`;
      drawSpark(card.querySelector('.spark'), a.history.slice(-60));
      updateArtStat();
    }
  } catch (e) {
    console.warn('practice failed', e);
  } finally {
    practising = false; studio?.stopPractice();
    card.querySelector('.stop').disabled = true;
  }
  const done = a.steps - steps0, better = before > 0 && after != null ? Math.round((1 - after / before) * 100) : 0;
  if ((!quietIntro || done) && before != null && after != null) msgEl?.appendChild(Object.assign(document.createElement('p'), { className: 'small', textContent: `${done.toLocaleString()} practice steps. My painting error went ${before.toFixed(3)} → ${after.toFixed(3)} (${better >= 0 ? '−' : '+'}${Math.abs(better)} %). Level: ${a.title}.` }));
  studio?.setMood(better > 0 ? 'happy' : 'think');
}
/** quiet practice when nobody is asking for anything */
setInterval(async () => {
  if (cfg.practice === false || busy || practising || !artist || document.visibilityState !== 'visible' || !studio || studio.busy || studio.mode === 'muse') return;
  practising = true;
  try { lookAround(artist, 2); await artist.practice({ ms: 3000, yieldEvery: 1 }); updateArtStat(); } catch {} finally { practising = false; }
}, 40000);
/** a drawing pad: you draw something, name it, and the fly learns from your drawing */
function openTeachPad(label = '', name = '') {
  const dlg = $('#teachpad'), cv = $('#tp-canvas'), x = cv.getContext('2d');
  $('#tp-label').value = name || label || '';
  let col = '#1d1d1f', size = 10, drawing = false, lastP = null;
  const hist = [];
  const clear = () => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, cv.width, cv.height); };
  clear();
  const sw = $('#tp-swatches'); sw.innerHTML = '';
  for (const c of ['#1d1d1f', '#ffffff', '#e0533d', '#f08a3a', '#f6c945', '#5d9b4c', '#3f7fd0', '#8e6bd1', '#7a4a2a', '#f4a3b5', '#9aa0a8', '#8fcbea']) {
    const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.onclick = () => { col = c; sw.querySelectorAll('button').forEach((q) => q.classList.toggle('on', q === b)); }; sw.appendChild(b);
  }
  sw.firstChild.classList.add('on');
  $('#tp-size').oninput = (e) => { size = +e.target.value; };
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * cv.width, ((e.clientY - r.top) / r.height) * cv.height]; };
  cv.onpointerdown = (e) => { drawing = true; cv.setPointerCapture(e.pointerId); hist.push(x.getImageData(0, 0, cv.width, cv.height)); if (hist.length > 20) hist.shift(); lastP = pos(e); x.fillStyle = col; x.beginPath(); x.arc(lastP[0], lastP[1], size / 2, 0, Math.PI * 2); x.fill(); };
  cv.onpointermove = (e) => { if (!drawing) return; const p = pos(e); x.strokeStyle = col; x.lineWidth = size; x.lineCap = 'round'; x.beginPath(); x.moveTo(...lastP); x.lineTo(...p); x.stroke(); lastP = p; };
  cv.onpointerup = cv.onpointercancel = () => { drawing = false; };
  $('#tp-undo').onclick = () => { const h = hist.pop(); if (h) x.putImageData(h, 0, 0); };
  $('#tp-clear').onclick = () => { hist.push(x.getImageData(0, 0, cv.width, cv.height)); clear(); };
  $('#tp-teach').onclick = async () => {
    const lab = $('#tp-label').value.trim();
    if (!lab) { $('#tp-label').focus(); return; }
    dlg.close();
    const el = addMsg('fly', md('…'));
    await teachFromPhoto(el, { img: cv.toDataURL('image/png'), label: lab });
  };
  dlg.showModal();
}
async function teachFromPhoto(msgEl, { img, label }) {
  const a = await getArtist();
  if (!a) return;
  const ref = await imageRef(img, '', 96), id = labelOf(label), n = await a.teach(ref.img, id);
  msgEl.innerHTML = md(/[а-яё]/i.test(label) ? `Запомнила: это **${esc(label)}** (${n} ${n === 1 ? 'пример' : 'примера'}). Немного потренируюсь на нём…` : `Got it — that's a **${esc(label)}** (${n} example${n === 1 ? '' : 's'}). Let me practise on it a little…`);
  await startPractice(msgEl, 12000, true);
  setChips([/[а-яё]/i.test(label) ? `Нарисуй картину: ${label}` : `Paint a ${label} from memory`, 'Practise painting', 'Imagine a painting']);
}
function updateHandStat() { const el = $('#st-hand'); if (el && taste) el.textContent = Math.round(taste.skill * 100) + '%'; }
function customDesign(svg) {
  const { w, h } = svgSize(svg);
  return addDesign({ id: 'svg-' + Date.now().toString(36), kind: 'svg', title: (svg.match(/<title>([^<]+)/)?.[1] || 'Freehand drawing').slice(0, 60), svg, w, h, notes: 'Drawn freehand (SVG written by the language model).', assets: [], spec: null });
}
function addDesign(d) {
  designs.push(d);
  d.url = svgUrl(d.svg);
  d.ready = embedFonts(d.svg).then((s) => { d.embedded = s; URL.revokeObjectURL(d.url); d.url = svgUrl(s); for (const img of document.querySelectorAll(`img[data-id="${d.id}"]`)) img.src = d.url; return s; }).catch(() => (d.embedded = d.svg));
  persistGallery(); renderGallery();
  $('#st-made').textContent = designs.length;
  return d;
}
function attachCard(el, d) {
  const c = document.createElement('div'); c.className = 'dcard';
  c.innerHTML = `<button class="pic" title="Open"><img data-id="${d.id}" alt="${esc(d.title)}" src="${d.url}"></button><div class="bar"><b>${esc(d.title)}</b>${d.hand ? '<button class="btn rate" data-r="1" title="I like this — draw more like it">👍</button><button class="btn rate" data-r="-1" title="Not my taste">👎</button>' : ''}<button class="btn" data-a="svg">SVG</button><button class="btn" data-a="png">PNG</button>${d.assets?.length ? '<button class="btn" data-a="zip">ZIP</button>' : ''}</div>`;
  c.querySelectorAll('[data-r]').forEach((b) => b.onclick = () => {
    if (c.dataset.rated) return;
    const sign = +b.dataset.r; c.dataset.rated = 1; b.classList.add('on');
    taste.feedback(d.kind, d.kind === 'painting' ? d.spec.paint : d.spec.hand, sign); updateHandStat();
    if (sign > 0 && d.z && artist) artist.like(d.z);
    const fav = taste.favourites(d.kind);
    toast(sign > 0 ? (fav.length ? `Noted — I'm getting into ${fav.slice(0, 2).join(' and ')}` : 'Noted — more like this') : 'Noted — less of that');
    studio?.setMood(sign > 0 ? 'happy' : 'think');
  });
  c.querySelector('.pic').onclick = () => openViewer(d);
  c.querySelector('img').onload = () => { $('#messages').scrollTop = 1e9; };
  c.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => ({ svg: dlSVG, png: dlPNG, zip: dlZIP })[b.dataset.a](d));
  el.appendChild(c);
  $('#messages').scrollTop = 1e9;
}
async function showOnBoard(d, animate) {
  if (!studio) return;
  const svg = await d.ready;
  const canvas = await svgToCanvas(svg, 1600);
  studio.setPalette(d.palette?.map((p) => p.hex));
  await studio.setImage(canvas, d.w / d.h, animate, animate && d.ops ? { ops: d.ops, w: d.w, h: d.h, bg: d.bg } : null);
}

function persistGallery() {
  if (restoring) return;
  LS.set('gallery', designs.slice(-40).map((d) => (d.kind === 'svg' ? (d.svg.length < 120000 ? { svg: d.svg } : null) : d.kind === 'painting' ? (d.neural ? (d.svg.length < 90000 ? { painting: { neural: true, svg: d.svg, spec: d.spec, title: d.title, notes: d.notes, w: d.w, h: d.h, ref: d.ref || null, what: d.what || '', palette: d.palette } } : null) : { painting: { spec: d.spec, ref: d.ref || null, what: d.what || '' } }) : { spec: d.spec })).filter(Boolean));
}
async function restoreGallery() {
  const g = LS.get('gallery', []);
  restoring = true;
  for (const item of g) {
    try {
      if (item.painting) {
        const sp = item.painting.spec;
        if (item.painting.neural) { const P = item.painting, d = { kind: 'painting', title: P.title, svg: P.svg, w: P.w, h: P.h, notes: P.notes, palette: P.palette || [], spec: sp, hand: true, neural: true, ref: P.ref, what: P.what, id: `painting-${sp.seed}-${Math.random().toString(36).slice(2, 7)}` }; d.assets = sawAsset(d); addDesign(d); }
        else if (item.painting.ref) { const ref = await imageRef(item.painting.ref, item.painting.what); const d = paintingDesign(ref.img, sp, ref.what); d.ref = item.painting.ref; d.what = ref.what; d.assets = sawAsset(d); addDesign(d); }
        else addDesign(generate(sp));
      } else if (item.spec) addDesign(generate(item.spec)); else customDesign(item.svg);
    } catch (e) { console.warn('could not restore', e); }
  }
  restoring = false; persistGallery();
  if (designs.length) showOnBoard(designs[designs.length - 1], false);
}
function renderGallery() {
  const g = $('#gallery');
  $('#gal-count').textContent = designs.length ? `(${designs.length})` : '';
  if (!designs.length) { g.innerHTML = '<p class="muted small empty">Everything the fly draws lands here. Click to open, download SVG / PNG / ZIP.</p>'; return; }
  g.innerHTML = '';
  for (const d of designs.slice().reverse()) {
    const b = document.createElement('button'); b.className = 'thumb'; b.title = d.title;
    b.innerHTML = `<img data-id="${d.id}" src="${d.url}" alt=""><span>${esc(d.title)}</span>`;
    b.onclick = () => openViewer(d);
    g.appendChild(b);
  }
}

// ------------------------------------------------------------------ viewer + downloads
let current = null;
function openViewer(d) {
  current = d;
  $('#v-img').src = d.url; $('#v-img').dataset.id = d.id;
  $('#v-kind').textContent = d.kind === 'svg' ? 'freehand svg' : KINDS[d.kind]?.label || d.kind;
  $('#v-title').textContent = d.title;
  $('#v-notes').innerHTML = md(d.notes || '');
  const pal = $('#v-pal'); pal.innerHTML = '';
  for (const c of d.palette || []) { const b = document.createElement('button'); b.style.background = c.hex; b.title = `${c.role} ${c.hex} — click to copy`; b.innerHTML = `<span>${c.hex}</span>`; b.onclick = () => { navigator.clipboard?.writeText(c.hex); toast(c.hex + ' copied'); }; pal.appendChild(b); }
  $('#v-zip').classList.toggle('hidden', !d.assets?.length);
  $('#v-var').classList.toggle('hidden', !d.spec); $('#v-sketch').classList.toggle('hidden', !d.spec);
  const hk = HAND_KINDS.includes(d.kind) && d.kind !== 'drawing';
  $('#v-sketch').classList.toggle('hidden', !d.spec || d.kind === 'drawing' || d.kind === 'painting');
  $('#v-sketch').textContent = hk ? (d.hand ? '▭ Template version' : '✎ Draw it by hand') : d.spec?.sketch ? '▭ Clean version' : '✎ Hand-drawn';
  const as = $('#v-assets'); as.innerHTML = d.assets?.length ? '<p class="muted small" style="margin:0 0 2px">Files in the ZIP:</p>' : '';
  for (const a of d.assets || []) { const l = document.createElement('a'); l.textContent = '↓ ' + a.name; l.onclick = () => dlAsset(d, a); as.appendChild(l); }
  $('#v-svg').onclick = () => dlSVG(d); $('#v-png').onclick = () => dlPNG(d); $('#v-zip').onclick = () => dlZIP(d);
  $('#v-copy').onclick = async () => { navigator.clipboard?.writeText(await d.ready); toast('SVG copied'); };
  $('#v-board').onclick = () => { $('#viewer').close(); showOnBoard(d, true); };
  $('#v-var').onclick = async () => { $('#viewer').close(); if (d.kind === 'painting') { const nd = await makePainting({ ...d.spec, seed: d.spec.seed + 1 + Math.floor(Math.random() * 999), paint: undefined }, d.spec.scene === 'photo' ? d.ref : null); const el = addMsg('fly', md('Another go:')); attachCard(el, nd); showOnBoard(nd, true); return; } const nd = makeDesign({ ...d.spec, seed: d.spec.seed + 1 + Math.floor(Math.random() * 999) }); const el = addMsg('fly', md('A variation:')); attachCard(el, nd); showOnBoard(nd, true); };
  $('#v-sketch').onclick = () => { $('#viewer').close(); const nd = makeDesign(hk ? { ...d.spec, hand: !d.hand, sketch: false } : { ...d.spec, sketch: !d.spec.sketch }); const el = addMsg('fly', md(hk ? (nd.hand ? 'Drawing it myself:' : 'Template version:') : nd.spec.sketch ? 'Pencil version:' : 'Clean vector version:')); attachCard(el, nd); showOnBoard(nd, true); };
  $('#viewer').showModal();
}
const fname = (d, ext) => `designfly-${slug(d.title)}.${ext}`;
async function dlSVG(d) { download(fname(d, 'svg'), await d.ready, 'image/svg+xml'); }
async function dlPNG(d) { toast('Rendering PNG…'); const blob = await svgToPngBlob(await d.ready, +($('#v-scale')?.value || 3200)); download(fname(d, 'png'), blob); }
async function dlAsset(d, a) {
  if (a.svg) download(`${slug(d.title)}-${a.name}`, await embedFonts(a.svg), 'image/svg+xml');
  else download(`${slug(d.title)}-${a.name}`, a.text, a.mime || 'text/plain');
}
async function dlZIP(d) {
  toast('Packing ZIP…');
  const base = slug(d.title);
  const files = [{ name: `${base}/${base}.svg`, data: await d.ready }, { name: `${base}/${base}.png`, data: await svgToPngBlob(await d.ready, 3200) }];
  for (const a of d.assets || []) {
    if (a.svg) { const s = await embedFonts(a.svg); files.push({ name: `${base}/${a.name}`, data: s }); files.push({ name: `${base}/${a.name.replace(/\.svg$/, '.png')}`, data: await svgToPngBlob(s, 2048) }); }
    else files.push({ name: `${base}/${a.name}`, data: a.text });
  }
  files.push({ name: `${base}/README.txt`, data: `${d.title}\n\n${(d.notes || '').replace(/\*\*/g, '')}\n\nMade by DESIGNFLY — https://github.com/znatgost/designfly\nSpec (paste into the chat as JSON to regenerate): ${JSON.stringify(d.spec)}\n` });
  download(`designfly-${base}.zip`, await zip(files));
}

// ------------------------------------------------------------------ the muse
async function startMuse(msgEl) {
  museReq = msgEl;
  if (view === 'brain') setView('studio');
  if (!studio) { postIdea([]); return; }
  for (let i = 0; i < 160 && (studio.busy || studio.mode === 'muse'); i++) await new Promise((r) => setTimeout(r, 250));   // let it finish drawing first
  const route = await studio.muse();
  if (route === null && museReq) postIdea([]);          // the fly was busy drawing: an idea anyway
}
/** called when the spark pops above the fly's head (or directly, without 3D) */
function postIdea(route) {
  const idea = museIdea(route || []);
  lastIdea = idea;
  if (museReq) {                                         // the user asked: say it
    museReq = null;
    addMsg('fly', md(idea.text));
    setChips(idea.chips);
  } else if (!busy) {                                    // found on its own while bored: offer it quietly
    const cur = [...document.querySelectorAll('#chips button')].map((b) => b.textContent).filter((t) => !t.startsWith('✦ '));
    setChips(['✦ ' + idea.prompt, ...cur]);
  }
}

// ------------------------------------------------------------------ the mind: views, evolution, dreaming
function setView(v) {
  view = v === 'brain' && brain3d ? 'brain' : v === 'brain' ? 'studio' : v;
  document.querySelectorAll('.views button').forEach((x) => x.classList.toggle('on', x.dataset.view === view));
  $('#brainwrap').classList.toggle('hidden', view !== 'brain');
  if (brain3d) brain3d.visible = view === 'brain';
  if (view !== 'brain') studio?.setView(view);
  else if (brain3d?.lastThought) brain3d.onThink(brain3d.lastThought);
  else idleThought();
}
/** keep the brain alive: when nobody is asking, the mind looks at its favourites or a fresh idea */
function idleThought() {
  const r = rng((Math.random() * 1e9) | 0), fav = mind.favourite();
  mind.think(fav && r.chance(0.6) ? mutate(fav, r, 0.6) : randomGenome(r));
}
setInterval(() => { if (view === 'brain' && mind && !mind.dreaming && !busy && !manual && document.visibilityState === 'visible') idleThought(); }, 3200);
const brandCols = (spec) => { const C = context(normalize({ kind: 'logo', ...spec })).C; return [C.primary, C.secondary, C.accent]; };
function mindVariation(g) {
  const r = rng(Date.now() & 0xffffff);
  let best = null;
  for (let i = 0; i < 40; i++) { const c = mutate(g, r, 0.7), t = mind.think(c, false); if (!best || t.logit > best.l) best = { g: c, l: t.logit }; }
  mind.think(best.g);
  return best.g;
}

function buildBrainUI() {
  updateMindHUD(); updateHandStat();
  const meter = $('#b-meter'), verdict = $('#b-verdict'), rc = $('#b-retina').getContext('2d');
  mind.on('think', (e) => {
    if (view !== 'brain') return;
    $('#b-mark').innerHTML = genomeDoc(e.genome, mind.cols, 72, '#f3efe8', 'see');
    const img = rc.createImageData(32, 32), cols = mind.cols.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    for (let i = 0; i < 1024; i++) { const v = e.px[i], c = v < 0 ? [24, 22, 28] : cols[v]; img.data.set([c[0], c[1], c[2], 255], i * 4); }
    rc.putImageData(img, 0, 0);
    meter.style.width = Math.round(e.p * 100) + '%';
    verdict.textContent = `${e.dream ? 'dreaming · ' : ''}"${e.p > 0.8 ? 'love it' : e.p > 0.6 ? 'like it' : e.p > 0.4 ? 'not sure' : e.p > 0.2 ? 'meh' : 'no'}" — ${Math.round(e.p * 100)}%`;
  });
  mind.on('learn', () => updateMindHUD());
  $('#b-evolve').onclick = () => { $('#input').value = 'Evolve a logo with me'; send(); };
  $('#b-dream').onclick = () => { if (mind.dreaming) { mind.stop(); return; } const el = addMsg('fly', md('Dreaming for 30 seconds — breeding marks against my own taste…')); startDream(el, 30000); };
  $('#b-export').onclick = () => download(`designfly-mind-lv${mind.stats.level}.json`, mind.exportJSON(), 'application/json');
  $('#b-import').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const j = JSON.parse(await f.text()); if (j.v !== 1 || !j.net) throw new Error('not a Designfly mind'); LS.set('mind', j); await mind.init(); updateMindHUD(); toast('Mind loaded'); }
    catch (err) { toast('Could not load: ' + err.message); }
    e.target.value = '';
  };
  $('#b-reset').onclick = async () => { if (!confirm('Forget everything the fly learned about your taste?')) return; await mind.bootstrap(); updateMindHUD(); toast('A new mind is born'); };
}
function updateMindHUD() {
  const s = mind.stats;
  $('#st-level').textContent = `Lv ${s.level} · ${s.title}`;
  $('#b-lv').textContent = s.level; $('#b-title').textContent = s.title;
  $('#b-lessons').textContent = `${s.lessons} lessons · ${s.toNext} to next level`;
  $('#b-acc').textContent = s.accuracy === null ? '—' : Math.round(s.accuracy * 100) + '%';
  $('#b-sub').textContent = `${s.neurons} neurons · ${s.params.toLocaleString('en')} synapses · ${s.screens} rounds · ${s.dreamGens} dream generations`;
  const c = $('#b-spark'), x = c.getContext('2d'), h = s.history.slice(-40);
  x.clearRect(0, 0, c.width, c.height);
  x.strokeStyle = 'rgba(255,255,255,.15)'; x.setLineDash([3, 3]); x.beginPath(); x.moveTo(0, c.height / 2); x.lineTo(c.width, c.height / 2); x.stroke(); x.setLineDash([]);
  if (h.length > 1) {
    const sm = h.map((_, i) => { const w = h.slice(Math.max(0, i - 4), i + 1); return w.reduce((a, b) => a + b, 0) / w.length; });
    x.strokeStyle = '#5ef0c6'; x.lineWidth = 2; x.beginPath();
    sm.forEach((v, i) => { const px = (i / (sm.length - 1)) * c.width, py = c.height - 2 - v * (c.height - 4); i ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.stroke();
  }
}

/** an evolution session lives in one chat card */
async function startEvolution(brand, msgEl) {
  evoBrand = brand;
  mind.setColors(brandCols(brand));
  const card = document.createElement('div'); card.className = 'evo';
  card.innerHTML = `<div class="evo-top"><span><b class="gen"></b> · ${esc(brand.name || 'your mark')}</span><span class="acc"></span></div><div class="evo-grid busy"></div>
    <div class="evo-foot"><button class="btn go breed">Breed next generation ▶</button><button class="btn dreamb">💤 Dream</button><button class="btn brainb">🧠</button><span class="muted small evo-hint">tap = ♥ · ✕ = never again · ⤴ = make it a logo</span></div>`;
  msgEl.appendChild(card); $('#messages').scrollTop = 1e9;
  const grid = card.querySelector('.evo-grid');
  let shown = [], liked = new Set(), nope = new Set();
  const render = () => {
    grid.innerHTML = '';
    for (const c of shown) {
      const cell = document.createElement('div');
      cell.className = 'cell' + (liked.has(c.id) ? ' like' : '') + (nope.has(c.id) ? ' nope' : '');
      cell.innerHTML = `<div class="svg">${genomeDoc(c.genome, mind.cols, 120, '#f3efe8', 'e' + c.id)}</div><span class="heart">♥</span>${c.wild ? '<span class="wild">wild card</span>' : ''}<div class="meter" title="how much the mind expects you to like it"><i style="width:${Math.round(c.p * 100)}%"></i></div><div class="ops"><button class="no" title="never again">✕</button><button class="use" title="make it a logo">⤴</button></div>`;
      cell.onclick = (e) => { if (e.target.closest('button')) return; nope.delete(c.id); liked.has(c.id) ? liked.delete(c.id) : liked.add(c.id); render(); };
      cell.querySelector('.no').onclick = () => { liked.delete(c.id); nope.has(c.id) ? nope.delete(c.id) : nope.add(c.id); render(); };
      cell.querySelector('.use').onclick = () => useMark(brand, c);
      cell.onmouseenter = () => mind.think(c.genome);
      grid.appendChild(cell);
    }
  };
  const next = async () => {
    grid.classList.add('busy'); studio?.setMood('think');
    shown = await mind.propose(8); liked = new Set(); nope = new Set();
    card.querySelector('.gen').textContent = `Generation ${mind.gen}`;
    render(); grid.classList.remove('busy'); $('#messages').scrollTop = 1e9;
  };
  let breeding = false;
  card.querySelector('.breed').onclick = async () => {
    if (breeding) return;
    if (!liked.size && !nope.size) { toast('Tap ♥ on at least one mark (or ✕ one) so I can learn'); return; }
    breeding = true;
    const res = mind.learn(shown, liked, nope);
    const s = mind.stats;
    card.querySelector('.acc').textContent = res.accuracy === null ? '' : `I guessed ${Math.round(res.accuracy * 100)}% of your picks`;
    updateMindHUD(); studio?.setMood('happy');
    if (s.lessons && Math.floor(Math.sqrt((s.lessons - res.lessons) / 10)) < Math.floor(Math.sqrt(s.lessons / 10))) addMsg('fly', md(`🎓 **Level up — ${s.title}!** ${s.lessons} lessons so far. ${s.accuracy !== null ? `I now predict about **${Math.round(s.accuracy * 100)}%** of your choices.` : ''}`));
    try { await next(); } finally { breeding = false; }
  };
  card.querySelector('.dreamb').onclick = () => { const el = addMsg('fly', md('Dreaming for 20 seconds on what I learned from you…')); startDream(el, 20000, brand); };
  card.querySelector('.brainb').onclick = () => setView('brain');
  await next();
}
function useMark(brand, c) {
  mind.elites.push({ genome: c.genome, t: Date.now() }); mind.save();
  const d = makeDesign({ kind: 'logo', name: brand.name, industry: brand.industry, colors: brand.colors, moods: brand.moods, mark: 'genome', genome: c.genome, evo: { gen: mind.gen, p: c.p }, seed: brand.seed || 1 });
  const el = addMsg('fly', md(`That one's ours — evolved, not picked from a template. Drawing it up as a full logo for **${esc(brand.name)}**:`));
  attachCard(el, d); setChips(handChips(['Business card for it', 'Full brand identity', 'Another one', 'Hand-drawn version'], d));
  if (view === 'brain') setView('studio');
  showOnBoard(d, true);
}
async function startDream(msgEl, ms = 30000, brand = null) {
  if (mind.dreaming) return;
  if (brand) mind.setColors(brandCols(brand));
  const btn = $('#b-dream'); btn.classList.add('on'); btn.textContent = '■ Stop dreaming';
  const line = document.createElement('p'); line.className = 'muted small'; msgEl.appendChild(line);
  let lastMood = 0;
  await mind.dream(ms, ({ gen, best }) => {
    line.textContent = `dream generation ${gen} · best so far ${Math.round(best * 100)}%`;
    if (performance.now() - lastMood > 3000) { studio?.setMood('think'); lastMood = performance.now(); }
    $('#b-sub').textContent = `${mind.stats.neurons} neurons · dreaming · generation ${gen}`;
  });
  btn.classList.remove('on'); btn.textContent = '💤 Dream 30 s';
  updateMindHUD();
  const fav = mind.best.slice(0, 4);
  if (!fav.length) return;
  const row = document.createElement('div'); row.className = 'dream-row';
  const b = brand || evoBrand || (last?.name ? last : null) || { name: 'Designfly' };
  for (const f of fav) {
    const cell = document.createElement('div'); cell.className = 'cell'; cell.title = `rated ${Math.round(f.p * 100)}% — click to make it a logo`;
    cell.innerHTML = `<div class="svg">${genomeDoc(f.genome, mind.cols, 90, '#f3efe8', 'd' + Math.random().toString(36).slice(2, 7))}</div>`;
    cell.onclick = () => useMark({ ...b, kind: 'logo' }, { genome: f.genome, p: f.p });
    cell.onmouseenter = () => mind.think(f.genome);
    row.appendChild(cell);
  }
  line.textContent = `Woke up after ${mind.dreamGens} dream generations in total. My favourites (click one to make it a logo):`;
  msgEl.appendChild(row); $('#messages').scrollTop = 1e9;
  studio?.setMood('happy');
}

// ------------------------------------------------------------------ scripting hook (tools/capture.py, console)
window.designfly = {
  get studio() { return studio; }, get taste() { return taste; }, artist: () => getArtist(), get designs() { return designs; }, get mind() { return mind; }, get brain() { return brain3d; }, setView: (v) => setView(v),
  say: (t) => { $('#input').value = t; return send(); },
  make: (spec) => { const d = makeDesign(spec); return showOnBoard(d, true); },
  manual(on = true) { manual = on; },
  render(t, dt) { if (view === 'brain') brain3d?.draw(t); else studio?.draw(t, dt); },
};
