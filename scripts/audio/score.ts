// Original 120 BPM cue in A minor (plan section 8). Ten 2-second bars with
// bass roots A2 A2 F2 F2 C3 C3 G2 G2 E2 A2; the E-root tension is overridden
// by an A-minor add-nine resolution at 17.00 s. Rendered offline, sample-exact.
import {BASS_ROOTS, MUSIC} from '../../src/config/cues.ts';
import {SEED} from '../../src/config/video.ts';
import {
  addMono,
  addStereo,
  biquad,
  dbToGain,
  envAD,
  makeStereo,
  mulEnv,
  noise,
  noteToFreq,
  reverb,
  saw,
  sine,
  SR,
  triangle,
  type Stereo,
} from './dsp.ts';

const DUR = 20;
const BEAT = 0.5;
const S16 = BEAT / 4;

// Chord tones per bar (A minor). Bar 8 is E major for tension; from 17 s the
// harmony resolves to A minor add-nine.
const CHORDS: string[][] = [
  ['A3', 'C4', 'E4', 'A4'],
  ['A3', 'C4', 'E4', 'B4'],
  ['F3', 'A3', 'C4', 'E4'],
  ['F3', 'A3', 'C4', 'G4'],
  ['C4', 'E4', 'G4', 'D5'],
  ['C4', 'E4', 'G4', 'B4'],
  ['G3', 'B3', 'D4', 'A4'],
  ['G3', 'B3', 'D4', 'G4'],
  ['E3', 'G#3', 'B3', 'E4'],
  ['A3', 'C4', 'E4', 'B4'],
];
const RESOLVE = ['A3', 'C4', 'E4', 'B4', 'E5'];

const chordAt = (t: number) => (t >= MUSIC.resolve ? RESOLVE : CHORDS[Math.min(9, Math.floor(t / 2))]);
const rootAt = (t: number) => (t >= MUSIC.resolve ? 'A2' : BASS_ROOTS[Math.min(9, Math.floor(t / 2))]);

const octave = (n: string, d: number) => n.replace(/(-?\d)$/, (m) => String(Number(m) + d));

// ------------------------------------------------------------------ voices
const pulseNote = (freq: number, cutoff: number, len = 0.18) => {
  const s = saw(len, freq, 30, 0);
  const s2 = saw(len, freq, 30, 7);
  const m = new Float32Array(s.length);
  for (let i = 0; i < m.length; i++) m[i] = 0.5 * (s[i] + s2[i]);
  const f = biquad(m, 'lowpass', (t) => cutoff * (0.55 + 0.45 * Math.exp(-t * 18)), 1.1);
  return mulEnv(f, envAD(len, 0.004, 0.09, 3));
};

const tick = (seed: number, len = 0.03) => {
  const n = biquad(noise(len, seed), 'highpass', 5200, 0.9);
  return mulEnv(n, envAD(len, 0.001, 0.012, 5));
};

const bassNote = (freq: number, len: number) => {
  const tri = triangle(len, freq, 11);
  const sub = sine(len, freq / 2);
  const m = new Float32Array(tri.length);
  for (let i = 0; i < m.length; i++) m[i] = 0.75 * tri[i] + 0.45 * sub[i];
  const f = biquad(m, 'lowpass', 900, 0.7);
  return mulEnv(f, envAD(len, 0.006, len * 0.9, 2.2));
};

const pluck = (freq: number, len = 0.35, bright = 1) => {
  const a = sine(len, freq);
  const b = sine(len, freq * 2);
  const c = sine(len, freq * 3.01);
  const m = new Float32Array(a.length);
  const e2 = envAD(len, 0.002, 0.06, 3);
  for (let i = 0; i < m.length; i++) m[i] = a[i] + (0.35 * b[i] + 0.12 * c[i]) * e2[i] * bright;
  return mulEnv(m, envAD(len, 0.003, len * 0.55, 3.2));
};

const kick = (len = 0.28) => {
  const body = sine(len, (t) => 45 + 70 * Math.exp(-t * 28));
  const click = biquad(noise(0.012, SEED + 7), 'bandpass', 2500, 0.8);
  const m = new Float32Array(body.length);
  for (let i = 0; i < m.length; i++) m[i] = body[i] + (i < click.length ? click[i] * 0.25 : 0);
  return mulEnv(m, envAD(len, 0.002, 0.16, 3.2));
};

const snare = (seed: number, len = 0.16) => {
  const n = biquad(biquad(noise(len, seed), 'bandpass', 1900, 0.7), 'highpass', 450, 0.7);
  const tone = sine(len, 190);
  const m = new Float32Array(n.length);
  const et = envAD(len, 0.001, 0.035, 4);
  for (let i = 0; i < m.length; i++) m[i] = n[i] * 1.2 + tone[i] * 0.25 * et[i];
  return mulEnv(m, envAD(len, 0.001, 0.08, 4));
};

