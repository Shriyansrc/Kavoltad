// Depth cues in front of and between the layers: slightly defocused string
// lights and cables near the lens (p = 1.35), poles that sweep past during
// camera travel, drifting bokeh at two depths, and a ground-level haze band.
import React, {useMemo} from 'react';
import {PALETTE, rgba} from '../../config/palette.ts';
import {SEED} from '../../config/video.ts';
import {clamp} from '../../lib/anim.ts';
import {mulberry32} from '../../lib/random.ts';
import {GROUND} from '../camera.ts';
import {calm} from '../config.ts';
import {Layer, visibleX} from './Layer.tsx';

const P_NEAR = 1.35;

/** Catenary sag between two posts. */
const sagY = (x: number, x0: number, x1: number, y: number, sag: number) => {
  const u = (x - x0) / (x1 - x0);
  return y + sag * 4 * u * (1 - u);
};

const FLAGS = ['#FF4F9A', '#FFD166', '#7C4DFF', '#3DDC97', '#4FB8F0', '#FF8A3D', '#FFFFFF'];

/** Festival bunting and warm bulbs strung across the street, close to the lens. */
export const StringLights: React.FC<{f: number}> = ({f}) => {
  // Near the lens they only belong to the street-level shots.
  const show = 1 - clamp((f - 1620) / 24);
  if (show <= 0) return null;
  const vis = visibleX(f, P_NEAR, 300);
  const spans: React.ReactNode[] = [];
  const span = 820;
  for (let x0 = -2400; x0 < 5200; x0 += span) {
    const x1 = x0 + span;
    if (x1 < vis.x0 || x0 > vis.x1) continue;
    const y = 60 + ((x0 / span) % 2 ? 26 : 0);
    const sag = 110;
    const pts: string[] = [];
    for (let k = 0; k <= 24; k++) {
      const x = x0 + (k / 24) * span;
      pts.push(`${x.toFixed(1)},${sagY(x, x0, x1, y, sag).toFixed(1)}`);
    }
    spans.push(<polyline key={`c${x0}`} points={pts.join(' ')} fill="none" stroke="#2A1B4A" strokeWidth={4} />);
    for (let k = 0; k < 16; k++) {
      const x = x0 + ((k + 0.5) / 16) * span;
      const by = sagY(x, x0, x1, y, sag);
      const flap = 6 * Math.sin(f * 0.12 + k * 0.9 + x0);
      const col = FLAGS[(k + Math.round(x0 / span)) % FLAGS.length];
      spans.push(<path key={`f${x0}-${k}`} d={`M${x - 20},${by} L${x + 20},${by} L${x + flap * 0.5},${by + 46}`} fill={col} opacity={0.95} />);
      if (k % 3 === 1) {
        const tw = 0.75 + 0.25 * Math.sin(f * 0.07 + k * 1.7 + x0);
        spans.push(<circle key={`b${x0}-${k}`} cx={x + 20} cy={by + 8} r={22} fill={rgba('#FFE9C7', 0.18 * tw)} />);
        spans.push(<circle key={`d${x0}-${k}`} cx={x + 20} cy={by + 8} r={8} fill="#FFF3D6" opacity={0.95 * tw} />);
      }
    }
  }
  return (
    <Layer f={f} p={P_NEAR} style={{filter: 'blur(1.4px)', opacity: show}}>
      {spans}
    </Layer>
  );
};

/** Street poles close to the lens: they only cross frame while the camera travels. */
export const NearPoles: React.FC<{f: number}> = ({f}) => {
  if (f > 1640) return null;
  const vis = visibleX(f, P_NEAR, 200);
  const xs = [900, 2580, -900, 4300].filter((x) => x > vis.x0 && x < vis.x1);
  if (!xs.length) return null;
  return (
    <Layer f={f} p={P_NEAR} style={{filter: 'blur(3px)'}}>
      {xs.map((x) => (
        <g key={x}>
          <rect x={x - 26} y={-400} width={52} height={2600} fill="#2A1F4E" />
          <rect x={x - 26} y={-400} width={10} height={2600} fill={rgba('#FFB38A', 0.35)} />
          <rect x={x - 70} y={900} width={140} height={200} rx={10} fill="#3A2C66" />
          <rect x={x - 56} y={920} width={112} height={60} rx={6} fill={rgba(PALETTE.magenta, 0.7)} />
        </g>
      ))}
    </Layer>
  );
};

type Mote = {x: number; y: number; r: number; tint: string; ph: number; sp: number};

export const Bokeh: React.FC<{f: number; p: number; count: number; salt: number; blurPx: number; alpha: number}> = ({f, p, count, salt, blurPx, alpha}) => {
  const motes = useMemo(() => {
    const rnd = mulberry32(SEED + salt);
    return Array.from({length: count}, (): Mote => {
      const t = rnd();
      return {x: -1400 + rnd() * 6400, y: -600 + rnd() * 2600, r: 8 + rnd() * 26, tint: t < 0.3 ? PALETTE.magenta : t < 0.5 ? '#FFB38A' : t < 0.7 ? '#FFE9C7' : t < 0.85 ? PALETTE.cyan : PALETTE.violet, ph: rnd() * 6.28, sp: 0.3 + rnd() * 0.8};
    });
  }, [count, salt]);
  const vis = visibleX(f, p, 100);
  return (
    <Layer f={f} p={p} style={{filter: `blur(${blurPx}px)`}} blur={false}>
      {motes.map((m, i) => {
        const x = m.x + 40 * Math.sin(f * 0.006 * m.sp + m.ph);
        if (x < vis.x0 || x > vis.x1) return null;
        const y = m.y - ((f * m.sp * 0.6) % 2600);
        const yy = y < -600 ? y + 2600 : y;
        return <circle key={i} cx={x} cy={yy} r={m.r} fill={m.tint} opacity={alpha * (0.5 + 0.5 * Math.sin(f * 0.03 * m.sp + m.ph))} />;
      })}
    </Layer>
  );
};

/** Ground haze: a soft luminous band where the street meets the air. */
export const Haze: React.FC<{f: number}> = ({f}) => {
  const city = clamp(calm.city(f));
  return (
    <Layer f={f} p={0.85} blur={false}>
      <defs>
        <linearGradient id="hazeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={rgba(PALETTE.violet, 0)} />
          <stop offset="60%" stopColor={rgba(PALETTE.violet, 0.1 + 0.05 * city)} />
          <stop offset="100%" stopColor={rgba(PALETTE.magenta, 0)} />
        </linearGradient>
      </defs>
      <rect x={-3000} y={GROUND - 700} width={10000} height={900} fill="url(#hazeGrad)" />
    </Layer>
  );
};
