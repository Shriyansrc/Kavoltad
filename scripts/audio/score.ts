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
const clap = (seed: number, len = 0.2) => {
  const bursts = [0, 0.011, 0.023];
  const out = new Float32Array(Math.round(len * SR));
  for (const b of bursts) {
    const n = biquad(noise(len - b, seed + Math.round(b * 1000)), 'bandpass', 1500, 0.9);
    mulEnv(n, envAD(len - b, 0.001, b === 0.023 ? 0.09 : 0.012, 4));
    const off = Math.round(b * SR);
    for (let i = 0; i < n.length && i + off < out.length; i++) out[i + off] += n[i];
  }
  return biquad(out, 'highpass', 600, 0.7);
};

const kickTimes: number[] = [];

export const renderScore = () => {
  const pre = makeStereo(DUR); // everything before the 17 s resolution (gets the dip)
  const pumpable = makeStereo(DUR); // bass/pads/arps ducked by the kick (sidechain pump)
  const post = makeStereo(DUR); // the resolution and final bars
  const revSend = makeStereo(DUR);
  const revSendPost = makeStereo(DUR);
  kickTimes.length = 0;

  // 1. Filtered pulse on 8ths through the whole build, opening with the story.
  for (let t = 0; t < MUSIC.dipStart; t += BEAT / 2) {
    const k = Math.round(t / (BEAT / 2));
    const cutoff = t < 2.5 ? 480 + t * 90 : t < 7 ? 700 + (t - 2.5) * 160 : t < 14 ? 1500 : t < 16 ? 1100 : 1100 + (t - 16) * 3200;
    const accent = k % 4 === 0 ? 1 : 0.7;
    addMono(t < 2.5 ? pre : pumpable, pulseNote(noteToFreq(octave(rootAt(t), 1)), cutoff), t, 0.11 * accent, 0);
  }

  // 2. Opening: sparse ticks and a tension riser into the 2.5 s reveal.
  for (const st of [3, 6, 11, 14, 19]) addMono(pre, tick(SEED + st * 13), st * S16, 0.1, st % 2 ? 0.3 : -0.3);
  {
    const len = 1.6;
    const n = biquad(noise(len, SEED + 5), 'bandpass', (tt) => 600 * Math.pow(8, tt / len), 1.1);
    mulEnv(n, (tt) => Math.pow(tt / len, 2.2));
    addMono(pre, n, 2.5 - len, 0.16, 0);
  }

  // 3. Kick four-on-the-floor from 2.5 s (lighter in the proof bars).
  for (let t = 2.5; t < MUSIC.dipStart; t += BEAT) {
    const light = t >= MUSIC.proofThin && t < MUSIC.riseStart;
    if (light && Math.round(t / BEAT) % 2 === 1) continue;
    addMono(pre, kick(), t, light ? 0.3 : 0.5, 0);
    kickTimes.push(t);
  }

  // 4. Claps on 2 & 4 from 5 s; hats: offbeat 8ths from 2.5 s, 16ths in the groove.
  for (let t = 5; t < MUSIC.proofThin; t += BEAT) {
    if (Math.round(t / BEAT) % 2 === 1) {
      const c = clap(SEED + Math.round(t * 100));
      addMono(pre, c, t, 0.16, 0);
      addMono(revSend, c, t, 0.08, 0);
    }
  }
  for (let t = 2.5; t < MUSIC.riseStart; t += S16) {
    const step = Math.round(t / S16) % 4;
    const groove = t >= MUSIC.grooveIn && t < MUSIC.proofThin;
    if (!groove && step !== 2) continue;
    const g = step === 2 ? 0.055 : 0.028;
    addMono(pre, hat(SEED + Math.round(t * 1000), step === 2 ? 0.06 : 0.035, step === 2 && t >= MUSIC.proofThin), t, g, step % 2 ? 0.18 : 0.1);
  }

  // 5. Bass from 2.5 s: driving eighths with octave pops.
  for (let t = 2.5; t < MUSIC.dipStart; t += BEAT / 2) {
    const e = Math.round(t / (BEAT / 2)) % 8;
    const light = t >= MUSIC.proofThin && t < MUSIC.riseStart;
    if (light && e % 2 === 1) continue;
    const pattern = [1, 0, 0.7, 1, 0.8, 0, 0.7, 1][e];
    if (!pattern) continue;
    const note = e === 3 || e === 7 ? octave(rootAt(t), 1) : rootAt(t);
    addMono(pumpable, bassNote(noteToFreq(note), 0.22), t, 0.3 * pattern, 0);
  }

  // 6. Pluck arpeggios: 8ths from 2.5 s, 16ths in the groove, sparse in the proof.
  for (let t = 2.5; t < MUSIC.riseStart; t += S16) {
    const step = Math.round(t / S16) % 16;
    const chord = chordAt(t);
    let play = false;
    if (t < 7) play = step % 2 === 0;
    else if (t < 14) play = true;
    else play = step % 4 === 0;
    if (!play) continue;
    const idx = [0, 1, 2, 3, 2, 1, 3, 2, 0, 2, 1, 3, 2, 3, 1, 2][step];
    const n = chord[idx % chord.length];
    const f = noteToFreq(octave(n, 1));
    const p = pluck(f, 0.26, t < 7 ? 0.8 : 1);
    const pan = (step % 2 ? 1 : -1) * 0.14;
    addMono(pumpable, p, t, t < 7 ? 0.05 : 0.045, pan);
    addMono(revSend, p, t, 0.05, pan);
  }

  // 7. Pad bed from 2.5 s, following the chords (pumped by the kick).
  for (let bar = 1; bar < 9; bar++) {
    const t0 = Math.max(bar * 2, 2.5);
    const len = bar * 2 + 2 - t0 + 0.3;
    const pad = padChord(CHORDS[bar], len, bar < 3 ? 900 : 1300, 0.25);
    addStereo(pumpable, pad, t0, bar < 3 ? 0.55 : 0.8);
    addStereo(revSend, pad, t0, 0.3);
  }

  // Sidechain pump: duck the pumpable bus after every kick (≈-6 dB, 160 ms).
  {
    const depth = 0.5;
    const rel = 0.16;
    for (let i = 0; i < pumpable.L.length; i++) {
      const t = i / SR;
      let g = 1;
      for (let k = kickTimes.length - 1; k >= 0; k--) {
        const d = t - kickTimes[k];
        if (d < 0) continue;
        if (d < rel) g = 1 - depth * Math.pow(1 - d / rel, 2);
        break;
      }
      pumpable.L[i] *= g;
      pumpable.R[i] *= g;
    }
    addStereo(pre, pumpable, 0, 1);
  }

  // 8. Rising texture 15.2–16.7 s tied to the scarf movement.
  {
    const t0 = 15.2;
    const len = MUSIC.dipStart - t0 + 0.08;
    const n = biquad(noise(len, SEED + 99), 'bandpass', (t) => 400 * Math.pow(14, t / len), 1.4);
    mulEnv(n, (t) => Math.pow(t / len, 1.8));
    addMono(pre, n, t0, 0.22, 0);
    CHORDS[8].forEach((nn, k) => {
      const sw = saw(len, noteToFreq(nn), 20, k * 4 - 6);
      const fl = biquad(sw, 'lowpass', (t) => 400 + 3600 * Math.pow(t / len, 2), 0.9);
      mulEnv(fl, (t) => Math.pow(t / len, 1.3));
      addMono(pre, fl, t0, 0.05, (k - 1.5) * 0.12);
    });
    // snare roll accelerating into the drop
    for (let t = 15.5; t < MUSIC.dipStart; ) {
      const g = 0.03 + 0.09 * ((t - 15.5) / (MUSIC.dipStart - 15.5));
      addMono(pre, snare(SEED + Math.round(t * 997)), t, g, 0);
      t += t < 16 ? BEAT / 2 : t < 16.4 ? BEAT / 4 : BEAT / 8;
    }
  }

  // 9. The drop at 17 s: A-minor add-nine, kick + sub, then a lighter pulse.
  {
    const t0 = MUSIC.resolve;
    const pad = padChord(RESOLVE, DUR - t0, 1600, 0.02);
    for (let i = 0; i < pad.L.length; i++) {
      const e = Math.exp(-(i / SR) * 0.5);
      pad.L[i] *= e;
      pad.R[i] *= e;
    }
    addStereo(post, pad, t0, 1.1);
    addStereo(revSendPost, pad, t0, 0.45);
    RESOLVE.forEach((n, k) => {
      const p = pluck(noteToFreq(n), 1.6, 0.8);
      addMono(post, p, t0 + k * 0.012, 0.05, (k - 2) * 0.07);
      addMono(revSendPost, p, t0 + k * 0.012, 0.05, 0);
    });
    addMono(post, kick(0.4), t0, 0.55, 0);
    addMono(post, bassNote(noteToFreq('A2'), 1.8), t0, 0.36, 0);
    addMono(post, bassNote(noteToFreq('A1'), 1.6), t0, 0.2, 0);
    for (let t = 17.5; t < DUR - 0.3; t += BEAT) {
      addMono(post, pulseNote(noteToFreq('A3'), 800, 0.16), t, 0.06, 0);
      if (Math.round(t / BEAT) % 2 === 0) addMono(post, kick(0.22), t, 0.18, 0);
      addMono(post, hat(SEED + Math.round(t * 777)), t + BEAT / 2, 0.025, 0.1);
    }
  }

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
