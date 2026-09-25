// Story geometry for Chaos City: where each problem lives, where Kavey's cube
// lands, the flight paths of the invoice planes and reminder birds, and the
// build hub. World pixels; everything else reads from here.
import {clamp, ease, invLerp, lerp} from '../lib/anim.ts';
import {DISTRICT} from './camera.ts';
import {C} from './config.ts';
import {SHOP} from './world/shop.ts';

const S = DISTRICT.salon;
const G = DISTRICT.gym;
const K = DISTRICT.clinic;

// ------------------------------------------------------------------ problems
/** Salon: the calendar critter (becomes the booking hologram). */
export const CAL = {x: S - 215, y: 1070, w: 300, h: 330};
/** Gym: the payment card hologram appears here. */
export const CARD = {x: G - 205, y: 950, w: 320, h: 400};
/** Clinic: the reminder chat hologram and the sleepy clock beneath it. */
export const CHAT = {x: K - 225, y: 1010, w: 300, h: 300};
export const CLOCK = {x: K - 235, y: 1330, r: 88};

// ------------------------------------------------------------------ throws
export type Throw = {windup: number; release: number; hit: number; back0: number; back1: number; target: {x: number; y: number}};
export const THROWS: Throw[] = [
  {windup: C.salonThrow - 12, release: C.salonThrow + 2, hit: C.salonHit, back0: 348, back1: 364, target: {x: CAL.x, y: CAL.y - 40}},
  {windup: C.gymThrow - 12, release: C.gymThrow + 2, hit: C.gymHit, back0: 680, back1: 696, target: {x: CARD.x, y: CARD.y}},
  {windup: C.clinicThrow - 12, release: C.clinicThrow + 2, hit: C.clinicHit, back0: 962, back1: 978, target: {x: CHAT.x, y: CHAT.y}},
];
export const activeThrow = (f: number) => THROWS.find((t) => f >= t.release && f < t.back1) ?? null;

// ------------------------------------------------------------------ salon blocks
/** Calendar cells (3 × 3) in world coordinates. */
export const calCell = (col: number, row: number) => ({x: CAL.x - 92 + col * 92, y: CAL.y - 40 + row * 78});
const PILE = [
  {dx: -18, dy: 0, rot: -12},
  {dx: 24, dy: -22, rot: 10},
  {dx: -8, dy: -44, rot: -20},
  {dx: 30, dy: -64, rot: 16},
];
const SLOT = [
  [0, 0],
  [2, 0],
  [1, 1],
  [0, 2],
] as const;

export type BlockState = {x: number; y: number; rot: number; o: number; fixed: number};

export const blockState = (i: number, f: number): BlockState => {
  const hit = C.clashHits[i];
  const start = hit - 18;
  const mid = calCell(1, 1);
  const p = PILE[i];
  if (f < start) return {x: mid.x, y: -600, rot: 0, o: 0, fixed: 0};
  let x = mid.x + p.dx;
  let y = mid.y + p.dy;
  let rot = p.rot;
  if (f < hit) {
    const u = ease.cubicIn(invLerp(start, hit, f));
    x = lerp(mid.x + p.dx * 3 + (i % 2 ? 90 : -90), x, u);
    y = lerp(mid.y - 1000, y, u);
    rot = lerp(p.rot * -2, p.rot, u);
  }
  // Each later clash knocks the pile.
  for (let k = i + 1; k < C.clashHits.length; k++) {
    const t = f - C.clashHits[k];
    if (t > 0) {
      const d = Math.exp(-t / 7) * Math.sin(t * 0.9);
      x += d * 14 * (k % 2 ? 1 : -1);
      rot += d * 9;
    }
  }
  const snap = C.salonSnaps[i];
  const fixed = clamp(f >= snap ? 1 - Math.exp(-(f - snap) / 3) : 0);
  if (f >= snap - 2) {
    const [cc, rr] = SLOT[i];
    const cell = calCell(cc, rr);
    const u = ease.backOut(1.6)(invLerp(snap - 2, snap + 8, f));
    x = lerp(x, cell.x, u);
    y = lerp(y, cell.y, u);
    rot = lerp(rot, 0, clamp(u));
  }
  return {x, y, rot, o: 1, fixed};
};

// ------------------------------------------------------------------ gym planes
type Way = [f: number, x: number, y: number];
const P = (keys: Way[]) => keys;

/**
 * Time-parameterised cubic Hermite through waypoints (Catmull-Rom tangents
 * scaled by segment duration): continuous velocity, so a flyer never
 * stops at a waypoint.
 */
