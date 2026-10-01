// The fly's design mind in 3D: every neuron of the critic network placed in a fly-brain-shaped
// head (optic lobes = retina, antennal lobes = design senses, mushroom bodies = hidden layer 1,
// central complex = hidden layer 2, one descending "taste" neuron). Every synapse is drawn, coloured
// by its weight; activity propagates layer by layer when the mind looks at a mark, and synapses
// flash where learning changed them.
import * as THREE from './vendor/three.min.js';
import { FEATURE_NAMES, RETINA } from './learn/features.js';
import { genomeDoc } from './learn/genome.js';
import { canvasTex } from './fly-model.js';

const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const REGION = {
  retina: { name: 'Optic lobes · retina 8×8', color: new THREE.Color(0xff5a5a) },
  senses: { name: 'Antennal lobes · design senses', color: new THREE.Color(0x5ef0c6) },
  memory: { name: 'Mushroom bodies · memory layer', color: new THREE.Color(0xffd166) },
  judge: { name: 'Central complex · judgement ring', color: new THREE.Color(0xb98cff) },
  taste: { name: 'Descending neuron · taste', color: new THREE.Color(0xff8a4c) },
};
const POS = new THREE.Color(1.0, 0.55, 0.22), NEG = new THREE.Color(0.25, 0.6, 1.0);

function fib(n, r) { const out = []; for (let i = 0; i < n; i++) { const y = 1 - (2 * (i + 0.5)) / n, rr = Math.sqrt(1 - y * y), t = i * 2.39996; out.push(new THREE.Vector3(Math.cos(t) * rr * r, y * r, Math.sin(t) * rr * r)); } return out; }

