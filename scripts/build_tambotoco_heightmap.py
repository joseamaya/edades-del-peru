#!/usr/bin/env python3
"""Generate the authored Pacaritambo–Huanacaure–Cusco valley transect (256 m map).

A southbound legendary route: the cave of Tambotoco in the north-west, the hill of Huanacaure in the
middle and the green Cusco valley in the south-east. Real distances are not to scale; the sequence is
(docs/design/tambotoco-model-mission.md).
"""

from __future__ import annotations

import base64
import math
from pathlib import Path

SIZE = 256
# The painted ground is sampled every 2 m; the heightfield matches that grid to keep the bundle small.
N = SIZE // 2 + 1
GROUND_SIZE = 128
WATER = 2.2
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/model/defs/tambotocoHeightmap.ts'

CAVE = (40.0, 52.0)
BASE = (44.0, 84.0)
SITE = (120.0, 106.0)
SITE_Y = 12.4
VALLEY = (186.0, 196.0)
ENEMY = (212.0, 200.0)
ROUTE = [CAVE, BASE, SITE, (152.0, 170.0), VALLEY, ENEMY]


def smoothstep(a: float, b: float, x: float) -> float:
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def noise(x: float, z: float) -> float:
    return (
        math.sin(x * 0.19 + z * 0.11) * 0.3
        + math.sin(x * 0.051 - z * 0.14 + 0.8) * 0.18
        + math.sin(x * 0.27 + z * 0.21 + 0.3) * 0.08
    )


def ellipse(x: float, z: float, cx: float, cz: float, rx: float, rz: float) -> float:
    return math.hypot((x - cx) / rx, (z - cz) / rz)


def _segment(x: float, z: float, ax: float, az: float, bx: float, bz: float) -> tuple[float, float]:
    dx, dz = bx - ax, bz - az
    length2 = dx * dx + dz * dz
    t = 0.0 if length2 == 0 else max(0.0, min(1.0, ((x - ax) * dx + (z - az) * dz) / length2))
    return math.hypot(x - (ax + t * dx), z - (az + t * dz)), t


def route_distance(x: float, z: float) -> tuple[float, float]:
    """Distance to the legendary route and the 0..1 progress along it."""
    best = (1e9, 0.0)
    total = len(ROUTE) - 1
    for i in range(total):
        (ax, az), (bx, bz) = ROUTE[i], ROUTE[i + 1]
        d, t = _segment(x, z, ax, az, bx, bz)
        if d < best[0]:
            best = (d, (i + t) / total)
    return best


def stream_x(z: float) -> float:
    return 150.0 + 5.0 * math.sin(z * 0.035 + 0.4)


def valley_mask(x: float, z: float) -> float:
    return 1.0 - smoothstep(0.55, 1.0, ellipse(x, z, VALLEY[0], VALLEY[1], 62.0, 48.0))


def height(x: float, z: float) -> float:
    h = 4.8 + 0.45 * noise(x, z)

    valley = valley_mask(x, z)
    h = h * (1.0 - valley) + 4.0 * valley

    # Huanacaure: a rounded hill with a flat summit for the huaca.
    hill = 1.0 - smoothstep(0.18, 1.0, ellipse(x, z, SITE[0], SITE[1], 34.0, 30.0))
    h += 11.0 * hill

    # Tambotoco: rocky ridge with a sheltered flat where the cave opens.
    ridge = 1.0 - smoothstep(0.25, 1.0, ellipse(x, z, 32.0, 40.0, 36.0, 30.0))
    h += 7.0 * ridge

    corridor, progress = route_distance(x, z)
    flat = 1.0 - smoothstep(6.0, 15.0, corridor)
    route_height = 5.6 + (12.4 - 5.6) * min(1.0, progress * 2.0)
    route_height = route_height - (route_height - 4.1) * smoothstep(0.55, 0.85, progress)
    h = h * (1.0 - flat) + route_height * flat

    north = smoothstep(26.0, 0.0, z) * (10.0 + 2.2 * math.sin(x * 0.1))
    east = smoothstep(232.0, 256.0, x) * (9.0 + 2.4 * math.sin(z * 0.11 + 0.6))
    south = smoothstep(242.0, 256.0, z) * (8.0 + 2.0 * math.sin(x * 0.12 + 0.5))
    west = smoothstep(24.0, 0.0, x) * (8.0 + 1.8 * math.sin(z * 0.12 + 0.9))
    h += north + east + south + west

    if z > 142.0:
        channel = 1.0 - smoothstep(2.2, 6.0, abs(x - stream_x(z)))
        crossing = 1.0 - smoothstep(8.0, 14.0, abs(z - 190.0))
        bed = 0.9 + crossing * 2.2
        h = h * (1.0 - channel) + bed * channel

    cave = 1.0 - smoothstep(7.0, 14.0, math.hypot(x - CAVE[0], z - CAVE[1]))
    h = h * (1.0 - cave) + 6.0 * cave
    site = 1.0 - smoothstep(9.0, 17.0, math.hypot(x - SITE[0], z - SITE[1]))
    h = h * (1.0 - site) + SITE_Y * site
    return max(0.8, h)


