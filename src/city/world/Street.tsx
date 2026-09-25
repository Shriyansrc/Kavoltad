// Street level of Chaos City at dusk (parallax 1): pastel filler blocks with
// warm windows and balconies, the three distinct shops (Shops.tsx), trees,
// street lamps, a lilac sidewalk, the road with light spill and soft neon
// reflections, and bright passing cars.
import React from 'react';
import {rgba} from '../../config/palette.ts';
import {clamp} from '../../lib/anim.ts';
import {hash01} from '../../lib/random.ts';
import {DISTRICT, GROUND} from '../camera.ts';
import {calm} from '../config.ts';
import {CARS, carX, type Car} from './cars.ts';
import {SHOP} from './shop.ts';
import {LOOK, ShopView, type ShopKind} from './Shops.tsx';
import {Layer, visibleX} from './Layer.tsx';

export type {ShopKind};
export {SHOP};

/** Wet-road reflections of the shop signs and light spilling from the storefront. */
const Spill: React.FC<{f: number; kind: ShopKind}> = ({f, kind}) => {
  const c = DISTRICT[kind];
  const L = LOOK[kind];
  const calmV = calm[kind](f);
  const light = clamp(0.3 + 0.7 * calmV + 0.2 * calm.city(f));
  const panes = [
    [c - SHOP.halfW + 30, c - SHOP.doorHalf - 18],
    [c + SHOP.doorHalf + 18, c + SHOP.halfW - 30],
  ];
  return (
    <g>
      <defs>
        <linearGradient id={`refl-${kind}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={rgba(L.accent, 0.3)} />
          <stop offset="100%" stopColor={rgba(L.accent, 0)} />
        </linearGradient>
      </defs>
      {panes.map(([x0, x1], i) => (
        <polygon key={i} points={`${x0},${GROUND} ${x1},${GROUND} ${x1 + 40},${GROUND + 96} ${x0 - 40},${GROUND + 96}`} fill={rgba('#FFE6B0', 0.08 + 0.14 * light)} />
      ))}
      <g filter="url(#reflBlur)">
        {Array.from({length: 6}, (_, i) => {
          const x = c - 260 + i * 104;
          const wob = 3 * Math.sin(f * 0.09 + i * 1.9);
          return <rect key={i} x={x - 18 + wob} y={GROUND + 116} width={36} height={240} rx={16} fill={`url(#refl-${kind})`} opacity={0.4 + 0.6 * light} />;
        })}
      </g>
    </g>
  );
};

type Filler = {x0: number; x1: number; top: number; seed: number; color: string};
const FILLERS: Filler[] = [
  {x0: -900, x1: -520, top: 360, seed: 1, color: '#4A3A8C'},
  {x0: -500, x1: 100, top: 520, seed: 2, color: '#6A3F8E'},
  {x0: 990, x1: 1290, top: 420, seed: 3, color: '#3F4E9A'},
  {x0: 2190, x1: 2490, top: 470, seed: 4, color: '#7A3F86'},
  {x0: 3380, x1: 3900, top: 400, seed: 5, color: '#4A3A8C'},
  {x0: 3920, x1: 4400, top: 560, seed: 6, color: '#3F4E9A'},
];

const FillerBlock: React.FC<{f: number; b: Filler}> = ({f, b}) => {
  const w = b.x1 - b.x0;
  const cols = Math.floor(w / 70);
  const rows = Math.floor((GROUND - 100 - b.top) / 90);
  const wins: React.ReactNode[] = [];
  const city = calm.city(f);
  for (let r = 0; r < rows; r++)
    for (let k = 0; k < cols; k++) {
      const seed = b.seed * 1000 + r * 31 + k;
      const h = hash01(seed);
      const flick = city < 0.5 && hash01(seed, Math.floor(f / 8)) < 0.05;
      const on = h < 0.6 + 0.3 * city !== flick;
      wins.push(<rect key={`${r}-${k}`} x={b.x0 + 24 + k * 70} y={b.top + 50 + r * 90} width={34} height={46} rx={4} fill={on ? (h < 0.2 ? '#FFB8D9' : '#FFE0A0') : '#2A2150'} opacity={on ? 0.85 : 0.9} />);
      if (r % 3 === 1 && k % 2 === 0) wins.push(<rect key={`b${r}-${k}`} x={b.x0 + 16 + k * 70} y={b.top + 98 + r * 90} width={50} height={8} rx={3} fill={rgba('#FFFFFF', 0.35)} />);
    }
  return (
    <g>
      <rect x={b.x0} y={b.top} width={w} height={GROUND - b.top} fill={b.color} />
      <rect x={b.x0} y={b.top} width={w} height={GROUND - b.top} fill="url(#shopShade)" />
      <rect x={b.x0 - 8} y={b.top - 10} width={w + 16} height={14} fill={rgba('#FFFFFF', 0.25)} />
      {wins}
      <rect x={b.x0 + w * 0.6} y={b.top - 70} width={60} height={50} rx={6} fill={rgba('#000000', 0.25)} />
    </g>
  );
};

