// Sound design for "Kavey in Chaos City". Every visible action in the 30 s
// film has its own synthesised effect (src/city/config.ts → SFX2), plus three
// ambience beds that give the city depth: a low city rumble, neon buzz that
// only lives while a shop is broken, and car passes placed where a car crosses
// the camera. Deterministic (seeded), 48 kHz stereo, and click-safe: every
// event is built from zero-starting envelopes and gets edge fades.
import {C, calm, SFX2, SNORES, type Cue2} from '../../../src/city/config.ts';
import {camBase, DISTRICT, worldToScreen} from '../../../src/city/camera.ts';
import {CARS, carX} from '../../../src/city/world/cars.ts';
import {SEED} from '../../../src/config/video.ts';
import {addMono, addStereo, biquad, dbToGain, envAD, makeStereo, mulberry32, mulEnv, noise, noteToFreq, reverb, saw, sine, SR, type Stereo} from '../dsp.ts';

export const CITY_DUR = 48;
const FPS = 60;

// ------------------------------------------------------------------ helpers
const len = (s: number) => Math.round(s * SR);

/** Short raised-cosine fades so no event can start or stop on a step. */
const fadeEdges = (b: Float32Array, inMs = 1.5, outMs = 12) => {
  const a = Math.min(b.length, len(inMs / 1000));
  const r = Math.min(b.length, len(outMs / 1000));
  for (let i = 0; i < a; i++) b[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / a);
  for (let i = 0; i < r; i++) b[b.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / r);
  return b;
};

const buf = (s: number) => new Float32Array(len(s));

const addAt = (dst: Float32Array, src: Float32Array, t: number, g = 1) => {
  const o = len(t);
  for (let i = 0; i < src.length && i + o < dst.length; i++) if (i + o >= 0) dst[i + o] += src[i] * g;
  return dst;
};

/** Constant-power pan of a mono signal, optionally moving (p(t) in -1..1). */
const pan = (m: Float32Array, p: number | ((t: number) => number)): Stereo => {
  const L = new Float32Array(m.length);
  const R = new Float32Array(m.length);
  for (let i = 0; i < m.length; i++) {
    const v = typeof p === 'number' ? p : p(i / SR);
    const a = ((Math.max(-1, Math.min(1, v)) + 1) * Math.PI) / 4;
    L[i] = m[i] * Math.cos(a) * Math.SQRT2;
    R[i] = m[i] * Math.sin(a) * Math.SQRT2;
  }
  return {L, R};
};

const stereoLen = (st: Stereo, s: number): Stereo => {
  const out = makeStereo(s);
  addStereo(out, st, 0, 1);
  return out;
};

/** Dry + room (wet) with an extended tail. */
const room = (st: Stereo, wet: number, opts: {room?: number; damp?: number; predelay?: number} = {}, tail = 0.8): Stereo => {
  const out = stereoLen(st, st.L.length / SR + tail);
  const w = reverb(out, {room: opts.room ?? 0.7, damp: opts.damp ?? 0.4, predelay: opts.predelay ?? 0.01});
  addStereo(out, w, 0, wet);
  return out;
};

/** Sum of exponentially decaying partials (bells, metal, wood). */
const partials = (s: number, parts: [freq: number, amp: number, decay: number][], attackMs = 0.8) => {
  const out = buf(s);
  const a = len(attackMs / 1000);
  for (const [fr, amp, dec] of parts) {
    if (fr > SR * 0.45) continue;
    const w = (2 * Math.PI * fr) / SR;
    for (let i = 0; i < out.length; i++) {
      const env = (i < a ? i / a : 1) * Math.exp(-i / (dec * SR));
      if (env < 1e-5 && i > a) break;
      out[i] += amp * env * Math.sin(w * i);
    }
  }
  // never truncate a ringing partial on a step
  return fadeEdges(out, 0, Math.min(15, (s * 1000) / 4));
};

const bellParts = (f0: number, amp = 1, dec = 0.6): [number, number, number][] => [
  [f0, amp, dec],
  [f0 * 2.01, amp * 0.5, dec * 0.6],
  [f0 * 2.76, amp * 0.35, dec * 0.45],
  [f0 * 5.4, amp * 0.18, dec * 0.25],
  [f0 * 8.93, amp * 0.08, dec * 0.12],
];

const nz = (s: number, seed: number) => noise(s, seed);

const pluck = (freq: number, s = 0.4, bright = 1) => {
  const a = sine(s, freq);
  const b = sine(s, freq * 2);
  const c = sine(s, freq * 3.01);
  const e2 = envAD(s, 0.002, 0.05, 3);
  const m = buf(s);
  for (let i = 0; i < m.length; i++) m[i] = a[i] + (0.32 * b[i] + 0.1 * c[i]) * e2[i] * bright;
  return mulEnv(m, envAD(s, 0.002, s * 0.5, 3.2));
};

const click = (seed: number, s = 0.006, lo = 2000, hi = 9000) => mulEnv(biquad(biquad(nz(s, seed), 'highpass', lo, 0.7), 'lowpass', hi, 0.7), envAD(s, 0.0004, s * 0.4, 5));

// ------------------------------------------------------------------ effects
type Built = {st: Stereo; offset?: number};

