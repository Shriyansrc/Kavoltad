// One of the three persistent objects. Its geometry comes from the scene model;
// its face changes as the story moves (panel → row → node → phone → live).
import React from 'react';
import {COPY} from '../config/copy.ts';
import {PALETTE, rgba} from '../config/palette.ts';
import {FONT_MONO, FONT_SANS} from '../config/type.ts';
import {K} from '../config/timeline.ts';
import {bump, clamp, ease, invLerp} from '../lib/anim.ts';
import {nodeActive, nodeCheck, nodeSweep, scopeCheck, type Geo} from '../scenes/model.ts';
import {Check, IconBell, IconCalendar, IconCard, IconChat} from './icons.tsx';

const CHAOS_ICONS = [IconCalendar, IconCard, IconBell];
const NODE_ICONS = [IconCalendar, IconCard, IconChat];

const monoLabel = (size: number): React.CSSProperties => ({
  fontFamily: FONT_MONO,
  fontWeight: 500,
  letterSpacing: '0.06em',
  fontSize: size,
});

/** Enter (0→1) and exit (1→0) roll for a face that is visible between two frames. */
const faceAlpha = (f: number, enter: number, exit: number | null) => {
  const a = ease.cubicOut(invLerp(enter, enter + 8, f));
  const b = exit === null ? 1 : 1 - ease.cubicIn(invLerp(exit - 6, exit, f));
  return clamp(Math.min(a, b));
};

