// Original 48 s cue for "Kavey in Chaos City" (v2): warm, smooth and lively.
// 120 BPM in F major, beat grid offset by 0.1 s so the downbeats land on the
// story: Kavey's three cube hits (7.05 / 16.1 / 24.2 s), the showcase merge
// (29.5 s), the launch (36.6 s) and the brand hit (41.6 s).
// Palette: FM electric piano (Rhodes-like), kalimba arps, soft triangle pads,
// round bass, soft kick, claps, shaker, music box for the sleepy clinic,
// swells into every big moment. Each problem plays light and playful; each
// fix lifts into the groove.
import {C} from '../../../src/city/config.ts';
import {SEED} from '../../../src/config/video.ts';
import {addMono, addStereo, biquad, dbToGain, envAD, makeStereo, mulEnv, noise, noteToFreq, reverb, sine, SR, type Stereo} from '../dsp.ts';
import {bassNote, clap, hat} from '../score.ts';

const DUR = 48;
const BEAT = 0.5;
const GRID0 = 0.1;
const S16 = BEAT / 4;
const DIP = C.coverStart / 60; // 41.3
const RESOLVE = C.reveal / 60; // 41.6
const LAUNCH = C.launch / 60; // 36.6
const MERGE = 29.6;

type Mode = 'intro' | 'problem' | 'sleepy' | 'groove' | 'lead' | 'build' | 'end';
const SECS: {t0: number; t1: number; mode: Mode}[] = [
  {t0: 0, t1: 3.9, mode: 'intro'},
  {t0: 3.9, t1: 7.1, mode: 'problem'},
  {t0: 7.1, t1: 13.3, mode: 'groove'},
  {t0: 13.3, t1: 16.1, mode: 'problem'},
  {t0: 16.1, t1: 21.2, mode: 'groove'},
  {t0: 21.2, t1: 24.1, mode: 'sleepy'},
  {t0: 24.1, t1: 27.6, mode: 'groove'},
  {t0: 27.6, t1: MERGE, mode: 'lead'},
  {t0: MERGE, t1: 33.6, mode: 'groove'},
  {t0: 33.6, t1: LAUNCH, mode: 'build'},
  {t0: LAUNCH, t1: DIP, mode: 'groove'},
  {t0: RESOLVE, t1: DUR, mode: 'end'},
];
const modeAt = (t: number): Mode | null => SECS.find((s) => t >= s.t0 - 1e-6 && t < s.t1 - 1e-6)?.mode ?? null;

const CH = {
  Fmaj9: ['F3', 'A3', 'C4', 'E4', 'G4'],
  Am7: ['A3', 'C4', 'E4', 'G4'],
  Bbmaj7: ['Bb3', 'D4', 'F4', 'A4'],
  C: ['C4', 'E4', 'G4', 'A4'],
  Csus: ['C4', 'F4', 'G4', 'Bb4'],
  Dm7: ['D3', 'F3', 'A3', 'C4'],
  Gm7: ['G3', 'Bb3', 'D4', 'F4'],
  A7: ['A3', 'C#4', 'E4', 'G4'],
  A7sus: ['A3', 'D4', 'E4', 'G4'],
  Eb: ['Eb3', 'G3', 'Bb3', 'D4'],
  CE: ['E3', 'G3', 'C4', 'E4'],
} as const;
type ChordName = keyof typeof CH;