const build = (c: Cue2, seed: number): Built => {
  const p0 = c.pan ?? 0;
  switch (c.kind) {
    case 'whoosh': {
      const d = c.dur ?? 0.35;
      const env = (t: number) => Math.pow(Math.sin(Math.PI * Math.min(1, t / d)), 1.6);
      const hi = mulEnv(biquad(nz(d, seed), 'bandpass', (t) => 350 + 3400 * Math.sin(Math.PI * Math.min(1, t / d)), 0.8), env);
      const lo = mulEnv(biquad(nz(d, seed + 1), 'lowpass', 380, 0.7), env);
      const m = buf(d);
      for (let i = 0; i < m.length; i++) m[i] = hi[i] + 0.6 * lo[i];
      return {st: room(pan(fadeEdges(m), (t) => p0 - 0.45 + (0.9 * t) / d), 0.15, {room: 0.6}, 0.4)};
    }
    case 'thud': {
      const s = 0.8;
      const body = mulEnv(sine(s, (t) => 48 + 70 * Math.exp(-t * 22)), envAD(s, 0.002, 0.22, 3));
      const thump = mulEnv(biquad(nz(0.12, seed), 'lowpass', 320, 0.7), envAD(0.12, 0.001, 0.05, 4));
      const rattle = partials(s, [
        [820, 0.3, 0.2],
        [1310, 0.22, 0.16],
        [2140, 0.16, 0.12],
        [3380, 0.1, 0.08],
        [4720, 0.06, 0.05],
      ]);
      for (let i = 0; i < rattle.length; i++) rattle[i] *= 0.7 + 0.3 * Math.sin((2 * Math.PI * 31 * i) / SR);
      const m = buf(s);
      addAt(m, body, 0, 1);
      addAt(m, thump, 0, 0.7);
      addAt(m, rattle, 0.004, 0.5);
      return {st: room(pan(fadeEdges(m), 0), 0.18, {room: 0.55}, 0.5)};
    }
    case 'softland': {
      const s = 0.3;
      const body = mulEnv(sine(s, (t) => 50 + 50 * Math.exp(-t * 25)), envAD(s, 0.003, 0.1, 3));
      const air = mulEnv(biquad(nz(s, seed), 'lowpass', 900, 0.7), envAD(s, 0.004, 0.06, 4));
      const m = buf(s);
      addAt(m, body, 0, 1);
      addAt(m, air, 0, 0.35);
      return {st: pan(fadeEdges(m), 0)};
    }
    case 'glitch': {
      // Neon flicker: an electrical buzz switched by smooth (5 ms) gates, plus
      // two soft zaps — chaotic, but band-limited and click-free.
      const d = c.dur ?? 0.4;
      const rnd = mulberry32(seed);
      const hum = biquad(biquad(saw(d, 120, 30), 'bandpass', 1400, 0.7), 'highpass', 200, 0.7);
      const gates: number[] = [];
      for (let k = 0; k < Math.ceil(d * 30) + 2; k++) gates.push(rnd() < 0.45 ? 0.1 : 1);
      const a = Math.exp(-1 / (0.005 * SR));
      let g = 0;
      for (let i = 0; i < hum.length; i++) {
        g = a * g + (1 - a) * gates[Math.floor((i / SR) * 30)];
        hum[i] *= g * Math.sin(Math.PI * Math.min(1, i / SR / d));
      }
      const st = pan(hum, p0);
      for (let k = 0; k < 2; k++) {
        const t0 = rnd() * d * 0.6;
        const zl = 0.06;
        const z = mulEnv(sine(zl, (t) => 2400 * Math.pow(0.35, t / zl)), (t) => Math.sin(Math.PI * Math.min(1, t / zl)) * 0.35);
        addMono(st, z, t0, 1, p0 + (k ? 0.3 : -0.3));
      }
      return {st: {L: fadeEdges(st.L), R: fadeEdges(st.R)}};
    }
    case 'clank': {
      const s = 0.6;
      const f0 = noteToFreq(c.note ?? 'E5');
      const m = buf(s);
      addAt(m, click(seed, 0.006, 1500, 7000), 0, 0.9);
      addAt(m, partials(0.12, [
        [480, 0.6, 0.045],
        [1150, 0.4, 0.03],
        [2300, 0.2, 0.02],
      ]), 0, 0.8);
      addAt(m, partials(s, [
        [f0, 0.35, 0.3],
        [f0 * 2.32, 0.22, 0.2],
        [f0 * 3.91, 0.14, 0.14],
        [f0 * 5.4, 0.08, 0.08],
      ]), 0.002, 0.7);
      addAt(m, mulEnv(sine(0.16, (t) => (f0 / 2) * Math.pow(0.6, t / 0.16)), envAD(0.16, 0.002, 0.07, 3)), 0.01, 0.35);
      return {st: room(pan(fadeEdges(m), p0), 0.16, {room: 0.5}, 0.4)};
    }
    case 'boing': {
      const s = 0.6;
      const fr = (t: number) => 190 + 210 * (1 - Math.exp(-t * 14)) + 60 * Math.exp(-t * 4) * Math.sin(2 * Math.PI * 13 * t);
      const a = sine(s, fr);
      const b = sine(s, (t) => 2 * fr(t));
      const m = buf(s);
      for (let i = 0; i < m.length; i++) m[i] = a[i] + 0.25 * b[i];
      mulEnv(m, envAD(s, 0.003, 0.32, 2.6));
      const twang = mulEnv(biquad(nz(0.05, seed), 'bandpass', 2600, 2), envAD(0.05, 0.001, 0.02, 4));
      addAt(m, twang, 0, 0.4);
      return {st: pan(fadeEdges(biquad(m, 'lowpass', 3500, 0.7)), p0)};
    }
    case 'throw': {
      const s = 0.34;
      const env = (t: number) => Math.pow(Math.sin(Math.PI * Math.min(1, t / s)), 1.2);
      const n = biquad(nz(s, seed), 'bandpass', (t) => 800 + 2600 * (t / s), 1.1);
      for (let i = 0; i < n.length; i++) n[i] *= 0.65 + 0.35 * Math.sin((2 * Math.PI * 28 * i) / SR);
      mulEnv(n, env);
      const tone = mulEnv(sine(s, (t) => 600 + 900 * (t / s)), (t) => 0.12 * env(t));
      const m = buf(s);
      addAt(m, n, 0, 1);
      addAt(m, tone, 0, 1);
      return {st: room(pan(fadeEdges(m), (t) => 0.35 - (0.7 * t) / s), 0.12, {room: 0.5}, 0.3)};
    }
    case 'transform': {
      const s = 1.3;
      const rnd = mulberry32(seed);
      const L = buf(s);
      const R = buf(s);
      const impact = buf(s);
      addAt(impact, mulEnv(sine(0.45, (t) => 40 + 60 * Math.exp(-t * 20)), envAD(0.45, 0.002, 0.2, 3)), 0, 1);
      addAt(impact, mulEnv(biquad(nz(0.12, seed), 'lowpass', 600, 0.7), envAD(0.12, 0.001, 0.04, 4)), 0, 0.6);
      const whoomp = mulEnv(biquad(nz(0.3, seed + 3), 'bandpass', (t) => 300 * Math.pow(14, t / 0.3), 1.2), (t) => Math.sin(Math.PI * Math.min(1, t / 0.3)));
      addAt(impact, whoomp, 0.01, 0.45);
      const st = pan(impact, p0);
      // shimmer: detuned sines sweeping up
      for (let k = 0; k < 4; k++) {
        const sh = mulEnv(sine(0.5, (t) => (800 + 1600 * (t / 0.5)) * (1 + (k - 1.5) * 0.012)), (t) => Math.sin(Math.PI * Math.min(1, t / 0.5)) * 0.12);
        addMono(st, fadeEdges(sh), 0.02, 1, (k - 1.5) * 0.4);
      }
      // sparkle blips from a pentatonic set, spread wide
      const scale = ['E6', 'G6', 'A6', 'B6', 'D7', 'E7', 'G7', 'A7'];
      for (let k = 0; k < 16; k++) {
        const f = noteToFreq(scale[Math.floor(rnd() * scale.length)]);
        const bl = partials(0.2, [
          [f, 0.2, 0.05],
          [f * 2, 0.05, 0.03],
        ]);
        addMono(st, fadeEdges(bl), 0.03 + rnd() * 0.5, 0.7 + 0.3 * rnd(), rnd() * 1.6 - 0.8);
      }
      // tonal bloom
      addMono(st, pluck(noteToFreq('E6'), 0.9, 0.8), 0.04, 0.18, -0.15);
      addMono(st, pluck(noteToFreq('B6'), 0.9, 0.8), 0.06, 0.12, 0.15);
      for (let i = 0; i < L.length; i++) {
        L[i] += st.L[i];
        R[i] += st.R[i];
      }
      return {st: room({L: fadeEdges(L), R: fadeEdges(R)}, 0.3, {room: 0.72, damp: 0.35}, 0.9)};
    }
    case 'blip': {
      const f = noteToFreq(c.note ?? 'A5');
      const m = pluck(f, 0.3, 1.1);
      addAt(m, partials(0.1, [[f * 4, 0.08, 0.02]]), 0, 1);
      return {st: room(pan(fadeEdges(m), p0), 0.22, {room: 0.6}, 0.5)};
    }
    case 'chime': {
      const s = 1.2;
      const notes = c.note ? c.note.split(',') : ['C6', 'E6', 'G6', 'C7'];
      const st = makeStereo(s);
      notes.forEach((n, k) => {
        const f = noteToFreq(n);
        const m = partials(1.0, [
          [f, 0.5, 0.35],
          [f * 2, 0.12, 0.2],
          [f * 3.01, 0.05, 0.1],
        ]);
        addMono(st, fadeEdges(m), k * 0.05, 1, -0.3 + (k * 0.6) / Math.max(1, notes.length - 1));
      });
      return {st: room(st, 0.35, {room: 0.75, damp: 0.3}, 0.9)};
    }
    case 'bell': {
      const s = 1.0;
      const m = buf(s);
      [0, 0.075, 0.15, 0.24].forEach((t, k) => addAt(m, partials(0.9, bellParts(2093 * (k % 2 ? 1.06 : 1), 0.5 * Math.pow(0.75, k), 0.45)), t, 1));
      return {st: room(pan(fadeEdges(m), p0), 0.25, {room: 0.6}, 0.6)};
    }
    case 'flutter': {
      const d = c.dur ?? 0.5;
      const n = biquad(nz(d, seed), 'bandpass', 1900, 1.1);
      const rate = 20 + (seed % 7);
      for (let i = 0; i < n.length; i++) {
        const t = i / SR;
        const flap = Math.pow(Math.abs(Math.sin(Math.PI * rate * t)), 2);
        n[i] *= flap * Math.sin(Math.PI * Math.min(1, t / d));
      }
      const swoop = mulEnv(biquad(nz(d, seed + 5), 'bandpass', (t) => 900 + 1800 * Math.sin(Math.PI * Math.min(1, t / d)), 0.8), (t) => 0.4 * Math.pow(Math.sin(Math.PI * Math.min(1, t / d)), 2));
      const m = buf(d);
      addAt(m, n, 0, 1);
      addAt(m, swoop, 0, 1);
      return {st: pan(fadeEdges(m), (t) => p0 + 0.5 * Math.sin((Math.PI * t) / d))};
    }
    case 'whiff': {
      const s = 0.3;
      const sw = mulEnv(biquad(nz(0.18, seed), 'bandpass', (t) => 3200 * Math.pow(0.25, t / 0.18), 1), (t) => Math.sin(Math.PI * Math.min(1, t / 0.18)));
      const pwip = mulEnv(sine(0.1, (t) => 950 * Math.pow(0.3, t / 0.1)), envAD(0.1, 0.002, 0.05, 3));
      const m = buf(s);
      addAt(m, sw, 0, 1);
      addAt(m, pwip, 0.1, 0.5);
      return {st: pan(fadeEdges(m), (t) => p0 + 0.4 - t * 2)};
    }
    case 'catch': {
      const s = 0.35;
      const body = mulEnv(sine(0.14, (t) => 90 + 90 * Math.exp(-t * 30)), envAD(0.14, 0.002, 0.06, 3));
      const m = buf(s);
      addAt(m, body, 0, 1);
      addAt(m, click(seed, 0.01, 1500, 6000), 0, 0.3);
      addAt(m, pluck(noteToFreq('E7'), 0.25, 0.6), 0.01, 0.25);
      return {st: room(pan(fadeEdges(m), p0), 0.15, {room: 0.5}, 0.3)};
    }
    case 'snore': {
      const s = 1.25;
      const inh = mulEnv(biquad(nz(0.6, seed), 'bandpass', (t) => 500 + 700 * (t / 0.6), 1.4), (t) => Math.sin((Math.PI * Math.min(1, t / 0.6)) / 1) * 0.9);
      for (let i = 0; i < inh.length; i++) inh[i] *= 0.55 + 0.45 * Math.max(0, Math.sin((2 * Math.PI * 27 * i) / SR));
      const rattle = mulEnv(biquad(saw(0.6, 58, 30), 'lowpass', 700, 0.8), (t) => 0.35 * Math.sin(Math.PI * Math.min(1, t / 0.6)));
      const exh = mulEnv(sine(0.5, (t) => 880 - 200 * (t / 0.5)), (t) => 0.18 * Math.sin(Math.PI * Math.min(1, t / 0.5)));
      const breath = mulEnv(biquad(nz(0.5, seed + 2), 'bandpass', 1400, 0.9), (t) => 0.3 * Math.sin(Math.PI * Math.min(1, t / 0.5)));
      const m = buf(s);
      addAt(m, inh, 0, 1);
      addAt(m, rattle, 0, 1);
      addAt(m, exh, 0.68, 1);
      addAt(m, breath, 0.68, 1);
      return {st: room(pan(fadeEdges(m), p0), 0.12, {room: 0.45}, 0.3)};
    }
    case 'ticktock': {
      const d = c.dur ?? 1.2;
      const m = buf(d + 0.1);
      for (let t = 0, k = 0; t < d; t += 0.25, k++) {
        const f = k % 2 ? 1500 : 2400;
        addAt(
          m,
          partials(0.05, [
            [f, 0.6, 0.012],
            [f * 1.8, 0.2, 0.006],
          ]),
          t,
          1,
        );
        addAt(m, click(seed + k, 0.003, 2000, 9000), t, 0.3);
      }
      return {st: room(pan(fadeEdges(m), p0), 0.18, {room: 0.5}, 0.3)};
    }
    case 'swish': {
      const s = 0.2;
      const m = mulEnv(biquad(nz(s, seed), 'bandpass', (t) => 700 + 1600 * Math.sin(Math.PI * Math.min(1, t / s)), 0.9), (t) => Math.pow(Math.sin(Math.PI * Math.min(1, t / s)), 1.5));
      return {st: pan(fadeEdges(m), (t) => p0 - 0.2 + (2 * t) / s * 0.2)};
    }
    case 'ping': {
      const f = noteToFreq(c.note ?? 'E6');
      const m = buf(0.7);
      addAt(m, partials(0.3, [[f / 1.5, 0.25, 0.06]]), 0, 1);
      addAt(m, partials(0.65, [
        [f, 0.5, 0.18],
        [f * 2, 0.12, 0.1],
        [f * 2.76, 0.08, 0.07],
      ]), 0.045, 1);
      return {st: room(pan(fadeEdges(m), p0), 0.28, {room: 0.65}, 0.6)};
    }
    case 'alarm': {
      const s = 1.2;
      const m = buf(s);
      for (let t = 0, k = 0; t < 0.85; t += 1 / 22, k++) {
        const f = k % 2 ? 2600 : 2350;
        const g = 0.5 * (t < 0.7 ? 1 : 1 - (t - 0.7) / 0.15);
        addAt(
          m,
          partials(0.3, [
            [f, g, 0.12],
            [f * 2.7, g * 0.3, 0.05],
            [f * 0.51, g * 0.25, 0.08],
          ]),
          t,
          1,
        );
      }
      const jolt = mulEnv(sine(0.25, (t) => 300 + 500 * (1 - Math.exp(-t * 20))), envAD(0.25, 0.002, 0.1, 3));
      addAt(m, jolt, 0, 0.25);
      return {st: room(pan(fadeEdges(m), p0), 0.2, {room: 0.55}, 0.5)};
    }
    case 'riser': {
      const d = c.dur ?? 1.2;
      const n = mulEnv(biquad(nz(d, seed), 'bandpass', (t) => 400 * Math.pow(12, t / d), 1.3), (t) => Math.pow(t / d, 2));
      const st = pan(n, 0);
      ['A3', 'E4', 'A4'].forEach((nn, k) => {
        const sw = biquad(saw(d, noteToFreq(nn), 18, (k - 1) * 8), 'lowpass', (t) => 500 + 4000 * Math.pow(t / d, 2), 0.8);
        for (let i = 0; i < sw.length; i++) {
          const t = i / SR;
          sw[i] *= 0.12 * Math.pow(t / d, 1.4) * (0.8 + 0.2 * Math.sin(2 * Math.PI * (4 + 10 * t / d) * t));
        }
        addMono(st, sw, 0, 1, (k - 1) * 0.5);
      });
      return {st: {L: fadeEdges(st.L, 5, 25), R: fadeEdges(st.R, 5, 25)}};
    }
    case 'flip': {
      const s = 0.16;
      const m = buf(s);
      addAt(m, click(seed, 0.005, 1500, 7000), 0, 1);
      addAt(m, click(seed + 1, 0.005, 1800, 8000), 0.045, 0.8);
      addAt(m, mulEnv(biquad(nz(0.1, seed + 2), 'bandpass', 1200, 0.8), (t) => 0.4 * Math.sin(Math.PI * Math.min(1, t / 0.1))), 0.01, 1);
      return {st: pan(fadeEdges(m), p0)};
    }
    case 'construct': {
      const d = c.dur ?? 1.2;
      const rnd = mulberry32(seed);
      const st = makeStereo(d + 0.2);
      for (let t = 0; t < d; t += 0.055 + rnd() * 0.04) {
        const metal = rnd() < 0.5;
        const f = metal ? 2600 + rnd() * 1800 : 600 + rnd() * 300;
        const hit = partials(0.08, metal ? [[f, 0.4, 0.02], [f * 1.7, 0.2, 0.012]] : [[f, 0.6, 0.03], [f * 2.3, 0.2, 0.015]]);
        addMono(st, fadeEdges(hit, 0.5, 4), t, 0.5 + 0.5 * rnd(), rnd() * 1.2 - 0.6);
      }
      const whine = mulEnv(sine(d, (t) => 900 + 300 * (t / d)), (t) => 0.05 * Math.sin(Math.PI * Math.min(1, t / d)));
      addMono(st, whine, 0, 1, 0.2);
      return {st};
    }
    case 'launch': {
      const s = 1.9;
      const st = makeStereo(s);
      // bloom at the LIVE moment
      addMono(st, mulEnv(sine(0.6, (t) => 42 + 50 * Math.exp(-t * 16)), envAD(0.6, 0.003, 0.3, 3)), 0, 1, 0);
      ['A4', 'C5', 'E5', 'B5'].forEach((n, k) => {
        const sw = biquad(saw(0.9, noteToFreq(n), 22, (k - 1.5) * 7), 'lowpass', (t) => 1200 + 4000 * Math.exp(-t * 5), 0.8);
        mulEnv(sw, envAD(0.9, 0.004, 0.45, 3));
        addMono(st, fadeEdges(sw), 0, 0.09, (k - 1.5) * 0.35);
      });
      // rocket rumble and lift-off swoosh as the phone leaves
      const rum = mulEnv(biquad(nz(1.6, seed), 'lowpass', 260, 0.8), (t) => Math.min(1, t / 0.35) * Math.exp(-Math.max(0, t - 0.6) * 2.2) * 0.8);
      addMono(st, fadeEdges(rum, 5, 60), 0.2, 1, 0);
      const up = mulEnv(biquad(nz(0.8, seed + 4), 'bandpass', (t) => 250 * Math.pow(12, t / 0.8), 1.1), (t) => Math.sin(Math.PI * Math.min(1, t / 0.8)));
      addMono(st, fadeEdges(up), 0.35, 0.7, 0);
      return {st: room(st, 0.3, {room: 0.78, damp: 0.3}, 1.0)};
    }
    case 'firework': {
      const s = 1.6;
      const rnd = mulberry32(seed);
      const st = makeStereo(s + 0.3);
      const rise = 16 / FPS;
      const whistle = mulEnv(sine(rise, (t) => (1300 + 1400 * (t / rise)) * (1 + 0.01 * Math.sin(2 * Math.PI * 9 * t))), (t) => 0.2 * Math.sin(Math.PI * Math.min(1, t / rise)));
      addMono(st, fadeEdges(whistle, 2, 8), 0, 1, p0 * 0.6);
      const boom = buf(0.9);
      addAt(boom, mulEnv(sine(0.9, (t) => 34 + 40 * Math.exp(-t * 14)), envAD(0.9, 0.003, 0.4, 3)), 0, 1);
      addAt(boom, mulEnv(biquad(nz(0.5, seed), 'lowpass', 500, 0.7), envAD(0.5, 0.002, 0.18, 3)), 0, 0.8);
      addMono(st, fadeEdges(boom), rise, 1, p0);
      // sizzle: dense, soft-edged crackle that thins out (no isolated late ticks)
      for (let k = 0; k < 56; k++) {
        const u = Math.pow(rnd(), 1.5);
        const t = rise + 0.1 + u * 0.75;
        const cr = mulEnv(biquad(nz(0.007, seed + 10 + k), 'bandpass', 3500 + 3000 * rnd(), 1.2), (tt) => Math.sin(Math.PI * Math.min(1, tt / 0.007)));
        addMono(st, cr, t, (0.22 + 0.2 * rnd()) * (1 - 0.8 * u), p0 + (rnd() - 0.5) * 0.8);
      }
      return {st: room(st, 0.45, {room: 0.86, damp: 0.25, predelay: 0.03}, 1.2), offset: -rise};
    }
    case 'keys': {
      const s = 0.55;
      const rnd = mulberry32(seed);
      const st = makeStereo(s);
      for (let k = 0; k < 11; k++) {
        const f = 3000 + rnd() * 3200;
        const m = partials(0.2, [
          [f, 0.4, 0.06 + 0.06 * rnd()],
          [f * 1.47, 0.2, 0.04],
          [f * 2.13, 0.1, 0.025],
        ]);
        addMono(st, fadeEdges(m, 0.3, 5), Math.pow(rnd(), 1.3) * 0.34, 0.6 + 0.4 * rnd(), p0 + (rnd() - 0.5) * 0.6);
      }
      return {st: room(st, 0.2, {room: 0.5}, 0.4)};
    }
    case 'servo': {
      const d = c.dur ?? 0.5;
      const w = biquad(saw(d, 180, 20), 'lowpass', 1400, 0.8);
      for (let i = 0; i < w.length; i++) {
        const t = i / SR;
        w[i] *= (0.8 + 0.2 * Math.sin(2 * Math.PI * 30 * t)) * Math.sin(Math.PI * Math.min(1, t / d)) * 0.5;
      }
      const m = buf(d + 0.15);
      addAt(m, w, 0, 1);
      addAt(m, partials(0.12, [
        [420, 0.6, 0.03],
        [1600, 0.25, 0.015],
      ]), d - 0.02, 1);
      return {st: pan(fadeEdges(m), 0)};
    }
    case 'power': {
      const s = 0.8;
      const m = buf(s);
      addAt(m, mulEnv(sine(0.25, (t) => 55 + 40 * Math.exp(-t * 30)), envAD(0.25, 0.002, 0.1, 3)), 0, 1);
      addAt(m, mulEnv(biquad(nz(0.012, seed), 'bandpass', 1800, 0.9), (t) => Math.sin(Math.PI * Math.min(1, t / 0.012))), 0, 0.5);
      const hum = biquad(saw(0.7, 120, 24), 'bandpass', 900, 0.7);
      // three smooth flickers, then steady
      const gate = (t: number) => {
        const flick = t < 0.25 ? 0.5 + 0.5 * Math.cos(2 * Math.PI * 12 * t) : 1; // ends on a full cycle: no gain step
        return flick * Math.min(1, t / 0.03) * (t > 0.55 ? Math.max(0, 1 - (t - 0.55) / 0.15) : 1) * 0.35;
      };
      addAt(m, mulEnv(hum, gate), 0.02, 1);
      return {st: room(pan(fadeEdges(m), 0), 0.15, {room: 0.5}, 0.4)};
    }
    case 'scan': {
      const s = 0.3;
      const n = mulEnv(biquad(nz(s, seed), 'bandpass', (t) => 2000 + 4000 * (t / s), 2), (t) => Math.sin(Math.PI * Math.min(1, t / s)));
      return {st: pan(fadeEdges(n), (t) => -0.6 + (1.2 * t) / s)};
    }
    case 'click': {
      const m = buf(0.1);
      addAt(m, mulEnv(sine(0.05, 1800), envAD(0.05, 0.0005, 0.008, 5)), 0, 0.5);
      addAt(m, click(seed, 0.02, 1200, 6000), 0.018, 1);
      return {st: room(pan(fadeEdges(m), p0), 0.12, {room: 0.4}, 0.2)};
    }
    case 'pop': {
      const s = 0.12;
      const b = mulEnv(sine(s, (t) => 900 * Math.pow(0.45, t / s)), envAD(s, 0.001, 0.035, 4));
      addAt(b, click(seed, 0.008, 2500, 9000), 0, 0.25);
      return {st: room(pan(fadeEdges(b), p0), 0.12, {room: 0.45}, 0.2)};
    }
    case 'slam': {
      const s = 0.4;
      const body = mulEnv(sine(s, (t) => 52 + 90 * Math.exp(-t * 30)), envAD(s, 0.002, 0.13, 3));
      const sn = mulEnv(biquad(nz(0.07, seed), 'bandpass', 2400, 0.8), envAD(0.07, 0.001, 0.02, 4));
      addAt(body, sn, 0, 0.5);
      return {st: room(pan(fadeEdges(body), 0), 0.2, {room: 0.6}, 0.5)};
    }
    case 'intake': {
      const s = 0.2;
      const n = biquad(nz(s, seed), 'lowpass', (t) => 200 + 900 * (t / s), 0.8);
      mulEnv(n, (t) => Math.pow(t / s, 2));
      return {st: pan(fadeEdges(n, 2, 12), 0)};
    }
    case 'sweep': {
      const s = 0.85;
      const n = biquad(nz(s, seed), 'highpass', 180, 0.7);
      const shaped = biquad(n, 'bandpass', (t) => 400 * Math.pow(8, Math.min(1, t / 0.55)), 0.9);
      mulEnv(shaped, (t) => Math.pow(Math.min(1, t / 0.5), 1.8) * (t > 0.55 ? Math.max(0, 1 - (t - 0.55) / 0.3) : 1));
      return {st: room(pan(fadeEdges(shaped), (t) => -0.55 + 1.1 * Math.min(1, t / 0.75)), 0.15, {room: 0.6}, 0.4)};
    }
    case 'air': {
      const s = 0.32;
      const n = mulEnv(biquad(biquad(nz(s, seed), 'highpass', 300, 0.7), 'lowpass', 2500, 0.7), (t) => Math.sin((Math.PI * t) / s));
      return {st: pan(fadeEdges(n), 0)};
    }
    case 'brandHit': {
      const s = 1.3;
      const m = buf(s);
      addAt(m, mulEnv(sine(0.5, (t) => 48 + 50 * Math.exp(-t * 18)), envAD(0.5, 0.004, 0.28, 3)), 0, 1);
      addAt(m, mulEnv(biquad(nz(0.25, seed), 'lowpass', 900, 0.7), envAD(0.25, 0.003, 0.09, 4)), 0, 0.4);
      const n1 = pluck(noteToFreq('A5'), 0.9, 0.8);
      const n2 = pluck(noteToFreq('E6'), 0.9, 0.8);
      addAt(m, n1, 0, 0.32);
      addAt(m, n2, 0.1, 0.3);
      const st = pan(fadeEdges(m), 0);
      const bell = makeStereo(s);
      addMono(bell, n1, 0, 0.3, -0.1);
      addMono(bell, n2, 0.1, 0.28, 0.1);
      const out = stereoLen(st, s + 1.2);
      addStereo(out, reverb(stereoLen(bell, s + 1.2), {room: 0.82, damp: 0.3, predelay: 0.01}), 0, 0.9);
      return {st: out};
    }
    case 'confetti': {
      // party popper: soft pop, paper burst, a few settling rustles
      const s = 1.2;
      const st = makeStereo(s);
      const pop = mulEnv(sine(0.1, (t) => 420 * Math.pow(0.4, t / 0.1)), envAD(0.1, 0.001, 0.03, 4));
      addMono(st, fadeEdges(pop), 0, 0.7, 0);
      const burst = mulEnv(biquad(nz(0.35, seed), 'bandpass', 3800, 0.7), (t) => Math.exp(-t * 9) * Math.min(1, t / 0.003));
      addMono(st, fadeEdges(burst), 0.005, 0.6, 0);
      const rnd = mulberry32(seed);
      for (let k = 0; k < 24; k++) {
        const t = 0.08 + Math.pow(rnd(), 0.8) * 0.9;
        const r = mulEnv(biquad(nz(0.03, seed + k), 'bandpass', 2500 + 3500 * rnd(), 1.5), (tt) => Math.sin(Math.PI * Math.min(1, tt / 0.03)));
        addMono(st, r, t, 0.12 + 0.15 * rnd() * (1 - t), (rnd() - 0.5) * 1.4);
      }
      return {st: room(st, 0.2, {room: 0.6}, 0.5)};
    }
    case 'sparkle': {
      // glittering shimmer: many soft high sine pings, spread wide
      const s = 1.2;
      const st = makeStereo(s);
      const rnd = mulberry32(seed);
      const scale = ['C6', 'E6', 'G6', 'A6', 'C7', 'E7', 'G7'];
      for (let k = 0; k < 22; k++) {
        const f = noteToFreq(scale[Math.floor(rnd() * scale.length)]);
        const p = partials(0.35, [
          [f, 0.2, 0.08],
          [f * 2.01, 0.05, 0.04],
        ]);
        addMono(st, p, Math.pow(rnd(), 0.9) * 0.8, 0.5 + 0.5 * rnd(), (rnd() - 0.5) * 1.6);
      }
      return {st: room(st, 0.35, {room: 0.75, damp: 0.3}, 0.8)};
    }
    case 'spot': {
      // stage spotlight switching on: heavy clunk and a warm electrical hum
      const s = 0.9;
      const m = buf(s);
      addAt(m, mulEnv(sine(0.2, (t) => 70 + 50 * Math.exp(-t * 30)), envAD(0.2, 0.002, 0.08, 3)), 0, 1);
      addAt(m, mulEnv(biquad(nz(0.03, seed), 'bandpass', 1400, 1), (t) => Math.sin(Math.PI * Math.min(1, t / 0.03))), 0, 0.5);
      const hum = mulEnv(biquad(saw(0.8, 100, 20), 'lowpass', 600, 0.7), (t) => 0.25 * Math.min(1, t / 0.05) * Math.max(0, 1 - t / 0.8));
      addAt(m, hum, 0.02, 1);
      return {st: room(pan(fadeEdges(m), p0), 0.25, {room: 0.7}, 0.6)};
    }
    case 'chirp': {
      // a small bird: two or three fast upward FM chirps
      const s = 0.4;
      const m = buf(s);
      const rnd = mulberry32(seed);
      const n = 2 + Math.floor(rnd() * 2);
      for (let k = 0; k < n; k++) {
        const f0 = 3200 + 1200 * rnd();
        const len = 0.05 + 0.03 * rnd();
        const ch = mulEnv(sine(len, (t) => f0 * (1 + 0.5 * (t / len)) + 300 * Math.sin(2 * Math.PI * 60 * t)), (t) => Math.sin(Math.PI * Math.min(1, t / len)));
        addAt(m, ch, k * 0.09, 0.6);
      }
      return {st: room(pan(fadeEdges(m), p0), 0.2, {room: 0.6}, 0.3)};
    }
    default:
      throw new Error(`unknown sfx kind ${c.kind}`);
  }
};

