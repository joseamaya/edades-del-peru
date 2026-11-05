"""Build the project-authored siege/tank rig (cannon, mortar, tank + crew).

Run with:
  blender --background --factory-startup --python scripts/blender/build_siege_rig.py
"""
from __future__ import annotations

import math
import shutil
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
EXPORTS = ROOT / 'art-src' / 'blender' / 'exports'
SCENES = ROOT / 'art-src' / 'blender' / 'scenes'
MODELS = ROOT / 'src' / 'assets' / 'models'
RENDERS = ROOT / 'review' / '241b'


def reset() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name: str, color: tuple[float, float, float, float], roughness: float = 0.9, metallic: float = 0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    mat.diffuse_color = color
    return mat


def bind_to_armature(mesh, bone: str, mat) -> None:
    if mesh.data.materials:
        mesh.data.materials[0] = mat
    else:
        mesh.data.materials.append(mat)
    group = mesh.vertex_groups.new(name=bone)
    group.add(list(range(len(mesh.data.vertices))), 1.0, 'REPLACE')
    mod = mesh.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    mesh.parent = arm
    mesh.matrix_parent_inverse.identity()
    mesh.location = (0, 0, 0)
    mesh.rotation_euler = (0, 0, 0)
    mesh.scale = (1, 1, 1)


def finalize_part(mesh, name: str, bone: str, mat) -> None:
    mesh.name = name
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bind_to_armature(mesh, bone, mat)


