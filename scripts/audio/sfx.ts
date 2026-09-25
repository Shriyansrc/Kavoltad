// Frame-aligned effects from the sound map (src/config/cues.ts). Each effect
// is built from simple synthesis and peak-normalised to its target level.
import {SFX, type SfxCue} from '../../src/config/cues.ts';
import {FPS, SEED} from '../../src/config/video.ts';
import {
  addMono,
  addStereo,
  biquad,
  envAD,
  makeStereo,
  mulEnv,
  noise,
  normalizePeak,
  noteToFreq,
  reverb,
  sine,
  SR,
  type Stereo,
} from './dsp.ts';

const DUR = 20;

const tap = (seed: number, len: number, lo: number, hi: number) => {
  const n = biquad(biquad(noise(len, seed), 'highpass', lo, 0.8), 'lowpass', hi, 0.8);
  return mulEnv(n, envAD(len, 0.0008, len * 0.35, 5));
};

const pluckTone = (freq: number, len = 0.5) => {
  const a = sine(len, freq);
  const b = sine(len, freq * 2);
  const e2 = envAD(len, 0.001, 0.05, 3);
  const m = new Float32Array(a.length);
  for (let i = 0; i < m.length; i++) m[i] = a[i] + 0.3 * b[i] * e2[i];
  const att = tap(SEED + Math.round(freq), 0.01, 2000, 9000);
  for (let i = 0; i < att.length; i++) m[i] += att[i] * 0.15;
  return mulEnv(m, envAD(len, 0.002, 0.28, 3.4));
};

