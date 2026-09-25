// Pure scene model: every persistent object's state as a function of frame.
// The same three cards travel through the whole film (panels → product rows
// → brief rows → build nodes → phone rows → live rows), so continuity is
// structural rather than faked with cuts.
import {LAYOUT} from '../config/layout.ts';
import {K} from '../config/timeline.ts';
import {clamp, ease, envelope, invLerp, lerp, ring, settle, tween, type Ease} from '../lib/anim.ts';

export type Geo = {cx: number; cy: number; w: number; h: number; rot: number; opacity: number; scale: number};

type State = Partial<Geo> & {f: number; e?: Ease};

/** Interpolate a sparse list of states; each state's easing shapes the segment ending on it. */
const morph = (f: number, states: State[], base: Geo): Geo => {
  // Fill missing props forward so every state is complete.
  const full: (Geo & {f: number; e?: Ease})[] = [];
  let prev: Geo = base;
  for (const s of states) {
    const g = {...prev, ...s} as Geo & {f: number; e?: Ease};
    full.push(g);
    prev = g;
  }
  if (f <= full[0].f) return full[0];
  for (let i = 1; i < full.length; i++) {
    const b = full[i];
    if (f <= b.f) {
      const a = full[i - 1];
      const t = (b.e ?? ease.cubicInOut)(b.f === a.f ? 1 : (f - a.f) / (b.f - a.f));
      return {
        cx: lerp(a.cx, b.cx, t),
        cy: lerp(a.cy, b.cy, t),
        w: lerp(a.w, b.w, t),
        h: lerp(a.h, b.h, t),
        rot: lerp(a.rot, b.rot, t),
        opacity: lerp(a.opacity, b.opacity, t),
        scale: lerp(a.scale, b.scale, t),
      };
    }
  }
  return full[full.length - 1];
};

// ---------------------------------------------------------------- chaos (0–150)
const CHAOS_BASE = [
  {cx: 330, cy: 770, rot: -8},
  {cx: 365, cy: 965, rot: 6},
  {cx: 320, cy: 1160, rot: -5},
];
export const PANEL = {w: 320, h: 135};

/** Booking panel slip: already moving on frame 0, arrested at frame 18. */
export const slipOffset = (f: number) => {
  if (f <= K.slipEnd) {
    // Starts with visible velocity (u0) and accelerates: s(u) = a·u + b·u².
    const u = clamp(f / K.slipEnd);
    const s = 0.28 * u + 0.72 * u * u;
    return {dy: 44 * s, drot: -3 * s};
  }
  // Caught: a short, damped recoil against the hand.
  return {dy: 44 + ring(f, K.slipEnd, -3.2, 9, 5), drot: -3 + ring(f, K.slipEnd, 0.9, 10, 6)};
};

const jolt = (f: number, start: number, dist: number, dRot: number) => {
  if (f < start) return {dx: 0, drot: 0};
  const u = invLerp(start, start + 9, f);
  const p = ease.backOut(1.6)(u);
  return {dx: dist * p, drot: dRot * p};
};

export const chaosPose = (i: number, f: number) => {
  const b = CHAOS_BASE[i];
  let cx = b.cx;
  let cy = b.cy;
  let rot = b.rot;
  if (i === 0) {
    const s = slipOffset(f);
    cy += s.dy;
    rot += s.drot;
  }
  if (i === 1) {
    const j = jolt(f, K.paymentShift, 20, 2.5);
    cx += j.dx;
    rot += j.drot;
  }
  if (i === 2) {
    const j = jolt(f, K.reminderShift, -20, -2);
    cx += j.dx;
    rot += j.drot;
  }
  return {cx, cy, rot};
};

// ------------------------------------------------------------ card targets
const ROW_Y = [769.5, 929.5, 1089.5];
const BRIEF_Y = [822, 922, 1022];
const NODE_Y = [720, 925, 1130];
const PHONE_Y = [806, 898, 990];
const LIVE_Y = [772, 884, 996];

