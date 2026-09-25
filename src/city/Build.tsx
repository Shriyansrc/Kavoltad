// Build and launch: the three holograms fly to a hub above the gym and merge
// into one product on a phone; Kavey conducts a stream of parts into it
// (days 02–05), the private preview is approved (day 06), and on day 07 it
// goes LIVE, rockets up and bursts into fireworks over a city that lights up.
import React from 'react';
import {PALETTE, rgba} from '../config/palette.ts';
import {FONT_MONO, FONT_SANS, TYPE} from '../config/type.ts';
import {bump, clamp, ease, invLerp, lerp, SPR, spring01} from '../lib/anim.ts';
import {hash01} from '../lib/random.ts';
import {C, COPY2} from './config.ts';
import {cityAnchorWorld} from './kavey.ts';
import {Burst, holoPlace, Sparkles} from './Props.tsx';
import {HUB, hubLift} from './story.ts';
import {Layer} from './world/Layer.tsx';

const WHITE = '#FFFFFF';

const phoneState = (f: number) => {
  const born = spring01(f - C.holoMerge, SPR.pop);
  const lift = hubLift(f);
  const shake = f > C.launch + 8 && f < C.launch + 24 ? 3 * Math.sin(f * 3.1) : 0;
  return {x: HUB.x + shake, y: HUB.y - lift * 1500 - 6 * Math.sin((f - C.holoMerge) * 0.07), s: clamp(born, 0, 1.25) * (1 - 0.3 * lift), lift};
};

const Module: React.FC<{i: number; y: number; w: number; built: number}> = ({i, y, w, built}) => {
  const h = 150;
  const x0 = -w / 2;
  const solid = clamp(built);
  return (
    <g transform={`translate(0, ${y})`}>
      <rect x={x0} y={-h / 2} width={w} height={h} rx={16} fill={rgba(PALETTE.violet, 0.12 + 0.2 * solid)} stroke={rgba(PALETTE.cyan, 0.3 + 0.5 * solid)} strokeWidth={2.5} strokeDasharray={solid < 1 ? '8 6' : undefined} />
      <g opacity={0.35 + 0.65 * solid}>
        {i === 0 ? (
          <g>
            <text x={x0 + 16} y={-h / 2 + 30} fontFamily={FONT_MONO} fontWeight={700} fontSize={17} letterSpacing="0.08em" fill={WHITE}>
              {COPY2.ui.booking}
            </text>
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <rect key={k} x={x0 + 16 + (k % 3) * ((w - 32) / 3)} y={-h / 2 + 46 + Math.floor(k / 3) * 44} width={(w - 32) / 3 - 8} height={36} rx={8} fill={k === 1 || k === 3 || k === 5 ? rgba(PALETTE.magenta, 0.75) : rgba(WHITE, 0.14)} />
            ))}
          </g>
        ) : i === 1 ? (
          <g>
            <text x={x0 + 16} y={-h / 2 + 30} fontFamily={FONT_MONO} fontWeight={700} fontSize={17} letterSpacing="0.08em" fill={WHITE}>
              {COPY2.ui.payments}
            </text>
            {[0, 1].map((k) => (
              <g key={k} transform={`translate(0, ${-h / 2 + 64 + k * 46})`}>
                <circle cx={x0 + 30} cy={0} r={12} fill={rgba(PALETTE.magenta, 0.7)} />
                <rect x={x0 + 52} y={-5} width={90} height={9} rx={4} fill={rgba(WHITE, 0.5)} />
                <rect x={w / 2 - 92} y={-15} width={76} height={30} rx={15} fill={rgba(PALETTE.cyan, 0.15)} stroke={PALETTE.cyan} strokeWidth={2.5} />
                <text x={w / 2 - 54} y={6} textAnchor="middle" fontFamily={FONT_MONO} fontWeight={700} fontSize={15} fill={WHITE}>
                  {COPY2.ui.paid}
                </text>
              </g>
            ))}
          </g>
        ) : (
          <g>
            <text x={x0 + 16} y={-h / 2 + 30} fontFamily={FONT_MONO} fontWeight={700} fontSize={17} letterSpacing="0.08em" fill={WHITE}>
              {COPY2.ui.whatsapp}
            </text>
            <rect x={x0 + 16} y={-h / 2 + 46} width={w * 0.62} height={38} rx={14} fill={rgba(WHITE, 0.92)} />
            <text x={x0 + 30} y={-h / 2 + 71} fontFamily={FONT_MONO} fontWeight={700} fontSize={15} letterSpacing="0.05em" fill="#1A1024">
              {COPY2.ui.reminder}
            </text>
            <rect x={w / 2 - 16 - w * 0.4} y={-h / 2 + 94} width={w * 0.4} height={34} rx={14} fill={rgba(PALETTE.magenta, 0.7)} />
          </g>
        )}
      </g>
      {solid < 1 && solid > 0 ? <rect x={x0} y={-h / 2 + h * solid - 3} width={w} height={5} fill={PALETTE.cyan} opacity={0.9} /> : null}
    </g>
  );
};

