// A tiny seeded generator (mulberry32). Every random choice in the arena comes from one of
// these, so a seed replays a whole run and the staged screenshots never drift.

export function createRandom(seed) {
  let value = seed | 0;
  return function random() {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
