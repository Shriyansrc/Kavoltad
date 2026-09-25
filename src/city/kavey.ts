// Kavey's performance in Chaos City. Keys are authored in "base screen" space
// (the camera path without shake or punch-ins), so he reads at a steady size
// while the world moves; CityFilm then maps him through the live camera so he
// shares every shake and punch-in. Same rig and limits as the 20 s film:
// whole-body acting, |turn| ≤ 15°, squash ≤ 7 %, spring follow-through on the
// flames, hand gestures, the cube, blinks, gaze and eye glow size.
import {KAVEY_SRC} from '../config/kavey.ts';
import {FPS} from '../config/video.ts';
import {bump, clamp, ease, glide, invLerp, lerp, ring, track, type Key} from '../lib/anim.ts';
import {anchorOf, followThrough, kaveyMatrix, type KaveyPose} from '../scenes/kavey.ts';
import {project} from '../lib/mat4.ts';
import {baseToScreen, baseToWorld, worldToBase} from './camera.ts';
import {C, CITY_FRAMES, PANS} from './config.ts';
import {THROWS} from './story.ts';
import {SHOP} from './world/shop.ts';

const B = KAVEY_SRC.bbox;
// Every key here starts and ends at rest, so eases must too (C1-continuous):
// `snap` gets up to speed in ~1–2 frames then decelerates long (lunges,
// throws, recoils); `soft` is the settle from one rest pose to the next.
const snap = ease.bezier(0.3, 0, 0.1, 1);
const soft = ease.bezier(0.45, 0, 0.2, 1);
const HOME = {x: 770, y: 1130, h: 480};
// Ending: on the global stage (see GlobalStage.tsx).
const E = {cx: 540, cy: 1030};
const END_H = 520;

// Where he perches on the SALON sign during the hook (world), and his world height there.
const PERCH_H = 470;
const PERCH = {x: 640, y: SHOP.signTop - PERCH_H * 0.36};

// ------------------------------------------------------------------ root path (base screen)
const SHOW = {x: 800, y: 1190, h: 360}; // below-right of the showcase devices
const HAND = {x: 790, y: 1150, h: 470}; // handoff close-up
const BOARD_POS = {x: 846, y: 934, h: 430}; // beside the billboard

/** Wind-up and throw (x offsets from base b, starting from offset pre). */
const throwX = (T: number, b: number, pre = 0): Key[] => [
  [T - 12, b + pre],
  [T - 6, b + 22, snap],
  [T, b + 22],
  [T + 6, b - 34, snap],
  [T + 30, b - 8, soft],
];
const throwY = (T: number, b: number, pre = 0): Key[] => [
  [T - 12, b + pre],
  [T - 6, b + 12, snap],
  [T, b + 12],
  [T + 6, b - 18, snap],
  [T + 30, b, soft],
];
/** Anticipation, dash ahead of the camera, settle. */
const dashX = (P: number, b: number): Key[] => [
  [P - 4, b],
  [P + 8, b - 26, snap],
  [P + 34, b + 70, ease.cubicInOut],
  [P + 64, b, soft],
];
const dashY = (P: number, b: number): Key[] => [
  [P - 4, b],
  [P + 8, b + 10, snap],
  [P + 34, b - 40, ease.cubicInOut],
  [P + 64, b, soft],
];

