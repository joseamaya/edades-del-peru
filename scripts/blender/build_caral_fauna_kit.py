"""Build the Caral fauna kit (deer and riparian bird) as GLBs for the game's Wildlife system.

Species from the dossier (docs/historia/campanas/caral.md, Shady: venados and aves in the riparian
forest). The dossier does not name the bird species, so the bird is a generic small dark bird.
Each GLB holds the parts the game animates: ``body`` plus one ``leg`` (origin at the hip, extending
down) or one ``wing`` (origin at the shoulder, span +X). Colour is per-vertex (COLOR_0); the game
draws all fauna with one vertex-coloured material. The pivots match the procedural fallback in
src/rendering/faunaModels.ts (FAUNA_RIGS in the manifest).

Blender is +Z up and the model faces -Y, which the glTF exporter turns into +Y up / +Z forward.

Run from the repository root:
  blender --background --python scripts/blender/build_caral_fauna_kit.py
"""

import json
import os
import shutil
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_caral_slice as slice_kit  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
EXPORT_DIR = os.path.join(ROOT, 'art-src', 'blender', 'exports', 'caral', 'fauna')
GAME_DIR = os.path.join(ROOT, 'src', 'assets', 'fauna', 'caral')
SOURCE_BLEND = os.path.join(ROOT, 'art-src', 'blender', 'scenes', 'caral_fauna_kit.blend')

# Per-animal budget from scripts/bench.mjs (RIG_BUDGETS.animal): 5000 triangles including all limbs.
ANIMAL_TRIANGLES = 5000

# Pivots shared with the procedural templates in src/rendering/faunaModels.ts.
DEER = {'hipY': 0.78, 'legX': 0.1, 'legZFront': 0.36, 'legZBack': -0.38}
BIRD = {'shoulderX': 0.05, 'shoulderY': 0.02, 'shoulderZ': 0.0}

C = {
    'coat': slice_kit.hex_rgb('#8a6544'),
    'back': slice_kit.hex_rgb('#6e4f34'),
    'belly': slice_kit.hex_rgb('#d9cfbf'),
    'white': slice_kit.hex_rgb('#ece6da'),
    'dark': slice_kit.hex_rgb('#2a2018'),
    # Mid-value brown, not black: a dark bird vanishes against the riverbank from the RTS camera.
    'bird': slice_kit.hex_rgb('#6a5c50'),
    'bird_wing': slice_kit.hex_rgb('#584c42'),
    'beak': slice_kit.hex_rgb('#b0894e'),
}


def colored_mesh(name, kit, colors):
    """Finish a kit mesh and bake its material slots into COLOR_0 (no materials kept)."""
    mesh = bpy.data.meshes.new(name)
    kit['bm'].to_mesh(mesh)
    kit['bm'].free()
    for attr in ('leafvar', 'blob'):
        if attr in mesh.attributes:
            mesh.attributes.remove(mesh.attributes[attr])
    col = mesh.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    for poly in mesh.polygons:
        poly.use_smooth = True
        c = colors[poly.material_index]
        for li in poly.loop_indices:
            col.data[li].color = (*c, 1.0)
    mesh.color_attributes.active_color = col
    mesh.color_attributes.render_color_index = mesh.color_attributes.find('Col')
    if 'UVMap' in mesh.uv_layers:
        mesh.uv_layers.remove(mesh.uv_layers['UVMap'])
    return mesh


def deer_body():
    kit = slice_kit.new_kit()
    blob = slice_kit.kblob
    blob(kit, (0, 0, 0.98), (0.17, 0.48, 0.2), 12, 9, 0.02, 1, 0)
    blob(kit, (0, -0.05, 1.08), (0.12, 0.38, 0.1), 10, 6, 0.0, 2, 1)
    blob(kit, (0, 0, 0.88), (0.13, 0.4, 0.12), 10, 6, 0.0, 3, 2)
    slice_kit.ktube(kit, [(0, -0.34, 1.02), (0, -0.47, 1.25), (0, -0.56, 1.42)], 0.075, 0.05, 8, 0)
    blob(kit, (0, -0.66, 1.48), (0.075, 0.16, 0.085), 10, 7, 0.0, 4, 0)
    blob(kit, (0, -0.8, 1.45), (0.045, 0.05, 0.045), 6, 5, 0.0, 5, 3)
    for side in (-1, 1):
        blob(kit, (side * 0.075, -0.6, 1.63), (0.032, 0.018, 0.085), 6, 5, 0.0, 6, 1)
    blob(kit, (0, 0.5, 1.06), (0.05, 0.05, 0.08), 6, 5, 0.0, 7, 4)
    return colored_mesh('body', kit, [C['coat'], C['back'], C['belly'], C['dark'], C['white']])


