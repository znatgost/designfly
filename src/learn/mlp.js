// A small fully-connected network written from scratch (no ML library) so every neuron, weight and
// weight change can be shown in the 3D brain. tanh hidden layers, linear output logit.
// Learns from pairwise preferences ("A over B", Bradley–Terry) and single labels (like / dislike).
import { rng } from '../design/rng.js';

const sig = (z) => 1 / (1 + Math.exp(-z));

export class MLP {
  constructor(sizes = [84, 24, 12, 1], seed = 67) {
    this.sizes = sizes;
    const r = rng(seed);
    this.W = []; this.b = [];
    for (let l = 0; l < sizes.length - 1; l++) {
      const nin = sizes[l], nout = sizes[l + 1], k = Math.sqrt(6 / (nin + nout));
      this.W.push(Float32Array.from({ length: nin * nout }, () => r.float(-k, k)));
      this.b.push(new Float32Array(nout));
    }
    this._initOpt();
  }
  _initOpt() {
    const z = (a) => a.map((x) => new Float32Array(x.length));
    this.gW = z(this.W); this.gb = z(this.b); this.mW = z(this.W); this.vW = z(this.W); this.mb = z(this.b); this.vb = z(this.b);
    this.delta = z(this.W);         // |Δw| of the last update, for the brain view
    this.t = 0;
  }
  get nParams() { return this.W.reduce((s, w) => s + w.length, 0) + this.b.reduce((s, b) => s + b.length, 0); }

  /** → { acts: [input, h1, h2, ..., [logit]], logit, p } */
  forward(x) {
    const acts = [x];
    let a = x;
    for (let l = 0; l < this.W.length; l++) {
      const W = this.W[l], b = this.b[l], nin = this.sizes[l], nout = this.sizes[l + 1];
      const o = new Float32Array(nout);
      for (let j = 0; j < nout; j++) { let s = b[j]; const off = j * nin; for (let i = 0; i < nin; i++) s += W[off + i] * a[i]; o[j] = l < this.W.length - 1 ? Math.tanh(s) : s; }
      acts.push(o); a = o;
    }
    return { acts, logit: a[0], p: sig(a[0]) };
  }
  /** accumulate gradients for d(loss)/d(logit) = g */
  backward(acts, g, w = 1) {
    let d = new Float32Array([g * w]);
    for (let l = this.W.length - 1; l >= 0; l--) {
      const W = this.W[l], nin = this.sizes[l], nout = this.sizes[l + 1], a = acts[l], gW = this.gW[l], gb = this.gb[l];
      const dn = new Float32Array(nin);
      for (let j = 0; j < nout; j++) { const dj = d[j]; if (!dj) continue; gb[j] += dj; const off = j * nin; for (let i = 0; i < nin; i++) { gW[off + i] += dj * a[i]; dn[i] += dj * W[off + i]; } }
      if (l > 0) for (let i = 0; i < nin; i++) dn[i] *= 1 - a[i] * a[i];
      d = dn;
    }
  }
  zeroGrad() { for (const a of [...this.gW, ...this.gb]) a.fill(0); }
  /** Adam step; returns mean |Δw| */
  step(lr = 0.01, l2 = 1e-4, n = 1) {
    this.t++;
    const b1 = 0.9, b2 = 0.999, eps = 1e-8, c1 = 1 - b1 ** this.t, c2 = 1 - b2 ** this.t;
    let tot = 0, cnt = 0;
    const upd = (P, G, M, V, D, decay) => {
      for (let k = 0; k < P.length; k++) {
        const P_ = P[k], G_ = G[k], M_ = M[k], V_ = V[k], D_ = D ? D[k] : null;
        for (let i = 0; i < P_.length; i++) {
          const g = G_[i] / n + (decay ? l2 * P_[i] : 0);
          M_[i] = b1 * M_[i] + (1 - b1) * g; V_[i] = b2 * V_[i] + (1 - b2) * g * g;
          const dw = (lr * (M_[i] / c1)) / (Math.sqrt(V_[i] / c2) + eps);
          P_[i] -= dw; if (D_) D_[i] = Math.abs(dw); tot += Math.abs(dw); cnt++;
        }
      }
    };
    upd(this.W, this.gW, this.mW, this.vW, this.delta, true);
    upd(this.b, this.gb, this.mb, this.vb, null, false);
    return tot / cnt;
  }
  /** items: { kind:'pair', a, b, w } (a preferred) | { kind:'point', x, y, w } → mean loss */
  trainBatch(items, lr = 0.01) {
    this.zeroGrad();
    let loss = 0;
    for (const it of items) {
      const w = it.w ?? 1;
      if (it.kind === 'pair') {
        const A = this.forward(it.a), B = this.forward(it.b);
        const p = sig(A.logit - B.logit); loss += -Math.log(Math.max(p, 1e-7)) * w;
        this.backward(A.acts, -(1 - p), w); this.backward(B.acts, 1 - p, w);
      } else {
        const A = this.forward(it.x);
        const p = A.p; loss += -(it.y * Math.log(Math.max(p, 1e-7)) + (1 - it.y) * Math.log(Math.max(1 - p, 1e-7))) * w;
        this.backward(A.acts, p - it.y, w);
      }
    }
    this.step(lr, 1e-4, items.length);
    return loss / items.length;
  }
  toJSON() { const q = (a) => Array.from(a, (v) => Math.round(v * 1e4) / 1e4); return { sizes: this.sizes, W: this.W.map(q), b: this.b.map(q), t: this.t }; }
  static fromJSON(j) {
    const m = new MLP(j.sizes, 1);
    m.W = j.W.map((a) => Float32Array.from(a)); m.b = j.b.map((a) => Float32Array.from(a));
    m._initOpt(); m.t = 0;
    return m;
  }
}
