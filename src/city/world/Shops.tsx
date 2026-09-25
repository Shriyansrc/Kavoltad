// The three businesses of Chaos City, each with its own architecture and
// colour identity so they read instantly:
//   SALON  — pink boutique: arched windows, flower boxes, scissors sign,
//            candy-stripe awning, mirrors and chairs inside.
//   GYM    — industrial orange-and-slate: brick, a giant dumbbell sign,
//            big grid windows with runners on treadmills, punching bag.
//   CLINIC — clean white-and-mint: rounded facade, teal cross, sky-blue
//            windows (the flats upstairs), waiting chairs, planters.
// A broken shop is dimmed and its sign flickers; once fixed it lights up.
import React from 'react';
import {rgba} from '../../config/palette.ts';
import {FONT_SANS} from '../../config/type.ts';
import {clamp} from '../../lib/anim.ts';
import {hash01} from '../../lib/random.ts';
import {DISTRICT, GROUND} from '../camera.ts';
import {calm, COPY2} from '../config.ts';
import {doorOpen} from './people.ts';
import {SHOP} from './shop.ts';

export type ShopKind = 'salon' | 'gym' | 'clinic';

export const LOOK: Record<ShopKind, {body: string; panel: string; trim: string; accent: string; accent2: string; glass: string}> = {
  salon: {body: '#F2649F', panel: '#FF8DC0', trim: '#FFE4F1', accent: '#D81B72', accent2: '#FFD166', glass: '#FFD6E8'},
  gym: {body: '#2F3F78', panel: '#3B4F92', trim: '#1E2A55', accent: '#FF7A2F', accent2: '#FFC247', glass: '#FFE2B8'},
  clinic: {body: '#EAF8F6', panel: '#C8EFE8', trim: '#15A89A', accent: '#10B7A6', accent2: '#00E5FF', glass: '#CFF4FF'},
};

const H = SHOP.halfW;

/** Flicker for a broken shop's sign (0.25…1), steady when fixed. */
const signFlicker = (f: number, c: number, calmV: number) => (calmV > 0.5 ? 1 : hash01(c, Math.floor(f / 3)) < 0.3 * (1 - calmV * 2) ? 0.25 : 1);

const Door: React.FC<{c: number; kind: ShopKind; f: number; light: number; round?: boolean}> = ({c, kind, f, light, round}) => {
  const L = LOOK[kind];
  const door = doorOpen(kind, f);
  const w = 2 * SHOP.doorHalf;
  const h = GROUND - 20 - SHOP.doorTop;
  const x0 = c - SHOP.doorHalf;
  return (
    <g>
      <rect x={x0 - 12} y={SHOP.doorTop - 16} width={w + 24} height={h + 16} rx={round ? 70 : 6} fill={L.trim} />
      <rect x={x0} y={SHOP.doorTop} width={w} height={h} rx={round ? 60 : 4} fill={rgba('#FFF2C9', 0.35 + 0.5 * door * light)} />
      <rect x={x0 + w * door * 0.85} y={SHOP.doorTop} width={w * (1 - door * 0.85)} height={h} rx={round ? 60 : 4} fill={kind === 'clinic' ? rgba(L.glass, 0.85) : L.accent} stroke={L.trim} strokeWidth={5} />
      <circle cx={x0 + w * door * 0.85 + (w * (1 - door * 0.85)) / 2} cy={SHOP.doorTop + 60} r={Math.max(0, Math.min(26, (w * (1 - door * 0.85)) / 2 - 8))} fill={rgba('#FFFFFF', 0.55)} />
    </g>
  );
};

const Planter: React.FC<{x: number; y: number; leaf: string; flower?: string; s?: number; f: number}> = ({x, y, leaf, flower, s = 1, f}) => {
  const sway = 2 * Math.sin(f * 0.05 + x);
  return (
    <g transform={`translate(${x}, ${y}) scale(${s})`}>
      <g transform={`rotate(${sway}, 0, -10)`}>
        {[-26, -8, 10, 26].map((dx, i) => (
          <ellipse key={i} cx={dx} cy={-46 - (i % 2) * 14} rx={20} ry={30} fill={i % 2 ? leaf : rgba(leaf, 0.85)} />
        ))}
        {flower ? [-20, 4, 22].map((dx, i) => <circle key={`f${i}`} cx={dx} cy={-66 - (i % 2) * 10} r={8} fill={flower} />) : null}
      </g>
      <path d="M-38,-18 L38,-18 L30,20 L-30,20 Z" fill="#6B3E5E" />
      <rect x={-42} y={-24} width={84} height={10} rx={4} fill="#8A5178" />
    </g>
  );
};

