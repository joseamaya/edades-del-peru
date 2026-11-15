"""Build the cinematic m5 Yahuar Pampa intro scene and render it.

Run from the repository root:
  blender --background --python scripts/blender/build_chanca_intro.py -- --preview
  blender --background --python scripts/blender/build_chanca_intro.py
"""

from __future__ import annotations

import math
import random
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
import build_chanca_heightmap as hm  # noqa: E402

ARGS = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
PREVIEW = '--preview' in ARGS
OUT_DIR = ROOT / 'art-src' / 'blender' / 'chanca'
RENDER_PATH = Path('/tmp/opencode/chanca_scene.png') if PREVIEW else OUT_DIR / 'renders' / 'chanca_hero.png'
BLEND_PATH = OUT_DIR / 'chanca_intro.blend'

SITE = Vector((179.8, 97.3, 5.0))
SITE_SCALE = 1.12
WORLD = 256.0
SOURCE = 160.0
RNG = random.Random(1438)


def ground_height(x: float, z: float) -> float:
    return hm.height(x * SOURCE / WORLD, z * SOURCE / WORLD)


def ground_color(x: float, z: float) -> tuple[float, float, float]:
    w = hm.ground_weights(x * SOURCE / WORLD, z * SOURCE / WORLD)
    palette = (
        (0.16, 0.21, 0.07),
        (0.28, 0.19, 0.10),
        (0.38, 0.30, 0.16),
        (0.25, 0.24, 0.22),
    )
    return tuple(sum(w[k] * palette[k][c] for k in range(4)) for c in range(3))


