# Kavolt Studio: “Kavey turns chaos into a launch” (20 s vertical ad)

Code-driven production of the 20-second Reels/Shorts/TikTok ad described in
[`docs/Kavolt_Kavey_20s_Marketing_Plan.md`](docs/Kavolt_Kavey_20s_Marketing_Plan.md),
rebuilt after review feedback as a lively motion-graphics piece with real
character animation of the supplied Kavey. Remotion (React + TypeScript) for
picture, a deterministic JavaScript offline synthesiser for music and effects,
and a local neural TTS voice for narration. No video-generation model is used.

## Deliverables (`deliverables/`)

| File | What it is |
|---|---|
| `Kavolt_Kavey_20s_Final.mp4` | H.264 High, 1080 × 1920, constant 60 fps, 1200 frames, 20.000 s, `yuv420p`, BT.709 (tagged), CRF 18, fast-start; stereo AAC-LC 48 kHz 256 kbps |
| `audio/Kavolt_Kavey_20s_{Music,SFX,Narration,Mix}.wav` | 48 kHz 24-bit stereo stems; Music + SFX + Narration sum to the Mix |
| `audio/Kavolt_Kavey_20s_Captions.{srt,vtt}` | Timed captions matching the placed narration |
| `Kavolt_Kavey_20s_Cover_9x16.png`, `…_Cover_1x1.png` | Cover from 3.5 s (frame 210); square version repositions the same frame |
| `Kavolt_Kavey_20s_Storyboard.png` | Contact sheet of decoded frames from the final MP4 |
| `Kavolt_Kavey_20s_Project.zip` | This project without `node_modules`, `out/` or deliverables |

## Requirements

- Node.js ≥ 22.18 (runs the TypeScript audio scripts directly) and `npm ci`
- Remotion renders with a Chromium headless shell. `remotion.config.ts` uses a
  local one when `REMOTION_BROWSER` or the default path exists; otherwise
  Remotion downloads its own on first render.
- Python 3.10+ only for asset preparation, narration and QA:
  `pip install kokoro-onnx soundfile numpy scipy pillow opencv-python-headless pymatting rembg sherpa-onnx`
- ffmpeg on PATH only for the QA scripts (rendering uses Remotion's bundled ffmpeg).

## Commands actually used

```bash
npm ci

# Assets (originals are copied byte-for-byte into source-assets/)
python scripts/assets/stage_assets.py --kavey <kavey_clean.png> --wordmark <kavolt-logo.png> --fcn <fcn.png>
python scripts/matte/matte_kavey.py source-assets/kavey_clean.png --out out/matte_v1   # edge-aware matte
cp out/matte_v1/kavey_matte.png public/assets/kavey_matte.png
python scripts/matte/rig_parts.py public/assets/kavey_matte.png --out public/assets/kavey  # cut-out rig

# Audio
python scripts/tts/narrate.py --voice af_heart --out audio-src/narration   # takes are committed
node scripts/audio/build-audio.ts                                           # score + SFX + mix + stems + captions

# Preview
npm run preview                                    # Remotion Studio
node scripts/render/stills.mjs --frames=0,150,1020 --scale=0.5
node scripts/render/render.mjs draft               # 540×960 draft with audio

# Final master (PNG frames → x264 CRF 18 + AAC 256k)
REMOTION_CONCURRENCY=4 node scripts/render/render.mjs final
npm run render:cover

# QA
python scripts/qa/probe.py deliverables/Kavolt_Kavey_20s_Final.mp4
python scripts/qa/av_sync.py deliverables/Kavolt_Kavey_20s_Final.mp4
python scripts/qa/transition_mask.py
python scripts/qa/asr_check.py
python scripts/qa/frames.py deliverables/Kavolt_Kavey_20s_Final.mp4 --frames 0,18,150,… --sheet deliverables/Kavolt_Kavey_20s_Storyboard.png
```

## How it is built

- **One master clock.** Every transform, spring, particle, mask and audio cue
  is a pure function of `frame` (t = frame / 60); randomness uses seed
  `240926`. Scrubbing to a frame equals playing to it. Copy, palette, type,
  scene boundaries, key frames and sound cues live in `src/config/`.
- **Kavey rig (implementation adaptation).** The controlling reference is the
  supplied `kavey_clean.png` (360 × 675 RGB). It is matted (BiRefNet-lite
  prior + closed-form matting + foreground decontamination, checked over navy,
  green, white and a checkerboard), then split into a cut-out rig: both ear
  flames, the scarf-tail flame, the raised hand, the presenting hand, the
  cube, and both eyes. Areas the moving parts covered are filled from the same
  material; the eyes are additive light layers over a cleaned visor, so blinks
  and glances leave no ghost. The layers re-composite to the matte with a mean
  error of 0.002 %. Kavey never gets a new face or unseen anatomy: acting is
  whole-body motion (lean, restrained rotateY ≤ 15°, squash/stretch ≤ 7 %),
  spring-simulated follow-through on the flames, hand gestures, the floating
  cube, blinks and eye direction. The plan's rig clips (Curious, Focused,
  Happy, Excited) are played as poses and timing on this image.
