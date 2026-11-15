"""Build the cinematic m_tambotoco intro scene and render it.

Run from the repository root:
  blender --background --python scripts/blender/build_tambotoco_intro.py -- --preview
  blender --background --python scripts/blender/build_tambotoco_intro.py
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
import build_tambotoco_heightmap as hm  # noqa: E402

ARGS = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
PREVIEW = '--preview' in ARGS
OUT_DIR = ROOT / 'art-src' / 'blender' / 'tambotoco'
RENDER_PATH = Path('/tmp/opencode/tambotoco_scene.png') if PREVIEW else OUT_DIR / 'renders' / 'tambotoco_hero.png'
BLEND_PATH = OUT_DIR / 'tambotoco_intro.blend'

CAVE = Vector((40.0, 55.0, 0.0))
BASE = (44.0, 84.0)
SHRINE = (120.0, 106.0)
INTICANCHA = (168.0, 190.0)
VALLEY = (186.0, 196.0)
WORLD = 256.0
RNG = random.Random(1438)


def ground_height(x: float, z: float) -> float:
    return hm.height(x, z)


def ground_color(x: float, z: float) -> tuple[float, float, float]:
    w = hm.ground(x, z)
    palette = (
        (0.20, 0.30, 0.10),
        (0.35, 0.25, 0.14),
        (0.45, 0.35, 0.20),
        (0.30, 0.29, 0.27),
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
    MAT['grass'] = material('grass', (0.20, 0.22, 0.08), 1.0, 0.15)
    MAT['shrub'] = material('shrub', (0.10, 0.13, 0.06), 1.0, 0.2)
    MAT['dirt'] = material('dirt', (0.28, 0.19, 0.10), 1.0, 0.2)
    MAT['sand'] = material('sand', (0.38, 0.30, 0.16), 1.0, 0.1)
    MAT['rock'] = material('rock', (0.25, 0.24, 0.22), 0.95, 0.25)
    MAT['stone'] = material('stone', (0.34, 0.31, 0.26), 0.9, 0.25)
    MAT['stone_dark'] = material('stone_dark', (0.19, 0.18, 0.16), 0.92, 0.2)
    MAT['cave'] = material('cave', (0.028, 0.020, 0.014), 1.0, 0.0)
    MAT['earth'] = material('earth', (0.28, 0.20, 0.12), 1.0, 0.2)
    MAT['wood'] = material('wood', (0.16, 0.10, 0.06), 0.95, 0.1)
    MAT['cloth'] = material('cloth', (0.36, 0.12, 0.07), 0.92, 0.05)
    MAT['cloth_dark'] = material('cloth_dark', (0.18, 0.08, 0.05), 0.94, 0.05)
    MAT['cloth_ochre'] = material('cloth_ochre', (0.46, 0.26, 0.09), 0.92, 0.05)
    MAT['skin'] = material('skin', (0.33, 0.18, 0.10), 0.75, 0.05)
    MAT['hair'] = material('hair', (0.07, 0.05, 0.04), 0.9, 0.1)
    MAT['paint'] = material('paint', (0.52, 0.08, 0.05), 0.85, 0.0)
    MAT['paint_dark'] = material('paint_dark', (0.08, 0.06, 0.05), 0.85, 0.0)
    gold = material('gold', (0.85, 0.64, 0.20), 0.35, 0.0)
    gold_bsdf = next(n for n in gold.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    gold_bsdf.inputs['Metallic'].default_value = 0.15
    gold_bsdf.inputs['Emission Color'].default_value = (0.85, 0.62, 0.16, 1)
    gold_bsdf.inputs['Emission Strength'].default_value = 1.2
    MAT['gold'] = gold
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
        (0.86, 0.66, 0.44),
        1.0,
    )


def add_mountains():
    # Distant Cordillera silhouettes beyond the playable 256 m map; they give the valley its horizon.
    specs = [
        (-260, -300, 150, 120), (-60, -420, 170, 150), (220, -330, 140, 110),
        (-430, -140, 160, 130), (-380, 120, 150, 100), (420, -180, 160, 105),
    ]
    for x, z, radius, height in specs:
        bpy.ops.mesh.primitive_cone_add(
            vertices=6,
            radius1=radius,
            radius2=radius * 0.08,
            depth=height,
            location=(x, z, height / 2 - 26),
        )
        obj = bpy.context.object
        obj.name = 'mountain'
        obj.scale = (1.0, 0.8, 1.0)
        obj.data.materials.append(MAT['mountain'])


def load_image(path: Path, non_color: bool = False):
    img = bpy.data.images.load(str(path), check_existing=True)
    if non_color:
        img.colorspace_settings.name = 'Non-Color'
    return img


def tex_node(nodes, links, path: Path, scale: float, non_color: bool = False, use_uv: bool = False, use_generated: bool = False):
    if use_uv:
        coord = nodes.new('ShaderNodeUVMap')
    else:
        coord = nodes.new('ShaderNodeTexCoord')
    mapping = nodes.new('ShaderNodeMapping')
    mapping.inputs['Scale'].default_value = (scale, scale, scale)
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = load_image(path, non_color)
    tex.interpolation = 'Linear'
    source = coord.outputs['UV'] if use_uv else (coord.outputs['Generated'] if use_generated else coord.outputs['Object'])
    links.new(source, mapping.inputs['Vector'])
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
    use_generated: bool = False,
):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    tex = tex_node(nodes, links, path, scale, use_uv=use_uv, use_generated=use_generated)
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
            weights.append(hm.ground(x, z))
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
    front = (math.sin(yaw), -math.cos(yaw))
    add_box('paint_red', (x + front[0] * 0.112, y + front[1] * 0.112, z + 1.59), (0.18, 0.012, 0.028), MAT['paint'], (0, 0, yaw))
    add_box('paint_black', (x + front[0] * 0.116, y + front[1] * 0.116, z + 1.53), (0.13, 0.010, 0.018), MAT['paint_dark'], (0, 0, yaw))
    # macana in the right hand
    add_cyl('macana', (x + 0.31, y - 0.04, z + 1.0), 0.03, 0.75, MAT['wood'], 6, (0, math.radians(22), 0))
    add_ico('macana_head', (x + 0.44, y - 0.04, z + 0.64), 0.10, MAT['stone'], 1)
    if leader:
        add_cyl('cloak', (x, y + 0.06, z + 1.05), 0.31, 0.88, MAT['cloth_dark'], 7, (0, 0, yaw))



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
        add_cyl('cloak', (x, y + 0.06, z + 1.05), 0.31, 0.88, MAT['cloth_dark'], 7, (0, 0, yaw))


def add_path():
    points = [(40, 61), (43, 68), (44, 84), (58, 96), (80, 106), (100, 106), (120, 108), (144, 148), (168, 188)]
    verts = []
    faces = []
    for i, (x, z) in enumerate(points):
        for side in (-0.45, 0.45):
            verts.append((x + side, z, ground_height(x + side, z) + 0.04))
    for i in range(len(points) - 1):
        a = i * 2
        faces.append((a, a + 1, a + 3, a + 2))
    mesh = bpy.data.meshes.new('tambotoco_path')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new('tambotoco_path', mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(MAT['path'])


def add_grass_field():
    # One mesh for all the ichu tufts: thousands of blades would otherwise be thousands of objects.
    bm = bmesh.new()
    for _ in range(1400):
        x = RNG.uniform(24, 190)
        z = RNG.uniform(40, 180)
        if math.hypot(x - CAVE.x, z - CAVE.y) < 9:
            continue
        y = ground_height(x, z)
        for k in range(5):
            a = RNG.uniform(0, math.tau)
            spread = RNG.uniform(0.03, 0.07)
            height = RNG.uniform(0.10, 0.30)
            lean = RNG.uniform(0.02, 0.10)
            v0 = bm.verts.new((x + math.cos(a) * spread, z + math.sin(a) * spread, y - 0.02))
            v1 = bm.verts.new((x - math.cos(a) * spread, z - math.sin(a) * spread, y - 0.02))
            tip = bm.verts.new((x + math.cos(a) * lean, z + math.sin(a) * lean, y + height))
            bm.faces.new((v0, v1, tip))
    mesh = bpy.data.meshes.new('ichu')
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new('ichu', mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(MAT['grass'])


def scatter():
    for _ in range(70):
        x = RNG.uniform(20, 170)
        z = RNG.uniform(35, 170)
        if math.hypot(x - CAVE.x, z - CAVE.y) < 11:
            continue
        add_boulder('scatter_rock', x, z, RNG.uniform(0.14, 0.5), MAT['stone_dark'], 0.2)
    add_grass_field()
    for _ in range(14):
        x = RNG.uniform(25, 180)
        z = RNG.uniform(40, 180)
        if math.hypot(x - CAVE.x, z - CAVE.y) < 10 or math.hypot(x - 57, z - 86) < 18:
            continue
        y = ground_height(x, z)
        obj = add_ico('shrub', (x, z, y + 0.32), RNG.uniform(0.18, 0.42), MAT['shrub'], 1)
        obj.scale = (1.0, 1.0, RNG.uniform(0.45, 0.9))


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
    noise.inputs['Scale'].default_value = 1.4
    noise.inputs['Detail'].default_value = 6.0
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'EASE'
    ramp.color_ramp.elements[0].position = 0.28
    ramp.color_ramp.elements[0].color = (*[c * 0.55 for c in base], 1)
    ramp.color_ramp.elements[1].position = 0.78
    ramp.color_ramp.elements[1].color = (*[min(1.0, c * 1.45) for c in base], 1)
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


def tower_stones(bm, wx, wy, radius, base_z, height):
    z = base_z
    while z < base_z + height:
        h = min(RNG.uniform(0.3, 0.42), base_z + height - z)
        count = max(9, int((2 * math.pi * radius) / 0.62))
        for i in range(count):
            theta = (i / count) * math.tau + RNG.uniform(-0.025, 0.025)
            yaw = theta + math.pi / 2
            w = (2 * math.pi * radius / count) * 0.92
            cx = wx + math.cos(theta) * (radius + 0.12)
            cy = wy + math.sin(theta) * (radius + 0.12)
            bm_cube(bm, (cx, cy, z + h / 2), (w, 0.3, h), yaw)
        z += h + 0.045


def add_hut(x, z, w, d, wall, stone, thatch, dark):
    y = ground_height(x, z)
    add_cyl('hut_wall', (x, z, y + wall / 2), max(w, d) * 0.5, wall, stone, 10)
    add_cone('hut_roof', (x, z, y + wall + 0.65), max(w, d) * 0.72, 0.04, 1.3, thatch, 12)
    add_box('hut_door', (x, z - max(w, d) * 0.34, y + wall * 0.45), (0.75, 0.12, wall * 0.75), dark)


def add_boulder(name, x, z, r, mat, lift=0.45, flat=1.0):
    y = ground_height(x, z)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=r, location=(x, z, y + r * lift))
    obj = bpy.context.object
    obj.name = name
    jitter = random.Random(int(x * 131 + z * 17))
    for v in obj.data.vertices:
        v.co *= jitter.uniform(0.70, 1.30)
    obj.scale = (
        jitter.uniform(0.9, 1.6),
        jitter.uniform(0.9, 1.6),
        jitter.uniform(0.55, 0.95) * flat,
    )
    obj.rotation_euler = (jitter.uniform(-0.25, 0.25), jitter.uniform(-0.25, 0.25), jitter.uniform(0, math.tau))
    obj.data.materials.append(mat)
    return obj


def build_cave(rock_mats):
    cx, cz = CAVE.x, CAVE.y + 3.0
    cy = ground_height(cx, cz)
    # A worn threshold in front of the mouth, where the ayllu gathers.
    add_box('cave_floor', (cx, cz + 3.4, cy + 0.04), (7.0, 5.6, 0.16), MAT['earth'])
    # The mouth: a deep dark cylinder set into the rock, read as an opening rather than a boulder.
    add_cyl('cave_tunnel', (cx, cz + 3.2, cy + 1.6), 1.75, 6.0, MAT['cave'], 14, (math.pi / 2, 0, 0))
    # Irregular boulders frame the mouth and stack into the massif above it.
    for i in range(11):
        theta = math.pi * (i + 0.5) / 11
        bx = cx + math.cos(theta) * 2.9
        bz = cy + math.sin(theta) * 2.7
        add_boulder('cave_rim', bx, cz + 0.1, 1.05 + 0.3 * math.sin(theta), rock_mats[i % len(rock_mats)], 0.55, 1.2)
    rows = [
        (3.2, 4.6, 2.4, 1.1),
        (5.4, 5.4, 2.8, 1.3),
        (7.6, 6.2, 3.0, 1.5),
    ]
    for dz, spread, size, lift in rows:
        n = 5
        for i in range(n):
            x = cx + (i - (n - 1) / 2) * (spread * 2 / (n - 1)) * RNG.uniform(0.75, 1.15)
            z = cz - dz + RNG.uniform(-0.7, 0.7)
            add_boulder('massif', x, z, size * RNG.uniform(0.8, 1.2), rock_mats[RNG.randint(0, len(rock_mats) - 1)], lift, 1.15)
    # The ridge shoulders, keeping the massif low and wide.
    for i in range(28):
        x = cx + RNG.uniform(-16, 16)
        z = cz + RNG.uniform(2.0, 10.0)
        add_boulder('ridge_foot', x, z, RNG.uniform(0.4, 1.2), rock_mats[RNG.randint(0, len(rock_mats) - 1)], 0.3)
    for side in (-1, 1):
        for i in range(10):
            x = cx + side * RNG.uniform(4.5, 13.0)
            z = cz - RNG.uniform(0.0, 5.0)
            add_boulder('ridge_wing', x, z, RNG.uniform(1.4, 3.0), rock_mats[RNG.randint(0, len(rock_mats) - 1)])
    glow = bpy.data.lights.new('cave_glow', 'POINT')
    glow.energy = 160
    glow.color = (1.0, 0.42, 0.14)
    glow.shadow_soft_size = 2.0
    glow_obj = bpy.data.objects.new('cave_glow', glow)
    bpy.context.collection.objects.link(glow_obj)
    glow_obj.location = (cx, cz + 2.0, cy + 2.2)
    inner = bpy.data.lights.new('cave_inner', 'POINT')
    inner.energy = 55
    inner.color = (1.0, 0.55, 0.28)
    inner.shadow_soft_size = 1.5
    inner_obj = bpy.data.objects.new('cave_inner', inner)
    bpy.context.collection.objects.link(inner_obj)
    inner_obj.location = (cx, cz + 4.5, cy + 1.6)


def build_tambotoco_site():
    materials = ROOT / 'src' / 'assets' / 'textures' / 'materials'
    stone = stone_variant('tambotoco_stone', (0.24, 0.23, 0.22))
    rock_mats = [
        stone_variant('tambotoco_rock_a', (0.14, 0.13, 0.12)),
        stone_variant('tambotoco_rock_b', (0.09, 0.09, 0.09)),
        stone_variant('tambotoco_rock_c', (0.20, 0.18, 0.16)),
        stone_variant('tambotoco_rock_d', (0.17, 0.15, 0.12)),
    ]
    earth = texture_material('tambotoco_earth', materials / 'ground_path_diffuse.webp', 0.22, (0.62, 0.50, 0.35), 1.0)
    thatch = texture_material('tambotoco_thatch', materials / 'roof_thatch_diffuse.webp', 0.9, (0.70, 0.55, 0.36), 0.95)
    dark = material('tambotoco_dark', (0.045, 0.04, 0.035), 1.0, 0.0)
    wood = material('tambotoco_wood', (0.16, 0.10, 0.06), 0.9, 0.15)
    fire = MAT['fire']

    build_cave(rock_mats)

    # Ayllu base and shrine huts (the visible part of the settlement).
    for x, z, w, d, wall in ((46, 88, 3.0, 2.6, 1.4), (52, 92, 2.8, 2.4, 1.3)):
        add_hut(x, z, w, d, wall, stone, thatch, dark)
    add_smoke((46, 88, ground_height(46, 88) + 3.2))
    add_cyl('base_fire', (48, 84, ground_height(48, 84) + 0.2), 0.5, 0.4, stone, 8)
    add_cone('base_flame', (48, 84, ground_height(48, 84) + 0.6), 0.25, 0.02, 0.55, fire, 6)

    # Huanacaure shrine on the hill; visible in the distance if the camera looks that way.
    hx, hz = SHRINE
    hy = ground_height(hx, hz)
    add_cyl('shrine_platform', (hx, hz, hy + 0.4), 4.2, 0.8, stone, 12)
    add_box('shrine_monolith', (hx, hz - 0.4, hy + 2.6), (1.3, 0.9, 3.8), stone)
    add_cone('shrine_fire', (hx + 1.2, hz + 0.6, hy + 0.9), 0.3, 0.02, 0.6, fire, 6)

    # Inticancha: four low canchas and a few huts, far in the valley.
    ix, iz = INTICANCHA
    for dx, dz in ((-12, 0), (12, 0), (0, -12), (0, 12)):
        cx, cz = ix + dx, iz + dz
        cy = ground_height(cx, cz)
        for sx, sz, w, d in ((0, -3.5, 10, 0.5), (0, 3.5, 10, 0.5), (-5, 0, 0.5, 7), (5, 0, 0.5, 7)):
            add_box('cancha_wall', (cx + sx, cz + sz, cy + 0.4), (w, d, 0.8), stone, (0, 0, 0.0))
    for x, z, w, d, wall in ((156, 176, 3.2, 2.8, 1.5), (180, 176, 3.2, 2.8, 1.5), (168, 210, 3.2, 2.8, 1.5)):
        add_hut(x, z, w, d, wall, stone, thatch, dark)

    # Fields in the valley floor.
    for cx, cz, w, d in ((147, 157, 10, 7), (197, 209, 10, 7), (168, 192, 12, 8)):
        cy = ground_height(cx, cz)
        add_box('field', (cx, cz, cy + 0.08), (w, d, 0.16), earth)
        for r in range(5):
            add_box('field_row', (cx, cz - d / 2 + (r + 0.5) * d / 5, cy + 0.17), (w * 0.86, 0.18, 0.08), MAT['grass'])


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
        if name.endswith('_f') or 'Icosphere' in name or 'skirt' in name or 'belt_chasqui' in name:
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
    arm.rotation_mode = 'XYZ'
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
            (hw.x + front.x * 0.155, hw.y + front.y * 0.155, hw.z + 0.045),
            (0.17, 0.015, 0.03),
            MAT['paint'],
            (0, 0, yaw),
        )
        add_box(
            'paint_black',
            (hw.x + front.x * 0.158, hw.y + front.y * 0.158, hw.z - 0.01),
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


def add_party():
    # The eight Ayar siblings leave the cave in a loose, slightly staggered line, facing the valley.
    siblings = [
        (60.5, 81.0, True),
        (56.8, 78.2, False),
        (54.4, 75.6, False),
        (51.2, 73.4, False),
        (49.4, 70.2, False),
        (46.6, 68.0, False),
        (44.6, 65.4, False),
        (42.6, 63.4, False),
    ]
    for i, (x, z, leader) in enumerate(siblings):
        yaw = math.radians(135 + (i % 3 - 1) * 7)
        add_warrior((x, z, ground_height(x, z)), yaw, lean=0.02 * (i % 2), leader=leader)
        if leader:
            # Manco Capac's golden staff (tapac-yauri), the tradition's guide to the valley.
            gy = ground_height(x, z)
            add_cyl('gold_staff', (x + 0.5, z + 0.36, gy + 1.15), 0.04, 2.4, MAT['gold'], 6, (0, math.radians(9), 0))
            add_ico('gold_staff_head', (x + 0.42, z + 0.36, gy + 2.36), 0.11, MAT['gold'], 1)
    add_warrior((46, 88, ground_height(46, 88)), math.radians(150))
    add_warrior((30, 90, ground_height(30, 90)), math.radians(95))


def add_lighting():
    world = bpy.data.worlds.new('tambotoco_sky')
    world.use_nodes = True
    nodes = world.node_tree.nodes
    bg = next(n for n in nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (0.30, 0.42, 0.62, 1.0)
    bg.inputs['Strength'].default_value = 0.9
    bpy.context.scene.world = world

    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy = 4.6
    sun.angle = math.radians(1.5)
    sun.color = (1.0, 0.72, 0.46)
    sun_obj = bpy.data.objects.new('sun', sun)
    bpy.context.collection.objects.link(sun_obj)
    direction = Vector((-0.45, -0.55, -0.20)).normalized()
    sun_obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

    fill = bpy.data.lights.new('fill', 'AREA')
    fill.energy = 80
    fill.size = 30
    fill.color = (0.55, 0.68, 1.0)
    fill_obj = bpy.data.objects.new('fill', fill)
    bpy.context.collection.objects.link(fill_obj)
    fill_obj.location = (25, 100, 24)
    fill_obj.rotation_euler = (Vector((CAVE.x, CAVE.y, 7)) - fill_obj.location).to_track_quat('-Z', 'Y').to_euler()

    rim = bpy.data.lights.new('rim', 'SUN')
    rim.energy = 2.2
    rim.angle = math.radians(2.0)
    rim.color = (0.55, 0.68, 1.0)
    rim_obj = bpy.data.objects.new('rim', rim)
    bpy.context.collection.objects.link(rim_obj)
    rim_dir = Vector((0.4, 0.5, -0.35)).normalized()
    rim_obj.rotation_euler = rim_dir.to_track_quat('-Z', 'Y').to_euler()


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
    vol.inputs['Color'].default_value = (0.62, 0.68, 0.80, 1)
    vol.inputs['Density'].default_value = 0.0011
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
    cam.lens = 42
    cam.sensor_width = 36
    cam.dof.use_dof = True
    cam.dof.focus_distance = 20
    cam.dof.aperture_fstop = 4.5
    obj = bpy.data.objects.new('camera', cam)
    bpy.context.collection.objects.link(obj)
    x, z = 57, 86
    obj.location = (x, z, ground_height(x, z) + 2.2)
    target = Vector((42.5, 61.0, 6.0))
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
    scene.view_settings.exposure = 0.0
    if hasattr(scene.eevee, 'use_shadows'):
        scene.eevee.use_shadows = True
    if hasattr(scene.eevee, 'use_raytracing'):
        scene.eevee.use_raytracing = True
    scene.render.film_transparent = False


def main() -> None:
    clear()
    init_materials()
    build_terrain()
    build_tambotoco_site()
    add_party()
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
