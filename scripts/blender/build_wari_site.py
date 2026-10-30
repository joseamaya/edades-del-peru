"""Build the project-owned Wari campaign site (monumental-core synthesis)."""

import bpy
import math
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'art-src', 'blender', 'wari')
GLB = os.path.join(ROOT, 'src', 'assets', 'sites', 'wari')


def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def image(name, colorspace='sRGB'):
    path = os.path.join(ROOT, 'src', 'assets', 'textures', 'materials', name)
    if not os.path.exists(path):
        return None
    img = bpy.data.images.load(path, check_existing=True)
    img.colorspace_settings.name = colorspace
    img.pack()
    return img


def textured(name, diffuse, normal, roughness, tint=(1, 1, 1, 1), normal_strength=1.0, mix=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = tint
    bsdf.inputs['Roughness'].default_value = 0.88
    d = image(diffuse)
    if d:
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = d
        tex.location = (-520, 260)
        if mix < 1.0:
            blend = nodes.new('ShaderNodeMixRGB')
            blend.location = (-280, 260)
            blend.inputs['Fac'].default_value = mix
            blend.inputs['Color1'].default_value = tint
            links.new(tex.outputs['Color'], blend.inputs['Color2'])
            links.new(blend.outputs['Color'], bsdf.inputs['Base Color'])
        else:
            links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    n = image(normal, 'Non-Color')
    if n:
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = n
        tex.location = (-520, -20)
        nmap = nodes.new('ShaderNodeNormalMap')
        nmap.location = (-240, -20)
        nmap.inputs['Strength'].default_value = normal_strength
        links.new(tex.outputs['Color'], nmap.inputs['Color'])
        links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
    r = image(roughness, 'Non-Color')
    if r:
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = r
        tex.location = (-520, -260)
        links.new(tex.outputs['Color'], bsdf.inputs['Roughness'])
    return mat


def flat(name, color, roughness=0.85):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


def uv_tile(obj, tile=14.0):
    mesh = obj.data
    if not mesh.uv_layers:
        mesh.uv_layers.new()
    uv = mesh.uv_layers.active
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


def wall_run(prefix, x1, z1, x2, z2, height, thickness, mat):
    dx, dz = x2 - x1, z2 - z1
    length = math.hypot(dx, dz)
    yaw = math.atan2(dz, dx)
    return box(prefix, ((x1 + x2) / 2, (z1 + z2) / 2, height / 2), (length, thickness, height), mat, rot_z=yaw)


def d_temple(prefix, x, z, radius, height, mat):
    """D-shaped platform: semicircular arc plus a straight facade."""
    arc = [(x + math.cos(math.pi * i / 16) * radius, z - math.sin(math.pi * i / 16) * radius) for i in range(17)]
    verts = [(px, pz, 0.0) for px, pz in arc] + [(px, pz, height) for px, pz in arc]
    faces = [tuple(range(17)), tuple(range(17, 34))]
    faces += [(i, i + 1, 17 + i + 1, 17 + i) for i in range(16)]
    faces.append((16, 0, 17, 33))
    mesh = bpy.data.meshes.new(prefix)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(prefix, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    uv_tile(obj)
    return obj


def main():
    clear()
    os.makedirs(os.path.join(OUT, 'renders'), exist_ok=True)
    os.makedirs(GLB, exist_ok=True)

    stone = textured(
        'MAT_Wari_Cutstone',
        'wall_cutstone_diffuse.webp',
        'wall_cutstone_normal.webp',
        'wall_cutstone_roughness.webp',
        (0.38, 0.33, 0.26, 1),
        0.35,
        0.35,
    )
    plaster_white = flat('MAT_Wari_Plaster_White', (0.72, 0.67, 0.57), 0.92)
    plaster_red = flat('MAT_Wari_Plaster_Red', (0.44, 0.13, 0.09), 0.92)
    earth = flat('MAT_Wari_Earth', (0.4, 0.3, 0.2), 0.98)
    plaza = flat('MAT_Wari_Plaza', (0.5, 0.42, 0.3), 0.96)
    runtime_materials = {
        stone: flat('MAT_Wari_Cutstone_Runtime', (0.38, 0.33, 0.26), 0.92),
    }

    walls = []
    city = []

    # Diagnostic D-shaped temple at the centre of the ceremonial sector.
    city.append(d_temple('Wari_D_Temple', 0, 10, 30, 12, plaster_white))
    walls.append(wall_run('Wari_D_Facade', -30, 10, 30, 10, 9, 3.0, stone))
    city.append(box('Wari_D_Altar', (0, -2, 3), (12, 8, 6), plaster_red))
    city.append(box('Wari_D_RedBand', (0, 10, 1.2), (58, 1.2, 2.4), plaster_red))
    for i, x in enumerate((-20, 0, 20)):
        city.append(
            box(
                f'Wari_D_Mural_{i}',
                (x, -20.5, 4.0),
                (10, 0.5, 3.2),
                plaster_red if i % 2 == 0 else plaster_white,
            )
        )

    # Walled plaza and patios.
    city.append(box('Wari_Plaza', (0, -40, 0.4), (92, 52, 0.8), plaza))
    walls.append(wall_run('Wari_Plaza_W', -46, -66, -46, -14, 3.2, 2.2, stone))
    walls.append(wall_run('Wari_Plaza_E', 46, -66, 46, -14, 3.2, 2.2, stone))
    walls.append(wall_run('Wari_Plaza_S', -46, -66, 46, -66, 3.2, 2.2, stone))

    # Long galleries / storage ranges on the flanks.
    for i in range(4):
        x = -60 + i * 40
        city.append(box(f'Wari_Gallery_{i}', (x, 48, 2.2), (24, 12, 4.4), stone))
        walls.append(wall_run(f'Wari_Gallery_Wall_{i}', x - 12, 42, x + 12, 42, 2.0, 1.2, plaster_red))

    # Perimeter wall with a southern entrance gap.
    walls.append(wall_run('Wari_Perimeter_N', -90, 70, 90, 70, 3.4, 2.4, stone))
    walls.append(wall_run('Wari_Perimeter_W', -90, 70, -90, -76, 3.4, 2.4, stone))
    walls.append(wall_run('Wari_Perimeter_E', 90, 70, 90, -76, 3.4, 2.4, stone))
    walls.append(wall_run('Wari_Perimeter_SW', -90, -76, -16, -76, 3.4, 2.4, stone))
    walls.append(wall_run('Wari_Perimeter_SE', 16, -76, 90, -76, 3.4, 2.4, stone))

    # Red/white mural bands on the plaza facade.
    for i, x in enumerate((-32, -16, 0, 16, 32)):
        city.append(box(f'Wari_Mural_{i}', (x, -13, 4.0), (12, 0.6, 3.2), plaster_red if i % 2 == 0 else plaster_white))

    # Andenes / terraces on the eastern edge.
    for i in range(4):
        city.append(box(f'Wari_Terrace_{i}', (70, -52 + i * 16, 1.2 + i * 0.5), (34, 12, 2.4 + i), plaza))

    box('Wari_LOD0_Apron', (0, 0, -0.35), (220, 180, 0.7), plaza)
    box('Wari_LOD0_Terrain', (0, 0, -2.2), (520, 420, 4.0), earth)

    root = bpy.data.objects.new('Wari_LOD0_Root', None)
    bpy.context.scene.collection.objects.link(root)
    for obj in [o for o in bpy.data.objects if o.type == 'MESH']:
        obj.parent = root

    bpy.ops.object.light_add(type='SUN', location=(120, -180, 240))
    sun = bpy.context.object
    sun.data.energy = 3.6
    sun.data.angle = math.radians(3)
    sun.rotation_euler = (math.radians(36), math.radians(10), math.radians(34))

    bpy.ops.object.camera_add(location=(125, -195, 110))
    cam = bpy.context.object
    cam.data.lens = 40
    target = bpy.data.objects.new('Wari_Camera_Target', None)
    bpy.context.scene.collection.objects.link(target)
    target.location = (0, 0, 12)
    con = cam.constraints.new('TRACK_TO')
    con.target = target
    con.track_axis = 'TRACK_NEGATIVE_Z'
    con.up_axis = 'UP_Y'
    bpy.context.scene.camera = cam

    world = bpy.context.scene.world or bpy.data.worlds.new('Wari_World')
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (0.55, 0.63, 0.72, 1)
    bg.inputs['Strength'].default_value = 0.25

    scene = bpy.context.scene
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'AgX'
    try:
        scene.view_settings.look = 'AgX - Medium High Contrast'
    except TypeError:
        pass
    scene.view_settings.exposure = -0.7
    try:
        scene.render.engine = 'BLENDER_EEVEE_NEXT'
    except TypeError:
        pass
    scene.render.filepath = os.path.join(OUT, 'renders', 'wari_hero.png')
    bpy.ops.render.render(write_still=True)

    # Intro render uses image textures; the runtime GLB keeps flat materials.
    for obj in [o for o in bpy.data.objects if o.type == 'MESH']:
        for slot in obj.material_slots:
            const = runtime_materials.get(slot.material)
            if const:
                slot.material = const

    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'wari_site_master.blend'))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'wari_site_lod0.blend'))

    root.name = 'Wari_LOD1_Root'
    for obj in [o for o in bpy.data.objects if o.type == 'MESH']:
        if obj.name.startswith('Wari_D_Temple'):
            continue
        bpy.context.view_layer.objects.active = obj
        mod = obj.modifiers.new('LOD1_Decimate', 'DECIMATE')
        mod.ratio = 0.34
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.name = obj.name.replace('_LOD0_', '_LOD1_')
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'wari_site_lod1.blend'))

    def export(path):
        meshes = [o for o in bpy.data.objects if o.type == 'MESH']
        roots = [o for o in bpy.data.objects if o.type == 'EMPTY' and o.name.startswith('Wari_LOD')]
        bpy.ops.object.select_all(action='DESELECT')
        for obj in [*roots, *meshes]:
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
        print(f'WARI_EXPORT_OK {path} BYTES {os.path.getsize(path)}')

    export(os.path.join(GLB, 'wari_site_lod1.glb'))
    bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, 'wari_site_lod0.blend'))
    export(os.path.join(GLB, 'wari_site_lod0.glb'))


if __name__ == '__main__':
    main()
