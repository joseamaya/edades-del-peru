"""Build and render the Caral valley vertical slice (art-direction target).

A self-contained diorama of one corner of the Supe valley c. 2600 BC, used to
validate docs/design/art-direction.md before anything is produced for the game:
river bed with riparian forest, a wetland with totora, irrigated fields, a
huarango grove, the desert terrace with quincha houses and the first phase of
the Pyramid Mayor under construction.

Units are game units (a person is 1.86). Historical sources and certainty:
docs/historia/campanas/caral.md. This is a style target, not a reconstruction.

Run from the repository root:
  blender --background --python scripts/blender/build_caral_slice.py -- [--samples=48] [--no-render]
"""

import argparse
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Vector, noise

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'art-src', 'blender', 'caral-slice')
RENDER_DIR = os.path.join(ROOT, 'review', 'caral-slice')

PERSON = 1.86
TERRACE_Z = 7.0
SIZE_X, SIZE_Y = 150.0, 130.0
RES_X, RES_Y = 300, 260


def hex_rgb(value):
    value = value.lstrip('#')
    srgb = [int(value[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb)


# Palette from docs/design/art-direction.md §4.
PAL = {
    'sea': hex_rgb('#3f5f5c'),
    'wet_sand': hex_rgb('#7a6a55'),
    'terrace': hex_rgb('#c2a77f'),
    'rock': hex_rgb('#8a7c6b'),
    'riparian': hex_rgb('#4d5a34'),
    'huarango': hex_rgb('#7d8656'),
    'lomas': hex_rgb('#9aa478'),
    'sky': hex_rgb('#cdd3d2'),
    'plaster_early': hex_rgb('#e6dccb'),
    'ochre': hex_rgb('#c99a55'),
    'red': hex_rgb('#9c4a32'),
    'field_soil': hex_rgb('#5e4a36'),
    'gravel': hex_rgb('#9a8a74'),
    'cotton': hex_rgb('#ece6da'),
    'skin': hex_rgb('#6b3f22'),
    'hair': hex_rgb('#2a1c12'),
    'wood': hex_rgb('#4a3626'),
    'cane': hex_rgb('#b49a68'),
    'reed_green': hex_rgb('#6f7a3e'),
    'stone': hex_rgb('#8d8478'),
    'fire': hex_rgb('#ff8a3a'),
    'deer': hex_rgb('#8a6544'),
}


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--samples', type=int, default=48)
    parser.add_argument('--no-render', action='store_true')
    parser.add_argument('--views', default='close,default,wide')
    return parser.parse_args(argv)


# --------------------------------------------------------------------------- scene


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    return scene


def collection(name):
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col


def link(obj, col):
    col.objects.link(obj)
    return obj


# ----------------------------------------------------------------------- materials


def principled(mat):
    return next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')


def mat_varied(name, color, roughness=0.9, variation=0.12, scale=0.35, bump=0.15):
    """Stylized-realism material: base colour with low-frequency variation and soft bump."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = principled(mat)
    bsdf.inputs['Roughness'].default_value = roughness
    coord = nt.nodes.new('ShaderNodeTexCoord')
    tex = nt.nodes.new('ShaderNodeTexNoise')
    tex.inputs['Scale'].default_value = scale
    tex.inputs['Detail'].default_value = 3.0
    nt.links.new(coord.outputs['Object'], tex.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    dark = tuple(max(0.0, c * (1 - variation)) for c in color)
    light = tuple(min(1.0, c * (1 + variation)) for c in color)
    ramp.color_ramp.elements[0].color = (*dark, 1)
    ramp.color_ramp.elements[1].color = (*light, 1)
    nt.links.new(tex.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    if bump > 0:
        detail = nt.nodes.new('ShaderNodeTexNoise')
        detail.inputs['Scale'].default_value = scale * 18
        nt.links.new(coord.outputs['Object'], detail.inputs['Vector'])
        bump_node = nt.nodes.new('ShaderNodeBump')
        bump_node.inputs['Strength'].default_value = bump
        nt.links.new(detail.outputs['Fac'], bump_node.inputs['Height'])
        nt.links.new(bump_node.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def mat_flat(name, color, roughness=0.85, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = principled(mat)
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*color, 1)
        bsdf.inputs['Emission Strength'].default_value = emission
    return mat


def mat_terrain():
    """Terrain colour comes from a per-vertex attribute, broken up with macro noise."""
    mat = bpy.data.materials.new('MAT-Slice_Terrain')
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = principled(mat)
    bsdf.inputs['Roughness'].default_value = 0.95
    attr = nt.nodes.new('ShaderNodeAttribute')
    attr.attribute_name = 'zone'
    coord = nt.nodes.new('ShaderNodeTexCoord')
    macro = nt.nodes.new('ShaderNodeTexNoise')
    macro.inputs['Scale'].default_value = 0.08
    macro.inputs['Detail'].default_value = 4.0
    nt.links.new(coord.outputs['Object'], macro.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.86, 0.86, 0.86, 1)
    ramp.color_ramp.elements[1].color = (1.1, 1.1, 1.1, 1)
    nt.links.new(macro.outputs['Fac'], ramp.inputs['Fac'])
    mix = nt.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1.0
    nt.links.new(attr.outputs['Color'], mix.inputs['A'])
    nt.links.new(ramp.outputs['Color'], mix.inputs['B'])
    mid = nt.nodes.new('ShaderNodeTexNoise')
    mid.inputs['Scale'].default_value = 1.2
    mid.inputs['Detail'].default_value = 6.0
    mid.inputs['Roughness'].default_value = 0.65
    nt.links.new(coord.outputs['Object'], mid.inputs['Vector'])
    mid_ramp = nt.nodes.new('ShaderNodeValToRGB')
    mid_ramp.color_ramp.elements[0].position = 0.3
    mid_ramp.color_ramp.elements[0].color = (0.8, 0.8, 0.8, 1)
    mid_ramp.color_ramp.elements[1].position = 0.7
    mid_ramp.color_ramp.elements[1].color = (1.12, 1.1, 1.06, 1)
    nt.links.new(mid.outputs['Fac'], mid_ramp.inputs['Fac'])
    mix2 = nt.nodes.new('ShaderNodeMix')
    mix2.data_type = 'RGBA'
    mix2.blend_type = 'MULTIPLY'
    mix2.inputs['Factor'].default_value = 1.0
    nt.links.new(mix.outputs['Result'], mix2.inputs['A'])
    nt.links.new(mid_ramp.outputs['Color'], mix2.inputs['B'])
    nt.links.new(mix2.outputs['Result'], bsdf.inputs['Base Color'])
    detail = nt.nodes.new('ShaderNodeTexNoise')
    detail.inputs['Scale'].default_value = 6.0
    nt.links.new(coord.outputs['Object'], detail.inputs['Vector'])
    bump_node = nt.nodes.new('ShaderNodeBump')
    bump_node.inputs['Strength'].default_value = 0.45
    nt.links.new(detail.outputs['Fac'], bump_node.inputs['Height'])
    nt.links.new(bump_node.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def mat_water(name, color):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = principled(mat)
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = 0.08
    bsdf.inputs['Specular IOR Level'].default_value = 0.6
    coord = nt.nodes.new('ShaderNodeTexCoord')
    waves = nt.nodes.new('ShaderNodeTexNoise')
    waves.inputs['Scale'].default_value = 2.5
    nt.links.new(coord.outputs['Object'], waves.inputs['Vector'])
    bump_node = nt.nodes.new('ShaderNodeBump')
    bump_node.inputs['Strength'].default_value = 0.08
    nt.links.new(waves.outputs['Fac'], bump_node.inputs['Height'])
    nt.links.new(bump_node.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


# ------------------------------------------------------------------------- terrain


def river_y(x):
    return -26.0 + 4.0 * math.sin(x * 0.035 + 0.6)


def smoothstep(a, b, v):
    t = min(1.0, max(0.0, (v - a) / (b - a)))
    return t * t * (3 - 2 * t)


def height(x, y):
    """Valley transect: river bed, flat floodplain, huarango rise, desert terrace, hills."""
    ry = river_y(x)
    d = y - ry
    z = 0.0
    bed = 1.0 - smoothstep(3.0, 7.0, abs(d))
    z -= 1.1 * bed
    z += 0.35 * smoothstep(-12, 6, y)
    z += TERRACE_Z * smoothstep(15.0, 21.0, y)
    z += 9.0 * smoothstep(54.0, 64.0, y) * (0.6 + 0.4 * noise.noise(Vector((x * 0.05, y * 0.05, 1.0))))
    z += 5.0 * smoothstep(-44.0, -58.0, y) * (0.7 + 0.3 * noise.noise(Vector((x * 0.04, 2.0, y * 0.04))))
    z += 0.25 * noise.noise(Vector((x * 0.12, y * 0.12, 0.5)))
    if y > 21:
        z += 0.35 * noise.noise(Vector((x * 0.08, y * 0.08, 3.0)))
    return z


def in_wetland(x, y):
    return ((x + 40) / 13.0) ** 2 + ((y + 38) / 6.0) ** 2 < 1.0


def in_fields(x, y):
    return -55 < x < 45 and -11 < y < 4


def zone_color(x, y, z):
    ry = river_y(x)
    d = abs(y - ry)
    c = Vector(PAL['terrace'])
    floodplain = Vector(PAL['wet_sand']).lerp(Vector(PAL['huarango']), 0.35)
    c = c.lerp(floodplain, 1 - smoothstep(13, 19, y))
    c = c.lerp(Vector(PAL['riparian']).lerp(Vector(PAL['wet_sand']), 0.4), 1 - smoothstep(6, 13, d))
    c = c.lerp(Vector(PAL['gravel']) * 1.08, 1 - smoothstep(3.0, 6.5, d))
    c = c.lerp(Vector(PAL['wet_sand']), (1 - smoothstep(0.0, 2.2, d)) * 0.8)
    if in_fields(x, y):
        c = c.lerp(Vector(PAL['field_soil']), 0.75)
    if in_wetland(x, y):
        c = c.lerp(Vector(PAL['wet_sand']) * 0.7, 0.8)
    c = c.lerp(Vector(PAL['rock']), smoothstep(56, 64, y) * 0.8)
    c = c.lerp(Vector(PAL['rock']).lerp(Vector(PAL['terrace']), 0.4), smoothstep(-46, -58, y) * 0.8)
    slope_rock = smoothstep(15.5, 18.0, y) * (1 - smoothstep(19.5, 21.5, y))
    c = c.lerp(Vector(PAL['rock']).lerp(Vector(PAL['terrace']), 0.5), slope_rock * 0.6)
    return c


def build_terrain(col):
    mesh = bpy.data.meshes.new('GEO-Slice_Terrain')
    verts = []
    for j in range(RES_Y + 1):
        y = -SIZE_Y / 2 + SIZE_Y * j / RES_Y
        for i in range(RES_X + 1):
            x = -SIZE_X / 2 + SIZE_X * i / RES_X
            verts.append((x, y, height(x, y)))
    faces = []
    for j in range(RES_Y):
        for i in range(RES_X):
            a = j * (RES_X + 1) + i
            faces.append((a, a + 1, a + RES_X + 2, a + RES_X + 1))
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    attr = mesh.color_attributes.new('zone', 'FLOAT_COLOR', 'POINT')
    for idx, v in enumerate(mesh.vertices):
        c = zone_color(v.co.x, v.co.y, v.co.z)
        attr.data[idx].color = (c.x, c.y, c.z, 1.0)
    for poly in mesh.polygons:
        poly.use_smooth = True
    obj = bpy.data.objects.new('GEO-Slice_Terrain', mesh)
    obj.data.materials.append(mat_terrain())
    return link(obj, col)


def water_strip(col, mat):
    """Narrow silty channel inside the mostly dry bed."""
    bm = bmesh.new()
    xs = [-SIZE_X / 2 + i * 2.0 for i in range(int(SIZE_X / 2.0) + 1)]
    left, right = [], []
    for x in xs:
        y = river_y(x) + 0.6 * math.sin(x * 0.2)
        w = 2.0 + 0.6 * noise.noise(Vector((x * 0.1, 0, 0)))
        left.append(bm.verts.new((x, y - w, -0.78)))
        right.append(bm.verts.new((x, y + w, -0.78)))
    for k in range(len(xs) - 1):
        bm.faces.new((left[k], left[k + 1], right[k + 1], right[k]))
    mesh = bpy.data.meshes.new('GEO-Slice_River')
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new('GEO-Slice_River', mesh)
    obj.data.materials.append(mat)
    link(obj, col)


def wetland_pool(col, mat):
    bpy.ops.mesh.primitive_circle_add(vertices=40, radius=1.0, fill_type='NGON', location=(-40, -38, 0.0))
    obj = bpy.context.object
    obj.scale = (12.0, 5.4, 1)
    obj.location.z = height(-40, -38) + 0.12
    obj.name = 'GEO-Slice_Wetland'
    obj.data.materials.append(mat)
    for c in obj.users_collection:
        c.objects.unlink(obj)
    link(obj, col)


def canal(col, mat):
    """Irrigation canal along the upper edge of the fields (documented canals; layout assumed)."""
    bm = bmesh.new()
    a, b = [], []
    for k in range(51):
        x = -55 + k * 2.0
        y = 5.0
        z = height(x, y) + 0.06
        a.append(bm.verts.new((x, y - 0.45, z)))
        b.append(bm.verts.new((x, y + 0.45, z)))
    for k in range(50):
        bm.faces.new((a[k], a[k + 1], b[k + 1], b[k]))
    mesh = bpy.data.meshes.new('GEO-Slice_Canal')
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new('GEO-Slice_Canal', mesh)
    obj.data.materials.append(mat)
    link(obj, col)


# ---------------------------------------------------------------------- mesh kits


def mesh_from_bmesh(name, bm):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for poly in mesh.polygons:
        poly.use_smooth = True
    return mesh


def add_blob(bm, center, radii, segments=8, rings=6, jitter=0.12, seed=0, mat_index=0):
    rng = random.Random(seed)
    res = bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings, radius=1.0)
    for v in res['verts']:
        n = 1.0 + jitter * (rng.random() * 2 - 1)
        v.co = Vector((v.co.x * radii[0] * n, v.co.y * radii[1] * n, v.co.z * radii[2] * n)) + Vector(center)
    for f in {f for v in res['verts'] for f in v.link_faces}:
        f.material_index = mat_index
    return res['verts']


def add_tube(bm, points, radius0, radius1, sides=6, mat_index=0):
    rings = []
    for k, p in enumerate(points):
        t = k / max(1, len(points) - 1)
        r = radius0 + (radius1 - radius0) * t
        ring = []
        for s in range(sides):
            ang = 2 * math.pi * s / sides
            ring.append(bm.verts.new(Vector(p) + Vector((math.cos(ang) * r, math.sin(ang) * r, 0))))
        rings.append(ring)
    for k in range(len(rings) - 1):
        for s in range(sides):
            f = bm.faces.new((rings[k][s], rings[k][(s + 1) % sides], rings[k + 1][(s + 1) % sides], rings[k + 1][s]))
            f.material_index = mat_index


def add_blade(bm, base, h, lean, width, mat_index=0):
    x, y, z = base
    lx, ly = lean
    v0 = bm.verts.new((x - width, y, z))
    v1 = bm.verts.new((x + width, y, z))
    v2 = bm.verts.new((x + lx * 0.5 + width * 0.6, y + ly * 0.5, z + h * 0.55))
    v3 = bm.verts.new((x + lx * 0.5 - width * 0.6, y + ly * 0.5, z + h * 0.55))
    v4 = bm.verts.new((x + lx, y + ly, z + h))
    f1 = bm.faces.new((v0, v1, v2, v3))
    f2 = bm.faces.new((v3, v2, v4))
    f1.material_index = mat_index
    f2.material_index = mat_index


def kit_huarango(mats, seed):
    """Huarango (Prosopis): twisted dark trunk, wide flat grey-green crown. ~3.5 people tall."""
    rng = random.Random(seed)
    bm = bmesh.new()
    pts = [(0, 0, 0), (0.25, 0.1, 1.4), (0.1, 0.3, 2.6), (0.5, 0.2, 3.6)]
    add_tube(bm, pts, 0.32, 0.16, sides=6, mat_index=0)
    for k in range(3):
        ang = rng.random() * math.tau
        add_tube(bm, [(0.3, 0.2, 2.8), (0.3 + math.cos(ang) * 1.6, 0.2 + math.sin(ang) * 1.6, 4.0)], 0.12, 0.06, 5, 0)
    for k in range(16):
        ang = rng.random() * math.tau
        r = 0.4 + rng.random() ** 0.7 * 2.6
        add_blob(bm, (0.3 + math.cos(ang) * r, 0.2 + math.sin(ang) * r, 4.2 + rng.random() * 0.9 - r * 0.15),
                 (0.8 + rng.random() * 0.35, 0.8 + rng.random() * 0.35, 0.38), 9, 6, 0.22, seed * 13 + k, 1)
    mesh = mesh_from_bmesh(f'KIT-Huarango_{seed}', bm)
    mesh.materials.append(mats['wood'])
    mesh.materials.append(mats['huarango_leaf'])
    return mesh


def kit_sauce(mats, seed):
    """Riverbank willow: tall trunk, narrow drooping crown."""
    rng = random.Random(seed)
    bm = bmesh.new()
    add_tube(bm, [(0, 0, 0), (0.1, 0, 3.0), (0.2, 0.1, 6.5)], 0.28, 0.12, 6, 0)
    for k in range(12):
        ang = rng.random() * math.tau
        r = rng.random() * 1.2
        add_blob(bm, (math.cos(ang) * r, math.sin(ang) * r, 3.4 + rng.random() * 3.2),
                 (0.7, 0.7, 1.1), 9, 6, 0.2, seed * 7 + k, 1)
    mesh = mesh_from_bmesh(f'KIT-Sauce_{seed}', bm)
    mesh.materials.append(mats['wood'])
    mesh.materials.append(mats['riparian_leaf'])
    return mesh


def kit_reeds(mats, name, seed, count, h, spread, plume):
    """Clump of caña brava (tall, plumed) or carrizo (shorter)."""
    rng = random.Random(seed)
    bm = bmesh.new()
    for k in range(count):
        a = rng.random() * math.tau
        r = rng.random() ** 0.6 * spread
        x, y = math.cos(a) * r, math.sin(a) * r
        hh = h * rng.uniform(0.75, 1.1)
        lean = (x * 0.25 + rng.uniform(-0.3, 0.3), y * 0.25 + rng.uniform(-0.3, 0.3))
        add_blade(bm, (x, y, 0), hh, lean, 0.07, 0)
        if plume and rng.random() < 0.6:
            add_blob(bm, (x + lean[0], y + lean[1], hh + 0.15), (0.12, 0.12, 0.45), 5, 4, 0.1, seed + k, 1)
    mesh = mesh_from_bmesh(f'KIT-{name}_{seed}', bm)
    mesh.materials.append(mats['reed'])
    mesh.materials.append(mats['plume'])
    return mesh


def kit_totora(mats, seed):
    rng = random.Random(seed)
    bm = bmesh.new()
    for k in range(26):
        a = rng.random() * math.tau
        r = rng.random() ** 0.5 * 1.1
        x, y = math.cos(a) * r, math.sin(a) * r
        add_blade(bm, (x, y, -0.2), rng.uniform(1.4, 2.2), (rng.uniform(-0.2, 0.2), rng.uniform(-0.2, 0.2)), 0.04, 0)
    mesh = mesh_from_bmesh(f'KIT-Totora_{seed}', bm)
    mesh.materials.append(mats['reed'])
    return mesh


def kit_crop(mats, kind):
    bm = bmesh.new()
    if kind == 'cotton':
        add_blob(bm, (0, 0, 0.35), (0.35, 0.35, 0.35), 6, 4, 0.2, 1, 0)
        for k in range(2):
            add_blob(bm, (0.2 * math.cos(k * 2.6), 0.2 * math.sin(k * 1.6), 0.6), (0.08, 0.08, 0.08), 4, 3, 0.1, k, 1)
    else:
        add_blob(bm, (0, 0, 0.12), (0.45, 0.45, 0.14), 7, 4, 0.25, 3, 0)
    mesh = mesh_from_bmesh(f'KIT-Crop_{kind}', bm)
    mesh.materials.append(mats['crop'])
    mesh.materials.append(mats['cotton'])
    return mesh


def kit_person(mats, pose):
    """Simple stylized villager (cotton tunic). Stand-in for the game's rigged worker."""
    bm = bmesh.new()
    add_tube(bm, [(0, 0, 0.0), (0, 0, 0.85)], 0.11, 0.12, 6, 1)
    add_tube(bm, [(0, 0, 0.75), (0, 0, 1.45)], 0.24, 0.2, 8, 0)
    add_blob(bm, (0, 0, 1.62), (0.13, 0.13, 0.15), 8, 6, 0.0, 1, 1)
    add_blob(bm, (0, -0.02, 1.68), (0.14, 0.14, 0.1), 8, 5, 0.0, 2, 2)
    if pose == 'carry':
        add_blob(bm, (0, 0.18, 1.55), (0.28, 0.24, 0.24), 6, 5, 0.2, 3, 3)
    elif pose == 'hoe':
        add_tube(bm, [(0.2, -0.3, 0.2), (0.25, 0.2, 1.4)], 0.025, 0.025, 4, 4)
    mesh = mesh_from_bmesh(f'KIT-Person_{pose}', bm)
    for key in ('cotton', 'skin', 'hair', 'shicra', 'wood'):
        mesh.materials.append(mats[key])
    return mesh


def kit_deer(mats):
    bm = bmesh.new()
    add_blob(bm, (0, 0, 1.0), (0.65, 0.28, 0.3), 8, 6, 0.05, 1, 0)
    add_tube(bm, [(0.55, 0, 1.1), (0.75, 0, 1.55)], 0.1, 0.08, 6, 0)
    add_blob(bm, (0.85, 0, 1.6), (0.22, 0.11, 0.12), 6, 5, 0.0, 2, 0)
    for lx in (-0.45, 0.45):
        for ly in (-0.15, 0.15):
            add_tube(bm, [(lx, ly, 0.0), (lx, ly, 0.9)], 0.05, 0.06, 4, 0)
    mesh = mesh_from_bmesh('KIT-Deer', bm)
    mesh.materials.append(mats['deer'])
    return mesh


def kit_bird(mats):
    bm = bmesh.new()
    v = [bm.verts.new(p) for p in ((-0.6, 0.2, 0.1), (0, 0, 0), (0.6, 0.2, 0.1), (0, -0.25, 0))]
    bm.faces.new((v[0], v[1], v[3]))
    bm.faces.new((v[1], v[2], v[3]))
    mesh = mesh_from_bmesh('KIT-Bird', bm)
    mesh.materials.append(mats['bird'])
    return mesh


def kit_pebbles(mats, seed):
    rng = random.Random(seed)
    bm = bmesh.new()
    for k in range(5):
        add_blob(bm, (rng.uniform(-0.8, 0.8), rng.uniform(-0.8, 0.8), 0.02),
                 (rng.uniform(0.12, 0.3), rng.uniform(0.1, 0.25), rng.uniform(0.06, 0.14)), 5, 3, 0.3, seed + k, 0)
    mesh = mesh_from_bmesh(f'KIT-Pebbles_{seed}', bm)
    mesh.materials.append(mats['hearth_stone'])
    return mesh


def kit_shicra_pile(mats, seed):
    """Pile of shicra bags (reed-net bags filled with stones; documented)."""
    rng = random.Random(seed)
    bm = bmesh.new()
    for k in range(14):
        a = rng.random() * math.tau
        r = rng.random() * 1.1
        z = 0.2 + (1.1 - r) * 0.45 + rng.random() * 0.2
        add_blob(bm, (math.cos(a) * r, math.sin(a) * r, z), (0.32, 0.26, 0.22), 6, 4, 0.2, seed + k, 0)
    mesh = mesh_from_bmesh(f'KIT-Shicras_{seed}', bm)
    mesh.materials.append(mats['shicra'])
    return mesh


# ------------------------------------------------------------------- architecture


def add_box(bm, center, size, mat_index=0, bevel=0.0):
    res = bmesh.ops.create_cube(bm, size=1.0)
    for v in res['verts']:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])) + Vector(center)
    faces = {f for v in res['verts'] for f in v.link_faces}
    for f in faces:
        f.material_index = mat_index
    if bevel > 0:
        edges = list({e for v in res['verts'] for e in v.link_edges})
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=1, affect='EDGES', profile=0.5)
    return res['verts']


