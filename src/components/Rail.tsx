// Process rail below the demonstration area: Day 1 → Days 2–5 → Day 6 → Day 7.
import React from 'react';
import {LAYOUT} from '../config/layout.ts';
import {PALETTE, rgba} from '../config/palette.ts';
import {ease} from '../lib/anim.ts';
import {railState} from '../scenes/model.ts';

export const Rail: React.FC<{f: number}> = ({f}) => {
  const s = railState(f);
  if (s.appear <= 0 || s.fade <= 0) return null;
  const {x0, x1, y} = LAYOUT.rail;
  const xs = [0, 1, 2, 3].map((n) => x0 + ((x1 - x0) * n) / 3);
  const drawn = ease.cubicInOut(s.appear);
  const fillTo = x0 + ((x1 - x0) * s.progress) / 3;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}} opacity={s.fade}>
      <line x1={x0} y1={y} x2={x0 + (x1 - x0) * drawn} y2={y} stroke="rgba(255,255,255,0.14)" strokeWidth={2} />
      {s.progress > 0 ? <line x1={x0} y1={y} x2={fillTo} y2={y} stroke={rgba(PALETTE.magenta, 0.8)} strokeWidth={2} /> : null}
      {xs.map((x, n) => {
        const vis = Math.min(1, Math.max(0, (drawn * 3 - n) * 1.5 + 0.2));
        const lit = s.lit[n];
        return (
          <g key={n} opacity={vis}>
            <rect x={x - 7} y={y - 7} width={14} height={14} fill={lit > 0 ? rgba(PALETTE.magenta, lit) : PALETTE.background} stroke={lit > 0.5 ? PALETTE.magenta : 'rgba(255,255,255,0.35)'} strokeWidth={2} />
            {lit > 0 ? <rect x={x - 13} y={y - 13} width={26} height={26} fill="none" stroke={rgba(PALETTE.magenta, 0.35 * lit)} strokeWidth={1.5} /> : null}
          </g>
        );
      })}
    </svg>
  );
};
