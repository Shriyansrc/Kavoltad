// Build every audio deliverable from code: score and SFX (synthesised),
// narration (placed from the TTS takes), ducking, loudness normalisation to
// -14 LUFS with a true-peak ceiling, separate 48 kHz stems, the master mix
// used by the film, and timed captions matching the placed narration.
//
//   node scripts/audio/build-audio.ts
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {NARRATION} from '../../src/config/copy.ts';
import {MIX, SFX} from '../../src/config/cues.ts';
import {FPS} from '../../src/config/video.ts';
import {addMono, biquad, dbToGain, gainToDb, makeStereo, readWav, SR, writeWav, type Stereo} from './dsp.ts';
import {integratedLoudness, limiterGain, truePeakDb, windowLoudness} from './loudness.ts';
import {renderScore} from './score.ts';
import {renderSfx} from './sfx.ts';

const ROOT = process.cwd();
const NARR_DIR = join(ROOT, 'audio-src/narration');
const OUT_DIR = join(ROOT, 'audio');
const PUBLIC_AUDIO = join(ROOT, 'public/audio');
mkdirSync(OUT_DIR, {recursive: true});
mkdirSync(PUBLIC_AUDIO, {recursive: true});

const DUR = 20;

/** Exact 2× upsampler (24 kHz → 48 kHz) with a Kaiser-windowed sinc. */
const upsample2 = (x: Float32Array) => {
  const half = 32;
  const beta = 8;
  const bessel = (v: number) => {
    let s = 1, t = 1;
    for (let k = 1; k < 30; k++) {
      t *= (v / (2 * k)) * (v / (2 * k));
      s += t;
    }
    return s;
  };
  const taps: number[] = [];
  for (let k = -half + 1; k <= half; k++) {
    const d = 0.5 - k;
    const sinc = Math.sin(Math.PI * d) / (Math.PI * d);
    const r = (k - 0.5) / half;
    taps.push(sinc * (bessel(beta * Math.sqrt(Math.max(0, 1 - r * r))) / bessel(beta)));
  }
  const y = new Float32Array(x.length * 2);
  for (let n = 0; n < x.length; n++) {
    y[2 * n] = x[n];
    let acc = 0;
    for (let j = 0; j < taps.length; j++) {
      const idx = n + (j - half + 1);
      if (idx >= 0 && idx < x.length) acc += x[idx] * taps[j];
    }
    y[2 * n + 1] = acc;
  }
  return y;
};

/** Gentle feed-forward speech compressor (3:1 above threshold, soft knee). */
const compress = (x: Float32Array, thresholdDb: number, ratio: number, attackMs = 4, releaseMs = 90) => {
  const out = new Float32Array(x.length);
  const aA = Math.exp(-1 / ((attackMs / 1000) * SR));
  const aR = Math.exp(-1 / ((releaseMs / 1000) * SR));
  let env = 0;
  const knee = 6;
  for (let i = 0; i < x.length; i++) {
    const lvl = Math.abs(x[i]);
    env = lvl > env ? aA * env + (1 - aA) * lvl : aR * env + (1 - aR) * lvl;
    const db = gainToDb(env);
    const over = db - thresholdDb;
    let red = 0;
    if (over > knee / 2) red = over * (1 - 1 / ratio);
    else if (over > -knee / 2) red = ((over + knee / 2) ** 2 / (2 * knee)) * (1 - 1 / ratio);
    out[i] = x[i] * dbToGain(-red);
  }
  return out;
};

// ------------------------------------------------------------------ narration
type Placed = {id: string; text: string; start: number; end: number; window: [number, number]};

