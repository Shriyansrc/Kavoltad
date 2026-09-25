import React from 'react';
import {Composition} from 'remotion';
import {DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH} from './config/video.ts';
import {Film} from './Film.tsx';
import {CityFilm} from './city/CityFilm.tsx';
import {CITY_FPS, CITY_FRAMES} from './city/config.ts';
import './fonts.ts';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="KavoltKavey20s"
      component={Film}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{maskOnly: false, mute: false}}
    />
    {/* Debug: transition occlusion mask (white = ribbon) for automated coverage checks. */}
    <Composition
      id="TransitionMask"
      component={Film}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{maskOnly: true, mute: true}}
    />
    {/* "Kavey in Chaos City" — 30 s */}
    <Composition id="KaveyChaosCity" component={CityFilm} durationInFrames={CITY_FRAMES} fps={CITY_FPS} width={WIDTH} height={HEIGHT} defaultProps={{maskOnly: false, mute: false}} />
    <Composition id="CityTransitionMask" component={CityFilm} durationInFrames={CITY_FRAMES} fps={CITY_FPS} width={WIDTH} height={HEIGHT} defaultProps={{maskOnly: true, mute: true}} />
  </>
);
