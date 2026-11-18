"""Build the project-authored mounted cavalry rig (horse + rider).

Run with:
  blender --background --factory-startup --python scripts/blender/build_mounted_rig.py

The source stays in art-src/blender/scenes/mounted_rig.blend; the exported GLB
is copied uncompressed to src/assets/models/mounted_rig.glb for the game
registry. Run `yarn art:models --only=mounted_rig` afterwards to meshopt-compress
the committed game copy (the same step as asset-pipeline.md Path B step 4).

Construction notes
------------------
The horse is authored from the same low-poly organic primitives as the Caral
fauna kit (`kblob`/`ktube` in `build_caral_slice.py`): a lofted barrel, tapered
neck and legs, a wedge head and small joint spheres. Parts stay rigidly weighted
to their bone and overlap at the joints, the budget-friendly approach the rest
of the mounted rig uses; the silhouette, not vertex deformation, is what has to
read at the RTS camera. The rider is rebuilt at human scale so the mounted pair
is ~2.7 units tall against the 1.86-unit infantry.
"""
from __future__ import annotations

import math
import shutil
import sys
from pathlib import Path

import bmesh
import bpy

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts' / 'blender'))
import build_caral_slice as slice_kit  # noqa: E402

EXPORTS = ROOT / 'art-src' / 'blender' / 'exports'
SCENES = ROOT / 'art-src' / 'blender' / 'scenes'
MODELS = ROOT / 'src' / 'assets' / 'models'
RENDERS = ROOT / 'review' / 'mounted-horse'


def clear() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for collection in list(bpy.data.collections):
        if collection.name != 'Collection':
            bpy.data.collections.remove(collection)
    bpy.context.scene.render.fps = 24


def material(name: str, color: tuple[float, float, float], roughness: float = 0.9, metallic: float = 0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    rgba = (*color, 1.0)
    bsdf.inputs['Base Color'].default_value = rgba
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    mat.diffuse_color = rgba
    return mat


def bind_to_armature(obj, bone: str, mat) -> None:
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)
    group = obj.vertex_groups.new(name=bone)
    group.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
    mod = obj.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    obj.parent = arm
    obj.matrix_parent_inverse.identity()
    obj.location = (0, 0, 0)
    obj.rotation_euler = (0, 0, 0)
    obj.scale = (1, 1, 1)


def finish_object(obj, name: str, bone: str, mat, smooth: bool = False) -> None:
    obj.name = name
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for poly in obj.data.polygons:
        poly.use_smooth = smooth
    bind_to_armature(obj, bone, mat)


def strip_attributes(mesh) -> None:
    for attr in ('leafvar', 'blob'):
        if attr in mesh.attributes:
            mesh.attributes.remove(mesh.attributes[attr])


def kit_part(name: str, bone: str, mat, build, smooth: bool = True):
    kit = slice_kit.new_kit()
    build(kit)
    mesh = slice_kit.kfinish(kit, name, [mat], smooth=smooth)
    strip_attributes(mesh)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    finish_object(obj, name, bone, mat, smooth)
    return obj


def blob(name, bone, mat, center, radii, segments=10, rings=6, smooth=True):
    return kit_part(
        name,
        bone,
        mat,
        lambda kit: slice_kit.kblob(kit, center, radii, segments, rings, 0.0, 0, 0),
        smooth,
    )


def tube(name, bone, mat, points, r0, r1, sides=8, cap=False, smooth=True):
    return kit_part(name, bone, mat, lambda kit: slice_kit.ktube(kit, points, r0, r1, sides, 0, cap), smooth)


def tube_with_blobs(name, bone, mat, points, r0, r1, sides, pieces, cap=False, smooth=True):
    def build(kit):
        slice_kit.ktube(kit, points, r0, r1, sides, 0, cap)
        for center, radii, segments, rings in pieces:
            slice_kit.kblob(kit, center, radii, segments, rings, 0.0, 0, 0)

    return kit_part(name, bone, mat, build, smooth)


def bridge_rings(bm, rings) -> None:
    """Bridge consecutive equal-length vertex rings with quads."""
    count = len(rings[0])
    for k in range(len(rings) - 1):
        for i in range(count):
            bm.faces.new(
                (
                    rings[k][i],
                    rings[k][(i + 1) % count],
                    rings[k + 1][(i + 1) % count],
                    rings[k + 1][i],
                )
            )


def loft(name, bone, mat, sections, segments=12, smooth=True):
    """Loft elliptical cross-sections along +Y: (y, centre_z, radius_x, radius_z)."""

    def build(kit):
        bm = kit['bm']
        rings = []
        for y, cz, rx, rz in sections:
            ring = []
            for i in range(segments):
                angle = 2 * math.pi * i / segments
                ring.append(bm.verts.new((rx * math.cos(angle), y, cz + rz * math.sin(angle))))
            rings.append(ring)
        bridge_rings(bm, rings)
        for ring, (y, cz, _, _) in ((rings[0], sections[0]), (rings[-1], sections[-1])):
            center = bm.verts.new((0, y, cz))
            for i in range(segments):
                bm.faces.new((ring[i], ring[(i + 1) % segments], center))
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))

    return kit_part(name, bone, mat, build, smooth)


def fin(name, bone, mat, sections, thickness=0.035, smooth=False):
    """Thin vertical plate along a curve: (y, base_z, height). Manes and forelocks."""

    def build(kit):
        bm = kit['bm']
        rings = []
        half = thickness * 0.5
        for y, base_z, height in sections:
            rings.append(
                [
                    bm.verts.new((-half, y, base_z)),
                    bm.verts.new((half, y, base_z)),
                    bm.verts.new((half, y, base_z + height)),
                    bm.verts.new((-half, y, base_z + height)),
                ]
            )
        bridge_rings(bm, rings)
        bm.faces.new(tuple(reversed(rings[0])))
        bm.faces.new(tuple(rings[-1]))
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))

    return kit_part(name, bone, mat, build, smooth)


