// Stage effects: connectors and cables, the build pulse, Kavey's spark and
// shockwave, chaos message bubbles, the seven-day strip, sparkle bursts, the
// process rail and the Day 7 handoff tile. All pure functions of frame.
import React from 'react';
import {COPY} from '../config/copy.ts';
import {LAYOUT} from '../config/layout.ts';
import {PALETTE, rgba} from '../config/palette.ts';
import {K} from '../config/timeline.ts';
import {FONT_MONO} from '../config/type.ts';
import {HEIGHT, SEED, WIDTH} from '../config/video.ts';
import {clamp, ease, invLerp, lerp, rad} from '../lib/anim.ts';
import {mulberry32} from '../lib/random.ts';
import {anchorAt} from '../scenes/kavey.ts';
import {BUBBLES, BURSTS, bubbleState, cardGeo, connectorEnergy, dayStrip, joined, pulse, railState, spark, tileGeo, type Geo} from '../scenes/stage.ts';
import {IconChat, IconCode, IconKey} from './icons.tsx';

const Svg: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <svg width={WIDTH} height={HEIGHT} style={{position: 'absolute', inset: 0, overflow: 'visible', ...style}}>
    {children}
  </svg>
);

const port = (g: Geo, side: 'top' | 'bottom') => {
  const s = side === 'top' ? -1 : 1;
  const r = rad(g.rot);
  return {x: g.cx - Math.sin(r) * (g.h / 2) * s * g.scale, y: g.cy + Math.cos(r) * (g.h / 2) * s * g.scale, nx: -Math.sin(r) * s, ny: Math.cos(r) * s};
};

// ------------------------------------------------------------------ connectors
export const Connectors: React.FC<{f: number}> = ({f}) => {
  if (f >= 850) return null;
  const geos = [0, 1, 2].map((i) => cardGeo(i, f));
  const fade = 1 - invLerp(836, 848, f);
  const build = f >= 420 && f < 604;
  const out: React.ReactNode[] = [];
  for (let pair = 0; pair < 2; pair++) {
    const a = port(geos[pair], 'bottom');
    const b = port(geos[pair + 1], 'top');
    const j = joined(pair, f);
    const e = connectorEnergy(pair, f);
    const stub = 20;
    const mid = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
    const col = rgba(PALETTE.magenta, (0.35 + 0.55 * e) * fade);
    const glow = rgba(PALETTE.magenta, 0.3 * e * fade);
    if (build) {
      // cables bow out to the left during the build
      const c1 = {x: a.x - 46, y: lerp(a.y, b.y, 0.3)};
      const c2 = {x: b.x - 46, y: lerp(a.y, b.y, 0.7)};
      const d = `M${a.x},${a.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}`;
      out.push(
        <g key={pair}>
          <path d={d} fill="none" stroke={glow} strokeWidth={10} />
          <path d={d} fill="none" stroke={col} strokeWidth={2.5} />
          <path d={d} fill="none" stroke={rgba('#FFFFFF', 0.5 * e)} strokeWidth={2} strokeDasharray="5 14" strokeDashoffset={-f * 2.2} />
        </g>,
      );
    } else {
      const ea = {x: lerp(a.x + a.nx * stub, mid.x, j), y: lerp(a.y + a.ny * stub, mid.y, j)};
      const eb = {x: lerp(b.x + b.nx * stub, mid.x, j), y: lerp(b.y + b.ny * stub, mid.y, j)};
      out.push(
        <g key={pair}>
          <line x1={a.x} y1={a.y} x2={ea.x} y2={ea.y} stroke={glow} strokeWidth={10} />
          <line x1={b.x} y1={b.y} x2={eb.x} y2={eb.y} stroke={glow} strokeWidth={10} />
          <line x1={a.x} y1={a.y} x2={ea.x} y2={ea.y} stroke={col} strokeWidth={2.5} />
          <line x1={b.x} y1={b.y} x2={eb.x} y2={eb.y} stroke={col} strokeWidth={2.5} />
          {e > 0.05 && j > 0.99 ? <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rgba('#FFFFFF', 0.55 * e * fade)} strokeWidth={2} strokeDasharray="5 14" strokeDashoffset={-f * 1.8} /> : null}
          {j < 0.98 ? (
            <>
              <rect x={ea.x - 5} y={ea.y - 5} width={10} height={10} fill={PALETTE.background} stroke={col} strokeWidth={2} opacity={1 - j} />
              <rect x={eb.x - 5} y={eb.y - 5} width={10} height={10} fill={PALETTE.background} stroke={col} strokeWidth={2} opacity={1 - j} />
            </>
          ) : null}
        </g>,
      );
    }
  }
  const inA = clamp(invLerp(420, 434, f)) * (1 - invLerp(598, 610, f));
  return (
    <Svg>
      {inA > 0 ? (
        <g opacity={inA}>
          <line x1={365} y1={612} x2={365} y2={geos[0].cy - geos[0].h / 2} stroke={rgba(PALETTE.magenta, 0.45)} strokeWidth={2.5} />
          <rect x={359} y={606} width={12} height={12} fill={PALETTE.background} stroke={PALETTE.magenta} strokeWidth={2} />
        </g>
      ) : null}
      {out}
    </Svg>
  );
};

