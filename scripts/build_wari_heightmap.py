#!/usr/bin/env python3
"""Generate the authored Wari highland heightfield (m4, 256 m map)."""

from __future__ import annotations

import base64
import math
from pathlib import Path

from reencode_heightmaps import reencode_file

SIZE = 256
# The composition was authored for the former 192 m map; sample it 4/3 larger on the 256 m transect.
SOURCE_SIZE = 192
N = SIZE + 1
GROUND_SIZE = 128
SITE_Y = 5.0
VALLEY = 3.2
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/model/defs/wariHeightmap.ts'


def smoothstep(a: float, b: float, x: float) -> float:
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def noise(x: float, z: float) -> float:
    return (
        math.sin(x * 0.18 + z * 0.14) * 0.26
        + math.sin(x * 0.057 - z * 0.15 + 1.2) * 0.16
        + math.sin(x * 0.33 + z * 0.25 + 0.4) * 0.07
    )


def height(x: float, z: float) -> float:
    # High Andean basin with broad terraces and dry quebradas.
    h = VALLEY + 0.2 * noise(x, z)

    site = smoothstep(86.0, 95.0, x) * (1.0 - smoothstep(131.0, 140.0, x))
    site *= smoothstep(59.0, 68.0, z) * (1.0 - smoothstep(108.0, 117.0, z))
    base = smoothstep(38.0, 46.0, x) * (1.0 - smoothstep(76.0, 84.0, x))
    base *= smoothstep(108.0, 116.0, z) * (1.0 - smoothstep(139.0, 147.0, z))
    node_a = smoothstep(126.0, 133.0, x) * (1.0 - smoothstep(152.0, 159.0, x))
    node_a *= smoothstep(56.0, 63.0, z) * (1.0 - smoothstep(78.0, 85.0, z))
    node_b = smoothstep(124.0, 131.0, x) * (1.0 - smoothstep(149.0, 156.0, x))
    node_b *= smoothstep(101.0, 108.0, z) * (1.0 - smoothstep(122.0, 129.0, z))
    flat = max(site, base, node_a, node_b)
    h = h * (1.0 - 1.0 * flat) + SITE_Y * (1.0 * flat)

    # Terraced highland ridges; the south/east slopes frame the provincial route.
    north = smoothstep(14.0, 0.0, z) * (8.0 + 2.2 * math.sin(x * 0.1))
    east = smoothstep(154.0, 182.0, x) * (11.0 + 2.8 * math.sin(z * 0.11 + 1.0))
    south = smoothstep(154.0, 184.0, z) * (8.0 + 2.2 * math.sin(x * 0.12 + 0.3))
    west = smoothstep(22.0, 6.0, x) * (5.0 + 1.6 * math.sin(z * 0.12 + 0.6))
    h += north + east + south + west

    # Shallow dry quebradas between the core and the provincial nodes; they stop at the site edge so the
    # ceremonial complex keeps one flat pad (a quebrada used to cut 0.9 m out of its southern half).
    h -= (
        1.0
        * math.exp(-((z - 103.0) / 3.0) ** 2)
        * smoothstep(70.0, 92.0, x)
        * (1.0 - smoothstep(142.0, 160.0, x))
        * (1.0 - site)
    )
    h -= 0.8 * math.exp(-((x - 142.0) / 4.0) ** 2) * smoothstep(70.0, 88.0, z) * (1.0 - smoothstep(125.0, 145.0, z))
    return max(0.9, h)


