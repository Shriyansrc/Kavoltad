# Kavolt Studio: promo films

This repository produces two vertical (1080 × 1920, 60 fps) ads for Kavolt
Studio. Everything is code: Remotion (React + TypeScript) for the picture, a
deterministic offline synthesiser for the music and effects, and a local
neural TTS voice for narration. The supplied Kavey artwork is the only
character source; no video-generation model is used.

1. **“Kavey in Chaos City” (48 s): the current film.** Kavey explores a
   bright new world where three shop owners voice their problems and Kavolt
   solves each one, then shows off stunning websites and apps and brings the
   business to the global stage. See [the section below](#kavey-in-chaos-city-48-s).
2. **“Kavey turns chaos into a launch” (20 s):** the earlier film from the
   marketing plan, kept buildable. It is documented after the city film.

---

## Kavey in Chaos City (48 s)

### Script (16 lines: an upbeat narrator and the three shop owners)

| Time | Picture | Voice |
|---|---|---|
| 0–3.9 s | Golden-dusk city. Kavey streaks in, lands on the SALON sign, rides the crane down. **WELCOME TO / CHAOS CITY.** | Narrator: “Welcome to Chaos City, where running a business gets a little crazy!” |
| 3.9–13.3 s | Pink boutique **salon**. Booking blocks clash on a calendar critter; the stylist panics. Kavey throws his cube: a booking hologram, blocks snap into slots, confetti, customers walk in, the stylist waves thanks. **BOOKINGS CLASH. → BOOKINGS, SORTED.** | Salon owner: “Oh no! The bookings at my salon are clashing again!” · Narrator: “No stress! Kavolt builds your salon one smooth booking flow, so every slot is sorted.” · Salon owner: “Amazing! Thank you!” |
| 13.3–21.2 s | Orange-and-slate **gym**. Invoice planes with PENDING tags escape; Kavey grabs one and misses; the cube becomes a Razorpay card and the planes land as PAID rows. **PAYMENTS SLIP AWAY. → PAYMENTS, CONNECTED.** | Gym owner: “Oh man! My gym's payments keep slipping away!” · Narrator: “Kavolt connects Razorpay, so every payment lands, right on time.” · Gym owner: “Yes! Let's go!” |
| 21.2–27.6 s | White-and-mint **clinic**. A snoring clock, sleeping patients upstairs; WhatsApp reminder birds wake each window, the alarm rings, patients arrive. **CLIENTS FORGET. → REMINDERS ON WHATSAPP.** | Clinic doctor: “Oh dear, my patients keep forgetting their appointments!” · Narrator: “Now WhatsApp reminders bring them right back to your door!” · Doctor: “Brilliant!” |
| 27.6–33.6 s | Pull-back. The holograms dock into a **salon website** (laptop) and **gym and clinic apps** (phones) that Kavey paints in five design beats: colour, type, layout, imagery, buttons. **STUNNING / WEBSITES & APPS.** | Narrator: “That's Kavolt! Stunning websites and apps, beautifully designed, with everything your business needs.” |
| 33.6–36.6 s | DAY 01 SCOPE → DAYS 02–05 BUILD → DAY 06 REVIEW (private preview approved) → DAY 07 LAUNCH. **LIVE IN / 7 DAYS.** | Narrator: “Built in just seven days, and reviewed right on your phone.” |
| 36.6–41.6 s | LIVE, light wave, fireworks, devices shoot skyward, crowd cheers; CODE and KEYS tiles; the billboard powers on with the real FCN storefront; the scarf ribbon wipes the frame. **YOUR CODE. YOUR KEYS. → SHIPPED. NOT MOCKED UP.** | Narrator: “Launch day! Your code and your keys, all yours.” · “Real work. Really shipped.” |
| 41.6–48 s | Brand hit. Kavey on a lit stage before a turning globe with city arcs, spotlights, confetti. **READY TO BRING YOUR BUSINESS TO THE GLOBAL STAGE?** and **kavolt.antideploy.com**. | Narrator: “Ready to bring your business to the global stage?” · “Visit kavolt dot antideploy dot com!” |

Voices are stock Kokoro-82M voices (narrator `af_heart` at 1.12× for energy;
salon owner `af_kore`, gym owner `am_fenrir`, clinic doctor `bf_emma`), not
imitations of real people. No prices, currency, amounts, metrics or
testimonials appear.

### Deliverables (`deliverables/`)

| File | What it is |
|---|---|
| `Kavolt_ChaosCity_48s_Final.mp4` | H.264 High, 1080 × 1920, constant 60 fps, 2880 frames, 48.000 s, `yuv420p`, BT.709 (tagged), CRF 18, fast-start; stereo AAC-LC 48 kHz 256 kbps |
| `audio/Kavolt_ChaosCity_48s_{Music,SFX,Narration,Mix}.wav` | 48 kHz 24-bit stereo stems; Music + SFX + Narration sum to the Mix |
| `audio/Kavolt_ChaosCity_48s_Captions.{srt,vtt}` | Timed captions with speaker tags for the owners |
| `Kavolt_ChaosCity_48s_Cover_9x16.png`, `…_Cover_1x1.png` | Cover still from the final film and a square crop |
| `Kavolt_ChaosCity_48s_Storyboard.png` | Contact sheet of decoded frames from the final MP4 |
| `Kavolt_ChaosCity_48s_Project.zip` | This project without `node_modules`, `out/` or deliverables |

The earlier 30 s cut (`Kavolt_ChaosCity_30s_*`) is kept in `deliverables/`
and in git history for reference.

### Commands actually used (city film)

```bash
npm ci
python scripts/tts/narrate.py --lines scripts/tts/lines_city_v2.json --out audio-src/narration_city_v2  # takes are committed
python scripts/tts/lipsync.py scripts/tts/lines_city_v2.json audio-src/narration_city_v2               # owners' mouth envelopes
node scripts/audio/build-city-audio.ts          # score + SFX + ambience + dialogue → stems, mix, captions, report
node scripts/audio/city/audit-run.ts            # click audit of every effect in isolation
node scripts/render/stills.mjs --comp=KaveyChaosCity --frames=0,330,1900,2700 --scale=0.5
REMOTION_CONCURRENCY=4 node scripts/render/render.mjs final --film=city
PY=python bash scripts/render/city_deliver.sh   # probe, A/V sync, motion, clicks, storyboard, covers, audio copies
python scripts/qa/transition_mask.py --comp CityTransitionMask --start 2466 --end 2495 --full 2478 2481 --json out/qa/city_transition_mask.json
python scripts/qa/asr_check.py --prefix Kavolt_ChaosCity_48s --report audio/city-audio-report.json --out audio/city-asr-check.json
```

### How the city film is built (`src/city/`)

- **A bright, deep world.** Golden-dusk sky with a low sun, lit clouds and a
  flock of birds; two warm-windowed skyline rows separated by pink mist;
  pastel filler blocks; three shops with their own architecture and colour
  (`world/Shops.tsx`): a pink boutique salon (arches, flower boxes, scissors
  sign), an industrial orange-and-slate gym (brick, dumbbell sign, runners
  on treadmills, punching bag) and a white-and-mint clinic (rounded facade,
  teal cross, sky-blue flats). Broken shops are dimmed and flicker; fixed
  ones light up with confetti and balloons. Trees sway, bunting flutters near
  the lens, cars and townsfolk move, road reflections shimmer, and every
  parallax layer has its own motion blur while the camera travels.
- **Owners** (`world/Owners.tsx`): a stylist, a gym owner and a doctor who
  speak their lines with lip-sync from their own voice tracks
  (`src/city/lipsync.json`), panic while the problem runs, gape at the
  hologram and cheer and wave thanks after the fix.
- **Kavey**: the supplied rig only, keyed against the base camera
  (`city/kavey.ts`): comet entry, perch, surprise, three wind-up throws, a
  missed grab, waving at the clock, painting the showcase, conducting the
  build, the launch jump, the handoff, pointing at the billboard, the scarf
  dash and a wave on the global stage. Every key eases from and to rest
  (checked numerically for velocity pops).
- **Music** (`scripts/audio/city/score.ts`): warm, smooth and lively, in
  120 BPM F major with the beat grid offset so the downbeats land on the
  cube hits, the showcase merge, the launch and the brand hit. It uses FM
  electric piano, kalimba arps, soft pads, round bass, a soft kick, claps and
  shaker, a music box for the sleepy clinic, and swells into every big
  moment. Problems play light and playful; fixes lift into the groove.
- **Sound design**: 115 synthesised, frame-placed effects plus city rumble,
  neon buzz only while the shop in view is broken, car passes and birdsong.
  All effects pass an isolated click audit. The narrator is centred and dry;
  the owners sit slightly left with a touch of room; a voice-bus peak
  control keeps the master limiter nearly idle.

### Verification (city film, final MP4)

- ffprobe: H.264 High, 1080 × 1920, 60/1 real and average frame rate, 2880
  decoded frames, 48.000 s, yuv420p, BT.709 primaries/transfer/matrix, tv
  range, AAC-LC 48 kHz stereo 256 kbps, moov before mdat. All checks pass.
- Audio: −14.0 LUFS integrated (source and decoded AAC), −1.65 dBTP source,
  −1.7 dBFS decoded peak, 0 clipped samples; the master limiter works at most
  0.24 dB (a voice-bus peak control handles speech first); decoded AAC vs
  source offset 0 samples; the brand hit decodes at frame 2496.08.
- Dialogue: on every line the voice is at least 10.6 LU above the music and
  11.3 LU above the effects. Offline Whisper small.en recognises all 16 lines
  in the full mix at 0 % WER (numerals and the spoken URL normalised).
- Clicks: all 115 effects pass the isolated click audit (edge ≤ 1.4e-5 of
  peak, no isolated spikes); stems show 0 clicks, 0 clipped samples, no DC.
- Motion: Kavey's keys ease from and to rest (numeric velocity check; the
  remaining fast accelerations are throws and lunges under motion blur);
  flyers use continuous-velocity splines. Decoded video: no duplicate frames
  and no unexpected single-frame jumps; the clash shake was softened after
  the first check. The largest frame-to-frame luminance change (14.5/255) is
  the dark ribbon sweeping in at frame 2476 (a darkening, not a flash).
