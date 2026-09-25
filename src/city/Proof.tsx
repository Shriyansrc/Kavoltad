// Proof: CODE and KEYS tiles are handed over (screen space), then a billboard
// rises behind the gym sign and powers on with the real FCN storefront.
import React from 'react';
import {getStaticFiles, Img, staticFile} from 'remotion';
import {IconCode, IconKey} from '../components/icons.tsx';
import {PALETTE, rgba} from '../config/palette.ts';
import {FONT_MONO, TYPE} from '../config/type.ts';
import {bump, clamp, ease, invLerp, lerp, SPR, spring01} from '../lib/anim.ts';
import {hash01} from '../lib/random.ts';
import {C, COPY2} from './config.ts';
import {cityAnchorScreen} from './kavey.ts';
import {Layer, WorldDiv} from './world/Layer.tsx';

// ------------------------------------------------------------------ tiles (screen)
const TILE = {x: 130, w: 330, h: 150, gap: 26};

const tileBox = (i: number, top: number) => ({x: TILE.x, y: top + i * (TILE.h + TILE.gap), w: TILE.w, h: TILE.h});

export const Tiles: React.FC<{f: number; top: number}> = ({f, top}) => {
  if (f < C.tiles - 2 || f > C.tiles + 80) return null;
  return (
    <>
      {[0, 1].map((i) => {
        const at = C.tiles + i * 8;
        const p = spring01(f - at, SPR.pop);
        const exit = ease.cubicIn(invLerp(C.tiles + 58 + i * 3, C.tiles + 70 + i * 3, f));
        if (p <= 0.001 || exit >= 1) return null;
        const b = tileBox(i, top);
        const glint = bump(f, at + 22 + (i ? 10 : 0), 8);
        const label = i === 0 ? COPY2.ui.code : COPY2.ui.keys;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              transformOrigin: '0% 50%',
              transform: `perspective(900px) translateX(${(1 - clamp(p)) * -160 - exit * 500}px) rotateY(${(1 - clamp(p, 0, 1.2)) * 70}deg)`,
              opacity: clamp(p * 2) * (1 - exit),
              background: `linear-gradient(135deg, ${PALETTE.surfaceRaised}, ${PALETTE.surface})`,
              outline: `3px solid ${rgba(PALETTE.magenta, 0.8 + 0.2 * glint)}`,
              outlineOffset: -3,
              borderRadius: 22,
              boxShadow: `0 18px 40px rgba(0,0,0,0.5), 0 0 ${20 + 30 * glint}px ${rgba(PALETTE.magenta, 0.35 + 0.4 * glint)}`,
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              paddingLeft: 28,
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <svg width={76} height={76} style={{flex: 'none'}}>
              {i === 0 ? <IconCode x={4} y={4} s={68} color={PALETTE.magenta} sw={3} /> : <IconKey x={4} y={4} s={68} color={PALETTE.magenta} sw={3} />}
            </svg>
            <span style={{...TYPE.headline, fontSize: 58, color: PALETTE.white, letterSpacing: '0.01em'}}>{label}</span>
            <div style={{position: 'absolute', top: 0, bottom: 0, width: 60, left: -80 + 440 * clamp(invLerp(at + 16, at + 34, f)), background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.22), rgba(255,255,255,0))', transform: 'skewX(-18deg)'}} />
          </div>
        );
      })}
    </>
  );
};

/** Glyphs that fly from Kavey's cube into each tile (screen space). */
export const TileGlyphs: React.FC<{f: number; top: number}> = ({f, top}) => {
  const out: React.ReactNode[] = [];
  [0, 1].forEach((i) => {
    const t0 = C.tiles + 4 + i * 12;
    const u = invLerp(t0, t0 + 16, f);
    if (u <= 0 || u >= 1) return;
    const from = cityAnchorScreen(t0, 'cube');
    const b = tileBox(i, top);
    const to = {x: b.x + 66, y: b.y + b.h / 2};
    const e = ease.cubicInOut(u);
    const x = lerp(from.x, to.x, e);
    const y = lerp(from.y, to.y, e) - Math.sin(Math.PI * e) * 160;
    out.push(
      <g key={i} transform={`translate(${x}, ${y}) rotate(${e * 360})`}>
        <circle r={34} fill={rgba(PALETTE.magenta, 0.25)} />
        {i === 0 ? <IconCode x={-22} y={-22} s={44} color="#FFFFFF" sw={3} /> : <IconKey x={-22} y={-22} s={44} color="#FFFFFF" sw={3} />}
      </g>,
    );
  });
  if (!out.length) return null;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      {out}
    </svg>
  );
};

// ------------------------------------------------------------------ billboard (world)
export const BOARD = {x: 1624, y: 300, imgW: 648, imgH: 243, border: 18};

const boardRise = (f: number) => ease.backOut(1.2)(invLerp(C.billboard - 34, C.billboard - 4, f));

