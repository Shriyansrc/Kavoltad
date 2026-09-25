// Frame-aligned sound map (plan section 8). The audio synthesiser and the
// visuals both import this file, so a timing change moves picture and sound
// together. Levels are isolated-effect peak targets in dBFS before the mix.
import {K} from './timeline.ts';

export type SfxKind =
  | 'tick'
  | 'catch'
  | 'panelTick'
  | 'connect'
  | 'scope'
  | 'pluck'
  | 'approve'
  | 'launch'
  | 'proof'
  | 'intake'
  | 'sweep'
  | 'air'
  | 'brandHit'
  | 'pop'
  | 'whoosh'
  | 'snap'
  | 'blip'
  | 'click'
  | 'zap'
  | 'chime'
  | 'slam';

export type SfxCue = {
  id: string;
  frame: number;
  kind: SfxKind;
  peakDb: number;
  note?: string; // for plucks
  pan?: number; // -1..1
  dur?: number; // seconds, for whooshes
};

export const SFX: SfxCue[] = [
  {id: 'hook-tick', frame: 0, kind: 'tick', peakDb: -20},
  {id: 'card-catch', frame: K.slipEnd, kind: 'catch', peakDb: -13},
  {id: 'panel-tick-a', frame: K.paymentShift, kind: 'panelTick', peakDb: -20, pan: -0.12},
  {id: 'panel-tick-b', frame: K.reminderShift, kind: 'panelTick', peakDb: -20, pan: -0.15},
  {id: 'system-connect', frame: K.connect, kind: 'connect', peakDb: -12},
  {id: 'scope-confirmed', frame: K.scopeChecks, kind: 'scope', peakDb: -18},
  {id: 'pulse-booking', frame: K.pulseIn, kind: 'pluck', note: 'A4', peakDb: -17, pan: -0.15},
  {id: 'pulse-payment', frame: K.pulsePayment, kind: 'pluck', note: 'C5', peakDb: -17, pan: 0},
  {id: 'pulse-reminder', frame: K.pulseReminder, kind: 'pluck', note: 'E5', peakDb: -17, pan: 0.15},
  {id: 'preview-approved', frame: K.approve, kind: 'approve', peakDb: -21},
  {id: 'launch', frame: K.live, kind: 'launch', peakDb: -14},
  {id: 'proof-settles', frame: K.proofSettle, kind: 'proof', peakDb: -18},
  {id: 'anticipation', frame: K.anticipation, kind: 'intake', peakDb: -20},
  {id: 'scarf-sweep', frame: K.sweep, kind: 'sweep', peakDb: -14},
  {id: 'music-gap-air', frame: K.coverStart, kind: 'air', peakDb: -24},
  {id: 'brand-hit', frame: K.reveal, kind: 'brandHit', peakDb: -10},

  // Motion-design layer: every visible move gets a sound.
  {id: 'bubble-pop-1', frame: 30, kind: 'pop', peakDb: -22, pan: -0.3},
  {id: 'bubble-pop-2', frame: 62, kind: 'pop', peakDb: -22, pan: 0.2},
  {id: 'bubble-pop-3', frame: 96, kind: 'pop', peakDb: -22, pan: -0.25},
  {id: 'cards-whoosh', frame: K.connect + 1, kind: 'whoosh', peakDb: -17, dur: 0.35, pan: -0.2},
  {id: 'cards-snap', frame: 168, kind: 'snap', peakDb: -18},
  ...[0, 1, 2, 3, 4, 5, 6].map((d) => ({id: `day-${d + 1}`, frame: 176 + d * 5, kind: 'blip' as const, peakDb: -25 + d * 0.4, note: ['A5', 'B5', 'C6', 'D6', 'E6', 'G6', 'A6'][d], pan: -0.3 + d * 0.1})),
  {id: 'push-whoosh', frame: 286, kind: 'whoosh', peakDb: -21, dur: 0.3},
  {id: 'day-chip', frame: 300, kind: 'pop', peakDb: -20},
  {id: 'check-2', frame: K.scopeChecks + 3, kind: 'pop', peakDb: -23, pan: -0.15},
  {id: 'check-3', frame: K.scopeChecks + 6, kind: 'pop', peakDb: -23, pan: -0.15},
  {id: 'lock', frame: 334, kind: 'click', peakDb: -18},
  {id: 'morph-whoosh', frame: 420, kind: 'whoosh', peakDb: -20, dur: 0.3},
  {id: 'spark', frame: 426, kind: 'zap', peakDb: -22, pan: 0.1},
  {id: 'flow-checks', frame: K.flowChecks, kind: 'chime', peakDb: -19},
  {id: 'phone-whoosh', frame: 600, kind: 'whoosh', peakDb: -19, dur: 0.32, pan: 0.2},
  {id: 'launch-whoosh', frame: 720, kind: 'whoosh', peakDb: -21, dur: 0.25},
  {id: 'tile-whoosh', frame: 744, kind: 'whoosh', peakDb: -20, dur: 0.3, pan: 0.15},
  {id: 'flip-whoosh', frame: 840, kind: 'whoosh', peakDb: -19, dur: 0.25},
  {id: 'shipped-slam', frame: 842, kind: 'slam', peakDb: -15},
];

// Score structure: 120 BPM, 4/4, one beat = 30 frames, ten 2-second bars.
export const BPM = 120;
export const BAR_SECONDS = 2;
export const BASS_ROOTS = ['A2', 'A2', 'F2', 'F2', 'C3', 'C3', 'G2', 'G2', 'E2', 'A2'] as const;

export const MUSIC = {
  pulseOnlyEnd: 2.5,
  bassIn: 2.5,
  grooveIn: 7,
  proofThin: 14,
  riseStart: 16,
  dipStart: 16.7, // −18 dB over 40 ms, faint tail retained
  dipDb: -18,
  dipRampMs: 40,
  resolve: 17, // A-minor add-nine resolution + two-note signature
  fadeOutMs: 120,
} as const;

// Mix contract.
export const MIX = {
  targetLufs: -14,
  truePeakCeiling: -1.0,
  truePeakTarget: -1.5, // margin for AAC encoding overshoot
  musicUnderVoiceDb: -12,
  duckDb: -4,
  duckAttackMs: 40,
  duckReleaseMs: 180,
} as const;