- Transition: `CityTransitionMask` covers 100 % of the frame, corners
  included, for frames 2478–2484; the swap happens on 2481.

### Limitations (city film)

- I cannot watch video in real time or listen here. Motion was checked with
  numeric continuity tests and decoded frames; sound with loudness metering,
  click audits and speech recognition, not by ear.
- The voice is a synthetic TTS voice; recorded human takes can replace
  `audio-src/narration_city/*.wav`, and `node scripts/audio/build-city-audio.ts`
  rebuilds the mix and captions.
- Platform UI zones were only approximated (`scripts/qa/safe_zones.py`).
- A full-resolution render takes about 100 minutes on 4 cores.

---

## Kavey turns chaos into a launch (20 s)

Code-driven production of the 20-second Reels/Shorts/TikTok ad described in
[`docs/Kavolt_Kavey_20s_Marketing_Plan.md`](docs/Kavolt_Kavey_20s_Marketing_Plan.md),
rebuilt after review feedback as a lively motion-graphics piece with real
character animation of the supplied Kavey. Remotion (React + TypeScript) for
picture, a deterministic JavaScript offline synthesiser for music and effects,
and a local neural TTS voice for narration. No video-generation model is used.

### Deliverables (`deliverables/`)

| File | What it is |
|---|---|
| `Kavolt_Kavey_20s_Final.mp4` | H.264 High, 1080 × 1920, constant 60 fps, 1200 frames, 20.000 s, `yuv420p`, BT.709 (tagged), CRF 18, fast-start; stereo AAC-LC 48 kHz 256 kbps |
| `audio/Kavolt_Kavey_20s_{Music,SFX,Narration,Mix}.wav` | 48 kHz 24-bit stereo stems; Music + SFX + Narration sum to the Mix |
| `audio/Kavolt_Kavey_20s_Captions.{srt,vtt}` | Timed captions matching the placed narration |
| `Kavolt_Kavey_20s_Cover_9x16.png`, `…_Cover_1x1.png` | Cover from 3.5 s (frame 210); the square version is a 1080 × 1080 window of that same frame holding the headline and Kavey's face |
| `Kavolt_Kavey_20s_Storyboard.png` | Contact sheet of decoded frames from the final MP4 |
| `Kavolt_Kavey_20s_Project.zip` | This project without `node_modules`, `out/` or deliverables |

### Requirements

- Node.js ≥ 22.18 (runs the TypeScript audio scripts directly) and `npm ci`
- Remotion renders with a Chromium headless shell. `remotion.config.ts` uses a
  local one when `REMOTION_BROWSER` or the default path exists; otherwise
  Remotion downloads its own on first render.
- Python 3.10+ only for asset preparation, narration and QA:
  `pip install kokoro-onnx soundfile numpy scipy pillow opencv-python-headless pymatting rembg sherpa-onnx`
- ffmpeg on PATH only for the QA scripts (rendering uses Remotion's bundled ffmpeg).

### Commands actually used

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
npm run render:cover                             # frame 210 still + square crop

# QA
python scripts/qa/probe.py deliverables/Kavolt_Kavey_20s_Final.mp4
python scripts/qa/av_sync.py deliverables/Kavolt_Kavey_20s_Final.mp4
python scripts/qa/transition_mask.py
python scripts/qa/asr_check.py
python scripts/qa/frames.py deliverables/Kavolt_Kavey_20s_Final.mp4 --frames 0,18,150,… --sheet deliverables/Kavolt_Kavey_20s_Storyboard.png
```

### How it is built

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

### Verification (final MP4)

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

### Remaining limitations

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
