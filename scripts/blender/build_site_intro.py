"""Build cinematic campaign-intro scenes on the authored mission heightmaps.

Each mission builds its scene on the authored heightmap. Missions with a site model import the same GLB
the game draws; the first missions of the later campaigns are modelled directly. The builder adds the
period figures and props that carry the beat and renders a 1600x900 EEVEE hero image.

    blender --background --python scripts/blender/build_site_intro.py -- --mission=m_lima
    blender --background --python scripts/blender/build_site_intro.py -- --mission=m_lima --preview
"""

from __future__ import annotations

import importlib
import math
import random
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
ARGS = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
PREVIEW = '--preview' in ARGS
MISSION = next((a.split('=', 1)[1] for a in ARGS if a.startswith('--mission=')), 'm_lima')
RNG = random.Random(1535)
OUT_DIR = ROOT / 'art-src' / 'blender' / 'site-intros'

CONFIG = {
    'm_lima': {
        'hm': 'lima',
        'site': (90.0, 150.0),
        'camera': (128.0, 126.0, 14.0),
        'target': (90.0, 150.0, 7.0),
        'lens': 34,
        'sun': (-0.42, -0.52, -0.30),
        'sun_color': (1.0, 0.80, 0.58),
        'sky': (0.36, 0.46, 0.62),
        'water': True,
        'bespoke': 'lima',
        'uniform': (0.18, 0.20, 0.26),
        'bridge': (120.0, 124.0),
        'army': True,
        'caption': 'La Ciudad de los Reyes junto al Rímac, 1535',
    },
    'm_junta_cusco': {
        'hm': 'junta',
        'site': (72.0, 58.0),
        'camera': (112.0, 122.0, 15.0),
        'target': (72.0, 68.0, 5.0),
        'lens': 40,
        'sun': (-0.35, -0.55, -0.28),
        'sun_color': (1.0, 0.86, 0.68),
        'sky': (0.34, 0.44, 0.60),
        'water': False,
        'bespoke': 'junta',
        'uniform': (0.12, 0.15, 0.24),
        'caption': 'El Cusco de la Junta, 1814',
    },
    'm9_guerra_pacifico': {
        'hm': 'arica',
        'site': (179.7, 97.3),
        'camera': (190.0, 118.0, 2.6),
        'target': (166.0, 99.0, 3.0),
        'lens': 44,
        'sun': (-0.30, -0.45, -0.34),
        'sun_color': (1.0, 0.82, 0.60),
        'sky': (0.34, 0.45, 0.62),
        'water': True,
        'battery': True,
        'bespoke': True,
        'uniform': (0.13, 0.15, 0.19),
        'caption': 'La batería de Arica y el Morro, 1880',
    },
    'm2_chavin': {
        'hm': 'chavin',
        'site': (128.0, 128.0),
        'scale': 0.42,
        'bespoke': 'chavin',
        'camera': (164.0, 208.0, 18.0),
        'target': (118.0, 130.0, 4.0),
        'lens': 38,

        'sun': (-0.4, -0.5, -0.32),
        'sun_color': (1.0, 0.84, 0.62),
        'sky': (0.36, 0.46, 0.62),
        'water': False,
        'caption': 'Chavín de Huántar, el templo nuevo',
    },
    'm6_chimu_inca': {
        'hm': 'chimu',
        'site': (190.0, 87.0),
        'scale': 1.0,
        'bespoke': 'chimu',
        'camera': (222.0, 150.0, 18.0),
        'target': (186.0, 92.0, 3.0),
        'lens': 45,
        'sun': (-0.35, -0.5, -0.30),
        'sun_color': (1.0, 0.78, 0.54),
        'sky': (0.36, 0.46, 0.60),
        'water': True,
        'caption': 'Chan Chan y la costa chimú',
    },
    'm6b_guerra_civil': {
        'hm': 'cusco',
        'site': (150.0, 160.0),
        'scale': 1.0,
        'bespoke': 'cusco',
        'camera': (150.0, 218.0, 18.0),
        'target': (150.0, 160.0, 4.0),
        'lens': 40,
        'sun': (-0.35, -0.5, -0.30),
        'sun_color': (1.0, 0.84, 0.62),
        'sky': (0.34, 0.45, 0.62),
        'water': False,
        'caption': 'El Cusco de la guerra civil, 1532',
    },
    'm7_tupac_amaru': {
        'hm': 'colonial',
        'site': (179.7, 97.3),
        'scale': 1.25,
        'glb': 'colonial/colonial_church_lod0.glb',
        'camera': (212.0, 140.0, 11.0),
        'target': (177.0, 96.0, 6.0),
        'lens': 46,
        'sun': (-0.35, -0.5, -0.30),
        'sun_color': (1.0, 0.80, 0.58),
        'sky': (0.35, 0.45, 0.60),
        'water': False,
        'figures': [(156, 120, 35), (163, 124, 30), (196, 118, 145)],
        'town': True,
        'uniform': (0.16, 0.17, 0.22),
        'caption': 'El Cusco de Túpac Amaru II, 1780',
    },
    'm8_independencia': {
        'hm': 'independence',
        'site': (179.7, 94.7),
        'scale': 1.25,
        'glb': 'independence/independence_chapel_lod0.glb',
        'camera': (212.0, 138.0, 11.0),
        'target': (177.0, 94.0, 6.0),
        'lens': 46,
        'sun': (-0.35, -0.5, -0.30),
        'sun_color': (1.0, 0.82, 0.60),
        'sky': (0.33, 0.44, 0.60),
        'water': False,
        'figures': [(156, 118, 35), (163, 122, 30), (196, 116, 145)],
        'uniform': (0.12, 0.16, 0.24),
        'caption': 'Ayacucho y el campamento patriota, 1824',
    },
}
CFG = CONFIG[MISSION]
MOD = importlib.import_module(f'build_{CFG["hm"]}_heightmap')
WORLD = 256.0


def ground_height(x: float, z: float) -> float:
    return MOD.height(x, z)


def ground_weights(x: float, z: float) -> tuple[float, float, float, float]:
    fn = getattr(MOD, 'ground_weights', None) or getattr(MOD, 'ground')
    return fn(x, z)


def clear() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


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


MAT: dict[str, object] = {}


