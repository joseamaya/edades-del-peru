"""Build the Killke/ayllu architecture kit: the domestic language of Tambotoco and Inticancha.

One script, five pieces and two LODs, following the Caral method (art-direction §4.2): modelled volumes,
box-projected UVs, a per-vertex tint and shared PBR detail sets at runtime. Run with

    blender --background --python scripts/blender/build_killke_architecture_kit.py -- --only=house

The pieces are placed by `src/model/defs/tambotocoCity.ts`, which derives every hut, qollqa and ramada
from the authored positions in `tambotocoLayout.ts` and yields the site blockers from the same layout.
Sources: `docs/historia/arquitectura.md` §1, `docs/design/tambotoco-model-mission.md` and
`docs/historia/campanas/tambotoco.md`.
"""

from __future__ import annotations

import math
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import arch_kit as ak  # noqa: E402  (needs the script directory on sys.path)

KIT = 'killke'
EXPORT_DIR = os.path.join(ROOT, 'art-src', 'blender', 'exports', 'killke', 'architecture')
GAME_DIR = os.path.join(ROOT, 'src', 'assets', 'architecture', 'killke')
SOURCE_BLEND = os.path.join(ROOT, 'art-src', 'blender', 'scenes', 'killke_architecture_kit.blend')

# Seven materials: warm fieldstone and its cut threshold stones, the earth or plaster wall, the packed
# earth, straw thatch, the exposed ridge poles and the dark door/vent recesses.
MATERIALS = {
    'stone': ('MAT-Arch_KillkeStone', ak.hex_rgb('#8a8174'), 0.95),
    'cutstone': ('MAT-Arch_KillkeCutstone', ak.hex_rgb('#9b9284'), 0.92),
    'plaster': ('MAT-Arch_KillkePlaster', ak.hex_rgb('#b49a78'), 0.94),
    'earth': ('MAT-Arch_KillkeEarth', ak.hex_rgb('#8a7358'), 0.98),
    'thatch': ('MAT-Arch_KillkeThatch', ak.hex_rgb('#b49b6a'), 1.0),
    'wood': ('MAT-Arch_KillkeWood', ak.hex_rgb('#6a5238'), 0.9),
    'dark': ('MAT-Arch_KillkeDark', ak.hex_rgb('#2a211a'), 1.0),
}

TILE = {
    'MAT-Arch_KillkeStone': 2.4,
    'MAT-Arch_KillkeCutstone': 1.8,
    'MAT-Arch_KillkePlaster': 2.4,
    'MAT-Arch_KillkeEarth': 4.0,
    'MAT-Arch_KillkeThatch': 2.2,
    'MAT-Arch_KillkeWood': 1.2,
    'MAT-Arch_KillkeDark': 1.5,
}

CONFIDENCE = {
    'house': 'plausible',
    'house_earth': 'plausible',
    'qollqa': 'plausible',
    'ramada': 'inferred',
    'shrine': 'stylized',
}

# The plinth reaches 4.2 m below the model datum; each piece is seated at the ground under its centre,
# so a hillside hut cuts into the slope and shows a coursed foundation downhill instead of floating.
PLINTH = -4.2


def gable_ends(kit, w, d, eave, rise, key, width=0.22):
    """Fill the two triangular gable ends with stepped thatch, so the roof reads solid from the sides."""
    steps = 3 if kit.lod == 0 else 2
    for sx in (-1, 1):
        for i in range(steps):
            z0 = eave + rise * i / steps
            z1 = eave + rise * (i + 1) / steps
            span = (d + 0.5) * (1.0 - (i + 0.5) / steps)
            kit.box(sx * (w / 2 - 0.06), 0.0, z0, width, span, z1 - z0, key)


def cone(kit, cx, cy, z, radius, height, key, sides=10, top=0.12):
    """A tapered round roof (a qollqa's straw cap), with a small flat top so it does not end in a needle."""

    def build():
        ring = [
            kit.bm.verts.new((cx + radius * math.cos(2 * math.pi * i / sides),
                              cy + radius * math.sin(2 * math.pi * i / sides), z))
            for i in range(sides)
        ]
        cap = [
            kit.bm.verts.new((cx + top * math.cos(2 * math.pi * i / sides),
                              cy + top * math.sin(2 * math.pi * i / sides), z + height))
            for i in range(sides)
        ]
        for i in range(sides):
            j = (i + 1) % sides
            f = kit.bm.faces.new((ring[i], ring[j], cap[j], cap[i]))
            f.material_index = kit.mat(key)
        f = kit.bm.faces.new(cap)
        f.material_index = kit.mat(key)

    kit.shell(build)