// ------------------------------------------------------------------ pulse + spark
export const PulseAndSpark: React.FC<{f: number}> = ({f}) => {
  const p = pulse(f);
  const s = spark(f);
  if (!p.visible && !s) return null;
  const trail = [2, 4, 6, 8, 10].map((lag) => pulse(f - lag * 0.6)).filter((q) => q.visible);
  return (
    <Svg>
      <defs>
        <radialGradient id="cometGlow">
          <stop offset="0%" stopColor={rgba(PALETTE.magenta, 0.8)} />
          <stop offset="100%" stopColor={rgba(PALETTE.magenta, 0)} />
        </radialGradient>
      </defs>
      {s ? (
        <g>
          <path
            d={`M${s.from.x},${s.from.y} Q${s.c.x},${s.c.y} ${s.to.x},${s.to.y}`}
            fill="none"
            stroke={rgba(PALETTE.magenta, 0.55)}
            strokeWidth={3}
            strokeDasharray={`${240} 2000`}
            strokeDashoffset={2000 - 2000 * s.u + 240}
            pathLength={2000}
          />
          <circle cx={s.x} cy={s.y} r={26} fill="url(#cometGlow)" />
          <circle cx={s.x} cy={s.y} r={6} fill="#FFFFFF" />
        </g>
      ) : null}
      {p.visible ? (
        <g>
          {trail.map((q, n) => (
            <circle key={n} cx={q.x} cy={q.y} r={7 - n} fill={rgba(PALETTE.magenta, 0.5 - n * 0.08)} />
          ))}
          <circle cx={p.x} cy={p.y} r={30} fill="url(#cometGlow)" />
          <rect x={p.x - 7} y={p.y - 7} width={14} height={14} fill={PALETTE.magenta} transform={`rotate(45 ${p.x} ${p.y})`} />
          <rect x={p.x - 3} y={p.y - 3} width={6} height={6} fill="#FFFFFF" transform={`rotate(45 ${p.x} ${p.y})`} />
        </g>
      ) : null}
    </Svg>
  );
};

// ------------------------------------------------------------------ shockwave
export const Shockwave: React.FC<{f: number}> = ({f}) => {
  const t = invLerp(K.connect, K.connect + 26, f);
  if (t <= 0 || t >= 1) return null;
  const c = anchorAt(K.connect + 2, 'handLTip');
  const r = 20 + 560 * ease.cubicOut(t);
  const r2 = 10 + 360 * ease.cubicOut(clamp(t * 1.3));
  return (
    <Svg>
      <circle cx={c.x} cy={c.y} r={r} fill="none" stroke={rgba(PALETTE.magenta, 0.7 * (1 - t))} strokeWidth={4 * (1 - t) + 1} />
      <circle cx={c.x} cy={c.y} r={r2} fill="none" stroke={rgba(PALETTE.violet, 0.5 * (1 - t))} strokeWidth={2} />
      <circle cx={c.x} cy={c.y} r={60 * (1 - t)} fill={rgba(PALETTE.magenta, 0.35 * (1 - t))} />
    </Svg>
  );
};

