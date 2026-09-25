// Original 30 s cue for "Kavey in Chaos City", 120 BPM, A minor.
// Every district plays the same story in music: a tense, off-balance half
// (stabs, wonky bass, half-time kick) until Kavey's cube lands, then a bright
// four-on-the-floor lift. The build rises into a drop on the launch (23.0 s),
// the proof grooves, the music dips under the scarf sweep (26.7 s) and
// resolves on the brand hit (27.0 s).
import {C} from '../../../src/city/config.ts';
import {SEED} from '../../../src/config/video.ts';
import {addMono, addStereo, biquad, dbToGain, makeStereo, mulEnv, noise, noteToFreq, reverb, saw, sine, SR, envAD, type Stereo} from '../dsp.ts';
import {bassNote, clap, hat, kick, padChord, pluck, pulseNote, snare, tick} from '../score.ts';

const DUR = 30;
const BEAT = 0.5;
const S16 = BEAT / 4;
const DIP = C.coverStart / 60; // 26.7
const RESOLVE = C.reveal / 60; // 27.0
const LAUNCH = C.launch / 60; // 23.0

type Mode = 'intro' | 'problem' | 'sleepy' | 'fix' | 'build' | 'proof';
const SECS: {t0: number; t1: number; mode: Mode}[] = [
  {t0: 0, t1: 3, mode: 'intro'},
  {t0: 3, t1: 5.5, mode: 'problem'},
  {t0: 5.5, t1: 8, mode: 'fix'},
  {t0: 8, t1: 10.5, mode: 'problem'},
  {t0: 10.5, t1: 13, mode: 'fix'},
  {t0: 13, t1: 15.5, mode: 'sleepy'},
  {t0: 15.5, t1: 18, mode: 'fix'},
  {t0: 18, t1: LAUNCH, mode: 'build'},
  {t0: LAUNCH, t1: DIP, mode: 'proof'},
];
const modeAt = (t: number): Mode | null => SECS.find((s) => t >= s.t0 && t < s.t1)?.mode ?? null;

// Harmony: [start, chord tones, bass root]
const CH: [number, string[], string][] = [
  [0, ['A3', 'C4', 'E4', 'B4'], 'A2'],
  [3, ['F3', 'A3', 'C4', 'E4'], 'F2'],
  [4.25, ['E3', 'G#3', 'B3', 'D4'], 'E2'],
  [5.5, ['C4', 'E4', 'G4', 'B4'], 'C3'],
  [6.75, ['G3', 'B3', 'D4', 'A4'], 'G2'],
  [8, ['D3', 'F3', 'A3', 'C4'], 'D2'],
  [9.25, ['E3', 'G#3', 'B3', 'D4'], 'E2'],
  [10.5, ['F3', 'A3', 'C4', 'E4'], 'F2'],
  [11.75, ['G3', 'B3', 'D4', 'G4'], 'G2'],
  [13, ['A3', 'C4', 'E4', 'G4'], 'A2'],
  [14.25, ['E3', 'G#3', 'B3', 'D4'], 'E2'],
  [15.5, ['C4', 'E4', 'G4', 'D5'], 'C3'],
  [16.75, ['G3', 'B3', 'D4', 'A4'], 'G2'],
  [18, ['A3', 'C4', 'E4', 'B4'], 'A2'],
  [19, ['F3', 'A3', 'C4', 'E4'], 'F2'],
  [20, ['C4', 'E4', 'G4', 'B4'], 'C3'],
  [21, ['G3', 'B3', 'D4', 'A4'], 'G2'],
  [22, ['E3', 'G#3', 'B3', 'D4'], 'E2'],
  [LAUNCH, ['A3', 'C4', 'E4', 'B4', 'E5'], 'A2'],
  [24, ['F3', 'A3', 'C4', 'E4'], 'F2'],
  [25, ['C4', 'E4', 'G4', 'B4'], 'C3'],
  [26, ['G3', 'B3', 'D4', 'A4'], 'G2'],
  [RESOLVE, ['A3', 'C4', 'E4', 'B4', 'E5'], 'A2'],
];
const chordIdx = (t: number) => {
  let k = 0;
  for (let i = 0; i < CH.length; i++) if (t >= CH[i][0] - 1e-9) k = i;
  return k;
};
const chordAt = (t: number) => CH[chordIdx(t)][1];
const rootAt = (t: number) => CH[chordIdx(t)][2];
const octave = (n: string, d: number) => n.replace(/(-?\d)$/, (m) => String(Number(m) + d));

