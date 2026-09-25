// One of the three persistent objects. Its geometry comes from the stage
// model; its face changes as the story moves (panel → row → brief → node →
// phone → live). Fast moves leave a short motion trail.
import React from 'react';
import {COPY} from '../config/copy.ts';
import {PALETTE, rgba} from '../config/palette.ts';
import {K} from '../config/timeline.ts';
import {FONT_MONO, FONT_SANS} from '../config/type.ts';
import {bump, clamp, ease} from '../lib/anim.ts';
import {cardFaces, cardGeo, cardSpeed, nodeActive, nodeCheck, nodeHit, nodeSweep, scopeCheck, type Geo} from '../scenes/stage.ts';
import {Check, IconBell, IconCalendar, IconCard, IconChat} from './icons.tsx';

const CHAOS_ICONS = [IconCalendar, IconCard, IconBell];
const NODE_ICONS = [IconCalendar, IconCard, IconChat];

const mono = (size: number, spacing = '0.06em'): React.CSSProperties => ({fontFamily: FONT_MONO, fontWeight: 500, letterSpacing: spacing, fontSize: size});

const Face: React.FC<{i: number; f: number; w: number; h: number}> = ({i, f, w, h}) => {
  const faces = cardFaces(i, f);
  const alertAt = [0, K.paymentShift, K.reminderShift][i];
  const alert = f < 150 ? bump(f, alertAt + 6, 14) + 0.35 * (0.5 + 0.5 * Math.sin(f / 5 + i * 2)) : 0;
  const Icon = CHAOS_ICONS[i];
  const NIcon = NODE_ICONS[i];
  const node = COPY.ui.nodes[i];
  const roll = (a: number) => (1 - a) * 12;
  const sweep = f >= 420 && f < 600 ? nodeSweep(i, f) : 0;
  const check = f >= 420 ? clamp(nodeCheck(f), 0, 1.3) : 0;
  const sc = scopeCheck(i, f);
  const act = nodeActive(i, f);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <line x1={2} y1={3} x2={w - 2} y2={3} stroke="rgba(255,255,255,0.07)" strokeWidth={2} />
      {sweep > 0 && sweep < 1 ? <rect x={-80 + (w + 80) * ease.cubicInOut(sweep)} y={2} width={80} height={h - 4} fill={rgba(PALETTE.magenta, 0.22 * (1 - sweep * 0.5))} /> : null}

      {faces.chaos > 0.001 ? (
        <g opacity={faces.chaos}>
          <Icon x={20} y={18} s={28} color={PALETTE.magenta} />
          <text x={62} y={40} fill={PALETTE.white} style={mono(22)}>
            {COPY.ui.chaosPanels[i]}
          </text>
          <circle cx={w - 28} cy={30} r={7 + 2 * alert} fill={rgba(PALETTE.magenta, 0.35 + 0.65 * clamp(alert))} />
          <rect x={20} y={h - 56} width={Math.min(190, w * 0.52)} height={11} fill="rgba(255,255,255,0.13)" />
          <rect x={w - 20 - Math.min(128, w * 0.34)} y={h - 34} width={Math.min(128, w * 0.34)} height={11} fill={rgba(PALETTE.magenta, 0.3)} />
        </g>
      ) : null}

      {faces.brief > 0.001 ? (
        <g opacity={faces.brief} transform={`translate(${roll(faces.brief)} 0)`}>
          <g transform={`translate(${22 + 13} ${h / 2}) scale(${0.6 + 0.4 * clamp(sc, 0, 1.2)})`}>
            <rect x={-13} y={-13} width={26} height={26} fill={rgba(PALETTE.magenta, 0.95 * clamp(sc))} stroke={rgba(PALETTE.magenta, 0.8)} strokeWidth={2} />
            <Check x={-13} y={-13} s={26} color={PALETTE.white} progress={clamp(sc)} sw={3} />
          </g>
          <text x={66} y={h / 2 + 9} fill={PALETTE.white} style={mono(25)}>
            {COPY.ui.briefRows[i]}
          </text>
          <rect x={w - 96} y={h / 2 - 5} width={72} height={10} fill="rgba(255,255,255,0.1)" />
        </g>
      ) : null}

      {faces.node > 0.001 ? (
        <g opacity={faces.node} transform={`translate(0 ${roll(faces.node)})`}>
          <rect x={18} y={h / 2 - 32} width={64} height={64} fill={rgba(PALETTE.magenta, 0.08 + 0.2 * act)} stroke={rgba(PALETTE.magenta, 0.35 + 0.55 * act)} strokeWidth={2} />
          <NIcon x={34} y={h / 2 - 16} s={32} color={act > 0.5 ? PALETTE.white : PALETTE.text72} />
          <text x={100} y={node.sub ? h / 2 - 4 : h / 2 + 11} fill={PALETTE.white} style={{fontFamily: FONT_SANS, fontWeight: 700, fontSize: 31, letterSpacing: '-0.01em'}}>
            {node.title}
          </text>
          {node.sub ? (
            <text x={101} y={h / 2 + 28} fill={PALETTE.text72} style={mono(19)}>
              {node.sub}
            </text>
          ) : null}
          {check > 0.001 ? (
            <g transform={`translate(${w - 35} ${h / 2}) scale(${check})`}>
              <rect x={-16} y={-16} width={32} height={32} fill={PALETTE.magenta} />
              <Check x={-16} y={-16} s={32} color={PALETTE.white} progress={clamp(check)} sw={3.5} />
            </g>
          ) : null}
        </g>
      ) : null}

      {faces.phone > 0.001 ? (
        <g opacity={faces.phone}>
          <NIcon x={14} y={h / 2 - 12} s={24} color={PALETTE.white} />
          <text x={50} y={node.sub ? h / 2 - 3 : h / 2 + 7} fill={PALETTE.white} style={{fontFamily: FONT_SANS, fontWeight: 700, fontSize: 20}}>
            {node.title}
          </text>
          {node.sub ? (
            <text x={50} y={h / 2 + 17} fill={PALETTE.text72} style={mono(13)}>
              {node.sub}
            </text>
          ) : null}
          <rect x={w - 30} y={h / 2 - 8} width={16} height={16} fill={PALETTE.magenta} />
          <Check x={w - 30} y={h / 2 - 8} s={16} color={PALETTE.white} progress={1} sw={2} />
        </g>
      ) : null}

      {faces.live > 0.001 ? (
        <g opacity={faces.live}>
          <rect x={18} y={h / 2 - 26} width={52} height={52} fill={rgba(PALETTE.magenta, 0.12)} stroke={rgba(PALETTE.magenta, 0.6)} strokeWidth={2} />
          <NIcon x={31} y={h / 2 - 13} s={26} color={PALETTE.white} />
          <text x={88} y={node.sub ? h / 2 - 3 : h / 2 + 10} fill={PALETTE.white} style={{fontFamily: FONT_SANS, fontWeight: 700, fontSize: 28}}>
            {node.title}
          </text>
          {node.sub ? (
            <text x={89} y={h / 2 + 24} fill={PALETTE.text72} style={mono(17)}>
              {node.sub}
            </text>
          ) : null}
          <circle cx={w - 30} cy={h / 2} r={6} fill={PALETTE.cyan} opacity={0.4 + 0.6 * (0.5 + 0.5 * Math.sin((f - K.live) / 6 + i))} />
        </g>
      ) : null}
    </svg>
  );
};