// ------------------------------------------------------------------ ambience beds
/** Which district the camera is looking at, and how broken it is (0…1). */
const chaosInView = (f: number) => {
  const x = camBase(f).cx;
  const near = (['salon', 'gym', 'clinic'] as const).map((k) => ({k, w: Math.max(0, 1 - Math.abs(x - DISTRICT[k]) / 700)}));
  let c = 0;
  for (const {k, w} of near) c += w * (1 - calm[k](f));
  return f >= 1640 ? 0 : Math.min(1, c);
};

const cityBed = (): Stereo => {
  const st = makeStereo(CITY_DUR);
  const worldEnd = C.coverStart / FPS;
  for (const [ch, sd] of [
    ['L', 11],
    ['R', 12],
  ] as const) {
    const rumble = biquad(biquad(noise(CITY_DUR, SEED + sd), 'lowpass', 160, 0.7), 'lowpass', 160, 0.7);
    const hiss = biquad(biquad(noise(CITY_DUR, SEED + sd + 10), 'bandpass', 900, 0.5), 'lowpass', 2500, 0.7);
    const out = st[ch];
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      const world = t < worldEnd ? Math.min(1, t / 0.3) : Math.max(0, 1 - (t - worldEnd) / 0.08);
      const swell = 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.13 * t + (ch === 'L' ? 0 : 1.3));
      // quieter, airier night after the swap
      const night = t > worldEnd + 0.3 ? Math.min(1, (t - worldEnd - 0.3) / 0.6) : 0;
      out[i] = (rumble[i] * 3.2 * world + hiss[i] * 0.35 * world) * swell + hiss[i] * 0.18 * night;
    }
  }
  return st;
};

