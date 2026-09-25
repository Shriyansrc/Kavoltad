// Shot 9: the complete ending, composed before the ribbon reveals it and held
// perfectly still from 17.00 to 20.00 s (only Kavey's hover and scarf move).
import React from 'react';
import {COPY} from '../config/copy.ts';
import {LAYOUT} from '../config/layout.ts';
import {PALETTE, rgba} from '../config/palette.ts';
import {K} from '../config/timeline.ts';
import {TYPE} from '../config/type.ts';
import {bump} from '../lib/anim.ts';
import {FIT} from './textFit.ts';
import {Wordmark, WORDMARK} from './Wordmark.tsx';

export const Ending: React.FC<{f: number}> = ({f}) => {
  if (f < K.swap) return null;
  const E = LAYOUT.ending;
  const wmH = (E.wordmark.w * WORDMARK.h) / WORDMARK.w;
  const hit = bump(f, K.reveal + 4, 16);
  return (
    <>
      <Wordmark x={E.wordmark.cx - E.wordmark.w / 2} y={E.wordmark.cy - wmH / 2} width={E.wordmark.w} glow={hit} />
      <div
        style={{
          position: 'absolute',
          left: E.headline.cx - E.headline.maxW / 2,
          width: E.headline.maxW,
          top: E.headline.cy - (TYPE.size.ending * 0.96) / 2,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          ...TYPE.headline,
          fontSize: TYPE.size.ending,
          letterSpacing: FIT.ending,
          color: PALETTE.white,
        }}
      >
        {COPY.ending.headline}
      </div>
      <div
        style={{
          position: 'absolute',
          left: E.line.x,
          width: E.line.w,
          top: E.line.y,
          height: E.line.h,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          whiteSpace: 'nowrap',
          ...TYPE.support,
          fontSize: TYPE.size.support,
          color: PALETTE.text72,
        }}
      >
        {COPY.ending.line}
      </div>
      <div
        style={{
          position: 'absolute',
          left: E.website.x,
          width: E.website.w,
          top: E.website.y,
          height: E.website.h,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          whiteSpace: 'nowrap',
          ...TYPE.mono,
          letterSpacing: '0.02em',
          fontSize: TYPE.size.website,
          color: PALETTE.white,
        }}
      >
        {COPY.ending.website}
      </div>
      <div
        style={{
          position: 'absolute',
          left: E.underline.x0,
          top: E.underline.y - E.underline.thickness / 2,
          width: E.underline.x1 - E.underline.x0,
          height: E.underline.thickness,
          background: PALETTE.magenta,
          boxShadow: `0 0 ${8 + 14 * hit}px ${rgba(PALETTE.magenta, 0.35 + 0.3 * hit)}`,
        }}
      />
    </>
  );
};
