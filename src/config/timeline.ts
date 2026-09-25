// Scene boundaries (half-open [start, end) frame ranges at 60 fps) and the
// frame-exact story beats from the plan. Change timing here only.
export const SCENES = {
  chaos: {start: 0, end: 150},
  solution: {start: 150, end: 300},
  scope: {start: 300, end: 420},
  build: {start: 420, end: 600},
  review: {start: 600, end: 720},
  launch: {start: 720, end: 840},
  proof: {start: 840, end: 960},
  transition: {start: 960, end: 1020},
  ending: {start: 1020, end: 1200},
} as const;

export type SceneId = keyof typeof SCENES;

export const K = {
  // Shot 1
  slipEnd: 18, // Kavey catches the booking panel (thock)
  paymentShift: 48,
  reminderShift: 78,
  holdStart: 90,
  straighten: 126,
  // Shot 2
  connect: 150, // hand gesture starts the magenta connection
  alignEnd: 174, // panels aligned inside the product frame (24 frames)
  headlineReadable: 162,
  headlineHold: 174,
  headlineHoldEnd: 288,
  kaveyGlideStart: 156,
  kaveyGlideEnd: 186,
  cyanBlink: 192,
  briefCompress: 288,
  // Shot 3
  briefRows: 306, // rows align with a four-frame stagger
  scopeChecks: 324,
  scopeNodeLight: 340,
  scopeTextStable: 318,
  scopeTextEnd: 408,
  // Shot 4
  pulseIn: 438,
  pulsePayment: 480,
  pulseReminder: 534,
  flowChecks: 558,
  flowHoldEnd: 588,
  // Shot 5
  phoneTurnStart: 612,
  phoneTurnEnd: 636,
  approve: 654,
  reviewHoldEnd: 708,
  // Shot 6
  live: 738,
  lift: 744,
  ownershipHoldEnd: 828,
  // Shot 7
  proofSettle: 852,
  proofHoldEnd: 948,
  // Shot 8
  anticipation: 960,
  sweep: 972,
  cross: 990,
  coverStart: 1002,
  swap: 1005, // ending layout switches here, under complete occlusion
  coverEnd: 1005,
  reveal: 1020, // brand hit
  // Shot 9
  glanceStart: 1044,
  glanceEnd: 1080,
} as const;
