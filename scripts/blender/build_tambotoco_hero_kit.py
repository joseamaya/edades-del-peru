"""Build the Tambotoco hero assets as LOD0/LOD1 GLBs: the cave mouth and the Huanacaure huaca.

Both are **stylized** (docs/design/tambotoco-art-pilot.md, docs/historia/arquitectura.md): the myth has
no dated or documented form. The cave is an irregular rock massif around a dark five-sided recess; the
huaca is a tapered monolith with a carved niche, a stylization of the Huanacaure tradition, not an
imperial architectural niche.

Game-safe output: Principled BSDF only, flat colours, no textures, at most four materials per asset.
Units are game units (a person is 1.86); Blender Z-up, exported Y-up; the front faces -Y in Blender,
i.e. +Z in the game. Origin at the footprint centre, ground level.

Run from the repository root:
  blender --background --python scripts/blender/build_tambotoco_hero_kit.py
"""

import argparse
import json
import math
import os
import shutil
import sys

import bpy
from mathutils import Vector, noise

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
EXPORT_DIR = os.path.join(ROOT, 'art-src', 'blender', 'exports', 'tambotoco')
GAME_DIR = os.path.join(ROOT, 'src', 'assets', 'architecture', 'tambotoco')
SOURCE_BLEND = os.path.join(ROOT, 'art-src', 'blender', 'scenes', 'tambotoco_hero_kit.blend')

# blender-game-assets contract: LOD0 <= 5k triangles per piece, LOD1 <= 1.5k.
BUDGET = {'cave': (5000, 1500), 'huaca': (2000, 600)}


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', default='')
    return parser.parse_args(argv)