// ------------------------------------------------------------------ extra voices
const crash = (seed: number, len = 1.6) => {
  const n = biquad(biquad(noise(len, seed), 'highpass', 4200, 0.7), 'peaking', 7500, 0.8, 4);
  return mulEnv(n, envAD(len, 0.002, 0.6, 3));
};

const shaker = (seed: number, len = 0.06) => mulEnv(biquad(noise(len, seed), 'bandpass', 6000, 1.2), (t) => Math.sin(Math.PI * Math.min(1, t / len)));

const musicBox = (freq: number, len = 0.9) => {
  const a = sine(len, (t) => freq * (1 + 0.004 * Math.sin(2 * Math.PI * 5 * t)));
  const b = sine(len, freq * 4.02);
  const m = new Float32Array(a.length);
  for (let i = 0; i < m.length; i++) m[i] = a[i] + 0.2 * b[i] * Math.exp(-i / (0.05 * SR));
  return mulEnv(m, envAD(len, 0.002, len * 0.6, 3));
};

/** Stereo ping-pong echo (wet only): first repeat left, then bouncing right/left. */
const pingPong = (src: Stereo, delay: number, fb: number) => {
  const d = Math.round(delay * SR);
  const n = src.L.length;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (let i = d; i < n; i++) {
    const x = (src.L[i - d] + src.R[i - d]) * 0.5;
    L[i] = x + R[i - d] * fb;
    R[i] = L[i - d] * fb;
  }
  // darker repeats sit behind the dry arp
  return {L: biquad(L, 'lowpass', 3500, 0.7), R: biquad(R, 'lowpass', 3500, 0.7)};
};

