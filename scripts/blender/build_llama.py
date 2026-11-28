"""Build the project llama: a low-poly rigged camelid for the caravan and the Andean llama herds.

The CC0 Quaternius alpaca was a documented stand-in for the llama (`docs/historia/comercio.md`); this replaces it
with a project-authored model: longer neck and legs, a llama head and the banana ears, on a 15-bone rig with the
three clips the game asks for (`Idle`, `Walk`, `Eating`). The caravan cargo attaches to the `Back` bone, so the
bone keeps that name.

Game-safe output: Principled BSDF, flat colours, at most four materials, one skinned mesh, one armature. Units are
game units (a person is 1.86; the llama is ~1.75 m at the ears after the asset scale 0.38, real llamas are
1.7-1.8 m at the head). Blender Z-up, exported Y-up; the front faces -Y in Blender, i.e. +Z in the game. Origin
between the hooves.

Run from the repository root:
  blender --background --python scripts/blender/build_llama.py
  yarn art:models --only=llama            # meshopt; the game copy must stay compressed
  blender --background --python scripts/blender/build_llama.py -- --stills=review/llama [--render-only]
"""

import os
import shutil
import sys

import bpy
import bmesh
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'art-src', 'blender', 'exports', 'llama', 'llama.glb')
GAME = os.path.join(ROOT, 'src', 'assets', 'models', 'llama.glb')


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    stills = ''
    render_only = '--render-only' in argv
    for value in argv:
        if value.startswith('--stills='):
            stills = value.split('=', 1)[1]
    return stills, render_only


def srgb(value):
    raw = value.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(raw[i : i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


def material(name, colour, roughness=0.9):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = srgb(colour)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = 0.0
    mat.diffuse_color = srgb(colour)
    return mat


def object_from(name, bm, mat, group, smooth=True):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth = smooth
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    if group:
        obj.vertex_groups.new(name=group).add(range(len(mesh.vertices)), 1.0, 'REPLACE')
    return obj


def ellipsoid(name, centre, radii, mat, group, segments=16, rings=10, smooth=True):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings, radius=1.0)
    c = Vector(centre)
    for v in bm.verts:
        v.co = Vector((v.co.x * radii[0], v.co.y * radii[1], v.co.z * radii[2])) + c
    return object_from(name, bm, mat, group, smooth)


def capsule(name, a, b, radius_a, radius_b, mat, group, segments=10, smooth=True):
    a, b = Vector(a), Vector(b)
    direction = b - a
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=segments,
        radius1=radius_a,
        radius2=radius_b,
        depth=direction.length,
    )
    rotation = direction.to_track_quat('Z', 'Y')
    mid = (a + b) / 2
    for v in bm.verts:
        v.co = rotation @ v.co + mid
    return object_from(name, bm, mat, group, smooth)


def blended_neck(name, a, b, radius_a, radius_b, mat, low_bone, high_bone):
    """One tapered neck whose vertices blend from `low_bone` at the chest to `high_bone` at the head."""
    a, b = Vector(a), Vector(b)
    direction = b - a
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=12, radius1=radius_a, radius2=radius_b,
                          depth=direction.length)
    rotation = direction.to_track_quat('Z', 'Y')
    mid = (a + b) / 2
    for v in bm.verts:
        v.co = rotation @ v.co + mid
    obj = object_from(name, bm, mat, None)
    low = obj.vertex_groups.new(name=low_bone)
    high = obj.vertex_groups.new(name=high_bone)
    span = max(1e-6, b.z - a.z)
    for vertex in obj.data.vertices:
        t = min(1.0, max(0.0, (vertex.co.z - a.z) / span))
        low.add([vertex.index], 1.0 - t, 'REPLACE')
        high.add([vertex.index], t, 'REPLACE')
    return obj


def box(name, centre, size, mat, group):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    c = Vector(centre)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])) + c
    return object_from(name, bm, mat, group, smooth=False)


