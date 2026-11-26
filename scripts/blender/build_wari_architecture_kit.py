"""Build the highland architecture kit: the Wari complex and the Chanca pucará.

One script, nine pieces and two LODs, following the Caral method (art-direction §4.2): modelled volumes,
box-projected UVs, a per-vertex tint and shared PBR detail sets at runtime. Run with

    blender --background --python scripts/blender/build_wari_architecture_kit.py -- --only=d_temple

The pieces are placed by `src/model/defs/wariChancaCity.ts`, which also derives the site blockers from the
same layout. Sources: `docs/historia/arquitectura.md`, `docs/design/wari-sacred-site.md`,
`docs/design/chanca-site.md` and the two campaign dossiers.
"""

from __future__ import annotations

import math
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import arch_kit as ak  # noqa: E402  (needs the script directory on sys.path)

KIT = 'wari'
EXPORT_DIR = os.path.join(ROOT, 'art-src', 'blender', 'exports', 'wari', 'architecture')
GAME_DIR = os.path.join(ROOT, 'src', 'assets', 'architecture', 'wari')
SOURCE_BLEND = os.path.join(ROOT, 'art-src', 'blender', 'scenes', 'wari_architecture_kit.blend')

# Eight materials: the field and cut stone of the highlands, lime plaster white and red for the Wari
# facades, packed earth, thatch, timber and the dark openings.
MATERIALS = {
    'stone': ('MAT-Arch_WariStone', ak.hex_rgb('#8f8577'), 0.95),
    'cutstone': ('MAT-Arch_WariCutstone', ak.hex_rgb('#a89c8a'), 0.92),
    'plaster_white': ('MAT-Arch_WariPlasterWhite', ak.hex_rgb('#cfc4ae'), 0.92),
    'plaster_red': ('MAT-Arch_WariPlasterRed', ak.hex_rgb('#8f3226'), 0.92),
    'earth': ('MAT-Arch_WariEarth', ak.hex_rgb('#8a6f4e'), 0.98),
    'thatch': ('MAT-Arch_WariThatch', ak.hex_rgb('#b08f52'), 1.0),
    'wood': ('MAT-Arch_WariWood', ak.hex_rgb('#6b4a33'), 0.9),
    'dark': ('MAT-Arch_WariDark', ak.hex_rgb('#241b15'), 1.0),
}

TILE = {
    'MAT-Arch_WariStone': 2.4,
    'MAT-Arch_WariCutstone': 1.8,
    'MAT-Arch_WariPlasterWhite': 2.4,
    'MAT-Arch_WariPlasterRed': 2.0,
    'MAT-Arch_WariEarth': 4.0,
    'MAT-Arch_WariThatch': 2.2,
    'MAT-Arch_WariWood': 1.2,
    'MAT-Arch_WariDark': 1.5,
}

CONFIDENCE = {
    'd_temple': 'inferred',
    'plaza': 'documented',
    'gallery': 'documented',
    'room': 'documented',
    'pukara_wall': 'documented',
    'tower': 'inferred',
    'mural': 'documented',
    'terrace': 'documented',
    'altar': 'inferred',
}

BUDGET = {'d_temple': ak.MONUMENT_BUDGET}


def d_temple(mats, lod):
    """The D-shaped temple: a plastered platform on the D plan, its red band and the stone facade with its
    three niches. A representative massing, not a survey."""
    kit = ak.Kit(mats, MATERIALS, lod, 201)
    radius = 9.0
    plan = [(math.cos(math.pi * i / 18) * radius, math.sin(math.pi * i / 18) * radius) for i in range(19)]
    plan += [(-radius, 0.0)]
    kit.prism(plan, 0.0, 2.0, 'plaster_white')
    kit.prism(plan, 2.0, 3.0, 'plaster_red')
    inner = [(x * 0.88, y * 0.88) for x, y in plan]
    kit.prism(inner, 3.0, 4.6, 'plaster_white')
    # The straight facade closes the D on the south, with the three niches and the entrance.
    kit.box(0.0, -radius + 0.15, 0.0, radius * 2, 0.9, 4.6, 'stone')
    for x in (-4.0, 0.0, 4.0):
        kit.box(x, -radius - 0.25, 1.1, 1.4, 0.35, 2.0, 'dark')
    # Altar on the summit.
    kit.box(0.0, 1.4, 4.6, 4.0, 2.6, 1.2, 'stone')
    kit.box(0.0, 1.4, 5.8, 2.6, 1.6, 0.9, 'plaster_red')
    return kit


def plaza(mats, lod):
    """The walled plaza floor: packed earth inside a cut-stone kerb; walkable, no footprint."""
    kit = ak.Kit(mats, MATERIALS, lod, 211)
    w, d = 26.0, 18.0
    kit.box(0.0, 0.0, 0.0, w, d, 0.12, 'earth')
    for sx, sy, lx, ly in ((0, -1, w, 0.5), (0, 1, w, 0.5), (-1, 0, 0.5, d), (1, 0, 0.5, d)):
        kit.box(sx * (w / 2 - 0.25), sy * (d / 2 - 0.25), 0.12, lx, ly, 0.24, 'cutstone')
    return kit


def gallery(mats, lod):
    """A Wari gallery: a long stone range with three niches and a flat stone roof ringed by a parapet."""
    kit = ak.Kit(mats, MATERIALS, lod, 221)
    w, d, height = 14.0, 5.0, 3.0
    ak.wall(kit, w, d, height, 0.7, front=[(3.5, 1.3, 2.1, 0.0), (7.0, 1.3, 2.1, 0.0), (10.5, 1.3, 2.1, 0.0)],
            wall_key='stone', hole_key='dark')
    ak.flat_roof(kit, w, d, height, 'earth', 'stone', height=0.45, thick=0.3)
    return kit


