// Chaos City backdrop at golden dusk: a vivid sky (indigo → violet → pink →
// warm horizon), a low sun, lit clouds, a flock of birds, and two procedural
// skyline rows with warm windows, blinking antennas and neon strips, separated
// by pink mist (aerial perspective). Seeded (240926), frame-driven, parallax.
import React, {useMemo} from 'react';
import {PALETTE, rgba} from '../../config/palette.ts';
import {SEED} from '../../config/video.ts';
import {clamp} from '../../lib/anim.ts';
import {hash01, mulberry32} from '../../lib/random.ts';
import {calm, C} from '../config.ts';
import {Layer, visibleX} from './Layer.tsx';

// Low, warm sun between the skyline rows (sky layer, p = 0.12).
const SUN = {x: 1990, y: 830};

type Bld = {x: number; w: number; h: number; base: number; cols: number; rows: number; seed: number; neon: number; antenna: boolean; roof: number};

const makeSkyline = (salt: number, x0: number, x1: number, base: number, wMin: number, wMax: number, hMin: number, hMax: number): Bld[] => {
  const rnd = mulberry32(SEED + salt);
  const out: Bld[] = [];
  let x = x0;
  while (x < x1) {
    const w = wMin + (wMax - wMin) * rnd();
    const h = hMin + (hMax - hMin) * Math.pow(rnd(), 1.3);
    out.push({x, w, h, base, cols: Math.max(2, Math.floor(w / 34)), rows: Math.max(3, Math.floor(h / 46)), seed: Math.floor(rnd() * 1e6), neon: rnd(), antenna: rnd() < 0.35, roof: rnd()});
    x += w + 6 + rnd() * 40;
  }
  return out;
};

export const Sky: React.FC<{f: number}> = ({f}) => {
  const stars = useMemo(() => {
    const rnd = mulberry32(SEED + 21);
    return Array.from({length: 120}, () => ({x: -1400 + rnd() * 6400, y: -2600 + rnd() * 1900, r: 0.7 + rnd() * 1.8, a: 0.2 + rnd() * 0.5, w: 1 + rnd() * 3, p: rnd() * 6.28}));
  }, []);
  const t = f / 60;
  const city = calm.city(f);
  return (
    <>
      <Layer f={f} p={0.12} blur={false}>
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#140C38" />
            <stop offset="30%" stopColor="#2A1766" />
            <stop offset="52%" stopColor="#5A2A9A" />
            <stop offset="70%" stopColor="#A03FA6" />
            <stop offset="84%" stopColor="#E0609A" />
            <stop offset="94%" stopColor="#FF9474" />
            <stop offset="100%" stopColor="#FFC27A" />
          </linearGradient>
          <radialGradient id="sunGlow">
            <stop offset="0%" stopColor="rgba(255,236,190,0.95)" />
            <stop offset="18%" stopColor="rgba(255,200,140,0.6)" />
            <stop offset="55%" stopColor="rgba(255,120,130,0.18)" />
            <stop offset="100%" stopColor="rgba(255,120,130,0)" />
          </radialGradient>
        </defs>
        <rect x={-3000} y={-3200} width={9000} height={4400} fill="url(#skyGrad)" />
        <rect x={-3000} y={1200} width={9000} height={2000} fill="#FFC27A" />
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={s.a * clamp((-s.y - 600) / 1400) * (0.6 + 0.4 * Math.sin(t * s.w + s.p))} />
        ))}
        <circle cx={SUN.x} cy={SUN.y} r={900} fill="url(#sunGlow)" />
        <circle cx={SUN.x} cy={SUN.y} r={150} fill="#FFE6B0" />
        <circle cx={SUN.x} cy={SUN.y} r={150} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={6} />
      </Layer>

      {/* sun-lit clouds drifting */}
      <Layer f={f} p={0.22} blur={false}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const r = hash01(i, 5);
          const x = -1400 + ((i * 1100 + t * (16 + 12 * r)) % 6400);
          const y = -700 + i * 190 + 60 * Math.sin(i * 1.7);
          const w = 380 + 260 * r;
          return (
            <g key={i}>
              <ellipse cx={x} cy={y} rx={w} ry={52 + 26 * r} fill={rgba('#FFB3C8', 0.22 + 0.12 * r)} />
              <ellipse cx={x - w * 0.3} cy={y - 26} rx={w * 0.45} ry={40 + 20 * r} fill={rgba('#FFD2DF', 0.2)} />
              <ellipse cx={x + w * 0.2} cy={y + 16} rx={w * 0.6} ry={30} fill={rgba('#C77DFF', 0.14)} />
            </g>
          );
        })}
      </Layer>

      <Birds f={f} />
      <Skyline f={f} p={0.35} salt={31} base={1180} wMin={90} wMax={210} hMin={260} hMax={820} color="#7A55B0" rim="#FFB38A" windowA={0.4} />
      <Fog f={f} p={0.45} y0={640} y1={1200} color="224,96,154" a={0.3} />
      <Skyline f={f} p={0.62} salt={47} base={1340} wMin={150} wMax={320} hMin={380} hMax={980} color="#4B3386" rim="#FF9FB8" windowA={0.55} neon />
      <Fog f={f} p={0.78} y0={900} y1={1380} color="190,80,160" a={0.24} />
      <Layer f={f} p={0.5} blur={false}>
        <rect x={-3000} y={900} width={9000} height={500} fill={rgba('#FF8FA8', 0.08 + 0.06 * city)} />
      </Layer>
    </>
  );
};