def build_parts(mats):
    parts = []
    wool, face, hoof, ear = mats
    # Torso, chest and rump: the long, deep body of a llama under a wool coat.
    parts.append(ellipsoid('body', (0, 0.15, 2.55), (0.58, 1.15, 0.55), wool, 'Torso'))
    parts.append(ellipsoid('chest', (0, -0.8, 2.6), (0.5, 0.55, 0.52), wool, 'Torso'))
    # Neck: one tapered mesh blended between the two neck bones, so a bend has no joint ring.
    parts.append(blended_neck('neck', (0, -0.9, 2.75), (0, -1.25, 3.9), 0.29, 0.15, wool, 'Neck1', 'Neck2'))
    parts.append(ellipsoid('neck_base', (0, -0.92, 2.85), (0.3, 0.3, 0.28), wool, 'Torso', 12, 8))
    # Head and muzzle.
    parts.append(ellipsoid('head', (0, -1.32, 3.98), (0.22, 0.32, 0.24), face, 'Head'))
    parts.append(ellipsoid('muzzle', (0, -1.6, 3.9), (0.14, 0.2, 0.14), face, 'Head'))
    for side, sx in (('L', 1), ('R', -1)):
        parts.append(ellipsoid(f'eye_{side}', (sx * 0.18, -1.43, 4.02), (0.04, 0.05, 0.05), hoof, 'Head', 8, 6))
    # Banana ears: two segments curving up and slightly back.
    for side, sx in (('L', 1), ('R', -1)):
        group = f'Ear.{side}'
        parts.append(
            capsule(f'ear_{side}_1', (sx * 0.12, -1.28, 4.05), (sx * 0.22, -1.2, 4.4), 0.06, 0.05, ear, group, 8)
        )
        parts.append(
            capsule(f'ear_{side}_2', (sx * 0.22, -1.2, 4.4), (sx * 0.34, -1.36, 4.6), 0.05, 0.008, ear, group, 8)
        )
    # Legs: long and slender, the llama silhouette against the alpaca.
    for side, sx in (('L', 1), ('R', -1)):
        for front, y in (('Front', -0.62), ('Back', 0.86)):
            upper = f'{front}UpperLeg.{side}'
            lower = f'{front}LowerLeg.{side}'
            top = 2.35 if front == 'Front' else 2.4
            parts.append(capsule(f'{front.lower()}_upper_{side}', (sx * 0.36, y, top), (sx * 0.36, y, 1.28),
                                 0.15, 0.1, wool, upper))
            parts.append(ellipsoid(f'{front.lower()}_knee_{side}', (sx * 0.36, y, 1.28), (0.11, 0.11, 0.11),
                                   face, upper, 10, 6))
            parts.append(capsule(f'{front.lower()}_lower_{side}', (sx * 0.36, y, 1.3), (sx * 0.36, y, 0.26),
                                 0.1, 0.07, face, lower))
            parts.append(box(f'{front.lower()}_hoof_{side}', (sx * 0.33, y - 0.01, 0.14), (0.16, 0.2, 0.22), hoof, lower))
    # Short tail.
    parts.append(capsule('tail', (0, 1.02, 2.75), (0, 1.3, 2.45), 0.08, 0.03, wool, 'Tail', 8))
    return parts


def build_armature():
    data = bpy.data.armatures.new('LlamaRig')
    arm = bpy.data.objects.new('LlamaRig', data)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    bones = [
        # name, head, tail, parent
        ('root', (0, 0, 0), (0, 0.001, 0.4), None),
        ('Torso', (0, -0.8, 2.55), (0, 0.95, 2.55), 'root'),
        ('Back', (0, 0.55, 2.85), (0, 0.95, 2.85), 'Torso'),
        ('Neck1', (0, -0.9, 2.75), (0, -1.08, 3.4), 'Torso'),
        ('Neck2', (0, -1.08, 3.4), (0, -1.25, 3.9), 'Neck1'),
        ('Head', (0, -1.25, 3.9), (0, -1.6, 3.9), 'Neck2'),
        ('Ear.L', (0.12, -1.28, 4.05), (0.34, -1.36, 4.6), 'Head'),
        ('Ear.R', (-0.12, -1.28, 4.05), (-0.34, -1.36, 4.6), 'Head'),
        ('FrontUpperLeg.L', (0.36, -0.62, 2.35), (0.36, -0.62, 1.28), 'root'),
        ('FrontLowerLeg.L', (0.36, -0.62, 1.28), (0.36, -0.62, 0.26), 'FrontUpperLeg.L'),
        ('FrontUpperLeg.R', (-0.36, -0.62, 2.35), (-0.36, -0.62, 1.28), 'root'),
        ('FrontLowerLeg.R', (-0.36, -0.62, 1.28), (-0.36, -0.62, 0.26), 'FrontUpperLeg.R'),
        ('BackUpperLeg.L', (0.36, 0.86, 2.4), (0.36, 0.86, 1.28), 'root'),
        ('BackLowerLeg.L', (0.36, 0.86, 1.28), (0.36, 0.86, 0.26), 'BackUpperLeg.L'),
        ('BackUpperLeg.R', (-0.36, 0.86, 2.4), (-0.36, 0.86, 1.28), 'root'),
        ('BackLowerLeg.R', (-0.36, 0.86, 1.28), (-0.36, 0.86, 0.26), 'BackUpperLeg.R'),
        ('Tail', (0, 1.02, 2.78), (0, 1.24, 2.5), 'Torso'),
    ]
    for name, head, tail, parent in bones:
        bone = data.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        if parent:
            bone.parent = data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm


