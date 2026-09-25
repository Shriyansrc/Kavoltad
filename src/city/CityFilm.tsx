// "Kavey in Chaos City" — master composition (30 s). Layer order, back → front:
// sky, moon, clouds, far + mid skyline (parallax, defocused), fireworks, haze,
// billboard, street and shops, townsfolk, problems + holograms, build hub,
// thrown cube, Kavey (live camera) with his scarf wisp, flyers, near-lens
// string lights / poles / bokeh, scrim, grain, type, the ribbon transition,
// the ending. Audio is mounted outside every visual wrapper.
import React from 'react';
import {AbsoluteFill, getStaticFiles, Html5Audio, staticFile, useCurrentFrame} from 'remotion';
import {Grain} from '../components/Background.tsx';
import {Ending} from '../components/Ending.tsx';
import {Kavey} from '../components/Kavey.tsx';
import {RibbonView} from '../components/RibbonView.tsx';
import {PALETTE, rgba} from '../config/palette.ts';
import {clamp, invLerp} from '../lib/anim.ts';
import {makeRibbon} from '../scenes/ribbon.ts';
import {BuildLayer, DayChips, Fireworks} from './Build.tsx';
import {cam, camBase, camDeltaCss} from './camera.ts';
import {C} from './config.ts';
import {EndingBackdrop} from './EndingBackdrop.tsx';
import {cityAnchorScreen, cityPose} from './kavey.ts';
import {PropsBack, PropsFront, ThrownCubeImg} from './Props.tsx';
import {Billboard, BillboardImage, Tiles, TileGlyphs} from './Proof.tsx';
import {TITLE_TOP, Titles} from './Titles.tsx';
import {Bokeh, Haze, NearPoles, StringLights} from './world/Foreground.tsx';
import {People} from './world/People.tsx';
import {Sky} from './world/Sky.tsx';
import {Street} from './world/Street.tsx';

export type CityProps = {maskOnly?: boolean; mute?: boolean};

const hasFile = (name: string) => getStaticFiles().some((s) => s.name === name);

export const CITY_RIBBON = makeRibbon(
  {sweep: C.sweep, cross: C.cross, coverStart: C.coverStart, swap: C.swap, reveal: C.reveal},
  (f) => cityAnchorScreen(f, 'scarfTip'),
  (f) => {
    const p = cityPose(f);
    const z = f < C.swap ? cam(f).zoom / camBase(f).zoom : 1;
    return {rot: p.rot + (f < C.swap ? cam(f).rot : 0), height: p.height * z, energy: p.energy};
  },
);

/** Comet trail behind Kavey as he streaks into the city (base-screen space). */
const EntryTrail: React.FC<{f: number}> = ({f}) => {
  if (f > 66) return null;
  const fade = 1 - clamp(invLerp(46, 66, f));
  const pts = Array.from({length: 16}, (_, k) => {
    const p = cityPose(Math.max(-4, f - k * 1.6));
    return {x: p.x - p.height * 0.08, y: p.y + p.height * 0.12};
  });
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible', opacity: fade}}>
      {pts.slice(1).map((q, k) => (
        <line key={k} x1={pts[k].x} y1={pts[k].y} x2={q.x} y2={q.y} stroke={k % 2 ? rgba(PALETTE.violet, 0.5 * (1 - k / 15)) : rgba(PALETTE.magenta, 0.6 * (1 - k / 15))} strokeWidth={90 * (1 - k / 15)} strokeLinecap="round" />
      ))}
    </svg>
  );
};

/** Speed streaks while the camera travels between districts. */
const SpeedLines: React.FC<{f: number}> = ({f}) => {
  const v = camBase(f + 0.5).cx - camBase(f - 0.5).cx;
  const a = clamp((Math.abs(v) - 6) / 20);
  if (a <= 0.01) return null;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      {Array.from({length: 16}, (_, k) => {
        const y = 150 + ((k * 97) % 1700);
        const len = 160 + ((k * 53) % 240);
        const x = ((((k * 331 - f * v * 1.6) % 1500) + 1500) % 1500) - 200;
        return <rect key={k} x={x} y={y} width={len * a} height={k % 3 ? 3 : 5} rx={2} fill={k % 4 ? rgba('#FFFFFF', 0.16 * a) : rgba(PALETTE.magenta, 0.3 * a)} />;
      })}
    </svg>
  );
};

export const CityFilm: React.FC<CityProps> = ({maskOnly = false, mute = false}) => {
  const f = useCurrentFrame();
  if (maskOnly) {
    return (
      <AbsoluteFill style={{background: '#000'}}>
        <RibbonView shape={CITY_RIBBON.transitionBand(f)} id="band" f={f} maskOnly />
      </AbsoluteFill>
    );
  }
  const world = f < C.swap;
  return (
    <AbsoluteFill style={{background: '#07060D', overflow: 'hidden'}}>
      {world ? (
        <>
          <Sky f={f} />
          <Fireworks f={f} />
          <Bokeh f={f} p={0.5} count={40} salt={301} blurPx={4} alpha={0.18} />
          <Haze f={f} />
          <Billboard f={f} />
          <BillboardImage f={f} />
          <Street f={f} />
          <People f={f} />
          <PropsBack f={f} />
          <BuildLayer f={f} />
          <ThrownCubeImg f={f} />
          <RibbonView shape={CITY_RIBBON.scarfWisp(f)} id="wisp" f={f} />
          <AbsoluteFill style={{transformOrigin: '0 0', transform: camDeltaCss(f)}}>
            <EntryTrail f={f} />
            <Kavey f={f} poseAt={cityPose} shutter={0.5} />
          </AbsoluteFill>
          <PropsFront f={f} />
          <StringLights f={f} />
          <NearPoles f={f} />
          <Bokeh f={f} p={1.6} count={26} salt={302} blurPx={9} alpha={0.22} />
          <SpeedLines f={f} />
          {/* legibility scrim for the headline zone, and a soft vignette */}
          <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 720, background: 'linear-gradient(180deg, rgba(7,6,13,0.55) 0%, rgba(7,6,13,0.32) 55%, rgba(7,6,13,0) 100%)'}} />
          <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(1300px 1800px at 540px 980px, rgba(0,0,0,0) 58%, rgba(0,0,0,0.5) 100%)'}} />
        </>
      ) : (
        <>
          <EndingBackdrop f={f} />
          <RibbonView shape={CITY_RIBBON.scarfWisp(f)} id="wisp" f={f} />
          <Kavey f={f} poseAt={cityPose} />
        </>
      )}

      <Grain f={f} />

      <Titles f={f} />
      <DayChips f={f} top={TITLE_TOP + 88 * 0.96 * 2 + 20} />
      <Tiles f={f} top={TITLE_TOP + 88 * 0.96 * 2 + 40} />
      <TileGlyphs f={f} top={TITLE_TOP + 88 * 0.96 * 2 + 40} />
      <Ending f={f} swap={C.swap} reveal={C.reveal} />

      <RibbonView shape={CITY_RIBBON.transitionBand(f)} id="band" f={f} />

      {!mute && hasFile('audio/city_mix.wav') ? <Html5Audio src={staticFile('audio/city_mix.wav')} /> : null}
    </AbsoluteFill>
  );
};
