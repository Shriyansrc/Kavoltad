// Kavey's performance in Chaos City. Keys are authored in "base screen" space
// (the camera path without shake or punch-ins), so he reads at a steady size
// while the world moves; CityFilm then maps him through the live camera so he
// shares every shake and punch-in. Same rig and limits as the 20 s film:
// whole-body acting, |turn| ≤ 15°, squash ≤ 7 %, spring follow-through on the
// flames, hand gestures, the cube, blinks, gaze and eye glow size.
import {KAVEY_SRC} from '../config/kavey.ts';
import {LAYOUT} from '../config/layout.ts';
import {FPS} from '../config/video.ts';
import {bump, clamp, ease, glide, invLerp, lerp, ring, settle, track, type Key} from '../lib/anim.ts';
import {anchorOf, followThrough, kaveyMatrix, type KaveyPose} from '../scenes/kavey.ts';
import {project} from '../lib/mat4.ts';
import {baseToScreen, baseToWorld, worldToBase} from './camera.ts';
import {C, CITY_FRAMES} from './config.ts';
import {THROWS} from './story.ts';
import {SHOP} from './world/shop.ts';

const B = KAVEY_SRC.bbox;
// Every key here starts and ends at rest, so eases must too (C1-continuous):
// `snap` gets up to speed in ~1–2 frames then decelerates long (lunges,
// throws, recoils); `soft` is the settle from one rest pose to the next.
const snap = ease.bezier(0.3, 0, 0.1, 1);
const soft = ease.bezier(0.45, 0, 0.2, 1);
const HOME = {x: 770, y: 1130, h: 480};
const E = LAYOUT.ending.kavey;
const END_H = Math.min(E.maxH, (E.maxW / B.w) * B.h, B.h);

// Where he perches on the SALON sign during the hook (world), and his world height there.
const PERCH_H = 470;
const PERCH = {x: 640, y: SHOP.signTop - PERCH_H * 0.36};

// ------------------------------------------------------------------ root path (base screen)
const X: Key[] = [
  [160, HOME.x],
  // salon
  [228, HOME.x],
  [238, HOME.x + 44, snap],
  [258, HOME.x + 18, soft],
  [278, HOME.x - 14],
  [294, HOME.x + 22, snap],
  [300, HOME.x + 22],
  [306, HOME.x - 34, snap],
  [330, HOME.x - 8, soft],
  [440, HOME.x],
  // pan to gym: anticipation, dash ahead, settle
  [452, HOME.x - 26, snap],
  [478, HOME.x + 70, ease.cubicInOut],
  [508, HOME.x, soft],
  // gym: the grab that misses
  [548, HOME.x],
  [556, HOME.x - 64, snap],
  [566, HOME.x - 80],
  [584, HOME.x - 10, soft],
  [594, HOME.x + 22, snap],
  [600, HOME.x + 22],
  [606, HOME.x - 34, snap],
  [630, HOME.x - 8, soft],
  [740, HOME.x],
  [752, HOME.x - 26, snap],
  [778, HOME.x + 70, ease.cubicInOut],
  [808, HOME.x, soft],
  // clinic: leans in to the sleeping clock, waves, gets an idea, throws
  [816, HOME.x - 46, ease.cubicInOut],
  [868, HOME.x - 46],
  [880, HOME.x - 10, snap],
  [894, HOME.x + 22, snap],
  [900, HOME.x + 22],
  [906, HOME.x - 34, snap],
  [930, HOME.x - 8, soft],
  [996, HOME.x - 8],
  [1002, HOME.x + 30, snap],
  [1020, HOME.x, soft],
  [1060, HOME.x],
  // build: up beside the product
  [1124, 858, glide],
  [1170, 858],
  [1176, 884, snap],
  [1196, 858, soft],
  [1440, 858],
  // proof
  [1496, 790, ease.cubicInOut],
  [1510, 790],
  [1542, 846, ease.cubicInOut],
];
const Y: Key[] = [
  [160, HOME.y],
  [228, HOME.y],
  [238, HOME.y - 54, snap],
  [258, HOME.y - 6, soft],
  [288, HOME.y],
  [294, HOME.y + 12, snap],
  [300, HOME.y + 12],
  [306, HOME.y - 18, snap],
  [330, HOME.y, soft],
  [440, HOME.y],
  [452, HOME.y + 10],
  [478, HOME.y - 40, ease.cubicInOut],
  [508, HOME.y, soft],
  [548, HOME.y],
  [556, HOME.y - 70, snap],
  [566, HOME.y - 78],
  [584, HOME.y, soft],
  [594, HOME.y + 12, snap],
  [600, HOME.y + 12],
  [606, HOME.y - 18, snap],
  [630, HOME.y, soft],
  [740, HOME.y],
  [752, HOME.y + 10],
  [778, HOME.y - 40, ease.cubicInOut],
  [808, HOME.y, soft],
  [816, HOME.y + 24, ease.cubicInOut],
  [868, HOME.y + 24],
  [880, HOME.y - 20, snap],
  [894, HOME.y + 12, snap],
  [900, HOME.y + 12],
  [906, HOME.y - 18, snap],
  [930, HOME.y, soft],
  [996, HOME.y],
  [1002, HOME.y - 44, snap],
  [1020, HOME.y, soft],
  [1060, HOME.y],
  [1124, 866, glide],
  [1440, 866],
  [1496, 1150, ease.cubicInOut],
  [1510, 1150],
  [1542, 934, ease.cubicInOut],
];
const H: Key[] = [
  [160, HOME.h],
  [1060, HOME.h],
  [1124, 380, glide],
  [1440, 380],
  [1496, 470, ease.cubicInOut],
  [1510, 470],
  [1542, 430, ease.cubicInOut],
];

