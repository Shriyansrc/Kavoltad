// Kinetic type. Words spring in (rise, scale, un-blur), hold perfectly still
// once settled, and leave with a quick staggered lift. Never inside the camera
// push or motion blur.
import React from 'react';
import {COPY} from '../config/copy.ts';
import {LAYOUT} from '../config/layout.ts';
import {PALETTE, rgba} from '../config/palette.ts';
import {K} from '../config/timeline.ts';
import {TYPE} from '../config/type.ts';
import {clamp, ease, invLerp, lerp, noise1, SPR, spring01, type SpringCfg} from '../lib/anim.ts';
import {IconChat, IconKey} from './icons.tsx';
import {FIT} from './textFit.ts';

type Word = {text: string; color?: string};

const head = (size: number, spacing: string): React.CSSProperties => ({...TYPE.headline, fontSize: size, letterSpacing: spacing, color: PALETTE.white});

/** One line of words with per-word spring entrances and a staggered exit. */
const Words: React.FC<{
  f: number;
  words: Word[];
  at: number;
  stagger?: number;
  exitAt?: number;
  top: number;
  left?: number;
  style: React.CSSProperties;
  cfg?: SpringCfg;
  rise?: number;
  jitter?: number;
  spaced?: boolean;
  exitStagger?: number;
}> = ({f, words, at, stagger = 3, exitAt, top, left = 130, style, cfg = SPR.pop, rise = 44, jitter = 0, spaced = true, exitStagger = 2}) => (
  <div style={{position: 'absolute', left, top, whiteSpace: 'nowrap', ...style}}>
    {words.map((w, i) => {
      const p = at < 0 ? 1 : spring01(f - (at + i * stagger), cfg);
      const x = exitAt === undefined ? 0 : ease.cubicIn(invLerp(exitAt + i * exitStagger, exitAt + i * exitStagger + 7, f));
      const o = clamp(p * 2.2) * (1 - x);
      if (o <= 0.001) return <span key={i} style={{display: 'inline-block', opacity: 0}}>{w.text}{spaced && i < words.length - 1 ? ' ' : ''}</span>;
      const j = jitter > 0 ? jitter : 0;
      const jx = j * noise1(Math.floor(f / 3) * 1.7, i * 13);
      const jy = j * noise1(Math.floor(f / 3) * 1.3, i * 17 + 5);
      const jr = j * 0.8 * noise1(Math.floor(f / 3) * 2.1, i * 19 + 9);
      return (
        <span
          key={i}
          style={{
            display: 'inline-block',
            color: w.color,
            opacity: o,
            transform: `translate(${jx}px, ${(1 - p) * rise - x * 40 + jy}px) scale(${lerp(0.82, 1, clamp(p, 0, 1.2))}) rotate(${(1 - clamp(p)) * -5 + jr}deg)`,
            transformOrigin: '50% 80%',
            filter: p < 0.7 ? `blur(${(0.7 - p) * 10}px)` : undefined,
          }}
        >
          {w.text}
          {spaced && i < words.length - 1 ? ' ' : ''}
        </span>
      );
    })}
  </div>
);

const split = (s: string, color?: string): Word[] => s.split(' ').map((text) => ({text, color}));

/** Day chip that flips between days like a split-flap. */
const DayChip: React.FC<{f: number}> = ({f}) => {
  const days = [
    {text: COPY.scope.day, at: 300, until: 420},
    {text: COPY.build.day, at: 420, until: 600},
    {text: COPY.review.day, at: 600, until: 720},
    {text: COPY.launch.day, at: 720, until: 832},
  ];
  const cur = days.find((d) => f >= d.at && f < d.until + (d.at === 720 ? 0 : 0));
  if (!cur || f >= 840) return null;
  const idx = days.indexOf(cur);
  const flip = spring01(f - cur.at, SPR.snappy);
  const enter = idx === 0 ? spring01(f - cur.at, SPR.pop) : 1;
  const exit = ease.cubicIn(invLerp(828, 838, f));
  const width = 30 + cur.text.length * 20.4 + 34;
  return (
    <div
      style={{
        position: 'absolute',
        left: 130,
        top: LAYOUT.dayLabel.y + 2,
        height: 46,
        width,
        transformOrigin: '0% 50%',
        transform: `perspective(600px) rotateX(${(1 - clamp(flip)) * 80}deg) scale(${lerp(0.6, 1, clamp(enter, 0, 1.2))})`,
        opacity: clamp(enter * 2) * (1 - exit),
        background: rgba(PALETTE.magenta, 0.14),
        outline: `2px solid ${PALETTE.magenta}`,
        outlineOffset: -2,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        paddingLeft: 14,
        boxSizing: 'border-box',
        ...TYPE.mono,
        fontSize: TYPE.size.dayLabel,
        color: PALETTE.white,
        lineHeight: 1,
        boxShadow: `0 0 24px ${rgba(PALETTE.magenta, 0.25)}`,
      }}
    >
      <span style={{width: 10, height: 10, background: PALETTE.magenta, display: 'inline-block'}} />
      {cur.text}
    </div>
  );
};

