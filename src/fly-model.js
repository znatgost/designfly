// The fly: the articulated Drosophila model from FLY67 (18 leg joints, wings, compound eyes,
// proboscis) — now with a beret — posed from a small set of behaviour parameters.
// Local frame: +X forward, +Y up, +Z the fly's right side.
import * as THREE from './vendor/three.min.js';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;

export function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const stripeTex = () => canvasTex(256, 64, (x, w, h) => {
  x.fillStyle = '#b8874f'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 5; i++) { const p = w * (0.08 + i * 0.16); x.fillStyle = 'rgba(52,32,18,0.9)'; x.fillRect(p, 0, w * 0.07, h); }
  x.fillStyle = 'rgba(40,24,12,0.85)'; x.fillRect(0, 0, w * 0.06, h);
});
const eyeTex = () => canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = '#a3171b'; x.fillRect(0, 0, w, h);
  const r = 5.2;
  for (let j = 0; j < h / (r * 1.6) + 1; j++) for (let i = 0; i < w / (r * 1.85) + 1; i++) {
    const cx = i * r * 1.85 + (j % 2) * r * 0.92, cy = j * r * 1.6;
    const g = x.createRadialGradient(cx - 1, cy - 1, 0.5, cx, cy, r);
    g.addColorStop(0, '#ff5a5a'); g.addColorStop(0.7, '#c9242a'); g.addColorStop(1, '#6a0c0f');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r * 0.95, 0, TAU); x.fill();
  }
});
const wingTex = () => canvasTex(512, 192, (x, w, h) => {
  x.clearRect(0, 0, w, h);
  x.fillStyle = 'rgba(215,228,255,0.30)'; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(70,60,50,0.75)'; x.lineWidth = 3; x.lineCap = 'round';
  const veins = [[0.02, 0.5, 0.98, 0.42], [0.02, 0.5, 0.9, 0.75], [0.02, 0.5, 0.95, 0.2], [0.05, 0.5, 0.7, 0.9], [0.35, 0.45, 0.4, 0.78], [0.6, 0.3, 0.62, 0.62]];
  for (const [a, b, c, d] of veins) { x.beginPath(); x.moveTo(a * w, b * h); x.quadraticCurveTo((a + c) / 2 * w, (b + d) / 2 * h - 8, c * w, d * h); x.stroke(); }
});
const LEG_ATTACH = [[0.55, 0.62, 0.22], [0.28, 0.6, 0.28], [0.0, 0.62, 0.24]];
const LEG_YAW = [0.55, -0.05, -0.65];
const LEN = { femur: 0.78, tibia: 0.84, tarsus: 0.6 };

function limb(len, radius, mat) {
  const g = new THREE.CylinderGeometry(radius * 0.8, radius, len, 10, 1);
  g.rotateZ(-Math.PI / 2); g.translate(len / 2, 0, 0);
  const m = new THREE.Mesh(g, mat); m.castShadow = true;
  return m;
}

