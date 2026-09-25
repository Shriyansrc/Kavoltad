// Minimal 4×4 matrices (column vectors, row-major storage) so the CSS
// transform applied to Kavey and the projected anchor points used for the
// scarf ribbon come from exactly the same maths.
export type M4 = number[]; // 16 numbers, row-major

export const I = (): M4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export const mul = (a: M4, b: M4): M4 => {
  const o = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[r * 4 + k] * b[k * 4 + c];
      o[r * 4 + c] = s;
    }
  }
  return o;
};

export const T = (x: number, y: number, z = 0): M4 => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
export const S = (s: number, sy = s): M4 => [s, 0, 0, 0, 0, sy, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
export const Rz = (a: number): M4 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
};
export const Ry = (a: number): M4 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1];
};
export const Rx = (a: number): M4 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1];
};
export const P = (d: number): M4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -1 / d, 1];

export const chain = (...ms: M4[]) => ms.reduce((acc, m) => mul(acc, m), I());

/** CSS matrix3d() wants column-major order. */
export const toCss = (m: M4) => {
  const c = [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15].map((i) => +m[i].toFixed(8));
  return `matrix3d(${c.join(',')})`;
};

export const project = (m: M4, x: number, y: number, z = 0) => {
  const X = m[0] * x + m[1] * y + m[2] * z + m[3];
  const Y = m[4] * x + m[5] * y + m[6] * z + m[7];
  const W = m[12] * x + m[13] * y + m[14] * z + m[15];
  return {x: X / W, y: Y / W};
};
