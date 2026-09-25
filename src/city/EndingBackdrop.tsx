// Ending backdrop (screen space, after the ribbon swap): the night sky over
// Chaos City, now calm, with the lit skyline low in frame and clear space for
// the wordmark, headline, Kavey, line and address.
import React, {useMemo} from 'react';
import {PALETTE, rgba} from '../config/palette.ts';
import {SEED} from '../config/video.ts';
import {mulberry32} from '../lib/random.ts';
import {hash01} from '../lib/random.ts';

export const EndingBackdrop: React.FC<{f: number}> = ({f}) => {
  const {stars, far, near} = useMemo(() => {
    const rnd = mulberry32(SEED + 91);
    const stars = Array.from({length: 150}, () => ({x: rnd() * 1080, y: rnd() * 1500, r: 0.6 + rnd() * 1.8, a: 0.15 + rnd() * 0.5, w: 1 + rnd() * 3, p: rnd() * 6.28}));
    const mk = (salt: number, base: number, hMin: number, hMax: number, wMin: number, wMax: number) => {
      const r = mulberry32(SEED + salt);
      const out: {x: number; w: number; h: number; base: number; seed: number}[] = [];
      let x = -40;
      while (x < 1120) {
        const w = wMin + (wMax - wMin) * r();
        out.push({x, w, h: hMin + (hMax - hMin) * r(), base, seed: Math.floor(r() * 1e6)});
        x += w + 4 + r() * 18;
      }
      return out;
    };
    return {stars, far: mk(93, 1920, 300, 520, 60, 130), near: mk(97, 1920, 150, 330, 90, 180)};
  }, []);
  const t = f / 60;
  const drawRow = (rows: typeof far, color: string, alpha: number) =>
    rows.map((b, i) => {
      const top = b.base - b.h;
      const wins: React.ReactNode[] = [];
      const cols = Math.max(2, Math.floor(b.w / 26));
      const nr = Math.floor(b.h / 34);
      for (let r = 1; r < nr; r++)
        for (let c = 0; c < cols; c++) {
          const h = hash01(b.seed, r, c);
          if (h > 0.62) continue;
          wins.push(<rect key={`${r}-${c}`} x={b.x + c * (b.w / cols) + 5} y={top + r * 34} width={b.w / cols - 10} height={16} fill={h < 0.1 ? PALETTE.magenta : h < 0.18 ? PALETTE.violet : '#E4DAFF'} opacity={alpha * (0.5 + 0.5 * h)} />);
        }
      return (
        <g key={i}>
          <rect x={b.x} y={top} width={b.w} height={b.h} fill={color} />
          {wins}
        </g>
      );
    });
  return (
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #05040A 0%, #0B0917 45%, #1A1033 78%, #3A1A5C 100%)'}}>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(640px 560px at 510px 820px, ${rgba(PALETTE.violet, 0.22)} 0%, rgba(0,0,0,0) 70%)`}} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={s.a * (0.6 + 0.4 * Math.sin(t * s.w + s.p))} />
        ))}
        <rect x={0} y={1500} width={1080} height={420} fill={rgba(PALETTE.magenta, 0.06)} />
        {drawRow(far, '#161129', 0.22)}
        {drawRow(near, '#0F0C1C', 0.4)}
      </svg>
    </div>
  );
};
