"""Generate the tileable plaster detail set used by the Caral architecture kit.

Writes src/assets/textures/materials/plaster_detail_{diffuse,normal}.webp (256 px): a low-contrast,
near-white albedo (it multiplies the documented paint colour of each plaster material, so the mean is
kept high) and a matching soft normal map. Hand-applied clay plaster: broad trowel swirls, fine grit
and a few hairline cracks. Fully procedural and seeded, so the output is reproducible.

Run from the repository root:
  python3 scripts/art/make_plaster_detail.py
"""

import os

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'src', 'assets', 'textures', 'materials')
SIZE = 256


def value_noise(rng, cells):
    """Tileable value noise: a random grid upsampled with wrap-around cosine interpolation."""
    grid = rng.random((cells, cells))
    t = np.arange(SIZE) / SIZE * cells
    i0 = np.floor(t).astype(int) % cells
    i1 = (i0 + 1) % cells
    f = t - np.floor(t)
    f = (1 - np.cos(f * np.pi)) / 2
    rows = grid[i0][:, :] * (1 - f)[:, None] + grid[i1][:, :] * f[:, None]
    return rows[:, i0] * (1 - f)[None, :] + rows[:, i1] * f[None, :]


def main():
    rng = np.random.default_rng(2627)  # seed: the Caral radiocarbon date, for reproducibility only
    height = (value_noise(rng, 4) * 0.45 + value_noise(rng, 9) * 0.3 + value_noise(rng, 24) * 0.15
              + value_noise(rng, 64) * 0.1)
    # Trowel swirls: a few broad, tileable sinusoidal ridges.
    y, x = np.mgrid[0:SIZE, 0:SIZE] / SIZE * 2 * np.pi
    height += 0.06 * np.sin(3 * x + 2 * np.sin(2 * y)) + 0.04 * np.sin(5 * y + np.sin(3 * x))
    # Hairline cracks: thresholded ridges of a mid-frequency noise.
    ridge = np.abs(value_noise(rng, 7) - 0.5)
    cracks = np.clip(1 - ridge / 0.012, 0, 1) * (value_noise(rng, 3) > 0.55)
    height -= cracks * 0.08
    height = (height - height.min()) / (height.max() - height.min())

    albedo = 0.86 + 0.14 * height - cracks * 0.12
    rgb = np.stack([albedo, albedo * 0.995, albedo * 0.985], axis=-1)
    Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).save(
        os.path.join(OUT, 'plaster_detail_diffuse.webp'), quality=82, method=6)

    strength = 2.2
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * strength
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * strength
    n = np.stack([-dx, dy, np.ones_like(height)], axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8)).save(
        os.path.join(OUT, 'plaster_detail_normal.webp'), quality=88, method=6)


if __name__ == '__main__':
    main()
