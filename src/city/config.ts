// "Kavey in Chaos City" — 30-second vertical ad. Single source of truth for
// format, scene boundaries, story beats, copy, narration and sound cues.
// Every visual and audio event derives from these frames (t = frame / 60).
import {clamp, invLerp, spring01} from '../lib/anim.ts';

export const CITY_FPS = 60;
export const CITY_FRAMES = 1800; // 30.00 s

export const S = {
  hook: {start: 0, end: 180},
  salon: {start: 180, end: 480},
  gym: {start: 480, end: 780},
  clinic: {start: 780, end: 1080},
  build: {start: 1080, end: 1440},
  proof: {start: 1440, end: 1620},
  ending: {start: 1620, end: 1800},
} as const;

export const C = {
  // Hook
  land: 52,
  // Salon — bookings clash
  salonBlocks: 192,
  clashHits: [208, 226, 244, 262],
  salonSurprise: 230,
  salonThrow: 300,
  salonHit: 318,
  salonSnaps: [330, 338, 346, 354],
  salonChecks: 370,
  salonWalkIn: 384,
  // Gym — payments slip away
  planesOut: [492, 506, 520, 534],
  gymGrab: 556,
  gymThrow: 600,
  gymHit: 616,
  planesBack: [632, 646, 660, 674],
  gymChecks: 700,
  // Clinic — clients forget
  clinicSnooze: 792,
  clinicThrow: 900,
  clinicHit: 914,
  birds: [924, 936, 948, 960],
  birdsLand: [952, 964, 976, 988],
  clinicWake: 996,
  clinicWalk: 1004,
  // Build — one product, seven days
  pullBack: 1080,
  holoRise: 1096,
  holoMerge: 1170,
  day1: 1170,
  day2: 1206,
  day6: 1290,
  day7: 1350,
  launch: 1380,
  // Proof
  tiles: 1446,
  billboard: 1526,
  fcnReveal: 1536,
  // Signature transition (scarf ribbon)
  anticipation: 1566,
  sweep: 1574,
  cross: 1590,
  coverStart: 1602,
  swap: 1605,
  coverEnd: 1605,
  reveal: 1620, // brand hit
  glanceStart: 1650,
  glanceEnd: 1690,
} as const;

export const COPY2 = {
  hook: ['WELCOME TO', 'CHAOS CITY.'],
  salonProblem: ['BOOKINGS', 'CLASH.'],
  salonFix: ['BOOKINGS,', 'SORTED.'],
  gymProblem: ['PAYMENTS', 'SLIP AWAY.'],
  gymFix: ['PAYMENTS,', 'CONNECTED.'],
  clinicProblem: ['CLIENTS', 'FORGET.'],
  clinicFix: ['REMINDERS', 'ON WHATSAPP.'],
  build: ['ONE PRODUCT.', '7 DAYS.'],
  days: [
    {day: 'DAY 01', what: 'SCOPE', at: C.day1},
    {day: 'DAYS 02–05', what: 'BUILD', at: C.day2},
    {day: 'DAY 06', what: 'REVIEW', at: C.day6},
    {day: 'DAY 07', what: 'LAUNCH', at: C.day7},
  ],
  handoff: ['YOUR CODE.', 'YOUR KEYS.'],
  proof: ['SHIPPED.', 'NOT MOCKED UP.'],
  proofLabel: 'FCN · COMMERCE',
  shops: {salon: 'SALON', gym: 'GYM', clinic: 'CLINIC'},
  ui: {pending: 'PENDING', booking: 'BOOKING', razorpay: 'RAZORPAY', payments: 'PAYMENTS', whatsapp: 'WHATSAPP', reminder: 'REMINDER', paid: 'PAID', live: 'LIVE', preview: 'PRIVATE PREVIEW', code: 'CODE', keys: 'KEYS'},
  ending: {headline: 'READY TO SHIP?', line: 'Your business. Operational online.', website: 'kavoltstudio.netlify.app'},
} as const;

// Narration: exact lines and placement (seconds). Takes live in audio-src/narration_city.
export const NARR2 = [
  {id: 'c01', text: 'Welcome to Chaos City.', start: 0.3, end: 1.95},
  {id: 'c02', text: 'Bookings clashing?', start: 3.3, end: 4.7},
  {id: 'c03', text: 'Sorted, with one booking flow.', start: 5.5, end: 7.7},
  {id: 'c04', text: 'Payments slipping away?', start: 8.3, end: 9.9},
  {id: 'c05', text: 'Connected, with Razorpay.', start: 10.5, end: 12.4},
  {id: 'c06', text: 'Clients forgetting?', start: 13.3, end: 14.7},
  {id: 'c07', text: 'Reminders go out on WhatsApp.', start: 15.5, end: 17.7},
  {id: 'c08', text: 'Kavolt ships it all as one product, in seven days.', start: 18.3, end: 21.4},
  {id: 'c09', text: 'Reviewed on your phone. Launched on day seven.', start: 21.5, end: 23.95},
  {id: 'c10', text: 'Your code. Your keys.', start: 24.15, end: 25.55},
  {id: 'c11', text: 'Real work, shipped.', start: 25.6, end: 26.75},
  {id: 'c12', text: 'Ready to ship? Check the website.', start: 27.25, end: 29.5},
] as const;

