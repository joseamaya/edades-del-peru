"""Render the m5-m9 campaign intro art from the mission-decor GLBs."""

import math
import os

import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'art-src', 'blender', 'mission-decor', 'renders')

SHOTS = [
    ('chanca_fortress', 'chanca', (0.34, 0.29, 0.22), (0.62, 0.70, 0.78)),
    ('chimu_compound', 'chimu', (0.60, 0.43, 0.25), (0.76, 0.70, 0.58)),
    ('colonial_church', 'colonial', (0.48, 0.43, 0.34), (0.62, 0.58, 0.52)),
    ('independence_chapel', 'independence', (0.48, 0.45, 0.30), (0.68, 0.72, 0.66)),
    ('arica_battery', 'arica', (0.58, 0.48, 0.32), (0.62, 0.68, 0.74)),
    ('cusco_inca', 'cusco', (0.45, 0.40, 0.30), (0.64, 0.68, 0.72)),
]


def material(name, color, roughness=0.9):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    mat.diffuse_color = (*color, 1)
    return mat


def setup_world(sky):
    world = bpy.data.worlds.new('World')
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (*sky, 1)
    bg.inputs['Strength'].default_value = 0.28
    world.color = sky


def setup_lights():
    bpy.ops.object.light_add(type='SUN', location=(8, -12, 18))
    sun = bpy.context.object
    sun.data.energy = 1.6
    sun.data.angle = math.radians(8)
    sun.rotation_euler = (math.radians(48), math.radians(8), math.radians(32))

    bpy.ops.object.light_add(type='AREA', location=(-10, -8, 10))
    fill = bpy.context.object
    fill.data.energy = 220
    fill.data.size = 14
    fill.rotation_euler = (math.radians(60), 0, math.radians(-35))


PALETTE = {
    'earth': (0.48, 0.27, 0.10),
    'stone': (0.28, 0.22, 0.16),
    'dark': (0.09, 0.07, 0.05),
    'adobe': (0.66, 0.42, 0.22),
    'plaster': (0.78, 0.70, 0.53),
    'tile': (0.55, 0.22, 0.11),
    'wood': (0.28, 0.15, 0.07),
    'canvas': (0.72, 0.64, 0.44),
    'sand': (0.72, 0.58, 0.36),
}


def recolor_model():
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        key = next((k for k in PALETTE if k in mat.name.lower()), None)
        if not key:
            continue
        bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf:
            bsdf.inputs['Base Color'].default_value = (*PALETTE[key], 1)
        mat.diffuse_color = (*PALETTE[key], 1)


def setup_ground(color, center, size):
    bpy.ops.mesh.primitive_plane_add(size=size * 5.0, location=(center.x, center.y, center.z - size * 0.04))
    plane = bpy.context.object
    plane.name = 'Intro ground'
    plane.data.materials.append(material('MAT-Intro-Ground', color, 1.0))


def setup_camera(center, size):
    bpy.ops.object.camera_add(location=(center.x + size * 1.05, center.y - size * 1.55, center.z + size * 0.72))
    cam = bpy.context.object
    cam.data.lens = 52
    target = Vector((center.x, center.y, center.z + size * 0.18))
    direction = target - cam.location
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam


def import_model(name):
    path = os.path.join(ROOT, 'src', 'assets', 'sites', name.split('_')[0], f'{name}_lod0.glb')
    if not os.path.exists(path):
        path = os.path.join(ROOT, 'src', 'assets', 'sites', 'independence', 'independence_chapel_lod0.glb')
    bpy.ops.import_scene.gltf(filepath=path)
    for obj in list(bpy.context.scene.objects):
        if obj.type == 'MESH' and obj.name == 'Cube' and max(obj.dimensions) <= 2.01:
            bpy.data.objects.remove(obj, do_unlink=True)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    points = []
    for obj in meshes:
        for corner in obj.bound_box:
            points.append(obj.matrix_world @ Vector(corner))
    lo = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    hi = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    center = (lo + hi) * 0.5
    size = max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z)
    return center, size


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, short, ground, sky in SHOTS:
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete(use_global=False)
        for block in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
            for item in list(block):
                if item.users == 0:
                    block.remove(item)
        setup_world(sky)
        center, size = import_model(name)
        recolor_model()
        setup_ground(ground, center, size)
        setup_lights()
        setup_camera(center, size)
        scene = bpy.context.scene
        scene.render.engine = 'BLENDER_WORKBENCH'
        scene.display.shading.light = 'STUDIO'
        scene.display.shading.color_type = 'MATERIAL'
        scene.display.shading.background_type = 'WORLD'
        scene.display.shading.show_shadows = True
        scene.display.shading.show_cavity = True
        scene.display.shading.cavity_type = 'BOTH'
        scene.render.resolution_x = 1600
        scene.render.resolution_y = 900
        scene.render.resolution_percentage = 100
        scene.render.image_settings.file_format = 'PNG'
        scene.render.filepath = os.path.join(OUT, f'{short}_hero.png')
        scene.view_settings.view_transform = 'Standard'
        scene.view_settings.look = 'None'
        bpy.ops.render.render(write_still=True)
        print(f'[intro] {scene.render.filepath}')


if __name__ == '__main__':
    main()