export const Billboard: React.FC<{f: number}> = ({f}) => {
  if (f < C.billboard - 38 || f >= C.swap) return null;
  const rise = boardRise(f);
  const dy = (1 - rise) * 520;
  const W = BOARD.imgW + 2 * BOARD.border;
  const H = BOARD.imgH + 2 * BOARD.border;
  const x0 = BOARD.x - W / 2;
  const y0 = BOARD.y - H / 2 + dy;
  const power = clamp(invLerp(C.billboard, C.billboard + 6, f));
  const flick = f < C.billboard + 10 && hash01(Math.floor(f / 2), 3) < 0.4 ? 0.3 : 1;
  const on = power * flick;
  const label = spring01(f - (C.fcnReveal + 6), SPR.pop);
  return (
    <Layer f={f} p={1}>
      {[BOARD.x - 220, BOARD.x + 220].map((x) => (
        <rect key={x} x={x - 9} y={y0 + H - 4} width={18} height={Math.max(0, 600 - (y0 + H))} fill="#241D3A" />
      ))}
      <rect x={x0 - 12} y={y0 - 12} width={W + 24} height={H + 24} rx={14} fill={rgba(PALETTE.magenta, 0.35 * on)} filter="url(#neon)" />
      <rect x={x0} y={y0} width={W} height={H} rx={10} fill="#0E0B19" stroke={PALETTE.magenta} strokeWidth={5} />
      <rect x={x0 + BOARD.border} y={y0 + BOARD.border} width={BOARD.imgW} height={BOARD.imgH} fill={on > 0.5 ? '#1C1733' : '#0A0812'} />
      {Array.from({length: 9}, (_, k) => (
        <circle key={k} cx={x0 + 30 + k * ((W - 60) / 8)} cy={y0 - 22} r={7} fill={rgba('#FFF3D6', 0.2 + 0.8 * on * (0.6 + 0.4 * Math.sin(f * 0.4 + k)))} />
      ))}
      {label > 0.01 ? (
        <g transform={`translate(${BOARD.x}, ${y0 + H + 34}) scale(${clamp(label, 0, 1.2)})`}>
          <rect x={-150} y={-24} width={300} height={48} rx={10} fill={PALETTE.surface} stroke={rgba(PALETTE.magenta, 0.7)} strokeWidth={3} />
          <text y={9} textAnchor="middle" fontFamily={FONT_MONO} fontWeight={600} fontSize={24} letterSpacing="0.08em" fill="#FFFFFF">
            {COPY2.proofLabel}
          </text>
        </g>
      ) : null}
    </Layer>
  );
};

/** The FCN screenshot (HTML image so it is preloaded), wiped on by a scanline. */
export const BillboardImage: React.FC<{f: number}> = ({f}) => {
  if (f < C.fcnReveal || f >= C.swap) return null;
  if (!getStaticFiles().some((s) => s.name === 'assets/fcn_crop.png')) return null;
  const rise = boardRise(f);
  const dy = (1 - rise) * 520;
  const wipe = ease.cubicOut(clamp(invLerp(C.fcnReveal, C.fcnReveal + 14, f)));
  const x0 = BOARD.x - BOARD.imgW / 2;
  const y0 = BOARD.y - BOARD.imgH / 2 + dy;
  const click = f - (C.fcnReveal + 14);
  return (
    <WorldDiv f={f}>
      <div style={{position: 'absolute', left: x0, top: y0, width: BOARD.imgW, height: BOARD.imgH, overflow: 'hidden', clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`}}>
        <Img src={staticFile('assets/fcn_crop.png')} style={{width: BOARD.imgW, height: BOARD.imgH, display: 'block'}} />
        <div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 2px, rgba(0,0,0,0) 2px 5px)'}} />
        {wipe < 1 ? <div style={{position: 'absolute', top: 0, bottom: 0, left: `${wipe * 100}%`, width: 6, background: PALETTE.cyan}} /> : null}
        {click > -18 && click < 30 ? (
          <div style={{position: 'absolute', left: BOARD.imgW * 0.7, top: BOARD.imgH * 0.62}}>
            {click > 0 ? <div style={{position: 'absolute', left: -40 * clamp(click / 14), top: -40 * clamp(click / 14), width: 80 * clamp(click / 14), height: 80 * clamp(click / 14), borderRadius: '50%', border: `4px solid ${PALETTE.magenta}`, opacity: 1 - clamp(click / 20)}} /> : null}
            <svg width={44} height={52} style={{position: 'absolute', left: 60 * clamp(-click / 18), top: 70 * clamp(-click / 18), transform: `scale(${click > 0 && click < 6 ? 0.85 : 1})`, opacity: clamp((30 - click) / 8)}}>
              <path d="M4,2 L4,40 L14,30 L22,48 L30,44 L22,27 L36,27 Z" fill="#FFFFFF" stroke="#0A0A0F" strokeWidth={3} strokeLinejoin="round" />
            </svg>
          </div>
        ) : null}
      </div>
    </WorldDiv>
  );
};
