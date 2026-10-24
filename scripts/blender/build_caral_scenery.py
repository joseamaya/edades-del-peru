#!/usr/bin/env python3
"""Build modular Caral scenery assets from the RTS kit.

Run from the repository root:
  blender --background art-src/blender/scenes/caral_rts_kit.blend \
    --python scripts/blender/build_caral_scenery.py -- \
    --asset=anfiteatro
"""

import argparse
import json
import os
import re
import shutil
import sys

import bpy
from mathutils import Vector

GAME_SCALE = 0.08

ASSETS = {
    'pyramid-mayor': {
        'asset_id': 'caral_pyramid_mayor',
        'root': 'GEO-Caral_PyramidMayor',
        'collection_prefix': 'COL-Caral_PyramidMayor',
        'source_objects': ('GEO-Caral_PyramideMayor_LOD0', 'GEO-Caral_PlazaMayor_LOD0'),
        'lod1_ratio': 0.4,
        'blend': 'caral_pyramid_mayor.blend',
    },
    'anfiteatro': {
        'asset_id': 'caral_anfiteatro',
        'root': 'GEO-Caral_Anfiteatro',
        'collection_prefix': 'COL-Caral_Anfiteatro',
        'source_objects': (
            'GEO-Caral_TemploAnfiteatro_LOD0',
            'GEO-Caral_AltarCircular_LOD0',
            'GEO-Caral_TemploBanqueta_LOD0',
        ),
        'lod1_ratio': 0.4,
        'blend': 'caral_anfiteatro.blend',
    },
}


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--asset', choices=sorted(ASSETS), default='pyramid-mayor')
    parser.add_argument('--out-dir', default='art-src/blender/exports/caral')
    parser.add_argument('--game-dir', default='src/assets/scenery/caral')
    parser.add_argument('--blend')
    return parser.parse_args(argv)


def ensure_parent(path: str) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)


def select_only(objects) -> None:
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active = objects[0]


def bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    minimum = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    maximum = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return minimum, maximum


SAND_BASE_COLOR = (0.335, 0.235, 0.125, 1.0)


def sanitize_materials() -> None:
    material = bpy.data.materials.get('MAT-Sand_Desert')
    if material is None or not material.use_nodes:
        return
    bsdf = next((node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None)
    if bsdf is None:
        return
    base = bsdf.inputs.get('Base Color')
    if base is None:
        return
    for link in list(base.links):
        material.node_tree.links.remove(link)
    base.default_value = SAND_BASE_COLOR


def duplicate_sources(source_objects, collection_name: str, suffix: str):
    collection = bpy.data.collections.new(collection_name)
    bpy.context.scene.collection.children.link(collection)
    duplicates = []
    for name in source_objects:
        source = bpy.data.objects.get(name)
        if source is None:
            raise RuntimeError(f'Missing source object: {name}')
        duplicate = source.copy()
        duplicate.data = source.data.copy()
        duplicate.name = f'{name}{suffix}'
        collection.objects.link(duplicate)
        duplicates.append(duplicate)
    select_only(duplicates)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return collection, duplicates


def place_for_game(objects) -> None:
    minimum, maximum = bounds(objects)
    center_x = (minimum.x + maximum.x) * 0.5
    center_y = (minimum.y + maximum.y) * 0.5
    for obj in objects:
        obj.location = (-center_x * GAME_SCALE, -center_y * GAME_SCALE, 0.0)
        obj.scale = (GAME_SCALE, GAME_SCALE, GAME_SCALE)
    select_only(objects)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)


def join_objects(objects, name: str):
    select_only(objects)
    bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    joined.name = name
    return joined


def safe_name(value: str) -> str:
    return re.sub(r'[^A-Za-z0-9_]+', '_', value.replace('MAT-', '')).strip('_')


def separate_by_material(obj, prefix: str, root, lod: str):
    select_only([obj])
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.separate(type='MATERIAL')
    bpy.ops.object.mode_set(mode='OBJECT')
    parts = [o for o in bpy.context.selected_objects if o.type == 'MESH']
    for part in parts:
        material = part.data.materials[0] if part.data.materials else None
        part.name = f'{prefix}_{lod}_{safe_name(material.name if material else "Unassigned")}'
        part.parent = root
        part.matrix_parent_inverse = root.matrix_world.inverted()
    return parts


