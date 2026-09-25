"""Extract exact decoded frames from an MP4 and build labelled contact sheets.

  python scripts/qa/frames.py VIDEO --frames 0,18,150,... --out out/qa/frames
  python scripts/qa/frames.py VIDEO --sheet storyboard --frames ... --cols 6 --thumb 270

Frames are selected by decoded index (select=eq(n,N)), so they are the frames
a player shows, not browser screenshots.
"""
import argparse
import os
import subprocess

from PIL import Image, ImageDraw, ImageFont


def extract(video, frames, out):
    os.makedirs(out, exist_ok=True)
    expr = "+".join(f"eq(n\\,{n})" for n in frames)
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", video, "-vf", f"select='{expr}'", "-fps_mode", "passthrough", os.path.join(out, "tmp_%04d.png")],
        check=True,
    )
    paths = []
    for i, n in enumerate(sorted(frames)):
        src = os.path.join(out, f"tmp_{i + 1:04d}.png")
        dst = os.path.join(out, f"f{n:04d}.png")
        os.replace(src, dst)
        paths.append(dst)
    return paths


def sheet(paths, labels, out, cols=6, thumb=270, title=None):
    ims = [Image.open(p).convert("RGB") for p in paths]
    w, h = ims[0].size
    tw = thumb
    th = int(h * tw / w)
    pad = 10
    lab = 30
    top = 50 if title else 0
    rows = (len(ims) + cols - 1) // cols
    W = cols * (tw + pad) + pad
    H = top + rows * (th + lab + pad) + pad
    canvas = Image.new("RGB", (W, H), (18, 18, 26))
    d = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("node_modules/geist/dist/fonts/geist-mono/GeistMono-Medium.ttf", 18)
    except OSError:
        font = ImageFont.load_default()
    if title:
        d.text((pad, 14), title, fill=(255, 255, 255), font=font)
    for i, (im, label) in enumerate(zip(ims, labels)):
        r, c = divmod(i, cols)
        x = pad + c * (tw + pad)
        y = top + pad + r * (th + lab + pad)
        canvas.paste(im.resize((tw, th), Image.LANCZOS), (x, y))
        d.text((x, y + th + 5), label, fill=(224, 64, 251), font=font)
    canvas.save(out)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--frames", required=True)
    ap.add_argument("--out", default="out/qa/frames")
    ap.add_argument("--sheet")
    ap.add_argument("--cols", type=int, default=6)
    ap.add_argument("--thumb", type=int, default=270)
    ap.add_argument("--title")
    a = ap.parse_args()
    frames = [int(x) for x in a.frames.split(",")]
    paths = extract(a.video, frames, a.out)
    if a.sheet:
        labels = [f"{n}  {n / 60:5.2f}s" for n in sorted(frames)]
        print(sheet(paths, labels, a.sheet, a.cols, a.thumb, a.title))
    else:
        print("\n".join(paths))


if __name__ == "__main__":
    main()
