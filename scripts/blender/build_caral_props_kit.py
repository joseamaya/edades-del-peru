"""Build the Caral prop kit as LOD0/LOD1 GLBs.

Two families: the granodiorite outcrop that replaces the primitive quarry node, and the household
props of an Áspero base (hearth, drying rack, basket, gourds, bench, windbreak, cotton). The dossier
documents the shicra baskets, the cotton and gourd crops, the mates used as net floats and the
stone-heated cooking pits; the shapes and the arrangement are assumptions (issue 393).

Game-safe output: shared architecture materials (``MAT-Arch_Stone``/``_Wood``/``_CaneMat``),
world-scale box-projected UVs, a COLOR_0 grime tint plus a per-piece tone, Principled BSDF only, no
textures. Units are game units; +Z up in Blender, exported Y-up; pivot at the footprint centre,
ground level.

Run from the repository root:
  blender --background --python scripts/blender/build_caral_props_kit.py -- [--only=hearth,basket]
"""

import argparse
import json
import math
import os
import random
import shutil
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_caral_architecture_kit as arch_kit  # noqa: E402  (shared materials, UVs, export)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
EXPORT_DIR = os.path.join(ROOT, 'art-src', 'blender', 'exports', 'caral', 'props')
GAME_DIR = os.path.join(ROOT, 'src', 'assets', 'props', 'caral')
SOURCE_BLEND = os.path.join(ROOT, 'art-src', 'blender', 'scenes', 'caral_props_kit.blend')

# Per-piece triangle budgets: small scenery, not buildings.
BUDGETS = {
    'granodiorite': (1500, 400),
    'hearth': (600, 180),
    'drying_rack': (650, 200),
    'basket': (420, 130),
    'gourd': (380, 150),
    'bench': (420, 130),
    'windbreak': (560, 180),
    'cotton': (400, 120),
}

CONFIDENCE = {
    'granodiorite': 'inferred',
    'hearth': 'documented',
    'drying_rack': 'assumed',
    'basket': 'inferred',
    'gourd': 'inferred',
    'bench': 'assumed',
    'windbreak': 'assumed',
    'cotton': 'documented',
}

# COLOR_0 tone per piece: a shared palette still reads as ash-dark stone, raw cotton or a pale gourd.
TINTS = {
    'granodiorite': (1.0, 1.0, 1.0),
    'hearth': {'MAT-Arch_Stone': (0.78, 0.74, 0.7), 'MAT-Arch_Wood': (0.72, 0.66, 0.6)},
    'drying_rack': (1.0, 1.0, 1.0),
    'basket': (1.0, 1.0, 1.0),
    'gourd': {'MAT-Arch_PlasterWhite': (0.93, 0.95, 0.66)},
    'bench': (1.0, 1.0, 1.0),
    'windbreak': (1.0, 1.0, 1.0),
    'cotton': {'MAT-Arch_PlasterWhite': (1.0, 0.99, 0.95)},
}

# The household pieces are 0.2-1.2 m tall: the shared tiles are re-scaled so the weave, grain and
# stone read at that size instead of showing a coarse crop of a 2 m texture.
HOUSEHOLD_TILE = {
    'MAT-Arch_Stone': 1.5,
    'MAT-Arch_Wood': 0.7,
    'MAT-Arch_CaneMat': 0.8,
    'MAT-Arch_PlasterWhite': 1.1,
}

SOURCES = ['docs/historia/campanas/caral.md', 'docs/historia/civilizaciones/caral.md']


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', default='')
    return parser.parse_args(argv)


# ------------------------------------------------------------------------ helpers


def prim(bm, tmp, mat, matrix):
    """Copy a temp bmesh into ``bm`` under a transform, with the material index on every face."""
    for v in tmp.verts:
        v.co = matrix @ v.co
    vmap = {v: bm.verts.new(v.co) for v in tmp.verts}
    for f in tmp.faces:
        bm.faces.new([vmap[v] for v in f.verts]).material_index = mat
    tmp.free()


def timber(bm, base, top, r0, r1, sides, mat):
    """Round timber between two points: posts, rails, cords and firewood."""
    a, b = Vector(base), Vector(top)
    d = b - a
    if d.length < 1e-4:
        return
    tmp = bmesh.new()
    bmesh.ops.create_cone(tmp, cap_ends=True, cap_tris=False, segments=sides, radius1=r0, radius2=r1,
                          depth=d.length)
    m = Matrix.Translation(a + d * 0.5) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    prim(bm, tmp, mat, m)