export class FlyModel {
  constructor() {
    const chitin = new THREE.MeshStandardMaterial({ color: 0x9a7646, roughness: 0.55, metalness: 0.05 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2c2724, roughness: 0.65 });
    const abdomenMat = new THREE.MeshStandardMaterial({ map: stripeTex(), roughness: 0.5 });
    const eyeMat = new THREE.MeshStandardMaterial({ map: eyeTex(), roughness: 0.28, metalness: 0.05, emissive: 0x2a0303 });
    const wingMat = new THREE.MeshPhysicalMaterial({
      map: wingTex(), transparent: true, side: THREE.DoubleSide, depthWrite: false,
      roughness: 0.2, metalness: 0, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [200, 600],
    });
    const sphere = (r, mat, s = [1, 1, 1], p = [0, 0, 0]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), mat);
      m.scale.set(...s); m.position.set(...p); m.castShadow = true; return m;
    };
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.body.add(sphere(0.55, chitin, [1.12, 0.92, 0.9], [0.3, 0.98, 0]));
    const abd = sphere(0.62, abdomenMat, [1.45, 0.82, 0.95], [-0.88, 0.92, 0]); abd.rotation.z = 0.08;
    this.body.add(abd);
    this.head = new THREE.Group(); this.head.position.set(0.98, 1.08, 0); this.body.add(this.head);
    this.head.add(sphere(0.4, chitin, [0.75, 0.95, 1.1], [0.05, 0, 0]));
    this.antennae = [];
    for (const s of [-1, 1]) {
      const e = sphere(0.3, eyeMat, [0.85, 1.15, 0.78], [0.1, 0.02, s * 0.3]); e.rotation.y = s * 0.3; this.head.add(e);
      const ant = limb(0.22, 0.045, chitin); ant.position.set(0.28, 0.18, s * 0.09); ant.rotation.set(0, s * -0.45, 0.25); this.head.add(ant);
      const ar = limb(0.26, 0.01, dark); ar.position.set(0.22, 0, 0); ar.rotation.set(0, s * -0.3, 0.55); ant.add(ar);
      this.antennae.push({ ant, s });
    }
    // the designer's beret
    const felt = new THREE.MeshStandardMaterial({ color: 0x1b1b22, roughness: 0.95 });
    this.beret = new THREE.Group(); this.beret.position.set(-0.02, 0.36, -0.05); this.beret.rotation.set(0.28, 0, 0.22);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 14, 0, TAU, 0, Math.PI / 2), felt); cap.scale.set(1.05, 0.34, 1.12); cap.castShadow = true;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 32), felt); band.rotation.x = Math.PI / 2;
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.12, 8), felt); stalk.position.y = 0.17;
    this.beret.add(cap, band, stalk); this.head.add(this.beret);
    // proboscis
    this.prob = new THREE.Group(); this.prob.position.set(0.2, -0.28, 0); this.head.add(this.prob);
    const pm = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.6 });
    this.probMesh = limb(1, 0.06, pm); this.prob.add(this.probMesh);
    this.probTip = sphere(0.08, pm, [0.8, 0.5, 1.5]); this.prob.add(this.probTip);
    // wings
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.bezierCurveTo(0.5, 0.42, 1.9, 0.48, 2.3, 0.12);
    shape.bezierCurveTo(2.45, -0.1, 1.8, -0.4, 0.9, -0.3); shape.bezierCurveTo(0.4, -0.22, 0.1, -0.1, 0, 0);
    const wg = new THREE.ShapeGeometry(shape, 24);
    const pos = wg.attributes.position, uv = wg.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 2.45, (pos.getY(i) + 0.45) / 0.95);
    wg.rotateX(-Math.PI / 2);
    this.wings = [];
    for (const s of [-1, 1]) {
      const base = new THREE.Group(); base.position.set(0.22, 1.36, s * 0.12);
      const flap = new THREE.Group(); base.add(flap);
      const m = new THREE.Mesh(wg, wingMat); m.scale.z = s; m.renderOrder = 2; flap.add(m);
      this.body.add(base); this.wings.push({ base, flap, s });
    }
    this.legs = [];
    for (let j = 0; j < 3; j++) for (const s of [-1, 1]) {
      const [ax, ay, az] = LEG_ATTACH[j];
      const yaw = new THREE.Group(); yaw.position.set(ax, ay, s * az); this.body.add(yaw);
      const femur = new THREE.Group(); yaw.add(femur); femur.add(limb(LEN.femur, 0.075, dark));
      const tibia = new THREE.Group(); tibia.position.x = LEN.femur; femur.add(tibia); tibia.add(limb(LEN.tibia, 0.055, dark));
      const tarsus = new THREE.Group(); tarsus.position.x = LEN.tibia; tibia.add(tarsus); tarsus.add(limb(LEN.tarsus, 0.035, dark));
      const tip = new THREE.Object3D(); tip.position.x = LEN.tarsus; tarsus.add(tip);
      this.legs.push({ j, s, yaw, femur, tibia, tarsus, tip });
    }
  }

  /**
   * p: { x, y, z, th, pitch, speed, gait, wings, flap, groom, prob, reach, point, tuck, look, talk }
   * th = heading (0 → +X, π/2 → +Z); t = ms for cyclic motion
   */
  pose(p, t) {
    this.root.position.set(p.x, p.y, p.z);
    this.root.rotation.y = -p.th;
    const walk = Math.min(1, Math.abs(p.speed || 0));
    const ph = p.gait || 0;
    const tuck = p.tuck || 0, reach = p.reach || 0, point = p.point || 0;
    this.body.rotation.z = (p.pitch || 0) + 0.25 * reach - 0.08 * tuck + 0.12 * point;
    this.body.position.y = Math.sin(ph * 2) * 0.025 * walk;
    this.head.rotation.z = -0.25 * (p.prob || 0) - 0.15 * reach;
    this.head.rotation.y = (p.look || 0);
    for (const a of this.antennae) a.ant.rotation.z = 0.25 + Math.sin(t * 0.011 + a.s) * 0.08 * (1 + (p.talk || 0) * 2);
    const pl = 0.18 + 0.55 * (p.prob || 0) + ((p.talk || 0) > 0.1 ? Math.sin(t * 0.03) * 0.08 * p.talk : 0);
    this.probMesh.scale.set(pl, 1, 1); this.probTip.position.x = pl;
    this.prob.rotation.z = -1.25 - 0.25 * (p.prob || 0);
    for (const w of this.wings) {
      const spread = 0.16 + (p.wings || 0) * 1.15;
      w.base.rotation.y = w.s > 0 ? Math.PI + spread : Math.PI - spread;
      w.base.rotation.x = w.s * 0.12;
      w.flap.rotation.z = (p.flap || 0) > 0 ? Math.sin(t * 0.55) * 0.95 * p.flap : 0.06 + (p.wings || 0) * 0.2;
    }
    for (const L of this.legs) {
      const { j, s } = L;
      let yaw = LEG_YAW[j], fem = 0.6, knee = 1.65, ank = 0.62;
      const tripod = (j % 2 === 0) === (s < 0) ? 0 : Math.PI;
      const sw = Math.sin(ph + tripod), up = Math.max(0, Math.cos(ph + tripod));
      yaw += 0.32 * sw * walk; fem += 0.28 * up * walk;
      if (j === 0 && (p.groom || 0) > 0.02) {       // rubbing the front legs together — thinking
        const g = p.groom, r = Math.sin(t * 0.03 + (s > 0 ? 0 : 1.4));
        yaw = lerp(yaw, 1.45 + 0.08 * r, g); fem = lerp(fem, 0.75 + 0.1 * r, g); knee = lerp(knee, 2.05, g); ank = lerp(ank, 0.7, g);
      }
      if (j === 0 && reach > 0.01) {                // both front legs forward, holding the pencil
        const r = Math.sin(t * 0.02 + (s > 0 ? 0 : 1)) * 0.06;
        yaw = lerp(yaw, 1.32 + r, reach); fem = lerp(fem, -0.25, reach); knee = lerp(knee, 0.55, reach); ank = lerp(ank, 0.2, reach);
      }
      if (j === 0 && s > 0 && point > 0.01) {       // right front leg raised toward the board
        yaw = lerp(yaw, 0.95, point); fem = lerp(fem, -0.75, point); knee = lerp(knee, 0.35, point); ank = lerp(ank, 0.1, point);
      }
      if (tuck > 0 && !(j === 0 && reach > 0.2)) { fem = lerp(fem, 0.1, tuck); knee = lerp(knee, 2.3, tuck); ank = lerp(ank, 0.4, tuck); }
      L.yaw.rotation.y = s > 0 ? -Math.PI / 2 + yaw : Math.PI / 2 - yaw;
      L.femur.rotation.z = fem; L.tibia.rotation.z = -knee; L.tarsus.rotation.z = ank;
    }
    this.root.updateMatrixWorld(true);
  }

  /** world position of the front leg tips (for attaching the pencil) */
  handPos(out = new THREE.Vector3()) {
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    this.legs[0].tip.getWorldPosition(a); this.legs[1].tip.getWorldPosition(b);
    return out.copy(a).add(b).multiplyScalar(0.5);
  }
}
