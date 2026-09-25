// Kavey's performance: a pure function of frame. The rig moves whole-body
// (translation, lean, restrained perspective turn, squash/stretch ≤ 6 %) and
// articulates only what the supplied pixels support: two ear flames and the
// scarf-tail flame (spring-simulated follow-through), both hands, the floating
// cube, and the eyes (blinks and glances).
import {KAVEY_SRC} from '../config/kavey.ts';
import {LAYOUT} from '../config/layout.ts';
import {K} from '../config/timeline.ts';
import {FPS} from '../config/video.ts';
import {bump, clamp, ease, glide, invLerp, lerp, rad, ring, settle, track, type Key} from '../lib/anim.ts';
import {chain, P, project, Rx, Ry, Rz, S, T, type M4} from '../lib/mat4.ts';

export type KaveyPose = {
  x: number; // silhouette centre on screen
  y: number;
  height: number; // silhouette height on screen
  rot: number; // lean (deg, negative = toward screen-left)
  turn: number; // rotateY (deg, |turn| ≤ 15)
  pitch: number; // rotateX (deg) for nods
  hover: number; // current hover offset (px, included in y)
  sx: number; // squash/stretch
  sy: number;
  earL: number; // appendage rotations (deg)
  earR: number;
  tail: number;
  handL: number;
  handR: number;
  cube: {dx: number; dy: number; rot: number; scale: number; glow: number};
  blink: number; // 0 open … 1 closed
  eyeScale?: number; // eye glow size (surprise > 1), default 1
  gazeX: number; // eye offset, source px
  gazeY: number;
  energy: number; // 0..1 glow/scarf energy
};

const B = KAVEY_SRC.bbox;
const CX = B.x + B.w / 2;
const CY = B.y + B.h / 2;

// ------------------------------------------------------------------ root path
const O = LAYOUT.kaveyOpening;
const Pp = LAYOUT.kaveyProcess;
const Q = LAYOUT.kaveyProof;
const E = LAYOUT.ending.kavey;
const END_H = Math.min(E.maxH, (E.maxW / B.w) * B.h, B.h); // never upscale

const X_KEYS: Key[] = [
  [0, O.x - 12],
  [K.slipEnd, O.x - 26, ease.cubicIn], // lunges for the falling card
  [K.slipEnd + 20, O.x - 10, settle],
  [K.connect - 6, O.x - 4],
  [K.connect, O.x + 6, ease.cubicOut], // wind-up
  [K.connect + 6, O.x - 22, ease.cubicOut], // the flick
  [K.kaveyGlideStart + 2, O.x - 16],
  [K.kaveyGlideEnd, Pp.x, glide],
  [420, Pp.x],
  [440, Pp.x + 20, settle],
  [600, Pp.x + 20],
  [618, Pp.x + 30, settle],
  [720, Pp.x + 30],
  [760, Pp.x + 14, settle],
  [840, Pp.x + 14],
  [864, Q.x, settle],
  [K.anticipation, Q.x],
  [K.sweep, Q.x + 20, ease.cubicOut],
];
const Y_KEYS: Key[] = [
  [0, O.y],
  [K.slipEnd, O.y + 8, ease.cubicIn],
  [K.slipEnd + 20, O.y, settle],
  [K.connect - 6, O.y + 4],
  [K.connect + 4, O.y - 14, ease.cubicOut],
  [K.kaveyGlideStart + 2, O.y - 12],
  [K.kaveyGlideEnd, Pp.y, glide],
  [840, Pp.y],
  [864, Q.y, settle],
  [K.anticipation, Q.y],
  [K.sweep, Q.y + 20, ease.cubicOut],
];
const H_KEYS: Key[] = [
  [0, O.height],
  [K.kaveyGlideStart + 2, O.height],
  [K.kaveyGlideEnd, Pp.height, glide],
  [840, Pp.height],
  [864, Q.height, settle],
];

const hoverAmp = (f: number) =>
  track(f, [
    [0, 3],
    [K.straighten, 3],
    [K.kaveyGlideEnd, 8],
    [300, 8],
    [312, 4],
    [708, 4],
    [724, 8],
    [960, 8],
    [972, 0],
    [K.swap, 0],
    [K.swap + 1, 4],
  ]);

