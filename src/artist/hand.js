// The fly's hand network: looks at what it wants (target), what it has (canvas) and where they
// differ, and decides the next brush stroke. It learns by painting on its own canvases and
// following the gradient of "did that stroke bring me closer?" through a differentiable brush.
import { NP, stroke } from './raster.js';
export const S = 32;            // canvas the hand practises on
export const V = 16;            // what it looks at (downsampled)
export function buildHand(tf) {
  const m = tf.sequential();
  m.add(tf.layers.dense({ inputShape: [V * V * 9], units: 256, activation: 'relu' }));
  m.add(tf.layers.dense({ units: 128, activation: 'relu' }));
  m.add(tf.layers.dense({ units: NP, kernelInitializer: tf.initializers.randomNormal({ stddev: 0.06 }) }));   // logits
  return m;
}
export function handInput(tf, target, canvas) {
  const k = S / V, t = tf.avgPool(target, k, k, 'valid'), c = tf.avgPool(canvas, k, k, 'valid');
  return tf.concat([t, c, tf.mul(2, tf.sub(t, c))], -1).reshape([target.shape[0], V * V * 9]);
}
const pool = (tf, x, k) => tf.avgPool(x, k, k, 'valid');
/** the hand's decision: stroke parameters in 0..1 */
export const decide = (tf, model, target, canvas, noise = 0) => tf.sigmoid(noise ? tf.add(model.apply(handInput(tf, target, canvas)), tf.randomNormal([target.shape[0], NP], 0, noise)) : model.apply(handInput(tf, target, canvas)));
/** the loss of one greedy step: how far the canvas is from the target after the chosen stroke */
export function stepLoss(tf, model, target, canvas) {
  const logits = model.apply(handInput(tf, target, canvas)), p = tf.sigmoid(logits);
  const c2 = stroke(tf, canvas, p, target);
  return tf.addN([tf.mul(0.002, tf.mean(tf.square(logits))), tf.losses.meanSquaredError(target, c2), tf.mul(0.5, tf.losses.meanSquaredError(pool(tf, target, 4), pool(tf, c2, 4))), tf.mul(0.5, tf.losses.meanSquaredError(pool(tf, target, 16), pool(tf, c2, 16)))]);
}