// ------------------------------------------------------------------ SALON
const Salon: React.FC<{f: number}> = ({f}) => {
  const c = DISTRICT.salon;
  const L = LOOK.salon;
  const calmV = calm.salon(f);
  const light = clamp(0.35 + 0.65 * calmV + 0.2 * calm.city(f));
  const fl = signFlicker(f, c, calmV);
  const out: React.ReactNode[] = [];
  // pinstripe panels
  for (let x = c - H + 30; x < c + H; x += 60) out.push(<rect key={`p${x}`} x={x} y={SHOP.roof + 30} width={26} height={GROUND - SHOP.roof - 60} fill={rgba(L.panel, 0.35)} />);
  // arched upper windows with flower boxes
  SHOP.winRows.forEach((wy, r) =>
    SHOP.winCols.forEach((wx, k) => {
      const x = c + wx;
      const on = light * (0.6 + 0.4 * hash01(r, k, 3));
      out.push(
        <g key={`w${r}${k}`}>
          <path d={`M${x - 10},${wy + SHOP.winH + 6} L${x - 10},${wy + 40} A${SHOP.winW / 2 + 10},${SHOP.winW / 2 + 10} 0 0 1 ${x + SHOP.winW + 10},${wy + 40} L${x + SHOP.winW + 10},${wy + SHOP.winH + 6} Z`} fill={L.trim} />
          <path d={`M${x},${wy + SHOP.winH} L${x},${wy + 40} A${SHOP.winW / 2},${SHOP.winW / 2} 0 0 1 ${x + SHOP.winW},${wy + 40} L${x + SHOP.winW},${wy + SHOP.winH} Z`} fill={rgba('#FFE7A8', 0.25 + 0.55 * on)} />
          <line x1={x + SHOP.winW / 2} y1={wy + 4} x2={x + SHOP.winW / 2} y2={wy + SHOP.winH} stroke={L.trim} strokeWidth={5} />
          <rect x={x - 14} y={wy + SHOP.winH + 4} width={SHOP.winW + 28} height={16} rx={6} fill="#B04A7E" />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx={x - 4 + i * 32} cy={wy + SHOP.winH + 2 - 6 * Math.sin(f * 0.06 + i + k)} r={10} fill={i % 2 ? '#3FC88A' : ['#FFD166', '#FFFFFF', '#FF4FA0'][i % 3]} />
          ))}
        </g>,
      );
    }),
  );
  // candy-stripe awning with scallops
  const stripes = 14;
  const sw = (2 * H + 20) / stripes;
  const aw: React.ReactNode[] = [];
  for (let i = 0; i < stripes; i++) {
    const col = i % 2 ? '#FFFFFF' : '#FF4F9A';
    aw.push(<rect key={`a${i}`} x={c - H - 10 + i * sw} y={SHOP.awning} width={sw} height={56} fill={col} />);
    aw.push(<ellipse key={`s${i}`} cx={c - H - 10 + i * sw + sw / 2} cy={SHOP.awning + 56} rx={sw / 2} ry={16} fill={col} />);
  }
  const w = 560;
  return (
    <g>
      <polygon points={`${c + H},${SHOP.roof} ${c + H + 54},${SHOP.roof + 36} ${c + H + 54},${GROUND} ${c + H},${GROUND}`} fill="#A83C74" />
      <rect x={c - H} y={SHOP.roof} width={2 * H} height={GROUND - SHOP.roof} fill={L.body} />
      {out}
      {/* scalloped cornice */}
      <rect x={c - H - 20} y={SHOP.roof - 8} width={2 * H + 40} height={30} rx={6} fill={L.trim} />
      {Array.from({length: 22}, (_, i) => (
        <circle key={i} cx={c - H - 10 + i * 40} cy={SHOP.roof + 22} r={14} fill={L.trim} />
      ))}
      {/* sign: pill board with scissors */}
      <g opacity={0.55 + 0.45 * fl}>
        <rect x={c - w / 2} y={SHOP.signTop} width={w} height={SHOP.roof - SHOP.signTop - 14} rx={70} fill="#FFF1F8" stroke="#FF4F9A" strokeWidth={8} filter={calmV > 0.5 ? 'url(#neon)' : undefined} />
        <g transform={`translate(${c - w / 2 + 78}, ${(SHOP.signTop + SHOP.roof - 14) / 2}) rotate(${-20 + 10 * Math.sin(f * 0.12)})`} fill="none" stroke={L.accent} strokeWidth={8} strokeLinecap="round">
          <circle cx={-18} cy={22} r={14} />
          <circle cx={18} cy={22} r={14} />
          <line x1={-10} y1={10} x2={24} y2={-34} />
          <line x1={10} y1={10} x2={-24} y2={-34} />
        </g>
        <text x={c + 40} y={SHOP.roof - 44} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={800} fontSize={96} letterSpacing="0.08em" fill={L.accent}>
          {COPY2.shops.salon}
        </text>
      </g>
      {/* storefront */}
      <rect x={c - H + 14} y={SHOP.glassTop - 16} width={2 * H - 28} height={GROUND - SHOP.glassTop + 16} fill={L.trim} />
      {[
        [c - H + 30, c - SHOP.doorHalf - 18],
        [c + SHOP.doorHalf + 18, c + H - 30],
      ].map(([x0, x1], i) => (
        <g key={i}>
          <rect x={x0} y={SHOP.glassTop} width={x1 - x0} height={GROUND - 20 - SHOP.glassTop} rx={10} fill={rgba('#FFE3EF', 0.5 + 0.4 * light)} />
          <ellipse cx={(x0 + x1) / 2} cy={SHOP.glassTop + 84} rx={56} ry={66} fill={rgba('#FFFFFF', 0.5)} stroke="#FF8DC0" strokeWidth={6} />
          <rect x={(x0 + x1) / 2 - 46} y={SHOP.glassTop + 176} width={92} height={46} rx={16} fill="#C43D7F" />
          <rect x={(x0 + x1) / 2 - 8} y={SHOP.glassTop + 220} width={16} height={46} fill="#8E2F60" />
          <polygon points={`${x0 + 18},${SHOP.glassTop} ${x0 + 64},${SHOP.glassTop} ${x0 + 10},${GROUND - 30} ${x0},${GROUND - 60}`} fill={rgba('#FFFFFF', 0.18)} />
        </g>
      ))}
      <Door c={c} kind="salon" f={f} light={light} round />
      {aw}
      <rect x={c - H - 10} y={SHOP.awning - 6} width={2 * H + 20} height={8} fill="#D81B72" />
      <Planter x={c - SHOP.doorHalf - 60} y={GROUND - 4} leaf="#34B97B" flower="#FFD166" f={f} s={0.9} />
      <Planter x={c + SHOP.doorHalf + 60} y={GROUND - 4} leaf="#34B97B" flower="#FF4FA0" f={f} s={0.9} />
      <rect x={c - H} y={GROUND - 20} width={2 * H} height={20} fill="#C94E88" />
      <rect x={c - H} y={SHOP.roof} width={2 * H} height={GROUND - SHOP.roof} fill={rgba('#2A0F3A', 0.36 * (1 - calmV))} />
    </g>
  );
};