// ------------------------------------------------------------------ sound map
export type Cue2 = {id: string; frame: number; kind: string; db: number; note?: string; pan?: number; dur?: number};

const many = (id: string, frames: readonly number[], kind: string, db: number, extra: Partial<Cue2> = {}) =>
  frames.map((frame, i) => ({id: `${id}-${i + 1}`, frame, kind, db, ...extra, pan: extra.pan ?? (i % 2 ? 0.2 : -0.2)}));

export const FIREWORKS = [C.launch + 30, C.launch + 38, C.launch + 48, C.launch + 58, C.launch + 66, C.launch + 80];
export const SNORES = [793, 845, 898, 950];

export const SFX2: Cue2[] = [
  // hook: Kavey streaks in, lands on the SALON sign, hops down to the street
  {id: 'fly-in', frame: 0, kind: 'whoosh', db: -15, dur: 0.9, pan: -0.5},
  {id: 'glitch-city', frame: 10, kind: 'glitch', db: -26, dur: 0.5, pan: 0.3},
  {id: 'land', frame: C.land, kind: 'thud', db: -14},
  {id: 'hop-off', frame: 102, kind: 'boing', db: -26, pan: 0.2},
  {id: 'crane', frame: 96, kind: 'whoosh', db: -24, dur: 1.1},
  {id: 'touch-down', frame: 158, kind: 'softland', db: -24},
  // salon — bookings clash
  {id: 'title-glitch-1', frame: 200, kind: 'glitch', db: -30, dur: 0.25, pan: -0.3},
  {id: 'blocks-drop', frame: C.salonBlocks, kind: 'whoosh', db: -26, dur: 0.3, pan: -0.3},
  ...many('clash', C.clashHits, 'clank', -16).map((c, i) => ({...c, note: ['E5', 'D#5', 'F5', 'E5'][i], pan: -0.35})),
  {id: 'surprise', frame: C.salonSurprise, kind: 'boing', db: -19, pan: 0.3},
  {id: 'salon-throw', frame: C.salonThrow, kind: 'throw', db: -16, pan: 0.2},
  {id: 'salon-hit', frame: C.salonHit, kind: 'transform', db: -13, pan: -0.3},
  ...many('snap', C.salonSnaps, 'blip', -20).map((c, i) => ({...c, note: ['A5', 'C6', 'E6', 'A6'][i], pan: -0.3})),
  {id: 'salon-catch', frame: 364, kind: 'catch', db: -22, pan: 0.3},
  {id: 'salon-checks', frame: C.salonChecks, kind: 'chime', db: -17},
  {id: 'salon-door', frame: C.salonWalkIn + 8, kind: 'bell', db: -22},
  {id: 'dash-gym', frame: 452, kind: 'whoosh', db: -18, dur: 0.55, pan: -0.2},
  // gym — payments slip away
  {id: 'title-glitch-2', frame: 500, kind: 'glitch', db: -30, dur: 0.25, pan: -0.3},
  ...many('flutter', C.planesOut, 'flutter', -21),
  {id: 'grab', frame: C.gymGrab, kind: 'whiff', db: -20, pan: 0.1},
  {id: 'gym-throw', frame: C.gymThrow, kind: 'throw', db: -16, pan: 0.2},
  {id: 'gym-hit', frame: C.gymHit, kind: 'transform', db: -13, pan: -0.3},
  ...many('pay', C.planesBack, 'blip', -19).map((c, i) => ({...c, note: ['C6', 'E6', 'G6', 'C7'][i], pan: -0.25})),
  {id: 'gym-catch', frame: 696, kind: 'catch', db: -22, pan: 0.3},
  {id: 'gym-checks', frame: C.gymChecks, kind: 'chime', db: -17},
  {id: 'gym-door', frame: C.gymChecks + 14, kind: 'bell', db: -24},
  {id: 'dash-clinic', frame: 752, kind: 'whoosh', db: -18, dur: 0.55, pan: -0.2},
  // clinic — clients forget
  {id: 'title-glitch-3', frame: 800, kind: 'glitch', db: -30, dur: 0.25, pan: -0.3},
  ...SNORES.map((frame, i) => ({id: `snore-${i + 1}`, frame, kind: 'snore', db: -23 - i, pan: -0.35})),
  {id: 'tick', frame: 812, kind: 'ticktock', db: -25, dur: 1.4, pan: -0.35},
  {id: 'wave-1', frame: 830, kind: 'swish', db: -28, pan: -0.1},
  {id: 'wave-2', frame: 846, kind: 'swish', db: -29, pan: -0.15},
  {id: 'idea', frame: 874, kind: 'ping', db: -24, note: 'E6', pan: 0.25},
  {id: 'clinic-throw', frame: C.clinicThrow, kind: 'throw', db: -16, pan: 0.2},
  {id: 'clinic-hit', frame: C.clinicHit, kind: 'transform', db: -13, pan: -0.3},
  ...many('bird', C.birds, 'flutter', -26).map((c) => ({...c, dur: 0.35})),
  ...many('ping', C.birdsLand, 'ping', -19).map((c, i) => ({...c, note: ['E6', 'G6', 'B6', 'E7'][i], pan: -0.4 + i * 0.25})),
  {id: 'clinic-catch', frame: 978, kind: 'catch', db: -22, pan: 0.3},
  {id: 'wake', frame: C.clinicWake, kind: 'alarm', db: -20, pan: -0.35},
  {id: 'clinic-bell', frame: C.clinicWalk + 26, kind: 'bell', db: -23},
  // build — one product, seven days
  {id: 'pullback', frame: 1062, kind: 'whoosh', db: -19, dur: 0.8},
  {id: 'rise', frame: C.holoRise, kind: 'riser', db: -21, dur: 1.2},
  {id: 'merge', frame: C.holoMerge, kind: 'transform', db: -12},
  {id: 'day1', frame: C.day1 + 2, kind: 'flip', db: -22, pan: -0.3},
  {id: 'day2', frame: C.day2, kind: 'flip', db: -22, pan: -0.3},
  {id: 'build-ticks', frame: C.day2 + 8, kind: 'construct', db: -22, dur: 1.3},
  {id: 'day6', frame: C.day6, kind: 'flip', db: -22, pan: -0.3},
  {id: 'preview', frame: C.day6 + 2, kind: 'pop', db: -22},
  {id: 'approve', frame: C.day6 + 24, kind: 'chime', db: -19},
  {id: 'day7', frame: C.day7, kind: 'flip', db: -22, pan: -0.3},
  {id: 'launch', frame: C.launch, kind: 'launch', db: -12},
  ...FIREWORKS.map((frame, i) => ({id: `firework-${i + 1}`, frame, kind: 'firework', db: -20 - (i % 2) * 2, pan: [-0.5, 0.45, 0, -0.65, 0.6, -0.2][i]})),
  // proof
  {id: 'tiles', frame: C.tiles, kind: 'whoosh', db: -18, dur: 0.35, pan: -0.3},
  {id: 'code-glyph', frame: C.tiles + 18, kind: 'pop', db: -21, pan: -0.3},
  {id: 'keys', frame: C.tiles + 30, kind: 'keys', db: -20, pan: -0.3},
  {id: 'board-rise', frame: 1490, kind: 'servo', db: -24, dur: 0.5},
  {id: 'billboard', frame: C.billboard, kind: 'power', db: -18},
  {id: 'shipped', frame: 1532, kind: 'slam', db: -16},
  {id: 'scan', frame: C.fcnReveal, kind: 'scan', db: -25},
  {id: 'proof-click', frame: C.fcnReveal + 14, kind: 'click', db: -19},
  // transition + ending
  {id: 'intake', frame: C.anticipation, kind: 'intake', db: -20},
  {id: 'scarf-sweep', frame: C.sweep, kind: 'sweep', db: -14},
  {id: 'air', frame: C.coverStart, kind: 'air', db: -24},
  {id: 'brand-hit', frame: C.reveal, kind: 'brandHit', db: -10},
];

// ------------------------------------------------------------------ city state

/** 0 = chaotic (flicker, alarms) … 1 = fixed and calm, per district and city-wide. */
export const calm = {
  salon: (f: number) => clamp(spring01(f - C.salonHit, {freq: 1.6, damping: 0.8})),
  gym: (f: number) => clamp(spring01(f - C.gymHit, {freq: 1.6, damping: 0.8})),
  clinic: (f: number) => clamp(spring01(f - C.clinicHit, {freq: 1.6, damping: 0.8})),
  city: (f: number) => clamp(invLerp(C.launch - 10, C.launch + 40, f)),
};
