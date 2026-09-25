// The three animated problems and the holograms Kavolt turns them into:
// the clashing calendar critter (salon), runaway invoice planes and the
// payment card (gym), the snoring clock, sleepers and reminder birds
// (clinic). Plus Kavey's thrown cube, impact bursts and chaos alerts.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {PALETTE, rgba} from '../config/palette.ts';
import {FONT_MONO, FONT_SANS} from '../config/type.ts';
import {bump, clamp, ease, invLerp, lerp, ring, SPR, spring01} from '../lib/anim.ts';
import {hash01} from '../lib/random.ts';
import {DISTRICT} from './camera.ts';
import {C, calm, CONFETTI, COPY2} from './config.ts';
import {cityAnchorWorld, cityRigScale} from './kavey.ts';
import {
  birdState,
  blockState,
  CAL,
  CARD,
  cardRow,
  CHAT,
  chatSlot,
  CLOCK,
  HOLO_HOME,
  HUB_SLOT,
  holoFlight,
  planeState,
  THROWS,
  windowCenter,
  type Throw,
} from './story.ts';
import {Layer, WorldDiv} from './world/Layer.tsx';
import {SHOP} from './world/shop.ts';

const WHITE = '#FFFFFF';
const PAPER = '#F1ECFF';
const INK = '#1A1024';

// ------------------------------------------------------------------ shared bits
const Check: React.FC<{x: number; y: number; r: number; s?: number; color?: string}> = ({x, y, r, s = 1, color = PALETTE.cyan}) =>
  s <= 0.001 ? null : (
    <g transform={`translate(${x}, ${y}) scale(${s})`}>
      <circle r={r} fill={rgba(color, 0.18)} stroke={color} strokeWidth={r * 0.16} />
      <path d={`M${-r * 0.45},${0} L${-r * 0.1},${r * 0.35} L${r * 0.5},${-r * 0.35}`} fill="none" stroke={WHITE} strokeWidth={r * 0.2} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );

const Bang: React.FC<{x: number; y: number; s: number; color?: string}> = ({x, y, s, color = PALETTE.magenta}) =>
  s <= 0.001 ? null : (
    <g transform={`translate(${x}, ${y}) scale(${s})`}>
      {Array.from({length: 8}, (_, k) => {
        const a = (k / 8) * Math.PI * 2 + 0.2;
        return <line key={k} x1={Math.cos(a) * 30} y1={Math.sin(a) * 30} x2={Math.cos(a) * 52} y2={Math.sin(a) * 52} stroke={color} strokeWidth={6} strokeLinecap="round" />;
      })}
      <circle r={24} fill={color} />
      <text y={11} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={800} fontSize={34} fill={WHITE}>
        !
      </text>
    </g>
  );

/** Pop in/out scale for a short-lived badge. */
const popAt = (f: number, at: number, hold = 18) => {
  if (f < at) return 0;
  const inn = spring01(f - at, SPR.pop);
  const out = 1 - ease.cubicIn(invLerp(at + hold, at + hold + 6, f));
  return Math.max(0, inn * out);
};