def cone(bm, center, r0, r1, height, sides, mat):
    """Upright tapered solid (baskets, gourds)."""
    tmp = bmesh.new()
    bmesh.ops.create_cone(tmp, cap_ends=True, cap_tris=False, segments=sides, radius1=r0, radius2=r1,
                          depth=height)
    prim(bm, tmp, mat, Matrix.Translation(center))


def ball(bm, center, radii, segs, rings, jitter, seed, mat):
    arch_kit.blob(bm, center, radii, segs, rings, jitter, seed, mat)


# ------------------------------------------------------------------------ pieces


def granodiorite(mats, lod):
    """Low, fractured granodiorite outcrop with a few loose blocks around the base."""
    bm = bmesh.new()
    stone = 0
    # (x, y, z, rx, ry, rz, seed) in game metres; z is up in Blender.
    chunks = [
        (-1.4, -0.7, 0.5, 1.55, 1.25, 0.95, 1),
        (0.2, -1.0, 0.45, 1.45, 1.15, 0.9, 2),
        (1.5, 0.4, 0.55, 1.65, 1.35, 1.0, 3),
        (-0.3, 1.2, 0.4, 1.55, 1.15, 0.85, 4),
        (1.2, -1.2, 0.3, 1.0, 0.9, 0.7, 5),
    ]
    loose = [
        (-2.4, 0.4, 0.25, 0.55, 0.5, 0.4, 11),
        (2.5, 0.8, 0.2, 0.45, 0.4, 0.35, 12),
        (0.4, 2.0, 0.25, 0.5, 0.45, 0.4, 13),
        (-0.8, -2.0, 0.2, 0.4, 0.35, 0.3, 14),
        (2.2, -1.8, 0.18, 0.35, 0.3, 0.25, 15),
    ]
    if lod == 1:
        chunks = [chunks[0], chunks[2], chunks[3]]
        loose = [loose[1]]
    for x, y, z, rx, ry, rz, seed in [*chunks, *loose]:
        ball(bm, (x, y, z), (rx, ry, rz), 7 if lod == 0 else 5, 4 if lod == 0 else 3, 0.28, seed, stone)
    return bm, [mats['stone']]


def hearth(mats, lod):
    """Stone-ringed hearth: burnt stones, ash bed and the last firewood (pachamanca pits are documented;
    the ring form is inferred)."""
    bm = bmesh.new()
    stone, wood = 0, 1
    rng = random.Random(31)
    ball(bm, (0, 0, 0.02), (0.44, 0.44, 0.03), 10 if lod == 0 else 7, 3, 0.04, 1, stone)
    ring = 9 if lod == 0 else 5
    for i in range(ring):
        a = i / ring * math.tau + rng.uniform(-0.1, 0.1)
        r = 0.5 + rng.uniform(-0.02, 0.03)
        ball(
            bm,
            (math.cos(a) * r, math.sin(a) * r, 0.07),
            (rng.uniform(0.09, 0.13), rng.uniform(0.08, 0.12), rng.uniform(0.07, 0.1)),
            6 if lod == 0 else 4,
            3,
            0.3,
            10 + i,
            stone,
        )
    logs = 3 if lod == 0 else 2
    for k in range(logs):
        a = (k / logs) * math.tau + 0.4
        z = 0.08 + k * 0.035
        timber(
            bm,
            (-math.cos(a) * 0.32, -math.sin(a) * 0.32, z),
            (math.cos(a) * 0.32, math.sin(a) * 0.32, z + 0.02),
            0.045,
            0.032,
            6 if lod == 0 else 4,
            wood,
        )
    return bm, [mats['stone'], mats['wood']]


def drying_rack(mats, lod):
    """Fish drying rack: four forked posts, a cane net and the catch hanging under it (Áspero's dried
    anchovy is documented; the rack itself is a plausible reconstruction)."""
    bm = bmesh.new()
    wood, cane = 0, 1
    rng = random.Random(32)
    posts = 4 if lod == 0 else 2
    for k in range(posts):
        sx = -1 if k % 2 == 0 else 1
        sz = -1 if k < 2 else 1
        base = (sx * 0.56, sz * 0.22, -0.04)
        top = (sx * 0.62, sz * 0.26, 1.0 + rng.uniform(-0.03, 0.03))
        timber(bm, base, top, 0.05, 0.035, 6 if lod == 0 else 4, wood)
    rails = 2 if lod == 0 else 1
    for k in range(rails):
        z = 0.99 - k * 0.0
        sz = -1 if k == 0 else 1
        timber(bm, (-0.64, sz * 0.26, z), (0.64, sz * 0.26, z), 0.035, 0.035, 5 if lod == 0 else 4, wood)
    arch_kit.box(bm, (0, 0, 0.86), (1.2, 0.5, 0.025), cane)
    fish = 4 if lod == 0 else 2
    for k in range(fish):
        x = -0.42 + (k / max(1, fish - 1)) * 0.84 if fish > 1 else 0.0
        ball(bm, (x, rng.uniform(-0.08, 0.08), 0.76), (0.055, 0.025, 0.11), 6, 3, 0.12, 40 + k, cane)
    return bm, [mats['wood'], mats['cane']]