// ------------------------------------------------------------------ GYM
const Gym: React.FC<{f: number}> = ({f}) => {
  const c = DISTRICT.gym;
  const L = LOOK.gym;
  const calmV = calm.gym(f);
  const light = clamp(0.35 + 0.65 * calmV + 0.2 * calm.city(f));
  const fl = signFlicker(f, c, calmV);
  const bricks: React.ReactNode[] = [];
  for (let y = SHOP.roof + 26, r = 0; y < GROUND - 20; y += 30, r++) {
    bricks.push(<line key={`h${y}`} x1={c - H} y1={y} x2={c + H} y2={y} stroke={rgba('#FFFFFF', 0.06)} strokeWidth={2} />);
    for (let x = c - H + (r % 2 ? 30 : 0); x < c + H; x += 60) bricks.push(<line key={`v${y}-${x}`} x1={x} y1={y} x2={x} y2={y + 30} stroke={rgba('#FFFFFF', 0.05)} strokeWidth={2} />);
  }
  // two wide industrial windows with treadmill runners
  const wins = SHOP.winRows.map((wy, r) => {
    const x0 = c - H + 50;
    const ww = 2 * H - 100;
    const runners = [0, 1, 2, 3].map((k) => {
      const rx = x0 + 90 + k * 190;
      const ph = f * 0.35 + k * 1.3 + r;
      const leg = 14 * Math.sin(ph);
      return (
        <g key={k} opacity={0.35 + 0.65 * light}>
          <rect x={rx - 44} y={wy + 86} width={96} height={10} rx={4} fill="#1C2448" />
          <line x1={rx + 40} y1={wy + 86} x2={rx + 50} y2={wy + 40} stroke="#1C2448" strokeWidth={6} />
          <circle cx={rx} cy={wy + 24 + Math.abs(Math.sin(ph)) * -3} r={11} fill="#2A1B3F" />
          <line x1={rx} y1={wy + 34} x2={rx} y2={wy + 62} stroke="#2A1B3F" strokeWidth={10} strokeLinecap="round" />
          <line x1={rx} y1={wy + 62} x2={rx + leg} y2={wy + 84} stroke="#2A1B3F" strokeWidth={8} strokeLinecap="round" />
          <line x1={rx} y1={wy + 62} x2={rx - leg} y2={wy + 84} stroke="#2A1B3F" strokeWidth={8} strokeLinecap="round" />
          <line x1={rx} y1={wy + 42} x2={rx - leg * 0.8} y2={wy + 56} stroke="#2A1B3F" strokeWidth={6} strokeLinecap="round" />
        </g>
      );
    });
    return (
      <g key={r}>
        <rect x={x0 - 10} y={wy - 10} width={ww + 20} height={SHOP.winH + 20} rx={6} fill={L.trim} />
        <rect x={x0} y={wy} width={ww} height={SHOP.winH} fill={rgba(L.glass, 0.25 + 0.6 * light)} />
        {runners}
        {Array.from({length: 7}, (_, k) => (
          <line key={k} x1={x0 + (k + 1) * (ww / 8)} y1={wy} x2={x0 + (k + 1) * (ww / 8)} y2={wy + SHOP.winH} stroke={L.trim} strokeWidth={4} />
        ))}
      </g>
    );
  });
  const bag = 8 * Math.sin(f * 0.11);
  return (
    <g>
      <polygon points={`${c + H},${SHOP.roof} ${c + H + 54},${SHOP.roof + 36} ${c + H + 54},${GROUND} ${c + H},${GROUND}`} fill="#1B2550" />
      <rect x={c - H} y={SHOP.roof} width={2 * H} height={GROUND - SHOP.roof} fill={L.body} />
      {bricks}
      {wins}
      <rect x={c - H - 20} y={SHOP.roof - 8} width={2 * H + 40} height={30} fill={L.trim} />
      <rect x={c - H - 20} y={SHOP.roof + 22} width={2 * H + 40} height={10} fill={L.accent} />
      {/* rooftop board: GYM with a giant dumbbell */}
      <g opacity={0.55 + 0.45 * fl}>
        <rect x={c - 300} y={SHOP.signTop - 6} width={600} height={SHOP.roof - SHOP.signTop - 4} rx={14} fill={L.accent} stroke="#1E2A55" strokeWidth={8} filter={calmV > 0.5 ? 'url(#neon)' : undefined} />
        <g transform={`translate(${c - 190}, ${(SHOP.signTop + SHOP.roof) / 2 - 6}) rotate(${-12 + 6 * Math.sin(f * 0.1)})`}>
          <rect x={-62} y={-7} width={124} height={14} rx={7} fill="#FFFFFF" />
          {[-60, -44, 44, 60].map((dx) => (
            <rect key={dx} x={dx - 8} y={-30} width={16} height={60} rx={5} fill="#1E2A55" />
          ))}
        </g>
        <text x={c + 60} y={SHOP.roof - 38} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={800} fontStyle="italic" fontSize={112} letterSpacing="0.04em" fill="#FFFFFF" stroke="#1E2A55" strokeWidth={4}>
          {COPY2.shops.gym}
        </text>
      </g>
      {/* steel canopy with a row of lights */}
      <rect x={c - H - 14} y={SHOP.awning + 10} width={2 * H + 28} height={34} fill="#1E2A55" />
      {Array.from({length: 12}, (_, k) => (
        <circle key={k} cx={c - H + 20 + k * 72} cy={SHOP.awning + 27} r={8} fill={rgba(L.accent2, 0.35 + 0.65 * light)} />
      ))}
      <polygon points={`${c - H - 14},${SHOP.awning + 44} ${c + H + 14},${SHOP.awning + 44} ${c + H - 20},${SHOP.awning + 70} ${c - H + 20},${SHOP.awning + 70}`} fill={rgba('#000000', 0.2)} />
      {/* roll-up glass front */}
      <rect x={c - H + 14} y={SHOP.glassTop - 16} width={2 * H - 28} height={GROUND - SHOP.glassTop + 16} fill={L.trim} />
      {[
        [c - H + 30, c - SHOP.doorHalf - 18],
        [c + SHOP.doorHalf + 18, c + H - 30],
      ].map(([x0, x1], i) => (
        <g key={i}>
          <rect x={x0} y={SHOP.glassTop} width={x1 - x0} height={GROUND - 20 - SHOP.glassTop} fill={rgba(L.glass, 0.3 + 0.55 * light)} />
          {[0, 1, 2].map((k) => (
            <g key={k}>
              <rect x={(x0 + x1) / 2 - 90} y={SHOP.glassTop + 70 + k * 80 - 4} width={180} height={8} rx={4} fill="#3B3F5E" />
              {[-80, -64, 64, 80].map((dx) => (
                <rect key={dx} x={(x0 + x1) / 2 + dx - 7} y={SHOP.glassTop + 70 + k * 80 - 24} width={14} height={48} rx={4} fill={dx < 0 ? L.accent : '#1E2A55'} />
              ))}
            </g>
          ))}
          {i === 1 ? (
            <g transform={`rotate(${bag}, ${x1 - 50}, ${SHOP.glassTop})`}>
              <line x1={x1 - 50} y1={SHOP.glassTop} x2={x1 - 50} y2={SHOP.glassTop + 40} stroke="#1E2A55" strokeWidth={4} />
              <rect x={x1 - 72} y={SHOP.glassTop + 40} width={44} height={110} rx={20} fill="#C0392B" />
            </g>
          ) : null}
          {Array.from({length: 5}, (_, k) => (
            <line key={`g${k}`} x1={x0} y1={SHOP.glassTop + (k + 1) * 46} x2={x1} y2={SHOP.glassTop + (k + 1) * 46} stroke={rgba(L.trim, 0.5)} strokeWidth={3} />
          ))}
        </g>
      ))}
      <Door c={c} kind="gym" f={f} light={light} />
      {/* hazard stripe plinth */}
      {Array.from({length: 28}, (_, k) => (
        <rect key={k} x={c - H + k * 30} y={GROUND - 20} width={30} height={20} fill={k % 2 ? '#1E2A55' : L.accent2} />
      ))}
      <rect x={c - H} y={SHOP.roof} width={2 * H} height={GROUND - SHOP.roof} fill={rgba('#0E1030', 0.36 * (1 - calmV))} />
    </g>
  );
};