const neonBuzz = (): Stereo => {
  const hum = biquad(biquad(saw(CITY_DUR, 120, 30), 'bandpass', 700, 0.6), 'highpass', 150, 0.7);
  const rnd = mulberry32(SEED + 77);
  // Smooth flicker gate: sample-and-hold at ~9 Hz through a 10 ms one-pole.
  const held: number[] = [];
  for (let k = 0; k < CITY_DUR * 9 + 2; k++) held.push(rnd() < 0.25 ? 0.15 : 1);
  const a = Math.exp(-1 / (0.01 * SR));
  let g = 0;
  for (let i = 0; i < hum.length; i++) {
    const t = i / SR;
    const target = held[Math.floor(t * 9)] * chaosInView(t * FPS);
    g = a * g + (1 - a) * target;
    hum[i] *= g;
  }
  return pan(hum, -0.2);
};

/** A car passing: tyre noise + engine hum, pitch dropping, panned across. */
const carPass = (dir: 1 | -1, near: boolean, seed: number): Stereo => {
  const d = 1.4;
  const env = (t: number) => Math.exp(-Math.pow((t - d / 2) / 0.28, 2));
  const tyre = mulEnv(biquad(nz(d, seed), 'bandpass', (t) => 900 - 300 * (t / d), 0.7), env);
  // Doppler: pitch glides down smoothly through the pass.
  const hum = mulEnv(sine(d, (t) => 95 * (1.06 - 0.12 / (1 + Math.exp(-(t - d / 2) / 0.08)))), (t) => 0.4 * env(t));
  const m = buf(d);
  addAt(m, tyre, 0, 1);
  addAt(m, hum, 0, near ? 1 : 0.6);
  return pan(fadeEdges(biquad(m, 'lowpass', near ? 3000 : 1800, 0.7), 5, 30), (t) => dir * (-0.8 + (1.6 * t) / d));
};

