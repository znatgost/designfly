// Exports: fonts embedded into SVG (so files look the same everywhere), SVG → PNG, ZIP bundles.
const FONT_ROOT = new URL('../fonts/', import.meta.url);
let manifestP = null;
const fontCache = new Map();

const manifest = () => (manifestP ||= fetch(new URL('manifest.json', FONT_ROOT)).then((r) => r.json()).catch(() => ({ fonts: {}, subsets: {} })));
async function fontData(file) {
  if (!fontCache.has(file)) fontCache.set(file, fetch(new URL(file, FONT_ROOT)).then((r) => r.arrayBuffer()).then((b) => b64(new Uint8Array(b))).catch(() => null));
  return fontCache.get(file);
}
function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }

/** Inline @font-face (base64 woff2) for every family:weight listed in data-fonts. */
export async function embedFonts(svg) {
  const m = svg.match(/data-fonts="([^"]*)"/);
  const extra = [...svg.matchAll(/font-family="'([^']+)'/g)].map((x) => x[1]);
  const want = new Map();
  if (m) for (const f of m[1].replace(/&amp;/g, '&').split('|').filter(Boolean)) { const [fam, w] = f.split(':'); want.set(fam + ':' + w, [fam, +w]); }
  const mf = await manifest();
  for (const fam of extra) if (mf.fonts[fam] && ![...want.values()].some(([f]) => f === fam)) { const ws = Object.keys(mf.fonts[fam]); want.set(fam + ':' + ws[0], [fam, +ws[0]]); }
  // weights used inline in the SVG, per family, snapped to the closest vendored weight
  for (const fam of new Set([...want.values()].map(([f]) => f))) {
    const avail = Object.keys(mf.fonts[fam] || {}).map(Number);
    if (!avail.length) continue;
    for (const w of avail) if (svg.includes(`'${fam}'`) && !want.has(fam + ':' + w) && (svg.includes(`font-weight="${w}"`))) want.set(fam + ':' + w, [fam, w]);
  }
  let css = '';
  for (const [fam, w] of want.values()) {
    const ws = mf.fonts[fam]; if (!ws) continue;
    const near = Object.keys(ws).map(Number).sort((a, b) => Math.abs(a - w) - Math.abs(b - w))[0];
    for (const [sub, file] of Object.entries(ws[near])) {
      const d = await fontData(file); if (!d) continue;
      css += `@font-face{font-family:'${fam}';font-weight:${w};font-style:normal;src:url(data:font/woff2;base64,${d}) format('woff2');unicode-range:${mf.subsets[sub]}}`;
    }
  }
  if (!css) return svg;
  const style = `<style>${css}</style>`;
  return svg.includes('<defs>') ? svg.replace('<defs>', '<defs>' + style) : svg.replace(/(<svg[^>]*>)/, `$1<defs>${style}</defs>`);
}

export const svgUrl = (svg) => URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
export function svgSize(svg) {
  const vb = svg.match(/viewBox="([\d.\s-]+)"/);
  if (vb) { const [, , w, h] = vb[1].trim().split(/\s+/).map(Number); return { w, h }; }
  return { w: +(svg.match(/width="(\d+)/)?.[1] || 1200), h: +(svg.match(/height="(\d+)/)?.[1] || 900) };
}
export function loadImage(url) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; }); }

/** SVG (fonts already embedded) → canvas */
export async function svgToCanvas(svg, maxSide = 2048) {
  const { w, h } = svgSize(svg);
  // stay under the canvas area limit of mobile Safari (~16.7 Mpx) and Chrome's 32k side limit
  const k = Math.min(maxSide / Math.max(w, h), 4, Math.sqrt(16e6 / (w * h)), 16000 / Math.max(w, h));
  const url = svgUrl(svg);
  try {
    const img = await loadImage(url);
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 2000); }
}
export async function svgToPngBlob(svg, maxSide = 3200) {
  const c = await svgToCanvas(svg, maxSide);
  return new Promise((r) => c.toBlob(r, 'image/png'));
}

export function download(name, blobOrText, mime = 'application/octet-stream') {
  const blob = blobOrText instanceof Blob ? blobOrText : new Blob([blobOrText], { type: mime });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ------------------------------------------------------------------ minimal ZIP (store, no compression)
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
export async function zip(files) {                 // files: [{ name, data: Uint8Array | string | Blob }]
  const enc = new TextEncoder(), parts = [], central = [];
  let off = 0;
  const now = new Date(), dosT = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1), dosD = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const f of files) {
    const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data instanceof Blob ? new Uint8Array(await f.data.arrayBuffer()) : f.data;
    const nm = enc.encode(f.name), crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, dosT, true); h.setUint16(12, dosD, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), nm, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, dosT, true); c.setUint16(14, dosD, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), nm);
    off += 30 + nm.length + data.length;
  }
  const cs = central.reduce((s, p) => s + p.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
}

export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'design';
