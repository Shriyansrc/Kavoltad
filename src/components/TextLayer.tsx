// All story type. Never inside the camera push or motion blur; entrances are
// 12 frames with at most 24 px of travel, then text holds perfectly still.
import React from 'react';
import {COPY} from '../config/copy.ts';
import {LAYOUT} from '../config/layout.ts';
import {PALETTE} from '../config/palette.ts';
import {K} from '../config/timeline.ts';
import {TYPE} from '../config/type.ts';
import {ease, invLerp, settle} from '../lib/anim.ts';
import {FIT} from './textFit.ts';

type LineProps = {
  f: number;
  enter: number;
  exit?: number;
  top: number;
  left?: number;
  width?: number;
  align?: 'left' | 'center';
  style: React.CSSProperties;
  children: React.ReactNode;
  travel?: number;
  exitDur?: number;
  fadeDelay?: number; // opacity starts this many frames after the move begins
};

/** A single line of type with an enter (12 f, ≤24 px) and optional exit (8 f). */
export const Line: React.FC<LineProps> = ({f, enter, exit, top, left = 130, width = 770, align = 'left', style, children, travel = 24, exitDur = 8, fadeDelay = 0}) => {
  const a = enter <= -1 ? 1 : settle(invLerp(enter, enter + 12, f));
  const aOpacity = enter <= -1 ? 1 : ease.cubicOut(invLerp(enter + fadeDelay, enter + 12, f));
  const b = exit === undefined ? 0 : ease.cubicIn(invLerp(exit, exit + exitDur, f));
  const opacity = Math.min(aOpacity, 1 - b);
  if (opacity <= 0.001) return null;
  const dy = (1 - a) * travel - b * 14;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        textAlign: align,
        whiteSpace: 'nowrap',
        opacity,
        transform: `translateY(${dy}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const head = (size: number, spacing: string): React.CSSProperties => ({
  ...TYPE.headline,
  fontSize: size,
  letterSpacing: spacing,
  color: PALETTE.white,
});

const day: React.CSSProperties = {
  ...TYPE.mono,
  fontSize: TYPE.size.dayLabel,
  color: PALETTE.magenta,
  lineHeight: 1,
};

const support: React.CSSProperties = {
  ...TYPE.support,
  fontSize: TYPE.size.support,
  color: PALETTE.text72,
  letterSpacing: '0.02em',
};

const DayLabel: React.FC<{text: string}> = ({text}) => (
  <span style={{display: 'inline-flex', alignItems: 'center', gap: 16}}>
    <span style={{width: 12, height: 12, background: PALETTE.magenta, display: 'inline-block'}} />
    {text}
  </span>
);

export const TextLayer: React.FC<{f: number}> = ({f}) => {
  if (f >= K.swap) return null;
  const H = LAYOUT.headline;
  const lh = (size: number) => size * 0.96;
  const stages = [
    {c: COPY.scope, enter: 300, exit: 408},
    {c: COPY.build, enter: 420, exit: 588},
    {c: COPY.review, enter: 600, exit: 710},
    {c: COPY.launch, enter: 720, exit: 830},
  ];
  return (
    <>
      {/* Shot 1 — readable on frame 0 */}
      <Line f={f} enter={-1} exit={K.connect - 1} exitDur={5} top={H.y} style={head(TYPE.size.opening, FIT.opening)}>
        {COPY.chaos.headline[0]}
      </Line>
      <Line f={f} enter={-1} exit={K.connect - 1} exitDur={5} top={H.y + lh(TYPE.size.opening)} style={head(TYPE.size.opening, FIT.opening)}>
        {COPY.chaos.headline[1]}
      </Line>

      {/* Shot 2 — fully readable by frame 162, still from 174 to 288 */}
      <Line f={f} enter={K.connect} fadeDelay={4} exit={290} top={H.y} style={head(TYPE.size.solutionTop, FIT.solutionTop)}>
        {COPY.solution.top}
      </Line>
      <Line f={f} enter={K.connect} fadeDelay={5} exit={292} top={H.y + lh(TYPE.size.solutionTop) + 4} style={head(TYPE.size.solutionBottom, FIT.solutionBottom)}>
        {COPY.solution.bottomLead}
        <span style={{color: PALETTE.magenta}}>{COPY.solution.bottomAccent}</span>
        {COPY.solution.bottomTail}
      </Line>

      {/* Shots 3–6 — day label, stage title, supporting line */}
      {stages.map(({c, enter, exit}) => (
        <React.Fragment key={c.day}>
          <Line f={f} enter={enter} exit={exit} top={LAYOUT.dayLabel.y + 10} style={day} travel={16}>
            <DayLabel text={c.day} />
          </Line>
          <Line f={f} enter={enter + 2} exit={exit + 1} top={LAYOUT.processTitle.y} style={head(TYPE.size.stage, FIT.stage[c.day as keyof typeof FIT.stage] ?? '-0.035em')}>
            {c.title}
          </Line>
          {'support' in c ? (
            <Line f={f} enter={c === COPY.launch ? K.live - 12 : enter + 6} exit={exit + 2} top={LAYOUT.support.y + 22} style={support} travel={16}>
              {c.support}
            </Line>
          ) : null}
        </React.Fragment>
      ))}

      {/* Shot 7 — readable 852 to 948, then carried under the ribbon */}
      <Line f={f} enter={840} top={H.y} style={head(TYPE.size.main, FIT.proof)}>
        {COPY.proof.headline[0]}
      </Line>
      <Line f={f} enter={842} top={H.y + lh(TYPE.size.main)} style={head(TYPE.size.main, FIT.proof)}>
        {COPY.proof.headline[1]}
      </Line>
    </>
  );
};