def box(name: str, bone: str, mat, loc, scale, rot=(0, 0, 0), bevel: float = 0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    obj.rotation_euler = rot
    finalize_part(obj, name, bone, mat)
    if bevel:
        mod = obj.modifiers.new('Bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
    return obj


def cylinder(name: str, bone: str, mat, loc, radius, depth, rot=(0, 0, 0), vertices: int = 12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    finalize_part(obj, name, bone, mat)
    return obj


def cylinder_between(name: str, bone: str, mat, start, end, radius, vertices: int = 8):
    start_v = Vector(start)
    end_v = Vector(end)
    direction = end_v - start_v
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=(start_v + end_v) / 2)
    obj = bpy.context.object
    obj.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
    finalize_part(obj, name, bone, mat)
    return obj


def sphere(name: str, bone: str, mat, loc, scale, segments: int = 12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=max(6, segments // 2), location=loc)
    obj = bpy.context.object
    obj.scale = scale
    finalize_part(obj, name, bone, mat)
    return obj


def build_bones():
    global arm
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    arm = bpy.context.object
    arm.name = 'ARM-Siege'
    arm.data.name = 'ARM-Siege'
    eb = arm.data.edit_bones
    eb.remove(eb[0])

    def bone(name, head, tail, parent=None, connect=False):
        b = eb.new(name)
        b.head = head
        b.tail = tail
        if parent:
            b.parent = eb[parent]
            b.use_connect = connect

    bone('root', (0, 0, 0), (0, 0.2, 0))
    bone('cannon_barrel', (0, 0.15, 0.9), (0, 1.25, 0.9), 'root')
    bone('mortar_tube', (0, 0.02, 0.25), (0, 0.45, 1.20), 'root')
    bone('turret', (0, -0.10, 1.22), (0, -0.10, 1.48), 'root')
    bone('tank_gun', (0, 0.20, 1.34), (0, 1.55, 1.34), 'turret')
    for side, x in (('L', 0.62), ('R', -0.62)):
        bone(f'cannon_wheel_{side}', (x, 0.0, 0.45), (x, 0.0, 0.72), 'root')
        bone(f'tank_wheel_{side}', (x, -0.15, 0.35), (x, -0.15, 0.62), 'root')
    for crew, x in (('g', 0.62), ('l', -0.62)):
        bone(f'crew_{crew}_hip', (x, -0.62, 0.48), (x, -0.62, 0.70), 'root')
        bone(f'crew_{crew}_spine', (x, -0.62, 0.70), (x, -0.62, 1.03), f'crew_{crew}_hip')
        bone(f'crew_{crew}_head', (x, -0.62, 1.03), (x, -0.60, 1.27), f'crew_{crew}_spine')
        for side, sx in (('L', 1), ('R', -1)):
            bone(f'crew_{crew}_arm_{side}', (x + sx * 0.16, -0.64, 1.00), (x + sx * 0.23, -0.50, 0.78), f'crew_{crew}_spine')
            bone(f'crew_{crew}_thigh_{side}', (x + sx * 0.10, -0.62, 0.49), (x + sx * 0.13, -0.50, 0.24), f'crew_{crew}_hip')
            bone(f'crew_{crew}_calf_{side}', (x + sx * 0.13, -0.50, 0.24), (x + sx * 0.13, -0.40, 0.04), f'crew_{crew}_thigh_{side}')
    bpy.ops.object.mode_set(mode='OBJECT')


def build_meshes():
    wood = material('MAT-Siege-Wood', (0.18, 0.10, 0.045, 1), 0.92)
    metal = material('MAT-Siege-Metal', (0.32, 0.34, 0.36, 1), 0.45, 0.55)
    dark = material('MAT-Siege-Dark', (0.06, 0.055, 0.05, 1), 0.8, 0.4)
    cloth = material('MAT-Crew-Coat', (0.10, 0.18, 0.34, 1), 0.85)
    trim = material('MAT-Crew-Trim', (0.62, 0.08, 0.065, 1), 0.75)
    trousers = material('MAT-Crew-Trousers', (0.10, 0.11, 0.13, 1), 0.9)
    skin = material('MAT-Crew-Skin', (0.48, 0.28, 0.17, 1), 0.85)
    leather = material('MAT-Siege-Leather', (0.12, 0.075, 0.04, 1), 0.9)
    tank = material('MAT-Tank-Hull', (0.20, 0.24, 0.16, 1), 0.75, 0.2)
    track = material('MAT-Tank-Track', (0.08, 0.08, 0.08, 1), 0.8, 0.45)

    # Cannon group: carriage, wheels, barrel, trail and limber.
    box('GEO-Cannon-Carriage', 'root', wood, (0, 0.15, 0.47), (0.55, 1.20, 0.30), bevel=0.04)
    box('GEO-Cannon-Trail', 'root', wood, (0, -0.95, 0.32), (0.28, 0.75, 0.18), rot=(math.radians(-8), 0, 0), bevel=0.03)
    for side, x in (('L', 0.62), ('R', -0.62)):
        cylinder(f'GEO-Cannon-Wheel-{side}', f'cannon_wheel_{side}', dark, (x, 0.0, 0.45), 0.40, 0.12, rot=(0, math.pi / 2, 0), vertices=16)
        cylinder(f'GEO-Cannon-Hub-{side}', f'cannon_wheel_{side}', metal, (x, 0.0, 0.45), 0.10, 0.16, rot=(0, math.pi / 2, 0), vertices=10)
    cylinder('GEO-Cannon-Barrel', 'cannon_barrel', metal, (0, 0.78, 0.90), 0.11, 1.40, rot=(math.pi / 2, 0, 0), vertices=12)
    cylinder('GEO-Cannon-Muzzle', 'cannon_barrel', dark, (0, 1.48, 0.90), 0.14, 0.16, rot=(math.pi / 2, 0, 0), vertices=12)
    cylinder('GEO-Cannon-Breech', 'cannon_barrel', metal, (0, 0.08, 0.90), 0.15, 0.20, rot=(math.pi / 2, 0, 0), vertices=10)
    box('GEO-Cannon-Axle', 'root', metal, (0, 0.0, 0.45), (1.40, 0.10, 0.09), bevel=0.02)

    # Mortar group: base plate, tube and bipod.
    cylinder('GEO-Mortar-Base', 'root', dark, (0, -0.10, 0.12), 0.55, 0.16, vertices=16)
    cylinder_between('GEO-Mortar-Tube', 'mortar_tube', metal, (0, 0.05, 0.18), (0, 0.48, 1.15), 0.16, vertices=14)
    cylinder('GEO-Mortar-Muzzle', 'mortar_tube', dark, (0, 0.50, 1.20), 0.18, 0.14, rot=(math.radians(-24), 0, 0), vertices=12)
    for side, sx in (('L', 1), ('R', -1)):
        cylinder_between(f'GEO-Mortar-Leg-{side}', 'root', metal, (sx * 0.40, -0.15, 0.10), (sx * 0.14, 0.10, 0.55), 0.045, vertices=6)

    # Tank group: hull, tracks, turret and gun.
    box('GEO-Tank-Hull', 'root', tank, (0, 0.0, 0.82), (1.40, 2.40, 0.64), bevel=0.08)
    box('GEO-Tank-Glacis', 'root', tank, (0, 1.12, 0.86), (1.25, 0.30, 0.52), rot=(math.radians(-20), 0, 0), bevel=0.04)
    for side, x in (('L', 0.72), ('R', -0.72)):
        box(f'GEO-Tank-Track-{side}', 'root', track, (x, 0.0, 0.36), (0.34, 2.55, 0.46), bevel=0.04)
        for i in range(4):
            cylinder(f'GEO-Tank-Wheel-{side}-{i}', f'tank_wheel_{side}', dark, (x, -0.90 + i * 0.60, 0.34), 0.21, 0.12, rot=(0, math.pi / 2, 0), vertices=10)
    cylinder('GEO-Tank-Turret', 'turret', tank, (0, -0.10, 1.34), 0.55, 0.42, vertices=12)
    box('GEO-Tank-Turret-Box', 'turret', tank, (0, -0.10, 1.50), (0.80, 0.76, 0.28), bevel=0.05)
    cylinder('GEO-Tank-Gun', 'tank_gun', metal, (0, 0.92, 1.35), 0.10, 1.40, rot=(math.pi / 2, 0, 0), vertices=12)
    cylinder('GEO-Tank-Muzzle', 'tank_gun', dark, (0, 1.62, 1.35), 0.13, 0.14, rot=(math.pi / 2, 0, 0), vertices=10)
    cylinder('GEO-Tank-Cupola', 'turret', tank, (0, -0.34, 1.76), 0.20, 0.12, vertices=10)
    cylinder('GEO-Tank-Antenna', 'turret', metal, (0, -0.46, 1.95), 0.015, 0.55, vertices=6)

    # Two crew figures: gunner and loader. Shared across cannon/mortar variants.
    for crew, x, role in (('g', 0.62, 'gunner'), ('l', -0.62, 'loader')):
        box(f'GEO-Crew-{crew}-Torso', f'crew_{crew}_spine', cloth, (x, -0.62, 0.87), (0.34, 0.24, 0.46), bevel=0.04)
        box(f'GEO-Crew-{crew}-Belt', f'crew_{crew}_hip', leather, (x, -0.62, 0.68), (0.35, 0.26, 0.06), bevel=0.01)
        sphere(f'GEO-Crew-{crew}-Head', f'crew_{crew}_head', skin, (x, -0.62, 1.15), (0.15, 0.14, 0.18))
        cylinder(f'GEO-Crew-{crew}-Hat', f'crew_{crew}_head', dark, (x, -0.62, 1.29), 0.19, 0.07, vertices=10)
        box(f'GEO-Crew-{crew}-Collar', f'crew_{crew}_spine', trim, (x, -0.62, 1.06), (0.30, 0.02, 0.04), bevel=0.01)
        for side, sx in (('L', 1), ('R', -1)):
            box(f'GEO-Crew-{crew}-Arm-{side}', f'crew_{crew}_arm_{side}', cloth, (x + sx * 0.24, -0.57, 0.87), (0.13, 0.15, 0.38), rot=(math.radians(-18), 0, sx * math.radians(-8)), bevel=0.02)
            box(f'GEO-Crew-{crew}-Hand-{side}', f'crew_{crew}_arm_{side}', skin, (x + sx * 0.34, -0.45, 0.69), (0.08, 0.10, 0.10), bevel=0.02)
            box(f'GEO-Crew-{crew}-Thigh-{side}', f'crew_{crew}_thigh_{side}', trousers, (x + sx * 0.10, -0.54, 0.38), (0.16, 0.20, 0.34), rot=(math.radians(18), 0, 0), bevel=0.02)
            box(f'GEO-Crew-{crew}-Calf-{side}', f'crew_{crew}_calf_{side}', trousers, (x + sx * 0.13, -0.44, 0.14), (0.12, 0.14, 0.28), bevel=0.02)
            box(f'GEO-Crew-{crew}-Boot-{side}', f'crew_{crew}_calf_{side}', leather, (x + sx * 0.13, -0.35, 0.03), (0.13, 0.24, 0.10), bevel=0.02)
        if role == 'gunner':
            cylinder(f'GEO-Crew-{crew}-Rammer', f'crew_{crew}_arm_R', wood, (x - 0.34, -0.42, 0.75), 0.035, 1.05, rot=(math.radians(62), 0, 0), vertices=6)


def merge_groups():
    def group_of(name: str) -> str:
        return name.split('-')[1] if name.startswith('GEO-') else 'Misc'

    groups = {}
    for obj in list(bpy.data.objects):
        if obj.type != 'MESH' or obj.parent != arm:
            continue
        material_name = obj.data.materials[0].name if obj.data.materials else 'MAT-Unmaterial'
        groups.setdefault((group_of(obj.name), material_name), []).append(obj)
    for (group, material_name), objects in groups.items():
        if len(objects) < 2:
            continue
        for obj in objects:
            for mod in list(obj.modifiers):
                if mod.type == 'ARMATURE':
                    continue
                bpy.context.view_layer.objects.active = obj
                bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        objects[0].name = f'GEO-{group}-{material_name.removeprefix("MAT-")}'


def build_actions():
    arm.animation_data_create()

    def clear_pose():
        for pb in arm.pose.bones:
            pb.rotation_mode = 'XYZ'
            pb.rotation_euler = (0, 0, 0)
            pb.location = (0, 0, 0)
            pb.scale = (1, 1, 1)

    def key_action(name, frames, poses):
        action = bpy.data.actions.new(name)
        action.use_fake_user = True
        arm.animation_data.action = action
        action.frame_range = (1, frames)
        for frame, pose in poses:
            bpy.context.scene.frame_set(frame)
            clear_pose()
            for bone_name, rot in pose.get('rot', {}).items():
                pb = arm.pose.bones.get(bone_name)
                if pb:
                    pb.rotation_euler = rot
            for bone_name, loc in pose.get('loc', {}).items():
                pb = arm.pose.bones.get(bone_name)
                if pb:
                    pb.location = loc
            for pb in arm.pose.bones:
                pb.keyframe_insert('rotation_euler', frame=frame, group=pb.name)
                pb.keyframe_insert('location', frame=frame, group=pb.name)
        arm.animation_data.action = None
        return action

    key_action('Idle_Loop', 60, [
        (1, {'rot': {'turret': (0, 0, 0), 'cannon_barrel': (0, 0, 0), 'mortar_tube': (0, 0, 0)}}),
        (30, {'rot': {'turret': (0, 0.01, 0), 'cannon_barrel': (-0.02, 0, 0), 'mortar_tube': (0.02, 0, 0)}}),
        (60, {'rot': {'turret': (0, 0, 0), 'cannon_barrel': (0, 0, 0), 'mortar_tube': (0, 0, 0)}}),
    ])

    def walk_pose(phase):
        s = math.sin(phase)
        c = math.cos(phase)
        return {'rot': {
            'cannon_wheel_L': (s * 0.6, 0, 0),
            'cannon_wheel_R': (s * 0.6, 0, 0),
            'tank_wheel_L': (s * 0.6, 0, 0),
            'tank_wheel_R': (s * 0.6, 0, 0),
            'crew_g_hip': (0.04 * s, 0, 0),
            'crew_l_hip': (-0.04 * s, 0, 0),
            'crew_g_thigh_L': (0.35 * s, 0, 0),
            'crew_g_thigh_R': (-0.35 * s, 0, 0),
            'crew_l_thigh_L': (-0.35 * s, 0, 0),
            'crew_l_thigh_R': (0.35 * s, 0, 0),
            'turret': (0, 0.01 * c, 0),
        }}
    key_action('Walk_Loop', 32, [
        (1, walk_pose(0)), (9, walk_pose(math.pi / 2)), (17, walk_pose(math.pi)),
        (25, walk_pose(3 * math.pi / 2)), (32, walk_pose(2 * math.pi)),
    ])

    key_action('Attack', 30, [
        (1, {'rot': {'cannon_barrel': (0, 0, 0), 'mortar_tube': (0, 0, 0), 'tank_gun': (0, 0, 0), 'crew_g_arm_R': (0, 0, 0), 'crew_l_arm_R': (0, 0, 0)}}),
        (7, {'rot': {'cannon_barrel': (-0.10, 0, 0), 'mortar_tube': (-0.10, 0, 0), 'tank_gun': (-0.08, 0, 0), 'crew_g_arm_R': (-1.2, 0, 0), 'crew_l_arm_R': (-1.0, 0, 0)}}),
        (12, {'loc': {'cannon_barrel': (0, -0.16, 0), 'mortar_tube': (0, -0.10, 0), 'tank_gun': (0, -0.18, 0)}, 'rot': {'crew_g_arm_R': (-0.2, 0, 0), 'crew_l_arm_R': (-0.2, 0, 0)}}),
        (22, {'rot': {'cannon_barrel': (0.02, 0, 0), 'mortar_tube': (0.02, 0, 0), 'tank_gun': (0.02, 0, 0), 'crew_g_arm_R': (0.1, 0, 0), 'crew_l_arm_R': (0.1, 0, 0)}}),
        (30, {'rot': {'cannon_barrel': (0, 0, 0), 'mortar_tube': (0, 0, 0), 'tank_gun': (0, 0, 0)}}),
    ])

    key_action('Death', 40, [
        (1, {'rot': {}}),
        (18, {'rot': {'root': (0.15, 0, 0.25), 'turret': (0, 0, 0.20), 'tank_gun': (0.10, 0, 0)}}),
        (40, {'rot': {'root': (0.30, 0, 0.50), 'turret': (0, 0, 0.40), 'tank_gun': (0.20, 0, 0)}}),
    ])
    arm.animation_data.action = bpy.data.actions.get('Idle_Loop')


def export_asset():
    SCENES.mkdir(parents=True, exist_ok=True)
    EXPORTS.mkdir(parents=True, exist_ok=True)
    MODELS.mkdir(parents=True, exist_ok=True)
    RENDERS.mkdir(parents=True, exist_ok=True)
    blend = SCENES / 'siege_rig.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    glb = EXPORTS / 'siege_rig.glb'
    bpy.ops.export_scene.gltf(
        filepath=str(glb),
        export_format='GLB',
        export_apply=False,
        export_yup=True,
        export_animations=True,
        export_animation_mode='ACTIONS',
        export_optimize_animation_size=False,
        export_materials='EXPORT',
        export_normals=True,
        export_tangents=False,
        export_skins=True,
    )
    shutil.copyfile(glb, MODELS / 'siege_rig.glb')
    print('WROTE', glb, glb.stat().st_size, 'bytes')

    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    bpy.ops.object.camera_add(location=(3.6, 4.6, 2.3))
    cam = bpy.context.object
    cam.rotation_euler = (math.radians(70), 0, math.radians(145))
    scene.camera = cam
    for i, (loc, rot) in enumerate([
        ((3.6, 4.6, 2.3), (70, 0, 145)),
        ((0, 5.2, 1.8), (76, 0, 180)),
        ((5.0, 0.6, 1.9), (76, 0, 95)),
    ]):
        cam.location = loc
        cam.rotation_euler = tuple(math.radians(v) for v in rot)
        scene.render.filepath = str(RENDERS / f'view-{i}.png')
        bpy.ops.render.render(write_still=True)


reset()
build_bones()
build_meshes()
merge_groups()
build_actions()
export_asset()
print('DONE')
