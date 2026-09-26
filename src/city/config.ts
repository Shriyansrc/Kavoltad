// "Kavey in Chaos City" — 48-second vertical ad (v2). Single source of truth
// for format, scene boundaries, story beats, copy, dialogue and sound cues.
// Every visual and audio event derives from these frames (t = frame / 60).
import {clamp, invLerp, spring01} from '../lib/anim.ts';
import {LINES} from './lines.ts';

export const CITY_FPS = 60;
export const CITY_FRAMES = 2880; // 48.00 s

export const S = {
  hook: {start: 0, end: 234},
  salon: {start: 234, end: 800},
  gym: {start: 800, end: 1272},
  clinic: {start: 1272, end: 1650},
  showcase: {start: 1650, end: 2016},
  build: {start: 2016, end: 2196},
  launch: {start: 2196, end: 2300},
  proof: {start: 2300, end: 2496},
  ending: {start: 2496, end: 2880},
} as const;

export const C = {
  // Hook — Kavey arrives, lands on the SALON sign, hops down
  land: 52,
  hop: 110,
  home: 176,
  // Salon — "Oh no! The bookings at my salon are clashing again!"
  salonBlocks: 250,
  clashHits: [266, 296, 326, 356],
  salonSurprise: 300,
  salonThrow: 405,
  salonHit: 423,
  salonSnaps: [552, 566, 580, 594],
  salonChecks: 700,
  salonWalkIn: 700,
  salonCheer: 724,
  // Gym — "Oh man! My gym's payments keep slipping away!"
  planesOut: [820, 836, 852, 868],
  gymGrab: 900,
  gymThrow: 948,
  gymHit: 966,
  planesBack: [1030, 1050, 1070, 1090],
  gymChecks: 1150,
  gymCheer: 1194,
  // Clinic — "Oh dear, my patients keep forgetting their appointments!"
  clinicSnooze: 1280,
  clinicThrow: 1434,
  clinicHit: 1452,
  birds: [1470, 1482, 1494, 1506],
  birdsLand: [1500, 1512, 1524, 1536],
  clinicWake: 1560,
  clinicWalk: 1570,
  clinicCheer: 1620,
  // Showcase — stunning websites and apps
  pullBack: 1650,
  holoRise: 1700,
  holoMerge: 1770,
  design: [1800, 1830, 1860, 1890, 1920],
  // Build — seven days, reviewed on your phone
  day1: 2016,
  day2: 2050,
  day6: 2120,
  day7: 2170,
  launch: 2196,
  // Proof
  tiles: 2250,
  billboard: 2334,
  fcnReveal: 2344,
  shipped: 2360,
  // Signature transition (scarf ribbon)
  anticipation: 2442,
  sweep: 2450,
  cross: 2466,
  coverStart: 2478,
  swap: 2481,
  coverEnd: 2481,
  reveal: 2496, // brand hit
  glanceStart: 2660,
  glanceEnd: 2700,
} as const;

/** Camera moves between districts (start, end frame). */
export const PANS = {toGym: [744, 800], toClinic: [1216, 1272]} as const;

