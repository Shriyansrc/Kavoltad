// Street level of Chaos City (parallax 1): filler blocks between the three
// shops, the shops themselves (rooftop neon, upper windows, awning, lit
// storefront, door), street lamps, the road and passing cars. Every shop
// flickers while its problem is unsolved and settles once Kavolt fixes it.
import React from 'react';
import {PALETTE, rgba} from '../../config/palette.ts';
import {FONT_SANS} from '../../config/type.ts';
import {clamp} from '../../lib/anim.ts';
import {hash01} from '../../lib/random.ts';
import {DISTRICT, GROUND} from '../camera.ts';
import {calm, COPY2} from '../config.ts';
import {CARS, carX, type Car} from './cars.ts';
import {doorOpen} from './people.ts';
import {SHOP} from './shop.ts';
import {Layer, visibleX} from './Layer.tsx';

export type ShopKind = 'salon' | 'gym' | 'clinic';

export {SHOP};

const LOOK: Record<ShopKind, {body: string; trim: string; accent: string; stripe: string}> = {
  salon: {body: '#1E1433', trim: '#2C1D47', accent: PALETTE.magenta, stripe: '#3A1850'},
  gym: {body: '#141734', trim: '#1F2350', accent: PALETTE.violet, stripe: '#231E58'},
  clinic: {body: '#15192F', trim: '#1E2644', accent: PALETTE.cyan, stripe: '#123040'},
};

/** Window lit state; chaos = random flicker, calm = steady. */
const lit = (f: number, seed: number, calmV: number, base = 0.55) => {
  const h = hash01(seed);
  const tick = Math.floor(f / 5);
  if (calmV > 0.5) return h < base + 0.35 ? 1 : 0.15;
  const flick = hash01(seed, tick) < 0.22;
  return h < base !== flick ? 1 : 0.12;
};

const Sign: React.FC<{f: number; c: number; kind: ShopKind; calmV: number; launch: number}> = ({f, c, kind, calmV, launch}) => {
  const L = LOOK[kind];
  const text = COPY2.shops[kind];
  const tick = Math.floor(f / 3);
  const size = 112;
  const baseY = SHOP.roof - 34;
  // Per-letter flicker in chaos (fillOpacity on tspans is reliable in SVG).
  const letters = text.split('').map((ch, i) => {
    const off = calmV < 0.5 && hash01(i, tick, c) < 0.3 * (1 - calmV * 2) ? 0.12 : 1;
    return {ch, a: off};
  });
  const bright = 0.75 + 0.25 * calmV + 0.25 * launch;
  const w = text.length * size * 0.72 + 90;
  return (
    <g>
      {/* backing board and struts */}
      <rect x={c - w / 2} y={SHOP.signTop} width={w} height={SHOP.roof - SHOP.signTop - 10} rx={10} fill="#0D0B17" stroke={L.trim} strokeWidth={4} />
      <line x1={c - w / 2 + 40} y1={SHOP.roof - 10} x2={c - w / 2 + 40} y2={SHOP.roof} stroke={L.trim} strokeWidth={8} />
      <line x1={c + w / 2 - 40} y1={SHOP.roof - 10} x2={c + w / 2 - 40} y2={SHOP.roof} stroke={L.trim} strokeWidth={8} />
      {kind === 'clinic' ? (
        <g transform={`translate(${c - w / 2 + 52}, ${SHOP.signTop + 75})`} opacity={letters[0].a}>
          <rect x={-8} y={-26} width={16} height={52} fill={L.accent} filter="url(#neon)" />
          <rect x={-26} y={-8} width={52} height={16} fill={L.accent} filter="url(#neon)" />
        </g>
      ) : null}
      <text
        x={c + (kind === 'clinic' ? 26 : 0)}
        y={baseY}
        textAnchor="middle"
        fontFamily={FONT_SANS}
        fontWeight={800}
        fontSize={size}
        letterSpacing="0.06em"
        fill="none"
        stroke={L.accent}
        strokeWidth={6}
        strokeOpacity={bright}
        filter="url(#neon)"
      >
        {letters.map((l, i) => (
          <tspan key={i} strokeOpacity={l.a * bright}>
            {l.ch}
          </tspan>
        ))}
      </text>
      <text x={c + (kind === 'clinic' ? 26 : 0)} y={baseY} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={800} fontSize={size} letterSpacing="0.06em" fill="none" stroke="#FFFFFF" strokeWidth={1.6}>
        {letters.map((l, i) => (
          <tspan key={i} strokeOpacity={0.85 * l.a}>
            {l.ch}
          </tspan>
        ))}
      </text>
    </g>
  );
};

