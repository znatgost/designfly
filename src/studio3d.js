// The studio: a drafting desk, an easel board that shows the current design, props, lights, and
// the fly's behaviour (idle wandering, thinking, drawing on the board, presenting, and flying
// around the studio in search of its muse).
import * as THREE from './vendor/three.min.js';
import { FlyModel, canvasTex } from './fly-model.js';
import { LivePainter, tipAt } from './hand/render.js';

const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const lerpAngle = (a, b, t) => { const d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * t; };
const angTo = (dx, dz) => Math.atan2(dz, dx);

const BOARD = { z: -4.6, y0: 0.9, maxW: 11.5, maxH: 8.4 };
const HOME = new THREE.Vector3(0, 0, 2.4);

// ------------------------------------------------------------------ textures
const woodTex = () => canvasTex(1024, 512, (x, w, h) => {
  x.fillStyle = '#6b4a32'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 140; i++) {
    const y = Math.random() * h; x.strokeStyle = `rgba(${40 + Math.random() * 30},${24 + Math.random() * 20},${14},${0.15 + Math.random() * 0.25})`;
    x.lineWidth = 1 + Math.random() * 3; x.beginPath(); x.moveTo(0, y);
    for (let X = 0; X <= w; X += 32) x.lineTo(X, y + Math.sin(X * 0.01 + i) * 6 + Math.random() * 2);
    x.stroke();
  }
});
const matTex = () => canvasTex(2048, 1216, (x, w, h) => {
  x.fillStyle = '#23483f'; x.fillRect(0, 0, w, h);
  const u = w / 22;
  for (let i = 0; i <= 88; i++) { x.strokeStyle = i % 4 ? 'rgba(200,235,220,0.10)' : 'rgba(210,240,225,0.28)'; x.lineWidth = i % 4 ? 1 : 2; x.beginPath(); x.moveTo(i * u / 4, 0); x.lineTo(i * u / 4, h); x.stroke(); }
  for (let i = 0; i <= 52; i++) { x.strokeStyle = i % 4 ? 'rgba(200,235,220,0.10)' : 'rgba(210,240,225,0.28)'; x.lineWidth = i % 4 ? 1 : 2; x.beginPath(); x.moveTo(0, i * u / 4); x.lineTo(w, i * u / 4); x.stroke(); }
  x.strokeStyle = 'rgba(255,220,120,0.25)'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(0, h); x.lineTo(h, 0); x.stroke(); x.beginPath(); x.moveTo(w - h, 0); x.lineTo(w, h); x.stroke();
  x.fillStyle = 'rgba(220,245,230,0.55)'; x.font = '600 22px "JetBrains Mono", monospace';
  for (let i = 1; i < 22; i++) { x.fillText(String(i), i * u + 4, 24); x.fillText(String(i), i * u + 4, h - 10); }
  x.font = '700 30px "Space Grotesk", sans-serif'; x.fillStyle = 'rgba(220,245,230,0.4)'; x.fillText('DESIGNFLY · SELF-HEALING MAT · 1 SQ = 1 CM', 40, h - 44);
});
const pegTex = () => canvasTex(1024, 512, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a3430'); g.addColorStop(1, '#2a2522');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let j = 12; j < h; j += 24) for (let i = 12; i < w; i += 24) { x.fillStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.arc(i, j, 3.2, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,0.04)'; x.beginPath(); x.arc(i - 1, j - 1, 3.2, 0, TAU); x.fill(); }
});
const radialTex = (inner, outer) => canvasTex(256, 256, (x, w, h) => {
  const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, w, h);
});

function pencilMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.7, 6), new THREE.MeshStandardMaterial({ color: 0xf2b92c, roughness: 0.5 }));
  body.position.y = 0.25;
  const wood = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.28, 6), new THREE.MeshStandardMaterial({ color: 0xe8c9a0, roughness: 0.8 }));
  wood.rotation.x = Math.PI; wood.position.y = -0.74;
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.09, 8), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.4 }));
  lead.rotation.x = Math.PI; lead.position.y = -0.855;
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 12), new THREE.MeshStandardMaterial({ color: 0xc0c3c8, metalness: 0.8, roughness: 0.3 }));
  ferrule.position.y = 1.17;
  const eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.14, 12), new THREE.MeshStandardMaterial({ color: 0xf08aa0, roughness: 0.9 }));
  eraser.position.y = 1.31;
  for (const m of [body, wood, lead, ferrule, eraser]) { m.castShadow = true; g.add(m); }
  return g;           // tip at y ≈ −0.9, length ≈ 2.28
}

// ------------------------------------------------------------------ studio
export class Studio3D {
  constructor(canvas) {
    this.canvas = canvas;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = r;
    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color(0x1a1614);
    scene.fog = new THREE.Fog(0x1a1614, 40, 90);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);

