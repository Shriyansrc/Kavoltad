import React from 'react';
import {Composition} from 'remotion';
import {DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH} from './config/video.ts';
import {Film} from './Film.tsx';
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
  </>
);