def box(name, bone, mat, loc, scale, rot=(0, 0, 0), bevel=0.0, smooth=False):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    obj.rotation_euler = rot
    if bevel:
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        mod = obj.modifiers.new('Bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.scale = (1, 1, 1)
        obj.rotation_euler = rot
        obj.location = loc
    finish_object(obj, name, bone, mat, smooth)
    return obj


def sphere(name, bone, mat, loc, scale, segments=10, smooth=True):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=max(6, segments // 2), location=loc)
    obj = bpy.context.object
    obj.scale = scale
    finish_object(obj, name, bone, mat, smooth)
    return obj


def cylinder(name, bone, mat, loc, radius, depth, rot=(0, 0, 0), vertices=12, smooth=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    finish_object(obj, name, bone, mat, smooth)
    return obj


def cone(name, bone, mat, loc, r1, r2, depth, rot=(0, 0, 0), vertices=8, smooth=True):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices, radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot
    )
    obj = bpy.context.object
    finish_object(obj, name, bone, mat, smooth)
    return obj


def torus(name, bone, mat, loc, major, minor, rot=(0, 0, 0), major_segments=8, minor_segments=4, smooth=True):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=loc,
        rotation=rot,
    )
    obj = bpy.context.object
    finish_object(obj, name, bone, mat, smooth)
    return obj


clear()

# ---------------------------------------------------------------------------
# Palette (sRGB hex -> linear, matching the art-direction material language).
# ---------------------------------------------------------------------------
def rgb(value: str) -> tuple[float, float, float]:
    return slice_kit.hex_rgb(value)


horse = material('MAT-Horse', rgb('#7a4a28'), 0.9)
horse_dark = material('MAT-Horse-Dark', rgb('#1b120c'), 0.93)
horse_muzzle = material('MAT-Horse-Muzzle', rgb('#8a6248'), 0.88)
eye = material('MAT-Eye', rgb('#090605'), 0.28)
leather = material('MAT-Leather', rgb('#4a2e1a'), 0.62)
saddle_cloth = material('MAT-Saddle-Cloth', rgb('#8a3a30'), 0.93)
metal = material('MAT-Metal', rgb('#8a8f94'), 0.34, 0.82)
sword = material('MAT-Sword-Blade', rgb('#b7bcc2'), 0.26, 0.9)
coat = material('MAT-Rider-Coat', rgb('#1f3a63'), 0.84)
trim = material('MAT-Rider-Trim', rgb('#b32620'), 0.78)
trousers = material('MAT-Rider-Trousers', rgb('#252a31'), 0.9)
skin = material('MAT-Rider-Skin', rgb('#8a5a3a'), 0.7)
hair = material('MAT-Rider-Hair', rgb('#1a120c'), 0.88)
hat_fabric = material('MAT-Rider-Hat', rgb('#171b21'), 0.9)
hat_metal = material('MAT-Hat-Metal', rgb('#8a8f94'), 0.34, 0.82)

# ---------------------------------------------------------------------------
# Armature. Bones stay at the riding-pose coordinates so the rigid parts can be
# authored directly in world space. The horse faces +Y; the game applies yaw PI.
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
bone('body', (0, -0.20, 1.18), (0, 0.42, 1.18), 'root')
bone('neck', (0, 0.48, 1.42), (0, 0.90, 1.74), 'body')
bone('head', (0, 0.90, 1.74), (0, 1.22, 1.62), 'neck')
for side, x in (('L', 0.062), ('R', -0.062)):
    bone(f'ear_{side}', (x, 0.93, 1.90), (x * 1.25, 0.90, 2.03), 'head')
bone('tail_1', (0, -0.82, 1.40), (0, -0.96, 1.18), 'body')
bone('tail_2', (0, -0.96, 1.18), (0, -1.02, 0.95), 'tail_1')
bone('tail_3', (0, -1.02, 0.95), (0, -1.05, 0.72), 'tail_2')
for side, x in (('L', 0.24), ('R', -0.24)):
    for end, hip, knee, fetlock, hoof in (
        ('F', (x, 0.50, 1.24), (x, 0.50, 0.64), (x, 0.54, 0.17), (x, 0.57, 0.0)),
        ('B', (x, -0.52, 1.28), (x, -0.66, 0.66), (x, -0.58, 0.17), (x, -0.55, 0.0)),
    ):
        bone(f'leg_{side}{end}_upper', hip, knee, 'body')
        bone(f'leg_{side}{end}_lower', knee, fetlock, f'leg_{side}{end}_upper')
        bone(f'hoof_{side}{end}', fetlock, hoof, f'leg_{side}{end}_lower')
bone('rider_hip', (0, -0.12, 1.60), (0, -0.12, 1.82), 'body')
bone('rider_spine', (0, -0.12, 1.82), (0, -0.14, 2.20), 'rider_hip')
bone('rider_head', (0, -0.14, 2.20), (0, -0.12, 2.48), 'rider_spine')
bone('rider_arm_L', (0.24, -0.12, 2.14), (0.34, 0.02, 1.96), 'rider_spine')
bone('rider_arm_R', (-0.24, -0.12, 2.14), (-0.34, 0.02, 1.96), 'rider_spine')
bone('rider_hand_L', (0.34, 0.02, 1.96), (0.30, 0.24, 1.78), 'rider_arm_L')
bone('rider_hand_R', (-0.34, 0.02, 1.96), (-0.30, 0.24, 1.78), 'rider_arm_R')
bone('rider_thigh_L', (0.10, -0.10, 1.60), (0.34, 0.14, 1.30), 'rider_hip')
bone('rider_thigh_R', (-0.10, -0.10, 1.60), (-0.34, 0.14, 1.30), 'rider_hip')
bone('rider_calf_L', (0.34, 0.14, 1.30), (0.34, 0.04, 0.90), 'rider_thigh_L')
bone('rider_calf_R', (-0.34, 0.14, 1.30), (-0.34, 0.04, 0.90), 'rider_thigh_R')
bone('rider_boot_L', (0.34, 0.04, 0.90), (0.34, 0.18, 0.78), 'rider_calf_L')
bone('rider_boot_R', (-0.34, 0.04, 0.90), (-0.34, 0.18, 0.78), 'rider_calf_R')
bpy.ops.object.mode_set(mode='OBJECT')

# ---------------------------------------------------------------------------
# Horse: a lofted barrel avoids the seams of overlapping body blobs. The
# withers and croup are small ridges on top of it.
# ---------------------------------------------------------------------------
loft(
    'GEO-Horse-Body',
    'body',
    horse,
    [
        (-0.90, 1.28, 0.08, 0.12),
        (-0.80, 1.27, 0.22, 0.26),
        (-0.62, 1.24, 0.31, 0.32),
        (-0.38, 1.21, 0.34, 0.33),
        (0.00, 1.18, 0.33, 0.33),
        (0.30, 1.20, 0.33, 0.34),
        (0.50, 1.23, 0.31, 0.34),
        (0.68, 1.26, 0.24, 0.29),
        (0.80, 1.30, 0.12, 0.18),
        (0.87, 1.32, 0.04, 0.06),
    ],
    segments=14,
)
blob('GEO-Horse-Withers', 'body', horse, (0, 0.32, 1.47), (0.18, 0.27, 0.15), 10, 6)
tube('GEO-Horse-Neck', 'neck', horse, [(0, 0.50, 1.44), (0, 0.64, 1.60), (0, 0.78, 1.72), (0, 0.89, 1.77)], 0.25, 0.13, 10)
loft(
    'GEO-Horse-Head',
    'head',
    horse,
    [
        (0.88, 1.80, 0.10, 0.13),
        (0.96, 1.77, 0.12, 0.14),
        (1.05, 1.72, 0.11, 0.13),
        (1.13, 1.67, 0.09, 0.10),
        (1.19, 1.64, 0.07, 0.08),
    ],
    segments=10,
)
blob('GEO-Horse-Jaw', 'head', horse, (0, 1.04, 1.65), (0.085, 0.13, 0.08), 8, 5)
tube('GEO-Horse-Muzzle', 'head', horse_muzzle, [(0, 1.14, 1.66), (0, 1.20, 1.63), (0, 1.25, 1.61)], 0.075, 0.05, 8, cap=True)
blob('GEO-Horse-Nose', 'head', horse_muzzle, (0, 1.26, 1.61), (0.072, 0.055, 0.055), 8, 5)
for side, x in (('L', 0.062), ('R', -0.062)):
    cone(f'GEO-Horse-Ear-{side}', f'ear_{side}', horse, (x, 0.93, 1.92), 0.042, 0.014, 0.17,
         rot=(math.radians(-10), 0, math.radians(12 if x > 0 else -12)), vertices=6)
    cone(f'GEO-Horse-Ear-Inner-{side}', f'ear_{side}', horse_muzzle, (x, 0.925, 1.915), 0.026, 0.009, 0.12,
         rot=(math.radians(-10), 0, math.radians(12 if x > 0 else -12)), vertices=6)
for side, x in (('L', 0.100), ('R', -0.100)):
    sphere(f'GEO-Horse-Eye-{side}', 'head', eye, (x, 1.07, 1.77), (0.022, 0.022, 0.022), 8)
    sphere(f'GEO-Horse-Nostril-{side}', 'head', horse_dark, (x * 0.45, 1.255, 1.62), (0.015, 0.018, 0.013), 6)
box('GEO-Horse-Mouth', 'head', horse_dark, (0, 1.275, 1.60), (0.065, 0.015, 0.011), smooth=True)

# Mane: one continuous dark fin on the neck crest, plus the forelock.
fin(
    'GEO-Mane',
    'neck',
    horse_dark,
    [
        (0.50, 1.68, 0.12),
        (0.60, 1.74, 0.13),
        (0.70, 1.83, 0.14),
        (0.80, 1.89, 0.12),
        (0.89, 1.91, 0.09),
    ],
    thickness=0.06,
)
fin(
    'GEO-Forelock',
    'head',
    horse_dark,
    [(0.93, 1.89, 0.10), (0.99, 1.86, 0.10), (1.04, 1.82, 0.06)],
    thickness=0.07,
)

# Tail: a jointed dark volume wide enough to read at the mission camera.
blob('GEO-Tail-Dock', 'tail_1', horse_dark, (0, -0.84, 1.42), (0.09, 0.07, 0.12), 8, 5)
tube('GEO-Tail-1', 'tail_1', horse_dark, [(0, -0.84, 1.40), (0, -0.91, 1.29), (0, -0.96, 1.18)], 0.10, 0.08, 6)
tube('GEO-Tail-2', 'tail_2', horse_dark, [(0, -0.96, 1.18), (0, -1.00, 1.05), (0, -1.02, 0.93)], 0.08, 0.06, 6)
tube('GEO-Tail-3', 'tail_3', horse_dark, [(0, -1.02, 0.93), (0, -1.04, 0.79), (0, -1.05, 0.64)], 0.06, 0.02, 6, cap=True)

# Legs: tapered upper/lower tubes, a small joint sphere at the knee/hock and a
# wider dark hoof. The cannon is thicker than the first pass so it reads at 54.
for side, x in (('L', 0.24), ('R', -0.24)):
    tube_with_blobs(
        f'GEO-Leg-{side}F-Upper',
        f'leg_{side}F_upper',
        horse,
        [(x, 0.50, 1.28), (x, 0.50, 0.96), (x, 0.50, 0.66)],
        0.15,
        0.10,
        8,
        [((x, 0.50, 0.66), (0.10, 0.10, 0.10), 8, 5)],
    )
    tube_with_blobs(
        f'GEO-Leg-{side}F-Lower',
        f'leg_{side}F_lower',
        horse_dark,
        [(x, 0.50, 0.66), (x, 0.52, 0.42), (x, 0.54, 0.19)],
        0.085,
        0.065,
        8,
        [((x, 0.54, 0.19), (0.07, 0.07, 0.07), 8, 5)],
    )
    tube(f'GEO-Hoof-{side}F', f'hoof_{side}F', horse_dark, [(x, 0.55, 0.16), (x, 0.56, 0.0)], 0.075, 0.095, 8, cap=True, smooth=False)
    tube_with_blobs(
        f'GEO-Leg-{side}B-Upper',
        f'leg_{side}B_upper',
        horse,
        [(x, -0.52, 1.30), (x, -0.60, 0.99), (x, -0.66, 0.68)],
        0.16,
        0.105,
        8,
        [((x, -0.66, 0.68), (0.105, 0.105, 0.105), 8, 5)],
    )
    tube_with_blobs(
        f'GEO-Leg-{side}B-Lower',
        f'leg_{side}B_lower',
        horse_dark,
        [(x, -0.64, 0.68), (x, -0.60, 0.44), (x, -0.58, 0.19)],
        0.09,
        0.065,
        8,
        [((x, -0.58, 0.19), (0.07, 0.07, 0.07), 8, 5)],
    )
    tube(f'GEO-Hoof-{side}B', f'hoof_{side}B', horse_dark, [(x, -0.55, 0.16), (x, -0.54, 0.0)], 0.075, 0.095, 8, cap=True, smooth=False)

# ---------------------------------------------------------------------------
# Tack. Saddle, blanket, stirrups, bridle, bit and reins.
# ---------------------------------------------------------------------------
box('GEO-Saddle-Blanket', 'body', saddle_cloth, (0, -0.15, 1.525), (0.50, 0.58, 0.035), bevel=0.015, smooth=True)
blob('GEO-Saddle-Seat', 'body', leather, (0, -0.18, 1.595), (0.24, 0.30, 0.055), 12, 6)
blob('GEO-Saddle-Pommel', 'body', leather, (0, 0.10, 1.675), (0.12, 0.07, 0.085), 8, 5)
blob('GEO-Saddle-Cantle', 'body', leather, (0, -0.44, 1.675), (0.16, 0.065, 0.095), 8, 5)
cylinder('GEO-Saddle-Roll', 'body', saddle_cloth, (0, -0.55, 1.60), 0.075, 0.30, rot=(0, math.pi / 2, 0), vertices=10)
for side, sx in (('L', 1), ('R', -1)):
    tube(f'GEO-Stirrup-Strap-{side}', 'body', leather, [(sx * 0.30, -0.06, 1.58), (sx * 0.35, 0.12, 0.90)], 0.014, 0.012, 6)
    torus(f'GEO-Stirrup-{side}', 'body', metal, (sx * 0.35, 0.13, 0.80), 0.055, 0.013, rot=(math.pi / 2, 0, 0), major_segments=8, minor_segments=4)
tube('GEO-Breast-Strap', 'body', leather, [(-0.28, 0.66, 1.25), (-0.14, 0.74, 1.20), (0, 0.76, 1.18), (0.14, 0.74, 1.20), (0.28, 0.66, 1.25)], 0.014, 0.014, 5)
cylinder('GEO-Bridle-Noseband', 'head', leather, (0, 1.18, 1.65), 0.125, 0.03, rot=(math.pi / 2, 0, 0), vertices=14, smooth=True)
cylinder('GEO-Bridle-Browband', 'head', leather, (0, 1.02, 1.80), 0.135, 0.028, rot=(math.pi / 2, 0, 0), vertices=14, smooth=True)
cylinder('GEO-Bit', 'head', metal, (0, 1.25, 1.61), 0.015, 0.19, rot=(0, math.pi / 2, 0), vertices=8)
for side, sx in (('L', 1), ('R', -1)):
    tube(
        f'GEO-Rein-{side}',
        'head',
        leather,
        [(sx * 0.09, 1.25, 1.61), (sx * 0.20, 0.98, 1.60), (sx * 0.29, 0.30, 1.76)],
        0.012,
        0.010,
        5,
    )

# ---------------------------------------------------------------------------
# Rider. Human scale, seated on the saddle; rigid parts overlap at the joints.
# ---------------------------------------------------------------------------
blob('GEO-Rider-Hip', 'rider_hip', trousers, (0, -0.12, 1.64), (0.18, 0.17, 0.13), 10, 6)
cone('GEO-Rider-CoatSkirt', 'rider_hip', coat, (0, -0.12, 1.68), 0.22, 0.18, 0.20, vertices=12, smooth=True)
tube('GEO-Rider-Torso', 'rider_spine', coat, [(0, -0.10, 1.64), (0, -0.12, 1.94), (0, -0.14, 2.18)], 0.22, 0.19, 10)
blob('GEO-Rider-Shoulders', 'rider_spine', coat, (0, -0.14, 2.14), (0.26, 0.15, 0.11), 10, 6)
cylinder('GEO-Rider-Collar', 'rider_spine', trim, (0, -0.14, 2.21), 0.115, 0.03, vertices=12, smooth=True)
cylinder('GEO-Rider-Belt', 'rider_spine', leather, (0, -0.12, 1.86), 0.205, 0.05, vertices=12, smooth=True)
blob('GEO-Rider-CoatTail', 'rider_hip', coat, (0, -0.34, 1.48), (0.21, 0.13, 0.23), 10, 6)
for side, sx in (('L', 1), ('R', -1)):
    blob(f'GEO-Rider-CoatTail-{side}', 'rider_hip', coat, (sx * 0.16, -0.29, 1.44), (0.09, 0.11, 0.19), 8, 5)
cylinder('GEO-Rider-Neck', 'rider_head', skin, (0, -0.13, 2.26), 0.065, 0.10, vertices=10, smooth=True)
sphere('GEO-Rider-Head', 'rider_head', skin, (0, -0.12, 2.40), (0.135, 0.125, 0.145), 10)
blob('GEO-Rider-Nose', 'rider_head', skin, (0, -0.005, 2.38), (0.035, 0.05, 0.04), 8, 5)
for side, sx in (('L', 1), ('R', -1)):
    sphere(f'GEO-Rider-Eye-{side}', 'rider_head', eye, (sx * 0.05, 0.008, 2.43), (0.017, 0.017, 0.017), 6)
blob('GEO-Rider-Hair', 'rider_head', hair, (0, -0.20, 2.44), (0.15, 0.10, 0.12), 10, 6)
for side, sx in (('L', 1), ('R', -1)):
    tube_with_blobs(
        f'GEO-Rider-Arm-{side}',
        f'rider_arm_{side}',
        coat,
        [(sx * 0.24, -0.12, 2.14), (sx * 0.30, -0.04, 2.05), (sx * 0.34, 0.02, 1.96)],
        0.085,
        0.07,
        8,
        [((sx * 0.24, -0.12, 2.14), (0.095, 0.10, 0.10), 8, 5)],
    )
    tube(
        f'GEO-Rider-Forearm-{side}',
        f'rider_hand_{side}',
        coat,
        [(sx * 0.34, 0.02, 1.96), (sx * 0.32, 0.13, 1.87), (sx * 0.30, 0.24, 1.78)],
        0.07,
        0.055,
        8,
    )
    sphere(f'GEO-Rider-Hand-{side}', f'rider_hand_{side}', skin, (sx * 0.30, 0.245, 1.775), (0.055, 0.075, 0.055), 8)
    tube_with_blobs(
        f'GEO-Rider-Thigh-{side}',
        f'rider_thigh_{side}',
        trousers,
        [(sx * 0.10, -0.10, 1.60), (sx * 0.22, 0.02, 1.45), (sx * 0.34, 0.14, 1.30)],
        0.125,
        0.10,
        8,
        [((sx * 0.10, -0.10, 1.60), (0.12, 0.13, 0.13), 8, 5)],
    )
    tube_with_blobs(
        f'GEO-Rider-Calf-{side}',
        f'rider_calf_{side}',
        leather,
        [(sx * 0.34, 0.14, 1.30), (sx * 0.34, 0.09, 1.10), (sx * 0.34, 0.04, 0.90)],
        0.085,
        0.065,
        8,
        [((sx * 0.34, 0.14, 1.30), (0.095, 0.10, 0.09), 8, 5)],
    )
    tube(f'GEO-Rider-Boot-{side}', f'rider_boot_{side}', leather, [(sx * 0.34, 0.04, 0.90), (sx * 0.34, 0.09, 0.82), (sx * 0.34, 0.18, 0.78)], 0.075, 0.06, 8)
    blob(f'GEO-Rider-Foot-{side}', f'rider_boot_{side}', leather, (sx * 0.34, 0.14, 0.775), (0.065, 0.12, 0.05), 8, 5)

# Sword: a four-sided tapered blade bound to the right hand.
tube(
    'GEO-Rider-Sword-Blade',
    'rider_hand_R',
    sword,
    [(-0.32, 0.28, 1.80), (-0.38, 0.45, 1.66), (-0.44, 0.62, 1.52)],
    0.022,
    0.006,
    4,
    cap=True,
    smooth=False,
)
box('GEO-Rider-Sword-Guard', 'rider_hand_R', trim, (-0.31, 0.26, 1.79), (0.13, 0.03, 0.025), rot=(math.radians(35), 0, 0), smooth=True)

# Hats: exactly one is shown by the variant dressing. Names are part of the contract.
cylinder('GEO-Hat-Bicorn-Brim', 'rider_head', hat_fabric, (0, -0.12, 2.54), 0.22, 0.03, vertices=16, smooth=True)
box('GEO-Hat-Bicorn-Crown', 'rider_head', hat_fabric, (0, -0.12, 2.60), (0.35, 0.17, 0.105), bevel=0.025, smooth=True)
box('GEO-Hat-Bicorn-Trim', 'rider_head', trim, (0, -0.035, 2.555), (0.35, 0.02, 0.035), smooth=True)
cylinder('GEO-Hat-Morion-Brim', 'rider_head', hat_metal, (0, -0.12, 2.54), 0.21, 0.03, vertices=14, smooth=True)
cone('GEO-Hat-Morion-Crown', 'rider_head', hat_metal, (0, -0.12, 2.61), 0.17, 0.065, 0.17, vertices=10)
box('GEO-Hat-Morion-Comb', 'rider_head', trim, (0, -0.12, 2.66), (0.035, 0.26, 0.08), bevel=0.01, smooth=True)
cylinder('GEO-Hat-Kepi-Band', 'rider_head', hat_fabric, (0, -0.12, 2.54), 0.15, 0.032, vertices=12, smooth=True)
kepi_crown = cylinder('GEO-Hat-Kepi-Crown', 'rider_head', hat_fabric, (0, -0.12, 2.60), 0.14, 0.12, vertices=12, smooth=True)
kepi_top = cylinder('GEO-Hat-Kepi-Top', 'rider_head', hat_fabric, (0, -0.12, 2.665), 0.17, 0.026, vertices=12, smooth=True)
# Merge the kepi's flat top into the crown: one visible mesh per hat keeps the
# mounted rig at 16 visible meshes regardless of the selected headwear.
bpy.ops.object.select_all(action='DESELECT')
kepi_top.select_set(True)
kepi_crown.select_set(True)
bpy.context.view_layer.objects.active = kepi_crown
bpy.ops.object.join()
kepi_crown.name = 'GEO-Hat-Kepi-Crown'
box('GEO-Hat-Kepi-Trim', 'rider_head', trim, (0, 0.015, 2.555), (0.30, 0.02, 0.03), smooth=True)

# ---------------------------------------------------------------------------
# Merge flat-coloured parts by material. Hats stay separate because the variant
# dressing toggles them; single-object materials keep their authored names.
# ---------------------------------------------------------------------------
def apply_non_armature_modifiers(obj):
    for mod in list(obj.modifiers):
        if mod.type == 'ARMATURE':
            continue
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)


