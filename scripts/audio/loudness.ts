// ITU-R BS.1770-4 integrated loudness and 4× oversampled true peak, plus a
// transparent offline true-peak limiter whose gain envelope can be applied to
// every stem (so stems still sum to the master).
import {SR, type Stereo} from './dsp.ts';

const kFilter = (x: Float32Array) => {
  // 48 kHz coefficients from BS.1770 (pre-filter shelf, then RLB high-pass).
  const s1 = {b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [1, -1.69065929318241, 0.73248077421585]};
  const s2 = {b: [1.0, -2.0, 1.0], a: [1, -1.99004745483398, 0.99007225036621]};
  const run = (inp: Float32Array, c: {b: number[]; a: number[]}) => {
    const out = new Float32Array(inp.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < inp.length; i++) {
      const y = c.b[0] * inp[i] + c.b[1] * x1 + c.b[2] * x2 - c.a[1] * y1 - c.a[2] * y2;
      x2 = x1; x1 = inp[i]; y2 = y1; y1 = y;
      out[i] = y;
    }
    return out;
  };
  return run(run(x, s1), s2);
};

export const integratedLoudness = (s: Stereo) => {
  if (SR !== 48000) throw new Error('K-filter coefficients assume 48 kHz');
  const L = kFilter(s.L);
  const R = kFilter(s.R);
  const block = Math.round(0.4 * SR);
  const hop = Math.round(0.1 * SR);
  const zs: number[] = [];
  for (let start = 0; start + block <= L.length; start += hop) {
    let sl = 0, sr = 0;
    for (let i = start; i < start + block; i++) {
      sl += L[i] * L[i];
      sr += R[i] * R[i];
    }
    zs.push(sl / block + sr / block);
  }
  const lk = (z: number) => -0.691 + 10 * Math.log10(z);
  const abs = zs.filter((z) => lk(z) > -70);
  if (!abs.length) return -Infinity;
  const meanAbs = abs.reduce((a, b) => a + b, 0) / abs.length;
  const rel = lk(meanAbs) - 10;
  const gated = abs.filter((z) => lk(z) > rel);
  const mean = gated.reduce((a, b) => a + b, 0) / gated.length;
  return lk(mean);
};

/** Short-term (3 s) or momentary (0.4 s) loudness over a time range. */
export const windowLoudness = (s: Stereo, t0: number, t1: number) => {
  const a = Math.max(0, Math.round(t0 * SR));
  const b = Math.min(s.L.length, Math.round(t1 * SR));
  const sub: Stereo = {L: s.L.slice(a, b), R: s.R.slice(a, b)};
  const L = kFilter(sub.L);
  const R = kFilter(sub.R);
  let e = 0;
  for (let i = 0; i < L.length; i++) e += L[i] * L[i] + R[i] * R[i];
  return -0.691 + 10 * Math.log10(e / Math.max(1, L.length));
};

// Polyphase 4× interpolator (Kaiser-windowed sinc, 48 taps per phase).
const OS = 4;
const TAPS = 48;
const makeKernel = () => {
  const n = OS * TAPS + 1; // odd length, integer centre
  const beta = 8;
  const bessel = (x: number) => {
    let s = 1, t = 1;
    for (let k = 1; k < 30; k++) {
      t *= (x / (2 * k)) * (x / (2 * k));
      s += t;
    }
    return s;
  };
  const h = new Float64Array(n);
  const mid = (n - 1) / 2;
  for (let i = 0; i < n; i++) {
    const x = (i - mid) / OS;
    const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    const r = (i - mid) / mid;
    const w = bessel(beta * Math.sqrt(Math.max(0, 1 - r * r))) / bessel(beta);
    h[i] = sinc * w;
  }
  return h;
};
const KERNEL = makeKernel();
const MID = (KERNEL.length - 1) / 2;

/** Per-sample true-peak envelope (max |x| over the 4 interpolated points after each sample). */
export const truePeakEnvelope = (x: Float32Array) => {
  const out = new Float32Array(x.length);
  const half = TAPS / 2;
  for (let n = 0; n < x.length; n++) {
    let m = Math.abs(x[n]);
    for (let p = 1; p < OS; p++) {
      let acc = 0;
      for (let k = -half + 1; k <= half; k++) {
        const idx = n + k;
        if (idx < 0 || idx >= x.length) continue;
        // y(n + p/OS) = Σ x[n+k] · sinc(p/OS − k), windowed
        const hi = MID - k * OS + p;
        if (hi >= 0 && hi < KERNEL.length) acc += x[idx] * KERNEL[hi];
      }
      m = Math.max(m, Math.abs(acc));
    }
    out[n] = m;
  }
  return out;
};

export const truePeakDb = (s: Stereo) => {
  const a = truePeakEnvelope(s.L);
  const b = truePeakEnvelope(s.R);
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, a[i], b[i]);
  return 20 * Math.log10(m || 1e-12);
};

/** Gain envelope that keeps the true peak under `ceilingDb` (lookahead, smooth release). */
export const limiterGain = (s: Stereo, ceilingDb: number, lookaheadMs = 2, releaseMs = 80) => {
  const ceil = Math.pow(10, ceilingDb / 20);
  const a = truePeakEnvelope(s.L);
  const b = truePeakEnvelope(s.R);
  const n = a.length;
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = Math.max(a[i], b[i]);
    need[i] = p > ceil ? ceil / p : 1;
  }
  const la = Math.round((lookaheadMs / 1000) * SR);
  // Forward-looking minimum so gain is already down when the peak arrives.
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = 1;
    for (let k = 0; k <= la && i + k < n; k++) m = Math.min(m, need[i + k]);
    g[i] = m;
  }
  // Attack ramp (linear over lookahead) and exponential release.
  const rel = Math.exp(-1 / ((releaseMs / 1000) * SR));
  const out = new Float32Array(n);
  let cur = 1;
  for (let i = 0; i < n; i++) {
    if (g[i] < cur) cur = g[i];
    else cur = g[i] - (g[i] - cur) * rel;
    out[i] = cur;
  }
  // Smooth attack edges backwards so gain never steps.
  for (let i = n - 2; i >= 0; i--) out[i] = Math.min(out[i], out[i + 1] + (1 - out[i + 1]) / Math.max(1, la));
  return out;
};