    scene.add(new THREE.HemisphereLight(0xffe9d2, 0x2a2018, 0.9));
    const key = (this.key = new THREE.DirectionalLight(0xfff2e0, 2.1));
    key.position.set(10, 22, 14); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
    Object.assign(key.shadow.camera, { left: -18, right: 18, top: 14, bottom: -12, near: 1, far: 70 }); key.shadow.camera.updateProjectionMatrix();
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fd8ff, 0.5); rim.position.set(-14, 10, -12); scene.add(rim);
    this.fill = new THREE.DirectionalLight(0xffe6c8, 0.5); scene.add(this.fill, this.fill.target);

    // desk + cutting mat + back wall
    const desk = new THREE.Mesh(new THREE.BoxGeometry(40, 1.2, 22), new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.75 }));
    desk.position.set(0, -0.6, 0); desk.receiveShadow = true; scene.add(desk);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(22, 13), new THREE.MeshStandardMaterial({ map: matTex(), roughness: 0.95 }));
    mat.rotation.x = -Math.PI / 2; mat.position.set(0, 0.012, 1.4); mat.receiveShadow = true; scene.add(mat);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), new THREE.MeshStandardMaterial({ map: pegTex(), roughness: 1 }));
    wall.material.map.wrapS = wall.material.map.wrapT = THREE.RepeatWrapping; wall.material.map.repeat.set(4, 2);
    wall.position.set(0, 12, -11); wall.receiveShadow = true; scene.add(wall);

    this._buildBoard();
    this._buildProps();

    this.fly = new FlyModel();
    scene.add(this.fly.root);
    // the idea spark that pops above the fly's head when the muse strikes
    const sparkTex = canvasTex(256, 256, (x, w, h) => {
      const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,240,180,1)'); g.addColorStop(0.18, 'rgba(255,209,102,.9)'); g.addColorStop(0.5, 'rgba(255,170,60,.25)'); g.addColorStop(1, 'rgba(255,150,40,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = '#fff7d6'; x.beginPath();
      for (let i = 0; i < 16; i++) { const r = i % 2 ? 22 : 104, a = (i / 16) * TAU - Math.PI / 2; x.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); }
      x.closePath(); x.fill();
    });
    this.spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.spark.visible = false; scene.add(this.spark);
    this.pencil = pencilMesh(); scene.add(this.pencil);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ map: radialTex('rgba(0,0,0,0.5)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; this.flyShadow = sh; scene.add(sh);

    // behaviour state
    this.p = { x: HOME.x, y: 0, z: HOME.z, th: Math.PI / 2, pitch: 0, speed: 0, gait: 0, wings: 0, flap: 0, groom: 0, prob: 0, reach: 0, point: 0, tuck: 0, look: 0, talk: 0 };
    this.mode = 'idle'; this.modeT = 0; this.queue = [];
    this.idleT = 0; this.nextIdle = 2500; this.walkTarget = null; this.museTimer = 50000 + Math.random() * 30000; this.museAllowed = true; this.onMuse = null;
    this.moodT = 0; this.mood = null;
    this.reveal = 1; this.revealTarget = 1;

    // camera
    this.view = 'studio';
    this.orbit = { yaw: Math.PI / 2 + 0.28, pitch: 0.3, dist: 20 };
    this.cam = { yaw: this.orbit.yaw, pitch: this.orbit.pitch, dist: this.orbit.dist, target: new THREE.Vector3(0, 3.4, -1.6) };
    this.raycaster = new THREE.Raycaster();
    this._bind();
    this.onBoardClick = null;
    this.welcome();
  }

  // ---------------------------------------------------------------- board
  _buildBoard() {
    const g = (this.boardGroup = new THREE.Group()); this.scene.add(g);
    this.bc = document.createElement('canvas'); this.bc.width = 1400; this.bc.height = 1000;
    this.bctx = this.bc.getContext('2d');
    this.boardTex = new THREE.CanvasTexture(this.bc); this.boardTex.colorSpace = THREE.SRGBColorSpace; this.boardTex.anisotropy = 8;
    this.board = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: this.boardTex, roughness: 0.85 }));
    this.board.receiveShadow = true; g.add(this.board);
    const woodM = new THREE.MeshStandardMaterial({ color: 0x9a6a3f, roughness: 0.6 });
    this.frame = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), woodM); m.castShadow = true; g.add(m); return m; });
    this.backing = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.25), new THREE.MeshStandardMaterial({ color: 0x3b2c22, roughness: 0.9 })); this.backing.castShadow = true; g.add(this.backing);
    this.ledge = new THREE.Mesh(new THREE.BoxGeometry(1, 0.18, 0.9), woodM); this.ledge.castShadow = true; g.add(this.ledge);
    this.legs = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1, 0.32), woodM); m.castShadow = true; g.add(m); return m; });
    // clips
    this.clips = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.2), new THREE.MeshStandardMaterial({ color: 0x2b2b30, metalness: 0.7, roughness: 0.3 })); m.castShadow = true; g.add(m); return m; });
    this._layoutBoard(1.4);
  }
  _layoutBoard(aspect) {
    let w = BOARD.maxW, h = w / aspect;
    if (h > BOARD.maxH) { h = BOARD.maxH; w = h * aspect; }
    this.bw = w; this.bh = h;
    const cy = BOARD.y0 + 0.25 + h / 2, z = BOARD.z;
    this.board.scale.set(w, h, 1); this.board.position.set(0, cy, z + 0.14);
    const t = 0.28;
    const [top, bot, l, r] = this.frame;
    top.scale.set(w + 2 * t, t, 0.34); top.position.set(0, cy + h / 2 + t / 2, z + 0.1);
    bot.scale.set(w + 2 * t, t, 0.34); bot.position.set(0, cy - h / 2 - t / 2, z + 0.1);
    l.scale.set(t, h, 0.34); l.position.set(-w / 2 - t / 2, cy, z + 0.1);
    r.scale.set(t, h, 0.34); r.position.set(w / 2 + t / 2, cy, z + 0.1);
    this.backing.scale.set(w + 2 * t, h + 2 * t, 1); this.backing.position.set(0, cy, z - 0.08);
    this.ledge.scale.set(w + 1.2, 1, 1); this.ledge.position.set(0, BOARD.y0 - 0.02, z + 0.45);
    const lh = cy + h / 2 + 1.2;
    const [a, b, c] = this.legs;
    a.scale.y = BOARD.y0 + 0.4; a.position.set(-w / 2 + 0.6, (BOARD.y0 + 0.4) / 2 - 0.1, z + 0.3);
    b.scale.y = BOARD.y0 + 0.4; b.position.set(w / 2 - 0.6, (BOARD.y0 + 0.4) / 2 - 0.1, z + 0.3);
    c.scale.y = lh; c.position.set(0, lh / 2 - 0.2, z - 1.4); c.rotation.x = -0.28;
    this.clips[0].position.set(-w * 0.3, cy + h / 2 + 0.05, z + 0.3); this.clips[1].position.set(w * 0.3, cy + h / 2 + 0.05, z + 0.3);
    this.boardCenter = new THREE.Vector3(0, cy, z);
  }
  /** board UV (0..1, 0..1 from top-left) → world point on the board surface */
  boardPoint(u, v, out = new THREE.Vector3()) { return out.set((u - 0.5) * this.bw, this.boardCenter.y + (0.5 - v) * this.bh, BOARD.z + 0.17); }

  _paintBoard() {
    const x = this.bctx, W = this.bc.width, H = this.bc.height;
    x.fillStyle = '#f7f3ea'; x.fillRect(0, 0, W, H);
    if (!this.img) { this.boardTex.needsUpdate = true; return; }
    const N = this.bands, u = clamp(this.reveal, 0, 1);
    if (this.live && u < 1) {                 // a hand-drawn design: replay its real strokes
      x.fillStyle = this.live.bg || '#ffffff'; x.fillRect(0, 0, W, H);
      const cur = this.live.painter.frame(x, u);
      if (cur && cur.c !== this.live.col) { this.live.col = cur.c; this.pencil.children[0].material.color.set(cur.c); this.pencil.children[2].material.color.set(cur.c); }
    } else if (u >= 1) x.drawImage(this.img, 0, 0, W, H);
    else {
      const done = Math.floor(u * N), frac = u * N - done, bh = H / N;
      x.save(); x.beginPath();
      x.rect(0, 0, W, done * bh);
      const rtl = done % 2 === 1, pw = frac * W;
      x.rect(rtl ? W - pw : 0, done * bh, pw, bh);
      x.clip(); x.drawImage(this.img, 0, 0, W, H); x.restore();
      // graphite scribble at the working edge
      x.strokeStyle = 'rgba(40,40,50,0.35)'; x.lineWidth = 2;
      x.beginPath();
      const ex = rtl ? W - pw : pw;
      for (let k = 0; k < 7; k++) { const yy = done * bh + (k / 6) * bh; x.lineTo(ex + Math.sin(k * 2.1 + u * 40) * 10, yy); }
      x.stroke();
    }
    this.boardTex.needsUpdate = true;
  }
  _pencilUV(u) {
    if (this.live) { const [px, py] = tipAt(this.live.ops, clamp(u, 0, 1)); return [clamp(px / this.live.w, 0, 1), clamp(py / this.live.h, 0, 1)]; }
    const N = this.bands, done = Math.min(N - 1, Math.floor(u * N)), frac = clamp(u * N - done, 0, 1);
    const rtl = done % 2 === 1;
    const wig = Math.sin(u * 180) * 0.35;
    return [rtl ? 1 - frac : frac, (done + 0.5 + wig * 0.8) / N];
  }

  welcome() {
    const c = document.createElement('canvas'); c.width = 1400; c.height = 1000;
    const x = c.getContext('2d');
    x.fillStyle = '#f7f3ea'; x.fillRect(0, 0, 1400, 1000);
    x.strokeStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 1400; i += 40) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 1000); x.stroke(); } for (let i = 0; i < 1000; i += 40) { x.beginPath(); x.moveTo(0, i); x.lineTo(1400, i); x.stroke(); }
    x.fillStyle = '#1d1d1f'; x.font = '700 150px "Caveat", cursive'; x.fillText('Hi! I design.', 150, 420);
    x.font = '400 60px "Caveat", cursive'; x.fillStyle = '#444';
    ['logos · posters · drawings · paintings', 'palettes · type · floor plans · fashion · UI', 'ask me anything →'].forEach((t, i) => x.fillText(t, 160, 560 + i * 90));
    x.strokeStyle = '#e8590c'; x.lineWidth = 8; x.lineCap = 'round'; x.beginPath(); x.moveTo(150, 460); x.quadraticCurveTo(500, 490, 900, 450); x.stroke();
    this.setImage(c, 1.4, false);
  }

  /** show a design on the board; animate = the fly draws it. Resolves when the fly is done. */
  setImage(img, aspect, animate = true, live = null) {
    this.img = img;
    this._pencilColour();
    const W = Math.min(1600, Math.round(1100 * Math.sqrt(aspect))), H = Math.round(W / aspect);
    if (W !== this.bc.width || H !== this.bc.height) {          // a resized canvas needs a fresh GPU texture
      this.bc.width = W; this.bc.height = H;
      this.boardTex.dispose();
      this.boardTex = new THREE.CanvasTexture(this.bc); this.boardTex.colorSpace = THREE.SRGBColorSpace; this.boardTex.anisotropy = 8;
      this.board.material.map = this.boardTex; this.board.material.needsUpdate = true;
    }
    this._layoutBoard(aspect);
    this.bands = aspect > 1.1 ? 7 : 9;
    this.live = null;
    if (animate && live?.ops?.length) {
      const mk = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
      this.live = { ...live, painter: new LivePainter(live.ops, live.w, live.h, W, H, mk), dur: clamp(3500 + live.ops.length * 22, 7000, 16000) };
    }
    if (!animate) { this.reveal = 1; this._paintBoard(); return Promise.resolve(); }
    if (this.mode === 'muse') { this.spark.visible = false; const d = this.museDone; this.museDone = null; d?.(null); }
    this.reveal = 0; this._paintBoard();
    return new Promise((res) => { this.queue = []; this._startDraw(res); });
  }
  _pencilColour() { if (this.pencil?.children?.length > 2) { this.pencil.children[0].material.color.set(0xf2b92c); this.pencil.children[2].material.color.set(0x2a2a2e); } }
  setPalette(hexes) {
    if (!hexes?.length) return;
    this.swatches.forEach((m, i) => m.material.color.set(hexes[i % hexes.length]));
  }

  // ---------------------------------------------------------------- props
  _buildProps() {
    const S = this.scene;
    // pencil cup with pencils
    const cupM = new THREE.MeshStandardMaterial({ color: 0x2f3b45, roughness: 0.4, metalness: 0.2 });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.85, 2.3, 32, 1, true), cupM); cup.position.set(-10.5, 1.15, -2.4); cup.castShadow = true; S.add(cup);
    const cupB = new THREE.Mesh(new THREE.CircleGeometry(0.85, 32), cupM); cupB.rotation.x = -Math.PI / 2; cupB.position.set(-10.5, 0.02, -2.4); S.add(cupB);
    [[0.3, 0.2, 0.2, 0xf2b92c], [-0.3, 0.1, -0.25, 0x4c8bf5], [0.1, -0.3, 0.1, 0xe8590c], [-0.1, 0.3, 0.3, 0x2fa35a], [0.35, -0.1, -0.15, 0x1d1d1f]].forEach(([dx, dz, tilt, col]) => {
      const p = pencilMesh(); p.children[0].material = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 });
      p.position.set(-10.5 + dx, 1.9, -2.4 + dz); p.rotation.set(tilt, 0, dx * 0.6); p.rotation.x += Math.PI; p.scale.setScalar(1.5); S.add(p);
    });
    // swatch fan
    this.swatches = [];
    const fan = new THREE.Group(); fan.position.set(8.2, 0.05, 4.6); S.add(fan);
    const cols = ['#e8590c', '#f2b92c', '#2fa35a', '#12867e', '#2b6de0', '#7b3fe4', '#1d1d1f'];
    cols.forEach((c, i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.04, 0.85), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
      m.geometry.translate(1.5, 0, 0); m.position.y = i * 0.045; m.rotation.y = -0.2 - i * 0.2; m.castShadow = true; fan.add(m); this.swatches.push(m);
    });
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 16), new THREE.MeshStandardMaterial({ color: 0xc0c3c8, metalness: 0.9, roughness: 0.3 })); pin.position.y = 0.2; fan.add(pin);
    // giant (to a fly) coffee mug
    const mugM = new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.35 });
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.2, 2.8, 40, 1, true), mugM); mug.position.set(-11, 1.4, 4.2); mug.castShadow = true; S.add(mug);
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(1.24, 40), new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.2 })); coffee.rotation.x = -Math.PI / 2; coffee.position.set(-11, 2.6, 4.2); S.add(coffee);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.16, 12, 32, Math.PI * 1.2), mugM); handle.position.set(-9.75, 1.45, 4.2); handle.rotation.z = -Math.PI * 0.6; handle.castShadow = true; S.add(handle);
    // ruler
    const ruler = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.9), new THREE.MeshStandardMaterial({ color: 0xcfd6dc, metalness: 0.6, roughness: 0.35 })); ruler.position.set(-4.5, 0.05, 6.2); ruler.rotation.y = 0.12; ruler.castShadow = true; S.add(ruler);
    // desk lamp
    const lampM = new THREE.MeshStandardMaterial({ color: 0xe8590c, roughness: 0.4, metalness: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.35, 32), lampM); base.position.set(11.5, 0.18, -3); base.castShadow = true; S.add(base);
    const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6, 12), lampM); arm1.position.set(11.2, 3, -3.4); arm1.rotation.z = 0.25; arm1.castShadow = true; S.add(arm1);
    const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 12), lampM); arm2.position.set(8.9, 6.9, -3.6); arm2.rotation.z = 1.25; arm2.castShadow = true; S.add(arm2);
    const head = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.6, 32, 1, true), lampM); head.position.set(6.6, 7.2, -3.2); head.rotation.set(0.3, 0, 0.7); head.material.side = THREE.DoubleSide; S.add(head);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c9 })); bulb.position.set(6.3, 6.8, -3.1); S.add(bulb);
    const spot = new THREE.SpotLight(0xffe2b0, 60, 30, 0.55, 0.6, 1.2); spot.position.set(6.3, 6.8, -3.1); spot.target.position.set(0, 4.2, -4.6); S.add(spot, spot.target);
    this.spot = spot;
    // a few pinned sticky notes on the wall
    [['#ffd166', -14, 7, 0.1], ['#9fe3c4', -12.2, 9.2, -0.12], ['#f4a3b8', 13.5, 8.4, 0.08]].forEach(([c, x, y, r]) => {
      const n = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })); n.position.set(x, y, -10.9); n.rotation.z = r; S.add(n);
    });
  }

  // ---------------------------------------------------------------- input
  setView(v) {
    this.view = v;
    if (v === 'studio') Object.assign(this.orbit, { yaw: Math.PI / 2 + 0.28, pitch: 0.3, dist: 20 });
    if (v === 'board') Object.assign(this.orbit, { yaw: Math.PI / 2, pitch: 0.08, dist: 15.5 });
    if (v === 'fly') Object.assign(this.orbit, { yaw: Math.PI / 2 + 0.5, pitch: 0.32, dist: 7 });
  }
  _bind() {
    const c = this.canvas;
    let st = null;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => { c.setPointerCapture(e.pointerId); st = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false }; });
    c.addEventListener('pointermove', (e) => {
      if (!st) { this._hover(e); return; }
      const dx = e.clientX - st.x, dy = e.clientY - st.y; st.x = e.clientX; st.y = e.clientY;
      if (Math.hypot(e.clientX - st.x0, e.clientY - st.y0) > 4) st.moved = true;
      if (st.moved) { this.orbit.yaw += dx * 0.007; this.orbit.pitch = clamp(this.orbit.pitch + dy * 0.005, -0.05, 1.3); }
    });
    const up = (e) => { if (st && !st.moved && this._hitBoard(e) && this.onBoardClick) this.onBoardClick(); st = null; };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', () => { st = null; });
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.orbit.dist = clamp(this.orbit.dist * Math.exp(e.deltaY * 0.001), 4, 45); }, { passive: false });
  }
  _hitBoard(e) {
    const r = this.canvas.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
    return this.raycaster.intersectObject(this.board).length > 0;
  }
  _hover(e) { this.canvas.style.cursor = this.img && this._hitBoard(e) ? 'zoom-in' : 'grab'; }

  // ---------------------------------------------------------------- behaviour
  setMood(m) {
    if (['draw_start', 'drawing', 'fly_home', 'fly_to_board', 'muse'].includes(this.mode)) return;
    if (m === 'think') return this._setMode('think');
    if (m === 'talk') return this._setMode('talk');
    if (m === 'happy') return this._setMode('hop');
  }
  _setMode(m) { this.mode = m; this.modeT = 0; }

  // ---------------------------------------------------------------- the muse
  // Points of interest in the studio: where to hover and what the fly finds there.
  museSpots() {
    return {
      lamp: { at: new THREE.Vector3(6.3, 6.8, -3.1), what: 'the warm light of the lamp' },
      cup: { at: new THREE.Vector3(-10.5, 3.6, -2.4), what: 'the stripes on my pencils' },
      mug: { at: new THREE.Vector3(-11, 3.1, 4.2), what: 'the crema in your coffee' },
      fan: { at: new THREE.Vector3(9.6, 0.9, 4.2), what: 'the colours of your swatch fan' },
      notes: { at: new THREE.Vector3(-12.6, 7.4, -10.2), what: 'the sticky notes on the wall' },
      ruler: { at: new THREE.Vector3(-4.5, 0.7, 6.2), what: "the ruler's tick marks" },
    };
  }
  /** what the fly sees: render the studio from its point of view (or itself, for a self-portrait) into a small image */
  snapshot(scene = 'studio', w = 160, h = 120) {
    const W = this.canvas.width, H = this.canvas.height;
    if (!W || !H) return null;
    const cam = new THREE.PerspectiveCamera(scene === 'self' ? 24 : 46, W / H, 0.1, 300);
    let what;
    if (scene === 'self') {
      const p = this.p, f = new THREE.Vector3(p.x, p.y + 0.6, p.z), a = p.th + (Math.random() - 0.5) * 1.2;
      cam.fov = 20; cam.position.set(f.x + Math.cos(a) * 9, f.y + 0.8 + Math.random() * 1.2, f.z + Math.sin(a) * 9); cam.lookAt(f);
      what = 'myself';
    } else if (Math.random() < 0.55) {          // the whole studio, from roughly where you are
      cam.position.copy(this.camera.position).add(new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.4) * 3, (Math.random() - 0.5) * 3));
      cam.fov = 40; cam.lookAt(this.boardCenter.clone().lerp(new THREE.Vector3(this.p.x, 1, this.p.z), 0.5).add(new THREE.Vector3(0, -1, 0)));
      what = 'the studio — the easel, the lamp and me';
    } else {                                    // a still life
      const S = this.museSpots(), names = { lamp: 'the lamp', cup: 'the pencil cup', mug: 'your coffee mug', fan: 'the swatch fan', notes: 'the sticky notes', ruler: 'the ruler' };
      const keys = Object.keys(S).sort(() => Math.random() - 0.5).slice(0, 2);
      const t = S[keys[0]].at.clone().lerp(S[keys[1]].at, Math.random() * 0.4);
      const dir = new THREE.Vector3(-t.x, 0, 10 - t.z).normalize();
      cam.position.copy(t).addScaledVector(dir, 6 + Math.random() * 4).add(new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random() * 2, 0));
      cam.lookAt(t);
      what = `${names[keys[0]]} and ${names[keys[1]]}`;
    }
    cam.updateProjectionMatrix();
    this.renderer.render(this.scene, cam);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), ar = w / h;
    let sw = W, sh = W / ar; if (sh > H) { sh = H; sw = H * ar; }
    x.drawImage(this.canvas, (W - sw) / 2, (H - sh) / 2, sw, sh, 0, 0, w, h);
    this.renderer.render(this.scene, this.camera);
    return { img: { w, h, data: x.getImageData(0, 0, w, h).data }, url: c.toDataURL('image/png'), what };
  }
  /** fly around the studio looking for inspiration; resolves with the spots it visited (last = where the idea struck) */
  muse() {
    if (this.busy || this.mode === 'muse') return Promise.resolve(null);
    const S = this.museSpots(), names = Object.keys(S).filter((k) => k !== 'lamp');
    for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
    const route = [...names.slice(0, 2), ...(Math.random() < 0.65 ? ['lamp'] : [names[2]])];
    const steps = [];
    let from = new THREE.Vector3(this.p.x, this.p.y, this.p.z);
    for (const k of route) {
      const c = S[k].at, out = c.clone().setY(0).normalize().multiplyScalar(-1.7);        // hover on the studio side of the object
      const hover = c.clone().add(new THREE.Vector3(out.x, 0.9, out.z + 1.2));
      steps.push({ type: 'fly', from, to: hover, dur: 700 + from.distanceTo(hover) * 70 });
      steps.push(k === 'lamp' ? { type: 'orbit', c, r: 1.7, dur: 2600, k } : { type: 'sniff', at: hover, c, dur: 1300, k });
      from = hover;
    }
    steps.push({ type: 'idea', dur: 1500 });
    steps.push({ type: 'fly', from: null, to: HOME.clone(), dur: 1500, home: true });
    this.museSteps = steps; this.museI = 0; this.museRoute = route;
    this.museT = 0;
    this._setMode('muse');
    return new Promise((res) => { this.museDone = res; });
  }
  _museStep(dt, t, tgt) {
    const p = this.p, st = this.museSteps[this.museI];
    if (!st) return;
    this.museT += dt;
    const u = clamp(this.museT / st.dur, 0, 1);
    tgt.wings = 1; tgt.tuck = 1; tgt.flap = 1;
    if (st.type === 'fly') {
      if (!st.from) st.from = new THREE.Vector3(p.x, p.y, p.z);
      const e = ease(u), pos = new THREE.Vector3().lerpVectors(st.from, st.to, e);
      pos.y += Math.sin(u * Math.PI) * (st.home ? 1.6 : 2.4);
      const dx = st.to.x - st.from.x, dz = st.to.z - st.from.z;
      if (Math.hypot(dx, dz) > 0.4) p.th = lerpAngle(p.th, angTo(dx, dz), 1 - Math.exp(-dt / 160));
      p.x = pos.x; p.y = pos.y; p.z = pos.z; tgt.pitch = -0.12;
      if (st.home && u > 0.92) { tgt.flap = 0; tgt.tuck = 0; }
    } else if (st.type === 'sniff') {
      p.x = st.at.x + Math.sin(t * 0.003) * 0.12; p.y = st.at.y + Math.sin(t * 0.005) * 0.1; p.z = st.at.z;
      p.th = lerpAngle(p.th, angTo(st.c.x - p.x, st.c.z - p.z), 1 - Math.exp(-dt / 200));
      tgt.prob = 0.6 + 0.3 * Math.sin(t * 0.02); tgt.talk = 1; tgt.look = Math.sin(t * 0.004) * 0.35; tgt.pitch = 0.25;
    } else if (st.type === 'orbit') {                          // flies cannot resist a lamp
      const a = u * TAU * 2;
      p.x = st.c.x + Math.cos(a) * st.r; p.z = st.c.z + Math.sin(a) * st.r; p.y = st.c.y - 0.6 + Math.sin(a * 1.5) * 0.4;
      p.th = lerpAngle(p.th, a + Math.PI / 2, 1 - Math.exp(-dt / 90)); tgt.pitch = -0.05;
    } else if (st.type === 'idea') {
      p.y += Math.sin(t * 0.004) * 0.004;
      p.th = lerpAngle(p.th, Math.atan2(20 - p.z, 3 - p.x), 1 - Math.exp(-dt / 250));
      tgt.point = 1; tgt.tuck = 0.6; tgt.look = -0.3;
      const pop = u < 0.25 ? ease(u / 0.25) * 1.25 : 1.25 - 0.25 * ease((u - 0.25) / 0.3);
      this.spark.visible = true; this.spark.position.set(p.x + 0.3, p.y + 2.1 + u * 0.3, p.z + 0.3);
      this.spark.scale.setScalar(2.2 * pop * (1 + 0.08 * Math.sin(t * 0.02))); this.spark.material.opacity = u > 0.8 ? (1 - u) / 0.2 : 1;
      if (!st.fired) { st.fired = true; this.onMuse?.(this.museRoute.map((k) => ({ k, what: this.museSpots()[k].what }))); }
    }
    if (u >= 1) {
      this.museI++; this.museT = 0;
      if (st.type === 'idea') this.spark.visible = false;
      if (this.museI >= this.museSteps.length) {
        p.y = 0; this._setMode('present');
        const d = this.museDone; this.museDone = null; d?.(this.museRoute);
      }
    }
  }

  _startDraw(done) {
    this.drawDone = done;
    const [u0, v0] = this._pencilUV(0);
    const tip = this.boardPoint(u0, v0);
    this.flight = { from: new THREE.Vector3(this.p.x, this.p.y, this.p.z), to: this._hoverFor(tip), dur: 1300 };
    this._setMode('fly_to_board');
  }
  _hoverFor(tip) { return new THREE.Vector3(tip.x + 1.0, tip.y - 1.45, tip.z + 2.0); }

  _update(dt, t) {
    const p = this.p;
    this.modeT += dt;
    const k = 1 - Math.exp(-dt / 140);
    const tgt = { wings: 0, flap: 0, groom: 0, prob: 0, reach: 0, point: 0, tuck: 0, look: 0, talk: 0, pitch: 0 };
    let speed = 0, pencilOn = false, tipUV = null;
    const m = this.mode, T = this.modeT;
    if (m === 'idle') {
      this.idleT += dt; this.museTimer -= dt;
      if (this.walkTarget) {
        const dx = this.walkTarget.x - p.x, dz = this.walkTarget.z - p.z, d = Math.hypot(dx, dz);
        const th = angTo(dx, dz);
        p.th = lerpAngle(p.th, th, 1 - Math.exp(-dt / 180));
        const facing = Math.cos(p.th - th);
        if (d < 0.15) { this.walkTarget = null; this.idleT = 0; this.nextIdle = 1500 + Math.random() * 3000; }
        else if (facing > 0.6) { const v = Math.min(2.6, d * 2) * (dt / 1000); p.x += Math.cos(p.th) * v; p.z += Math.sin(p.th) * v; speed = Math.min(1, d); }
      } else {
        p.th = lerpAngle(p.th, Math.atan2(20 - p.z, 3 - p.x), 1 - Math.exp(-dt / 900));   // drift toward facing the viewer
        if (this.idleT > this.nextIdle) {
          const r = Math.random();
          if (this.museTimer < 0 && this.museAllowed) { this.museTimer = 70000 + Math.random() * 50000; this.muse(); }
          else if (r < 0.55) this.walkTarget = { x: clamp(HOME.x + (Math.random() - 0.5) * 9, -7, 7), z: clamp(HOME.z + (Math.random() - 0.3) * 4.5, 0.4, 6) };
          else if (r < 0.8) { this._setMode('groom'); }
          else { this.idleT = 0; this.nextIdle = 2000 + Math.random() * 2500; tgt.look = 0.4; }
        }
      }
      tgt.look = Math.sin(t * 0.0007) * 0.25;
    } else if (m === 'groom' || m === 'think') {
      tgt.groom = 1; tgt.look = Math.sin(t * 0.002) * 0.2;
      p.th = lerpAngle(p.th, Math.atan2(20 - p.z, 3 - p.x), 1 - Math.exp(-dt / 400));
      if (m === 'groom' && T > 2600) { this._setMode('idle'); this.idleT = 0; this.nextIdle = 2000 + Math.random() * 2000; }
    } else if (m === 'talk') {
      tgt.talk = 1; tgt.prob = 0.25; tgt.wings = 0.15 + 0.1 * Math.sin(t * 0.02);
      p.th = lerpAngle(p.th, Math.atan2(20 - p.z, 3 - p.x), 1 - Math.exp(-dt / 250));
      if (T > 2400) this._setMode('idle');
    } else if (m === 'hop') {
      const u = clamp(T / 900, 0, 1);
      p.y = Math.sin(u * Math.PI) * 1.4; tgt.flap = u < 1 ? 1 : 0; tgt.wings = 1; tgt.tuck = 0.6;
      if (T > 900) { p.y = 0; this._setMode('idle'); }
    } else if (m === 'muse') {
      this._museStep(dt, t, tgt);
    } else if (m === 'fly_to_board' || m === 'fly_home') {
      const f = this.flight, u = clamp(T / f.dur, 0, 1), e = ease(u);
      const pos = new THREE.Vector3().lerpVectors(f.from, f.to, e);
      pos.y += Math.sin(u * Math.PI) * (m === 'fly_home' ? 1.6 : 2.2);
      const dx = f.to.x - f.from.x, dz = f.to.z - f.from.z;
      const travelTh = Math.hypot(dx, dz) > 0.5 ? angTo(dx, dz) : p.th;
      p.th = lerpAngle(p.th, u > 0.7 ? (m === 'fly_home' ? Math.PI / 2 : -Math.PI / 2) : travelTh, 1 - Math.exp(-dt / 160));
      p.x = pos.x; p.y = pos.y; p.z = pos.z;
      tgt.flap = m === 'fly_home' && u > 0.92 ? 0 : 1; tgt.wings = 1; tgt.tuck = 1; tgt.pitch = -0.1;
      if (m === 'fly_to_board') { tgt.reach = e; pencilOn = u > 0.4; tipUV = this._pencilUV(0); }
      if (u >= 1) {
        if (m === 'fly_to_board') { this._setMode('drawing'); this.drawDur = this.live ? this.live.dur : 5200 + Math.random() * 1500; }
        else { p.y = 0; this._setMode('present'); }
      }
    } else if (m === 'drawing') {
      const u = clamp(T / this.drawDur, 0, 1);
      this.reveal = u; this._paintBoard();
      const uv = this._pencilUV(u); tipUV = uv; pencilOn = true;
      const tip = this.boardPoint(uv[0], uv[1]);
      const h = this._hoverFor(tip);
      p.x = lerp(p.x, h.x, 1 - Math.exp(-dt / 110)); p.y = lerp(p.y, h.y + Math.sin(t * 0.004) * 0.08, 1 - Math.exp(-dt / 110)); p.z = lerp(p.z, h.z, 1 - Math.exp(-dt / 110));
      p.th = lerpAngle(p.th, -Math.PI / 2 - 0.42, 1 - Math.exp(-dt / 120));
      tgt.flap = 1; tgt.wings = 1; tgt.tuck = 1; tgt.reach = 1; tgt.pitch = 0.12;
      if (u >= 1) { this.reveal = 1; this.live = null; this._pencilColour(); this._paintBoard(); this.flight = { from: new THREE.Vector3(p.x, p.y, p.z), to: HOME.clone(), dur: 1400 }; this._setMode('fly_home'); }
    } else if (m === 'present') {
      tgt.point = T < 2600 ? 1 : 0; tgt.talk = 0.6; tgt.look = -0.35; tgt.prob = 0.2;
      p.th = lerpAngle(p.th, Math.PI / 2 + 0.55, 1 - Math.exp(-dt / 250));
      if (T > 2900) { this._setMode('idle'); this.idleT = 0; this.nextIdle = 3000; this.museTimer = Math.max(this.museTimer, 40000); if (this.drawDone) { const d = this.drawDone; this.drawDone = null; d(); } }
    }
    // integrate
    for (const key of Object.keys(tgt)) p[key] = lerp(p[key] || 0, tgt[key], k);
    p.speed = lerp(p.speed, speed, k);
    p.gait += dt * 0.012 * Math.max(0.15, p.speed);
    this.fly.pose(p, t);
    // shadow
    this.flyShadow.position.set(p.x + 0.2, 0.02, p.z); const s = 1.6 / (1 + p.y * 0.35); this.flyShadow.scale.set(s * 1.4, s, 1); this.flyShadow.material.opacity = 1 / (1 + p.y * 0.4);
    // pencil: from the front legs to the board (or resting on the mat)
    if (pencilOn && tipUV) {
      const tip = this.boardPoint(tipUV[0], tipUV[1]);
      const hand = this.fly.handPos();
      if (m === 'fly_to_board') tip.lerp(hand.clone().add(new THREE.Vector3(0, 0.4, -1.4)), 1 - ease(clamp(T / 1300, 0, 1)));
      const dir = hand.clone().sub(tip).normalize();
      this.pencil.position.copy(tip).addScaledVector(dir, 0.9 * 1.5);
      this.pencil.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      this.pencil.scale.setScalar(1.5);
    } else {
      this.pencil.position.set(3.4, 0.1, 4.4); this.pencil.quaternion.setFromEuler(new THREE.Euler(0, 0.4, Math.PI / 2)); this.pencil.scale.setScalar(1.2);
    }
  }

  /** advance behaviour without rendering (while the brain view covers the studio) */
  tick(t, dt = 16) { this._update(Math.min(150, dt), t); }

  draw(t, dt = 16) {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (this._w !== w || this._h !== h || this._dpr !== dpr) {
      this._w = w; this._h = h; this._dpr = dpr;
      this.renderer.setPixelRatio(dpr); this.renderer.setSize(w, h, false);
      this.camera.aspect = w / Math.max(1, h); this.camera.updateProjectionMatrix();
    }
    this._update(Math.min(150, dt), t);
    const p = this.p;
    // camera target by view; while the fly hunts for its muse the studio camera follows it loosely
    let tgt;
    const narrow = this.camera.aspect < 1.1;
    if (this.view === 'board') tgt = this.boardCenter.clone().add(new THREE.Vector3(0, 0, 0));
    else if (this.view === 'fly') tgt = new THREE.Vector3(p.x, p.y + 1, p.z);
    else tgt = new THREE.Vector3(0, 3.6, -1.4);
    let yaw = this.orbit.yaw, pitch = this.orbit.pitch, dist = this.orbit.dist * (narrow && this.view !== 'fly' ? 1.45 : 1);
    if (this.mode === 'muse' && this.view === 'studio') { tgt.lerp(new THREE.Vector3(p.x, p.y + 1.4, p.z), 0.75); dist *= 0.85; }
    this.cam.target.lerp(tgt, 0.08);
    this.cam.yaw = lerpAngle(this.cam.yaw, yaw, 0.08); this.cam.pitch = lerp(this.cam.pitch, pitch, 0.08); this.cam.dist = lerp(this.cam.dist, dist, 0.08);
    const cp = Math.cos(this.cam.pitch);
    this.camera.position.set(this.cam.target.x + this.cam.dist * cp * Math.cos(this.cam.yaw), this.cam.target.y + this.cam.dist * Math.sin(this.cam.pitch), this.cam.target.z + this.cam.dist * cp * Math.sin(this.cam.yaw));
    if (this.camera.position.y < 0.6) this.camera.position.y = 0.6;
    this.camera.lookAt(this.cam.target);
    this.fill.position.copy(this.camera.position).add(new THREE.Vector3(0, 3, 0)); this.fill.target.position.copy(this.cam.target);
    this.fill.intensity = 0.4;
    this.renderer.render(this.scene, this.camera);
  }

  get busy() { return ['fly_to_board', 'drawing', 'fly_home', 'present'].includes(this.mode); }
  stateLabel() {
    return { idle: this.walkTarget ? 'wandering' : 'idle', groom: 'grooming', think: 'thinking…', talk: 'talking', hop: 'happy', muse: this.museSteps?.[this.museI]?.type === 'idea' ? 'got an idea!' : 'looking for inspiration…', fly_to_board: 'flying to the board', drawing: 'drawing', fly_home: 'landing', present: 'presenting' }[this.mode] || this.mode;
  }
}