const hat = (seed: number, len = 0.045, open = false) => {
  const n = biquad(biquad(noise(len, seed), 'highpass', 7200, 0.8), 'peaking', 10000, 1, 3);
  return mulEnv(n, envAD(len, 0.001, open ? 0.06 : 0.018, 4));
};

const padChord = (notes: string[], len: number, cutoff: number, attack = 0.35) => {
  const out = makeStereo(len);
  notes.forEach((n, k) => {
    const f = noteToFreq(n);
    const a = saw(len, f, 16, -6);
    const b = saw(len, f, 16, 6);
    const m = new Float32Array(a.length);
    for (let i = 0; i < m.length; i++) m[i] = 0.5 * (a[i] + b[i]);
    const flt = biquad(m, 'lowpass', cutoff, 0.6);
    const env = (t: number) => Math.min(1, t / attack) * Math.min(1, Math.max(0, (len - t) / 0.4));
    mulEnv(flt, env, 0.16);
    addMono(out, flt, 0, 1, (k / (notes.length - 1)) * 0.5 - 0.25);
  });
  return out;
};

// ------------------------------------------------------------------ render
export const renderScore = () => {
  const pre = makeStereo(DUR); // everything before the 17 s resolution (gets the dip)
  const post = makeStereo(DUR); // the resolution and final bars
  const revSend = makeStereo(DUR);
  const revSendPost = makeStereo(DUR);

  // 1. Filtered pulse on 8ths (bars 0–8), opening its filter as the story builds.
  for (let t = 0; t < MUSIC.dipStart; t += BEAT / 2) {
    const k = Math.round(t / (BEAT / 2));
    const thin = t >= MUSIC.proofThin && t < MUSIC.riseStart ? k % 2 === 0 : true;
    if (!thin) continue;
    const cutoff = t < 2.5 ? 520 : t < 7 ? 520 + (t - 2.5) * 140 : t < 14 ? 1250 : t < 16 ? 900 : 900 + (t - 16) * 2600;
    const accent = k % 4 === 0 ? 1 : 0.72;
    const g = (t < 2.5 ? 0.12 : 0.1) * accent;
    addMono(pre, pulseNote(noteToFreq(octave(rootAt(t), 1)), cutoff), t, g, 0);
  }

  // 2. Sparse ticks in the opening (0–2.5 s).
  const tickSteps = [3, 6, 11, 14, 19, 22, 27, 30, 35];
  for (const st of tickSteps) {
    const t = st * S16;
    if (t >= 2.5) continue;
    addMono(pre, tick(SEED + st * 13), t, 0.1, st % 2 ? 0.3 : -0.3);
  }

  // 3. Bass from 2.5 s: root on the bar, syncopated eighths.
  const bassPattern: [number, number][] = [
    [0, 0.7],
    [1.5, 0.22],
    [2, 0.45],
    [3, 0.22],
    [3.5, 0.22],
  ];
  for (let bar = 1; bar < 10; bar++) {
    for (const [beat, len] of bassPattern) {
      const t = bar * 2 + beat * BEAT;
      if (t < MUSIC.bassIn - 1e-6 || t >= MUSIC.dipStart) continue;
      const light = t >= MUSIC.proofThin && t < MUSIC.riseStart && beat !== 0 && beat !== 2;
      if (light) continue;
      addMono(pre, bassNote(noteToFreq(rootAt(t)), len), t, 0.34, 0);
    }
  }

  // 4. Plucks: sparse offbeats (2.5–7), arpeggio (7–14), thinner (14–16).
  for (let t = 2.5; t < MUSIC.riseStart; t += S16) {
    const step = Math.round(t / S16) % 16;
    const chord = chordAt(t);
    let play = false;
    let idx = 0;
    if (t < 7) {
      play = step === 2 || step === 6 || step === 10 || step === 13;
      idx = [2, 6, 10, 13].indexOf(step);
    } else if (t < 14) {
      play = [0, 3, 6, 8, 10, 12, 14].includes(step);
      idx = [0, 3, 6, 8, 10, 12, 14].indexOf(step);
    } else {
      play = step === 4 || step === 12;
      idx = step === 4 ? 1 : 3;
    }
    if (!play) continue;
    const n = chord[(idx + Math.floor(t / 2)) % chord.length];
    const f = noteToFreq(octave(n, 1));
    const p = pluck(f, 0.32, t < 7 ? 0.7 : 1);
    const pan = ((idx % 4) - 1.5) * 0.08;
    addMono(pre, p, t, t < 7 ? 0.05 : 0.055, pan);
    addMono(revSend, p, t, 0.05, pan);
  }

  // 5. Groove 7–14 s: kick 1 & 3, soft snare 2 & 4, eighth hats.
  for (let t = MUSIC.grooveIn; t < MUSIC.proofThin; t += BEAT / 2) {
    const e = Math.round(t / (BEAT / 2)) % 8;
    if (e === 0 || e === 4) addMono(pre, kick(), t, 0.42, 0);
    if (e === 2 || e === 6) {
      const s = snare(SEED + Math.round(t * 100));
      addMono(pre, s, t, 0.1, 0);
      addMono(revSend, s, t, 0.06, 0);
    }
    addMono(pre, hat(SEED + Math.round(t * 1000)), t, e % 2 ? 0.05 : 0.03, 0.12);
  }
  // 14–16: percussion thins to quarter hats and one soft kick per bar.
  for (let t = MUSIC.proofThin; t < MUSIC.riseStart; t += BEAT) {
    const b = Math.round(t / BEAT) % 4;
    if (b === 0) addMono(pre, kick(), t, 0.26, 0);
    addMono(pre, hat(SEED + Math.round(t * 1000) + 3), t, 0.03, 0.12);
  }

  // 6. Pad bed from 7 s (restrained), following the chords.
  for (let bar = 3; bar < 9; bar++) {
    const t0 = Math.max(bar * 2, 6.5);
    const len = bar * 2 + 2 - t0 + 0.3;
    const pad = padChord(CHORDS[bar], len, bar < 7 ? 1100 : 900, 0.4);
    addStereo(pre, pad, t0, t0 < 7 ? 0.5 : 0.8);
    addStereo(revSend, pad, t0, 0.3);
  }

  // 7. Rising texture 16.0–16.7 s tied to the scarf movement.
  {
    const len = MUSIC.dipStart - MUSIC.riseStart + 0.08;
    const n = biquad(noise(len, SEED + 99), 'bandpass', (t) => 500 * Math.pow(12, t / len), 1.4);
    mulEnv(n, (t) => Math.pow(t / len, 1.6));
    addMono(pre, n, MUSIC.riseStart, 0.18, 0);
    const chord = CHORDS[8];
    chord.forEach((nn, k) => {
      const s = saw(len, noteToFreq(nn), 20, k * 4 - 6);
      const f = biquad(s, 'lowpass', (t) => 400 + 3200 * Math.pow(t / len, 2), 0.9);
      mulEnv(f, (t) => Math.pow(t / len, 1.3));
      addMono(pre, f, MUSIC.riseStart, 0.045, (k - 1.5) * 0.12);
    });
  }

  // 8. Resolution at 17 s: A-minor add-nine, lighter pulse and a decaying chord.
  {
    const t0 = MUSIC.resolve;
    const pad = padChord(RESOLVE, DUR - t0, 1500, 0.02);
    // decaying rather than sustaining
    for (let i = 0; i < pad.L.length; i++) {
      const e = Math.exp(-(i / SR) * 0.55);
      pad.L[i] *= e;
      pad.R[i] *= e;
    }
    addStereo(post, pad, t0, 1.05);
    addStereo(revSendPost, pad, t0, 0.45);
    // strummed pluck chord
    RESOLVE.forEach((n, k) => {
      const p = pluck(noteToFreq(n), 1.6, 0.8);
      addMono(post, p, t0 + k * 0.012, 0.05, (k - 2) * 0.07);
      addMono(revSendPost, p, t0 + k * 0.012, 0.05, 0);
    });
    addMono(post, bassNote(noteToFreq('A2'), 1.8), t0, 0.36, 0);
    addMono(post, bassNote(noteToFreq('A1'), 1.6), t0, 0.18, 0);
    // lighter pulse: quarter notes, low filter, from 17.5 s
    for (let t = 17.5; t < DUR - 0.3; t += BEAT) {
      addMono(post, pulseNote(noteToFreq('A3'), 700, 0.16), t, 0.055, 0);
      if (Math.round(t / BEAT) % 2 === 0) addMono(post, hat(SEED + Math.round(t * 777)), t, 0.02, 0.1);
    }
  }

  // Reverb returns.
  const wet = reverb(revSend, {room: 0.8, damp: 0.4});
  const wetPost = reverb(revSendPost, {room: 0.84, damp: 0.35});
  addStereo(pre, wet, 0, 1.0);
  addStereo(post, wetPost, 0, 1.0);

  // Brief dip: −18 dB over 40 ms at 16.7 s, faint tail retained.
  const dip = dbToGain(MUSIC.dipDb);
  const d0 = MUSIC.dipStart;
  const d1 = d0 + MUSIC.dipRampMs / 1000;
  for (let i = 0; i < pre.L.length; i++) {
    const t = i / SR;
    let g = 1;
    if (t >= d0 && t < d1) g = Math.pow(dip, (t - d0) / (d1 - d0));
    else if (t >= d1) g = dip;
    pre.L[i] *= g;
    pre.R[i] *= g;
  }

  const out: Stereo = makeStereo(DUR);
  addStereo(out, pre);
  addStereo(out, post);
  return out;
};