def build_pyramid(col, mats, origin):
    """Pyramid Mayor, first phase built plus the second phase under construction.

    Stepped platforms (documented), white early-period plaster (documented colour; assignment per
    phase inferred), central stair and a sunken circular plaza in front (documented), shicra piles
    and an unfinished upper platform (construction state; layout assumed).
    """
    ox, oy, oz = origin
    bm = bmesh.new()
    levels = [(34, 24, 2.4), (28, 19, 2.4), (22, 14, 2.4)]
    z = oz
    for w, d, h in levels:
        add_box(bm, (ox, oy, z + h / 2), (w, d, h), 0, bevel=0.12)
        add_box(bm, (ox, oy, z + h - 0.1), (w + 0.25, d + 0.25, 0.22), 1, bevel=0.05)
        z += h
    add_box(bm, (ox - 4, oy + 1, z + 0.6), (9, 9, 1.2), 2, bevel=0.1)
    stair_w = 3.2
    steps = 22
    total_h = z - oz
    sh = total_h / steps
    y_bottom, y_top = oy - 16.0, oy - 7.0
    run = (y_top - y_bottom) / steps
    for s in range(steps):
        add_box(bm, (ox, y_bottom + run * (s + 0.5), oz + sh * (s + 1) / 2), (stair_w, run, sh * (s + 1)), 1)
    add_box(bm, (ox + 3.5, oy + 2, z + 0.25), (2.2, 2.2, 0.5), 3, bevel=0.05)
    mesh = bpy.data.meshes.new('GEO-Slice_PyramidMayor_Phase1')
    bm.to_mesh(mesh)
    bm.free()
    for key in ('plaster_early', 'plaster_band', 'earth_fill', 'altar'):
        mesh.materials.append(mats[key])
    obj = bpy.data.objects.new('GEO-Slice_PyramidMayor_Phase1', mesh)
    link(obj, col)

    bm = bmesh.new()
    cx, cy = ox, oy - 21.5
    ring = bmesh.ops.create_circle(bm, cap_ends=False, radius=5.0, segments=48)
    inner = bmesh.ops.create_circle(bm, cap_ends=False, radius=4.0, segments=48)
    for v in ring['verts']:
        v.co += Vector((cx, cy, oz + 0.35))
    for v in inner['verts']:
        v.co += Vector((cx, cy, oz + 0.35))
    rv, iv = ring['verts'], inner['verts']
    for k in range(48):
        bm.faces.new((rv[k], rv[(k + 1) % 48], iv[(k + 1) % 48], iv[k]))
    floor = bmesh.ops.create_circle(bm, cap_ends=True, radius=4.0, segments=48)
    for v in floor['verts']:
        v.co += Vector((cx, cy, oz - 0.9))
    for k in range(48):
        a = iv[k]
        b = iv[(k + 1) % 48]
        a2 = bm.verts.new((a.co.x, a.co.y, oz - 0.9))
        b2 = bm.verts.new((b.co.x, b.co.y, oz - 0.9))
        bm.faces.new((a, b, b2, a2))
    mesh = bpy.data.meshes.new('GEO-Slice_CircularPlaza')
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mats['plaster_band'])
    obj = bpy.data.objects.new('GEO-Slice_CircularPlaza', mesh)
    link(obj, col)
    return z


