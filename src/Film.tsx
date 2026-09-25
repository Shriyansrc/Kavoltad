// Master composition. Layer order (back → front), per plan section 10:
// 1 background · 2 depth points · 3 blueprint grid · 4 panels/screenshot/
// connectors · 5 Kavey, shadow and scarf wisp · 6 type and wordmark ·
// 7 transition ribbon. Audio is mounted outside every visual wrapper.
import React from 'react';
import {AbsoluteFill, getStaticFiles, Html5Audio, staticFile, useCurrentFrame} from 'remotion';
import {Background, BlueprintGrid, Grain} from './components/Background.tsx';
import {Card} from './components/Card.tsx';
import {Connectors} from './components/Connectors.tsx';
import {Ending} from './components/Ending.tsx';
import {FrameObject} from './components/Frame.tsx';
import {HandoffTile} from './components/HandoffTile.tsx';
import {Interactions} from './components/Interactions.tsx';
import {Kavey} from './components/Kavey.tsx';
import {Rail} from './components/Rail.tsx';
import {RibbonView} from './components/RibbonView.tsx';
import {TextLayer} from './components/TextLayer.tsx';
import {Wordmark} from './components/Wordmark.tsx';
import {LAYOUT} from './config/layout.ts';
import {K} from './config/timeline.ts';
import {ease, invLerp} from './lib/anim.ts';
import {kaveyPose} from './scenes/kavey.ts';
import {camera, cardGeo, stageTurn} from './scenes/model.ts';
import {scarfWisp, transitionBand} from './scenes/ribbon.ts';

export type FilmProps = {
  /** Debug: render only the transition ribbon as white on black. */
  maskOnly?: boolean;
  /** Debug: hide audio (used for silent preview stills). */
  mute?: boolean;
};

const hasFile = (name: string) => getStaticFiles().some((f) => f.name === name);

export const Film: React.FC<FilmProps> = ({maskOnly = false, mute = false}) => {
  const f = useCurrentFrame();
  const cam = camera(f);
  const pose = kaveyPose(f);
  const turn = stageTurn(f);
  // Subtle forward rush on the object layer as the scene accelerates (972–1002).
  const rush = f >= K.sweep && f < K.swap ? 1 + 0.035 * ease.cubicIn(invLerp(K.sweep, K.coverStart, f)) : 1;

  if (maskOnly) {
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <RibbonView shape={transitionBand(f)} id="band" f={f} maskOnly />
      </AbsoluteFill>
    );
  }

  const mixAvailable = hasFile('audio/mix.wav');
  return (
    <AbsoluteFill style={{background: '#0A0A0F', overflow: 'hidden'}}>
      <Background f={f} focus={{x: pose.x, y: pose.y}} ending={f >= K.swap ? 1 : 0} />
      <BlueprintGrid f={f} />

      {/* Object layer: camera push (opening) and phone presentation angle */}
      {f < K.swap ? (
        <AbsoluteFill
          style={{
            transformOrigin: `${cam.ox}px ${cam.oy}px`,
            transform: `scale(${cam.scale * rush})`,
          }}
        >
          <AbsoluteFill
            style={{
              transformOrigin: '365px 920px',
              transform: turn !== 0 ? `perspective(1400px) rotateY(${turn}deg)` : undefined,
            }}
          >
            <FrameObject f={f} fcnAvailable={hasFile('assets/fcn_crop.png')} />
            <Connectors f={f} />
            {[0, 1, 2].map((i) => (
              <Card key={i} i={i} f={f} geo={cardGeo(i, f)} />
            ))}
          </AbsoluteFill>
          <Rail f={f} />
          <HandoffTile f={f} />
          <Interactions f={f} />
        </AbsoluteFill>
      ) : null}

      {/* Kavey + scarf wisp: persistent across every beat */}
      <AbsoluteFill
        style={{
          transformOrigin: `${cam.ox}px ${cam.oy}px`,
          transform: f < K.swap ? `scale(${cam.scale * rush})` : undefined,
        }}
      >
        <RibbonView shape={scarfWisp(f)} id="wisp" f={f} />
        <Kavey f={f} />
      </AbsoluteFill>

      <Grain f={f} />

      {/* Type and wordmark: never pushed, never blurred */}
      {f < K.swap ? <Wordmark x={LAYOUT.wordmark.x} y={LAYOUT.wordmark.y} width={LAYOUT.wordmark.w} /> : null}
      <TextLayer f={f} />
      <Ending f={f} />

      {/* Signature transition */}
      <RibbonView shape={transitionBand(f)} id="band" f={f} />

      {!mute && mixAvailable ? <Html5Audio src={staticFile('audio/mix.wav')} /> : null}
    </AbsoluteFill>
  );
};
