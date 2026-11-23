"""Bake the shared character proportions into a rigged GLB.

The CC0 Quaternius body reads as ~8 heads. This pass bakes the art-direction proportions into the mesh:
the head and hands are scaled +12 % around their bone pivots and the shoulders/waist get a gentle taper,
so the committed asset owns the silhouette. It does not retopologise the body.

Run after the base hero build, then meshopt with the hero tunic budget:

  node scripts/build_caral_worker.mjs --hero --out=review/tambotoco_hero_base.glb
  blender --background --python scripts/blender/bake_character_proportions.py -- \
      --in=review/tambotoco_hero_base.glb --out=src/assets/models/tambotoco_hero.glb
  node scripts/simplify_caral_worker.mjs --file=src/assets/models/tambotoco_hero.glb --hero

`yarn models:hero` runs the whole chain (Blender is a local authoring tool, not a CI dependency). The
worker applies the same pass inside `build_caral_worker.mjs`, because a Blender round-trip splits the
welded vertices and grows the shared GLB by ~0.17 MB; the hero keeps this authoring path.
"""
import sys

import bpy

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def arg(name, fallback):
    prefix = f'--{name}='
    for value in ARGS:
        if value.startswith(prefix):
            return value[len(prefix):]
    return fallback


SRC = arg('in', 'review/caral_worker_base.glb')
OUT = arg('out', 'src/assets/models/caral_worker.glb')
HEAD_SCALE = 1.12
HAND_SCALE = 1.12

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
# The glTF import can bring an unskinned helper from the source scene; only the skinned body survives.
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.parent != arm:
        bpy.data.objects.remove(o, do_unlink=True)
meshes = [o for o in bpy.data.objects if o.type == 'MESH' and o.parent == arm]
bones = arm.data.bones
pelvis_z = bones['pelvis'].head_local.z
head_z = bones['Head'].head_local.z
head_pivot = bones['Head'].head_local.copy()
hand_pivots = {'hand_l': bones['hand_l'].head_local.copy(), 'hand_r': bones['hand_r'].head_local.copy()}
center_x = bones['pelvis'].head_local.x
span = max(1e-4, head_z - pelvis_z)


def taper(t):
    """Hips neutral, waist 0.97, chest 1.04, head neutral; smooth between the bands."""
    if t <= 0.25:
        return 1.0
    if t <= 0.45:
        return 1.0 + (0.97 - 1.0) * (t - 0.25) / 0.2
    if t <= 0.75:
        return 0.97 + (1.04 - 0.97) * (t - 0.45) / 0.3
    return 1.04 + (1.0 - 1.04) * min(1.0, (t - 0.75) / 0.25)


counts = {'Head': 0, 'hand_l': 0, 'hand_r': 0, 'taper': 0}
for o in meshes:
    names = {g.index: g.name for g in o.vertex_groups}
    for v in o.data.vertices:
        name = None
        if v.groups:
            best = max(v.groups, key=lambda g: g.weight)
            name = names.get(best.group)
        co = v.co.copy()
        if pelvis_z < co.z < head_z:
            t = (co.z - pelvis_z) / span
            co.x = center_x + (co.x - center_x) * taper(t)
            counts['taper'] += 1
        if name == 'Head':
            co = head_pivot + (co - head_pivot) * HEAD_SCALE
            counts['Head'] += 1
        elif name in hand_pivots:
            p = hand_pivots[name]
            co = p + (co - p) * HAND_SCALE
            counts[name] += 1
        v.co = co
print('COUNTS', counts)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format='GLB',
    export_animations=True,
    export_skins=True,
    use_selection=True,
)
print('EXPORTED', OUT)
