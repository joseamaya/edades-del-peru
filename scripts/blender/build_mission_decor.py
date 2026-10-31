"""Build the dedicated mission-decor GLBs for m5-m9.

Each model is a project-owned, low-poly abstraction of a documented structure.
Run with Blender 5.2 in background:
  blender --background --python scripts/blender/build_mission_decor.py
"""

import math
import os
import sys

import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE = os.path.join(ROOT, 'art-src', 'blender', 'mission-decor')
ASSETS = os.path.join(ROOT, 'src', 'assets', 'sites')


def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def material(name, color, roughness=0.9):
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


def finish(obj, mat, name):
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def box(name, loc, size, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, mat, name)


def cylinder(name, loc, radius, depth, mat, vertices=8):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    return finish(bpy.context.object, mat, name)


def cone(name, loc, radius1, depth, mat, vertices=8):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=0, depth=depth, location=loc)
    return finish(bpy.context.object, mat, name)


def gable(name, loc, width, depth, height, mat):
    verts = [
        (-width / 2, -depth / 2, 0),
        (width / 2, -depth / 2, 0),
        (0, -depth / 2, height),
        (-width / 2, depth / 2, 0),
        (width / 2, depth / 2, 0),
        (0, depth / 2, height),
    ]
    faces = [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    return finish(obj, mat, name)


def join(name):
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
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


def export(name, detail):
    os.makedirs(SOURCE, exist_ok=True)
    os.makedirs(os.path.join(ASSETS, name.split('_')[0]), exist_ok=True)
    blend = os.path.join(SOURCE, f'{name}_lod{0 if detail else 1}.blend')
    glb = os.path.join(ASSETS, name.split('_')[0], f'{name}_lod{0 if detail else 1}.glb')
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    bpy.ops.export_scene.gltf(
        filepath=glb,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
    )
    print(f'[decor] {glb}')


def chanca(detail):
    stone = material('MAT-Stone_Chanca', (0.43, 0.38, 0.31))
    dark = material('MAT-Stone_Chanca_Dark', (0.27, 0.24, 0.20))
    earth = material('MAT-Earth_Chanca', (0.55, 0.42, 0.28))
    box('platform', (0, 0, 0.7), (15, 11, 1.4), earth)
    box('lower-wall', (0, -4.6, 2.2), (13, 0.8, 2.0), stone)
    box('side-wall-l', (-6.2, 0, 2.2), (0.8, 9, 2.0), stone)
    box('side-wall-r', (6.2, 0, 2.2), (0.8, 9, 2.0), stone)
    for x, z, r in [(-4.8, 3.4, 1.6), (0, 4.4, 1.8), (4.8, 3.4, 1.6)]:
        cylinder('tower', (x, z, 3.3), r, 4.0, stone, 8)
        cone('tower-roof', (x, z, 5.8), r * 1.1, 1.2, dark, 8)
    box('gate', (0, -4.6, 2.0), (2.2, 1.0, 2.6), dark)
    if detail:
        for x in (-3, 0, 3):
            box('step', (x, -5.5, 1.25), (1.4, 0.8, 0.5), stone)
        box('altar', (0, 1.0, 2.0), (2.2, 1.6, 1.2), dark)
    join('chanca_fortress')


def chimu(detail):
    adobe = material('MAT-Adobe_Chimu', (0.67, 0.48, 0.30))
    adobe_dark = material('MAT-Adobe_Chimu_Dark', (0.46, 0.31, 0.20))
    sand = material('MAT-Sand_Chimu', (0.74, 0.61, 0.42))
    box('platform', (0, 0, 0.6), (16, 12, 1.2), sand)
    box('north-wall', (0, 5.2, 2.0), (14, 0.7, 2.4), adobe)
    box('west-wall', (-7.2, 0, 2.0), (0.7, 10, 2.4), adobe)
    box('east-wall', (7.2, 0, 2.0), (0.7, 10, 2.4), adobe)
    box('south-wall', (0, -5.2, 2.0), (14, 0.7, 2.4), adobe)
    box('audience', (0, 1.6, 2.2), (7, 5, 2.8), adobe)
    box('upper', (0, 1.6, 4.1), (5, 3.4, 1.2), adobe_dark)
    box('room-l', (-4.8, 2.4, 1.8), (2.8, 3.2, 1.8), adobe)
    box('room-r', (4.8, 2.4, 1.8), (2.8, 3.2, 1.8), adobe)
    box('entry', (0, -5.2, 2.1), (2.4, 0.9, 2.8), adobe_dark)
    if detail:
        for x in (-5.2, -2.6, 2.6, 5.2):
            box('niche', (x, 5.55, 2.3), (0.8, 0.15, 0.9), adobe_dark)
        for x in (-2, 0, 2):
            box('step', (x, -6.0, 1.3), (1.2, 0.8, 0.4), sand)
    join('chimu_compound')


def church(detail, name='colonial_church'):
    plaster = material(f'MAT-Plaster_{name}', (0.82, 0.77, 0.65))
    stone = material(f'MAT-Stone_{name}', (0.47, 0.43, 0.37))
    tile = material(f'MAT-Tile_{name}', (0.52, 0.25, 0.16))
    wood = material(f'MAT-Wood_{name}', (0.35, 0.22, 0.13))
    box('plaza', (0, -2.0, 0.15), (14, 10, 0.3), stone)
    box('nave', (0, 1.5, 2.0), (6, 11, 4.0), plaster)
    gable('roof', (0, 1.5, 4.0), 7.2, 11.4, 2.2, tile)
    box('tower', (-4.4, 5.0, 3.5), (3.2, 3.2, 7.0), plaster)
    box('tower-top', (-4.4, 5.0, 7.1), (3.6, 3.6, 0.4), stone)
    cone('tower-roof', (-4.4, 5.0, 8.2), 2.1, 1.8, tile, 4)
    box('door', (0, -4.1, 1.5), (1.8, 0.2, 2.8), wood)
    if detail:
        box('cross', (0, 1.5, 6.4), (0.25, 0.25, 2.4), stone)
        box('cross-arm', (0, 1.5, 6.8), (1.4, 0.25, 0.25), stone)
        for x in (-4.4, 4.4):
            box('buttress', (x, 0.2, 1.7), (0.6, 1.2, 3.4), stone)
    join(name)


def independence(detail):
    church(detail, 'independence_chapel')
    # The chapel above is joined; add the campaign camp as separate geometry, then re-join.
    earth = material('MAT-Earth_Independencia', (0.50, 0.39, 0.25))
    stone = material('MAT-Stone_Independencia', (0.43, 0.40, 0.34))
    canvas = material('MAT-Canvas_Independencia', (0.72, 0.67, 0.52))
    bpy.ops.object.select_all(action='DESELECT')
    box('camp-wall', (0, -7.0, 0.9), (12, 0.5, 1.2), stone)
    box('tent-l', (-4.5, -4.5, 1.1), (3.0, 2.4, 1.8), canvas)
    box('tent-r', (4.5, -4.5, 1.1), (3.0, 2.4, 1.8), canvas)
    if detail:
        box('campfire', (0, -3.0, 0.25), (1.0, 1.0, 0.4), earth)
    join('independence_chapel')


def arica(detail):
    stone = material('MAT-Stone_Arica', (0.38, 0.35, 0.30))
    dark = material('MAT-Stone_Arica_Dark', (0.24, 0.22, 0.19))
    wood = material('MAT-Wood_Arica', (0.40, 0.27, 0.16))
    sand = material('MAT-Sand_Arica', (0.68, 0.58, 0.43))
    box('terrace', (0, 0, 0.5), (16, 11, 1.0), sand)
    box('battery', (0, 2.0, 1.8), (12, 2.2, 1.8), stone)
    box('battery-top', (0, 2.0, 2.8), (12.6, 2.6, 0.35), dark)
    for x in (-4.2, 0, 4.2):
        cylinder('gun', (x, 1.1, 2.4), 0.35, 2.4, dark, 8)
    box('warehouse', (-5.0, -2.5, 1.8), (5, 4, 2.8), wood)
    box('warehouse-roof', (-5.0, -2.5, 3.3), (5.6, 4.6, 0.3), dark)
    box('pier', (5.0, -3.0, 0.8), (2.5, 6, 0.4), wood)
    for z in (-5.4, -3.0, -0.6):
        cylinder('pier-post', (5.0, z, 0.5), 0.25, 2.0, wood, 6)
    if detail:
        for x in (-4.5, 4.5):
            cylinder('flagpole', (x, -4.5, 3.0), 0.12, 5.0, dark, 6)
        box('shed', (4.5, 3.0, 1.5), (3.0, 2.5, 2.0), wood)
    join('arica_battery')


MODELS = [
    ('chanca_fortress', chanca),
    ('chimu_compound', chimu),
    ('colonial_church', lambda detail: church(detail, 'colonial_church')),
    ('independence_chapel', independence),
    ('arica_battery', arica),
]


def main():
    for name, build in MODELS:
        for detail in (True, False):
            clear()
            build(detail)
            export(name, detail)


if __name__ == '__main__':
    main()