const X: Key[] = [
  [C.home, HOME.x],
  // salon: surprise at the clashes, lean in, throw
  [C.salonSurprise - 2, HOME.x],
  [C.salonSurprise + 8, HOME.x + 44, snap],
  [C.salonSurprise + 28, HOME.x + 18, soft],
  [C.salonThrow - 40, HOME.x - 14],
  ...throwX(C.salonThrow, HOME.x, -14),
  ...dashX(PANS.toGym[0], HOME.x),
  // gym: the grab that misses, then the throw
  [C.gymGrab - 8, HOME.x],
  [C.gymGrab, HOME.x - 64, snap],
  [C.gymGrab + 10, HOME.x - 80],
  [C.gymGrab + 28, HOME.x - 10, soft],
  ...throwX(C.gymThrow, HOME.x, -10),
  ...dashX(PANS.toClinic[0], HOME.x),
  // clinic: leans in to the sleeping clock, waves, gets an idea, throws
  [PANS.toClinic[1] + 28, HOME.x - 46, ease.cubicInOut],
  [C.clinicThrow - 54, HOME.x - 46],
  [C.clinicThrow - 42, HOME.x - 10, snap],
  ...throwX(C.clinicThrow, HOME.x, -10),
  [C.clinicWake, HOME.x - 8],
  [C.clinicWake + 6, HOME.x + 30, snap],
  [C.clinicWake + 24, HOME.x, soft],
  [1640, HOME.x],
  // showcase + build: up beside the devices
  [1706, SHOW.x, glide],
  [C.holoMerge, SHOW.x],
  [C.holoMerge + 6, SHOW.x + 26, snap],
  [C.holoMerge + 26, SHOW.x, soft],
  [2240, SHOW.x],
  // proof
  [2286, HAND.x, ease.cubicInOut],
  [2306, HAND.x],
  [2338, BOARD_POS.x, ease.cubicInOut],
];
const Y: Key[] = [
  [C.home, HOME.y],
  [C.salonSurprise - 2, HOME.y],
  [C.salonSurprise + 8, HOME.y - 54, snap],
  [C.salonSurprise + 28, HOME.y - 6, soft],
  [C.salonThrow - 40, HOME.y],
  ...throwY(C.salonThrow, HOME.y),
  ...dashY(PANS.toGym[0], HOME.y),
  [C.gymGrab - 8, HOME.y],
  [C.gymGrab, HOME.y - 70, snap],
  [C.gymGrab + 10, HOME.y - 78],
  [C.gymGrab + 28, HOME.y, soft],
  ...throwY(C.gymThrow, HOME.y),
  ...dashY(PANS.toClinic[0], HOME.y),
  [PANS.toClinic[1] + 28, HOME.y + 24, ease.cubicInOut],
  [C.clinicThrow - 54, HOME.y + 24],
  [C.clinicThrow - 42, HOME.y - 20, snap],
  ...throwY(C.clinicThrow, HOME.y, -20),
  [C.clinicWake, HOME.y],
  [C.clinicWake + 6, HOME.y - 44, snap],
  [C.clinicWake + 24, HOME.y, soft],
  [1640, HOME.y],
  [1706, SHOW.y, glide],
  [2240, SHOW.y],
  [2286, HAND.y, ease.cubicInOut],
  [2306, HAND.y],
  [2338, BOARD_POS.y, ease.cubicInOut],
];
const H: Key[] = [
  [C.home, HOME.h],
  [1640, HOME.h],
  [1706, SHOW.h, glide],
  [2240, SHOW.h],
  [2286, HAND.h, ease.cubicInOut],
  [2306, HAND.h],
  [2338, BOARD_POS.h, ease.cubicInOut],
];

/** Extra lift for hops and the launch jump (px, up positive). */
const lift = (f: number) => {
  let up = 0;
  const hop = (at: number, h: number, len: number) => (f > at && f < at + len ? h * Math.pow(Math.sin((Math.PI * (f - at)) / len), 1.5) : 0);
  up += hop(C.salonChecks, 46, 26) + hop(C.salonCheer, 30, 22) + hop(C.gymChecks, 46, 26) + hop(C.gymCheer, 34, 22);
  up += hop(C.clinicWake + 12, 30, 22) + hop(C.clinicCheer, 30, 22) + hop(C.day6 + 20, 22, 20);
  for (const d of C.design) up += hop(d - 2, 16, 16);
  up += hop(C.launch - 2, 130, 44);
  for (const h of C.clashHits) up += ring(f, h, 7, 12, 6);
  return up;
};

