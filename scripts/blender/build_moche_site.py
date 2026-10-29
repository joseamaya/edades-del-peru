"""Build the source-backed Moche campaign site.

The model is a representative RTS-scale reconstruction of the Huacas de Moche
(Sol, Luna and the plaza between them), not a survey. Sources:
docs/historia/civilizaciones/moche.md, docs/historia/arquitectura.md and
docs/historia/campanas/moche_recuay.md.
"""

import bpy
import math
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TEX = os.path.join(ROOT, 'src', 'assets', 'textures', 'materials')
OUT = os.path.join(ROOT, 'art-src', 'blender', 'moche')
GLB = os.path.join(ROOT, 'src', 'assets', 'sites', 'moche')


def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.cameras, bpy.data.lights):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def image(name, colorspace='sRGB'):
    path = os.path.join(TEX, name)
    if not os.path.exists(path):
        return None
    img = bpy.data.images.load(path, check_existing=True)
    img.colorspace_settings.name = colorspace
    img.pack()
    return img


def textured(name, diffuse, normal, roughness, tint=(1, 1, 1, 1)):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = tint
    bsdf.inputs['Roughness'].default_value = 0.86
    d = image(diffuse)
    if d:
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = d
        tex.location = (-520, 260)
        links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    n = image(normal, 'Non-Color')
    if n:
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = n
        tex.location = (-520, -20)
        nmap = nodes.new('ShaderNodeNormalMap')
        nmap.location = (-240, -20)
        links.new(tex.outputs['Color'], nmap.inputs['Color'])
        links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
    r = image(roughness, 'Non-Color')
    if r:
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = r
        tex.location = (-520, -260)
        links.new(tex.outputs['Color'], bsdf.inputs['Roughness'])
    return mat


