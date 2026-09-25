// Master format. Every animation, particle, mask and audio cue derives from
// `frame` with t = frame / FPS. Nothing reads the wall clock.
export const FPS = 60;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION_IN_FRAMES = 1200; // frames 0..1199, exactly 20.00 s
export const SEED = 240926;
export const SAMPLE_RATE = 48000;

export const secondsToFrame = (s: number) => s * FPS;
export const frameToSeconds = (f: number) => f / FPS;