const Interior: React.FC<{c: number; kind: ShopKind; x0: number; x1: number; light: number}> = ({c, kind, x0, x1, light}) => {
  const y0 = SHOP.glassTop;
  const col = rgba('#0A0814', 0.75);
  const rim = rgba(LOOK[kind].accent, 0.18 + 0.3 * light);
  const mid = (x0 + x1) / 2;
  if (kind === 'salon') {
    return (
      <g>
        <ellipse cx={mid} cy={y0 + 80} rx={56} ry={64} fill={rgba('#FFFFFF', 0.04 + 0.08 * light)} stroke={rim} strokeWidth={4} />
        <rect x={mid - 46} y={y0 + 170} width={92} height={46} rx={16} fill={col} />
        <rect x={mid - 10} y={y0 + 214} width={20} height={50} fill={col} />
        <rect x={mid - 40} y={y0 + 260} width={80} height={10} fill={col} />
      </g>
    );
  }
  if (kind === 'gym') {
    const bar = (y: number) => (
      <g key={y}>
        <rect x={mid - 90} y={y - 4} width={180} height={8} rx={4} fill={rgba('#FFFFFF', 0.1 + 0.15 * light)} />
        {[-80, -64, 64, 80].map((dx) => (
          <rect key={dx} x={mid + dx - 7} y={y - 26} width={14} height={52} rx={4} fill={col} stroke={rim} strokeWidth={3} />
        ))}
      </g>
    );
    return <g>{[y0 + 70, y0 + 150, y0 + 230].map(bar)}</g>;
  }
  return (
    <g>
      {[0, 1, 2].map((k) => (
        <g key={k} transform={`translate(${x0 + 50 + k * 90}, ${y0 + 190})`}>
          <rect x={0} y={0} width={60} height={34} rx={8} fill={col} stroke={rim} strokeWidth={2} />
          <rect x={4} y={-50} width={14} height={52} rx={6} fill={col} />
          <rect x={6} y={34} width={8} height={40} fill={col} />
          <rect x={46} y={34} width={8} height={40} fill={col} />
        </g>
      ))}
    </g>
  );
};

