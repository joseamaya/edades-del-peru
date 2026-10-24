#!/usr/bin/env python3
"""Render hero and RTS review images for the Caral Pyramid Mayor asset.

Run from the repository root:
  blender --background art-src/blender/scenes/caral_pyramid_mayor.blend \
    --python scripts/blender/render_caral_pyramid_mayor.py
"""

import math
import os

import bpy
from mathutils import Vector

RENDER_DIR = os.path.abspath('review')
LOD0_COLLECTION = 'COL-Caral_PyramidMayor_LOD0'
GROUND_Y = -0.17
SKY = (0.62, 0.72, 0.82, 1.0)


def look_at(camera, target):
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()


def main():
    os.makedirs(RENDER_DIR, exist_ok=True)
    scene = bpy.context.scene
    lod0 = bpy.data.collections.get(LOD0_COLLECTION)
    if lod0 is None:
        raise RuntimeError(f'Missing collection: {LOD0_COLLECTION}')
    keep = set(lod0.all_objects)

    for obj in bpy.data.objects:
        if obj not in keep:
            obj.hide_render = True
            obj.hide_viewport = True

    world = bpy.data.worlds.new('World-Caral-PyramidMayor')
    world.use_nodes = True
    background = world.node_tree.nodes.get('Background')
    if background is not None:
        background.inputs['Color'].default_value = SKY
        background.inputs['Strength'].default_value = 0.7
    scene.world = world

    ground = bpy.data.meshes.new('Ground-Caral-PyramidMayor')
    ground.from_pydata(
        [(-80, -80, GROUND_Y), (80, -80, GROUND_Y), (80, 80, GROUND_Y), (-80, 80, GROUND_Y)],
        [],
        [(0, 1, 2, 3)],
    )
    ground.update()
    ground_obj = bpy.data.objects.new('GEO-Caral-PyramidMayor_Ground', ground)
    scene.collection.objects.link(ground_obj)
    ground_mat = bpy.data.materials.new('MAT-Ground-Review')
    ground_mat.use_nodes = True
    bsdf = next(n for n in ground_mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (0.55, 0.43, 0.28, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.95
    ground_obj.data.materials.append(ground_mat)
    ground_obj.hide_render = False

    sun_data = bpy.data.lights.new('LGT-Caral-PyramidMayor_Sun', 'SUN')
    sun_data.energy = 3.2
    sun_data.angle = math.radians(8)
    sun = bpy.data.objects.new('LGT-Caral-PyramidMayor_Sun', sun_data)
    sun.location = (24, -30, 42)
    look_at(sun, (0, 0, 0))
    scene.collection.objects.link(sun)

    fill_data = bpy.data.lights.new('LGT-Caral-PyramidMayor_Fill', 'AREA')
    fill_data.energy = 550
    fill_data.shape = 'DISK'
    fill_data.size = 28
    fill = bpy.data.objects.new('LGT-Caral-PyramidMayor_Fill', fill_data)
    fill.location = (-22, -18, 20)
    look_at(fill, (0, 0, 1))
    scene.collection.objects.link(fill)

    camera_data = bpy.data.cameras.new('CAM-Caral-PyramidMayor_Hero')
    camera_data.lens = 55
    camera = bpy.data.objects.new('CAM-Caral-PyramidMayor_Hero', camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera

    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    scene.view_settings.view_transform = 'AgX'

    hero_path = os.path.join(RENDER_DIR, 'caral_pyramid_mayor_hero.png')
    camera.location = (22, -26, 18)
    look_at(camera, (0, 0, 1.35))
    scene.render.filepath = hero_path
    bpy.ops.render.render(write_still=True)

    rts_path = os.path.join(RENDER_DIR, 'caral_pyramid_mayor_rts.png')
    camera.location = (20, -20, 22)
    look_at(camera, (0, 0, 0.75))
    camera.data.lens = 45
    scene.render.filepath = rts_path
    bpy.ops.render.render(write_still=True)

    print(f'WROTE {hero_path}')
    print(f'WROTE {rts_path}')


if __name__ == '__main__':
    main()
