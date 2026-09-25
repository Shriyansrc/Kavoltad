// Deterministic offline DSP for the score and effects (48 kHz stereo).
// Plain TypeScript, no native dependencies: every sample is a pure function
// of the timeline and the fixed seed, so re-running produces identical WAVs.
import {writeFileSync, readFileSync} from 'node:fs';

export const SR = 48000;

export type Stereo = {L: Float32Array; R: Float32Array};

export const makeStereo = (seconds: number): Stereo => ({
  L: new Float32Array(Math.round(seconds * SR)),
  R: new Float32Array(Math.round(seconds * SR)),
});

export const dbToGain = (db: number) => Math.pow(10, db / 20);
export const gainToDb = (g: number) => 20 * Math.log10(Math.max(1e-12, g));

const NOTE: Record<string, number> = {C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11};
export const noteToFreq = (n: string) => {
  const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(n);
  if (!m) throw new Error(`bad note ${n}`);
  const midi = (Number(m[2]) + 1) * 12 + NOTE[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
};

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

/** Constant-power pan, p in [-1, 1]. */
export const panGains = (p: number) => {
  const a = ((p + 1) * Math.PI) / 4;
  return {l: Math.cos(a) * Math.SQRT2, r: Math.sin(a) * Math.SQRT2};
};

/** Add a mono buffer into a stereo bus at time t0 (s) with gain and pan. */
export const addMono = (bus: Stereo, mono: Float32Array, t0: number, gain = 1, pan = 0) => {
  const start = Math.round(t0 * SR);
  const {l, r} = panGains(pan);
  for (let i = 0; i < mono.length; i++) {
    const j = start + i;
    if (j < 0 || j >= bus.L.length) continue;
    bus.L[j] += mono[i] * gain * l;
    bus.R[j] += mono[i] * gain * r;
  }
};

export const addStereo = (bus: Stereo, src: Stereo, t0 = 0, gain = 1) => {
  const start = Math.round(t0 * SR);
  for (let i = 0; i < src.L.length; i++) {
    const j = start + i;
    if (j < 0 || j >= bus.L.length) continue;
    bus.L[j] += src.L[i] * gain;
    bus.R[j] += src.R[i] * gain;
  }
};

// ---------------------------------------------------------------- envelopes
/** Attack/decay envelope with exponential decay (times in seconds). */
export const envAD = (len: number, attack: number, decay: number, curve = 4) => {
  const n = Math.round(len * SR);
  const out = new Float32Array(n);
  const na = Math.max(1, Math.round(attack * SR));
  for (let i = 0; i < n; i++) {
    if (i < na) out[i] = Math.sin((Math.PI / 2) * (i / na));
    else out[i] = Math.exp((-curve * (i - na)) / (decay * SR));
  }
  // 3 ms release at the very end to avoid clicks
  const nr = Math.min(n, Math.round(0.003 * SR));
  for (let i = 0; i < nr; i++) out[n - 1 - i] *= i / nr;
  return out;
};

// ---------------------------------------------------------------- oscillators
export const sine = (len: number, freq: number | ((t: number) => number), phase = 0) => {
  const n = Math.round(len * SR);
  const out = new Float32Array(n);
  let ph = phase;
  for (let i = 0; i < n; i++) {
    const f = typeof freq === 'number' ? freq : freq(i / SR);
    out[i] = Math.sin(ph);
    ph += (2 * Math.PI * f) / SR;
  }
  return out;
};

/** Band-limited triangle by additive odd harmonics (1/n² roll-off). */
export const triangle = (len: number, freq: number, harmonics = 9) => {
  const n = Math.round(len * SR);
  const out = new Float32Array(n);
  for (let h = 1; h <= harmonics * 2; h += 2) {
    if (h * freq > SR / 2.2) break;
    const amp = (8 / (Math.PI * Math.PI)) * (((h - 1) / 2) % 2 === 0 ? 1 : -1) / (h * h);
    const w = (2 * Math.PI * freq * h) / SR;
    for (let i = 0; i < n; i++) out[i] += amp * Math.sin(w * i);
  }
  return out;
};

/** Band-limited sawtooth by additive harmonics (for filtered pulses/pads). */
export const saw = (len: number, freq: number, harmonics = 24, detuneCents = 0) => {
  const n = Math.round(len * SR);
  const out = new Float32Array(n);
  const f0 = freq * Math.pow(2, detuneCents / 1200);
  for (let h = 1; h <= harmonics; h++) {
    if (h * f0 > SR / 2.2) break;
    const amp = (2 / Math.PI) * (h % 2 ? 1 : -1) / h;
    const w = (2 * Math.PI * f0 * h) / SR;
    for (let i = 0; i < n; i++) out[i] += amp * Math.sin(w * i);
  }
  return out;
};

export const noise = (len: number, seed: number) => {
  const n = Math.round(len * SR);
  const out = new Float32Array(n);
  const rnd = mulberry32(seed);
  for (let i = 0; i < n; i++) out[i] = rnd() * 2 - 1;
  return out;
};

export const mulEnv = (buf: Float32Array, env: Float32Array | ((t: number) => number), gain = 1) => {
  for (let i = 0; i < buf.length; i++) {
    const e = typeof env === 'function' ? env(i / SR) : i < env.length ? env[i] : 0;
    buf[i] *= e * gain;
  }
  return buf;
};

export const mix = (...bufs: [Float32Array, number][]) => {
  const n = Math.max(...bufs.map(([b]) => b.length));
  const out = new Float32Array(n);
  for (const [b, g] of bufs) for (let i = 0; i < b.length; i++) out[i] += b[i] * g;
  return out;
};

// ---------------------------------------------------------------- filters
type BiquadType = 'lowpass' | 'highpass' | 'bandpass' | 'peaking' | 'lowshelf' | 'highshelf';

const coeffs = (type: BiquadType, f: number, q: number, gainDb = 0) => {
  const w0 = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  const A = Math.pow(10, gainDb / 40);
  let b0 = 0, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;
  switch (type) {
    case 'lowpass':
      b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case 'highpass':
      b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case 'bandpass':
      b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case 'peaking':
      b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A;
      break;
    case 'lowshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 - (A - 1) * cos + s); b1 = 2 * A * (A - 1 - (A + 1) * cos); b2 = A * (A + 1 - (A - 1) * cos - s);
      a0 = A + 1 + (A - 1) * cos + s; a1 = -2 * (A - 1 + (A + 1) * cos); a2 = A + 1 + (A - 1) * cos - s;
      break;
    }
    case 'highshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 + (A - 1) * cos + s); b1 = -2 * A * (A - 1 + (A + 1) * cos); b2 = A * (A + 1 + (A - 1) * cos - s);
      a0 = A + 1 - (A - 1) * cos + s; a1 = 2 * (A - 1 - (A + 1) * cos); a2 = A + 1 - (A - 1) * cos - s;
      break;
    }
  }
  return {b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0};
};

