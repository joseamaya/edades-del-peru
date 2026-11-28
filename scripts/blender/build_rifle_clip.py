"""Build the project-authored `Rifle_Shoot` clip from the CC0 `Pistol_Shoot` animation.

The post-colonial ranged role plays `Pistol_Shoot`, a near-static support aim (the hands 10 cm apart with no
recoil). A rifleman needs a kick: this script copies the clip on the shared skeleton and adds a recoil impulse
through the spine and the firing arm, then exports only that action as a GLB that
`scripts/build_caral_worker.mjs` merges into the shipped worker.

The source is the hash-pinned CC0 UAL1 fixture (`ual_mannequin.glb`), not the built worker, so the clip does not
depend on a previous build artifact.

Run from the repository root:
  blender --background --python scripts/blender/build_rifle_clip.py
  blender --background --python scripts/blender/build_rifle_clip.py -- --stills=review/rifle-shoot [--render-only]
"""

import os
import sys

import bpy
from mathutils import Quaternion, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE = os.path.join(ROOT, 'src', 'assets', 'models', 'ual_mannequin.glb')
OUT = os.path.join(ROOT, 'art-src', 'blender', 'exports', 'clips', 'rifle_shoot.glb')

# Recoil, in radians, as (frame, spine_03, upperarm_r, lowerarm_r, head) pitch offsets. The shot lands at
# ~1.6 frames (the clip is 15.2 frames at 24 fps); the peak is keyed at frame 2, the rifle returns to the aim
# by 8 and settles at 12. Every row keys every bone, including the zeros, so the return is explicit.
IMPULSE = [
    (0, 0.0, 0.0, 0.0, 0.0),
    (2, -0.075, 0.16, -0.10, 0.035),
    (4, -0.045, 0.09, -0.05, 0.02),
    (6, -0.015, 0.03, -0.015, 0.005),
    (8, 0.0, 0.0, 0.0, 0.0),
    (12, 0.0, 0.0, 0.0, 0.0),
    (15, 0.0, 0.0, 0.0, 0.0),
]
BONES = ('spine_03', 'upperarm_r', 'lowerarm_r', 'Head')


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    stills = ''
    render_only = '--render-only' in argv
    for value in argv:
        if value.startswith('--stills='):
            stills = value.split('=', 1)[1]
    return stills, render_only


def render_stills(directory):
    """Render the aim and the recoil on the shared body, for the PR evidence sheet."""
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x = 480
    scene.render.resolution_y = 540
    scene.render.image_settings.file_format = 'PNG'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.show_shadows = True
    cam_data = bpy.data.cameras.new('Cam')
    cam = bpy.data.objects.new('Cam', cam_data)
    scene.collection.objects.link(cam)
    cam.location = (2.6, -3.0, 1.7)
    cam.rotation_euler = (Vector((0, 0, 1.05)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam_data.lens = 55
    scene.camera = cam
    sun_data = bpy.data.lights.new('Sun', 'SUN')
    sun = bpy.data.objects.new('Sun', sun_data)
    scene.collection.objects.link(sun)
    sun.rotation_euler = (0.9, 0.2, 0.6)
    sun_data.energy = 3.0
    os.makedirs(directory, exist_ok=True)
    for frame in (0, 2, 4, 8):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        scene.render.filepath = os.path.join(directory, f'frame-{frame:02d}.png')
        bpy.ops.render.render(write_still=True)


def main():
    stills, render_only = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SOURCE)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    arm.animation_data_create()
    source = bpy.data.actions['Pistol_Shoot']
    arm.animation_data.action = source
    if source.slots:
        arm.animation_data.action_slot = source.slots[0]

    clip = source.copy()
    clip.name = 'Rifle_Shoot'
    arm.animation_data.action = clip
    if clip.slots:
        arm.animation_data.action_slot = clip.slots[0]

    scene = bpy.context.scene
    for frame, spine, upper, lower, head in IMPULSE:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        for bone, angle in zip(BONES, (spine, upper, lower, head)):
            pb = arm.pose.bones[bone]
            # Local X pitches the torso/arm back along the shot; the recoil is a short rotation about it.
            pb.rotation_quaternion = pb.rotation_quaternion.copy() @ Quaternion(Vector((1, 0, 0)), angle)
            pb.keyframe_insert('rotation_quaternion', frame=frame)

    if render_only:
        if stills:
            render_stills(stills)
        return

    # One action only, no mesh: the merge step in scripts/build_caral_worker.mjs supplies the body.
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format='GLB',
        use_selection=True,
        export_animations=True,
        export_animation_mode='ACTIVE_ACTIONS',
        export_skins=False,
        export_apply=False,
        export_yup=True,
    )
    print('CLIP', OUT, 'action', clip.name, 'frames', tuple(clip.frame_range))
    if stills:
        render_stills(stills)


if __name__ == '__main__':
    main()
