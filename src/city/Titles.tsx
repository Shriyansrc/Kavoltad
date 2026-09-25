// Kinetic headlines for Chaos City (screen space, never under the camera).
// Words spring in; problem words glitch in magenta with a violet split;
// fixes land clean and earn a check. SHIPPED slams in.
import React from 'react';
import {PALETTE, rgba} from '../config/palette.ts';
import {TYPE} from '../config/type.ts';
import {clamp, ease, invLerp, lerp, noise1, SPR, spring01, type SpringCfg} from '../lib/anim.ts';
import {C, COPY2} from './config.ts';

export const TITLE_TOP = 250;
const X = 130;

type Word = {text: string; color?: string};

const head = (size: number): React.CSSProperties => ({
  ...TYPE.headline,
  fontSize: size,
  color: PALETTE.white,
  textShadow: '0 6px 28px rgba(7,6,13,0.85), 0 2px 6px rgba(7,6,13,0.7)',
});

const Words: React.FC<{
  f: number;
  words: Word[];
  at: number;
  exitAt: number;
  top: number;
  size: number;
  stagger?: number;
  cfg?: SpringCfg;
  glitch?: boolean;
  spaced?: boolean;
  exitStagger?: number;
  suffix?: React.ReactNode;
}> = ({f, words, at, exitAt, top, size, stagger = 3, cfg = SPR.pop, glitch = false, spaced = true, exitStagger = 2, suffix}) => (
  <div style={{position: 'absolute', left: X, top, whiteSpace: 'nowrap', ...head(size)}}>
    {words.map((w, i) => {
      const p = spring01(f - (at + i * stagger), cfg);
      const x = ease.cubicIn(invLerp(exitAt + i * exitStagger, exitAt + i * exitStagger + 7, f));
      const o = clamp(p * 2.2) * (1 - x);
      const gap = null;
      const mr = spaced && i < words.length - 1 ? '0.24em' : undefined;
      if (o <= 0.001)
        return (
          <span key={i} style={{display: 'inline-block', opacity: 0, marginRight: mr}}>
            {w.text}
            {gap}
          </span>
        );
      // Smooth (continuous-noise) instability for problem words, with a brief burst on entry.
      const k = f / 5;
      const amp = glitch ? 0.55 + 0.45 * Math.exp(-Math.max(0, f - at) / 18) : 0;
      const jx = 3.4 * amp * noise1(k * 1.7, i * 13);
      const jy = 2.6 * amp * noise1(k * 1.3, i * 17 + 5);
      const jr = 2.0 * amp * noise1(k * 1.1, i * 19 + 9);
      const split = glitch ? 3 + 3 * amp * Math.abs(noise1(k * 0.9, i * 7)) : 0;
      return (
        <span
          key={i}
          style={{
            display: 'inline-block',
            position: 'relative',
            marginRight: mr,
            color: w.color,
            opacity: o,
            transform: `translate(${jx}px, ${(1 - p) * 50 - x * 40 + jy}px) scale(${lerp(0.8, 1, clamp(p, 0, 1.2))}) rotate(${(1 - clamp(p)) * -6 + jr}deg)`,
            transformOrigin: '50% 80%',
            filter: p < 0.7 ? `blur(${(0.7 - p) * 10}px)` : undefined,
          }}
        >
          {glitch ? (
            <span aria-hidden style={{position: 'absolute', left: -split, top: split * 0.4, color: PALETTE.violet, opacity: 0.85, textShadow: 'none', mixBlendMode: 'screen'}}>
              {w.text}
            </span>
          ) : null}
          <span style={{position: 'relative'}}>{w.text}</span>
          {gap}
        </span>
      );
    })}
    {suffix}
  </div>
);

const split = (s: string, color?: string): Word[] => s.split(' ').map((text) => ({text, color}));

