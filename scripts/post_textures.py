#!/usr/bin/env python3
"""Post-process the generated albedos:
  - seamless tiling by edge blending
  - normal map derivation (Sobel) and roughness (heuristic)

Input:  scripts/_textures_raw/{slot}_raw.png
Output: src/assets/textures/terrain/{slot}_{diffuse|normal|roughness}.webp     (terrain slots)
        src/assets/textures/materials/{slot}_{diffuse|normal|roughness}.webp  (the rest)

Usage: python3 scripts/post_textures.py
"""
import pathlib

import numpy as np
from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = ROOT / "scripts" / "_textures_raw"
TER = ROOT / "src" / "assets" / "textures" / "terrain"
MAT = ROOT / "src" / "assets" / "textures" / "materials"
TERRAIN_SLOTS = {"sand", "dirt", "grass", "rock", "snow"}

DIFFUSE_SIZE = 1024
MAP_SIZE = 512
BAND = 64


def make_seamless(a: np.ndarray, band: int = BAND) -> np.ndarray:
    """Blend opposite edges to reduce seams when tiling."""
    h, w, _ = a.shape
    out = a.copy()
    for i in range(band):
        t = i / band
        out[:, i] = a[:, i] * (1 - t) + a[:, w - band + i] * t
        out[:, w - 1 - i] = a[:, w - 1 - i] * (1 - t) + a[:, band - 1 - i] * t
    for j in range(band):
        t = j / band
        out[j, :] = out[j, :] * (1 - t) + out[h - band + j, :] * t
        out[h - 1 - j, :] = out[h - 1 - j, :] * (1 - t) + out[band - 1 - j, :] * t
    return np.clip(out, 0, 255)


def normal_from_height(height: np.ndarray, strength: float = 2.2) -> Image.Image:
    gy, gx = np.gradient(height)
    nx = -gx * strength
    ny = -gy * strength
    nz = np.ones_like(nx)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / ln, ny / ln, nz / ln
    rgb = np.stack([(nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, (nz * 0.5 + 0.5) * 255], axis=-1)
    return Image.fromarray(rgb.astype(np.uint8), "RGB")


def roughness_from_detail(gray: np.ndarray) -> Image.Image:
    g8 = np.clip(gray, 0, 255).astype(np.uint8)
    blur = np.asarray(Image.fromarray(g8, "L").filter(ImageFilter.GaussianBlur(3))).astype(np.float32)
    detail = np.abs(gray - blur)
    r = 0.62 + 0.34 * (1.0 - np.clip(detail / 40.0, 0, 1))
    return Image.fromarray((np.clip(r, 0, 1) * 255).astype(np.uint8), "L").convert("RGB")


def process(slot: str) -> None:
    raw = RAW / f"{slot}_raw.png"
    if not raw.exists():
        print(f"skip {slot} (no albedo)")
        return
    dest = TER if slot in TERRAIN_SLOTS else MAT
    dest.mkdir(parents=True, exist_ok=True)
    img = Image.open(raw).convert("RGB").resize((DIFFUSE_SIZE, DIFFUSE_SIZE), Image.LANCZOS)
    arr = np.asarray(img).astype(np.float32)
    arr = make_seamless(arr)
    diffuse = Image.fromarray(arr.astype(np.uint8), "RGB")
    diffuse.save(dest / f"{slot}_diffuse.webp", "WEBP", quality=86, method=6)

    height = np.asarray(diffuse.convert("L").filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)
    normal = normal_from_height(height).resize((MAP_SIZE, MAP_SIZE), Image.LANCZOS)
    normal.save(dest / f"{slot}_normal.webp", "WEBP", quality=90, method=6)
    rough = roughness_from_detail(height).resize((MAP_SIZE, MAP_SIZE), Image.LANCZOS)
    rough.save(dest / f"{slot}_roughness.webp", "WEBP", quality=90, method=6)
    print(f"ok {slot} -> {dest.name}: diffuse/normal/roughness (webp)")


def main() -> None:
    slots = sorted({p.name[: -len("_raw.png")] for p in RAW.glob("*_raw.png")}) if RAW.exists() else []
    if not slots:
        print("No *_raw.png in", RAW)
        return
    for slot in slots:
        process(slot)


if __name__ == "__main__":
    main()
