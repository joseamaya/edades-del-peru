"""Build the project-authored mounted cavalry rig (horse + rider).

Run with:
  blender --background --factory-startup --python scripts/blender/build_mounted_rig.py

The source stays in art-src/blender/scenes/mounted_rig.blend; the exported GLB
is copied to src/assets/models/mounted_rig.glb for the game registry.
"""
from __future__ import annotations

import math
import os
import shutil
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
EXPORTS = ROOT / 'art-src' / 'blender' / 'exports'
SCENES = ROOT / 'art-src' / 'blender' / 'scenes'
MODELS = ROOT / 'src' / 'assets' / 'models'
RENDERS = ROOT / 'review' / '241a'


def reset() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for collection in list(bpy.data.collections):
        if collection.name != 'Collection':
            bpy.data.collections.remove(collection)


def material(name: str, color: tuple[float, float, float, float], roughness: float = 0.9, metallic: float = 0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    mat.diffuse_color = color
    return mat


def items(mesh, bone: str, mat) -> None:
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


def finish(mesh, name: str, bone: str, mat) -> None:
    mesh.name = name
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    items(mesh, bone, mat)


def box(name: str, bone: str, mat, loc, scale, rot=(0, 0, 0), bevel: float = 0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    obj.rotation_euler = rot
    finish(obj, name, bone, mat)
    if bevel:
        mod = obj.modifiers.new('Bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
    return obj


def cylinder(name: str, bone: str, mat, loc, radius, depth, rot=(0, 0, 0), vertices: int = 12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    finish(obj, name, bone, mat)
    return obj


def cylinder_between(name: str, bone: str, mat, start, end, radius, vertices: int = 8):
    start_v = Vector(start)
    end_v = Vector(end)
    direction = end_v - start_v
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=(start_v + end_v) / 2)
    obj = bpy.context.object
    obj.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
    finish(obj, name, bone, mat)
    return obj


def sphere(name: str, bone: str, mat, loc, scale, segments: int = 12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=max(6, segments // 2), location=loc)
    obj = bpy.context.object
    obj.scale = scale
    finish(obj, name, bone, mat)
    return obj


reset()
bpy.context.scene.render.engine = 'BLENDER_WORKBENCH'
bpy.context.scene.render.resolution_x = 640
bpy.context.scene.render.resolution_y = 640

horse = material('MAT-Horse', (0.34, 0.20, 0.10, 1), 0.92)
horse_dark = material('MAT-Horse-Dark', (0.10, 0.065, 0.035, 1), 0.95)
horse_light = material('MAT-Horse-Muzzle', (0.45, 0.30, 0.18, 1), 0.9)
coat = material('MAT-Rider-Coat', (0.10, 0.18, 0.34, 1), 0.82)
trim = material('MAT-Rider-Trim', (0.62, 0.08, 0.065, 1), 0.75)
trousers = material('MAT-Rider-Trousers', (0.10, 0.11, 0.13, 1), 0.9)
skin = material('MAT-Rider-Skin', (0.48, 0.28, 0.17, 1), 0.85)
metal = material('MAT-Metal', (0.42, 0.44, 0.46, 1), 0.35, 0.78)
leather = material('MAT-Leather', (0.12, 0.075, 0.04, 1), 0.9)
saddle_cloth = material('MAT-Saddle-Cloth', (0.24, 0.10, 0.08, 1), 0.92)
hat_fabric = material('MAT-Rider-Hat', (0.10, 0.11, 0.13, 1), 0.9)

# ---------------------------------------------------------------------------
# Armature: horse and rider share one skeleton so a single mixer drives both.
# ---------------------------------------------------------------------------
bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
arm = bpy.context.object
arm.name = 'ARM-Mounted'
arm.data.name = 'ARM-Mounted'
eb = arm.data.edit_bones
eb.remove(eb[0])

def bone(name, head, tail, parent=None, connect=False):
    b = eb.new(name)
    b.head = head
    b.tail = tail
    if parent:
        b.parent = eb[parent]
        b.use_connect = connect
    return b

bone('root', (0, 0, 0), (0, 0.15, 0))
bone('body', (0, 0, 0.92), (0, 0.65, 0.92), 'root')
bone('neck', (0, 0.58, 1.02), (0, 0.92, 1.36), 'body')
bone('head', (0, 0.92, 1.36), (0, 1.26, 1.30), 'neck')
bone('tail', (0, -0.74, 1.05), (0, -1.10, 0.85), 'body')
for side, x in (('L', 0.23), ('R', -0.23)):
    for end, z, upper_head, upper_tail, lower_tail, hoof_tail in (
        ('F', 0.55, (x, 0.46, 0.95), (x, 0.46, 0.52), (x, 0.46, 0.13), (x, 0.50, 0.04)),
        ('B', -0.52, (x, -0.45, 0.95), (x, -0.45, 0.52), (x, -0.45, 0.13), (x, -0.41, 0.04)),
    ):
        bone(f'leg_{side}{end}_upper', upper_head, upper_tail, 'body')
        bone(f'leg_{side}{end}_lower', upper_tail, lower_tail, f'leg_{side}{end}_upper')
        bone(f'hoof_{side}{end}', lower_tail, hoof_tail, f'leg_{side}{end}_lower')
bone('rider_hip', (0, -0.06, 1.18), (0, -0.06, 1.39), 'body')
bone('rider_spine', (0, -0.06, 1.39), (0, -0.06, 1.70), 'rider_hip')
bone('rider_head', (0, -0.06, 1.70), (0, -0.03, 1.95), 'rider_spine')
bone('rider_arm_L', (0.19, -0.08, 1.64), (0.34, 0.05, 1.40), 'rider_spine')
bone('rider_arm_R', (-0.19, -0.08, 1.64), (-0.34, 0.05, 1.40), 'rider_spine')
bone('rider_hand_L', (0.34, 0.05, 1.40), (0.39, 0.14, 1.30), 'rider_arm_L')
bone('rider_hand_R', (-0.34, 0.05, 1.40), (-0.39, 0.14, 1.30), 'rider_arm_R')
bone('rider_thigh_L', (0.12, -0.04, 1.16), (0.24, 0.10, 0.88), 'rider_hip')
bone('rider_thigh_R', (-0.12, -0.04, 1.16), (-0.24, 0.10, 0.88), 'rider_hip')
bone('rider_calf_L', (0.24, 0.10, 0.88), (0.27, 0.20, 0.55), 'rider_thigh_L')
bone('rider_calf_R', (-0.24, 0.10, 0.88), (-0.27, 0.20, 0.55), 'rider_thigh_R')
bone('rider_boot_L', (0.27, 0.20, 0.55), (0.27, 0.35, 0.50), 'rider_calf_L')
bone('rider_boot_R', (-0.27, 0.20, 0.55), (-0.27, 0.35, 0.50), 'rider_calf_R')
bpy.ops.object.mode_set(mode='OBJECT')

# ---------------------------------------------------------------------------
# Horse body, head, saddle, legs.
# ---------------------------------------------------------------------------
box('GEO-Horse-Body', 'body', horse, (0, 0.0, 1.03), (0.46, 1.42, 0.48), bevel=0.08)
box('GEO-Horse-Chest', 'body', horse, (0, 0.56, 1.00), (0.48, 0.28, 0.40), bevel=0.05)
box('GEO-Horse-Neck', 'neck', horse, (0, 0.76, 1.27), (0.28, 0.20, 0.52), rot=(math.radians(-35), 0, 0), bevel=0.04)
box('GEO-Horse-Head', 'head', horse, (0, 1.08, 1.44), (0.25, 0.42, 0.27), rot=(math.radians(10), 0, 0), bevel=0.04)
box('GEO-Horse-Muzzle', 'head', horse_light, (0, 1.30, 1.38), (0.19, 0.20, 0.16), bevel=0.03)
box('GEO-Horse-EarL', 'head', horse, (0.10, 0.94, 1.58), (0.07, 0.08, 0.18), rot=(0, math.radians(10), 0), bevel=0.02)
box('GEO-Horse-EarR', 'head', horse, (-0.10, 0.94, 1.58), (0.07, 0.08, 0.18), rot=(0, math.radians(-10), 0), bevel=0.02)
# mane and tail as segmented flat wedges
for i in range(5):
    t = i / 4
    box(f'GEO-Mane-{i}', 'neck', horse_dark, (0, 0.62 + t * 0.25, 1.43 + t * 0.22), (0.055, 0.10, 0.18), rot=(math.radians(-25), 0, 0), bevel=0.01)
for i in range(3):
    box(f'GEO-Tail-{i}', 'tail', horse_dark, (0, -0.84 - i * 0.10, 0.98 - i * 0.10), (0.10 - i * 0.02, 0.16, 0.12), rot=(math.radians(25), 0, 0), bevel=0.02)
# saddle and blanket
box('GEO-Saddle-Blanket', 'body', saddle_cloth, (0, -0.08, 1.29), (0.48, 0.55, 0.06), bevel=0.02)
box('GEO-Saddle', 'body', leather, (0, -0.08, 1.36), (0.35, 0.38, 0.10), bevel=0.03)
box('GEO-Saddle-Horn', 'body', leather, (0, 0.16, 1.47), (0.10, 0.10, 0.12), bevel=0.02)
# bridle and reins
cylinder('GEO-Bridle', 'head', leather, (0, 1.20, 1.42), 0.15, 0.05, rot=(math.radians(80), 0, 0), vertices=12)
for side, x in (('L', 0.11), ('R', -0.11)):
    cylinder_between(f'GEO-Rein-{side}', 'head', leather, (x, 1.18, 1.38), (x * 3.0, 0.16, 1.31), 0.012, vertices=6)
# legs: upper, lower, hoof
for side, x in (('L', 0.23), ('R', -0.23)):
    for end, z in (('F', 0.55), ('B', -0.52)):
        box(f'GEO-Leg-{side}{end}-Upper', f'leg_{side}{end}_upper', horse, (x, z, 0.73), (0.18, 0.18, 0.44), bevel=0.03)
        box(f'GEO-Leg-{side}{end}-Lower', f'leg_{side}{end}_lower', horse, (x, z, 0.30), (0.13, 0.13, 0.42), bevel=0.02)
        box(f'GEO-Hoof-{side}{end}', f'hoof_{side}{end}', horse_dark, (x, z + 0.02, 0.055), (0.15, 0.17, 0.11), bevel=0.02)

# ---------------------------------------------------------------------------
# Rider in a seated pose; rigid parts weighted to the rider bones.
# ---------------------------------------------------------------------------
box('GEO-Rider-Torso', 'rider_spine', coat, (0, -0.05, 1.54), (0.36, 0.28, 0.48), bevel=0.06)
box('GEO-Rider-Belt', 'rider_hip', leather, (0, -0.05, 1.31), (0.37, 0.30, 0.06), bevel=0.02)
box('GEO-Rider-CoatTail', 'rider_hip', coat, (0, -0.20, 1.22), (0.32, 0.16, 0.30), rot=(math.radians(-10), 0, 0), bevel=0.04)
box('GEO-Rider-Collar', 'rider_spine', trim, (0, -0.05, 1.75), (0.30, 0.02, 0.04), bevel=0.01)
sphere('GEO-Rider-Head', 'rider_head', skin, (0, -0.04, 1.84), (0.17, 0.16, 0.20))
box('GEO-Rider-Hair', 'rider_head', horse_dark, (0, -0.12, 1.86), (0.22, 0.16, 0.12), bevel=0.03)
# Three period headwear meshes; the variant dressing shows exactly one.
cylinder('GEO-Hat-Bicorn-Brim', 'rider_head', hat_fabric, (0, -0.04, 1.99), 0.25, 0.035, vertices=16)
box('GEO-Hat-Bicorn-Crown', 'rider_head', hat_fabric, (0, -0.04, 2.06), (0.38, 0.18, 0.12), bevel=0.03)
box('GEO-Hat-Bicorn-Trim', 'rider_head', trim, (0, 0.06, 2.00), (0.38, 0.02, 0.04), bevel=0.01)
cylinder('GEO-Hat-Morion-Brim', 'rider_head', metal, (0, -0.04, 1.99), 0.23, 0.035, vertices=10)
bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.18, radius2=0.07, depth=0.20, location=(0, -0.04, 2.08))
_morion = bpy.context.object
finish(_morion, 'GEO-Hat-Morion-Crown', 'rider_head', metal)
box('GEO-Hat-Morion-Comb', 'rider_head', trim, (0, -0.04, 2.18), (0.035, 0.28, 0.09), bevel=0.01)
cylinder('GEO-Hat-Kepi-Band', 'rider_head', hat_fabric, (0, -0.04, 1.99), 0.17, 0.04, vertices=12)
cylinder('GEO-Hat-Kepi-Crown', 'rider_head', hat_fabric, (0, -0.04, 2.06), 0.16, 0.14, vertices=12)
cylinder('GEO-Hat-Kepi-Top', 'rider_head', hat_fabric, (0, -0.04, 2.13), 0.19, 0.03, vertices=12)
box('GEO-Hat-Kepi-Trim', 'rider_head', trim, (0, 0.12, 2.04), (0.30, 0.02, 0.03), bevel=0.01)
# arms
for side, sx, bone_arm, bone_hand in (('L', 1, 'rider_arm_L', 'rider_hand_L'), ('R', -1, 'rider_arm_R', 'rider_hand_R')):
    box(f'GEO-Rider-Arm-{side}', bone_arm, coat, (sx * 0.27, 0.0, 1.51), (0.16, 0.18, 0.42), rot=(math.radians(-18), 0, sx * math.radians(-8)), bevel=0.03)
    box(f'GEO-Rider-Hand-{side}', bone_hand, skin, (sx * 0.36, 0.10, 1.31), (0.09, 0.11, 0.11), bevel=0.02)
# legs
for side, sx, thigh, calf, boot in (
    ('L', 1, 'rider_thigh_L', 'rider_calf_L', 'rider_boot_L'),
    ('R', -1, 'rider_thigh_R', 'rider_calf_R', 'rider_boot_R'),
):
    box(f'GEO-Rider-Thigh-{side}', thigh, trousers, (sx * 0.18, 0.03, 1.06), (0.20, 0.25, 0.38), rot=(math.radians(28), 0, 0), bevel=0.03)
    box(f'GEO-Rider-Calf-{side}', calf, trousers, (sx * 0.25, 0.16, 0.73), (0.14, 0.16, 0.38), rot=(math.radians(-15), 0, 0), bevel=0.02)
    box(f'GEO-Rider-Boot-{side}', boot, leather, (sx * 0.27, 0.28, 0.52), (0.15, 0.28, 0.14), bevel=0.02)
# sword on the right hand
box('GEO-Rider-Sword-Blade', 'rider_hand_R', metal, (-0.46, 0.34, 1.43), (0.035, 0.58, 0.02), rot=(math.radians(20), 0, 0), bevel=0.005)
box('GEO-Rider-Sword-Guard', 'rider_hand_R', trim, (-0.43, 0.15, 1.22), (0.14, 0.035, 0.03), bevel=0.005)

# ---------------------------------------------------------------------------
# Clips. Pose rotations are local to each bone; all clips start from rest.
# ---------------------------------------------------------------------------
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

# Idle: horse breath, head nod, tail swish, rider breath.
key_action('Idle_Loop', 60, [
    (1, {'rot': {'body': (0.0, 0, 0), 'neck': (0.0, 0, 0.02), 'head': (0.0, 0, -0.02), 'tail': (0.05, 0, 0.08), 'rider_spine': (0.0, 0, 0), 'rider_head': (0.0, 0, 0)}}),
    (30, {'rot': {'body': (0.0, 0, 0), 'neck': (-0.04, 0, 0.08), 'head': (0.02, 0, -0.08), 'tail': (-0.05, 0, -0.10), 'rider_spine': (0.025, 0, 0), 'rider_head': (-0.02, 0, 0)}}),
    (60, {'rot': {'body': (0.0, 0, 0), 'neck': (0.0, 0, 0.02), 'head': (0.0, 0, -0.02), 'tail': (0.05, 0, 0.08), 'rider_spine': (0.0, 0, 0), 'rider_head': (0.0, 0, 0)}}),
])

# Walk: diagonal leg pairs, body bob, rider counter-sway.
def walk_pose(phase):
    s = math.sin(phase)
    c = math.cos(phase)
    return {'rot': {
        'body': (0.0, 0, 0.018 * c),
        'neck': (-0.03, 0, 0.02 * s),
        'head': (0.02, 0, -0.02 * s),
        'tail': (0.1, 0, 0.12 * s),
        'leg_LF_upper': (0.42 * s, 0, 0),
        'leg_RF_upper': (-0.42 * s, 0, 0),
        'leg_LB_upper': (-0.38 * s, 0, 0),
        'leg_RB_upper': (0.38 * s, 0, 0),
        'leg_LF_lower': (-0.22 * max(0, s), 0, 0),
        'leg_RF_lower': (-0.22 * max(0, -s), 0, 0),
        'leg_LB_lower': (-0.22 * max(0, -s), 0, 0),
        'leg_RB_lower': (-0.22 * max(0, s), 0, 0),
        'rider_spine': (0.02 * c, 0, -0.03 * s),
        'rider_head': (-0.02 * c, 0, 0.02 * s),
        'rider_arm_L': (-0.08 * s, 0, 0),
        'rider_arm_R': (0.08 * s, 0, 0),
    }}
key_action('Walk_Loop', 32, [
    (1, walk_pose(0)), (9, walk_pose(math.pi / 2)), (17, walk_pose(math.pi)),
    (25, walk_pose(3 * math.pi / 2)), (32, walk_pose(2 * math.pi)),
])

# Attack: rear slightly, rider raises sword and chops.
key_action('Attack', 30, [
    (1, {'rot': {'body': (0, 0, 0), 'rider_arm_R': (0, 0, 0), 'rider_spine': (0, 0, 0)}}),
    (8, {'rot': {'body': (-0.10, 0, 0), 'neck': (0.08, 0, 0), 'leg_LF_upper': (-0.35, 0, 0), 'leg_RF_upper': (-0.35, 0, 0), 'rider_arm_R': (-1.4, 0, 0.2), 'rider_spine': (-0.10, 0, 0.05)}}),
    (16, {'rot': {'body': (0.05, 0, 0), 'neck': (-0.06, 0, 0), 'leg_LF_upper': (0.25, 0, 0), 'leg_RF_upper': (0.25, 0, 0), 'rider_arm_R': (-0.25, 0, -0.1), 'rider_spine': (0.10, 0, -0.05)}}),
    (24, {'rot': {'body': (0, 0, 0), 'rider_arm_R': (0.2, 0, 0), 'rider_spine': (0.03, 0, 0)}}),
    (30, {'rot': {'body': (0, 0, 0), 'rider_arm_R': (0, 0, 0), 'rider_spine': (0, 0, 0)}}),
])

# Death: horse folds and rider slumps; the game topples the frozen root.
key_action('Death', 40, [
    (1, {'rot': {}}),
    (16, {'rot': {'body': (0.22, 0, 0.35), 'neck': (0.2, 0, -0.2), 'head': (0.1, 0, -0.3), 'leg_LF_upper': (0.6, 0, 0), 'leg_RF_upper': (-0.4, 0, 0), 'rider_spine': (0.3, 0, 0.2), 'rider_head': (0.2, 0, 0.1)}}),
    (40, {'rot': {'body': (0.35, 0, 0.55), 'neck': (0.35, 0, -0.3), 'head': (0.2, 0, -0.4), 'leg_LF_upper': (0.9, 0, 0), 'leg_RF_upper': (-0.6, 0, 0), 'rider_spine': (0.5, 0, 0.3), 'rider_head': (0.3, 0, 0.2)}}),
])

# Bike / engine not in scope. Reload idle as the active action.
arm.animation_data.action = bpy.data.actions.get('Idle_Loop')

# ---------------------------------------------------------------------------
# Save, export and render a contact sheet.
# ---------------------------------------------------------------------------
for obj in list(bpy.data.objects):
    if obj != arm and obj.parent != arm:
        bpy.data.objects.remove(obj, do_unlink=True)

SCENES.mkdir(parents=True, exist_ok=True)
EXPORTS.mkdir(parents=True, exist_ok=True)
MODELS.mkdir(parents=True, exist_ok=True)
RENDERS.mkdir(parents=True, exist_ok=True)
blend = SCENES / 'mounted_rig.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))

glb = EXPORTS / 'mounted_rig.glb'
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
shutil.copyfile(glb, MODELS / 'mounted_rig.glb')
print('WROTE', glb, glb.stat().st_size, 'bytes')

# contact sheet from three angles in workbench material colours
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new('World')
scene.world.color = (0.055, 0.06, 0.07)
bpy.ops.object.camera_add(location=(3.2, 4.8, 2.0))
cam = bpy.context.object
cam.rotation_euler = (math.radians(72), 0, math.radians(145))
scene.camera = cam
for i, (loc, rot) in enumerate([
    ((3.2, 4.8, 2.0), (72, 0, 145)),
    ((0, 5.4, 1.5), (78, 0, 180)),
    ((4.8, 0.4, 1.7), (78, 0, 95)),
]):
    cam.location = loc
    cam.rotation_euler = tuple(math.radians(v) for v in rot)
    scene.render.filepath = str(RENDERS / f'view-{i}.png')
    bpy.ops.render.render(write_still=True)
print('RENDERS', RENDERS)
