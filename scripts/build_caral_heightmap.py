#!/usr/bin/env python3
"""Generate the authored Supe-valley heightfield used by m1 (Caral).

The map is a compressed west-to-east transect of the valley as it was in use
(docs/design/caral-model-mission.md, "Geography"):

    sea | beach + Áspero + totora wetlands at the river mouth | lower valley
        | Supe river (north-south, then west to the sea) with its floodplain
        | Caral on the desert terrace | dry lomas and quebradas

Game metres, 256 x 256, 1 m grid. The Sacred City keeps the geometry it had on
the former 192 m site map, shifted east by CITY_OFFSET_X (sites.ts uses the
same offset for the city model, its blockers and heritage cards). Heights are
serialised as a base64 Uint16 array so the browser decodes them synchronously. The emitted TS is
Prettier-formatted afterwards (`npx prettier --write src/model/defs/caralHeightmap.ts`).
"""
from __future__ import annotations

import base64
import math
from pathlib import Path

SIZE = 256
N = SIZE + 1
CITY_OFFSET_X = 64.0
TERRACE = 8.0
VALLEY = 3.9
RIVER = 1.05
SEA = 0.2
WATER = 2.2
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/model/defs/caralHeightmap.ts'

# Fords across the north-south reach of the Supe (z), linking Áspero and the valley with the city.
# They are shallow gravel bars: the bed sits just under the water so the river reads as continuous and
# units wade across (the pathfinder marks these cells walkable).
FORDS_Z = (64.0, 150.0)
FORD_HALF_WIDTH = 4.5
FORD_DEPTH = 0.22

# Áspero sits on a low coastal rise north of the river mouth.
ASPERO = (42.0, 176.0)


def smoothstep(a: float, b: float, x: float) -> float:
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def noise(x: float, z: float) -> float:
    return (
        math.sin(x * 0.23 + z * 0.11) * 0.36
        + math.sin(x * 0.071 - z * 0.19 + 1.7) * 0.28
        + math.sin(x * 0.41 + z * 0.37 + 0.6) * 0.12
    )


def coast(z: float) -> float:
    """x of the waterline: a gently curving shore."""
    return 17.0 + 3.0 * math.sin(z * 0.035 + 0.8) + 1.5 * math.sin(z * 0.11)


def _river_path() -> list[tuple[float, float]]:
    """Supe centreline: south past the city's west flank, then a bend west to the sea."""
    pts = [(70.0 + 3.0 * math.sin(z * 0.06 + 0.4), float(z)) for z in range(0, 190, 2)]
    for i in range(1, 9):
        t = i / 9.0
        ang = t * math.pi / 2.0
        pts.append((58.0 + 12.0 * math.cos(ang) + 0.4, 190.0 + 18.0 * math.sin(ang)))
    for x in range(58, -12, -2):
        pts.append((float(x), 208.0 + 4.0 * math.sin(x * 0.07 + 1.0)))
    return pts


RIVER_PATH = _river_path()


def river_distance(x: float, z: float) -> float:
    best = 1e9
    for (ax, az), (bx, bz) in zip(RIVER_PATH, RIVER_PATH[1:]):
        if abs(x - ax) > 40 and abs(z - az) > 40:
            continue
        vx, vz = bx - ax, bz - az
        t = max(0.0, min(1.0, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)))
        best = min(best, math.hypot(x - (ax + vx * t), z - (az + vz * t)))
    return best


def city_local(x: float, z: float) -> tuple[float, float]:
    return x - CITY_OFFSET_X, z


def city_mask(x: float, z: float) -> float:
    lx, lz = city_local(x, z)
    return smoothstep(43.0, 48.0, lx) * (1.0 - smoothstep(166.0, 170.0, lz)) * (1.0 - smoothstep(145.5, 148.5, lx))


