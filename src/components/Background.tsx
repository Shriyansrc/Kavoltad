// Layers 1–3: navy-black base, sparse seeded depth points, soft light haze,
// and the blueprint grid limited to the build region.
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {LAYOUT} from '../config/layout.ts';
import {PALETTE, rgba} from '../config/palette.ts';
import {FPS, HEIGHT, SEED, WIDTH} from '../config/video.ts';
import {envelope, invLerp} from '../lib/anim.ts';
import {mulberry32, seeded} from '../lib/random.ts';

type Star = {x: number; y: number; d: number; r: number; a: number; tint: string; w: number; p: number};

const makeStars = (): Star[] => {
  const rnd = seeded(11);
  const stars: Star[] = [];
  for (let i = 0; i < 150; i++) {
    const d = 0.25 + 0.75 * Math.pow(rnd(), 1.6);
    const tintRoll = rnd();
    stars.push({
      x: rnd() * WIDTH,
      y: rnd() * (HEIGHT + 400) - 200,
      d,
      r: 0.6 + 1.5 * d * rnd(),
      a: 0.05 + 0.26 * d * rnd(),
      tint: tintRoll < 0.12 ? PALETTE.violet : tintRoll < 0.18 ? PALETTE.magenta : '#FFFFFF',
      w: 0.4 + rnd() * 1.4,
      p: rnd() * Math.PI * 2,
    });
  }
  return stars;
};

export const Background: React.FC<{f: number; focus: {x: number; y: number}; ending: number}> = ({f, focus, ending}) => {
  const stars = useMemo(makeStars, []);
  const t = f / FPS;
  const push = f <= 150 ? 1 + 0.01 * (f / 150) : 1.01 - 0.01 * invLerp(150, 186, f);
  return (
    <div style={{position: 'absolute', inset: 0, background: PALETTE.background, overflow: 'hidden'}}>
      {/* soft light that follows Kavey: violet rim-side, restrained magenta fill */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(640px 760px at ${focus.x + 60}px ${focus.y - 40}px, ${rgba(PALETTE.violet, 0.1 + 0.04 * ending)} 0%, ${rgba(PALETTE.violet, 0.03)} 45%, rgba(0,0,0,0) 72%),
            radial-gradient(520px 520px at ${focus.x - 180}px ${focus.y + 120}px, ${rgba(PALETTE.magenta, 0.045)} 0%, rgba(0,0,0,0) 70%),
            radial-gradient(1400px 1100px at 540px 900px, rgba(18,18,30,0.55) 0%, rgba(0,0,0,0) 70%)`,
        }}
      />
      <svg width={WIDTH} height={HEIGHT} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(540 960) scale(${push}) translate(-540 -960)`}>
          {stars.map((s, i) => {
            const y = ((s.y - t * 9 * s.d + 2400) % (HEIGHT + 400)) - 200;
            const tw = 0.7 + 0.3 * Math.sin(t * s.w * 2 + s.p);
            return <circle key={i} cx={s.x} cy={y} r={s.r} fill={s.tint} opacity={s.a * tw} />;
          })}
        </g>
      </svg>
      {/* vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(1200px 1700px at 540px 900px, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)',
        }}
      />
    </div>
  );
};

export const BlueprintGrid: React.FC<{f: number}> = ({f}) => {
  const a = envelope(f, 420, 446, 596, 614);
  if (a <= 0) return null;
  const d = LAYOUT.demo;
  const lines: React.ReactNode[] = [];
  const x0 = d.x;
  const y0 = d.y;
  for (let x = x0; x <= d.x + d.w + 0.1; x += 72) {
    lines.push(<line key={`v${x}`} x1={x} y1={d.y} x2={x} y2={d.y + d.h} />);
  }
  for (let y = y0; y <= d.y + d.h + 0.1; y += 72) {
    lines.push(<line key={`h${y}`} x1={d.x} y1={y} x2={d.x + d.w} y2={y} />);
  }
  return (
    <svg width={WIDTH} height={HEIGHT} style={{position: 'absolute', inset: 0, opacity: a}}>
      <g stroke="rgba(255,255,255,0.03)" strokeWidth={1.5}>
        {lines}
      </g>
    </svg>
  );
};

/** Fine seeded grain (3 %), composited under the type layer only. */
export const Grain: React.FC<{f: number}> = ({f}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = 540;
  const h = 960;
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
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
  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      style={{position: 'absolute', inset: 0, width: WIDTH, height: HEIGHT, opacity: 0.03, mixBlendMode: 'overlay', pointerEvents: 'none'}}
    />
  );
};