groups = {}
for obj in list(bpy.data.objects):
    if obj.type != 'MESH' or obj.parent != arm or obj.name.startswith('GEO-Hat-'):
        continue
    material_name = obj.data.materials[0].name if obj.data.materials else 'MAT-Unmaterial'
    groups.setdefault(material_name, []).append(obj)
for material_name, objects in groups.items():
    if len(objects) < 2:
        continue
    for obj in objects:
        apply_non_armature_modifiers(obj)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    objects[0].name = f'GEO-Merged-{material_name.removeprefix("MAT-")}'

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
        for pb in arm.pose.bones:
            # Rotation-only clips: the rig never translates a bone, and dropping
            # the location tracks keeps the GLB small enough for the dist budget.
            pb.keyframe_insert('rotation_euler', frame=frame, group=pb.name)
    arm.animation_data.action = None
    return action


# Idle: breath, weight shift, tail swish and a single ear flick.
key_action('Idle_Loop', 61, [
    (1, {'rot': {
        'body': (0.0, 0, 0.0), 'neck': (0.0, 0, 0.015), 'head': (0.0, 0, -0.015),
        'tail_1': (0.05, 0, 0.07), 'tail_2': (0.02, 0, 0.09), 'tail_3': (0.0, 0, 0.11),
        'rider_spine': (0.0, 0, 0), 'rider_head': (0.0, 0, 0),
    }}),
    (16, {'rot': {
        'body': (-0.01, 0, 0.01), 'neck': (-0.025, 0, 0.04), 'head': (0.015, 0, -0.04),
        'tail_1': (-0.03, 0, -0.09), 'tail_2': (-0.02, 0, -0.11), 'tail_3': (0.0, 0, -0.13),
        'rider_spine': (0.018, 0, 0.008), 'rider_head': (-0.012, 0, -0.004),
        'ear_L': (0.22, 0, 0.05),
    }}),
    (31, {'rot': {
        'body': (0.0, 0, -0.01), 'neck': (0.0, 0, 0.02), 'head': (0.0, 0, -0.02),
        'tail_1': (0.06, 0, 0.10), 'tail_2': (0.03, 0, 0.12), 'tail_3': (0.0, 0, 0.14),
        'rider_spine': (0.0, 0, -0.006), 'rider_head': (0.0, 0, 0.004),
    }}),
    (46, {'rot': {
        'body': (-0.01, 0, -0.008), 'neck': (-0.02, 0, 0.05), 'head': (0.01, 0, -0.05),
        'tail_1': (-0.02, 0, -0.08), 'tail_2': (-0.01, 0, -0.10), 'tail_3': (0.0, 0, -0.12),
        'rider_spine': (0.015, 0, -0.006), 'rider_head': (-0.01, 0, 0.004),
        'ear_R': (0.18, 0, -0.04),
    }}),
    (61, {'rot': {
        'body': (0.0, 0, 0.0), 'neck': (0.0, 0, 0.015), 'head': (0.0, 0, -0.015),
        'tail_1': (0.05, 0, 0.07), 'tail_2': (0.02, 0, 0.09), 'tail_3': (0.0, 0, 0.11),
        'rider_spine': (0.0, 0, 0), 'rider_head': (0.0, 0, 0),
    }}),
])