/** Extra lift for hops and the launch jump (px, up positive). */
const lift = (f: number) => {
  let up = 0;
  const hop = (at: number, h: number, len: number) => (f > at && f < at + len ? h * Math.pow(Math.sin((Math.PI * (f - at)) / len), 1.5) : 0);
  up += hop(C.salonChecks, 46, 26) + hop(C.gymChecks, 46, 26) + hop(C.clinicWake + 12, 30, 22) + hop(1314, 22, 20);
  // launch: squat is in squash, then a big jump, land at +40
  up += hop(C.launch - 2, 130, 44);
  // flinch on every clash
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
  if (f < 100) return perchAt(f);
  if (f < 160) {
    // Hop off the sign: blend from the (still moving) perch to HOME with an
    // arc; weights start and end at rest, so velocity stays continuous.
    const A = perchAt(f);
    const u = invLerp(100, 160, f);
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
  const amp = f >= 52 && f < 100 ? 2 : f >= C.swap ? 4 : 7;
  return (amp * (Math.sin((2 * Math.PI * t) / 2.6) + 0.18 * Math.sin((2 * Math.PI * t) / 4.1 + 1.1))) / 1.1;
};

// ------------------------------------------------------------------ lean / turn
const ROT: Key[] = [
  [0, 26],
  [44, 18],
  [52, -9, snap],
  [72, 2, soft],
  [96, 0],
  [102, -7, snap],
  [116, 9, snap],
  [160, 0, soft],
  [200, -2],
  [228, -1],
  [238, 11, snap],
  [258, 2, soft],
  [278, -6],
  [294, 9, snap],
  [300, 9],
  [306, -12, snap],
  [330, -2, soft],
  [440, -1],
  [452, -7, snap],
  [470, 13, ease.cubicInOut],
  [508, -1, soft],
  [548, -2],
  [556, -15, snap],
  [566, -16],
  [584, -2, soft],
  [594, 9, snap],
  [600, 9],
  [606, -12, snap],
  [630, -2, soft],
  [740, -1],
  [752, -7, snap],
  [770, 13, ease.cubicInOut],
  [808, -1, soft],
  [816, -10, ease.cubicInOut],
  [868, -10],
  [880, 3, snap],
  [894, 9, snap],
  [900, 9],
  [906, -12, snap],
  [930, -2, soft],
  [996, -2],
  [1002, 9, snap],
  [1020, 0, soft],
  [1060, 0],
  [1088, 12, ease.cubicInOut],
  [1124, -2, soft],
  [1170, -2],
  [1176, 7, snap],
  [1196, -2, soft],
  [1372, -2],
  [1378, 3],
  [1390, -5, snap],
  [1424, 0, soft],
  [1440, 0],
  [1470, -4],
  [1500, -2],
  [1528, 7, ease.cubicInOut],
  [1556, -3, soft],
  [1566, -3],
  [1574, 4, snap],
  [1590, -11, ease.cubicIn],
  [1604, -12],
  [1605, -3],
  [1640, 0, soft],
];
const TURN: Key[] = [
  [0, 12],
  [52, 10],
  [72, -8, soft],
  [100, -8],
  [160, -10],
  [440, -10],
  [452, -8],
  [470, 12, ease.cubicInOut],
  [496, 5],
  [520, -11, soft],
  [740, -11],
  [752, -8],
  [770, 12, ease.cubicInOut],
  [796, 5],
  [822, -13, soft],
  [1060, -10],
  [1096, 6, ease.cubicInOut],
  [1124, -8, soft],
  [1372, -8],
  [1384, 0, snap],
  [1430, -4],
  [1446, -9, ease.cubicInOut],
  [1528, -9],
  [1556, -14, ease.cubicInOut],
  [1574, -14],
  [1590, -15, ease.cubicIn],
  [1604, -15],
  [1605, -5],
  [1640, 0, soft],
];

// ------------------------------------------------------------------ squash
const squashAt = (f: number) => {
  let sy = 1 + 0.01 * Math.sin((2 * Math.PI * f) / (FPS * 2.2));
  sy += ring(f, 52, -0.065, 14, 7); // lands on the sign
  sy -= 0.05 * bump(f, 100, 6);
  sy += 0.05 * bump(f, 110, 8);
  sy += ring(f, 160, -0.03, 16, 8);
  for (const h of C.clashHits) sy += ring(f, h, -0.02, 10, 5);
  sy += 0.055 * bump(f, 234, 8); // surprise stretch
  for (const t of THROWS) {
    sy -= 0.05 * bump(f, t.windup + 8, 7);
    sy += 0.055 * bump(f, t.release + 3, 6);
    sy += ring(f, t.back1, -0.03, 10, 5); // catches the cube
  }
  sy += 0.05 * bump(f, 556, 7); // the grab
  sy -= 0.05 * bump(f, C.salonChecks - 2, 5) + 0.05 * bump(f, C.gymChecks - 2, 5);
  sy += 0.04 * bump(f, C.salonChecks + 8, 8) + 0.04 * bump(f, C.gymChecks + 8, 8);
  for (const at of [452, 752]) {
    sy -= 0.04 * bump(f, at, 6);
    sy += 0.04 * bump(f, at + 12, 10);
  }
  sy += 0.05 * bump(f, 1002, 7); // startled by the alarm
  sy += ring(f, C.holoMerge + 2, -0.03, 12, 6);
  // launch jump: squat, stretch, land
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
const HAND_L: Key[] = [
  [0, -22],
  [48, -18],
  [54, 8, snap],
  [74, 0, soft],
  [228, 0],
  [236, -30, snap],
  [262, -4, soft],
  [C.salonChecks, -4],
  [C.salonChecks + 6, -28, snap],
  [C.salonChecks + 34, -2, soft],
  [548, -2],
  [556, -36, snap],
  [570, -30],
  [586, 0, soft],
  [C.gymChecks, 0],
  [C.gymChecks + 6, -28, snap],
  [C.gymChecks + 34, -2, soft],
  [996, -2],
  [1002, -26, snap],
  [1024, -2, soft],
  [1096, -2],
  [1106, -34, snap],
  [1166, -30],
  [1178, -8, soft],
  [C.launch - 2, -4],
  [C.launch + 6, -36, snap],
  [C.launch + 50, -10, soft],
  [1530, -10],
  [1542, -30, snap],
  [1566, -24],
  [1576, -10],
  [1604, -10],
  [1605, 0],
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
    [1446, -4],
    [1456, -22, snap],
    [1500, -12, soft],
    [1604, -12],
    [1605, 0],
  );
  return k;
};
const HAND_R = handRKeys();

// ------------------------------------------------------------------ eyes
const BLINKS = [40, 146, 214, 280, 342, 430, 530, 644, 724, 858, 944, 1052, 1150, 1244, 1336, 1470, 1520, 1666, 1742];
const HAPPY = [
  [C.salonChecks + 2, C.salonChecks + 34],
  [C.gymChecks + 2, C.gymChecks + 34],
  [C.clinicWake + 14, C.clinicWake + 44],
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
    else b = Math.max(b, 1 - snap((d - 1) / 7));
  }
  // happy squint
  for (const [a, z] of HAPPY) b = Math.max(b, 0.42 * (snap(invLerp(a, a + 5, f)) - ease.cubicIn(invLerp(z - 6, z, f))));
  // squeezes at each clash
  for (const h of C.clashHits.slice(1)) b = Math.max(b, 0.55 * bump(f, h + 2, 5));
  return clamp(b);
};
const eyeScaleAt = (f: number) =>
  1 + 0.34 * (snap(invLerp(230, 234, f)) - ease.cubicIn(invLerp(250, 262, f))) + 0.24 * bump(f, 566, 12) + 0.3 * bump(f, 1004, 14) + 0.18 * bump(f, C.holoMerge + 4, 12) + 0.16 * bump(f, 876, 10);