const carBed = (): {st: Stereo; passes: {frame: number; dir: number}[]} => {
  const st = makeStereo(CITY_DUR);
  const passes: {frame: number; dir: number}[] = [];
  let last = -999;
  for (const [ci, car] of CARS.entries()) {
    let prev = worldToScreen(0, carX(car, 0), car.lane).x - 540;
    for (let f = 1; f < C.coverStart; f++) {
      const s = worldToScreen(f, carX(car, f), car.lane);
      const cur = s.x - 540;
      const jumped = Math.abs(carX(car, f) - carX(car, f - 1)) > 500; // wrap-around
      if (!jumped && prev * cur < 0 && s.y < 1920 && f - last > 40) {
        passes.push({frame: f, dir: car.dir});
        addStereo(st, carPass(car.dir, car.lane < 1700, SEED + ci * 31 + f), f / FPS - 0.7, 1);
        last = f;
      }
      prev = cur;
    }
  }
  return {st, passes};
};

// ------------------------------------------------------------------ render
/** Birdsong for a lively street (only in the district scenes). */
const CHIRPS: Cue2[] = [20, 95, 170, 380, 520, 640, 860, 1010, 1120, 1300, 1480, 1590].map((frame, i) => ({id: `chirp-${i}`, frame, kind: 'chirp', db: -30 - (i % 3) * 2, pan: [-0.7, 0.6, -0.4, 0.8, -0.8, 0.5][i % 6]}));

