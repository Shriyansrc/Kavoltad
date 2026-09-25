#!/usr/bin/env bash
# Post-render checks and deliverables for "Kavey in Chaos City".
# Run after: node scripts/render/render.mjs final --film=city
#   PY=/path/to/python bash scripts/render/city_deliver.sh
set -euo pipefail
PY=${PY:-python}
V=deliverables/Kavolt_ChaosCity_48s_Final.mp4
N=Kavolt_ChaosCity_48s
mkdir -p out/qa deliverables/audio

echo "== probe";   $PY scripts/qa/probe.py "$V" 2880 48 > out/qa/city_probe.json || true
echo "== a/v";     $PY scripts/qa/av_sync.py "$V" --prefix $N --events land=0.8667,salon_hit=7.05,launch=36.6,brand_hit=41.6 > out/qa/city_av_sync.json
echo "== motion";  $PY scripts/qa/motion.py "$V" --expect-cut 2481 --json out/qa/city_motion.json
echo "== clicks";  $PY scripts/qa/clicks.py audio/${N}_SFX.wav audio/${N}_Music.wav audio/${N}_Narration.wav audio/${N}_Mix.wav
echo "== storyboard"
$PY scripts/qa/frames.py "$V" --out out/qa/city_frames --cols 8 --thumb 240 \
  --frames 0,60,150,270,330,423,560,720,830,900,966,1100,1180,1300,1400,1452,1510,1580,1630,1720,1830,1930,2060,2140,2210,2270,2350,2420,2470,2540,2700,2870 \
  --sheet deliverables/${N}_Storyboard.png --title "Kavey in Chaos City — 48 s, decoded frames from the final MP4"
echo "== cover (decoded frame 150)"
$PY scripts/qa/frames.py "$V" --out out/qa/city_cover --frames 150
cp out/qa/city_cover/f0150.png deliverables/${N}_Cover_9x16.png
$PY scripts/render/cover_square.py deliverables/${N}_Cover_9x16.png deliverables/${N}_Cover_1x1.png 210
echo "== audio deliverables"
cp audio/${N}_{Music,SFX,Narration,Mix}.wav audio/${N}_Captions.{srt,vtt} deliverables/audio/
echo done