/** A small flock crossing the sky now and then (wing flap, loose V). */
const Birds: React.FC<{f: number}> = ({f}) => {
  const flocks = [
    {t0: 0, y: -380, dir: 1},
    {t0: 700, y: -520, dir: -1},
    {t0: 1300, y: -300, dir: 1},
    {t0: 2050, y: -460, dir: -1},
  ];
  return (
    <Layer f={f} p={0.3} blur={false}>
      {flocks.map((fl, k) => {
        const age = f - fl.t0;
        if (age < 0 || age > 600) return null;
        const x0 = fl.dir > 0 ? -600 : 4200;
        return (
          <g key={k}>
            {Array.from({length: 7}, (_, i) => {
              const row = Math.abs(i - 3);
              const x = x0 + fl.dir * (age * 9 - row * 46);
              const y = fl.y + row * 30 + 8 * Math.sin(age * 0.05 + i);
              const flap = Math.sin(age * 0.5 + i * 0.9);
              const s = 14;
              return <path key={i} d={`M${x - s},${y - flap * 8} Q${x - s / 2},${y - 4 - flap * 4} ${x},${y} Q${x + s / 2},${y - 4 - flap * 4} ${x + s},${y - flap * 8}`} fill="none" stroke="#3A1F5E" strokeWidth={3.5} strokeLinecap="round" />;
            })}
          </g>
        );
      })}
    </Layer>
  );
};

/** Rising mist between skyline rows: farther rows read lighter and softer. */
const Fog: React.FC<{f: number; p: number; y0: number; y1: number; color: string; a: number}> = ({f, p, y0, y1, color, a}) => {
  const id = `fog-${String(p).replace('.', '_')}`;
  return (
    <Layer f={f} p={p} blur={false}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`rgba(${color},0)`} />
          <stop offset="75%" stopColor={`rgba(${color},${a})`} />
          <stop offset="100%" stopColor={`rgba(${color},${a * 1.2})`} />
        </linearGradient>
      </defs>
      <rect x={-4000} y={y0} width={12000} height={y1 - y0} fill={`url(#${id})`} />
      <rect x={-4000} y={y1} width={12000} height={1200} fill={`rgba(${color},${a * 1.2})`} />
    </Layer>
  );
};

const WARM = ['#FFE3A3', '#FFD27A', '#FFB8D9', '#FFFFFF'];

const Skyline: React.FC<{f: number; p: number; salt: number; base: number; wMin: number; wMax: number; hMin: number; hMax: number; color: string; rim: string; windowA: number; neon?: boolean}> = ({
  f,
  p,
  salt,
  base,
  wMin,
  wMax,
  hMin,
  hMax,
  color,
  rim,
  windowA,
  neon,
}) => {
  const blds = useMemo(() => makeSkyline(salt, -1800, 5400, base, wMin, wMax, hMin, hMax), [salt, base, wMin, wMax, hMin, hMax]);
  const vis = visibleX(f, p);
  const city = calm.city(f);
  const tick = Math.floor(f / 8);
  // After launch a wave of light sweeps the skyline.
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
            const flick = hash01(b.seed, r, c, tick) < 0.06 * (1 - city);
            const litCalm = hsh < 0.5 + 0.3 * clamp((b.x + b.w / 2 - wave) / -300);
            const lit = city > 0.5 ? litCalm : hsh < 0.5 !== flick;
            if (!lit) continue;
            const tint = hsh < 0.1 ? PALETTE.magenta : hsh < 0.16 ? PALETTE.cyan : WARM[Math.floor(hsh * 97) % WARM.length];
            wins.push(<rect key={`${r}-${c}`} x={b.x + c * cw + cw * 0.25} y={top + r * rh + rh * 0.25} width={cw * 0.5} height={rh * 0.45} rx={1.5} fill={tint} opacity={windowA * (0.55 + 0.45 * hsh)} />);
          }
        }
        return (
          <g key={bi}>
            <rect x={b.x} y={top} width={b.w} height={b.h + 400} fill={color} />
            {/* sun-side rim and a stepped roof on some towers */}
            <rect x={b.x + b.w - 6} y={top} width={6} height={b.h} fill={rgba(rim, 0.35)} />
            <rect x={b.x} y={top} width={b.w} height={4} fill={rgba(rim, 0.6)} />
            {b.roof > 0.6 ? <rect x={b.x + b.w * 0.2} y={top - 30} width={b.w * 0.6} height={30} fill={color} /> : null}
            {wins}
            {b.antenna ? (
              <>
                <line x1={b.x + b.w / 2} y1={top} x2={b.x + b.w / 2} y2={top - 60} stroke={color} strokeWidth={4} />
                <circle cx={b.x + b.w / 2} cy={top - 62} r={5} fill="#FF5A7A" opacity={0.3 + 0.7 * (0.5 + 0.5 * Math.sin(f * 0.1 + bi))} />
              </>
            ) : null}
            {neon && b.neon > 0.72 ? <rect x={b.x + b.w * 0.15} y={top + b.h * 0.18} width={b.w * 0.7} height={10} rx={5} fill={b.neon > 0.86 ? PALETTE.cyan : PALETTE.magenta} opacity={0.85} /> : null}
          </g>
        );
      })}
    </Layer>
  );
};
