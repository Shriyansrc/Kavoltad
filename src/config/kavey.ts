// Kavey source metrics. The controlling reference is the supplied
// Assets/kavey-alphas/kavey_clean.png (360 × 675, RGB). The film uses a matted
// working copy (public/assets/kavey_matte.png) with identical pixel geometry,
// so every anchor below is in source-pixel coordinates of that image.
export const KAVEY_SRC = {
  file: 'assets/kavey_matte.png',
  rimFile: 'assets/kavey_rim.png',
  width: 360,
  height: 675,
  // Tight silhouette bounds of the matte (alpha > 8/255), measured by
  // scripts/matte/matte_kavey.py and copied here.
  bbox: {x: 20, y: 18, w: 320, h: 640},
  // Anchors used for contact, gaze, the scarf trail and the chest mark check.
  anchors: {
    handLeft: {x: 40, y: 400}, // viewer's left hand
    handRight: {x: 320, y: 400},
    scarfTip: {x: 250, y: 330},
    scarfDir: {x: 0.6, y: 0.8}, // direction the scarf end points (unit-ish)
    chestK: {x: 180, y: 360},
    eyes: {x: 180, y: 190},
    pivot: {x: 180, y: 380}, // rotation pivot (centre of mass)
  },
} as const;