// ------------------------------------------------------------------ CLINIC
const Clinic: React.FC<{f: number}> = ({f}) => {
  const c = DISTRICT.clinic;
  const L = LOOK.clinic;
  const calmV = calm.clinic(f);
  const light = clamp(0.35 + 0.65 * calmV + 0.2 * calm.city(f));
  const fl = signFlicker(f, c, calmV);
  const wins = SHOP.winRows.map((wy, r) =>
    SHOP.winCols.map((wx, k) => (
      <g key={`${r}${k}`}>
        <rect x={c + wx - 10} y={wy - 10} width={SHOP.winW + 20} height={SHOP.winH + 20} rx={16} fill="#FFFFFF" />
        <rect x={c + wx} y={wy} width={SHOP.winW} height={SHOP.winH} rx={10} fill={r === 0 ? '#9FD8F0' : rgba('#BDEBFF', 0.4 + 0.5 * light)} />
        <rect x={c + wx + 8} y={wy + 8} width={22} height={SHOP.winH - 16} rx={6} fill={rgba('#FFFFFF', 0.4)} />
      </g>
    )),
  );
  return (
    <g>
      <polygon points={`${c + H},${SHOP.roof} ${c + H + 54},${SHOP.roof + 36} ${c + H + 54},${GROUND} ${c + H},${GROUND}`} fill="#A9D9D2" />
      <rect x={c - H} y={SHOP.roof - 30} width={2 * H} height={GROUND - SHOP.roof + 30} rx={48} fill={L.body} />
      {/* mint bands */}
      <rect x={c - H} y={SHOP.roof + 180} width={2 * H} height={14} fill={L.panel} />
      <rect x={c - H} y={SHOP.roof + 330} width={2 * H} height={14} fill={L.panel} />
      {wins}
      {/* sign: white board, teal type, cross in a circle */}
      <g opacity={0.55 + 0.45 * fl}>
        <rect x={c - 300} y={SHOP.signTop - 20} width={600} height={SHOP.roof - SHOP.signTop - 4} rx={40} fill="#FFFFFF" stroke={L.accent} strokeWidth={8} filter={calmV > 0.5 ? 'url(#neon)' : undefined} />
        <circle cx={c - 206} cy={(SHOP.signTop + SHOP.roof) / 2 - 22} r={46} fill={L.accent} />
        <rect x={c - 216} y={(SHOP.signTop + SHOP.roof) / 2 - 52} width={20} height={60} rx={4} fill="#FFFFFF" />
        <rect x={c - 236} y={(SHOP.signTop + SHOP.roof) / 2 - 32} width={60} height={20} rx={4} fill="#FFFFFF" />
        <text x={c + 50} y={SHOP.roof - 56} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={800} fontSize={100} letterSpacing="0.06em" fill={L.trim}>
          {COPY2.shops.clinic}
        </text>
      </g>
      {/* teal awning */}
      {Array.from({length: 14}, (_, i) => (
        <rect key={i} x={c - H - 10 + i * ((2 * H + 20) / 14)} y={SHOP.awning} width={(2 * H + 20) / 14} height={50} fill={i % 2 ? '#FFFFFF' : L.accent} />
      ))}
      <rect x={c - H - 10} y={SHOP.awning + 50} width={2 * H + 20} height={10} fill={L.trim} />
      {/* storefront */}
      <rect x={c - H + 14} y={SHOP.glassTop - 16} width={2 * H - 28} height={GROUND - SHOP.glassTop + 16} rx={10} fill="#D6F2EE" />
      {[
        [c - H + 30, c - SHOP.doorHalf - 18],
        [c + SHOP.doorHalf + 18, c + H - 30],
      ].map(([x0, x1], i) => (
        <g key={i}>
          <rect x={x0} y={SHOP.glassTop} width={x1 - x0} height={GROUND - 20 - SHOP.glassTop} rx={14} fill={rgba(L.glass, 0.55 + 0.4 * light)} />
          {[0, 1, 2].map((k) => (
            <g key={k} transform={`translate(${x0 + 40 + k * 90}, ${SHOP.glassTop + 180})`}>
              <rect x={0} y={0} width={64} height={30} rx={10} fill={L.accent} />
              <rect x={4} y={-46} width={14} height={48} rx={6} fill={L.accent} />
              <rect x={8} y={30} width={6} height={36} fill="#5F8F8A" />
              <rect x={50} y={30} width={6} height={36} fill="#5F8F8A" />
            </g>
          ))}
          <polygon points={`${x0 + 18},${SHOP.glassTop} ${x0 + 64},${SHOP.glassTop} ${x0 + 10},${GROUND - 30} ${x0},${GROUND - 60}`} fill={rgba('#FFFFFF', 0.3)} />
        </g>
      ))}
      <Door c={c} kind="clinic" f={f} light={light} />
      <Planter x={c - H + 70} y={GROUND - 4} leaf="#2FB57E" f={f} s={0.8} />
      <Planter x={c + H - 70} y={GROUND - 4} leaf="#2FB57E" f={f} s={0.8} />
      <rect x={c - H} y={GROUND - 20} width={2 * H} height={20} fill="#9FD3CB" />
      <rect x={c - H} y={SHOP.roof - 30} width={2 * H} height={GROUND - SHOP.roof + 30} rx={48} fill={rgba('#1A2340', 0.3 * (1 - calmV))} />
    </g>
  );
};

export const ShopView: React.FC<{f: number; kind: ShopKind}> = ({f, kind}) => (kind === 'salon' ? <Salon f={f} /> : kind === 'gym' ? <Gym f={f} /> : <Clinic f={f} />);