def trot_pose(phase):
    s = math.sin(phase)
    c = math.cos(phase)
    return {'rot': {
        'body': (0.018 * c, 0, 0.015 * s),
        'neck': (-0.03 + 0.02 * c, 0, 0.02 * s),
        'head': (0.02 - 0.02 * c, 0, -0.02 * s),
        'tail_1': (0.05 + 0.05 * c, 0, 0.08 * s),
        'tail_2': (0.02, 0, 0.10 * s),
        'tail_3': (0.0, 0, 0.12 * s),
        'leg_LF_upper': (0.46 * s, 0, 0),
        'leg_RF_upper': (-0.46 * s, 0, 0),
        'leg_LB_upper': (-0.46 * s, 0, 0),
        'leg_RB_upper': (0.46 * s, 0, 0),
        'leg_LF_lower': (-0.36 * max(0, s), 0, 0),
        'leg_RF_lower': (-0.36 * max(0, -s), 0, 0),
        'leg_LB_lower': (-0.36 * max(0, -s), 0, 0),
        'leg_RB_lower': (-0.36 * max(0, s), 0, 0),
        'hoof_LF': (0.12 * max(0, s), 0, 0),
        'hoof_RF': (0.12 * max(0, -s), 0, 0),
        'hoof_LB': (0.12 * max(0, -s), 0, 0),
        'hoof_RB': (0.12 * max(0, s), 0, 0),
        'rider_spine': (0.022 * c, 0, -0.025 * s),
        'rider_head': (-0.018 * c, 0, 0.012 * s),
        'rider_arm_L': (-0.04 * s, 0, 0),
        'rider_arm_R': (0.04 * s, 0, 0),
    }}


