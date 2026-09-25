// Master composition. Layer order (back → front):
// 1 background light, depth points, floor · 2 blueprint grid · 3 stage objects
// (frame, connectors, cards, effects) under a handheld/pushing camera ·
// 4 Kavey rig + scarf wisp · 5 grain · 6 type and wordmark · 7 transition
// ribbon · audio mounted outside every visual wrapper.
import React from 'react';
import {AbsoluteFill, getStaticFiles, Html5Audio, staticFile, useCurrentFrame} from 'remotion';
import {Background, BlueprintGrid, Grain} from './components/Background.tsx';
import {Card} from './components/Card.tsx';
import {Bubbles, CatchFlash, Connectors, DayStrip, HandoffTile, PulseAndSpark, Rail, Shockwave, Sparkles} from './components/Effects.tsx';
import {Ending} from './components/Ending.tsx';
import {FrameObject} from './components/Frame.tsx';
import {Kavey} from './components/Kavey.tsx';
import {RibbonView} from './components/RibbonView.tsx';
import {TextLayer} from './components/TextLayer.tsx';
import {Wordmark} from './components/Wordmark.tsx';
import {LAYOUT} from './config/layout.ts';
import {K} from './config/timeline.ts';
import {spring01, SPR} from './lib/anim.ts';
import {kaveyPose} from './scenes/kavey.ts';
import {scarfWisp, transitionBand} from './scenes/ribbon.ts';
import {camera, stageTurn} from './scenes/stage.ts';

export type FilmProps = {
  /** Debug: render only the transition ribbon as white on black. */
  maskOnly?: boolean;
  /** Debug: hide audio (used for silent preview stills). */
  mute?: boolean;
};

const hasFile = (name: string) => getStaticFiles().some((f) => f.name === name);

export const Film: React.FC<FilmProps> = ({maskOnly = false, mute = false}) => {
  const f = useCurrentFrame();
  if (maskOnly) {
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <RibbonView shape={transitionBand(f)} id="band" f={f} maskOnly />
      </AbsoluteFill>
    );
  }
  const cam = camera(f);
  const pose = kaveyPose(f);
  const turn = stageTurn(f);
  const camT = `translate(${cam.x}px, ${cam.y}px) rotate(${cam.rot}deg) scale(${cam.scale})`;
  const wordmarkIn = spring01(f + 6, SPR.pop);

  return (
    <AbsoluteFill style={{background: '#0A0A0F', overflow: 'hidden'}}>
      <Background f={f} focus={{x: pose.x, y: pose.y}} ending={f >= K.swap ? 1 : 0} />
      <BlueprintGrid f={f} />

      {f < K.swap ? (
        <AbsoluteFill style={{transformOrigin: `${cam.ox}px ${cam.oy}px`, transform: camT}}>
          <AbsoluteFill style={{transformOrigin: '365px 920px', transform: turn !== 0 ? `perspective(1300px) rotateY(${turn}deg)` : undefined}}>
            <FrameObject f={f} fcnAvailable={hasFile('assets/fcn_crop.png')} />
            <Connectors f={f} />
            {[2, 1, 0].map((i) => (
              <Card key={i} i={i} f={f} />
            ))}
          </AbsoluteFill>
          <Bubbles f={f} />
          <Rail f={f} />
          <HandoffTile f={f} />
          <PulseAndSpark f={f} />
          <Shockwave f={f} />
          <CatchFlash f={f} />
          <Sparkles f={f} />
        </AbsoluteFill>
      ) : null}

      {/* Kavey: persistent across every beat, under the same camera */}
      <AbsoluteFill style={{transformOrigin: `${cam.ox}px ${cam.oy}px`, transform: f < K.swap ? camT : undefined}}>
        <RibbonView shape={scarfWisp(f)} id="wisp" f={f} />
        <Kavey f={f} />
      </AbsoluteFill>

      <Grain f={f} />

      {f < K.swap ? (
        <div style={{position: 'absolute', inset: 0, transformOrigin: '255px 256px', transform: `scale(${0.7 + 0.3 * Math.min(1.1, wordmarkIn)})`, opacity: Math.min(1, wordmarkIn * 2)}}>
          <Wordmark x={LAYOUT.wordmark.x} y={LAYOUT.wordmark.y} width={LAYOUT.wordmark.w} />
        </div>
      ) : null}
      <DayStrip f={f} />
      <TextLayer f={f} />
      <Ending f={f} />

      <RibbonView shape={transitionBand(f)} id="band" f={f} />

      {!mute && hasFile('audio/mix.wav') ? <Html5Audio src={staticFile('audio/mix.wav')} /> : null}
    </AbsoluteFill>
  );
};
