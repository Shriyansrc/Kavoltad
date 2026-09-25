// Kavey compositor: the supplied PNG (matted working copy) under one 4×4
// transform, with integrated light (violet rim, restrained magenta fill),
// a soft hover shadow, and sub-frame motion blur only while moving fast.
import React from 'react';
import {getStaticFiles, Img, staticFile} from 'remotion';
import {KAVEY_SRC} from '../config/kavey.ts';
import {PALETTE, rgba} from '../config/palette.ts';
import {FONT_MONO} from '../config/type.ts';
import {clamp} from '../lib/anim.ts';
import {project, toCss} from '../lib/mat4.ts';
import {kaveyMatrix, kaveyPose} from '../scenes/kavey.ts';

const hasFile = (name: string) => getStaticFiles().some((f) => f.name === name);

const Body: React.FC<{f: number; opacity: number; blend?: React.CSSProperties['mixBlendMode']; hasMatte: boolean; hasRim: boolean}> = ({
  f,
  opacity,
  blend,
  hasMatte,
  hasRim,
}) => {
  const pose = kaveyPose(f);
  const m = kaveyMatrix(pose);
  const W = KAVEY_SRC.width;
  const H = KAVEY_SRC.height;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: W,
        height: H,
        transformOrigin: '0 0',
        transform: toCss(m),
        opacity,
        mixBlendMode: blend,
        backfaceVisibility: 'hidden',
      }}
    >
      {hasMatte ? (
        <Img src={staticFile(KAVEY_SRC.file)} style={{width: W, height: H, display: 'block'}} />
      ) : (
        <div
          style={{
            position: 'absolute',
            left: KAVEY_SRC.bbox.x,
            top: KAVEY_SRC.bbox.y,
            width: KAVEY_SRC.bbox.w,
            height: KAVEY_SRC.bbox.h,
            border: '4px dashed #ff5252',
            color: '#ff5252',
            fontFamily: FONT_MONO,
            fontSize: 28,
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
          }}
        >
          KAVEY
          <br />
          ASSET
          <br />
          PENDING
        </div>
      )}
      {hasRim ? (
        <>
          {/* violet rim from the upper right, restrained magenta fill from the lower left */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(235deg, ${rgba(PALETTE.violet, 0.95)} 0%, ${rgba(PALETTE.violet, 0.5)} 45%, ${rgba(PALETTE.magenta, 0.55)} 100%)`,
              WebkitMaskImage: `url(${staticFile(KAVEY_SRC.rimFile)})`,
              maskImage: `url(${staticFile(KAVEY_SRC.rimFile)})`,
              WebkitMaskSize: '100% 100%',
              maskSize: '100% 100%',
              mixBlendMode: 'screen',
              opacity: 0.32 + 0.4 * pose.energy,
            }}
          />
        </>
      ) : null}
    </div>
  );
};

/** Screen-space speed of the silhouette, used to decide on motion blur. */
const speedAt = (f: number) => {
  const a = kaveyMatrix(kaveyPose(f - 0.5));
  const b = kaveyMatrix(kaveyPose(f + 0.5));
  const pts = [
    [KAVEY_SRC.bbox.x, KAVEY_SRC.bbox.y],
    [KAVEY_SRC.bbox.x + KAVEY_SRC.bbox.w, KAVEY_SRC.bbox.y + KAVEY_SRC.bbox.h],
    [KAVEY_SRC.anchors.eyes.x, KAVEY_SRC.anchors.eyes.y],
  ];
  let max = 0;
  for (const [x, y] of pts) {
    const p = project(a, x, y);
    const q = project(b, x, y);
    max = Math.max(max, Math.hypot(q.x - p.x, q.y - p.y));
  }
  return max;
};

export const Kavey: React.FC<{f: number}> = ({f}) => {
  const hasMatte = hasFile(KAVEY_SRC.file);
  const hasRim = hasFile(KAVEY_SRC.rimFile);
  const pose = kaveyPose(f);
  const speed = speedAt(f);
  // 90° shutter equivalent: blur length = speed × 0.25 frames.
  const blurPx = speed * 0.25;
  const samples = blurPx < 1.2 ? 1 : Math.min(10, Math.ceil(blurPx / 1.2) + 1);

  // Hover shadow under the silhouette.
  const m = kaveyMatrix(pose);
  const foot = project(m, KAVEY_SRC.bbox.x + KAVEY_SRC.bbox.w / 2, KAVEY_SRC.bbox.y + KAVEY_SRC.bbox.h);
  const s = pose.height / KAVEY_SRC.bbox.h;
  const shadowW = 250 * s;
  const lift = clamp(-pose.hover / 10 + 0.5);

  return (
    <div style={{position: 'absolute', inset: 0}}>
      <div
        style={{
          position: 'absolute',
          left: foot.x - shadowW / 2,
          top: foot.y + 34 * s - 16 * s,
          width: shadowW,
          height: 32 * s,
          borderRadius: '50%',
          background: `radial-gradient(closest-side, ${rgba(PALETTE.violet, 0.22 - 0.06 * lift)} 0%, ${rgba(PALETTE.violet, 0.06)} 60%, rgba(0,0,0,0) 100%)`,
          transform: `scale(${1 - 0.08 * lift})`,
        }}
      />
      {samples === 1 ? (
        <Body f={f} opacity={1} hasMatte={hasMatte} hasRim={hasRim} />
      ) : (
        <div style={{position: 'absolute', inset: 0, isolation: 'isolate'}}>
          {Array.from({length: samples}, (_, k) => {
            const off = (k / (samples - 1) - 0.5) * 0.25;
            return <Body key={k} f={f + off} opacity={1 / samples} blend="plus-lighter" hasMatte={hasMatte} hasRim={hasRim} />;
          })}
        </div>
      )}
    </div>
  );
};
