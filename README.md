# Kavolt Studio: “Kavey turns chaos into a launch” (20 s vertical film)

Code-driven production of the 20-second Reels/Shorts/TikTok film described in
[`docs/Kavolt_Kavey_20s_Marketing_Plan.md`](docs/Kavolt_Kavey_20s_Marketing_Plan.md).
It is built with Remotion (React + TypeScript), SVG/HTML layers, a
deterministic JavaScript offline synthesiser for the score and effects, and a
locally run neural TTS voice for the narration. No video-generation model is
used.

> **Status:** see [Production status](#production-status). The final master is
> only produced once the supplied brand assets are staged.

## Format

1080 × 1920 · 9:16 · 60 fps constant · 1200 frames (0–1199) · 20.00 s ·
H.264 High, CRF 18, `yuv420p`, BT.709 · stereo AAC 48 kHz 256 kbps · fast-start.

## Requirements

- Node.js ≥ 22.18 (runs the TypeScript audio scripts directly)
- `npm ci` installs everything else, including Remotion's compositor binaries
  and its bundled ffmpeg/ffprobe (`npx remotion ffmpeg`)
- Python 3.10+ only for narration generation and QA scripts
  (`pip install kokoro-onnx soundfile numpy scipy pillow pymatting rembg sherpa-onnx`)
- Remotion downloads a headless Chrome on first render. In the cloud session
  that host was blocked, so `remotion.config.ts` uses a local Chromium headless
  shell when present (`REMOTION_BROWSER` overrides the path).

## Commands actually used

```bash
npm ci

# 1. Stage and validate the supplied assets (originals copied byte-for-byte)
python scripts/assets/stage_assets.py --kavey <kavey_clean.png> \
  --wordmark <kavolt-logo.png> --fcn <fcn.png> --brand <kavolt-brand-master-document.md>
python scripts/matte/matte_kavey.py source-assets/kavey_clean.png

# 2. Audio
python scripts/tts/narrate.py --voice af_heart --out audio-src/narration   # optional: takes are committed
node scripts/audio/build-audio.ts                                           # score + SFX + mix + stems + captions

# 3. Preview
npm run preview                                  # Remotion Studio (scrub any frame)
node scripts/render/render.mjs draft             # 540×960 draft with audio
node scripts/render/render.mjs draft --frames=960-1019   # partial draft

# 4. Final master
node scripts/render/render.mjs final             # → deliverables/Kavolt_Kavey_20s_Final.mp4
npm run render:cover                             # 9:16 cover (frame 210) and 1:1 grid cover

# 5. QA
python scripts/qa/probe.py deliverables/Kavolt_Kavey_20s_Final.mp4
python scripts/qa/av_sync.py deliverables/Kavolt_Kavey_20s_Final.mp4
python scripts/qa/transition_mask.py
python scripts/qa/asr_check.py
python scripts/qa/frames.py deliverables/Kavolt_Kavey_20s_Final.mp4 --frames 0,18,150,… --sheet out/qa/sheet.png
```

## Project layout

| Path | Contents |
|---|---|
| `src/config/` | Single source of truth: format, palette, type, exact copy, narration windows, scene boundaries and key frames, sound cues, layout, Kavey anchors |
| `src/scenes/` | Pure per-frame models: persistent stage objects, Kavey's performance, the energy ribbon |
| `src/components/` | Layers: background/grid/grain, cards, frame (product → brief → build → phone → live → portfolio), connectors and pulse, rail, handoff tile, Kavey compositor, ribbon, type, ending |
| `src/Film.tsx` | Master composition and layer order; audio mounted outside all visual wrappers |
| `scripts/audio/` | `dsp.ts` (oscillators, filters, reverb, WAV I/O), `score.ts`, `sfx.ts`, `loudness.ts` (BS.1770 + true peak + limiter), `build-audio.ts` |
| `scripts/tts/narrate.py` | Local Kokoro narration takes |
| `scripts/matte/matte_kavey.py` | Edge-aware matte of the selected Kavey PNG |
| `scripts/assets/stage_assets.py` | Validation, hashing and staging of supplied assets |
| `scripts/render/render.mjs` | Draft and final render pipelines |
| `scripts/qa/` | ffprobe spec check, A/V sync, occlusion check, ASR intelligibility, frame extraction/contact sheets, approximate platform zones |
| `audio-src/narration/` | Narration takes (24 kHz) and their report |
| `audio/` | Delivered 48 kHz stems, mix, captions, audio report |
| `public/` | Fonts, staged working assets, mix used by the composition |
| `source-assets/` | Byte-identical copies of the supplied originals |
| `docs/` | Marketing plan (unchanged copy) and asset manifest |

## Technical decisions

- **One master clock.** Every position, mask, particle, glow and audio cue is a
  pure function of `frame` (t = frame / 60). Randomness uses seed `240926`
  (`mulberry32`). Scrubbing to a frame equals playing to it.
- **Persistent objects.** The same three cards travel through the whole film:
  chaos panels → product rows → brief rows → build nodes → phone rows → live
  rows. One frame object becomes the product frame, brief, build region,
  phone, live panel and portfolio window. Connector stubs that fail to meet in
  the chaos are the same stubs that join at 2.5 s.
- **Kavey (implementation adaptation).** The controlling reference is the
  selected `kavey_clean.png` (360 × 675 RGB). It is flat, so the planned rig
  acting (Curious/Focused/Happy/Excited clips, bone offsets) is translated into
  faithful 2.5D compositing of that image: whole-body translation, roll, a
  restrained perspective turn (rotateY ≤ 15°), pitch for nods, hover
  (8 · sin(2πt/2.8), 3 px while inspecting, 4 px at the end), timing and
  contact. One 4×4 matrix drives both the CSS transform and the projected
  anchor points, so the scarf wisp and the transition ribbon are attached to a
  stable local coordinate on the visible scarf. No face, anatomy or unseen side
  is invented; nothing is warped.
- **Transition.** The ribbon is a tapered Bézier band whose width, centre and
  travel are derived from the frame corners, so `scripts/qa/transition_mask.py`
  can prove 100 % opaque coverage for frames 1002–1005 (it currently covers
  1002–1008). The ending layout switches at 1005 under full occlusion.
- **Type.** Geist / Geist Mono variable fonts from the official `geist` npm
  package (SIL OFL), loaded locally before rendering. Measured widths fit
  every box at the planned sizes; `PRIVATE PREVIEW` uses −0.02em tracking to
  fit the 300 px phone.
- **Motion blur.** Only Kavey, and only when his silhouette moves faster than
  ~5 px/frame: sub-frame samples averaged with `plus-lighter` (90° shutter).
  Type and the face are never blurred during holds.
- **Audio.** Original 120 BPM A-minor cue (roots A2 A2 F2 F2 C3 C3 G2 G2 E2 A2,
  A-minor add-nine resolution at 17.00 s), synthesised sample-by-sample at
  48 kHz. Effects are built from sines and filtered seeded noise per the sound
  map. Music is ducked 4 dB under lines (40 ms attack, 180 ms release), dips
  18 dB over 40 ms at 16.7 s, and the brand hit lands at frame 1020, 200 ms
  before the final line. The master is normalised to −14 LUFS with a −1.5 dBTP
  true-peak ceiling; one shared limiter envelope keeps stems summing to the mix.
- **Narration.** Kokoro-82M (Apache-2.0) via `kokoro-onnx`, voice `af_heart`,
  speed 1.0 (natural). “Kavolt” is pronounced with the plan's provisional
  “kuh-volt” (/kəˈvoʊlt/). Every line fits its window without time compression.
  An offline Whisper small.en check transcribes all eight lines with 0 % WER
  from both the narration stem and the full mix.
