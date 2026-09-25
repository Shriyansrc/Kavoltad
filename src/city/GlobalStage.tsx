// Ending: "Ready to bring your business to the global stage?" Kavey stands on
// a lit stage in front of a slowly turning wireframe globe with glowing city
// arcs; spotlights sweep, confetti drifts, the wordmark, the headline and the
// website land in time with the voice. Screen space (after the ribbon swap).
import React, {useMemo} from 'react';
import {Wordmark, WORDMARK} from '../components/Wordmark.tsx';
import {PALETTE, rgba} from '../config/palette.ts';
import {SEED} from '../config/video.ts';
import {TYPE} from '../config/type.ts';
import {bump, clamp, ease, invLerp, SPR, spring01} from '../lib/anim.ts';
import {hash01, mulberry32} from '../lib/random.ts';
import {C, COPY2} from './config.ts';

export const STAGE = {kavey: {x: 540, y: 1030, h: 520}, globe: {x: 540, y: 960, r: 360}, floor: {x: 540, y: 1326, rx: 340, ry: 58}};

const n09 = 2514; // "Ready to bring your business to the global stage?"
const n10 = 2658; // "Visit kavolt dot antideploy dot com!"

/** Wireframe globe with rotating longitudes, city lights and travelling arcs. */
const Globe: React.FC<{f: number}> = ({f}) => {
  const G = STAGE.globe;
  const inn = spring01(f - C.swap, SPR.soft);
  const r = G.r * (0.7 + 0.3 * clamp(inn, 0, 1.1));
  const th = f * 0.008;
  const cities = useMemo(() => {
    const rnd = mulberry32(SEED + 404);
    return Array.from({length: 26}, () => ({lat: (rnd() - 0.5) * 2.2, lon: rnd() * Math.PI * 2}));
  }, []);
  const proj = (lat: number, lon: number) => {
    const a = lon + th;
    return {x: G.x + r * Math.cos(lat) * Math.sin(a), y: G.y - r * Math.sin(lat) * 0.96, z: Math.cos(lat) * Math.cos(a)};
  };
  const pts = cities.map((c) => proj(c.lat, c.lon));
  const arcs: React.ReactNode[] = [];
  for (let k = 0; k < 9; k++) {
    const a = pts[k * 2];
    const b = pts[(k * 2 + 7) % pts.length];
    if (a.z < 0.1 || b.z < 0.1) continue;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = mx - G.x;
    const dy = my - G.y;
    const len = Math.hypot(dx, dy) || 1;
    const lift = 60 + 0.25 * Math.hypot(b.x - a.x, b.y - a.y);
    const cx = mx + (dx / len) * lift;
    const cy = my + (dy / len) * lift;
    const d = `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`;
    const u = (((f - C.swap) * 0.02 + k * 0.23) % 1 + 1) % 1;
    const px = (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * cx + u * u * b.x;
    const py = (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * cy + u * u * b.y;
    arcs.push(
      <g key={k}>
        <path d={d} fill="none" stroke={rgba(k % 2 ? PALETTE.magenta : '#FFD166', 0.55)} strokeWidth={3} />
        <circle cx={px} cy={py} r={6} fill="#FFFFFF" />
      </g>,
    );
  }
  return (
    <g opacity={clamp(inn * 1.5)}>
      <defs>
        <radialGradient id="globeFill" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#6B3FC0" />
          <stop offset="60%" stopColor="#2A1766" />
          <stop offset="100%" stopColor="#140C38" />
        </radialGradient>
      </defs>
      <circle cx={G.x} cy={G.y} r={r + 40} fill={rgba(PALETTE.magenta, 0.12)} />
      <circle cx={G.x} cy={G.y} r={r} fill="url(#globeFill)" />
      <g fill="none" stroke={rgba('#C9B8FF', 0.28)} strokeWidth={2}>
        {[-60, -30, 0, 30, 60].map((lat) => {
          const p = (lat * Math.PI) / 180;
          return <ellipse key={lat} cx={G.x} cy={G.y - r * Math.sin(p) * 0.96} rx={r * Math.cos(p)} ry={r * Math.cos(p) * 0.12} />;
        })}
        {Array.from({length: 8}, (_, k) => {
          const a = (k / 8) * Math.PI + th;
          return <ellipse key={k} cx={G.x} cy={G.y} rx={Math.abs(r * Math.sin(a))} ry={r * 0.96} />;
        })}
      </g>
      {pts.map((p, i) => (p.z > 0 ? <circle key={i} cx={p.x} cy={p.y} r={4 + 3 * p.z} fill={i % 3 ? '#FFE6A8' : PALETTE.cyan} opacity={0.5 + 0.5 * p.z} /> : null))}
      {arcs}
      <circle cx={G.x} cy={G.y} r={r} fill="none" stroke={rgba('#FFB3D6', 0.5)} strokeWidth={4} />
    </g>
  );
};

const Spotlights: React.FC<{f: number}> = ({f}) => {
  const out: React.ReactNode[] = [];
  [
    {x: 60, on: C.reveal + 30, ph: 0},
    {x: 1020, on: C.reveal + 40, ph: 1.7},
  ].forEach((s, i) => {
    const o = clamp(invLerp(s.on, s.on + 8, f));
    if (o <= 0) return;
    const aim = STAGE.floor.x + 120 * Math.sin(f * 0.025 + s.ph);
    out.push(<polygon key={i} points={`${s.x - 20},-20 ${s.x + 20},-20 ${aim + 190},${STAGE.floor.y + 20} ${aim - 190},${STAGE.floor.y + 20}`} fill={rgba('#FFF1CC', 0.1 * o)} />);
    out.push(<ellipse key={`p${i}`} cx={aim} cy={STAGE.floor.y + 6} rx={200} ry={40} fill={rgba('#FFF1CC', 0.16 * o)} />);
  });
  return <>{out}</>;
};

const Confetti: React.FC<{f: number}> = ({f}) => {
  const bits = useMemo(() => {
    const rnd = mulberry32(SEED + 505);
    return Array.from({length: 60}, () => ({x: rnd() * 1080, v: 1.2 + rnd() * 1.8, sway: rnd() * 6.28, c: ['#FF4F9A', '#FFD166', '#7C4DFF', '#3DDC97', '#4FB8F0', '#FFFFFF'][Math.floor(rnd() * 6)], w: 10 + rnd() * 10, delay: rnd() * 120}));
  }, []);
  const t0 = C.reveal;
  return (
    <>
      {bits.map((b, i) => {
        const t = f - t0 - b.delay;
        if (t < 0) return null;
        const y = -40 + ((t * b.v * 3) % 2000);
        const x = b.x + 30 * Math.sin(t * 0.04 + b.sway);
        return <rect key={i} x={x} y={y} width={b.w} height={b.w * 0.5} rx={2} fill={b.c} opacity={0.85} transform={`rotate(${t * 4 + i * 20}, ${x}, ${y})`} />;
      })}
    </>
  );
};

/** The calm city at the bottom of the frame, below the address. */
const Skyline: React.FC = () => {
  const rows = useMemo(() => {
    const mk = (salt: number, base: number, hMin: number, hMax: number, wMin: number, wMax: number) => {
      const r = mulberry32(SEED + salt);
      const out: {x: number; w: number; h: number; base: number; seed: number}[] = [];
      let x = -40;
      while (x < 1120) {
        const w = wMin + (wMax - wMin) * r();
        out.push({x, w, h: hMin + (hMax - hMin) * r(), base, seed: Math.floor(r() * 1e6)});
        x += w + 4 + r() * 16;
      }
      return out;
    };
    return [mk(93, 1920, 260, 380, 60, 130), mk(97, 1920, 150, 260, 90, 180)];
  }, []);
  return (
    <g>
      {rows.map((row, ri) =>
        row.map((b, i) => {
          const top = b.base - b.h;
          const cols = Math.max(2, Math.floor(b.w / 26));
          const nr = Math.floor(b.h / 34);
          const wins: React.ReactNode[] = [];
          for (let r = 1; r < nr; r++)
            for (let c = 0; c < cols; c++) {
              const h = hash01(b.seed, r, c);
              if (h > 0.6) continue;
              wins.push(<rect key={`${r}-${c}`} x={b.x + c * (b.w / cols) + 5} y={top + r * 34} width={b.w / cols - 10} height={16} rx={2} fill={h < 0.12 ? '#FFB8D9' : '#FFE0A0'} opacity={ri ? 0.8 : 0.5} />);
            }
          return (
            <g key={`${ri}-${i}`}>
              <rect x={b.x} y={top} width={b.w} height={b.h} fill={ri ? '#3B2386' : '#5A3A9E'} />
              {wins}
            </g>
          );
        }),
      )}
    </g>
  );
};

/** Backdrop (behind Kavey). */
export const GlobalStageBack: React.FC<{f: number}> = ({f}) => {
  const stars = useMemo(() => {
    const rnd = mulberry32(SEED + 91);
    return Array.from({length: 120}, () => ({x: rnd() * 1080, y: rnd() * 1400, r: 0.7 + rnd() * 1.8, a: 0.2 + rnd() * 0.5, w: 1 + rnd() * 3, p: rnd() * 6.28}));
  }, []);
  const t = f / 60;
  const F = STAGE.floor;
  const hit = bump(f, C.reveal + 4, 18);
  return (
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #120A33 0%, #2A1766 38%, #6A2FA6 70%, #D8589C 92%, #FF9474 100%)'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={s.a * (0.6 + 0.4 * Math.sin(t * s.w + s.p))} />
        ))}
        <Skyline />
        <Spotlights f={f} />
        <Globe f={f} />
        {/* stage */}
        <ellipse cx={F.x} cy={F.y + 40} rx={F.rx + 60} ry={F.ry + 30} fill={rgba('#000000', 0.25)} />
        <ellipse cx={F.x} cy={F.y + 18} rx={F.rx} ry={F.ry} fill="#2A1766" />
        <ellipse cx={F.x} cy={F.y} rx={F.rx} ry={F.ry} fill="#3B2386" stroke={rgba(PALETTE.magenta, 0.7 + 0.3 * hit)} strokeWidth={6} />
        <ellipse cx={F.x} cy={F.y} rx={F.rx * 0.7} ry={F.ry * 0.62} fill="none" stroke={rgba('#FFD166', 0.35)} strokeWidth={3} />
        {Array.from({length: 12}, (_, k) => {
          const a = (k / 12) * Math.PI * 2 + f * 0.01;
          return <circle key={k} cx={F.x + Math.cos(a) * F.rx * 0.92} cy={F.y + Math.sin(a) * F.ry * 0.92} r={5} fill="#FFF1CC" opacity={0.5 + 0.5 * Math.sin(f * 0.2 + k)} />;
        })}
      </svg>
    </div>
  );
};

