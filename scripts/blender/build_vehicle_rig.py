"""Build the project-authored contemporary vehicle rig (motorcycle, AA, rockets).

Run with:
  blender --background --factory-startup --python scripts/blender/build_vehicle_rig.py
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
RENDERS = ROOT / 'review' / '327-vehicles'


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
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=direction.length, location=(start_v + end_v) / 2
    )
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
    arm.name = 'ARM-Vehicle'
    arm.data.name = 'ARM-Vehicle'
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
    # Motorcycle: two wheels, steering fork and a seated rider.
    bone('moto_wheel_rear', (0, -0.72, 0.36), (0, -0.72, 0.58), 'root')
    bone('moto_wheel_front', (0, 0.78, 0.36), (0, 0.78, 0.58), 'root')
    bone('moto_fork', (0, 0.50, 0.92), (0, 0.78, 0.38), 'root')
    bone('moto_rider_hip', (0, -0.34, 0.92), (0, -0.34, 1.04), 'root')
    bone('moto_rider_spine', (0, -0.34, 1.04), (0, -0.26, 1.34), 'moto_rider_hip')
    bone('moto_rider_head', (0, -0.26, 1.34), (0, -0.26, 1.56), 'moto_rider_spine')
    for side, sx in (('L', 1), ('R', -1)):
        bone(f'moto_rider_arm_{side}', (sx * 0.17, -0.26, 1.30), (sx * 0.22, 0.34, 1.10), 'moto_rider_spine')
        bone(f'moto_rider_thigh_{side}', (sx * 0.12, -0.34, 0.94), (sx * 0.18, 0.02, 0.62), 'moto_rider_hip')
        bone(f'moto_rider_calf_{side}', (sx * 0.18, 0.02, 0.62), (sx * 0.20, -0.22, 0.40), f'moto_rider_thigh_{side}')
    # Anti-air craft: trailer wheels, turret, twin barrels and a gunner.
    bone('aa_wheel_L', (0.66, -0.60, 0.32), (0.66, -0.60, 0.54), 'root')
    bone('aa_wheel_R', (-0.66, -0.60, 0.32), (-0.66, -0.60, 0.54), 'root')
    bone('aa_turret', (0, 0.0, 0.62), (0, 0.0, 0.86), 'root')
    bone('aa_barrel_L', (0.13, 0.20, 1.02), (0.13, 1.35, 1.02), 'aa_turret')
    bone('aa_barrel_R', (-0.13, 0.20, 1.02), (-0.13, 1.35, 1.02), 'aa_turret')
    bone('aa_gunner_hip', (0, -1.02, 0.30), (0, -1.02, 0.46), 'root')
    bone('aa_gunner_spine', (0, -1.02, 0.46), (0, -0.98, 0.82), 'aa_gunner_hip')
    bone('aa_gunner_head', (0, -0.98, 0.82), (0, -0.98, 1.04), 'aa_gunner_spine')
    for side, sx in (('L', 1), ('R', -1)):
        bone(f'aa_gunner_arm_{side}', (sx * 0.15, -0.98, 0.76), (sx * 0.20, -0.45, 0.88), 'aa_gunner_spine')
        bone(f'aa_gunner_thigh_{side}', (sx * 0.10, -1.02, 0.30), (sx * 0.13, -1.08, 0.10), 'aa_gunner_hip')
        bone(f'aa_gunner_calf_{side}', (sx * 0.13, -1.08, 0.10), (sx * 0.13, -1.10, -0.08), f'aa_gunner_thigh_{side}')
    # Rocket truck: four wheels, a cab and an elevating launcher.
    for side, sx in (('L', 1), ('R', -1)):
        for i, y in enumerate((0.72, -0.78)):
            bone(f'rocket_wheel_{side}{i}', (sx * 0.66, y, 0.32), (sx * 0.66, y, 0.54), 'root')
    bone('rocket_launcher', (0, -0.20, 1.00), (0, 0.55, 1.24), 'root')
    bone('rocket_gunner_hip', (0, -1.30, 0.30), (0, -1.30, 0.46), 'root')
    bone('rocket_gunner_spine', (0, -1.30, 0.46), (0, -1.26, 0.82), 'rocket_gunner_hip')
    bone('rocket_gunner_head', (0, -1.26, 0.82), (0, -1.26, 1.04), 'rocket_gunner_spine')
    for side, sx in (('L', 1), ('R', -1)):
        bone(f'rocket_gunner_arm_{side}', (sx * 0.15, -1.26, 0.76), (sx * 0.20, -0.85, 0.90), 'rocket_gunner_spine')
        bone(f'rocket_gunner_thigh_{side}', (sx * 0.10, -1.30, 0.30), (sx * 0.13, -1.36, 0.10), 'rocket_gunner_hip')
        bone(f'rocket_gunner_calf_{side}', (sx * 0.13, -1.36, 0.10), (sx * 0.13, -1.38, -0.08), f'rocket_gunner_thigh_{side}')
    bpy.ops.object.mode_set(mode='OBJECT')


def build_meshes():
    metal = material('MAT-Vehicle-Metal', (0.08, 0.10, 0.06, 1), 0.55, 0.35)
    rubber = material('MAT-Vehicle-Rubber', (0.02, 0.02, 0.02, 1), 0.92)
    glass = material('MAT-Vehicle-Glass', (0.03, 0.05, 0.06, 1), 0.18)
    uniform = material('MAT-Rider-Uniform', (0.10, 0.14, 0.07, 1), 0.85)
    helmet = material('MAT-Rider-Helmet', (0.07, 0.09, 0.05, 1), 0.7)
    skin = material('MAT-Rider-Skin', (0.48, 0.28, 0.17, 1), 0.85)
    warhead = material('MAT-Rocket-Warhead', (0.32, 0.08, 0.05, 1), 0.65, 0.2)

    # Motorcycle: wheels, frame, tank, seat, fork, bars, light, exhaust and rider.
    for side, x, y, bone in (('L', 0.0, -0.72, 'moto_wheel_rear'), ('R', 0.0, 0.78, 'moto_wheel_front')):
        cylinder(f'GEO-Moto-Wheel-{side}', bone, rubber, (x, y, 0.36), 0.36, 0.16, rot=(0, math.pi / 2, 0), vertices=16)
        cylinder(f'GEO-Moto-Hub-{side}', bone, metal, (x, y, 0.36), 0.10, 0.18, rot=(0, math.pi / 2, 0), vertices=10)
    box('GEO-Moto-Frame', 'root', metal, (0, 0.0, 0.62), (0.24, 1.05, 0.16), bevel=0.03)
    box('GEO-Moto-Tank', 'root', metal, (0, 0.12, 0.82), (0.30, 0.46, 0.22), bevel=0.05)
    box('GEO-Moto-Seat', 'root', rubber, (0, -0.32, 0.86), (0.28, 0.52, 0.10), bevel=0.03)
    cylinder_between('GEO-Moto-Fork-L', 'moto_fork', metal, (0.12, 0.52, 0.94), (0.12, 0.78, 0.38), 0.035, vertices=8)
    cylinder_between('GEO-Moto-Fork-R', 'moto_fork', metal, (-0.12, 0.52, 0.94), (-0.12, 0.78, 0.38), 0.035, vertices=8)
    cylinder('GEO-Moto-Handlebar', 'moto_fork', metal, (0, 0.50, 1.02), 0.03, 0.52, rot=(0, math.pi / 2, 0), vertices=8)
    cylinder('GEO-Moto-Headlight', 'moto_fork', glass, (0, 0.60, 0.92), 0.09, 0.06, rot=(math.pi / 2, 0, 0), vertices=12)
    cylinder('GEO-Moto-Exhaust', 'root', metal, (0.22, -0.18, 0.42), 0.045, 0.90, rot=(math.pi / 2, 0, 0), vertices=8)
    box('GEO-Moto-Rider-Torso', 'moto_rider_spine', uniform, (0, -0.30, 1.18), (0.30, 0.22, 0.40), bevel=0.04)
    sphere('GEO-Moto-Rider-Head', 'moto_rider_head', skin, (0, -0.26, 1.46), (0.14, 0.13, 0.16))
    cylinder('GEO-Moto-Rider-Helmet', 'moto_rider_head', helmet, (0, -0.26, 1.52), 0.17, 0.10, vertices=12)
    for side, sx in (('L', 1), ('R', -1)):
        box(f'GEO-Moto-Rider-Arm-{side}', f'moto_rider_arm_{side}', uniform, (sx * 0.20, 0.02, 1.20), (0.11, 0.13, 0.50), rot=(math.radians(62), 0, sx * math.radians(-8)), bevel=0.02)
        box(f'GEO-Moto-Rider-Thigh-{side}', f'moto_rider_thigh_{side}', uniform, (sx * 0.15, -0.16, 0.78), (0.14, 0.18, 0.42), rot=(math.radians(52), 0, 0), bevel=0.02)
        box(f'GEO-Moto-Rider-Calf-{side}', f'moto_rider_calf_{side}', uniform, (sx * 0.19, -0.10, 0.52), (0.12, 0.14, 0.34), bevel=0.02)
        box(f'GEO-Moto-Rider-Boot-{side}', f'moto_rider_calf_{side}', rubber, (sx * 0.19, -0.21, 0.38), (0.13, 0.24, 0.12), bevel=0.02)

    # Anti-air craft: trailer, turret, twin barrels and a gunner.
    box('GEO-AA-Base', 'root', metal, (0, -0.18, 0.24), (1.10, 1.75, 0.18), bevel=0.04)
    for side, x in (('L', 0.66), ('R', -0.66)):
        cylinder(f'GEO-AA-Wheel-{side}', f'aa_wheel_{side}', rubber, (x, -0.60, 0.32), 0.32, 0.14, rot=(0, math.pi / 2, 0), vertices=14)
    cylinder('GEO-AA-Turret', 'aa_turret', metal, (0, 0.0, 0.72), 0.36, 0.24, vertices=12)
    box('GEO-AA-Shield', 'aa_turret', metal, (0, 0.22, 0.92), (0.66, 0.10, 0.34), rot=(math.radians(-12), 0, 0), bevel=0.03)
    for side, x, bone in (('L', 0.13, 'aa_barrel_L'), ('R', -0.13, 'aa_barrel_R')):
        cylinder(f'GEO-AA-Barrel-{side}', bone, metal, (x, 0.70, 1.02), 0.055, 1.15, rot=(math.pi / 2, 0, 0), vertices=10)
        cylinder(f'GEO-AA-Muzzle-{side}', bone, rubber, (x, 1.30, 1.02), 0.07, 0.10, rot=(math.pi / 2, 0, 0), vertices=10)
    box('GEO-AA-Seat', 'root', rubber, (0, -0.88, 0.50), (0.30, 0.28, 0.08), bevel=0.02)
    box('GEO-AA-Gunner-Torso', 'aa_gunner_spine', uniform, (0, -1.00, 0.66), (0.30, 0.22, 0.40), bevel=0.04)
    sphere('GEO-AA-Gunner-Head', 'aa_gunner_head', skin, (0, -0.98, 0.94), (0.14, 0.13, 0.16))
    cylinder('GEO-AA-Gunner-Helmet', 'aa_gunner_head', helmet, (0, -0.98, 1.00), 0.17, 0.10, vertices=12)
    for side, sx in (('L', 1), ('R', -1)):
        box(f'GEO-AA-Gunner-Arm-{side}', f'aa_gunner_arm_{side}', uniform, (sx * 0.20, -0.72, 0.78), (0.11, 0.42, 0.12), rot=(math.radians(-18), 0, 0), bevel=0.02)
        box(f'GEO-AA-Gunner-Thigh-{side}', f'aa_gunner_thigh_{side}', uniform, (sx * 0.10, -1.04, 0.22), (0.13, 0.16, 0.28), bevel=0.02)
        box(f'GEO-AA-Gunner-Calf-{side}', f'aa_gunner_calf_{side}', uniform, (sx * 0.13, -1.10, 0.14), (0.11, 0.13, 0.26), bevel=0.02)
        box(f'GEO-AA-Gunner-Boot-{side}', f'aa_gunner_calf_{side}', rubber, (sx * 0.13, -1.16, 0.05), (0.12, 0.22, 0.10), bevel=0.02)

    # Rocket truck: chassis, cab, four wheels, six-tube launcher and a gunner.
    box('GEO-Rocket-Chassis', 'root', metal, (0, -0.10, 0.42), (1.16, 2.20, 0.26), bevel=0.04)
    box('GEO-Rocket-Cab', 'root', metal, (0, 0.78, 0.92), (1.10, 0.86, 0.82), bevel=0.06)
    box('GEO-Rocket-Window', 'root', glass, (0, 1.18, 1.02), (0.86, 0.04, 0.34), bevel=0.02)
    for side, sx in (('L', 1), ('R', -1)):
        for i, y in enumerate((0.72, -0.78)):
            cylinder(f'GEO-Rocket-Wheel-{side}{i}', f'rocket_wheel_{side}{i}', rubber, (sx * 0.66, y, 0.32), 0.32, 0.14, rot=(0, math.pi / 2, 0), vertices=14)
    box('GEO-Rocket-Launcher-Frame', 'rocket_launcher', metal, (0, -0.30, 1.06), (1.04, 0.72, 0.18), rot=(math.radians(-18), 0, 0), bevel=0.03)
    for row, z in enumerate((1.30, 1.62)):
        for col, x in enumerate((-0.30, 0.0, 0.30)):
            cylinder(f'GEO-Rocket-Tube-{row}{col}', 'rocket_launcher', metal, (x, -0.16, z), 0.11, 1.28, rot=(math.pi / 2, 0, 0), vertices=12)
            cylinder(f'GEO-Rocket-Warhead-{row}{col}', 'rocket_launcher', warhead, (x, 0.62, z), 0.10, 0.22, rot=(math.pi / 2, 0, 0), vertices=10)
    box('GEO-Rocket-Gunner-Torso', 'rocket_gunner_spine', uniform, (0, -1.28, 0.66), (0.30, 0.22, 0.40), bevel=0.04)
    sphere('GEO-Rocket-Gunner-Head', 'rocket_gunner_head', skin, (0, -1.26, 0.94), (0.14, 0.13, 0.16))
    cylinder('GEO-Rocket-Gunner-Helmet', 'rocket_gunner_head', helmet, (0, -1.26, 1.00), 0.17, 0.10, vertices=12)
    for side, sx in (('L', 1), ('R', -1)):
        box(f'GEO-Rocket-Gunner-Arm-{side}', f'rocket_gunner_arm_{side}', uniform, (sx * 0.20, -1.06, 0.78), (0.11, 0.38, 0.12), rot=(math.radians(-12), 0, 0), bevel=0.02)
        box(f'GEO-Rocket-Gunner-Thigh-{side}', f'rocket_gunner_thigh_{side}', uniform, (sx * 0.10, -1.32, 0.22), (0.13, 0.16, 0.28), bevel=0.02)
        box(f'GEO-Rocket-Gunner-Calf-{side}', f'rocket_gunner_calf_{side}', uniform, (sx * 0.13, -1.38, 0.14), (0.11, 0.13, 0.26), bevel=0.02)
        box(f'GEO-Rocket-Gunner-Boot-{side}', f'rocket_gunner_calf_{side}', rubber, (sx * 0.13, -1.44, 0.05), (0.12, 0.22, 0.10), bevel=0.02)


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
        (1, {'rot': {'aa_turret': (0, 0, 0), 'aa_barrel_L': (0, 0, 0), 'aa_barrel_R': (0, 0, 0), 'rocket_launcher': (0, 0, 0)}}),
        (30, {'rot': {'aa_turret': (0, 0.01, 0), 'aa_barrel_L': (-0.02, 0, 0), 'aa_barrel_R': (-0.02, 0, 0), 'rocket_launcher': (0.02, 0, 0)}}),
        (60, {'rot': {'aa_turret': (0, 0, 0), 'aa_barrel_L': (0, 0, 0), 'aa_barrel_R': (0, 0, 0), 'rocket_launcher': (0, 0, 0)}}),
    ])

    def walk_pose(phase):
        s = math.sin(phase)
        wheel = s * 0.6
        return {'rot': {
            'moto_wheel_rear': (wheel, 0, 0),
            'moto_wheel_front': (wheel, 0, 0),
            'aa_wheel_L': (wheel, 0, 0),
            'aa_wheel_R': (wheel, 0, 0),
            'rocket_wheel_L0': (wheel, 0, 0),
            'rocket_wheel_L1': (wheel, 0, 0),
            'rocket_wheel_R0': (wheel, 0, 0),
            'rocket_wheel_R1': (wheel, 0, 0),
            'moto_rider_hip': (0.04 * s, 0, 0),
            'moto_rider_spine': (0.03 * s, 0, 0),
            'aa_gunner_hip': (0.04 * s, 0, 0),
            'rocket_gunner_hip': (0.04 * s, 0, 0),
        }}

    key_action('Walk_Loop', 32, [
        (1, walk_pose(0)), (9, walk_pose(math.pi / 2)), (17, walk_pose(math.pi)),
        (25, walk_pose(3 * math.pi / 2)), (32, walk_pose(2 * math.pi)),
    ])

    key_action('Attack', 30, [
        (1, {'rot': {'aa_barrel_L': (0, 0, 0), 'aa_barrel_R': (0, 0, 0), 'rocket_launcher': (0, 0, 0), 'moto_rider_spine': (0, 0, 0)}}),
        (7, {'rot': {'aa_barrel_L': (-0.10, 0, 0), 'aa_barrel_R': (-0.10, 0, 0), 'rocket_launcher': (-0.12, 0, 0), 'moto_rider_spine': (0.10, 0, 0)}}),
        (12, {'loc': {'aa_barrel_L': (0, -0.16, 0), 'aa_barrel_R': (0, -0.16, 0), 'rocket_launcher': (0, -0.10, 0)}}),
        (22, {'rot': {'aa_barrel_L': (0.02, 0, 0), 'aa_barrel_R': (0.02, 0, 0), 'rocket_launcher': (0.02, 0, 0), 'moto_rider_spine': (-0.04, 0, 0)}}),
        (30, {'rot': {'aa_barrel_L': (0, 0, 0), 'aa_barrel_R': (0, 0, 0), 'rocket_launcher': (0, 0, 0), 'moto_rider_spine': (0, 0, 0)}}),
    ])

    key_action('Death', 40, [
        (1, {'rot': {}}),
        (18, {'rot': {'root': (0.15, 0, 0.25), 'aa_turret': (0, 0, 0.20)}}),
        (40, {'rot': {'root': (0.30, 0, 0.50), 'aa_turret': (0, 0, 0.40)}}),
    ])
    arm.animation_data.action = bpy.data.actions.get('Idle_Loop')


def export_asset():
    SCENES.mkdir(parents=True, exist_ok=True)
    EXPORTS.mkdir(parents=True, exist_ok=True)
    MODELS.mkdir(parents=True, exist_ok=True)
    RENDERS.mkdir(parents=True, exist_ok=True)
    glb = EXPORTS / 'vehicle_rig.glb'
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
    shutil.copyfile(glb, MODELS / 'vehicle_rig.glb')
    print('WROTE', glb, glb.stat().st_size, 'bytes')

    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    bpy.ops.object.camera_add(location=(3.6, 5.4, 2.6))
    cam = bpy.context.object
    cam.rotation_euler = (math.radians(68), 0, math.radians(150))
    scene.camera = cam
    blend = SCENES / 'vehicle_rig.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    for i, (loc, rot) in enumerate([
        ((3.6, 5.4, 2.6), (68, 0, 150)),
        ((0, 6.0, 2.2), (74, 0, 180)),
        ((5.4, 0.8, 2.2), (74, 0, 95)),
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
