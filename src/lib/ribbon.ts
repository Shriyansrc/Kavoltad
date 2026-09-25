// Tapered ribbon geometry: spine points + half-widths → smooth closed SVG path.
export type Pt = {x: number; y: number};

const catmullToBezier = (pts: Pt[], closed: boolean) => {
  // Returns an SVG path string through all points using Catmull-Rom splines.
  const n = pts.length;
  if (n < 2) return '';
  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  const get = (i: number) => {
    if (closed) return pts[(i + n) % n];
    return pts[Math.max(0, Math.min(n - 1, i))];
  };
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const c1 = {x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6};
    const c2 = {x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6};
    d += ` C${c1.x.toFixed(2)},${c1.y.toFixed(2)} ${c2.x.toFixed(2)},${c2.y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return closed ? `${d} Z` : d;
};

/** Offset a spine by per-point half-widths (+ extra) and return a closed outline. */
export const ribbonPath = (spine: Pt[], half: number[], extra = 0) => {
  const n = spine.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = spine[Math.max(0, i - 1)];
    const b = spine[Math.min(n - 1, i + 1)];
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    const nx = -ty;
    const ny = tx;
    const w = Math.max(0, half[i] + (half[i] > 0.01 ? extra : 0));
    left.push({x: spine[i].x + nx * w, y: spine[i].y + ny * w});
    right.push({x: spine[i].x - nx * w, y: spine[i].y - ny * w});
  }
  return catmullToBezier([...left, ...right.reverse()], true);
};

export const polyline = (pts: Pt[]) => catmullToBezier(pts, false);