const Phone: React.FC<{f: number}> = ({f}) => {
  if (f < C.holoMerge - 2 || f > C.launch + 60) return null;
  const p = phoneState(f);
  if (p.s <= 0.001) return null;
  const W = HUB.w;
  const Hh = HUB.h;
  const sw = W - 36;
  // Construction: modules solidify through days 02–05.
  const built = (i: number) => clamp(invLerp(C.day2 + 6 + i * 22, C.day2 + 40 + i * 22, f));
  const progress = clamp(invLerp(C.day2, C.day7 + 10, f));
  const preview = spring01(f - C.day6, SPR.pop) * (1 - ease.cubicIn(invLerp(C.day7 - 4, C.day7 + 4, f)));
  const approved = spring01(f - (C.day6 + 24), SPR.pop);
  const live = spring01(f - C.launch, SPR.pop);
  const glow = 0.4 + 0.6 * bump(f, C.launch + 2, 16) + 0.4 * bump(f, C.holoMerge + 2, 14);
  const flame = p.lift > 0 ? clamp(invLerp(C.launch + 16, C.launch + 24, f)) : 0;
  return (
    <g transform={`translate(${p.x}, ${p.y}) scale(${p.s})`}>
      {flame > 0 ? (
        <g>
          <path d={`M-70,${Hh / 2 - 10} Q0,${Hh / 2 + 420 * flame} 70,${Hh / 2 - 10} Z`} fill={rgba(PALETTE.magenta, 0.55)} filter="url(#neon)" />
          <path d={`M-36,${Hh / 2 - 10} Q0,${Hh / 2 + 260 * flame} 36,${Hh / 2 - 10} Z`} fill={rgba(WHITE, 0.85)} />
        </g>
      ) : null}
      <rect x={-W / 2 - 14} y={-Hh / 2 - 14} width={W + 28} height={Hh + 28} rx={56} fill={rgba(PALETTE.magenta, 0.25 * glow)} filter="url(#neon)" />
      <rect x={-W / 2} y={-Hh / 2} width={W} height={Hh} rx={48} fill="#0E0B19" stroke={PALETTE.magenta} strokeWidth={6} />
      <rect x={-sw / 2} y={-Hh / 2 + 20} width={sw} height={Hh - 40} rx={32} fill="#15112A" />
      <rect x={-40} y={-Hh / 2 + 30} width={80} height={14} rx={7} fill="#0E0B19" />
      {/* app bar + progress */}
      <rect x={-sw / 2 + 18} y={-Hh / 2 + 62} width={sw - 36} height={10} rx={5} fill={rgba(WHITE, 0.1)} />
      <rect x={-sw / 2 + 18} y={-Hh / 2 + 62} width={(sw - 36) * progress} height={10} rx={5} fill={PALETTE.magenta} />
      {[0, 1, 2].map((i) => (
        <Module key={i} i={i} y={-Hh / 2 + 172 + i * 160} w={sw - 36} built={f < C.day2 ? 0.02 : built(i)} />
      ))}
      {/* private preview banner, approved on day 06 */}
      {preview > 0.01 ? (
        <g transform={`translate(0, ${-Hh / 2 + 108}) scale(${clamp(preview, 0, 1.15)})`}>
          <rect x={-sw / 2 + 12} y={-22} width={sw - 24} height={44} rx={22} fill={PALETTE.violet} />
          <text x={-10} y={8} textAnchor="middle" fontFamily={FONT_MONO} fontWeight={700} fontSize={19} letterSpacing="0.06em" fill={WHITE}>
            {COPY2.ui.preview}
          </text>
          <g transform={`translate(${sw / 2 - 40}, 0) scale(${clamp(approved, 0, 1.2)})`}>
            <circle r={16} fill={PALETTE.cyan} />
            <path d="M-7,0 L-2,6 L8,-6" fill="none" stroke="#0E0B19" strokeWidth={4} strokeLinecap="round" />
          </g>
        </g>
      ) : null}
      {/* LIVE */}
      {live > 0.01 ? (
        <g transform={`translate(0, ${-Hh / 2 - 40}) scale(${clamp(live, 0, 1.2)})`}>
          {[0, 1].map((k) => {
            const t = ((f - C.launch + k * 20) % 40) / 40;
            return <rect key={k} x={-80 - 50 * t} y={-30 - 18 * t} width={160 + 100 * t} height={60 + 36 * t} rx={30 + 18 * t} fill="none" stroke={PALETTE.magenta} strokeWidth={4} opacity={1 - t} />;
          })}
          <rect x={-80} y={-30} width={160} height={60} rx={30} fill={PALETTE.magenta} />
          <circle cx={-44} cy={0} r={9} fill={WHITE} opacity={0.6 + 0.4 * Math.sin(f * 0.4)} />
          <text x={14} y={13} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={800} fontSize={36} letterSpacing="0.04em" fill={WHITE}>
            {COPY2.ui.live}
          </text>
        </g>
      ) : null}
    </g>
  );
};

