// The energy ribbon. Before 972 it is a short procedural wisp attached to
// Kavey's scarf tip. From 972 it lengthens and swings onto the transition
// axis; from 990 the same ribbon widens toward the lens (90 → 1700 px core),
// fully occludes frames 1002–1005, then slides out through the upper right.
import {K} from '../config/timeline.ts';
import {FPS, HEIGHT, WIDTH} from '../config/video.ts';
import {clamp, ease, invLerp, lerp, smoothstep} from '../lib/anim.ts';
import type {Pt} from '../lib/ribbon.ts';
import {anchorAt, kaveyPose} from './kavey.ts';

// Transition axis: steep diagonal, lower-left → upper-right (70° from horizontal).
const AX = {x: Math.cos((70 * Math.PI) / 180), y: -Math.sin((70 * Math.PI) / 180)}; // u direction
const NV = {x: -AX.y, y: AX.x}; // v direction (perpendicular, pointing right/down)

export const EDGE = 24; // magenta edge
export const GLOW = 18; // soft glow

export type RibbonShape = {
  spine: Pt[];
  half: number[]; // core+edge half-width per spine point
  opacity: number;
  coreMix: number; // 0 translucent magenta wisp … 1 dark violet core
  streak: number; // inner motion streak intensity
  phase: 'wisp' | 'swing' | 'band';
};

/** Origin of the transition axis: where the scarf tip is at frame 990. */
const axisOrigin = () => anchorAt(K.cross, 'scarfTip');

const toScreen = (o: Pt, u: number, v: number): Pt => ({x: o.x + AX.x * u + NV.x * v, y: o.y + AX.y * u + NV.y * v});

/** Wisp: a short fluttering extension of the scarf, lengthened by motion history. */
const wisp = (f: number, swing: number): RibbonShape => {
  const N = 14;
  const A = anchorAt(f, 'scarfTip');
  const pose = kaveyPose(f);
  const t = f / FPS;
  const spine: Pt[] = [];
  const half: number[] = [];
  // Natural hang direction: down and slightly outward, rotated with the body.
  const r = (pose.rot * Math.PI) / 180;
  const hang = {x: 0.55 * Math.cos(r) - 0.83 * Math.sin(r), y: 0.55 * Math.sin(r) + 0.83 * Math.cos(r)};
  const baseLen = 58 * (pose.height / 480);
  const O = axisOrigin();
  const swingLen = lerp(0, 1500, ease.cubicIn(swing));
  for (let k = 0; k <= N; k++) {
    const s = k / N;
    const hist = anchorAt(f - s * 10, 'scarfTip');
    const flutter = Math.sin(t * 5.2 - s * 3.4) * 7 * s + Math.sin(t * 3.1 - s * 2.1 + 1.3) * 4 * s;
    let p: Pt = {
      x: hist.x + hang.x * baseLen * s + -hang.y * flutter,
      y: hist.y + hang.y * baseLen * s + hang.x * flutter,
    };
    // Swing onto the transition axis (u < 0 is toward the lower-left edge).
    if (swing > 0) {
      const onAxis = toScreen(O, -swingLen * Math.pow(s, 0.9), 0);
      const pull = ease.cubicInOut(clamp(swing * 1.15 - s * 0.15));
      const attach = {x: A.x + (onAxis.x - O.x), y: A.y + (onAxis.y - O.y)};
      p = {x: lerp(p.x, attach.x, pull), y: lerp(p.y, attach.y, pull)};
    }
    spine.push(k === 0 ? A : p);
    const thin = 5.5 * Math.pow(1 - s, 0.7) * (pose.height / 480);
    const fat = 45 * smoothstep(0, 0.25, s);
    half.push(lerp(thin, fat, ease.cubicIn(swing)));
  }
  const opacity = lerp(0.42 + 0.25 * pose.energy, 1, smoothstep(0.35, 0.9, swing));
  return {spine, half, opacity, coreMix: smoothstep(0.45, 1, swing), streak: swing, phase: swing > 0 ? 'swing' : 'wisp'};
};

