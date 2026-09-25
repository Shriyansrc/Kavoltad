// Day 7 handoff: code and keys, drawn as outlines. No credentials shown.
import React from 'react';
import {COPY} from '../config/copy.ts';
import {PALETTE, rgba} from '../config/palette.ts';
import {FONT_MONO} from '../config/type.ts';
import {tileGeo} from '../scenes/model.ts';
import {IconCode, IconKey} from './icons.tsx';

export const HandoffTile: React.FC<{f: number}> = ({f}) => {
  if (f < 744 || f > 852) return null;
  const g = tileGeo(f);
  const lift = (g.scale - 0.84) / 0.16; // 0..1 as it comes forward
  const label: React.CSSProperties = {fontFamily: FONT_MONO, fontWeight: 500, fontSize: 24, letterSpacing: '0.08em'};
  return (
    <div
      style={{
        position: 'absolute',
        left: g.cx - g.w / 2,
        top: g.cy - g.h / 2,
        width: g.w,
        height: g.h,
        opacity: g.opacity,
        transform: `scale(${g.scale})`,
        background: `linear-gradient(180deg, #1B1B28 0%, ${PALETTE.surface} 100%)`,
        outline: `2px solid ${rgba(PALETTE.magenta, 0.75)}`,
        outlineOffset: -2,
        borderRadius: 2,
        boxShadow: `0 ${18 + 22 * lift}px ${40 + 30 * lift}px rgba(0,0,0,0.6), 0 0 ${26 * lift}px ${rgba(PALETTE.magenta, 0.28)}`,
      }}
    >
      <svg width={g.w} height={g.h} viewBox={`0 0 ${g.w} ${g.h}`} style={{position: 'absolute', inset: 0}}>
        <line x1={g.w / 2} y1={18} x2={g.w / 2} y2={g.h - 18} stroke="rgba(255,255,255,0.14)" strokeWidth={2} />
        <IconCode x={g.w / 4 - 22} y={16} s={44} color={PALETTE.white} />
        <IconKey x={(3 * g.w) / 4 - 22} y={16} s={44} color={PALETTE.white} />
        <text x={g.w / 4} y={g.h - 22} textAnchor="middle" fill={PALETTE.white} style={label}>
          {COPY.ui.code}
        </text>
        <text x={(3 * g.w) / 4} y={g.h - 22} textAnchor="middle" fill={PALETTE.white} style={label}>
          {COPY.ui.keys}
        </text>
      </svg>
    </div>
  );
};