def ground_weights(x: float, z: float) -> tuple[float, float, float, float]:
    """Painted ground weights (grass, dirt, sand, rock) in the former 192 m frame."""
    site = smoothstep(86.0, 95.0, x) * (1.0 - smoothstep(131.0, 140.0, x))
    site *= smoothstep(59.0, 68.0, z) * (1.0 - smoothstep(108.0, 117.0, z))
    base = smoothstep(38.0, 46.0, x) * (1.0 - smoothstep(76.0, 84.0, x))
    base *= smoothstep(108.0, 116.0, z) * (1.0 - smoothstep(139.0, 147.0, z))
    node_a = smoothstep(126.0, 133.0, x) * (1.0 - smoothstep(152.0, 159.0, x))
    node_a *= smoothstep(56.0, 63.0, z) * (1.0 - smoothstep(78.0, 85.0, z))
    node_b = smoothstep(124.0, 131.0, x) * (1.0 - smoothstep(149.0, 156.0, x))
    node_b *= smoothstep(101.0, 108.0, z) * (1.0 - smoothstep(122.0, 129.0, z))
    terrace = max(site, base, node_a, node_b)
    ridge = max(
        smoothstep(14.0, 0.0, z),
        smoothstep(154.0, 182.0, x),
        smoothstep(154.0, 184.0, z),
        smoothstep(22.0, 6.0, x),
    )
    # The same quebrada suppression the height field uses: the flattened site pad must not keep its sand
    # and dirt stripe.
    quebrada = max(
        math.exp(-((z - 103.0) / 3.0) ** 2)
        * smoothstep(70.0, 92.0, x)
        * (1.0 - smoothstep(142.0, 160.0, x))
        * (1.0 - (smoothstep(86.0, 95.0, x) * (1.0 - smoothstep(131.0, 140.0, x))
                  * smoothstep(59.0, 68.0, z) * (1.0 - smoothstep(108.0, 117.0, z)))),
        math.exp(-((x - 142.0) / 4.0) ** 2) * smoothstep(70.0, 88.0, z) * (1.0 - smoothstep(125.0, 145.0, z)),
    )
    mottle = 0.85 + 0.3 * (0.5 + 0.5 * math.sin(x * 0.12 + 0.6) * math.sin(z * 0.1 + 0.3))

    grass = max(0.02, (1.0 - ridge) * (1.0 - terrace * 0.4) * 0.9 * mottle)
    dirt = max(0.03, terrace * 0.9 + quebrada * 0.3)
    sand = max(0.02, quebrada * 0.5)
    rock = max(0.02, ridge * 1.0)
    total = grass + dirt + sand + rock
    return (grass / total, dirt / total, sand / total, rock / total)


ground_values = []
# Texel centres at 2 m, matching `sampleAuthoredGround` (0..SIZE corners would shift the paint 1 m).
for iz in range(GROUND_SIZE):
    z = (iz + 0.5) * SIZE / GROUND_SIZE
    for ix in range(GROUND_SIZE):
        x = (ix + 0.5) * SIZE / GROUND_SIZE
        weights = ground_weights(x * SOURCE_SIZE / SIZE, z * SOURCE_SIZE / SIZE)
        for w in weights:
            ground_values.append(max(0, min(255, round(w * 255))))

ground_b64 = base64.b64encode(bytearray(ground_values)).decode('ascii')

values = []
for iz in range(N):
    z = iz * SIZE / (N - 1)
    for ix in range(N):
        x = ix * SIZE / (N - 1)
        values.append(round(height(x * SOURCE_SIZE / SIZE, z * SOURCE_SIZE / SIZE) * 1000.0))

raw = bytearray()
for v in values:
    raw.extend(int(v).to_bytes(2, 'little'))
b64 = base64.b64encode(raw).decode('ascii')

OUT.write_text(
    '// Generated by scripts/build_wari_heightmap.py. Do not edit by hand.\n'
    'export const WARI_HEIGHTMAP_SIZE = ' + str(N) + ';\n'
    'export const WARI_HEIGHTMAP_WORLD_SIZE = ' + str(SIZE) + ';\n'
    'export const WARI_HEIGHTMAP_SCALE = 0.001;\n'
    'const B64 =\n  \'' + b64 + '\';\n'
    'function decode(): Float32Array {\n'
    '  const bin = atob(B64);\n'
    '  const out = new Float32Array(' + str(len(values)) + ');\n'
    '  for (let i = 0; i < out.length; i++) {\n'
    '    out[i] = (bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8)) * WARI_HEIGHTMAP_SCALE;\n'
    '  }\n'
    '  return out;\n'
    '}\n'
    'export const WARI_HEIGHTMAP = decode();\n'
    'export const WARI_GROUND_SIZE = ' + str(GROUND_SIZE) + ';\n'
    'const GROUND_B64 =\n  \'' + ground_b64 + '\';\n'
    'function decodeGround(): Uint8Array {\n'
    '  const bin = atob(GROUND_B64);\n'
    '  const out = new Uint8Array(' + str(len(ground_values)) + ');\n'
    '  for (let i = 0; i < out.length; i++) out[i] = bin.charCodeAt(i);\n'
    '  return out;\n'
    '}\n'
    'export const WARI_GROUND = decodeGround();\n',
    encoding='utf-8',
)
print(f'wrote {OUT} ({len(b64)} base64 chars, {len(values)} samples)')

reencode_file(OUT)