export class Brain3D {
  constructor(canvas, mind, overlay) {
    this.canvas = canvas; this.mind = mind; this.overlay = overlay;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true });
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = r;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x07070a);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.orbit = { yaw: 0, pitch: 0.12, dist: 22 }; this.target = new THREE.Vector3(-2.4, 0.2, 0); this.cam = { ...this.orbit }; this.auto = true;
    this.glowTex = canvasTex(64, 64, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
    this._layout();
    this._shell();
    this._neurons();
    this._synapses();
    this._pulses();
    this._labels();
    this._bind();
    this.acts = this.sizes.map((n) => new Float32Array(n)); this.prev = this.acts.map((a) => a.slice()); this.shown = this.acts.map((a) => a.slice());
    this.t0 = -1e9; this.learnT = -1e9; this.flash = new Float32Array(this.edges.length); this.recent = [];
    mind.on('think', (e) => this.onThink(e));
    mind.on('learn', () => this.onLearn());
    this.visible = false;
  }

  // ---------------------------------------------------------------- layout
  _layout() {
    const sizes = (this.sizes = this.mind.net.sizes);
    const P = [], reg = [], label = [];
    // retina: two 4×8 grids on the front faces of the optic lobes (left half of the image → left lobe)
    for (let i = 0; i < RETINA * RETINA; i++) {
      const row = Math.floor(i / RETINA), col = i % RETINA, s = col < 4 ? -1 : 1;
      const u = ((col % 4) - 1.5) / 1.5, v = (row - 3.5) / 3.5;
      const c = new THREE.Vector3(s * 8.4, 0, -0.2), rx = 2.3, ry = 3.5, rz = 2.6;
      const x = u * 0.72, y = -v * 0.8, z = Math.sqrt(Math.max(0.05, 1 - x * x - y * y));
      P.push(new THREE.Vector3(c.x + x * rx, c.y + y * ry, c.z + z * rz + 0.05)); reg.push('retina'); label.push(`retina pixel row ${row + 1}, col ${col + 1}`);
    }
    // design senses: two antennal-lobe clusters
    const al = fib(10, 0.95);
    FEATURE_NAMES.forEach((n, i) => { const s = i < 10 ? -1 : 1; P.push(al[i % 10].clone().add(new THREE.Vector3(s * 1.7, -1.7, 2.5))); reg.push('senses'); label.push(n); });
    // hidden 1: mushroom-body calyces
    const mb = fib(12, 1.15);
    for (let i = 0; i < sizes[1]; i++) { const s = i < sizes[1] / 2 ? -1 : 1; P.push(mb[i % 12].clone().add(new THREE.Vector3(s * 2.8, 2.0, -1.0))); reg.push('memory'); label.push(`memory neuron ${i + 1}`); }
    // hidden 2: ellipsoid-body ring
    for (let i = 0; i < sizes[2]; i++) { const t = (i / sizes[2]) * TAU + Math.PI / 2; P.push(new THREE.Vector3(Math.cos(t) * 1.55, 0.25 + Math.sin(t) * 1.05, 0.9)); reg.push('judge'); label.push(`judgement neuron ${i + 1}`); }
    P.push(new THREE.Vector3(0, -2.9, 1.0)); reg.push('taste'); label.push('taste neuron');
    this.pos = P; this.reg = reg; this.nlabel = label;
    this.offset = sizes.map((_, l) => sizes.slice(0, l).reduce((a, b) => a + b, 0));
  }
  _shell() {
    const pts = [], cols = [];
    const add = (c, rx, ry, rz, n, col, jitter = 0.06) => {
      for (let i = 0; i < n; i++) {
        const y = 1 - (2 * (i + 0.5)) / n, rr = Math.sqrt(1 - y * y), t = i * 2.39996, k = 1 + (Math.random() - 0.5) * jitter * 2;
        pts.push(c[0] + Math.cos(t) * rr * rx * k, c[1] + y * ry * k, c[2] + Math.sin(t) * rr * rz * k);
        const b = 0.35 + Math.random() * 0.35; cols.push(col[0] * b, col[1] * b, col[2] * b);
      }
    };
    add([0, 0, 0], 5.4, 3.8, 3.2, 3600, [0.45, 0.55, 0.85]);
    add([-8.4, 0, -0.2], 2.5, 3.8, 2.8, 1500, [0.85, 0.35, 0.35]); add([8.4, 0, -0.2], 2.5, 3.8, 2.8, 1500, [0.85, 0.35, 0.35]);
    add([-1.7, -1.7, 2.5], 1.25, 1.25, 1.25, 300, [0.3, 0.8, 0.65]); add([1.7, -1.7, 2.5], 1.25, 1.25, 1.25, 300, [0.3, 0.8, 0.65]);
    add([-2.8, 2.0, -1.0], 1.5, 1.5, 1.5, 300, [0.8, 0.7, 0.3]); add([2.8, 2.0, -1.0], 1.5, 1.5, 1.5, 300, [0.8, 0.7, 0.3]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 3));
    this.shell = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.shell);
  }
  _neurons() {
    const N = this.pos.length;
    const geo = new THREE.SphereGeometry(1, 14, 10);
    this.nmesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ toneMapped: false }), N);
    this.base = this.pos.map((_, i) => (this.reg[i] === 'taste' ? 0.5 : this.reg[i] === 'retina' ? 0.17 : 0.2));
    const m = new THREE.Matrix4();
    for (let i = 0; i < N; i++) { m.makeScale(this.base[i], this.base[i], this.base[i]).setPosition(this.pos[i]); this.nmesh.setMatrixAt(i, m); this.nmesh.setColorAt(i, REGION[this.reg[i]].color); }
    this.scene.add(this.nmesh);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pos.flatMap((p) => [p.x, p.y, p.z])), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.halo = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.3, map: this.glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.halo);
  }
  _bez(a, b, t, out) {
    const mid = a.clone().add(b).multiplyScalar(0.5); mid.multiplyScalar(0.55); mid.z += 0.8;
    const u = 1 - t;
    return out.set(u * u * a.x + 2 * u * t * mid.x + t * t * b.x, u * u * a.y + 2 * u * t * mid.y + t * t * b.y, u * u * a.z + 2 * u * t * mid.z + t * t * b.z);
  }
  _synapses() {
    const S = 5, edges = [], pos = [];
    const v = new THREE.Vector3();
    for (let l = 0; l < this.sizes.length - 1; l++) {
      const nin = this.sizes[l], nout = this.sizes[l + 1];
      for (let j = 0; j < nout; j++) for (let i = 0; i < nin; i++) {
        const a = this.pos[this.offset[l] + i], b = this.pos[this.offset[l + 1] + j];
        edges.push({ l, i, j, w: j * nin + i });
        for (let s = 0; s < S; s++) { this._bez(a, b, s / S, v); pos.push(v.x, v.y, v.z); this._bez(a, b, (s + 1) / S, v); pos.push(v.x, v.y, v.z); }
      }
    }
    this.edges = edges; this.SEG = S;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    this.ecol = new THREE.BufferAttribute(new Float32Array(pos.length), 3); this.ecol.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('color', this.ecol);
    this.lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.lines);
  }
  _pulses() {
    const n = (this.PN = 700);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.pulse = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.55, map: this.glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.pulse);
    this.pl = [];
  }
  _labels() {
    this.labelEls = {};
    const centers = { retina: [new THREE.Vector3(8.4, 4.6, 0), 'R'], senses: [new THREE.Vector3(-4.2, -2.6, 3), 'L'], memory: [new THREE.Vector3(0, 4.1, -1), 'C'], judge: [new THREE.Vector3(4.2, 0.6, 1.2), 'R'], taste: [new THREE.Vector3(1.8, -4.3, 1), 'C'] };
    for (const [k, [p]] of Object.entries(centers)) {
      const d = document.createElement('div'); d.className = 'blabel'; d.innerHTML = `<i style="background:#${REGION[k].color.getHexString()}"></i>${REGION[k].name}`;
      this.overlay.appendChild(d); this.labelEls[k] = { el: d, p };
    }
    this.tip = document.createElement('div'); this.tip.className = 'btip hidden'; this.overlay.appendChild(this.tip);
  }

  now() { return this.fakeNow ?? performance.now(); }

  // ---------------------------------------------------------------- events
  onThink(e) {
    const now = this.now();
    this.prev = this.shown.map((a) => a.slice());
    this.acts = e.acts.map((a) => Float32Array.from(a));
    this.t0 = now; this.lastThought = e;
    this.recent.push({ genome: e.genome, acts: this.acts }); if (this.recent.length > 160) this.recent.shift();
    if (!this.visible) return;
    // pulses along the strongest contributing synapses
    const W = this.mind.net.W, cand = [];
    for (let k = 0; k < this.edges.length; k++) {
      const e2 = this.edges[k], a = this.acts[e2.l][e2.i], c = Math.abs(W[e2.l][e2.w] * a);
      if (c > 0.12) cand.push([c, k]);
    }
    cand.sort((a, b) => b[0] - a[0]);
    for (const [c, k] of cand.slice(0, 220)) this.pl.push({ k, t0: now + this.edges[k].l * 170 + Math.random() * 60, dur: 260 + Math.random() * 140, c: Math.min(1, c) });
    if (this.pl.length > this.PN) this.pl.splice(0, this.pl.length - this.PN);
    this.onSee?.(e);
  }
  onLearn() {
    const D = this.mind.net.delta; let mx = 1e-9;
    for (const d of D) for (let i = 0; i < d.length; i++) if (d[i] > mx) mx = d[i];
    for (let k = 0; k < this.edges.length; k++) { const e = this.edges[k]; this.flash[k] = Math.max(this.flash[k], Math.sqrt(D[e.l][e.w] / mx)); }
    this.learnT = this.now();
  }

  // ---------------------------------------------------------------- input
  _bind() {
    const c = this.canvas; let st = null;
    this.ray = new THREE.Raycaster();
    c.addEventListener('pointerdown', (e) => { c.setPointerCapture(e.pointerId); st = { x: e.clientX, y: e.clientY }; this.auto = false; });
    c.addEventListener('pointermove', (e) => {
      if (st) { this.orbit.yaw -= (e.clientX - st.x) * 0.006; this.orbit.pitch = clamp(this.orbit.pitch + (e.clientY - st.y) * 0.005, -1.2, 1.2); st = { x: e.clientX, y: e.clientY }; return; }
      this._hover(e);
    });
    c.addEventListener('pointerup', () => { st = null; }); c.addEventListener('pointerleave', () => { this.tip.classList.add('hidden'); this.hoverI = -1; });
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.orbit.dist = clamp(this.orbit.dist * Math.exp(e.deltaY * 0.001), 8, 60); }, { passive: false });
    c.addEventListener('dblclick', () => { this.auto = true; });
  }
  _hover(e) {
    const r = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
    const hit = this.ray.intersectObject(this.nmesh)[0];
    if (!hit) { this.tip.classList.add('hidden'); this.hoverI = -1; return; }
    const i = hit.instanceId; this.hoverI = i;
    const l = this.offset.findLastIndex((o) => i >= o), k = i - this.offset[l];
    const a = this.acts[l][k], reg = this.reg[i];
    let html = `<b>${this.nlabel[i]}</b><span class="r">${REGION[reg].name}</span>`;
    if (reg === 'retina') html += `<p>Sees one cell of the mark: ${Math.round(((a + 1) / 2) * 100)}% ink right now.</p>`;
    else if (reg === 'senses') html += `<p>Measures <b>${this.nlabel[i]}</b> of the mark: ${Math.round(((a + 1) / 2) * 100)}%.</p>`;
    else {
      const W = this.mind.net.W[l - 1], nin = this.sizes[l - 1], ws = [];
      for (let q = 0; q < nin; q++) ws.push([W[k * nin + q], q]);
      ws.sort((x, y) => Math.abs(y[0]) - Math.abs(x[0]));
      const nm = (q) => this.nlabel[this.offset[l - 1] + q];
      html += reg === 'taste' ? `<p>Its firing is the mind's verdict: <b>${Math.round((1 / (1 + Math.exp(-a))) * 100)}%</b> "I like this".</p>` : `<p>Activation ${a.toFixed(2)}</p>`;
      html += `<p class="ws">${ws.slice(0, 4).map(([w, q]) => `<span class="${w > 0 ? 'p' : 'n'}">${w > 0 ? '+' : '−'} ${nm(q)}</span>`).join('')}</p>`;
      if (reg !== 'taste' && this.recent.length) {
        const best = this.recent.reduce((b, x) => (x.acts[l][k] > b.acts[l][k] ? x : b));
        html += `<div class="pref"><span>fires most for<br>(of the last ${this.recent.length} marks it saw)</span>${genomeDoc(best.genome, this.mind.cols, 64, '#f3efe8', 'tip' + i)}</div>`;
      }
    }
    this.tip.innerHTML = html; this.tip.classList.remove('hidden');
    this.tip.style.left = Math.min(r.width - 250, e.clientX - r.left + 14) + 'px'; this.tip.style.top = Math.min(r.height - 160, e.clientY - r.top + 10) + 'px';
  }

  // ---------------------------------------------------------------- frame
  draw(t) {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!w || !h) return;
    if (this._w !== w || this._h !== h) { this._w = w; this._h = h; this.renderer.setPixelRatio(dpr); this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    const now = this.now();
    // displayed activations: a wave travelling layer by layer
    for (let l = 0; l < this.sizes.length; l++) {
      const u = smooth((now - this.t0 - l * 170) / 220), A = this.acts[l], P = this.prev[l], S = this.shown[l];
      for (let i = 0; i < A.length; i++) S[i] = P[i] + (A[i] - P[i]) * u;
    }
    const learnU = Math.max(0, 1 - (now - this.learnT) / 1400);
    // neurons
    const m = new THREE.Matrix4(), col = new THREE.Color(), hc = this.halo.geometry.attributes.color;
    for (let l = 0; l < this.sizes.length; l++) for (let i = 0; i < this.sizes[l]; i++) {
      const n = this.offset[l] + i, a = this.shown[l][i];
      const inten = l === 0 ? (a + 1) / 2 : l === this.sizes.length - 1 ? 1 / (1 + Math.exp(-a)) : Math.abs(a);
      const neg = l > 0 && l < this.sizes.length - 1 && a < 0;
      col.copy(REGION[this.reg[n]].color); if (neg) col.lerp(NEG, 0.6);
      col.multiplyScalar(0.2 + 0.75 * inten + 0.35 * learnU * (l > 0 ? 1 : 0));
      if (n === this.hoverI) col.setRGB(1, 1, 1);
      this.nmesh.setColorAt(n, col);
      const s = this.base[n] * (0.75 + 0.75 * inten) * (n === this.hoverI ? 1.6 : 1);
      m.makeScale(s, s, s).setPosition(this.pos[n]); this.nmesh.setMatrixAt(n, m);
      const g = inten * inten * (l === 0 ? 0.3 : 0.55);
      hc.setXYZ(n, col.r * g, col.g * g, col.b * g);
    }
    this.nmesh.instanceMatrix.needsUpdate = true; this.nmesh.instanceColor.needsUpdate = true; hc.needsUpdate = true;
    // synapses
    const W = this.mind.net.W, C = this.ecol.array, S2 = this.SEG * 2;
    const mx = W.map((Wl) => { let x = 1e-6; for (let i = 0; i < Wl.length; i++) x = Math.max(x, Math.abs(Wl[i])); return x; });
    for (let k = 0; k < this.edges.length; k++) {
      const e = this.edges[k], wv = W[e.l][e.w], mag = Math.abs(wv) / mx[e.l], pre = this.shown[e.l][e.i];
      const act = Math.min(1, Math.abs(wv * pre) * (e.l === 0 ? 1.2 : 0.8));
      const f = this.flash[k] * (e.l === 0 ? 0.22 : 0.6);
      const kc = e.l === 0 ? 0.006 + 0.035 * mag * mag + 0.17 * act * act : 0.03 + 0.2 * mag * mag + 0.5 * act * act;
      const c0 = wv > 0 ? POS : NEG;
      const r = c0.r * kc + f, gg = c0.g * kc + f, b = c0.b * kc + f;
      const o = k * S2 * 3;
      for (let s = 0; s < S2; s++) { C[o + s * 3] = r; C[o + s * 3 + 1] = gg; C[o + s * 3 + 2] = b; }
      if (f > 0) this.flash[k] = Math.max(0, f - 0.02);
    }
    this.ecol.needsUpdate = true;
    // pulses
    const pp = this.pulse.geometry.attributes.position, pc = this.pulse.geometry.attributes.color, v = new THREE.Vector3();
    let n2 = 0;
    this.pl = this.pl.filter((p) => now - p.t0 < p.dur);
    for (const p of this.pl) {
      const u = (now - p.t0) / p.dur; if (u < 0) continue;
      const e = this.edges[p.k], a = this.pos[this.offset[e.l] + e.i], b = this.pos[this.offset[e.l + 1] + e.j];
      this._bez(a, b, u, v); pp.setXYZ(n2, v.x, v.y, v.z);
      const c0 = W[e.l][e.w] > 0 ? POS : NEG, k2 = p.c * Math.sin(u * Math.PI) * 1.3;
      pc.setXYZ(n2, c0.r * k2 + 0.2 * k2, c0.g * k2 + 0.2 * k2, c0.b * k2 + 0.2 * k2); n2++;
      if (n2 >= this.PN) break;
    }
    this.pulse.geometry.setDrawRange(0, n2); pp.needsUpdate = true; pc.needsUpdate = true;
    this.shell.material.opacity = 0.45 + 0.25 * learnU;
    // camera
    if (this.auto) this.orbit.yaw = Math.sin(t * 0.00012) * 0.55;
    for (const k of ['yaw', 'pitch', 'dist']) this.cam[k] += (this.orbit[k] - this.cam[k]) * 0.08;
    const cp = Math.cos(this.cam.pitch);
    const narrow = w < 700, T = narrow ? new THREE.Vector3(0, -0.5, 0) : this.target, D = this.cam.dist * (narrow ? 1.5 : 1);
    this.camera.position.set(T.x + Math.sin(this.cam.yaw) * cp * D, T.y + Math.sin(this.cam.pitch) * D, T.z + Math.cos(this.cam.yaw) * cp * D);
    this.camera.lookAt(T);
    this.renderer.render(this.scene, this.camera);
    // labels
    for (const { el, p } of Object.values(this.labelEls)) {
      const q = p.clone().project(this.camera);
      const half = (el.offsetWidth || 120) / 2 + 6;
      el.style.transform = `translate(${clamp(((q.x + 1) / 2) * w, half, w - half)}px, ${((1 - q.y) / 2) * h}px) translate(-50%, -50%)`;
      el.style.opacity = q.z < 1 ? 1 : 0;
    }
  }
}