const GAZE_X: Key[] = [
  [0, 4],
  [52, 0],
  [62, -4, ease.cubicInOut],
  [80, 3, ease.cubicInOut],
  [96, -4],
  [160, -5],
  [384, -5],
  [396, -2, ease.cubicInOut],
  [440, 0],
  [462, 4, ease.cubicInOut],
  [508, -4],
  [514, 1],
  [524, -4],
  [540, 2],
  [548, -5],
  [632, -5],
  [700, -3],
  [740, 0],
  [762, 4, ease.cubicInOut],
  [808, -5],
  [1004, -5],
  [1016, -2, ease.cubicInOut],
  [1060, 0],
  [1124, -5, ease.cubicInOut],
  [1374, -5],
  [1384, 0, snap],
  [1440, -2],
  [1448, -5, ease.cubicInOut],
  [1600, -5],
  [C.swap, 0],
  [C.glanceStart, 0],
  [C.glanceStart + 10, -1, ease.cubicInOut],
  [C.glanceEnd, -1],
  [C.glanceEnd + 14, 0, ease.cubicInOut],
];
const GAZE_Y: Key[] = [
  [0, 2],
  [52, 3],
  [96, 2],
  [160, 1],
  [186, -3, ease.cubicInOut],
  [206, 1, ease.cubicInOut],
  [300, 1],
  [440, 0],
  [496, -2],
  [540, -3],
  [556, -4],
  [584, 0],
  [620, -2],
  [676, 0],
  [796, 3, ease.cubicInOut],
  [900, 1],
  [926, -4, ease.cubicInOut],
  [988, -3],
  [998, 1, ease.cubicInOut],
  [1060, 0],
  [1124, -2],
  [1374, -2],
  [1386, -4, snap],
  [1430, 0],
  [1530, 0],
  [1540, -3, ease.cubicInOut],
  [1600, -1],
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
  pitch += nod(1314, 6) + nod(1226, 3, 12) + nod(1250, 3, 12);
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
  const wave = f > 824 && f < 868 ? 16 * Math.sin((f - 824) * 0.55) * Math.sin((Math.PI * (f - 824)) / 44) : 0;
  const conduct = f > 1210 && f < 1282 ? 9 * Math.sin((f - 1210) * 0.42) * Math.sin((Math.PI * (f - 1210)) / 72) : 0;
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