def clear() -> None:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights, bpy.data.images):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def material(name: str, color: tuple[float, float, float], roughness: float, bump: float = 0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    if bump:
        noise = nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 12.0
        noise.inputs['Detail'].default_value = 5.0
        bump_node = nodes.new('ShaderNodeBump')
        bump_node.inputs['Strength'].default_value = bump
        bump_node.inputs['Distance'].default_value = 0.1
        links.new(noise.outputs['Fac'], bump_node.inputs['Height'])
        links.new(bump_node.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


MAT = {}


def init_materials() -> None:
    MAT['grass'] = material('grass', (0.16, 0.21, 0.07), 1.0, 0.15)
    MAT['dirt'] = material('dirt', (0.28, 0.19, 0.10), 1.0, 0.2)
    MAT['sand'] = material('sand', (0.38, 0.30, 0.16), 1.0, 0.1)
    MAT['rock'] = material('rock', (0.25, 0.24, 0.22), 0.95, 0.25)
    MAT['stone'] = material('stone', (0.34, 0.31, 0.26), 0.9, 0.25)
    MAT['stone_dark'] = material('stone_dark', (0.19, 0.18, 0.16), 0.92, 0.2)
    MAT['earth'] = material('earth', (0.28, 0.20, 0.12), 1.0, 0.2)
    MAT['wood'] = material('wood', (0.16, 0.10, 0.06), 0.95, 0.1)
    MAT['cloth'] = material('cloth', (0.36, 0.12, 0.07), 0.92, 0.05)
    MAT['cloth_dark'] = material('cloth_dark', (0.18, 0.08, 0.05), 0.94, 0.05)
    MAT['cloth_ochre'] = material('cloth_ochre', (0.46, 0.26, 0.09), 0.92, 0.05)
    MAT['skin'] = material('skin', (0.33, 0.18, 0.10), 0.75, 0.05)
    MAT['hair'] = material('hair', (0.07, 0.05, 0.04), 0.9, 0.1)
    MAT['paint'] = material('paint', (0.52, 0.08, 0.05), 0.85, 0.0)
    MAT['paint_dark'] = material('paint_dark', (0.08, 0.06, 0.05), 0.85, 0.0)
    fire = material('fire', (1.0, 0.35, 0.06), 0.4, 0.0)
    bsdf = next(n for n in fire.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Emission Color'].default_value = (1.0, 0.28, 0.04, 1)
    bsdf.inputs['Emission Strength'].default_value = 12.0
    MAT['fire'] = fire
    MAT['mountain'] = material('mountain', (0.10, 0.14, 0.20), 1.0, 0.0)
    MAT['path'] = texture_material(
        'chanca_path',
        ROOT / 'src' / 'assets' / 'textures' / 'materials' / 'ground_path_diffuse.webp',
        0.5,
        (0.68, 0.56, 0.40),
        1.0,
    )


def add_mountains():
    specs = [
        (280, 55, 34, 62), (315, 85, 42, 74), (300, 130, 38, 68), (270, 170, 30, 54),
        (330, 40, 36, 66), (360, 110, 46, 80), (245, 210, 40, 58), (210, 245, 34, 48),
        (120, 250, 30, 44), (60, 210, 28, 40), (370, 190, 34, 60), (390, 70, 30, 52),
    ]
    for x, z, radius, height in specs:
        bpy.ops.mesh.primitive_cone_add(
            vertices=7,
            radius1=radius,
            radius2=radius * 0.15,
            depth=height,
            location=(x, z, height / 2 - 2),
        )
        obj = bpy.context.object
        obj.name = 'mountain'
        obj.scale = (1.0, 0.75, 1.0)
        obj.data.materials.append(MAT['mountain'])


def load_image(path: Path, non_color: bool = False):
    img = bpy.data.images.load(str(path), check_existing=True)
    if non_color:
        img.colorspace_settings.name = 'Non-Color'
    return img


def tex_node(nodes, links, path: Path, scale: float, non_color: bool = False, use_uv: bool = False):
    if use_uv:
        coord = nodes.new('ShaderNodeUVMap')
    else:
        coord = nodes.new('ShaderNodeTexCoord')
    mapping = nodes.new('ShaderNodeMapping')
    mapping.inputs['Scale'].default_value = (scale, scale, scale)
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = load_image(path, non_color)
    tex.interpolation = 'Linear'
    links.new(coord.outputs['UV'] if use_uv else coord.outputs['Object'], mapping.inputs['Vector'])
    links.new(mapping.outputs['Vector'], tex.inputs['Vector'])
    return tex


def terrain_material():
    mat = bpy.data.materials.new('chanca_ground')
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    attr = nodes.new('ShaderNodeAttribute')
    attr.attribute_name = 'Weights'
    sep = nodes.new('ShaderNodeSeparateXYZ')
    links.new(attr.outputs['Vector'], sep.inputs['Vector'])
    rock_attr = nodes.new('ShaderNodeAttribute')
    rock_attr.attribute_name = 'Rock'
    texdir = ROOT / 'src' / 'assets' / 'textures' / 'terrain'
    grass = tex_node(nodes, links, texdir / 'puna_grass_albedo.webp', 0.08)
    dirt = tex_node(nodes, links, texdir / 'dirt_albedo.webp', 0.08)
    sand = tex_node(nodes, links, texdir / 'sand_albedo.webp', 0.08)
    rock = tex_node(nodes, links, texdir / 'rock_albedo.webp', 0.08)
    mix1 = nodes.new('ShaderNodeMixRGB')
    mix1.blend_type = 'MIX'
    links.new(grass.outputs['Color'], mix1.inputs['Color1'])
    links.new(dirt.outputs['Color'], mix1.inputs['Color2'])
    links.new(sep.outputs['Y'], mix1.inputs['Fac'])
    mix2 = nodes.new('ShaderNodeMixRGB')
    mix2.blend_type = 'MIX'
    links.new(mix1.outputs['Color'], mix2.inputs['Color1'])
    links.new(sand.outputs['Color'], mix2.inputs['Color2'])
    links.new(sep.outputs['Z'], mix2.inputs['Fac'])
    mix3 = nodes.new('ShaderNodeMixRGB')
    mix3.blend_type = 'MIX'
    links.new(mix2.outputs['Color'], mix3.inputs['Color1'])
    links.new(rock.outputs['Color'], mix3.inputs['Color2'])
    links.new(rock_attr.outputs['Fac'], mix3.inputs['Fac'])
    links.new(mix3.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 1.0
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 0.35
    noise.inputs['Detail'].default_value = 6.0
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.3
    bump.inputs['Distance'].default_value = 0.25
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def texture_material(
    name: str,
    path: Path,
    scale: float,
    tint: tuple[float, float, float],
    roughness: float,
    use_uv: bool = False,
):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    tex = tex_node(nodes, links, path, scale, use_uv=use_uv)
    mix = nodes.new('ShaderNodeMixRGB')
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Fac'].default_value = 1.0
    links.new(tex.outputs['Color'], mix.inputs['Color1'])
    mix.inputs['Color2'].default_value = (*tint, 1)
    links.new(mix.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = roughness
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 18.0
    noise.inputs['Detail'].default_value = 5.0
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.2
    bump.inputs['Distance'].default_value = 0.12
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def build_terrain(n: int = 193):
    verts = []
    faces = []
    colors = []
    weights = []
    for iz in range(n):
        z = iz * WORLD / (n - 1)
        for ix in range(n):
            x = ix * WORLD / (n - 1)
            verts.append((x, z, ground_height(x, z)))
            colors.append((*ground_color(x, z), 1.0))
            weights.append(hm.ground_weights(x * SOURCE / WORLD, z * SOURCE / WORLD))
    for iz in range(n - 1):
        for ix in range(n - 1):
            a = iz * n + ix
            b = a + 1
            c = a + n
            d = c + 1
            faces.extend(((a, b, d), (a, d, c)))
    mesh = bpy.data.meshes.new('chanca_terrain')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new('chanca_terrain', mesh)
    bpy.context.collection.objects.link(obj)
    attr = mesh.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='POINT')
    for i, color in enumerate(colors):
        attr.data[i].color = color
    wattr = mesh.attributes.new(name='Weights', type='FLOAT_VECTOR', domain='POINT')
    rattr = mesh.attributes.new(name='Rock', type='FLOAT', domain='POINT')
    for i, w in enumerate(weights):
        wattr.data[i].vector = (w[0], w[1], w[2])
        rattr.data[i].value = w[3]
    obj.data.materials.append(terrain_material())
    return obj


def add_cyl(name, loc, radius, depth, mat, vertices=8, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def add_cone(name, loc, r1, r2, depth, mat, vertices=8, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices, radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def add_ico(name, loc, radius, mat, subdivisions=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=radius, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def add_box(name, loc, size, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj


def add_tent(loc, yaw, scale=1.0):
    x, y, z = loc
    rot = (0, 0, yaw)
    add_cone('tent', (x, y, z + 0.9 * scale), 1.25 * scale, 0.06 * scale, 1.8 * scale, MAT['cloth'], 7, rot)
    add_cone('tent_dark', (x, y, z + 0.55 * scale), 0.55 * scale, 0.03 * scale, 0.9 * scale, MAT['cloth_dark'], 5, rot)
    add_cyl('tent_pole', (x, y, z + 1.8 * scale), 0.035, 0.5 * scale, MAT['wood'], 6)


def add_banner(loc, yaw, height=3.2, color='cloth'):
    x, y, z = loc
    add_cyl('banner_pole', (x, y, z + height / 2), 0.04, height, MAT['wood'], 6)
    # cloth plane, slightly angled, with two stripes
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x + math.sin(yaw) * 0.02, y + math.cos(yaw) * 0.02, z + height * 0.72))
    cloth = bpy.context.object
    cloth.name = 'banner_cloth'
    cloth.scale = (0.55, 0.9, 1)
    cloth.rotation_euler = (math.radians(90), 0, yaw)
    cloth.data.materials.append(MAT[color])
    # stripe
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x, y - 0.012, z + height * 0.72))
    stripe = bpy.context.object
    stripe.name = 'banner_stripe'
    stripe.scale = (0.10, 0.85, 1)
    stripe.rotation_euler = (math.radians(90), 0, yaw)
    stripe.data.materials.append(MAT['cloth_dark'])


def add_smoke(loc):
    x, y, z = loc
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + 2.4))
    obj = bpy.context.object
    obj.name = 'smoke'
    obj.scale = (1.1, 1.1, 3.6)
    mat = bpy.data.materials.new('smoke_volume')
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    out = next(n for n in nodes if n.type == 'OUTPUT_MATERIAL')
    vol = nodes.new('ShaderNodeVolumePrincipled')
    vol.inputs['Color'].default_value = (0.55, 0.55, 0.58, 1)
    vol.inputs['Density'].default_value = 0.035
    vol.inputs['Anisotropy'].default_value = 0.35
    links.new(vol.outputs['Volume'], out.inputs['Volume'])
    obj.data.materials.append(mat)
    obj.display_type = 'BOUNDS'


def add_campfire(loc):
    x, y, z = loc
    for i in range(7):
        a = i / 7 * math.tau
        add_ico('fire_stone', (x + math.cos(a) * 0.55, y + math.sin(a) * 0.55, z + 0.08), 0.12, MAT['stone'], 1)
    add_cyl('fire_log', (x, y, z + 0.10), 0.05, 0.9, MAT['wood'], 6, (0, math.radians(90), 0))
    add_cyl('fire_log2', (x, y, z + 0.12), 0.05, 0.8, MAT['wood'], 6, (math.radians(70), 0, math.radians(40)))
    add_cone('fire', (x, y, z + 0.35), 0.28, 0.02, 0.65, MAT['fire'], 7)


def add_warrior(loc, yaw, lean=0.0, leader=False):
    x, y, z = loc
    skin = MAT['skin']
    cloth = MAT['cloth']
    # legs
    add_cyl('leg_l', (x - 0.11, y, z + 0.45), 0.07, 0.85, skin, 6, (0, lean * 0.4, 0))
    add_cyl('leg_r', (x + 0.11, y, z + 0.45), 0.07, 0.85, skin, 6, (0, -lean * 0.4, 0))
    # tunic / torso / mantle
    add_cone('tunic', (x, y, z + 0.95), 0.26, 0.18, 0.58, cloth, 7, (0, 0, yaw))
    add_cyl('torso', (x, y, z + 1.28), 0.17, 0.34, cloth, 7, (0, 0, yaw))
    add_cone('mantle', (x, y, z + 1.36), 0.27, 0.19, 0.16, MAT['cloth_dark'], 7, (0, 0, yaw))
    # arms
    add_cyl('arm_l', (x - 0.25, y, z + 1.24), 0.05, 0.56, skin, 6, (lean, 0, 0.18))
    add_cyl('arm_r', (x + 0.25, y, z + 1.24), 0.05, 0.56, skin, 6, (-lean, 0, -0.18))
    # head / hair / headband
    add_ico('head', (x, y, z + 1.58), 0.115, skin, 2)
    add_ico('hair', (x, y - 0.015, z + 1.63), 0.12, MAT['hair'], 1)
    add_cyl('headband', (x, y, z + 1.62), 0.125, 0.04, MAT['cloth_ochre'], 10)
    # face paint: a red band across the eyes and a dark stripe
    add_box('paint_red', (x, y - 0.112, z + 1.59), (0.18, 0.012, 0.028), MAT['paint'])
    add_box('paint_black', (x, y - 0.116, z + 1.53), (0.13, 0.010, 0.018), MAT['paint_dark'])
    # macana in the right hand
    add_cyl('macana', (x + 0.31, y - 0.04, z + 1.0), 0.03, 0.75, MAT['wood'], 6, (0, math.radians(22), 0))
    add_ico('macana_head', (x + 0.44, y - 0.04, z + 0.64), 0.10, MAT['stone'], 1)
    if leader:
        # a cloak and a taller banner
        add_cyl('cloak', (x, y + 0.06, z + 1.05), 0.31, 0.88, MAT['cloth_dark'], 7, (0, 0, yaw))
        add_banner((x - 0.5, y + 0.1, z), yaw, 3.3, 'cloth_ochre')


def add_path():
    points = [(150, 74), (156, 79), (162, 84), (168, 89), (174, 93), (180, 96), (186, 98)]
    verts = []
    faces = []
    for i, (x, z) in enumerate(points):
        for side in (-0.7, 0.7):
            verts.append((x + side, z, ground_height(x + side, z) + 0.04))
    for i in range(len(points) - 1):
        a = i * 2
        faces.append((a, a + 1, a + 3, a + 2))
    mesh = bpy.data.meshes.new('path')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new('path', mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(MAT['path'])


def scatter():
    # rocks, grass tufts and shrubs around the site and the foreground
    for _ in range(130):
        x = RNG.uniform(115, 235)
        z = RNG.uniform(40, 165)
        if (x - SITE.x) ** 2 + (z - SITE.y) ** 2 < 11**2:
            continue
        if abs(x - 170) < 5 and abs(z - 85) < 16:
            continue
        y = ground_height(x, z)
        r = RNG.uniform(0.18, 0.8)
        obj = add_ico('rock', (x, z, y + r * 0.35), r, MAT['rock'], 1)
        obj.scale = (RNG.uniform(0.7, 1.4), RNG.uniform(0.7, 1.4), RNG.uniform(0.45, 0.8))
    for _ in range(300):
        x = RNG.uniform(115, 235)
        z = RNG.uniform(40, 165)
        if (x - SITE.x) ** 2 + (z - SITE.y) ** 2 < 12**2:
            continue
        y = ground_height(x, z)
        for k in range(3):
            a = RNG.uniform(0, math.tau)
            add_cone(
                'grass',
                (x + math.cos(a) * 0.12, z + math.sin(a) * 0.12, y + 0.28),
                0.05,
                0.004,
                RNG.uniform(0.35, 0.7),
                MAT['grass'],
                4,
                (0, RNG.uniform(-0.15, 0.15), a),
            )
    for _ in range(24):
        x = RNG.uniform(120, 230)
        z = RNG.uniform(45, 160)
        if (x - SITE.x) ** 2 + (z - SITE.y) ** 2 < 13**2:
            continue
        y = ground_height(x, z)
        obj = add_ico('shrub', (x, z, y + 0.35), RNG.uniform(0.35, 0.75), MAT['grass'], 1)
        obj.scale = (1.0, 1.0, RNG.uniform(0.6, 1.0))


def add_bump(mat, scale=14.0, strength=0.25):
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf:
        return
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = scale
    noise.inputs['Detail'].default_value = 5.0
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = strength
    bump.inputs['Distance'].default_value = 0.12
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])


PUCARA_YAW = math.radians(8)


def world(lx: float, lz: float) -> tuple[float, float]:
    c = math.cos(PUCARA_YAW)
    s = math.sin(PUCARA_YAW)
    return (SITE.x + lx * c - lz * s, SITE.y + lx * s + lz * c)


def bm_cube(bm: bmesh.types.BMesh, center, size, yaw=PUCARA_YAW):
    cx, cy, cz = center
    sx, sy, sz = size
    c = math.cos(yaw)
    s = math.sin(yaw)
    corners = [
        (-sx / 2, -sy / 2, -sz / 2),
        (sx / 2, -sy / 2, -sz / 2),
        (sx / 2, sy / 2, -sz / 2),
        (-sx / 2, sy / 2, -sz / 2),
        (-sx / 2, -sy / 2, sz / 2),
        (sx / 2, -sy / 2, sz / 2),
        (sx / 2, sy / 2, sz / 2),
        (-sx / 2, sy / 2, sz / 2),
    ]
    verts = [
        bm.verts.new((cx + x * c - y * s, cy + x * s + y * c, cz + z))
        for x, y, z in corners
    ]
    for face in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
        f = bm.faces.new([verts[i] for i in face])
        f.material_index = RNG.randint(0, 2)


def wall_stones_x(bm, z_local, x0, x1, base_z, height, depth=0.34):
    z = base_z
    while z < base_z + height:
        h = min(RNG.uniform(0.28, 0.42), base_z + height - z)
        x = x0
        while x < x1:
            w = min(RNG.uniform(0.5, 1.0), x1 - x)
            if w < 0.18:
                break
            if RNG.random() < 0.05:
                x += w + 0.045
                continue
            wx, wy = world(x + w / 2, z_local + RNG.uniform(-0.09, 0.09))
            bm_cube(bm, (wx, wy, z + h / 2), (w, depth, h))
            x += w + 0.055
        z += h + 0.055


def wall_stones_z(bm, x_local, z0, z1, base_z, height, depth=0.34):
    z = base_z
    while z < base_z + height:
        h = min(RNG.uniform(0.28, 0.42), base_z + height - z)
        zz = z0
        while zz < z1:
            w = min(RNG.uniform(0.5, 1.0), z1 - zz)
            if w < 0.18:
                break
            if RNG.random() < 0.05:
                zz += w + 0.045
                continue
            wx, wy = world(x_local + RNG.uniform(-0.09, 0.09), zz + w / 2)
            bm_cube(bm, (wx, wy, z + h / 2), (depth, w, h))
            zz += w + 0.055
        z += h + 0.055


def make_stone_mesh(bm, name, materials):
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=0.028, segments=1, affect='EDGES')
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for mat in materials:
        obj.data.materials.append(mat)
    return obj