/** Root path without hover, before the transition override. */
const rootAt = (f: number) => {
  let x = track(f, X_KEYS);
  let y = track(f, Y_KEYS);
  let height = track(f, H_KEYS);
  // Day 7: anticipation squat, 24 px rise (+ a real hop), proud settle.
  if (f >= K.lift - 8 && f < K.lift + 60) {
    const up = f < K.lift ? 0 : f < K.lift + 16 ? ease.cubicOut(invLerp(K.lift, K.lift + 16, f)) : 1 - ease.cubicIn(invLerp(K.lift + 16, K.lift + 32, f));
    y -= 64 * up;
  }
  // Day 6 approval: a small happy hop.
  if (f >= K.approve + 4 && f < K.approve + 30) y -= 22 * Math.sin(Math.PI * invLerp(K.approve + 4, K.approve + 26, f));
  // Build: settle bounce when the checks land.
  if (f >= K.flowChecks && f < K.flowChecks + 30) y -= 14 * Math.sin(Math.PI * invLerp(K.flowChecks, K.flowChecks + 22, f));
  // Shot 8: accelerate along a curve toward (510, 770).
  if (f >= K.sweep && f < K.swap) {
    const u = Math.min(1, ease.cubicIn(invLerp(K.sweep, K.cross + 6, f)));
    const p0 = {x: Q.x + 20, y: Q.y + 20};
    const p1 = {x: 700, y: 760};
    const p2 = {x: 510, y: 770};
    x = (1 - u) * (1 - u) * p0.x + 2 * (1 - u) * u * p1.x + u * u * p2.x;
    y = (1 - u) * (1 - u) * p0.y + 2 * (1 - u) * u * p1.y + u * u * p2.y;
    const over = invLerp(K.cross + 6, K.swap, f);
    x -= 60 * over;
    y -= 40 * over;
    height = lerp(Q.height, Q.height * 1.08, u);
  }
  if (f >= K.swap) {
    x = E.cx;
    y = E.cy;
    height = END_H;
  }
  return {x, y, height};
};

const hoverAt = (f: number) => {
  const t = f / FPS;
  return (hoverAmp(f) * (Math.sin((2 * Math.PI * t) / 2.8) + 0.18 * Math.sin((2 * Math.PI * t) / 4.3 + 1.1))) / 1.1;
};

// ------------------------------------------------------------------ lean/turn
const ROT_KEYS: Key[] = [
  [0, -6],
  [K.slipEnd, -9, ease.cubicIn],
  [K.slipEnd + 18, -3, settle],
  [K.paymentShift, -3],
  [K.paymentShift + 8, -5, ease.cubicOut],
  [K.reminderShift, -4],
  [K.reminderShift + 8, -6.5, ease.cubicOut],
  [K.straighten, -4.5],
  [K.connect - 8, 1, ease.cubicInOut],
  [K.connect - 1, 4, ease.cubicOut],
  [K.connect + 5, -8, ease.cubicOut],
  [K.kaveyGlideStart + 8, -3],
  [K.kaveyGlideStart + 20, 5, ease.cubicInOut],
  [K.kaveyGlideEnd + 10, -1, settle],
  [288, -1],
  [300, -3, ease.cubicInOut],
  [420, -3],
  [440, -2],
  [580, -3],
  [596, 0, ease.cubicInOut],
  [700, 0.5],
  [744, -2],
  [770, -4, settle],
  [800, -2.5],
  [840, -1],
  [864, -4, settle],
  [K.anticipation, -4],
  [K.sweep, -8, ease.cubicOut],
  [K.cross, -11, ease.cubicIn],
  [K.swap, -12],
  [K.swap + 1, -3],
  [1036, 0, settle],
];

const TURN_KEYS: Key[] = [
  [0, -10],
  [K.slipEnd, -12],
  [K.slipEnd + 20, -8, settle],
  [K.straighten, -8],
  [K.connect, -4],
  [K.kaveyGlideStart, -10],
  [K.kaveyGlideEnd, -5, glide],
  [300, -8],
  [590, -8],
  [606, -2, ease.cubicInOut],
  [744, -3],
  [770, -8, settle],
  [830, -6],
  [864, -10, settle],
  [K.anticipation, -10],
  [K.cross, -15, ease.cubicIn],
  [K.swap, -15],
  [K.swap + 1, -5],
  [1036, 0, settle],
];