def build_quincha_house(col, mats, center, yaw, seed, painted='plaster_early'):
    """Periphery dwelling: huarango posts, cane walls plastered with mud and painted (documented),
    light cane-mat roof over part of the room (roof form assumed), cooking pit and refuse heap behind
    (documented)."""
    rng = random.Random(seed)
    bm = bmesh.new()
    w, d, h, t = 4.6, 3.6, 2.6, 0.18
    add_box(bm, (0, -d / 2, h / 2), (w, t, h), 0, 0.03)
    add_box(bm, (0, d / 2, h / 2), (w, t, h), 0, 0.03)
    add_box(bm, (-w / 2, 0, h / 2), (t, d, h), 0, 0.03)
    add_box(bm, (w / 2 - 0.9, 0, h / 2), (t, d * 0.55, h), 0, 0.03)
    add_box(bm, (0, -d / 2 - 0.01, 0.9), (w * 1.002, 0.02, 0.22), 1)
    for px, py in ((-w / 2, -d / 2), (w / 2, -d / 2), (-w / 2, d / 2), (w / 2, d / 2)):
        add_tube(bm, [(px, py, 0), (px, py, h + 0.25)], 0.1, 0.09, 6, 2)
    add_box(bm, (-0.6, 0.2, h + 0.18), (w * 0.8, d * 0.95, 0.12), 3)
    add_blob(bm, (0.3, d / 2 + 1.6, 0.05), (0.7, 0.6, 0.18), 7, 4, 0.2, seed, 4)
    for k in range(5):
        a = k / 5 * math.tau
        add_blob(bm, (0.3 + math.cos(a) * 0.55, d / 2 + 1.6 + math.sin(a) * 0.45, 0.15),
                 (0.16, 0.14, 0.12), 5, 3, 0.2, seed + k, 5)
    add_blob(bm, (w / 2 + 1.4, d / 2 + 0.8, 0.0), (1.0, 0.9, 0.35), 6, 4, 0.3, seed + 50, 4)
    mesh = bpy.data.meshes.new(f'GEO-Slice_Quincha_{seed}')
    bm.to_mesh(mesh)
    bm.free()
    for key in (painted, 'red_band', 'wood', 'cane_mat', 'refuse', 'hearth_stone'):
        mesh.materials.append(mats[key])
    obj = bpy.data.objects.new(f'GEO-Slice_Quincha_{seed}', mesh)
    obj.location = (center[0], center[1], height(center[0], center[1]) - 0.05)
    obj.rotation_euler = (0, 0, yaw)
    return link(obj, col)