export const cardGeo = (i: number, f: number): Geo => {
  if (f <= K.connect) {
    const p = chaosPose(i, f);
    return {...p, w: PANEL.w, h: PANEL.h, opacity: 1, scale: 1};
  }
  const start = chaosPose(i, K.connect);
  const base: Geo = {...start, w: PANEL.w, h: PANEL.h, opacity: 1, scale: 1};
  const stagger = i * 2;
  return morph(
    f,
    [
      {f: K.connect},
      // Align inside the product frame: cubic ease-out, ~24 frames.
      {f: K.alignEnd - 4 + stagger, cx: 380, cy: ROW_Y[i], w: 440, h: 130, rot: 0, e: ease.cubicOut},
      {f: K.briefCompress},
      // Compress into brief rows (keeps left edge x=160 continuous).
      {f: 300, cx: 380, cy: BRIEF_Y[i], h: 84, e: ease.cubicInOut},
      {f: 420 + i * 4},
      // Brief rows become build nodes.
      {f: 444 + i * 4, cx: 365, cy: NODE_Y[i], w: 380, h: 130, e: settle},
      {f: 600 + i * 2},
      // Nodes shrink into the phone.
      {f: 620 + i * 2, cx: 365, cy: PHONE_Y[i], w: 240, h: 76, e: settle},
      {f: 720},
      {f: 732, cy: PHONE_Y[i] - 60, e: ease.cubicInOut},
      // Phone unfolds into the live product panel.
      {f: 756 + i * 2, cx: 380, cy: LIVE_Y[i], w: 440, h: 96, e: settle},
      {f: 840},
      {f: 852, opacity: 0, scale: 0.94, e: ease.cubicIn},
    ],
    base,
  );
};

/** Which content variant each card shows, as crossfade weights. */
export const cardVariant = (i: number, f: number) => {
  const rollBrief = 306 + i * 4;
  const rollNode = 424 + i * 4;
  const rollPhone = 606;
  const rollLive = 740;
  return {
    chaos: f < rollBrief ? 1 : 0,
    brief: f >= rollBrief && f < rollNode ? 1 : 0,
    node: f >= rollNode && f < rollPhone ? 1 : 0,
    phone: f >= rollPhone && f < rollLive ? 1 : 0,
    live: f >= rollLive ? 1 : 0,
    // label roll progress 0..1 for the entering variant
    rollBrief: invLerp(rollBrief, rollBrief + 8, f),
    rollNode: invLerp(rollNode, rollNode + 8, f),
    rollPhone: invLerp(rollPhone, rollPhone + 8, f),
    rollLive: invLerp(rollLive, rollLive + 8, f),
  };
};

// ------------------------------------------------------------ frame object
export type FrameKinds = {product: number; brief: number; build: number; phone: number; live: number; portfolio: number};

export const frameGeo = (f: number): Geo & {draw: number} => {
  const pf = LAYOUT.productFrame;
  const bf = LAYOUT.briefFrame;
  const ph = LAYOUT.phone;
  const pc = LAYOUT.portfolioCard;
  const d = LAYOUT.demo;
  const toGeo = (r: {x: number; y: number; w: number; h: number}) => ({cx: r.x + r.w / 2, cy: r.y + r.h / 2, w: r.w, h: r.h});
  const base: Geo = {...toGeo(pf), rot: 0, opacity: 1, scale: 1};
  const g = morph(
    f,
    [
      {f: 0},
      {f: K.briefCompress},
      {f: 300, ...toGeo(bf), e: ease.cubicInOut},
      {f: 420},
      {f: 444, ...toGeo(d), e: settle},
      {f: 600},
      {f: 618, ...toGeo(ph), e: settle},
      {f: 720},
      {f: 732, cy: ph.y + ph.h / 2 - 60, e: ease.cubicInOut},
      {f: 758, ...toGeo(pf), e: settle},
      {f: 840},
      {f: 858, ...toGeo(pc), e: settle},
      {f: K.anticipation},
      // The project card retracts 8 % in depth as the scene accelerates.
      {f: K.sweep, scale: 0.92, e: ease.cubicOut},
    ],
    base,
  );
  const draw = invLerp(K.connect, K.connect + 30, f);
  return {...g, draw};
};

export const frameKinds = (f: number): FrameKinds => ({
  product: f < K.connect ? 0 : 1 - invLerp(K.briefCompress, 300, f),
  brief: f < K.briefCompress ? 0 : envelope(f, K.briefCompress, 300, 420, 436),
  build: envelope(f, 420, 444, 598, 612),
  phone: envelope(f, 600, 616, 732, 748),
  live: envelope(f, 734, 756, 840, 852),
  portfolio: f < 840 ? 0 : invLerp(842, 858, f),
});

// ------------------------------------------------------------ connections
/** 0 = disconnected stubs, 1 = joined. Per pair (0→1, 1→2). */
export const joined = (pair: number, f: number) => invLerp(166 + pair * 3, 176 + pair * 3, f);

