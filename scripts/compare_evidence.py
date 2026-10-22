#!/usr/bin/env python3
"""Compose deterministic before/after evidence strips (PNG in, WebP out)."""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def font(size: int) -> ImageFont.FreeTypeFont:
    path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--before", nargs="+", required=True)
    parser.add_argument("--after", nargs="+", required=True)
    parser.add_argument("--names", nargs="*", default=[])
    parser.add_argument("--out", required=True)
    parser.add_argument("--label-before", default="Antes")
    parser.add_argument("--label-after", default="Después")
    args = parser.parse_args()
    if len(args.before) != len(args.after):
        raise SystemExit("--before and --after must have the same number of files")
    if len(args.names) and len(args.names) != len(args.before):
        raise SystemExit("--names must match the number of pairs")

    before = [Image.open(path).convert("RGB") for path in args.before]
    after = [Image.open(path).convert("RGB") for path in args.after]
    if len(before) == 1:
        width, height = before[0].size
        canvas = Image.new("RGB", (width * 2 + 4, height), (30, 30, 30))
        canvas.paste(before[0], (0, 0))
        canvas.paste(after[0], (width + 4, 0))
        draw = ImageDraw.Draw(canvas)
        draw.rectangle((0, 0, 190, 48), fill=(0, 0, 0))
        draw.text((10, 4), args.label_before, fill=(255, 255, 255), font=font(32))
        draw.rectangle((width + 4, 0, width + 194, 48), fill=(0, 0, 0))
        draw.text((width + 14, 4), args.label_after, fill=(255, 255, 255), font=font(32))
    else:
        tile_w = 320
        tile_h = 180
        header = 28
        gap = 4
        cols = len(before)
        canvas = Image.new("RGB", (cols * tile_w + (cols - 1) * gap, header * 2 + tile_h * 2 + gap), (30, 30, 30))
        draw = ImageDraw.Draw(canvas)
        for row, images in enumerate((before, after)):
            y = row * (header + tile_h + gap)
            draw.rectangle((0, y, canvas.width, y + header), fill=(0, 0, 0))
            draw.text((8, y + 2), args.label_before if row == 0 else args.label_after, fill=(255, 255, 255), font=font(20))
            for col, image in enumerate(images):
                x = col * (tile_w + gap)
                tile = image.resize((tile_w, tile_h), Image.Resampling.LANCZOS)
                canvas.paste(tile, (x, y + header))
                if args.names:
                    draw.rectangle((x, y + header, x + 120, y + header + 24), fill=(0, 0, 0))
                    draw.text((x + 6, y + header + 2), args.names[col], fill=(255, 255, 255), font=font(16))

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, "WEBP", quality=90, method=6)
    print(f"wrote {out} ({canvas.width}x{canvas.height})")


if __name__ == "__main__":
    main()
