// Townsfolk of Chaos City. Hurried passers-by while a shop is broken; once it
// is fixed, customers turn and walk in through its door. Pure functions of f.
import {C} from '../config.ts';
import {DISTRICT, GROUND} from '../camera.ts';
import {clamp, envelope, invLerp, lerp} from '../../lib/anim.ts';

type Kind = 'salon' | 'gym' | 'clinic';

export type Walker = {
  id: number;
  x0: number;
  x1: number;
  t0: number;
  t1: number;
  enter?: Kind; // walks in through this door at t1
  body: string;
  h: number; // total height (px)
  hair?: string;
  mood?: 'rush' | 'lost' | 'happy';
};

const BODY = ['#4B2C6B', '#2F3C78', '#5B3E8E', '#6A2F63', '#3A2A5C', '#28506A'];
const HAIR = ['#1A1024', '#3B2350', '#0F1A2A', '#5A3A2A'];

let id = 0;
const w = (x0: number, x1: number, t0: number, t1: number, rest: Partial<Walker> = {}): Walker => ({
  id: id++,
  x0,
  x1,
  t0,
  t1,
  body: BODY[id % BODY.length],
  hair: HAIR[id % HAIR.length],
  h: 150 + ((id * 37) % 5) * 6,
  ...rest,
});

const S = DISTRICT.salon;
const G = DISTRICT.gym;
const K = DISTRICT.clinic;

export const WALKERS: Walker[] = [
  // Salon: people rush past a clashing calendar …
  w(S + 700, S - 700, 150, 330, {mood: 'rush'}),
  w(S - 650, S + 700, 200, 380, {mood: 'lost'}),
  // … then walk in once bookings are sorted.
  w(S - 520, S, C.salonWalkIn - 50, C.salonWalkIn + 10, {enter: 'salon', mood: 'happy'}),
  w(S + 560, S, C.salonWalkIn - 40, C.salonWalkIn + 28, {enter: 'salon', mood: 'happy'}),
  w(S - 700, S, C.salonWalkIn - 30, C.salonWalkIn + 46, {enter: 'salon', mood: 'happy'}),
  // Gym
  w(G - 700, G + 700, 470, 650, {mood: 'rush'}),
  w(G + 520, G, C.gymChecks - 40, C.gymChecks + 16, {enter: 'gym', mood: 'happy'}),
  w(G - 560, G, C.gymChecks - 30, C.gymChecks + 34, {enter: 'gym', mood: 'happy'}),
  // Clinic: nobody turns up while clients forget …
  w(K + 700, K - 700, 780, 960, {mood: 'lost'}),
  // … reminders land and they come.
  w(K + 520, K, C.clinicWalk - 30, C.clinicWalk + 12, {enter: 'clinic', mood: 'happy'}),
  w(K - 560, K, C.clinicWalk - 20, C.clinicWalk + 30, {enter: 'clinic', mood: 'happy'}),
  w(K + 700, K, C.clinicWalk - 10, C.clinicWalk + 48, {enter: 'clinic', mood: 'happy'}),
];

// A small crowd in front of the gym cheers at launch (visible in the wide shot).
export const CROWD = [-300, -190, -80, 70, 190, 300].map((dx, i) => ({x: G + dx, body: BODY[(i + 2) % BODY.length], hair: HAIR[i % HAIR.length], h: 150 + (i % 3) * 8, phase: i * 3}));

export type WalkerState = {x: number; y: number; scale: number; opacity: number; dir: 1 | -1; phase: number; visible: boolean};

export const walkerState = (wk: Walker, f: number): WalkerState => {
  const dir: 1 | -1 = wk.x1 >= wk.x0 ? 1 : -1;
  if (f < wk.t0) return {x: wk.x0, y: GROUND + 60, scale: 1, opacity: 0, dir, phase: 0, visible: false};
  const u = invLerp(wk.t0, wk.t1, f);
  let x = lerp(wk.x0, wk.x1, u);
  let y = GROUND + 62; // feet on the sidewalk
  let scale = 1;
  let opacity = clamp(invLerp(wk.t0, wk.t0 + 8, f));
  if (wk.enter && f > wk.t1) {
    const e = invLerp(wk.t1, wk.t1 + 22, f);
    x = wk.x1;
    y = lerp(GROUND + 62, GROUND - 22, e);
    scale = lerp(1, 0.86, e);
    opacity *= 1 - clamp((e - 0.55) / 0.45);
  } else if (!wk.enter && f > wk.t1) {
    opacity = 0;
  }
  const dist = Math.abs(x - wk.x0) + (wk.enter && f > wk.t1 ? (f - wk.t1) * 2 : 0);
  return {x, y, scale, opacity, dir, phase: dist / 26, visible: opacity > 0.01};
};

/** 0 … 1 how open a shop door is (customers entering). */
export const doorOpen = (kind: Kind, f: number) => {
  let d = 0;
  for (const wk of WALKERS) if (wk.enter === kind) d = Math.max(d, envelope(f, wk.t1 - 14, wk.t1 - 2, wk.t1 + 20, wk.t1 + 34));
  return d;
};