// [start (s), chord, bass]
const PROG: [number, ChordName, string][] = [
  [0, 'Fmaj9', 'F2'],
  [3.9, 'Dm7', 'D2'],
  [5.1, 'Bbmaj7', 'Bb1'],
  [6.1, 'Gm7', 'G2'],
  [6.6, 'A7', 'A2'],
  [7.1, 'Fmaj9', 'F2'],
  [8.6, 'Am7', 'A2'],
  [10.1, 'Bbmaj7', 'Bb2'],
  [11.6, 'C', 'C3'],
  [13.3, 'Gm7', 'G2'],
  [14.6, 'Eb', 'Eb2'],
  [15.6, 'Csus', 'C3'],
  [16.1, 'Bbmaj7', 'Bb2'],
  [17.6, 'C', 'C3'],
  [19.1, 'Am7', 'A2'],
  [20.1, 'Dm7', 'D2'],
  [21.2, 'Dm7', 'D2'],
  [22.6, 'Bbmaj7', 'Bb1'],
  [23.6, 'A7sus', 'A2'],
  [24.1, 'Fmaj9', 'F2'],
  [25.6, 'CE', 'E2'],
  [26.6, 'Dm7', 'D2'],
  [27.6, 'Bbmaj7', 'Bb2'],
  [MERGE, 'Fmaj9', 'F2'],
  [31.1, 'Am7', 'A2'],
  [32.1, 'Bbmaj7', 'Bb2'],
  [33.1, 'C', 'C3'],
  [33.6, 'Dm7', 'D2'],
  [34.6, 'Bbmaj7', 'Bb2'],
  [35.6, 'Csus', 'C3'],
  [36.1, 'C', 'C3'],
  [LAUNCH, 'Fmaj9', 'F2'],
  [38.1, 'Am7', 'A2'],
  [39.1, 'Bbmaj7', 'Bb2'],
  [40.1, 'C', 'C3'],
  [RESOLVE, 'Fmaj9', 'F2'],
  [44.1, 'Bbmaj7', 'Bb2'],
  [46.1, 'Fmaj9', 'F2'],
];
const progIdx = (t: number) => {
  let k = 0;
  for (let i = 0; i < PROG.length; i++) if (t >= PROG[i][0] - 1e-9) k = i;
  return k;
};
const chordAt = (t: number) => CH[PROG[progIdx(t)][1]] as readonly string[];
const bassAt = (t: number) => PROG[progIdx(t)][2];
const octave = (n: string, d: number) => n.replace(/(-?\d)$/, (m) => String(Number(m) + d));

// ------------------------------------------------------------------ voices
const fadeOut = (b: Float32Array, ms = 8) => {
  const n = Math.min(b.length, Math.round((ms / 1000) * SR));
  for (let i = 0; i < n; i++) b[b.length - 1 - i] *= i / n;
  return b;
};

/** FM electric piano (Rhodes-like): bell-ish attack, warm body, soft tremolo. */
const rhodes = (freq: number, len = 1.6, vel = 1) => {
  const n = Math.round(len * SR);
  const out = new Float32Array(n);
  let pc = 0;
  let pm = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const idx = 1.6 * Math.exp(-t * 7) * vel + 0.2;
    pm += (2 * Math.PI * freq) / SR;
    pc += (2 * Math.PI * freq) / SR;
    const tine = 0.12 * Math.sin(pm * 7.1) * Math.exp(-t * 16);
    const env = Math.min(1, t / 0.004) * Math.exp(-t * 1.6) * (0.92 + 0.08 * Math.sin(2 * Math.PI * 4.8 * t));
    out[i] = (Math.sin(pc + idx * Math.sin(pm)) + tine) * env;
  }
  return fadeOut(out, 20);
};

const kalimba = (freq: number, len = 0.7) => {
  const n = Math.round(len * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const a = Math.min(1, t / 0.002);
    out[i] = a * (Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 5) + 0.28 * Math.sin(2 * Math.PI * freq * 5.4 * t) * Math.exp(-t * 30) + 0.12 * Math.sin(2 * Math.PI * freq * 2.76 * t) * Math.exp(-t * 14));
  }
  return fadeOut(out, 15);
};

const musicBox = (freq: number, len = 1.1) => {
  const n = Math.round(len * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = Math.min(1, t / 0.002) * (Math.sin(2 * Math.PI * freq * (1 + 0.004 * Math.sin(2 * Math.PI * 5 * t)) * t) + 0.2 * Math.sin(2 * Math.PI * freq * 4.02 * t) * Math.exp(-t * 20)) * Math.exp(-t * 2.2);
  }
  return fadeOut(out, 15);
};