ANIMATED = (
    'Torso',
    'Neck1',
    'Neck2',
    'Head',
    'Ear.L',
    'Ear.R',
    'FrontUpperLeg.L',
    'FrontLowerLeg.L',
    'FrontUpperLeg.R',
    'FrontLowerLeg.R',
    'BackUpperLeg.L',
    'BackLowerLeg.L',
    'BackUpperLeg.R',
    'BackLowerLeg.R',
    'Tail',
)


def make_action(arm, name, keys):
    """`keys` is a list of (frame, {bone: (rx, ry, rz)}); every animated bone is keyed at every frame."""
    scene = bpy.context.scene
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    arm.animation_data.action = action
    if action.slots:
        arm.animation_data.action_slot = action.slots[0]
    for frame, pose in keys:
        scene.frame_set(frame)
        for bone in ANIMATED:
            pb = arm.pose.bones[bone]
            pb.rotation_mode = 'XYZ'
            pb.rotation_euler = pose.get(bone, (0.0, 0.0, 0.0))
            pb.keyframe_insert('rotation_euler', frame=frame)
    return action


def build_actions(arm):
    # Idle: a slow breath, a tail flick and one ear twitch; 100 frames at 24 fps.
    make_action(
        arm,
        'Idle',
        [
            (0, {'Neck1': (0.0, 0.0, 0.0), 'Head': (0.0, 0.0, 0.0), 'Tail': (0.0, 0.0, 0.1)}),
            (25, {'Neck1': (0.02, 0.0, 0.02), 'Head': (-0.02, 0.0, 0.03), 'Tail': (0.0, 0.0, -0.1), 'Ear.L': (0.0, 0.1, 0.0)}),
            (50, {'Neck1': (0.0, 0.0, 0.0), 'Head': (0.0, 0.0, 0.0), 'Tail': (0.0, 0.0, 0.1)}),
            (75, {'Neck1': (-0.02, 0.0, -0.02), 'Head': (0.02, 0.0, -0.03), 'Tail': (0.0, 0.0, -0.1)}),
            (100, {'Neck1': (0.0, 0.0, 0.0), 'Head': (0.0, 0.0, 0.0), 'Tail': (0.0, 0.0, 0.1)}),
        ],
    )
    # Walk: a two-beat diagonal gait; diagonal pairs alternate, the lower legs fold on the return swing.
    swing = 0.42
    fold = 0.35
    make_action(
        arm,
        'Walk',
        [
            (0, {
                'FrontUpperLeg.L': (swing, 0, 0), 'FrontUpperLeg.R': (-swing, 0, 0),
                'BackUpperLeg.L': (-swing, 0, 0), 'BackUpperLeg.R': (swing, 0, 0),
                'FrontLowerLeg.L': (fold, 0, 0), 'FrontLowerLeg.R': (0.0, 0, 0),
                'BackLowerLeg.L': (0.0, 0, 0), 'BackLowerLeg.R': (fold, 0, 0),
                'Neck1': (0.02, 0, 0), 'Head': (-0.02, 0, 0),
            }),
            (9, {
                'FrontUpperLeg.L': (0, 0, 0), 'FrontUpperLeg.R': (0, 0, 0),
                'BackUpperLeg.L': (0, 0, 0), 'BackUpperLeg.R': (0, 0, 0),
                'FrontLowerLeg.L': (0.0, 0, 0), 'FrontLowerLeg.R': (fold, 0, 0),
                'BackLowerLeg.L': (fold, 0, 0), 'BackLowerLeg.R': (0.0, 0, 0),
                'Neck1': (0.0, 0, 0), 'Head': (0.0, 0, 0),
            }),
            (18, {
                'FrontUpperLeg.L': (-swing, 0, 0), 'FrontUpperLeg.R': (swing, 0, 0),
                'BackUpperLeg.L': (swing, 0, 0), 'BackUpperLeg.R': (-swing, 0, 0),
                'FrontLowerLeg.L': (0.0, 0, 0), 'FrontLowerLeg.R': (fold, 0, 0),
                'BackLowerLeg.L': (fold, 0, 0), 'BackLowerLeg.R': (0.0, 0, 0),
                'Neck1': (-0.02, 0, 0), 'Head': (0.02, 0, 0),
            }),
            (27, {
                'FrontUpperLeg.L': (0, 0, 0), 'FrontUpperLeg.R': (0, 0, 0),
                'BackUpperLeg.L': (0, 0, 0), 'BackUpperLeg.R': (0, 0, 0),
                'FrontLowerLeg.L': (fold, 0, 0), 'FrontLowerLeg.R': (0.0, 0, 0),
                'BackLowerLeg.L': (0.0, 0, 0), 'BackLowerLeg.R': (fold, 0, 0),
                'Neck1': (0.0, 0, 0), 'Head': (0.0, 0, 0),
            }),
            (35, {
                'FrontUpperLeg.L': (swing, 0, 0), 'FrontUpperLeg.R': (-swing, 0, 0),
                'BackUpperLeg.L': (-swing, 0, 0), 'BackUpperLeg.R': (swing, 0, 0),
                'FrontLowerLeg.L': (fold, 0, 0), 'FrontLowerLeg.R': (0.0, 0, 0),
                'BackLowerLeg.L': (0.0, 0, 0), 'BackLowerLeg.R': (fold, 0, 0),
                'Neck1': (0.02, 0, 0), 'Head': (-0.02, 0, 0),
            }),
        ],
    )
    # Eating: the neck folds down to the ground and sways while grazing (a loop that starts and ends down).
    down = {'Neck1': (0.6, 0, 0), 'Neck2': (0.4, 0, 0), 'Head': (-0.4, 0, 0)}
    make_action(
        arm,
        'Eating',
        [
            (0, {**down, 'Neck1': (0.6, 0, 0.04)}),
            (45, {**down, 'Neck1': (0.6, 0, -0.06), 'Head': (-0.36, 0, 0.05)}),
            (90, {**down, 'Neck1': (0.6, 0, 0.06), 'Head': (-0.42, 0, -0.04)}),
            (135, {**down, 'Neck1': (0.6, 0, -0.04)}),
            (180, {**down, 'Neck1': (0.6, 0, 0.04)}),
        ],
    )