/** Energy along each connector (0 idle … 1 lit). */
export const connectorEnergy = (pair: number, f: number) => {
  if (f < K.connect) return 0;
  const lit = invLerp(174 + pair * 5, 186 + pair * 5, f);
  // Dim during the brief (process restarts), relit by the build pulse.
  const briefDim = envelope(f, 300, 312, 420, 430);
  const pulseLit = pair === 0 ? invLerp(462, 480, f) : invLerp(504, 534, f);
  const buildPhase = f >= 420 && f < 600;
  if (buildPhase) return Math.max(0.12, pulseLit);
  return lit * (1 - 0.8 * briefDim);
};

/** The build pulse: position along the node column, 0 when hidden. */
export const pulse = (f: number) => {
  const x = 365;
  const pts: [number, number, number][] = [
    // [frame, y, visible]
    [424, 600, 0],
    [428, 606, 1],
    [K.pulseIn, 655, 1], // enters booking
    [K.pulseIn + 1, 655, 0],
    [462, 785, 0],
    [463, 785, 1],
    [K.pulsePayment, 860, 1], // reaches payment
    [K.pulsePayment + 1, 860, 0],
    [506, 990, 0],
    [507, 990, 1],
    [K.pulseReminder, 1065, 1], // reaches reminders
    [K.pulseReminder + 1, 1065, 0],
  ];
  if (f < pts[0][0] || f > pts[pts.length - 1][0]) return {x, y: 0, visible: 0};
  for (let i = 1; i < pts.length; i++) {
    if (f <= pts[i][0]) {
      const [f0, y0, v0] = pts[i - 1];
      const [f1, y1, v1] = pts[i];
      const t = ease.sineInOut((f - f0) / (f1 - f0));
      return {x, y: lerp(y0, y1, t), visible: v0 && v1 ? 1 : 0};
    }
  }
  return {x, y: 0, visible: 0};
};

/** Node activation (border to 75 %, processing sweep) for build nodes. */
export const nodeActive = (i: number, f: number) => {
  const at = [K.pulseIn, K.pulsePayment, K.pulseReminder][i];
  return invLerp(at, at + 6, f);
};
export const nodeSweep = (i: number, f: number) => {
  const at = [K.pulseIn, K.pulsePayment, K.pulseReminder][i];
  return invLerp(at + 2, at + 24, f);
};
export const nodeCheck = (f: number) => invLerp(K.flowChecks, K.flowChecks + 8, f);

// ------------------------------------------------------------ rail
export const railState = (f: number) => {
  const appear = invLerp(318, 342, f);
  const fade = 1 - invLerp(840, 860, f);
  const lit = [
    invLerp(K.scopeNodeLight, K.scopeNodeLight + 8, f),
    invLerp(432, 440, f),
    invLerp(612, 620, f),
    invLerp(K.live, K.live + 8, f),
  ];
  // Progress fill runs to the latest lit node.
  const progress = tween(f, 424, 440, 0, 1, settle) + tween(f, 604, 620, 0, 1, settle) + tween(f, 728, 744, 0, 1, settle);
  return {appear, fade, lit, progress};
};

// ------------------------------------------------------------ misc objects
export const scopeCheck = (i: number, f: number) => invLerp(K.scopeChecks + i * 2, K.scopeChecks + i * 2 + 7, f);

export const approveCheck = (f: number) => invLerp(K.approve, K.approve + 8, f);

export const liveBadge = (f: number) => (f < K.live ? 0 : ease.backOut(1.4)(invLerp(K.live, K.live + 10, f)));

export const tileGeo = (f: number): Geo => {
  const base: Geo = {cx: 420, cy: 1090, w: 280, h: 125, rot: 0, opacity: 0, scale: 0.8};
  return morph(
    f,
    [
      {f: 744},
      {f: 772, cx: 520, cy: 1140, opacity: 1, scale: 1, e: settle},
      {f: 840},
      {f: 852, opacity: 0, scale: 0.9, cx: 470, e: ease.cubicIn},
    ],
    base,
  );
};

/** Camera applied to the object layer (not type). 2 % push in the opening. */
export const camera = (f: number) => {
  const push = f <= 150 ? tween(f, 0, 150, 1, 1.02, ease.sineInOut) : tween(f, 150, 186, 1.02, 1, ease.cubicInOut);
  return {scale: push, ox: 540, oy: 980};
};

/** Stage depth/turn for the phone presentation angle (degrees). */
export const stageTurn = (f: number) => {
  if (f < 600 || f > 640) return 0;
  return f < K.phoneTurnStart ? 10 * invLerp(600, 606, f) : tween(f, K.phoneTurnStart, K.phoneTurnEnd, 10, 0, settle);
};