def height(x: float, z: float) -> float:
    lx, lz = city_local(x, z)

    # Valley floor everywhere west of the terrace, with low relief.
    h = VALLEY + 0.18 * noise(x * 0.8, z * 0.8)

    # Desert terrace of the Sacred City (its edge descends over ~12 m to the floodplain).
    edge = smoothstep(38.0, 50.0, lx)
    h = h * (1.0 - edge) + TERRACE * edge

    # Dry Andean foothills frame the city north, east and south (east of the river only).
    north = smoothstep(9.0, 0.0, z) * (12.0 + 3.6 * math.sin(x * 0.12 + 0.4) + 2.0 * math.sin(x * 0.33))
    east = smoothstep(148.0, 170.0, lx) * (15.0 + 4.6 * math.sin(z * 0.13 + 1.2) + 2.5 * math.sin(z * 0.31 + 0.4))
    south = (
        smoothstep(166.0, 184.0, lz)
        * smoothstep(86.0, 100.0, x)
        * (12.5 + 4.0 * math.sin(x * 0.14 + 1.1) + 2.0 * math.sin(x * 0.37))
    )
    h += north + east + south
    h -= smoothstep(150.0, 176.0, lx) * 2.4 * math.exp(-((z - 112.0) / 4.5) ** 2)
    h -= smoothstep(8.0, 0.0, z) * 1.8 * math.exp(-((lx - 118.0) / 5.0) ** 2)
    ravine = math.exp(-((z - 91.0) / 2.2) ** 2) * smoothstep(46.0, 58.0, lx) * (1.0 - smoothstep(140.0, 158.0, lx))
    h -= ravine * 0.75

    # Coastal lomas south of the river mouth: they turn green in the foggy winter.
    lomas = smoothstep(226.0, 252.0, z) * smoothstep(coast(z) + 6.0, coast(z) + 26.0, x)
    h += lomas * (7.5 + 2.5 * math.sin(x * 0.09 + 0.7) + 1.2 * math.sin(x * 0.27))

    # Áspero: a low rise above the wetlands, flat enough to build on.
    ax, az = ASPERO
    rise = 1.0 - smoothstep(10.0, 22.0, math.hypot(x - ax, z - az))
    h += rise * 0.9

    # Totora wetlands at the river mouth: just above the water, with shallow ponds.
    wet = (1.0 - smoothstep(18.0, 30.0, math.hypot((x - 34.0) * 0.8, z - 208.0))) * (1.0 - rise)
    marsh = 2.45 + 0.25 * math.sin(x * 0.4 + z * 0.3)
    ponds = max(0.0, math.sin(x * 0.31 + 1.1) * math.sin(z * 0.27 + 0.4)) * 0.75
    h = h * (1.0 - wet) + (marsh - ponds) * wet

    # The Supe: a shallow channel with a broad green floodplain.
    d = river_distance(x, z)
    channel = 1.0 - smoothstep(3.0, 5.5, d)
    bank = 1.0 - smoothstep(5.5, 18.0, d)
    h = h * (1.0 - bank) + (VALLEY - 0.6) * bank
    h = h * (1.0 - channel) + RIVER * channel

    # Fords: shallow gravel bars where people and llama-less caravans cross the Supe on foot. The bed
    # stays just under the waterline, so the river is continuous there and a thin sheet of water marks
    # the crossing.
    for fz in FORDS_Z:
        ford = math.exp(-((z - fz) / FORD_HALF_WIDTH) ** 4) * (1.0 - smoothstep(10.0, 14.0, d))
        h = max(h, h * (1.0 - ford) + (WATER - FORD_DEPTH) * ford)

    # Beach and sea.
    c = coast(z)
    beach = 1.0 - smoothstep(c, c + 12.0, x)
    h = h * (1.0 - beach) + (WATER + 0.35 + (x - c) * 0.08) * beach
    sea = 1.0 - smoothstep(c - 3.0, c, x)
    h = h * (1.0 - sea) + SEA * sea
    # The river mouth cuts through the beach into the sea.
    mouth = channel * max(beach, sea)
    if mouth > 0.0:
        h = min(h, h * (1.0 - mouth) + RIVER * mouth)

    # Keep the archaeological terrace flat; the sunken Plaza Mayor gets a shallow basin.
    flat = city_mask(x, z)
    h = h * (1.0 - 0.9 * flat) + TERRACE * 0.9 * flat
    h -= 0.55 * (1.0 - smoothstep(4.8, 7.2, math.hypot(lx - 100.0, lz - 53.0)))

    # Small wind-blown relief outside the built core and the water.
    dry = (1.0 - flat) * (1.0 - channel) * (1.0 - sea) * (1.0 - wet)
    h += dry * 0.22 * math.sin(x * 0.52 + z * 0.21) * math.sin(z * 0.17)
    return max(0.3, h)


