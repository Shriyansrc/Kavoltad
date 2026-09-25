// The official KAVOLT wordmark (supplied 700 × 93 RGBA PNG), never redrawn.
import React from 'react';
import {getStaticFiles, Img, staticFile} from 'remotion';
import {FONT_MONO} from '../config/type.ts';

export const WORDMARK = {file: 'assets/kavolt-logo.png', w: 700, h: 93};

export const Wordmark: React.FC<{x: number; y: number; width: number; opacity?: number; glow?: number}> = ({x, y, width, opacity = 1, glow = 0}) => {
  const h = (width * WORDMARK.h) / WORDMARK.w;
  const available = getStaticFiles().some((f) => f.name === WORDMARK.file);
  return (
    <div style={{position: 'absolute', left: x, top: y, width, height: h, opacity}}>
      {available ? (
        <Img
          src={staticFile(WORDMARK.file)}
          style={{width, height: h, display: 'block', filter: glow > 0 ? `drop-shadow(0 0 ${10 * glow}px rgba(224,64,251,${0.35 * glow}))` : undefined}}
        />
      ) : (
        <div style={{width, height: h, border: '2px dashed #ff5252', color: '#ff5252', fontFamily: FONT_MONO, fontSize: h * 0.45, display: 'grid', placeItems: 'center'}}>
          WORDMARK PENDING
        </div>
      )}
    </div>
  );
};