def flat(name, color, roughness=0.8, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    return mat


def uv_tile(obj, tile=8.0):
    mesh = obj.data
    uv = mesh.uv_layers.active
    if not uv:
        return
    for poly in mesh.polygons:
        n = poly.normal
        if abs(n.x) >= abs(n.y) and abs(n.x) >= abs(n.z):
            su, sv = obj.dimensions.y / tile, obj.dimensions.z / tile
        elif abs(n.y) >= abs(n.z):
            su, sv = obj.dimensions.x / tile, obj.dimensions.z / tile
        else:
            su, sv = obj.dimensions.x / tile, obj.dimensions.y / tile
        for li in poly.loop_indices:
            loop_uv = uv.data[li].uv
            loop_uv.x *= su
            loop_uv.y *= sv


def box(name, loc, size, mat, rot_z=0.0, rot_x=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    obj.rotation_euler[2] = rot_z
    obj.rotation_euler[0] = rot_x
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.data.materials.append(mat)
    uv_tile(obj)
    return obj


def join(objs, name):
    if not objs:
        return None
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = name
    return joined


def stepped(prefix, base_w, base_d, tiers, tier_h, inset, loc, mat, top_mat=None):
    parts = []
    w, d = base_w, base_d
    z = 0.0
    for i in range(tiers):
        parts.append(box(f'{prefix}_{i}', (loc[0], loc[1], z + tier_h / 2), (w, d, tier_h), mat))
        z += tier_h
        w -= inset * 2
        d -= inset * 2
    if top_mat:
        parts.append(box(f'{prefix}_top', (loc[0], loc[1], z + 1.4), (w + 5, d + 5, 2.8), top_mat))
    return parts


def ramp(prefix, x, y, z, length, width, rise, mat):
    # A shallow inclined slab; the collision mesh ignores horizontal faces.
    angle = math.atan2(rise, length)
    obj = box(prefix, (x, y, z + rise / 2), (width, length, 1.2), mat, rot_x=angle)
    return obj


def wall_run(prefix, x1, z1, x2, z2, height, thickness, mat):
    dx, dz = x2 - x1, z2 - z1
    length = math.hypot(dx, dz)
    yaw = math.atan2(dz, dx)
    return box(prefix, ((x1 + x2) / 2, (z1 + z2) / 2, height / 2), (length, thickness, height), mat, rot_z=yaw)


def main():
    clear()
    os.makedirs(os.path.join(OUT, 'renders'), exist_ok=True)
    os.makedirs(GLB, exist_ok=True)

    adobe = textured('MAT_Moche_Adobe', 'wall_adobe_diffuse.webp', 'wall_adobe_normal.webp', 'wall_adobe_roughness.webp', (0.82, 0.55, 0.34, 1))
    plaster = flat('MAT_Moche_Plaster', (0.62, 0.34, 0.22), 0.92)
    sand = flat('MAT_Moche_Sand', (0.78, 0.62, 0.4), 0.95)
    stone = flat('MAT_Moche_Stone', (0.54, 0.47, 0.36), 0.9)
    earth = flat('MAT_Moche_Earth', (0.66, 0.52, 0.32), 1.0)
    cream = flat('MAT_Moche_Frieze_Cream', (0.86, 0.76, 0.55), 0.9)
    red = flat('MAT_Moche_Frieze_Red', (0.48, 0.12, 0.09), 0.9)
    black = flat('MAT_Moche_Frieze_Black', (0.09, 0.07, 0.06), 0.95)

    walls = []
    city = []

    # Huaca del Sol: broad stepped platform with a long access ramp.
    sol = stepped('Moche_Sol', 92, 62, 5, 6.2, 7.5, (-38, 0), adobe, plaster)
    city += sol
    city.append(ramp('Moche_Sol_Ramp', -38, -43, 0, 28, 12, 26, sand))
    for i in range(5):
        y = 30.5 - i * 12.0
        walls.append(wall_run(f'Moche_Sol_Frieze_{i}', -84 + i * 7.5, y, -84 + i * 7.5 + 84 - i * 15, y, 2.2, 1.2, red if i % 2 == 0 else cream))
    city.append(box('Moche_Sol_Summit', (-38, 0, 34.2), (24, 18, 2.4), sand))

    # Huaca de la Luna: lower, more compact platform with a plaza-facing ramp.
    luna = stepped('Moche_Luna', 66, 48, 4, 5.4, 7.0, (54, 8), plaster, adobe)
    city += luna
    city.append(ramp('Moche_Luna_Ramp', 54, -20, 0, 22, 10, 20, sand))
    for i in range(4):
        y = 31.5 - i * 9.0
        walls.append(wall_run(f'Moche_Luna_Frieze_{i}', 28 + i * 7, y, 28 + i * 7 + 66 - i * 14, y, 1.8, 1.0, cream if i % 2 == 0 else red))

    # Central plaza and low benches between the two huacas.
    city.append(box('Moche_Plaza', (8, -12, 0.35), (82, 54, 0.7), sand))
    city.append(box('Moche_Plaza_Altar', (8, -4, 2.0), (12, 8, 4.0), stone))
    for side in (-1, 1):
        walls.append(wall_run(f'Moche_Plaza_Wall_{side}', -32, side * 26, 48, side * 26, 1.8, 1.1, adobe))
    walls.append(wall_run('Moche_Plaza_Wall_W', -32, -26, -32, 26, 1.8, 1.1, adobe))
    walls.append(wall_run('Moche_Plaza_Wall_E', 48, -26, 48, 26, 1.8, 1.1, adobe))

    # Elite patios and workshops north of the plaza.
    for i in range(4):
        x = -8 + i * 22
        city.append(box(f'Moche_Patio_{i}', (x, 40, 1.4), (16, 12, 2.8), adobe))
        walls.append(wall_run(f'Moche_Patio_Wall_{i}', x - 8, 34, x + 8, 34, 1.6, 0.9, plaster))

    # A low perimeter wall frames the site without closing the southern approach.
    walls.append(wall_run('Moche_Perimeter_N', -92, 52, 92, 52, 2.0, 1.4, adobe))
    walls.append(wall_run('Moche_Perimeter_W', -92, 52, -92, -50, 2.0, 1.4, adobe))
    walls.append(wall_run('Moche_Perimeter_E', 92, 52, 92, -50, 2.0, 1.4, adobe))

    # Small painted frieze panels on the plaza side.
    for i, x in enumerate((-24, -8, 8, 24, 40)):
        city.append(box(f'Moche_Frieze_{i}', (x, -25.4, 3.0), (10, 0.5, 3.4), cream))
        city.append(box(f'Moche_Frieze_Red_{i}', (x, -25.7, 3.0), (8, 0.3, 1.0), red))
        city.append(box(f'Moche_Frieze_Black_{i}', (x, -25.8, 3.9), (8, 0.3, 0.5), black))

    join(walls, 'Moche_LOD0_Walls')
    join(city, 'Moche_LOD0_City')
    # Keep the huacas as named, separate meshes for readability and future cards.
    # The joined city above is the LOD1 merge source; LOD0 keeps its parts in the
    # master scene through the collection hierarchy.

    # Ground pad: a thin, site-owned apron; the game heightfield still owns terrain.
    box('Moche_LOD0_Apron', (0, 0, -0.35), (210, 140, 0.7), sand)
    box('Moche_LOD0_Terrain', (0, 0, -2.2), (520, 420, 4.0), earth)

    # Lighting and camera for the campaign briefing.
    bpy.ops.object.light_add(type='SUN', location=(120, -160, 220))
    sun = bpy.context.object
    sun.data.energy = 3.2
    sun.data.angle = math.radians(8)
    sun.rotation_euler = (math.radians(48), math.radians(8), math.radians(32))

    bpy.ops.object.camera_add(location=(150, -235, 145))
    cam = bpy.context.object
    cam.data.lens = 38
    target = bpy.data.objects.new('Moche_Camera_Target', None)
    bpy.context.scene.collection.objects.link(target)
    target.location = (-2, 0, 18)
    con = cam.constraints.new('TRACK_TO')
    con.target = target
    con.track_axis = 'TRACK_NEGATIVE_Z'
    con.up_axis = 'UP_Y'
    bpy.context.scene.camera = cam

    world = bpy.context.scene.world
    if world is None:
        world = bpy.data.worlds.new('Moche_World')
        bpy.context.scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (0.62, 0.68, 0.7, 1)
    bg.inputs['Strength'].default_value = 0.8

    scene = bpy.context.scene
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    try:
        scene.render.engine = 'BLENDER_EEVEE_NEXT'
    except TypeError:
        pass
    scene.render.filepath = os.path.join(OUT, 'renders', 'moche_hero.png')
    bpy.ops.render.render(write_still=True)

    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'moche_site_master.blend'))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'moche_site_lod0.blend'))

    # LOD1: decimate every mesh, then save and export.
    for obj in [o for o in bpy.data.objects if o.type == 'MESH']:
        bpy.context.view_layer.objects.active = obj
        mod = obj.modifiers.new('LOD1_Decimate', 'DECIMATE')
        mod.ratio = 0.32
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.name = obj.name.replace('_LOD0_', '_LOD1_')
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'moche_site_lod1.blend'))

    def export(path):
        meshes = [o for o in bpy.data.objects if o.type == 'MESH']
        bpy.ops.object.select_all(action='DESELECT')
        for obj in meshes:
            obj.hide_set(False)
            obj.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.export_scene.gltf(
            use_selection=True,
            filepath=path,
            export_format='GLB',
            export_apply=True,
            export_yup=True,
            export_cameras=False,
            export_lights=False,
            export_animations=False,
            export_materials='EXPORT',
            export_image_format='WEBP',
            export_image_quality=82,
            export_normals=True,
            export_texcoords=True,
            export_extras=True,
            export_draco_mesh_compression_enable=True,
            export_draco_mesh_compression_level=6,
            export_draco_position_quantization=14,
            export_draco_normal_quantization=10,
            export_draco_texcoord_quantization=12,
        )
        print(f'MOCHE_EXPORT_OK {path} BYTES {os.path.getsize(path)}')

    export(os.path.join(GLB, 'moche_site_lod1.glb'))

    # LOD0 is the master before decimation.
    bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, 'moche_site_lod0.blend'))
    export(os.path.join(GLB, 'moche_site_lod0.glb'))


if __name__ == '__main__':
    main()
