"""Build the Tambotoco highland vegetation kit (molle, pacay, ichu) as LOD0/LOD1 GLBs.

The pilot lists these species as the plausible Andean-valley set
(docs/design/tambotoco-art-pilot.md, docs/historia/mapas.md): molle (Schinus molle) and pacay
(Inga feuillei) are real valley trees; ichu is the puna bunch grass. Their exact forms are inferred,
not a reconstruction of a documented individual.

Game-safe output: Principled BSDF only, a small generated alpha-masked leaf atlas per species, and
per-card COLOR_0 tint. Units are game units (a person is 1.86); +Z up in Blender, exported Y-up;
origin at the trunk or clump base. Run from the repository root:

  blender --background --python scripts/blender/build_andes_vegetation_kit.py
"""

import argparse
import json
import math
import os
import random
import shutil
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_caral_slice as slice_kit  # noqa: E402
import build_caral_vegetation_kit as caral  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
EXPORT_DIR = os.path.join(ROOT, 'art-src', 'blender', 'exports', 'tambotoco', 'vegetation')
GAME_DIR = os.path.join(ROOT, 'src', 'assets', 'vegetation', 'andes')
SOURCE_BLEND = os.path.join(ROOT, 'art-src', 'blender', 'scenes', 'tambotoco_vegetation_kit.blend')

# Per-species triangle budgets (LOD0, LOD1).
BUDGETS = {'molle': (1500, 400), 'pacay': (1100, 320), 'ichu': (220, 60)}
CONFIDENCE = {'molle': 'inferred', 'pacay': 'inferred', 'ichu': 'inferred'}
SOURCES = [
    'docs/design/tambotoco-art-pilot.md',
    'docs/historia/mapas.md',
]


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', default='')
    return parser.parse_args(argv)


def build_materials():
    molle_tex = caral.leaf_texture('TEX-Andes_MolleLeaf', 256, 30, 1.8, 0.5, 21)
    pacay_tex = caral.leaf_texture('TEX-Andes_PacayLeaf', 256, 18, 2.1, 0.5, 22)
    return {
        'bark': caral.mat_basic('MAT-Andes_Bark', slice_kit.hex_rgb('#5a4a38'), 0.95),
        'molle_leaf': caral.mat_cards('MAT-Andes_MolleLeaf', slice_kit.hex_rgb('#8a9a58'), molle_tex),
        'pacay_leaf': caral.mat_cards('MAT-Andes_PacayLeaf', slice_kit.hex_rgb('#7f9a4a'), pacay_tex),
        'ichu': caral.mat_basic('MAT-Andes_Ichu', slice_kit.hex_rgb('#b9a96a'), 0.9),
    }


def molle(mats, lod):
    """Molle: short twisted trunk, arching limbs and a flat, umbrella-like crown (~3 people)."""
    rng = random.Random(21)
    kit = slice_kit.new_kit()
    sides = 7 if lod == 0 else 5
    trunk = [Vector((0, 0, -0.1)), Vector((0.1, 0.04, 1.0)), Vector((0.02, 0.12, 2.0)), Vector((0.16, 0.06, 2.6))]
    if lod == 1:
        trunk = [trunk[0], trunk[2], trunk[3]]
    slice_kit.ktube(kit, trunk, 0.3, 0.16, sides, 0)
    fork = trunk[-1]
    tips = []
    # Keep the same five limb tips at both LODs so the crown footprint does not pop at the swap.
    for k in range(5):
        ang = k / 5 * math.tau + rng.uniform(-0.3, 0.3)
        reach = rng.uniform(1.5, 2.3)
        mid = fork + Vector((math.cos(ang) * reach * 0.45, math.sin(ang) * reach * 0.45, rng.uniform(0.7, 1.0)))
        tip = fork + Vector((math.cos(ang) * reach, math.sin(ang) * reach, rng.uniform(1.6, 2.2)))
        pts = [fork, mid, tip] if lod == 0 else [fork, tip]
        slice_kit.ktube(kit, pts, 0.1, 0.03, 6 if lod == 0 else 4, 0)
        tips.append(tip)
    blobs = []
    for tip in tips:
        blobs.append((tuple(tip + Vector((0, 0, 0.1))), (1.3, 1.25, 0.55)))
        blobs.append((tuple(tip * 0.55 + fork * 0.45 + Vector((0, 0, 0.9))), (0.95, 0.95, 0.45)))
    crown = sum((Vector(b[0]) for b in blobs), Vector()) / len(blobs)
    cards, size = (600, 0.82) if lod == 0 else (150, 1.55)
    slice_kit.kcrown(kit, blobs, cards, size, rng, 1, aspect=0.9, droop=0.3, surface=0.3)
    return kit, [mats['bark'], mats['molle_leaf']], crown - Vector((0, 0, 1.0))