/** Soft triangle-ish pad (odd harmonics, low-passed), slow attack and release. */
const pad = (notes: readonly string[], len: number, cutoff = 1400, attack = 0.25): Stereo => {
  const out = makeStereo(len);
  notes.forEach((nn, k) => {
    const f = noteToFreq(nn);
    for (const det of [-5, 5]) {
      const f0 = f * Math.pow(2, det / 1200);
      const n = Math.round(len * SR);
      const m = new Float32Array(n);
      for (let h = 1; h <= 7; h += 2) {
        if (h * f0 > SR / 2.2) break;
        const amp = 1 / (h * h);
        const w = (2 * Math.PI * f0 * h) / SR;
        for (let i = 0; i < n; i++) m[i] += amp * Math.sin(w * i + k);
      }
      const flt = biquad(m, 'lowpass', cutoff, 0.6);
      mulEnv(flt, (t) => Math.min(1, t / attack) * Math.min(1, Math.max(0, (len - t) / 0.5)), 0.09);
      addMono(out, flt, 0, 1, (k / Math.max(1, notes.length - 1)) * 0.8 - 0.4 + det * 0.02);
    }
  });
  return out;
};

const softKick = (len = 0.32) => {
  const body = sine(len, (t) => 48 + 60 * Math.exp(-t * 30));
  mulEnv(body, envAD(len, 0.003, 0.18, 3));
  const click = mulEnv(biquad(noise(0.01, SEED + 7), 'bandpass', 1800, 0.8), envAD(0.01, 0.001, 0.004, 4));
  for (let i = 0; i < click.length; i++) body[i] += click[i] * 0.08;
  return body;
};

const rim = (seed: number) => {
  const len = 0.06;
  const b = sine(len, 820);
  mulEnv(b, envAD(len, 0.0008, 0.018, 4));
  const n = mulEnv(biquad(noise(len, seed), 'bandpass', 2200, 1.2), envAD(len, 0.0005, 0.01, 4));
  for (let i = 0; i < b.length; i++) b[i] = 0.6 * b[i] + 0.5 * n[i];
  return b;
};

const shaker = (seed: number, len = 0.07) => mulEnv(biquad(noise(len, seed), 'bandpass', 6500, 1.1), (t) => Math.pow(Math.sin(Math.PI * Math.min(1, t / len)), 1.5));

const swell = (seed: number, len: number) => {
  const n = biquad(biquad(noise(len, seed), 'highpass', 3000, 0.7), 'bandpass', (t) => 2500 + 6000 * (t / len), 0.7);
  return mulEnv(n, (t) => Math.pow(t / len, 2.4) * (t > len - 0.015 ? (len - t) / 0.015 : 1));
};

const crash = (seed: number, len = 1.8) => {
  const n = biquad(biquad(noise(len, seed), 'highpass', 4500, 0.7), 'peaking', 8000, 0.8, 3);
  return mulEnv(n, envAD(len, 0.003, 0.7, 3));
};

