#!/usr/bin/env python3
"""Generate the authored Cusco–Umachiri transect (Junta del Cusco, 256 m map).

A compressed southbound campaign: the Cusco basin in the north-west, the Apacheta pass in the middle,
the altiplano around Umachiri in the south-east, and the Lalli channel with its crossing. Real distances
are not to scale; the sequence is (docs/design/junta-cusco-model-mission.md).
"""

from __future__ import annotations

import base64
import math
from pathlib import Path

SIZE = 256
N = SIZE + 1
GROUND_SIZE = 128
WATER = 2.2
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/model/defs/juntaHeightmap.ts'

SITE = (72.0, 58.0)
SITE_Y = 6.0
BASE = (52.0, 96.0)
APACHETA = (140.0, 168.0)
UMACHIRI = (198.0, 214.0)
ENEMY = (222.0, 238.0)
ROUTE = [(72.0, 58.0), (96.0, 112.0), (122.0, 146.0), (150.0, 180.0), UMACHIRI, ENEMY]


def smoothstep(a: float, b: float, x: float) -> float:
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def noise(x: float, z: float) -> float:
    return (
        math.sin(x * 0.17 + z * 0.13) * 0.28
        + math.sin(x * 0.053 - z * 0.11 + 1.1) * 0.18
        + math.sin(x * 0.29 + z * 0.23 + 0.4) * 0.07
    )


def ellipse(x: float, z: float, cx: float, cz: float, rx: float, rz: float) -> float:
    return math.hypot((x - cx) / rx, (z - cz) / rz)


def _segment(x: float, z: float, ax: float, az: float, bx: float, bz: float) -> tuple[float, float]:
    dx, dz = bx - ax, bz - az
    length2 = dx * dx + dz * dz
    t = 0.0 if length2 == 0 else max(0.0, min(1.0, ((x - ax) * dx + (z - az) * dz) / length2))
    return math.hypot(x - (ax + t * dx), z - (az + t * dz)), t


def route_distance(x: float, z: float) -> tuple[float, float]:
    """Distance to the campaign route and the 0..1 progress along it."""
    best = (1e9, 0.0)
    total = len(ROUTE) - 1
    for i in range(total):
        (ax, az), (bx, bz) = ROUTE[i], ROUTE[i + 1]
        d, t = _segment(x, z, ax, az, bx, bz)
        if d < best[0]:
            best = (d, (i + t) / total)
    return best


def river_x(z: float) -> float:
    return 178.0 + 8.0 * math.sin(z * 0.032 + 0.7)


def height(x: float, z: float) -> float:
    h = 4.6 + 0.5 * noise(x, z)

    cusco = 1.0 - smoothstep(0.62, 1.0, ellipse(x, z, 72.0, 58.0, 48.0, 45.0))
    h = h * (1.0 - cusco) + 5.7 * cusco

    altiplano = 1.0 - smoothstep(0.58, 1.0, ellipse(x, z, 202.0, 222.0, 68.0, 52.0))
    h = h * (1.0 - altiplano) + 4.0 * altiplano

    corridor, progress = route_distance(x, z)
    flat = 1.0 - smoothstep(7.0, 16.0, corridor)
    route_height = 5.4 + (4.0 - 5.4) * progress
    h = h * (1.0 - flat) + route_height * flat

    north = smoothstep(30.0, 0.0, z) * (12.0 + 2.4 * math.sin(x * 0.09))
    east = smoothstep(230.0, 256.0, x) * (11.0 + 2.6 * math.sin(z * 0.1 + 0.8))
    south = smoothstep(242.0, 256.0, z) * (8.0 + 2.0 * math.sin(x * 0.12 + 0.4))
    west = smoothstep(26.0, 0.0, x) * (7.0 + 1.8 * math.sin(z * 0.12 + 0.7))
    h += north + east + south + west

    if z > 112.0:
        channel = 1.0 - smoothstep(3.0, 8.0, abs(x - river_x(z)))
        crossing = 1.0 - smoothstep(9.0, 15.0, abs(z - 200.0))
        bed = 1.0 + crossing * 2.4
        h = h * (1.0 - channel) + bed * channel

    site = 1.0 - smoothstep(11.0, 19.0, math.hypot(x - SITE[0], z - SITE[1]))
    h = h * (1.0 - site) + SITE_Y * site
    return max(0.8, h)