const LAMPS = [-60, 1140, 2340, 3540];
const TREES = [1030, 1255, 2230, 2455, -200, 3470];

const Lamp: React.FC<{f: number; x: number}> = ({f, x}) => {
  const city = calm.city(f);
  const on = city > 0.5 || hash01(x, Math.floor(f / 4)) > 0.15 ? 1 : 0.4;
  const top = GROUND - 390;
  return (
    <g>
      <polygon points={`${x + 60},${top + 30} ${x - 60},${GROUND + 60} ${x + 200},${GROUND + 60}`} fill={rgba('#FFE6B0', 0.12 * on)} />
      <rect x={x - 6} y={top} width={12} height={GROUND - top} fill="#3A2E63" />
      <path d={`M${x},${top + 8} Q${x},${top - 30} ${x + 60},${top - 20}`} fill="none" stroke="#3A2E63" strokeWidth={10} />
      <rect x={x + 40} y={top - 22} width={46} height={16} rx={8} fill="#4A3C78" />
      <ellipse cx={x + 63} cy={top - 4} rx={20} ry={8} fill={rgba('#FFF1CC', 0.95 * on)} filter="url(#neon)" />
    </g>
  );
};

const Tree: React.FC<{f: number; x: number}> = ({f, x}) => {
  const sway = 2.2 * Math.sin(f * 0.04 + x * 0.01);
  const base = GROUND + 40;
  return (
    <g>
      <ellipse cx={x} cy={base + 6} rx={70} ry={10} fill="rgba(0,0,0,0.25)" />
      <rect x={x - 12} y={base - 230} width={24} height={230} rx={8} fill="#6B4A5A" />
      <g transform={`rotate(${sway}, ${x}, ${base - 200})`}>
        {(
          [
            [0, -330, 110, '#2FA56E'],
            [-80, -270, 86, '#37B77B'],
            [80, -270, 86, '#2A9864'],
            [-40, -390, 80, '#45C98B'],
            [50, -380, 76, '#3DBE80'],
          ] as const
        ).map(([dx, dy, r, col], i) => (
          <circle key={i} cx={x + dx} cy={base + dy} r={r} fill={col} />
        ))}
        {[
          [-30, -360],
          [40, -300],
          [-70, -290],
        ].map(([dx, dy], i) => (
          <circle key={`h${i}`} cx={x + dx} cy={base + dy} r={22} fill={rgba('#FFFFFF', 0.12)} />
        ))}
      </g>
      <rect x={x - 46} y={base - 8} width={92} height={14} rx={6} fill="#4F4280" />
    </g>
  );
};