/** Light trails behind the holograms as they fly to the hub. */
const HoloTrails: React.FC<{f: number}> = ({f}) => {
  if (f < C.holoRise || f > C.holoMerge + 2) return null;
  return (
    <g>
      {[0, 1, 2].map((i) => {
        const pts = Array.from({length: 10}, (_, k) => holoPlace(i, f - k * 1.5));
        return (
          <g key={i}>
            {pts.slice(1).map((q, k) => (
              <line key={k} x1={pts[k].x} y1={pts[k].y} x2={q.x} y2={q.y} stroke={rgba(i === 1 ? PALETTE.violet : PALETTE.magenta, 0.5 * (1 - k / 9))} strokeWidth={60 * (1 - k / 9) * pts[k].s} strokeLinecap="round" />
            ))}
          </g>
        );
      })}
    </g>
  );
};

/** Parts streaming from Kavey's raised hand into the phone while he conducts the build. */
const PartsStream: React.FC<{f: number}> = ({f}) => {
  if (f < C.day2 || f > C.day6 + 10) return null;
  const out: React.ReactNode[] = [];
  for (let k = 0; k < 22; k++) {
    const t0 = C.day2 + 4 + k * 3.6;
    const u = invLerp(t0, t0 + 16, f);
    if (u <= 0 || u >= 1) continue;
    const from = cityAnchorWorld(t0, 'handLTip');
    const to = {x: HUB.x - 120 + hash01(k, 1) * 240, y: HUB.y - 200 + hash01(k, 2) * 460};
    const e = ease.cubicInOut(u);
    const x = lerp(from.x, to.x, e);
    const y = lerp(from.y, to.y, e) - Math.sin(Math.PI * e) * 120;
    const s = 16 * (1 - 0.5 * e);
    out.push(<rect key={k} x={x - s / 2} y={y - s / 2} width={s} height={s} rx={3} fill={k % 3 === 0 ? PALETTE.cyan : k % 3 === 1 ? PALETTE.magenta : WHITE} transform={`rotate(${f * 12 + k * 40}, ${x}, ${y})`} />);
  }
  return <g>{out}</g>;
};

/** A ring of light expanding from the hub at launch. */
const LightWave: React.FC<{f: number}> = ({f}) => {
  const t = f - C.launch;
  if (t < 0 || t > 60) return null;
  const r = 60 + 2600 * ease.cubicOut(t / 60);
  const a = 1 - ease.quadIn(t / 60);
  return (
    <g filter="url(#neon)">
      <circle cx={HUB.x} cy={HUB.y} r={r} fill="none" stroke={rgba(PALETTE.violet, 0.22 * a)} strokeWidth={90 * a} />
      <circle cx={HUB.x} cy={HUB.y} r={r * 0.94} fill="none" stroke={rgba(PALETTE.magenta, 0.35 * a)} strokeWidth={6} />
    </g>
  );
};

export const BuildLayer: React.FC<{f: number}> = ({f}) =>
  f >= C.holoRise && f < C.launch + 70 ? (
    <Layer f={f} p={1}>
      <HoloTrails f={f} />
      <LightWave f={f} />
      <Phone f={f} />
      <PartsStream f={f} />
      <Burst f={f} at={C.holoMerge} x={HUB.x} y={HUB.y} size={1.6} color={PALETTE.magenta} />
      <Sparkles f={f} at={C.day6 + 24} x={HUB.x + 140} y={HUB.y - 230} n={8} spread={90} seed={71} />
      <Sparkles f={f} at={C.launch} x={HUB.x} y={HUB.y - 380} n={12} spread={200} seed={72} />
    </Layer>
  ) : null;

