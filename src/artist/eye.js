// The fly's visual memory and imagination: a small variational autoencoder trained on everything
// it has looked at. Encoding squeezes a picture into 16 numbers; decoding a new set of numbers
// is the fly imagining a picture it has never seen.
export const E = 32, LAT = 16, HID = 160;
export function buildEye(tf) {
  const enc = tf.sequential();
  enc.add(tf.layers.dense({ inputShape: [E * E * 3], units: HID, activation: 'relu' }));
  enc.add(tf.layers.dense({ units: LAT * 2 }));
  const dec = tf.sequential();
  dec.add(tf.layers.dense({ inputShape: [LAT], units: HID, activation: 'relu' }));
  dec.add(tf.layers.dense({ units: E * E * 3, activation: 'sigmoid' }));
  return { enc, dec };
}
export function encode(tf, eye, x) {
  const h = eye.enc.apply(x.reshape([x.shape[0], E * E * 3]));
  return { mu: h.slice([0, 0], [-1, LAT]), lv: tf.clipByValue(h.slice([0, LAT], [-1, LAT]), -6, 4) };
}
export function eyeLoss(tf, eye, x) {
  const B = x.shape[0], flat = x.reshape([B, E * E * 3]);
  const { mu, lv } = encode(tf, eye, x);
  const z = tf.add(mu, tf.mul(tf.exp(tf.mul(0.5, lv)), tf.randomNormal(mu.shape)));
  const rec = eye.dec.apply(z);
  const r = tf.mean(tf.sum(tf.square(tf.sub(rec, flat)), 1));
  const kl = tf.mean(tf.sum(tf.mul(-0.5, tf.sub(tf.add(1, lv), tf.add(tf.square(mu), tf.exp(lv)))), 1));
  return tf.div(tf.add(r, tf.mul(0.5, kl)), E * E);
}