- **Motion design.** Deterministic springs (closed-form damped oscillators)
  drive every entrance, morph and settle; kinetic type pops in word by word;
  the stage camera shakes during the chaos, calms as the system forms, and
  pushes on key beats; cards leave motion trails; sparkle bursts, a shockwave,
  a spark from Kavey's hand, cable pulses, a radar LIVE badge and a 3D flip to
  the real FCN screenshot carry the story. The same three cards travel through
  chaos → product → brief → build → phone → live product.
- **Transition.** The energy ribbon grows from the scarf-tail flame, widens to
  a 1700 px core with a magenta edge, and is geometrically derived from the
  frame corners; `scripts/qa/transition_mask.py` proves 100 % opaque coverage
  for frames 1002–1008. The ending switches in at frame 1005 under full cover.
- **Audio.** Original 120 BPM A-minor cue: filtered pulse and ticks, a riser
  into 2.5 s, four-on-the-floor kick with sidechain pump, claps, hats, bass and
  arps through the build, a thinner proof section, a snare roll into the
  scarf sweep, the −18 dB dip at 16.7 s and the A-minor add-nine drop with the
  brand hit on frame 1020. Every visible move has an effect (pops, whooshes,
  snaps, ascending blips for the seven days, the lock click, the spark, check
  chime, SHIPPED slam), all from sines and seeded noise. Music sits ~14 dB
  under speech on lines (4 dB duck, 40 ms attack, 180 ms release); master
  normalised to −14 LUFS with a −1.5 dBTP true-peak ceiling and one shared
  limiter envelope so the stems still sum to the mix.
- **Narration.** Kokoro-82M (Apache-2.0) via `kokoro-onnx`, stock voice
  `af_heart`, natural speed; “Kavolt” uses the plan's provisional “kuh-volt”.
  Every line fits its window without time compression.

## Verification (final MP4)

- ffprobe: h264 High, 1080×1920, 60/1 real and average frame rate, 1200 decoded
  frames, 20.000 s, yuv420p, bt709 primaries/transfer/matrix, tv range, AAC-LC
  48 kHz stereo ~256 kbps, moov before mdat — all checks pass.
- Decoded audio: −14.0 LUFS integrated, −1.6 dBTP, 0 clipped samples, 0-sample
  offset against the source mix; brand hit onset at frame 1020.0; catch thock at
  0.300 s (frame 18) in the SFX stem.
- Offline Whisper small.en transcribes all eight lines with 0 % WER from the
  narration stem and from the full mix.
- Frame-to-frame luminance never exceeds 26.5/255 mean (no flash); the ending
  swap (1004→1005) changes 0.21/255 on average (invisible under the ribbon).
- Decoded frames 0, 18, 150, 162, 210, 324, 438, 480, 534, 558, 654, 738, 852,
  960, 996, 1002, 1005, 1012, 1020, 1080 and 1199 were inspected.

## Remaining limitations

- I cannot listen to audio in this environment. The mix was verified by
  loudness/true-peak metering, spectrogram and waveform inspection and speech
  recognition, not by ear.
- The narration is a synthetic TTS voice. “Booking chaos?” is delivered with a
  falling (rhetorical) contour; a recorded human read can replace
  `audio-src/narration/*.wav` and `node scripts/audio/build-audio.ts` rebuilds
  the mix and captions.
- Platform UI overlays were checked only against conservative approximate zones
  (`scripts/qa/safe_zones.py`), not real Instagram/YouTube/TikTok previews.
- The wordmark and FCN screenshot were fetched from the live site through an
  image proxy (the site host is blocked in this session); dimensions match the
  plan. The brand master document was not available, so the plan governs copy
  and palette. See `docs/ASSET_MANIFEST.json`.
- Remotion is free for individuals and small companies; larger teams need a
  Remotion company licence.