export const COPY2 = {
  hook: ['WELCOME TO', 'CHAOS CITY.'],
  salonProblem: ['BOOKINGS', 'CLASH.'],
  salonFix: ['BOOKINGS,', 'SORTED.'],
  gymProblem: ['PAYMENTS', 'SLIP AWAY.'],
  gymFix: ['PAYMENTS,', 'CONNECTED.'],
  clinicProblem: ['CLIENTS', 'FORGET.'],
  clinicFix: ['REMINDERS', 'ON WHATSAPP.'],
  showcase: ['STUNNING', 'WEBSITES & APPS.'],
  build: ['LIVE IN', '7 DAYS.'],
  days: [
    {day: 'DAY 01', what: 'SCOPE', at: C.day1},
    {day: 'DAYS 02–05', what: 'BUILD', at: C.day2},
    {day: 'DAY 06', what: 'REVIEW', at: C.day6},
    {day: 'DAY 07', what: 'LAUNCH', at: C.day7},
  ],
  handoff: ['YOUR CODE.', 'YOUR KEYS.'],
  proof: ['SHIPPED.', 'NOT MOCKED UP.'],
  proofLabel: 'SIKSHAARA · EDTECH',
  shops: {salon: 'SALON', gym: 'GYM', clinic: 'CLINIC'},
  ui: {pending: 'PENDING', booking: 'BOOKING', razorpay: 'RAZORPAY', payments: 'PAYMENTS', whatsapp: 'WHATSAPP', reminder: 'REMINDER', paid: 'PAID', live: 'LIVE', preview: 'PRIVATE PREVIEW', code: 'CODE', keys: 'KEYS', book: 'BOOK NOW', join: 'JOIN NOW', visit: 'BOOK A VISIT'},
  ending: {headline: ['READY TO BRING', 'YOUR BUSINESS TO', 'THE GLOBAL STAGE?'], website: 'kavolt.antideploy.com'},
} as const;

// Dialogue: exact lines, speakers, voices and placement come from the TTS
// script (scripts/tts/lines_city_v2.json); takes live in audio-src/narration_city_v2.
export type Line = {id: string; speaker: 'narrator' | 'salon' | 'gym' | 'clinic'; voice: string; speed: number; text: string; start: number; end: number};
export const NARR2 = LINES as unknown as Line[];

// ------------------------------------------------------------------ sound map
export type Cue2 = {id: string; frame: number; kind: string; db: number; note?: string; pan?: number; dur?: number};

const many = (id: string, frames: readonly number[], kind: string, db: number, extra: Partial<Cue2> = {}) =>
  frames.map((frame, i) => ({id: `${id}-${i + 1}`, frame, kind, db, ...extra, pan: extra.pan ?? (i % 2 ? 0.2 : -0.2)}));

export const FIREWORKS = [C.launch + 20, C.launch + 30, C.launch + 42, C.launch + 52, C.launch + 62, C.launch + 76];
export const SNORES = [1290, 1342, 1394];
export const CONFETTI = [C.salonChecks, C.gymChecks, C.clinicWake + 10];

