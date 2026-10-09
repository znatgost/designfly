// A differentiable brush: one quadratic-Bézier stroke with soft edges, rendered with tensors so
// the fly's hand network can learn from the gradient of "how much closer did that stroke get me".
export const NP = 11;           // stroke = x0 y0 x1 y1 x2 y2 width r g b opacity (all 0..1)
export const K = 10;            // samples along the curve
const grids = new Map();
export function grid(tf, S) {
  if (!grids.has(S)) {
    const g = [];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) g.push((x + 0.5) / S, (y + 0.5) / S);
    grids.set(S, tf.keep(tf.tensor(g, [1, S * S, 1, 2])));
  }
  return grids.get(S);
}
const ts = Array.from({ length: K }, (_, i) => i / (K - 1));
export const R0 = 0.012, R1 = 0.17;
export const radius = (w) => R0 + w * R1;
/** points along each stroke: p [B, NP] → [B, K, 2] */
export function curve(tf, p) {
  const P0 = p.slice([0, 0], [-1, 2]), P1 = p.slice([0, 2], [-1, 2]), P2 = p.slice([0, 4], [-1, 2]);
  const t = tf.tensor(ts, [1, K, 1]), u = tf.sub(1, t);
  return tf.addN([tf.mul(tf.mul(u, u), P0.expandDims(1)), tf.mul(tf.mul(tf.mul(2, u), t), P1.expandDims(1)), tf.mul(tf.mul(t, t), P2.expandDims(1))]);
}
/** soft coverage of each stroke on an S×S grid: [B, S, S, 1] */
export function mask(tf, p, S) {
  const B = p.shape[0], pts = curve(tf, p).expandDims(1);                    // [B,1,K,2]
  const d2 = tf.sum(tf.square(tf.sub(grid(tf, S), pts)), -1).min(-1);        // [B,S*S]
  const r = tf.add(R0, tf.mul(R1, p.slice([0, 6], [-1, 1])));                                 // [B,1]
  return tf.sigmoid(tf.mul(tf.sub(r, tf.sqrt(tf.add(d2, 1e-5))), S * 1.6)).reshape([B, S, S, 1]);
}
/** the brush picks up the colour it sees under itself; the network learns how to adjust it */
export const ADJ = 0.4;
export function brushColour(tf, m, target, p) {
  const seen = tf.div(tf.sum(tf.mul(target, m), [1, 2]), tf.add(tf.sum(m, [1, 2]), 1e-3));      // [B,3]
  return tf.clipByValue(tf.add(seen, tf.mul(ADJ, tf.sub(p.slice([0, 7], [-1, 3]), 0.5))), 0, 1);
}
/** paint the stroke onto the canvas: [B,S,S,3] → [B,S,S,3] */
export function stroke(tf, canvas, p, target) {
  const S = canvas.shape[1], m = mask(tf, p, S);
  const col = brushColour(tf, m, target, p).reshape([-1, 1, 1, 3]);
  const a = tf.add(0.55, tf.mul(0.45, p.slice([0, 10], [-1, 1]))).reshape([-1, 1, 1, 1]);
  const ma = tf.mul(m, a);
  return tf.add(tf.mul(canvas, tf.sub(1, ma)), tf.mul(col, ma));
}
