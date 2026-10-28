#!/usr/bin/env python3
"""Generate the authored Caral heightfield used by the RTS terrain.

The field is in game metres for the m1 map (192 x 192, 1 m grid). The city
terrace is flat at 8 m, the Supe channel and its floodplain meander west of the
terrace, and dry lomas frame the north, east and south edges. Values are
serialised as a base64 Uint16 array so the browser can decode it synchronously
at boot.
"""
from __future__ import annotations

import base64
import math
from pathlib import Path

SIZE = 192
N = SIZE + 1
TERRACE = 8.0
VALLEY = 3.9
RIVER = 1.05
WATER = 2.2
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/model/defs/caralHeightmap.ts'


def smoothstep(a: float, b: float, x: float) -> float:
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def noise(x: float, z: float) -> float:
    return (
        math.sin(x * 0.23 + z * 0.11) * 0.36
        + math.sin(x * 0.071 - z * 0.19 + 1.7) * 0.28
        + math.sin(x * 0.41 + z * 0.37 + 0.6) * 0.12
    )


def city_mask(x: float, z: float) -> float:
    # Flat archaeological terrace. The south-eastern corner is the player's
    # peripheral base; it stays flat but outside the monumental core.
    return smoothstep(43.0, 48.0, x) * (1.0 - smoothstep(166.0, 170.0, z)) * (1.0 - smoothstep(145.5, 148.5, x))


def height(x: float, z: float) -> float:
    # Broad green floodplain and a shallow river west of the terrace. The
    # channel and banks meander gently so the valley reads as a landform, not
    # a straight painted strip. The channel is wide enough to read from the
    # RTS camera.
    river_edge = 8.0 + 2.5 * math.sin(z * 0.16 + 0.4)
    ramp_end = river_edge + 14.0 + 2.0 * math.sin(z * 0.11 + 1.3)
    valley_end = min(41.0, ramp_end + 14.0 + 2.0 * math.sin(z * 0.09 + 2.0))
    if x < river_edge:
        h = RIVER
    elif x < ramp_end:
        h = RIVER + (VALLEY - RIVER) * smoothstep(river_edge, ramp_end, x)
    elif x < valley_end:
        h = VALLEY + 0.18 * noise(x * 0.8, z * 0.8)
    else:
        h = TERRACE

    # The terrace edge descends over ~12 m, so the fields and the base stay
    # connected without a single-cell cliff at the riverbank.
    if x >= 38.0:
        edge = smoothstep(38.0, 50.0, x)
        h = VALLEY + (TERRACE - VALLEY) * edge + (h - (VALLEY + (TERRACE - VALLEY) * edge)) * edge

    # A broad access ramp near the southern residential edge keeps the valley
    # and fields reachable without a ford through the river.
    ramp = smoothstep(168.0, 184.0, z) * (1.0 - smoothstep(56.0, 64.0, x))
    if x < 64.0:
        ramp_h = VALLEY + (TERRACE - VALLEY) * smoothstep(20.0, 48.0, x)
        h = h * (1.0 - ramp * 0.9) + ramp_h * (ramp * 0.9)

    # Dry Andean foothills frame the valley east, north and south of the city.
    # The near slopes start just beyond the source model; layered ridge lines
    # and shallow quebradas keep them from reading as a uniform brown wall.
    north = smoothstep(9.0, 0.0, z) * (12.0 + 3.6 * math.sin(x * 0.12 + 0.4) + 2.0 * math.sin(x * 0.33))
    east = smoothstep(148.0, 170.0, x) * (15.0 + 4.6 * math.sin(z * 0.13 + 1.2) + 2.5 * math.sin(z * 0.31 + 0.4))
    south = smoothstep(166.0, 184.0, z) * (12.5 + 4.0 * math.sin(x * 0.14 + 1.1) + 2.0 * math.sin(x * 0.37))
    h += north + east + south
    # Shallow dry quebradas cut the east and north lomas without creating
    # playable cliffs inside the terrace.
    h -= smoothstep(150.0, 176.0, x) * 2.4 * math.exp(-((z - 112.0) / 4.5) ** 2)
    h -= smoothstep(8.0, 0.0, z) * 1.8 * math.exp(-((x - 118.0) / 5.0) ** 2)

    # Shallow dry ravine between the upper and lower halves, visible but
    # traversable (the plan calls it a dry seasonal channel).
    ravine = math.exp(-((z - 91.0) / 2.2) ** 2) * smoothstep(46.0, 58.0, x) * (1.0 - smoothstep(140.0, 158.0, x))
    h -= ravine * 0.75

    # Keep the playable archaeological terrace and the southern base flat.
    flat = city_mask(x, z)
    base_flat = smoothstep(46.0, 52.0, x) * (1.0 - smoothstep(68.0, 74.0, x)) * smoothstep(168.0, 174.0, z) * (1.0 - smoothstep(184.0, 190.0, z))
    h = h * (1.0 - 0.9 * max(flat, base_flat)) + TERRACE * (0.9 * max(flat, base_flat))

    # The Plaza Mayor is a sunken circular court in the source model. Carve
    # a shallow basin under it so the source floor sits at ground level while
    # the surrounding residential terraces and the pyramids stay at 8 m.
    plaza_basin = 0.55 * (1.0 - smoothstep(4.8, 7.2, math.hypot(x - 100.0, z - 53.0)))
    h -= plaza_basin

    # Small wind-blown relief outside the built core.
    outside = (1.0 - flat) * (1.0 - base_flat)
    h += outside * 0.22 * math.sin(x * 0.52 + z * 0.21) * math.sin(z * 0.17)
    return max(0.9, h)


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

OUT.write_text(
    '// Generated by scripts/build_caral_heightmap.py. Do not edit by hand.\n'
    'export const CARAL_HEIGHTMAP_SIZE = ' + str(N) + ';\n'
    'export const CARAL_HEIGHTMAP_WORLD_SIZE = ' + str(SIZE) + ';\n'
    'export const CARAL_HEIGHTMAP_SCALE = 0.001;\n'
    'const B64 =\n  \'' + b64 + '\';\n'
    'function decode(): Float32Array {\n'
    '  const bin = atob(B64);\n'
    '  const out = new Float32Array(' + str(len(values)) + ');\n'
    '  for (let i = 0; i < out.length; i++) {\n'
    '    out[i] = (bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8)) * CARAL_HEIGHTMAP_SCALE;\n'
    '  }\n'
    '  return out;\n'
    '}\n'
    'export const CARAL_HEIGHTMAP = decode();\n',
    encoding='utf-8',
)
print(f'wrote {OUT} ({len(b64)} base64 chars, {len(values)} samples)')
