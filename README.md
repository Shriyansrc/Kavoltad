# Kavolt Studio: promo films

This repository produces two vertical (1080 × 1920, 60 fps) ads for Kavolt
Studio. Everything is code: Remotion (React + TypeScript) for the picture, a
deterministic offline synthesiser for the music and effects, and a local
neural TTS voice for narration. The supplied Kavey artwork is the only
character source; no video-generation model is used.

1. **“Kavey in Chaos City” (30 s): the current film.** Kavey explores a
   whole new world, faces three animated problems and Kavolt solves each one.
   See [the section below](#kavey-in-chaos-city-30-s).
2. **“Kavey turns chaos into a launch” (20 s):** the earlier film from the
   marketing plan, kept buildable. It is documented after the city film.

---

## Kavey in Chaos City (30 s)

### Story (script, 12 narration lines, 30.00 s)

| Time | Picture | Narration |
|---|---|---|
| 0–3 s | Night sky over Chaos City. Kavey streaks in as a comet, lands on the flickering SALON sign, rides the crane down and hops to the street. **WELCOME TO / CHAOS CITY.** | “Welcome to Chaos City.” |
| 3–8 s | Salon. Booking blocks rain onto a calendar critter and clash four times; Kavey jumps in surprise, then throws his cube. It becomes a **booking** hologram, the blocks snap into their own slots, customers walk in. **BOOKINGS CLASH. → BOOKINGS, SORTED.** | “Bookings clashing?” / “Sorted, with one booking flow.” |
| 8–13 s | Gym. Invoice paper planes with PENDING tags escape through the door; Kavey grabs one and misses. The cube becomes a **Razorpay** payment card; the planes U-turn into it and land as PAID rows. **PAYMENTS SLIP AWAY. → PAYMENTS, CONNECTED.** | “Payments slipping away?” / “Connected, with Razorpay.” |
| 13–18 s | Clinic. A clock snores, clients sleep in the flats above, the waiting room is empty. Kavey waves, gets an idea, throws: a **WhatsApp** reminder panel releases four message birds; each lands on a window and wakes a client, the alarm rings, patients walk in. **CLIENTS FORGET. → REMINDERS ON WHATSAPP.** | “Clients forgetting?” / “Reminders go out on WhatsApp.” |
| 18–24 s | Pull-back over the street. The three holograms fly to a hub and merge into one product on a phone; day chips DAY 01 SCOPE → DAYS 02–05 BUILD (Kavey conducts parts into it) → DAY 06 REVIEW (private preview approved) → DAY 07 LAUNCH. LIVE, the phone rockets up, fireworks, a light wave calms the whole city, the crowd cheers. **ONE PRODUCT. / 7 DAYS.** | “Kavolt ships it all as one product, in seven days.” / “Reviewed on your phone. Launched on day seven.” |
| 24–27 s | CODE and KEYS tiles are handed over; a billboard rises behind the gym sign and powers on with the real FCN storefront. **YOUR CODE. / YOUR KEYS. → SHIPPED. / NOT MOCKED UP.** Kavey dashes; his scarf becomes the ribbon that wipes the frame. | “Your code. Your keys.” / “Real work, shipped.” |
| 27–30 s | Brand hit on 27.00 s. Wordmark, **READY TO SHIP?**, Kavey, “Your business. Operational online.”, kavoltstudio.netlify.app over the calm skyline. | “Ready to ship? Check the website.” |

No prices, currency, amounts, discounts, metrics or testimonials appear
anywhere; UI labels are limited to BOOKING, RAZORPAY, PAYMENTS, PAID,
PENDING, WHATSAPP, REMINDER, PRIVATE PREVIEW, LIVE, CODE, KEYS and the shop
names.

### Deliverables (`deliverables/`)

| File | What it is |
|---|---|
| `Kavolt_ChaosCity_30s_Final.mp4` | H.264 High, 1080 × 1920, constant 60 fps, 1800 frames, 30.000 s, `yuv420p`, BT.709 (tagged), CRF 18, fast-start; stereo AAC-LC 48 kHz 256 kbps |
| `audio/Kavolt_ChaosCity_30s_{Music,SFX,Narration,Mix}.wav` | 48 kHz 24-bit stereo stems; Music + SFX + Narration sum to the Mix |
| `audio/Kavolt_ChaosCity_30s_Captions.{srt,vtt}` | Timed captions matching the placed narration |
| `Kavolt_ChaosCity_30s_Cover_9x16.png`, `…_Cover_1x1.png` | Cover still from the final film and a square crop |
| `Kavolt_ChaosCity_30s_Storyboard.png` | Contact sheet of decoded frames from the final MP4 |
| `Kavolt_ChaosCity_30s_Project.zip` | This project without `node_modules`, `out/` or deliverables |

### Commands actually used (city film)

```bash
npm ci
python scripts/tts/narrate.py --lines scripts/tts/lines_city.json --out audio-src/narration_city  # takes are committed
node scripts/audio/build-city-audio.ts          # score + SFX + ambience + narration → stems, mix, captions, report
node scripts/audio/city/audit-run.ts            # click audit of every effect in isolation
node scripts/render/stills.mjs --comp=KaveyChaosCity --frames=0,340,1385 --scale=0.5
node scripts/render/render.mjs draft --film=city
REMOTION_CONCURRENCY=4 node scripts/render/render.mjs final --film=city

python scripts/qa/probe.py deliverables/Kavolt_ChaosCity_30s_Final.mp4 1800 30
python scripts/qa/av_sync.py deliverables/Kavolt_ChaosCity_30s_Final.mp4 --prefix Kavolt_ChaosCity_30s --events land=0.8667,salon_hit=5.3,launch=23.0,brand_hit=27.0
python scripts/qa/transition_mask.py --comp CityTransitionMask --start 1590 --end 1619 --full 1602 1605 --json out/qa/city_transition_mask.json
python scripts/qa/asr_check.py --prefix Kavolt_ChaosCity_30s --report audio/city-audio-report.json --out audio/city-asr-check.json
python scripts/qa/clicks.py audio/Kavolt_ChaosCity_30s_*.wav
```

### How the city film is built (`src/city/`)

- **World with depth.** One street in world pixels with three districts
  (salon, gym, clinic) between filler blocks. Seven parallax planes: sky and
  moon (0.12), clouds (0.22), far skyline (0.35, defocused), mist, mid
  skyline (0.62), street (1.0), and near-lens string lights, poles and bokeh
  (1.35–1.6, defocused). Aerial-perspective mist sits between skyline rows;
  shops have side walls, rim light, awning shadows, lit interiors, light
  spill on the sidewalk and blurred neon reflections on the wet road. Cars
  drive, townsfolk walk (walk cycle, moods), windows flicker while a shop is
  broken and settle when it is fixed; a light wave relights the city at launch.
- **Camera.** Authored crane, travel between districts, pull-back, close-up
  and tilt (`camera.ts`), with punch-ins on every fix, impact shake and a
  soft handheld drift. Every parallax layer gets its own directional motion
  blur (180° shutter) from its screen velocity, so fast travel stays smooth.
- **Kavey.** The same cut-out rig of the supplied image (no redraw).
  `city/kavey.ts` keys him against the base camera so he stays readable while
  the world moves, then maps him through the live camera. Acting: comet
  entry, landing squash, perch, hop, surprise with widened eye glow, three
  wind-up throws of his cube (it flies, docks on the hologram as a projector
  and returns), a missed grab, waving at the sleeping clock, conducting the
  build, a launch jump, pointing at the billboard, the scarf dash. Ears and
  scarf flame use spring follow-through driven by his world acceleration;
  sub-frame motion blur (180°) when he moves fast.
- **Transition.** The 20 s film's ribbon, generalised (`makeRibbon`) and fed
  with the city scarf anchor; the ending switches in at frame 1605 under full
  cover.
- **Sound.** An original 30 s, 120 BPM A-minor cue: each district plays a
  tense half (half-time kick, off-beat stabs, a bending bass; a sleepy music
  box for the clinic) that lifts into four-on-the-floor with claps, 16th hats,
  ping-pong arps and sidechain pump at the fix; a riser and drop-out into the
  launch drop at 23.0 s; the −18 dB dip under the ribbon at 26.7 s; the
  resolve on the brand hit at 27.0 s. 90 frame-accurate effects (clanks,
  boings, cube throws, hologram transforms, paper flutter, snores, tick-tock,
  reminder pings, alarm bell, construct ticks, rocket launch, fireworks, keys,
  servo, power-up, scan …) plus three ambience beds for depth: city rumble,
  neon buzz that exists only while the shop in view is broken, and car passes
  placed where a car crosses the camera. Every effect is built from
  zero-starting envelopes with edge fades, and every effect is audited in isolation for
  clicks (`scripts/audio/city/audit-run.ts`).

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