const flyPath = (w: Way[], f: number) => {
  if (f <= w[0][0]) return {x: w[0][1], y: w[0][2]};
  const n = w.length - 1;
  if (f >= w[n][0]) return {x: w[n][1], y: w[n][2]};
  let i = 0;
  while (i < n - 1 && f > w[i + 1][0]) i++;
  const tan = (k: number, d: 1 | 2) => {
    const a = w[Math.max(0, k - 1)];
    const b = w[Math.min(n, k + 1)];
    return (b[d] - a[d]) / Math.max(1, b[0] - a[0]);
  };
  const h = w[i + 1][0] - w[i][0];
  const t = (f - w[i][0]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const at = (d: 1 | 2) => h00 * w[i][d] + h10 * h * tan(i, d) + h01 * w[i + 1][d] + h11 * h * tan(i + 1, d);
  return {x: at(1), y: at(2)};
};

export const cardRow = (i: number) => ({x: CARD.x - 70, y: CARD.y - 70 + i * 66});

const OUT = [
  P([
    [C.planesOut[0], G, 1330],
    [510, G - 170, 1150],
    [530, G - 430, 1060],
    [560, G - 780, 700],
  ]),
  P([
    [C.planesOut[1], G, 1330],
    [524, G + 60, 1120],
    [544, G - 70, 920],
    [566, G + 230, 690],
    [596, G + 800, 520],
  ]),
  P([
    [C.planesOut[2], G, 1330],
    [540, G - 90, 1150],
    [552, G + 90, 1010],
    [560, G + 190, 930],
    [572, G + 330, 770],
    [604, G + 220, -180],
  ]),
  P([
    [C.planesOut[3], G, 1330],
    [552, G - 130, 1190],
    [570, G - 60, 900],
    [600, G - 340, -180],
  ]),
];
const BACK = C.planesBack.map((arrive, i) => {
  const row = cardRow(i);
  const from = [
    [G - 780, 700],
    [G + 800, 520],
    [G + 220, -180],
    [G - 340, -180],
  ][i];
  const via = [
    [G - 560, 820],
    [G + 120, 640],
    [G - 40, 520],
    [G - 380, 620],
  ][i];
  return P([
    [arrive - 30, from[0], from[1]],
    [arrive - 12, via[0], via[1]],
    [arrive, row.x, row.y],
  ]);
});

export type PlaneState = {x: number; y: number; rot: number; visible: boolean; paid: number; flap: number};

export const planeState = (i: number, f: number): PlaneState => {
  const arrive = C.planesBack[i];
  const out = OUT[i];
  const back = BACK[i];
  const flap = Math.sin(f * 0.9 + i * 2);
  const useBack = f >= arrive - 30;
  const path = useBack ? back : out;
  const {x, y} = flyPath(path, f);
  const q = flyPath(path, f + 1);
  const rot = (Math.atan2(q.y - y, q.x - x) * 180) / Math.PI;
  const visible = f >= C.planesOut[i] && f < arrive + 2;
  return {x, y, rot, visible, paid: clamp((f - arrive) / 6), flap};
};

// ------------------------------------------------------------------ clinic birds
export const BIRD_WINDOWS = [
  {r: 0, col: 0},
  {r: 0, col: 1},
  {r: 0, col: 2},
  {r: 0, col: 3},
];
export const windowCenter = (i: number) => {
  const w = BIRD_WINDOWS[i];
  return {x: K + SHOP.winCols[w.col] + SHOP.winW / 2, y: SHOP.winRows[w.r] + SHOP.winH / 2};
};

/** Folded reminder bubbles waiting at the bottom of the chat hologram. */
export const chatSlot = (i: number) => ({x: CHAT.x - 96 + i * 64, y: CHAT.y + 96});

export type BirdState = {x: number; y: number; rot: number; visible: boolean; landed: number; flap: number};
export const birdState = (i: number, f: number): BirdState => {
  const t0 = C.birds[i];
  const t1 = C.birdsLand[i];
  const from = chatSlot(i);
  const to = windowCenter(i);
  const u = ease.cubicInOut(invLerp(t0, t1, f));
  const arc = Math.sin(Math.PI * u) * (160 + i * 30);
  const x = lerp(from.x, to.x, u);
  const y = lerp(from.y, to.y + 38, u) - arc;
  const u2 = ease.cubicInOut(invLerp(t0, t1, f + 1));
  const dx = lerp(from.x, to.x, u2) - x;
  const dy = lerp(from.y, to.y + 38, u2) - Math.sin(Math.PI * u2) * (160 + i * 30) - y;
  return {x, y, rot: clamp((Math.atan2(dy, Math.abs(dx) + 0.001) * 180) / Math.PI / 3, -20, 20), visible: f >= t0 && f < t1 + 16, landed: clamp((f - t1) / 8), flap: Math.sin(f * 1.3 + i)};
};

// ------------------------------------------------------------------ build hub
/** The product phone the three holograms merge into (world). */
export const HUB = {x: 1800, y: 300, w: 340, h: 640};
/** Where each hologram docks inside the phone before the merge. */
export const HUB_SLOT = [
  {x: HUB.x, y: HUB.y - 170},
  {x: HUB.x, y: HUB.y + 20},
  {x: HUB.x, y: HUB.y + 210},
];
export const HOLO_HOME = [
  {x: CAL.x, y: CAL.y},
  {x: CARD.x, y: CARD.y},
  {x: CHAT.x, y: CHAT.y},
];

/** Hologram i flying into the hub (0 home … 1 docked), with per-item stagger. */
export const holoFlight = (i: number, f: number) => ease.cubicInOut(invLerp(C.holoRise + i * 10, C.holoMerge - 14 + i * 4, f));

/** The phone rockets up out of frame after LIVE. */
export const hubLift = (f: number) => ease.cubicIn(invLerp(C.launch + 22, C.launch + 52, f));