def ground(x: float, z: float) -> tuple[float, float, float, float]:
    h = height(x, z)
    valley = valley_mask(x, z)
    corridor, _ = route_distance(x, z)
    cave = 1.0 - smoothstep(8.0, 20.0, math.hypot(x - CAVE[0], z - CAVE[1]))
    hill = 1.0 - smoothstep(10.0, 26.0, math.hypot(x - SITE[0], z - SITE[1]))
    road = 1.0 - smoothstep(2.0, 7.0, corridor)
    high = smoothstep(8.0, 15.0, h)
    mottle = 0.8 + 0.4 * (0.5 + 0.5 * math.sin(x * 0.12 + 1.2) * math.sin(z * 0.1 + 0.5))

    grass = (valley * 1.0 + 0.2) * mottle
    dirt = road * 0.55 + cave * 0.5 + hill * 0.25
    sand = (1.0 - valley) * 0.55
    rock = high * 1.15 + hill * 0.45 + cave * 0.3
    grass *= 1.0 - high
    under = 1.0 - smoothstep(WATER - 0.4, WATER + 0.1, h)
    grass = grass * (1.0 - under) + under * 0.8
    sand *= 1.0 - under
    dirt = dirt * (1.0 - under) + under * 0.2
    rock *= 1.0 - under
    total = max(1e-6, grass + dirt + sand + rock)
    return grass / total, dirt / total, sand / total, rock / total


values = []
for iz in range(N):
    z = iz * SIZE / (N - 1)
    for ix in range(N):
        x = ix * SIZE / (N - 1)
        values.append(round(height(x, z) * 1000.0))

raw = bytearray()
for v in values:
    raw.extend(int(v).to_bytes(2, 'little'))
b64 = base64.b64encode(raw).decode('ascii')

ground_bytes = bytearray()
for gz in range(GROUND_SIZE):
    z = (gz + 0.5) * SIZE / GROUND_SIZE
    for gx in range(GROUND_SIZE):
        x = (gx + 0.5) * SIZE / GROUND_SIZE
        for w in ground(x, z):
            ground_bytes.append(max(0, min(255, round(w * 255))))
ground_b64 = base64.b64encode(ground_bytes).decode('ascii')


def _num(v: float) -> str:
    text = f'{v:.2f}'
    return text[:-1] if text.endswith('0') else text


stream_lines = '\n'.join(
    '  [{x}, {z}],'.format(x=_num(stream_x(z)), z=_num(float(z))) for z in range(142, SIZE + 1, 8)
)

OUT.write_text(
    '// Generated by scripts/build_tambotoco_heightmap.py. Do not edit by hand.\n'
    "import type { Polyline } from '../../util/math';\n"
    '\n'
    'export const TAMBOTOCO_HEIGHTMAP_SIZE = ' + str(N) + ';\n'
    'export const TAMBOTOCO_HEIGHTMAP_WORLD_SIZE = ' + str(SIZE) + ';\n'
    'export const TAMBOTOCO_HEIGHTMAP_SCALE = 0.001;\n'
    "const B64 =\n  '" + b64 + "';\n"
    'function decode(): Float32Array {\n'
    '  const bin = atob(B64);\n'
    '  const out = new Float32Array(' + str(len(values)) + ');\n'
    '  for (let i = 0; i < out.length; i++) {\n'
    '    out[i] = (bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8)) * TAMBOTOCO_HEIGHTMAP_SCALE;\n'
    '  }\n'
    '  return out;\n'
    '}\n'
    'export const TAMBOTOCO_HEIGHTMAP = decode();\n'
    '/** Stream that feeds the valley acequia, centreline in world metres. */\n'
    'export const TAMBOTOCO_STREAM_PATH: Polyline = [\n' + stream_lines + '\n];\n'
    '/** Half-width of the carved stream channel. */\n'
    'export const TAMBOTOCO_STREAM_HALF_WIDTH = 3.5;\n'
    '/** RGBA ground weights (grass, dirt, sand, rock) on a ' + str(GROUND_SIZE) + ' x ' + str(GROUND_SIZE) + ' grid. */\n'
    'export const TAMBOTOCO_GROUND_SIZE = ' + str(GROUND_SIZE) + ';\n'
    'export const TAMBOTOCO_GROUND = Uint8Array.from(\n'
    '  atob(\n'
    "    '" + ground_b64 + "',\n"
    '  ),\n'
    '  (c) => c.charCodeAt(0),\n'
    ');\n',
    encoding='utf-8',
)
print(f'wrote {OUT} ({len(b64)} height chars, {len(ground_b64)} ground chars, {len(values)} samples)')
