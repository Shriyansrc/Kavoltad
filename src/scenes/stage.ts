// Stage model: every persistent object's state as a pure function of frame.
// The same three cards travel through the whole film (chaos panels → product
// rows → brief rows → build nodes → phone rows → live rows), driven by
// deterministic springs so every move has anticipation, overshoot and settle.
import {LAYOUT} from '../config/layout.ts';
import {K} from '../config/timeline.ts';
import {bump, clamp, ease, envelope, invLerp, lerp, noise1, rad, ring, SPR, spring01, type SpringCfg} from '../lib/anim.ts';
import {anchorAt, kaveyPose} from './kavey.ts';

export type Geo = {cx: number; cy: number; w: number; h: number; rot: number; rx: number; ry: number; scale: number; opacity: number};
type Step = {at: number; to: Partial<Geo>; cfg?: SpringCfg};

const KEYS: (keyof Geo)[] = ['cx', 'cy', 'w', 'h', 'rot', 'rx', 'ry', 'scale', 'opacity'];

/** Spring through a sequence of partial targets, starting from a (possibly moving) base. */
const seq = (f: number, base: Geo, steps: Step[]): Geo => {
  const g = {...base};
  for (const s of steps) {
    if (f < s.at) break;
    const p = spring01(f - s.at, s.cfg ?? SPR.snappy);
    for (const k of KEYS) {
      const t = s.to[k];
      if (t !== undefined) g[k] = lerp(g[k], t, p);
    }
  }
  return g;
};

// ------------------------------------------------------------------ chaos
export const PANEL = {w: 330, h: 138};

/** Card A (BOOKING) falls, is caught on Kavey's fingertip at frame 18, and balances there. */
const bookingChaos = (f: number): Geo => {
  const catchRot = -9;
  const onHand = (ff: number, rot: number) => {
    const tip = anchorAt(ff, 'handLTip');
    const r = rad(rot);
    // bottom-right corner of the card rests on the fingertip
    const ox = -PANEL.w / 2 + 6;
    const oy = -PANEL.h / 2 + 2;
    return {cx: tip.x + ox * Math.cos(r) - oy * Math.sin(r), cy: tip.y + ox * Math.sin(r) + oy * Math.cos(r)};
  };
  if (f < K.slipEnd) {
    // Already falling on frame 0 (started at -12), accelerating toward the hand.
    const end = onHand(K.slipEnd, catchRot);
    const start = {cx: end.cx - 90, cy: end.cy - 250};
    const u = clamp((f + 12) / (K.slipEnd + 12));
    const s = u * u;
    return {cx: lerp(start.cx, end.cx, u), cy: lerp(start.cy, end.cy, s), w: PANEL.w, h: PANEL.h, rot: lerp(-24, catchRot, u), rx: 0, ry: lerp(18, 6, u), scale: 1, opacity: 1};
  }
  // Balancing wobble after the catch, damped; small nervous jitter afterwards.
  const pose = kaveyPose(f);
  const wob = ring(f, K.slipEnd, 7, 18, 14) + 1.2 * noise1(f / 11, 3);
  const rot = catchRot + 0.4 * pose.handL + wob;
  const p = onHand(f, rot);
  return {...p, w: PANEL.w, h: PANEL.h, rot, rx: 3 * noise1(f / 23, 5), ry: 6 + 3 * noise1(f / 19, 6), scale: 1, opacity: 1};
};

const jitterCard = (f: number, i: number, base: {cx: number; cy: number; rot: number}, joltAt: number, dir: number): Geo => {
  const jolt = f < joltAt ? 0 : spring01(f - joltAt, SPR.bouncy);
  const shake = f < joltAt ? 0 : ring(f, joltAt, 4, 5, 6);
  return {
    cx: base.cx + dir * 22 * jolt + shake + 2.5 * noise1(f / 17, i * 10),
    cy: base.cy + 2.5 * noise1(f / 21, i * 10 + 1),
    w: PANEL.w,
    h: PANEL.h,
    rot: base.rot + dir * 3 * jolt + 1.4 * noise1(f / 29, i * 10 + 2),
    rx: 4 * noise1(f / 31, i * 10 + 3),
    ry: dir * 10 + 4 * noise1(f / 27, i * 10 + 4),
    scale: 1,
    opacity: 1,
  };
};

const chaosPose = (i: number, f: number): Geo => {
  if (i === 0) return bookingChaos(f);
  if (i === 1) return jitterCard(f, 1, {cx: 330, cy: 770, rot: 7}, K.paymentShift, 1);
  return jitterCard(f, 2, {cx: 300, cy: 1230, rot: -6}, K.reminderShift, -1);
};