/** Foreground text and confetti (in front of Kavey). */
export const GlobalStageFront: React.FC<{f: number}> = ({f}) => {
  const hit = bump(f, C.reveal + 4, 16);
  const wmW = 380;
  const wmH = (wmW * WORDMARK.h) / WORDMARK.w;
  const size = 74;
  const lines = COPY2.ending.headline;
  const url = COPY2.ending.website;
  const urlIn = spring01(f - n10, SPR.pop);
  const typed = Math.round(clamp(invLerp(n10, n10 + 50, f)) * url.length);
  const underline = ease.cubicOut(clamp(invLerp(n10 + 20, n10 + 60, f)));
  return (
    <>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <Confetti f={f} />
      </svg>
      <Wordmark x={540 - wmW / 2} y={196 - wmH / 2} width={wmW} glow={hit} />
      {lines.map((ln, li) => {
        const words = ln.split(' ');
        return (
          <div key={li} style={{position: 'absolute', left: 0, width: 1080, top: 268 + li * size * 0.98, textAlign: 'center', whiteSpace: 'nowrap', ...TYPE.headline, fontSize: size, color: PALETTE.white, textShadow: '0 6px 26px rgba(10,6,30,0.8)'}}>
            {words.map((w, wi) => {
              const at = n09 + li * 14 + wi * 4;
              const p = spring01(f - at, SPR.pop);
              const accent = li === 2 && wi > 0;
              return (
                <span
                  key={wi}
                  style={{
                    display: 'inline-block',
                    marginRight: wi < words.length - 1 ? '0.24em' : undefined,
                    color: accent ? PALETTE.magenta : undefined,
                    opacity: clamp(p * 2.2),
                    transform: `translateY(${(1 - p) * 50}px) scale(${0.8 + 0.2 * clamp(p, 0, 1.2)})`,
                    transformOrigin: '50% 80%',
                    filter: p < 0.7 ? `blur(${(0.7 - p) * 10}px)` : undefined,
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
        );
      })}
      {/* website: types on with the voice, then the underline draws */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          width: 1080,
          top: 1420,
          textAlign: 'center',
          ...TYPE.mono,
          fontSize: 50,
          letterSpacing: '0.01em',
          color: PALETTE.white,
          opacity: clamp(urlIn * 2),
          transform: `scale(${0.9 + 0.1 * clamp(urlIn, 0, 1.1)})`,
          textShadow: '0 4px 20px rgba(10,6,30,0.8)',
          whiteSpace: 'nowrap',
        }}
      >
        <span>{url.slice(0, typed)}</span>
        <span style={{opacity: 0}}>{url.slice(typed)}</span>
      </div>
      <div style={{position: 'absolute', left: 540 - 330 * underline, top: 1500, width: 660 * underline, height: 5, background: PALETTE.magenta, boxShadow: `0 0 16px ${rgba(PALETTE.magenta, 0.7)}`}} />
    </>
  );
};