key_action('Walk_Loop', 21, [
    (1, trot_pose(0)),
    (6, trot_pose(math.pi / 2)),
    (11, trot_pose(math.pi)),
    (16, trot_pose(3 * math.pi / 2)),
    (21, trot_pose(2 * math.pi)),
])


def gallop_pose(phase):
    s = math.sin(phase)
    c = math.cos(phase)
    return {'rot': {
        'body': (-0.07 + 0.06 * c, 0, 0.025 * s),
        'neck': (0.04 - 0.03 * c, 0, 0.025 * s),
        'head': (-0.02 + 0.02 * c, 0, -0.025 * s),
        'tail_1': (-0.10 + 0.08 * c, 0, 0.12 * s),
        'tail_2': (-0.06, 0, 0.16 * s),
        'tail_3': (-0.02, 0, 0.20 * s),
        'leg_LF_upper': (0.72 * s, 0, 0),
        'leg_RF_upper': (0.72 * math.sin(phase + 0.55), 0, 0),
        'leg_LB_upper': (0.68 * math.sin(phase + 2.45), 0, 0),
        'leg_RB_upper': (0.68 * math.sin(phase + 3.00), 0, 0),
        'leg_LF_lower': (-0.42 * max(0, s), 0, 0),
        'leg_RF_lower': (-0.42 * max(0, math.sin(phase + 0.55)), 0, 0),
        'leg_LB_lower': (-0.42 * max(0, -math.sin(phase + 2.45)), 0, 0),
        'leg_RB_lower': (-0.42 * max(0, -math.sin(phase + 3.00)), 0, 0),
        'hoof_LF': (0.18 * max(0, s), 0, 0),
        'hoof_RF': (0.18 * max(0, math.sin(phase + 0.55)), 0, 0),
        'hoof_LB': (0.18 * max(0, -math.sin(phase + 2.45)), 0, 0),
        'hoof_RB': (0.18 * max(0, -math.sin(phase + 3.00)), 0, 0),
        'rider_spine': (-0.12 + 0.03 * c, 0, -0.04 * s),
        'rider_head': (0.06 - 0.02 * c, 0, 0.02 * s),
        'rider_arm_L': (-0.08 * s, 0, 0),
        'rider_arm_R': (0.08 * s, 0, 0),
    }}


