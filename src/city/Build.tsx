// Showcase, build and launch. The three holograms fly up and dock into
// devices: the salon gets a stunning website (laptop), the gym an app and the
// clinic a booking app (phones). Kavey paints the design in five beats —
// colour, type, layout, imagery, buttons — then the seven-day build runs
// (progress, private preview approved on day 06) and on day 07 everything
// goes LIVE: badges, a light wave, fireworks, and the devices shoot skyward.
import React from 'react';
import {PALETTE, rgba} from '../config/palette.ts';
import {FONT_MONO, FONT_SANS, TYPE} from '../config/type.ts';
import {bump, clamp, ease, invLerp, lerp, SPR, spring01} from '../lib/anim.ts';
import {hash01} from '../lib/random.ts';
import {C, COPY2} from './config.ts';
import {cityAnchorWorld} from './kavey.ts';
import {Burst, Sparkles} from './Props.tsx';
import {DEVICES, HUB, hubLift} from './story.ts';
import {Layer} from './world/Layer.tsx';

const WHITE = '#FFFFFF';
const INK = '#1A1024';

/** 0…1 progress of design beat k (spring pop). */
const beat = (f: number, k: number) => clamp(spring01(f - C.design[k], SPR.pop), 0, 1.15);
const built = (f: number, k: number) => clamp(invLerp(C.day2 + k * 18, C.day6 - 8 + k * 6, f));

const deviceState = (f: number, delay: number) => {
  const born = spring01(f - (C.holoMerge + delay), SPR.pop);
  const lift = hubLift(f);
  return {s: clamp(born, 0, 1.2) * (1 - 0.5 * lift), dy: -lift * 1700, o: clamp(born * 3) * (1 - clamp((lift - 0.8) / 0.2))};
};

