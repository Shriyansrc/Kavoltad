// Kavey's performance as pure functions of frame. The supplied PNG is flat,
// so acting is carried by whole-body translation, roll, a restrained turn
// (rotateY ≤ 15°), pitch for nods, hover and timing — never by warping.
import {KAVEY_SRC} from '../config/kavey.ts';
import {LAYOUT} from '../config/layout.ts';
import {K} from '../config/timeline.ts';
import {FPS} from '../config/video.ts';
import {bump, clamp, ease, glide, invLerp, lerp, rad, ring, settle, track, tween, type Key} from '../lib/anim.ts';
import {chain, P, project, Rx, Ry, Rz, S, T, type M4} from '../lib/mat4.ts';
import {pulse} from './model.ts';

export type KaveyPose = {
  x: number; // silhouette centre (screen px)
  y: number;
  height: number; // silhouette height (px)
  rot: number; // roll, degrees (negative leans toward screen-left)
  turn: number; // rotateY, degrees (negative turns toward screen-left)
  pitch: number; // rotateX, degrees (positive nods forward)
  hover: number; // current hover offset in px (already included in y)
  energy: number; // 0..1 rim / scarf energy
  visible: number;
};

const B = KAVEY_SRC.bbox;
const endingHeight = () => {
  const e = LAYOUT.ending.kavey;
  return Math.min(e.maxH, (e.maxW / B.w) * B.h);
};

/** Base path without hover: position and size keyed across the whole film. */
const basePath = (f: number) => {
  const O = LAYOUT.kaveyOpening;
  const P = LAYOUT.kaveyProcess;
  const Q = LAYOUT.kaveyProof;
  const E = LAYOUT.ending.kavey;
  const xKeys: Key[] = [
    [0, O.x - 16], // already reaching toward the slipping panel on frame 0
    [K.slipEnd, O.x - 22, ease.cubicIn],
    [K.slipEnd + 14, O.x - 8, settle],
    [K.straighten, O.x - 6],
    [K.connect - 4, O.x - 2, ease.cubicInOut],
    [K.connect + 2, O.x - 26, ease.cubicOut], // the connecting gesture
    [K.kaveyGlideStart, O.x - 20],
    [K.kaveyGlideEnd, P.x, glide],
    [840, P.x],
    [864, Q.x, settle],
    [K.anticipation, Q.x],
    [K.sweep, Q.x + 20, ease.cubicOut], // anticipation: shift down-right
  ];
  const yKeys: Key[] = [
    [0, O.y],
    [K.slipEnd, O.y + 6, ease.cubicIn],
    [K.slipEnd + 14, O.y, settle],
    [K.connect, O.y],
    [K.kaveyGlideStart, O.y - 4],
    [K.kaveyGlideEnd, P.y, glide],
    [840, P.y],
    [864, Q.y, settle],
    [K.anticipation, Q.y],
    [K.sweep, Q.y + 20, ease.cubicOut],
  ];
  const hKeys: Key[] = [
    [0, O.height],
    [K.kaveyGlideStart, O.height],
    [K.kaveyGlideEnd, P.height, glide],
    [840, P.height],
    [864, Q.height, settle],
  ];
  let x = track(f, xKeys);
  let y = track(f, yKeys);
  let height = track(f, hKeys);

  // Shot 8: accelerate along a curve toward (510, 770) — cubic ease-in.
  if (f >= K.sweep && f < K.swap) {
    const u = ease.cubicIn(invLerp(K.sweep, K.cross + 6, f));
    const p0 = {x: Q.x + 20, y: Q.y + 20};
    const p1 = {x: 700, y: 760}; // control: swings up before cutting left
    const p2 = {x: 510, y: 770};
    const v = Math.min(u, 1);
    x = (1 - v) * (1 - v) * p0.x + 2 * (1 - v) * v * p1.x + v * v * p2.x;
    y = (1 - v) * (1 - v) * p0.y + 2 * (1 - v) * v * p1.y + v * v * p2.y;
    // continues past the target under the ribbon
    const over = invLerp(K.cross + 6, K.swap, f);
    x -= 60 * over;
    y -= 40 * over;
    height = lerp(Q.height, Q.height * 1.08, u);
  }
  if (f >= K.swap) {
    // Repositioned under full occlusion into the composed ending.
    x = E.cx;
    y = E.cy;
    height = endingHeight();
  }
  return {x, y, height};
};

