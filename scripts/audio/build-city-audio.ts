// Audio for "Kavey in Chaos City" (30 s): score + sound design + ambience
// beds + narration placed from the city takes, ducking, loudness to -14 LUFS
// under a true-peak ceiling (one shared limiter envelope, so the stems still
// sum to the master), stems, captions and a report.
//
//   node scripts/audio/build-city-audio.ts
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {NARR2, SFX2} from '../../src/city/config.ts';
import {MIX} from '../../src/config/cues.ts';
import {addMono, addStereo, biquad, dbToGain, gainToDb, makeStereo, readWav, reverb, SR, writeWav, type Stereo} from './dsp.ts';
import {integratedLoudness, limiterGain, truePeakDb, windowLoudness} from './loudness.ts';
import {renderCityScore} from './city/score.ts';
import {CITY_DUR, renderCitySfx} from './city/sfx.ts';

const ROOT = process.cwd();
const NARR_DIR = join(ROOT, 'audio-src/narration_city_v2');
const OUT_DIR = join(ROOT, 'audio');
const PUBLIC_AUDIO = join(ROOT, 'public/audio');
const NAME = 'Kavolt_ChaosCity_48s';
const DUR = CITY_DUR;
const FPS = 60;
mkdirSync(OUT_DIR, {recursive: true});
mkdirSync(PUBLIC_AUDIO, {recursive: true});