# Ground materials per zone as (grass, dirt, sand, rock) weights, following the art-direction palette:
# wet sand on the beach, dense green in the totora wetlands and the floodplain, a dry huarango scrub
# between the river banks and the terrace, ochre desert on the terrace and bare rock on the lomas.
GROUND_SIZE = 128


# Cultivated ground of the valley (cotton, gourds, squash, beans): irregular patches of dark, moist
# loam with grass, painted where src/model/defs/caralValley.ts reserves its plots (FIELD_ANCHORS).
FIELD_PATCHES = (
    (46, 104), (54, 96), (44, 128), (56, 136), (42, 146), (58, 112), (48, 88), (52, 72), (44, 60),
    (56, 52), (84, 40), (90, 58), (84, 76), (92, 92), (86, 108), (92, 126), (84, 142), (90, 160),
)


def fertile(x: float, z: float) -> float:
    best = 0.0
    for k, (fx, fz) in enumerate(FIELD_PATCHES):
        r = 6.0 + 1.5 * math.sin(k * 1.7)
        wobble = 1.0 + 0.22 * math.sin(math.atan2(z - fz, x - fx) * 3.0 + k) + 0.1 * math.sin(x * 0.7 + z * 0.5)
        d = math.hypot(x - fx, z - fz) / wobble
        best = max(best, 1.0 - smoothstep(r * 0.55, r, d))
    return best


def boundary_shift(z: float) -> float:
    """Meander of the valley/terrace and dry-coast edges; the paint must not be a vertical line."""
    return (
        6.0 * math.sin(z * 0.055 + 0.7)
        + 2.5 * math.sin(z * 0.13 - 0.9)
        + 1.2 * math.sin(z * 0.31 + 0.3)
    )


def ground(x: float, z: float) -> tuple[float, float, float, float]:
    h = height(x, z)
    lx, _ = city_local(x, z)
    c = coast(z)
    d = river_distance(x, z)
    shift = boundary_shift(z)
    floodplain = 1.0 - smoothstep(6.0, 22.0, d)
    wet = 1.0 - smoothstep(18.0, 30.0, math.hypot((x - 34.0) * 0.8, z - 208.0))
    beach = (1.0 - smoothstep(c + 2.0, c + 13.0, x)) * (1.0 - wet * 0.8)
    ax, az = ASPERO
    aspero = 1.0 - smoothstep(8.0, 16.0, math.hypot(x - ax, z - az))
    # Warped edge: the green floodplain gives way to the ochre terrace in inlets and spurs, not a ruler line.
    # The beach and coastal bands keep their authored width: carving them changes the opening's node mix.
    terrace = smoothstep(40.0 + shift, 52.0 + shift, lx)
    high = smoothstep(9.0, 14.0, h)
    coastal = (1.0 - smoothstep(c + 30.0, c + 46.0, x)) * (1.0 - wet) * (1.0 - floodplain)
    # Lower valley: fields and huarango groves on the west bank, drier towards the terrace.
    valley = (1.0 - terrace) * (1.0 - beach) * (1.0 - coastal)
    # Irrigated plots and riparian meadow make a mottled green; the floodplain is the lushest band.
    mottle = 0.8 + 0.4 * (0.5 + 0.5 * math.sin(x * 0.11 + 1.3) * math.sin(z * 0.09 + 0.4))
    grass = valley * (0.7 + 0.8 * floodplain) * mottle + wet * 1.4
    dirt = valley * 0.14 * (1.6 - mottle) + aspero * 0.5 + terrace * 0.25
    sand = beach * 1.2 + terrace * 0.7 + aspero * 0.2
    rock = high * 1.1 + terrace * 0.05
    # The coastal strip around Áspero is dry desert edge: sand and gravel, no groves.
    sand += coastal * 1.1
    dirt += coastal * 0.3
    # Fertile plots: dark loam under a green cover.
    f = fertile(x, z) * (1.0 - terrace) * (1.0 - high)
    grass = grass * (1.0 - f) + f * 0.75
    dirt = dirt * (1.0 - f) + f * 0.55
    sand *= 1.0 - f
    grass *= 1.0 - high
    # Under water the refraction shows the bed: keep it dark so the sea and the river read as water.
    under = 1.0 - smoothstep(WATER - 0.4, WATER + 0.1, h)
    grass = grass * (1.0 - under) + under * 0.8
    sand *= 1.0 - under
    dirt = dirt * (1.0 - under) + under * 0.2
    rock *= 1.0 - under
    total = max(1e-6, grass + dirt + sand + rock)
    return grass / total, dirt / total, sand / total, rock / total