def stone_variant(name: str, base: tuple[float, float, float]):
    mat = material(name, base, 0.92, 0.35)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 2.6
    noise.inputs['Detail'].default_value = 6.0
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.28
    ramp.color_ramp.elements[0].color = (*[c * 0.72 for c in base], 1)
    ramp.color_ramp.elements[1].position = 0.78
    ramp.color_ramp.elements[1].color = (*[min(1.0, c * 1.18) for c in base], 1)
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


def build_pucara():
    materials = ROOT / 'src' / 'assets' / 'textures' / 'materials'
    stone_set = [
        stone_variant('pucara_stone_a', (0.34, 0.31, 0.27)),
        stone_variant('pucara_stone_b', (0.26, 0.24, 0.21)),
        stone_variant('pucara_stone_c', (0.42, 0.38, 0.33)),
    ]
    stone = stone_set[1]
    earth = texture_material('pucara_earth', materials / 'ground_path_diffuse.webp', 0.25, (0.68, 0.53, 0.36), 1.0)
    thatch = texture_material('pucara_thatch', materials / 'roof_thatch_diffuse.webp', 0.9, (0.70, 0.56, 0.38), 0.95)
    wood = material('pucara_wood', (0.15, 0.09, 0.05), 0.9, 0.15)
    dark = material('pucara_dark', (0.10, 0.09, 0.08), 0.95, 0.1)
    clay = material('pucara_clay', (0.42, 0.26, 0.14), 0.95, 0.1)
    fire = MAT['fire']

    # platform and its retaining course
    add_box('pucara_platform', (*world(0, 0), 5.6), (18, 14, 1.2), earth, (0, 0, PUCARA_YAW))
    bm = bmesh.new()
    wall_stones_x(bm, -7.0, -9, 9, 5.0, 1.2)
    wall_stones_x(bm, 7.0, -9, 9, 5.0, 1.2)
    wall_stones_z(bm, -9.0, -7.0, 7.0, 5.0, 1.2)
    wall_stones_z(bm, 9.0, -7.0, 7.0, 5.0, 1.2)
    make_stone_mesh(bm, 'pucara_platform_stones', stone_set)

    # wall cores
    for x0, x1 in ((-9, -2.2), (2.2, 9)):
        add_box('pucara_wall_s', (*world((x0 + x1) / 2, -6.55), 7.3), (x1 - x0, 0.7, 2.2), dark, (0, 0, PUCARA_YAW))
    add_box('pucara_wall_n', (*world(0, 6.55), 7.3), (18, 0.7, 2.2), dark, (0, 0, PUCARA_YAW))
    add_box('pucara_wall_w', (*world(-8.55, 0), 7.3), (0.7, 13, 2.2), dark, (0, 0, PUCARA_YAW))
    add_box('pucara_wall_e', (*world(8.55, 0), 7.3), (0.7, 13, 2.2), dark, (0, 0, PUCARA_YAW))

    # stone facing
    bm = bmesh.new()
    wall_stones_x(bm, -6.9, -9, -2.2, 6.2, 2.2)
    wall_stones_x(bm, -6.9, 2.2, 9, 6.2, 2.2)
    wall_stones_x(bm, 6.9, -9, 9, 6.2, 2.2)
    wall_stones_z(bm, -8.9, -6.5, 6.5, 6.2, 2.2)
    wall_stones_z(bm, 8.9, -6.5, 6.5, 6.2, 2.2)
    make_stone_mesh(bm, 'pucara_wall_stones', stone_set)

    # low parapet on the wall head
    bm = bmesh.new()
    wall_stones_x(bm, -6.9, -9, -2.4, 8.3, 0.45, depth=0.3)
    wall_stones_x(bm, -6.9, 2.4, 9, 8.3, 0.45, depth=0.3)
    wall_stones_x(bm, 6.9, -9, 9, 8.3, 0.45, depth=0.3)
    wall_stones_z(bm, -8.9, -6.5, 6.5, 8.3, 0.45, depth=0.3)
    wall_stones_z(bm, 8.9, -6.5, 6.5, 8.3, 0.45, depth=0.3)
    make_stone_mesh(bm, 'pucara_parapet', stone_set)

    # towers
    for lx, lz, radius, height in (
        (-6.0, 4.5, 1.55, 4.6),
        (0.0, 5.0, 1.55, 4.6),
        (6.0, 4.5, 1.55, 4.6),
        (-7.0, -5.0, 1.15, 3.8),
        (7.0, -5.0, 1.15, 3.8),
    ):
        wx, wy = world(lx, lz)
        add_cyl('tower_base', (wx, wy, 6.55), radius + 0.25, 0.7, stone, 24)
        add_cyl('tower', (wx, wy, 9.0 if height > 4 else 8.2), radius, height, stone, 24)
        top_z = 6.2 + height
        add_cyl('tower_ring', (wx, wy, top_z + 0.1), radius + 0.25, 0.3, stone, 24)
        add_cone('tower_roof', (wx, wy, top_z + 0.95), radius + 0.5, 0.08, 1.5, thatch, 16)
        add_cyl('tower_finial', (wx, wy, top_z + 1.95), 0.07, 0.55, wood, 6)
        add_box('tower_door', (*world(lx, lz - 1.1), 7.15), (0.75, 0.14, 1.5), dark, (0, 0, PUCARA_YAW))

    # gate, lintel and doors
    for lx in (-2.25, 2.25):
        add_box('gate_post', (*world(lx, -6.85), 7.8), (0.38, 0.38, 3.2), wood, (0, 0, PUCARA_YAW))
    add_box('gate_lintel', (*world(0, -6.85), 9.35), (5.0, 0.45, 0.4), wood, (0, 0, PUCARA_YAW))
    for lx in (-1.05, 1.05):
        add_box('gate_door', (*world(lx, -7.0), 7.5), (1.05, 0.14, 2.6), wood, (0, 0, PUCARA_YAW))
        for k in range(4):
            add_box('gate_plank', (*world(lx - 0.39 + k * 0.26, -7.08), 7.5), (0.06, 0.03, 2.55), dark, (0, 0, PUCARA_YAW))

    # stairs
    for i in range(4):
        lz = -7.25 - i * 0.5
        height = 1.05 - i * 0.26
        add_box('stair', (*world(0, lz), 5.0 + height / 2), (4.6, 0.55, height), earth, (0, 0, PUCARA_YAW))

    # interior altar and a storehouse
    wx, wy = world(0, 0)
    add_cyl('altar', (wx, wy, 6.55), 0.75, 0.7, stone, 12)
    add_cone('altar_fire', (wx, wy, 7.15), 0.28, 0.02, 0.5, fire, 7)

    bx, by = world(4.8, 2.8)
    add_box('storehouse', (bx, by, 7.0), (3.0, 2.2, 1.6), stone, (0, 0, PUCARA_YAW))
    add_cone('storehouse_roof', (bx, by, 8.2), 2.2, 0.05, 1.1, thatch, 8)
    for k in range(3):
        jx, jy = world(3.4 + k * 0.5, 1.3)
        add_ico('jar', (jx, jy, 6.4), 0.22, clay, 1)

    # gate torches
    for lx in (-2.25, 2.25):
        wx, wy = world(lx, -7.05)
        add_cyl('torch_pole', (wx, wy, 9.65), 0.05, 1.4, wood, 5)
        add_ico('torch_fire', (wx, wy, 10.4), 0.18, fire, 1)

    # banners at the gate and inside
    add_banner((*world(-2.9, -6.6), 6.4), PUCARA_YAW, 4.0, 'cloth')
    add_banner((*world(2.9, -6.6), 6.4), PUCARA_YAW, 3.6, 'cloth_ochre')

    # rubble around the platform
    bm = bmesh.new()
    for _ in range(45):
        a = RNG.uniform(0, math.tau)
        r = RNG.uniform(9.2, 12.0)
        lx, lz = math.cos(a) * r, math.sin(a) * r
        wx, wy = world(lx, lz)
        s = RNG.uniform(0.12, 0.38)
        bm_cube(bm, (wx, wy, ground_height(wx, wy) + s * 0.3), (s, s * 0.8, s * 0.45), RNG.uniform(0, math.tau))
    make_stone_mesh(bm, 'pucara_rubble', stone_set)