def pacay(mats, lod):
    """Pacay: multi-stemmed valley tree with a broad crown and hanging pods (~3 people)."""
    rng = random.Random(22)
    kit = slice_kit.new_kit()
    stems = 3
    tips = []
    for k in range(stems):
        ang = k / stems * math.tau + rng.uniform(-0.25, 0.25)
        reach = rng.uniform(0.35, 0.6)
        mid = Vector((math.cos(ang) * reach * 0.5, math.sin(ang) * reach * 0.5, 1.15))
        tip = Vector((math.cos(ang) * reach, math.sin(ang) * reach, 1.7))
        pts = [(0, 0, -0.1), tuple(mid), tuple(tip)] if lod == 0 else [(0, 0, -0.1), tuple(tip)]
        slice_kit.ktube(kit, pts, 0.12, 0.05, 6 if lod == 0 else 4, 0)
        for side in (-1, 1):
            ang2 = ang + side * rng.uniform(0.5, 0.9)
            branch = tip + Vector((math.cos(ang2) * 1.3, math.sin(ang2) * 1.3, 1.1))
            slice_kit.ktube(kit, [tuple(tip), tuple(branch)], 0.06, 0.025, 4, 0)
            tips.append(branch)
    blobs = []
    for tip in tips:
        blobs.append((tuple(tip + Vector((0, 0, 0.15))), (1.15, 1.1, 0.55)))
        blobs.append((tuple(tip * 0.5 + Vector((0, 0, 0.8))), (0.85, 0.85, 0.45)))
    crown = sum((Vector(b[0]) for b in blobs), Vector()) / len(blobs)
    cards, size = (440, 0.86) if lod == 0 else (110, 1.6)
    slice_kit.kcrown(kit, blobs, cards, size, rng, 1, aspect=0.82, droop=0.45, surface=0.4)
    pods = 8 if lod == 0 else 4
    for k in range(pods):
        a = k / pods * math.tau + rng.uniform(-0.25, 0.25)
        r = rng.uniform(0.7, 0.95)
        base = (math.cos(a) * r, math.sin(a) * r, rng.uniform(1.9, 2.4))
        lean = (math.cos(a) * 0.08, math.sin(a) * 0.08)
        slice_kit.kblade(kit, base, rng.uniform(0.3, 0.42), lean, 0.055, 1, bend=0.7)
    return kit, [mats['bark'], mats['pacay_leaf']], crown - Vector((0, 0, 1.1))


def ichu(mats, lod):
    """Ichu: a straw-green bunch grass clump; blades are geometry, no cards."""
    rng = random.Random(23)
    kit = slice_kit.new_kit()
    count = 24 if lod == 0 else 7
    for k in range(count):
        a = rng.random() * math.tau
        r = rng.random() ** 0.6 * 0.38
        x, y = math.cos(a) * r, math.sin(a) * r
        h = rng.uniform(0.55, 0.95) * (1.0 if lod == 0 else 0.9)
        lean = (math.cos(a) * rng.uniform(0.12, 0.3), math.sin(a) * rng.uniform(0.12, 0.3))
        slice_kit.kblade(kit, (x, y, -0.05), h, lean, 0.045, 0, bend=0.8)
    return kit, [mats['ichu']], None


SPECIES = {'molle': molle, 'pacay': pacay, 'ichu': ichu}


def build_object(asset, lod, mats):
    kit, materials, crown = SPECIES[asset](mats, lod)
    name = f'GEO-Andes_{asset}_LOD{lod}'
    mesh = slice_kit.kfinish(kit, name, materials, smooth=asset != 'ichu', crown=crown)
    caral.tint_vertex_colors(mesh, kit['blobs'])
    obj = bpy.data.objects.new(name, mesh)
    col = bpy.data.collections.get(f'COL-Andes_{asset}') or bpy.data.collections.new(f'COL-Andes_{asset}')
    if col.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(col)
    col.objects.link(obj)
    obj.location.x = (list(SPECIES).index(asset)) * 10.0
    obj.location.y = lod * 10.0
    return obj


def main():
    args = parse_args()
    only = [a for a in args.only.split(',') if a] or list(SPECIES)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = build_materials()
    os.makedirs(GAME_DIR, exist_ok=True)
    failures = []
    for asset in only:
        manifest = {
            'asset_id': f'andes_{asset}',
            'source_scene': 'scenes/tambotoco_vegetation_kit.blend',
            'script': 'scripts/blender/build_andes_vegetation_kit.py',
            'scale': 1.0,
            'up': 'Y',
            'front': '+Z',
            'pivot': 'clump base at origin' if asset == 'ichu' else 'trunk base at origin',
            'collision': 'none in the GLB; visual-only vegetation',
            'confidence': CONFIDENCE[asset],
            'sources': SOURCES,
            'budget': {'LOD0': BUDGETS[asset][0], 'LOD1': BUDGETS[asset][1]},
            'reviewed': False,
            'lods': {},
        }
        for lod in (0, 1):
            obj = build_object(asset, lod, mats)
            info = caral.stats(obj)
            file = f'andes_{asset}_lod{lod}.glb'
            path = os.path.join(EXPORT_DIR, file)
            caral.export_glb(obj, path)
            shutil.copy2(path, os.path.join(GAME_DIR, file))
            obj.name = f'{obj.name}_source'
            info['file'] = file
            info['bytes'] = os.path.getsize(path)
            manifest['lods'][f'LOD{lod}'] = info
            if info['triangles'] > BUDGETS[asset][lod]:
                failures.append(f'{asset} LOD{lod}: {info["triangles"]} > {BUDGETS[asset][lod]}')
            print(f'KIT {asset} LOD{lod} tris={info["triangles"]} calls={info["draw_calls"]} bytes={info["bytes"]}')
        with open(os.path.join(EXPORT_DIR, f'andes_{asset}_manifest.json'), 'w') as fh:
            json.dump(manifest, fh, indent=2)
            fh.write('\n')
    os.makedirs(os.path.dirname(SOURCE_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=SOURCE_BLEND, compress=True)
    if failures:
        raise SystemExit('over budget: ' + '; '.join(failures))


if __name__ == '__main__':
    main()