def house(mats, lod):
    """A Killke dwelling: fieldstone footing, a battered plaster wall, a deep-eave thatch roof with
    exposed ridge poles, a lintelled door and a vent. 6.4 x 4.4 m, front -Y."""
    kit = ak.Kit(mats, MATERIALS, lod, 301)
    w, d, height, thick = 6.4, 4.4, 2.55, 0.45
    # Buried footing: wider at the bottom, so the downhill face reads as coursed stonework.
    kit.frustum(0.0, 0.0, w + 0.4, d + 0.4, PLINTH, 4.65, 0.12, 'stone')
    kit.box(0.0, 0.0, 0.45, w + 0.16, d + 0.16, 0.22, 'stone')
    ak.wall(kit, w, d, height, thick, front=[(w / 2, 1.05, 1.95, 0.0)], wall_key='plaster', hole_key='dark')
    # The exposed foot of the wall: a dark course and four corner stones.
    kit.box(0.0, 0.0, 0.62, w + 0.06, d + 0.06, 0.28, 'dark')
    if lod == 0:
        for sx, sz in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            kit.box(sx * w / 2, sz * d / 2, 0.45, 0.42, 0.6, 0.42, 'stone')
        kit.box(0.0, -d / 2 - 0.02, 1.98, 1.5, 0.14, 0.18, 'dark')
        # Threshold stone in front of the door and a vent on the eastern wall.
        kit.box(0.0, -d / 2 - 0.16, 0.45, 1.5, 0.55, 0.16, 'stone')
        kit.box(w / 2 + 0.02, 0.6, 1.72, 0.12, 0.3, 0.3, 'dark')
        kit.box(w / 2 + 0.03, 0.6, 1.68, 0.1, 0.42, 0.1, 'stone')
    # The eave band, then the roof.
    kit.box(0.0, 0.0, height - 0.06, w + 0.18, d + 0.18, 0.14, 'stone')
    ak.gable_roof(kit, w, d, height + 0.06, 1.65, 'thatch', overhang=0.55, end_overhang=0.4,
                  thick=0.32, ridge_key='dark')
    gable_ends(kit, w, d, height + 0.06, 1.65, 'thatch')
    if lod == 0:
        # Two poles running from the ridge to the eave: the exposed roof structure.
        for sx in (-2.1, 2.1):
            kit.box(sx, 0.0, height + 0.04, 0.12, d + 1.2, 0.12, 'dark')
        kit.box(0.0, 0.0, height + 1.55, w + 0.9, 0.16, 0.14, 'dark')
    return kit


def house_earth(mats, lod):
    """The same dwelling with packed-earth walls, so the hamlets do not read as one repeated model."""
    kit = ak.Kit(mats, MATERIALS, lod, 311)
    w, d, height, thick = 6.4, 4.4, 2.55, 0.5
    kit.frustum(0.0, 0.0, w + 0.4, d + 0.4, PLINTH, 4.65, 0.12, 'stone')
    kit.box(0.0, 0.0, 0.45, w + 0.16, d + 0.16, 0.22, 'stone')
    ak.wall(kit, w, d, height, thick, front=[(w / 2, 1.0, 1.9, 0.0)], wall_key='earth', hole_key='dark')
    kit.box(0.0, 0.0, 0.6, w + 0.06, d + 0.06, 0.26, 'dark')
    if lod == 0:
        for sx, sz in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            kit.box(sx * w / 2, sz * d / 2, 0.45, 0.4, 0.56, 0.4, 'stone')
        kit.box(0.0, -d / 2 - 0.02, 1.93, 1.4, 0.14, 0.18, 'dark')
        kit.box(0.0, -d / 2 - 0.16, 0.45, 1.4, 0.5, 0.16, 'stone')
    kit.box(0.0, 0.0, height - 0.06, w + 0.18, d + 0.18, 0.14, 'stone')
    ak.gable_roof(kit, w, d, height + 0.06, 1.6, 'thatch', overhang=0.52, end_overhang=0.38,
                  thick=0.3, ridge_key='dark')
    gable_ends(kit, w, d, height + 0.06, 1.6, 'thatch')
    return kit