/** Biquad with optionally time-varying cutoff (recomputed every 32 samples). */
export const biquad = (buf: Float32Array, type: BiquadType, freq: number | ((t: number) => number), q = 0.707, gainDb = 0) => {
  const out = new Float32Array(buf.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let c = coeffs(type, typeof freq === 'number' ? freq : freq(0), q, gainDb);
  for (let i = 0; i < buf.length; i++) {
    if (typeof freq !== 'number' && i % 32 === 0) c = coeffs(type, freq(i / SR), q, gainDb);
    const x = buf[i];
    const y = c.b0 * x + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
};

export const biquadStereo = (s: Stereo, type: BiquadType, freq: number, q = 0.707, gainDb = 0): Stereo => ({
  L: biquad(s.L, type, freq, q, gainDb),
  R: biquad(s.R, type, freq, q, gainDb),
});

// ---------------------------------------------------------------- reverb
/** Freeverb-style stereo reverb (8 combs + 4 allpasses per side). Returns wet only. */
export const reverb = (input: Stereo, {room = 0.78, damp = 0.35, width = 1, predelay = 0.012} = {}): Stereo => {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => Math.round((d * SR) / 44100));
  const alls = [556, 441, 341, 225].map((d) => Math.round((d * SR) / 44100));
  const spread = Math.round((23 * SR) / 44100);
  const pd = Math.round(predelay * SR);
  const run = (x: Float32Array, off: number) => {
    const out = new Float32Array(x.length);
    const cb = combs.map((d) => ({buf: new Float32Array(d + off), idx: 0, store: 0}));
    const ab = alls.map((d) => ({buf: new Float32Array(d + off), idx: 0}));
    for (let i = 0; i < x.length; i++) {
      const inp = (i >= pd ? x[i - pd] : 0) * 0.015;
      let acc = 0;
      for (const c of cb) {
        const y = c.buf[c.idx];
        c.store = y * (1 - damp) + c.store * damp;
        c.buf[c.idx] = inp + c.store * room;
        c.idx = (c.idx + 1) % c.buf.length;
        acc += y;
      }
      for (const a of ab) {
        const b = a.buf[a.idx];
        const y = -acc + b;
        a.buf[a.idx] = acc + b * 0.5;
        a.idx = (a.idx + 1) % a.buf.length;
        acc = y;
      }
      out[i] = acc;
    }
    return out;
  };
  const mono = new Float32Array(input.L.length);
  for (let i = 0; i < mono.length; i++) mono[i] = (input.L[i] + input.R[i]) * 0.5;
  const wl = run(mono, 0);
  const wr = run(mono, spread);
  const L = new Float32Array(wl.length);
  const R = new Float32Array(wr.length);
  const w1 = (width / 2 + 0.5), w2 = (1 - width) / 2;
  for (let i = 0; i < L.length; i++) {
    L[i] = wl[i] * w1 + wr[i] * w2;
    R[i] = wr[i] * w1 + wl[i] * w2;
  }
  return {L, R};
};

// ---------------------------------------------------------------- analysis
export const peak = (s: Stereo) => {
  let p = 0;
  for (let i = 0; i < s.L.length; i++) p = Math.max(p, Math.abs(s.L[i]), Math.abs(s.R[i]));
  return p;
};

export const peakMono = (b: Float32Array) => {
  let p = 0;
  for (let i = 0; i < b.length; i++) p = Math.max(p, Math.abs(b[i]));
  return p;
};

/** Normalise a mono effect so its peak sits at the given dBFS. */
export const normalizePeak = (b: Float32Array, db: number) => {
  const p = peakMono(b);
  if (p <= 0) return b;
  const g = dbToGain(db) / p;
  for (let i = 0; i < b.length; i++) b[i] *= g;
  return b;
};

// ---------------------------------------------------------------- WAV I/O
export const writeWav = (path: string, s: Stereo, bits: 24 | 32 = 24) => {
  const n = s.L.length;
  const bytes = bits / 8;
  const dataSize = n * 2 * bytes;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(bits === 32 ? 3 : 1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2 * bytes, 28);
  buf.writeUInt16LE(2 * bytes, 32);
  buf.writeUInt16LE(bits, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (const ch of [s.L, s.R]) {
      const v = Math.max(-1, Math.min(1, ch[i]));
      if (bits === 32) {
        buf.writeFloatLE(ch[i], o);
      } else {
        const q = Math.round(v * 8388607);
        buf.writeIntLE(Math.max(-8388608, Math.min(8388607, q)), o, 3);
      }
      o += bytes;
    }
  }
  writeFileSync(path, buf);
};

/** Read a PCM (16/24/32-bit int) or float WAV into stereo float buffers. */
export const readWav = (path: string): {s: Stereo; sr: number} => {
  const b = readFileSync(path);
  let o = 12;
  let fmt = 1, ch = 2, sr = SR, bits = 16;
  let dataOff = 0, dataLen = 0;
  while (o < b.length) {
    const id = b.toString('ascii', o, o + 4);
    const size = b.readUInt32LE(o + 4);
    if (id === 'fmt ') {
      fmt = b.readUInt16LE(o + 8);
      ch = b.readUInt16LE(o + 10);
      sr = b.readUInt32LE(o + 12);
      bits = b.readUInt16LE(o + 22);
      if (fmt === 0xfffe) fmt = b.readUInt16LE(o + 32);
    } else if (id === 'data') {
      dataOff = o + 8;
      dataLen = size;
      break;
    }
    o += 8 + size + (size % 2);
  }
  const bytes = bits / 8;
  const n = Math.floor(dataLen / (bytes * ch));
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < ch; c++) {
      const p = dataOff + (i * ch + c) * bytes;
      let v: number;
      if (fmt === 3) v = bits === 32 ? b.readFloatLE(p) : b.readDoubleLE(p);
      else if (bits === 16) v = b.readInt16LE(p) / 32768;
      else if (bits === 24) v = b.readIntLE(p, 3) / 8388608;
      else v = b.readInt32LE(p) / 2147483648;
      if (c === 0) L[i] = v;
      if (c === 1 || ch === 1) R[i] = v;
    }
  }
  return {s: {L, R}, sr};
};