/** Hover amplitude by context: 8 px default, 3 px while inspecting, 4 px at the end. */
const hoverAmp = (f: number) =>
  track(f, [
    [0, 3],
    [K.straighten, 3],
    [K.kaveyGlideEnd, 8],
    [300, 8],
    [312, 3],
    [708, 3],
    [724, 8],
    [960, 8],
    [972, 0],
    [K.swap, 0],
    [K.swap + 1, 4],
  ]);

const hoverAt = (f: number) => {
  const t = f / FPS;
  // Plan: 8 · sin(2π t / 2.8); a slow secondary term keeps it from reading as a loop.
  return hoverAmp(f) * (Math.sin((2 * Math.PI * t) / 2.8) + 0.18 * Math.sin((2 * Math.PI * t) / 4.3 + 1.1)) / 1.1;
};

export const kaveyPose = (f: number): KaveyPose => {
  const {x, y, height} = basePath(f);
  const hover = hoverAt(f);

  // ---- roll (lean) -------------------------------------------------------
  const rotKeys: Key[] = [
    [0, -5], // reaching for the slipping panel
    [K.slipEnd, -6.5, ease.cubicIn],
    [K.slipEnd + 16, -3, settle],
    [K.paymentShift, -3],
    [K.paymentShift + 8, -4.5, ease.cubicOut], // glance at payment
    [K.reminderShift, -4],
    [K.reminderShift + 8, -5.5, ease.cubicOut], // glance at reminder
    [K.straighten, -4.5],
    [K.connect - 6, 0.5, ease.cubicInOut], // straightens, looks at connector
    [K.connect - 2, 2.2, ease.cubicOut], // wind-up
    [K.connect + 4, -6, ease.cubicOut], // intentional connecting gesture
    [K.kaveyGlideStart + 6, -2],
    [K.kaveyGlideStart + 18, 3, ease.cubicInOut], // leans into the glide
    [K.kaveyGlideEnd + 8, -0.6, settle],
    [288, -0.6],
    [300, -2.2, ease.cubicInOut], // examines the brief
    [420, -2.2],
    [436, -1.5],
    [580, -2.5],
    [596, 0, ease.cubicInOut], // back to the viewer
    [640, 0],
    [700, 0.5],
    [744, -1.5],
    [770, -3.5, settle], // presents the handoff tile
    [800, -2.5],
    [840, -1],
    [864, -3, settle], // presents the proof
    [K.anticipation, -3],
    [K.sweep, -8, ease.cubicOut], // lean 8° toward upper-left
    [K.cross, -11, ease.cubicIn],
    [K.swap, -12],
    [K.swap + 1, -2.5],
    [1034, 0, settle],
  ];
  let rot = track(f, rotKeys);

  // Build: head follows the pulse down the node column, then returns.
  if (f >= 426 && f < 596) {
    const p = pulse(f);
    const follow = envelopeLite(f, 428, 440, 560, 590);
    const target = p.visible ? p.y : lerp(655, 1065, invLerp(438, 534, f));
    rot += follow * lerp(1.5, -4.5, clamp((target - 640) / 440));
  }

  // ---- turn (rotateY, ≤ 15°) --------------------------------------------
  const turn = track(f, [
    [0, -9],
    [K.slipEnd, -11],
    [K.slipEnd + 20, -7, settle],
    [K.straighten, -7],
    [K.connect, -5],
    [K.kaveyGlideStart, -9],
    [K.kaveyGlideEnd, -4, glide],
    [300, -6],
    [420, -6],
    [590, -6],
    [606, 0, ease.cubicInOut],
    [744, -2],
    [770, -7, settle],
    [830, -5],
    [864, -8, settle],
    [K.anticipation, -8],
    [K.cross, -15, ease.cubicIn],
    [K.swap, -15],
    [K.swap + 1, -4],
    [1036, 0, settle],
    [K.glanceStart, 0],
    [K.glanceStart + 14, -3, ease.cubicInOut],
    [K.glanceEnd, -3],
    [K.glanceEnd + 16, 0, ease.cubicInOut],
  ]);

  // ---- pitch: nods (4°) and the glance to the URL -------------------------
  const nod = (at: number, deg: number) => {
    if (f < at || f > at + 18) return 0;
    return deg * Math.sin((Math.PI * (f - at)) / 18);
  };
  let pitch = nod(K.scopeChecks, 4) + nod(K.approve, 4);
  // Build: tilt down as the pulse descends.
  if (f >= 426 && f < 600) pitch += envelopeLite(f, 430, 450, 556, 590) * lerp(0, 5, invLerp(438, 540, f));
  // Ending: glance toward the website below, then back to the viewer.
  pitch += tween(f, K.glanceStart, K.glanceStart + 14, 0, 6, ease.cubicInOut) * (1 - tween(f, K.glanceEnd, K.glanceEnd + 16, 0, 1, ease.cubicInOut));

  // ---- lift (Day 7): rises 24 px over 18 frames, proud settle -------------
  const lift = f < K.lift ? 0 : f < K.lift + 18 ? -24 * ease.cubicOut(invLerp(K.lift, K.lift + 18, f)) : -24 + 24 * settle(invLerp(K.lift + 18, K.lift + 48, f)) + ring(f, K.lift + 18, 2.5, 20, 10);

  // Impact reactions: the catch pushes back into the body.
  const catchKick = ring(f, K.slipEnd, 3, 12, 6);
  const nodDip = (bump(f, K.scopeChecks + 9, 9) + bump(f, K.approve + 9, 9)) * 5;

  const energy = clamp(
    0.25 +
      0.6 * bump(f, K.connect + 6, 24) +
      0.35 * bump(f, K.live + 8, 30) +
      0.8 * invLerp(K.sweep, K.cross, f) * (f < K.swap ? 1 : 0) +
      0.3 * (f >= K.swap ? 1 - invLerp(K.swap, 1040, f) : 0),
  );

  return {
    x: x + catchKick,
    y: y + hover + lift + nodDip,
    height,
    rot,
    turn,
    pitch,
    hover,
    energy,
    visible: 1,
  };
};