def init_materials() -> None:
    MAT['grass'] = material('grass', (0.20, 0.22, 0.08), 1.0, 0.15)
    MAT['shrub'] = material('shrub', (0.10, 0.13, 0.06), 1.0, 0.2)
    MAT['rock'] = material('rock', (0.20, 0.19, 0.18), 0.95, 0.25)
    MAT['stone'] = material('stone', (0.42, 0.38, 0.33), 0.9, 0.25)
    MAT['earth'] = material('earth', (0.28, 0.20, 0.12), 1.0, 0.2)
    MAT['wood'] = material('wood', (0.16, 0.10, 0.06), 0.95, 0.1)
    MAT['cloth'] = material('cloth', (0.36, 0.12, 0.07), 0.92, 0.05)
    MAT['cloth_dark'] = material('cloth_dark', (0.18, 0.08, 0.05), 0.94, 0.05)
    MAT['cloth_ochre'] = material('cloth_ochre', (0.46, 0.26, 0.09), 0.92, 0.05)
    MAT['skin'] = material('skin', (0.33, 0.18, 0.10), 0.75, 0.05)
    MAT['hair'] = material('hair', (0.07, 0.05, 0.04), 0.9, 0.1)
    MAT['paint'] = material('paint', (0.52, 0.08, 0.05), 0.85, 0.0)
    MAT['paint_dark'] = material('paint_dark', (0.08, 0.06, 0.05), 0.85, 0.0)
    MAT['mountain'] = material('mountain', (0.10, 0.14, 0.20), 1.0, 0.0)
    MAT['water'] = material('water', (0.12, 0.24, 0.32), 0.08, 0.0)
    water_bsdf = next(n for n in MAT['water'].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    water_bsdf.inputs['Metallic'].default_value = 0.25
    MAT['fire'] = material('fire', (1.0, 0.35, 0.06), 0.4, 0.0)
    fire_bsdf = next(n for n in MAT['fire'].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    fire_bsdf.inputs['Emission Color'].default_value = (1.0, 0.28, 0.04, 1)
    fire_bsdf.inputs['Emission Strength'].default_value = 10.0


def load_image(path: Path, non_color: bool = False):
    img = bpy.data.images.load(str(path), check_existing=True)
    if non_color:
        img.colorspace_settings.name = 'Non-Color'
    return img


def tex_node(nodes, links, path: Path, scale: float, non_color: bool = False):
    coord = nodes.new('ShaderNodeTexCoord')
    mapping = nodes.new('ShaderNodeMapping')
    mapping.inputs['Scale'].default_value = (scale, scale, scale)
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = load_image(path, non_color)
    tex.interpolation = 'Linear'
    links.new(coord.outputs['Object'], mapping.inputs['Vector'])
    links.new(mapping.outputs['Vector'], tex.inputs['Vector'])
    return tex


def terrain_material():
    mat = bpy.data.materials.new('ground')
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
    links.new(grass.outputs['Color'], mix1.inputs['Color1'])
    links.new(dirt.outputs['Color'], mix1.inputs['Color2'])
    links.new(sep.outputs['Y'], mix1.inputs['Fac'])
    mix2 = nodes.new('ShaderNodeMixRGB')
    links.new(mix1.outputs['Color'], mix2.inputs['Color1'])
    links.new(sand.outputs['Color'], mix2.inputs['Color2'])
    links.new(sep.outputs['Z'], mix2.inputs['Fac'])
    mix3 = nodes.new('ShaderNodeMixRGB')
    links.new(mix2.outputs['Color'], mix3.inputs['Color1'])
    links.new(rock.outputs['Color'], mix3.inputs['Color2'])
    links.new(rock_attr.outputs['Fac'], mix3.inputs['Fac'])
    links.new(mix3.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 1.0
    return mat


def build_terrain(n: int = 193):
    verts = []
    colors = []
    weights = []
    rock = []
    for iz in range(n):
        z = iz * WORLD / (n - 1)
        for ix in range(n):
            x = ix * WORLD / (n - 1)
            h = ground_height(x, z)
            verts.append((x, z, h))
            w = ground_weights(x, z)
            weights.append(w)
            colors.append((*[0.3 + w[k] * 0.4 for k in range(3)], 1.0))
            rock.append(1.0 if h > 40 else 0.0)
    faces = []
    for iz in range(n - 1):
        for ix in range(n - 1):
            a = iz * n + ix
            b = a + 1
            c = a + n
            d = c + 1
            faces.extend(((a, b, d), (a, d, c)))
    mesh = bpy.data.meshes.new('terrain')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    mesh.polygons.foreach_set('use_smooth', [False] * len(mesh.polygons))
    obj = bpy.data.objects.new('terrain', mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(terrain_material())
    attr = mesh.attributes.new('Weights', 'FLOAT_VECTOR', 'POINT')
    attr.data.foreach_set('vector', [c for w in weights for c in (w[0], w[1], w[2])])
    rock_attr = mesh.attributes.new('Rock', 'FLOAT', 'POINT')
    rock_attr.data.foreach_set('value', rock)
    return obj


def add_box(name, loc, size, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj


def add_cyl(name, loc, radius, depth, mat, vertices=8, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def add_cone(name, loc, r1, r2, depth, mat, vertices=8, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot)
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


def add_warrior(loc, yaw, lean=0.0, leader=False, cloth=None):
    x, y, z = loc
    skin = MAT['skin']
    cloth = cloth or MAT['cloth']
    add_cyl('leg_l', (x - 0.11, y, z + 0.45), 0.07, 0.85, skin, 6, (0, lean * 0.4, 0))
    add_cyl('leg_r', (x + 0.11, y, z + 0.45), 0.07, 0.85, skin, 6, (0, -lean * 0.4, 0))
    add_cone('tunic', (x, y, z + 0.95), 0.26, 0.18, 0.58, cloth, 7, (0, 0, yaw))
    add_cyl('torso', (x, y, z + 1.28), 0.17, 0.34, cloth, 7, (0, 0, yaw))
    add_cone('mantle', (x, y, z + 1.36), 0.27, 0.19, 0.16, MAT['cloth_dark'], 7, (0, 0, yaw))
    add_cyl('arm_l', (x - 0.25, y, z + 1.24), 0.05, 0.56, skin, 6, (lean, 0, 0.18))
    add_cyl('arm_r', (x + 0.25, y, z + 1.24), 0.05, 0.56, skin, 6, (-lean, 0, -0.18))
    add_ico('head', (x, y, z + 1.58), 0.115, skin, 2)
    add_ico('hair', (x, y + 0.03, z + 1.63), 0.12, MAT['hair'], 1)
    add_cyl('headband', (x, y, z + 1.62), 0.125, 0.04, MAT['cloth_ochre'], 10)
    front = (math.sin(yaw), -math.cos(yaw))
    add_box('paint_red', (x + front[0] * 0.112, y + front[1] * 0.112, z + 1.59), (0.18, 0.012, 0.028), MAT['paint'], (0, 0, yaw))
    add_box('paint_black', (x + front[0] * 0.116, y + front[1] * 0.116, z + 1.53), (0.13, 0.010, 0.018), MAT['paint_dark'], (0, 0, yaw))
    add_cyl('macana', (x + 0.31, y - 0.04, z + 1.0), 0.03, 0.75, MAT['wood'], 6, (0, math.radians(22), 0))
    add_ico('macana_head', (x + 0.44, y - 0.04, z + 0.64), 0.10, MAT['stone'], 1)
    if leader:
        add_cyl('cloak', (x, y + 0.06, z + 1.05), 0.31, 0.88, MAT['cloth_dark'], 7, (0, 0, yaw))


def add_grass_field(count: int = 900):
    bm = bmesh.new()
    for _ in range(count):
        x = RNG.uniform(4, WORLD - 4)
        z = RNG.uniform(4, WORLD - 4)
        h = ground_height(x, z)
        if h < 0.6:
            continue
        y = h + 0.02
        for _k in range(4):
            a = RNG.uniform(0, math.tau)
            spread = RNG.uniform(0.03, 0.07)
            height = RNG.uniform(0.10, 0.32)
            v0 = bm.verts.new((x + math.cos(a) * spread, z + math.sin(a) * spread, y))
            v1 = bm.verts.new((x - math.cos(a) * spread, z - math.sin(a) * spread, y))
            tip = bm.verts.new((x + math.cos(a) * 0.04, z + math.sin(a) * 0.04, y + height))
            bm.faces.new((v0, v1, tip))
    mesh = bpy.data.meshes.new('ichu')
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new('ichu', mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(MAT['grass'])


def add_cannon(x, z, yaw):
    y = ground_height(x, z)
    wood = MAT['wood']
    iron = material('cannon_iron', (0.09, 0.09, 0.10), 0.55, 0.1)
    add_cyl('cannon_barrel', (x, z, y + 1.12), 0.21, 2.6, iron, 10, (0, math.radians(90), yaw))
    add_cyl('cannon_wheel_l', (x - 0.55, z - 0.45, y + 0.62), 0.68, 0.2, wood, 12, (math.radians(90), 0, 0))
    add_cyl('cannon_wheel_r', (x - 0.55, z + 0.45, y + 0.62), 0.68, 0.2, wood, 12, (math.radians(90), 0, 0))
    add_box('cannon_carriage', (x - 0.1, z, y + 0.62), (1.9, 1.0, 0.45), wood, (0, 0, yaw))


def add_battery():
    sx, sz = CFG['site']
    for x, z in ((sx - 9, sz - 9), (sx - 3, sz - 10), (sx + 4, sz - 9), (sx + 10, sz - 8)):
        add_cannon(x, z, math.radians(190))
    # Sandbag parapet in front of the guns.
    for i in range(9):
        x = sx - 14 + i * 3.2
        add_box('sandbag', (x, sz - 14, ground_height(x, sz - 14) + 0.35), (2.6, 1.4, 0.7), MAT['earth'], (0, 0, 0.08 * (i % 3 - 1)))


def add_arica_scene():
    sx, sz = CFG['site']
    stone = limestone('arica_rampart', (0.30, 0.25, 0.19))
    plaster = material('arica_plaster', (0.66, 0.60, 0.50), 0.95, 0.2)
    tile = material('arica_tile', (0.42, 0.16, 0.08), 0.85, 0.1)
    iron = material('arica_iron', (0.08, 0.08, 0.09), 0.5, 0.1)
    # The rampart runs across the frame, with four embrasures for the guns.
    for i in range(5):
        x = sx - 18 + i * 9
        y = ground_height(x, sz)
        add_box('rampart', (x, sz + 2, y + 1.1), (8.2, 2.6, 2.2), stone, (0, 0, math.radians(6)))
        add_box('rampart_top', (x, sz + 2, y + 2.3), (8.6, 3.0, 0.3), stone, (0, 0, math.radians(6)))
    for i in range(4):
        x = sx - 13.5 + i * 9
        add_cannon(x, sz + 4.0, math.radians(90))
        add_box('sandbag_row', (x, sz + 6.2, ground_height(x, sz + 6.2) + 0.28), (5.0, 1.1, 0.55), MAT['earth'])
    # Barracks and storehouse behind the rampart.
    add_box('barracks', (sx + 22, sz - 20, ground_height(sx + 22, sz - 20) + 2.0), (12, 6, 4.0), plaster)
    add_cone('barracks_roof', (sx + 22, sz - 20, ground_height(sx + 22, sz - 20) + 4.7), 8.0, 0.3, 1.8, tile, 4, (0, 0, math.radians(45)))
    # The flagpole and a plain cloth (no invented heraldry).
    fy = ground_height(sx - 16, sz - 10)
    add_cyl('flagpole', (sx - 16, sz - 10, fy + 3.4), 0.06, 6.8, MAT['wood'], 6)
    flag_red = material('flag_red', (0.55, 0.08, 0.06), 0.9, 0.0)
    add_box('flag_red_l', (sx - 15.75, sz - 10, fy + 5.9), (0.4, 0.04, 1.6), flag_red)
    add_box('flag_white', (sx - 15.35, sz - 10, fy + 5.9), (0.4, 0.04, 1.6), material('flag_white', (0.82, 0.80, 0.74), 0.9, 0.0))
    add_box('flag_red_r', (sx - 14.95, sz - 10, fy + 5.9), (0.4, 0.04, 1.6), flag_red)
    # Stone magazine behind the guns.
    add_box('magazine', (sx + 14, sz - 16, ground_height(sx + 14, sz - 16) + 1.9), (10.0, 7.0, 3.8), stone)
    add_cone('magazine_roof', (sx + 14, sz - 16, ground_height(sx + 14, sz - 16) + 4.2), 6.5, 0.2, 1.6, tile, 4, (0, 0, math.radians(45)))
    for i in range(7):
        gx = sx - 16 + i * 5.4
        add_cyl('gabion', (gx, sz + 1.5, ground_height(gx, sz + 1.5) + 2.6), 0.55, 1.3, MAT['earth'], 8)
    # Soldiers along the rampart.
    for x, z, yaw in (
        (sx - 15, sz + 7, 10),
        (sx - 7, sz + 7, 5),
        (sx + 1, sz + 7, 5),
        (sx + 9, sz + 7, 10),
        (sx + 4, sz + 10, 0),
    ):
        add_warrior((x, z, ground_height(x, z)), math.radians(yaw), leader=False)
    # Rifles.
    for x, z in ((sx - 15, sz + 7), (sx - 7, sz + 7), (sx + 1, sz + 7), (sx + 9, sz + 7)):
        y = ground_height(x, z)
        add_cyl('rifle', (x + 0.32, z - 0.1, y + 1.15), 0.025, 1.3, iron, 5, (0, math.radians(12), 0))


def add_bridge(x, z):
    wood = MAT['wood']
    deck_y = ground_height(x, z) + 0.9
    add_box('bridge_deck', (x, z, deck_y), (4.2, 18.0, 0.35), wood)
    for dz in (-8, -4, 0, 4, 8):
        for dx in (-2.0, 2.0):
            add_cyl('bridge_post', (x + dx, z + dz, deck_y + 0.9), 0.12, 1.9, wood, 6)
    for dx in (-2.1, 2.1):
        add_cyl('bridge_rail', (x + dx, z, deck_y + 1.85), 0.07, 18.0, wood, 6, (math.radians(90), 0, 0))


def add_lima_army():
    # Quizu Yupanqui's host on the north bank, facing the city across the Rimac.
    inca = material('lima_inca', (0.36, 0.12, 0.07), 0.92, 0.05)
    for i, (x, z) in enumerate(((76, 146), (81, 143), (86, 148), (91, 144), (95, 149), (78, 151))):
        add_warrior((x, z, ground_height(x, z)), math.radians(180 + (i % 3 - 1) * 8), leader=i == 0, cloth=inca)
    for x, z in ((74, 143), (97, 152)):
        y = ground_height(x, z)
        add_cyl('army_banner', (x, z, y + 2.0), 0.05, 4.0, MAT['wood'], 6)
        add_box('army_banner_cloth', (x + 0.5, z, y + 3.4), (0.9, 0.04, 1.2), MAT['cloth_ochre'])
    # The Spanish horse and foot hold the bridgehead on the city side.
    guard = material('lima_guard', (0.16, 0.18, 0.24), 0.92, 0.05)
    for x, z in ((96, 150), (101, 151), (104, 149)):
        add_warrior((x, z, ground_height(x, z)), math.radians(0), cloth=guard)


def gable_roof(name, x, z, y, width, depth, height, mat):
    bm = bmesh.new()
    hw, hd = width / 2, depth / 2
    v = [bm.verts.new(p) for p in (
        (x - hw, z - hd, y), (x + hw, z - hd, y), (x + hw, z + hd, y), (x - hw, z + hd, y),
        (x - hw, z, y + height), (x + hw, z, y + height),
    )]
    bm.faces.new((v[0], v[1], v[5], v[4]))
    bm.faces.new((v[2], v[3], v[4], v[5]))
    bm.faces.new((v[1], v[2], v[5]))
    bm.faces.new((v[3], v[0], v[4]))
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def limestone(name, color):
    mat = material(name, color, 0.95, 0.3)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 20.0
    noise.inputs['Detail'].default_value = 7.0
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (*[c * 0.82 for c in color], 1)
    ramp.color_ramp.elements[1].color = (*[min(1.0, c * 1.10) for c in color], 1)
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


def add_lima_cathedral(cx, cz):
    plaster = limestone('lima_plaster', (0.74, 0.68, 0.56))
    stone = limestone('lima_stone', (0.43, 0.40, 0.35))
    tile = material('lima_tile', (0.44, 0.17, 0.08), 0.8, 0.15)
    wood = MAT['wood']
    y = ground_height(cx, cz)
    add_box('cathedral_plinth', (cx, cz, y + 0.45), (19.0, 10.0, 0.9), stone)
    add_box('cathedral_nave', (cx, cz, y + 4.0), (17.0, 8.4, 6.6), plaster)
    gable_roof('cathedral_roof', cx, cz, y + 7.3, 18.0, 9.6, 3.2, tile)
    # West tower.
    tx, tz = cx - 7.2, cz + 0.8
    add_box('cathedral_tower', (tx, tz, y + 7.2), (4.4, 4.4, 13.4), plaster)
    add_box('cathedral_tower_base', (tx, tz, y + 1.4), (5.0, 5.0, 2.4), stone)
    for dx in (-0.9, 0.9):
        add_box('belfry', (tx + dx, tz - 2.21, y + 10.6), (1.3, 0.16, 2.0), MAT['paint_dark'])
        add_box('belfry', (tx + dx, tz + 2.21, y + 10.6), (1.3, 0.16, 2.0), MAT['paint_dark'])
    add_cone('tower_cap', (tx, tz, y + 14.6), 3.4, 0.15, 2.2, tile, 4, (0, 0, math.radians(45)))
    add_box('cross_v', (tx, tz, y + 16.4), (0.16, 0.16, 1.4), MAT['paint_dark'])
    add_box('cross_h', (tx, tz, y + 16.7), (0.8, 0.16, 0.16), MAT['paint_dark'])
    # Facade: door, rose window and pilasters.
    fz = cz - 4.22
    add_box('cathedral_portal', (cx + 1.0, fz, y + 2.2), (2.8, 0.3, 4.4), wood)
    add_box('portal_frame', (cx + 1.0, fz - 0.05, y + 4.4), (3.6, 0.22, 0.5), stone)
    add_cyl('rose_window', (cx + 1.0, fz - 0.15, y + 6.1), 1.15, 0.2, stone, 16, (math.radians(90), 0, 0))
    add_cyl('rose_glass', (cx + 1.0, fz - 0.25, y + 6.1), 0.75, 0.1, MAT['paint_dark'], 16, (math.radians(90), 0, 0))
    for px in (-5.2, 7.2):
        add_box('facade_pilaster', (cx + px, fz - 0.1, y + 4.0), (1.0, 0.4, 8.0), stone)
    # Side chapel volume.
    add_box('cathedral_side', (cx + 5.0, cz + 4.4, y + 2.8), (8.0, 4.0, 5.6), plaster)
    add_cone('side_roof', (cx + 5.0, cz + 4.4, y + 6.0), 5.8, 0.2, 1.8, tile, 4, (0, 0, math.radians(45)))


def add_lima_cabildo(cx, cz):
    plaster = limestone('cabildo_plaster', (0.70, 0.63, 0.50))
    stone = limestone('cabildo_stone', (0.40, 0.36, 0.31))
    tile = material('cabildo_tile', (0.42, 0.16, 0.08), 0.82, 0.1)
    wood = MAT['wood']
    y = ground_height(cx, cz)
    add_box('cabildo_wall', (cx, cz, y + 3.4), (17.0, 7.0, 6.8), plaster)
    add_box('cabildo_plinth', (cx, cz, y + 0.3), (18.0, 8.0, 0.6), stone)
    add_box('cabildo_roof', (cx, cz, y + 7.1), (18.2, 8.2, 0.4), tile)
    add_box('cabildo_cornice', (cx, cz, y + 6.7), (18.4, 8.4, 0.3), stone)
    # Wooden balcony along the plaza side.
    add_box('balcony_floor', (cx, cz - 3.7, y + 3.6), (15.0, 1.8, 0.22), wood)
    add_box('balcony_rail', (cx, cz - 4.55, y + 4.3), (15.0, 0.12, 1.2), wood)
    for i in range(8):
        add_box('balcony_post', (cx - 7 + i * 2.0, cz - 4.55, y + 3.9), (0.12, 0.12, 0.9), wood)
    for i in range(4):
        add_box('cabildo_window', (cx - 6 + i * 4, cz - 3.55, y + 4.4), (1.3, 0.15, 1.5), MAT['paint_dark'])
        add_box('cabildo_door', (cx - 6 + i * 4, cz - 3.55, y + 1.1), (1.0, 0.15, 2.0), wood)
    add_cone('cabildo_roof_cap', (cx, cz, y + 7.9), 10.0, 0.3, 1.6, tile, 4, (0, 0, math.radians(45)))


def add_lima_house(x, z, w, d, h, yaw=0.0):
    plaster = limestone('house_plaster', (0.72, 0.64, 0.50))
    tile = material('house_tile', (0.44, 0.18, 0.09), 0.82, 0.1)
    y = ground_height(x, z)
    add_box('house', (x, z, y + h / 2), (w, d, h), plaster, (0, 0, yaw))
    add_box('house_roof', (x, z, y + h + 0.35), (w + 0.8, d + 0.8, 0.4), tile, (0, 0, yaw))
    add_box('house_door', (x, z - d / 2 - 0.03, y + 1.1), (1.2, 0.14, 2.0), MAT['wood'], (0, 0, yaw))
    add_box('house_window', (x + w * 0.22, z - d / 2 - 0.03, y + 2.6), (1.0, 0.12, 1.0), MAT['paint_dark'], (0, 0, yaw))


def add_lima_city():
    cx, cz = 90.0, 152.0
    cy = ground_height(cx, cz)
    stone = limestone('lima_paving', (0.44, 0.39, 0.32))
    # Plaza between the cathedral and the river.
    add_box('lima_plaza', (cx, cz - 11.0, cy + 0.04), (40.0, 22.0, 0.18), stone)
    add_box('lima_plaza_step', (cx, cz - 22.0, cy - 0.8), (40.0, 1.2, 1.6), stone)
    # Retaining wall and stairs down to the bridge.
    for i in range(13):
        add_box('bank_wall', (cx - 24 + i * 4, cz - 22.4, cy - 1.6), (4.1, 0.8, 3.2), stone)
    for i in range(4):
        add_box('bank_step', (112.0, cz - 24.0 + i * 0.9, cy - 0.4 - i * 0.55), (7.0, 1.0, 0.4), stone)
    add_lima_cathedral(cx, cz)
    add_lima_cabildo(cx - 26.0, cz - 6.0)
    for x, z, w, d, h in (
        (cx + 26, cz - 2, 10, 8, 5.2),
        (cx + 24, cz - 13, 8, 7, 4.6),
        (cx - 20, cz - 18, 9, 7, 4.8),
        (cx + 38, cz - 30, 8, 6, 4.4),
        (cx + 34, cz - 18, 9, 8, 5.0),
    ):
        add_lima_house(x, z, w, d, h)
    # Fountain and market in the plaza.
    fy = ground_height(cx, cz - 12)
    add_cyl('lima_fountain', (cx + 2, cz - 12, fy + 0.45), 2.4, 0.9, stone, 12)
    add_cyl('lima_fountain_water', (cx + 2, cz - 12, fy + 0.92), 2.0, 0.08, MAT['water'], 12)
    add_cyl('lima_fountain_pillar', (cx + 2, cz - 12, fy + 1.7), 0.4, 1.5, stone, 8)
    for x, z in ((cx - 10, cz - 15), (cx + 12, cz - 16)):
        add_box('lima_stall', (x, z, fy + 0.8), (3.2, 1.7, 1.6), MAT['wood'])
        add_box('lima_awning', (x, z, fy + 2.1), (3.6, 2.3, 0.12), MAT['cloth_ochre'], (math.radians(8), 0, 0))
    # Trees at the plaza corners.
    for x, z in ((cx - 18, cz - 21), (cx + 21, cz - 21)):
        ty = ground_height(x, z)
        add_cyl('lima_tree', (x, z, ty + 1.8), 0.24, 3.6, MAT['wood'], 6)
        add_ico('lima_tree_crown', (x, z, ty + 4.4), 1.8, MAT['shrub'], 2)
    # Figures: the Junta's neighbours and the garrison.
    guard = material('lima_guard', (0.16, 0.18, 0.24), 0.92, 0.05)
    for x, z, yaw in ((cx - 7, cz - 9, 10), (cx + 8, cz - 8, 200), (cx + 1, cz - 17, 180)):
        add_warrior((x, z, ground_height(x, z)), math.radians(yaw), cloth=guard)


def add_junta_cathedral(cx, cz):
    plaster = limestone('junta_plaster', (0.70, 0.65, 0.55))
    stone = limestone('junta_stone', (0.40, 0.38, 0.35))
    tile = material('junta_tile', (0.40, 0.16, 0.08), 0.82, 0.12)
    wood = MAT['wood']
    y = ground_height(cx, cz)
    add_box('junta_atrium', (cx, cz + 5.0, y + 0.35), (28.0, 12.0, 0.7), stone)
    add_box('junta_nave', (cx, cz, y + 3.9), (19.0, 9.0, 6.8), plaster)
    gable_roof('junta_roof', cx, cz, y + 7.2, 20.0, 10.2, 3.0, tile)
    # Twin towers, one taller.
    for side, height in ((-1, 15.5), (1, 13.5)):
        tx = cx + side * 8.4
        add_box('junta_tower', (tx, cz + 0.8, y + height / 2), (4.6, 4.6, height), plaster)
        add_box('junta_tower_base', (tx, cz + 0.8, y + 1.3), (5.2, 5.2, 2.6), stone)
        for dx in (-0.9, 0.9):
            add_box('junta_belfry', (tx + dx, cz + 0.8 - 2.31, y + height - 2.2), (1.3, 0.16, 2.0), MAT['paint_dark'])
            add_box('junta_belfry', (tx + dx, cz + 0.8 + 2.31, y + height - 2.2), (1.3, 0.16, 2.0), MAT['paint_dark'])
        add_cone('junta_cap', (tx, cz + 0.8, y + height + 1.1), 3.5, 0.15, 2.2, tile, 4, (0, 0, math.radians(45)))
    add_box('junta_cross_v', (cx + 8.4, cz + 0.8, y + 17.2), (0.16, 0.16, 1.3), MAT['paint_dark'])
    add_box('junta_cross_h', (cx + 8.4, cz + 0.8, y + 17.5), (0.8, 0.16, 0.16), MAT['paint_dark'])
    # Facade toward the plaza (+Z).
    fz = cz + 4.52
    add_box('junta_portal', (cx, fz, y + 2.2), (3.0, 0.3, 4.4), wood)
    add_box('junta_portal_frame', (cx, fz + 0.05, y + 4.4), (3.8, 0.22, 0.5), stone)
    add_cyl('junta_rose', (cx, fz + 0.15, y + 6.0), 1.2, 0.2, stone, 16, (math.radians(90), 0, 0))
    add_cyl('junta_rose_glass', (cx, fz + 0.25, y + 6.0), 0.78, 0.1, MAT['paint_dark'], 16, (math.radians(90), 0, 0))
    for px in (-5.4, 5.4):
        add_box('junta_pilaster', (cx + px, fz + 0.1, y + 4.0), (1.0, 0.4, 8.0), stone)


def add_junta_city():
    cx, cz = 72.0, 58.0
    cy = ground_height(cx, cz)
    stone = limestone('junta_paving', (0.42, 0.38, 0.33))
    add_junta_cathedral(cx, cz)
    # Plaza del Cusco in front of the cathedral.
    add_box('junta_plaza', (cx, cz + 15.0, cy + 0.03), (36.0, 22.0, 0.16), stone)
    # Cabildo and arcades closing the plaza.
    plaster = limestone('junta_cabildo', (0.68, 0.62, 0.50))
    tile = material('junta_cabildo_tile', (0.40, 0.15, 0.08), 0.82, 0.1)
    add_box('junta_cabildo', (cx - 24.0, cz + 16.0, cy + 3.4), (7.0, 18.0, 6.8), plaster)
    add_box('junta_cabildo_roof', (cx - 24.0, cz + 16.0, cy + 7.0), (8.2, 19.0, 0.4), tile)
    for i in range(4):
        add_box('junta_cabildo_window', (cx - 20.4, cz + 9 + i * 4.4, cy + 4.3), (0.15, 1.4, 1.5), MAT['paint_dark'])
        add_box('junta_cabildo_door', (cx - 20.4, cz + 9 + i * 4.4, cy + 1.2), (0.15, 1.1, 2.2), MAT['wood'])
    for side in (-1, 1):
        for i in range(4):
            x = cx + side * 16.0
            z = cz + 8 + i * 4.4
            add_box('junta_arcade', (x, z, cy + 2.2), (1.0, 1.0, 4.4), plaster)
            add_box('junta_arcade_roof', (x, z + 1.8, cy + 4.8), (3.4, 4.2, 0.35), tile)
    # Houses around the plaza.
    for x, z, w, d, h in (
        (cx + 24, cz + 8, 9, 7, 4.8),
        (cx + 24, cz + 20, 9, 7, 4.2),
        (cx + 30, cz + 30, 10, 7, 4.6),
        (cx - 30, cz + 30, 9, 7, 4.0),
    ):
        add_lima_house(x, z, w, d, h)
    # Stone cross and fountain in the plaza.
    fy = ground_height(cx, cz + 15)
    add_cyl('junta_cross_base', (cx - 2, cz + 14, fy + 0.5), 1.4, 1.0, stone, 8)
    add_box('junta_cross_v', (cx - 2, cz + 14, fy + 3.0), (0.22, 0.22, 3.4), stone)
    add_box('junta_cross_h', (cx - 2, cz + 14, fy + 3.4), (1.8, 0.22, 0.22), stone)
    add_cyl('junta_fountain', (cx + 8, cz + 18, fy + 0.45), 2.2, 0.9, stone, 12)
    add_cyl('junta_fountain_water', (cx + 8, cz + 18, fy + 0.92), 1.8, 0.08, MAT['water'], 12)
    # Patriot militia and the Junta's neighbours.
    patriot = material('junta_patriot', (0.12, 0.15, 0.24), 0.92, 0.05)
    for i, (x, z, yaw) in enumerate((
        (cx - 8, cz + 12, 20), (cx - 2, cz + 10, 0), (cx + 5, cz + 12, 340),
        (cx - 12, cz + 18, 30), (cx + 3, cz + 20, 0), (cx + 12, cz + 15, 320),
    )):
        add_warrior((x, z, ground_height(x, z)), math.radians(yaw), cloth=patriot, leader=i == 1)
    for x, z in ((cx - 5, cz + 16), (cx + 9, cz + 22)):
        y = ground_height(x, z)
        add_cyl('junta_banner', (x, z, y + 2.0), 0.05, 4.0, MAT['wood'], 6)
        add_box('junta_banner_cloth', (x + 0.55, z, y + 3.4), (1.0, 0.04, 1.4), MAT['cloth_ochre'])


def add_arica_backdrop():
    rock = material('morro_rock', (0.075, 0.085, 0.065), 0.98, 0.35)
    # The Morro and the headland: big low-poly masses, not cones.
    for x, z, r, sx, sy, sz in (
        (72.0, 80.0, 28.0, 1.5, 0.9, 0.55),
        (34.0, 128.0, 22.0, 1.3, 0.9, 0.5),
        (18.0, 182.0, 18.0, 1.2, 0.9, 0.45),
    ):
        obj = add_ico('morro', (x, z, ground_height(x, z) + r * sz * 0.35), r, rock, 2)
        for v in obj.data.vertices:
            v.co *= RNG.uniform(0.86, 1.14)
        obj.scale = (sx, sy, sz)
        obj.rotation_euler[2] = math.radians(RNG.uniform(-20, 20))
    # Sea shelf at the heightmap coast; it floods only the low western plain.
    add_box('arica_sea', (-130.0, 128.0, 2.35), (400.0, 256.0, 0.12), MAT['water'])
    # A blockading warship offshore.
    wood = MAT['wood']
    hull = material('ship_hull', (0.09, 0.08, 0.07), 0.8, 0.1)
    add_box('ship_hull', (44.0, 140.0, 4.0), (22.0, 6.0, 3.4), hull)
    add_box('ship_deck', (44.0, 140.0, 5.8), (19.0, 4.8, 0.25), wood)
    add_cyl('ship_mast', (44.0, 140.0, 12.0), 0.15, 14.0, wood, 6)
    add_cyl('ship_funnel', (49.0, 140.0, 8.2), 0.9, 4.6, hull, 8)
    add_box('ship_bridge', (40.0, 140.0, 6.8), (3.6, 3.2, 1.8), hull)
    add_cyl('ship_smoke', (49.0, 140.0, 13.0), 1.4, 5.0, material('smoke', (0.2, 0.2, 0.21), 1.0, 0.0), 6)


def reset_material(mat, color, roughness=0.95):
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 22.0
    noise.inputs['Detail'].default_value = 7.0
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.3
    bump.inputs['Distance'].default_value = 0.08
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])


def reset_masonry(mat, color):
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Roughness'].default_value = 0.96
    brick = nodes.new('ShaderNodeTexBrick')
    brick.inputs['Scale'].default_value = 3.0
    brick.inputs['Mortar Size'].default_value = 0.035
    brick.inputs['Color1'].default_value = (*color, 1)
    brick.inputs['Color2'].default_value = (*[c * 0.78 for c in color], 1)
    brick.inputs['Mortar'].default_value = (0.12, 0.11, 0.10, 1)
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.45
    bump.inputs['Distance'].default_value = 0.07
    links.new(brick.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(brick.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])


def import_chavin():
    glb = ROOT / 'src' / 'assets' / 'sites' / 'chavin' / 'chavin_site_lod0.glb'
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(glb))
    new = [o for o in bpy.data.objects if o not in before]
    for obj in list(new):
        if 'Terrain' in obj.name or 'Reference' in obj.name:
            bpy.data.objects.remove(obj, do_unlink=True)
            new.remove(obj)
    palette = {
        'plaster': (0.30, 0.28, 0.25),
        'stone_tiled': (0.24, 0.23, 0.21),
        'stone_dark': (0.18, 0.17, 0.16),
        'ashlar': (0.28, 0.26, 0.23),
        'portada': (0.32, 0.30, 0.27),
        'gallery': (0.025, 0.023, 0.020),
        'earth': (0.30, 0.23, 0.15),
        'vegetation': (0.14, 0.20, 0.08),
        'water': (0.05, 0.16, 0.22),
    }
    for mat in bpy.data.materials:
        key = next((k for k in palette if k in mat.name.lower()), None)
        if not key:
            continue
        if key in ('stone_tiled', 'stone_dark', 'ashlar', 'portada'):
            reset_masonry(mat, palette[key])
        else:
            reset_material(mat, palette[key], 0.9 if key == 'water' else 0.95)
    meshes = [o for o in new if o.type == 'MESH']
    lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9))
    for obj in meshes:
        for corner in obj.bound_box:
            w = obj.matrix_world @ Vector(corner)
            lo = Vector((min(lo[i], w[i]) for i in range(3)))
            hi = Vector((max(hi[i], w[i]) for i in range(3)))
    scale = CFG['scale']
    ox, oz = CFG['site']
    empty = bpy.data.objects.new('chavin', None)
    bpy.context.collection.objects.link(empty)
    empty.location = (ox - ((lo.x + hi.x) / 2) * scale, oz - ((lo.y + hi.y) / 2) * scale, ground_height(ox, oz) - lo.z * scale)
    empty.scale = (scale, scale, scale)
    for obj in new:
        if obj.parent is None:
            obj.parent = empty


def add_chavin_scene():
    import_chavin()
    sx, sz = CFG['site']
    priest = material('chavin_cloth', (0.34, 0.15, 0.09), 0.92, 0.05)
    for x, z, yaw in ((sx - 36, sz + 22, 10), (sx - 30, sz + 26, 15), (sx + 8, sz + 30, 160), (sx + 14, sz + 33, 165)):
        add_warrior((x, z, ground_height(x, z)), math.radians(yaw), cloth=priest, leader=(x == sx - 22))


def add_chimu_scene():
    sx, sz = 190.0, 87.0
    adobe = material('chimu_adobe', (0.48, 0.34, 0.21), 0.96, 0.35)
    adobe_dark = material('chimu_adobe_dark', (0.42, 0.30, 0.19), 0.96, 0.3)
    floor = material('chimu_floor', (0.50, 0.38, 0.26), 0.98, 0.2)
    dark = material('chimu_niche', (0.06, 0.045, 0.03), 1.0, 0.0)
    cy = ground_height(sx, sz)
    # Palace enclosure with a south gate.
    add_box('chimu_wall_s', (sx - 13, sz + 18, cy + 2.6), (20.0, 1.8, 5.2), adobe)
    add_box('chimu_wall_s2', (sx + 13, sz + 18, cy + 2.6), (20.0, 1.8, 5.2), adobe)
    add_box('chimu_wall_n', (sx, sz - 18, cy + 2.6), (48.0, 1.8, 5.2), adobe)
    add_box('chimu_wall_w', (sx - 24, sz, cy + 2.6), (1.8, 38.0, 5.2), adobe)
    add_box('chimu_wall_e', (sx + 24, sz, cy + 2.6), (1.8, 38.0, 5.2), adobe)
    add_box('chimu_plaza', (sx, sz, cy + 0.65), (46.0, 34.0, 0.3), floor)
    # Stepped platform in the north-west corner.
    add_box('chimu_platform', (sx - 14, sz - 10, cy + 1.4), (14.0, 10.0, 2.8), adobe_dark)
    add_box('chimu_platform_top', (sx - 14, sz - 10, cy + 2.9), (10.0, 7.0, 0.4), floor)
    for i in range(5):
        add_box('chimu_ramp', (sx - 14, sz - 3 + i * 1.1, cy + 0.25 + i * 0.45), (6.0, 1.2, 0.35), adobe)
    # Niches along the outer south wall (Chimú adobe frieze).
    for i in range(9):
        x = sx - 17 + i * 4.2
        if abs(x - sx) < 4:
            continue
        add_box('chimu_niche', (x, sz + 19.0, cy + 2.8), (1.4, 0.25, 1.8), dark)
    # Gate steps.
    for i in range(5):
        add_box('chimu_step', (sx, sz + 20 + i * 1.2, cy + 0.2 - i * 0.25), (7.0, 1.2, 0.4), adobe)
    # Storerooms and an audience hall inside the enclosure.
    for x, z, w, d, h in ((sx + 10, sz - 6, 9, 6, 3.2), (sx + 10, sz + 4, 9, 6, 2.8), (sx - 8, sz + 8, 10, 5, 3.0)):
        add_box('chimu_room', (x, z, cy + 0.8 + h / 2), (w, d, h), adobe_dark)
        add_box('chimu_room_door', (x, z - d / 2 - 0.05, cy + 1.9), (1.4, 0.14, 2.0), dark)
    # Defenders on the wall and Inca warriors approaching.
    chimu_cloth = material('chimu_cloth', (0.55, 0.30, 0.12), 0.92, 0.05)
    for x, z, yaw in ((sx - 18, sz + 20, 0), (sx + 16, sz + 20, 0), (sx - 4, sz + 21, 5)):
        add_warrior((x, z, ground_height(x, z) + 5.2), math.radians(yaw), cloth=chimu_cloth, leader=(x == sx - 18))
    inca = material('chimu_inca', (0.36, 0.12, 0.07), 0.92, 0.05)
    for x, z, yaw in ((sx - 18, sz + 34, 0), (sx - 10, sz + 36, 5), (sx - 2, sz + 34, 350), (sx + 8, sz + 37, 355), (sx + 16, sz + 34, 0)):
        add_warrior((x, z, ground_height(x, z)), math.radians(yaw), cloth=inca, leader=(x == sx - 18))


def add_cusco_scene():
    sx, sz = 150.0, 160.0
    cy = ground_height(sx, sz)
    stone = material('cusco_stone', (0.40, 0.38, 0.34), 0.95, 0.3)
    reset_masonry(stone, (0.40, 0.38, 0.34))
    floor = material('cusco_floor', (0.36, 0.33, 0.29), 0.98, 0.2)
    thatch = material('cusco_thatch', (0.52, 0.38, 0.20), 0.98, 0.2)
    dark = material('cusco_dark', (0.05, 0.04, 0.03), 1.0, 0.0)
    add_box('cusco_plaza', (sx, sz, cy + 0.55), (34.0, 26.0, 0.3), floor)
    for wx, wz, ww, wd in ((sx, sz + 13.2, 35.0, 0.8), (sx, sz - 13.2, 35.0, 0.8), (sx - 17.2, sz, 0.8, 27.0), (sx + 17.2, sz, 0.8, 27.0)):
        add_box('cusco_wall', (wx, wz, cy + 1.0), (ww, wd, 2.0), stone)
    # Ushnu: the stepped ceremonial platform.
    add_box('ushnu_1', (sx, sz + 6, cy + 1.1), (14.0, 12.0, 2.2), stone)
    add_box('ushnu_2', (sx, sz + 6, cy + 3.0), (10.0, 8.0, 1.8), stone)
    add_box('ushnu_3', (sx, sz + 6, cy + 4.7), (6.0, 5.0, 1.6), stone)
    for i in range(7):
        add_box('ushnu_step', (sx, sz + 13 + i * 1.1, cy + 0.2 + i * 0.55), (5.0, 1.1, 0.4), stone)
    # Kallankas: long halls with thatch roofs on both sides of the plaza.
    for side in (-1, 1):
        x = sx + side * 18
        add_box('kallanka', (x, sz, cy + 2.2), (7.0, 18.0, 4.4), stone)
        gable_roof('kallanka_roof', x, sz, cy + 4.4, 8.0, 20.0, 2.2, thatch)
        for i in range(3):
            add_box('kallanka_door', (x - side * 3.6, sz - 6 + i * 6.0, cy + 1.6), (0.2, 2.0, 3.2), dark)
    # Banners of the two factions.
    for x, z, color in ((sx - 10, sz + 20, (0.55, 0.12, 0.08)), (sx + 10, sz + 20, (0.62, 0.42, 0.12))):
        y = ground_height(x, z)
        add_cyl('cusco_banner', (x, z, y + 2.4), 0.06, 4.8, MAT['wood'], 6)
        add_box('cusco_banner_cloth', (x + 0.55, z, y + 4.1), (1.0, 0.04, 1.4), material('banner', color, 0.92, 0.05))
    # Atahualpa's army (south-east) and Huáscar's (north-west).
    atahualpa = material('cusco_atahualpa', (0.46, 0.12, 0.07), 0.92, 0.05)
    huascar = material('cusco_huascar', (0.55, 0.34, 0.10), 0.92, 0.05)
    for i, (x, z) in enumerate(((sx + 6, sz + 18), (sx + 10, sz + 20), (sx + 14, sz + 17), (sx + 8, sz + 23))):
        add_warrior((x, z, ground_height(x, z)), math.radians(0), cloth=atahualpa, leader=i == 0)
    for i, (x, z) in enumerate(((sx - 6, sz + 18), (sx - 10, sz + 20), (sx - 14, sz + 17), (sx - 8, sz + 23))):
        add_warrior((x, z, ground_height(x, z)), math.radians(0), cloth=huascar, leader=i == 0)
    # A few figures on the ushnu.
    add_warrior((sx, sz + 6, cy + 5.6), math.radians(180), cloth=atahualpa, leader=True)


def add_water():
    # A simple sea plane and the river ribbon; the terrain supplies the banks.
    if CFG['hm'] in ('lima', 'arica'):
        add_box('sea', (-90, 128, 0.45), (320, 256, 0.1), MAT['water'])
    if CFG['hm'] == 'lima':
        add_box('river_fill', (120, 120, 1.7), (210, 10, 0.15), MAT['water'])
    path = getattr(MOD, f'{CFG["hm"].upper()}_RIVER_PATH', None)
    half = getattr(MOD, f'{CFG["hm"].upper()}_RIVER_HALF_WIDTH', 4.0) + 2.0
    if not path:
        return
    verts = []
    faces = []
    for x, z in path:
        h = ground_height(x, z) + 0.25
        verts.extend(((x, z - half, h), (x, z + half, h)))
    for i in range(len(path) - 1):
        a = i * 2
        faces.append((a, a + 1, a + 3, a + 2))
    mesh = bpy.data.meshes.new('river')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new('river', mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(MAT['water'])


def recolor_site():
    palette = {
        'plaster': (0.72, 0.66, 0.55),
        'stone': (0.42, 0.39, 0.35),
        'tile': (0.46, 0.17, 0.08),
        'wood': (0.20, 0.11, 0.06),
        'adobe': (0.60, 0.40, 0.24),
        'canvas': (0.66, 0.58, 0.40),
    }
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        key = next((k for k in palette if k in mat.name.lower()), None)
        if not key:
            continue
        bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not bsdf:
            continue
        bsdf.inputs['Base Color'].default_value = (*palette[key], 1)
        bsdf.inputs['Roughness'].default_value = 0.92 if key != 'tile' else 0.8
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        if key in ('plaster', 'stone', 'adobe'):
            noise = nodes.new('ShaderNodeTexNoise')
            noise.inputs['Scale'].default_value = 22.0
            noise.inputs['Detail'].default_value = 8.0
            ramp = nodes.new('ShaderNodeValToRGB')
            base = palette[key]
            ramp.color_ramp.elements[0].color = (*[c * 0.84 for c in base], 1)
            ramp.color_ramp.elements[1].color = (*[min(1.0, c * 1.12) for c in base], 1)
            links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
            links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
            bump = nodes.new('ShaderNodeBump')
            bump.inputs['Strength'].default_value = 0.32
            bump.inputs['Distance'].default_value = 0.05
            links.new(noise.outputs['Fac'], bump.inputs['Height'])
            links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
        if key == 'tile':
            brick = nodes.new('ShaderNodeTexBrick')
            brick.inputs['Scale'].default_value = 18.0
            brick.inputs['Mortar Size'].default_value = 0.03
            brick.inputs['Color1'].default_value = (*palette[key], 1)
            brick.inputs['Color2'].default_value = (*[c * 0.78 for c in palette[key]], 1)
            brick.inputs['Mortar'].default_value = (0.22, 0.16, 0.12, 1)
            links.new(brick.outputs['Color'], bsdf.inputs['Base Color'])
        mat.diffuse_color = (*palette[key], 1)


def add_town(sx, sz):
    cy = ground_height(sx, sz)
    stone = material('town_paving', (0.40, 0.35, 0.28), 0.95, 0.25)
    plaster = material('town_plaster', (0.70, 0.64, 0.53), 0.95, 0.2)
    tile = material('town_tile', (0.46, 0.17, 0.08), 0.85, 0.1)
    wood = MAT['wood']
    # Plaza pavement and a low kerb.
    add_box('plaza', (sx, sz + 6, cy + 0.02), (42, 34, 0.16), stone)
    add_box('plaza_kerb', (sx, sz + 23, cy + 0.12), (42, 0.5, 0.3), stone)
    # Retaining wall on the downhill edge so the pavement does not float.
    for i in range(14):
        x = sx - 20 + i * 3
        add_box('plaza_retain', (x, sz + 23.4, cy - 0.7), (3.1, 0.6, 1.6), stone)
    # Fountain in the middle of the plaza.
    add_cyl('fountain_basin', (sx - 2, sz + 8, cy + 0.45), 2.2, 0.8, stone, 12)
    add_cyl('fountain_water', (sx - 2, sz + 8, cy + 0.9), 1.9, 0.08, MAT['water'], 12)
    add_cyl('fountain_pillar', (sx - 2, sz + 8, cy + 1.6), 0.35, 1.4, stone, 8)
    # Arcades down the two long sides of the plaza.
    for side in (-1, 1):
        for i in range(5):
            x = sx + side * 17.5
            z = sz - 4 + i * 4.5
            add_box('arcade_pier', (x, z, cy + 2.1), (1.0, 1.0, 4.2), plaster)
            add_cyl('arcade_col', (x, z, cy + 4.6), 0.5, 1.2, plaster, 8)
            add_box('arcade_roof', (x, z + 2.25, cy + 5.2), (3.2, 4.7, 0.4), tile)
    # A row of low houses framing the plaza.
    for x, z, w, d, h in (
        (sx - 26, sz + 2, 9, 6, 4.0),
        (sx - 26, sz + 12, 9, 6, 3.6),
        (sx + 26, sz + 4, 9, 6, 4.2),
        (sx + 8, sz + 26, 10, 6, 4.0),
        (sx - 6, sz + 27, 8, 5, 3.4),
    ):
        hy = ground_height(x, z)
        add_box('house_wall', (x, z, hy + h / 2), (w, d, h), plaster)
        add_cone('house_roof', (x, z, hy + h + 0.8), max(w, d) * 0.72, 0.2, 1.7, tile, 4, (0, 0, math.radians(45)))
        add_box('house_door', (x, z - d / 2 - 0.02, hy + 1.0), (1.2, 0.1, 2.0), wood)
    # A few trees.
    for x, z in ((sx - 30, sz - 6), (sx + 30, sz - 6)):
        ty = ground_height(x, z)
        add_cyl('tree_trunk', (x, z, ty + 1.6), 0.22, 3.2, wood, 6)
        add_ico('tree_crown', (x, z, ty + 4.2), 2.4, MAT['shrub'], 2)
    # Cabildo: a long two-storey block closing one side of the plaza.
    cby = ground_height(sx, sz + 30)
    add_box('cabildo', (sx, sz + 30, cby + 3.4), (22, 7, 6.8), plaster)
    add_cone('cabildo_roof', (sx, sz + 30, cby + 7.4), 13.0, 0.4, 1.6, tile, 4, (0, 0, math.radians(45)))
    for i in range(5):
        add_box('cabildo_window', (sx - 8 + i * 4, sz + 26.5, cby + 4.2), (1.2, 0.15, 1.4), wood)
    # Banners and market awnings.
    for x, z in ((sx - 14, sz + 20), (sx + 14, sz + 20)):
        add_cyl('banner_pole', (x, z, cy + 2.6), 0.06, 5.2, wood, 6)
        add_box('banner', (x + 0.55, z, cy + 4.4), (1.0, 0.04, 1.5), MAT['cloth_ochre'])
    for x, z in ((sx - 9, sz + 12), (sx + 4, sz + 12)):
        add_box('stall', (x, z, cy + 0.8), (3.0, 1.6, 1.6), wood)
        add_box('awning', (x, z, cy + 2.0), (3.4, 2.2, 0.12), MAT['cloth_ochre'], (math.radians(8), 0, 0))
    for x, z, yaw in ((sx - 6, sz + 16, 20), (sx + 1, sz + 18, 160), (sx + 8, sz + 15, 200)):
        add_warrior((x, z, ground_height(x, z)), math.radians(yaw), cloth=MAT['cloth_ochre'])


def import_site():
    glb = ROOT / 'src' / 'assets' / 'sites' / CFG['glb']
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(glb))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == 'MESH']
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for obj in meshes:
        for corner in obj.bound_box:
            w = obj.matrix_world @ Vector(corner)
            lo = Vector((min(lo[i], w[i]) for i in range(3)))
            hi = Vector((max(hi[i], w[i]) for i in range(3)))
    scale = CFG['scale']
    ox, oz = CFG['site']
    empty = bpy.data.objects.new('site', None)
    bpy.context.collection.objects.link(empty)
    empty.location = (
        ox - ((lo.x + hi.x) / 2) * scale,
        oz - ((lo.y + hi.y) / 2) * scale,
        ground_height(ox, oz) - lo.z * scale,
    )
    empty.scale = (scale, scale, scale)
    for obj in new:
        if obj.parent is None:
            obj.parent = empty
    return empty


def add_mountains():
    specs = [
        (-260, -300, 150, 120), (-60, -420, 170, 150), (220, -330, 140, 110),
        (-430, -140, 160, 130), (-380, 120, 150, 100), (420, -180, 160, 105),
        (420, 320, 170, 120), (60, 430, 160, 110),
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


def add_lighting():
    world = bpy.data.worlds.new('sky')
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    bg = next(n for n in nodes if n.type == 'BACKGROUND')
    coord = nodes.new('ShaderNodeTexCoord')
    separate = nodes.new('ShaderNodeSeparateXYZ')
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.30
    ramp.color_ramp.elements[0].color = (0.86, 0.50, 0.28, 1)
    mid = ramp.color_ramp.elements.new(0.48)
    mid.color = (0.45, 0.44, 0.46, 1)
    ramp.color_ramp.elements[1].position = 0.74
    ramp.color_ramp.elements[1].color = (0.10, 0.17, 0.32, 1)
    links.new(coord.outputs['Generated'], separate.inputs['Vector'])
    links.new(separate.outputs['Z'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 0.55
    bpy.context.scene.world = world

    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy = 5.8
    sun.angle = math.radians(1.5)
    sun.color = (1.0, 0.60, 0.30)
    sun_obj = bpy.data.objects.new('sun', sun)
    bpy.context.collection.objects.link(sun_obj)
    direction = Vector((-0.45, -0.55, -0.20)).normalized()
    sun_obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

    fill = bpy.data.lights.new('fill', 'AREA')
    fill.energy = 45
    fill.size = 24
    fill.color = (0.45, 0.60, 1.0)
    fill_obj = bpy.data.objects.new('fill', fill)
    bpy.context.collection.objects.link(fill_obj)
    fill_obj.location = (25, 100, 24)
    fill_obj.rotation_euler = (Vector((CFG['site'][0], CFG['site'][1], 6)) - fill_obj.location).to_track_quat('-Z', 'Y').to_euler()

    rim = bpy.data.lights.new('rim', 'SUN')
    rim.energy = 2.2
    rim.angle = math.radians(2.0)
    rim.color = (0.55, 0.68, 1.0)
    rim_obj = bpy.data.objects.new('rim', rim)
    bpy.context.collection.objects.link(rim_obj)
    rim_dir = Vector((0.4, 0.5, -0.35)).normalized()
    rim_obj.rotation_euler = rim_dir.to_track_quat('-Z', 'Y').to_euler()


def add_camera():
    cam = bpy.data.cameras.new('camera')
    cam.lens = CFG['lens']
    cam.sensor_width = 36
    cam.dof.use_dof = True
    cam.dof.aperture_fstop = 5.0
    obj = bpy.data.objects.new('camera', cam)
    bpy.context.collection.objects.link(obj)
    cx, cz, ch = CFG['camera']
    tx, tz, th = CFG['target']
    obj.location = (cx, cz, ground_height(cx, cz) + ch)
    target = Vector((tx, tz, ground_height(tx, tz) + th))
    cam.dof.focus_distance = (Vector(obj.location) - target).length
    obj.rotation_euler = (target - obj.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = obj


def add_render_settings(path: Path):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.eevee.taa_render_samples = 16 if PREVIEW else 64
    scene.render.resolution_x = 800 if PREVIEW else 1600
    scene.render.resolution_y = 450 if PREVIEW else 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.filepath = str(path)
    scene.view_settings.view_transform = 'AgX'
    try:
        scene.view_settings.look = 'AgX - Medium High Contrast'
    except TypeError:
        pass
    scene.view_settings.exposure = 0.15
    if hasattr(scene.eevee, 'use_shadows'):
        scene.eevee.use_shadows = True


def main() -> None:
    clear()
    init_materials()
    uniform = CFG.get('uniform')
    if uniform:
        MAT['cloth'] = material('uniform_cloth', tuple(uniform), 0.92, 0.05)
        MAT['cloth_dark'] = material('uniform_dark', tuple(c * 0.55 for c in uniform), 0.94, 0.05)
    build_terrain()
    if CFG.get('bespoke') == 'chimu':
        add_chimu_scene()
    elif CFG.get('bespoke') == 'cusco':
        add_cusco_scene()
    elif CFG.get('bespoke') == 'lima':
        add_lima_city()
    elif CFG.get('bespoke') == 'chavin':
        add_chavin_scene()
    elif CFG.get('bespoke') == 'junta':
        add_junta_city()
    elif not CFG.get('bespoke'):
        import_site()
        recolor_site()
    add_water()
    if CFG.get('town') and CFG.get('bespoke') != 'lima':
        add_town(*CFG['site'])
    if CFG.get('battery'):
        add_arica_backdrop()
        add_arica_scene()
    if CFG.get('bridge'):
        add_bridge(*CFG['bridge'])
    if CFG.get('army'):
        add_lima_army()
    add_grass_field()
    for i, (x, z, yaw) in enumerate(CFG.get('figures', [])):
        add_warrior((x, z, ground_height(x, z)), math.radians(yaw), leader=i == 0)
    add_lighting()
    add_camera()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    render = Path('/tmp/opencode') / f'{MISSION}_preview.png' if PREVIEW else OUT_DIR / MISSION / 'hero.png'
    render.parent.mkdir(parents=True, exist_ok=True)
    add_render_settings(render)
    if not PREVIEW:
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT_DIR / MISSION / f'{MISSION}.blend'))
    bpy.ops.render.render(write_still=True)
    print(f'RENDERED {render}')


main()
