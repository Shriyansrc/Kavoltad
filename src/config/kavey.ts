// Kavey cut-out rig built from the supplied kavey_clean.png (360 × 675 RGB).
// scripts/matte/matte_kavey.py mattes it; scripts/matte/rig_parts.py splits it
// into the layers below. All coordinates are source pixels of that image.
export const KAVEY_SRC = {
  width: 360,
  height: 675,
  // Silhouette bounds of the matte (alpha > 8/255), from rig_report.json.
  bbox: {x: 1, y: 4, w: 355, h: 601},
  // Root pivot for lean/squash: low on the robe, so squash reads as weight.
  rootPivot: {x: 196, y: 560},
  anchors: {
    handLPalm: {x: 134, y: 378},
    handLTip: {x: 116, y: 342},
    handRPalm: {x: 318, y: 470},
    cube: {x: 335, y: 415},
    scarfTip: {x: 132, y: 606}, // tip of the scarf-tail flame
    chestK: {x: 222, y: 443},
    eyes: {x: 236, y: 292},
    face: {x: 228, y: 280},
  },
} as const;

export type RigLayerId = 'tail' | 'earR' | 'base' | 'earL' | 'handR' | 'eyeL' | 'eyeR' | 'handL' | 'cube';

export const RIG_LAYERS: {id: RigLayerId; file: string; pivot: {x: number; y: number}; additive?: boolean}[] = [
  {id: 'tail', file: 'assets/kavey/tail.png', pivot: {x: 122, y: 452}},
  {id: 'earR', file: 'assets/kavey/earR.png', pivot: {x: 336, y: 250}},
  {id: 'base', file: 'assets/kavey/base.png', pivot: {x: 196, y: 560}},
  {id: 'earL', file: 'assets/kavey/earL.png', pivot: {x: 90, y: 226}},
  {id: 'handR', file: 'assets/kavey/handR.png', pivot: {x: 287, y: 482}},
  {id: 'eyeL', file: 'assets/kavey/eyeL.png', pivot: {x: 188, y: 283}, additive: true},
  {id: 'eyeR', file: 'assets/kavey/eyeR.png', pivot: {x: 283, y: 300}, additive: true},
  {id: 'handL', file: 'assets/kavey/handL.png', pivot: {x: 136, y: 426}},
  {id: 'cube', file: 'assets/kavey/cube.png', pivot: {x: 335, y: 415}},
];