def build_fields(col, mats, crop_meshes):
    """Rows of cotton, squash and beans on the valley floor (documented crops; layout assumed)."""
    plots = [(-52, -10, 17, 13, 'cotton'), (-33, -9, 13, 11, 'squash'), (-18, -10, 15, 13, 'cotton'),
             (0, -9, 12, 11, None), (14, -10, 15, 13, 'squash'), (31, -9, 13, 11, 'cotton')]
    rng = random.Random(7)
    for px, py, w, d, kind in plots:
        if kind is None:
            continue
        rows = int(d / 1.7)
        for r in range(rows):
            y = py + 0.8 + r * 1.7 + rng.uniform(-0.1, 0.1)
            n = int(w / 1.1)
            for k in range(n):
                if rng.random() < 0.3:
                    continue
                x = px + 0.5 + k * 1.1 + rng.uniform(-0.25, 0.25)
                obj = bpy.data.objects.new(f'Crop_{kind}', crop_meshes[kind])
                obj.location = (x, y, height(x, y))
                obj.rotation_euler = (0, 0, rng.random() * math.tau)
                s = rng.uniform(0.6, 1.1)
                obj.scale = (s, s, s * rng.uniform(0.8, 1.2))
                link(obj, col)


def scatter(col, meshes, count, area_fn, seed, scale=(0.85, 1.2), base_name='Veg', z_offset=0.0):
    rng = random.Random(seed)
    placed = 0
    tries = 0
    while placed < count and tries < count * 60:
        tries += 1
        x = rng.uniform(-SIZE_X / 2 + 3, SIZE_X / 2 - 3)
        y = rng.uniform(-SIZE_Y / 2 + 3, SIZE_Y / 2 - 3)
        if not area_fn(x, y, rng):
            continue
        mesh = meshes[rng.randrange(len(meshes))]
        obj = bpy.data.objects.new(base_name, mesh)
        obj.location = (x, y, height(x, y) + z_offset)
        obj.rotation_euler = (0, 0, rng.random() * math.tau)
        s = rng.uniform(*scale)
        obj.scale = (s, s, s)
        link(obj, col)
        placed += 1
    return placed


