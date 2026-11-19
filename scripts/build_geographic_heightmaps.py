#!/usr/bin/env python3
"""Generate the Phase 1 mission-scoped heightfields.

These fields are applied through `MissionSite.heightField` on top of an existing authored site:
the site model, anchors, collision and painted ground stay shared, the terrain geometry changes
per mission. Every field flattens a pad at the authored site anchor to the elevation the base
field used there, so the landmark keeps its grounding.

Each field inherits the base field's painted ground (and Lima's Rímac river metadata), so splatting
and the `treeless` mask of the authored site keep working. The relief is not yet painted per mission:
the inherited splat was authored for the base shape, which is the Phase 2 paint work
(docs/plan/geographic-identity-roadmap.md).

Run `python3 scripts/build_geographic_heightmaps.py`; the script formats its output.
"""

from __future__ import annotations

import base64
import math
import subprocess
from dataclasses import dataclass
from pathlib import Path

from reencode_heightmaps import reencode_file

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/model/defs'

WORLD = 256.0


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
    """Flatten a disc at the authored site anchor to the elevation the base field used.

    The full-flat radius clears the largest site model footprint (half-diagonal ~11 m) with margin;
    the keepout rectangles are construction exclusions, not the pad.
    """
    m = 1.0 - smooth(15.0, 26.0, math.hypot(x - site[0], z - site[1]))
    return h * (1.0 - m) + elevation * m


# Site anchors and elevations, mirrored from AUTHORED_SITES (src/model/defs/sites.ts) and the
# elevation their base heightfield flattens to. `tests/geographic-heightfields.test.ts` pins the
# pad against the real anchor, so a drift in either place fails CI.
QUIPAIPAN_SITE = (166.4, 174.1333)  # cuscoIncaPoint(124.8, 130.6)
QUIPAIPAN_Y = 5.0
LIMA_SITE = (90.0, 150.0)  # LIMA_SITE_ORIGIN
LIMA_Y = 5.6
ARICA_SITE = (179.7333, 97.3333)  # aricaPoint(134.8, 73)
CALLAO_Y = 4.0  # the arica pad elevation (the Callao mission keeps the same model offset)
TARAPACA_Y = 4.0
CHANCA_SITE = (179.84, 97.28)  # chancaPoint(112.4, 60.8)
VILCABAMBA_Y = 5.0
INDEPENDENCE_SITE = (179.7333, 94.6667)  # independencePoint(134.8, 71)
BRENA_Y = 5.0


def quipaipan(x: float, z: float) -> float:
    h = 5.0 + 0.22 * noise(x, z)
    h += 2.4 * (1.0 - smooth(0.0, 1.0, math.hypot((x - 78) / 40, (z - 178) / 34)))
    h += 1.8 * (1.0 - smooth(0.0, 1.0, math.hypot((x - 184) / 46, (z - 74) / 38)))
    wash = math.exp(-((z - 128) / 9.0) ** 2) * smooth(36, 60, x) * (1 - smooth(190, 220, x))
    h -= wash * 1.1
    h += smooth(224, 256, z) * 7 + smooth(232, 256, x) * 6
    return site_pad(max(2.7, h), x, z, QUIPAIPAN_SITE, QUIPAIPAN_Y)


def tarapaca(x: float, z: float) -> float:
    h = 5.6 + 0.35 * noise(x, z, 1.3)
    # Quebrada de Tarapacá: a deep, dry incision with a stepped north bank, not a river.
    canyon = math.exp(-((z - 132) / 15.0) ** 2) * smooth(26, 52, x) * (1 - smooth(198, 228, x))
    h = h * (1 - canyon) + 3.0 * canyon
    step = math.exp(-((z - 112) / 8.0) ** 2) * smooth(40, 70, x) * (1 - smooth(180, 214, x))
    h += 0.9 * step
    oasis = 1 - smooth(10, 26, math.hypot(x - 92, z - 140))
    h = h * (1 - oasis) + 4.4 * oasis
    h += smooth(226, 256, z) * 9 + smooth(226, 256, x) * 8
    return site_pad(max(2.9, h), x, z, ARICA_SITE, TARAPACA_Y)


