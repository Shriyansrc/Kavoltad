// The container object: product frame → brief → build region → phone →
// live product → portfolio window. One element, many readings.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {COPY} from '../config/copy.ts';
import {LAYOUT} from '../config/layout.ts';
import {PALETTE, rgba} from '../config/palette.ts';
import {K} from '../config/timeline.ts';
import {FONT_MONO, FONT_SANS} from '../config/type.ts';
import {bump, clamp, ease, invLerp, lerp, spring01, SPR} from '../lib/anim.ts';
import {approveCheck, frameGeo, frameKinds, liveBadge, lockClose} from '../scenes/stage.ts';
import {Check, IconChat} from './icons.tsx';

const mono = (size: number, spacing = '0.06em'): React.CSSProperties => ({fontFamily: FONT_MONO, fontWeight: 500, letterSpacing: spacing, fontSize: size});

const drawRect = (w: number, h: number, p: number) => {
  const per = 2 * (w + h);
  return {strokeDasharray: `${per * p} ${per}`, strokeDashoffset: 0};
};

const Lock: React.FC<{x: number; y: number; closed: number; f: number}> = ({x, y, closed, f}) => {
  const lift = (1 - clamp(closed)) * 7;
  const flash = bump(f, 336, 8);
  return (
    <g transform={`translate(${x} ${y}) scale(${1 + 0.18 * flash})`}>
      <rect x={-13} y={-2} width={26} height={20} fill={rgba(PALETTE.magenta, 0.25 + 0.7 * clamp(closed))} stroke={PALETTE.magenta} strokeWidth={2} />
      <path d={`M-8 ${-2 - lift} V${-10 - lift} A8 8 0 0 1 8 ${-10 - lift} V${-2 - lift * (closed < 0.5 ? 1.6 : 1)}`} fill="none" stroke={PALETTE.magenta} strokeWidth={2.5} />
    </g>
  );
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
  const vp = LAYOUT.fcnViewport;
  const vpX = vp.cx - vp.w / 2 - (g.cx - w / 2);
  const vpY = vp.cy - vp.h / 2 - (g.cy - h / 2);
  const reveal = ease.cubicOut(invLerp(850, 862, f));
  const labelP = spring01(f - K.proofSettle, SPR.pop);
  const kb = invLerp(850, 960, f); // Ken Burns drift across the screenshot
  const border = rgba(PALETTE.magenta, 0.3 + 0.25 * k.product * clamp(invLerp(170, 190, f)) + 0.3 * k.live + 0.3 * bump(f, K.proofSettle, 8));

  return (
    <div
      style={{
        position: 'absolute',
        left: g.cx - w / 2,
        top: g.cy - h / 2,
        width: w,
        height: h,
        transform: `perspective(1400px) rotateY(${g.ry}deg) scale(${g.scale})`,
        transformOrigin: 'center center',
        backfaceVisibility: 'hidden',
      }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <rect x={0} y={0} width={w} height={h} fill="#0C0C14" opacity={0.94 * surfaceA} />
        {k.phone > 0.001 ? (
          <g opacity={k.phone}>
            <rect x={0} y={0} width={w} height={h} fill="#0E0E17" />
            <rect x={8} y={8} width={w - 16} height={h - 16} fill={PALETTE.surface} />
            <rect x={w / 2 - 24} y={16} width={48} height={4} fill="rgba(255,255,255,0.22)" />
            <rect x={w / 2 - 44} y={h - 22} width={88} height={4} fill="rgba(255,255,255,0.3)" />
            <text x={w / 2} y={62} textAnchor="middle" fill={PALETTE.white} style={{fontFamily: FONT_SANS, fontWeight: 600, fontSize: 30, letterSpacing: '-0.02em'}}>
              {COPY.ui.preview}
            </text>
            <line x1={24} y1={80} x2={w - 24} y2={80} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
            <g transform={`translate(${w / 2} ${h - 64}) rotate(${-12 * (1 - clamp(approve))}) scale(${lerp(1.7, 1, clamp(approve)) * (approve > 0 ? 1 : 0.0001)})`}>
              <rect x={-30} y={-30} width={60} height={60} fill={PALETTE.magenta} opacity={clamp(approve * 1.4)} />
              <Check x={-26} y={-26} s={52} color={PALETTE.white} progress={clamp(approve)} sw={5} />
            </g>
            {[0, 1].map((n) => {
              const t = invLerp(K.approve + n * 6, K.approve + 26 + n * 6, f);
              if (t <= 0 || t >= 1) return null;
              const r = 34 + 70 * ease.cubicOut(t);
              return <rect key={n} x={w / 2 - r} y={h - 64 - r} width={2 * r} height={2 * r} fill="none" stroke={rgba(PALETTE.magenta, 0.7 * (1 - t))} strokeWidth={2} />;
            })}
          </g>
        ) : null}

        {topBar > 0.001 ? (
          <g opacity={topBar}>
            <rect x={0} y={0} width={w} height={46} fill="#11111C" />
            <line x1={0} y1={46} x2={w} y2={46} stroke={rgba(PALETTE.magenta, 0.22)} strokeWidth={2} />
            {[0, 1, 2].map((j) => (
              <rect key={j} x={18 + j * 18} y={19} width={9} height={9} fill={`rgba(255,255,255,${0.2 + (j === 0 ? 0.06 : 0)})`} />
            ))}
            <rect x={w - 30} y={19} width={9} height={9} fill={PALETTE.cyan} opacity={0.15 + 0.85 * cyanBlink + 0.25 * k.live} />
          </g>
        ) : null}

        {badge > 0.001 && k.live > 0.001 ? (
          <g opacity={k.live}>
            {[0, 1, 2].map((n) => {
              const t = ((f - K.live - n * 14) % 42) / 42;
              if (f < K.live + n * 14 || f > 830) return null;
              const r = 18 + 60 * t;
              return <circle key={n} cx={w - 68} cy={23} r={r} fill="none" stroke={rgba(PALETTE.magenta, 0.5 * (1 - t))} strokeWidth={2} />;
            })}
            <g transform={`translate(${w - 68} 23) scale(${clamp(badge, 0, 1.4)})`}>
              <rect x={-50} y={-15} width={100} height={30} fill={rgba(PALETTE.magenta, 0.22)} stroke={PALETTE.magenta} strokeWidth={2} />
              <circle cx={-32} cy={0} r={5} fill={PALETTE.cyan} />
              <text x={-18} y={7} fill={PALETTE.white} style={mono(19, '0.12em')}>
                {COPY.ui.live}
              </text>
            </g>
          </g>
        ) : null}

        {k.brief > 0.001 ? (
          <g opacity={k.brief}>
            <rect x={0} y={0} width={w} height={56} fill="#11111C" />
            <line x1={0} y1={56} x2={w} y2={56} stroke={rgba(PALETTE.magenta, 0.22)} strokeWidth={2} />
            <IconChat x={20} y={14} s={28} color={PALETTE.magenta} />
            <rect x={62} y={20} width={150} height={8} fill="rgba(255,255,255,0.18)" />
            <rect x={62} y={34} width={96} height={6} fill="rgba(255,255,255,0.09)" />
            <Lock x={w - 36} y={26} closed={lockClose(f)} f={f} />
          </g>
        ) : null}

        {k.build > 0.001 ? (
          <g opacity={k.build} stroke="rgba(255,255,255,0.36)" strokeWidth={2} fill="none">
            <polyline points={`0,24 0,0 24,0`} />
            <polyline points={`${w - 24},0 ${w},0 ${w},24`} />
            <polyline points={`0,${h - 24} 0,${h} 24,${h}`} />
            <polyline points={`${w - 24},${h} ${w},${h} ${w},${h - 24}`} />
          </g>
        ) : null}

        {k.portfolio > 0.001 ? (
          <g>
            <rect x={0} y={0} width={w} height={40} fill="#11111C" />
            <line x1={0} y1={40} x2={w} y2={40} stroke={rgba(PALETTE.magenta, 0.22)} strokeWidth={2} />
            {[0, 1, 2].map((j) => (
              <rect key={j} x={16 + j * 17} y={15} width={9} height={9} fill="rgba(255,255,255,0.22)" />
            ))}
            <rect x={vpX - 2} y={vpY - 2} width={vp.w + 4} height={vp.h + 4} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={2} />
            <g transform={`translate(${vpX} ${vpY + vp.h + 30}) scale(${clamp(labelP, 0, 1.2)})`} opacity={clamp(labelP * 2)}>
              <rect x={0} y={0} width={236} height={42} fill={rgba(PALETTE.magenta, 0.16)} stroke={rgba(PALETTE.magenta, 0.8)} strokeWidth={2} />
              <text x={16} y={29} fill={PALETTE.white} style={mono(24, '0.08em')}>
                {COPY.proof.label}
              </text>
            </g>
          </g>
        ) : null}

        <rect
          x={1}
          y={1}
          width={w - 2}
          height={h - 2}
          fill="none"
          stroke={k.phone > 0.5 ? `rgba(255,255,255,${0.26 * k.phone})` : border}
          strokeWidth={2}
          opacity={clamp(total - k.build)}
          style={f < K.connect + 28 ? drawRect(w - 2, h - 2, g.draw) : undefined}
        />
      </svg>

      {k.portfolio > 0.001 ? (
        <div
          style={{
            position: 'absolute',
            left: vpX,
            top: vpY,
            width: vp.w,
            height: vp.h,
            overflow: 'hidden',
            clipPath: `inset(0 0 ${(1 - reveal) * 100}% 0)`,
            background: '#1a1a22',
          }}
        >
          {fcnAvailable ? (
            <Img
              src={staticFile('assets/fcn_crop.png')}
              style={{width: vp.w, height: (vp.w * 450) / 1200, display: 'block', transform: `scale(${1.08 - 0.06 * kb}) translate(${-8 + 12 * kb}px, ${4 - 6 * kb}px)`, transformOrigin: 'center center'}}
            />
          ) : null}
          {/* glare sweep as the proof lands */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(105deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 65%)`,
              transform: `translateX(${lerp(-110, 110, ease.cubicInOut(invLerp(854, 880, f)))}%)`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
};
