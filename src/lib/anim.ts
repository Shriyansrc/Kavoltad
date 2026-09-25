// Deterministic animation helpers. Everything is a pure function of frame.
export type Ease = (x: number) => number;

export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
export const smoothstep = (a: number, b: number, x: number) => {
  const t = invLerp(a, b, x);
  return t * t * (3 - 2 * t);
};

export const ease = {
  linear: ((x) => x) as Ease,
  cubicIn: ((x) => x * x * x) as Ease,
  cubicOut: ((x) => 1 - Math.pow(1 - x, 3)) as Ease,
  cubicInOut: ((x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)) as Ease,
  quadIn: ((x) => x * x) as Ease,
  quadOut: ((x) => 1 - (1 - x) * (1 - x)) as Ease,
  quartOut: ((x) => 1 - Math.pow(1 - x, 4)) as Ease,
  quintOut: ((x) => 1 - Math.pow(1 - x, 5)) as Ease,
  expoOut: ((x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x))) as Ease,
  sineInOut: ((x) => -(Math.cos(Math.PI * x) - 1) / 2) as Ease,
  // Gentle overshoot for settles; s ≈ 1.2 keeps it restrained.
  backOut:
    (s = 1.2): Ease =>
    (x) => {
      const c3 = s + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
    },
  // Cubic-bezier easing identical to CSS cubic-bezier(x1,y1,x2,y2).
  bezier: (x1: number, y1: number, x2: number, y2: number): Ease => {
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;
    const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
    const sy = (t: number) => ((ay * t + by) * t + cy) * t;
    const dsx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
    return (x: number) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const d = sx(t) - x;
        const dd = dsx(t);
        if (Math.abs(d) < 1e-6 || Math.abs(dd) < 1e-6) break;
        t -= d / dd;
      }
      t = clamp(t);
      return sy(t);
    };
  },
};

// A designed "settle" curve: fast, then long soft landing (for UI objects).
export const settle = ease.bezier(0.16, 1, 0.3, 1);
// Anticipation-friendly in-out for character glides.
export const glide = ease.bezier(0.65, 0, 0.35, 1);

/** Tween from a to b between frames f0 and f1 with easing. Clamped. */
export const tween = (f: number, f0: number, f1: number, a: number, b: number, e: Ease = ease.cubicInOut) =>
  lerp(a, b, e(invLerp(f0, f1, f)));

export type Key = [frame: number, value: number, easing?: Ease];

/**
 * Piecewise keyframe track. The easing stored on a key shapes the segment
 * that ENDS at that key. Values hold before the first and after the last key.
 */
export const track = (f: number, keys: Key[]): number => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, v1, e] = keys[i];
    if (f <= f1) {
      const [f0, v0] = keys[i - 1];
      const t = f1 === f0 ? 1 : (f - f0) / (f1 - f0);
      return lerp(v0, v1, (e ?? ease.cubicInOut)(t));
    }
  }
  return keys[keys.length - 1][1];
};

/** Damped oscillation that starts at 0, useful for impacts. */
export const ring = (f: number, start: number, amp: number, periodFrames: number, decayFrames: number) => {
  if (f < start) return 0;
  const t = f - start;
  return amp * Math.exp(-t / decayFrames) * Math.sin((2 * Math.PI * t) / periodFrames);
};

/** 0→1→0 envelope: rises over [a,b], holds, falls over [c,d]. */
export const envelope = (f: number, a: number, b: number, c: number, d: number, e: Ease = ease.cubicInOut) => {
  if (f <= a || f >= d) return 0;
  if (f < b) return e(invLerp(a, b, f));
  if (f <= c) return 1;
  return 1 - e(invLerp(c, d, f));
};

/** One smooth pulse (0→1→0) centred at c with half-width w, raised cosine. */
export const bump = (f: number, c: number, w: number) => {
  const x = (f - c) / w;
  if (Math.abs(x) >= 1) return 0;
  return 0.5 * (1 + Math.cos(Math.PI * x));
};

export const deg = (r: number) => (r * 180) / Math.PI;
export const rad = (d: number) => (d * Math.PI) / 180;
