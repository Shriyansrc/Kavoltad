"""Motion continuity and flash check on the decoded master.

Decodes every frame (luma, downscaled to 270 x 480) and reports:
- frame-to-frame mean luminance change (flash risk: large global jumps);
- mean absolute difference between consecutive frames;
- duplicate frames (difference ~0 while the film is moving — stutter);
- single-frame spikes (difference > 3x the median of the 10 neighbours and
  > 4/255), which is where a pop or jump would show.

  python scripts/qa/motion.py deliverables/Kavolt_ChaosCity_30s_Final.mp4 --expect-cut 1605
"""
import argparse
import json
import subprocess

import numpy as np


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--expect-cut", type=int, nargs="*", default=[])
    ap.add_argument("--json", default="out/qa/motion.json")
    a = ap.parse_args()
    w, h = 270, 480
    raw = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", a.video, "-vf", f"scale={w}:{h}:flags=area,format=gray", "-f", "rawvideo", "-"],
        capture_output=True,
        check=True,
    ).stdout
    fr = np.frombuffer(raw, dtype=np.uint8).reshape(-1, h, w).astype(np.float32)
    n = len(fr)
    lum = fr.mean(axis=(1, 2))
    diff = np.array([np.abs(fr[i] - fr[i - 1]).mean() for i in range(1, n)])
    dl = np.abs(np.diff(lum))
    dups = [i + 1 for i, d in enumerate(diff) if d < 0.05]
    spikes = []
    for i in range(len(diff)):
        lo, hi = max(0, i - 5), min(len(diff), i + 6)
        neigh = np.concatenate([diff[lo:i], diff[i + 1:hi]])
        med = float(np.median(neigh)) if len(neigh) else 0.0
        if diff[i] > 4 and diff[i] > 3 * med:
            spikes.append({"frame": i + 1, "diff": round(float(diff[i]), 2), "neighbour_median": round(med, 2), "expected_cut": (i + 1) in a.expect_cut})
    res = {
        "frames": n,
        "max_luma_jump": round(float(dl.max()), 2),
        "max_luma_jump_frame": int(np.argmax(dl)) + 1,
        "mean_frame_diff": round(float(diff.mean()), 3),
        "max_frame_diff": round(float(diff.max()), 2),
        "max_frame_diff_frame": int(np.argmax(diff)) + 1,
        "duplicate_frames": dups,
        "spikes": spikes,
        "unexpected_spikes": [s for s in spikes if not s["expected_cut"]],
    }
    json.dump(res, open(a.json, "w"), indent=1)
    print(json.dumps({k: v for k, v in res.items() if k != "spikes"}, indent=1))


if __name__ == "__main__":
    main()
