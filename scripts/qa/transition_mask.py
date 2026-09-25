"""Verify the signature transition fully occludes the frame.

Renders the `TransitionMask` debug composition (the ribbon's opaque core and
edge drawn white on black, same geometry as the film) for frames 990–1019 and
reports per-frame coverage. Frames 1002–1005 must be 100 % covered, including
all four corners; frame 1019 should be nearly clear.

  python scripts/qa/transition_mask.py
"""
import glob
import json
import os
import shutil
import subprocess

import numpy as np
from PIL import Image

OUT = "out/qa/mask"


def main():
    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(OUT, exist_ok=True)
    subprocess.run(
        ["npx", "remotion", "render", "src/index.ts", "TransitionMask", OUT, "--sequence", "--image-format=png", "--frames=990-1019", "--log=error"],
        check=True,
    )
    files = sorted(glob.glob(os.path.join(OUT, "*.png")))
    res = []
    for i, p in enumerate(files):
        frame = 990 + i
        a = np.asarray(Image.open(p).convert("L")).astype(np.float32) / 255
        cov = float((a > 0.999).mean())
        corners = [float(a[0, 0]), float(a[0, -1]), float(a[-1, 0]), float(a[-1, -1])]
        res.append({"frame": frame, "coverage": round(cov, 6), "corners": [round(c, 3) for c in corners], "min": round(float(a.min()), 4)})
    full = [r for r in res if 1002 <= r["frame"] <= 1005]
    ok = all(r["coverage"] == 1.0 and r["min"] >= 0.999 for r in full)
    for r in res:
        print(f"{r['frame']}: coverage {r['coverage'] * 100:7.3f}%  corners {r['corners']}")
    print("FULL OCCLUSION 1002–1005:", "PASS" if ok else "FAIL")
    json.dump({"frames": res, "full_occlusion_1002_1005": ok}, open("out/qa/transition_mask.json", "w"), indent=2)


if __name__ == "__main__":
    main()