# --------------------------------------------------------------------- lighting


def setup_world(scene):
    world = bpy.data.worlds.new('World-Slice')
    world.use_nodes = True
    nt = world.node_tree
    bg = nt.nodes.get('Background')
    bg.inputs['Color'].default_value = (*PAL['sky'], 1)
    bg.inputs['Strength'].default_value = 0.9
    scene.world = world

    sun_data = bpy.data.lights.new('LGT-Slice_Sun', 'SUN')
    sun_data.energy = 4.2
    sun_data.angle = math.radians(2.5)
    sun_data.color = (1.0, 0.9, 0.78)
    sun = bpy.data.objects.new('LGT-Slice_Sun', sun_data)
    sun.rotation_euler = (math.radians(58), 0, math.radians(-118))
    scene.collection.objects.link(sun)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()


VIEWS = {
    # name: (camera height above target, pitch in degrees, target, lens) — mirrors the RTS camera views.
    'close': (24.0, 45.0, (-24.0, 14.0, 3.0), 28),
    'default': (46.0, 48.0, (-6.0, 4.0, 2.0), 24),
    'wide': (74.0, 52.0, (0.0, 2.0, 2.0), 22),
}


def render(scene, args):
    os.makedirs(RENDER_DIR, exist_ok=True)
    cam_data = bpy.data.cameras.new('CAM-Slice')
    cam = bpy.data.objects.new('CAM-Slice', cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = args.samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'AgX'
    try:
        scene.view_settings.look = 'AgX - Medium High Contrast'
    except TypeError:
        pass
    for name in args.views.split(','):
        h, pitch, target, lens = VIEWS[name]
        back = h / math.tan(math.radians(pitch))
        cam.location = (target[0], target[1] - back, target[2] + h)
        cam_data.lens = lens
        cam_data.clip_end = 1000
        look_at(cam, target)
        path = os.path.join(RENDER_DIR, f'slice_{name}.png')
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print(f'WROTE {path}')


# ------------------------------------------------------------------------- main


def main():
    args = parse_args()
    scene = reset_scene()
    env = collection('COL-Slice_Environment')
    veg = collection('COL-Slice_Vegetation')
    arch = collection('COL-Slice_Architecture')
    life = collection('COL-Slice_Life')

    mats = {
        'wood': mat_varied('MAT-Slice_HuarangoWood', PAL['wood'], 0.9, 0.2, 2.0, 0.3),
        'huarango_leaf': mat_varied('MAT-Slice_HuarangoLeaf', PAL['huarango'], 0.8, 0.28, 2.5, 0.9),
        'riparian_leaf': mat_varied('MAT-Slice_RiparianLeaf', PAL['riparian'], 0.8, 0.28, 2.5, 0.9),
        'reed': mat_varied('MAT-Slice_Reed', PAL['reed_green'], 0.8, 0.15, 1.5, 0.0),
        'plume': mat_flat('MAT-Slice_Plume', PAL['cane'], 0.9),
        'crop': mat_varied('MAT-Slice_Crop', Vector(PAL['reed_green']).lerp(Vector(PAL['huarango']), 0.5), 0.85),
        'cotton': mat_flat('MAT-Slice_Cotton', PAL['cotton'], 0.9),
        'skin': mat_flat('MAT-Slice_Skin', PAL['skin'], 0.6),
        'hair': mat_flat('MAT-Slice_Hair', PAL['hair'], 0.7),
        'shicra': mat_varied('MAT-Slice_Shicra', PAL['cane'], 0.95, 0.2, 3.0, 0.5),
        'deer': mat_flat('MAT-Slice_Deer', PAL['deer'], 0.8),
        'bird': mat_flat('MAT-Slice_Bird', (0.05, 0.05, 0.05), 0.8),
        'plaster_early': mat_varied('MAT-Slice_PlasterEarly', PAL['plaster_early'], 0.9, 0.06, 0.6, 0.08),
        'plaster_band': mat_varied('MAT-Slice_PlasterBand', PAL['ochre'], 0.9, 0.08, 0.6, 0.08),
        'red_band': mat_flat('MAT-Slice_RedBand', PAL['red'], 0.9),
        'earth_fill': mat_varied('MAT-Slice_EarthFill', PAL['gravel'], 0.95, 0.15, 0.8, 0.3),
        'altar': mat_flat('MAT-Slice_Altar', PAL['fire'], 0.6, emission=6.0),
        'cane_mat': mat_varied('MAT-Slice_CaneMat', PAL['cane'], 0.95, 0.15, 4.0, 0.2),
        'refuse': mat_varied('MAT-Slice_Refuse', Vector(PAL['field_soil']) * 0.9, 0.95, 0.2, 1.5, 0.3),
        'hearth_stone': mat_varied('MAT-Slice_HearthStone', Vector(PAL['stone']) * 0.6, 0.9, 0.2, 2.0, 0.2),
    }
    water_mat = mat_water('MAT-Slice_RiverWater', Vector(PAL['sea']).lerp(Vector(PAL['wet_sand']), 0.35))
    wetland_mat = mat_water('MAT-Slice_WetlandWater', Vector(PAL['sea']).lerp(Vector(PAL['riparian']), 0.4) * 0.8)

    setup_world(scene)
    build_terrain(env)
    water_strip(env, water_mat)
    wetland_pool(env, wetland_mat)
    canal(env, water_mat)

    huarangos = [kit_huarango(mats, s) for s in range(3)]
    sauces = [kit_sauce(mats, s) for s in range(2)]
    canas = [kit_reeds(mats, 'CanaBrava', s, 30, 4.2, 1.3, True) for s in range(2)]
    carrizos = [kit_reeds(mats, 'Carrizo', 10 + s, 22, 2.2, 1.0, False) for s in range(2)]
    totoras = [kit_totora(mats, s) for s in range(2)]
    crops = {'cotton': kit_crop(mats, 'cotton'), 'squash': kit_crop(mats, 'squash')}

    def riparian(x, y, rng):
        d = abs(y - river_y(x))
        return 5.0 < d < 12.5 and not in_fields(x, y) and not in_wetland(x, y)

    def riverbank(x, y, rng):
        d = abs(y - river_y(x))
        return 3.2 < d < 7.5 and not in_fields(x, y)

    def grove(x, y, rng):
        return (7.0 < y < 15.5 or (21.5 < y < 26 and x > 30)) and rng.random() < 0.85

    def wet(x, y, rng):
        return in_wetland(x, y)

    def lomas_scrub(x, y, rng):
        return 24 < y < 54 and rng.random() < 0.12 and not (-12 < x < 36 and 22 < y < 54)

    scatter(veg, sauces, 28, riparian, 1, (0.9, 1.25), 'Sauce')
    scatter(veg, canas, 70, riverbank, 2, (0.85, 1.2), 'CanaBrava')
    scatter(veg, carrizos, 60, riverbank, 3, (0.8, 1.2), 'Carrizo')
    scatter(veg, totoras, 26, wet, 4, (0.8, 1.2), 'Totora')
    scatter(veg, huarangos, 34, grove, 5, (0.85, 1.2), 'Huarango')
    scatter(veg, huarangos, 6, riparian, 6, (0.8, 1.0), 'Huarango')
    scatter(veg, carrizos, 12, lomas_scrub, 7, (0.4, 0.6), 'Scrub')
    build_fields(veg, mats, crops)
    pebbles = [kit_pebbles(mats, s) for s in range(3)]

    def terrace_ground(x, y, rng):
        return y > 22 and rng.random() < 0.5 and not (-8 < x < 34 and 26 < y < 56)

    scatter(veg, pebbles, 120, terrace_ground, 8, (0.8, 1.4), 'Pebbles')

    pyramid_origin = (12.0, 44.0, height(12.0, 44.0))
    top = build_pyramid(arch, mats, pyramid_origin)
    shicra = [kit_shicra_pile(mats, s) for s in range(3)]
    for k, (dx, dy) in enumerate(((-6, 5), (2, 6), (7, 3), (-9, -2))):
        obj = bpy.data.objects.new('Shicras', shicra[k % 3])
        obj.location = (pyramid_origin[0] + dx, pyramid_origin[1] + dy, top)
        link(obj, arch)
    for k, (dx, dy) in enumerate(((-21, -8), (-20, 6), (22, -6), (20, 8))):
        obj = bpy.data.objects.new('Shicras', shicra[k % 3])
        x, y = pyramid_origin[0] + dx, pyramid_origin[1] + dy
        obj.location = (x, y, height(x, y))
        link(obj, arch)

    houses = [(-38, 25, 0.1, 'plaster_early'), (-30, 26.5, -0.15, 'plaster_band'), (-22, 25.5, 0.05, 'plaster_early'),
              (-44, 31, 0.25, 'plaster_band'), (-34, 33, -0.05, 'plaster_early'), (-26, 32, 0.2, 'plaster_early')]
    for k, (x, y, yaw, paint) in enumerate(houses):
        build_quincha_house(arch, mats, (x, y), yaw, 100 + k, paint)

    people = {p: kit_person(mats, p) for p in ('stand', 'carry', 'hoe')}
    rng = random.Random(42)
    spots = (
        [(rng.uniform(-50, 40), rng.uniform(-9, 2), 'hoe') for _ in range(10)]
        + [(pyramid_origin[0] + rng.uniform(-14, 14), pyramid_origin[1] - 14 - rng.uniform(0, 4), 'carry') for _ in range(7)]
        + [(rng.uniform(-42, -20), rng.uniform(23, 35), 'stand') for _ in range(7)]
        + [(rng.uniform(-14, 0), rng.uniform(8, 14), 'carry') for _ in range(4)]
    )
    for x, y, pose in spots:
        obj = bpy.data.objects.new(f'Person_{pose}', people[pose])
        obj.location = (x, y, height(x, y))
        obj.rotation_euler = (0, 0, rng.random() * math.tau)
        s = PERSON / 1.8
        obj.scale = (s, s, s)
        link(obj, life)

    deer = kit_deer(mats)
    for x, y, yaw in ((30, -36, 0.4), (33, -37.5, 0.9), (35.5, -35.5, 2.4)):
        obj = bpy.data.objects.new('Deer', deer)
        obj.location = (x, y, height(x, y))
        obj.rotation_euler = (0, 0, yaw)
        link(obj, life)
    bird = kit_bird(mats)
    for k in range(9):
        obj = bpy.data.objects.new('Bird', bird)
        obj.location = (-10 + k * 2.2 + rng.uniform(-1, 1), -28 + rng.uniform(-3, 3), 9 + rng.uniform(-1.5, 1.5))
        obj.rotation_euler = (0, 0, 0.3 + rng.uniform(-0.2, 0.2))
        link(obj, life)

    os.makedirs(SOURCE_DIR, exist_ok=True)
    blend_path = os.path.join(SOURCE_DIR, 'caral_valley_slice.blend')
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f'SAVED {blend_path}')

    tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    print(f'STATS objects={len(bpy.data.objects)} faces={tris}')

    if not args.no_render:
        render(scene, args)


if __name__ == '__main__':
    main()