/** Screen corners in axis coordinates relative to origin o. */
const cornerSpan = (o: Pt) => {
  const cs = [
    {x: 0, y: 0},
    {x: WIDTH, y: 0},
    {x: 0, y: HEIGHT},
    {x: WIDTH, y: HEIGHT},
  ].map((c) => ({u: (c.x - o.x) * AX.x + (c.y - o.y) * AX.y, v: (c.x - o.x) * NV.x + (c.y - o.y) * NV.y}));
  return {
    uMin: Math.min(...cs.map((c) => c.u)),
    uMax: Math.max(...cs.map((c) => c.u)),
    vMin: Math.min(...cs.map((c) => c.v)),
    vMax: Math.max(...cs.map((c) => c.v)),
  };
};

const COVER_MARGIN = 36; // px of opaque ribbon beyond every corner at full width

/** Band phase (990–1020) in axis coordinates, derived from the frame corners. */
const band = (f: number): RibbonShape => {
  const O = axisOrigin();
  const span = cornerSpan(O);
  const grow = ease.cubicIn(invLerp(K.cross, K.coverStart, f));
  // Full-width core covers the perpendicular extent of the frame plus margin.
  const needHalf = (span.vMax - span.vMin) / 2 + COVER_MARGIN;
  const fullCore = Math.max(1700, 2 * (needHalf - EDGE));
  const coreW = lerp(90, fullCore, grow);
  const halfCore = coreW / 2;
  const headTaper = lerp(120, 280, grow);
  const tailTaper = 320;
  // Head leaves the scarf and clears the far corner (plus its taper) by 1002.
  const uHeadEnd = span.uMax + headTaper + COVER_MARGIN;
  const uHead = lerp(0, uHeadEnd, ease.cubicInOut(invLerp(K.cross, K.coverStart, f)));
  // Tail waits beyond the lower-left corner, then carries the reveal across
  // the whole frame between 1005 and 1019.
  const uTailStart = span.uMin - tailTaper - COVER_MARGIN;
  const uTailEnd = span.uMax + 30;
  const reveal = ease.bezier(0.42, 0, 0.58, 1)(invLerp(K.swap, K.reveal - 1, f));
  const uTail = f < K.swap ? uTailStart - 300 : lerp(uTailStart, uTailEnd, reveal);
  const centreFull = (span.vMin + span.vMax) / 2;
  const centre = lerp(0, centreFull, grow);
  const bow = lerp(70, 0, smoothstep(0.2, 0.85, grow));
  const N = 72;
  const spine: Pt[] = [];
  const half: number[] = [];
  for (let k = 0; k <= N; k++) {
    const u = lerp(uTail, Math.max(uHead, uTail + 1), k / N);
    const along = (u - uTail) / Math.max(1, uHead - uTail);
    const v = centre + bow * Math.sin(Math.PI * along);
    spine.push(toScreen(O, u, v));
    const th = Math.sqrt(smoothstep(0, headTaper, uHead - u));
    const tt = Math.sqrt(smoothstep(0, tailTaper, u - uTail));
    half.push((halfCore + EDGE) * th * tt);
  }
  return {spine, half, opacity: 1, coreMix: 1, streak: 1, phase: 'band'};
};

/** Scarf-attached wisp (layer with Kavey). Hidden while the band carries it. */
export const scarfWisp = (f: number): RibbonShape | null => {
  if (f >= K.cross && f < K.swap) return null;
  if (f >= K.swap) return wisp(f, 0);
  const swing = f < K.sweep ? 0 : ease.cubicInOut(invLerp(K.sweep, K.cross, f));
  return wisp(f, swing);
};

/** The lens-crossing band (transition layer, above everything). */
export const transitionBand = (f: number): RibbonShape | null => (f >= K.cross && f < K.reveal ? band(f) : null);

export const AXIS = {AX, NV, axisOrigin};