export const Card: React.FC<{i: number; f: number; geo: Geo}> = ({i, f, geo}) => {
  const {w, h} = geo;

  // Border energy: alert blinks in the chaos, activation later.
  const alertAt = [0, K.paymentShift, K.reminderShift][i];
  const alert = f < 150 ? bump(f, alertAt + 6, 14) : 0;
  const connectWave = bump(f, 172 + i * 5, 16);
  const active =
    f < 300
      ? Math.max(alert * 0.9, connectWave, f >= 174 ? 0.35 : 0)
      : f < 420
        ? 0.2 + 0.5 * scopeCheck(i, f)
        : f < 600
          ? Math.max(0.1, nodeActive(i, f) * 0.85)
          : f < 720
            ? 0.55
            : 0.6;
  const borderA = 0.25 + 0.5 * clamp(active);

  const rollBrief = 306 + i * 4;
  const rollNode = 424 + i * 4;
  const chaosA = faceAlpha(f, -100, rollBrief);
  const briefA = f >= rollBrief - 6 ? faceAlpha(f, rollBrief, rollNode) : 0;
  const nodeA = f >= rollNode - 6 ? faceAlpha(f, rollNode, 606) : 0;
  const phoneA = f >= 600 ? faceAlpha(f, 606, 740) : 0;
  const liveA = f >= 734 ? faceAlpha(f, 740, null) : 0;
  const roll = (a: number) => (1 - a) * 10;

  const sweep = f >= 420 && f < 600 ? nodeSweep(i, f) : 0;
  const Icon = CHAOS_ICONS[i];
  const NIcon = NODE_ICONS[i];
  const node = COPY.ui.nodes[i];
  const checkP = f >= 420 ? nodeCheck(f) : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: geo.cx - w / 2,
        top: geo.cy - h / 2,
        width: w,
        height: h,
        transform: `rotate(${geo.rot}deg) scale(${geo.scale})`,
        opacity: geo.opacity,
        background: `linear-gradient(180deg, ${PALETTE.surfaceRaised} 0%, ${PALETTE.surface} 70%)`,
        boxShadow: `0 22px 44px rgba(0,0,0,0.5), 0 0 ${18 + 16 * active}px ${rgba(PALETTE.magenta, 0.1 + 0.22 * active)}`,
        borderRadius: 2,
        outline: `2px solid ${rgba(PALETTE.magenta, borderA)}`,
        outlineOffset: -2,
        overflow: 'hidden',
      }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {/* top inner highlight */}
        <line x1={2} y1={3} x2={w - 2} y2={3} stroke="rgba(255,255,255,0.06)" strokeWidth={2} />

        {/* processing sweep during the build */}
        {sweep > 0 && sweep < 1 ? (
          <rect x={-60 + (w + 60) * ease.cubicInOut(sweep)} y={2} width={60} height={h - 4} fill={rgba(PALETTE.magenta, 0.16 * (1 - sweep * 0.6))} />
        ) : null}

        {/* ---------- chaos panel / product row face ---------- */}
        {chaosA > 0.001 ? (
          <g opacity={chaosA} transform={`translate(0 ${-roll(chaosA) * (f > 200 ? 1 : 0)})`}>
            <Icon x={20} y={18} s={28} color={rgba(PALETTE.magenta, 0.9)} />
            <text x={62} y={40} fill={PALETTE.text72} style={monoLabel(22)}>
              {COPY.ui.chaosPanels[i]}
            </text>
            <rect x={w - 34} y={24} width={12} height={12} fill={rgba(PALETTE.magenta, 0.25 + 0.75 * alert)} />
            <rect x={20} y={h - 56} width={Math.min(190, w * 0.52)} height={11} fill="rgba(255,255,255,0.11)" />
            <rect x={w - 20 - Math.min(128, w * 0.34)} y={h - 34} width={Math.min(128, w * 0.34)} height={11} fill={rgba(PALETTE.magenta, 0.22)} />
          </g>
        ) : null}

        {/* ---------- brief row face ---------- */}
        {briefA > 0.001 ? (
          <g opacity={briefA} transform={`translate(${roll(briefA) * 1.2} 0)`}>
            <rect x={22} y={h / 2 - 13} width={26} height={26} fill={rgba(PALETTE.magenta, 0.9 * scopeCheck(i, f))} stroke={rgba(PALETTE.magenta, 0.8)} strokeWidth={2} />
            <Check x={22} y={h / 2 - 13} s={26} color={PALETTE.white} progress={scopeCheck(i, f)} sw={3} />
            <text x={66} y={h / 2 + 9} fill={PALETTE.white} style={monoLabel(25)}>
              {COPY.ui.briefRows[i]}
            </text>
            <rect x={w - 96} y={h / 2 - 5} width={72} height={10} fill="rgba(255,255,255,0.10)" />
          </g>
        ) : null}

        {/* ---------- build node face ---------- */}
        {nodeA > 0.001 ? (
          <g opacity={nodeA} transform={`translate(0 ${roll(nodeA)})`}>
            <rect x={18} y={h / 2 - 32} width={64} height={64} fill={rgba(PALETTE.magenta, 0.06 + 0.1 * nodeActive(i, f))} stroke={rgba(PALETTE.magenta, 0.35 + 0.4 * nodeActive(i, f))} strokeWidth={2} />
            <NIcon x={34} y={h / 2 - 16} s={32} color={nodeActive(i, f) > 0.5 ? PALETTE.white : PALETTE.text72} />
            <text x={100} y={node.sub ? h / 2 - 4 : h / 2 + 11} fill={PALETTE.white} style={{fontFamily: FONT_SANS, fontWeight: 700, fontSize: 31, letterSpacing: '-0.01em'}}>
              {node.title}
            </text>
            {node.sub ? (
              <text x={101} y={h / 2 + 28} fill={PALETTE.text72} style={monoLabel(19)}>
                {node.sub}
              </text>
            ) : null}
            {checkP > 0 ? (
              <g opacity={clamp(checkP * 2)}>
                <rect x={w - 50} y={h / 2 - 15} width={30} height={30} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={2} />
                <Check x={w - 50} y={h / 2 - 15} s={30} color={PALETTE.white} progress={checkP} sw={3} />
              </g>
            ) : null}
          </g>
        ) : null}

        {/* ---------- phone row face ---------- */}
        {phoneA > 0.001 ? (
          <g opacity={phoneA}>
            <NIcon x={14} y={h / 2 - 12} s={24} color={PALETTE.white} />
            <text x={50} y={node.sub ? h / 2 - 3 : h / 2 + 7} fill={PALETTE.white} style={{fontFamily: FONT_SANS, fontWeight: 700, fontSize: 20}}>
              {node.title}
            </text>
            {node.sub ? (
              <text x={50} y={h / 2 + 17} fill={PALETTE.text72} style={monoLabel(13)}>
                {node.sub}
              </text>
            ) : null}
            <rect x={w - 30} y={h / 2 - 8} width={16} height={16} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={2} />
            <Check x={w - 30} y={h / 2 - 8} s={16} color={PALETTE.white} progress={1} sw={2} />
          </g>
        ) : null}

        {/* ---------- live row face ---------- */}
        {liveA > 0.001 ? (
          <g opacity={liveA}>
            <rect x={18} y={h / 2 - 26} width={52} height={52} fill={rgba(PALETTE.magenta, 0.1)} stroke={rgba(PALETTE.magenta, 0.55)} strokeWidth={2} />
            <NIcon x={31} y={h / 2 - 13} s={26} color={PALETTE.white} />
            <text x={88} y={node.sub ? h / 2 - 3 : h / 2 + 10} fill={PALETTE.white} style={{fontFamily: FONT_SANS, fontWeight: 700, fontSize: 28}}>
              {node.title}
            </text>
            {node.sub ? (
              <text x={89} y={h / 2 + 24} fill={PALETTE.text72} style={monoLabel(17)}>
                {node.sub}
              </text>
            ) : null}
            <rect x={w - 34} y={h / 2 - 5} width={10} height={10} fill={PALETTE.cyan} opacity={0.35 + 0.65 * clamp(invLerp(K.live + 4 + i * 3, K.live + 10 + i * 3, f))} />
          </g>
        ) : null}
      </svg>
    </div>
  );
};