export const renderCitySfx = () => {
  const bus = makeStereo(CITY_DUR);
  for (const c of [...SFX2, ...CHIRPS]) {
    const seed = SEED + c.frame * 17 + c.id.length * 131;
    const {st, offset = 0} = build(c, seed);
    let p = 0;
    for (let i = 0; i < st.L.length; i++) p = Math.max(p, Math.abs(st.L[i]), Math.abs(st.R[i]));
    const g = dbToGain(c.db) / (p || 1);
    addStereo(bus, st, c.frame / FPS + offset, g);
  }
  const beds = makeStereo(CITY_DUR);
  addStereo(beds, cityBed(), 0, dbToGain(-33));
  addStereo(beds, neonBuzz(), 0, dbToGain(-40));
  const cars = carBed();
  addStereo(beds, cars.st, 0, dbToGain(-31));
  return {bus, beds, carPasses: cars.passes};
};

export const SNORE_FRAMES = SNORES;

// ------------------------------------------------------------------ audit
/** Kinds whose design is deliberately impulsive (clicks, taps, crackle, ticks). */
const IMPULSIVE = new Set(['click', 'pop', 'keys', 'construct', 'ticktock', 'glitch', 'firework', 'flip', 'clank', 'thud', 'catch', 'servo', 'power', 'bell', 'alarm', 'transform', 'launch', 'brandHit', 'slam']);