// ------------------------------------------------------------------ card sequence
const ROW_Y = [769.5, 929.5, 1089.5];
const BRIEF_Y = [822, 922, 1022];
const NODE_Y = [720, 925, 1130];
const PHONE_Y = [806, 898, 990];
const LIVE_Y = [772, 884, 996];

export const cardGeo = (i: number, f: number): Geo => {
  const base = chaosPose(i, Math.min(f, K.connect + 30));
  // After the flick, the chaos pose keeps evolving only as a spring origin.
  return seq(f, base, [
    {at: K.connect + i * 3, to: {cx: 380, cy: ROW_Y[i], w: 440, h: 130, rot: 0, rx: 0, ry: 0}, cfg: SPR.snappy},
    {at: K.briefCompress + i * 2, to: {cy: BRIEF_Y[i], h: 84}, cfg: SPR.snappy},
    {at: 420 + i * 4, to: {cx: 365, cy: NODE_Y[i], w: 380, h: 130}, cfg: SPR.bouncy},
    {at: 600 + i * 2, to: {cy: PHONE_Y[i], w: 240, h: 76}, cfg: SPR.snappy},
    {at: 720, to: {cy: PHONE_Y[i] - 60}, cfg: SPR.snappy},
    {at: 734 + i * 3, to: {cx: 380, cy: LIVE_Y[i], w: 440, h: 96}, cfg: SPR.bouncy},
    {at: 838, to: {opacity: 0, scale: 0.9}, cfg: SPR.settle},
  ]);
};

/** Speed of a card in px/frame (for motion trails). */
export const cardSpeed = (i: number, f: number) => {
  const a = cardGeo(i, f - 1);
  const b = cardGeo(i, f);
  return Math.hypot(b.cx - a.cx, b.cy - a.cy);
};

// ------------------------------------------------------------------ faces
/** Which content face each card shows and its roll-in progress. */
export const cardFaces = (i: number, f: number) => {
  const rollBrief = 306 + i * 4;
  const rollNode = 424 + i * 4;
  const inOut = (a: number, b: number | null) => {
    const enter = ease.cubicOut(invLerp(a, a + 8, f));
    const exit = b === null ? 0 : ease.cubicIn(invLerp(b - 6, b, f));
    return clamp(Math.min(enter, 1 - exit));
  };
  return {
    chaos: inOut(-100, rollBrief),
    brief: f >= rollBrief - 6 ? inOut(rollBrief, rollNode) : 0,
    node: f >= rollNode - 6 ? inOut(rollNode, 606) : 0,
    phone: f >= 600 ? inOut(606, 740) : 0,
    live: f >= 734 ? inOut(740, null) : 0,
  };
};

// ------------------------------------------------------------------ frame object
export type FrameKinds = {product: number; brief: number; build: number; phone: number; live: number; portfolio: number};

const rectGeo = (r: {x: number; y: number; w: number; h: number}) => ({cx: r.x + r.w / 2, cy: r.y + r.h / 2, w: r.w, h: r.h});

export const frameGeo = (f: number): Geo & {draw: number} => {
  const pf = LAYOUT.productFrame;
  const base: Geo = {...rectGeo(pf), rot: 0, rx: 0, ry: 0, scale: 0.86, opacity: 1};
  const g = seq(f, base, [
    {at: K.connect + 2, to: {scale: 1}, cfg: SPR.bouncy},
    {at: K.briefCompress, to: rectGeo(LAYOUT.briefFrame), cfg: SPR.snappy},
    {at: 420, to: rectGeo(LAYOUT.demo), cfg: SPR.snappy},
    {at: 600, to: rectGeo(LAYOUT.phone), cfg: SPR.snappy},
    {at: 720, to: {cy: LAYOUT.phone.y + LAYOUT.phone.h / 2 - 60}, cfg: SPR.snappy},
    {at: 732, to: rectGeo(pf), cfg: SPR.bouncy},
    {at: 848, to: rectGeo(LAYOUT.portfolioCard), cfg: {freq: 50, damping: 1}},
    {at: K.anticipation, to: {scale: 0.92}, cfg: SPR.snappy},
  ]);
  // Proof flip: live panel turns away (840–848), portfolio card turns in (848–864).
  if (f >= 840 && f < 848) g.ry = 90 * ease.cubicIn(invLerp(840, 848, f));
  else if (f >= 848) g.ry = -90 * (1 - spring01(f - 848, SPR.snappy));
  return {...g, draw: ease.cubicInOut(invLerp(K.connect + 2, K.connect + 26, f))};
};

export const frameKinds = (f: number): FrameKinds => ({
  product: f < K.connect ? 0 : 1 - invLerp(K.briefCompress, 300, f),
  brief: f < K.briefCompress ? 0 : envelope(f, K.briefCompress, 300, 420, 436),
  build: envelope(f, 420, 444, 598, 612),
  phone: envelope(f, 600, 612, 732, 748),
  live: f < 734 ? 0 : f < 848 ? envelope(f, 734, 752, 900, 901) : 0,
  portfolio: f < 848 ? 0 : 1,
});

