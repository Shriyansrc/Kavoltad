// Layers 1–3: navy-black base with slowly drifting magenta/violet light,
// seeded depth points, a receding perspective floor grid, the blueprint grid
// in the build region, and fine grain. All driven by frame.
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {LAYOUT} from '../config/layout.ts';
import {PALETTE, rgba} from '../config/palette.ts';
import {K} from '../config/timeline.ts';
import {FPS, HEIGHT, SEED, WIDTH} from '../config/video.ts';
import {bump, clamp, envelope, lerp} from '../lib/anim.ts';
import {mulberry32, seeded} from '../lib/random.ts';

type Star = {x: number; y: number; d: number; r: number; a: number; tint: string; w: number; p: number};

const makeStars = (): Star[] => {
  const rnd = seeded(11);
  return Array.from({length: 170}, () => {
    const d = 0.25 + 0.75 * Math.pow(rnd(), 1.6);
    const tr = rnd();
    return {
      x: rnd() * WIDTH,
      y: rnd() * (HEIGHT + 400) - 200,
      d,
      r: 0.6 + 1.7 * d * rnd(),
      a: 0.08 + 0.34 * d * rnd(),
      tint: tr < 0.14 ? PALETTE.violet : tr < 0.22 ? PALETTE.magenta : '#FFFFFF',
      w: 0.4 + rnd() * 1.4,
      p: rnd() * Math.PI * 2,
    };
  });
};

export const Background: React.FC<{f: number; focus: {x: number; y: number}; ending: number}> = ({f, focus, ending}) => {
  const stars = useMemo(makeStars, []);
  const t = f / FPS;
  // Scene energy drives the intensity of the drifting light.
  const energy = clamp(0.55 + 0.35 * bump(f, K.connect + 10, 40) + 0.3 * bump(f, K.live + 10, 50) + 0.25 * envelope(f, 420, 450, 580, 600) + 0.4 * ending);
  const b1 = {x: 540 + 260 * Math.sin(t * 0.55 + 0.3), y: 820 + 220 * Math.sin(t * 0.43 + 1.2)};
  const b2 = {x: 360 + 220 * Math.sin(t * 0.37 + 2.1), y: 1250 + 180 * Math.sin(t * 0.51 + 0.4)};
  const b3 = {x: lerp(focus.x, 540, 0.3), y: focus.y - 60};
  return (
    <div style={{position: 'absolute', inset: 0, background: PALETTE.background, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(700px 700px at ${b1.x}px ${b1.y}px, ${rgba(PALETTE.violet, 0.16 * energy)} 0%, rgba(0,0,0,0) 70%),
            radial-gradient(640px 640px at ${b2.x}px ${b2.y}px, ${rgba(PALETTE.magenta, 0.1 * energy)} 0%, rgba(0,0,0,0) 70%),
            radial-gradient(520px 620px at ${b3.x}px ${b3.y}px, ${rgba(PALETTE.violet, 0.14 + 0.08 * ending)} 0%, rgba(0,0,0,0) 72%)`,
        }}
      />
      <svg width={WIDTH} height={HEIGHT} style={{position: 'absolute', inset: 0}}>
        {stars.map((s, i) => {
          const y = ((s.y - t * 14 * s.d + 2400) % (HEIGHT + 400)) - 200;
          const tw = 0.65 + 0.35 * Math.sin(t * s.w * 2.4 + s.p);
          return <circle key={i} cx={s.x} cy={y} r={s.r} fill={s.tint} opacity={s.a * tw} />;
        })}
      </svg>
      <FloorGrid f={f} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(1250px 1750px at 540px 900px, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)'}} />
    </div>
  );
};

/** A receding perspective floor that scrolls toward the viewer. */
const FloorGrid: React.FC<{f: number}> = ({f}) => {
  const a = 0.05 + 0.07 * envelope(f, 420, 450, 580, 604) + 0.03 * bump(f, K.live + 20, 60);
  const scroll = (f * 1.6) % 80;
  const lines: React.ReactNode[] = [];
  for (let x = -1600; x <= 2680; x += 80) lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={1400} />);
  for (let y = -80; y <= 1400; y += 80) lines.push(<line key={`h${y}`} x1={-1600} y1={y + scroll} x2={2680} y2={y + scroll} />);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 1260,
        width: WIDTH,
        height: 1400,
        transformOrigin: '50% 0%',
        transform: 'perspective(700px) rotateX(72deg)',
        opacity: a,
        maskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 30%, #000 100%)',
        WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 30%, #000 100%)',
      }}
    >
      <svg width={WIDTH} height={1400} style={{overflow: 'visible'}}>
        <g stroke={PALETTE.magenta} strokeWidth={2}>
          {lines}
        </g>
      </svg>
    </div>
  );
};

export const BlueprintGrid: React.FC<{f: number}> = ({f}) => {
  const a = envelope(f, 420, 446, 596, 614);
  if (a <= 0) return null;
  const d = LAYOUT.demo;
  const lines: React.ReactNode[] = [];
  for (let x = d.x; x <= d.x + d.w + 0.1; x += 72) lines.push(<line key={`v${x}`} x1={x} y1={d.y} x2={x} y2={d.y + d.h} />);
  for (let y = d.y; y <= d.y + d.h + 0.1; y += 72) lines.push(<line key={`h${y}`} x1={d.x} y1={y} x2={d.x + d.w} y2={y} />);
  const scan = d.y + (d.h + 60) * ((f - 420) / 90 - Math.floor((f - 420) / 90));
  return (
    <svg width={WIDTH} height={HEIGHT} style={{position: 'absolute', inset: 0, opacity: a}}>
      <g stroke="rgba(255,255,255,0.045)" strokeWidth={1.5}>
        {lines}
      </g>
      <rect x={d.x} y={scan - 60} width={d.w} height={60} fill="url(#scanGrad)" />
      <defs>
        <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={rgba(PALETTE.magenta, 0)} />
          <stop offset="100%" stopColor={rgba(PALETTE.magenta, 0.06)} />
        </linearGradient>
      </defs>
    </svg>
  );
};

/** Fine seeded grain, composited under the type layer only. */
export const Grain: React.FC<{f: number}> = ({f}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = 540;
  const h = 960;
  useLayoutEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const img = ctx.createImageData(w, h);
    const rnd = mulberry32(SEED + f * 131);
    for (let i = 0; i < w * h; i++) {
      const v = Math.floor(rnd() * 255);
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [f]);
  return <canvas ref={ref} width={w} height={h} style={{position: 'absolute', inset: 0, width: WIDTH, height: HEIGHT, opacity: 0.05, mixBlendMode: 'overlay', pointerEvents: 'none'}} />;
};