def add_worker(loc, yaw=math.radians(115), variant=0, leader=False):
    glb = ROOT / 'src' / 'assets' / 'models' / 'caral_worker.glb'
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(glb))
    new = [o for o in bpy.data.objects if o not in before]
    arm = next(o for o in new if o.type == 'ARMATURE')
    meshes = [o for o in new if o.type == 'MESH']
    cloth = (MAT['cloth'], MAT['cloth_ochre'], MAT['cloth_dark'])[variant % 3]
    for obj in meshes:
        name = obj.name
        if (
            name.endswith('_f')
            or 'Icosphere' in name
            or 'skirt' in name
            or 'belt_chasqui' in name
        ):
            obj.hide_render = True
            obj.hide_viewport = True
            continue
        if name.startswith('Body'):
            mat = MAT['skin']
        elif name.startswith('Hair'):
            mat = MAT['hair']
        elif name.startswith('Eyes') or name.startswith('Eyebrows'):
            mat = MAT['hair']
        elif name.startswith('attire_tunic'):
            mat = cloth
        elif name.startswith('attire_wrap') or name.startswith('attire_sash'):
            mat = MAT['cloth_dark']
        else:
            mat = cloth
        for slot in obj.material_slots:
            slot.material = mat
    arm.location = loc
    arm.rotation_euler[2] = yaw
    if arm.animation_data:
        action = 'Walk_Loop' if variant % 4 == 1 else 'Idle_Loop'
        act = next((a for a in bpy.data.actions if a.name.startswith(action)), None)
        if act:
            arm.animation_data.action = act
    bpy.context.view_layer.update()
    head = arm.pose.bones.get('Head')
    if head:
        hw = arm.matrix_world @ head.head
        add_cyl('headband', (hw.x, hw.y, hw.z + 0.075), 0.125, 0.04, MAT['cloth_ochre'], 10, (0, 0, yaw))
        front = Vector((math.sin(yaw), -math.cos(yaw), 0))
        add_box(
            'paint_red',
            (hw.x + front.x * 0.115, hw.y + front.y * 0.115, hw.z + 0.045),
            (0.17, 0.015, 0.03),
            MAT['paint'],
            (0, 0, yaw),
        )
        add_box(
            'paint_black',
            (hw.x + front.x * 0.118, hw.y + front.y * 0.118, hw.z - 0.01),
            (0.12, 0.012, 0.02),
            MAT['paint_dark'],
            (0, 0, yaw),
        )
    hand = arm.pose.bones.get('hand_r')
    if hand:
        hw = arm.matrix_world @ hand.head
        add_cyl('macana', (hw.x + 0.04, hw.y, hw.z - 0.28), 0.03, 0.75, MAT['wood'], 6, (0, math.radians(12), 0))
        add_ico('macana_head', (hw.x + 0.13, hw.y, hw.z - 0.64), 0.10, MAT['stone'], 1)
    if leader:
        add_cone('leader_cloak', (loc[0], loc[1] + 0.05, loc[2] + 1.05), 0.34, 0.22, 0.95, MAT['cloth_dark'], 8, (0, 0, yaw))
        add_banner((loc[0] - 0.55, loc[1] + 0.1, loc[2]), yaw, 3.4, 'cloth_ochre')