// ------------------------------------------------------------------ squash
const squashAt = (f: number) => {
  let sy = 1;
  // breathing
  sy += 0.01 * Math.sin((2 * Math.PI * f) / (FPS * 2.2));
  // catch impact
  sy += ring(f, K.slipEnd, -0.05, 14, 7);
  // wind-up squat then stretch on the flick
  sy -= 0.05 * bump(f, K.connect - 3, 5);
  sy += 0.05 * bump(f, K.connect + 5, 6);
  // glide landing
  sy += ring(f, K.kaveyGlideEnd - 2, -0.04, 16, 8);
  // nods
  sy -= 0.035 * bump(f, K.scopeChecks + 6, 7) + 0.035 * bump(f, K.approve + 2, 6);
  sy += 0.03 * bump(f, K.approve + 14, 7);
  // Day 7 jump: squat, stretch, land, settle
  sy -= 0.06 * bump(f, K.lift - 3, 6);
  sy += 0.055 * bump(f, K.lift + 6, 8);
  sy -= 0.05 * bump(f, K.lift + 33, 6);
  sy += ring(f, K.lift + 38, 0.02, 16, 8);
  // build checks bounce
  sy -= 0.03 * bump(f, K.flowChecks - 2, 4);
  // transition take-off stretch
  sy -= 0.04 * bump(f, K.sweep - 2, 6);
  sy += 0.05 * bump(f, K.sweep + 12, 10) * (f < K.swap ? 1 : 0);
  // ending: arrives with a soft settle
  if (f >= K.swap) sy += ring(f, K.swap, -0.03, 20, 10);
  sy = clamp(sy, 0.93, 1.07);
  const sx = 1 + (1 - sy) * 0.8; // preserve volume, gently
  return {sx, sy};
};

// ------------------------------------------------------------------ hands, cube
const HAND_L: Key[] = [
  [0, -10],
  [K.slipEnd - 2, -16, ease.cubicIn], // reaching for the card
  [K.slipEnd + 3, 8, ease.cubicOut], // impact pushes the hand back
  [K.slipEnd + 16, -2, settle],
  [K.connect - 8, -2],
  [K.connect - 1, 14, ease.cubicOut], // wind-up
  [K.connect + 6, -24, ease.cubicOut], // flick that starts the connection
  [K.connect + 30, 0, settle],
  [428, 0],
  [436, -14, ease.cubicOut], // sends the build pulse
  [456, 0, settle],
  [K.lift - 2, 0],
  [K.lift + 10, -18, ease.cubicOut], // arm up on the jump
  [K.lift + 44, 0, settle],
  [1100, 0],
];
const HAND_R: Key[] = [
  [0, 4],
  [K.slipEnd + 4, 8, ease.cubicOut],
  [K.slipEnd + 20, 2, settle],
  [744, 2],
  [756, -12, ease.cubicOut], // presents the handoff tiles
  [800, -6, settle],
  [846, -6],
  [860, -16, ease.cubicOut], // presents the proof
  [900, -10, settle],
  [960, -10],
  [972, 6, ease.cubicOut],
  [K.swap, 6],
  [K.swap + 1, 0],
];

// ------------------------------------------------------------------ eyes
const BLINKS = [30, 104, 176, 246, 318, 400, 470, 562, 628, 700, 790, 870, 940, 1034, 1112, 1178];
const blinkAt = (f: number) => {
  let b = 0;
  for (const s of BLINKS) {
    const d = f - s;
    if (d < -3 || d > 8) continue;
    if (d < 0) b = Math.max(b, ease.cubicIn((d + 3) / 3));
    else if (d < 1) b = 1;
    else b = Math.max(b, 1 - ease.cubicOut((d - 1) / 7));
  }
  return b;
};
const GAZE_X: Key[] = [
  [0, -5],
  [K.slipEnd, -5],
  [40, -3, settle],
  [K.paymentShift, -3],
  [K.paymentShift + 5, -5, ease.cubicOut],
  [K.reminderShift, -5],
  [K.reminderShift + 5, -4, ease.cubicOut],
  [K.straighten, -4],
  [K.connect - 6, -1, ease.cubicInOut],
  [K.connect + 10, 0],
  [220, 0],
  [240, 2, ease.cubicInOut], // glances back toward the promise
  [290, 0],
  [304, -4, ease.cubicInOut],
  [420, -4],
  [600, -3],
  [612, -2],
  [700, -2],
  [724, 0, ease.cubicInOut],
  [846, 0],
  [856, -4, ease.cubicOut],
  [950, -4],
  [K.swap, 0],
  [K.glanceStart, 0],
  [K.glanceStart + 10, -1, ease.cubicInOut],
  [K.glanceEnd, -1],
  [K.glanceEnd + 14, 0, ease.cubicInOut],
];
const GAZE_Y: Key[] = [
  [0, -1],
  [K.reminderShift, 1],
  [K.reminderShift + 5, 3, ease.cubicOut],
  [K.straighten, 2],
  [K.connect, 0],
  [440, -3],
  [K.pulsePayment, 0],
  [K.pulseReminder, 3],
  [575, 3],
  [596, 0, ease.cubicInOut],
  [612, 1],
  [720, 1],
  [736, -3, ease.cubicOut], // looks up at LIVE
  [790, -1],
  [840, 0],
  [K.swap, 0],
  [K.glanceStart, 0],
  [K.glanceStart + 10, 4, ease.cubicInOut], // glance toward the website
  [K.glanceEnd, 4],
  [K.glanceEnd + 14, 0, ease.cubicInOut],
];

