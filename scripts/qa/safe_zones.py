"""Overlay approximate platform UI zones on decoded frames.

These zones are conservative approximations of Instagram Reels, YouTube
Shorts and TikTok overlays on a 1080 × 1920 canvas (header, right-hand action
column, caption/audio area). They are NOT platform-verified previews; the
real overlays vary by app version, device and caption length.

  python scripts/qa/safe_zones.py out/qa/final/f0000.png [...] --out out/qa/safe
"""
import argparse
import os

from PIL import Image, ImageDraw

ZONES = {
    "reels": [(0, 0, 1080, 200), (930, 820, 1080, 1720), (0, 1540, 1080, 1920)],
    "shorts": [(0, 0, 1080, 170), (920, 900, 1080, 1700), (0, 1520, 1080, 1920)],
    "tiktok": [(0, 0, 1080, 150), (930, 760, 1080, 1640), (0, 1480, 1080, 1920)],
}
PLAN_SAFE = (120, 220, 900, 1480)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("frames", nargs="+")
    ap.add_argument("--out", default="out/qa/safe")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    cols = {"reels": (255, 64, 129, 70), "shorts": (255, 214, 0, 60), "tiktok": (0, 229, 255, 60)}
    for path in a.frames:
        base = Image.open(path).convert("RGBA")
        tiles = []
        for name, zones in ZONES.items():
            ov = Image.new("RGBA", base.size, (0, 0, 0, 0))
            d = ImageDraw.Draw(ov)
            for z in zones:
                d.rectangle(z, fill=cols[name])
            d.rectangle(PLAN_SAFE, outline=(255, 255, 255, 200), width=3)
            d.text((20, 1880), f"{name} (approximate)", fill=(255, 255, 255, 255))
            tiles.append(Image.alpha_composite(base, ov).convert("RGB").resize((540, 960)))
        sheet = Image.new("RGB", (540 * len(tiles), 960))
        for i, t in enumerate(tiles):
            sheet.paste(t, (540 * i, 0))
        out = os.path.join(a.out, os.path.basename(path).replace(".png", "_zones.png"))
        sheet.save(out)
        print(out)


if __name__ == "__main__":
    main()