const buildNarration = () => {
  const bus = makeStereo(DUR);
  const placed: Placed[] = [];
  for (const line of NARRATION) {
    const path = join(NARR_DIR, `${line.id}.wav`);
    if (!existsSync(path)) throw new Error(`missing narration take ${path} — run scripts/tts/narrate.py`);
    const {s, sr} = readWav(path);
    let mono = s.L;
    if (sr === 24000) mono = upsample2(mono);
    else if (sr !== SR) throw new Error(`unsupported narration sample rate ${sr}`);
    // Voice polish: rumble filter and a small presence lift for phone speakers.
    mono = biquad(mono, 'highpass', 75, 0.707);
    mono = biquad(mono, 'peaking', 3400, 0.9, 1.5);
    mono = biquad(mono, 'lowshelf', 180, 0.7, -1);
    // Tame TTS transients so the master limiter barely works on speech.
    const pk = Math.max(...Array.from(mono, (v) => Math.abs(v)));
    mono = compress(mono, gainToDb(pk) - 9, 3, 4, 90);
    // Voice-only lookahead peak control (≈3.5 dB) keeps the master limiter light.
    const line48: Stereo = {L: mono, R: mono};
    const venv = limiterGain(line48, truePeakDb(line48) - 3.5, 1.5, 60);
    mono = mono.map((v, i) => v * venv[i]);
    // Match every line to the same speech loudness.
    const tmp: Stereo = {L: mono, R: mono};
    const lufs = windowLoudness(tmp, 0, mono.length / SR);
    const g = dbToGain(-18 - lufs);
    const start = line.start;
    const dur = mono.length / SR;
    if (dur > line.end - line.start + 1e-3) throw new Error(`${line.id} overruns its window (${dur.toFixed(2)} s)`);
    addMono(bus, mono, start, g, 0);
    placed.push({id: line.id, text: line.text, start, end: start + dur, window: [line.start, line.end]});
  }
  return {bus, placed};
};

// ------------------------------------------------------------------ ducking
const duckCurve = (placed: Placed[]) => {
  const n = DUR * SR;
  const out = new Float32Array(n);
  const att = MIX.duckAttackMs / 1000;
  const rel = MIX.duckReleaseMs / 1000;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let db = 0;
    for (const p of placed) {
      let d = 0;
      if (t >= p.start - att && t < p.start) d = MIX.duckDb * ((t - (p.start - att)) / att);
      else if (t >= p.start && t <= p.end) d = MIX.duckDb;
      else if (t > p.end && t < p.end + rel) d = MIX.duckDb * (1 - (t - p.end) / rel);
      db = Math.min(db, d);
    }
    out[i] = dbToGain(db);
  }
  return out;
};

const scale = (s: Stereo, g: number | Float32Array): Stereo => {
  const L = new Float32Array(s.L.length);
  const R = new Float32Array(s.R.length);
  for (let i = 0; i < L.length; i++) {
    const k = typeof g === 'number' ? g : g[i];
    L[i] = s.L[i] * k;
    R[i] = s.R[i] * k;
  }
  return {L, R};
};

const sum = (...ss: Stereo[]): Stereo => {
  const out = makeStereo(DUR);
  for (const s of ss) for (let i = 0; i < out.L.length; i++) {
    out.L[i] += s.L[i];
    out.R[i] += s.R[i];
  }
  return out;
};

const fadeTail = (s: Stereo, ms: number) => {
  const n = Math.round((ms / 1000) * SR);
  for (let i = 0; i < n; i++) {
    const g = i / n;
    const j = s.L.length - 1 - i;
    s.L[j] *= g;
    s.R[j] *= g;
  }
};