// ------------------------------------------------------------------ bubbles
export const Bubbles: React.FC<{f: number}> = ({f}) => {
  if (f > K.connect + 30) return null;
  return (
    <>
      {BUBBLES.map((b, i) => {
        const s = bubbleState(b, i, f);
        if (s.scale <= 0.01) return null;
        const w = b.w;
        const h = 58;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: s.x - w / 2,
              top: s.y - h / 2,
              width: w,
              height: h,
              transform: `rotate(${s.rot}deg) scale(${s.scale})`,
              opacity: s.opacity,
              background: 'rgba(24,24,36,0.92)',
              outline: `2px solid ${rgba(PALETTE.magenta, 0.35)}`,
              outlineOffset: -2,
              borderRadius: 2,
              boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
            }}
          >
            <svg width={w} height={h} style={{position: 'absolute', inset: 0}}>
              <IconChat x={12} y={15} s={26} color={PALETTE.magenta} />
              <rect x={48} y={17} width={w - 90} height={8} fill="rgba(255,255,255,0.22)" />
              <rect x={48} y={33} width={(w - 90) * 0.6} height={7} fill="rgba(255,255,255,0.11)" />
              <circle cx={w - 18} cy={20} r={6} fill={PALETTE.magenta} />
            </svg>
          </div>
        );
      })}
    </>
  );
};

// ------------------------------------------------------------------ 7-day strip
export const DayStrip: React.FC<{f: number}> = ({f}) => {
  if (f < 170 || f > 300) return null;
  const s = dayStrip(f);
  const size = 30;
  const gap = 12;
  const x0 = 130;
  const y0 = 566 - 60 * s.exit;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, opacity: 1 - s.exit}}>
      <Svg>
        {s.cells.map((c, d) => {
          const x = x0 + d * (size + gap) + size / 2;
          const y = y0 + size / 2;
          return (
            <g key={d} transform={`translate(${x} ${y}) scale(${clamp(c.pop, 0, 1.4)})`}>
              <rect x={-size / 2} y={-size / 2} width={size} height={size} fill={rgba(PALETTE.magenta, 0.12 + 0.88 * c.fill)} stroke={PALETTE.magenta} strokeWidth={2} />
            </g>
          );
        })}
      </Svg>
    </div>
  );
};

// ------------------------------------------------------------------ sparkles
const star = (x: number, y: number, r: number) => `M${x},${y - r} L${x + r * 0.28},${y - r * 0.28} L${x + r},${y} L${x + r * 0.28},${y + r * 0.28} L${x},${y + r} L${x - r * 0.28},${y + r * 0.28} L${x - r},${y} L${x - r * 0.28},${y - r * 0.28} Z`;

export const Sparkles: React.FC<{f: number}> = ({f}) => {
  const out: React.ReactNode[] = [];
  BURSTS.forEach((b, bi) => {
    const life = 32;
    const t = (f - b.at) / life;
    if (t < 0 || t > 1) return;
    const origin = 'anchor' in b && b.anchor ? anchorAt(b.at, b.anchor) : {x: b.x, y: b.y};
    const rnd = mulberry32(SEED + bi * 977);
    for (let n = 0; n < b.n; n++) {
      const ang = rnd() * Math.PI * 2;
      const dist = b.r * (0.45 + 0.55 * rnd());
      const size = 5 + 9 * rnd();
      const e = ease.cubicOut(t);
      const x = origin.x + Math.cos(ang) * dist * e;
      const y = origin.y + Math.sin(ang) * dist * e + 30 * t * t;
      const a = t < 0.2 ? t / 0.2 : 1 - ease.cubicIn((t - 0.2) / 0.8);
      const col = n % 3 === 0 ? '#FFFFFF' : n % 3 === 1 ? PALETTE.magenta : PALETTE.violet;
      out.push(<path key={`${bi}-${n}`} d={star(x, y, size * (1 - 0.5 * t))} fill={col} opacity={a} />);
    }
  });
  if (!out.length) return null;
  return <Svg>{out}</Svg>;
};

