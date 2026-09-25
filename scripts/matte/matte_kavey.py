"""Edge-aware matte for the selected Kavey reference (kavey_clean.png, RGB).

Works on a copy; the source file is never modified. Steps:
  1. Model the background from the border pixels.
  2. Background region = pixels connected to the border that match that model
     (flood fill), so enclosed dark areas such as the visor are never removed.
  3. A segmentation prior (BiRefNet-lite ONNX via rembg, run locally) guards
     against the flood leaking into similar-coloured parts of the character.
  4. Trimap → closed-form alpha matting (pymatting) in a narrow edge band only,
     then multilevel foreground estimation to remove background colour spill.
  5. Writes the RGBA matte (same 360 × 675 geometry), a directional rim-light
     mask, silhouette bounds, and inspection composites.

  python scripts/matte/matte_kavey.py source-assets/kavey_clean.png
"""
import argparse
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage as ndi


def load(path):
    im = Image.open(path)
    info = {"mode": im.mode, "size": im.size}
    return np.asarray(im.convert("RGB")).astype(np.float64) / 255.0, info


def border_model(img, w=6):
    h, wd, _ = img.shape
    mask = np.zeros((h, wd), bool)
    mask[:w, :] = mask[-w:, :] = True
    mask[:, :w] = mask[:, -w:] = True
    px = img[mask]
    # Fit a quadratic colour field over the border so gradients are handled.
    ys, xs = np.nonzero(mask)
    X = np.stack([np.ones_like(xs), xs / wd, ys / h, (xs / wd) ** 2, (ys / h) ** 2, xs * ys / (wd * h)], 1)
    coef, *_ = np.linalg.lstsq(X, px, rcond=None)
    Y, Xg = np.mgrid[0:h, 0:wd]
    G = np.stack([np.ones_like(Xg), Xg / wd, Y / h, (Xg / wd) ** 2, (Y / h) ** 2, Xg * Y / (wd * h)], -1)
    field = G @ coef
    resid = np.linalg.norm(px - X @ coef, axis=1)
    return field, float(np.median(resid)), float(np.percentile(resid, 99)), px.mean(0)


def flood_background(img, field, tol):
    dist = np.linalg.norm(img - field, axis=2)
    cand = dist < tol
    lab, _ = ndi.label(cand)
    edge_labels = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge_labels))
    return bg, dist


