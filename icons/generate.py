"""Generate PNG icons + favicon.ico for MonoAgent PWA from logo.svg.

Run after editing logo.svg:
    python icons/generate.py

Outputs into icons/:
  icon-16.png, icon-32.png, icon-48.png, icon-72.png, icon-96.png,
  icon-128.png, icon-144.png, icon-152.png, icon-180.png, icon-192.png,
  icon-256.png, icon-384.png, icon-512.png,
  icon-192-maskable.png, icon-512-maskable.png,
  favicon.ico

Requires: resvg-py, Pillow.
"""
from __future__ import annotations
import io
from pathlib import Path

import resvg_py
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SVG_PATH = ROOT / "logo.svg"
OUT_DIR = ROOT / "icons"
OUT_DIR.mkdir(exist_ok=True)

BG_COLOR = (10, 10, 15, 255)  # #0a0a0f — matches manifest background_color

ANY_SIZES = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512]
MASKABLE_SIZES = [192, 512]
ICO_SIZES = [16, 32, 48, 64]


def render_svg(size: int) -> Image.Image:
    png_bytes = resvg_py.svg_to_bytes(svg_path=str(SVG_PATH), width=size, height=size)
    return Image.open(io.BytesIO(bytes(png_bytes))).convert("RGBA")


def render_any(size: int) -> Image.Image:
    """Transparent-background icon at exact size."""
    return render_svg(size)


def render_maskable(size: int) -> Image.Image:
    """Solid background + ~80% safe-area glyph for Android adaptive icons."""
    canvas = Image.new("RGBA", (size, size), BG_COLOR)
    inner = int(size * 0.78)
    glyph = render_svg(inner)
    offset = (size - inner) // 2
    canvas.alpha_composite(glyph, dest=(offset, offset))
    return canvas


def main() -> None:
    for s in ANY_SIZES:
        img = render_any(s)
        img.save(OUT_DIR / f"icon-{s}.png", optimize=True)
        print(f"  wrote icon-{s}.png")

    for s in MASKABLE_SIZES:
        img = render_maskable(s)
        img.save(OUT_DIR / f"icon-{s}-maskable.png", optimize=True)
        print(f"  wrote icon-{s}-maskable.png")

    ico_frames = [render_any(s) for s in ICO_SIZES]
    ico_frames[0].save(
        OUT_DIR / "favicon.ico",
        format="ICO",
        sizes=[(s, s) for s in ICO_SIZES],
        append_images=ico_frames[1:],
    )
    print("  wrote favicon.ico")


if __name__ == "__main__":
    main()