/** Check badge that pops at the end of a fix headline. */
const FixCheck: React.FC<{f: number; at: number; exitAt: number; size: number}> = ({f, at, exitAt, size}) => {
  const p = spring01(f - at, SPR.pop);
  const x = ease.cubicIn(invLerp(exitAt, exitAt + 7, f));
  const r = size * 0.34;
  return (
    <svg
      width={r * 2 + 20}
      height={r * 2 + 20}
      style={{display: 'inline-block', verticalAlign: 'middle', marginLeft: size * 0.16, marginTop: -size * 0.12, overflow: 'visible', opacity: p <= 0.001 ? 0 : 1 - x, transform: `scale(${clamp(p, 0, 1.3)}) rotate(${(1 - clamp(p)) * -40}deg)`, transformOrigin: '50% 50%'}}
    >
      <circle cx={r + 10} cy={r + 10} r={r} fill={rgba(PALETTE.cyan, 0.16)} stroke={PALETTE.cyan} strokeWidth={5} />
      <path d={`M${r + 10 - r * 0.45},${r + 10} L${r + 10 - r * 0.1},${r + 10 + r * 0.35} L${r + 10 + r * 0.5},${r + 10 - r * 0.35}`} fill="none" stroke="#FFFFFF" strokeWidth={r * 0.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

type Beat = {lines: readonly [string, string]; at: number; exitAt: number; kind: 'problem' | 'fix' | 'plain'; size: number; accent1?: boolean; accent2?: boolean; nouns?: boolean};

const BEATS: Beat[] = [
  {lines: COPY2.salonProblem, at: 256, exitAt: 410, kind: 'problem', size: 96},
  {lines: COPY2.salonFix, at: 436, exitAt: 736, kind: 'fix', size: 96},
  {lines: COPY2.gymProblem, at: 816, exitAt: 952, kind: 'problem', size: 96},
  {lines: COPY2.gymFix, at: 972, exitAt: 1208, kind: 'fix', size: 96},
  {lines: COPY2.clinicProblem, at: 1288, exitAt: 1438, kind: 'problem', size: 96},
  {lines: COPY2.clinicFix, at: 1462, exitAt: 1640, kind: 'fix', size: 84},
  {lines: COPY2.showcase, at: 1700, exitAt: 2008, kind: 'plain', size: 76, accent1: true},
  {lines: COPY2.build, at: 2022, exitAt: 2244, kind: 'plain', size: 88, accent2: true},
  {lines: COPY2.handoff, at: C.tiles + 2, exitAt: C.tiles + 78, kind: 'plain', size: 88, nouns: true},
];

export const Titles: React.FC<{f: number}> = ({f}) => {
  if (f >= C.swap) return null;
  const lh = (s: number) => s * 0.96;
  const shipSlam = spring01(f - C.shipped, {freq: 3, damping: 0.5});
  const out: React.ReactNode[] = [];

  // Hook: WELCOME TO / CHAOS CITY. (letters glitch in magenta)
  out.push(<Words key="h1" f={f} words={split(COPY2.hook[0])} at={12} stagger={4} exitAt={222} top={TITLE_TOP} size={100} />);
  out.push(
    <Words
      key="h2"
      f={f}
      words={COPY2.hook[1].split('').map((c) => ({text: c === ' ' ? ' ' : c, color: PALETTE.magenta}))}
      at={24}
      stagger={1.4}
      exitAt={224}
      exitStagger={0.6}
      top={TITLE_TOP + lh(100)}
      size={100}
      glitch
      spaced={false}
    />,
  );

  const nouns = (s: string): Word[] => s.split(' ').map((t, i) => ({text: t, color: i === 1 ? PALETTE.magenta : undefined}));
  BEATS.forEach((b, k) => {
    const [l1, l2] = b.lines;
    out.push(<Words key={`a${k}`} f={f} words={b.nouns ? nouns(l1) : b.accent1 ? split(l1, PALETTE.magenta) : split(l1)} at={b.at} exitAt={b.exitAt} top={TITLE_TOP} size={b.size} />);
    const w2 = b.kind === 'problem' || b.accent2 ? split(l2, PALETTE.magenta) : b.nouns ? nouns(l2) : split(l2);
    out.push(
      <Words
        key={`b${k}`}
        f={f}
        words={w2}
        at={b.at + 6}
        exitAt={b.exitAt + 1}
        top={TITLE_TOP + lh(b.size)}
        size={b.size}
        glitch={b.kind === 'problem'}
        suffix={b.kind === 'fix' ? <FixCheck f={f} at={b.at + 16} exitAt={b.exitAt + 3} size={b.size} /> : undefined}
      />,
    );
  });

  // Proof: SHIPPED. slams, NOT MOCKED UP. follows word by word
  if (f >= C.shipped) {
    out.push(
      <div
        key="ship"
        style={{
          position: 'absolute',
          left: X,
          top: TITLE_TOP,
          ...head(92),
          transformOrigin: '0% 100%',
          transform: `scale(${lerp(1.7, 1, clamp(shipSlam, 0, 1.15))})`,
          opacity: clamp(shipSlam * 3),
          whiteSpace: 'nowrap',
        }}
      >
        {COPY2.proof[0]}
      </div>,
    );
  }
  out.push(<Words key="nmu" f={f} words={split(COPY2.proof[1])} at={C.shipped + 6} stagger={2} exitAt={99999} top={TITLE_TOP + lh(92)} size={82} />);
  return <>{out}</>;
};
