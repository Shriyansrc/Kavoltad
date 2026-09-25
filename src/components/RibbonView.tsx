// Renders a RibbonShape: soft glow, magenta→violet edge, dark violet core
// and fine motion streaks. The core is opaque, so the impact comes from
// motion and contrast rather than a white flash.
import React from 'react';
import {PALETTE, rgba} from '../config/palette.ts';
import {HEIGHT, WIDTH} from '../config/video.ts';
import {clamp} from '../lib/anim.ts';
import {ribbonPath} from '../lib/ribbon.ts';
import {EDGE, GLOW, type RibbonShape} from '../scenes/ribbon.ts';

export const RibbonView: React.FC<{shape: RibbonShape | null; id: string; f: number; maskOnly?: boolean}> = ({shape, id, f, maskOnly}) => {
  if (!shape) return null;
  const {spine, half, opacity, coreMix, streak} = shape;
  const first = spine[0];
  const last = spine[spine.length - 1];
  const maxHalf = Math.max(...half);
  const edge = Math.min(EDGE, maxHalf * 0.45);
  const coreHalf = half.map((h) => Math.max(0, h - Math.min(EDGE, h * 0.45)));
  const outer = ribbonPath(spine, half);
  const core = ribbonPath(spine, coreHalf);
  const glow = ribbonPath(spine, half, GLOW);

  if (maskOnly) {
    return (
      <svg width={WIDTH} height={HEIGHT} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <path d={outer} fill="#FFFFFF" />
      </svg>
    );
  }

  // Streaks: offsets of the spine inside the core, flowing with the motion.
  const streaks: React.ReactNode[] = [];
  if (streak > 0.05 && coreMix > 0.3) {
    const lanes = [-0.72, -0.44, -0.18, 0.08, 0.31, 0.58, 0.8];
    lanes.forEach((lane, li) => {
      const pts = spine.map((p, i) => {
        const a = spine[Math.max(0, i - 1)];
        const b = spine[Math.min(spine.length - 1, i + 1)];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const nx = -(b.y - a.y) / len;
        const ny = (b.x - a.x) / len;
        const off = coreHalf[i] * lane;
        return `${(p.x + nx * off).toFixed(1)},${(p.y + ny * off).toFixed(1)}`;
      });
      const col = li % 3 === 1 ? rgba(PALETTE.magenta, 0.2 * streak) : rgba(PALETTE.violet, 0.3 * streak);
      streaks.push(
        <polyline
          key={li}
          points={pts.join(' ')}
          fill="none"
          stroke={col}
          strokeWidth={li % 2 ? 1.5 : 3}
          strokeDasharray={`${140 + li * 37} ${90 + li * 23}`}
          strokeDashoffset={-f * (38 + li * 6)}
        />,
      );
    });
  }

  const coreFill = coreMix >= 0.999 ? `url(#${id}-core)` : rgba(PALETTE.magenta, 0.35 * (1 - coreMix));
  return (
    <svg width={WIDTH} height={HEIGHT} style={{position: 'absolute', inset: 0, overflow: 'visible', opacity}}>
      <defs>
        <linearGradient id={`${id}-edge`} gradientUnits="userSpaceOnUse" x1={first.x} y1={first.y} x2={last.x} y2={last.y}>
          <stop offset="0%" stopColor={PALETTE.violet} />
          <stop offset="55%" stopColor={PALETTE.magenta} />
          <stop offset="100%" stopColor={PALETTE.magenta} />
        </linearGradient>
        <linearGradient id={`${id}-core`} gradientUnits="userSpaceOnUse" x1={first.x} y1={first.y} x2={last.x} y2={last.y}>
          <stop offset="0%" stopColor={PALETTE.ribbonCoreDeep} />
          <stop offset="100%" stopColor={PALETTE.ribbonCore} />
        </linearGradient>
        <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={Math.min(9, 2 + maxHalf * 0.3)} />
        </filter>
      </defs>
      <path d={glow} fill={rgba(PALETTE.magenta, 0.45)} filter={`url(#${id}-blur)`} />
      <path d={outer} fill={`url(#${id}-edge)`} opacity={clamp(0.55 + coreMix)} />
      {coreMix > 0.001 ? <path d={core} fill={coreFill} opacity={coreMix} /> : null}
      {edge > 0 && coreMix < 1 ? <path d={core} fill={rgba('#FFFFFF', 0.12 * (1 - coreMix))} /> : null}
      {streaks}
    </svg>
  );
};
