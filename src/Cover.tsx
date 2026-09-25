// Cover: the complete film frame at 3.5 s (frame 210) with Kavey and the
// seven-day promise. The square variant repositions a duplicate of that same
// composition so the headline and Kavey's face sit inside the centre square.
import React from 'react';
import {AbsoluteFill, Freeze} from 'remotion';
import {Film} from './Film.tsx';

export const COVER_FRAME = 210;

export const Cover: React.FC<{square: boolean}> = ({square}) => {
  if (!square) {
    return (
      <Freeze frame={COVER_FRAME}>
        <Film mute />
      </Freeze>
    );
  }
  // 1080 × 1080 window over the 1080 × 1920 frame, shifted to hold the
  // headline (y ≈ 355–515) and Kavey's face.
  return (
    <AbsoluteFill style={{background: '#0A0A0F', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: -300, width: 1080, height: 1920}}>
        <Freeze frame={COVER_FRAME}>
          <Film mute />
        </Freeze>
      </div>
    </AbsoluteFill>
  );
};