def deer_leg():
    kit = slice_kit.new_kit()
    h = DEER['hipY']
    # Starts inside the torso so the hip joint never shows a gap while the leg swings.
    slice_kit.ktube(kit, [(0, 0, 0.1), (0, 0.02, -h * 0.5), (0, -0.01, -h * 0.95)], 0.06, 0.026, 6, 0)
    slice_kit.kblob(kit, (0, -0.01, -h + 0.02), (0.032, 0.042, 0.03), 6, 4, 0.0, 1, 1)
    return colored_mesh('leg', kit, [C['coat'], C['dark']])


def bird_body():
    kit = slice_kit.new_kit()
    slice_kit.kblob(kit, (0, 0, 0), (0.07, 0.19, 0.07), 10, 7, 0.0, 1, 0)
    slice_kit.kblob(kit, (0, -0.19, 0.04), (0.055, 0.06, 0.055), 8, 6, 0.0, 2, 0)
    slice_kit.kblob(kit, (0, -0.27, 0.035), (0.015, 0.04, 0.012), 4, 3, 0.0, 3, 1)
    slice_kit.kblob(kit, (0, 0.24, 0.0), (0.065, 0.11, 0.012), 6, 4, 0.0, 4, 0)
    return colored_mesh('body', kit, [C['bird'], C['beak']])


def bird_wing():
    kit = slice_kit.new_kit()
    slice_kit.kblob(kit, (0.2, 0.01, 0.0), (0.2, 0.08, 0.012), 8, 4, 0.0, 1, 0)
    return colored_mesh('wing', kit, [C['bird_wing']])


def export(objects, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.context.view_layer.update()
    for o in bpy.context.view_layer.objects:
        o.select_set(o in objects)
    bpy.context.view_layer.objects.active = objects[0]
    kwargs = dict(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                  export_animations=False, export_materials='NONE', export_normals=True, export_tangents=False)
    try:
        bpy.ops.export_scene.gltf(**kwargs, export_vertex_color='ACTIVE')
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)


def tris(mesh):
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    os.makedirs(GAME_DIR, exist_ok=True)
    col = bpy.data.collections.new('COL-Kit_Fauna')
    bpy.context.scene.collection.children.link(col)
    assets = {
        'deer': ([('body', deer_body()), ('leg', deer_leg())], {'legs': 4}, DEER),
        'bird': ([('body', bird_body()), ('wing', bird_wing())], {'wings': 2}, BIRD),
    }
    failures = []
    for k, (asset, (meshes, limbs, rig)) in enumerate(assets.items()):
        objs = []
        for part, mesh in meshes:
            obj = bpy.data.objects.new(part, mesh)  # glTF node name = part name, read by the game
            col.objects.link(obj)
            objs.append(obj)
        file = f'caral_{asset}.glb'
        path = os.path.join(EXPORT_DIR, file)
        export(objs, path)
        shutil.copy2(path, os.path.join(GAME_DIR, file))
        for obj in objs:
            obj.name = f'GEO-Kit_{asset}_{obj.name}'
            obj.location.x = k * 3.0
        (_, body), (limb_name, limb) = meshes
        per_animal = tris(body) + tris(limb) * (limbs.get('legs', 0) + limbs.get('wings', 0))
        manifest = {
            'asset_id': f'caral_{asset}', 'script': 'scripts/blender/build_caral_fauna_kit.py',
            'source_scene': 'scenes/caral_fauna_kit.blend', 'file': file, 'bytes': os.path.getsize(path),
            'parts': {'body': tris(body), limb_name: tris(limb)}, 'limbs': limbs, 'pivots': rig,
            'triangles_per_animal': per_animal, 'budget_per_animal': ANIMAL_TRIANGLES,
        }
        with open(os.path.join(EXPORT_DIR, f'caral_{asset}_manifest.json'), 'w') as fh:
            json.dump(manifest, fh, indent=2)
            fh.write('\n')
        if per_animal > ANIMAL_TRIANGLES:
            failures.append(f'{asset}: {per_animal}')
        print(f'FAUNA {asset} body={tris(body)} limb={tris(limb)} per_animal={per_animal}')
    bpy.ops.wm.save_as_mainfile(filepath=SOURCE_BLEND, compress=True)
    if failures:
        raise SystemExit('over budget: ' + ', '.join(failures))


if __name__ == '__main__':
    main()