key_action('Gallop_Loop', 13, [
    (1, gallop_pose(0)),
    (4, gallop_pose(math.pi / 2)),
    (7, gallop_pose(math.pi)),
    (10, gallop_pose(3 * math.pi / 2)),
    (13, gallop_pose(2 * math.pi)),
])

# Attack: the horse rears, the rider raises and cuts with the sword.
key_action('Attack', 31, [
    (1, {'rot': {}}),
    (8, {'rot': {
        'body': (-0.22, 0, 0), 'neck': (0.10, 0, 0.04), 'head': (0.06, 0, -0.04),
        'leg_LF_upper': (-0.55, 0, 0), 'leg_RF_upper': (-0.55, 0, 0),
        'leg_LF_lower': (0.30, 0, 0), 'leg_RF_lower': (0.30, 0, 0),
        'rider_arm_R': (-1.45, 0, 0.2), 'rider_spine': (-0.10, 0, 0.05),
        'rider_head': (0.06, 0, 0),
    }}),
    (16, {'rot': {
        'body': (0.06, 0, 0), 'neck': (-0.08, 0, -0.02), 'head': (-0.03, 0, 0.02),
        'leg_LF_upper': (0.25, 0, 0), 'leg_RF_upper': (0.25, 0, 0),
        'rider_arm_R': (-0.28, 0, -0.10), 'rider_spine': (0.10, 0, -0.05),
        'rider_head': (-0.03, 0, 0),
    }}),
    (24, {'rot': {'body': (0.01, 0, 0), 'rider_arm_R': (0.20, 0, 0), 'rider_spine': (0.03, 0, 0)}}),
    (31, {'rot': {}}),
])