const Pill: React.FC<{x: number; y: number; w: number; h: number; fill: string; text: string; size: number; s?: number; color?: string}> = ({x, y, w, h, fill, text, size, s = 1, color = WHITE}) =>
  s <= 0.01 ? null : (
    <g transform={`translate(${x}, ${y}) scale(${s})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={fill} />
      <text y={size * 0.36} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={800} fontSize={size} letterSpacing="0.04em" fill={color}>
        {text}
      </text>
    </g>
  );

const Progress: React.FC<{f: number; x: number; y: number; w: number; k: number}> = ({f, x, y, w, k}) => {
  const p = built(f, k);
  if (f < C.day2 - 4 || f > C.launch + 40) return null;
  return (
    <g>
      <rect x={x} y={y} width={w} height={10} rx={5} fill={rgba(WHITE, 0.25)} />
      <rect x={x} y={y} width={w * p} height={10} rx={5} fill={PALETTE.magenta} />
    </g>
  );
};

const LiveBadge: React.FC<{f: number; x: number; y: number; delay: number}> = ({f, x, y, delay}) => {
  const s = spring01(f - (C.launch + delay), SPR.pop);
  if (s <= 0.01) return null;
  return (
    <g transform={`translate(${x}, ${y}) scale(${clamp(s, 0, 1.25)})`}>
      {[0, 1].map((k) => {
        const t = ((f - C.launch + k * 20) % 40) / 40;
        return <rect key={k} x={-70 - 40 * t} y={-26 - 14 * t} width={140 + 80 * t} height={52 + 28 * t} rx={26 + 14 * t} fill="none" stroke={PALETTE.magenta} strokeWidth={4} opacity={1 - t} />;
      })}
      <rect x={-70} y={-26} width={140} height={52} rx={26} fill={PALETTE.magenta} />
      <circle cx={-38} cy={0} r={8} fill={WHITE} opacity={0.6 + 0.4 * Math.sin(f * 0.4)} />
      <text x={12} y={12} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={800} fontSize={32} fill={WHITE}>
        {COPY2.ui.live}
      </text>
    </g>
  );
};

// ------------------------------------------------------------------ laptop: salon website
const Laptop: React.FC<{f: number}> = ({f}) => {
  const D = DEVICES.laptop;
  const st = deviceState(f, 0);
  if (st.o <= 0.01) return null;
  const W = D.w;
  const H = D.h;
  const sx = -W / 2 + 22;
  const sy = -H / 2 + 22;
  const sw = W - 44;
  const sh = H - 44;
  const b = [0, 1, 2, 3, 4].map((k) => beat(f, k));
  const glow = 0.3 + 0.7 * bump(f, C.holoMerge + 2, 14) + 0.5 * bump(f, C.launch + 2, 16) + 0.4 * bump(f, 1960, 20);
  const shine = clamp(invLerp(1956, 1990, f));
  return (
    <g transform={`translate(${D.x}, ${D.y + st.dy}) scale(${st.s})`} opacity={st.o}>
      <rect x={-W / 2 - 16} y={-H / 2 - 16} width={W + 32} height={H + 32} rx={40} fill={rgba(PALETTE.magenta, 0.3 * glow)} filter="url(#neon)" />
      <rect x={-W / 2} y={-H / 2} width={W} height={H} rx={28} fill="#1B1433" stroke={rgba(WHITE, 0.2)} strokeWidth={4} />
      <path d={`M${-W / 2 - 60},${H / 2 + 4} L${W / 2 + 60},${H / 2 + 4} L${W / 2 + 20},${H / 2 + 44} L${-W / 2 - 20},${H / 2 + 44} Z`} fill="#2A2150" />
      <rect x={-80} y={H / 2 + 8} width={160} height={10} rx={5} fill="#3A2E6E" />
      <defs>
        <clipPath id="lapScreen">
          <rect x={sx} y={sy} width={sw} height={sh} rx={12} />
        </clipPath>
        <linearGradient id="salonHero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF6FB0" />
          <stop offset="55%" stopColor="#C04FE0" />
          <stop offset="100%" stopColor="#7C4DFF" />
        </linearGradient>
      </defs>
      <g clipPath="url(#lapScreen)">
        <rect x={sx} y={sy} width={sw} height={sh} fill="#FFF6FB" />
        <rect x={sx} y={sy} width={sw} height={52} fill={WHITE} />
        <circle cx={sx + 34} cy={sy + 26} r={14} fill="#FF4F9A" />
        <text x={sx + 60} y={sy + 34} fontFamily={FONT_SANS} fontWeight={800} fontSize={22} letterSpacing="0.1em" fill={INK} opacity={clamp(b[1] * 2)}>
          {COPY2.shops.salon}
        </text>
        {[0, 1, 2].map((k) => (
          <rect key={k} x={sx + sw - 220 + k * 64} y={sy + 22} width={48} height={8} rx={4} fill={rgba(INK, 0.25)} opacity={clamp(b[2] * 2)} />
        ))}
        <rect x={sx} y={sy + 52} width={sw} height={230} fill="url(#salonHero)" opacity={clamp(b[0] * 1.5)} />
        {[0, 1, 2].map((k) => (
          <circle key={k} cx={sx + sw - 120 + k * 40 - 40 * Math.sin(f * 0.02 + k)} cy={sy + 140 + 30 * k} r={70 - k * 16} fill={rgba(WHITE, 0.14)} opacity={clamp(b[0] * 1.5)} />
        ))}
        <g transform={`translate(${sx + 50}, ${sy + 150}) scale(${clamp(b[1], 0, 1.1)})`} opacity={clamp(b[1] * 2)}>
          <text x={0} y={0} fontFamily={FONT_SANS} fontWeight={800} fontSize={62} letterSpacing="-0.02em" fill={WHITE}>
            {COPY2.shops.salon}
          </text>
          <rect x={0} y={24} width={300} height={12} rx={6} fill={rgba(WHITE, 0.8)} />
          <rect x={0} y={46} width={220} height={12} rx={6} fill={rgba(WHITE, 0.55)} />
        </g>
        <Pill x={sx + 140} y={sy + 250} w={200} h={46} fill={INK} text={COPY2.ui.book} size={20} s={b[4]} />
        {[0, 1, 2].map((k) => {
          const cx = sx + 40 + k * ((sw - 80) / 3);
          const cw = (sw - 80) / 3 - 20;
          const pop = clamp(spring01(f - (C.design[2] + k * 4), SPR.pop), 0, 1.1);
          if (pop <= 0.01) return null;
          return (
            <g key={k} transform={`translate(${cx + cw / 2}, ${sy + 330}) scale(${pop}) translate(${-cw / 2}, -40)`}>
              <rect x={0} y={0} width={cw} height={150} rx={16} fill={WHITE} stroke={rgba(INK, 0.08)} strokeWidth={2} />
              <rect x={10} y={10} width={cw - 20} height={80} rx={10} fill={['#FFB3D6', '#D8C2FF', '#FFD9A8'][k]} opacity={clamp(b[3] * 2)} />
              <circle cx={cw / 2} cy={50} r={22} fill={rgba(WHITE, 0.6)} opacity={clamp(b[3] * 2)} />
              <rect x={12} y={104} width={cw * 0.6} height={10} rx={5} fill={rgba(INK, 0.5)} />
              <rect x={12} y={122} width={cw * 0.4} height={10} rx={5} fill={rgba(INK, 0.25)} />
            </g>
          );
        })}
        {shine > 0 && shine < 1 ? <rect x={sx - 200 + (sw + 400) * shine} y={sy} width={120} height={sh} fill={rgba(WHITE, 0.35)} transform="skewX(-20)" /> : null}
      </g>
      <Progress f={f} x={sx + 20} y={sy + sh - 22} w={sw - 40} k={0} />
      <LiveBadge f={f} x={0} y={-H / 2 - 50} delay={0} />
    </g>
  );
};

// ------------------------------------------------------------------ phones
const Phone: React.FC<{f: number; which: 'gym' | 'clinic'}> = ({f, which}) => {
  const D = which === 'gym' ? DEVICES.phoneL : DEVICES.phoneR;
  const st = deviceState(f, which === 'gym' ? 6 : 12);
  if (st.o <= 0.01) return null;
  const W = D.w;
  const H = D.h;
  const sx = -W / 2 + 14;
  const sy = -H / 2 + 14;
  const sw = W - 28;
  const sh = H - 28;
  const b = [0, 1, 2, 3, 4].map((k) => beat(f, k));
  const accent = which === 'gym' ? '#FF7A2F' : '#10B7A6';
  const accent2 = which === 'gym' ? '#FFC247' : '#00E5FF';
  const id = `ph-${which}`;
  const preview = which === 'clinic' ? spring01(f - C.day6, SPR.pop) * (1 - ease.cubicIn(invLerp(C.day7 - 4, C.day7 + 4, f))) : 0;
  const approved = spring01(f - (C.day6 + 20), SPR.pop);
  const glow = 0.3 + 0.7 * bump(f, C.holoMerge + 6, 14) + 0.5 * bump(f, C.launch + 2, 16);
  return (
    <g transform={`translate(${D.x}, ${D.y + st.dy}) scale(${st.s}) rotate(${which === 'gym' ? -6 : 6})`} opacity={st.o}>
      <rect x={-W / 2 - 12} y={-H / 2 - 12} width={W + 24} height={H + 24} rx={48} fill={rgba(accent, 0.35 * glow)} filter="url(#neon)" />
      <rect x={-W / 2} y={-H / 2} width={W} height={H} rx={38} fill="#1B1433" stroke={rgba(WHITE, 0.25)} strokeWidth={4} />
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect x={sx} y={sy} width={sw} height={sh} rx={26} />
        </clipPath>
        <linearGradient id={`${id}-hero`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor={accent2} />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect x={sx} y={sy} width={sw} height={sh} fill={which === 'gym' ? '#1F2A55' : '#F2FBFA'} />
        <rect x={sx} y={sy} width={sw} height={130} fill={`url(#${id}-hero)`} opacity={clamp(b[0] * 1.5)} />
        <text x={sx + 20} y={sy + 64} fontFamily={FONT_SANS} fontWeight={800} fontStyle={which === 'gym' ? 'italic' : 'normal'} fontSize={36} fill={WHITE} opacity={clamp(b[1] * 2)}>
          {which === 'gym' ? COPY2.shops.gym : COPY2.shops.clinic}
        </text>
        <rect x={sx + 20} y={sy + 84} width={sw * 0.5} height={9} rx={4} fill={rgba(WHITE, 0.7)} opacity={clamp(b[1] * 2)} />
        {which === 'gym' ? (
          <g>
            {[0, 1, 2].map((k) => {
              const pop = clamp(spring01(f - (C.design[2] + k * 4), SPR.pop), 0, 1.1);
              const y = sy + 160 + k * 62;
              return pop > 0.01 ? (
                <g key={k} transform={`translate(${sx + sw / 2}, ${y}) scale(${pop}) translate(${-sw / 2}, 0)`}>
                  <rect x={12} y={0} width={sw - 24} height={50} rx={14} fill={rgba(WHITE, 0.08)} />
                  <circle cx={38} cy={25} r={14} fill={['#FF7A2F', '#FFC247', '#FF5C8A'][k]} opacity={clamp(b[3] * 2)} />
                  <rect x={60} y={16} width={60} height={8} rx={4} fill={rgba(WHITE, 0.6)} />
                  <Pill x={sw - 60} y={25} w={64} h={26} fill={rgba(PALETTE.cyan, 0.2)} text={COPY2.ui.paid} size={12} s={clamp(b[4] * 2)} />
                </g>
              ) : null;
            })}
            <Pill x={sx + sw / 2} y={sy + sh - 50} w={sw - 50} h={44} fill={accent} text={COPY2.ui.join} size={18} s={b[4]} />
          </g>
        ) : (
          <g>
            {[0, 1, 2, 3, 4].map((k) => {
              const pop = clamp(spring01(f - (C.design[2] + k * 3), SPR.pop), 0, 1.1);
              return pop > 0.01 ? <circle key={k} cx={sx + 26 + k * ((sw - 52) / 4)} cy={sy + 160} r={16 * pop} fill={k === 2 ? accent : rgba('#10B7A6', 0.18)} /> : null;
            })}
            {[0, 1].map((k) => {
              const pop = clamp(spring01(f - (C.design[3] + k * 5), SPR.pop), 0, 1.1);
              return pop > 0.01 ? (
                <g key={k} transform={`translate(${sx + 16}, ${sy + 196 + k * 56}) scale(${pop})`}>
                  <rect x={0} y={0} width={sw - 32} height={44} rx={12} fill={WHITE} stroke={rgba('#10B7A6', 0.4)} strokeWidth={2} />
                  <rect x={12} y={16} width={70} height={10} rx={5} fill={rgba(INK, 0.4)} />
                </g>
              ) : null;
            })}
            <Pill x={sx + sw / 2} y={sy + sh - 50} w={sw - 40} h={44} fill={accent} text={COPY2.ui.visit} size={16} s={b[4]} />
          </g>
        )}
      </g>
      {preview > 0.01 ? (
        <g transform={`translate(0, ${-H / 2 + 40}) scale(${clamp(preview, 0, 1.15)})`}>
          <rect x={-W / 2 - 30} y={-22} width={W + 60} height={44} rx={22} fill={PALETTE.violet} />
          <text x={-12} y={7} textAnchor="middle" fontFamily={FONT_MONO} fontWeight={700} fontSize={16} letterSpacing="0.04em" fill={WHITE}>
            {COPY2.ui.preview}
          </text>
          <g transform={`translate(${W / 2 + 4}, 0) scale(${clamp(approved, 0, 1.2)})`}>
            <circle r={16} fill={PALETTE.cyan} />
            <path d="M-7,0 L-2,6 L8,-6" fill="none" stroke="#0E0B19" strokeWidth={4} strokeLinecap="round" />
          </g>
        </g>
      ) : null}
      <Progress f={f} x={sx + 14} y={sy + sh - 16} w={sw - 28} k={which === 'gym' ? 1 : 2} />
      <LiveBadge f={f} x={0} y={-H / 2 - 44} delay={which === 'gym' ? 5 : 10} />
    </g>
  );
};

// ------------------------------------------------------------------ design elements flying from Kavey's cube
const DESIGN_TARGETS = [DEVICES.laptop, DEVICES.phoneL, DEVICES.laptop, DEVICES.phoneR, DEVICES.laptop];

const DesignFlyers: React.FC<{f: number}> = ({f}) => {
  const out: React.ReactNode[] = [];
  C.design.forEach((at, k) => {
    const t0 = at - 18;
    const u = invLerp(t0, at, f);
    if (u <= 0 || u >= 1) return;
    const from = cityAnchorWorld(t0, 'cube');
    const to = DESIGN_TARGETS[k];
    const e = ease.cubicInOut(u);
    const x = lerp(from.x, to.x, e);
    const y = lerp(from.y, to.y, e) - Math.sin(Math.PI * e) * 260;
    const s = 1.4 - 0.5 * e;
    out.push(
      <g key={k} transform={`translate(${x}, ${y}) scale(${s}) rotate(${e * 200})`}>
        <circle r={48} fill={rgba(WHITE, 0.95)} />
        {k === 0 ? ['#FF4F9A', '#7C4DFF', '#FFD166', '#3DDC97'].map((c, i) => <circle key={i} cx={Math.cos(i * 1.57) * 18} cy={Math.sin(i * 1.57) * 18} r={12} fill={c} />) : null}
        {k === 1 ? (
          <text y={14} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={800} fontSize={40} fill={INK}>
            Aa
          </text>
        ) : null}
        {k === 2 ? (
          <g fill="none" stroke={PALETTE.violet} strokeWidth={5}>
            <rect x={-24} y={-24} width={48} height={48} rx={6} />
            <line x1={-24} y1={-6} x2={24} y2={-6} />
            <line x1={0} y1={-6} x2={0} y2={24} />
          </g>
        ) : null}
        {k === 3 ? (
          <g>
            <rect x={-26} y={-20} width={52} height={40} rx={8} fill="#FFB3D6" />
            <circle cx={-8} cy={-6} r={7} fill={WHITE} />
            <path d="M-22,16 L-4,0 L8,10 L16,2 L24,16 Z" fill="#C04FE0" />
          </g>
        ) : null}
        {k === 4 ? <rect x={-30} y={-14} width={60} height={28} rx={14} fill={PALETTE.magenta} /> : null}
      </g>,
    );
  });
  // paint trail behind the cube while Kavey conducts the design
  if (f > C.design[0] - 20 && f < C.design[4] + 24) {
    const pts = Array.from({length: 14}, (_, k) => cityAnchorWorld(f - k * 1.5, 'cube'));
    pts.slice(1).forEach((p, k) => out.push(<line key={`t${k}`} x1={pts[k].x} y1={pts[k].y} x2={p.x} y2={p.y} stroke={rgba(k % 2 ? PALETTE.violet : PALETTE.magenta, 0.55 * (1 - k / 13))} strokeWidth={28 * (1 - k / 13)} strokeLinecap="round" />));
  }
  return <>{out}</>;
};

/** Parts streaming from Kavey's raised hand into the devices while he conducts the build. */
const PartsStream: React.FC<{f: number}> = ({f}) => {
  if (f < C.day2 || f > C.day6 + 10) return null;
  const devs = [DEVICES.laptop, DEVICES.phoneL, DEVICES.phoneR];
  const out: React.ReactNode[] = [];
  for (let k = 0; k < 18; k++) {
    const t0 = C.day2 + 4 + k * 3.6;
    const u = invLerp(t0, t0 + 16, f);
    if (u <= 0 || u >= 1) continue;
    const from = cityAnchorWorld(t0, 'handLTip');
    const d = devs[k % 3];
    const to = {x: d.x - d.w * 0.35 + hash01(k, 1) * d.w * 0.7, y: d.y - d.h * 0.35 + hash01(k, 2) * d.h * 0.7};
    const e = ease.cubicInOut(u);
    const x = lerp(from.x, to.x, e);
    const y = lerp(from.y, to.y, e) - Math.sin(Math.PI * e) * 160;
    const s = 22 * (1 - 0.5 * e);
    out.push(<rect key={k} x={x - s / 2} y={y - s / 2} width={s} height={s} rx={4} fill={k % 3 === 0 ? PALETTE.cyan : k % 3 === 1 ? PALETTE.magenta : WHITE} transform={`rotate(${f * 12 + k * 40}, ${x}, ${y})`} />);
  }
  return <g>{out}</g>;
};

/** A ring of light expanding from the devices at launch. */
const LightWave: React.FC<{f: number}> = ({f}) => {
  const t = f - C.launch;
  if (t < 0 || t > 60) return null;
  const r = 60 + 2600 * ease.cubicOut(t / 60);
  const a = 1 - ease.quadIn(t / 60);
  return (
    <g filter="url(#neon)">
      <circle cx={HUB.x} cy={HUB.y} r={r} fill="none" stroke={rgba('#FFD166', 0.3 * a)} strokeWidth={90 * a} />
      <circle cx={HUB.x} cy={HUB.y} r={r * 0.94} fill="none" stroke={rgba(PALETTE.magenta, 0.45 * a)} strokeWidth={6} />
    </g>
  );
};

/** Rocket trails as the devices shoot into the sky. */
const LiftTrails: React.FC<{f: number}> = ({f}) => {
  const lift = hubLift(f);
  if (lift <= 0 || lift >= 1) return null;
  return (
    <g>
      {[DEVICES.laptop, DEVICES.phoneL, DEVICES.phoneR].map((d, i) => {
        const y = d.y - lift * 1700;
        return <path key={i} d={`M${d.x - 40},${y + d.h / 2} Q${d.x},${y + d.h / 2 + 500 * lift + 100} ${d.x + 40},${y + d.h / 2} Z`} fill={rgba(i === 0 ? PALETTE.magenta : i === 1 ? '#FF7A2F' : '#10B7A6', 0.6)} filter="url(#neon)" />;
      })}
    </g>
  );
};

export const BuildLayer: React.FC<{f: number}> = ({f}) =>
  f >= C.holoRise && f < C.launch + 90 ? (
    <Layer f={f} p={1}>
      <LightWave f={f} />
      <LiftTrails f={f} />
      <Laptop f={f} />
      <Phone f={f} which="gym" />
      <Phone f={f} which="clinic" />
      <DesignFlyers f={f} />
      <PartsStream f={f} />
      <Burst f={f} at={C.holoMerge} x={DEVICES.laptop.x} y={DEVICES.laptop.y} size={1.8} color={PALETTE.magenta} />
      {C.design.map((d, k) => (
        <Sparkles key={d} f={f} at={d} x={DESIGN_TARGETS[k].x} y={DESIGN_TARGETS[k].y} n={10} spread={160} seed={80 + k} />
      ))}
      <Sparkles f={f} at={1960} x={DEVICES.laptop.x} y={DEVICES.laptop.y - 200} n={16} spread={420} seed={91} />
      <Sparkles f={f} at={C.day6 + 20} x={DEVICES.phoneR.x} y={DEVICES.phoneR.y - 230} n={8} spread={90} seed={71} />
      <Sparkles f={f} at={C.launch} x={HUB.x} y={HUB.y - 380} n={14} spread={260} seed={72} />
    </Layer>
  ) : null;

// ------------------------------------------------------------------ fireworks (sky, p = 0.8)
const SHOTS = [
  {at: C.launch + 20, x: 1300, y: -40, c: PALETTE.magenta},
  {at: C.launch + 30, x: 2150, y: 60, c: '#FFD166'},
  {at: C.launch + 42, x: 1740, y: -220, c: WHITE},
  {at: C.launch + 52, x: 1100, y: 200, c: '#3DDC97'},
  {at: C.launch + 62, x: 2350, y: -120, c: PALETTE.magenta},
  {at: C.launch + 76, x: 1620, y: 120, c: PALETTE.cyan},
];

export const Fireworks: React.FC<{f: number}> = ({f}) => {
  if (f < C.launch || f > C.launch + 170) return null;
  return (
    <Layer f={f} p={0.8}>
      {SHOTS.map((s, i) => {
        const rise = invLerp(s.at - 16, s.at, f);
        const t = f - s.at;
        const out: React.ReactNode[] = [];
        if (rise > 0 && rise < 1) {
          const y = lerp(1300, s.y, ease.cubicOut(rise));
          out.push(<line key="r" x1={s.x} y1={y} x2={s.x} y2={y + 70} stroke={rgba(WHITE, 0.8)} strokeWidth={5} strokeLinecap="round" />);
        }
        if (t >= 0 && t < 70) {
          for (let k = 0; k < 26; k++) {
            const a = (k / 26) * Math.PI * 2 + hash01(i, k) * 0.2;
            const sp = 5.4 + 2.4 * hash01(i, k, 1);
            const d = sp * 40 * (1 - Math.exp(-t / 14));
            const px = s.x + Math.cos(a) * d;
            const py = s.y + Math.sin(a) * d + 0.05 * t * t;
            const o = 1 - clamp((t - 20) / 50);
            out.push(<circle key={k} cx={px} cy={py} r={5 * (1 - t / 90)} fill={k % 4 === 0 ? WHITE : s.c} opacity={o} />);
            if (t < 30) out.push(<line key={`l${k}`} x1={s.x + Math.cos(a) * d * 0.7} y1={s.y + Math.sin(a) * d * 0.7 + 0.05 * t * t} x2={px} y2={py} stroke={s.c} strokeWidth={3} opacity={o * 0.6} />);
          }
          out.push(<circle key="flash" cx={s.x} cy={s.y} r={60} fill={rgba(s.c, 0.35 * (1 - clamp(t / 8)))} />);
        }
        return <g key={i}>{out}</g>;
      })}
    </Layer>
  );
};

// ------------------------------------------------------------------ day chips (screen)
export const DayChips: React.FC<{f: number; top: number}> = ({f, top}) => {
  const days = COPY2.days;
  const idx = days.findIndex((d, i) => f >= d.at && (i === days.length - 1 || f < days[i + 1].at));
  const end = C.launch + 44;
  if (idx < 0 || f >= end) return null;
  const cur = days[idx];
  const flip = spring01(f - cur.at, SPR.snappy);
  const enter = idx === 0 ? spring01(f - cur.at, SPR.pop) : 1;
  const exit = ease.cubicIn(invLerp(end - 10, end, f));
  return (
    <div
      style={{
        position: 'absolute',
        left: 130,
        top,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 50,
        padding: '0 18px 0 14px',
        transformOrigin: '0% 50%',
        transform: `perspective(600px) rotateX(${(1 - clamp(flip)) * 80}deg) scale(${lerp(0.6, 1, clamp(enter, 0, 1.2))})`,
        opacity: clamp(enter * 2) * (1 - exit),
        background: rgba(PALETTE.background, 0.82),
        outline: `2px solid ${PALETTE.magenta}`,
        outlineOffset: -2,
        boxShadow: `0 0 24px ${rgba(PALETTE.magenta, 0.3)}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{width: 12, height: 12, background: PALETTE.magenta, display: 'inline-block'}} />
      <span style={{...TYPE.mono, fontSize: 24, color: PALETTE.white, lineHeight: 1}}>{cur.day}</span>
      <span style={{...TYPE.headline, fontSize: 26, color: PALETTE.magenta, lineHeight: 1, letterSpacing: '0.01em'}}>{cur.what}</span>
    </div>
  );
};
