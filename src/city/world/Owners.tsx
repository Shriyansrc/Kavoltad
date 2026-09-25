// The three shop owners — the voices of the problems. Each has a distinct
// look (salon stylist with a pink bun and scissors, gym owner in an orange
// tank and headband, clinic doctor in a white coat with stethoscope and
// glasses), lip-sync from their own voice track (lipsync.json, 60 fps
// envelopes), and acting: worried while speaking the problem, amazed at the
// hologram, cheering and waving thanks to Kavey after the fix.
import React from 'react';
import {rgba} from '../../config/palette.ts';
import {clamp, envelope, invLerp, lerp} from '../../lib/anim.ts';
import {DISTRICT, GROUND} from '../camera.ts';
import {C} from '../config.ts';
import LIPS from '../lipsync.json';
import {Layer, visibleX} from './Layer.tsx';

type Kind = 'salon' | 'gym' | 'clinic';
type Lip = {speaker: string; start: number; env: number[]};
const lips = LIPS as unknown as Record<string, Lip>;

/** Mouth opening 0…1 for a speaker at frame f (0 when silent). */
const mouthAt = (speaker: Kind, f: number) => {
  for (const l of Object.values(lips)) {
    if (l.speaker !== speaker) continue;
    const i = f - Math.round(l.start * 60);
    if (i >= 0 && i < l.env.length) {
      const a = l.env[Math.floor(i)] ?? 0;
      const b = l.env[Math.min(l.env.length - 1, Math.floor(i) + 1)] ?? 0;
      return lerp(a, b, i - Math.floor(i));
    }
  }
  return 0;
};

const TIMES: Record<Kind, {worry: [number, number]; hit: number; cheer: number; thanks: [number, number]}> = {
  salon: {worry: [C.salonBlocks - 10, C.salonHit], hit: C.salonHit, cheer: C.salonChecks, thanks: [C.salonCheer, C.salonCheer + 70]},
  gym: {worry: [C.planesOut[0] - 14, C.gymHit], hit: C.gymHit, cheer: C.gymChecks, thanks: [C.gymCheer, C.gymCheer + 60]},
  clinic: {worry: [C.clinicSnooze - 8, C.clinicHit], hit: C.clinicHit, cheer: C.clinicWake + 6, thanks: [C.clinicCheer, C.clinicCheer + 50]},
};

const LOOKS = {
  salon: {skin: '#C98E6B', hair: '#FF4F9A', top: '#B78CFF', legs: '#5B3E9E', shoe: '#FFFFFF', h: 250},
  gym: {skin: '#8D5A3B', hair: '#1A1024', top: '#FF7A2F', legs: '#23305E', shoe: '#FFFFFF', h: 262},
  clinic: {skin: '#F2C9A0', hair: '#6B5B73', top: '#10B7A6', legs: '#10B7A6', shoe: '#2B2440', h: 254},
} as const;

/** Arm from a shoulder: a1 = upper-arm angle from straight down (outward positive), a2 = elbow bend. */
const arm = (sx: number, sy: number, side: -1 | 1, a1: number, a2: number, l1: number, l2: number) => {
  const r1 = (a1 * Math.PI) / 180;
  const r2 = ((a1 + a2) * Math.PI) / 180;
  const ex = sx + side * Math.sin(r1) * l1;
  const ey = sy + Math.cos(r1) * l1;
  const hx = ex + side * Math.sin(r2) * l2;
  const hy = ey + Math.cos(r2) * l2;
  return {ex, ey, hx, hy};
};