const build = (c: SfxCue): {mono?: Float32Array; stereo?: Stereo; offset?: number} => {
  const seed = SEED + c.frame * 17;
  switch (c.kind) {
    case 'tick':
      // 45 ms filtered noise tap — the immediate hook.
      return {mono: tap(seed, 0.045, 1800, 7000)};
    case 'catch': {
      // 120 ms thock: sine 160 → 80 Hz with a soft click.
      const len = 0.12;
      const body = sine(len, (t) => 80 + 80 * Math.exp(-t * 30));
      mulEnv(body, envAD(len, 0.002, 0.07, 3));
      const click = tap(seed, 0.012, 1200, 5000);
      for (let i = 0; i < click.length; i++) body[i] += click[i] * 0.35;
      return {mono: body};
    }
    case 'panelTick': {
      // 70 ms soft pulse, generic (not an app notification).
      const len = 0.07;
      const s = sine(len, 1320);
      const s2 = sine(len, 660);
      for (let i = 0; i < s.length; i++) s[i] = 0.6 * s[i] + 0.4 * s2[i];
      return {mono: mulEnv(s, envAD(len, 0.002, 0.025, 4))};
    }
    case 'connect': {
      // 180 ms rounded impact + 250 ms upward tonal flick.
      const len = 0.45;
      const impact = sine(len, (t) => 55 + 60 * Math.exp(-t * 22));
      mulEnv(impact, envAD(len, 0.003, 0.14, 3));
      const air = biquad(noise(0.18, seed), 'lowpass', 1400, 0.7);
      mulEnv(air, envAD(0.18, 0.002, 0.06, 4));
      const flick = sine(0.25, (t) => 520 * Math.pow(2.6, t / 0.25));
      mulEnv(flick, (t) => Math.sin(Math.PI * Math.min(1, t / 0.25)) * 0.9);
      const m = new Float32Array(Math.round(len * SR));
      for (let i = 0; i < m.length; i++) {
        m[i] = impact[i] + (i < air.length ? air[i] * 0.5 : 0);
        const j = i - Math.round(0.03 * SR);
        if (j >= 0 && j < flick.length) m[i] += flick[j] * 0.3;
      }
      return {mono: m};
    }
    case 'scope': {
      // 100 ms dry click + short pluck.
      const click = tap(seed, 0.02, 2500, 8000);
      const p = pluckTone(noteToFreq('E5'), 0.3);
      const m = new Float32Array(p.length);
      for (let i = 0; i < m.length; i++) m[i] = p[i] * 0.8 + (i < click.length ? click[i] : 0);
      return {mono: m};
    }
    case 'pluck':
      return {mono: pluckTone(noteToFreq(c.note ?? 'A4'), 0.55)};
    case 'approve': {
      // 90 ms tactile tap, below the voice.
      const len = 0.09;
      const b = sine(len, (t) => 240 - 60 * t / len);
      mulEnv(b, envAD(len, 0.001, 0.035, 4));
      const t = tap(seed, 0.015, 1500, 6000);
      for (let i = 0; i < t.length; i++) b[i] += t[i] * 0.5;
      return {mono: b};
    }
    case 'launch': {
      // Soft upward sweep and a clean confirmation dyad.
      const len = 0.7;
      const sw = biquad(noise(0.35, seed), 'bandpass', (t) => 500 * Math.pow(10, t / 0.35), 1.2);
      mulEnv(sw, (t) => Math.pow(t / 0.35, 1.5) * (t < 0.34 ? 1 : 0));
      const c1 = pluckTone(noteToFreq('A5'), 0.5);
      const c2 = pluckTone(noteToFreq('E6'), 0.5);
      const m = new Float32Array(Math.round(len * SR));
      const off = Math.round(0.3 * SR);
      for (let i = 0; i < m.length; i++) {
        if (i < sw.length) m[i] += sw[i] * 0.5;
        const j = i - off;
        if (j >= 0 && j < c1.length) m[i] += 0.6 * c1[j] + 0.45 * c2[j];
      }
      // The confirmation lands on frame 738; the sweep leads into it.
      return {mono: m, offset: -0.3};
    }
    case 'proof': {
      // 80 ms edge click with a short room tail.
      const click = tap(seed, 0.08, 900, 6500);
      const st = makeStereo(0.6);
      addMono(st, click, 0, 1, 0);
      const wet = reverb(st, {room: 0.55, damp: 0.5, predelay: 0.005});
      addStereo(st, wet, 0, 0.9);
      return {stereo: st};
    }
    case 'intake': {
      // 200 ms low filtered intake (swelling, then cut).
      const len = 0.2;
      const n = biquad(noise(len, seed), 'lowpass', (t) => 200 + 900 * (t / len), 0.8);
      mulEnv(n, (t) => Math.pow(t / len, 2) * (t > len - 0.01 ? (len - t) / 0.01 : 1));
      return {mono: n};
    }
    case 'sweep': {
      // Stereo noise sweep following the diagonal (lower-left → upper-right).
      const len = 0.85;
      const n = biquad(noise(len, seed), 'highpass', 180, 0.7);
      const shaped = biquad(n, 'bandpass', (t) => 400 * Math.pow(8, Math.min(1, t / 0.55)), 0.9);
      mulEnv(shaped, (t) => {
        const a = Math.min(1, t / 0.5);
        const r = t > 0.55 ? Math.max(0, 1 - (t - 0.55) / 0.3) : 1;
        return Math.pow(a, 1.8) * r;
      });
      const st = makeStereo(len);
      // Amplitude panning only, so the sweep stays coherent in mono.
      for (let i = 0; i < shaped.length; i++) {
        const t = i / SR;
        const p = -0.55 + 1.1 * Math.min(1, t / 0.75);
        const a = ((p + 1) * Math.PI) / 4;
        st.L[i] = shaped[i] * Math.cos(a) * Math.SQRT2;
        st.R[i] = shaped[i] * Math.sin(a) * Math.SQRT2;
      }
      return {stereo: st};
    }
    case 'air': {
      // Faint moving-air tail through the 300 ms music gap.
      const len = 0.32;
      const n = biquad(biquad(noise(len, seed), 'highpass', 300, 0.7), 'lowpass', 2500, 0.7);
      mulEnv(n, (t) => Math.sin(Math.PI * t / len));
      return {mono: n};
    }
    case 'brandHit': {
      // Rounded impact, then A5 and E6 100 ms apart with a 450 ms tail.
      const len = 1.2;
      const m = new Float32Array(Math.round(len * SR));
      const body = sine(0.5, (t) => 48 + 50 * Math.exp(-t * 18));
      mulEnv(body, envAD(0.5, 0.004, 0.28, 3));
      const air = biquad(noise(0.25, seed), 'lowpass', 900, 0.7);
      mulEnv(air, envAD(0.25, 0.003, 0.09, 4));
      const n1 = pluckTone(noteToFreq('A5'), 0.9);
      const n2 = pluckTone(noteToFreq('E6'), 0.9);
      for (let i = 0; i < m.length; i++) {
        if (i < body.length) m[i] += body[i];
        if (i < air.length) m[i] += air[i] * 0.4;
        if (i < n1.length) m[i] += n1[i] * 0.32;
        const j = i - Math.round(0.1 * SR);
        if (j >= 0 && j < n2.length) m[i] += n2[j] * 0.3;
      }
      const st = makeStereo(len + 0.6);
      addMono(st, m, 0, 1, 0);
      const bell = makeStereo(len);
      addMono(bell, n1, 0, 0.3, -0.1);
      addMono(bell, n2, 0.1, 0.28, 0.1);
      const wet = reverb(bell, {room: 0.82, damp: 0.3, predelay: 0.01});
      addStereo(st, wet, 0, 0.9);
      return {stereo: st};
    }
  }
};

export const renderSfx = () => {
  const bus = makeStereo(DUR);
  for (const c of SFX) {
    const t = c.frame / FPS;
    const {mono, stereo, offset = 0} = build(c);
    if (mono) {
      normalizePeak(mono, c.peakDb);
      addMono(bus, mono, t + offset, 1, c.pan ?? 0);
    } else if (stereo) {
      let p = 0;
      for (let i = 0; i < stereo.L.length; i++) p = Math.max(p, Math.abs(stereo.L[i]), Math.abs(stereo.R[i]));
      const g = Math.pow(10, c.peakDb / 20) / (p || 1);
      addStereo(bus, stereo, t + offset, g);
    }
  }
  return bus;
};
