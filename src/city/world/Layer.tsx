// A parallax layer of the Chaos City world. Children are SVG in world pixels;
// the wrapper applies that layer's camera (p = 1 street, smaller = farther).
import React from 'react';
import {layerCam, layerCss} from '../camera.ts';

/**
 * Screen-space velocity of a parallax layer (px/frame). Used for camera
 * motion blur: a 180° shutter smears each layer along its own motion.
 */
export const layerVelocity = (f: number, p: number) => {
  const a = layerCam(f - 0.5, p);
  const b = layerCam(f + 0.5, p);
  return {vx: -(b.cx - a.cx) * b.zoom, vy: -(b.cy - a.cy) * b.zoom, vz: b.zoom / a.zoom - 1};
};

export const Layer: React.FC<{f: number; p: number; children: React.ReactNode; style?: React.CSSProperties; blur?: boolean}> = ({f, p, children, style, blur = true}) => {
  const c = layerCam(f, p);
  const v = layerVelocity(f, p);
  // Gaussian σ ≈ 0.14 × displacement per frame (box of half a frame), in layer units.
  const sx = blur ? (0.14 * Math.abs(v.vx)) / c.zoom : 0;
  const sy = blur ? (0.14 * Math.abs(v.vy) + 0.05 * Math.abs(v.vz) * 1920) / c.zoom : 0;
  const id = `mb-${String(p).replace('.', '_')}`;
  const on = sx > 0.6 || sy > 0.6;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformOrigin: '0 0', transform: layerCss(c), ...style}}>
      <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {on ? (
          <defs>
            <filter id={id} x={c.cx - 640 / c.zoom} y={c.cy - 1060 / c.zoom} width={1280 / c.zoom} height={2120 / c.zoom} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation={`${sx.toFixed(2)} ${sy.toFixed(2)}`} />
            </filter>
          </defs>
        ) : null}
        {on ? <g filter={`url(#${id})`}>{children}</g> : children}
      </svg>
    </div>
  );
};

/** Visible world x-range of a parallax layer (with margin), for culling. */
export const visibleX = (f: number, p: number, margin = 200) => {
  const c = layerCam(f, p);
  const half = 540 / c.zoom + margin;
  return {x0: c.cx - half, x1: c.cx + half};
};

/** Same parallax transform, but for HTML children (images) in world pixels. */
export const WorldDiv: React.FC<{f: number; p?: number; children: React.ReactNode}> = ({f, p = 1, children}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformOrigin: '0 0', transform: layerCss(layerCam(f, p))}}>{children}</div>
);
