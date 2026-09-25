// Connector stubs that fail to meet in the chaos, join at 2.5 s and carry
// the build pulse. Endpoints are derived from the cards' live geometry.
import React from 'react';
import {PALETTE, rgba} from '../config/palette.ts';
import {K} from '../config/timeline.ts';
import {clamp, invLerp, lerp, rad} from '../lib/anim.ts';
import {cardGeo, connectorEnergy, joined, pulse, type Geo} from '../scenes/model.ts';

const port = (g: Geo, side: 'top' | 'bottom') => {
  const s = side === 'top' ? -1 : 1;
  const r = rad(g.rot);
  const dx = -Math.sin(r) * (g.h / 2) * s * g.scale;
  const dy = Math.cos(r) * (g.h / 2) * s * g.scale;
  return {x: g.cx + dx, y: g.cy + dy, nx: (-Math.sin(r) * s), ny: Math.cos(r) * s};
};

export const Connectors: React.FC<{f: number}> = ({f}) => {
  if (f >= 852) return null;
  const geos = [0, 1, 2].map((i) => cardGeo(i, f));
  const fade = 1 - invLerp(836, 850, f);
  const lines: React.ReactNode[] = [];

  for (let pair = 0; pair < 2; pair++) {
    const a = port(geos[pair], 'bottom');
    const b = port(geos[pair + 1], 'top');
    const j = joined(pair, f);
    const stub = 18;
    const mid = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
    const ea = {x: lerp(a.x + a.nx * stub, mid.x, j), y: lerp(a.y + a.ny * stub, mid.y, j)};
    const eb = {x: lerp(b.x + b.nx * stub, mid.x, j), y: lerp(b.y + b.ny * stub, mid.y, j)};
    const e = connectorEnergy(pair, f);
    const base = rgba(PALETTE.magenta, (0.3 + 0.55 * e) * fade);
    const glow = rgba(PALETTE.magenta, 0.28 * e * fade);
    const dash = f * 1.6;
    lines.push(
      <g key={pair}>
        <line x1={a.x} y1={a.y} x2={ea.x} y2={ea.y} stroke={glow} strokeWidth={9} />
        <line x1={b.x} y1={b.y} x2={eb.x} y2={eb.y} stroke={glow} strokeWidth={9} />
        <line x1={a.x} y1={a.y} x2={ea.x} y2={ea.y} stroke={base} strokeWidth={2} />
        <line x1={b.x} y1={b.y} x2={eb.x} y2={eb.y} stroke={base} strokeWidth={2} />
        {e > 0.05 && j > 0.99 ? (
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rgba('#FFFFFF', 0.55 * e * fade)} strokeWidth={2} strokeDasharray="4 14" strokeDashoffset={-dash} />
        ) : null}
        {/* open port ends while disconnected */}
        {j < 0.98 ? (
          <>
            <rect x={ea.x - 4} y={ea.y - 4} width={8} height={8} fill={PALETTE.background} stroke={base} strokeWidth={2} opacity={1 - j} />
            <rect x={eb.x - 4} y={eb.y - 4} width={8} height={8} fill={PALETTE.background} stroke={base} strokeWidth={2} opacity={1 - j} />
          </>
        ) : null}
      </g>,
    );
  }

  // Build input line from the top of the build region into the booking node.
  const buildIn = clamp(invLerp(420, 436, f)) * (1 - invLerp(598, 612, f));
  const p = pulse(f);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      {buildIn > 0 ? (
        <g opacity={buildIn}>
          <line x1={365} y1={612} x2={365} y2={geos[0].cy - geos[0].h / 2} stroke={rgba(PALETTE.magenta, 0.35)} strokeWidth={2} />
          <rect x={361} y={608} width={8} height={8} fill={PALETTE.background} stroke={rgba(PALETTE.magenta, 0.6)} strokeWidth={2} />
        </g>
      ) : null}
      {lines}
      {p.visible ? (
        <g>
          {[5, 10, 15].map((lag, n) => {
            const q = pulse(f - lag * 0.35);
            return q.visible ? <rect key={n} x={q.x - 3} y={q.y - 3} width={6} height={6} fill={rgba(PALETTE.magenta, 0.35 - n * 0.1)} /> : null;
          })}
          <circle cx={p.x} cy={p.y} r={22} fill="url(#pulseGlow)" />
          <rect x={p.x - 6} y={p.y - 6} width={12} height={12} fill={PALETTE.magenta} transform={`rotate(45 ${p.x} ${p.y})`} />
          <rect x={p.x - 2.5} y={p.y - 2.5} width={5} height={5} fill="#FFFFFF" transform={`rotate(45 ${p.x} ${p.y})`} />
        </g>
      ) : null}
      <defs>
        <radialGradient id="pulseGlow">
          <stop offset="0%" stopColor={rgba(PALETTE.magenta, 0.55)} />
          <stop offset="100%" stopColor={rgba(PALETTE.magenta, 0)} />
        </radialGradient>
      </defs>
      {/* entry flash where the pulse lands on each node */}
      {[K.pulseIn, K.pulsePayment, K.pulseReminder].map((at, i) => {
        const t = invLerp(at, at + 14, f);
        if (t <= 0 || t >= 1) return null;
        const g = geos[i];
        return (
          <rect
            key={at}
            x={g.cx - g.w / 2 - 6 * t}
            y={g.cy - g.h / 2 - 6 * t}
            width={g.w + 12 * t}
            height={g.h + 12 * t}
            fill="none"
            stroke={rgba(PALETTE.magenta, 0.7 * (1 - t))}
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
};
