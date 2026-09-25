// Chaos City backdrop: night sky, moon, drifting clouds, and two procedural
// skyline layers with flickering windows, blinking antennas and neon strips.
// Everything is seeded (240926) and driven by frame; layers parallax.
import React, {useMemo} from 'react';
import {PALETTE, rgba} from '../../config/palette.ts';
import {SEED} from '../../config/video.ts';
import {clamp} from '../../lib/anim.ts';
import {hash01, mulberry32} from '../../lib/random.ts';
import {calm, C} from '../config.ts';
import {Layer, visibleX} from './Layer.tsx';

// Placed so it sits top-right of the hook frame and clear of every headline.
const MOON = {x: 1933, y: 150};

type Bld = {x: number; w: number; h: number; base: number; cols: number; rows: number; seed: number; neon: number; antenna: boolean};

const makeSkyline = (salt: number, x0: number, x1: number, base: number, wMin: number, wMax: number, hMin: number, hMax: number): Bld[] => {
  const rnd = mulberry32(SEED + salt);
  const out: Bld[] = [];
  let x = x0;
  while (x < x1) {
    const w = wMin + (wMax - wMin) * rnd();
    const h = hMin + (hMax - hMin) * Math.pow(rnd(), 1.3);
    out.push({x, w, h, base, cols: Math.max(2, Math.floor(w / 34)), rows: Math.max(3, Math.floor(h / 46)), seed: Math.floor(rnd() * 1e6), neon: rnd(), antenna: rnd() < 0.35});
    x += w + 6 + rnd() * 40;
  }
  return out;
};

export const Sky: React.FC<{f: number}> = ({f}) => {
  const stars = useMemo(() => {
    const rnd = mulberry32(SEED + 21);
    return Array.from({length: 220}, () => ({x: -1400 + rnd() * 6400, y: -2400 + rnd() * 3200, r: 0.7 + rnd() * 1.9, a: 0.15 + rnd() * 0.6, w: 1 + rnd() * 3, p: rnd() * 6.28}));
  }, []);
  const t = f / 60;
  const city = calm.city(f);
  return (
    <>
      {/* gradient sky (very far) */}
      <Layer f={f} p={0.12}>
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#05040A" />
            <stop offset="55%" stopColor="#0C0918" />
            <stop offset="80%" stopColor="#1B1034" />
            <stop offset="92%" stopColor="#34164F" />
            <stop offset="100%" stopColor="#4A1E6A" />
          </linearGradient>
          <radialGradient id="moonGlow">
            <stop offset="0%" stopColor={rgba('#F2E4FF', 0.5)} />
            <stop offset="100%" stopColor={rgba(PALETTE.violet, 0)} />
          </radialGradient>
        </defs>
        <rect x={-3000} y={-3200} width={9000} height={4500} fill="url(#skyGrad)" />
        <rect x={-3000} y={1300} width={9000} height={2000} fill="#4A1E6A" />
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={s.a * (0.6 + 0.4 * Math.sin(t * s.w + s.p))} />
        ))}
        <circle cx={MOON.x} cy={MOON.y} r={330} fill="url(#moonGlow)" />
        <circle cx={MOON.x} cy={MOON.y} r={112} fill="#EDE0FF" />
        <circle cx={MOON.x - 34} cy={MOON.y - 30} r={22} fill="#D8C8F2" />
        <circle cx={MOON.x + 40} cy={MOON.y + 30} r={28} fill="#DDCDF5" />
        <circle cx={MOON.x + 20} cy={MOON.y - 50} r={12} fill="#D2C1EE" />
      </Layer>

      {/* drifting clouds */}
      <Layer f={f} p={0.22}>
        {[0, 1, 2, 3, 4].map((i) => {
          const r = hash01(i, 5);
          const x = -1200 + ((i * 1400 + t * (14 + 10 * r)) % 6200);
          const y = -900 + i * 260 + 60 * Math.sin(i * 1.7);
          return <ellipse key={i} cx={x} cy={y} rx={420 + 200 * r} ry={46 + 20 * r} fill={rgba(PALETTE.violet, 0.07 + 0.05 * r)} />;
        })}
      </Layer>

      <Skyline f={f} p={0.35} salt={31} base={1180} wMin={90} wMax={210} hMin={260} hMax={820} color="#120E24" windowA={0.18} />
      <Fog f={f} p={0.45} y0={640} y1={1200} a={0.26} />
      <Skyline f={f} p={0.62} salt={47} base={1340} wMin={150} wMax={320} hMin={380} hMax={980} color="#1A1432" windowA={0.34} neon />

      <Fog f={f} p={0.78} y0={900} y1={1380} a={0.2} />
      {/* horizon haze */}
      <Layer f={f} p={0.5}>
        <rect x={-3000} y={900} width={9000} height={500} fill={rgba(PALETTE.magenta, 0.05 + 0.04 * city)} />
      </Layer>
    </>
  );
};