# Death: legs fold, the barrel drops and the rider slumps.
key_action('Death', 41, [
    (1, {'rot': {}}),
    (12, {'rot': {
        'body': (0.24, 0, 0.30), 'neck': (0.22, 0, -0.18), 'head': (0.10, 0, -0.26),
        'leg_LF_upper': (0.65, 0, 0), 'leg_RF_upper': (-0.42, 0, 0),
        'leg_LB_upper': (-0.55, 0, 0), 'leg_RB_upper': (0.55, 0, 0),
        'leg_LF_lower': (-0.55, 0, 0), 'leg_RF_lower': (-0.45, 0, 0),
        'leg_LB_lower': (0.40, 0, 0), 'leg_RB_lower': (0.40, 0, 0),
        'tail_1': (0.20, 0, 0.20), 'tail_2': (0.10, 0, 0.15),
        'rider_spine': (0.32, 0, 0.18), 'rider_head': (0.22, 0, 0.10),
    }}),
    (26, {'rot': {
        'body': (0.38, 0, 0.52), 'neck': (0.35, 0, -0.28), 'head': (0.18, 0, -0.38),
        'leg_LF_upper': (0.95, 0, 0), 'leg_RF_upper': (-0.65, 0, 0),
        'leg_LB_upper': (-0.70, 0, 0), 'leg_RB_upper': (0.80, 0, 0),
        'leg_LF_lower': (-0.75, 0, 0), 'leg_RF_lower': (-0.60, 0, 0),
        'leg_LB_lower': (0.55, 0, 0), 'leg_RB_lower': (0.55, 0, 0),
        'tail_1': (0.28, 0, 0.28), 'tail_2': (0.16, 0, 0.20), 'tail_3': (0.10, 0, 0.16),
        'rider_spine': (0.48, 0, 0.30), 'rider_head': (0.30, 0, 0.20),
    }}),
    (41, {'rot': {
        'body': (0.40, 0, 0.62), 'neck': (0.38, 0, -0.32), 'head': (0.20, 0, -0.42),
        'leg_LF_upper': (0.98, 0, 0), 'leg_RF_upper': (-0.68, 0, 0),
        'leg_LB_upper': (-0.72, 0, 0), 'leg_RB_upper': (0.82, 0, 0),
        'leg_LF_lower': (-0.78, 0, 0), 'leg_RF_lower': (-0.62, 0, 0),
        'leg_LB_lower': (0.58, 0, 0), 'leg_RB_lower': (0.58, 0, 0),
        'tail_1': (0.30, 0, 0.30), 'tail_2': (0.18, 0, 0.22), 'tail_3': (0.12, 0, 0.18),
        'rider_spine': (0.50, 0, 0.32), 'rider_head': (0.32, 0, 0.22),
    }}),
])

