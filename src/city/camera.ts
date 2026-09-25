// Camera for Chaos City. The world is laid out in "world pixels" (1:1 with the
// screen at zoom 1). Districts sit side by side on one street; the camera
// cranes down from the sky, travels shop to shop, pulls back for the build,
// tilts to the billboard, and lifts to the sky for the ending.
import {C} from './config.ts';
import {bump, ease, glide, lerp, noise1, ring, track, type Key} from '../lib/anim.ts';

export const DISTRICT = {salon: 540, gym: 1740, clinic: 2940} as const;
export const GROUND = 1460; // storefront base
export const REF = {x: 1740, y: 960};

const X: Key[] = [
  [0, DISTRICT.salon],
  [448, DISTRICT.salon],
  [500, DISTRICT.gym, glide],
  [748, DISTRICT.gym],
  [800, DISTRICT.clinic, glide],
  [1060, DISTRICT.clinic],
  [1124, DISTRICT.gym, glide],
  [1604, DISTRICT.gym],
  [1605, DISTRICT.gym],
];
const Y: Key[] = [
  [0, 120],
  [176, 960, ease.bezier(0.5, 0, 0.2, 1)],
  [1060, 960],
  [1124, 760, glide],
  [1440, 820],
  [1500, 900, ease.cubicInOut],
  [1510, 900],
  [1542, 640, ease.cubicInOut],
  [1604, 600],
  [1605, 40],
];
const Z: Key[] = [
  [0, 0.8],
  [176, 1, ease.bezier(0.5, 0, 0.2, 1)],
  [1060, 1],
  [1124, 0.6, glide],
  [1370, 0.64, ease.sineInOut],
  [1440, 0.64],
  [1500, 0.92, ease.cubicInOut],
  [1510, 0.92],
  [1542, 0.82, ease.cubicInOut],
  [1604, 0.84],
  [1605, 0.72],
];

export type Cam = {cx: number; cy: number; zoom: number; rot: number};

/** Authored camera path without shake or punch-ins (Kavey is keyed against it). */
export const camBase = (f: number): Cam => ({cx: track(f, X), cy: track(f, Y), zoom: track(f, Z), rot: 0});

export const cam = (f: number): Cam => {
  let {cx, cy, zoom} = camBase(f);
  // Punch-ins on each fix and at launch; a small shake on clashes.
  zoom *= 1 + 0.045 * bump(f, C.salonHit + 4, 12) + 0.045 * bump(f, C.gymHit + 4, 12) + 0.045 * bump(f, C.clinicHit + 4, 12) + 0.06 * bump(f, C.launch + 4, 16);
  let shake = 0;
  for (const h of C.clashHits) shake += ring(f, h, 7, 6, 5);
  shake += ring(f, C.land, 6, 7, 5) + ring(f, C.launch, 8, 7, 7);
  cx += shake + 2.5 * noise1(f / 40, 7);
  cy += shake * 0.6 + 2 * noise1(f / 45, 8);
  const rot = 0.25 * noise1(f / 60, 9);
  return {cx, cy, zoom, rot};
};

/** Transform of a layer with parallax p (1 = street, 0 = infinitely far). */
export const layerCam = (f: number, p: number): Cam => {
  const c = cam(f);
  return {
    cx: REF.x + (c.cx - REF.x) * p,
    cy: REF.y + (c.cy - REF.y) * p,
    zoom: 1 + (c.zoom - 1) * Math.max(p, 0.25),
    rot: c.rot * p,
  };
};

export const layerCss = (c: Cam) => `translate(540px, 960px) rotate(${c.rot}deg) scale(${c.zoom}) translate(${-c.cx}px, ${-c.cy}px)`;

export const worldToScreen = (f: number, wx: number, wy: number, p = 1) => {
  const c = layerCam(f, p);
  const r = (c.rot * Math.PI) / 180;
  const dx = (wx - c.cx) * c.zoom;
  const dy = (wy - c.cy) * c.zoom;
  return {x: 540 + dx * Math.cos(r) - dy * Math.sin(r), y: 960 + dx * Math.sin(r) + dy * Math.cos(r), zoom: c.zoom};
};

/** World point → base-camera screen coordinates (no shake, no punch-in). */
export const worldToBase = (f: number, wx: number, wy: number) => {
  const c = camBase(f);
  return {x: 540 + (wx - c.cx) * c.zoom, y: 960 + (wy - c.cy) * c.zoom, zoom: c.zoom};
};

/** Base-camera screen point → world. */
export const baseToWorld = (f: number, sx: number, sy: number) => {
  const c = camBase(f);
  return {x: c.cx + (sx - 540) / c.zoom, y: c.cy + (sy - 960) / c.zoom};
};

/** Base-camera screen point → final screen point (adds shake, punch-in, roll). */
export const baseToScreen = (f: number, sx: number, sy: number) => {
  const w = baseToWorld(f, sx, sy);
  return worldToScreen(f, w.x, w.y);
};

/** CSS transform mapping base-camera screen space into the final camera. */
export const camDeltaCss = (f: number) => {
  const b = camBase(f);
  const c = cam(f);
  return `translate(540px, 960px) rotate(${c.rot}deg) scale(${c.zoom}) translate(${b.cx - c.cx}px, ${b.cy - c.cy}px) scale(${1 / b.zoom}) translate(-540px, -960px)`;
};

export const lerpPt = (a: {x: number; y: number}, b: {x: number; y: number}, t: number) => ({x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t)});