export const SFX2: Cue2[] = [
  // hook: Kavey streaks in, lands on the SALON sign, hops down to the street
  {id: 'fly-in', frame: 0, kind: 'whoosh', db: -15, dur: 0.9, pan: -0.5},
  {id: 'glitch-city', frame: 10, kind: 'glitch', db: -26, dur: 0.5, pan: 0.3},
  {id: 'land', frame: C.land, kind: 'thud', db: -14},
  {id: 'hop-off', frame: C.hop + 2, kind: 'boing', db: -25, pan: 0.2},
  {id: 'crane', frame: 100, kind: 'whoosh', db: -24, dur: 1.1},
  {id: 'touch-down', frame: C.home - 2, kind: 'softland', db: -24},
  // salon — bookings clash
  {id: 'title-glitch-1', frame: 256, kind: 'glitch', db: -30, dur: 0.25, pan: -0.3},
  {id: 'blocks-drop', frame: C.salonBlocks, kind: 'whoosh', db: -26, dur: 0.3, pan: -0.3},
  ...many('clash', C.clashHits, 'clank', -17).map((c, i) => ({...c, note: ['E5', 'D#5', 'F5', 'E5'][i], pan: -0.35})),
  {id: 'surprise', frame: C.salonSurprise, kind: 'boing', db: -20, pan: 0.3},
  {id: 'salon-throw', frame: C.salonThrow, kind: 'throw', db: -16, pan: 0.2},
  {id: 'salon-hit', frame: C.salonHit, kind: 'transform', db: -13, pan: -0.3},
  ...many('snap', C.salonSnaps, 'blip', -20).map((c, i) => ({...c, note: ['A5', 'C6', 'E6', 'A6'][i], pan: -0.3})),
  {id: 'salon-catch', frame: 490, kind: 'catch', db: -22, pan: 0.3},
  {id: 'salon-checks', frame: C.salonChecks, kind: 'chime', db: -17},
  {id: 'salon-confetti', frame: C.salonChecks + 4, kind: 'confetti', db: -22},
  {id: 'salon-door', frame: C.salonWalkIn + 20, kind: 'bell', db: -22},
  {id: 'dash-gym', frame: PANS.toGym[0] + 4, kind: 'whoosh', db: -18, dur: 0.55, pan: -0.2},
  // gym — payments slip away
  {id: 'title-glitch-2', frame: 816, kind: 'glitch', db: -30, dur: 0.25, pan: -0.3},
  ...many('flutter', C.planesOut, 'flutter', -21),
  {id: 'grab', frame: C.gymGrab, kind: 'whiff', db: -20, pan: 0.1},
  {id: 'gym-throw', frame: C.gymThrow, kind: 'throw', db: -16, pan: 0.2},
  {id: 'gym-hit', frame: C.gymHit, kind: 'transform', db: -13, pan: -0.3},
  ...many('pay', C.planesBack, 'blip', -19).map((c, i) => ({...c, note: ['C6', 'E6', 'G6', 'C7'][i], pan: -0.25})),
  {id: 'gym-catch', frame: 1040, kind: 'catch', db: -22, pan: 0.3},
  {id: 'gym-checks', frame: C.gymChecks, kind: 'chime', db: -17},
  {id: 'gym-confetti', frame: C.gymChecks + 4, kind: 'confetti', db: -22},
  {id: 'gym-door', frame: C.gymChecks + 30, kind: 'bell', db: -24},
  {id: 'dash-clinic', frame: PANS.toClinic[0] + 4, kind: 'whoosh', db: -18, dur: 0.55, pan: -0.2},
  // clinic — clients forget
  {id: 'title-glitch-3', frame: 1288, kind: 'glitch', db: -30, dur: 0.25, pan: -0.3},
  ...SNORES.map((frame, i) => ({id: `snore-${i + 1}`, frame, kind: 'snore', db: -24 - i, pan: -0.35})),
  {id: 'tick', frame: 1300, kind: 'ticktock', db: -26, dur: 1.6, pan: -0.35},
  {id: 'wave-1', frame: 1336, kind: 'swish', db: -28, pan: -0.1},
  {id: 'wave-2', frame: 1352, kind: 'swish', db: -29, pan: -0.15},
  {id: 'idea', frame: 1394, kind: 'ping', db: -24, note: 'E6', pan: 0.25},
  {id: 'clinic-throw', frame: C.clinicThrow, kind: 'throw', db: -16, pan: 0.2},
  {id: 'clinic-hit', frame: C.clinicHit, kind: 'transform', db: -13, pan: -0.3},
  ...many('bird', C.birds, 'flutter', -26).map((c) => ({...c, dur: 0.35})),
  ...many('ping', C.birdsLand, 'ping', -19).map((c, i) => ({...c, note: ['E6', 'G6', 'B6', 'E7'][i], pan: -0.4 + i * 0.25})),
  {id: 'clinic-catch', frame: 1530, kind: 'catch', db: -22, pan: 0.3},
  {id: 'wake', frame: C.clinicWake, kind: 'alarm', db: -20, pan: -0.35},
  {id: 'clinic-confetti', frame: C.clinicWake + 14, kind: 'confetti', db: -22},
  {id: 'clinic-bell', frame: C.clinicWalk + 30, kind: 'bell', db: -23},
  // showcase — stunning websites and apps
  {id: 'pullback', frame: C.pullBack + 2, kind: 'whoosh', db: -19, dur: 0.8},
  {id: 'rise', frame: C.holoRise, kind: 'riser', db: -21, dur: 1.2},
  {id: 'merge', frame: C.holoMerge, kind: 'transform', db: -12},
  ...C.design.map((frame, i) => ({id: `design-${i + 1}`, frame, kind: 'blip', db: -21, note: ['E5', 'A5', 'C6', 'E6', 'A6'][i], pan: -0.4 + i * 0.2})),
  {id: 'paint', frame: 1800, kind: 'swish', db: -26, pan: 0.2},
  {id: 'site-sparkle', frame: 1960, kind: 'sparkle', db: -22},
  // build
  {id: 'day1', frame: C.day1 + 2, kind: 'flip', db: -22, pan: -0.3},
  {id: 'day2', frame: C.day2, kind: 'flip', db: -22, pan: -0.3},
  {id: 'build-ticks', frame: C.day2 + 6, kind: 'construct', db: -23, dur: 1.1},
  {id: 'day6', frame: C.day6, kind: 'flip', db: -22, pan: -0.3},
  {id: 'approve', frame: C.day6 + 20, kind: 'chime', db: -19},
  {id: 'day7', frame: C.day7, kind: 'flip', db: -22, pan: -0.3},
  {id: 'launch', frame: C.launch, kind: 'launch', db: -12},
  ...FIREWORKS.map((frame, i) => ({id: `firework-${i + 1}`, frame, kind: 'firework', db: -20 - (i % 2) * 2, pan: [-0.5, 0.45, 0, -0.65, 0.6, -0.2][i]})),
  // proof
  {id: 'tiles', frame: C.tiles, kind: 'whoosh', db: -18, dur: 0.35, pan: -0.3},
  {id: 'code-glyph', frame: C.tiles + 18, kind: 'pop', db: -21, pan: -0.3},
  {id: 'keys', frame: C.tiles + 30, kind: 'keys', db: -20, pan: -0.3},
  {id: 'board-rise', frame: 2302, kind: 'servo', db: -24, dur: 0.5},
  {id: 'billboard', frame: C.billboard, kind: 'power', db: -18},
  {id: 'scan', frame: C.fcnReveal, kind: 'scan', db: -25},
  {id: 'shipped', frame: C.shipped, kind: 'slam', db: -16},
  {id: 'proof-click', frame: C.fcnReveal + 20, kind: 'click', db: -19},
  // transition + ending
  {id: 'intake', frame: C.anticipation, kind: 'intake', db: -20},
  {id: 'scarf-sweep', frame: C.sweep, kind: 'sweep', db: -14},
  {id: 'air', frame: C.coverStart, kind: 'air', db: -24},
  {id: 'brand-hit', frame: C.reveal, kind: 'brandHit', db: -10},
  {id: 'globe', frame: C.reveal + 8, kind: 'riser', db: -26, dur: 0.9},
  {id: 'spot-1', frame: C.reveal + 30, kind: 'spot', db: -24, pan: -0.5},
  {id: 'spot-2', frame: C.reveal + 40, kind: 'spot', db: -24, pan: 0.5},
  {id: 'end-confetti', frame: 2640, kind: 'confetti', db: -24},
  {id: 'url', frame: 2660, kind: 'chime', db: -21, note: 'E6,A6,C7'},
];

// ------------------------------------------------------------------ city state

/** 0 = chaotic (flicker, alarms) … 1 = fixed and calm, per district and city-wide. */
export const calm = {
  salon: (f: number) => clamp(spring01(f - C.salonHit, {freq: 1.6, damping: 0.8})),
  gym: (f: number) => clamp(spring01(f - C.gymHit, {freq: 1.6, damping: 0.8})),
  clinic: (f: number) => clamp(spring01(f - C.clinicHit, {freq: 1.6, damping: 0.8})),
  city: (f: number) => clamp(invLerp(C.launch - 10, C.launch + 40, f)),
};
