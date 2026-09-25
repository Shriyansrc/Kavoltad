"""Verify the signature transition fully occludes the frame.

Renders the `TransitionMask` debug composition (the ribbon's opaque core and
edge drawn white on black, same geometry as the film) for frames 990–1019 and
reports per-frame coverage. Frames 1002–1005 must be 100 % covered, including
all four corners; frame 1019 should be nearly clear.

  python scripts/qa/transition_mask.py
  python scripts/qa/transition_mask.py --comp CityTransitionMask --start 1590 --end 1619 --full 1602 1605 --json out/qa/city_transition_mask.json
"""
import argparse
import glob
import json
import os
import shutil
import subprocess

import numpy as np
from PIL import Image

OUT = "out/qa/mask"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--comp", default="TransitionMask")
    ap.add_argument("--start", type=int, default=990)
    ap.add_argument("--end", type=int, default=1019)
    ap.add_argument("--full", type=int, nargs=2, default=[1002, 1005])
    ap.add_argument("--json", default="out/qa/transition_mask.json")
    args = ap.parse_args()
    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(OUT, exist_ok=True)
    subprocess.run(
        ["npx", "remotion", "render", "src/index.ts", args.comp, OUT, "--sequence", "--image-format=png", f"--frames={args.start}-{args.end}", "--log=error"],
        check=True,
    )
    files = sorted(glob.glob(os.path.join(OUT, "*.png")))
    res = []
    for i, p in enumerate(files):
        frame = args.start + i
        a = np.asarray(Image.open(p).convert("L")).astype(np.float32) / 255
        cov = float((a > 0.999).mean())
        corners = [float(a[0, 0]), float(a[0, -1]), float(a[-1, 0]), float(a[-1, -1])]
        res.append({"frame": frame, "coverage": round(cov, 6), "corners": [round(c, 3) for c in corners], "min": round(float(a.min()), 4)})
    a0, a1 = args.full
    full = [r for r in res if a0 <= r["frame"] <= a1]
    ok = len(full) == a1 - a0 + 1 and all(r["coverage"] == 1.0 and r["min"] >= 0.999 for r in full)
    for r in res:
        print(f"{r['frame']}: coverage {r['coverage'] * 100:7.3f}%  corners {r['corners']}")
    print(f"FULL OCCLUSION {a0}–{a1}:", "PASS" if ok else "FAIL")
    json.dump({"comp": args.comp, "frames": res, "full_occlusion": [a0, a1], "pass": ok}, open(args.json, "w"), indent=2)


if __name__ == "__main__":
    main()
