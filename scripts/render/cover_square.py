"""Square profile-grid cover: a 1080 x 1080 window over the 3.5 s frame,
positioned so the headline and Kavey's face sit inside the centre square.

  python scripts/render/cover_square.py deliverables/Kavolt_Kavey_20s_Cover_9x16.png
"""
import sys

from PIL import Image

src = sys.argv[1] if len(sys.argv) > 1 else "deliverables/Kavolt_Kavey_20s_Cover_9x16.png"
out = sys.argv[2] if len(sys.argv) > 2 else "deliverables/Kavolt_Kavey_20s_Cover_1x1.png"
im = Image.open(src).convert("RGB")
top = 300  # headline starts at y 355; Kavey's face sits near y 870
im.crop((0, top, 1080, top + 1080)).save(out, optimize=True)
print(out)