def basket(mats, lod):
    """Fibre basket with a few gathered stones. Shicra bags are documented as construction fill
    (stones in a reed net); the domestic container is an inferred use of the same craft."""
    bm = bmesh.new()
    cane, stone = 0, 1
    sides = 12 if lod == 0 else 8
    cone(bm, (0, 0, 0.16), 0.17, 0.25, 0.32, sides, cane)
    cone(bm, (0, 0, 0.33), 0.27, 0.27, 0.045, sides, cane)
    rng = random.Random(33)
    stones = 5 if lod == 0 else 2
    for k in range(stones):
        a = (k / stones) * math.tau + rng.uniform(-0.3, 0.3)
        r = rng.uniform(0.02, 0.14)
        ball(
            bm,
            (math.cos(a) * r, math.sin(a) * r, 0.35 + rng.uniform(0, 0.04)),
            (rng.uniform(0.06, 0.09), rng.uniform(0.05, 0.08), rng.uniform(0.04, 0.07)),
            5 if lod == 0 else 4,
            3,
            0.25,
            50 + k,
            stone,
        )
    return bm, [mats['cane'], mats['stone']]


def gourd(mats, lod):
    """Gourds and mates: the dossier documents calabaza as a crop and mates as net floats; the cut
    bowl is an inferred household use, so the piece is `inferred`."""
    bm = bmesh.new()
    shell, wood = 0, 1
    ball(bm, (0, 0, 0.1), (0.15, 0.14, 0.11), 8 if lod == 0 else 6, 4 if lod == 0 else 3, 0.12, 60, shell)
    ball(bm, (0.21, 0.05, 0.075), (0.1, 0.09, 0.08), 7 if lod == 0 else 5, 3, 0.12, 61, shell)
    if lod == 0:
        ball(bm, (-0.18, 0.09, 0.06), (0.08, 0.08, 0.065), 6, 3, 0.14, 62, shell)
    # cut mate bowl: a squat ring of fibre with a dark hollow read from the rim. It is the far corner
    # of the footprint, so LOD1 keeps it to avoid a pop when the base switches at 30 units.
    cone(bm, (-0.02, -0.2, 0.045), 0.11, 0.13, 0.09, 8 if lod == 0 else 6, shell)
    if lod == 0:
        timber(bm, (0.02, -0.2, 0.08), (0.02, -0.2, 0.15), 0.018, 0.014, 4, wood)
    timber(bm, (0.02, 0.0, 0.17), (0.05, 0.02, 0.28), 0.02, 0.012, 4, wood)
    return bm, [mats['plaster_early'], mats['wood']]


def bench(mats, lod):
    """Dressed-stone bench beside a dwelling (no direct source; plausible furnishing)."""
    bm = bmesh.new()
    stone = 0
    if lod == 0:
        arch_kit.bevel_box(bm, (0, 0, 0.33), (1.0, 0.34, 0.1), stone, offset=0.03, jitter=0.008, seed=70)
        for x in (-0.32, 0.32):
            arch_kit.bevel_box(bm, (x, 0, 0.14), (0.2, 0.26, 0.26), stone, offset=0.02, jitter=0.01, seed=71)
    else:
        arch_kit.box(bm, (0, 0, 0.33), (1.0, 0.34, 0.12), stone)
        arch_kit.box(bm, (0, 0, 0.14), (0.5, 0.26, 0.28), stone)
    return bm, [mats['stone']]


def windbreak(mats, lod):
    """Reed windbreak behind a dwelling: three forked posts and a woven cane panel (juncus and caña
    brava are documented materials; the screen is assumed)."""
    bm = bmesh.new()
    wood, cane = 0, 1
    rng = random.Random(34)
    posts = 3 if lod == 0 else 2
    for k in range(posts):
        x = -0.52 + (k / max(1, posts - 1)) * 1.04
        timber(bm, (x, rng.uniform(-0.03, 0.03), -0.05), (x * 1.02, 0.02, 1.05), 0.05, 0.035, 5, wood)
    panels = 4 if lod == 0 else 2
    for k in range(panels):
        x = -0.45 + (k / max(1, panels - 1)) * 0.9
        z = 0.52 + rng.uniform(-0.02, 0.02)
        arch_kit.box(bm, (x, 0.03, z), (0.32, 0.03, 0.72), cane)
    timber(bm, (-0.58, 0.02, 1.02), (0.58, 0.02, 1.02), 0.035, 0.035, 4 if lod == 0 else 3, wood)
    return bm, [mats['wood'], mats['cane']]