const Body: React.FC<{i: number; f: number; g: Geo; ghost?: number}> = ({i, f, g, ghost}) => {
  const hit = f >= 420 && f < 600 ? nodeHit(i, f) : 0;
  const act = f >= 420 && f < 600 ? nodeActive(i, f) : 0;
  const pop = 1 + 0.06 * hit;
  const settleGlow = f < 300 ? bump(f, 172 + i * 5, 16) : 0;
  const glow = clamp(Math.max(act * 0.6, settleGlow, hit, f >= 734 ? 0.35 : 0));
  return (
    <div
      style={{
        position: 'absolute',
        left: g.cx - g.w / 2,
        top: g.cy - g.h / 2,
        width: g.w,
        height: g.h,
        transform: `perspective(900px) rotateX(${g.rx}deg) rotateY(${g.ry}deg) rotate(${g.rot}deg) scale(${g.scale * pop})`,
        opacity: g.opacity * (ghost ?? 1),
        background: `linear-gradient(160deg, #1D1D2A 0%, ${PALETTE.surface} 60%)`,
        boxShadow: ghost ? undefined : `0 26px 50px rgba(0,0,0,0.55), 0 0 ${20 + 30 * glow}px ${rgba(PALETTE.magenta, 0.12 + 0.35 * glow)}`,
        borderRadius: 2,
        outline: `2px solid ${rgba(PALETTE.magenta, 0.3 + 0.55 * glow)}`,
        outlineOffset: -2,
        overflow: 'hidden',
      }}
    >
      {ghost ? null : <Face i={i} f={f} w={g.w} h={g.h} />}
    </div>
  );
};

export const Card: React.FC<{i: number; f: number}> = ({i, f}) => {
  const g = cardGeo(i, f);
  if (g.opacity <= 0.002) return null;
  const speed = cardSpeed(i, f);
  const trail = speed > 9 ? clamp((speed - 9) / 25) : 0;
  return (
    <>
      {trail > 0
        ? [3, 2, 1].map((k) => <Body key={k} i={i} f={f - k * 0.8} g={cardGeo(i, f - k * 0.8)} ghost={0.16 * trail * (1 - k / 4)} />)
        : null}
      <Body i={i} f={f} g={g} />
    </>
  );
};
