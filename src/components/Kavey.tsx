// Kavey compositor: the cut-out rig of the supplied image under one 4×4 root
// transform. Children rotate about their own pivots; the eyes are additive
// light (plus-lighter) so blinks and glances leave a clean visor. Sub-frame
// motion blur is used only while the silhouette moves fast.
import React from 'react';
import {getStaticFiles, Img, staticFile} from 'remotion';
import {KAVEY_SRC, RIG_LAYERS, type RigLayerId} from '../config/kavey.ts';
import {PALETTE, rgba} from '../config/palette.ts';
import {project, toCss} from '../lib/mat4.ts';
import {kaveyMatrix, kaveyPose, type KaveyPose} from '../scenes/kavey.ts';

const hasRig = () => getStaticFiles().some((f) => f.name === 'assets/kavey/base.png');

const layerTransform = (id: RigLayerId, pose: KaveyPose): {transform?: string; opacity?: number} => {
  switch (id) {
    case 'earL':
      return {transform: `rotate(${pose.earL}deg)`};
    case 'earR':
      return {transform: `rotate(${pose.earR}deg)`};
    case 'tail':
      return {transform: `rotate(${pose.tail}deg)`};
    case 'handL':
      return {transform: `rotate(${pose.handL}deg)`};
    case 'handR':
      return {transform: `rotate(${pose.handR}deg)`};
    case 'cube':
      return {transform: `translate(${pose.cube.dx}px, ${pose.cube.dy}px) rotate(${pose.cube.rot}deg) scale(${pose.cube.scale})`};
    case 'eyeL':
    case 'eyeR':
      return {transform: `translate(${pose.gazeX}px, ${pose.gazeY}px) scale(1, ${Math.max(0.08, 1 - pose.blink * 0.92)})`};
    default:
      return {};
  }
};

const Rig: React.FC<{f: number; opacity: number; blend?: React.CSSProperties['mixBlendMode']}> = ({f, opacity, blend}) => {
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
        isolation: 'isolate',
      }}
    >
      {RIG_LAYERS.map((L) => {
        const t = layerTransform(L.id, pose);
        return (
          <div
            key={L.id}
            style={{
              position: 'absolute',
              inset: 0,
              transformOrigin: `${L.pivot.x}px ${L.pivot.y}px`,
              transform: t.transform,
              mixBlendMode: L.additive ? 'plus-lighter' : undefined,
              filter: L.id === 'cube' ? `drop-shadow(0 0 ${6 + 10 * pose.cube.glow}px ${rgba(PALETTE.magenta, 0.35 + 0.4 * pose.cube.glow)})` : undefined,
            }}
          >
            <Img src={staticFile(L.file)} style={{width: W, height: H, display: 'block'}} />
          </div>
        );
      })}
    </div>
  );
};

/** Screen-space speed of the silhouette (px/frame), used to decide on motion blur. */
const speedAt = (f: number) => {
  const a = kaveyMatrix(kaveyPose(f - 0.5));
  const b = kaveyMatrix(kaveyPose(f + 0.5));
  const pts = [
    [KAVEY_SRC.bbox.x, KAVEY_SRC.bbox.y],
    [KAVEY_SRC.bbox.x + KAVEY_SRC.bbox.w, KAVEY_SRC.bbox.y + KAVEY_SRC.bbox.h],
    [KAVEY_SRC.anchors.face.x, KAVEY_SRC.anchors.face.y],
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
  if (!hasRig()) return null;
  const pose = kaveyPose(f);
  const m = kaveyMatrix(pose);
  const foot = project(m, KAVEY_SRC.rootPivot.x + 20, KAVEY_SRC.bbox.y + KAVEY_SRC.bbox.h);
  const s = pose.height / KAVEY_SRC.bbox.h;
  const lift = Math.max(0, Math.min(1, -pose.hover / 10 + 0.5));
  const blurPx = speedAt(f) * 0.25; // 90° shutter
  const samples = blurPx < 1.5 ? 1 : Math.min(8, Math.ceil(blurPx / 1.5) + 1);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      {/* energy under-glow: he hovers, so there is light rather than a hard shadow */}
      <div
        style={{
          position: 'absolute',
          left: foot.x - 200 * s,
          top: foot.y + 40 * s,
          width: 400 * s,
          height: 70 * s,
          borderRadius: '50%',
          background: `radial-gradient(closest-side, ${rgba(PALETTE.violet, 0.16 + 0.08 * pose.energy - 0.05 * lift)} 0%, ${rgba(PALETTE.violet, 0.05)} 60%, rgba(0,0,0,0) 100%)`,
          filter: 'blur(6px)',
        }}
      />
      {samples === 1 ? (
        <Rig f={f} opacity={1} />
      ) : (
        <div style={{position: 'absolute', inset: 0, isolation: 'isolate'}}>
          {Array.from({length: samples}, (_, k) => (
            <Rig key={k} f={f + (k / (samples - 1) - 0.5) * 0.25} opacity={1 / samples} blend="plus-lighter" />
          ))}
        </div>
      )}
    </div>
  );
};
