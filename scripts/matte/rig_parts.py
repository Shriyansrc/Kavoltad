"""Split the matted Kavey (360 x 675, same geometry as kavey_clean.png) into a
cut-out rig for 2.5D character animation.

Only regions the supplied pixels support are separated: two ear flames, the
scarf-tail flame, the raised left hand, the presenting right hand, the cube,
the eyes and the brows. Rules that keep the rest pose pixel-exact:

* Opaque parts use hard (binary) masks. Where a part covered Kavey himself
  (hood under the left ear, scarf/cuff under the raised hand) the base layer is
  filled by OpenCV inpainting from the same material; where it covered
  background the base is transparent.
* The tail and right antenna are drawn BEHIND the base, and their masks extend
  under the opaque cape/hood, so their joints are hidden when they sway.
* Eyes and brows are emissive: each becomes a single-colour glow layer whose
  alpha is solved against the inpainted visor (orig = a*E + (1-a)*V), so blinks
  and glances leave a clean visor with no ghost.

Every layer keeps the full 360 x 675 canvas; pivots are in source pixels.

  python scripts/matte/rig_parts.py public/assets/kavey_matte.png --out public/assets/kavey
"""
import argparse
import json
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw

W, H = 360, 675

FRONT = "front"
BEHIND = "behind"

# Polygons in source pixels, traced on a 3x gridded enlargement of the source.
PARTS = {
    "tail": {
        "layer": BEHIND,
        # visible flame below the cape edge (base becomes transparent here)
        "poly": [(150, 462), (146, 490), (138, 520), (128, 552), (122, 572), (136, 586), (150, 600), (140, 614), (104, 616), (74, 602), (50, 580), (36, 548), (36, 514), (48, 484), (68, 462), (96, 452), (122, 448)],
        # extension hidden under the opaque cape wing and robe
        "ext": [(150, 462), (122, 448), (96, 452), (70, 440), (100, 420), (150, 430), (160, 450)],
        "pivot": (122, 452),
        "under": "background",
    },
    "earR": {
        "layer": BEHIND,
        "poly": [(220, 0), (244, 0), (262, 12), (282, 40), (304, 70), (324, 100), (342, 126), (354, 150), (356, 200), (354, 260), (352, 330), (340, 336), (338, 250), (334, 170), (318, 150), (296, 124), (270, 96), (248, 66), (232, 38), (220, 16)],
        "ext": [],
        "pivot": (336, 250),
        "under": "background",
        "keep_hood": True,
    },
    "earL": {
        "layer": FRONT,
        "poly": [(143, 6), (162, 14), (176, 36), (181, 68), (174, 100), (163, 126), (150, 151), (132, 179), (116, 206), (101, 228), (87, 238), (72, 225), (52, 211), (27, 201), (6, 193), (0, 186), (0, 162), (14, 152), (30, 138), (52, 116), (74, 92), (94, 62), (114, 32), (130, 12)],
        "pivot": (90, 226),
        "under": "hood",
    },
    "handL": {
        "layer": FRONT,
        "poly": [(104, 358), (108, 344), (116, 338), (124, 342), (127, 350), (131, 343), (139, 345), (143, 356), (151, 352), (159, 358), (164, 376), (168, 398), (164, 416), (155, 426), (128, 428), (113, 420), (106, 402)],
        "pivot": (136, 426),
        "under": "body",
    },
    "handR": {
        "layer": FRONT,
        "poly": [(281, 470), (290, 456), (304, 450), (316, 444), (328, 446), (336, 458), (346, 462), (352, 476), (344, 492), (326, 501), (302, 507), (285, 500), (278, 486)],
        "pivot": (287, 482),
        "under": "background",
    },
    "cube": {
        "layer": FRONT,
        "circle": (335, 415, 34),
        "pivot": (335, 415),
        "under": "background",
    },
}

# Emissive face features. Each is defined by its core shape; glow pixels are
# assigned to the nearest feature (within REACH px). The smile, forehead
# diamond and visor reflection are static claimants so their light never moves.
GLOWS = {
    "eyeL": {"core": [(172, 262), (178, 256), (200, 256), (206, 262), (206, 306), (200, 312), (178, 312), (172, 306)], "pivot": (188, 283)},
    "eyeR": {"core": [(270, 281), (276, 275), (292, 275), (298, 281), (298, 321), (292, 327), (276, 327), (270, 321)], "pivot": (283, 300)},
}
STATIC_GLOWS = {
    "browL": [(184, 236), (189, 230), (216, 243), (218, 251), (213, 253), (186, 241)],
    "browR": [(280, 262), (284, 257), (304, 254), (307, 259), (304, 264), (283, 267)],
    "smile": [(215, 303), (222, 301), (236, 310), (252, 306), (254, 312), (236, 322), (220, 314)],
    "diamond": [(222, 188), (266, 184), (246, 226)],
    "reflection": [(301, 206), (324, 218), (338, 290), (326, 342), (301, 342)],
}
REACH = 18