/** Impact: two shockwave rings, radial sparks and a short soft flash (no white-out). */
export const Burst: React.FC<{f: number; at: number; x: number; y: number; size?: number; color?: string}> = ({f, at, x, y, size = 1, color = PALETTE.cyan}) => {
  const t = f - at;
  if (t < 0 || t > 34) return null;
  const r1 = 200 * size * ease.cubicOut(clamp(t / 18));
  const r2 = 150 * size * ease.cubicOut(clamp((t - 4) / 18));
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle r={90 * size} fill={rgba(WHITE, 0.35 * (1 - clamp(t / 8)))} />
      <circle r={r1} fill="none" stroke={color} strokeWidth={12 * (1 - clamp(t / 18))} opacity={1 - clamp(t / 20)} />
      {t > 4 ? <circle r={r2} fill="none" stroke={PALETTE.magenta} strokeWidth={8 * (1 - clamp((t - 4) / 18))} opacity={1 - clamp((t - 4) / 20)} /> : null}
      {Array.from({length: 14}, (_, k) => {
        const a = (k / 14) * Math.PI * 2 + hash01(at, k) * 0.4;
        const d0 = 40 * size + 220 * size * ease.cubicOut(clamp(t / 22));
        const len = 46 * size * (1 - clamp(t / 24));
        if (len <= 0.5) return null;
        return (
          <line
            key={k}
            x1={Math.cos(a) * d0}
            y1={Math.sin(a) * d0}
            x2={Math.cos(a) * (d0 + len)}
            y2={Math.sin(a) * (d0 + len)}
            stroke={k % 3 === 0 ? PALETTE.magenta : k % 3 === 1 ? WHITE : color}
            strokeWidth={5}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
};

/** Little four-point star sparkles scattering from a point. */
export const Sparkles: React.FC<{f: number; at: number; x: number; y: number; n?: number; spread?: number; seed?: number}> = ({f, at, x, y, n = 8, spread = 110, seed = 0}) => {
  const t = f - at;
  if (t < 0 || t > 40) return null;
  return (
    <g>
      {Array.from({length: n}, (_, k) => {
        const a = hash01(seed, k, 1) * Math.PI * 2;
        const d = spread * (0.4 + 0.6 * hash01(seed, k, 2)) * ease.cubicOut(clamp(t / 26));
        const s = (6 + 8 * hash01(seed, k, 3)) * (1 - clamp((t - 14) / 26));
        if (s <= 0.2) return null;
        const px = x + Math.cos(a) * d;
        const py = y + Math.sin(a) * d - t * 0.8;
        const col = k % 3 === 0 ? PALETTE.magenta : k % 3 === 1 ? PALETTE.cyan : WHITE;
        return <path key={k} d={`M${px},${py - s} L${px + s * 0.25},${py - s * 0.25} L${px + s},${py} L${px + s * 0.25},${py + s * 0.25} L${px},${py + s} L${px - s * 0.25},${py + s * 0.25} L${px - s},${py} L${px - s * 0.25},${py - s * 0.25} Z`} fill={col} />;
      })}
    </g>
  );
};

/** Hologram panel: translucent violet glass, cyan edge, scanlines, corner brackets, top-down reveal. */
const Holo: React.FC<{id: string; w: number; h: number; appear: number; f: number; children?: React.ReactNode}> = ({id, w, h, appear, f, children}) => {
  if (appear <= 0.001) return null;
  const x0 = -w / 2;
  const y0 = -h / 2;
  // materialising shimmer (smooth, not strobing)
  const flicker = appear < 1 ? 0.8 + 0.2 * Math.sin(f * 1.1 + w) : 1;
  const br = 26;
  return (
    <g opacity={flicker}>
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect x={x0 - 20} y={y0 - 20} width={w + 40} height={(h + 40) * clamp(appear)} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect x={x0} y={y0} width={w} height={h} rx={22} fill={rgba(PALETTE.violet, 0.2)} />
        <rect x={x0} y={y0} width={w} height={h} rx={22} fill="url(#scan)" />
        <rect x={x0} y={y0} width={w} height={h} rx={22} fill="none" stroke={PALETTE.cyan} strokeWidth={3} filter="url(#neon)" opacity={0.9} />
        {children}
      </g>
      {[
        [x0 - 10, y0 - 10, 1, 1],
        [x0 + w + 10, y0 - 10, -1, 1],
        [x0 - 10, y0 + h + 10, 1, -1],
        [x0 + w + 10, y0 + h + 10, -1, -1],
      ].map(([cx, cy, sx, sy], k) => (
        <path key={k} d={`M${cx},${cy + sy * br} L${cx},${cy} L${cx + sx * br},${cy}`} fill="none" stroke={PALETTE.magenta} strokeWidth={5} strokeLinecap="round" opacity={clamp(appear * 1.5)} />
      ))}
      {/* scanning line */}
      {appear < 1 ? <rect x={x0 - 20} y={y0 - 20 + (h + 40) * appear - 3} width={w + 40} height={6} fill={PALETTE.cyan} opacity={0.9} /> : null}
    </g>
  );
};

/** World placement of hologram i: at home, then flying into the build hub. */
export const holoPlace = (i: number, f: number) => {
  const u = holoFlight(i, f);
  const home = HOLO_HOME[i];
  const slot = HUB_SLOT[i];
  const arc = Math.sin(Math.PI * u) * 260;
  return {x: lerp(home.x, slot.x, u), y: lerp(home.y, slot.y, u) - arc, s: lerp(1, 0.52, ease.cubicIn(u)), o: f >= C.holoMerge + 2 ? 0 : 1, rot: Math.sin(Math.PI * u) * (i - 1) * -12};
};

// ------------------------------------------------------------------ salon: calendar critter
const Block: React.FC<{i: number; f: number; ox: number; oy: number}> = ({i, f, ox, oy}) => {
  const b = blockState(i, f);
  if (b.o <= 0) return null;
  const col = [PALETTE.magenta, PALETTE.violet, '#B98CFF', '#FF7BE5'][i];
  const check = popAt(f, C.salonChecks + i * 3, 1000);
  return (
    <g transform={`translate(${b.x - ox}, ${b.y - oy}) rotate(${b.rot})`}>
      <rect x={-42} y={-24} width={84} height={48} rx={12} fill={col} stroke={b.fixed > 0.01 ? rgba(PALETTE.cyan, b.fixed) : rgba(INK, 0.4)} strokeWidth={b.fixed > 0.01 ? 4 : 2} />
      <circle cx={-22} cy={0} r={11} fill={rgba(WHITE, 0.9)} />
      <rect x={-6} y={-8} width={36} height={6} rx={3} fill={rgba(WHITE, 0.85)} />
      <rect x={-6} y={4} width={24} height={6} rx={3} fill={rgba(WHITE, 0.6)} />
      <Check x={34} y={-20} r={14} s={check} />
    </g>
  );
};

const Calendar: React.FC<{f: number}> = ({f}) => {
  const place = holoPlace(0, f);
  if (place.o <= 0) return null;
  const holo = clamp((f - C.salonHit) / 10);
  const W = CAL.w;
  const H = CAL.h;
  // shake and squash on every clash
  let jx = 0;
  let sq = 0;
  for (const h of C.clashHits) {
    jx += ring(f, h, 9, 6, 6);
    sq += ring(f, h, 0.07, 10, 6);
  }
  const breathe = holo < 1 ? 0.015 * Math.sin(f * 0.25) : 0.01 * Math.sin(f * 0.08);
  const angry = f >= C.clashHits[0] && holo < 0.5;
  const lookY = f < C.clashHits[3] + 10 ? -4 : 0;
  const lookX = Math.sin(f * 0.3) * (angry ? 3 : 1);
  const paper = holo < 1 ? PAPER : rgba(PALETTE.violet, 0.18);
  const header = holo < 0.5 ? PALETTE.magenta : rgba(PALETTE.violet, 0.5);
  const big = popAt(f, C.salonChecks + 14, 1000);
  const label = spring01(f - C.salonHit - 8, SPR.pop);
  return (
    <g transform={`translate(${place.x + jx}, ${place.y}) rotate(${place.rot}) scale(${place.s * (1 - sq * 0.3 + breathe)}, ${place.s * (1 + sq + breathe)})`}>
      {/* legs (critter) */}
      {holo < 1 ? (
        <g opacity={1 - holo} stroke={INK} strokeWidth={10} strokeLinecap="round">
          <line x1={-60} y1={H / 2 - 4} x2={-70 + 6 * Math.sin(f * 0.6)} y2={H / 2 + 36} />
          <line x1={60} y1={H / 2 - 4} x2={70 - 6 * Math.sin(f * 0.6)} y2={H / 2 + 36} />
        </g>
      ) : null}
      <rect x={-W / 2} y={-H / 2} width={W} height={H} rx={26} fill={paper} stroke={holo > 0 ? rgba(PALETTE.cyan, holo) : 'none'} strokeWidth={4} filter={holo > 0.5 ? 'url(#neon)' : undefined} />
      {holo > 0 ? <rect x={-W / 2} y={-H / 2} width={W} height={H} rx={26} fill="url(#scan)" opacity={holo} /> : null}
      <path d={`M${-W / 2},${-H / 2 + 26} A26,26 0 0 1 ${-W / 2 + 26},${-H / 2} L${W / 2 - 26},${-H / 2} A26,26 0 0 1 ${W / 2},${-H / 2 + 26} L${W / 2},${-H / 2 + 74} L${-W / 2},${-H / 2 + 74} Z`} fill={header} />
      {[-80, 80].map((x) => (
        <rect key={x} x={x - 8} y={-H / 2 - 24} width={16} height={46} rx={8} fill={holo < 0.5 ? '#2A1F40' : PALETTE.cyan} />
      ))}
      {/* grid */}
      <g stroke={holo < 0.5 ? '#CBBEEB' : rgba(PALETTE.cyan, 0.5)} strokeWidth={3}>
        {[-138, -46, 46, 138].map((x) => (
          <line key={`v${x}`} x1={x} y1={-79} x2={x} y2={155} />
        ))}
        {[-79, -1, 77, 155].map((y) => (
          <line key={`h${y}`} x1={-138} y1={y} x2={138} y2={y} />
        ))}
      </g>
      {/* face in the header */}
      {[-46, 46].map((x, k) =>
        holo < 0.5 ? (
          <g key={x}>
            <circle cx={x} cy={-H / 2 + 40} r={17} fill={WHITE} />
            <circle cx={x + lookX} cy={-H / 2 + 40 + lookY} r={8} fill={INK} />
            {angry ? <line x1={x - 20} y1={-H / 2 + 14 + (k ? -6 : 6)} x2={x + 18} y2={-H / 2 + 14 + (k ? 6 : -6)} stroke={INK} strokeWidth={6} strokeLinecap="round" /> : null}
          </g>
        ) : (
          <path key={x} d={`M${x - 14},${-H / 2 + 44} Q${x},${-H / 2 + 26} ${x + 14},${-H / 2 + 44}`} fill="none" stroke={WHITE} strokeWidth={6} strokeLinecap="round" />
        ),
      )}
      {holo < 0.5 ? (
        angry ? (
          <path d={`M-22,${-H / 2 + 64} l8,-6 l8,6 l8,-6 l8,6 l8,-6`} fill="none" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        ) : (
          <circle cx={0} cy={-H / 2 + 62} r={5} fill={INK} />
        )
      ) : (
        <path d={`M-16,${-H / 2 + 58} Q0,${-H / 2 + 70} 16,${-H / 2 + 58}`} fill="none" stroke={WHITE} strokeWidth={5} strokeLinecap="round" />
      )}
      {[0, 1, 2, 3].map((i) => (
        <Block key={i} i={i} f={f} ox={CAL.x} oy={CAL.y} />
      ))}
      {C.clashHits.map((h, i) => {
        const b = blockState(i, h);
        return <Bang key={h} x={b.x - CAL.x + (i % 2 ? 60 : -60)} y={b.y - CAL.y - 70} s={popAt(f, h, 12)} />;
      })}
      {C.salonSnaps.map((s, i) => {
        const b = blockState(i, s + 10);
        return <Sparkles key={s} f={f} at={s + 2} x={b.x - CAL.x} y={b.y - CAL.y} n={7} spread={70} seed={i + 10} />;
      })}
      {label > 0.01 ? (
        <g transform={`translate(0, ${-H / 2 - 58}) scale(${clamp(label, 0, 1.2)})`}>
          <rect x={-86} y={-22} width={172} height={44} rx={22} fill={rgba(PALETTE.background, 0.8)} stroke={PALETTE.cyan} strokeWidth={3} />
          <text y={9} textAnchor="middle" fontFamily={FONT_MONO} fontWeight={600} fontSize={24} letterSpacing="0.08em" fill={WHITE}>
            {COPY2.ui.booking}
          </text>
        </g>
      ) : null}
      <Check x={W / 2 - 6} y={-H / 2 + 6} r={34} s={big} />
    </g>
  );
};

// ------------------------------------------------------------------ gym: invoice planes + payment card
const Plane: React.FC<{i: number; f: number}> = ({i, f}) => {
  const p = planeState(i, f);
  if (!p.visible) return null;
  const flip = Math.cos((p.rot * Math.PI) / 180) < 0 ? -1 : 1;
  const conv = clamp((f - (C.planesBack[i] - 4)) / 6);
  const s = 1.15 * (1 - conv * 0.7);
  const tagSwing = 16 * Math.sin(f * 0.35 + i);
  return (
    <g transform={`translate(${p.x}, ${p.y}) rotate(${p.rot}) scale(${s}, ${s * flip})`} opacity={1 - conv * 0.6}>
      {/* PENDING tag on a string */}
      <line x1={-34} y1={2} x2={-78} y2={26 + tagSwing * 0.3} stroke={rgba(WHITE, 0.6)} strokeWidth={2} />
      <g transform={`translate(-128, ${22 + tagSwing * 0.3}) rotate(${tagSwing * 0.5})`}>
        <rect x={0} y={-4} width={104} height={28} rx={6} fill={PALETTE.magenta} />
        <text x={52} y={16} textAnchor="middle" fontFamily={FONT_MONO} fontWeight={700} fontSize={15} letterSpacing="0.06em" fill={WHITE} transform={flip < 0 ? 'scale(1,-1) translate(0,-20)' : undefined}>
          {COPY2.ui.pending}
        </text>
      </g>
      <path d="M48,0 L-36,-30 L-18,0 Z" fill={PAPER} />
      <path d={`M48,0 L-36,${26 + 6 * p.flap} L-18,0 Z`} fill="#CFC3F0" />
      <path d="M48,0 L-18,0" stroke="#A796DA" strokeWidth={2} />
      {/* eyes */}
      <circle cx={16} cy={-9} r={6} fill={WHITE} stroke={INK} strokeWidth={1.5} />
      <circle cx={30} cy={-5} r={5} fill={WHITE} stroke={INK} strokeWidth={1.5} />
      <circle cx={18} cy={-8} r={2.8} fill={INK} />
      <circle cx={32} cy={-4} r={2.4} fill={INK} />
    </g>
  );
};

const PayCard: React.FC<{f: number}> = ({f}) => {
  const place = holoPlace(1, f);
  if (place.o <= 0) return null;
  const appear = ease.cubicOut(clamp((f - C.gymHit - 2) / 16));
  const pulse = bump(f, C.gymChecks + 4, 14);
  const big = popAt(f, C.gymChecks, 1000);
  return (
    <g transform={`translate(${place.x}, ${place.y}) rotate(${place.rot}) scale(${place.s * (1 + 0.04 * pulse)})`}>
      <Holo id="pay" w={CARD.w} h={CARD.h} appear={appear} f={f}>
        <rect x={-CARD.w / 2} y={-CARD.h / 2} width={CARD.w} height={64} rx={22} fill={rgba(PALETTE.violet, 0.45)} />
        <text x={-CARD.w / 2 + 24} y={-CARD.h / 2 + 42} fontFamily={FONT_MONO} fontWeight={700} fontSize={26} letterSpacing="0.06em" fill={WHITE}>
          {COPY2.ui.razorpay}
        </text>
        <g transform={`translate(${CARD.w / 2 - 50}, ${-CARD.h / 2 + 32})`}>
          <rect x={-22} y={-15} width={44} height={30} rx={5} fill="none" stroke={PALETTE.cyan} strokeWidth={3} />
          <line x1={-22} y1={-5} x2={22} y2={-5} stroke={PALETTE.cyan} strokeWidth={4} />
        </g>
        <text x={-CARD.w / 2 + 24} y={-CARD.h / 2 + 100} fontFamily={FONT_MONO} fontWeight={600} fontSize={18} letterSpacing="0.1em" fill={rgba(WHITE, 0.7)}>
          {COPY2.ui.payments}
        </text>
        {[0, 1, 2, 3].map((i) => {
          const r = cardRow(i);
          const y = r.y - CARD.y;
          const paid = clamp(spring01(f - C.planesBack[i], SPR.pop));
          return (
            <g key={i}>
              <circle cx={-CARD.w / 2 + 40} cy={y} r={16} fill={rgba(PALETTE.magenta, 0.7)} />
              <rect x={-CARD.w / 2 + 66} y={y - 12} width={100} height={9} rx={4} fill={rgba(WHITE, 0.55)} />
              <rect x={-CARD.w / 2 + 66} y={y + 4} width={64} height={8} rx={4} fill={rgba(WHITE, 0.3)} />
              {paid < 0.02 ? (
                <g fill={rgba(WHITE, 0.3)}>
                  {[0, 1, 2].map((k) => (
                    <circle key={k} cx={60 + k * 16} cy={y} r={4 + 1.5 * Math.sin(f * 0.3 + k)} />
                  ))}
                </g>
              ) : (
                <g transform={`translate(78, ${y}) scale(${paid})`}>
                  <rect x={-48} y={-17} width={96} height={34} rx={17} fill={rgba(PALETTE.cyan, 0.16)} stroke={PALETTE.cyan} strokeWidth={3} />
                  <text x={-8} y={7} textAnchor="middle" fontFamily={FONT_MONO} fontWeight={700} fontSize={18} letterSpacing="0.06em" fill={WHITE}>
                    {COPY2.ui.paid}
                  </text>
                  <path d="M22,0 L29,7 L41,-7" fill="none" stroke={PALETTE.cyan} strokeWidth={4} strokeLinecap="round" />
                </g>
              )}
            </g>
          );
        })}
      </Holo>
      {C.planesBack.map((a, i) => (
        <Sparkles key={a} f={f} at={a} x={78} y={cardRow(i).y - CARD.y} n={7} spread={70} seed={30 + i} />
      ))}
      <Check x={CARD.w / 2 + 4} y={-CARD.h / 2 + 4} r={34} s={big} />
    </g>
  );
};

// ------------------------------------------------------------------ clinic: clock, sleepers, chat, birds
const Clock: React.FC<{f: number}> = ({f}) => {
  if (f < 1150 || f > 1690) return null;
  const awake = f >= C.clinicWake;
  const snore = awake ? 0 : Math.sin((f - 1277) * 0.12);
  const jump = awake ? 44 * Math.max(0, Math.sin(Math.PI * clamp((f - C.clinicWake) / 16))) : 0;
  const shakeR = awake ? 14 * Math.exp(-(f - C.clinicWake) / 16) * Math.sin((f - C.clinicWake) * 2.4) : 0;
  const R = CLOCK.r;
  const smile = f > C.clinicWake + 14;
  const zz = !awake
    ? Array.from({length: 4}, (_, k) => {
        const ph = (((f - 1277 + k * 15) % 60) + 60) % 60 / 60;
        return (
          <text key={k} x={R * 0.6 + ph * 70 + 8 * Math.sin(ph * 6)} y={-R - 30 - ph * 150} fontFamily={FONT_SANS} fontWeight={800} fontSize={28 + ph * 22} fill={WHITE} opacity={Math.sin(Math.PI * ph) * 0.9}>
            Z
          </text>
        );
      })
    : null;
  return (
    <g transform={`translate(${CLOCK.x}, ${CLOCK.y - jump}) rotate(${shakeR})`}>
      <g stroke={INK} strokeWidth={10} strokeLinecap="round">
        <line x1={-40} y1={R - 10} x2={-58} y2={R + 34 - (awake ? 0 : 0)} />
        <line x1={40} y1={R - 10} x2={58} y2={R + 34} />
      </g>
      {[-1, 1].map((s) => (
        <g key={s} transform={`rotate(${awake ? s * 10 * Math.sin((f - C.clinicWake) * 2.2) * Math.exp(-(f - C.clinicWake) / 30) : 0}, ${s * 56}, ${-R + 2})`}>
          <circle cx={s * 56} cy={-R + 2} r={30} fill={PALETTE.violet} />
          <rect x={s * 56 - 6} y={-R - 36} width={12} height={12} rx={4} fill={PALETTE.violet} />
        </g>
      ))}
      <circle r={R * (1 + 0.03 * snore)} fill={PAPER} stroke="#5B3E9E" strokeWidth={12} />
      {Array.from({length: 12}, (_, k) => {
        const a = (k / 12) * Math.PI * 2;
        return <line key={k} x1={Math.cos(a) * (R - 22)} y1={Math.sin(a) * (R - 22)} x2={Math.cos(a) * (R - 12)} y2={Math.sin(a) * (R - 12)} stroke="#B8A8E0" strokeWidth={4} />;
      })}
      {/* hands */}
      <line x1={0} y1={0} x2={Math.sin(f * (awake ? 0.3 : 0.01)) * 50} y2={-Math.cos(f * (awake ? 0.3 : 0.01)) * 50} stroke={PALETTE.magenta} strokeWidth={6} strokeLinecap="round" opacity={0.6} />
      {/* face */}
      {awake ? (
        <>
          <circle cx={-28} cy={-14} r={15} fill={WHITE} stroke={INK} strokeWidth={3} />
          <circle cx={28} cy={-14} r={15} fill={WHITE} stroke={INK} strokeWidth={3} />
          <circle cx={-26} cy={-12} r={7} fill={INK} />
          <circle cx={30} cy={-12} r={7} fill={INK} />
          {smile ? <path d="M-24,24 Q0,46 24,24" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" /> : <ellipse cx={0} cy={30} rx={12} ry={16} fill={INK} />}
        </>
      ) : (
        <>
          <path d="M-42,-12 Q-28,-2 -14,-12" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
          <path d="M14,-12 Q28,-2 42,-12" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
          <ellipse cx={0} cy={28} rx={10 + 4 * snore} ry={8 + 6 * Math.max(0, snore)} fill={INK} />
        </>
      )}
      {zz}
      <Bang x={R + 20} y={-R - 20} s={popAt(f, C.clinicWake, 16)} />
    </g>
  );
};

/** Clients asleep in the flats above the clinic; each wakes when a reminder bird lands. */
const Sleepers: React.FC<{f: number}> = ({f}) => {
  if (f < 1150 || f > 1690) return null;
  return (
    <g>
      {[0, 1, 2, 3].map((i) => {
        const w = windowCenter(i);
        const land = C.birdsLand[i];
        const woke = clamp((f - land) / 8);
        const ww = SHOP.winW;
        const wh = SHOP.winH;
        const ph = (((f + i * 17) % 50) + 50) % 50 / 50;
        return (
          <g key={i}>
            <rect x={w.x - ww / 2} y={w.y - wh / 2} width={ww} height={wh} rx={4} fill={rgba('#E6DAFF', 0.08 + 0.45 * woke)} />
            {/* pillow and head */}
            <ellipse cx={w.x - 18} cy={w.y + 30} rx={30} ry={11} fill={rgba(WHITE, 0.35 + 0.2 * woke)} />
            <circle cx={w.x - 16 + 22 * woke} cy={w.y + 16 - 22 * woke} r={15} fill="#E6D9F5" opacity={0.85} />
            {woke < 0.5 ? (
              <text x={w.x + 18 + ph * 20} y={w.y - 4 - ph * 40} fontFamily={FONT_SANS} fontWeight={800} fontSize={20 + ph * 10} fill={WHITE} opacity={Math.sin(Math.PI * ph) * 0.85}>
                z
              </text>
            ) : null}
            <Bang x={w.x + 40} y={w.y - wh / 2 - 26} s={0.6 * popAt(f, land, 14)} />
            <Check x={w.x + 40} y={w.y - wh / 2 - 22} r={22} s={popAt(f, land + 20, 1000)} />
          </g>
        );
      })}
    </g>
  );
};

const Bird: React.FC<{f: number; x: number; y: number; rot: number; flap: number; folded: number; s?: number}> = ({x, y, rot, flap, folded, s = 1}) => {
  const wing = lerp(flap * 34, 6, folded);
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rot}) scale(${s})`}>
      <path d={`M-4,-10 Q-26,${-24 - wing} -44,${-12 - wing * 0.8} Q-24,-4 -4,-2 Z`} fill="#D9CCFF" />
      <path d={`M4,-10 Q26,${-24 - wing} 44,${-12 - wing * 0.8} Q24,-4 4,-2 Z`} fill="#D9CCFF" />
      <rect x={-28} y={-20} width={56} height={40} rx={14} fill={WHITE} />
      <path d="M-14,18 L-22,32 L-2,20 Z" fill={WHITE} />
      <rect x={-16} y={-8} width={24} height={5} rx={2.5} fill={PALETTE.violet} />
      <rect x={-16} y={2} width={16} height={5} rx={2.5} fill={rgba(PALETTE.violet, 0.6)} />
      <circle cx={16} cy={-6} r={4} fill={INK} />
      <path d="M26,-2 L36,2 L26,6 Z" fill={PALETTE.magenta} />
    </g>
  );
};

const ChatPanel: React.FC<{f: number}> = ({f}) => {
  const place = holoPlace(2, f);
  if (place.o <= 0) return null;
  const appear = ease.cubicOut(clamp((f - C.clinicHit - 2) / 16));
  const bubble = spring01(f - C.clinicHit - 12, SPR.pop);
  const W = CHAT.w;
  const H = CHAT.h;
  return (
    <g transform={`translate(${place.x}, ${place.y}) rotate(${place.rot}) scale(${place.s})`}>
      <Holo id="chat" w={W} h={H} appear={appear} f={f}>
        <rect x={-W / 2} y={-H / 2} width={W} height={60} rx={22} fill={rgba(PALETTE.violet, 0.45)} />
        <g transform={`translate(${-W / 2 + 36}, ${-H / 2 + 30})`}>
          <circle r={16} fill="none" stroke={PALETTE.cyan} strokeWidth={4} />
          <path d="M-10,12 L-16,20 L-2,15" fill={PALETTE.cyan} />
        </g>
        <text x={-W / 2 + 64} y={-H / 2 + 40} fontFamily={FONT_MONO} fontWeight={700} fontSize={24} letterSpacing="0.06em" fill={WHITE}>
          {COPY2.ui.whatsapp}
        </text>
        {bubble > 0.01 ? (
          <g transform={`translate(${-W / 2 + 22}, ${-H / 2 + 82}) scale(${clamp(bubble, 0, 1.2)})`}>
            <rect x={0} y={0} width={220} height={82} rx={18} fill={rgba(WHITE, 0.95)} />
            <path d="M0,62 L-12,86 L22,70 Z" fill={rgba(WHITE, 0.95)} />
            <g transform="translate(30, 30)" fill="none" stroke={PALETTE.violet} strokeWidth={4} strokeLinejoin="round">
              <path d="M-11,6 Q-11,-12 0,-12 Q11,-12 11,6 L14,10 L-14,10 Z" />
              <line x1={-3} y1={15} x2={3} y2={15} strokeLinecap="round" />
            </g>
            <text x={54} y={38} fontFamily={FONT_MONO} fontWeight={700} fontSize={19} letterSpacing="0.06em" fill={INK}>
              {COPY2.ui.reminder}
            </text>
            <rect x={54} y={52} width={130} height={8} rx={4} fill={rgba(PALETTE.violet, 0.5)} />
          </g>
        ) : null}
      </Holo>
      {/* folded reminder birds waiting in the tray */}
      {[0, 1, 2, 3].map((i) => {
        if (f >= C.birds[i]) return null;
        const s = chatSlot(i);
        const pop = spring01(f - C.clinicHit - 18 - i * 3, SPR.pop);
        if (pop <= 0.01) return null;
        return <Bird key={i} f={f} x={s.x - CHAT.x} y={s.y - CHAT.y + 2 * Math.sin(f * 0.2 + i)} rot={0} flap={0} folded={1} s={0.8 * clamp(pop, 0, 1.2)} />;
      })}
    </g>
  );
};

const Birds: React.FC<{f: number}> = ({f}) => (
  <g>
    {[0, 1, 2, 3].map((i) => {
      const b = birdState(i, f);
      if (!b.visible) return null;
      const hop = b.landed > 0 ? -10 * Math.sin(Math.PI * clamp(b.landed * 2)) : 0;
      return <Bird key={i} f={f} x={b.x} y={b.y + hop} rot={b.rot} flap={b.flap} folded={b.landed} s={0.8 + 0.2 * (1 - b.landed)} />;
    })}
    {C.birdsLand.map((t, i) => {
      const w = windowCenter(i);
      return <Sparkles key={t} f={f} at={t} x={w.x} y={w.y + 30} n={8} spread={80} seed={50 + i} />;
    })}
  </g>
);

// ------------------------------------------------------------------ cube throw
const cubeCorner = (th: Throw, i: number) => {
  const size = [CAL, CARD, CHAT][i];
  return {x: th.target.x + size.w / 2 - 4, y: th.target.y - size.h / 2 - 26 - (i === 0 ? 40 : 0)};
};

type CubeState = {x: number; y: number; rot: number; scale: number; glow: number; flying: boolean};

export const thrownCube = (f: number): (CubeState & {th: Throw; i: number}) | null => {
  const i = THROWS.findIndex((t) => f >= t.release && f < t.back1);
  if (i < 0) return null;
  const th = THROWS[i];
  const s0 = cityRigScale(th.release);
  const start = cityAnchorWorld(th.release, 'cube');
  const bez = (a: {x: number; y: number}, c: {x: number; y: number}, b: {x: number; y: number}, u: number) => ({
    x: (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * c.x + u * u * b.x,
    y: (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * c.y + u * u * b.y,
  });
  const corner = cubeCorner(th, i);
  if (f < th.hit) {
    const u = ease.quadOut(invLerp(th.release, th.hit, f));
    const c = {x: (start.x + th.target.x) / 2, y: Math.min(start.y, th.target.y) - 260};
    const p = bez(start, c, th.target, u);
    return {...p, rot: 900 * u, scale: s0 * (1.3 + 0.2 * Math.sin(Math.PI * u)), glow: 1, flying: true, th, i};
  }
  if (f < th.back0) {
    const u = ease.backOut(1.4)(invLerp(th.hit, th.hit + 14, f));
    const p = {x: lerp(th.target.x, corner.x, u), y: lerp(th.target.y, corner.y, u)};
    return {...p, rot: 900 + 30 * Math.sin((f - th.hit) * 0.08), scale: s0 * 1.25, glow: 0.8, flying: false, th, i};
  }
  const u = ease.cubicInOut(invLerp(th.back0, th.back1, f));
  const home = cityAnchorWorld(f, 'cube');
  const c = {x: (corner.x + home.x) / 2, y: Math.min(corner.y, home.y) - 180};
  const p = bez(corner, c, home, u);
  return {...p, rot: 900 + 360 * u, scale: s0 * lerp(1.25, 1, u), glow: 0.8, flying: true, th, i};
};

/** The cube image, drawn in world space (HTML layer so the image is preloaded). */
export const ThrownCubeImg: React.FC<{f: number}> = ({f}) => {
  const c = thrownCube(f);
  if (!c) return null;
  const s = c.scale;
  return (
    <WorldDiv f={f}>
      <div
        style={{
          position: 'absolute',
          left: c.x - 335 * s,
          top: c.y - 415 * s,
          width: 360 * s,
          height: 675 * s,
          transformOrigin: `${335 * s}px ${415 * s}px`,
          transform: `rotate(${c.rot}deg)`,
          filter: `drop-shadow(0 0 ${14 * c.glow}px ${rgba(PALETTE.magenta, 0.8)})`,
        }}
      >
        <Img src={staticFile('assets/kavey/cube.png')} style={{width: '100%', height: '100%', display: 'block'}} />
      </div>
    </WorldDiv>
  );
};

/** Comet trail behind the flying cube and projector beams while it is docked. */
const CubeFx: React.FC<{f: number}> = ({f}) => {
  const c = thrownCube(f);
  const out: React.ReactNode[] = [];
  if (c && c.flying) {
    const pts: {x: number; y: number}[] = [];
    for (let k = 0; k <= 8; k++) {
      const q = thrownCube(f - k * 0.8);
      if (q && q.flying) pts.push(q);
    }
    for (let k = 1; k < pts.length; k++) {
      out.push(<line key={`t${k}`} x1={pts[k - 1].x} y1={pts[k - 1].y} x2={pts[k].x} y2={pts[k].y} stroke={rgba(PALETTE.magenta, 0.7 * (1 - k / pts.length))} strokeWidth={26 * (1 - k / pts.length)} strokeLinecap="round" />);
    }
  }
  if (c && !c.flying) {
    const size = [CAL, CARD, CHAT][c.i];
    const tl = {x: c.th.target.x - size.w / 2, y: c.th.target.y - size.h / 2};
    const br = {x: c.th.target.x + size.w / 2, y: c.th.target.y + size.h / 2};
    out.push(<polygon key="beam" points={`${c.x},${c.y} ${tl.x},${tl.y} ${br.x},${br.y}`} fill={rgba(PALETTE.cyan, 0.05 + 0.03 * Math.sin(f * 0.5))} />);
  }
  for (const th of THROWS) out.push(<Burst key={`b${th.hit}`} f={f} at={th.hit} x={th.target.x} y={th.target.y} size={1.1} />);
  for (const th of THROWS) {
    const home = cityAnchorWorld(th.back1, 'cube');
    out.push(<Sparkles key={`c${th.back1}`} f={f} at={th.back1} x={home.x} y={home.y} n={6} spread={60} seed={th.back1} />);
  }
  return <>{out}</>;
};

// ------------------------------------------------------------------ chaos alerts + flying paperwork
const Alerts: React.FC<{f: number}> = ({f}) => {
  const out: React.ReactNode[] = [];
  (['salon', 'gym', 'clinic'] as const).forEach((k, ki) => {
    const c = DISTRICT[k];
    const chaos = 1 - calm[k](f);
    if (chaos < 0.05) return;
    for (let j = 0; j < 3; j++) {
      const period = 44 + j * 9;
      const cycle = Math.floor((f + j * 17 + ki * 11) / period);
      const at = cycle * period - j * 17 - ki * 11;
      const x = c - 330 + hash01(ki, j, cycle) * 660;
      const y = 600 + hash01(ki, j, cycle, 2) * 380;
      out.push(<Bang key={`${k}${j}`} x={x} y={y} s={0.7 * chaos * popAt(f, at, 16)} />);
    }
  });
  return <>{out}</>;
};

const Papers: React.FC<{f: number}> = ({f}) => {
  if (f > 320) return null;
  return (
    <g>
      {Array.from({length: 10}, (_, k) => {
        const sp = 3 + 4 * hash01(k, 1);
        const x = -300 + hash01(k, 2) * 1500 + f * sp;
        const y = -200 + hash01(k, 3) * 1100 + 60 * Math.sin(f * 0.05 + k) + f * 1.2;
        const r = f * (2 + 3 * hash01(k, 4)) * (k % 2 ? 1 : -1);
        const flip = Math.cos(f * 0.1 + k);
        return (
          <g key={k} transform={`translate(${x}, ${y}) rotate(${r}) scale(${flip}, 1)`} opacity={0.85}>
            <rect x={-26} y={-34} width={52} height={68} rx={4} fill={PAPER} />
            <rect x={-18} y={-22} width={36} height={5} rx={2} fill="#B8A8E0" />
            <rect x={-18} y={-10} width={28} height={5} rx={2} fill="#B8A8E0" />
            <rect x={-18} y={2} width={32} height={5} rx={2} fill="#B8A8E0" />
            <rect x={-18} y={16} width={20} height={8} rx={2} fill={PALETTE.magenta} />
          </g>
        );
      })}
    </g>
  );
};

// ------------------------------------------------------------------ celebrations
const CONF_COLORS = ['#FF4F9A', '#FFD166', '#7C4DFF', '#3DDC97', '#4FB8F0', '#FF8A3D', '#FFFFFF'];

/** Confetti bursts over each shop when its problem is solved (and balloons drifting up). */
const Celebrations: React.FC<{f: number}> = ({f}) => {
  const out: React.ReactNode[] = [];
  const shops = ['salon', 'gym', 'clinic'] as const;
  CONFETTI.forEach((at, si) => {
    const t = f - at;
    if (t < 0 || t > 200) return;
    const cx = DISTRICT[shops[si]];
    for (let k = 0; k < 70; k++) {
      const a = -Math.PI / 2 + (hash01(si, k, 1) - 0.5) * 2.4;
      const v = 9 + 9 * hash01(si, k, 2);
      const x = cx + (hash01(si, k, 3) - 0.5) * 200 + Math.cos(a) * v * t + 14 * Math.sin(t * 0.15 + k);
      const y = 600 + Math.sin(a) * v * t + 0.16 * t * t;
      if (y > 1600) continue;
      const rot = t * (6 + 10 * hash01(si, k, 4)) * (k % 2 ? 1 : -1);
      const w = 12 + 8 * hash01(si, k, 5);
      out.push(<rect key={`c${si}-${k}`} x={x - w / 2} y={y - 5} width={w} height={10} rx={2} fill={CONF_COLORS[k % CONF_COLORS.length]} transform={`rotate(${rot}, ${x}, ${y})`} opacity={1 - clamp((t - 150) / 50)} />);
    }
    for (let k = 0; k < 5; k++) {
      const bt = t - k * 8;
      if (bt < 0) continue;
      const bx = cx - 260 + k * 130 + 20 * Math.sin(bt * 0.05 + k);
      const by = 1380 - bt * 5.5;
      const col = CONF_COLORS[(k * 3 + si) % CONF_COLORS.length];
      out.push(
        <g key={`b${si}-${k}`}>
          <path d={`M${bx},${by + 60} q${10 * Math.sin(bt * 0.1)},30 0,70`} fill="none" stroke={rgba('#FFFFFF', 0.6)} strokeWidth={2} />
          <ellipse cx={bx} cy={by} rx={34} ry={42} fill={col} />
          <ellipse cx={bx - 10} cy={by - 14} rx={8} ry={12} fill={rgba('#FFFFFF', 0.45)} />
          <path d={`M${bx - 6},${by + 42} L${bx + 6},${by + 42} L${bx},${by + 52} Z`} fill={col} />
        </g>,
      );
    }
  });
  return <>{out}</>;
};

// ------------------------------------------------------------------ composite layers
/** Props behind Kavey (world, street parallax). */
export const PropsBack: React.FC<{f: number}> = ({f}) => (
  <Layer f={f} p={1}>
    <defs>
      <pattern id="scan" width={8} height={8} patternUnits="userSpaceOnUse">
        <rect width={8} height={2} fill={rgba(PALETTE.cyan, 0.08)} />
      </pattern>
    </defs>
    <Papers f={f} />
    <Alerts f={f} />
    <Sleepers f={f} />
    <Clock f={f} />
    {f < C.holoMerge + 4 ? (
      <>
        <Calendar f={f} />
        <PayCard f={f} />
        <ChatPanel f={f} />
      </>
    ) : null}
    <CubeFx f={f} />
    <Celebrations f={f} />
  </Layer>
);

/** Flyers in front (planes, birds) — they cross in front of the shops. */
export const PropsFront: React.FC<{f: number}> = ({f}) =>
  f >= 800 && f < 1600 ? (
    <Layer f={f} p={1}>
      {[0, 1, 2, 3].map((i) => (
        <Plane key={i} i={i} f={f} />
      ))}
      <Birds f={f} />
    </Layer>
  ) : null;
