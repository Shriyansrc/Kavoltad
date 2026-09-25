"""Per-frame (60 fps) mouth-open envelopes for the on-screen speakers.

Reads the placed owner takes (lines with speaker != narrator) and writes
src/city/lipsync.json: {id: {speaker, start (s), env: [0..1 per frame]}}.
The envelope is the smoothed RMS in the 300 Hz–3 kHz speech band, so the
mouth follows syllables rather than breaths.

  python scripts/tts/lipsync.py scripts/tts/lines_city_v2.json audio-src/narration_city_v2
"""
import json
import sys

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

lines, folder = sys.argv[1], sys.argv[2]
out = {}
for d in json.load(open(lines)):
    if d.get("speaker", "narrator") == "narrator":
        continue
    a, sr = sf.read(f"{folder}/{d['id']}.wav", dtype="float32")
    if a.ndim > 1:
        a = a.mean(axis=1)
    band = sosfilt(butter(4, [300, 3000], btype="band", fs=sr, output="sos"), a)
    hop = sr / 60
    env = []
    for k in range(int(len(band) / hop) + 1):
        seg = band[int(k * hop): int((k + 1) * hop)]
        env.append(float(np.sqrt(np.mean(seg**2))) if len(seg) else 0.0)
    env = np.array(env)
    env = np.convolve(env, np.ones(3) / 3, mode="same")
    env = np.clip(env / (np.percentile(env, 95) + 1e-9), 0, 1)
    out[d["id"]] = {"speaker": d["speaker"], "start": d["start"], "env": [round(float(v), 3) for v in env]}
json.dump(out, open("src/city/lipsync.json", "w"))
print({k: (v["speaker"], v["start"], len(v["env"])) for k, v in out.items()})