/** 2× upsampler (24 → 48 kHz), Kaiser-windowed sinc. */
const upsample2 = (x: Float32Array) => {
  const half = 32;
  const beta = 8;
  const bessel = (v: number) => {
    let s = 1;
    let t = 1;
    for (let k = 1; k < 30; k++) {
      t *= (v / (2 * k)) * (v / (2 * k));
      s += t;
    }
    return s;
  };
  const taps: number[] = [];
  for (let k = -half + 1; k <= half; k++) {
    const d = 0.5 - k;
    const r = (k - 0.5) / half;
    taps.push((Math.sin(Math.PI * d) / (Math.PI * d)) * (bessel(beta * Math.sqrt(Math.max(0, 1 - r * r))) / bessel(beta)));
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

const compress = (x: Float32Array, thresholdDb: number, ratio: number, attackMs = 4, releaseMs = 90) => {
  const out = new Float32Array(x.length);
  const aA = Math.exp(-1 / ((attackMs / 1000) * SR));
  const aR = Math.exp(-1 / ((releaseMs / 1000) * SR));
  let env = 0;
  const knee = 6;
  for (let i = 0; i < x.length; i++) {
    const lvl = Math.abs(x[i]);
    env = lvl > env ? aA * env + (1 - aA) * lvl : aR * env + (1 - aR) * lvl;
    const over = gainToDb(env) - thresholdDb;
    let red = 0;
    if (over > knee / 2) red = over * (1 - 1 / ratio);
    else if (over > -knee / 2) red = ((over + knee / 2) ** 2 / (2 * knee)) * (1 - 1 / ratio);
    out[i] = x[i] * dbToGain(-red);
  }
  return out;
};

type Placed = {id: string; text: string; start: number; end: number; window: [number, number]; speaker: string};

const SPEAKER: Record<string, string> = {salon: 'Salon owner', gym: 'Gym owner', clinic: 'Clinic doctor'};

const buildNarration = () => {
  // The TTS input and the film's copy of the dialogue must be identical.
  const json = JSON.parse(readFileSync(join(ROOT, 'scripts/tts/lines_city_v2.json'), 'utf8'));
  if (JSON.stringify(json) !== JSON.stringify(NARR2)) throw new Error('src/city/lines.ts is out of sync with scripts/tts/lines_city_v2.json');
  const bus = makeStereo(DUR);
  const placed: Placed[] = [];
  for (const line of NARR2) {
    const path = join(NARR_DIR, `${line.id}.wav`);
    if (!existsSync(path)) throw new Error(`missing take ${path} — run scripts/tts/narrate.py --lines scripts/tts/lines_city_v2.json --out audio-src/narration_city_v2`);
    const {s, sr} = readWav(path);
    let mono = s.L;
    if (sr === 24000) mono = upsample2(mono);
    else if (sr !== SR) throw new Error(`unsupported narration sample rate ${sr}`);
    mono = biquad(mono, 'highpass', 75, 0.707);
    mono = biquad(mono, 'peaking', 3400, 0.9, 1.5);
    mono = biquad(mono, 'lowshelf', 180, 0.7, -1);
    let pk = 0;
    for (const v of mono) pk = Math.max(pk, Math.abs(v));
    mono = compress(mono, gainToDb(pk) - 9, 3, 4, 90);
    const line48: Stereo = {L: mono, R: mono};
    const venv = limiterGain(line48, truePeakDb(line48) - 3.5, 1.5, 60);
    mono = mono.map((v, i) => v * venv[i]);
    // 3 ms fades on every take so no line can click in or out
    const f3 = Math.round(0.003 * SR);
    for (let i = 0; i < f3; i++) {
      const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / f3);
      mono[i] *= g;
      mono[mono.length - 1 - i] *= g;
    }
    const lufs = windowLoudness({L: mono, R: mono}, 0, mono.length / SR);
    const g = dbToGain(-18 - lufs);
    const dur = mono.length / SR;
    if (dur > line.end - line.start + 1e-3) throw new Error(`${line.id} overruns its window (${dur.toFixed(2)} s)`);
    // Shop owners speak from the scene (slightly left, a touch of room);
    // the narrator stays centred and dry.
    if (line.speaker === 'narrator') addMono(bus, mono, line.start, g, 0);
    else {
      const one = makeStereo(dur + 0.6);
      addMono(one, mono, 0, g, -0.12);
      const wet = reverb(one, {room: 0.45, damp: 0.5, predelay: 0.008});
      addStereo(one, wet, 0, 0.18);
      addStereo(bus, one, line.start, 1);
    }
    placed.push({id: line.id, text: line.text, start: line.start, end: line.start + dur, window: [line.start, line.end], speaker: line.speaker});
  }
  // Voice-bus peak control (transparent, ~2–4 dB on the hottest syllables) so the
  // master limiter never has to squash speech.
  const env = limiterGain(bus, -9, 1.5, 80);
  for (let i = 0; i < bus.L.length; i++) {
    bus.L[i] *= env[i];
    bus.R[i] *= env[i];
  }
  return {bus, placed};
};

/** Smooth duck curve (raised-cosine ramps, no corners). */
const duckCurve = (placed: Placed[]) => {
  const n = DUR * SR;
  const out = new Float32Array(n);
  const att = MIX.duckAttackMs / 1000;
  const rel = MIX.duckReleaseMs / 1000;
  const sc = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, u)));
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let db = 0;
    for (const p of placed) {
      let d = 0;
      if (t >= p.start - att && t < p.start) d = MIX.duckDb * sc((t - (p.start - att)) / att);
      else if (t >= p.start && t <= p.end) d = MIX.duckDb;
      else if (t > p.end && t < p.end + rel) d = MIX.duckDb * (1 - sc((t - p.end) / rel));
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
  for (const s of ss)
    for (let i = 0; i < out.L.length; i++) {
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

const ts = (t: number, sep: string) => {
  const ms = Math.round(t * 1000);
  const p = (v: number, w = 2) => String(v).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor((ms % 3600000) / 60000))}:${p(Math.floor((ms % 60000) / 1000))}${sep}${p(ms % 1000, 3)}`;
};

const main = () => {
  console.log('score …');
  const music = renderCityScore();
  console.log('sfx …');
  const {bus: fxCues, beds, carPasses} = renderCitySfx();
  console.log('narration …');
  const {bus: voice, placed} = buildNarration();
  for (let i = 1; i < placed.length; i++) if (placed[i].start < placed[i - 1].end) throw new Error(`${placed[i].id} overlaps ${placed[i - 1].id}`);

  const speechLufs = -18;
  const musicRef = windowLoudness(music, 4, 40);
  const musicGain = dbToGain(speechLufs - 10 - musicRef);
  const duck = duckCurve(placed);
  // 22 Hz high-pass on music and effects: removes DC and sub-sonic energy.
  const hp = (s: Stereo): Stereo => ({L: biquad(biquad(s.L, 'highpass', 22, 0.707), 'highpass', 22, 0.707), R: biquad(biquad(s.R, 'highpass', 22, 0.707), 'highpass', 22, 0.707)});
  const musicStem = scale(scale(hp(music), musicGain), duck);
  const sfxStem = hp(sum(scale(fxCues, dbToGain(-4)), beds));

  const raw = [musicStem, sfxStem, voice];
  let gainDb = MIX.targetLufs - integratedLoudness(sum(...raw));
  let stems = raw;
  let master = sum(...raw);
  let tpBefore = 0;
  let grMaxDb = 0;
  let grOver1 = 0;
  for (let iter = 0; iter < 8; iter++) {
    const scaled = raw.map((st) => scale(st, dbToGain(gainDb)));
    const m = sum(...scaled);
    tpBefore = truePeakDb(m);
    if (tpBefore > MIX.truePeakTarget) {
      const env = limiterGain(m, MIX.truePeakTarget - 0.15);
      stems = scaled.map((st) => scale(st, env));
      grMaxDb = 0;
      grOver1 = 0;
      for (let i = 0; i < env.length; i++) {
        const gr = -gainToDb(env[i]);
        grMaxDb = Math.max(grMaxDb, gr);
        if (gr > 1) grOver1 += 1 / SR;
      }
    } else stems = scaled;
    master = sum(...stems);
    const err = MIX.targetLufs - integratedLoudness(master);
    if (Math.abs(err) < 0.05) break;
    gainDb += err;
  }
  for (const s of [...stems, master]) fadeTail(s, 60);

  const [mStem, fxStem, vStem] = stems;
  writeWav(join(OUT_DIR, `${NAME}_Music.wav`), mStem);
  writeWav(join(OUT_DIR, `${NAME}_SFX.wav`), fxStem);
  writeWav(join(OUT_DIR, `${NAME}_Narration.wav`), vStem);
  writeWav(join(OUT_DIR, `${NAME}_Mix.wav`), master);
  writeWav(join(PUBLIC_AUDIO, 'city_mix.wav'), master);
  const cap = (p: Placed) => (SPEAKER[p.speaker] ? `[${SPEAKER[p.speaker]}] ${p.text}` : p.text);
  const srt = placed.map((p, i) => `${i + 1}\n${ts(p.start, ',')} --> ${ts(p.end + 0.12, ',')}\n${cap(p)}\n`).join('\n');
  const vtt = 'WEBVTT\n\n' + placed.map((p) => `${ts(p.start, '.')} --> ${ts(p.end + 0.12, '.')}\n${cap(p)}\n`).join('\n');
  writeFileSync(join(OUT_DIR, `${NAME}_Captions.srt`), srt);
  writeFileSync(join(OUT_DIR, `${NAME}_Captions.vtt`), vtt);

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
    limiterMaxReductionDb: +grMaxDb.toFixed(2),
    limiterSecondsOver1dB: +grOver1.toFixed(3),
    narration: placed.map((p) => ({...p, startFrame: +(p.start * FPS).toFixed(1), endFrame: +(p.end * FPS).toFixed(1)})),
    separationLufs: sep,
    sfxCues: SFX2.map((c) => ({id: c.id, kind: c.kind, frame: c.frame, seconds: +(c.frame / FPS).toFixed(3)})),
    carPasses,
  };
  writeFileSync(join(OUT_DIR, 'city-audio-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({lufs: report.integratedLufs, tp: report.truePeakDbtp, tpBefore: report.truePeakBeforeLimiter, gr: report.limiterMaxReductionDb, grOver1, carPasses: carPasses.length, sep}, null, 1));
};

main();

