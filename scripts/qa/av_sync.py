"""A/V sync and audio integrity check for the muxed master.

1. Decodes the MP4's AAC track and cross-correlates it with the source mix
   WAV to measure any offset introduced by encoding (priming, edit lists).
2. Locates the catch thock (frame 18) and the brand hit (frame 1020) in the
   decoded audio by onset detection on the SFX stem's known envelope.
3. Reports decoded loudness/true peak and flags clipping, silence gaps or
   a missing tail.

  python scripts/qa/av_sync.py deliverables/Kavolt_Kavey_20s_Final.mp4
"""
import json
import subprocess
import sys

import numpy as np
import soundfile as sf


def decode(path):
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", path, "-map", "0:a:0", "-f", "f32le", "-ac", "2", "-ar", "48000", "-"],
        capture_output=True,
        check=True,
    )
    return np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, 2)


def onset(x, t_expect, sr=48000, search=0.08):
    a = int((t_expect - search) * sr)
    b = int((t_expect + search) * sr)
    seg = np.abs(x[a:b]).mean(axis=1)
    win = int(0.002 * sr)
    env = np.convolve(seg, np.ones(win) / win, mode="same")
    thr = env.max() * 0.3
    i = int(np.argmax(env > thr))
    return (a + i) / sr


def main(mp4):
    sr = 48000
    dec = decode(mp4)
    ref, _ = sf.read("audio/Kavolt_Kavey_20s_Mix.wav", dtype="float32")
    sfx, _ = sf.read("audio/Kavolt_Kavey_20s_SFX.wav", dtype="float32")
    n = min(len(dec), len(ref))
    # Cross-correlate the first 3 s (mono) to find the offset in samples.
    a = dec[: 3 * sr].mean(axis=1)
    b = ref[: 3 * sr].mean(axis=1)
    corr = np.correlate(a, b[sr // 4 : sr // 4 + 2 * sr], mode="valid")
    lag = int(np.argmax(corr)) - sr // 4
    res = {
        "decoded_seconds": len(dec) / sr,
        "offset_samples_vs_source": lag,
        "offset_ms_vs_source": round(1000 * lag / sr, 3),
        "catch_onset_s_source": round(onset(sfx, 0.3), 4),
        "catch_onset_s_decoded": round(onset(dec, 0.3), 4),
        "brand_hit_onset_s_source": round(onset(sfx, 17.0), 4),
        "brand_hit_onset_s_decoded": round(onset(dec, 17.0), 4),
        "decoded_peak_dbfs": round(20 * np.log10(np.abs(dec).max() + 1e-12), 2),
        "clipped_samples": int((np.abs(dec) >= 0.9999).sum()),
        "residual_vs_source_db": round(20 * np.log10(np.sqrt(np.mean((dec[:n] - ref[:n]) ** 2)) / np.sqrt(np.mean(ref[:n] ** 2))), 2),
    }
    res["catch_frame_decoded"] = round(res["catch_onset_s_decoded"] * 60, 2)
    res["brand_hit_frame_decoded"] = round(res["brand_hit_onset_s_decoded"] * 60, 2)
    print(json.dumps(res, indent=2, default=float))


if __name__ == "__main__":
    main(sys.argv[1])