def material(name, color, roughness, double_sided=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = 0.0
    mat.diffuse_color = (*color, 1)
    mat.use_backface_culling = not double_sided
    return mat


def srgb_linear(value):
    """Blender's Principled Base Color is linear; the palette is written as sRGB hex."""
    raw = value.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(raw[i : i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


def build_materials():
    return {
        'rock': material('MAT-Tambotoco_Rock', srgb_linear('#8a7c6b'), 0.95),
        'dark': material('MAT-Tambotoco_RockDark', srgb_linear('#6e675d'), 0.97),
        'mouth': material('MAT-Tambotoco_Mouth', srgb_linear('#120f0c'), 1.0, double_sided=True),
        'ash': material('MAT-Tambotoco_Ash', srgb_linear('#4a4038'), 1.0),
        'light': material('MAT-Tambotoco_LightRock', srgb_linear('#b49a78'), 0.93),
    }


def finish(obj, mat, name):
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def flat(obj):
    for poly in obj.data.polygons:
        poly.use_smooth = False
    return obj


def ico(name, loc, radius, mat, scale=(1, 1, 1), subdiv=2, seed=0.0, amp=0.18):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=radius, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    offset = Vector((seed * 1.7, seed * 2.3, seed * 0.9))
    for vertex in obj.data.vertices:
        vertex.co += vertex.normal * noise.noise(vertex.co * 0.85 + offset) * radius * amp
    obj.data.update()
    return flat(finish(obj, mat, name))


def box(name, loc, size, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return flat(finish(obj, mat, name))


def cone(name, loc, radius1, radius2, depth, mat, vertices=6):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=loc,
    )
    return flat(finish(bpy.context.object, mat, name))


def cave_recess(mats, depth=2.8):
    """A dark five-sided tunnel: front open, back and sides closed."""
    import bmesh

    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for vertex in bm.verts:
        vertex.co.x *= 3.6
        vertex.co.y = (vertex.co.y + 0.5) * depth
        vertex.co.z = (vertex.co.z + 0.5) * 3.1
    front = [face for face in bm.faces if face.normal.y < -0.5]
    bmesh.ops.delete(bm, geom=front, context='FACES')
    mesh = bpy.data.meshes.new('cave_recess')
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new('cave_recess', mesh)
    bpy.context.collection.objects.link(obj)
    return flat(finish(obj, mats['mouth'], 'cave_recess'))


def torch_bracket(name, x, mats):
    box(name + '_post', (x, -2.6, 0.42), (0.28, 0.42, 0.84), mats['dark'])
    box(name + '_bowl', (x, -2.6, 0.92), (0.46, 0.5, 0.18), mats['ash'])


def cave(lod, mats):
    parts = [cave_recess(mats)]
    # The massif: a horseshoe of irregular boulders around the dark recess, a lintel and a ridge.
    boulders = [
        (-2.55, 0.9, 1.15, 1.40, (1.0, 0.85, 1.25), 0.3),
        (2.55, 0.9, 1.15, 1.40, (1.0, 0.85, 1.25), 0.6),
        (-4.25, 1.5, 1.55, 1.65, (1.0, 0.9, 1.0), 0.9),
        (4.25, 1.5, 1.55, 1.65, (1.0, 0.9, 1.0), 1.2),
        (-5.2, 2.6, 1.0, 1.35, (1.0, 0.85, 0.9), 1.5),
        (5.2, 2.6, 1.0, 1.35, (1.0, 0.85, 0.9), 1.8),
        (0, 1.15, 3.45, 1.75, (1.55, 0.8, 0.72), 2.1),
        (-2.9, 2.2, 3.4, 1.55, (1.0, 0.9, 0.9), 2.4),
        (2.9, 2.2, 3.4, 1.55, (1.0, 0.9, 0.9), 2.7),
        (0, 2.5, 4.85, 2.15, (1.55, 0.95, 0.85), 3.0),
        (-4.1, 3.1, 2.6, 1.55, (1.0, 0.95, 0.9), 3.3),
        (4.1, 3.1, 2.6, 1.55, (1.0, 0.95, 0.9), 3.6),
        (-2.7, 3.5, 4.15, 1.35, (1.0, 0.85, 0.85), 3.9),
        (2.7, 3.5, 4.15, 1.35, (1.0, 0.85, 0.85), 4.2),
        (0, 3.8, 5.35, 1.5, (1.35, 0.9, 0.8), 4.5),
    ]
    if lod == 0:
        for index, (x, y, z, radius, scale, seed) in enumerate(boulders):
            parts.append(ico(f'cave_boulder_{index}', (x, y, z), radius, mats['rock'], scale, 2, seed))
        # A lighter shoulder and a darker inner jamb break the single rock tone.
        parts.append(ico('cave_shoulder', (-5.6, 2.4, 2.3), 0.95, mats['light'], (0.9, 0.8, 1.0), 2, 5.1))
        parts.append(ico('cave_jamb', (2.1, 0.35, 1.35), 0.8, mats['dark'], (0.8, 0.7, 1.0), 2, 5.4))
        # Scree apron toward the path (game +Z is Blender -Y).
        for index in range(9):
            angle = (index / 9) * math.pi * 2
            radius = 3.2 + (index % 3) * 0.75
            x = math.cos(angle) * radius
            y = -2.1 + math.sin(angle) * 1.0
            parts.append(ico(f'cave_scree_{index}', (x, y, 0.18), 0.3 + (index % 3) * 0.12, mats['rock'], (1, 0.9, 0.75), 1, 6.0 + index))
    else:
        for index, (x, y, z, radius, scale, seed) in enumerate(boulders[::2]):
            parts.append(ico(f'cave_boulder_{index}', (x, y, z), radius, mats['rock'], scale, 1, seed))
        parts.append(ico('cave_lintel', (0, 1.15, 3.45), 1.75, mats['dark'], (1.55, 0.8, 0.72), 1, 2.1))
    # Front boulders overlap the recess edge: they turn the rectangular hole into a rough arch.
    front = [
        (0, -0.25, 3.55, 1.8, (1.55, 0.45, 0.45), 6.6),
        (-2.0, -0.25, 1.3, 1.0, (0.65, 0.45, 1.15), 6.9),
        (2.0, -0.25, 1.3, 1.0, (0.65, 0.45, 1.15), 7.2),
    ]
    for index, (x, y, z, radius, scale, seed) in enumerate(front):
        parts.append(ico(f'cave_front_{index}', (x, y, z), radius, mats['rock'], scale, 2 if lod == 0 else 1, seed))
    parts.append(box('cave_threshold', (0, -1.45, 0.08), (4.4, 1.3, 0.16), mats['dark']))
    torch_bracket('cave_torch_l', -2.4, mats)
    torch_bracket('cave_torch_r', 2.4, mats)
    return join(parts, 'tambotoco_cave')


def huaca(lod, mats):
    parts = [
        box('huaca_base', (0, 0, 0.2), (2.7, 2.5, 0.4), mats['dark']),
        cone('huaca_shaft', (0, 0, 2.6), 1.15, 0.58, 4.4, mats['rock'], 6 if lod == 0 else 5),
        box('huaca_cap', (0, 0, 4.95), (1.1, 0.95, 0.28), mats['dark']),
        box('huaca_niche', (0, -0.9, 2.25), (0.78, 0.22, 1.35), mats['mouth']),
    ]
    if lod == 0:
        parts += [
            box('huaca_lintel', (0, -1.02, 2.98), (1.25, 0.3, 0.22), mats['rock']),
            box('huaca_shelf', (0, -1.02, 1.5), (1.1, 0.3, 0.22), mats['rock']),
            box('huaca_jamb_l', (-0.58, -1.0, 2.25), (0.16, 0.3, 1.4), mats['rock']),
            box('huaca_jamb_r', (0.58, -1.0, 2.25), (0.16, 0.3, 1.4), mats['rock']),
            box('huaca_offering', (0, -1.35, 0.14), (1.4, 0.7, 0.28), mats['dark']),
            ico('huaca_flank_l', (-1.75, 0.35, 0.28), 0.45, mats['rock'], (1.05, 0.9, 0.7), 2, 8.1),
            ico('huaca_flank_r', (1.75, 0.3, 0.3), 0.5, mats['rock'], (1.05, 0.9, 0.75), 2, 8.4),
            box('huaca_top_stone', (0.1, 0.05, 5.16), (0.85, 0.8, 0.24), mats['rock'], (0.08, 0.04, 0.12)),
        ]
    return join(parts, 'tambotoco_huaca')


def join(parts, name):
    meshes = [obj for obj in parts if obj.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return obj


def export_glb(obj, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    saved = obj.location.copy()
    obj.location = (0, 0, 0)
    bpy.context.view_layer.update()
    for other in bpy.context.view_layer.objects:
        other.select_set(other == obj)
    bpy.context.view_layer.objects.active = obj
    kwargs = dict(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_animations=False,
        export_materials='EXPORT',
        export_normals=True,
        export_tangents=False,
    )
    try:
        bpy.ops.export_scene.gltf(**kwargs, export_vertex_color='ACTIVE')
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)
    obj.location = saved


def stats(obj):
    mesh = obj.data
    tris = sum(len(poly.vertices) - 2 for poly in mesh.polygons)
    used = sorted({mesh.materials[poly.material_index].name for poly in mesh.polygons})
    lo = Vector([min(v.co[i] for v in mesh.vertices) for i in range(3)])
    hi = Vector([max(v.co[i] for v in mesh.vertices) for i in range(3)])
    return {
        'triangles': tris,
        'draw_calls': len(used),
        'materials': used,
        'bounds': {
            'min': [round(c, 3) for c in lo],
            'max': [round(c, 3) for c in hi],
            'size': [round(c, 3) for c in hi - lo],
        },
    }


def main():
    args = parse_args()
    only = [a for a in args.only.split(',') if a] or ['cave', 'huaca']
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = build_materials()
    os.makedirs(GAME_DIR, exist_ok=True)
    failures = []
    for kind in only:
        build = cave if kind == 'cave' else huaca
        budget = BUDGET[kind]
        manifest = {
            'asset_id': f'tambotoco_{kind}',
            'source_scene': 'scenes/tambotoco_hero_kit.blend',
            'script': 'scripts/blender/build_tambotoco_hero_kit.py',
            'scale': 1.0,
            'up': 'Y',
            'front': '+Z',
            'pivot': 'footprint centre at ground level',
            'confidence': 'assumed',
            'sources': [
                'docs/historia/arquitectura.md',
                'docs/historia/campanas/tambotoco.md',
                'docs/design/tambotoco-art-pilot.md',
            ],
            'budget': {'LOD0': budget[0], 'LOD1': budget[1]},
            'reviewed': False,
            'lods': {},
        }
        for lod in (0, 1):
            obj = build(lod, mats)
            info = stats(obj)
            file = f'tambotoco_{kind}_lod{lod}.glb'
            path = os.path.join(EXPORT_DIR, file)
            export_glb(obj, path)
            shutil.copy2(path, os.path.join(GAME_DIR, file))
            info['file'] = file
            info['bytes'] = os.path.getsize(path)
            manifest['lods'][f'LOD{lod}'] = info
            if info['triangles'] > budget[lod]:
                failures.append(f'{kind} LOD{lod}: {info["triangles"]} > {budget[lod]}')
            print(
                f'HERO {kind} LOD{lod} tris={info["triangles"]} calls={info["draw_calls"]} '
                f'size={info["bounds"]["size"]} bytes={info["bytes"]}'
            )
        with open(os.path.join(EXPORT_DIR, f'tambotoco_{kind}_manifest.json'), 'w') as fh:
            json.dump(manifest, fh, indent=2)
            fh.write('\n')
    os.makedirs(os.path.dirname(SOURCE_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=SOURCE_BLEND, compress=True)
    if failures:
        raise SystemExit('over budget: ' + '; '.join(failures))


if __name__ == '__main__':
    main()