/** Stage presentation angle for the phone (deg): swings in, overshoots, settles. */
export const stageTurn = (f: number) => {
  if (f < 600 || f > 690) return 0;
  if (f < K.phoneTurnStart) return lerp(30, 10, ease.cubicOut(invLerp(600, K.phoneTurnStart, f)));
  return 10 * (1 - spring01(f - K.phoneTurnStart, SPR.bouncy));
};

// ------------------------------------------------------------------ connections
export const joined = (pair: number, f: number) => invLerp(160 + pair * 3, 172 + pair * 3, f);

export const connectorEnergy = (pair: number, f: number) => {
  if (f < K.connect) return 0;
  const lit = invLerp(170 + pair * 5, 182 + pair * 5, f);
  const briefDim = envelope(f, 300, 312, 420, 430);
  const pulseLit = pair === 0 ? invLerp(462, 480, f) : invLerp(506, 534, f);
  if (f >= 420 && f < 600) return Math.max(0.12, pulseLit);
  return lit * (1 - 0.8 * briefDim);
};

/** Build pulse: a comet travelling the cable path. */
export const pulse = (f: number) => {
  const x = 365;
  const pts: [number, number, number][] = [
    [438 - 10, 612, 1],
    [K.pulseIn, 655, 1],
    [K.pulseIn + 1, 655, 0],
    [462, 785, 0],
    [463, 785, 1],
    [K.pulsePayment, 860, 1],
    [K.pulsePayment + 1, 860, 0],
    [506, 990, 0],
    [507, 990, 1],
    [K.pulseReminder, 1065, 1],
    [K.pulseReminder + 1, 1065, 0],
  ];
  if (f < pts[0][0] || f > pts[pts.length - 1][0]) return {x, y: 0, visible: 0};
  for (let i = 1; i < pts.length; i++) {
    if (f <= pts[i][0]) {
      const [f0, y0, v0] = pts[i - 1];
      const [f1, y1, v1] = pts[i];
      const t = ease.sineInOut((f - f0) / (f1 - f0));
      // cables bow out to the left between nodes
      const bow = -46 * Math.sin(Math.PI * t) * (y1 - y0 > 40 ? 1 : 0);
      return {x: x + bow, y: lerp(y0, y1, t), visible: v0 && v1 ? 1 : 0};
    }
  }
  return {x, y: 0, visible: 0};
};

export const nodeActive = (i: number, f: number) => invLerp([K.pulseIn, K.pulsePayment, K.pulseReminder][i], [K.pulseIn, K.pulsePayment, K.pulseReminder][i] + 6, f);
export const nodeHit = (i: number, f: number) => bump(f, [K.pulseIn, K.pulsePayment, K.pulseReminder][i] + 4, 8);
export const nodeSweep = (i: number, f: number) => {
  const at = [K.pulseIn, K.pulsePayment, K.pulseReminder][i];
  return invLerp(at + 2, at + 24, f);
};
export const nodeCheck = (f: number) => spring01(f - K.flowChecks, SPR.pop);

/** Spark Kavey sends from his hand to the build input port (428–438). */
export const spark = (f: number) => {
  if (f < 426 || f > 440) return null;
  const from = anchorAt(426, 'handLTip');
  const to = {x: 365, y: 612};
  const u = ease.cubicIn(invLerp(426, 438, f));
  const c = {x: lerp(from.x, to.x, 0.45), y: Math.min(from.y, to.y) - 220};
  const x = (1 - u) * (1 - u) * from.x + 2 * (1 - u) * u * c.x + u * u * to.x;
  const y = (1 - u) * (1 - u) * from.y + 2 * (1 - u) * u * c.y + u * u * to.y;
  return {x, y, u, from, to, c};
};

// ------------------------------------------------------------------ rail
export const railState = (f: number) => ({
  appear: invLerp(318, 342, f),
  fade: 1 - invLerp(838, 856, f),
  lit: [
    spring01(f - K.scopeNodeLight, SPR.pop),
    spring01(f - 432, SPR.pop),
    spring01(f - 612, SPR.pop),
    spring01(f - K.live, SPR.pop),
  ],
  progress: spring01(f - 424, SPR.snappy) + spring01(f - 604, SPR.snappy) + spring01(f - 728, SPR.snappy),
});

// ------------------------------------------------------------------ misc
export const scopeCheck = (i: number, f: number) => spring01(f - (K.scopeChecks + i * 3), SPR.pop);
export const lockClose = (f: number) => spring01(f - 334, SPR.bouncy);
export const approveCheck = (f: number) => spring01(f - K.approve, SPR.pop);
export const liveBadge = (f: number) => spring01(f - K.live, SPR.pop);

