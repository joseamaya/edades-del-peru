"""Build the Chavín architecture kit from the cleaned preview source.

The source city is one mesh. We split it by the game's heritage proxies (Edificio A, Edificio B,
Portada, Plaza Circular and the remaining terraces), normalise the materials to the shared
`MAT-Arch_Chavin*` palette, add low foundation pieces for the two construction stages, and export one
LOD0/LOD1 GLB per piece. Coordinates are the source's world coordinates: `ChavinCity` places the
whole kit at the site origin (96, 96) with the site scale (0.22), exactly like the original GLB.

Run from the repository root:
  blender --background --python scripts/blender/build_chavin_architecture_kit.py -- --lod=0
  blender --background --python scripts/blender/build_chavin_architecture_kit.py -- --lod=1
"""

import argparse
import json
import math
import os
import shutil
import sys

import bmesh
import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GAME_DIR = os.path.join(ROOT, 'src', 'assets', 'architecture', 'chavin')
EXPORT_DIR = os.path.join(ROOT, 'art-src', 'blender', 'exports', 'chavin', 'architecture')
SOURCE = {
    0: os.path.join(ROOT, 'art-src', 'blender', 'chavin', 'chavin_lod0_clean.blend'),
    1: os.path.join(ROOT, 'art-src', 'blender', 'chavin', 'chavin_lod1_clean.blend'),
}
CARAL_TENT = os.path.join(ROOT, 'src', 'assets', 'architecture', 'caral', 'caral_fair_tent_lod{lod}.glb')

SITE_ORIGIN = 96.0
SITE_SCALE = 0.22

# Game-space boxes (world metres) of the heritage proxies, used to split the source mesh.
BOXES = {
    'portada': (105.5, 114.5, 81.5, 88.5),
    'edificio_a': (99.5, 119.5, 69.0, 91.0),
    'edificio_b': (80.0, 100.0, 81.5, 100.5),
    'plaza': (89.0, 107.0, 78.5, 93.5),
}

MATERIALS = {
    'MAT-Arch_ChavinStone': ((0.62, 0.56, 0.45), 0.92),
    'MAT-Arch_ChavinDark': ((0.42, 0.36, 0.29), 0.94),
    'MAT-Arch_ChavinPlaster': ((0.58, 0.51, 0.40), 0.9),
    'MAT-Arch_ChavinEarth': ((0.34, 0.27, 0.18), 0.96),
}

SOURCE_TO_MATERIAL = {
    'MAT-Chavin_Stone_Tiled': 'MAT-Arch_ChavinStone',
    'MAT-Chavin_StoneDark_Tiled': 'MAT-Arch_ChavinDark',
    'MAT-Chavin_Plaster': 'MAT-Arch_ChavinPlaster',
    'MAT-Chavin_GalleryDark': 'MAT-Arch_ChavinDark',
    'MAT-Chavin_Portada_Light': 'MAT-Arch_ChavinStone',
    'MAT-Chavin_Portada_Dark': 'MAT-Arch_ChavinDark',
}


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--lod', type=int, choices=(0, 1), default=0)
    parser.add_argument('--only', default='')
    return parser.parse_args(argv)


def make_materials():
    mats = {}
    for name, (color, rough) in MATERIALS.items():
        mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        bsdf = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf:
            bsdf.inputs['Base Color'].default_value = (*color, 1)
            bsdf.inputs['Roughness'].default_value = rough
            bsdf.inputs['Metallic'].default_value = 0.0
        mats[name] = mat
    return mats


def source_material_name(index, materials):
    if index >= len(materials) or materials[index] is None:
        return 'MAT-Arch_ChavinStone'
    return SOURCE_TO_MATERIAL.get(materials[index].name, 'MAT-Arch_ChavinStone')