def add_camp():
    # Chanca camp around the pucará: tents, banners, fires and the approach path.
    add_path()
    for loc, yaw, scale in (
        ((166, 101), 0.4, 1.0),
        ((171, 104), -0.5, 0.9),
        ((174, 91), 0.8, 0.95),
        ((163, 94), -0.2, 0.85),
        ((185, 104), 0.2, 0.9),
        ((160, 99), 0.1, 1.1),
        ((164, 102), -0.3, 1.0),
        ((168, 105), 0.5, 0.9),
        ((172, 107), -0.4, 1.0),
        ((180, 107), 0.2, 0.95),
        ((186, 101), -0.2, 0.9),
        ((181, 90), 0.6, 0.9),
        ((188, 96), -0.5, 0.85),
    ):
        x, z = loc
        add_tent((x, z, ground_height(x, z)), yaw, scale)
    add_banner((176, 93, ground_height(176, 93)), 0.2, 3.2, 'cloth')
    add_banner((168, 99, ground_height(168, 99)), -0.3, 2.7, 'cloth_ochre')
    add_campfire((169, 96, ground_height(169, 96)))
    add_campfire((176, 101, ground_height(176, 101)))
    add_campfire((162, 102, ground_height(162, 102)))
    # palisade stakes on the approach side
    for i in range(14):
        a = -0.9 + i * 0.13
        x = 175 + math.cos(a) * 9.0
        z = 84 + math.sin(a) * 9.0
        y = ground_height(x, z)
        add_cyl('stake', (x, z, y + 0.8), 0.10, 1.6, MAT['wood'], 5, (0, math.radians(RNG.uniform(-8, 8)), 0))
        add_cone('stake_tip', (x, z, y + 1.7), 0.12, 0.0, 0.25, MAT['wood'], 5)
    # Chanca warriors using the shared Andean rig (Chanca clothing is not documented;
    # face paint is the attested marker, added below).
    workers = [
        (154, 82, 116, True),
        (158, 86, 116, False),
        (162, 91, 118, False),
        (168, 95, 114, False),
        (178, 98, 120, False),
        (164, 101, 112, False),
        (172, 104, 116, False),
    ]
    for i, (x, z, deg, leader) in enumerate(workers):
        add_worker((x, z, ground_height(x, z)), math.radians(deg), variant=i, leader=leader)


