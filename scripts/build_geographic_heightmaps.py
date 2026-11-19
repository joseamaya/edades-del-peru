#!/usr/bin/env python3
"""Generate the mission-scoped heightfields and their painted ground (geographic identity, phase 1-2).

These fields are applied through `MissionSite.heightField` on top of an authored site: the site
model, anchors and collision stay shared, the terrain geometry and its paint change per mission
(docs/design/mission-geographic-identity.md, docs/plan/geographic-identity-roadmap.md).

Every field:
- flattens a pad at the authored site anchor to `MissionSite.y`, so the landmark keeps its grounding;
- paints its own ground from that field's relief (height, slope, water) instead of inheriting another
  mission's painting, so a carved quebrada or valley is coloured as what it is.

The Rímac fields also carry the base river metadata so `isRiver`, the riparian grove and the
river-stone scatter keep working.

Run `python3 scripts/build_geographic_heightmaps.py`; the script formats its own output.
"""

from __future__ import annotations

import base64
import math
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from reencode_heightmaps import reencode_file

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/model/defs'

WORLD = 256.0
WATER = 2.2
GROUND_SIZE = 128
PALETTE_SIZE = 16


def smooth(a: float, b: float, x: float) -> float:
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def noise(x: float, z: float, phase: float = 0.0) -> float:
    return (
        math.sin(x * 0.071 + z * 0.113 + 0.4 + phase) * 0.35
        + math.sin(x * 0.19 - z * 0.23 + 1.7 + phase * 1.7) * 0.2
        + math.sin(x * 0.41 + z * 0.37 - phase * 0.6) * 0.1
    )


def rimac_z(x: float) -> float:
    """Rímac centreline, matching scripts/build_lima_heightmap.py so LIMA_RIVER_PATH stays valid."""
    return 120.0 + 6.0 * math.sin(x * 0.028 + 0.5)


def carve_river(h: float, x: float, z: float, bridge_x: float) -> float:
    """Cut the Rímac into the finished landform (never raising it) with the bridge bar left wadeable.

    Applied last, as scripts/build_lima_heightmap.py does, so the wet channel follows the whole
    inherited `LIMA_RIVER_PATH` instead of being filled back in by the hills that follow it. The
    mask reaches the shore (x 28) so the mouth joins the sea instead of stopping a few metres inland.
    """
    mask = (1.0 - smooth(2.5, 6.5, abs(z - rimac_z(x)))) * smooth(28.0, 40.0, x)
    bed = 1.0 + (1.0 - smooth(9.0, 16.0, abs(x - bridge_x))) * 2.3
    return h * (1.0 - mask) + min(h, bed) * mask


def site_pad(h: float, x: float, z: float, site: tuple[float, float], elevation: float) -> float:
    """Flatten a disc at the authored site anchor to the mission's `site.y`.

    The full-flat radius clears the largest site model footprint (half-diagonal ~11 m) with margin;
    the keepout rectangles are construction exclusions, not the pad.
    """
    m = 1.0 - smooth(15.0, 26.0, math.hypot(x - site[0], z - site[1]))
    return h * (1.0 - m) + elevation * m


# Site anchors and pad elevations, mirrored from AUTHORED_SITES (src/model/defs/sites.ts) and the
# `MissionSite.y` of every mission that uses the field. `tests/geographic-heightfields.test.ts` pins
# the pad against the real anchor, so a drift in either place fails CI.
QUIPAIPAN_SITE = (166.4, 174.1333)  # cuscoIncaPoint(124.8, 130.6)
QUIPAIPAN_Y = 5.0
CUSCO1536_SITE = (166.4, 174.1333)
CUSCO1536_Y = 5.0
LIMA_SITE = (90.0, 150.0)  # LIMA_SITE_ORIGIN
LIMA_Y = 5.6
ARICA_SITE = (179.7333, 97.3333)  # aricaPoint(134.8, 73)
CALLAO_Y = 4.0
TARAPACA_Y = 4.0
CHANCA_SITE = (179.84, 97.28)  # chancaPoint(112.4, 60.8)
VILCABAMBA_Y = 5.0
INDEPENDENCE_SITE = (179.7333, 94.6667)  # independencePoint(134.8, 71)
BRENA_Y = 5.0

Height = Callable[[float, float], float]
Paint = Callable[[Height, float, float], tuple[float, float, float, float]]