def ml_prior(path, model_dir):
    try:
        from rembg import new_session, remove

        os.environ.setdefault("U2NET_HOME", model_dir)
        sess = new_session("birefnet-general-lite")
        out = remove(Image.open(path).convert("RGB"), session=sess, only_mask=True, post_process_mask=False)
        return np.asarray(out).astype(np.float64) / 255.0
    except Exception as exc:  # the prior is optional; the flood fill still works
        print("ML prior unavailable:", exc)
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--out", default="public/assets")
    ap.add_argument("--qa", default="out/qa/matte")
    ap.add_argument("--tol", type=float, default=None, help="colour distance tolerance for background flood")
    ap.add_argument("--band", type=int, default=3, help="unknown band half-width in px")
    ap.add_argument("--model-dir", default="/opt/matte")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    os.makedirs(a.qa, exist_ok=True)

    img, info = load(a.src)
    h, w, _ = img.shape
    field, med, p99, mean = border_model(img)
    tol = a.tol if a.tol is not None else max(0.06, p99 * 2.5)
    bg, dist = flood_background(img, field, tol)
    prior = ml_prior(a.src, a.model_dir)

    fg = ~bg
    if prior is not None:
        # Keep pixels the flood called background only if the prior agrees.
        fg = fg | (prior > 0.9)
        fg = fg & ~((prior < 0.02) & bg)
    fg = ndi.binary_fill_holes(fg)
    lab, n = ndi.label(fg)
    if n > 1:
        sizes = ndi.sum(fg, lab, range(1, n + 1))
        keep = 1 + int(np.argmax(sizes))
        # keep the body plus any sizeable detached parts (antenna tips)
        fg = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 40 or i + 1 == keep])

    sure_fg = ndi.binary_erosion(fg, iterations=a.band)
    sure_bg = ndi.binary_erosion(~fg, iterations=a.band)
    trimap = np.full((h, w), 0.5)
    trimap[sure_fg] = 1.0
    trimap[sure_bg] = 0.0

    from pymatting import estimate_alpha_cf, estimate_foreground_ml

    alpha = estimate_alpha_cf(img, trimap)
    alpha = np.clip(alpha, 0, 1)
    alpha[sure_bg] = 0
    alpha[sure_fg] = 1
    fgc = estimate_foreground_ml(img, alpha)
    fgc = np.clip(fgc, 0, 1)

    rgba = np.dstack([fgc, alpha])
    Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), "RGBA").save(os.path.join(a.out, "kavey_matte.png"), optimize=True)

    # Silhouette bounds.
    ys, xs = np.nonzero(alpha > 8 / 255)
    bbox = {"x": int(xs.min()), "y": int(ys.min()), "w": int(xs.max() - xs.min() + 1), "h": int(ys.max() - ys.min() + 1)}

    # Directional rim mask: edge band facing the upper right (violet key rim).
    soft = ndi.gaussian_filter(alpha, 1.2)
    gy, gx = np.gradient(soft)
    nrm = np.hypot(gx, gy) + 1e-6
    nx, ny = -gx / nrm, -gy / nrm  # outward normal
    L = np.array([0.72, -0.69])
    facing = np.clip(nx * L[0] + ny * L[1], 0, 1) ** 1.4
    inner = ndi.gaussian_filter((alpha > 0.5).astype(float), 3.5)
    band = np.clip(alpha - inner, 0, 1) * 2.2
    rim = np.clip(band * facing, 0, 1) * alpha
    rim_rgba = np.zeros((h, w, 4))
    rim_rgba[..., :3] = 1
    rim_rgba[..., 3] = rim
    Image.fromarray((rim_rgba * 255 + 0.5).astype(np.uint8), "RGBA").save(os.path.join(a.out, "kavey_rim.png"), optimize=True)

    # Inspection composites: final navy, a contrasting green, white and a checkerboard.
    def comp(bgc):
        b = np.ones((h, w, 3)) * np.array(bgc)
        return (fgc * alpha[..., None] + b * (1 - alpha[..., None]))

    yy, xx = np.mgrid[0:h, 0:w]
    checker = np.where(((yy // 12 + xx // 12) % 2)[..., None] == 0, 0.8, 0.55) * np.ones((h, w, 3))
    tiles = [comp([10 / 255, 10 / 255, 15 / 255]), comp([0.0, 0.78, 0.33]), comp([1, 1, 1]), fgc * alpha[..., None] + checker * (1 - alpha[..., None]), np.dstack([alpha] * 3), np.dstack([trimap] * 3)]
    sheet = np.concatenate(tiles, axis=1)
    Image.fromarray((sheet * 255).astype(np.uint8)).save(os.path.join(a.qa, "matte_composites.png"))
    if prior is not None:
        Image.fromarray((prior * 255).astype(np.uint8)).save(os.path.join(a.qa, "prior.png"))

    report = {
        "source": a.src,
        "source_info": {"mode": info["mode"], "size": list(info["size"])},
        "background_mean_rgb": [round(v * 255, 1) for v in mean],
        "border_residual_median": round(med, 4),
        "border_residual_p99": round(p99, 4),
        "flood_tolerance": round(tol, 4),
        "unknown_band_px": a.band,
        "ml_prior": prior is not None,
        "bbox": bbox,
        "alpha_fraction_partial": round(float(((alpha > 0.02) & (alpha < 0.98)).mean()), 5),
    }
    json.dump(report, open(os.path.join(a.qa, "matte_report.json"), "w"), indent=2)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