# Hood top edge under the left ear: pixels below this line belong to the hood.
HOOD_LINE = ((0, 200), (150, 132))


def poly_mask(poly, ss=4):
    im = Image.new("L", (W * ss, H * ss), 0)
    ImageDraw.Draw(im).polygon([(x * ss, y * ss) for x, y in poly], fill=255)
    return (np.asarray(im.resize((W, H), Image.BOX)) >= 128)


def circle_mask(cx, cy, r):
    yy, xx = np.mgrid[0:H, 0:W]
    return np.hypot(xx - cx, yy - cy) <= r


def save(path, c, al):
    out = np.dstack([np.clip(c, 0, 1), np.clip(al, 0, 1)])
    Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA").save(path, optimize=True)


def inpaint(rgb, mask, radius=6):
    img8 = (np.clip(rgb, 0, 1) * 255).astype(np.uint8)
    out = cv2.inpaint(cv2.cvtColor(img8, cv2.COLOR_RGB2BGR), mask.astype(np.uint8) * 255, radius, cv2.INPAINT_TELEA)
    return cv2.cvtColor(out, cv2.COLOR_BGR2RGB).astype(np.float64) / 255.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("matte")
    ap.add_argument("--out", default="public/assets/kavey")
    ap.add_argument("--qa", default="out/qa/rig")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    os.makedirs(a.qa, exist_ok=True)

    rgba = np.asarray(Image.open(a.matte).convert("RGBA")).astype(np.float64) / 255.0
    rgb, alpha = rgba[..., :3].copy(), rgba[..., 3].copy()
    # The source crops the hood tip and cape wing at x = 0: soften that cut.
    alpha *= np.clip(np.arange(W) / 9.0, 0, 1)[None, :]

    yy, xx = np.mgrid[0:H, 0:W]
    (hx0, hy0), (hx1, hy1) = HOOD_LINE
    hood_side = yy > hy0 + (hy1 - hy0) * (xx - hx0) / (hx1 - hx0)

    base_rgb = rgb.copy()
    base_alpha = alpha.copy()
    fill = np.zeros((H, W), bool)
    layers = {}
    report = {"parts": {}, "glows": {}}

    for name, spec in PARTS.items():
        m = circle_mask(*spec["circle"]) if "circle" in spec else poly_mask(spec["poly"])
        part_m = m.copy()
        if spec.get("ext"):
            # extension only inside opaque cover, so it stays hidden at rest
            part_m |= poly_mask(spec["ext"]) & (alpha >= 0.98)
        layers[name] = (rgb.copy(), alpha * part_m)
        under = spec["under"]
        if under == "background":
            if spec.get("keep_hood"):
                # The antenna's lower run passes behind the hood's top-right
                # corner and right rim: keep the hood there (the antenna layer
                # is drawn behind the base, so its hidden run stays hidden).
                top = yy >= 104 + (xx - 250) * 0.4
                side = xx <= 336 + (yy - 150) * 0.06
                in_hood = top & side & (alpha > 0.9)
                clear = m & ~in_hood
            else:
                clear = m
            base_alpha = np.where(clear, 0.0, base_alpha)
        elif under == "hood":
            # force opaque hood only where the ear fully covers it at rest
            inside = m & hood_side & (alpha >= 0.98)
            fill |= inside
            base_alpha = np.where(m & ~hood_side, 0.0, base_alpha)
            base_alpha = np.where(inside, 1.0, base_alpha)
        else:
            fill |= m
            base_alpha = np.where(m, 1.0, base_alpha)
        report["parts"][name] = {"layer": spec["layer"], "pivot": spec["pivot"], "under": under, "pixels": int(m.sum())}

    # Glows. Assign each face pixel to its nearest emissive feature; fit a
    # smooth dark visor V around each animated feature; the glow layer is
    # G = w * max(orig - V, 0) with w following glow strength, so plain visor
    # stays in the base untouched and base + G == orig exactly at rest.
    base_rgb = inpaint(base_rgb, fill, 7)
    lum = rgb.mean(axis=2)
    names = list(GLOWS) + list(STATIC_GLOWS)
    dists = []
    for n in names:
        core = poly_mask(GLOWS[n]["core"] if n in GLOWS else STATIC_GLOWS[n])
        dists.append(cv2.distanceTransform((~core).astype(np.uint8), cv2.DIST_L2, 5))
    dists = np.stack(dists)
    owner = dists.argmin(axis=0)
    reach = np.array([GLOWS[n].get("reach", REACH) if n in GLOWS else REACH for n in names], dtype=np.float32)
    near = (dists <= reach[:, None, None]).any(axis=0)
    gy, gx = np.mgrid[0:H, 0:W]
    Gm = np.stack([np.ones_like(gx), gx, gy, gx * gx, gy * gy, gx * gy], -1).astype(np.float64)
    for k, name in enumerate(GLOWS):
        region = (owner == k) & (dists[k] <= reach[k]) & (alpha > 0.98)
        ys, xs = np.nonzero(region)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        ring = np.zeros((H, W), bool)
        ring[max(0, y0 - 14):y1 + 14, max(0, x0 - 14):x1 + 14] = True
        ring &= ~near & (alpha > 0.98)
        lo, hi = np.percentile(lum[ring], [20, 65])
        dark = ring & (lum >= lo) & (lum <= hi)
        ry, rx = np.nonzero(dark)
        X = np.stack([np.ones_like(rx), rx, ry], 1).astype(np.float64)
        coef, *_ = np.linalg.lstsq(X, rgb[ry, rx], rcond=None)
        V = np.clip(Gm[..., :3] @ coef, 0, 1)
        excess = np.clip(rgb - V, 0, 1)
        w = np.clip((excess.max(axis=2) - 0.03) / 0.09, 0, 1) * region
        g = excess * w[..., None]
        base_rgb = np.where(region[..., None], rgb - g, base_rgb)
        ga = g.max(axis=2)
        gc = np.where(ga[..., None] > 1e-6, g / np.maximum(ga[..., None], 1e-6), 0)
        layers[name] = (gc, ga)
        report["glows"][name] = {"pivot": GLOWS[name]["pivot"], "blend": "plus-lighter", "pixels": int(region.sum())}

    save(os.path.join(a.out, "base.png"), base_rgb, base_alpha)
    for name, (c, al) in layers.items():
        save(os.path.join(a.out, f"{name}.png"), c, al)

    order = ["tail", "earR", "base", "earL", "handR", "eyeL", "eyeR", "handL", "cube"]
    stack = {"base": (base_rgb, base_alpha), **layers}
    acc = np.zeros((H, W, 3))
    acc_a = np.zeros((H, W))
    for name in order:
        c, al = stack[name]
        if name in GLOWS:
            acc = np.clip(acc + c * al[..., None], 0, 1)  # plus-lighter
            continue
        acc = c * al[..., None] + acc * (1 - al[..., None])
        acc_a = al + acc_a * (1 - al)
    ref = rgb * alpha[..., None]
    diff = np.abs(acc - ref).max(axis=2)
    report["rest_pose"] = {
        "max_abs_diff": round(float(diff.max()), 4),
        "p999_abs_diff": round(float(np.percentile(diff, 99.9)), 4),
        "mean_abs_diff": round(float(diff.mean()), 6),
        "alpha_max_diff": round(float(np.abs(acc_a - alpha).max()), 4),
    }
    report["order"] = order
    Image.fromarray((np.clip(diff * 4, 0, 1) * 255).astype(np.uint8)).resize((W * 2, H * 2)).save(os.path.join(a.qa, "rest_diff.png"))
    base_vis = base_rgb * base_alpha[..., None] + np.array([0, 0.6, 0.3]) * (1 - base_alpha[..., None])
    Image.fromarray((np.clip(base_vis, 0, 1) * 255).astype(np.uint8)).resize((W * 2, H * 2)).save(os.path.join(a.qa, "rig_base_on_green.png"))
    ys, xs = np.nonzero(alpha > 8 / 255)
    report["bbox"] = {"x": int(xs.min()), "y": int(ys.min()), "w": int(xs.max() - xs.min() + 1), "h": int(ys.max() - ys.min() + 1)}
    json.dump(report, open(os.path.join(a.qa, "rig_report.json"), "w"), indent=2)
    print(json.dumps(report["rest_pose"]), json.dumps(report["bbox"]))


if __name__ == "__main__":
    main()