def add_lighting():
    world = bpy.data.worlds.new('chanca_sky')
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    bg = next(n for n in nodes if n.type == 'BACKGROUND')
    sky = nodes.new('ShaderNodeTexSky')
    sky.sky_type = 'MULTIPLE_SCATTERING'
    sky.sun_elevation = math.radians(1)
    sky.sun_rotation = math.radians(25)
    sky.sun_disc = False
    sky.altitude = 2800
    sky.air_density = 1.0
    sky.aerosol_density = 1.0
    sky.ozone_density = 1.0
    links.new(sky.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 0.5
    bpy.context.scene.world = world

    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy = 6.0
    sun.angle = math.radians(1.5)
    sun.color = (1.0, 0.58, 0.28)
    sun_obj = bpy.data.objects.new('sun', sun)
    bpy.context.collection.objects.link(sun_obj)
    direction = Vector((-0.55, -0.48, -0.15)).normalized()
    sun_obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

    fill = bpy.data.lights.new('fill', 'AREA')
    fill.energy = 45
    fill.size = 24
    fill.color = (0.45, 0.60, 1.0)
    fill_obj = bpy.data.objects.new('fill', fill)
    bpy.context.collection.objects.link(fill_obj)
    fill_obj.location = (120, 40, 24)
    fill_obj.rotation_euler = (Vector((SITE.x, SITE.y, 8)) - fill_obj.location).to_track_quat('-Z', 'Y').to_euler()

    rim = bpy.data.lights.new('rim', 'SUN')
    rim.energy = 3.0
    rim.angle = math.radians(2.0)
    rim.color = (0.55, 0.68, 1.0)
    rim_obj = bpy.data.objects.new('rim', rim)
    bpy.context.collection.objects.link(rim_obj)
    rim_dir = Vector((0.35, 0.55, -0.35)).normalized()
    rim_obj.rotation_euler = rim_dir.to_track_quat('-Z', 'Y').to_euler()

    # low sun disc behind the pucará is deliberately omitted: the bright disc is a flat
    # postcard shape without a compositor glare; the sky and the warm rim carry the sunset.


def add_fog():
    bpy.ops.mesh.primitive_cube_add(size=1, location=(128, 128, 120))
    fog = bpy.context.object
    fog.name = 'fog'
    fog.scale = (2000, 2000, 400)
    mat = bpy.data.materials.new('fog_volume')
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    out = next(n for n in nodes if n.type == 'OUTPUT_MATERIAL')
    vol = nodes.new('ShaderNodeVolumePrincipled')
    vol.inputs['Color'].default_value = (0.50, 0.58, 0.70, 1)
    vol.inputs['Density'].default_value = 0.0018
    vol.inputs['Anisotropy'].default_value = 0.35
    links.new(vol.outputs['Volume'], out.inputs['Volume'])
    fog.data.materials.append(mat)
    fog.display_type = 'BOUNDS'


def add_compositor():
    scene = bpy.context.scene
    group = bpy.data.node_groups.new('Compositing', 'CompositorNodeTree')
    scene.compositing_node_group = group
    nodes = group.nodes
    links = group.links
    rl = nodes.new('CompositorNodeRLayers')
    glare = nodes.new('CompositorNodeGlare')
    glare.inputs['Type'].default_value = 'Fog Glow'
    glare.inputs['Quality'].default_value = 'High'
    glare.inputs['Threshold'].default_value = 0.8
    glare.inputs['Size'].default_value = 7
    glare.inputs['Strength'].default_value = 0.35
    comp = nodes.new('CompositorNodeComposite')
    links.new(rl.outputs['Image'], glare.inputs['Image'])
    links.new(glare.outputs['Image'], comp.inputs['Image'])


def add_camera():
    cam = bpy.data.cameras.new('camera')
    cam.lens = 38
    cam.sensor_width = 36
    cam.dof.use_dof = True
    cam.dof.focus_distance = 34
    cam.dof.aperture_fstop = 4.5
    obj = bpy.data.objects.new('camera', cam)
    bpy.context.collection.objects.link(obj)
    x, z = 147, 72
    obj.location = (x, z, ground_height(x, z) + 2.0)
    target = Vector((SITE.x, SITE.y, 6.2))
    obj.rotation_euler = (target - obj.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = obj
    return obj


def add_render_settings():
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.eevee.taa_render_samples = 16 if PREVIEW else 96
    scene.render.resolution_x = 800 if PREVIEW else 1600
    scene.render.resolution_y = 450 if PREVIEW else 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.filepath = str(RENDER_PATH)
    scene.view_settings.view_transform = 'AgX'
    try:
        scene.view_settings.look = 'AgX - Medium High Contrast'
    except TypeError:
        pass
    scene.view_settings.exposure = 0.1
    if hasattr(scene.eevee, 'use_shadows'):
        scene.eevee.use_shadows = True
    if hasattr(scene.eevee, 'use_raytracing'):
        scene.eevee.use_raytracing = True
    scene.render.film_transparent = False


def main() -> None:
    clear()
    init_materials()
    build_terrain()
    build_pucara()
    add_camp()
    scatter()
    add_lighting()
    add_camera()
    add_render_settings()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if not PREVIEW:
        bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.render.render(write_still=True)
    print(f'RENDERED {RENDER_PATH}')


main()
