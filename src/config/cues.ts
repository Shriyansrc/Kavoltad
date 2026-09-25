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
  | 'brandHit';

export type SfxCue = {
  id: string;
  frame: number;
  kind: SfxKind;
  peakDb: number;
  note?: string; // for plucks
  pan?: number; // -1..1
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