def room(mats, lod):
    """A highland house: stone footings, plastered walls and a deep-eave thatch roof."""
    kit = ak.Kit(mats, MATERIALS, lod, 231)
    w, d, height, thick = 6.0, 4.0, 2.6, 0.5
    ak.wall(kit, w, d, height, thick, front=[(3.0, 1.2, 1.9, 0.0)], wall_key='plaster_white', hole_key='dark')
    kit.box(3.0, -d / 2 - 0.02, 1.95, 1.5, 0.14, 0.18, 'wood')
    ak.gable_roof(kit, w, d, height, 1.5, 'thatch', overhang=0.7, end_overhang=0.45, thick=0.3)
    return kit


def pukara_wall(mats, lod):
    """A Chanca pucará wall: a thick stone run with merlons and a battered foot; the layout leaves the gate."""
    kit = ak.Kit(mats, MATERIALS, lod, 241)
    length, height, thick = 10.0, 2.8, 1.7
    kit.slab((-length / 2, 0.0), (length / 2, 0.0), thick + 0.4,
             [(0, 0), (length, 0), (length - 0.25, height * 0.55), (0.25, height * 0.55), (0.12, height),
              (length - 0.12, height)], 'stone')
    kit.box(0.0, 0.0, height, length - 0.2, thick, 0.18, 'cutstone')
    if lod == 0:
        kit.merlons(length, height + 0.18, 5, 0.9, 0.8, thick + 0.1, 'stone')
    return kit


def tower(mats, lod):
    """A round pucará tower with a thatch cone: the highland fortress silhouette."""
    kit = ak.Kit(mats, MATERIALS, lod, 251)
    kit.cylinder(0.0, 0.0, 0.0, 5.4, 1.7, 'stone', 10)
    kit.cylinder(0.0, 0.0, 5.4, 5.7, 1.85, 'cutstone', 10)
    ak.pyramid(kit, 0.0, 0.0, 3.7, 3.7, 5.7, 1.9, 'thatch')
    if lod == 0:
        kit.box(0.0, -1.75, 2.4, 0.9, 0.14, 1.5, 'dark')
    return kit


def mural(mats, lod):
    """A Wari facade panel: the red and cream registers, painted on both faces."""
    kit = ak.Kit(mats, MATERIALS, lod, 261)
    length, height, thick = 10.0, 2.4, 0.5
    kit.box(0.0, 0.0, 0.0, length, thick, height, 'plaster_white')
    for side in (-1, 1):
        kit.box(0.0, side * (thick / 2 + 0.04), 0.35, length - 0.6, 0.1, 0.6, 'plaster_red')
        kit.box(0.0, side * (thick / 2 + 0.04), 1.55, length - 0.6, 0.1, 0.4, 'plaster_red')
    kit.box(0.0, 0.0, height, length + 0.2, thick + 0.2, 0.18, 'cutstone')
    return kit


def terrace(mats, lod):
    """An andén: a stone-faced terrace carrying packed earth; the front face looks down the slope."""
    kit = ak.Kit(mats, MATERIALS, lod, 271)
    w, d, height = 12.0, 6.0, 1.2
    kit.box(0.0, 0.0, 0.0, w, d, height - 0.25, 'stone')
    kit.box(0.0, 0.0, height - 0.25, w + 0.3, d + 0.3, 0.25, 'earth')
    for i in range(4):
        kit.box(-w / 2 + w * (i + 0.5) / 4, -d / 2 - 0.02, 0.0, 0.8, 0.1, 0.6, 'cutstone')
    return kit


def altar(mats, lod):
    """A stepped stone altar at the plaza or the temple summit."""
    kit = ak.Kit(mats, MATERIALS, lod, 281)
    kit.box(0.0, 0.0, 0.0, 3.2, 2.4, 0.6, 'stone')
    kit.box(0.0, 0.0, 0.6, 2.2, 1.6, 0.5, 'cutstone')
    kit.box(0.0, 0.0, 1.1, 1.2, 0.9, 0.45, 'plaster_red')
    return kit


ASSETS = {
    'd_temple': d_temple,
    'plaza': plaza,
    'gallery': gallery,
    'room': room,
    'pukara_wall': pukara_wall,
    'tower': tower,
    'mural': mural,
    'terrace': terrace,
    'altar': altar,
}


def main():
    ak.run_kit(
        kit=KIT,
        materials=MATERIALS,
        tile=TILE,
        assets=ASSETS,
        budgets=BUDGET,
        confidence=CONFIDENCE,
        sources=[
            'docs/design/wari-chanca-sites.md',
            'docs/historia/arquitectura.md',
            'docs/design/wari-sacred-site.md',
            'docs/design/chanca-site.md',
            'docs/historia/campanas/wari.md',
            'docs/historia/campanas/yahuar_pampa.md',
        ],
        collision='wariCityBlockers / chancaCityBlockers in src/model/defs/wariChancaCity.ts',
        export_dir=EXPORT_DIR,
        game_dir=GAME_DIR,
        source_blend=SOURCE_BLEND,
        tint_sets={'flat': ('earth',), 'earth': ('earth',), 'dark': ('dark', 'wood')},
    )


if __name__ == '__main__':
    main()