function envelopeLite(f: number, a: number, b: number, c: number, d: number) {
  if (f <= a || f >= d) return 0;
  if (f < b) return ease.cubicInOut((f - a) / (b - a));
  if (f <= c) return 1;
  return 1 - ease.cubicInOut((f - c) / (d - c));
}

export const PERSPECTIVE = 1600;

/** Full transform from source pixels to screen, shared by CSS and anchors. */
export const kaveyMatrix = (pose: KaveyPose): M4 => {
  const s = pose.height / B.h;
  const pv = KAVEY_SRC.anchors.pivot;
  const cx = B.x + B.w / 2;
  const cy = B.y + B.h / 2;
  const sx = pose.x + (pv.x - cx) * s;
  const sy = pose.y + (pv.y - cy) * s;
  return chain(T(sx, sy), Rz(rad(pose.rot)), P(PERSPECTIVE), Ry(rad(pose.turn)), Rx(rad(-pose.pitch)), S(s), T(-pv.x, -pv.y));
};

/** Screen position of a source-pixel anchor under the current pose. */
export const anchorAt = (f: number, name: keyof typeof KAVEY_SRC.anchors) => {
  const a = KAVEY_SRC.anchors[name] as {x: number; y: number};
  return project(kaveyMatrix(kaveyPose(f)), a.x, a.y);
};