const bez = (a: {x: number; y: number}, c: {x: number; y: number}, b: {x: number; y: number}, u: number) => ({
  x: (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * c.x + u * u * b.x,
  y: (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * c.y + u * u * b.y,
});

const perchAt = (f: number) => {
  const p = worldToBase(f, PERCH.x, PERCH.y);
  return {x: p.x, y: p.y, h: PERCH_H * p.zoom};
};

const rootAt = (f: number): {x: number; y: number; h: number} => {
  if (f >= C.swap) return {x: E.cx, y: E.cy, h: END_H};
  if (f < 52) {
    // Streaks in from the upper left and brakes onto the sign.
    const L = perchAt(52);
    const u = ease.bezier(0.25, 0.7, 0.35, 1)(invLerp(-4, 52, f));
    const p = bez({x: -320, y: 160}, {x: 160, y: 900}, L, u);
    return {x: p.x, y: p.y, h: lerp(360, L.h, u)};
  }
  if (f < C.hop) return perchAt(f);
  if (f < C.home) {
    // Hop off the sign: blend from the (still moving) perch to HOME with an
    // arc; weights start and end at rest, so velocity stays continuous.
    const A = perchAt(f);
    const u = invLerp(C.hop, C.home, f);
    const w = soft(u);
    const arc = Math.pow(Math.sin(Math.PI * u), 2);
    return {x: lerp(A.x, HOME.x, w) + 70 * arc, y: lerp(A.y, HOME.y, w) - 130 * arc, h: lerp(A.h, HOME.h, w)};
  }
  let x = track(f, X);
  let y = track(f, Y);
  let h = track(f, H);
  y -= lift(f);
  if (f >= C.sweep) {
    // Dash that throws the scarf across the lens (same beat as the 20 s film).
    // keeps accelerating until the ribbon has covered the frame (no stop)
    const u = ease.cubicIn(invLerp(C.sweep, C.swap, f));
    const p0 = {x: 846, y: 934};
    const p = bez(p0, {x: 760, y: 760}, {x: 500, y: 690}, u);
    x = p.x;
    y = p.y;
    h = lerp(430, 430 * 1.08, u);
  }
  return {x, y, h};
};

const hoverAt = (f: number) => {
  const t = f / FPS;
  const amp = f >= 52 && f < C.hop ? 2 : f >= C.swap ? 4 : 7;
  return (amp * (Math.sin((2 * Math.PI * t) / 2.6) + 0.18 * Math.sin((2 * Math.PI * t) / 4.1 + 1.1))) / 1.1;
};

// ------------------------------------------------------------------ lean / turn
const throwRot = (T: number, pre: number): Key[] => [
  [T - 12, pre],
  [T - 6, 9, snap],
  [T, 9],
  [T + 6, -12, snap],
  [T + 30, -2, soft],
];
const dashRot = (P: number): Key[] => [
  [P - 4, -1],
  [P + 8, -7, snap],
  [P + 26, 13, ease.cubicInOut],
  [P + 64, -1, soft],
];
const ROT: Key[] = [
  [0, 26],
  [44, 18],
  [52, -9, snap],
  [72, 2, soft],
  [C.hop - 4, 0],
  [C.hop + 2, -7, snap],
  [C.hop + 16, 9, snap],
  [C.home, 0, soft],
  [C.salonBlocks, -2],
  [C.salonSurprise - 2, -1],
  [C.salonSurprise + 8, 11, snap],
  [C.salonSurprise + 28, 2, soft],
  [C.salonThrow - 40, -6],
  ...throwRot(C.salonThrow, -6),
  ...dashRot(PANS.toGym[0]),
  [C.gymGrab - 8, -2],
  [C.gymGrab, -15, snap],
  [C.gymGrab + 10, -16],
  [C.gymGrab + 28, -2, soft],
  ...throwRot(C.gymThrow, -2),
  ...dashRot(PANS.toClinic[0]),
  [PANS.toClinic[1] + 28, -10, ease.cubicInOut],
  [C.clinicThrow - 54, -10],
  [C.clinicThrow - 42, 3, snap],
  ...throwRot(C.clinicThrow, 3),
  [C.clinicWake, -2],
  [C.clinicWake + 6, 9, snap],
  [C.clinicWake + 24, 0, soft],
  [1640, 0],
  [1668, 12, ease.cubicInOut],
  [1706, -2, soft],
  [C.holoMerge, -2],
  [C.holoMerge + 6, 7, snap],
  [C.holoMerge + 26, -2, soft],
  [C.launch - 6, -2],
  [C.launch, 3],
  [C.launch + 10, -5, snap],
  [C.launch + 44, 0, soft],
  [2256, -4],
  [2286, -2],
  [2320, 7, ease.cubicInOut],
  [2338, -3, soft],
  [C.anticipation, -3],
  [C.sweep, 4, snap],
  [C.cross, -11, ease.cubicIn],
  [C.swap - 1, -12],
  [C.swap, -3],
  [C.swap + 35, 0, soft],
];
const dashTurn = (P: number): Key[] => [
  [P - 4, -10],
  [P + 8, -8],
  [P + 26, 12, ease.cubicInOut],
  [P + 52, 5],
  [P + 78, -12, soft],
];
const TURN: Key[] = [
  [0, 12],
  [52, 10],
  [72, -8, soft],
  [C.hop, -8],
  [C.home, -10],
  ...dashTurn(PANS.toGym[0]),
  ...dashTurn(PANS.toClinic[0]),
  [1640, -10],
  [1676, 6, ease.cubicInOut],
  [1706, -8, soft],
  [C.launch - 6, -8],
  [C.launch + 4, 0, snap],
  [2240, -4],
  [2256, -9, ease.cubicInOut],
  [2320, -9],
  [2338, -14, ease.cubicInOut],
  [C.sweep, -14],
  [C.cross, -15, ease.cubicIn],
  [C.swap - 1, -15],
  [C.swap, -5],
  [C.swap + 35, 0, soft],
];

// ------------------------------------------------------------------ squash
const squashAt = (f: number) => {
  let sy = 1 + 0.01 * Math.sin((2 * Math.PI * f) / (FPS * 2.2));
  sy += ring(f, 52, -0.065, 14, 7); // lands on the sign
  sy -= 0.05 * bump(f, C.hop, 6);
  sy += 0.05 * bump(f, C.hop + 10, 8);
  sy += ring(f, C.home, -0.03, 16, 8);
  for (const h of C.clashHits) sy += ring(f, h, -0.02, 10, 5);
  sy += 0.055 * bump(f, C.salonSurprise + 4, 8);
  for (const t of THROWS) {
    sy -= 0.05 * bump(f, t.windup + 8, 7);
    sy += 0.055 * bump(f, t.release + 3, 6);
    sy += ring(f, t.back1, -0.03, 10, 5);
  }
  sy += 0.05 * bump(f, C.gymGrab, 7);
  for (const at of [C.salonChecks, C.gymChecks, C.salonCheer, C.gymCheer, C.clinicCheer]) {
    sy -= 0.045 * bump(f, at - 2, 5);
    sy += 0.04 * bump(f, at + 8, 8);
  }
  for (const at of [PANS.toGym[0] + 8, PANS.toClinic[0] + 8]) {
    sy -= 0.04 * bump(f, at, 6);
    sy += 0.04 * bump(f, at + 12, 10);
  }
  sy += 0.05 * bump(f, C.clinicWake + 6, 7);
  sy += ring(f, C.holoMerge + 2, -0.03, 12, 6);
  sy -= 0.065 * bump(f, C.launch - 4, 7);
  sy += 0.06 * bump(f, C.launch + 8, 9);
  sy -= 0.05 * bump(f, C.launch + 42, 6);
  sy += ring(f, C.launch + 46, 0.02, 16, 8);
  sy -= 0.045 * bump(f, C.anticipation + 3, 6);
  sy += 0.05 * bump(f, C.sweep + 12, 10) * (f < C.swap ? 1 : 0);
  if (f >= C.swap) sy += ring(f, C.swap, -0.03, 20, 10);
  sy = clamp(sy, 0.93, 1.07);
  return {sx: 1 + (1 - sy) * 0.8, sy};
};

// ------------------------------------------------------------------ hands
const cheerL = (at: number): Key[] => [
  [at, -2],
  [at + 6, -28, snap],
  [at + 34, -2, soft],
];
const HAND_L: Key[] = [
  [0, -22],
  [48, -18],
  [54, 8, snap],
  [74, 0, soft],
  [C.salonSurprise - 2, 0],
  [C.salonSurprise + 6, -30, snap],
  [C.salonSurprise + 32, -4, soft],
  ...cheerL(C.salonChecks),
  [C.gymGrab - 8, -2],
  [C.gymGrab, -36, snap],
  [C.gymGrab + 14, -30],
  [C.gymGrab + 30, 0, soft],
  ...cheerL(C.gymChecks),
  ...cheerL(C.clinicWake),
  [1740, -2],
  [1750, -34, snap],
  [C.holoMerge, -30],
  [C.holoMerge + 8, -8, soft],
  [C.launch - 2, -4],
  [C.launch + 6, -36, snap],
  [C.launch + 50, -10, soft],
  [C.fcnReveal - 4, -10],
  [C.fcnReveal + 8, -30, snap],
  [C.anticipation, -24],
  [C.anticipation + 10, -10],
  [C.swap - 1, -10],
  [C.swap, 0],
  [C.reveal + 18, 0],
  [C.reveal + 28, -30, snap],
  [C.reveal + 96, -26],
  [C.reveal + 116, 0, soft],
];
const handRKeys = (): Key[] => {
  const k: Key[] = [
    [0, -12],
    [52, 8, snap],
    [74, 2, soft],
  ];
  for (const t of THROWS) {
    k.push([t.windup, 2], [t.windup + 8, 26, snap], [t.release - 2, 26], [t.release + 2, -30, snap], [t.release + 26, 2, soft]);
  }
  k.push(
    [C.launch - 2, 2],
    [C.launch + 6, -26, snap],
    [C.launch + 50, -4, soft],
    [C.tiles, -4],
    [C.tiles + 10, -22, snap],
    [C.tiles + 50, -12, soft],
    [C.swap - 1, -12],
    [C.swap, 0],
  );
  return k;
};
const HAND_R = handRKeys();

// ------------------------------------------------------------------ eyes
const BLINKS = [40, 146, 240, 330, 450, 520, 610, 690, 760, 860, 990, 1100, 1180, 1260, 1320, 1470, 1600, 1690, 1840, 1990, 2090, 2230, 2300, 2420, 2560, 2640, 2760, 2840];
const HAPPY = [
  [C.salonChecks + 2, C.salonCheer + 30],
  [C.gymChecks + 2, C.gymCheer + 30],
  [C.clinicWake + 14, C.clinicCheer + 30],
  [C.design[0], C.design[4] + 20],
  [C.launch + 6, C.launch + 56],
  [C.reveal + 2, C.reveal + 30],
] as const;
const blinkAt = (f: number) => {
  let b = 0;
  for (const s of BLINKS) {
    const d = f - s;
    if (d < -3 || d > 8) continue;
    if (d < 0) b = Math.max(b, ease.cubicIn((d + 3) / 3));
    else if (d < 1) b = 1;
    else b = Math.max(b, 1 - ease.cubicOut((d - 1) / 7));
  }
  for (const [a, z] of HAPPY) b = Math.max(b, 0.42 * (ease.cubicOut(invLerp(a, a + 5, f)) - ease.cubicIn(invLerp(z - 6, z, f))));
  for (const h of C.clashHits.slice(1)) b = Math.max(b, 0.55 * bump(f, h + 2, 5));
  return clamp(b);
};
const eyeScaleAt = (f: number) =>
  1 +
  0.34 * (ease.cubicOut(invLerp(C.salonSurprise, C.salonSurprise + 4, f)) - ease.cubicIn(invLerp(C.salonSurprise + 20, C.salonSurprise + 32, f))) +
  0.24 * bump(f, C.gymGrab + 10, 12) +
  0.3 * bump(f, C.clinicWake + 8, 14) +
  0.18 * bump(f, C.holoMerge + 4, 12) +
  0.16 * bump(f, C.clinicThrow - 40, 10);

const GAZE_X: Key[] = [
  [0, 4],
  [52, 0],
  [62, -4, ease.cubicInOut],
  [80, 3, ease.cubicInOut],
  [C.hop - 6, -4],
  [C.home, -5],
  [C.salonWalkIn, -5],
  [C.salonWalkIn + 12, -2, ease.cubicInOut],
  [PANS.toGym[0] - 4, 0],
  [PANS.toGym[0] + 18, 4, ease.cubicInOut],
  [PANS.toGym[1] + 6, -4],
  [C.planesOut[0], -3],
  [C.planesOut[1], 2],
  [C.planesOut[2], -4],
  [C.planesOut[3], 1],
  [C.gymGrab - 8, -5],
  [C.gymChecks, -3],
  [PANS.toClinic[0] - 4, 0],
  [PANS.toClinic[0] + 18, 4, ease.cubicInOut],
  [PANS.toClinic[1] + 6, -5],
  [C.clinicWalk, -5],
  [C.clinicWalk + 12, -2, ease.cubicInOut],
  [1640, 0],
  [1706, -5, ease.cubicInOut],
  [C.launch - 6, -5],
  [C.launch + 4, 0, snap],
  [2246, -2],
  [2256, -5, ease.cubicInOut],
  [C.swap - 5, -5],
  [C.swap, 0],
  [C.glanceStart, 0],
  [C.glanceStart + 10, -1, ease.cubicInOut],
  [C.glanceEnd, -1],
  [C.glanceEnd + 14, 0, ease.cubicInOut],
];
const GAZE_Y: Key[] = [
  [0, 2],
  [52, 3],
  [C.hop, 2],
  [C.home, 1],
  [C.salonBlocks - 4, -3, ease.cubicInOut],
  [C.clashHits[0], 1, ease.cubicInOut],
  [C.salonThrow, 1],
  [PANS.toGym[0], 0],
  [PANS.toGym[1] - 4, -2],
  [C.planesOut[2], -3],
  [C.gymGrab, -4],
  [C.gymGrab + 28, 0],
  [C.planesBack[0] - 30, -2],
  [C.planesBack[3], 0],
  [PANS.toClinic[1] + 12, 3, ease.cubicInOut],
  [C.clinicThrow, 1],
  [C.birds[0] + 2, -4, ease.cubicInOut],
  [C.birdsLand[3] + 4, -3],
  [C.clinicWake + 2, 1, ease.cubicInOut],
  [1640, 0],
  [1706, -2],
  [C.launch - 6, -2],
  [C.launch + 6, -4, snap],
  [C.launch + 44, 0],
  [C.fcnReveal - 4, 0],
  [C.fcnReveal + 6, -3, ease.cubicInOut],
  [C.swap - 5, -1],
  [C.swap, 0],
  [C.glanceStart, 0],
  [C.glanceStart + 10, 4, ease.cubicInOut],
  [C.glanceEnd, 4],
  [C.glanceEnd + 14, 0, ease.cubicInOut],
];

// ------------------------------------------------------------------ follow-through
const flame = followThrough(
  (f) => {
    const r = rootAt(f);
    const hv = hoverAt(f);
    if (f >= C.swap) return {x: r.x, y: r.y + hv, r: track(f, ROT)};
    const w = baseToWorld(f, r.x, r.y + hv);
    return {x: w.x, y: w.y, r: track(f, ROT)};
  },
  CITY_FRAMES + 60,
  [C.swap, C.swap + 1],
);

// ------------------------------------------------------------------ pose
const cubeGone = (f: number) => THROWS.some((t) => f >= t.release && f < t.back1);

export const cityPose = (f: number): KaveyPose => {
  const r = rootAt(f);
  const t = f / FPS;
  const hover = hoverAt(f);
  const {sx, sy} = squashAt(f);
  const nod = (at: number, deg: number, len = 16) => (f < at || f > at + len ? 0 : deg * Math.sin((Math.PI * (f - at)) / len));
  let pitch = 0;
  for (const s of C.salonSnaps) pitch += nod(s, 3, 10);
  pitch += nod(C.day6 + 20, 6) + nod(C.day2 + 10, 3, 12) + nod(C.day2 + 40, 3, 12);
  for (const d of C.design) pitch += nod(d, 3, 12);
  pitch += track(f, [
    [C.glanceStart, 0],
    [C.glanceStart + 14, 5, ease.cubicInOut],
    [C.glanceEnd, 5],
    [C.glanceEnd + 16, 0, ease.cubicInOut],
  ]);
  let charge = 0;
  for (const th of THROWS) charge += invLerp(th.windup - 16, th.release, f) * (f < th.release ? 1 : 0);
  const energy = clamp(
    0.35 + 0.5 * charge + 0.5 * bump(f, C.launch + 6, 30) + 0.8 * invLerp(C.sweep, C.cross, f) * (f < C.swap ? 1 : 0) + 0.5 * bump(f, C.reveal + 4, 20) + 0.4 * bump(f, 26, 30),
  );
  const flash = bump(f, C.launch + 2, 12) + bump(f, C.reveal + 2, 12) + bump(f, C.holoMerge, 10);
  const gone = cubeGone(f);
  const back = THROWS.find((th) => f >= th.back1 && f < th.back1 + 12);
  const catchPop = back ? 0.3 * bump(f, back.back1 + 2, 6) : 0;
  const hop = f >= C.launch - 2 && f < C.launch + 44 ? -40 * Math.sin(Math.PI * invLerp(C.launch - 2, C.launch + 40, f)) : 0;
  // hand gestures layered on the keys: waving at the clock, conducting the build
  const win = (a: number, b: number, rate: number, amp: number) => (f > a && f < b ? amp * Math.sin((f - a) * rate) * Math.sin((Math.PI * (f - a)) / (b - a)) : 0);
  // waving at the sleeping clock; painting the showcase; conducting the build
  const wave = win(1330, 1378, 0.55, 16) + win(C.reveal + 28, C.reveal + 100, 0.5, 14);
  const conduct = win(C.design[0] - 6, C.design[4] + 30, 0.3, 12) + win(C.day2 + 4, C.day6 - 6, 0.42, 9);
  return {
    x: r.x,
    y: r.y + hover,
    height: r.h,
    rot: track(f, ROT) + 0.8 * Math.sin((2 * Math.PI * t) / 3.7),
    turn: track(f, TURN),
    pitch,
    hover,
    sx,
    sy,
    earL: flame('earL', f) + 2.6 * Math.sin((2 * Math.PI * t) / 3.1 + 0.5),
    earR: flame('earR', f) + 3.0 * Math.sin((2 * Math.PI * t) / 2.6 + 1.9),
    tail: flame('tail', f) + 4.5 * Math.sin((2 * Math.PI * t) / 2.3 + 0.3),
    handL: track(f, HAND_L) + wave + conduct + 1.5 * Math.sin((2 * Math.PI * t) / 2.9 + 2.2),
    handR: track(f, HAND_R) + 1.8 * Math.sin((2 * Math.PI * t) / 3.3 + 0.7),
    cube: {
      dx: 3 * Math.sin((2 * Math.PI * t) / 3.4),
      dy: 7 * Math.sin((2 * Math.PI * t) / 2.1 + 0.8) + hop,
      rot: 18 * Math.sin((2 * Math.PI * t) / 5) + (f >= C.launch ? 360 * ease.cubicOut(invLerp(C.launch, C.launch + 40, f)) : 0),
      scale: gone ? 0 : 1 + 0.25 * clamp(flash) + catchPop + 0.12 * charge,
      glow: clamp(0.35 + flash + charge),
    },
    blink: blinkAt(f),
    eyeScale: eyeScaleAt(f),
    gazeX: track(f, GAZE_X),
    gazeY: track(f, GAZE_Y),
    energy,
  };
};

// ------------------------------------------------------------------ anchors
type AnchorName = keyof typeof KAVEY_SRC.anchors;

/** Anchor in base-screen coordinates. */
export const cityAnchorBase = (f: number, name: AnchorName) => anchorOf(cityPose(f), name);

/** Anchor in world coordinates (valid before the ending swap). */
export const cityAnchorWorld = (f: number, name: AnchorName) => {
  const a = cityAnchorBase(f, name);
  return baseToWorld(f, a.x, a.y);
};

/** Anchor on the final screen (camera shake and punch-ins included). */
export const cityAnchorScreen = (f: number, name: AnchorName) => {
  const a = cityAnchorBase(f, name);
  return f >= C.swap ? a : baseToScreen(f, a.x, a.y);
};

/** World size of one source pixel of the rig (for the thrown cube). */
export const cityRigScale = (f: number) => {
  const p = cityPose(f);
  const m = kaveyMatrix(p);
  const a = project(m, 0, 0);
  const b = project(m, 0, 100);
  const base = Math.hypot(b.x - a.x, b.y - a.y) / 100;
  const w0 = baseToWorld(f, 0, 0);
  const w1 = baseToWorld(f, 0, 100);
  return base * (Math.hypot(w1.x - w0.x, w1.y - w0.y) / 100);
};
