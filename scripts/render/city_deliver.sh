#!/usr/bin/env bash
# Post-render checks and deliverables for "Kavey in Chaos City".
# Run after: node scripts/render/render.mjs final --film=city
#   PY=/path/to/python bash scripts/render/city_deliver.sh
set -euo pipefail
PY=${PY:-python}
V=deliverables/Kavolt_ChaosCity_30s_Final.mp4
N=Kavolt_ChaosCity_30s
mkdir -p out/qa deliverables/audio

echo "== probe";   $PY scripts/qa/probe.py "$V" 1800 30 > out/qa/city_probe.json || true
echo "== a/v";     $PY scripts/qa/av_sync.py "$V" --prefix $N --events land=0.8667,salon_hit=5.3,launch=23.0,brand_hit=27.0 > out/qa/city_av_sync.json
echo "== motion";  $PY scripts/qa/motion.py "$V" --expect-cut 1605 --json out/qa/city_motion.json
echo "== clicks";  $PY scripts/qa/clicks.py audio/${N}_SFX.wav audio/${N}_Music.wav audio/${N}_Narration.wav audio/${N}_Mix.wav
echo "== storyboard"
$PY scripts/qa/frames.py "$V" --out out/qa/city_frames --cols 8 --thumb 240 \
  --frames 0,40,90,140,208,234,300,320,360,400,470,520,556,620,660,710,800,850,916,960,1004,1100,1180,1250,1320,1386,1420,1470,1545,1590,1640,1790 \
  --sheet deliverables/${N}_Storyboard.png --title "Kavey in Chaos City — 30 s, decoded frames from the final MP4"
echo "== cover (decoded frame 140)"
$PY scripts/qa/frames.py "$V" --out out/qa/city_cover --frames 140
cp out/qa/city_cover/f0140.png deliverables/${N}_Cover_9x16.png
$PY scripts/render/cover_square.py deliverables/${N}_Cover_9x16.png deliverables/${N}_Cover_1x1.png 210
echo "== audio deliverables"
cp audio/${N}_{Music,SFX,Narration,Mix}.wav audio/${N}_Captions.{srt,vtt} deliverables/audio/
echo done