const Owner: React.FC<{f: number; kind: Kind}> = ({f, kind}) => {
  const L = LOOKS[kind];
  const T = TIMES[kind];
  const s = L.h / 250;
  const x = DISTRICT[kind] - 118;
  const y = GROUND + 44;
  const talk = mouthAt(kind, f);
  const worry = envelope(f, T.worry[0], T.worry[0] + 10, T.worry[1] - 6, T.worry[1] + 8);
  const amazed = envelope(f, T.hit, T.hit + 8, T.hit + 50, T.hit + 70);
  const happy = clamp(invLerp(T.hit, T.hit + 20, f));
  const cheerT = f - T.cheer;
  const cheer = cheerT > 0 && cheerT < 60 ? Math.sin((Math.PI * cheerT) / 60) : 0;
  const jump = cheerT > 0 && cheerT < 60 ? 38 * Math.abs(Math.sin((Math.PI * cheerT) / 30)) * (1 - cheerT / 60) : 0;
  const thanks = envelope(f, T.thanks[0], T.thanks[0] + 8, T.thanks[1] - 10, T.thanks[1]);
  const shake = worry * 2.5 * Math.sin(f * 1.7);
  const breathe = 2 * Math.sin(f * 0.08 + x);
  const bob = talk * 3;
  // arm poses: [left upper, left bend, right upper, right bend]
  let pose = [10, 5, 10, 5];
  const blend = (p: number[], w: number) => (pose = pose.map((v, i) => lerp(v, p[i], w)));
  blend([150, 85, 150, 85], worry * (1 - 0.6 * talk)); // hands to head
  blend([150, 85, 70, -40], worry * talk); // one hand on head, one out (explaining)
  blend([120, 20, 120, 20], amazed * (1 - worry));
  blend([165, 10, 165, 10], cheer);
  if (thanks > 0) {
    const wave = 20 * Math.sin((f - T.thanks[0]) * 0.5);
    blend([15, 5, 150 + wave, 30], thanks);
  }
  const sh = {y: -190 * s};
  const lA = arm(-40 * s, sh.y, -1, pose[0], pose[1], 58 * s, 52 * s);
  const rA = arm(40 * s, sh.y, 1, pose[2], pose[3], 58 * s, 52 * s);
  const armW = (kind === 'gym' ? 22 : 16) * s;
  const lookX = worry > 0.5 ? -4 : thanks > 0.3 ? 5 : talk > 0.1 ? 0 : 2;
  const headY = -248 * s;
  const mouthOpen = 3 + 14 * talk;
  const smile = happy * (1 - talk) > 0.3;
  const skinShade = rgba('#000000', 0.12);
  return (
    <g transform={`translate(${x + shake}, ${y - jump + breathe * 0.3})`}>
      <ellipse cx={0} cy={4 + jump} rx={70 * s} ry={10} fill="rgba(0,0,0,0.25)" />
      {/* legs + shoes */}
      <rect x={-30 * s} y={-100 * s} width={26 * s} height={96 * s} rx={10} fill={L.legs} />
      <rect x={4 * s} y={-100 * s} width={26 * s} height={96 * s} rx={10} fill={L.legs} />
      <ellipse cx={-17 * s} cy={-2} rx={20 * s} ry={9 * s} fill={L.shoe} />
      <ellipse cx={17 * s} cy={-2} rx={20 * s} ry={9 * s} fill={L.shoe} />
      {/* arms behind the coat for the doctor */}
      {[lA, rA].map((a, i) => (
        <g key={i}>
          <line x1={(i ? 40 : -40) * s} y1={sh.y} x2={a.ex} y2={a.ey} stroke={kind === 'clinic' ? '#FFFFFF' : kind === 'gym' ? L.skin : L.top} strokeWidth={armW} strokeLinecap="round" />
          <line x1={a.ex} y1={a.ey} x2={a.hx} y2={a.hy} stroke={L.skin} strokeWidth={armW * 0.9} strokeLinecap="round" />
          <circle cx={a.hx} cy={a.hy} r={armW * 0.62} fill={L.skin} />
        </g>
      ))}
      {/* torso */}
      {kind === 'salon' ? (
        <g>
          <path d={`M${-44 * s},${-200 * s} L${44 * s},${-200 * s} L${52 * s},${-92 * s} L${-52 * s},${-92 * s} Z`} fill={L.top} />
          <path d={`M${-30 * s},${-170 * s} L${30 * s},${-170 * s} L${38 * s},${-96 * s} L${-38 * s},${-96 * s} Z`} fill="#FFB3D6" />
          <rect x={-10 * s} y={-150 * s} width={20 * s} height={14 * s} rx={4} fill="#FF4F9A" />
        </g>
      ) : kind === 'gym' ? (
        <g>
          <path d={`M${-50 * s},${-202 * s} L${50 * s},${-202 * s} L${40 * s},${-96 * s} L${-40 * s},${-96 * s} Z`} fill={L.top} />
          <rect x={-40 * s} y={-110 * s} width={80 * s} height={18 * s} rx={6} fill="#23305E" />
          <path d={`M${-18 * s},${-202 * s} Q0,${-178 * s} ${18 * s},${-202 * s}`} fill={L.skin} />
        </g>
      ) : (
        <g>
          <path d={`M${-42 * s},${-200 * s} L${42 * s},${-200 * s} L${40 * s},${-110 * s} L${-40 * s},${-110 * s} Z`} fill={L.top} />
          <path d={`M${-50 * s},${-202 * s} L${-14 * s},${-202 * s} L${-6 * s},${-60 * s} L${-56 * s},${-60 * s} Z`} fill="#FFFFFF" />
          <path d={`M${50 * s},${-202 * s} L${14 * s},${-202 * s} L${6 * s},${-60 * s} L${56 * s},${-60 * s} Z`} fill="#FFFFFF" />
          <path d={`M${-16 * s},${-200 * s} Q0,${-150 * s} ${16 * s},${-200 * s}`} fill="none" stroke="#7C7C94" strokeWidth={5} />
          <circle cx={16 * s} cy={-162 * s} r={8 * s} fill="#9A9AB4" />
          <rect x={20 * s} y={-150 * s} width={20 * s} height={6 * s} rx={2} fill="#10B7A6" />
        </g>
      )}
      {/* neck + head */}
      <rect x={-12 * s} y={-222 * s} width={24 * s} height={26 * s} fill={L.skin} />
      <g transform={`translate(0, ${bob}) rotate(${talk * 3 * Math.sin(f * 0.4) + (thanks > 0.3 ? 6 : 0)}, 0, ${-230 * s})`}>
        {kind === 'salon' ? <circle cx={0} cy={headY - 50 * s} r={30 * s} fill={L.hair} /> : null}
        {kind === 'clinic' ? <path d={`M${-44 * s},${headY + 10 * s} Q${-50 * s},${headY - 50 * s} 0,${headY - 46 * s} Q${50 * s},${headY - 50 * s} ${44 * s},${headY + 10 * s} Z`} fill={L.hair} /> : null}
        <circle cx={0} cy={headY} r={40 * s} fill={L.skin} />
        <ellipse cx={-38 * s} cy={headY + 4 * s} rx={7 * s} ry={10 * s} fill={L.skin} />
        <ellipse cx={38 * s} cy={headY + 4 * s} rx={7 * s} ry={10 * s} fill={L.skin} />
        {kind === 'salon' ? <path d={`M${-40 * s},${headY - 4 * s} Q${-30 * s},${headY - 50 * s} ${10 * s},${headY - 44 * s} Q${40 * s},${headY - 40 * s} ${40 * s},${headY - 6 * s} Q${10 * s},${headY - 26 * s} ${-40 * s},${headY - 4 * s} Z`} fill={L.hair} /> : null}
        {kind === 'gym' ? (
          <g>
            <path d={`M${-40 * s},${headY - 8 * s} Q0,${headY - 56 * s} ${40 * s},${headY - 8 * s} Z`} fill={L.hair} />
            <rect x={-42 * s} y={headY - 22 * s} width={84 * s} height={12 * s} rx={5} fill="#FF7A2F" />
            <path d={`M${-30 * s},${headY + 18 * s} Q0,${headY + 52 * s} ${30 * s},${headY + 18 * s}`} fill="none" stroke={L.hair} strokeWidth={8 * s} />
          </g>
        ) : null}
        {/* eyes, brows */}
        {[-14, 14].map((ex) => (
          <g key={ex}>
            <ellipse cx={ex * s} cy={headY - 2 * s} rx={7 * s} ry={(worry > 0.3 || amazed > 0.3 ? 10 : 8) * s} fill="#FFFFFF" />
            <circle cx={(ex + lookX * 0.6) * s} cy={headY} r={4 * s} fill="#1A1024" />
            <line
              x1={(ex - 9) * s}
              y1={headY - 14 * s + (worry > 0.3 ? (ex < 0 ? 4 : -4) : 0) * s}
              x2={(ex + 9) * s}
              y2={headY - 14 * s + (worry > 0.3 ? (ex < 0 ? -4 : 4) : 0) * s}
              stroke="#1A1024"
              strokeWidth={3 * s}
              strokeLinecap="round"
            />
          </g>
        ))}
        {kind === 'clinic' ? (
          <g fill="none" stroke="#3A3350" strokeWidth={3}>
            <circle cx={-14 * s} cy={headY - 2 * s} r={11 * s} />
            <circle cx={14 * s} cy={headY - 2 * s} r={11 * s} />
            <line x1={-3 * s} y1={headY - 2 * s} x2={3 * s} y2={headY - 2 * s} />
          </g>
        ) : null}
        {/* mouth: lip-sync while talking, smile when happy, wobbly when worried */}
        {talk > 0.05 ? (
          <ellipse cx={0} cy={headY + 20 * s} rx={(9 + 3 * talk) * s} ry={mouthOpen * 0.6 * s} fill="#5A1E2E" />
        ) : smile ? (
          <path d={`M${-13 * s},${headY + 16 * s} Q0,${headY + 30 * s} ${13 * s},${headY + 16 * s}`} fill="#5A1E2E" />
        ) : worry > 0.3 ? (
          <path d={`M${-10 * s},${headY + 22 * s} q5,-4 10,0 q5,4 10,0`} fill="none" stroke="#5A1E2E" strokeWidth={3} />
        ) : (
          <path d={`M${-9 * s},${headY + 20 * s} Q0,${headY + 25 * s} ${9 * s},${headY + 20 * s}`} fill="none" stroke="#5A1E2E" strokeWidth={3} />
        )}
        <circle cx={-24 * s} cy={headY + 12 * s} r={6 * s} fill={rgba('#FF6B8B', 0.35)} />
        <circle cx={24 * s} cy={headY + 12 * s} r={6 * s} fill={rgba('#FF6B8B', 0.35)} />
        <ellipse cx={0} cy={headY + 8 * s} rx={4 * s} ry={3 * s} fill={skinShade} />
      </g>
      {/* props and mood marks */}
      {kind === 'salon' ? (
        <g transform={`translate(${rA.hx}, ${rA.hy}) rotate(${20 + 30 * Math.sin(f * 0.6) * talk})`} stroke="#8A8AA8" strokeWidth={4} fill="none">
          <circle cx={-6} cy={8} r={5} />
          <circle cx={6} cy={8} r={5} />
          <line x1={-3} y1={4} x2={8} y2={-16} />
          <line x1={3} y1={4} x2={-8} y2={-16} />
        </g>
      ) : null}
      {worry > 0.3
        ? [0, 1].map((k) => {
            const ph = ((f * 0.04 + k * 0.5) % 1 + 1) % 1;
            return <path key={k} d={`M${(48 + k * 12) * s},${headY - 20 * s + ph * 40} q6,10 0,16 q-6,-6 0,-16`} fill="#8FD3FF" opacity={Math.sin(Math.PI * ph) * worry} />;
          })
        : null}
      {cheer > 0.2
        ? [0, 1, 2].map((k) => {
            const a = -Math.PI / 2 + (k - 1) * 0.6;
            const d = 70 + 30 * cheer;
            const hx = Math.cos(a) * d;
            const hy = headY + Math.sin(a) * d;
            return <path key={k} d={`M${hx},${hy + 8} C${hx - 16},${hy - 6} ${hx - 6},${hy - 18} ${hx},${hy - 8} C${hx + 6},${hy - 18} ${hx + 16},${hy - 6} ${hx},${hy + 8} Z`} fill="#FF4F9A" opacity={cheer} />;
          })
        : null}
    </g>
  );
};

export const Owners: React.FC<{f: number}> = ({f}) => {
  const vis = visibleX(f, 1, 300);
  if (f >= C.swap) return null;
  return (
    <Layer f={f} p={1}>
      {(['salon', 'gym', 'clinic'] as const)
        .filter((k) => DISTRICT[k] > vis.x0 && DISTRICT[k] < vis.x1)
        .map((k) => (
          <Owner key={k} f={f} kind={k} />
        ))}
    </Layer>
  );
};