// ------------------------------------------------------------------ captions
const ts = (t: number, sep: string) => {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const p = (v: number, w = 2) => String(v).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(s)}${sep}${p(r, 3)}`;
};

const writeCaptions = (placed: Placed[]) => {
  const srt = placed.map((p, i) => `${i + 1}\n${ts(p.start, ',')} --> ${ts(p.end + 0.12, ',')}\n${p.text}\n`).join('\n');
  const vtt = 'WEBVTT\n\n' + placed.map((p) => `${ts(p.start, '.')} --> ${ts(p.end + 0.12, '.')}\n${p.text}\n`).join('\n');
  writeFileSync(join(OUT_DIR, 'Kavolt_Kavey_20s_Captions.srt'), srt);
  writeFileSync(join(OUT_DIR, 'Kavolt_Kavey_20s_Captions.vtt'), vtt);
};

// ------------------------------------------------------------------ main
const main = () => {
  console.log('rendering score …');
  const music = renderScore();
  console.log('rendering sfx …');
  const sfx = renderSfx();
  console.log('placing narration …');
  const {bus: voice, placed} = buildNarration();

  // Music sits 11 dB under the speech loudness, then ducks another 4 dB on lines.
  const speechLufs = -18;
  const musicRef = windowLoudness(music, 2.5, 16.0);
  const musicGain = dbToGain(speechLufs - 11 - musicRef);
  const duck = duckCurve(placed);
  const musicStem = scale(scale(music, musicGain), duck);
  const sfxStem = scale(sfx, dbToGain(-4));
  const voiceStem = voice;

  // Normalise to -14 LUFS under a true-peak ceiling. One shared limiter gain
  // envelope is applied to every stem, so stems still sum to the master.
  const raw = [musicStem, sfxStem, voiceStem];
  let gainDb = MIX.targetLufs - integratedLoudness(sum(...raw));
  let stems = raw;
  let master = sum(...raw);
  let tpBefore = 0;
  let limited = false;
  let grMaxDb = 0;
  let grOver1dbSeconds = 0;
  for (let iter = 0; iter < 6; iter++) {
    const scaled = raw.map((st) => scale(st, dbToGain(gainDb)));
    const m = sum(...scaled);
    tpBefore = truePeakDb(m);
    if (tpBefore > MIX.truePeakTarget) {
      const env = limiterGain(m, MIX.truePeakTarget - 0.15);
      stems = scaled.map((st) => scale(st, env));
      grMaxDb = 0;
      grOver1dbSeconds = 0;
      for (let i = 0; i < env.length; i++) {
        const gr = -gainToDb(env[i]);
        grMaxDb = Math.max(grMaxDb, gr);
        if (gr > 1) grOver1dbSeconds += 1 / SR;
      }
      limited = true;
    } else {
      stems = scaled;
      limited = false;
    }
    master = sum(...stems);
    const err = MIX.targetLufs - integratedLoudness(master);
    if (Math.abs(err) < 0.05) break;
    gainDb += err;
  }
  const g = dbToGain(gainDb);
  for (const s of [...stems, master]) fadeTail(s, 120);

  const [mStem, fxStem, vStem] = stems;
  writeWav(join(OUT_DIR, 'Kavolt_Kavey_20s_Music.wav'), mStem);
  writeWav(join(OUT_DIR, 'Kavolt_Kavey_20s_SFX.wav'), fxStem);
  writeWav(join(OUT_DIR, 'Kavolt_Kavey_20s_Narration.wav'), vStem);
  writeWav(join(OUT_DIR, 'Kavolt_Kavey_20s_Mix.wav'), master);
  writeWav(join(PUBLIC_AUDIO, 'mix.wav'), master);
  writeCaptions(placed);

  // Speech-to-music separation during each line.
  const sep = placed.map((p) => ({
    id: p.id,
    voice: +windowLoudness(vStem, p.start, p.end).toFixed(1),
    music: +windowLoudness(mStem, p.start, p.end).toFixed(1),
    sfx: +windowLoudness(fxStem, p.start, p.end).toFixed(1),
  }));
  const report = {
    sampleRate: SR,
    durationSeconds: DUR,
    integratedLufs: +integratedLoudness(master).toFixed(2),
    truePeakDbtp: +truePeakDb(master).toFixed(2),
    truePeakBeforeLimiter: +tpBefore.toFixed(2),
    limiterApplied: limited,
    limiterMaxReductionDb: +grMaxDb.toFixed(2),
    limiterSecondsOver1dB: +grOver1dbSeconds.toFixed(3),
    musicGainDb: +gainToDb(musicGain * g).toFixed(2),
    narration: placed.map((p) => ({...p, startFrame: +(p.start * FPS).toFixed(1), endFrame: +(p.end * FPS).toFixed(1)})),
    separationLufs: sep,
    sfxCues: SFX.map((c) => ({id: c.id, frame: c.frame, seconds: +(c.frame / FPS).toFixed(3)})),
  };
  writeFileSync(join(OUT_DIR, 'audio-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({lufs: report.integratedLufs, tp: report.truePeakDbtp, tpBefore: report.truePeakBeforeLimiter, limited, sep}, null, 1));
};

main();