def world_bmesh(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.transform(obj.matrix_world)
    return bm


def game_point(v):
    # Blender world -> glTF Y-up (x, z, -y), then the site origin/scale used by ChavinCity.
    return (
        SITE_ORIGIN + v.x * SITE_SCALE,
        SITE_ORIGIN - v.y * SITE_SCALE,
        v.z * SITE_SCALE,
    )


def face_group(face):
    cx, cz, _ = game_point(face.calc_center_median())
    # Priority: Portada, then the east (A) / west (B) temple halves, then the circular plaza.
    if BOXES['portada'][0] <= cx <= BOXES['portada'][1] and BOXES['portada'][2] <= cz <= BOXES['portada'][3]:
        return 'portada'
    if BOXES['edificio_a'][0] <= cx <= BOXES['edificio_a'][1] and BOXES['edificio_a'][2] <= cz <= BOXES['edificio_a'][3]:
        return 'edificio_a'
    if BOXES['edificio_b'][0] <= cx <= BOXES['edificio_b'][1] and BOXES['edificio_b'][2] <= cz <= BOXES['edificio_b'][3]:
        return 'edificio_b'
    if BOXES['plaza'][0] <= cx <= BOXES['plaza'][1] and BOXES['plaza'][2] <= cz <= BOXES['plaza'][3]:
        return 'plaza'
    return 'terraces'


def extract_group(source_bm, group, base_z, mats, source_materials):
    bm = bmesh.new()
    uv_src = source_bm.loops.layers.uv.active
    uv_dst = bm.loops.layers.uv.new('UVMap') if uv_src else None
    vmap = {}
    mat_names = list(MATERIALS)
    mat_index = {name: i for i, name in enumerate(mat_names)}
    for face in source_bm.faces:
        if face_group(face) != group:
            continue
        verts = []
        for v in face.verts:
            if v not in vmap:
                vmap[v] = bm.verts.new((v.co.x, v.co.y, v.co.z - base_z))
            verts.append(vmap[v])
        try:
            nf = bm.faces.new(verts)
        except ValueError:
            continue
        nf.smooth = face.smooth
        nf.material_index = mat_index[source_material_name(face.material_index, source_materials)]
        if uv_src and uv_dst:
            for l_src, l_dst in zip(face.loops, nf.loops):
                l_dst[uv_dst].uv = l_src[uv_src].uv
    if not bm.faces:
        bm.free()
        return None
    bm.normal_update()
    mesh = bpy.data.meshes.new(f'chavin_{group}')
    bm.to_mesh(mesh)
    bm.free()
    for name in mat_names:
        mesh.materials.append(mats[name])
    obj = bpy.data.objects.new(f'chavin_{group}', mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def bounds(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    xs = [v.co.x for v in bm.verts]
    ys = [v.co.y for v in bm.verts]
    zs = [v.co.z for v in bm.verts]
    bm.free()
    return (min(xs), max(xs), min(ys), max(ys), min(zs), max(zs))


def foundation_from(obj, name, height_m, inset_m, mats, lod):
    """A low stepped platform under a finished piece, in the same source coordinate frame."""
    x0, x1, y0, y1, _z0, z1 = bounds(obj)
    height = height_m / SITE_SCALE
    inset = inset_m / SITE_SCALE
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    mat_index = {m: i for i, m in enumerate(MATERIALS)}
    steps = 1 if lod else 2
    for step in range(steps):
        k = step / max(1, steps)
        z_lo = z1 - height * (1.0 - k)
        z_hi = z1 - height * (1.0 - k) + height * (1.0 / steps)
        xa, xb = x0 - inset * (1 - k), x1 + inset * (1 - k)
        ya, yb = y0 - inset * (1 - k), y1 + inset * (1 - k)
        verts = [bm.verts.new(c) for c in (
            (xa, ya, z_lo), (xb, ya, z_lo), (xb, yb, z_lo), (xa, yb, z_lo),
            (xa, ya, z_hi), (xb, ya, z_hi), (xb, yb, z_hi), (xa, yb, z_hi),
        )]
        faces = ((0, 1, 2, 3), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7))
        for f in faces:
            nf = bm.faces.new([verts[i] for i in f])
            nf.material_index = mat_index['MAT-Arch_ChavinStone']
            for loop in nf.loops:
                loop[uv].uv = (loop.vert.co.x * 0.35, loop.vert.co.y * 0.35)
    bm.normal_update()
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for mat in MATERIALS:
        mesh.materials.append(mats[mat])
    out = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(out)
    return out


def decimate(obj, target):
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    if tris <= target:
        return
    mod = obj.modifiers.new('Decimate', 'DECIMATE')
    mod.ratio = target / tris
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    print(f'CHAVIN_KIT decimated {obj.name}: {tris} -> {sum(len(p.vertices) - 2 for p in obj.data.polygons)}')


def mesh_stats(obj):
    mesh = obj.data
    triangles = sum(len(p.vertices) - 2 for p in mesh.polygons)
    mats = sorted({mesh.materials[p.material_index].name for p in mesh.polygons if p.material_index < len(mesh.materials)})
    return triangles, mats


def export(obj, asset_id, lod):
    os.makedirs(GAME_DIR, exist_ok=True)
    os.makedirs(EXPORT_DIR, exist_ok=True)
    out = os.path.join(GAME_DIR, f'chavin_{asset_id}_lod{lod}.glb')
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        use_selection=True,
        filepath=out,
        export_format='GLB',
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_materials='EXPORT',
        export_image_format='WEBP',
        export_image_quality=80,
        export_normals=True,
        export_texcoords=True,
        export_extras=False,
        export_draco_mesh_compression_enable=False,
    )
    triangles, materials = mesh_stats(obj)
    x0, x1, y0, y1, z0, z1 = bounds(obj)
    manifest = {
        'asset_id': f'chavin_{asset_id}',
        'source': f'chavin_lod{lod}_clean.blend',
        'reviewed': False,
        'reviewer': None,
        'reviewedAt': None,
        'confidence': 'inferred',
        'budget': {'LOD0': 5000, 'LOD1': 1500},
        'lods': {
            f'LOD{lod}': {
                'file': os.path.basename(out),
                'triangles': triangles,
                'materials': materials,
                'bounds': {'size': [round(x1 - x0, 3), round(z1 - z0, 3), round(y1 - y0, 3)]},
            }
        },
    }
    with open(os.path.join(EXPORT_DIR, f'chavin_{asset_id}_manifest_lod{lod}.json'), 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, indent=2)
    print(f'CHAVIN_KIT {asset_id} LOD{lod} -> {out} tris={triangles} mats={materials}')
    return out


def main():
    args = parse_args()
    bpy.ops.wm.open_mainfile(filepath=SOURCE[args.lod])
    mats = make_materials()
    city = bpy.data.objects.get(f'GEO-Chavin_LOD{args.lod}_City')
    if city is None:
        raise SystemExit(f'city mesh not found in {SOURCE[args.lod]}')
    source_bm = world_bmesh(city)
    base_z = min(v.co.z for v in source_bm.verts)

    pieces = {}
    for group in ('edificio_a', 'edificio_b', 'portada', 'plaza', 'terraces'):
        if args.only and args.only != group:
            continue
        obj = extract_group(source_bm, group, base_z, mats, list(city.data.materials))
        if obj is None:
            print(f'CHAVIN_KIT skip empty {group}')
            continue
        if args.lod == 0:
            decimate(obj, {'edificio_a': 800, 'edificio_b': 3000, 'portada': 400, 'plaza': 2500, 'terraces': 10000}[group])
        pieces[group] = obj

    if 'edificio_a' in pieces:
        pieces['edificio_a_foundation'] = foundation_from(
            pieces['edificio_a'], 'chavin_edificio_a_foundation', 2.2, 1.2, mats, args.lod
        )
    if 'edificio_b' in pieces:
        pieces['edificio_b_foundation'] = foundation_from(
            pieces['edificio_b'], 'chavin_edificio_b_foundation', 1.8, 1.2, mats, args.lod
        )

    for asset_id, obj in pieces.items():
        export(obj, asset_id, args.lod)

    source_bm.free()
    # The fair tent is a documented abstraction from the Caral kit; reuse its geometry in the Chavín kit.
    tent = CARAL_TENT.format(lod=args.lod)
    if os.path.exists(tent) and not args.only:
        shutil.copyfile(tent, os.path.join(GAME_DIR, f'chavin_fair_tent_lod{args.lod}.glb'))
        print(f'CHAVIN_KIT fair_tent LOD{args.lod} <- {tent}')


if __name__ == '__main__':
    main()