def render_stills(directory):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x = 720
    scene.render.resolution_y = 540
    scene.render.image_settings.file_format = 'PNG'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.show_shadows = True
    cam_data = bpy.data.cameras.new('Cam')
    cam = bpy.data.objects.new('Cam', cam_data)
    scene.collection.objects.link(cam)
    cam.location = (5.2, -7.0, 4.2)
    cam.rotation_euler = (Vector((0, -0.4, 2.5)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam_data.lens = 60
    scene.camera = cam
    sun_data = bpy.data.lights.new('Sun', 'SUN')
    sun = bpy.data.objects.new('Sun', sun_data)
    scene.collection.objects.link(sun)
    sun.rotation_euler = (0.9, 0.2, 0.6)
    sun_data.energy = 3.0
    os.makedirs(directory, exist_ok=True)
    arm = bpy.data.objects['LlamaRig']
    for action_name, frames in (('Idle', (0, 50)), ('Walk', (0, 9, 18)), ('Eating', (0, 90))):
        arm.animation_data.action = bpy.data.actions[action_name]
        for frame in frames:
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            scene.render.filepath = os.path.join(directory, f'{action_name.lower()}-{frame:03d}.png')
            bpy.ops.render.render(write_still=True)


def main():
    stills, render_only = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = (
        material('MAT-Llama_Wool', '#c9b491', 0.95),
        material('MAT-Llama_Face', '#7d6651', 0.9),
        material('MAT-Llama_Hoof', '#332b24', 0.8),
        material('MAT-Llama_Ear', '#8f735b', 0.92),
    )
    parts = build_parts(mats)
    bpy.ops.object.select_all(action='DESELECT')
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    mesh = bpy.context.view_layer.objects.active
    mesh.name = 'Llama'

    arm = build_armature()
    mesh.parent = arm
    modifier = mesh.modifiers.new('Armature', 'ARMATURE')
    modifier.object = arm
    arm.animation_data_create()
    build_actions(arm)

    if render_only:
        if stills:
            render_stills(stills)
        return

    # Keep the authoring scene next to the other Blender sources (`.blend` is Git LFS).
    scene_path = os.path.join(ROOT, 'art-src', 'blender', 'scenes', 'llama.blend')
    os.makedirs(os.path.dirname(scene_path), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=scene_path, compress=True)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format='GLB',
        use_selection=True,
        export_animations=True,
        export_animation_mode='ACTIONS',
        export_skins=True,
        export_apply=False,
        export_yup=True,
    )
    os.makedirs(os.path.dirname(GAME), exist_ok=True)
    shutil.copy2(OUT, GAME)
    tris = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
    print('LLAMA', OUT, 'tris', tris, 'verts', len(mesh.data.vertices), 'materials', len(mesh.data.materials))
    if stills:
        render_stills(stills)


if __name__ == '__main__':
    main()
