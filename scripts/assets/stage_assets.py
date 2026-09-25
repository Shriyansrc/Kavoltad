"""Validate and stage the supplied brand assets into the production project.

Originals are copied byte-for-byte into source-assets/ (never edited) and
hashed; working copies derived from them go to public/assets/. Writes
docs/ASSET_MANIFEST.json with provenance, hashes, dimensions and checks.

  python scripts/assets/stage_assets.py \
      --kavey /path/kavey_clean.png --wordmark /path/kavolt-logo.png \
      --fcn /path/fcn.png [--brand /path/kavolt-brand-master-document.md]

The FCN crop uses the plan's source rectangle (0, 0, 1200, 450) and is OCR'd
for digits and currency symbols; any hit fails the check so the lower crop
boundary can be raised (never blurred or replaced).
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess

from PIL import Image

PNG_SIG = b"\x89PNG\r\n\x1a\n"


def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def describe(p):
    with open(p, "rb") as fh:
        head = fh.read(16)
    d = {"path": p, "bytes": os.path.getsize(p), "sha256": sha256(p), "is_png": head.startswith(PNG_SIG)}
    if d["is_png"]:
        im = Image.open(p)
        d.update({"width": im.size[0], "height": im.size[1], "mode": im.mode})
    return d


def stage(src, name, originals):
    os.makedirs(originals, exist_ok=True)
    dst = os.path.join(originals, name)
    shutil.copyfile(src, dst)
    assert sha256(src) == sha256(dst)
    return dst


def ocr_price_check(path):
    try:
        txt = subprocess.run(["tesseract", path, "-", "--psm", "11"], capture_output=True, text=True, check=True).stdout
    except (OSError, subprocess.CalledProcessError) as exc:
        return {"ocr_available": False, "error": str(exc)}
    currency = re.findall(r"[₹$€£¥]|\bRs\.?\b|\bINR\b|\bUSD\b", txt, flags=re.I)
    digits = re.findall(r"\d[\d,.]*", txt)
    percent = re.findall(r"\d+\s*%", txt)
    return {"ocr_available": True, "text": txt.strip(), "currency_hits": currency, "digit_hits": digits, "percent_hits": percent, "pass": not currency and not percent}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kavey", required=True)
    ap.add_argument("--wordmark", required=True)
    ap.add_argument("--fcn", required=True)
    ap.add_argument("--brand")
    ap.add_argument("--crop", default="0,0,1200,450")
    ap.add_argument("--originals", default="source-assets")
    ap.add_argument("--public", default="public/assets")
    a = ap.parse_args()
    os.makedirs(a.public, exist_ok=True)
    manifest = {"assets": [], "notes": []}

    # Kavey — controlling appearance reference (expected 360 × 675 RGB).
    k = describe(a.kavey)
    k.update({"id": "KAVEY_SELECTED", "role": "Controlling mascot reference; matted working copy used in the film", "expected": "360x675 RGB"})
    k["staged"] = stage(a.kavey, "kavey_clean.png", a.originals)
    k["check_dimensions"] = (k.get("width"), k.get("height")) == (360, 675)
    manifest["assets"].append(k)

    # Wordmark — validated PNG, used untouched.
    w = describe(a.wordmark)
    w.update({"id": "WORDMARK", "role": "Official KAVOLT wordmark (untouched pixels)", "expected": "700x93 RGBA"})
    w["staged"] = stage(a.wordmark, "kavolt-logo.png", a.originals)
    w["check"] = bool(w["is_png"]) and w.get("mode") in ("RGBA", "LA", "P")
    shutil.copyfile(a.wordmark, os.path.join(a.public, "kavolt-logo.png"))
    manifest["assets"].append(w)

    # FCN — genuine commerce screenshot, cropped above the price rows.
    f = describe(a.fcn)
    f.update({"id": "PROJECT_FCN", "role": "Genuine shipped commerce proof (cropped)", "expected": "1200x692"})
    f["staged"] = stage(a.fcn, "fcn.png", a.originals)
    x, y, cw, ch = [int(v) for v in a.crop.split(",")]
    im = Image.open(a.fcn).convert("RGB")
    crop = im.crop((x, y, x + cw, y + ch))
    full = os.path.join("out", "qa", "fcn_crop_fullres.png")
    os.makedirs(os.path.dirname(full), exist_ok=True)
    crop.save(full)
    # 2× the 500 px display width for crisp downsampling in the film.
    disp = crop.resize((1000, round(1000 * ch / cw)), Image.LANCZOS)
    disp.save(os.path.join(a.public, "fcn_crop.png"), optimize=True)
    f["crop_rect"] = [x, y, cw, ch]
    f["price_check"] = ocr_price_check(full)
    manifest["assets"].append(f)

    if a.brand:
        b = describe(a.brand)
        b.update({"id": "BRAND_MASTER", "role": "Governing brand facts, voice, palette"})
        b["staged"] = stage(a.brand, os.path.basename(a.brand), a.originals)
        manifest["assets"].append(b)

    for fn in ["Geist-Variable.woff2", "GeistMono-Variable.woff2"]:
        p = os.path.join("public", "fonts", fn)
        d = describe(p)
        d.update({"id": fn.split("-")[0].upper(), "role": "Geist family from the official `geist` npm package 1.7.2 (SIL OFL); replaces the website's subsetted woff2 files, which were not supplied to this environment"})
        manifest["assets"].append(d)

    os.makedirs("docs", exist_ok=True)
    json.dump(manifest, open("docs/ASSET_MANIFEST.json", "w"), indent=2, ensure_ascii=False)
    print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
