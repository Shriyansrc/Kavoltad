// Contact moments that make Kavey the cause of each change: the catch at
// frame 18 and the connection his hand starts at frame 150.
import React from 'react';
import {PALETTE, rgba} from '../config/palette.ts';
import {K} from '../config/timeline.ts';
import {HEIGHT, WIDTH} from '../config/video.ts';
import {clamp, ease, invLerp, rad} from '../lib/anim.ts';
import {anchorAt} from '../scenes/kavey.ts';
import {cardGeo} from '../scenes/model.ts';

const rightPort = (f: number) => {
  const g = cardGeo(0, f);
  const r = rad(g.rot);
  return {x: g.cx + Math.cos(r) * (g.w / 2), y: g.cy + Math.sin(r) * (g.w / 2)};
};

export const Interactions: React.FC<{f: number}> = ({f}) => {
  const els: React.ReactNode[] = [];

  // Catch: a tight contact flash where hand meets panel (frames 18–30).
  const c = invLerp(K.slipEnd, K.slipEnd + 12, f);
  if (f >= K.slipEnd && c < 1) {
    const h = anchorAt(f, 'handLeft');
    els.push(
      <g key="catch" opacity={1 - ease.cubicIn(c)}>
        <circle cx={h.x} cy={h.y} r={10 + 30 * ease.cubicOut(c)} fill="none" stroke={rgba(PALETTE.magenta, 0.8)} strokeWidth={2} />
        <circle cx={h.x} cy={h.y} r={24} fill={`url(#contactGlow)`} />
      </g>,
    );
  }
  // Holding: a faint tether shows he is steadying the booking panel (18–150).
  if (f >= K.slipEnd && f < K.connect + 8) {
    const h = anchorAt(f, 'handLeft');
    const p = rightPort(f);
    const a = clamp(invLerp(K.slipEnd, K.slipEnd + 6, f)) * (1 - invLerp(K.connect, K.connect + 8, f));
    els.push(<line key="hold" x1={h.x} y1={h.y} x2={p.x} y2={p.y} stroke={rgba(PALETTE.magenta, 0.28 * a)} strokeWidth={2} strokeDasharray="3 7" />);
  }
  // Connect: the gesture fires a magenta line from hand to the booking port.
  if (f >= K.connect - 2 && f < K.kaveyGlideEnd + 6) {
    const h = anchorAt(f, 'handLeft');
    const p = rightPort(f);
    const draw = ease.cubicOut(invLerp(K.connect - 2, K.connect + 6, f));
    const fade = 1 - ease.cubicIn(invLerp(K.kaveyGlideStart + 10, K.kaveyGlideEnd + 6, f));
    const x2 = h.x + (p.x - h.x) * draw;
    const y2 = h.y + (p.y - h.y) * draw;
    els.push(
      <g key="connect" opacity={fade}>
        <line x1={h.x} y1={h.y} x2={x2} y2={y2} stroke={rgba(PALETTE.magenta, 0.35)} strokeWidth={10} />
        <line x1={h.x} y1={h.y} x2={x2} y2={y2} stroke={PALETTE.magenta} strokeWidth={2.5} />
        <circle cx={h.x} cy={h.y} r={16} fill={`url(#contactGlow)`} />
        {draw >= 1 ? <rect x={p.x - 5} y={p.y - 5} width={10} height={10} fill={PALETTE.magenta} /> : null}
      </g>,
    );
  }
  if (!els.length) return null;
  return (
    <svg width={WIDTH} height={HEIGHT} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <defs>
        <radialGradient id="contactGlow">
          <stop offset="0%" stopColor={rgba(PALETTE.magenta, 0.6)} />
          <stop offset="100%" stopColor={rgba(PALETTE.magenta, 0)} />
        </radialGradient>
      </defs>
      {els}
    </svg>
  );
};