arm.animation_data.action = bpy.data.actions.get('Idle_Loop')

# ---------------------------------------------------------------------------
# Save, export and render previews.
# ---------------------------------------------------------------------------
for obj in list(bpy.data.objects):
    if obj != arm and obj.parent != arm:
        bpy.data.objects.remove(obj, do_unlink=True)

# Drop the empty UV layers the primitive helpers created; the asset is untextured.
for obj in bpy.data.objects:
    if obj.type == 'MESH' and 'UVMap' in obj.data.uv_layers:
        obj.data.uv_layers.remove(obj.data.uv_layers['UVMap'])

SCENES.mkdir(parents=True, exist_ok=True)
EXPORTS.mkdir(parents=True, exist_ok=True)
MODELS.mkdir(parents=True, exist_ok=True)
RENDERS.mkdir(parents=True, exist_ok=True)
blend = SCENES / 'mounted_rig.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend), compress=True)

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
triangles = sum(len(p.vertices) - 2 for obj in bpy.data.objects if obj.type == 'MESH' for p in obj.data.polygons)
print('WROTE', glb, glb.stat().st_size, 'bytes', 'tris', triangles, 'bones', len(arm.data.bones))
print('ACTIONS', [a.name for a in bpy.data.actions])

# Workbench contact sheet. The preview plane and camera are not part of the export.
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True
scene.display.shading.cavity_type = 'WORLD'
scene.display.shading.background_type = 'VIEWPORT'
scene.display.shading.background_color = (0.075, 0.085, 0.10)
scene.render.resolution_x = 960
scene.render.resolution_y = 800
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new('World')
scene.world.color = (0.05, 0.06, 0.07)

# The variant dressing shows one hat at runtime; preview the Realista morion alone.
for obj in bpy.data.objects:
    if obj.name.startswith('GEO-Hat-'):
        visible = obj.name.startswith('GEO-Hat-Morion')
        obj.hide_render = not visible
        obj.hide_set(not visible)

bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
ground = bpy.context.object
ground.name = 'PREVIEW-Ground'
ground_mat = material('MAT-Preview-Ground', (0.10, 0.12, 0.13), 0.95)
ground.data.materials.append(ground_mat)

bpy.ops.object.empty_add(location=(0, 0.1, 1.35))
target = bpy.context.object
target.name = 'PREVIEW-Target'
bpy.ops.object.camera_add(location=(3.6, 4.4, 2.2))
cam = bpy.context.object
cam.data.lens = 55
constraint = cam.constraints.new('TRACK_TO')
constraint.target = target
constraint.track_axis = 'TRACK_NEGATIVE_Z'
constraint.up_axis = 'UP_Y'
scene.camera = cam

views = [
    ('three-quarter', (3.6, 4.4, 2.2)),
    ('side', (5.6, 0.2, 1.8)),
    ('rear', (-3.6, -4.2, 2.1)),
    ('front', (0.2, 5.4, 1.7)),
]
poses = [
    ('idle', 'Idle_Loop', 1),
    ('trot', 'Walk_Loop', 6),
    ('gallop', 'Gallop_Loop', 4),
    ('attack', 'Attack', 8),
    ('death', 'Death', 26),
]
for pose_name, action_name, frame in poses:
    arm.animation_data.action = bpy.data.actions.get(action_name)
    scene.frame_set(frame)
    for view_name, loc in views if pose_name == 'idle' else views[:1]:
        cam.location = loc
        scene.render.filepath = str(RENDERS / f'{pose_name}-{view_name}.png')
        bpy.ops.render.render(write_still=True)
print('RENDERS', RENDERS)