// ------------------------------------------------------------------ fireworks (sky, p = 0.8)
const SHOTS = [
  {at: C.launch + 30, x: 1400, y: -40, c: PALETTE.magenta},
  {at: C.launch + 38, x: 2080, y: 60, c: PALETTE.cyan},
  {at: C.launch + 48, x: 1740, y: -200, c: WHITE},
  {at: C.launch + 58, x: 1180, y: 200, c: PALETTE.violet},
  {at: C.launch + 66, x: 2300, y: -120, c: PALETTE.magenta},
  {at: C.launch + 80, x: 1600, y: 120, c: PALETTE.cyan},
];

export const Fireworks: React.FC<{f: number}> = ({f}) => {
  if (f < C.launch + 10 || f > C.launch + 170) return null;
  return (
    <Layer f={f} p={0.8}>
      {SHOTS.map((s, i) => {
        const rise = invLerp(s.at - 16, s.at, f);
        const t = f - s.at;
        const out: React.ReactNode[] = [];
        if (rise > 0 && rise < 1) {
          const y = lerp(1300, s.y, ease.cubicOut(rise));
          out.push(<line key="r" x1={s.x} y1={y} x2={s.x} y2={y + 70} stroke={rgba(WHITE, 0.8)} strokeWidth={5} strokeLinecap="round" />);
        }
        if (t >= 0 && t < 70) {
          for (let k = 0; k < 26; k++) {
            const a = (k / 26) * Math.PI * 2 + hash01(i, k) * 0.2;
            const sp = 5.4 + 2.4 * hash01(i, k, 1);
            const d = sp * 40 * (1 - Math.exp(-t / 14));
            const px = s.x + Math.cos(a) * d;
            const py = s.y + Math.sin(a) * d + 0.05 * t * t;
            const o = 1 - clamp((t - 20) / 50);
            out.push(<circle key={k} cx={px} cy={py} r={5 * (1 - t / 90)} fill={k % 4 === 0 ? WHITE : s.c} opacity={o} />);
            if (t < 30) out.push(<line key={`l${k}`} x1={s.x + Math.cos(a) * d * 0.7} y1={s.y + Math.sin(a) * d * 0.7 + 0.05 * t * t} x2={px} y2={py} stroke={s.c} strokeWidth={3} opacity={o * 0.6} />);
          }
          out.push(<circle key="flash" cx={s.x} cy={s.y} r={60} fill={rgba(s.c, 0.35 * (1 - clamp(t / 8)))} />);
        }
        return <g key={i}>{out}</g>;
      })}
    </Layer>
  );
};

// ------------------------------------------------------------------ day chips (screen)
export const DayChips: React.FC<{f: number; top: number}> = ({f, top}) => {
  const days = COPY2.days;
  const idx = days.findIndex((d, i) => f >= d.at && (i === days.length - 1 || f < days[i + 1].at));
  if (idx < 0 || f >= 1432) return null;
  const cur = days[idx];
  const flip = spring01(f - cur.at, SPR.snappy);
  const enter = idx === 0 ? spring01(f - cur.at, SPR.pop) : 1;
  const exit = ease.cubicIn(invLerp(1422, 1432, f));
  return (
    <div
      style={{
        position: 'absolute',
        left: 130,
        top,
        display: 'flex',
        alignItems: 'center',
        height: 50,
        padding: '0 18px 0 14px',
        gap: 12,
        transformOrigin: '0% 50%',
        transform: `perspective(600px) rotateX(${(1 - clamp(flip)) * 80}deg) scale(${lerp(0.6, 1, clamp(enter, 0, 1.2))})`,
        opacity: clamp(enter * 2) * (1 - exit),
        background: rgba(PALETTE.background, 0.78),
        outline: `2px solid ${PALETTE.magenta}`,
        outlineOffset: -2,
        boxShadow: `0 0 24px ${rgba(PALETTE.magenta, 0.3)}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{width: 12, height: 12, background: PALETTE.magenta, display: 'inline-block'}} />
      <span style={{...TYPE.mono, fontSize: 24, color: PALETTE.white, lineHeight: 1}}>{cur.day}</span>
      <span style={{...TYPE.headline, fontSize: 26, color: PALETTE.magenta, lineHeight: 1, letterSpacing: '0.01em'}}>{cur.what}</span>
    </div>
  );
};