// ------------------------------------------------------------------ render
export const renderCityScore = () => {
  const pre = makeStereo(DUR); // everything before the resolve (dipped at 26.7)
  const pump = makeStereo(DUR); // bass / pads / arps, ducked by the kick
  const arps = makeStereo(DUR); // arp bus (feeds the echo)
  const post = makeStereo(DUR); // resolve + outro
  const rev = makeStereo(DUR);
  const revPost = makeStereo(DUR);
  const kicks: number[] = [];

  // ---- pads, chord by chord (soft in the intro and sleepy clinic)
  for (let k = 0; k < CH.length - 1; k++) {
    const [t0, notes] = CH[k];
    if (t0 >= DIP) break;
    const t1 = Math.min(CH[k + 1][0], DIP);
    const m = modeAt(t0 + 0.01) ?? 'intro';
    const cutoff = m === 'intro' ? 700 : m === 'problem' ? 900 : m === 'sleepy' ? 650 : m === 'build' ? 1000 + (t0 - 18) * 450 : 1500;
    const pad = padChord(notes, t1 - t0 + 0.35, cutoff, m === 'intro' ? 0.8 : 0.08);
    const g = m === 'intro' ? 0.7 : m === 'problem' ? 0.6 : m === 'sleepy' ? 0.75 : 0.85;
    addStereo(pump, pad, t0, g);
    addStereo(rev, pad, t0, 0.35);
  }

  // ---- intro: opening pulse, ticks, sub swell, riser into the salon
  for (let t = 0; t < 3; t += BEAT / 2) {
    const cutoff = 420 + t * 260;
    addMono(pump, pulseNote(noteToFreq(octave(rootAt(t), 1)), cutoff), t, 0.1 * (Math.round(t / (BEAT / 2)) % 4 === 0 ? 1 : 0.7), 0);
  }
  for (const st of [2, 5, 7, 11, 13, 17, 19, 22]) addMono(pre, tick(SEED + st * 13), st * S16, 0.08, st % 2 ? 0.35 : -0.35);
  {
    const s = sine(3, 55);
    mulEnv(s, (t) => 0.5 * Math.min(1, t / 1.5) * (t > 2.7 ? Math.max(0, (3 - t) / 0.3) : 1));
    addMono(pre, s, 0, 0.35, 0);
    const len = 1.4;
    const n = biquad(noise(len, SEED + 5), 'bandpass', (tt) => 600 * Math.pow(8, tt / len), 1.1);
    mulEnv(n, (tt) => Math.pow(tt / len, 2.2) * (tt > len - 0.02 ? (len - tt) / 0.02 : 1));
    addMono(pre, n, 3 - len, 0.14, 0);
  }

  // ---- drums
  for (let t = 0; t < DIP - 1e-6; t += S16) {
    const m = modeAt(t);
    const step = Math.round(t / S16) % 16; // position in the 2-s bar
    const beat = Math.round(t / S16) % 4 === 0;
    const beatIdx = Math.floor(step / 4); // 0..3
    const off8 = step % 4 === 2;
    if (m === 'problem') {
      if (beat && (beatIdx === 0 || beatIdx === 2)) {
        addMono(pre, kick(), t, 0.42, 0);
        kicks.push(t);
      }
      if (step === 12) {
        const c = clap(SEED + Math.round(t * 100));
        addMono(pre, c, t, 0.13, 0);
        addMono(rev, c, t, 0.08, 0);
      }
      if (off8 || beat) addMono(pre, hat(SEED + Math.round(t * 1000), 0.04), t, off8 ? 0.045 : 0.022, 0.15);
      if (step % 2 === 1 && step > 8) addMono(pre, tick(SEED + Math.round(t * 333), 0.02), t, 0.03, -0.25);
    } else if (m === 'sleepy') {
      if (step === 0) {
        addMono(pre, kick(0.35), t, 0.3, 0);
        kicks.push(t);
      }
      if (off8) addMono(pre, hat(SEED + Math.round(t * 1000), 0.03), t, 0.02, 0.2);
    } else if (m === 'fix' || m === 'build' || m === 'proof') {
      const gap = m === 'build' && t >= LAUNCH - 0.15; // drop-out right before the launch
      const light = m === 'proof' && t >= 24;
      if (beat && !gap) {
        addMono(pre, kick(), t, m === 'proof' ? 0.46 : 0.5, 0);
        kicks.push(t);
      }
      if ((beatIdx === 1 || beatIdx === 3) && beat && !gap) {
        const c = clap(SEED + Math.round(t * 100));
        addMono(pre, c, t, 0.15, 0);
        addMono(rev, c, t, 0.08, 0);
      }
      if (!gap) {
        const g = off8 ? 0.05 : step % 2 === 1 ? 0.026 : 0.018;
        if (!light || off8) addMono(pre, hat(SEED + Math.round(t * 1000), off8 ? 0.07 : 0.035, off8 && m !== 'fix'), t, g, step % 2 ? 0.18 : 0.08);
        if (m === 'build') addMono(pre, shaker(SEED + Math.round(t * 555)), t + 0.01, 0.03 + 0.02 * ((t - 18) / 5), (step % 2 ? 1 : -1) * 0.4);
      }
    }
  }
  // crashes on the fix downbeats, the build start and the launch
  for (const t of [5.5, 10.5, 15.5, 18, LAUNCH]) {
    const c = crash(SEED + Math.round(t * 71));
    addMono(pre, c, t, t === LAUNCH ? 0.14 : 0.09, 0.2);
    addMono(rev, c, t, 0.05, 0);
  }
  // snare rolls into each fix, into the drop and into the dip
  const roll = (t0: number, t1: number, gMax: number) => {
    for (let t = t0; t < t1 - 1e-6; ) {
      const u = (t - t0) / (t1 - t0);
      addMono(pre, snare(SEED + Math.round(t * 997)), t, 0.02 + gMax * u, 0);
      t += u < 0.5 ? BEAT / 4 : u < 0.8 ? BEAT / 8 : BEAT / 16;
    }
  };
  roll(4.9, 5.5, 0.07);
  roll(9.9, 10.5, 0.07);
  roll(14.9, 15.5, 0.06);
  roll(21.5, LAUNCH - 0.15, 0.1);
  roll(26.1, DIP, 0.09);

  // ---- bass
  for (let t = 0; t < DIP - 1e-6; t += BEAT / 2) {
    const m = modeAt(t);
    const e = Math.round(t / (BEAT / 2)) % 8;
    const f = noteToFreq(rootAt(t));
    if (m === 'problem') {
      // staccato eighths; the last one in each half-bar bends down (off-balance)
      if (e % 2 === 1) continue;
      const bend = e === 6;
      const n = bend ? sine(0.22, (tt) => f * Math.pow(2, (-3 * tt) / 0.22 / 12)) : null;
      if (n) {
        const tri = biquad(n, 'lowpass', 700, 0.7);
        mulEnv(tri, envAD(0.22, 0.004, 0.18, 2.5));
        addMono(pump, tri, t, 0.3, 0);
      } else addMono(pump, bassNote(f, 0.16), t, 0.3, 0);
    } else if (m === 'sleepy') {
      if (e === 0) addMono(pump, bassNote(f, 1.6), t, 0.26, 0);
    } else if (m === 'fix' || m === 'build' || m === 'proof') {
      if (m === 'build' && t >= LAUNCH - 0.15) continue;
      const pat = [1, 0, 0.7, 1, 0.8, 0, 0.7, 1][e];
      if (!pat) continue;
      const note = e === 3 || e === 7 ? octave(rootAt(t), 1) : rootAt(t);
      addMono(pump, bassNote(noteToFreq(note), 0.22), t, 0.3 * pat, 0);
    }
  }

  // ---- stabs (problem), music box (sleepy), arps (fix/build/proof)
  for (let t = 0; t < DIP - 1e-6; t += S16) {
    const m = modeAt(t);
    const step = Math.round(t / S16) % 16;
    const chord = chordAt(t);
    if (m === 'problem' && step % 4 === 2) {
      chord.slice(0, 3).forEach((n, k) => addMono(pump, pluck(noteToFreq(octave(n, 1)), 0.14, 0.7), t, 0.03, (k - 1) * 0.3));
    } else if (m === 'sleepy' && [0, 6, 10].includes(step)) {
      const n = chord[[0, 2, 1][[0, 6, 10].indexOf(step)]];
      const mb = musicBox(noteToFreq(octave(n, 2)));
      addMono(arps, mb, t, 0.05, [0, 6, 10].indexOf(step) * 0.3 - 0.3);
    } else if (m === 'fix' || m === 'build' || (m === 'proof' && step % 2 === 0)) {
      if (m === 'build' && t >= LAUNCH - 0.15) continue;
      const idx = [0, 1, 2, 3, 2, 1, 3, 2, 0, 2, 1, 3, 2, 3, 1, 2][step];
      const n = chord[idx % chord.length];
      const bright = m === 'build' ? 0.8 + 0.4 * ((t - 18) / 5) : 1;
      addMono(arps, pluck(noteToFreq(octave(n, 1)), 0.24, bright), t, 0.042, (step % 2 ? 1 : -1) * 0.2);
    }
  }
  // build riser (21.3 → launch)
  {
    const t0 = 21.3;
    const len = LAUNCH - 0.15 - t0;
    const n = biquad(noise(len, SEED + 99), 'bandpass', (t) => 400 * Math.pow(14, t / len), 1.4);
    mulEnv(n, (t) => Math.pow(t / len, 1.8) * (t > len - 0.02 ? (len - t) / 0.02 : 1));
    addMono(pre, n, t0, 0.2, 0);
    ['E3', 'G#3', 'B3', 'D4'].forEach((nn, k) => {
      const sw = biquad(saw(len, noteToFreq(nn), 20, k * 4 - 6), 'lowpass', (t) => 400 + 3600 * Math.pow(t / len, 2), 0.9);
      mulEnv(sw, (t) => Math.pow(t / len, 1.3) * (t > len - 0.02 ? (len - t) / 0.02 : 1));
      addMono(pre, sw, t0, 0.045, (k - 1.5) * 0.14);
    });
  }
  // proof riser into the dip (tied to the scarf)
  {
    const t0 = 25.6;
    const len = DIP - t0 + 0.04;
    const n = biquad(noise(len, SEED + 199), 'bandpass', (t) => 400 * Math.pow(14, t / len), 1.4);
    mulEnv(n, (t) => Math.pow(t / len, 1.8));
    addMono(pre, n, t0, 0.18, 0);
  }
  // launch drop hit
  {
    const sub = sine(1.2, (t) => 55 * (1 + 0.3 * Math.exp(-t * 10)));
    mulEnv(sub, envAD(1.2, 0.003, 0.7, 2.6));
    addMono(pre, sub, LAUNCH, 0.3, 0);
    const hit = padChord(chordAt(LAUNCH), 1.4, 2400, 0.005);
    for (let i = 0; i < hit.L.length; i++) {
      const e = Math.exp(-(i / SR) * 1.6);
      hit.L[i] *= e;
      hit.R[i] *= e;
    }
    addStereo(pre, hit, LAUNCH, 0.9);
    addStereo(rev, hit, LAUNCH, 0.5);
  }

  // Arp echo (dotted-eighth ping-pong), then into the pump bus.
  addStereo(pump, arps, 0, 1);
  addStereo(pump, pingPong(arps, 0.375, 0.35), 0, 0.45);
  addStereo(rev, arps, 0, 0.6);

  // Sidechain: duck the pump bus after each kick (≈ −6 dB, 160 ms, smooth).
  {
    const depth = 0.5;
    const rel = 0.16;
    const ks = kicks.slice().sort((a, b) => a - b);
    let k = 0;
    for (let i = 0; i < pump.L.length; i++) {
      const t = i / SR;
      while (k + 1 < ks.length && ks[k + 1] <= t) k++;
      let g = 1;
      if (ks.length && t >= ks[k]) {
        const d = t - ks[k];
        // 3 ms attack into the duck so the gain never steps
        if (d < 0.003) g = 1 - depth * (d / 0.003);
        else if (d < rel) g = 1 - depth * Math.pow(1 - (d - 0.003) / (rel - 0.003), 2);
      }
      pump.L[i] *= g;
      pump.R[i] *= g;
    }
    addStereo(pre, pump, 0, 1);
  }

  // ---- resolve + outro (not dipped)
  {
    const t0 = RESOLVE;
    const notes = CH[CH.length - 1][1];
    const pad = padChord(notes, DUR - t0, 1600, 0.02);
    for (let i = 0; i < pad.L.length; i++) {
      const e = Math.exp(-(i / SR) * 0.45);
      pad.L[i] *= e;
      pad.R[i] *= e;
    }
    addStereo(post, pad, t0, 1.05);
    addStereo(revPost, pad, t0, 0.45);
    notes.forEach((n, k) => {
      const p = pluck(noteToFreq(n), 1.6, 0.8);
      addMono(post, p, t0 + k * 0.012, 0.05, (k - 2) * 0.1);
      addMono(revPost, p, t0 + k * 0.012, 0.05, 0);
    });
    addMono(post, kick(0.4), t0, 0.55, 0);
    addMono(post, bassNote(noteToFreq('A2'), 1.8), t0, 0.36, 0);
    addMono(post, bassNote(noteToFreq('A1'), 1.6), t0, 0.2, 0);
    for (let t = t0 + 0.5; t < DUR - 0.4; t += BEAT) {
      const fade = Math.max(0, 1 - (t - 28.5) / 1.2);
      addMono(post, pulseNote(noteToFreq('A3'), 800, 0.16), t, 0.06 * fade, 0);
      if (Math.round(t / BEAT) % 2 === 0) addMono(post, kick(0.22), t, 0.18 * fade, 0);
      addMono(post, hat(SEED + Math.round(t * 777)), t + BEAT / 2, 0.025 * fade, 0.1);
    }
    // gentle music-box sparkle over the logo
    ['E6', 'B5', 'C6', 'A5'].forEach((n, k) => addMono(post, musicBox(noteToFreq(n), 1.2), t0 + 0.55 + k * 0.5, 0.035, (k % 2 ? 1 : -1) * 0.3));
  }

  addStereo(pre, reverb(rev, {room: 0.8, damp: 0.4}), 0, 1);
  addStereo(post, reverb(revPost, {room: 0.84, damp: 0.35}), 0, 1);

  // Dip: −18 dB over 40 ms at 26.7 s (the air gap under the ribbon).
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
  // 1.2 s fade to silence at the very end
  for (let i = 0; i < out.L.length; i++) {
    const t = i / SR;
    if (t > DUR - 1.2) {
      const g = Math.max(0, (DUR - t) / 1.2);
      out.L[i] *= g;
      out.R[i] *= g;
    }
  }
  return out;
};