// ------------------------------------------------------------------ springs
type Spring = {f0: number; zeta: number; gx: number; gy: number; gr: number; max: number};
const SPRINGS: Record<'earL' | 'earR' | 'tail', Spring> = {
  earL: {f0: 1.5, zeta: 0.34, gx: -0.9, gy: -0.35, gr: -0.6, max: 11},
  earR: {f0: 1.8, zeta: 0.32, gx: -0.8, gy: 0.35, gr: -0.6, max: 11},
  tail: {f0: 1.2, zeta: 0.3, gx: 1.1, gy: 0.25, gr: -0.5, max: 14},
};

export type RootSample = {x: number; y: number; r: number};
export type FlameKey = 'earL' | 'earR' | 'tail';

/**
 * Spring follow-through for the two ear flames and the scarf tail, driven by
 * the acceleration of a root path (screen px, lean deg). Simulated once per
 * performance and cached; `freeze` frames are repositions, not motion.
 */
export const followThrough = (root: (f: number) => RootSample, limit: number, freeze: number[] = []) => {
  let cache: Record<FlameKey, Float64Array> | null = null;
  const simulate = () => {
    const out = {earL: new Float64Array(limit), earR: new Float64Array(limit), tail: new Float64Array(limit)};
    for (const key of ['earL', 'earR', 'tail'] as const) {
      const s = SPRINGS[key];
      const w = 2 * Math.PI * s.f0;
      let th = 0;
      let v = 0;
      const dt = 1 / FPS;
      for (let f = 0; f < limit; f++) {
        const a = freeze.includes(f)
          ? {x: 0, y: 0, r: 0}
          : (() => {
              const p0 = root(f - 1);
              const p1 = root(f);
              const p2 = root(f + 1);
              return {x: p2.x - 2 * p1.x + p0.x, y: p2.y - 2 * p1.y + p0.y, r: p2.r - 2 * p1.r + p0.r};
            })();
        const drive = (s.gx * a.x + s.gy * a.y + s.gr * a.r * 6) * FPS * FPS * 0.35;
        const acc = -w * w * th - 2 * s.zeta * w * v + drive;
        v += acc * dt;
        th += v * dt;
        if (Math.abs(th) > s.max) {
          th = Math.sign(th) * s.max;
          v *= 0.3;
        }
        out[key][f] = th;
      }
    }
    return out;
  };
  return (key: FlameKey, f: number) => {
    if (!cache) cache = simulate();
    const arr = cache[key];
    const i = Math.max(0, Math.min(limit - 2, Math.floor(f)));
    const t = clamp(f - i, 0, 1);
    return lerp(arr[i], arr[i + 1], t);
  };
};

const springAt = followThrough(
  (f) => {
    const r = rootAt(f);
    return {x: r.x, y: r.y + hoverAt(f), r: track(f, ROT_KEYS)};
  },
  1260,
  [K.swap, K.swap + 1],
);

