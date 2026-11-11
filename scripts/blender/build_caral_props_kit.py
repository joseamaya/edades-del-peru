"""Build the Caral prop kit as LOD0/LOD1 GLBs.

The first piece is the granodiorite outcrop that replaces the primitive quarry node (issue 393).
The dossier documents granodiorite as the late-period building stone and the quarries in the hills;
the outcrop form is an assumption. The script is the home for later household props.

Game-safe output: shared architecture materials (``MAT-Arch_Stone``/``MAT-Arch_Earth``), world-scale
box-projected UVs, a COLOR_0 grime tint, Principled BSDF only, no textures. Units are game units;
+Z up in Blender, exported Y-up; pivot at the footprint centre, ground level.

Run from the repository root:
  blender --background --python scripts/blender/build_caral_props_kit.py -- [--only=granodiorite]
"""

import argparse
import json
import os
import random
import shutil
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_caral_architecture_kit as arch_kit  # noqa: E402  (shared materials, UVs, export)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
EXPORT_DIR = os.path.join(ROOT, 'art-src', 'blender', 'exports', 'caral', 'props')
GAME_DIR = os.path.join(ROOT, 'src', 'assets', 'props', 'caral')
SOURCE_BLEND = os.path.join(ROOT, 'art-src', 'blender', 'scenes', 'caral_props_kit.blend')

# Per-piece triangle budgets: small scenery, not buildings.
BUDGETS = {'granodiorite': (1500, 400)}


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', default='')
    return parser.parse_args(argv)


def granodiorite(mats, lod):
    """Low, fractured granodiorite outcrop with a few loose blocks around the base."""
    bm = bmesh.new()
    stone = 0
    rng = random.Random(20261111)
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
        arch_kit.blob(
            bm,
            (x, y, z),
            (rx, ry, rz),
            7 if lod == 0 else 5,
            4 if lod == 0 else 3,
            0.28,
            seed,
            stone,
        )
    return bm, [mats['stone']]


ASSETS = {'granodiorite': granodiorite}

CONFIDENCE = {'granodiorite': 'inferred'}
SOURCES = ['docs/historia/campanas/caral.md', 'docs/historia/civilizaciones/caral.md']


def build_object(asset, lod, mats):
    arch_kit.LEDGES[:] = [0.0]
    bm, materials = ASSETS[asset](mats, lod)
    used = sorted({f.material_index for f in bm.faces})
    remap = {old: new for new, old in enumerate(used)}
    for f in bm.faces:
        f.material_index = remap[f.material_index]
    kept = [materials[i] for i in used]
    bm.normal_update()
    arch_kit.assign_uvs(bm, kept)
    mesh = bpy.data.meshes.new(f'GEO-Props_{asset}_LOD{lod}')
    bm.to_mesh(mesh)
    bm.free()
    for mat in kept:
        mesh.materials.append(mat)
    arch_kit.tint(mesh)
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
