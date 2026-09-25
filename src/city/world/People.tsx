// Capsule townsfolk with a walk cycle (legs, arm swing, head bob), mood marks
// and the launch-night crowd. Drawn in world pixels on the street layer.
import React from 'react';
import {PALETTE, rgba} from '../../config/palette.ts';
import {FONT_SANS} from '../../config/type.ts';
import {clamp, invLerp, lerp} from '../../lib/anim.ts';
import {GROUND} from '../camera.ts';
import {C} from '../config.ts';
import {Layer, visibleX} from './Layer.tsx';
import {CROWD, WALKERS, walkerState} from './people.ts';

const SKIN = '#E6D9F5';

export const Person: React.FC<{
  x: number;
  y: number; // feet
  h: number;
  body: string;
  hair?: string;
  dir: 1 | -1;
  phase: number; // walk phase (0 = standing)
  walking: boolean;
  mood?: 'rush' | 'lost' | 'happy';
  arms?: number; // 0 down … 1 raised (cheer)
  opacity?: number;
  scale?: number;
}> = ({x, y, h, body, hair = '#1A1024', dir, phase, walking, mood, arms = 0, opacity = 1, scale = 1}) => {
  const leg = 0.3 * h;
  const torso = 0.42 * h;
  const r = 0.125 * h;
  const tw = 0.3 * h;
  const bob = walking ? -Math.abs(Math.sin(phase * Math.PI)) * 5 : 0;
  const swing = walking ? Math.sin(phase * Math.PI) * 26 : 0;
  const hip = -leg;
  const sh = -leg - torso + 12;
  const legEnd = (deg: number) => ({x: Math.sin((deg * Math.PI) / 180) * leg, y: hip + Math.cos((deg * Math.PI) / 180) * leg});
  const l1 = legEnd(swing);
  const l2 = legEnd(-swing);
  const arm = 0.28 * h;
  const armEnd = (deg: number) => ({x: Math.sin((deg * Math.PI) / 180) * arm, y: sh + Math.cos((deg * Math.PI) / 180) * arm});
  const up = lerp(0, 160, arms);
  const a1 = armEnd(-swing * 0.8 + up);
  const a2 = armEnd(swing * 0.8 - up);
  const headY = sh - r - 6;
  return (
    <g transform={`translate(${x}, ${y + bob}) scale(${scale})`} opacity={opacity}>
      <ellipse cx={0} cy={-bob + 2} rx={tw * 0.9} ry={7} fill="rgba(0,0,0,0.35)" />
      <g stroke={body} strokeWidth={0.1 * h} strokeLinecap="round">
        <line x1={-tw * 0.18} y1={hip} x2={-tw * 0.18 + l1.x} y2={l1.y} />
        <line x1={tw * 0.18} y1={hip} x2={tw * 0.18 + l2.x} y2={l2.y} />
      </g>
      <g stroke={body} strokeWidth={0.075 * h} strokeLinecap="round" opacity={0.9}>
        <line x1={-tw * 0.45} y1={sh} x2={-tw * 0.45 + a1.x} y2={a1.y} />
        <line x1={tw * 0.45} y1={sh} x2={tw * 0.45 + a2.x} y2={a2.y} />
      </g>
      <rect x={-tw / 2} y={-leg - torso} width={tw} height={torso + 8} rx={tw / 2} fill={body} />
      <rect x={-tw / 2 + 6} y={-leg - torso + 10} width={tw * 0.25} height={torso * 0.6} rx={6} fill={rgba('#FFFFFF', 0.08)} />
      <circle cx={0} cy={headY} r={r} fill={SKIN} />
      <path d={`M${-r},${headY - 2} A${r},${r} 0 0 1 ${r},${headY - 2} L${r * 0.4 * -dir},${headY - r * 0.4} Z`} fill={hair} />
      <circle cx={dir * r * 0.35} cy={headY + 2} r={2.4} fill="#1A1024" />
      <circle cx={dir * r * 0.75} cy={headY + 2} r={2.4} fill="#1A1024" />
      {mood === 'happy' ? <path d={`M${dir * r * 0.25},${headY + 9} Q${dir * r * 0.55},${headY + 14} ${dir * r * 0.85},${headY + 8}`} stroke="#1A1024" strokeWidth={2} fill="none" /> : null}
      {mood === 'lost' ? (
        <g transform={`translate(${-dir * 6}, ${headY - r - 38})`}>
          <rect x={-20} y={-24} width={40} height={40} rx={12} fill={PALETTE.surface} stroke={rgba(PALETTE.magenta, 0.7)} strokeWidth={3} />
          <text x={0} y={8} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={800} fontSize={28} fill="#FFFFFF">
            ?
          </text>
        </g>
      ) : null}
      {mood === 'rush' && walking ? (
        <g stroke={rgba('#FFFFFF', 0.35)} strokeWidth={3} strokeLinecap="round">
          <line x1={-dir * (tw * 0.7)} y1={-leg - torso * 0.7} x2={-dir * (tw * 0.7 + 30)} y2={-leg - torso * 0.7} />
          <line x1={-dir * (tw * 0.7)} y1={-leg - torso * 0.35} x2={-dir * (tw * 0.7 + 44)} y2={-leg - torso * 0.35} />
          <line x1={-dir * (tw * 0.7)} y1={-leg} x2={-dir * (tw * 0.7 + 24)} y2={-leg} />
        </g>
      ) : null}
    </g>
  );
};

export const People: React.FC<{f: number}> = ({f}) => {
  const vis = visibleX(f, 1, 200);
  const crowdIn = clamp(invLerp(1090, 1150, f));
  return (
    <Layer f={f} p={1}>
      {WALKERS.map((wk) => {
        const s = walkerState(wk, f);
        if (!s.visible || s.x < vis.x0 || s.x > vis.x1) return null;
        return <Person key={wk.id} x={s.x} y={s.y} h={wk.h} body={wk.body} hair={wk.hair} dir={s.dir} phase={s.phase} walking={f < wk.t1 + 22} mood={wk.mood} opacity={s.opacity} scale={s.scale} />;
      })}
      {f >= 1090 && f < C.swap
        ? CROWD.map((p, i) => {
            const from = p.x + (i < 3 ? -420 : 420);
            const x = lerp(from, p.x, crowdIn);
            const walking = crowdIn < 1;
            const t = f - C.launch - p.phase;
            const jump = t > 0 && t < 70 ? Math.abs(Math.sin((t / 16) * Math.PI)) * 34 * Math.exp(-t / 50) : 0;
            const arms = t > 0 ? clamp(t / 8) * (1 - clamp((t - 120) / 20)) : 0;
            return (
              <Person
                key={`c${i}`}
                x={x}
                y={GROUND + 62 - jump}
                h={p.h}
                body={p.body}
                hair={p.hair}
                dir={i < 3 ? 1 : -1}
                phase={walking ? Math.abs(x - from) / 26 : 0}
                walking={walking}
                mood={f > C.launch ? 'happy' : undefined}
                arms={arms}
              />
            );
          })
        : null}
    </Layer>
  );
};