// ------------------------------------------------------------------ render
export const renderCityScore = () => {
  const pre = makeStereo(DUR); // up to the reveal (dipped at the ribbon)
  const pump = makeStereo(DUR); // keys, pads, bass, arps — gently ducked by the kick
  const post = makeStereo(DUR); // resolve + ending
  const rev = makeStereo(DUR);
  const revPost = makeStereo(DUR);
  const kicks: number[] = [];
  const grid = (t: number) => Math.round((t - GRID0) / S16); // 16th index

  // pads per chord
  for (let k = 0; k < PROG.length; k++) {
    const [t0, name] = PROG[k];
    const t1 = k + 1 < PROG.length ? PROG[k + 1][0] : DUR;
    const m = modeAt(t0 + 0.01) ?? 'groove';
    const target = t0 >= RESOLVE ? post : pump;
    const cutoff = m === 'sleepy' ? 900 : m === 'problem' ? 1100 : m === 'intro' ? 1000 : 1700;
    const p = pad(CH[name], Math.min(t1, t0 >= RESOLVE ? DUR : DIP) - t0 + 0.4, cutoff, m === 'intro' ? 1.2 : 0.2);
    addStereo(target, p, t0, m === 'groove' || m === 'end' ? 0.9 : 0.75);
    addStereo(t0 >= RESOLVE ? revPost : rev, p, t0, 0.35);
  }

  // drums + percussion on the 16th grid
  for (let i = 0; ; i++) {
    const t = GRID0 + i * S16;
    if (t >= DUR - 0.5) break;
    const m = modeAt(t);
    if (!m) continue;
    const step = i % 16;
    const beat = step % 4 === 0;
    const bi = Math.floor(step / 4);
    const off8 = step % 4 === 2;
    const bus = t >= RESOLVE ? post : pre;
    const fade = t >= RESOLVE ? Math.max(0, 1 - (t - 45.5) / 2) : 1;
    if (m === 'intro') {
      if (t > 2.0 && off8) addMono(pre, shaker(SEED + i), t, 0.035, 0.3);
    } else if (m === 'problem') {
      if (beat && (bi === 0 || bi === 2)) {
        addMono(pre, softKick(), t, 0.4, 0);
        kicks.push(t);
      }
      if (beat && (bi === 1 || bi === 3)) addMono(pre, rim(SEED + i), t, 0.1, -0.2);
      if (step % 2 === 0) addMono(pre, shaker(SEED + i), t, off8 ? 0.04 : 0.025, 0.3);
    } else if (m === 'sleepy') {
      if (step === 0) {
        addMono(pre, softKick(0.4), t, 0.28, 0);
        kicks.push(t);
      }
      if (off8) addMono(pre, shaker(SEED + i), t, 0.02, 0.3);
    } else if (m === 'lead') {
      if (off8) addMono(pre, hat(SEED + i, 0.05), t, 0.03, 0.15);
      if (step % 2 === 1) addMono(pre, shaker(SEED + i), t, 0.025, -0.3);
    } else {
      // groove / build / end
      const gap = m === 'build' && t >= LAUNCH - 0.16;
      if (gap) continue;
      const light = m === 'end';
      if (beat && (!light || bi % 2 === 0)) {
        addMono(bus, softKick(), t, (light ? 0.3 : 0.45) * fade, 0);
        kicks.push(t);
      }
      if (beat && (bi === 1 || bi === 3) && !light) {
        const c = clap(SEED + i);
        addMono(bus, c, t, 0.1, 0);
        addMono(rev, c, t, 0.08, 0);
      }
      if (off8) addMono(bus, hat(SEED + i, 0.06), t, 0.035 * fade, 0.15);
      if (step % 2 === 1) addMono(bus, shaker(SEED + i), t, (m === 'build' ? 0.03 + 0.02 * ((t - 33.6) / 3) : 0.022) * fade, -0.3);
    }
  }

  // rhodes comping: chord hits on 1 and the "and" of 2, softer in problems
  for (let i = 0; ; i++) {
    const t = GRID0 + i * S16;
    if (t >= DUR - 1) break;
    const m = modeAt(t);
    if (!m || m === 'sleepy' || m === 'intro' || m === 'lead') continue;
    const step = i % 16;
    const hit = step === 0 || step === 6 || (m !== 'problem' && step === 10);
    if (!hit) continue;
    const bus = t >= RESOLVE ? post : pump;
    const vel = m === 'problem' ? 0.6 : step === 0 ? 1 : 0.8;
    chordAt(t).forEach((nn, k) => addMono(bus, rhodes(noteToFreq(nn), 1.4, vel), t + k * 0.006, (m === 'problem' ? 0.03 : 0.04) * (m === 'end' ? 0.9 : 1), (k - 1.5) * 0.18));
  }
  // intro + lead: long rhodes swells
  for (const t of [0.1, 2.1, 27.6, 28.6]) chordAt(t).forEach((nn, k) => addMono(t >= RESOLVE ? post : pump, rhodes(noteToFreq(nn), 2.4, 0.7), t + k * 0.03, 0.035, (k - 1.5) * 0.2));

  // bass
  for (let i = 0; ; i++) {
    const t = GRID0 + i * (BEAT / 2);
    if (t >= DUR - 0.6) break;
    const m = modeAt(t);
    if (!m || m === 'intro') continue;
    const e = i % 8;
    const f = noteToFreq(bassAt(t));
    const bus = t >= RESOLVE ? post : pump;
    if (m === 'problem') {
      if (e % 2 === 0) addMono(bus, bassNote(f, 0.18), t, 0.26, 0);
    } else if (m === 'sleepy' || m === 'lead') {
      if (e === 0) addMono(bus, bassNote(f, 1.6), t, 0.22, 0);
    } else {
      if (m === 'build' && t >= LAUNCH - 0.16) continue;
      const pat = [1, 0, 0.6, 0.9, 0, 0.7, 0.6, 0][e];
      if (!pat) continue;
      const note = e === 3 ? octave(bassAt(t), 1) : bassAt(t);
      addMono(bus, bassNote(noteToFreq(note), 0.3), t, 0.28 * pat * (m === 'end' ? 0.8 : 1), 0);
    }
  }

  // kalimba: intro motif, playful pizz-like plucks in problems, arps in grooves, music box when sleepy
  const motif = ['C5', 'F5', 'A5', 'G5', 'F5', 'C5', 'E5', 'F5'];
  motif.forEach((nn, k) => {
    const t = 0.35 + k * 0.42;
    addMono(pump, kalimba(noteToFreq(nn)), t, 0.06, (k % 2 ? 1 : -1) * 0.3);
    addMono(rev, kalimba(noteToFreq(nn)), t, 0.05, 0);
  });
  for (let i = 0; ; i++) {
    const t = GRID0 + i * S16;
    if (t >= DUR - 1) break;
    const m = modeAt(t);
    if (!m) continue;
    const step = i % 16;
    const ch = chordAt(t);
    const bus = t >= RESOLVE ? post : pump;
    if (m === 'problem' && step % 4 === 2) {
      addMono(bus, kalimba(noteToFreq(octave(ch[(step / 2) % ch.length], 1)), 0.25), t, 0.045, step % 8 === 2 ? -0.35 : 0.35);
    } else if (m === 'sleepy' && [0, 6, 10].includes(step)) {
      const nn = ch[[0, 2, 1][[0, 6, 10].indexOf(step)]];
      addMono(bus, musicBox(noteToFreq(octave(nn, 2))), t, 0.05, [0, 6, 10].indexOf(step) * 0.3 - 0.3);
    } else if (m === 'groove' || m === 'build' || (m === 'end' && step % 2 === 0)) {
      const dense = (t >= MERGE && t < 33.6) || (t >= LAUNCH && t < DIP) || m === 'build';
      if (!dense && step % 2 === 1) continue;
      if (m === 'build' && t >= LAUNCH - 0.16) continue;
      const idx = [0, 2, 1, 3, 2, 4, 1, 3, 0, 2, 3, 1, 4, 2, 3, 1][step];
      const nn = octave(ch[idx % ch.length], 1);
      const g = m === 'end' ? 0.03 : 0.036;
      addMono(bus, kalimba(noteToFreq(nn), 0.5), t, g, (step % 2 ? 1 : -1) * 0.28);
      addMono(t >= RESOLVE ? revPost : rev, kalimba(noteToFreq(nn), 0.5), t, 0.03, 0);
    }
  }

  // swells and crashes into the story's big moments
  for (const [t, big] of [
    [3.9, false],
    [7.05, true],
    [16.1, true],
    [24.2, true],
    [MERGE, true],
    [LAUNCH, true],
  ] as [number, boolean][]) {
    const len = big ? 0.9 : 0.6;
    addMono(pre, swell(SEED + Math.round(t * 31), len), t - len, big ? 0.07 : 0.05, 0);
    if (big) {
      const c = crash(SEED + Math.round(t * 71));
      addMono(pre, c, t, t === LAUNCH ? 0.09 : 0.06, 0.2);
      addMono(rev, c, t, 0.05, 0);
    }
  }
  // launch: warm chord bloom and sub
  {
    const sub = sine(1.4, (t) => 43.65 * (1 + 0.25 * Math.exp(-t * 10)));
    mulEnv(sub, envAD(1.4, 0.004, 0.8, 2.6));
    addMono(pre, sub, LAUNCH, 0.28, 0);
    CH.Fmaj9.forEach((nn, k) => addMono(pump, rhodes(noteToFreq(octave(nn, 1)), 2.2, 1.2), LAUNCH + k * 0.01, 0.04, (k - 2) * 0.2));
  }
  // rolls into the fixes' downbeats and the launch (rims, gentle)
  const roll = (t0: number, t1: number, g: number) => {
    for (let t = t0; t < t1 - 1e-6; ) {
      const u = (t - t0) / (t1 - t0);
      addMono(pre, rim(SEED + Math.round(t * 997)), t, 0.02 + g * u, 0);
      t += u < 0.5 ? BEAT / 4 : BEAT / 8;
    }
  };
  roll(35.1, LAUNCH - 0.16, 0.08);
  roll(40.6, DIP, 0.07);

  // ending: resolve on the brand hit
  {
    const t0 = RESOLVE;
    CH.Fmaj9.forEach((nn, k) => {
      addMono(post, rhodes(noteToFreq(nn), 3, 1), t0 + k * 0.012, 0.036, (k - 2) * 0.15);
      addMono(revPost, rhodes(noteToFreq(nn), 3, 1), t0 + k * 0.012, 0.04, 0);
    });
    addMono(post, softKick(0.45), t0, 0.36, 0);
    addMono(post, bassNote(noteToFreq('F2'), 1.8), t0, 0.3, 0);
    // a gentle kalimba melody over the logo and the question
    ['C6', 'A5', 'F5', 'G5', 'A5', 'C6', 'D6', 'C6'].forEach((nn, k) => addMono(post, kalimba(noteToFreq(nn), 0.9), t0 + 0.6 + k * 0.5, 0.04, (k % 2 ? 1 : -1) * 0.25));
  }

  // gentle sidechain (≈ −3 dB, 140 ms) so the groove breathes
  {
    const depth = 0.3;
    const rel = 0.14;
    const ks = kicks.slice().sort((a, b) => a - b);
    let k = 0;
    for (let i = 0; i < pump.L.length; i++) {
      const t = i / SR;
      while (k + 1 < ks.length && ks[k + 1] <= t) k++;
      let g = 1;
      if (ks.length && t >= ks[k]) {
        const d = t - ks[k];
        if (d < 0.004) g = 1 - depth * (d / 0.004);
        else if (d < rel) g = 1 - depth * Math.pow(1 - (d - 0.004) / (rel - 0.004), 2);
      }
      pump.L[i] *= g;
      pump.R[i] *= g;
    }
    // everything on the pump bus starts before the resolve: it goes through the dip
    addStereo(pre, pump, 0, 1);
  }

  addStereo(pre, reverb(rev, {room: 0.84, damp: 0.35}), 0, 1.1);
  addStereo(post, reverb(revPost, {room: 0.86, damp: 0.3}), 0, 1.1);

  // Dip under the ribbon (−18 dB over 40 ms), then the resolve.
  const dip = dbToGain(-18);
  for (let i = 0; i < pre.L.length; i++) {
    const t = i / SR;
    let g = 1;
    if (t >= DIP && t < DIP + 0.04) g = Math.pow(dip, (t - DIP) / 0.04);
    else if (t >= DIP + 0.04) g = dip;
    pre.L[i] *= g;
    pre.R[i] *= g;
  }
  const out = makeStereo(DUR);
  addStereo(out, pre);
  addStereo(out, post);
  for (let i = 0; i < out.L.length; i++) {
    const t = i / SR;
    if (t > DUR - 1.6) {
      const g = Math.max(0, (DUR - t) / 1.6);
      out.L[i] *= g;
      out.R[i] *= g;
    }
  }
  return out;
};
