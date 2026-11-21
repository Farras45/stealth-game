// A tiny deterministic random source (mulberry32) so a seed always replays
// the same patrol jitter and the same screenshot staging.

export function createRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random float in [min, max). */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** Pick one element of an array. */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}
