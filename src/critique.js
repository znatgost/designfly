// Image critique: palette (k-means), brightness, saturation, busyness (edge density),
// whitespace (share of pixels close to the background colour) and visual centre of mass.
import { kmeans, rgbToHex, rgbToHsl, luminance } from './design/color.js';

export async function analyzeImage(dataUrl) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
  const S = 160, k = Math.min(1, S / Math.max(img.width, img.height));
  const w = Math.max(8, Math.round(img.width * k)), h = Math.max(8, Math.round(img.height * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  const px = [], lum = new Float32Array(w * h);
  let sat = 0, br = 0;
  for (let i = 0; i < w * h; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    px.push([r, g, b]);
    const [, s, l] = rgbToHsl([r, g, b]); sat += s / 100 * (1 - Math.abs(l / 50 - 1)); br += l / 100;
    lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  const pal = kmeans(px.filter((_, i) => i % 2 === 0), 7);
  // background = most common colour along the border
  const border = [];
  for (let i = 0; i < w; i++) border.push(px[i], px[(h - 1) * w + i]);
  for (let j = 0; j < h; j++) border.push(px[j * w], px[j * w + w - 1]);
  const bgc = kmeans(border, 2)[0]?.hex || '#ffffff';
  const [br0, bg0, bb0] = [parseInt(bgc.slice(1, 3), 16), parseInt(bgc.slice(3, 5), 16), parseInt(bgc.slice(5, 7), 16)];
  let edges = 0, space = 0, mx = 0, my = 0, mw = 0;
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const p = j * w + i;
    const gx = lum[p + 1] - lum[p - 1], gy = lum[p + w] - lum[p - w];
    if (Math.hypot(gx, gy) > 48) edges++;
    const [r, g, b] = px[p];
    const dist = Math.hypot(r - br0, g - bg0, b - bb0);
    if (dist < 38) space++;
    const wgt = Math.min(1, dist / 160);
    mx += i * wgt; my += j * wgt; mw += wgt;
  }
  const inner = (w - 2) * (h - 2);
  const byL = pal.slice().sort((a, b) => luminance(a.hex) - luminance(b.hex));
  const gcd = (a, b) => (b ? gcd(b, a % b) : a), gg = gcd(img.width, img.height);
  const ratio = img.width / gg <= 32 ? `${img.width / gg} : ${img.height / gg}` : (img.width / img.height).toFixed(2) + ' : 1';
  return {
    palette: pal, background: bgc, darkest: byL[0]?.hex || '#000000', lightest: byL[byL.length - 1]?.hex || '#ffffff',
    brightness: br / (w * h), saturation: Math.min(1, (sat / (w * h)) * 1.6), busy: edges / inner, space: space / inner,
    cx: mw ? mx / mw / w : 0.5, cy: mw ? my / mw / h : 0.5, w: img.width, h: img.height, ratio,
  };
}

export function fileToDataUrl(file, maxSide = 1400) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = async () => {
      try {
        const img = await new Promise((r2, j2) => { const i = new Image(); i.onload = () => r2(i); i.onerror = j2; i.src = fr.result; });
        const k = Math.min(1, maxSide / Math.max(img.width, img.height));
        if (k === 1 && file.size < 1.5e6) return res(fr.result);
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.88));
      } catch (e) { rej(e); }
    };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}