ground_bytes = bytearray()
for gz in range(GROUND_SIZE):
    z = (gz + 0.5) * SIZE / GROUND_SIZE
    for gx in range(GROUND_SIZE):
        x = (gx + 0.5) * SIZE / GROUND_SIZE
        for w in ground(x, z):
            ground_bytes.append(max(0, min(255, round(w * 255))))
ground_b64 = base64.b64encode(ground_bytes).decode('ascii')

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

def _num(v: float) -> str:
    """Shortest 2-decimal literal that Prettier keeps (2.00 -> 2.0)."""
    s = f'{v:.2f}'
    return s[:-1] if s.endswith('0') else s


river_lines = '\n'.join(f'  [{_num(x)}, {_num(z)}],' for x, z in RIVER_PATH)
coast_step = 2
coast_values = [coast(z) for z in range(0, SIZE + 1, coast_step)]
coast_lines = '\n'.join(f'  {_num(v)},' for v in coast_values)

OUT.write_text(
    '// Generated by scripts/build_caral_heightmap.py. Do not edit by hand.\n'
    "import type { Polyline } from '../../util/math';\n"
    '\n'
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
    'export const CARAL_HEIGHTMAP = decode();\n'
    '/** Supe channel centreline in world metres, for telling river water from the sea. */\n'
    'export const CARAL_RIVER_PATH: Polyline = [\n' + river_lines + '\n];\n'
    '/** Half-width of the carved Supe channel: water inside it is the river, not the sea. */\n'
    'export const CARAL_RIVER_HALF_WIDTH = 5.5;\n'
    '/** Waterline x sampled every CARAL_COAST_STEP metres along z; west of it is sea. */\n'
    'export const CARAL_COAST_STEP = ' + str(coast_step) + ';\n'
    'export const CARAL_COAST_X: readonly number[] = [\n' + coast_lines + '\n];\n'
    '/** Shallow fords over the Supe: z centre and half-width (metres); their cells are walkable water. */\n'
    'export const CARAL_FORDS: readonly { z: number; halfWidth: number }[] = [\n'
    + ''.join(f'  {{ z: {_num(fz)}, halfWidth: {_num(FORD_HALF_WIDTH)} }},\n' for fz in FORDS_Z)
    + '];\n'
    '/** RGBA ground weights (grass, dirt, sand, rock) on a ' + str(GROUND_SIZE) + ' x ' + str(GROUND_SIZE) + ' grid. */\n'
    'export const CARAL_GROUND_SIZE = ' + str(GROUND_SIZE) + ';\n'
    'export const CARAL_GROUND = Uint8Array.from(\n'
    '  atob(\n'
    "    '" + ground_b64 + "',\n"
    '  ),\n'
    '  (c) => c.charCodeAt(0),\n'
    ');\n',
    encoding='utf-8',
)
print(f'wrote {OUT} ({len(b64)} base64 chars, {len(values)} samples)')