def vilcabamba(x: float, z: float) -> float:
    h = 5.2 + 0.5 * noise(x, z, 2.1)
    h += 7.0 * (0.5 + 0.5 * math.sin(x * 0.045 + 1.1)) * smooth(30, 70, x)
    h += 5.0 * (0.5 + 0.5 * math.sin(z * 0.05 + 0.3))
    river = math.exp(-((x - 132) / 13.0) ** 2)
    h = h * (1 - river) + 1.0 * river
    bank = math.exp(-((x - 132) / 34.0) ** 2)
    h = h * (1 - bank) + 2.8 * bank
    h += smooth(232, 256, z) * 10 + smooth(232, 256, x) * 9
    return site_pad(max(0.9, h), x, z, CHANCA_SITE, VILCABAMBA_Y)


def mantaro(x: float, z: float) -> float:
    h = 4.0 + 0.35 * noise(x, z, 0.7)
    valley = math.exp(-((x - 128) / 34.0) ** 2)
    h = h * (1 - valley) + 3.0 * valley
    # The Mantaro bed is a dry, seasonal gravel wash: the base field has no river metadata or fords,
    # so it must stay above the waterline or it would cut the map in two at bake time.
    river = math.exp(-((x - 128) / 7.0) ** 2)
    h = h * (1 - river) + 2.9 * river
    terraces = math.sin(x * 0.11) * 0.8
    h += terraces * smooth(60, 100, x) * (1 - smooth(156, 196, x))
    h += smooth(0, 28, 28 - x) * 9 + smooth(228, 256, x) * 10
    h += smooth(232, 256, z) * 8 + smooth(0, 24, 24 - z) * 7
    return site_pad(max(2.9, h), x, z, INDEPENDENCE_SITE, BRENA_Y)


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


@dataclass(frozen=True)
class Field:
    name: str
    size: int
    fn: object
    base_module: str
    imports: tuple[str, ...]
    ground: str
    river: str | None = None


FIELDS = (
    Field('quipaipan', 257, quipaipan, 'cuscoHeightmap', ('CUSCO_GROUND', 'CUSCO_GROUND_SIZE'), 'CUSCO'),
    Field(
        'lima1821',
        129,
        lima1821,
        'limaHeightmap',
        (
            'LIMA_GROUND',
            'LIMA_GROUND_SIZE',
            'LIMA_RIVER_HALF_WIDTH',
            'LIMA_RIVER_PATH',
        ),
        'LIMA',
        river='LIMA',
    ),
    Field(
        'miraflores',
        129,
        miraflores,
        'limaHeightmap',
        (
            'LIMA_GROUND',
            'LIMA_GROUND_SIZE',
            'LIMA_RIVER_HALF_WIDTH',
            'LIMA_RIVER_PATH',
        ),
        'LIMA',
        river='LIMA',
    ),
    Field('callao', 129, callao, 'aricaHeightmap', ('ARICA_GROUND', 'ARICA_GROUND_SIZE'), 'ARICA'),
    Field('tarapaca', 257, tarapaca, 'aricaHeightmap', ('ARICA_GROUND', 'ARICA_GROUND_SIZE'), 'ARICA'),
    Field('vilcabamba', 257, vilcabamba, 'chancaHeightmap', ('CHANCA_GROUND', 'CHANCA_GROUND_SIZE'), 'CHANCA'),
    Field(
        'mantaro',
        257,
        mantaro,
        'independenceHeightmap',
        ('INDEPENDENCE_GROUND', 'INDEPENDENCE_GROUND_SIZE'),
        'INDEPENDENCE',
    ),
)


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

    imports = ''.join(f'  {name},\n' for name in field.imports)
    river = (
        f"  river: {{ path: {field.river}_RIVER_PATH, halfWidth: {field.river}_RIVER_HALF_WIDTH }},\n"
        if field.river
        else ''
    )
    text = (
        '// Generated by scripts/build_geographic_heightmaps.py. Do not edit by hand.\n'
        f"import {{\n{imports}}} from './{field.base_module}';\n"
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
        '/** Mission heightfield: the base site paint and river, with this mission\'s relief. */\n'
        f'export const {key}_HEIGHTFIELD: AuthoredHeightField = {{\n'
        f'  size: {key}_HEIGHTMAP_SIZE,\n'
        f'  worldSize: {key}_HEIGHTMAP_WORLD_SIZE,\n'
        f'  heights: {key}_HEIGHTMAP,\n'
        f'  ground: {{ size: {field.ground}_GROUND_SIZE, weights: {field.ground}_GROUND }},\n'
        f'{river}'
        '};\n'
    )
    path = OUT / f'{field.name}Heightmap.ts'
    path.write_text(text)
    reencode_file(path)
    print(f'wrote {field.name} ({size}x{size}, {len(b64)} base64 chars)')


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