/** Rising mist between skyline rows: farther rows read lighter and softer. */
const Fog: React.FC<{f: number; p: number; y0: number; y1: number; a: number}> = ({f, p, y0, y1, a}) => {
  const id = `fog-${String(p).replace('.', '_')}`;
  return (
    <Layer f={f} p={p} blur={false}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(58,26,92,0)" />
          <stop offset="75%" stopColor={`rgba(58,26,92,${a})`} />
          <stop offset="100%" stopColor={`rgba(74,30,106,${a * 1.2})`} />
        </linearGradient>
      </defs>
      <rect x={-4000} y={y0} width={12000} height={y1 - y0} fill={`url(#${id})`} />
      <rect x={-4000} y={y1} width={12000} height={1200} fill={`rgba(74,30,106,${a * 1.2})`} />
    </Layer>
  );
};

const Skyline: React.FC<{f: number; p: number; salt: number; base: number; wMin: number; wMax: number; hMin: number; hMax: number; color: string; windowA: number; neon?: boolean}> = ({
  f,
  p,
  salt,
  base,
  wMin,
  wMax,
  hMin,
  hMax,
  color,
  windowA,
  neon,
}) => {
  const blds = useMemo(() => makeSkyline(salt, -1800, 5400, base, wMin, wMax, hMin, hMax), [salt, base, wMin, wMax, hMin, hMax]);
  const vis = visibleX(f, p);
  const city = calm.city(f);
  const tick = Math.floor(f / 6);
  // A light wave sweeps the skyline at launch.
  const wave = f >= C.launch ? (f - C.launch) * 60 - 1800 : -1e9;
  return (
    <Layer f={f} p={p} style={{filter: p < 0.5 ? 'blur(1.2px)' : 'blur(0.5px)'}}>
      {blds.map((b, bi) => {
        if (b.x + b.w < vis.x0 || b.x > vis.x1) return null;
        const top = b.base - b.h;
        const wins: React.ReactNode[] = [];
        const cw = b.w / b.cols;
        const rh = b.h / b.rows;
        for (let r = 1; r < b.rows - 1; r++) {
          for (let c = 0; c < b.cols; c++) {
            const hsh = hash01(b.seed, r, c);
            const litBase = hsh < 0.38;
            // chaos: random flicker; calm: steady, more windows lit after launch
            const flick = hash01(b.seed, r, c, tick) < 0.12 * (1 - city);
            const litCalm = hsh < 0.38 + 0.3 * clamp((b.x + b.w / 2 - wave) / -300);
            const lit = city > 0.5 ? litCalm : litBase !== flick;
            if (!lit) continue;
            const tint = hsh < 0.12 ? PALETTE.magenta : hsh < 0.22 ? PALETTE.violet : hsh < 0.27 ? PALETTE.cyan : '#FFFFFF';
            wins.push(<rect key={`${r}-${c}`} x={b.x + c * cw + cw * 0.25} y={top + r * rh + rh * 0.25} width={cw * 0.5} height={rh * 0.45} fill={tint} opacity={windowA * (0.5 + 0.5 * hsh)} />);
          }
        }
        return (
          <g key={bi}>
            <rect x={b.x} y={top} width={b.w} height={b.h + 400} fill={color} />
            <rect x={b.x} y={top} width={b.w} height={3} fill={rgba(PALETTE.violet, 0.35)} />
            {wins}
            {b.antenna ? (
              <>
                <line x1={b.x + b.w / 2} y1={top} x2={b.x + b.w / 2} y2={top - 60} stroke={color} strokeWidth={4} />
                <circle cx={b.x + b.w / 2} cy={top - 62} r={5} fill={PALETTE.magenta} opacity={(Math.floor(f / 30 + bi) % 2) * 0.9 + 0.1} />
              </>
            ) : null}
            {neon && b.neon > 0.72 ? (
              <rect
                x={b.x + b.w * 0.15}
                y={top + b.h * 0.18}
                width={b.w * 0.7}
                height={10}
                fill={b.neon > 0.86 ? PALETTE.cyan : PALETTE.magenta}
                opacity={(city > 0.5 ? 0.75 : hash01(bi, tick) < 0.3 ? 0.15 : 0.7) * 0.8}
              />
            ) : null}
          </g>
        );
      })}
    </Layer>
  );
};