def cotton(mats, lod):
    """Ginned cotton on a cane mat with the spindle: cotton is one of the documented crops and the
    fibre that paid for the valley's exchange."""
    bm = bmesh.new()
    cane, boll, wood = 0, 1, 2
    arch_kit.box(bm, (0, 0, 0.02), (0.72, 0.46, 0.03), cane)
    rng = random.Random(35)
    bolls = 6 if lod == 0 else 3
    for k in range(bolls):
        x = -0.24 + (k % 3) * 0.24 + rng.uniform(-0.04, 0.04)
        z = -0.08 + (k // 3) * 0.18 + rng.uniform(-0.03, 0.03)
        ball(bm, (x, z, 0.11), (0.1, 0.09, 0.075), 6 if lod == 0 else 4, 3, 0.18, 80 + k, boll)
    timber(bm, (0.3, 0.2, 0.03), (0.42, 0.26, 0.34), 0.016, 0.01, 4, wood)
    return bm, [mats['cane'], mats['plaster_early'], mats['wood']]


ASSETS = {
    'granodiorite': granodiorite,
    'hearth': hearth,
    'drying_rack': drying_rack,
    'basket': basket,
    'gourd': gourd,
    'bench': bench,
    'windbreak': windbreak,
    'cotton': cotton,
}


def build_object(asset, lod, mats):
    arch_kit.LEDGES[:] = [0.0]
    bm, materials = ASSETS[asset](mats, lod)
    used = sorted({f.material_index for f in bm.faces})
    remap = {old: new for new, old in enumerate(used)}
    for f in bm.faces:
        f.material_index = remap[f.material_index]
    kept = [materials[i] for i in used]
    bm.normal_update()
    arch_kit.assign_uvs(bm, kept, None if asset == 'granodiorite' else HOUSEHOLD_TILE)
    mesh = bpy.data.meshes.new(f'GEO-Props_{asset}_LOD{lod}')
    bm.to_mesh(mesh)
    bm.free()
    for mat in kept:
        mesh.materials.append(mat)
    arch_kit.tint(mesh, TINTS[asset])
    obj = bpy.data.objects.new(mesh.name, mesh)
    col = bpy.data.collections.get(f'COL-Props_{asset}') or bpy.data.collections.new(f'COL-Props_{asset}')
    if col.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(col)
    col.objects.link(obj)
    return obj


def main():
    args = parse_args()
    only = [a for a in args.only.split(',') if a] or list(ASSETS)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = arch_kit.build_materials()
    os.makedirs(GAME_DIR, exist_ok=True)
    failures = []
    for asset in only:
        manifest = {
            'asset_id': f'caral_{asset}',
            'source_scene': 'scenes/caral_props_kit.blend',
            'script': 'scripts/blender/build_caral_props_kit.py',
            'scale': 1.0,
            'up': 'Y',
            'front': '+Z',
            'pivot': 'footprint centre at ground level',
            'confidence': CONFIDENCE[asset],
            'sources': SOURCES,
            'budget': {'LOD0': BUDGETS[asset][0], 'LOD1': BUDGETS[asset][1]},
            'reviewed': False,
            'lods': {},
        }
        for lod in (0, 1):
            obj = build_object(asset, lod, mats)
            info = arch_kit.stats(obj)
            file = f'caral_{asset}_lod{lod}.glb'
            path = os.path.join(EXPORT_DIR, file)
            arch_kit.export_glb(obj, path)
            shutil.copy2(path, os.path.join(GAME_DIR, file))
            info['file'] = file
            info['bytes'] = os.path.getsize(path)
            manifest['lods'][f'LOD{lod}'] = info
            budget = BUDGETS[asset][lod]
            if info['triangles'] > budget:
                failures.append(f'{asset} LOD{lod}: {info["triangles"]} > {budget}')
            print(
                f'PROP {asset} LOD{lod} tris={info["triangles"]} calls={info["draw_calls"]} '
                f'size={info["bounds"]["size"]} bytes={info["bytes"]}'
            )
        with open(os.path.join(EXPORT_DIR, f'caral_{asset}_manifest.json'), 'w') as fh:
            json.dump(manifest, fh, indent=2)
            fh.write('\n')
    os.makedirs(os.path.dirname(SOURCE_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=SOURCE_BLEND, compress=True)
    if failures:
        raise SystemExit('over budget: ' + '; '.join(failures))


if __name__ == '__main__':
    main()