const CarView: React.FC<{f: number; car: Car}> = ({f, car}) => {
  const x = carX(car, f);
  const y = car.lane;
  const d = car.dir;
  const bob = 1.5 * Math.sin(f * 0.9 + car.x0);
  return (
    <g transform={`translate(${x}, ${y + bob}) scale(${d}, 1)`}>
      <ellipse cx={0} cy={6} rx={130} ry={12} fill="rgba(0,0,0,0.35)" />
      <rect x={-120} y={-58} width={240} height={52} rx={18} fill={car.color} />
      <path d="M-70,-58 L-40,-100 L50,-100 L78,-58 Z" fill={car.color} />
      <path d="M-58,-60 L-34,-92 L0,-92 L0,-60 Z" fill={rgba('#E8F4FF', 0.65)} />
      <path d="M8,-60 L8,-92 L44,-92 L66,-60 Z" fill={rgba('#E8F4FF', 0.65)} />
      <rect x={-110} y={-40} width={220} height={6} rx={3} fill={rgba('#FFFFFF', 0.35)} />
      <circle cx={-72} cy={-6} r={20} fill="#1B1530" />
      <circle cx={72} cy={-6} r={20} fill="#1B1530" />
      <circle cx={-72} cy={-6} r={9} fill="#C9C2E6" />
      <circle cx={72} cy={-6} r={9} fill="#C9C2E6" />
      <rect x={112} y={-46} width={10} height={14} rx={4} fill="#FFF6D8" />
      <polygon points="122,-44 360,-80 360,10" fill="url(#headlight)" />
      <rect x={-122} y={-46} width={8} height={14} rx={3} fill="#FF3B5C" />
    </g>
  );
};

export const Street: React.FC<{f: number}> = ({f}) => {
  const vis = visibleX(f, 1, 500);
  const shops = (['salon', 'gym', 'clinic'] as const).filter((k) => DISTRICT[k] + 500 > vis.x0 && DISTRICT[k] - 500 < vis.x1);
  return (
    <Layer f={f} p={1}>
      <defs>
        <filter id="neon" x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation={6} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="reflBlur" x="-50%" y="-10%" width="200%" height="120%">
          <feGaussianBlur stdDeviation="10 4" />
        </filter>
        <linearGradient id="shopShade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="70%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
        </linearGradient>
        <linearGradient id="headlight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,246,216,0.3)" />
          <stop offset="100%" stopColor="rgba(255,246,216,0)" />
        </linearGradient>
        <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3A3170" />
          <stop offset="100%" stopColor="#241E4A" />
        </linearGradient>
      </defs>
      {FILLERS.filter((b) => b.x1 > vis.x0 && b.x0 < vis.x1).map((b) => (
        <FillerBlock key={b.seed} f={f} b={b} />
      ))}
      {shops.map((k) => (
        <ShopView key={k} f={f} kind={k} />
      ))}
      {/* sidewalk, curb, road */}
      <rect x={-2000} y={GROUND} width={8000} height={100} fill="#7867B4" />
      {Array.from({length: 60}, (_, i) => (
        <line key={i} x1={-2000 + i * 140} y1={GROUND} x2={-2000 + i * 140} y2={GROUND + 96} stroke={rgba('#FFFFFF', 0.14)} strokeWidth={3} />
      ))}
      <rect x={-2000} y={GROUND + 96} width={8000} height={12} fill="#A898E0" />
      <rect x={-2000} y={GROUND + 108} width={8000} height={1400} fill="url(#roadGrad)" />
      {Array.from({length: 46}, (_, i) => (
        <rect key={i} x={-2000 + i * 180} y={1722} width={90} height={8} rx={4} fill={rgba('#FFFFFF', 0.45)} />
      ))}
      {shops.map((k) => (
        <Spill key={`s${k}`} f={f} kind={k} />
      ))}
      <rect x={-2000} y={1900} width={8000} height={12} fill="#A898E0" />
      <rect x={-2000} y={1912} width={8000} height={600} fill="#5E4F99" />
      {LAMPS.filter((x) => x > vis.x0 && x < vis.x1).map((x) => (
        <Lamp key={x} f={f} x={x} />
      ))}
      {TREES.filter((x) => x > vis.x0 && x < vis.x1).map((x) => (
        <Tree key={x} f={f} x={x} />
      ))}
      {CARS.map((car, i) => (
        <CarView key={i} f={f} car={car} />
      ))}
    </Layer>
  );
};

/** World-space anchor points used by the story. */
export const SPOT = {
  door: (k: ShopKind) => ({x: DISTRICT[k], y: GROUND - 20}),
  window: (k: ShopKind, r: number, col: number) => ({x: DISTRICT[k] + SHOP.winCols[col] + SHOP.winW / 2, y: SHOP.winRows[r] + SHOP.winH / 2}),
  signCenter: (k: ShopKind) => ({x: DISTRICT[k], y: (SHOP.signTop + SHOP.roof) / 2}),
};