def mesh_stats(root):
    meshes = [child for child in root.children_recursive if child.type == 'MESH']
    triangles = 0
    materials = set()
    for mesh in meshes:
        mesh.data.calc_loop_triangles()
        triangles += len(mesh.data.loop_triangles)
        for material in mesh.data.materials:
            if material:
                materials.add(material.name)
    minimum, maximum = bounds(meshes)
    size = maximum - minimum
    return {
        'triangles': triangles,
        'draw_calls': len(meshes),
        'materials': sorted(materials),
        'bounds': {
            'min': [round(v, 6) for v in minimum],
            'max': [round(v, 6) for v in maximum],
            'size': [round(v, 6) for v in size],
        },
    }


def build_lod(config, lod: str, decimate: bool):
    collection_name = f"{config['collection_prefix']}_{lod}"
    collection, duplicates = duplicate_sources(config['source_objects'], collection_name, f'_{lod}_work')
    place_for_game(duplicates)
    sanitize_materials()
    joined_name = f"{config['root']}_{lod}_joined"
    joined = join_objects(duplicates, joined_name)
    if decimate:
        modifier = joined.modifiers.new('LOD1_Decimate', 'DECIMATE')
        modifier.decimate_type = 'COLLAPSE'
        modifier.ratio = config['lod1_ratio']
        bpy.context.view_layer.objects.active = joined
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        joined.data.validate(verbose=False)
        joined.data.update()
        select_only([joined])
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.delete_loose()
        bpy.ops.mesh.dissolve_degenerate(threshold=0.0001)
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')
    root = bpy.data.objects.new(f"{config['root']}_{lod}", None)
    collection.objects.link(root)
    root.empty_display_size = 1.0
    parts = separate_by_material(joined, config['root'], root, lod)
    if not parts:
        raise RuntimeError(f'No mesh parts produced for {lod}')
    return collection, root, mesh_stats(root)


def isolate_for_save(keep_collections):
    keep_objects = set()
    for name in keep_collections:
        collection = bpy.data.collections.get(name)
        if collection is not None:
            keep_objects.update(collection.all_objects)
    for obj in list(bpy.data.objects):
        if obj not in keep_objects:
            bpy.data.objects.remove(obj, do_unlink=True)
    for collection in list(bpy.data.collections):
        if collection.name not in keep_collections:
            bpy.data.collections.remove(collection)


def export_glb(root, path: str):
    ensure_parent(path)
    select_only([root, *root.children_recursive])
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_animations=False,
        export_materials='EXPORT',
        export_normals=True,
        export_tangents=False,
        export_extras=True,
    )


def main():
    args = parse_args()
    config = ASSETS[args.asset]
    out_dir = os.path.abspath(args.out_dir)
    game_dir = os.path.abspath(args.game_dir)
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(game_dir, exist_ok=True)

    _, lod0_root, lod0_stats = build_lod(config, 'LOD0', decimate=False)
    lod0_path = os.path.join(out_dir, f"{config['asset_id']}_lod0.glb")
    export_glb(lod0_root, lod0_path)

    _, lod1_root, lod1_stats = build_lod(config, 'LOD1', decimate=True)
    lod1_path = os.path.join(out_dir, f"{config['asset_id']}_lod1.glb")
    export_glb(lod1_root, lod1_path)

    for source, target in (
        (lod0_path, os.path.join(game_dir, os.path.basename(lod0_path))),
        (lod1_path, os.path.join(game_dir, os.path.basename(lod1_path))),
    ):
        shutil.copy2(source, target)

    manifest = {
        'asset_id': config['asset_id'],
        'source_scene': 'scenes/caral_rts_kit.blend',
        'source_objects': list(config['source_objects']),
        'scale': GAME_SCALE,
        'lod1_ratio': config['lod1_ratio'],
        'root': config['root'],
        'lods': {
            'LOD0': {'file': os.path.basename(lod0_path), **lod0_stats},
            'LOD1': {'file': os.path.basename(lod1_path), **lod1_stats},
        },
    }
    manifest_path = os.path.join(out_dir, f"{config['asset_id']}_manifest.json")
    with open(manifest_path, 'w', encoding='utf-8') as handle:
        json.dump(manifest, handle, indent=2)
        handle.write('\n')

    isolate_for_save({f"{config['collection_prefix']}_LOD0", f"{config['collection_prefix']}_LOD1"})

    blend_path = os.path.abspath(args.blend or f"art-src/blender/scenes/{config['blend']}")
    ensure_parent(blend_path)
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)

    print(json.dumps(manifest, indent=2))
    print(f'WROTE {manifest_path}')
    print(f'WROTE {lod0_path}')
    print(f'WROTE {lod1_path}')
    print(f'WROTE {blend_path}')


if __name__ == '__main__':
    main()