def qollqa(mats, lod):
    """A round Killke storehouse: a stone barrel, a corbel ring, a raised threshold and a thatch cone."""
    kit = ak.Kit(mats, MATERIALS, lod, 321)
    sides = 10 if lod == 0 else 8
    radius, barrel = 1.6, 2.35
    kit.cylinder(0.0, 0.0, PLINTH, 0.35, radius + 0.3, 'stone', sides)
    kit.cylinder(0.0, 0.0, 0.35, 0.35 + barrel, radius, 'stone', sides)
    # Corbel ring and dark footing keep the granary silhouette at RTS distance.
    kit.cylinder(0.0, 0.0, 0.28, 0.55, radius + 0.06, 'dark', sides)
    kit.cylinder(0.0, 0.0, 0.32 + barrel, 0.55 + barrel, radius + 0.14, 'dark', sides)
    # Raised threshold and the dark door on the front face.
    kit.box(0.0, -radius - 0.12, 0.35, 0.95, 0.5, 0.18, 'stone')
    kit.box(0.0, -radius - 0.02, 0.5, 0.62, 0.16, 0.85, 'dark')
    kit.box(0.0, -radius - 0.03, 1.38, 0.92, 0.3, 0.16, 'dark')
    if lod == 0:
        kit.box(0.0, radius - 0.02, 1.95, 0.28, 0.12, 0.22, 'dark')
    roof_base = 0.35 + barrel + 0.16
    cone(kit, 0.0, 0.0, roof_base, radius + 0.45, 1.35, 'thatch', sides)
    kit.cylinder(0.0, 0.0, roof_base - 0.05, roof_base + 0.08, radius + 0.52, 'dark', sides)
    return kit


def ramada(mats, lod):
    """An open ramada: a low stone platform, four timber posts, a stone back and side and a brush roof."""
    kit = ak.Kit(mats, MATERIALS, lod, 331)
    w, d, post = 3.6, 2.8, 2.45
    kit.frustum(0.0, 0.0, w + 0.4, d + 0.4, PLINTH, 4.38, 0.1, 'stone')
    kit.box(0.0, 0.0, 0.18, w + 0.16, d + 0.16, 0.16, 'earth')
    for sx, sz in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        kit.box(sx * (w / 2 - 0.18), sz * (d / 2 - 0.18), 0.34, 0.18, 0.18, post, 'wood')
    # Stone back (+Z) and western side; the front stays open.
    kit.box(0.0, d / 2 - 0.05, 0.34, w, 0.28, 1.25, 'stone')
    kit.box(-w / 2 + 0.05, 0.0, 0.34, 0.28, d, 0.95, 'stone')
    kit.box(0.0, 0.0, 0.34 + post - 0.16, w + 0.1, 0.16, 0.16, 'wood')
    ak.gable_roof(kit, w, d, 0.34 + post, 0.85, 'thatch', overhang=0.34, end_overhang=0.2,
                  thick=0.24, ridge_key='wood')
    if lod == 0:
        kit.box(0.0, 0.0, 0.3, w * 0.7, 0.42, 0.14, 'earth')
    return kit


def shrine(mats, lod):
    """Huanacaure's stepped platform: three fieldstone tiers, cut-stone caps, a stair on the south and four
    corner stones around the summit where the huaca rises."""
    kit = ak.Kit(mats, MATERIALS, lod, 341)
    tiers = ((9.0, 7.5), (7.0, 5.5), (5.0, 4.0))
    height = 0.75
    kit.frustum(0.0, 0.0, 9.4, 7.9, -0.9, 0.9, 0.2, 'stone')
    for i, (tw, td) in enumerate(tiers):
        kit.box(0.0, 0.0, i * height, tw, td, height, 'stone')
        kit.box(0.0, 0.0, (i + 1) * height - 0.1, tw + 0.14, td + 0.14, 0.12, 'cutstone')
    top = len(tiers) * height
    ak.stairs(kit, 0.0, -tiers[0][1] / 2 - 1.7, -tiers[0][1] / 2, 2.4, top, 6 if lod == 0 else 3, 'cutstone')
    # The summit slab carries the huaca in both LODs and sets the base `tambotocoCity.ts` seats it on.
    kit.box(0.0, 0.0, top, 3.4, 2.6, 0.16, 'cutstone')
    if lod == 0:
        for sx, sz in ((-2.4, -1.8), (2.4, -1.8), (-2.4, 1.8), (2.4, 1.8)):
            kit.box(sx, sz, top, 0.7, 0.7, 0.72, 'stone')
            kit.box(sx, sz, top + 0.72, 0.8, 0.8, 0.1, 'cutstone')
    return kit


ASSETS = {
    'house': house,
    'house_earth': house_earth,
    'qollqa': qollqa,
    'ramada': ramada,
    'shrine': shrine,
}


def main():
    ak.run_kit(
        kit=KIT,
        materials=MATERIALS,
        tile=TILE,
        assets=ASSETS,
        budgets={},
        confidence=CONFIDENCE,
        sources=[
            'docs/historia/arquitectura.md',
            'docs/design/tambotoco-model-mission.md',
            'docs/design/art-direction.md',
            'docs/historia/campanas/tambotoco.md',
        ],
        collision='tambotocoBlockers in src/model/defs/tambotocoCity.ts',
        export_dir=EXPORT_DIR,
        game_dir=GAME_DIR,
        source_blend=SOURCE_BLEND,
        tint_sets={'flat': ('earth',), 'earth': ('earth',), 'dark': ('dark', 'wood')},
    )


if __name__ == '__main__':
    main()
