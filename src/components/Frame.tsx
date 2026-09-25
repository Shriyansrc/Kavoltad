// The container object: product frame → brief → build region → phone →
// live product → portfolio window. One element, many readings.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {COPY} from '../config/copy.ts';
import {LAYOUT} from '../config/layout.ts';
import {PALETTE, rgba} from '../config/palette.ts';
import {K} from '../config/timeline.ts';
import {FONT_MONO, FONT_SANS} from '../config/type.ts';
import {bump, clamp, ease, invLerp, settle} from '../lib/anim.ts';
import {approveCheck, frameGeo, frameKinds, liveBadge} from '../scenes/model.ts';
import {Check, IconChat} from './icons.tsx';

const mono = (size: number, spacing = '0.06em'): React.CSSProperties => ({
  fontFamily: FONT_MONO,
  fontWeight: 500,
  letterSpacing: spacing,
  fontSize: size,
});

/** Perimeter draw-on starting at the top-left corner. */
const drawRect = (w: number, h: number, p: number) => {
  const per = 2 * (w + h);
  return {strokeDasharray: `${per * p} ${per}`, strokeDashoffset: 0};
};

export const FrameObject: React.FC<{f: number; fcnAvailable: boolean}> = ({f, fcnAvailable}) => {
  const g = frameGeo(f);
  const k = frameKinds(f);
  const {w, h} = g;
  const total = k.product + k.brief + k.build + k.phone + k.live + k.portfolio;
  if (total < 0.001 || f >= K.swap) return null;

  const surfaceA = clamp(k.product + k.brief + k.phone + k.live + k.portfolio);
  const topBar = Math.max(k.product, k.live);
  const cyanBlink = bump(f, K.cyanBlink, 5);
  const badge = liveBadge(f);
  const approve = approveCheck(f);

  // Screenshot reveal inside the portfolio window.
  const vp = LAYOUT.fcnViewport;
  const vpX = vp.cx - vp.w / 2 - (g.cx - w / 2);
  const vpY = vp.cy - vp.h / 2 - (g.cy - h / 2);
  const reveal = settle(invLerp(846, 860, f));
  const labelA = ease.cubicOut(invLerp(K.proofSettle - 2, K.proofSettle + 8, f));
  const proofClick = bump(f, K.proofSettle, 6);

  const border = rgba(PALETTE.magenta, 0.25 + 0.2 * k.product * clamp(invLerp(170, 190, f)) + 0.2 * k.live + 0.15 * proofClick);
  const phoneBorder = `rgba(255,255,255,${0.22 * k.phone})`;

  return (
    <div
      style={{
        position: 'absolute',
        left: g.cx - w / 2,
        top: g.cy - h / 2,
        width: w,
        height: h,
        transform: `scale(${g.scale})`,
        transformOrigin: 'center center',
      }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {/* shadow + surface */}
        <rect x={0} y={0} width={w} height={h} fill="#0C0C13" opacity={0.92 * surfaceA} />
        {/* phone body: bezel and screen */}
        {k.phone > 0.001 ? (
          <g opacity={k.phone}>
            <rect x={0} y={0} width={w} height={h} fill="#0E0E16" />
            <rect x={8} y={8} width={w - 16} height={h - 16} fill={PALETTE.surface} />
            <rect x={w / 2 - 24} y={17} width={48} height={4} fill="rgba(255,255,255,0.22)" />
            <rect x={w / 2 - 44} y={h - 22} width={88} height={4} fill="rgba(255,255,255,0.3)" />
            <text x={w / 2} y={62} textAnchor="middle" fill={PALETTE.white} style={{fontFamily: FONT_SANS, fontWeight: 600, fontSize: 30, letterSpacing: '-0.02em'}}>
              {COPY.ui.preview}
            </text>
            <line x1={24} y1={80} x2={w - 24} y2={80} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
            {/* approval */}
            <g transform={`translate(${w / 2 - 28} ${h - 92})`}>
              <rect x={0} y={0} width={56} height={56} fill={rgba(PALETTE.magenta, 0.9 * approve)} stroke={rgba(PALETTE.magenta, 0.35 + 0.55 * approve)} strokeWidth={2} />
              <Check x={4} y={4} s={48} color={PALETTE.white} progress={approve} sw={4} />
              <rect x={-6} y={-6} width={68} height={68} fill="none" stroke={rgba(PALETTE.magenta, 0.5 * bump(f, K.approve + 6, 10))} strokeWidth={2} />
            </g>
          </g>
        ) : null}

        {/* product / live top bar */}
        {topBar > 0.001 ? (
          <g opacity={topBar}>
            <rect x={0} y={0} width={w} height={46} fill="#10101A" />
            <line x1={0} y1={46} x2={w} y2={46} stroke={rgba(PALETTE.magenta, 0.2)} strokeWidth={2} />
            {[0, 1, 2].map((j) => (
              <rect key={j} x={18 + j * 18} y={19} width={9} height={9} fill={`rgba(255,255,255,${0.18 + (j === 0 ? 0.06 : 0)})`} />
            ))}
            <rect x={w - 30} y={19} width={9} height={9} fill={PALETTE.cyan} opacity={0.15 + 0.85 * cyanBlink + 0.25 * k.live} />
          </g>
        ) : null}

        {/* LIVE badge */}
        {badge > 0.001 ? (
          <g transform={`translate(${w - 118} 8) scale(${0.85 + 0.15 * badge})`} opacity={clamp(badge) * k.live}>
            <rect x={0} y={0} width={100} height={30} fill={rgba(PALETTE.magenta, 0.16)} stroke={rgba(PALETTE.magenta, 0.85)} strokeWidth={2} />
            <rect x={12} y={11} width={8} height={8} fill={PALETTE.cyan} />
            <text x={30} y={22} fill={PALETTE.white} style={mono(18, '0.1em')}>
              {COPY.ui.live}
            </text>
          </g>
        ) : null}

        {/* brief header */}
        {k.brief > 0.001 ? (
          <g opacity={k.brief}>
            <rect x={0} y={0} width={w} height={56} fill="#10101A" />
            <line x1={0} y1={56} x2={w} y2={56} stroke={rgba(PALETTE.magenta, 0.2)} strokeWidth={2} />
            <IconChat x={20} y={14} s={28} color={rgba(PALETTE.magenta, 0.9)} />
            <rect x={62} y={20} width={150} height={8} fill="rgba(255,255,255,0.16)" />
            <rect x={62} y={34} width={96} height={6} fill="rgba(255,255,255,0.08)" />
          </g>
        ) : null}

        {/* build region: registration corners */}
        {k.build > 0.001 ? (
          <g opacity={k.build} stroke="rgba(255,255,255,0.32)" strokeWidth={2} fill="none">
            <polyline points={`0,22 0,0 22,0`} />
            <polyline points={`${w - 22},0 ${w},0 ${w},22`} />
            <polyline points={`0,${h - 22} 0,${h} 22,${h}`} />
            <polyline points={`${w - 22},${h} ${w},${h} ${w},${h - 22}`} />
          </g>
        ) : null}

        {/* portfolio window */}
        {k.portfolio > 0.001 ? (
          <g opacity={k.portfolio}>
            <rect x={0} y={0} width={w} height={40} fill="#10101A" />
            <line x1={0} y1={40} x2={w} y2={40} stroke={rgba(PALETTE.magenta, 0.2)} strokeWidth={2} />
            {[0, 1, 2].map((j) => (
              <rect key={j} x={16 + j * 17} y={15} width={9} height={9} fill="rgba(255,255,255,0.2)" />
            ))}
            <rect x={vpX - 2} y={vpY - 2} width={vp.w + 4} height={vp.h + 4} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={2} />
            <text x={vpX} y={vpY + vp.h + 52} fill={PALETTE.white} opacity={labelA} style={mono(26, '0.08em')}>
              {COPY.proof.label}
            </text>
          </g>
        ) : null}

        {/* outline: product frame draws on from the top-left corner */}
        <rect
          x={1}
          y={1}
          width={w - 2}
          height={h - 2}
          fill="none"
          stroke={k.phone > 0.5 ? phoneBorder : border}
          strokeWidth={2}
          opacity={clamp(total - k.build)}
          style={f < K.connect + 32 ? drawRect(w - 2, h - 2, ease.cubicInOut(g.draw)) : undefined}
        />
      </svg>

      {/* The genuine FCN screenshot (cropped above all price rows). */}
      {k.portfolio > 0.001 ? (
        <div
          style={{
            position: 'absolute',
            left: vpX,
            top: vpY,
            width: vp.w,
            height: vp.h,
            overflow: 'hidden',
            opacity: k.portfolio,
            clipPath: `inset(0 0 ${(1 - reveal) * 100}% 0)`,
            background: '#1a1a22',
          }}
        >
          {fcnAvailable ? (
            <Img
              src={staticFile('assets/fcn_crop.png')}
              style={{width: vp.w, height: (vp.w * 450) / 1200, display: 'block', transform: `scale(${1.04 - 0.04 * reveal})`, transformOrigin: 'top center'}}
            />
          ) : (
            <div style={{width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#ff5252', ...mono(18)}}>FCN SCREENSHOT PENDING</div>
          )}
        </div>
      ) : null}
    </div>
  );
};