def ground(x: float, z: float) -> tuple[float, float, float, float]:
    h = height(x, z)
    cusco = 1.0 - smoothstep(0.62, 1.0, ellipse(x, z, 72.0, 58.0, 48.0, 45.0))
    altiplano = 1.0 - smoothstep(0.58, 1.0, ellipse(x, z, 202.0, 222.0, 68.0, 52.0))
    corridor, _ = route_distance(x, z)
    city = 1.0 - smoothstep(14.0, 30.0, math.hypot(x - SITE[0], z - SITE[1]))
    road = 1.0 - smoothstep(2.5, 8.0, corridor)
    high = smoothstep(9.0, 16.0, h)
    mottle = 0.8 + 0.4 * (0.5 + 0.5 * math.sin(x * 0.13 + 1.1) * math.sin(z * 0.11 + 0.6))

    grass = (cusco * 1.0 + altiplano * 0.7 + 0.2) * mottle
    dirt = city * 0.9 + road * 0.55 + (1.0 - cusco) * (1.0 - altiplano) * 0.2
    sand = (1.0 - cusco) * (1.0 - altiplano) * 0.65
    rock = high * 1.2
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
    """Shortest 2-decimal literal that Prettier keeps (2.00 -> 2.0)."""
    text = f'{v:.2f}'
    return text[:-1] if text.endswith('0') else text


river_lines = '\n'.join(
    '  [{x}, {z}],'.format(x=_num(river_x(z)), z=_num(float(z))) for z in range(112, SIZE + 1, 8)
)

OUT.write_text(
    '// Generated by scripts/build_junta_heightmap.py. Do not edit by hand.\n'
    "import type { Polyline } from '../../util/math';\n"
    '\n'
    'export const JUNTA_HEIGHTMAP_SIZE = ' + str(N) + ';\n'
    'export const JUNTA_HEIGHTMAP_WORLD_SIZE = ' + str(SIZE) + ';\n'
    'export const JUNTA_HEIGHTMAP_SCALE = 0.001;\n'
    "const B64 =\n  '" + b64 + "';\n"
    'function decode(): Float32Array {\n'
    '  const bin = atob(B64);\n'
    '  const out = new Float32Array(' + str(len(values)) + ');\n'
    '  for (let i = 0; i < out.length; i++) {\n'
    '    out[i] = (bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8)) * JUNTA_HEIGHTMAP_SCALE;\n'
    '  }\n'
    '  return out;\n'
    '}\n'
    'export const JUNTA_HEIGHTMAP = decode();\n'
    '/** Lalli channel centreline in world metres. */\n'
    'export const JUNTA_RIVER_PATH: Polyline = [\n' + river_lines + '\n];\n'
    '/** Half-width of the carved Lalli channel. */\n'
    'export const JUNTA_RIVER_HALF_WIDTH = 4.5;\n'
    '/** RGBA ground weights (grass, dirt, sand, rock) on a ' + str(GROUND_SIZE) + ' x ' + str(GROUND_SIZE) + ' grid. */\n'
    'export const JUNTA_GROUND_SIZE = ' + str(GROUND_SIZE) + ';\n'
    'export const JUNTA_GROUND = Uint8Array.from(\n'
    '  atob(\n'
    "    '" + ground_b64 + "',\n"
    '  ),\n'
    '  (c) => c.charCodeAt(0),\n'
    ');\n',
    encoding='utf-8',
)
print(f'wrote {OUT} ({len(b64)} height chars, {len(ground_b64)} ground chars, {len(values)} samples)')
