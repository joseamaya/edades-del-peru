#!/usr/bin/env python3
"""Generate the authored Lima coast transect (256 m map).

The Pacific in the west, the Rímac crossing, the plain where the Ciudad de los Reyes is founded and the
hills from which Quizu Yupanqui's army descends. Real distances are not to scale; the sequence is
(docs/design/lima-model-mission.md).
"""

from __future__ import annotations

import base64
import math
from pathlib import Path

SIZE = 256
N = SIZE // 2 + 1
GROUND_SIZE = 128
WATER = 2.2
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/model/defs/limaHeightmap.ts'

CITY = (90.0, 150.0)
CITY_Y = 5.6
BASE = (70.0, 170.0)
ENEMY = (205.0, 70.0)
BRIDGE_X = 120.0
ROUTE = [BASE, (120.0, 124.0), (165.0, 100.0), ENEMY]


def smoothstep(a: float, b: float, x: float) -> float:
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def noise(x: float, z: float) -> float:
    return (
        math.sin(x * 0.16 + z * 0.12) * 0.25
        + math.sin(x * 0.047 - z * 0.15 + 0.9) * 0.15
        + math.sin(x * 0.31 + z * 0.24 + 0.5) * 0.07
    )


def ellipse(x: float, z: float, cx: float, cz: float, rx: float, rz: float) -> float:
    return math.hypot((x - cx) / rx, (z - cz) / rz)


def _segment(x: float, z: float, ax: float, az: float, bx: float, bz: float) -> tuple[float, float]:
    dx, dz = bx - ax, bz - az
    length2 = dx * dx + dz * dz
    t = 0.0 if length2 == 0 else max(0.0, min(1.0, ((x - ax) * dx + (z - az) * dz) / length2))
    return math.hypot(x - (ax + t * dx), z - (az + t * dz)), t


def route_distance(x: float, z: float) -> tuple[float, float]:
    best = (1e9, 0.0)
    total = len(ROUTE) - 1
    for i in range(total):
        (ax, az), (bx, bz) = ROUTE[i], ROUTE[i + 1]
        d, t = _segment(x, z, ax, az, bx, bz)
        if d < best[0]:
            best = (d, (i + t) / total)
    return best


def rimac_z(x: float) -> float:
    return 120.0 + 6.0 * math.sin(x * 0.028 + 0.5)


def height(x: float, z: float) -> float:
    h = 4.8 + 0.4 * noise(x, z)
    coast = smoothstep(26.0, 46.0, x)
    h = 0.7 + (h - 0.7) * coast
    sea = 1.0 - smoothstep(20.0, 30.0, x)
    h = h * (1.0 - sea) + 0.4 * sea

    city = 1.0 - smoothstep(0.4, 1.0, ellipse(x, z, CITY[0], CITY[1], 52.0, 42.0))
    h = h * (1.0 - city) + CITY_Y * city

    enemy = 1.0 - smoothstep(0.3, 1.0, ellipse(x, z, ENEMY[0], ENEMY[1], 34.0, 30.0))
    h = h * (1.0 - enemy) + 8.0 * enemy

    east = smoothstep(198.0, 240.0, x) * (11.0 + 2.4 * math.sin(z * 0.1 + 0.7))
    north = smoothstep(34.0, 0.0, z) * (9.0 + 2.0 * math.sin(x * 0.11))
    south = smoothstep(238.0, 256.0, z) * (6.0 + 1.6 * math.sin(x * 0.1 + 0.4))
    h += east + north + south

    corridor, _ = route_distance(x, z)
    flat = 1.0 - smoothstep(6.0, 15.0, corridor)
    route_height = 4.9
    h = h * (1.0 - flat) + route_height * flat

    channel_z = abs(z - rimac_z(x))
    channel = (1.0 - smoothstep(2.5, 6.5, channel_z)) * smoothstep(38.0, 48.0, x)
    bridge = 1.0 - smoothstep(9.0, 16.0, abs(x - BRIDGE_X))
    bed = 1.0 + bridge * 2.3
    h = h * (1.0 - channel) + bed * channel

    site = 1.0 - smoothstep(10.0, 18.0, math.hypot(x - CITY[0], z - CITY[1]))
    h = h * (1.0 - site) + CITY_Y * site
    return max(0.3, h)


def ground(x: float, z: float) -> tuple[float, float, float, float]:
    h = height(x, z)
    city = 1.0 - smoothstep(0.4, 1.0, ellipse(x, z, CITY[0], CITY[1], 52.0, 42.0))
    enemy = 1.0 - smoothstep(0.3, 1.0, ellipse(x, z, ENEMY[0], ENEMY[1], 34.0, 30.0))
    corridor, _ = route_distance(x, z)
    road = 1.0 - smoothstep(2.5, 8.0, corridor)
    high = smoothstep(7.0, 13.0, h)
    beach = (1.0 - smoothstep(30.0, 48.0, x)) * smoothstep(14.0, 28.0, x)
    sea = 1.0 - smoothstep(20.0, 30.0, x)
    mottle = 0.8 + 0.4 * (0.5 + 0.5 * math.sin(x * 0.11 + 1.3) * math.sin(z * 0.09 + 0.4))

    grass = (city * 0.9 + (1.0 - sea) * 0.45 + 0.15) * mottle
    dirt = city * 0.6 + road * 0.55 + enemy * 0.25
    sand = beach * 1.2 + (1.0 - city) * 0.15
    rock = high * 1.2 + enemy * 0.4
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


river_lines = '\n'.join(
    '  [{x}, {z}],'.format(x=_num(float(x)), z=_num(rimac_z(x))) for x in range(38, SIZE + 1, 8)
)

OUT.write_text(
    '// Generated by scripts/build_lima_heightmap.py. Do not edit by hand.\n'
    "import type { Polyline } from '../../util/math';\n"
    '\n'
    'export const LIMA_HEIGHTMAP_SIZE = ' + str(N) + ';\n'
    'export const LIMA_HEIGHTMAP_WORLD_SIZE = ' + str(SIZE) + ';\n'
    'export const LIMA_HEIGHTMAP_SCALE = 0.001;\n'
    "const B64 =\n  '" + b64 + "';\n"
    'function decode(): Float32Array {\n'
    '  const bin = atob(B64);\n'
    '  const out = new Float32Array(' + str(len(values)) + ');\n'
    '  for (let i = 0; i < out.length; i++) {\n'
    '    out[i] = (bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8)) * LIMA_HEIGHTMAP_SCALE;\n'
    '  }\n'
    '  return out;\n'
    '}\n'
    'export const LIMA_HEIGHTMAP = decode();\n'
    '/** Rímac centreline in world metres (east-west, with the city on its south bank). */\n'
    'export const LIMA_RIVER_PATH: Polyline = [\n' + river_lines + '\n];\n'
    '/** Half-width of the carved Rímac channel. */\n'
    'export const LIMA_RIVER_HALF_WIDTH = 4.5;\n'
    '/** RGBA ground weights (grass, dirt, sand, rock) on a ' + str(GROUND_SIZE) + ' x ' + str(GROUND_SIZE) + ' grid. */\n'
    'export const LIMA_GROUND_SIZE = ' + str(GROUND_SIZE) + ';\n'
    'export const LIMA_GROUND = Uint8Array.from(\n'
    '  atob(\n'
    "    '" + ground_b64 + "',\n"
    '  ),\n'
    '  (c) => c.charCodeAt(0),\n'
    ');\n',
    encoding='utf-8',
)
print(f'wrote {OUT} ({len(b64)} height chars, {len(ground_b64)} ground chars, {len(values)} samples)')