/**
 * Click audit on every effect in isolation (nothing masks a fault there):
 * edge levels relative to peak, and isolated second-difference spikes
 * (> 10x the local level in ±1.5 ms) — required to be zero for smooth kinds.
 */
export const auditCitySfx = () =>
  [...SFX2, ...CHIRPS].map((c) => {
    const seed = SEED + c.frame * 17 + c.id.length * 131;
    const {st} = build(c, seed);
    let pk = 0;
    for (let i = 0; i < st.L.length; i++) pk = Math.max(pk, Math.abs(st.L[i]), Math.abs(st.R[i]));
    const edge = Math.max(Math.abs(st.L[0]), Math.abs(st.R[0]), Math.abs(st.L[st.L.length - 1]), Math.abs(st.R[st.R.length - 1])) / (pk || 1);
    let spikes = 0;
    const win = Math.round(0.0015 * SR);
    for (const ch of [st.L, st.R]) {
      const n = ch.length - 2;
      const d2 = new Float64Array(n);
      for (let i = 0; i < n; i++) d2[i] = Math.abs(ch[i + 2] - 2 * ch[i + 1] + ch[i]) / (pk || 1);
      const cs = new Float64Array(n + 1);
      for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + d2[i] * d2[i];
      let last = -1e9;
      for (let i = 0; i < n; i++) {
        if (d2[i] < 0.002) continue;
        const lo = Math.max(0, i - win);
        const hi = Math.min(n, i + win + 1);
        const c0 = Math.max(0, i - 2);
        const c1 = Math.min(n, i + 3);
        const tot = cs[hi] - cs[lo] - (cs[c1] - cs[c0]);
        const cnt = hi - lo - (c1 - c0);
        const local = Math.sqrt(tot / Math.max(1, cnt));
        if (d2[i] > 10 * (local + 1e-9) && i - last > 0.005 * SR) {
          spikes++;
          last = i;
        }
      }
    }
    return {id: c.id, kind: c.kind, edge: +edge.toExponential(2), spikes, impulsive: IMPULSIVE.has(c.kind)};
  });