// ------------------------------------------------------------------ rail
export const Rail: React.FC<{f: number}> = ({f}) => {
  const s = railState(f);
  if (s.appear <= 0 || s.fade <= 0) return null;
  const {x0, x1, y} = LAYOUT.rail;
  const xs = [0, 1, 2, 3].map((n) => x0 + ((x1 - x0) * n) / 3);
  const drawn = ease.cubicInOut(s.appear);
  const fillTo = x0 + ((x1 - x0) * clamp(s.progress, 0, 3)) / 3;
  return (
    <Svg style={{opacity: s.fade}}>
      <line x1={x0} y1={y} x2={x0 + (x1 - x0) * drawn} y2={y} stroke="rgba(255,255,255,0.16)" strokeWidth={2} />
      {s.progress > 0 ? <line x1={x0} y1={y} x2={fillTo} y2={y} stroke={PALETTE.magenta} strokeWidth={3} /> : null}
      {xs.map((x, n) => {
        const vis = clamp((drawn * 3 - n) * 1.5 + 0.2);
        const lit = s.lit[n];
        const sc = 0.8 + 0.2 * clamp(lit, 0, 1.3) + (lit > 0 && lit < 1.2 ? 0.25 * Math.max(0, lit - 0.8) : 0);
        return (
          <g key={n} opacity={vis} transform={`translate(${x} ${y}) scale(${sc})`}>
            <rect x={-8} y={-8} width={16} height={16} fill={lit > 0.05 ? rgba(PALETTE.magenta, clamp(lit)) : PALETTE.background} stroke={lit > 0.5 ? PALETTE.magenta : 'rgba(255,255,255,0.38)'} strokeWidth={2} />
            {lit > 0.05 ? <rect x={-15} y={-15} width={30} height={30} fill="none" stroke={rgba(PALETTE.magenta, 0.4 * clamp(lit))} strokeWidth={1.5} /> : null}
          </g>
        );
      })}
    </Svg>
  );
};

// ------------------------------------------------------------------ handoff tile
export const HandoffTile: React.FC<{f: number}> = ({f}) => {
  if (f < 744 || f > 860) return null;
  const g = tileGeo(f);
  if (g.opacity <= 0.01) return null;
  const lift = clamp((g.scale - 0.6) / 0.4);
  const label: React.CSSProperties = {fontFamily: FONT_MONO, fontWeight: 500, fontSize: 24, letterSpacing: '0.08em'};
  return (
    <div
      style={{
        position: 'absolute',
        left: g.cx - g.w / 2,
        top: g.cy - g.h / 2,
        width: g.w,
        height: g.h,
        opacity: clamp(g.opacity),
        transform: `perspective(900px) rotateX(${g.rx}deg) rotate(${g.rot}deg) scale(${g.scale})`,
        background: `linear-gradient(160deg, #211F30 0%, ${PALETTE.surface} 100%)`,
        outline: `2px solid ${PALETTE.magenta}`,
        outlineOffset: -2,
        borderRadius: 2,
        boxShadow: `0 ${20 + 24 * lift}px ${44 + 30 * lift}px rgba(0,0,0,0.6), 0 0 ${30 * lift}px ${rgba(PALETTE.magenta, 0.35)}`,
      }}
    >
      <svg width={g.w} height={g.h} viewBox={`0 0 ${g.w} ${g.h}`} style={{position: 'absolute', inset: 0}}>
        <line x1={g.w / 2} y1={18} x2={g.w / 2} y2={g.h - 18} stroke="rgba(255,255,255,0.16)" strokeWidth={2} />
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

/** Catch contact flash at frame 18. */
export const CatchFlash: React.FC<{f: number}> = ({f}) => {
  const c = invLerp(K.slipEnd, K.slipEnd + 14, f);
  if (f < K.slipEnd || c >= 1) return null;
  const h = anchorAt(K.slipEnd, 'handLTip');
  return (
    <Svg>
      <circle cx={h.x} cy={h.y} r={12 + 46 * ease.cubicOut(c)} fill="none" stroke={rgba(PALETTE.magenta, 0.85 * (1 - c))} strokeWidth={3} />
      <circle cx={h.x} cy={h.y} r={28 * (1 - c)} fill={rgba(PALETTE.magenta, 0.4 * (1 - c))} />
    </Svg>
  );
};
