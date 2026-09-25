// Screen-space layout from the plan (1080 × 1920, origin top-left).
// Rectangles are {x, y, w, h}; character positions are centre anchors.
export type Rect = {x: number; y: number; w: number; h: number};

export const SAFE = {x0: 120, x1: 900, y0: 220, y1: 1480};

export const LAYOUT = {
  wordmark: {x: 130, y: 240, w: 250},
  headline: {x: 130, y: 355, w: 770, h: 205},
  dayLabel: {x: 130, y: 330, w: 770, h: 50},
  processTitle: {x: 130, y: 400, w: 770, h: 160},
  demo: {x: 130, y: 610, w: 500, h: 580},
  support: {x: 130, y: 1260, w: 770, h: 100},
  kaveyProcess: {x: 755, y: 1010, height: 480, maxWidth: 280},
  kaveyOpening: {x: 680, y: 1000, height: 600},
  kaveyProof: {x: 770, y: 1000, height: 470},
  productFrame: {x: 130, y: 630, w: 500, h: 555},
  briefFrame: {x: 130, y: 705, w: 500, h: 390},
  phone: {x: 215, y: 670, w: 300, h: 500},
  portfolioCard: {x: 118, y: 724, w: 524, h: 330},
  fcnViewport: {cx: 380, cy: 870, w: 500, h: 188},
  rail: {y: 1224, x0: 150, x1: 610},
  ending: {
    wordmark: {cx: 510, cy: 290, w: 400},
    headline: {cx: 510, cy: 440, maxW: 780},
    kavey: {cx: 510, cy: 835, maxW: 400, maxH: 610},
    line: {x: 130, y: 1180, w: 770, h: 90},
    website: {x: 130, y: 1330, w: 770, h: 76},
    underline: {x0: 195, x1: 825, y: 1425, thickness: 3},
  },
} as const;