const Shop: React.FC<{f: number; kind: ShopKind}> = ({f, kind}) => {
  const c = DISTRICT[kind];
  const L = LOOK[kind];
  const calmV = calm[kind](f);
  const launch = clamp(calm.city(f));
  const H = SHOP.halfW;
  const light = clamp(0.25 + 0.75 * calmV + 0.2 * launch);
  const door = doorOpen(kind, f);
  const out: React.ReactNode[] = [];
  // brick courses
  for (let y = SHOP.roof + 30; y < GROUND; y += 36) out.push(<line key={`b${y}`} x1={c - H} y1={y} x2={c + H} y2={y} stroke={rgba('#FFFFFF', 0.025)} strokeWidth={2} />);
  // upper windows
  SHOP.winRows.forEach((wy, r) =>
    SHOP.winCols.forEach((wx, k) => {
      const seed = c * 7 + r * 13 + k;
      const on = lit(f, seed, calmV);
      const tint = hash01(seed, 3) < 0.3 ? L.accent : '#C9B8FF';
      out.push(
        <g key={`w${r}${k}`}>
          <rect x={c + wx - 8} y={wy - 8} width={SHOP.winW + 16} height={SHOP.winH + 16} rx={6} fill={L.trim} />
          <rect x={c + wx} y={wy} width={SHOP.winW} height={SHOP.winH} rx={4} fill="#0B0914" />
          <rect x={c + wx} y={wy} width={SHOP.winW} height={SHOP.winH} rx={4} fill={tint} opacity={0.08 + 0.3 * on} />
          <line x1={c + wx + SHOP.winW / 2} y1={wy} x2={c + wx + SHOP.winW / 2} y2={wy + SHOP.winH} stroke={L.trim} strokeWidth={5} />
          <rect x={c + wx - 12} y={wy + SHOP.winH + 6} width={SHOP.winW + 24} height={10} rx={3} fill={L.trim} />
        </g>,
      );
    }),
  );
  // awning stripes with scalloped edge
  const aw: React.ReactNode[] = [];
  const stripes = 14;
  const aw0 = c - H - 10;
  const sw = (2 * H + 20) / stripes;
  for (let i = 0; i < stripes; i++) {
    aw.push(<rect key={`a${i}`} x={aw0 + i * sw} y={SHOP.awning} width={sw} height={56} fill={i % 2 ? L.stripe : rgba(L.accent, 0.55 + 0.25 * light)} />);
    aw.push(<ellipse key={`s${i}`} cx={aw0 + i * sw + sw / 2} cy={SHOP.awning + 56} rx={sw / 2} ry={14} fill={i % 2 ? L.stripe : rgba(L.accent, 0.55 + 0.25 * light)} />);
  }
  const glassFill = `url(#glass-${kind})`;
  const flick = calmV < 0.5 ? (hash01(c, Math.floor(f / 4)) < 0.18 ? 0.5 : 1) : 1;
  return (
    <g>
      <defs>
        <linearGradient id={`glass-${kind}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={rgba(L.accent, 0.1 + 0.22 * light * flick)} />
          <stop offset="100%" stopColor={rgba('#2A1F4A', 0.5 + 0.4 * light * flick)} />
        </linearGradient>
      </defs>
      {/* receding side wall and rim light give the block volume */}
      <polygon points={`${c + H},${SHOP.roof} ${c + H + 54},${SHOP.roof + 36} ${c + H + 54},${GROUND} ${c + H},${GROUND}`} fill="#0B0915" />
      <rect x={c - H} y={SHOP.roof} width={2 * H} height={GROUND - SHOP.roof} fill={L.body} />
      <rect x={c - H} y={SHOP.roof} width={2 * H} height={GROUND - SHOP.roof} fill="url(#shopShade)" />
      <rect x={c - H} y={SHOP.roof} width={5} height={GROUND - SHOP.roof} fill={rgba('#CBB8FF', 0.28)} />
      <rect x={c - H - 20} y={SHOP.roof - 6} width={2 * H + 40} height={30} rx={4} fill={L.trim} />
      <rect x={c - H - 20} y={SHOP.roof + 22} width={2 * H + 40} height={5} fill={rgba(L.accent, 0.35 + 0.4 * light)} />
      {out}
      <Sign f={f} c={c} kind={kind} calmV={calmV} launch={launch} />
      {/* storefront */}
      <rect x={c - H + 14} y={SHOP.glassTop - 16} width={2 * H - 28} height={GROUND - SHOP.glassTop + 16} fill={L.trim} />
      {(
        [
          [c - H + 30, c - SHOP.doorHalf - 18],
          [c + SHOP.doorHalf + 18, c + H - 30],
        ] as const
      ).map(([x0, x1], i) => (
        <g key={i}>
          <rect x={x0} y={SHOP.glassTop} width={x1 - x0} height={GROUND - 20 - SHOP.glassTop} fill="#0C0A16" />
          <rect x={x0} y={SHOP.glassTop} width={x1 - x0} height={GROUND - 20 - SHOP.glassTop} fill={glassFill} />
          <Interior c={c} kind={kind} x0={x0} x1={x1} light={light} />
          <line x1={(x0 + x1) / 2} y1={SHOP.glassTop} x2={(x0 + x1) / 2} y2={GROUND - 20} stroke={L.trim} strokeWidth={6} />
          <polygon points={`${x0 + 20},${SHOP.glassTop} ${x0 + 70},${SHOP.glassTop} ${x0 + 10},${GROUND - 30} ${x0},${GROUND - 60}`} fill={rgba('#FFFFFF', 0.04)} />
        </g>
      ))}
      {/* door: slides open for customers */}
      <rect x={c - SHOP.doorHalf} y={SHOP.doorTop} width={2 * SHOP.doorHalf} height={GROUND - 20 - SHOP.doorTop} fill={rgba(L.accent, 0.15 + 0.5 * door * light)} />
      <rect x={c - SHOP.doorHalf + 2 * SHOP.doorHalf * door * 0.85} y={SHOP.doorTop} width={2 * SHOP.doorHalf * (1 - door * 0.85)} height={GROUND - 20 - SHOP.doorTop} fill="#100D1C" stroke={L.trim} strokeWidth={6} />
      <rect x={c - SHOP.doorHalf + 16 + 2 * SHOP.doorHalf * door * 0.85} y={SHOP.doorTop + 20} width={Math.max(0, 2 * SHOP.doorHalf * (1 - door * 0.85) - 32)} height={100} fill={rgba(L.accent, 0.1 + 0.25 * light)} />
      <rect x={c - SHOP.doorHalf - 12} y={SHOP.doorTop - 16} width={2 * SHOP.doorHalf + 24} height={16} fill={L.trim} />
      <rect x={c - H + 14} y={SHOP.awning + 60} width={2 * H - 28} height={70} fill="url(#awningShadow)" />
      {aw}
      <rect x={c - H - 10} y={SHOP.awning - 6} width={2 * H + 20} height={8} fill={L.trim} />
      {/* plinth */}
      <rect x={c - H} y={GROUND - 20} width={2 * H} height={20} fill={L.trim} />
    </g>
  );
};

/** Wet-road reflections of the rooftop neon and light spilling from the storefront. */
const Spill: React.FC<{f: number; kind: ShopKind}> = ({f, kind}) => {
  const c = DISTRICT[kind];
  const L = LOOK[kind];
  const calmV = calm[kind](f);
  const light = clamp(0.25 + 0.75 * calmV + 0.2 * calm.city(f));
  const n = COPY2.shops[kind].length;
  const w = n * 112 * 0.72;
  const flick = calmV < 0.5 && hash01(c, Math.floor(f / 4)) < 0.2 ? 0.4 : 1;
  const panes = [
    [c - SHOP.halfW + 30, c - SHOP.doorHalf - 18],
    [c + SHOP.doorHalf + 18, c + SHOP.halfW - 30],
  ];
  return (
    <g>
      <defs>
        <linearGradient id={`refl-${kind}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={rgba(L.accent, 0.22)} />
          <stop offset="100%" stopColor={rgba(L.accent, 0)} />
        </linearGradient>
        <filter id="reflBlur" x="-50%" y="-10%" width="200%" height="120%">
          <feGaussianBlur stdDeviation="10 4" />
        </filter>
      </defs>
      {panes.map(([x0, x1], i) => (
        <polygon key={i} points={`${x0},${GROUND} ${x1},${GROUND} ${x1 + 40},${GROUND + 96} ${x0 - 40},${GROUND + 96}`} fill={rgba(L.accent, 0.06 + 0.1 * light * flick)} />
      ))}
      <g filter="url(#reflBlur)">
        {Array.from({length: n}, (_, i) => {
          const x = c - w / 2 + (i + 0.5) * (w / n);
          const wob = 3 * Math.sin(f * 0.09 + i * 1.9);
          return <rect key={i} x={x - 16 + wob} y={GROUND + 116} width={32} height={260} rx={16} fill={`url(#refl-${kind})`} opacity={(0.45 + 0.55 * light) * flick} />;
        })}
      </g>
    </g>
  );
};

type Filler = {x0: number; x1: number; top: number; seed: number};
const FILLERS: Filler[] = [
  {x0: -900, x1: -520, top: 360, seed: 1},
  {x0: -500, x1: 100, top: 520, seed: 2},
  {x0: 990, x1: 1290, top: 420, seed: 3},
  {x0: 2190, x1: 2490, top: 470, seed: 4},
  {x0: 3380, x1: 3900, top: 400, seed: 5},
  {x0: 3920, x1: 4400, top: 560, seed: 6},
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
      const on = lit(f, seed, city, 0.3);
      wins.push(<rect key={`${r}-${k}`} x={b.x0 + 24 + k * 70} y={b.top + 50 + r * 90} width={34} height={46} rx={3} fill={hash01(seed, 9) < 0.25 ? PALETTE.violet : '#BFB0F0'} opacity={0.05 + 0.22 * on} />);
    }
  return (
    <g>
      <rect x={b.x0} y={b.top} width={w} height={GROUND - b.top} fill="#0D0B18" />
      <rect x={b.x0} y={b.top} width={w} height={GROUND - b.top} fill="url(#shopShade)" />
      <rect x={b.x0 - 8} y={b.top - 10} width={w + 16} height={14} fill="#1A1530" />
      {wins}
      {/* rooftop water tank */}
      <rect x={b.x0 + w * 0.6} y={b.top - 70} width={60} height={50} rx={6} fill="#171229" />
      <line x1={b.x0 + w * 0.6 + 10} y1={b.top - 20} x2={b.x0 + w * 0.6 + 10} y2={b.top} stroke="#171229" strokeWidth={6} />
      <line x1={b.x0 + w * 0.6 + 50} y1={b.top - 20} x2={b.x0 + w * 0.6 + 50} y2={b.top} stroke="#171229" strokeWidth={6} />
    </g>
  );
};