// ------------------------------------------------------------------ pose
export const kaveyPose = (f: number): KaveyPose => {
  const r = rootAt(f);
  const t = f / FPS;
  const hover = hoverAt(f);
  const {sx, sy} = squashAt(f);
  let pitch = 0;
  const nod = (at: number, deg: number) => (f < at || f > at + 18 ? 0 : deg * Math.sin((Math.PI * (f - at)) / 18));
  pitch += nod(K.scopeChecks, 5) + nod(K.approve, 5);
  pitch += track(f, [[K.glanceStart, 0], [K.glanceStart + 14, 5, ease.cubicInOut], [K.glanceEnd, 5], [K.glanceEnd + 16, 0, ease.cubicInOut]]);

  const energy = clamp(
    0.3 + 0.6 * bump(f, K.connect + 6, 24) + 0.4 * bump(f, K.live + 8, 30) + 0.8 * invLerp(K.sweep, K.cross, f) * (f < K.swap ? 1 : 0) + 0.5 * bump(f, K.reveal + 4, 20),
  );
  const cubeFlash = bump(f, K.connect + 6, 10) + bump(f, K.live + 2, 12) + bump(f, K.reveal + 2, 12);
  const cubeHop = f >= K.live - 2 && f < K.live + 40 ? -46 * Math.sin(Math.PI * invLerp(K.live - 2, K.live + 36, f)) : 0;

  return {
    x: r.x,
    y: r.y + hover,
    height: r.height,
    rot: track(f, ROT_KEYS) + 0.8 * Math.sin((2 * Math.PI * t) / 3.7),
    turn: track(f, TURN_KEYS),
    pitch,
    hover,
    sx,
    sy,
    earL: springAt('earL', f) + 2.6 * Math.sin((2 * Math.PI * t) / 3.1 + 0.5),
    earR: springAt('earR', f) + 3.0 * Math.sin((2 * Math.PI * t) / 2.6 + 1.9),
    tail: springAt('tail', f) + 4.5 * Math.sin((2 * Math.PI * t) / 2.3 + 0.3),
    handL: track(f, HAND_L) + 1.5 * Math.sin((2 * Math.PI * t) / 2.9 + 2.2),
    handR: track(f, HAND_R) + 1.8 * Math.sin((2 * Math.PI * t) / 3.3 + 0.7),
    cube: {
      dx: 3 * Math.sin((2 * Math.PI * t) / 3.4),
      dy: 7 * Math.sin((2 * Math.PI * t) / 2.1 + 0.8) + cubeHop,
      rot: 18 * Math.sin((2 * Math.PI * t) / 5) + (f >= K.live ? 360 * ease.cubicOut(invLerp(K.live, K.live + 40, f)) : 0),
      scale: 1 + 0.25 * clamp(cubeFlash),
      glow: clamp(0.35 + cubeFlash),
    },
    blink: blinkAt(f),
    gazeX: track(f, GAZE_X),
    gazeY: track(f, GAZE_Y),
    energy,
  };
};

export const PERSPECTIVE = 1600;

/** Source-pixel → screen transform shared by the CSS and anchor projection. */
export const kaveyMatrix = (pose: KaveyPose): M4 => {
  const s = pose.height / B.h;
  const pv = KAVEY_SRC.rootPivot;
  const px = pose.x + (pv.x - CX) * s;
  const py = pose.y + (pv.y - CY) * s;
  return chain(T(px, py), Rz(rad(pose.rot)), P(PERSPECTIVE), Ry(rad(pose.turn)), Rx(rad(-pose.pitch)), S(s * pose.sx, s * pose.sy), T(-pv.x, -pv.y));
};

/** Local rotation of a child layer about its pivot, then the root transform. */
export const layerPoint = (pose: KaveyPose, pivot: {x: number; y: number}, deg: number, pt: {x: number; y: number}) => {
  const a = rad(deg);
  const dx = pt.x - pivot.x;
  const dy = pt.y - pivot.y;
  const lx = pivot.x + dx * Math.cos(a) - dy * Math.sin(a);
  const ly = pivot.y + dx * Math.sin(a) + dy * Math.cos(a);
  return project(kaveyMatrix(pose), lx, ly);
};

/** Screen position of a named anchor under a pose (hands follow their rotation). */
export const anchorOf = (pose: KaveyPose, name: keyof typeof KAVEY_SRC.anchors) => {
  const a = KAVEY_SRC.anchors[name];
  if (name === 'handLPalm' || name === 'handLTip') return layerPoint(pose, {x: 136, y: 426}, pose.handL, a);
  if (name === 'handRPalm') return layerPoint(pose, {x: 287, y: 482}, pose.handR, a);
  if (name === 'scarfTip') return layerPoint(pose, {x: 122, y: 452}, pose.tail, a);
  return project(kaveyMatrix(pose), a.x, a.y);
};

export const anchorAt = (f: number, name: keyof typeof KAVEY_SRC.anchors) => anchorOf(kaveyPose(f), name);