const SupportLine: React.FC<{f: number; text: string; at: number; exitAt: number; icon: 'chat' | 'phone' | 'key'}> = ({f, text, at, exitAt, icon}) => {
  const p = spring01(f - at, SPR.snappy);
  const x = ease.cubicIn(invLerp(exitAt, exitAt + 8, f));
  const o = clamp(p * 2) * (1 - x);
  if (o <= 0.001) return null;
  const size = TYPE.size.support;
  return (
    <div
      style={{
        position: 'absolute',
        left: 130,
        top: LAYOUT.support.y + 18,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        opacity: o,
        transform: `translateX(${(1 - p) * -60 + x * -30}px)`,
        ...TYPE.support,
        fontSize: size,
        color: PALETTE.text72,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      <svg width={40} height={40} style={{flex: 'none'}}>
        {icon === 'chat' ? <IconChat x={2} y={2} s={36} color={PALETTE.magenta} /> : null}
        {icon === 'key' ? <IconKey x={2} y={2} s={36} color={PALETTE.magenta} /> : null}
        {icon === 'phone' ? (
          <g fill="none" stroke={PALETTE.magenta} strokeWidth={2.5}>
            <rect x={10} y={3} width={20} height={34} />
            <line x1={16} y1={32} x2={24} y2={32} />
          </g>
        ) : null}
      </svg>
      {text}
    </div>
  );
};

export const TextLayer: React.FC<{f: number}> = ({f}) => {
  if (f >= K.swap) return null;
  const H = LAYOUT.headline;
  const lh = (size: number) => size * 0.96;
  const chaosJitter = f < K.connect ? 2.2 : 0;
  const underline = ease.cubicOut(invLerp(164, 180, f)) * (1 - ease.cubicIn(invLerp(290, 298, f)));
  const shipSlam = spring01(f - 840, {freq: 3, damping: 0.5});
  return (
    <>
      {/* Shot 1 — readable on frame 0, visibly unstable */}
      <Words f={f} words={split(COPY.chaos.headline[0])} at={-1} exitAt={K.connect - 8} top={H.y} style={head(TYPE.size.opening, FIT.opening)} jitter={chaosJitter * 0.5} />
      <Words
        f={f}
        words={COPY.chaos.headline[1].split('').map((c) => ({text: c}))}
        stagger={0}
        at={-1}
        exitAt={K.connect - 7}
        exitStagger={0.6}
        top={H.y + lh(TYPE.size.opening)}
        style={head(TYPE.size.opening, FIT.opening)}
        jitter={chaosJitter}
        spaced={false}
      />

      {/* Shot 2 — word by word, fully readable by 162 */}
      <Words f={f} words={split(COPY.solution.top)} at={K.connect} stagger={2} exitAt={286} top={H.y} style={head(TYPE.size.solutionTop, FIT.solutionTop)} />
      <Words
        f={f}
        words={[{text: COPY.solution.bottomLead.trim()}, {text: '7', color: PALETTE.magenta}, {text: 'DAYS.', color: PALETTE.magenta}]}
        at={K.connect + 1}
        stagger={2}
        exitAt={288}
        top={H.y + lh(TYPE.size.solutionTop) + 4}
        style={head(TYPE.size.solutionBottom, FIT.solutionBottom)}
        rise={60}
      />
      {underline > 0.001 ? (
        <div style={{position: 'absolute', left: 130 + 108, top: H.y + lh(TYPE.size.solutionTop) + 4 + 96, width: 316 * underline, height: 6, background: PALETTE.magenta, boxShadow: `0 0 18px ${rgba(PALETTE.magenta, 0.7)}`}} />
      ) : null}

      {/* Shots 3–6 */}
      <DayChip f={f} />
      <Words f={f} words={split(COPY.scope.title)} at={302} stagger={4} exitAt={410} top={LAYOUT.processTitle.y} style={head(TYPE.size.stage, FIT.stage['DAY 01'])} />
      <Words f={f} words={split(COPY.build.title)} at={420} stagger={4} exitAt={594} top={LAYOUT.processTitle.y} style={head(TYPE.size.stage, FIT.stage['DAYS 02 TO 05'])} />
      <Words f={f} words={split(COPY.review.title)} at={600} stagger={4} exitAt={712} top={LAYOUT.processTitle.y} style={head(TYPE.size.stage, FIT.stage['DAY 06'])} />
      <Words f={f} words={split(COPY.launch.title)} at={720} stagger={4} exitAt={832} top={LAYOUT.processTitle.y} style={head(TYPE.size.stage, FIT.stage['DAY 07'])} />
      <SupportLine f={f} text={COPY.scope.support} at={306} exitAt={410} icon="chat" />
      <SupportLine f={f} text={COPY.review.support} at={606} exitAt={712} icon="phone" />
      <SupportLine f={f} text={COPY.launch.support} at={K.live - 12} exitAt={832} icon="key" />

      {/* Shot 7 — SHIPPED slams, then NOT MOCKED UP. */}
      {f >= 840 ? (
        <div
          style={{
            position: 'absolute',
            left: 130,
            top: H.y,
            ...head(TYPE.size.main, FIT.proof),
            transformOrigin: '0% 100%',
            transform: `scale(${lerp(1.7, 1, clamp(shipSlam, 0, 1.15))})`,
            opacity: clamp(shipSlam * 3),
            whiteSpace: 'nowrap',
          }}
        >
          {COPY.proof.headline[0]}
        </div>
      ) : null}
      <Words f={f} words={split(COPY.proof.headline[1])} at={842} stagger={2} top={H.y + lh(TYPE.size.main)} style={head(TYPE.size.main, FIT.proof)} />
    </>
  );
};