const LAMPS = [-60, 1140, 2340, 3540];

const Lamp: React.FC<{f: number; x: number}> = ({f, x}) => {
  const city = calm.city(f);
  const on = city > 0.5 || hash01(x, Math.floor(f / 4)) > 0.2 ? 1 : 0.25;
  const top = GROUND - 390;
  return (
    <g>
      <polygon points={`${x + 60},${top + 30} ${x - 60},${GROUND + 60} ${x + 200},${GROUND + 60}`} fill={rgba(PALETTE.violet, 0.07 * on)} />
      <rect x={x - 6} y={top} width={12} height={GROUND - top} fill="#241D3A" />
      <path d={`M${x},${top + 8} Q${x},${top - 30} ${x + 60},${top - 20}`} fill="none" stroke="#241D3A" strokeWidth={10} />
      <rect x={x + 40} y={top - 22} width={46} height={16} rx={8} fill="#2E2548" />
      <ellipse cx={x + 63} cy={top - 4} rx={20} ry={8} fill={rgba('#E8DDFF', 0.9 * on)} filter="url(#neon)" />
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
      <ellipse cx={0} cy={6} rx={130} ry={12} fill="rgba(0,0,0,0.45)" />
      <rect x={-120} y={-58} width={240} height={52} rx={18} fill={car.color} />
      <path d="M-70,-58 L-40,-100 L50,-100 L78,-58 Z" fill={car.color} />
      <path d="M-58,-60 L-34,-92 L0,-92 L0,-60 Z" fill={rgba('#CFC2FF', 0.25)} />
      <path d="M8,-60 L8,-92 L44,-92 L66,-60 Z" fill={rgba('#CFC2FF', 0.25)} />
      <circle cx={-72} cy={-6} r={20} fill="#0A0810" />
      <circle cx={72} cy={-6} r={20} fill="#0A0810" />
      <circle cx={-72} cy={-6} r={8} fill="#3A3350" />
      <circle cx={72} cy={-6} r={8} fill="#3A3350" />
      <rect x={112} y={-46} width={10} height={14} rx={4} fill="#FFF6D8" />
      <polygon points="122,-44 360,-80 360,10" fill="url(#headlight)" />
      <rect x={-122} y={-46} width={8} height={14} rx={3} fill={PALETTE.magenta} />
    </g>
  );
};