export const tileGeo = (f: number): Geo => {
  const base: Geo = {cx: 400, cy: 1060, w: 280, h: 125, rot: -8, rx: 70, ry: 0, scale: 0.6, opacity: 0};
  return seq(f, base, [
    {at: 744, to: {cx: 520, cy: 1140, rot: 0, rx: 0, scale: 1, opacity: 1}, cfg: SPR.bouncy},
    {at: 836, to: {opacity: 0, scale: 0.8, cy: 1100}, cfg: SPR.snappy},
  ]);
};

/** Opening chaos bubbles (message skeletons). */
export const BUBBLES = [
  {x: 225, y: 640, at: -30, w: 190, side: -1},
  {x: 560, y: 700, at: -12, w: 170, side: 1},
  {x: 170, y: 1010, at: 30, w: 160, side: -1},
  {x: 520, y: 1300, at: 62, w: 180, side: 1},
  {x: 250, y: 1400, at: 96, w: 170, side: -1},
];

export const bubbleState = (b: (typeof BUBBLES)[number], idx: number, f: number) => {
  const inP = spring01(f - b.at, SPR.pop);
  const suck = f < K.connect ? 0 : ease.cubicIn(invLerp(K.connect + idx * 2, K.connect + 18 + idx * 2, f));
  const tx = lerp(b.x, 380, suck);
  const ty = lerp(b.y - Math.max(0, f - b.at) * 0.18, 900, suck);
  return {
    x: tx + 3 * noise1(f / 20, idx + 40),
    y: ty + 3 * noise1(f / 18, idx + 50),
    scale: inP * (1 - suck),
    rot: b.side * 4 * (1 - inP) + 2 * noise1(f / 25, idx + 60),
    opacity: clamp(inP * 1.5) * (1 - suck),
  };
};

/** Seven-day strip under the solution headline. */
export const dayStrip = (f: number) => {
  const cells = Array.from({length: 7}, (_, d) => ({
    pop: spring01(f - (176 + d * 5), SPR.pop),
    fill: clamp(invLerp(212 + d * 6, 220 + d * 6, f)),
  }));
  const exit = ease.cubicIn(invLerp(286, 298, f));
  return {cells, exit};
};

/** Handheld energy of the chaos, calming as the system forms; pushes on beats. */
export const camera = (f: number) => {
  const chaos = f < K.connect ? 1 : 1 - ease.cubicOut(invLerp(K.connect, K.connect + 20, f));
  const shakeX = chaos * (3.2 * noise1(f / 9, 1) + 1.5 * noise1(f / 4, 2)) + ring(f, K.slipEnd, 5, 7, 5) + ring(f, K.paymentShift, 3, 6, 5) + ring(f, K.reminderShift, -3, 6, 5);
  const shakeY = chaos * (2.6 * noise1(f / 10, 3) + 1.2 * noise1(f / 5, 4)) + ring(f, K.slipEnd, 4, 8, 5) + ring(f, K.live, -3, 7, 6);
  const rot = chaos * 0.35 * noise1(f / 14, 5);
  let scale = f <= K.connect ? lerp(1, 1.03, ease.sineInOut(f / K.connect)) : lerp(1.03, 1, spring01(f - K.connect, SPR.soft));
  scale += 0.05 * envelope(f, 286, 300, 300, 330, ease.cubicInOut); // push into the brief
  scale += 0.03 * envelope(f, 596, 604, 604, 640); // phone arrival
  const rush = f >= K.sweep && f < K.swap ? 0.05 * ease.cubicIn(invLerp(K.sweep, K.coverStart, f)) : 0;
  return {x: shakeX, y: shakeY, rot, scale: scale + rush, ox: 540, oy: 960};
};

/** Deterministic sparkle bursts (position, start frame, count, spread). */
export const BURSTS = [
  {at: K.connect + 2, x: 0, y: 0, n: 14, r: 150, anchor: 'handLTip' as const},
  {at: K.scopeChecks, x: 175, y: 822, n: 7, r: 60},
  {at: K.scopeChecks + 3, x: 175, y: 922, n: 7, r: 60},
  {at: K.scopeChecks + 6, x: 175, y: 1022, n: 7, r: 60},
  {at: K.pulseIn + 2, x: 365, y: 720, n: 10, r: 120},
  {at: K.pulsePayment + 2, x: 365, y: 925, n: 10, r: 120},
  {at: K.pulseReminder + 2, x: 365, y: 1130, n: 10, r: 120},
  {at: K.flowChecks, x: 520, y: 925, n: 16, r: 200},
  {at: K.approve, x: 365, y: 1108, n: 14, r: 150},
  {at: K.live, x: 570, y: 660, n: 18, r: 190},
  {at: K.proofSettle, x: 380, y: 870, n: 16, r: 300},
];
