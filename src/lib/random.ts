// Seeded PRNG (mulberry32). All randomness in the film flows from SEED so a
// frame renders identically whether scrubbed to or played through.
import {SEED} from '../config/video.ts';

export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Stateless hash → [0,1). Use for per-frame or per-item values. */
export const hash01 = (...n: number[]) => {
  let h = SEED ^ 0x9e3779b9;
  for (const v of n) {
    h = Math.imul(h ^ Math.floor(v * 1000003), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
};

export const seeded = (salt: number) => mulberry32(SEED + salt * 7919);