def slope_at(h: Height, x: float, z: float, step: float = 2.0) -> float:
    dx = (h(x + step, z) - h(x - step, z)) / (2 * step)
    dz = (h(x, z + step) - h(x, z - step)) / (2 * step)
    return math.hypot(dx, dz)


def mottle(x: float, z: float) -> float:
    return 0.85 + 0.3 * (0.5 + 0.5 * math.sin(x * 0.11 + 1.3) * math.sin(z * 0.09 + 0.4))


def normalize(weights: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    total = max(1e-6, sum(weights))
    return tuple(max(0.0, w) / total for w in weights)  # type: ignore[return-value]


def paint_highland(h: Height, x: float, z: float) -> tuple[float, float, float, float]:
    """Puna grass on the flats, bare rock on the slopes and summits (Quipaipan, Cusco).

    The weights are zone-dominant on purpose: the game reads `grass > 0.6` to place groves and
    `rock > 0.6` / `sand > 0.45` to keep trees off cliffs and beaches (`WorldViewDecor.treeless`).
    """
    elevation = h(x, z)
    slope = slope_at(h, x, z)
    rock = max(smooth(0.26, 0.5, slope), smooth(7.4, 8.8, elevation))
    mottle_v = mottle(x, z)
    grass = (1.0 - rock) * 0.9 * mottle_v
    dirt = (1.0 - rock) * 0.14
    sand = (1.0 - rock) * 0.03
    return normalize((grass, dirt, sand, rock))


def paint_cusco1536(h: Height, x: float, z: float) -> tuple[float, float, float, float]:
    """Highland paint plus the city's trodden basin and the stone of Sacsayhuamán."""
    grass, dirt, sand, rock = paint_highland(h, x, z)
    city = 1.0 - smooth(20.0, 48.0, math.hypot(x - 166.0, z - 174.0))
    stone = 1.0 - smooth(0.45, 1.0, math.hypot((x - 158.0) / 30.0, (z - 141.0) / 14.0))
    return normalize((grass * (1.0 - city), dirt + 0.8 * city, sand, rock + 0.9 * stone))


def paint_sierra(h: Height, x: float, z: float) -> tuple[float, float, float, float]:
    """Terraced valley floor, gravel wash and rocky sides (Mantaro/Breña)."""
    elevation = h(x, z)
    slope = slope_at(h, x, z)
    rock = max(smooth(0.28, 0.52, slope), smooth(8.5, 11.5, elevation))
    wash = math.exp(-((x - 128.0) / 14.0) ** 2) * (1.0 - rock)
    valley = 1.0 - smooth(3.3, 4.6, elevation)
    grass = (1.0 - rock - wash) * (0.55 + 0.4 * valley) * mottle(x, z)
    sand = 0.7 * wash
    dirt = max(0.0, 1.0 - rock - grass - sand)
    return normalize((grass, dirt, sand, rock))


def paint_quebrada(h: Height, x: float, z: float) -> tuple[float, float, float, float]:
    """Atacama desert: sand and rock, with a green oasis and the planted wash floor."""
    elevation = h(x, z)
    slope = slope_at(h, x, z)
    rock = max(smooth(0.26, 0.5, slope), smooth(7.4, 9.0, elevation))
    oasis = 1.0 - smooth(10.0, 26.0, math.hypot(x - 92.0, z - 140.0))
    wash = math.exp(-((z - 132.0) / 15.0) ** 2) * (1.0 - smooth(200.0, 228.0, x))
    grass = 0.55 * oasis * (1.0 - rock)
    sand = (1.0 - rock - grass) * (0.45 + 0.45 * wash)
    dirt = max(0.0, 1.0 - rock - grass - sand)
    return normalize((grass, dirt, sand, rock))


def paint_coastal_city(
    h: Height, x: float, z: float, city: tuple[float, float], river: bool = True, oasis: float = 0.85
) -> tuple[float, float, float, float]:
    """Irrigated green plain, urban dirt, gravel beach and rocky hills (Lima, Callao).

    `oasis` is how much of the non-beach plain reads green: the Lima valley is an oasis (groves grow
    where `grass > 0.6`), while the Callao sand plain stays dry like the base Arica field.
    """
    elevation = h(x, z)
    slope = slope_at(h, x, z)
    rock = max(smooth(0.28, 0.55, slope), smooth(8.0, 11.0, elevation))
    beach = 1.0 - smooth(WATER + 0.15, WATER + 1.6, elevation)
    urban = 1.0 - smooth(16.0, 40.0, math.hypot(x - city[0], z - city[1]))
    river_band = math.exp(-((z - rimac_z(x)) / 22.0) ** 2) if river else 0.0
    green = max(river_band, oasis * (1.0 - beach))
    free = 1.0 - rock
    grass = free * 0.9 * green
    dirt = free * 0.7 * urban * (1.0 - green)
    sand = free * max(0.8 * beach, 0.55 * (1.0 - green))
    return normalize((grass, dirt, sand, rock))


def paint_cloud_forest(h: Height, x: float, z: float) -> tuple[float, float, float, float]:
    """Wet cloud-forest floor: dense green on the flats, rock on the ridges, gravel on the banks."""
    elevation = h(x, z)
    slope = slope_at(h, x, z)
    rock = max(smooth(0.26, 0.5, slope), smooth(9.5, 13.5, elevation))
    bank = max(math.exp(-((x - 132.0) / 14.0) ** 2), 1.0 - smooth(2.3, 3.2, elevation))
    free = 1.0 - rock
    grass = free * (1.0 - bank * 0.8) * 0.92
    sand = free * 0.85 * bank
    dirt = max(0.0, 1.0 - rock - grass - sand)
    return normalize((grass, dirt, sand, rock))


def quipaipan(x: float, z: float) -> float:
    h = 5.0 + 0.22 * noise(x, z)
    h += 3.4 * (1.0 - smooth(0.0, 1.0, math.hypot((x - 78) / 40, (z - 178) / 34)))
    h += 2.6 * (1.0 - smooth(0.0, 1.0, math.hypot((x - 184) / 46, (z - 74) / 38)))
    wash = math.exp(-((z - 128) / 9.0) ** 2) * smooth(36, 60, x) * (1 - smooth(190, 220, x))
    h -= wash * 1.1
    h += smooth(224, 256, z) * 7 + smooth(232, 256, x) * 6
    return site_pad(max(2.7, h), x, z, QUIPAIPAN_SITE, QUIPAIPAN_Y)


def cusco1536(x: float, z: float) -> float:
    """Cusco 1536: the basin, Sacsayhuamán on its ridge, the campiña terraces and the retreat valley."""
    h = 5.2 + 0.35 * noise(x, z, 0.9)
    basin = 1.0 - smooth(30.0, 92.0, math.hypot(x - 166.0, z - 174.0))
    h = h * (1.0 - basin) + 5.0 * basin
    # Campiña: low irrigated terraces between the Inca camp and the city.
    camp = math.exp(-((z - 118.0) / 28.0) ** 2) * smooth(58.0, 92.0, x) * (1.0 - smooth(150.0, 182.0, x))
    h += (0.55 * math.sin(x * 0.16) + 0.3 * math.sin(z * 0.21)) * camp
    # Sacsayhuamán: a ridge north of the plaza with a flattened fortress shoulder.
    ridge = 1.0 - smooth(0.55, 1.0, math.hypot((x - 158.0) / 36.0, (z - 141.0) / 17.0))
    shoulder = 1.0 - smooth(0.0, 0.42, math.hypot((x - 158.0) / 22.0, (z - 141.0) / 8.0))
    h = h * (1.0 - ridge) + (7.3 + 0.9 * math.sin(x * 0.12)) * ridge
    h = h * (1.0 - shoulder * 0.35) + 7.6 * shoulder * 0.35
    # Retreat corridor: the road south-west to Ollantaytambo stays low and open.
    retreat = math.exp(-((x - 77.0) / 22.0) ** 2) * smooth(150.0, 186.0, z)
    h = h * (1.0 - retreat) + 4.6 * retreat
    h += smooth(236.0, 256.0, x) * 9.0 + smooth(240.0, 256.0, z) * 7.0
    h += smooth(0.0, 22.0, 22.0 - z) * 6.0 + smooth(0.0, 20.0, 20.0 - x) * 5.0
    return site_pad(max(3.2, h), x, z, CUSCO1536_SITE, CUSCO1536_Y)


def lima1821(x: float, z: float) -> float:
    h = 4.8 + 0.3 * noise(x, z, 0.2)
    coast = smooth(26.0, 46.0, x)
    h = 0.7 + (h - 0.7) * coast
    sea = 1.0 - smooth(20.0, 30.0, x)
    h = h * (1.0 - sea) + 0.4 * sea

    enemy = 1.0 - smooth(0.3, 1.0, math.hypot((x - 52) / 34, (z - 120) / 30))
    h = h * (1.0 - enemy) + 6.6 * enemy

    h += smooth(206.0, 244.0, x) * (9.0 + 2.2 * math.sin(z * 0.1 + 0.7))
    h += smooth(34.0, 0.0, z) * (7.0 + 1.8 * math.sin(x * 0.11))
    h += smooth(238.0, 256.0, z) * (5.0 + 1.4 * math.sin(x * 0.1 + 0.4))
    h = carve_river(h, x, z, 120.0)
    return site_pad(max(0.3, h), x, z, LIMA_SITE, LIMA_Y)


def miraflores(x: float, z: float) -> float:
    h = 4.4 + 0.26 * noise(x, z, 3.4)
    coast = smooth(24.0, 44.0, x)
    h = 0.7 + (h - 0.7) * coast
    sea = 1.0 - smooth(18.0, 28.0, x)
    h = h * (1.0 - sea) + 0.4 * sea

    # The Miraflores line: a low ridge between the city and the Chilean approach from the south-east.
    line = math.exp(-(((z - 150.0) - 0.55 * (x - 90.0)) / 16.0) ** 2) * (1.0 - smooth(60, 96, x))
    h += 3.4 * line * (1.0 - smooth(0.0, 1.0, math.hypot((x - 90) / 34, (z - 150) / 26)))
    # Morro Solar: the coastal headland south of the city.
    h += 7.5 * (1.0 - smooth(0.0, 1.0, math.hypot((x - 24) / 22, (z - 208) / 30)))
    h += smooth(214.0, 252.0, x) * (6.0 + 1.8 * math.sin(z * 0.1 + 1.1))
    h += smooth(242.0, 256.0, z) * 4.0
    h = carve_river(h, x, z, 120.0)
    return site_pad(max(0.3, h), x, z, LIMA_SITE, LIMA_Y)


def callao(x: float, z: float) -> float:
    h = 3.5 + 0.28 * noise(x, z, 2.6)
    bay = 1.0 - smooth(26.0, 48.0, x + (z - 96) * 0.18)
    h = h * (1.0 - bay) + 0.4 * bay
    # San Lorenzo: the low island that shelters the bay (un-normalised metres, so it stays an islet).
    island = 1.0 - smooth(9.0, 14.0, math.hypot(x - 30, z - 122))
    h = h * (1.0 - island) + 2.9 * island
    # The Real Felipe terrace sits east of the bay, on the same pad elevation as the Arica fort.
    terrace = smooth(150.0, 170.0, x) * (1.0 - smooth(206.0, 222.0, x))
    terrace *= smooth(52.0, 72.0, z) * (1.0 - smooth(150.0, 170.0, z))
    h = h * (1.0 - terrace) + 4.0 * terrace
    h += smooth(226.0, 256.0, x) * 7.5
    h += smooth(238.0, 256.0, z) * 4.5
    return site_pad(max(0.4, h), x, z, ARICA_SITE, CALLAO_Y)


def tarapaca(x: float, z: float) -> float:
    h = 6.6 + 0.35 * noise(x, z, 1.3)
    # Quebrada de Tarapacá: a deep, dry incision with a stepped north bank, not a river.
    canyon = math.exp(-((z - 132) / 13.0) ** 2) * smooth(26, 52, x) * (1 - smooth(198, 228, x))
    h = h * (1 - canyon) + 3.0 * canyon
    step = math.exp(-((z - 112) / 8.0) ** 2) * smooth(40, 70, x) * (1 - smooth(180, 214, x))
    h += 1.4 * step
    oasis = 1 - smooth(10, 26, math.hypot(x - 92, z - 140))
    h = h * (1 - oasis) + 4.4 * oasis
    h += smooth(226, 256, z) * 9 + smooth(226, 256, x) * 8
    return site_pad(max(2.9, h), x, z, ARICA_SITE, TARAPACA_Y)


def vilcabamba(x: float, z: float) -> float:
    """Cloud-forest valley: broad, long-wavelength walls so every cell stays reachable (slope < 0.5)."""
    h = 5.2 + 0.25 * noise(x, z, 2.1)
    h += 9.0 * (0.5 + 0.5 * math.sin(x * 0.030 + 1.1)) * smooth(120, 200, x)
    h += 4.0 * (0.5 + 0.5 * math.sin(z * 0.028 + 0.3))
    river = math.exp(-((x - 132) / 11.0) ** 2)
    h = h * (1 - river) + 1.0 * river
    bank = math.exp(-((x - 132) / 26.0) ** 2)
    h = h * (1 - bank) + 2.7 * bank
    h += smooth(236, 256, z) * 6 + smooth(236, 256, x) * 5
    return site_pad(max(0.9, h), x, z, CHANCA_SITE, VILCABAMBA_Y)


def mantaro(x: float, z: float) -> float:
    h = 4.0 + 0.35 * noise(x, z, 0.7)
    valley = math.exp(-((x - 128) / 50.0) ** 2)
    h = h * (1 - valley) + 3.0 * valley
    # The Mantaro bed is a dry, seasonal gravel wash: the base field has no river metadata or fords,
    # so it must stay above the waterline or it would cut the map in two at bake time.
    river = math.exp(-((x - 128) / 7.0) ** 2)
    h = h * (1 - river) + 2.9 * river
    terraces = math.sin(x * 0.16) * 1.1
    h += terraces * smooth(60, 100, x) * (1 - smooth(156, 196, x))
    h += smooth(0, 28, 28 - x) * 9 + smooth(228, 256, x) * 10
    h += smooth(232, 256, z) * 8 + smooth(0, 24, 24 - z) * 7
    return site_pad(max(2.9, h), x, z, INDEPENDENCE_SITE, BRENA_Y)


@dataclass(frozen=True)
class Field:
    name: str
    size: int
    fn: Height
    paint: Paint
    base_module: str
    imports: tuple[str, ...]
    river: str | None = None


FIELDS = (
    Field('quipaipan', 257, quipaipan, paint_highland, 'heightmapCodec', ()),
    Field('cusco1536', 129, cusco1536, paint_cusco1536, 'heightmapCodec', ()),
    Field(
        'lima1821',
        129,
        lima1821,
        lambda h, x, z: paint_coastal_city(h, x, z, LIMA_SITE),
        'limaHeightmap',
        ('LIMA_RIVER_HALF_WIDTH', 'LIMA_RIVER_PATH'),
        river='LIMA',
    ),
    Field(
        'miraflores',
        129,
        miraflores,
        lambda h, x, z: paint_coastal_city(h, x, z, LIMA_SITE),
        'limaHeightmap',
        ('LIMA_RIVER_HALF_WIDTH', 'LIMA_RIVER_PATH'),
        river='LIMA',
    ),
    Field(
        'callao',
        129,
        callao,
        lambda h, x, z: paint_coastal_city(h, x, z, ARICA_SITE, False, 0.12),
        'heightmapCodec',
        (),
    ),
    Field('tarapaca', 257, tarapaca, paint_quebrada, 'heightmapCodec', ()),
    Field('vilcabamba', 257, vilcabamba, paint_cloud_forest, 'heightmapCodec', ()),
    Field('mantaro', 257, mantaro, paint_sierra, 'heightmapCodec', ()),
)


def quantize_palette(cells: list[tuple[int, int, int, int]]) -> tuple[list[tuple[int, int, int, int]], list[int]]:
    """Pick the 16 most frequent 4-bit colours and map every cell to the nearest one.

    The grid is 128 x 128 x 4 bytes (64 KB), which the `dist` budget cannot pay per mission. A 4-bit
    palette index per cell keeps the 2 m painted-ground resolution the model-mission pattern requires.
    Bucketing the normalized cells (16 levels per channel) keeps pure colours pure and low mixtures
    alive, and the palette is taken from the data so every entry is a colour the field actually uses.
    """
    histogram: dict[tuple[int, int, int, int], int] = {}
    for cell in cells:
        key = tuple(min(255, round(channel / 17) * 17) for channel in cell)
        histogram[key] = histogram.get(key, 0) + 1  # type: ignore[index]
    palette: list[tuple[int, int, int, int]] = []
    for key, _ in sorted(histogram.items(), key=lambda item: -item[1]):
        total = max(1, sum(key))
        entry = tuple(round(channel * 255 / total) for channel in key)  # normalized weights
        if entry not in palette:
            palette.append(entry)  # type: ignore[arg-type]
        if len(palette) == PALETTE_SIZE:
            break
    indices: list[int] = []
    for cell in cells:
        best = 0
        best_distance = 1 << 30
        for i, entry in enumerate(palette):
            distance = sum((cell[c] - entry[c]) ** 2 for c in range(4))
            if distance < best_distance:
                best_distance = distance
                best = i
        indices.append(best)
    return palette, indices


def pack_indices(indices: list[int]) -> str:
    raw = bytearray()
    for i in range(0, len(indices), 2):
        raw.append((indices[i] & 0x0F) | ((indices[i + 1] if i + 1 < len(indices) else 0) & 0x0F) << 4)
    return base64.b64encode(raw).decode('ascii')


def encode_ground(field: Field) -> tuple[str, list[tuple[int, int, int, int]]]:
    cells: list[tuple[int, int, int, int]] = []
    for gz in range(GROUND_SIZE):
        z = (gz + 0.5) * WORLD / GROUND_SIZE
        for gx in range(GROUND_SIZE):
            x = (gx + 0.5) * WORLD / GROUND_SIZE
            cells.append(tuple(max(0, min(255, round(w * 255))) for w in field.paint(field.fn, x, z)))  # type: ignore[arg-type]
    palette, indices = quantize_palette(cells)
    return pack_indices(indices), palette


def write(field: Field) -> None:
    key = field.name.upper()
    size = field.size
    values = []
    for z in range(size):
        for x in range(size):
            wx = x / (size - 1) * WORLD
            wz = z / (size - 1) * WORLD
            values.append(max(300, round(field.fn(wx, wz) * 1000)))

    raw = bytearray()
    for value in values:
        raw.extend(int(value).to_bytes(2, 'little'))
    b64 = base64.b64encode(raw).decode('ascii')
    ground_b64, palette = encode_ground(field)
    palette_ts = ', '.join('[' + ', '.join(str(c) for c in entry) + ']' for entry in palette)

    imports = ''.join(f'  {name},\n' for name in field.imports)
    base_import = f"import {{\n{imports}}} from './{field.base_module}';\n" if field.imports else ''
    river = (
        f"  river: {{ path: {field.river}_RIVER_PATH, halfWidth: {field.river}_RIVER_HALF_WIDTH }},\n"
        if field.river
        else ''
    )
    text = (
        '// Generated by scripts/build_geographic_heightmaps.py. Do not edit by hand.\n'
        f'{base_import}'
        "import { decodePalettizedGround, type GroundPaletteEntry } from './groundCodec';\n"
        "import type { AuthoredHeightField } from './authoredTerrain';\n"
        '\n'
        f'export const {key}_HEIGHTMAP_SIZE = {size};\n'
        f'export const {key}_HEIGHTMAP_WORLD_SIZE = {WORLD:g};\n'
        f'export const {key}_HEIGHTMAP_SCALE = 0.001;\n'
        'const B64 =\n'
        f"  '{b64}';\n"
        'function decode(): Float32Array {\n'
        '  const bin = atob(B64);\n'
        f'  const out = new Float32Array({len(values)});\n'
        '  for (let i = 0; i < out.length; i++) {\n'
        f'    out[i] = (bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8)) * {key}_HEIGHTMAP_SCALE;\n'
        '  }\n'
        '  return out;\n'
        '}\n'
        f'export const {key}_HEIGHTMAP = decode();\n'
        f'export const {key}_GROUND_SIZE = {GROUND_SIZE};\n'
        f'const {key}_GROUND_B64 =\n'
        f"  '{ground_b64}';\n"
        f'const {key}_GROUND_PALETTE: readonly GroundPaletteEntry[] = [{palette_ts}];\n'
        f'export const {key}_GROUND = decodePalettizedGround({key}_GROUND_B64, {key}_GROUND_PALETTE, {key}_GROUND_SIZE);\n'
        '/** Mission heightfield: this mission\'s relief and the paint derived from it. */\n'
        f'export const {key}_HEIGHTFIELD: AuthoredHeightField = {{\n'
        f'  size: {key}_HEIGHTMAP_SIZE,\n'
        f'  worldSize: {key}_HEIGHTMAP_WORLD_SIZE,\n'
        f'  heights: {key}_HEIGHTMAP,\n'
        f'  ground: {{ size: {key}_GROUND_SIZE, weights: {key}_GROUND }},\n'
        f'{river}'
        '};\n'
    )
    path = OUT / f'{field.name}Heightmap.ts'
    path.write_text(text)
    reencode_file(path)
    print(f'wrote {field.name} ({size}x{size}, {len(b64)} height chars, {len(ground_b64)} ground chars)')


if __name__ == '__main__':
    for item in FIELDS:
        write(item)
    # The generated TS must satisfy `yarn format:check` on its own, like the game's other generators.
    subprocess.run(
        [
            str(ROOT / 'node_modules' / '.bin' / 'prettier'),
            '--write',
            *[str(OUT / f'{item.name}Heightmap.ts') for item in FIELDS],
        ],
        check=True,
        stdout=subprocess.DEVNULL,
    )