export const Street: React.FC<{f: number}> = ({f}) => {
  const vis = visibleX(f, 1, 500);
  return (
    <Layer f={f} p={1}>
      <defs>
        <filter id="neon" x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation={6} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="shopShade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="70%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.28)" />
        </linearGradient>
        <linearGradient id="awningShadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0.45)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        <linearGradient id="headlight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,246,216,0.28)" />
          <stop offset="100%" stopColor="rgba(255,246,216,0)" />
        </linearGradient>
      </defs>
      {FILLERS.filter((b) => b.x1 > vis.x0 && b.x0 < vis.x1).map((b) => (
        <FillerBlock key={b.seed} f={f} b={b} />
      ))}
      {(['salon', 'gym', 'clinic'] as const)
        .filter((k) => DISTRICT[k] + 500 > vis.x0 && DISTRICT[k] - 500 < vis.x1)
        .map((k) => (
          <Shop key={k} f={f} kind={k} />
        ))}
      {/* sidewalk, curb, road */}
      <rect x={-2000} y={GROUND} width={8000} height={100} fill="#1B1630" />
      {Array.from({length: 60}, (_, i) => (
        <line key={i} x1={-2000 + i * 140} y1={GROUND} x2={-2000 + i * 140} y2={GROUND + 96} stroke={rgba('#FFFFFF', 0.04)} strokeWidth={3} />
      ))}
      <rect x={-2000} y={GROUND + 96} width={8000} height={10} fill="#2B2445" />
      <rect x={-2000} y={GROUND + 106} width={8000} height={1400} fill="#0D0B16" />
      {Array.from({length: 46}, (_, i) => (
        <rect key={i} x={-2000 + i * 180} y={1722} width={90} height={8} rx={4} fill={rgba('#FFFFFF', 0.16)} />
      ))}
      {(['salon', 'gym', 'clinic'] as const)
        .filter((k) => DISTRICT[k] + 500 > vis.x0 && DISTRICT[k] - 500 < vis.x1)
        .map((k) => (
          <Spill key={`s${k}`} f={f} kind={k} />
        ))}
      <rect x={-2000} y={1900} width={8000} height={10} fill="#2B2445" />
      <rect x={-2000} y={1910} width={8000} height={600} fill="#15111F" />
      {LAMPS.filter((x) => x > vis.x0 && x < vis.x1).map((x) => (
        <Lamp key={x} f={f} x={x} />
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
