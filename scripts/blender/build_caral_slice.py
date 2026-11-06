"""Build and render the Caral valley vertical slice (art-direction target).

A self-contained diorama of one corner of the Supe valley c. 2600 BC, used to
validate docs/design/art-direction.md before anything is produced for the game:
river bed with riparian forest (willow, caña brava, carrizo), a wetland with
totora, irrigated fields (cotton, squash, beans), a huarango grove, the desert
terrace with quincha houses and the first phase of the Pyramid Mayor under
construction with its sunken circular plaza; people, deer and birds.

Units are game units (a person is 1.86). Historical sources and certainty labels:
docs/historia/campanas/caral.md. This is a style target, not a reconstruction;
every docstring marks what is documented, inferred or assumed.

The file has two parts:
- the build module (everything above the CLI marker) only uses bpy, bmesh, mathutils, math
  and random and no classes, so it runs in a Blender driven by the MCP add-on in safe mode. Safe
  mode caps a script at 20k AST nodes, so there it is sent as four self-contained stages
  (build_stage_look/terrain/kits/life plus the definitions each one uses) that only share data
  through datablock names; headless runs call ``build()``, which runs the same stages in order;
- the CLI wrapper (below the marker) is for headless runs from the repository root:
    blender --background --python scripts/blender/build_caral_slice.py -- [--samples=64] [--no-render]
    blender --background art-src/blender/scenes/caral_valley_slice.blend \
        --python scripts/blender/build_caral_slice.py -- --render-only [--views=close,default,wide]
"""

import math
import random

import bmesh
import bpy
from mathutils import Vector, noise

PERSON = 1.86
TERRACE_Z = 7.0
SIZE_X, SIZE_Y = 160.0, 150.0
RES_X, RES_Y = 320, 300
FAR_X, FAR_Y0, FAR_Y1, FAR_STEP = 460.0, -340.0, 476.0, 8.0
MID_X, MID_Y0, MID_Y1, MID_STEP = 220.0, -180.0, 180.0, 2.5

PYR = (14.0, 47.0)
PYR_HALF = (17.0, 12.0)
PYR_WORK_Z = 5.4  # top of the second platform, where the third level is being raised
PLAZA = (14.0, 26.0)
PLAZA_R = 4.0
CANAL_X = (-64.0, 52.0)
PATH = [(-8.0, 1.0), (-2.0, 8.0), (4.0, 14.0), (8.0, 19.5), (11.0, 22.5)]
PATH_HOUSES = [(-12.0, 33.0), (-4.0, 31.5), (3.0, 29.0), (9.5, 27.5)]

# (centre x, centre y, width, depth, angle in degrees, crop). Crops documented; layout assumed.
PLOTS = [
    (-56.0, -7.5, 15.0, 10.0, 6.0, 'cotton'),
    (-41.0, -3.5, 11.0, 12.0, -4.0, 'squash'),
    (-28.5, -6.5, 12.0, 9.0, 9.0, 'cotton'),
    (-17.5, -1.5, 7.0, 6.0, -10.0, 'beans'),
    (-9.0, -7.0, 9.0, 9.0, -3.0, 'fallow'),
    (3.0, -5.0, 13.0, 10.0, 3.0, 'squash'),
    (16.5, -8.0, 11.0, 9.0, -8.0, 'cotton'),
    (18.0, 0.0, 9.0, 4.5, -4.0, 'beans'),
    (30.0, -5.5, 12.0, 11.0, 5.0, 'cotton'),
    (43.0, -7.0, 9.0, 8.0, -11.0, 'squash'),
    (44.5, -0.5, 8.0, 5.0, 3.0, 'fallow'),
]
ROW_SPACING = 1.6


def hex_rgb(value):
    value = value.lstrip('#')
    srgb = [int(value[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb)


# Palette from docs/design/art-direction.md §4 (plus neutral props).
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
    'bark': hex_rgb('#3b2c22'),
    'cane': hex_rgb('#b49a68'),
    'reed_green': hex_rgb('#6f7a3e'),
    'stone': hex_rgb('#8d8478'),
    'fire': hex_rgb('#ff8a3a'),
    'deer': hex_rgb('#8a6544'),
    'squash': hex_rgb('#8f8a4a'),
    'gourd': hex_rgb('#a68a52'),
}


def V(c):
    return Vector(c)


def smoothstep(a, b, v):
    t = min(1.0, max(0.0, (v - a) / (b - a)))
    return t * t * (3 - 2 * t)


def n2(x, y, z=0.0):
    return noise.noise(Vector((x, y, z)))


# --------------------------------------------------------------------------- scene


def clear_scene():
    """Empty the current file in place (safe for a GUI session; keeps the UI and add-ons)."""
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.particles, bpy.data.lights, bpy.data.cameras,
                 bpy.data.worlds, bpy.data.node_groups, bpy.data.curves):
        for block in list(coll):
            coll.remove(block)
    for col in list(bpy.data.collections):
        bpy.data.collections.remove(col)
    return bpy.context.scene


def collection(name):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    return col


def link(obj, col):
    col.objects.link(obj)
    return obj


# ----------------------------------------------------------------------- materials


def principled(mat):
    return next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')


def new_mat(name):
    mat = bpy.data.materials.new(name)
    if mat.node_tree is None:
        mat.use_nodes = True
    return mat, mat.node_tree, principled(mat)


def node(nt, kind, **inputs):
    n = nt.nodes.new(kind)
    for key, value in inputs.items():
        n.inputs[key].default_value = value
    return n


def math_node(nt, op, a=None, b=None, clamp=False):
    n = nt.nodes.new('ShaderNodeMath')
    n.operation = op
    n.use_clamp = clamp
    for idx, val in ((0, a), (1, b)):
        if val is None:
            continue
        if isinstance(val, (int, float)):
            n.inputs[idx].default_value = val
        else:
            nt.links.new(val, n.inputs[idx])
    return n.outputs[0]


def map_range(nt, value, fmin, fmax, tmin, tmax):
    n = nt.nodes.new('ShaderNodeMapRange')
    n.inputs['From Min'].default_value = fmin
    n.inputs['From Max'].default_value = fmax
    n.inputs['To Min'].default_value = tmin
    n.inputs['To Max'].default_value = tmax
    nt.links.new(value, n.inputs['Value'])
    return n.outputs['Result']


def mix_rgb(nt, fac, a, b, blend='MIX'):
    n = nt.nodes.new('ShaderNodeMix')
    n.data_type = 'RGBA'
    n.blend_type = blend
    for sock, val in ((n.inputs[0], fac), (n.inputs[6], a), (n.inputs[7], b)):
        if isinstance(val, (int, float)):
            sock.default_value = val
        elif isinstance(val, (tuple, Vector)):
            sock.default_value = tuple(val) if len(val) == 4 else (*val, 1)
        else:
            nt.links.new(val, sock)
    return n.outputs[2]


def ramp2(nt, fac, c0, c1, p0=0.0, p1=1.0):
    n = nt.nodes.new('ShaderNodeValToRGB')
    n.color_ramp.elements[0].position = p0
    n.color_ramp.elements[1].position = p1
    n.color_ramp.elements[0].color = (*c0, 1)
    n.color_ramp.elements[1].color = (*c1, 1)
    nt.links.new(fac, n.inputs['Fac'])
    return n.outputs['Color']


def noise_tex(nt, vec, scale, detail=3.0, rough=0.5):
    n = node(nt, 'ShaderNodeTexNoise', Scale=scale, Detail=detail, Roughness=rough)
    nt.links.new(vec, n.inputs['Vector'])
    return n


def bump(nt, height_out, strength, normal=None):
    b = node(nt, 'ShaderNodeBump', Strength=strength)
    nt.links.new(height_out, b.inputs['Height'])
    if normal is not None:
        nt.links.new(normal, b.inputs['Normal'])
    return b.outputs['Normal']


def scaled(nt, vec, sx, sy, sz):
    m = nt.nodes.new('ShaderNodeMapping')
    m.inputs['Scale'].default_value = (sx, sy, sz)
    nt.links.new(vec, m.inputs['Vector'])
    return m.outputs['Vector']


def mat_varied(name, color, roughness=0.9, variation=0.12, scale=0.35, bump_strength=0.15, dirt=0.0):
    """Base colour with low-frequency variation, roughness variation, soft bump and optional ground
    dirt that darkens the lowest metre (needs object origin at ground level)."""
    mat, nt, bsdf = new_mat(name)
    coord = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    tex = noise_tex(nt, coord, scale, 3.0)
    col = ramp2(nt, tex.outputs['Fac'], V(color) * (1 - variation), V(color) * (1 + variation))
    if dirt > 0:
        sep = nt.nodes.new('ShaderNodeSeparateXYZ')
        nt.links.new(coord, sep.inputs['Vector'])
        dcol = ramp2(nt, sep.outputs['Z'], (1 - dirt, 1 - dirt * 1.1, 1 - dirt * 1.25), (1, 1, 1), 0.0, 1.0)
        col = mix_rgb(nt, 1.0, col, dcol, 'MULTIPLY')
    nt.links.new(col, bsdf.inputs['Base Color'])
    nt.links.new(map_range(nt, tex.outputs['Fac'], 0, 1, max(0.0, roughness - 0.12), min(1.0, roughness + 0.08)),
                 bsdf.inputs['Roughness'])
    if bump_strength > 0:
        detail = noise_tex(nt, coord, scale * 18, 4.0)
        nt.links.new(bump(nt, detail.outputs['Fac'], bump_strength), bsdf.inputs['Normal'])
    return mat


def mat_flat(name, color, roughness=0.85, emission=0.0):
    mat, nt, bsdf = new_mat(name)
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*color, 1)
        bsdf.inputs['Emission Strength'].default_value = emission
    return mat


def mat_leaf(name, color, cells=(5.0, 5.0), threshold=0.33, hue_shift=(1.08, 1.05, 0.8)):
    """Alpha leaf card: Voronoi cells in UV space read as leaflets, faded out towards the card rim.
    Colour varies per card (``leafvar`` corner attribute) and per leaflet; light transmits through."""
    mat, nt, bsdf = new_mat(name)
    mat.surface_render_method = 'DITHERED'
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    uv = nt.nodes.new('ShaderNodeTexCoord').outputs['UV']
    vor = nt.nodes.new('ShaderNodeTexVoronoi')
    vor.inputs['Randomness'].default_value = 0.85
    nt.links.new(scaled(nt, uv, cells[0], cells[1], 1.0), vor.inputs['Vector'])
    leaflet = map_range(nt, vor.outputs['Distance'], threshold - 0.06, threshold, 1.0, 0.0)
    centred = nt.nodes.new('ShaderNodeVectorMath')
    centred.operation = 'DISTANCE'
    centred.inputs[1].default_value = (0.5, 0.5, 0.0)
    nt.links.new(uv, centred.inputs[0])
    radial = map_range(nt, centred.outputs['Value'], 0.36, 0.5, 1.0, 0.0)
    alpha = math_node(nt, 'MULTIPLY', leaflet, radial)
    var = nt.nodes.new('ShaderNodeAttribute')
    var.attribute_name = 'leafvar'
    vsep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(vor.outputs['Color'], vsep.inputs['Color'])
    mixed = math_node(nt, 'MULTIPLY_ADD', var.outputs['Fac'], 0.75)
    nt.links.new(math_node(nt, 'MULTIPLY', vsep.outputs['Red'], 0.25), mixed.node.inputs[2])
    shifted = tuple(c * h for c, h in zip(color, hue_shift))
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (*V(color) * 0.62, 1)
    ramp.color_ramp.elements[1].color = (*V(shifted) * 1.15, 1)
    mid = ramp.color_ramp.elements.new(0.5)
    mid.color = (*color, 1)
    nt.links.new(mixed, ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.55
    trans = nt.nodes.new('ShaderNodeBsdfTranslucent')
    nt.links.new(ramp.outputs['Color'], trans.inputs['Color'])
    leaf = nt.nodes.new('ShaderNodeMixShader')
    leaf.inputs['Fac'].default_value = 0.28
    nt.links.new(bsdf.outputs['BSDF'], leaf.inputs[1])
    nt.links.new(trans.outputs['BSDF'], leaf.inputs[2])
    transparent = nt.nodes.new('ShaderNodeBsdfTransparent')
    cut = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(alpha, cut.inputs['Fac'])
    nt.links.new(transparent.outputs['BSDF'], cut.inputs[1])
    nt.links.new(leaf.outputs['Shader'], cut.inputs[2])
    nt.links.new(cut.outputs['Shader'], out.inputs['Surface'])
    return mat


def mat_plume(name, color):
    """Feathery plume card for caña brava: thin streaks in UV space."""
    mat, nt, bsdf = new_mat(name)
    mat.surface_render_method = 'DITHERED'
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    uv = nt.nodes.new('ShaderNodeTexCoord').outputs['UV']
    streak = noise_tex(nt, scaled(nt, uv, 40.0, 2.0, 1.0), 1.0, 2.0)
    lines = map_range(nt, streak.outputs['Fac'], 0.45, 0.6, 0.0, 1.0)
    centred = nt.nodes.new('ShaderNodeVectorMath')
    centred.operation = 'DISTANCE'
    centred.inputs[1].default_value = (0.5, 0.5, 0.0)
    nt.links.new(uv, centred.inputs[0])
    radial = map_range(nt, centred.outputs['Value'], 0.2, 0.5, 1.0, 0.0)
    alpha = math_node(nt, 'MULTIPLY', lines, radial)
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = 0.9
    transparent = nt.nodes.new('ShaderNodeBsdfTransparent')
    cut = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(alpha, cut.inputs['Fac'])
    nt.links.new(transparent.outputs['BSDF'], cut.inputs[1])
    nt.links.new(bsdf.outputs['BSDF'], cut.inputs[2])
    nt.links.new(cut.outputs['Shader'], out.inputs['Surface'])
    return mat


def mat_bark(name, color):
    """Twisted dark bark: noise stretched along the trunk, fissure bump."""
    mat, nt, bsdf = new_mat(name)
    coord = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    fis = noise_tex(nt, scaled(nt, coord, 9.0, 9.0, 1.2), 1.5, 6.0, 0.6)
    col = ramp2(nt, fis.outputs['Fac'], V(color) * 0.5, V(color) * 1.0, 0.3, 0.75)
    nt.links.new(col, bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.92
    nt.links.new(bump(nt, fis.outputs['Fac'], 0.6), bsdf.inputs['Normal'])
    return mat


def _ao_dirt(nt, col, strength=0.35, distance=0.6):
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion')
    ao.inputs['Distance'].default_value = distance
    shade = map_range(nt, ao.outputs['AO'], 0.0, 1.0, 1.0 - strength, 1.0)
    return mix_rgb(nt, 1.0, col, shade, 'MULTIPLY')


def mat_plaster(name, color, core, wear=0.25, streaks=0.18):
    """Hand-applied clay plaster (documented finish; colour per phase inferred): macro tone variation,
    vertical rain/dust streaks, flaked patches revealing the stone-and-mortar core, darker base where
    dust and moisture collect, ambient-occlusion grime in the corners. Needs origin at ground level."""
    mat, nt, bsdf = new_mat(name)
    coord = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    macro = noise_tex(nt, coord, 0.18, 4.0)
    col = ramp2(nt, macro.outputs['Fac'], V(color) * 0.8, V(color) * 1.06, 0.3, 0.7)
    streak = noise_tex(nt, scaled(nt, coord, 2.2, 2.2, 0.12), 1.0, 4.0, 0.6)
    sfac = map_range(nt, streak.outputs['Fac'], 0.45, 0.75, 0.0, streaks)
    col = mix_rgb(nt, sfac, col, V(PAL['wet_sand']) * 0.9)
    flake = noise_tex(nt, coord, 1.3, 6.0, 0.62)
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(coord, sep.inputs['Vector'])
    low = map_range(nt, sep.outputs['Z'], 0.0, 2.0, 0.14, 0.0)
    edge = 0.74 - wear * 0.4
    fmask = map_range(nt, math_node(nt, 'ADD', flake.outputs['Fac'], low), edge, edge + 0.015, 0.0, 1.0)
    core_tex = noise_tex(nt, coord, 6.0, 3.0)
    core_col = ramp2(nt, core_tex.outputs['Fac'], V(core) * 0.85, V(core) * 1.2)
    col = mix_rgb(nt, fmask, col, core_col)
    base = map_range(nt, sep.outputs['Z'], 0.0, 1.4, 0.38, 0.0)
    col = mix_rgb(nt, base, col, V(PAL['wet_sand']) * 0.8)
    col = _ao_dirt(nt, col, 0.4, 0.8)
    nt.links.new(col, bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.9
    fine = noise_tex(nt, coord, 14.0, 5.0, 0.6)
    h = math_node(nt, 'MULTIPLY_ADD', fmask, -0.6)
    nt.links.new(fine.outputs['Fac'], h.node.inputs[2])
    nt.links.new(bump(nt, h, 0.25), bsdf.inputs['Normal'])
    return mat


def mat_quincha(name, paint):
    """Quincha wall (documented): cane panel plastered with mud and painted. Eroded patches expose the
    vertical canes; the base is splashed with dust. Stripe direction follows the wall plane."""
    mat, nt, bsdf = new_mat(name)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    coord = tc.outputs['Object']
    nrm = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Normal'], nrm.inputs['Vector'])
    wx = nt.nodes.new('ShaderNodeTexWave')
    wx.bands_direction = 'X'
    wx.inputs['Scale'].default_value = 7.0
    wx.inputs['Distortion'].default_value = 0.4
    wy = nt.nodes.new('ShaderNodeTexWave')
    wy.bands_direction = 'Y'
    wy.inputs['Scale'].default_value = 7.0
    wy.inputs['Distortion'].default_value = 0.4
    nt.links.new(coord, wx.inputs['Vector'])
    nt.links.new(coord, wy.inputs['Vector'])
    ax = math_node(nt, 'ABSOLUTE', nrm.outputs['Y'])
    ay = math_node(nt, 'ABSOLUTE', nrm.outputs['X'])
    sx = math_node(nt, 'MULTIPLY', wx.outputs['Fac'], ax)
    stripes = math_node(nt, 'MULTIPLY_ADD', wy.outputs['Fac'], ay)
    nt.links.new(sx, stripes.node.inputs[2])
    cane_col = ramp2(nt, stripes, V(PAL['cane']) * 0.55, V(PAL['cane']) * 1.05, 0.2, 0.8)
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(coord, sep.inputs['Vector'])
    erosion = noise_tex(nt, coord, 1.4, 5.0, 0.6)
    low = map_range(nt, sep.outputs['Z'], 0.0, 0.7, 0.14, 0.0)
    e = math_node(nt, 'ADD', erosion.outputs['Fac'], low)
    emask = map_range(nt, e, 0.58, 0.61, 0.0, 1.0)
    macro = noise_tex(nt, coord, 0.6, 4.0)
    plaster = ramp2(nt, macro.outputs['Fac'], V(paint) * 0.86, V(paint) * 1.04, 0.3, 0.7)
    col = mix_rgb(nt, emask, plaster, cane_col)
    base = map_range(nt, sep.outputs['Z'], 0.0, 0.6, 0.35, 0.0)
    col = mix_rgb(nt, base, col, V(PAL['wet_sand']) * 0.85)
    col = _ao_dirt(nt, col, 0.35, 0.5)
    nt.links.new(col, bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.92
    fine = noise_tex(nt, coord, 18.0, 4.0)
    h = math_node(nt, 'MULTIPLY', stripes, emask)
    h2 = math_node(nt, 'MULTIPLY_ADD', fine.outputs['Fac'], 0.3)
    nt.links.new(h, h2.node.inputs[2])
    nt.links.new(bump(nt, h2, 0.35), bsdf.inputs['Normal'])
    return mat


def mat_cane_mat(name):
    """Woven cane mat (estera) for roofs and screens: crossed bands, sun-bleached macro tone."""
    mat, nt, bsdf = new_mat(name)
    coord = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    wx = nt.nodes.new('ShaderNodeTexWave')
    wx.bands_direction = 'X'
    wx.inputs['Scale'].default_value = 9.0
    wy = nt.nodes.new('ShaderNodeTexWave')
    wy.bands_direction = 'Y'
    wy.inputs['Scale'].default_value = 9.0
    nt.links.new(coord, wx.inputs['Vector'])
    nt.links.new(coord, wy.inputs['Vector'])
    checker = nt.nodes.new('ShaderNodeTexChecker')
    checker.inputs['Scale'].default_value = 4.5
    nt.links.new(coord, checker.inputs['Vector'])
    weave = mix_rgb(nt, checker.outputs['Fac'], wx.outputs['Fac'], wy.outputs['Fac'])
    wsep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(weave, wsep.inputs['Color'])
    macro = noise_tex(nt, coord, 0.5, 4.0)
    straw = V(PAL['cane']).lerp(V(PAL['ochre']), 0.3)
    base = ramp2(nt, macro.outputs['Fac'], straw * 0.75, straw * 1.12, 0.3, 0.7)
    shade = map_range(nt, wsep.outputs['Red'], 0.0, 1.0, 0.5, 1.1)
    col = mix_rgb(nt, 1.0, base, mix_rgb(nt, 1.0, (1, 1, 1), shade, 'MULTIPLY'), 'MULTIPLY')
    col = _ao_dirt(nt, col, 0.3, 0.4)
    nt.links.new(col, bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.88
    nt.links.new(bump(nt, wsep.outputs['Red'], 0.3), bsdf.inputs['Normal'])
    return mat


def mat_shicra(name):
    """Shicra bag (documented): reed-fibre net bag filled with stones. A diagonal net over grey stones."""
    mat, nt, bsdf = new_mat(name)
    coord = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    d1 = nt.nodes.new('ShaderNodeTexWave')
    d1.bands_direction = 'DIAGONAL'
    d1.inputs['Scale'].default_value = 14.0
    nt.links.new(coord, d1.inputs['Vector'])
    rot = nt.nodes.new('ShaderNodeMapping')
    rot.inputs['Rotation'].default_value = (0.0, 0.0, math.pi / 2)
    nt.links.new(coord, rot.inputs['Vector'])
    d2 = nt.nodes.new('ShaderNodeTexWave')
    d2.bands_direction = 'DIAGONAL'
    d2.inputs['Scale'].default_value = 14.0
    nt.links.new(rot.outputs['Vector'], d2.inputs['Vector'])
    net = math_node(nt, 'MAXIMUM', map_range(nt, d1.outputs['Fac'], 0.42, 0.55, 0, 1),
                    map_range(nt, d2.outputs['Fac'], 0.42, 0.55, 0, 1))
    stones = nt.nodes.new('ShaderNodeTexVoronoi')
    stones.inputs['Scale'].default_value = 9.0
    nt.links.new(coord, stones.inputs['Vector'])
    ssep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(stones.outputs['Color'], ssep.inputs['Color'])
    stone_col = ramp2(nt, ssep.outputs['Red'], V(PAL['stone']) * 0.6, V(PAL['stone']) * 1.1)
    fibre = ramp2(nt, noise_tex(nt, coord, 3.0).outputs['Fac'], V(PAL['cane']) * 0.6, V(PAL['cane']) * 0.95)
    col = mix_rgb(nt, net, stone_col, fibre)
    col = _ao_dirt(nt, col, 0.45, 0.3)
    nt.links.new(col, bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.95
    h = math_node(nt, 'ADD', net, map_range(nt, stones.outputs['Distance'], 0.0, 0.5, 0.4, 0.0))
    nt.links.new(bump(nt, h, 0.5), bsdf.inputs['Normal'])
    return mat


def mat_terrain():
    """Terrain: per-vertex zone colour (``zone``) broken up with two noise scales; ``mask`` carries
    R = cultivated field, G = wetness, B = gravel; ``rowc`` is the across-row coordinate inside each
    plot so furrows follow each plot's own orientation."""
    mat, nt, bsdf = new_mat('MAT-Slice_Terrain')
    coord = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    zone = nt.nodes.new('ShaderNodeAttribute')
    zone.attribute_name = 'zone'
    mask = nt.nodes.new('ShaderNodeAttribute')
    mask.attribute_name = 'mask'
    msep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(mask.outputs['Color'], msep.inputs['Color'])
    rowc = nt.nodes.new('ShaderNodeAttribute')
    rowc.attribute_name = 'rowc'
    macro = noise_tex(nt, coord, 0.06, 4.0)
    col = mix_rgb(nt, 1.0, zone.outputs['Color'],
                  ramp2(nt, macro.outputs['Fac'], (0.84, 0.84, 0.84), (1.1, 1.08, 1.05)), 'MULTIPLY')
    mid = noise_tex(nt, coord, 1.1, 6.0, 0.65)
    col = mix_rgb(nt, 1.0, col, ramp2(nt, mid.outputs['Fac'], (0.82, 0.82, 0.82), (1.1, 1.08, 1.05), 0.3, 0.7),
                  'MULTIPLY')
    # Furrows: ridges every ROW_SPACING across the row direction, only on cultivated plots.
    wob = noise_tex(nt, coord, 0.8, 2.0)
    phase = math_node(nt, 'MULTIPLY_ADD', wob.outputs['Fac'], 0.8)
    nt.links.new(math_node(nt, 'MULTIPLY', rowc.outputs['Fac'], 2 * math.pi / ROW_SPACING), phase.node.inputs[2])
    ridge = math_node(nt, 'MULTIPLY_ADD', math_node(nt, 'SINE', phase), 0.5)
    ridge.node.inputs[2].default_value = 0.5
    furrow = math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', 1.0, ridge), msep.outputs['Red'])
    col = mix_rgb(nt, math_node(nt, 'MULTIPLY', furrow, 0.35), col, (0.25, 0.2, 0.15), 'MULTIPLY')
    # Wetness darkens.
    col = mix_rgb(nt, math_node(nt, 'MULTIPLY', msep.outputs['Green'], 0.45), col, (0.3, 0.3, 0.3), 'MULTIPLY')
    # Gravel speckle on the river bed and terrace.
    peb = nt.nodes.new('ShaderNodeTexVoronoi')
    peb.inputs['Scale'].default_value = 2.4
    nt.links.new(coord, peb.inputs['Vector'])
    psep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(peb.outputs['Color'], psep.inputs['Color'])
    pebble = map_range(nt, peb.outputs['Distance'], 0.18, 0.28, 1.0, 0.0)
    ptone = ramp2(nt, psep.outputs['Red'], (0.6, 0.58, 0.56), (1.25, 1.2, 1.15))
    pfac = math_node(nt, 'MULTIPLY', pebble, msep.outputs['Blue'])
    col = mix_rgb(nt, pfac, col, mix_rgb(nt, 1.0, col, ptone, 'MULTIPLY'))
    micro = noise_tex(nt, coord, 7.0, 4.0, 0.6)
    col = mix_rgb(nt, 1.0, col, ramp2(nt, micro.outputs['Fac'], (0.9, 0.9, 0.9), (1.07, 1.06, 1.04), 0.3, 0.7),
                  'MULTIPLY')
    nt.links.new(col, bsdf.inputs['Base Color'])
    rough = math_node(nt, 'MULTIPLY_ADD', msep.outputs['Green'], -0.35)
    nt.links.new(map_range(nt, mid.outputs['Fac'], 0, 1, 0.84, 0.98), rough.node.inputs[2])
    nt.links.new(rough, bsdf.inputs['Roughness'])
    detail = noise_tex(nt, coord, 6.0, 6.0, 0.6)
    h = math_node(nt, 'MULTIPLY_ADD', ridge, msep.outputs['Red'])
    nt.links.new(math_node(nt, 'MULTIPLY', detail.outputs['Fac'], 0.5), h.node.inputs[2])
    h2 = math_node(nt, 'MULTIPLY_ADD', pfac, 0.6)
    nt.links.new(h, h2.node.inputs[2])
    h = h2
    nt.links.new(bump(nt, h, 0.45), bsdf.inputs['Normal'])
    return mat


def mat_tuft():
    """Grass tufts: dry-to-green per instance (Object Info random), darker towards the root."""
    mat, nt, bsdf = new_mat('MAT-Slice_Grass')
    bsdf.inputs['Roughness'].default_value = 0.85
    info = nt.nodes.new('ShaderNodeObjectInfo')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (*V(PAL['reed_green']) * 0.8, 1)
    ramp.color_ramp.elements[1].color = (*V(PAL['cane']) * 0.9, 1)
    mid = ramp.color_ramp.elements.new(0.5)
    mid.color = (*V(PAL['lomas']) * 0.85, 1)
    nt.links.new(info.outputs['Random'], ramp.inputs['Fac'])
    coord = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(coord, sep.inputs['Vector'])
    root = map_range(nt, sep.outputs['Z'], 0.0, 0.35, 0.5, 1.0)
    col = mix_rgb(nt, 1.0, ramp.outputs['Color'], mix_rgb(nt, 1.0, (1, 1, 1), root, 'MULTIPLY'), 'MULTIPLY')
    nt.links.new(col, bsdf.inputs['Base Color'])
    return mat


def mat_water(name, color, rough=0.06, wave_scale=2.5):
    mat, nt, bsdf = new_mat(name)
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Specular IOR Level'].default_value = 0.6
    coord = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    waves = noise_tex(nt, scaled(nt, coord, 1.0, 2.5, 1.0), wave_scale, 4.0)
    nt.links.new(bump(nt, waves.outputs['Fac'], 0.1), bsdf.inputs['Normal'])
    return mat


# ------------------------------------------------------------------------- terrain


def river_y(x):
    return -30.0 + 4.0 * math.sin(x * 0.035 + 0.6) + 1.5 * math.sin(x * 0.011 - 1.0)


def canal_y(x):
    return 3.2 + 0.7 * math.sin(x * 0.06 + 0.4)


def plot_at(x, y, margin=0.0):
    """Return (plot, u, v, e) for the plot whose interior is deepest at (x, y); u runs along the rows
    and e is the signed distance to the plot edge (positive inside). ``margin`` admits points just
    outside, so masks and bunds can be antialiased across the border."""
    best = None
    for plot in PLOTS:
        cx, cy, w, d, ang, _ = plot
        a = math.radians(ang)
        dx, dy = x - cx, y - cy
        u = dx * math.cos(a) + dy * math.sin(a)
        v = -dx * math.sin(a) + dy * math.cos(a)
        e = min(w / 2 - abs(u), d / 2 - abs(v))
        if e > -margin and (best is None or e > best[3]):
            best = (plot, u, v, e)
    return best


def in_wetland(x, y):
    return ((x + 44) / 13.0) ** 2 + ((y + 50) / 5.5) ** 2 < 1.0


def path_dist(x, y):
    best = 1e9
    for (ax, ay), (bx, by) in list(zip(PATH, PATH[1:])) + list(zip(PATH_HOUSES, PATH_HOUSES[1:])):
        ex, ey = bx - ax, by - ay
        t = max(0.0, min(1.0, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey)))
        best = min(best, math.hypot(x - ax - ex * t, y - ay - ey * t))
    return best


def height_raw(x, y):
    """Valley transect: river bed, floodplain, huarango rise, desert terrace, hills (extends far out)."""
    d = y - river_y(x)
    z = 0.0
    z -= 1.2 * (1.0 - smoothstep(3.5, 7.5, abs(d)))
    z -= 0.25 * (1.0 - smoothstep(0.5, 2.8, abs(d - 0.6 * math.sin(x * 0.2))))
    z += 0.35 * smoothstep(-14, 6, y)
    edge = y + 1.4 * n2(x * 0.045, 4.0)
    z += TERRACE_Z * smoothstep(15.0, 21.0, edge)
    z += 10.0 * smoothstep(62.0, 74.0, y) * (0.6 + 0.4 * n2(x * 0.05, y * 0.05, 1.0))
    z += 34.0 * smoothstep(78.0, 230.0, y) * (0.55 + 0.45 * n2(x * 0.012, y * 0.012, 5.0))
    z += 5.0 * smoothstep(-58.0, -72.0, y) * (0.7 + 0.3 * n2(x * 0.04, 2.0, y * 0.04))
    z += 24.0 * smoothstep(-80.0, -220.0, y) * (0.55 + 0.45 * n2(x * 0.014, y * 0.014, 9.0))
    z += 0.25 * n2(x * 0.12, y * 0.12, 0.5)
    if y > 21:
        z += 0.35 * n2(x * 0.08, y * 0.08, 3.0)
    return z


_CACHE = {}


def base_levels():
    if not _CACHE:
        _CACHE['pyr'] = height_raw(*PYR)
        _CACHE['plaza'] = height_raw(*PLAZA)
    return _CACHE['pyr'], _CACHE['plaza']


def height(x, y):
    z = height_raw(x, y)
    if abs(x) > SIZE_X or abs(y) > SIZE_Y:
        return z
    pyr_z, plaza_z = base_levels()
    dx = max(0.0, abs(x - PYR[0]) - PYR_HALF[0])
    dy = max(0.0, abs(y - PYR[1]) - PYR_HALF[1])
    f = 1.0 - smoothstep(0.0, 5.0, math.hypot(dx, dy))
    z = z + (pyr_z - z) * f
    r = math.hypot(x - PLAZA[0], y - PLAZA[1])
    z = z + (plaza_z - z) * (1.0 - smoothstep(5.5, 8.0, r))
    if r < PLAZA_R + 0.3:
        z = plaza_z - 1.05
    if CANAL_X[0] < x < CANAL_X[1]:
        c = abs(y - canal_y(x))
        z -= 0.32 * (1.0 - smoothstep(0.35, 0.95, c))
    hit = plot_at(x, y, 0.8)
    if hit:
        e = hit[3]
        z += -0.06 * smoothstep(-0.3, 0.3, e) + 0.17 * (1.0 - smoothstep(0.0, 0.7, abs(e - 0.1)))
    return z


def zone_color(x, y, z):
    ry = river_y(x)
    d = abs(y - ry)
    c = V(PAL['terrace'])
    floodplain = V(PAL['wet_sand']).lerp(V(PAL['huarango']), 0.38)
    c = c.lerp(floodplain, 1 - smoothstep(13, 19, y + 1.4 * n2(x * 0.045, 4.0)))
    c = c.lerp(V(PAL['riparian']).lerp(V(PAL['wet_sand']), 0.35), 1 - smoothstep(6, 13, d))
    c = c.lerp(V(PAL['gravel']) * 1.06, 1 - smoothstep(3.5, 7.0, d))
    c = c.lerp(V(PAL['wet_sand']) * 0.9, (1 - smoothstep(0.0, 2.6, d)) * 0.8)
    hit = plot_at(x, y, 0.6)
    if hit:
        kind = hit[0][5]
        tint = (0.75 if kind != 'fallow' else 0.35) * smoothstep(-0.3, 0.3, hit[3])
        soil = V(PAL['field_soil']) * (0.92 + 0.16 * ((PLOTS.index(hit[0]) * 3 % 7) / 6.0))
        c = c.lerp(soil, tint)
    if in_wetland(x, y):
        c = c.lerp(V(PAL['wet_sand']) * 0.65, 0.85)
    c = c.lerp(V(PAL['gravel']).lerp(V(PAL['terrace']), 0.5), (1 - smoothstep(0.6, 1.8, path_dist(x, y))) * 0.75)
    c = c.lerp(V(PAL['rock']), smoothstep(60, 70, y) * 0.8)
    c = c.lerp(V(PAL['rock']) * 0.92, smoothstep(90, 200, y) * 0.6)
    c = c.lerp(V(PAL['rock']).lerp(V(PAL['terrace']), 0.4), smoothstep(-56, -70, y) * 0.8)
    edge = y + 1.4 * n2(x * 0.045, 4.0)
    slope_rock = smoothstep(15.5, 18.0, edge) * (1 - smoothstep(19.5, 21.5, edge))
    c = c.lerp(V(PAL['rock']).lerp(V(PAL['terrace']), 0.5), slope_rock * 0.6)
    return c


def terrain_masks(x, y):
    d = abs(y - river_y(x))
    hit = plot_at(x, y, 0.6)
    field, rowc = 0.0, 0.0
    if hit:
        field = 0.0 if hit[0][5] == 'fallow' else smoothstep(0.1, 0.6, hit[3])
        rowc = hit[2]
    wet = (1 - smoothstep(0.5, 3.0, d)) * 0.9
    if in_wetland(x, y):
        wet = 1.0
    if CANAL_X[0] < x < CANAL_X[1]:
        wet = max(wet, (1 - smoothstep(0.4, 1.6, abs(y - canal_y(x)))) * 0.8)
    gravel = (1 - smoothstep(4.0, 7.5, d)) * 0.9 + smoothstep(21, 24, y) * 0.55
    return field, wet, min(1.0, gravel), rowc


def grass_weight(x, y):
    """Lush on the floodplain and riparian band, sparse on the terrace, none on the river bed,
    cultivated plots, wetland water, paths, plaza and pyramid; tufts on bunds and fallow plots."""
    d = abs(y - river_y(x))
    if d < 4.5 or in_wetland(x, y) or path_dist(x, y) < 1.2:
        return 0.0
    hit = plot_at(x, y, 0.45)
    if hit:
        if hit[0][5] == 'fallow' and hit[3] > 0:
            return 0.45
        return 0.55 if hit[3] < 0.45 else 0.0
    w = 0.95 * (1 - smoothstep(11, 14.5, y + 1.4 * n2(x * 0.045, 4.0)))
    w += 0.02 * smoothstep(21, 24, y) * (1 - smoothstep(58, 64, y))
    w *= (0.55 + 0.45 * n2(x * 0.15, y * 0.15, 7.0)) * edge_fade(x, y)
    if -6 < x < 34 and 20 < y < 62:
        w *= 0.15
    if -28 < x < 0 and 24 < y < 44:
        w = 0.0
    return max(0.0, min(1.0, w))


def edge_fade(x, y):
    """1 inside the slice, fading to 0 over its last 12 units (hides density steps at the seam)."""
    return (1 - smoothstep(SIZE_X / 2 - 13, SIZE_X / 2 - 1, abs(x))) * (1 - smoothstep(SIZE_Y / 2 - 13, SIZE_Y / 2 - 1, abs(y)))


def axis_samples(segments):
    """Concatenate evenly spaced samples for (start, end, step) segments; ends are shared."""
    out = []
    for start, end, step in segments:
        n = int(round((end - start) / step))
        out.extend(start + (end - start) * k / n for k in range(n))
    out.append(segments[-1][1])
    return out


def grid_mesh(name, xs, ys):
    """Height-field grid over arbitrary (non-uniform) sample axes, so one continuous mesh can be fine
    inside the slice and coarse towards the horizon without any seam."""
    mesh = bpy.data.meshes.new(name)
    nx, ny = len(xs) - 1, len(ys) - 1
    verts = [(x, y, height(x, y)) for y in ys for x in xs]
    faces = []
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    zone = mesh.color_attributes.new('zone', 'FLOAT_COLOR', 'POINT')
    mask = mesh.color_attributes.new('mask', 'FLOAT_COLOR', 'POINT')
    rowc = mesh.attributes.new('rowc', 'FLOAT', 'POINT')
    for idx, v in enumerate(mesh.vertices):
        x, y = v.co.x, v.co.y
        c = zone_color(x, y, v.co.z)
        zone.data[idx].color = (c.x, c.y, c.z, 1.0)
        field, wet, gravel, rc = terrain_masks(x, y)
        mask.data[idx].color = (field, wet, gravel, 1.0)
        rowc.data[idx].value = rc
    for poly in mesh.polygons:
        poly.use_smooth = True
    return mesh


def build_terrain(col, terrain_mat):
    """One continuous terrain: 0.5-unit cells inside the slice, 2.5 around it, 8 out to the hills, so
    the valley continues past the slice and no diorama edge shows from the wide view."""
    hx, hy = SIZE_X / 2, SIZE_Y / 2
    xs = axis_samples([(-FAR_X, -MID_X, FAR_STEP), (-MID_X, -hx, MID_STEP), (-hx, hx, SIZE_X / RES_X),
                       (hx, MID_X, MID_STEP), (MID_X, FAR_X, FAR_STEP)])
    ys = axis_samples([(FAR_Y0, MID_Y0, FAR_STEP), (MID_Y0, -hy, MID_STEP), (-hy, hy, SIZE_Y / RES_Y),
                       (hy, MID_Y1, MID_STEP), (MID_Y1, FAR_Y1, FAR_STEP)])
    mesh = grid_mesh('GEO-Slice_Terrain', xs, ys)
    obj = bpy.data.objects.new('GEO-Slice_Terrain', mesh)
    mesh.materials.append(terrain_mat)
    return link(obj, col)


def kit_tuft(mats, seed):
    """Grass tuft: a dozen thin arching blades."""
    rng = random.Random(seed)
    kit = new_kit()
    for k in range(14):
        a = rng.random() * math.tau
        r = rng.random() * 0.18
        h = rng.uniform(0.22, 0.5)
        kblade(kit, (math.cos(a) * r, math.sin(a) * r, -0.02), h, (math.cos(a) * h * 0.45, math.sin(a) * h * 0.45),
                  0.018, 0, 1.0)
    return kfinish(kit, f'KIT-GrassTuft_{seed}', [mats['grass']])


def scatter_grass(col, tufts, count, seed):
    """Tufts weighted by grass_weight: lush floodplain and riparian band, bunds, fallow plots."""
    rng = random.Random(seed)
    placed = tries = 0
    hx, hy = SIZE_X / 2 - 1, SIZE_Y / 2 - 1
    while placed < count and tries < count * 40:
        tries += 1
        x, y = rng.uniform(-hx, hx), rng.uniform(-hy, hy)
        if rng.random() > grass_weight(x, y):
            continue
        obj = bpy.data.objects.new('Grass', tufts[rng.randrange(len(tufts))])
        obj.location = (x, y, height(x, y))
        obj.rotation_euler = (0, 0, rng.random() * math.tau)
        s = rng.uniform(0.7, 1.4)
        obj.scale = (s, s, s)
        link(obj, col)
        placed += 1
    return placed


def water_strip(col, mat, x0, x1, step=2.0):
    """Narrow silty channel inside the mostly dry bed (seasonal river; documented)."""
    bm = bmesh.new()
    xs = [x0 + i * step for i in range(int((x1 - x0) / step) + 1)]
    left, right = [], []
    for x in xs:
        y = river_y(x) + 0.6 * math.sin(x * 0.2)
        w = max(0.04, 1.3 + 1.7 * n2(x * 0.045, 0.0, 2.0))
        z = height_raw(x, y) + 0.12
        left.append(bm.verts.new((x, y - w, z)))
        right.append(bm.verts.new((x, y + w, z)))
    for k in range(len(xs) - 1):
        bm.faces.new((left[k], left[k + 1], right[k + 1], right[k]))
    mesh = bpy.data.meshes.new('GEO-Slice_River')
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new('GEO-Slice_River', mesh)
    obj.data.materials.append(mat)
    link(obj, col)


def wetland_pool(col, mat):
    bm = bmesh.new()
    z = height(-44, -50) + 0.14
    centre = bm.verts.new((-44, -50, z))
    ring = []
    for k in range(48):
        a = k / 48 * math.tau
        r = 1.0 + 0.12 * n2(math.cos(a) * 2, math.sin(a) * 2, 3.0)
        ring.append(bm.verts.new((-44 + math.cos(a) * 12.2 * r, -50 + math.sin(a) * 5.0 * r, z)))
    for k in range(48):
        bm.faces.new((centre, ring[k], ring[(k + 1) % 48]))
    mesh = bpy.data.meshes.new('GEO-Slice_Wetland')
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new('GEO-Slice_Wetland', mesh)
    obj.data.materials.append(mat)
    link(obj, col)


def canal(col, mat):
    """Irrigation canal above the fields (canals documented; course assumed)."""
    bm = bmesh.new()
    a, b = [], []
    n = int((CANAL_X[1] - CANAL_X[0]) / 1.0)
    for k in range(n + 1):
        x = CANAL_X[0] + k * 1.0
        y = canal_y(x)
        z = height_raw(x, y) - 0.18
        w = 0.42 + 0.06 * n2(x * 0.3, 1.0)
        a.append(bm.verts.new((x, y - w, z)))
        b.append(bm.verts.new((x, y + w, z)))
    for k in range(n):
        bm.faces.new((a[k], a[k + 1], b[k + 1], b[k]))
    mesh = bpy.data.meshes.new('GEO-Slice_Canal')
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new('GEO-Slice_Canal', mesh)
    obj.data.materials.append(mat)
    link(obj, col)


# ---------------------------------------------------------------------- mesh kits


def new_kit():
    """bmesh builder state (a dict, not a class, so the module runs under the MCP safe mode): UVs, a
    per-card colour variation layer and the blob table used for crown-aware custom normals."""
    bm = bmesh.new()
    return {'bm': bm, 'uv': bm.loops.layers.uv.new('UVMap'), 'var': bm.loops.layers.float_color.new('leafvar'),
            'blob_layer': bm.faces.layers.int.new('blob'), 'blobs': []}


def kfinish(kit, name, mats, smooth=True, crown=None, smooth_mats=()):
    mesh = bpy.data.meshes.new(name)
    kit['bm'].to_mesh(mesh)
    kit['bm'].free()
    for poly in mesh.polygons:
        poly.use_smooth = smooth or poly.material_index in smooth_mats
    for m in mats:
        mesh.materials.append(m)
    if kit['blobs']:
        blob_attr = mesh.attributes['blob'].data
        normals = []
        for poly in mesh.polygons:
            idx = blob_attr[poly.index].value
            for li in poly.loop_indices:
                if idx <= 0:
                    normals.append(Vector((0.0, 0.0, 0.0)))
                    continue
                c, r = kit['blobs'][idx - 1]
                p = mesh.vertices[mesh.loops[li].vertex_index].co
                nb = Vector(((p.x - c.x) / r.x, (p.y - c.y) / r.y, (p.z - c.z) / r.z)).normalized()
                nc = (p - crown).normalized() if crown is not None else nb
                normals.append((nb * 0.55 + nc * 0.45 + Vector((0, 0, 0.35))).normalized())
        mesh.normals_split_custom_set(normals)
    return mesh


def kblob(kit, center, radii, segments=8, rings=6, jitter=0.12, seed=0, mat_index=0):
    rng = random.Random(seed)
    res = bmesh.ops.create_uvsphere(kit['bm'], u_segments=segments, v_segments=rings, radius=1.0)
    for v in res['verts']:
        k = 1.0 + jitter * (rng.random() * 2 - 1)
        v.co = Vector((v.co.x * radii[0] * k, v.co.y * radii[1] * k, v.co.z * radii[2] * k)) + Vector(center)
    for f in {f for v in res['verts'] for f in v.link_faces}:
        f.material_index = mat_index
    return res['verts']


def ktube(kit, points, r0, r1, sides=6, mat_index=0, cap=False):
    rings = []
    for k, p in enumerate(points):
        t = k / max(1, len(points) - 1)
        r = r0 + (r1 - r0) * t
        p = Vector(p)
        if k < len(points) - 1:
            axis = (Vector(points[k + 1]) - p).normalized()
        else:
            axis = (p - Vector(points[k - 1])).normalized()
        side = axis.cross(Vector((0, 0, 1)) if abs(axis.z) < 0.95 else Vector((1, 0, 0))).normalized()
        up = side.cross(axis)
        ring = [kit['bm'].verts.new(p + (side * math.cos(a) + up * math.sin(a)) * r)
                for a in (2 * math.pi * s / sides for s in range(sides))]
        rings.append(ring)
    for k in range(len(rings) - 1):
        for s in range(sides):
            f = kit['bm'].faces.new((rings[k][s], rings[k][(s + 1) % sides], rings[k + 1][(s + 1) % sides],
                                   rings[k + 1][s]))
            f.material_index = mat_index
    if cap:
        f = kit['bm'].faces.new(list(reversed(rings[-1])))
        f.material_index = mat_index


def kblade(kit, base, h, lean, width, mat_index=0, bend=0.5):
    x, y, z = base
    lx, ly = lean
    pts = []
    for k in range(4):
        t = k / 3
        off = t ** (1.0 + bend)
        pts.append((x + lx * off, y + ly * off, z + h * t - h * 0.15 * off * bend, width * (1 - t * 0.85)))
    verts = []
    for px, py, pz, w in pts:
        perp = Vector((-ly, lx, 0.0))
        perp = perp.normalized() if perp.length > 1e-4 else Vector((1, 0, 0))
        verts.append((kit['bm'].verts.new(Vector((px, py, pz)) - perp * w),
                      kit['bm'].verts.new(Vector((px, py, pz)) + perp * w)))
    for k in range(3):
        f = kit['bm'].faces.new((verts[k][0], verts[k][1], verts[k + 1][1], verts[k + 1][0]))
        f.material_index = mat_index


def kcard(kit, center, normal, size, rng, mat_index, aspect=1.0, var=None, blob=0, spin=None):
    n = Vector(normal).normalized()
    t = n.cross(Vector((0, 0, 1)) if abs(n.z) < 0.95 else Vector((1, 0, 0))).normalized()
    b = n.cross(t)
    ang = rng.random() * math.tau if spin is None else spin
    u = t * math.cos(ang) + b * math.sin(ang)
    w = n.cross(u)
    hu, hw = size * 0.5 * aspect, size * 0.5
    c = Vector(center)
    corners = [c - u * hu - w * hw, c + u * hu - w * hw, c + u * hu + w * hw, c - u * hu + w * hw]
    f = kit['bm'].faces.new([kit['bm'].verts.new(p) for p in corners])
    f.material_index = mat_index
    f[kit['blob_layer']] = blob
    value = rng.random() if var is None else var
    for loop, uv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        loop[kit['uv']].uv = uv
        loop[kit['var']] = (value, value, value, 1.0)
    return f


def kcrown(kit, blobs, count, size, rng, mat_index, aspect=1.0, droop=0.0, surface=0.35):
    """Leaf cards spread through ellipsoid blobs, biased to their surface, facing outwards."""
    start = len(kit['blobs'])
    for c, r in blobs:
        kit['blobs'].append((Vector(c), Vector(r)))
    for k in range(count):
        bi = rng.randrange(len(blobs))
        c, r = kit['blobs'][start + bi]
        while True:
            d = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1)))
            if 0.05 < d.length <= 1.0:
                break
        dist = rng.random() ** surface
        d = d.normalized() * dist
        p = Vector((c.x + d.x * r.x, c.y + d.y * r.y, c.z + d.z * r.z))
        out = Vector((d.x / r.x, d.y / r.y, d.z / r.z)).normalized()
        rnd = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1)))
        n = (out * 0.6 + rnd * 0.6 + Vector((0, 0, 0.3))).normalized()
        if droop > 0:
            n = n.lerp(Vector((out.x, out.y, 0.0)).normalized() if out.xy.length > 0.01 else n, droop)
        kcard(kit, p, n, size * rng.uniform(0.75, 1.25), rng, mat_index, aspect, blob=start + bi + 1)


def kit_huarango(mats, seed):
    """Huarango (Prosopis): twisted dark trunk that forks low, wide flat grey-green crown of fine
    leaflets. ~3.5 people tall (art-direction.md §3)."""
    rng = random.Random(seed)
    kit = new_kit()
    lean = Vector((rng.uniform(-0.35, 0.35), rng.uniform(-0.35, 0.35), 0))
    trunk = [Vector((0, 0, -0.2))]
    for k in range(1, 5):
        trunk.append(Vector((math.sin(k * 1.7 + seed) * 0.18, math.cos(k * 1.3 + seed) * 0.18, k * 0.62)) + lean * (k / 4))
    ktube(kit, trunk, 0.36, 0.2, 7, 0)
    fork = trunk[-1]
    tips = []
    for k in range(4 + seed % 2):
        ang = k / (4 + seed % 2) * math.tau + rng.uniform(-0.4, 0.4)
        reach = rng.uniform(1.8, 3.0)
        mid = fork + Vector((math.cos(ang) * reach * 0.45, math.sin(ang) * reach * 0.45, rng.uniform(1.0, 1.5)))
        tip = fork + Vector((math.cos(ang) * reach, math.sin(ang) * reach, rng.uniform(2.3, 3.1)))
        ktube(kit, [fork, mid, tip], 0.12, 0.035, 6, 0)
        side = Vector((math.cos(ang + 1.2), math.sin(ang + 1.2), 0.3)) * reach * 0.35
        ktube(kit, [mid, mid + side], 0.05, 0.02, 4, 0)
        tips.append(tip)
    blobs = []
    for tip in tips:
        blobs.append((tuple(tip + Vector((0, 0, 0.2))), (2.0 + rng.random() * 0.5, 1.9 + rng.random() * 0.5, 1.05)))
        blobs.append((tuple(tip * 0.55 + fork * 0.45 + Vector((0, 0, 1.5))), (1.6, 1.6, 0.85)))
    crown_c = sum((Vector(b[0]) for b in blobs), Vector()) / len(blobs)
    kcrown(kit, blobs, 2400, 0.8, rng, 1, surface=0.35)
    return kfinish(kit, f'KIT-Huarango_{seed}', [mats['bark'], mats['huarango_leaf']], crown=crown_c - Vector((0, 0, 1.2)))


def kit_sauce(mats, seed):
    """Riverbank willow (sauce): tall straight trunk, narrow crown with hanging leaf sprays."""
    rng = random.Random(seed)
    kit = new_kit()
    ktube(kit, [(0, 0, -0.2), (0.1, 0, 3.0), (0.25, 0.1, 6.8)], 0.3, 0.12, 7, 0)
    blobs = []
    for k in range(9):
        ang = rng.random() * math.tau
        r = rng.random() * 1.1
        blobs.append(((math.cos(ang) * r, math.sin(ang) * r, 3.6 + rng.random() * 3.6), (1.0, 1.0, 1.5)))
        ktube(kit, [(0.15, 0.05, 3.2 + k * 0.35), (math.cos(ang) * r * 1.3, math.sin(ang) * r * 1.3, 4.0 + k * 0.4)],
                 0.07, 0.03, 4, 0)
    kcrown(kit, blobs, 1900, 0.85, rng, 1, aspect=0.45, droop=0.7, surface=0.4)
    return kfinish(kit, f'KIT-Sauce_{seed}', [mats['bark'], mats['willow_leaf']], crown=Vector((0, 0, 4.5)))


def kit_cana(mats, name, seed, stalks, h, spread, plume):
    """Caña brava (tall, plumed) or carrizo (lower) clump: stalks with arching leaf blades."""
    rng = random.Random(seed)
    kit = new_kit()
    for k in range(stalks):
        a = rng.random() * math.tau
        r = rng.random() ** 0.6 * spread
        x, y = math.cos(a) * r, math.sin(a) * r
        hh = h * rng.uniform(0.7, 1.1)
        tilt = Vector((x * 0.12 + rng.uniform(-0.15, 0.15), y * 0.12 + rng.uniform(-0.15, 0.15), 0))
        top = Vector((x, y, hh)) + tilt * hh
        ktube(kit, [(x, y, -0.1), tuple(top)], 0.035, 0.015, 4, 0)
        for j in range(5):
            t = 0.25 + j * 0.15
            p = Vector((x, y, 0)).lerp(top, t)
            ang = rng.random() * math.tau
            kblade(kit, tuple(p), hh * 0.28, (math.cos(ang) * hh * 0.3, math.sin(ang) * hh * 0.3), 0.045, 0, 1.2)
        if plume and rng.random() < 0.75:
            for q in range(2):
                n = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0)).normalized()
                kcard(kit, tuple(top + Vector((0, 0, 0.35))), n, 0.8, rng, 1, aspect=0.35,
                         spin=rng.uniform(-0.3, 0.3))
    return kfinish(kit, f'KIT-{name}_{seed}', [mats['reed'], mats['plume']])


def kit_totora(mats, seed):
    """Totora clump standing in shallow water: round stems with dry brown tips."""
    rng = random.Random(seed)
    kit = new_kit()
    for k in range(34):
        a = rng.random() * math.tau
        r = rng.random() ** 0.5 * 1.2
        x, y = math.cos(a) * r, math.sin(a) * r
        hh = rng.uniform(1.5, 2.5)
        lean = (rng.uniform(-0.25, 0.25), rng.uniform(-0.25, 0.25))
        ktube(kit, [(x, y, -0.3), (x + lean[0] * 0.5, y + lean[1] * 0.5, hh * 0.6),
                  (x + lean[0], y + lean[1], hh)], 0.025, 0.006, 3, 0)
        if rng.random() < 0.4:
            kblob(kit, (x + lean[0] * 0.9, y + lean[1] * 0.9, hh * 0.92), (0.03, 0.03, 0.09), 4, 3, 0.0, k, 1)
    return kfinish(kit, f'KIT-Totora_{seed}', [mats['reed'], mats['reed_dry']])


def kit_crop(mats, kind, seed):
    """Crops (documented: cotton, squash, beans). Cotton ~1.1 units shrub with bolls, squash a sprawling
    vine of broad leaves with a fruit, beans a low leafy bush."""
    rng = random.Random(seed)
    kit = new_kit()
    if kind == 'cotton':
        for k in range(4):
            a = rng.random() * math.tau
            ktube(kit, [(0, 0, 0), (math.cos(a) * 0.2, math.sin(a) * 0.2, rng.uniform(0.8, 1.15))], 0.025, 0.01, 4, 0)
        kcrown(kit, [((0, 0, 0.7), (0.42, 0.42, 0.4))], 90, 0.3, rng, 1, surface=0.5)
        for k in range(3):
            kblob(kit, (rng.uniform(-0.3, 0.3), rng.uniform(-0.3, 0.3), rng.uniform(0.75, 1.05)), (0.045, 0.045, 0.04),
                     5, 4, 0.2, seed + k, 2)
        return kfinish(kit, f'KIT-Crop_cotton_{seed}', [mats['bark'], mats['crop_leaf'], mats['cotton']])
    if kind == 'squash':
        for k in range(24):
            a = rng.random() * math.tau
            r = rng.uniform(0.1, 1.0)
            p = (math.cos(a) * r, math.sin(a) * r, 0.12 + rng.random() * 0.15)
            n = Vector((rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4), 1.0))
            kcard(kit, p, n, rng.uniform(0.45, 0.6), rng, 1)
        for k in range(4):
            a = rng.random() * math.tau
            ktube(kit, [(0, 0, 0.05), (math.cos(a) * 1.0, math.sin(a) * 1.0, 0.04)], 0.02, 0.015, 3, 0)
        kblob(kit, (rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4), 0.12), (0.16, 0.13, 0.12), 7, 5, 0.08, seed, 2)
        return kfinish(kit, f'KIT-Crop_squash_{seed}', [mats['crop_stem'], mats['squash_leaf'], mats['squash']])
    kcrown(kit, [((0, 0, 0.32), (0.38, 0.38, 0.26))], 70, 0.22, rng, 1, surface=0.5)
    ktube(kit, [(0, 0, 0), (0, 0, 0.45)], 0.02, 0.01, 3, 0)
    return kfinish(kit, f'KIT-Crop_beans_{seed}', [mats['crop_stem'], mats['crop_leaf']])


def kit_person(mats, pose):
    """Stylized villager at 1.86 units: cotton tunic (cotton documented; cut not documented, kept
    simple), bare legs and arms. Stand-in for the game's rigged worker. Poses: carry (shicra bag on
    the back), stick (digging stick; tool assumed), stand."""
    kit = new_kit()
    for side in (-1, 1):
        ktube(kit, [(side * 0.09, 0, 0.0), (side * 0.08, 0.0, 0.5), (side * 0.08, 0, 0.88)], 0.055, 0.075, 6, 1)
    ktube(kit, [(0, 0, 0.62), (0, 0, 0.95), (0, 0, 1.42)], 0.25, 0.19, 8, 0, cap=True)
    arm_end = {'carry': (0.05, 0.12, 1.62), 'stick': (0.12, -0.28, 1.05), 'stand': (0.06, 0.02, 0.78)}[pose]
    for side in (-1, 1):
        hand = (side * (0.24 + arm_end[0]), arm_end[1], arm_end[2])
        ktube(kit, [(side * 0.22, 0, 1.38), (side * 0.27, arm_end[1] * 0.4, 1.1), hand], 0.05, 0.04, 5, 1)
    ktube(kit, [(0, 0, 1.4), (0, 0, 1.5)], 0.06, 0.06, 6, 1)
    kblob(kit, (0, 0, 1.62), (0.11, 0.12, 0.14), 10, 7, 0.0, 1, 1)
    kblob(kit, (0, 0.02, 1.68), (0.12, 0.13, 0.1), 10, 6, 0.0, 2, 2)
    if pose == 'carry':
        kblob(kit, (0, 0.24, 1.25), (0.26, 0.2, 0.3), 8, 6, 0.15, 3, 3)
    elif pose == 'stick':
        ktube(kit, [(0.36, -0.32, 0.0), (0.36, -0.28, 1.3)], 0.022, 0.02, 4, 4)
    return kfinish(kit, f'KIT-Person_{pose}', [mats['cotton'], mats['skin'], mats['hair'], mats['shicra'], mats['bark']])


def kit_deer(mats):
    """Deer (venado; documented for the Supe valley): slender legs, raised neck, ears, white tail."""
    kit = new_kit()
    kblob(kit, (0, 0, 1.0), (0.62, 0.24, 0.27), 10, 7, 0.03, 1, 0)
    ktube(kit, [(0.5, 0, 1.08), (0.68, 0, 1.38), (0.76, 0, 1.55)], 0.11, 0.07, 6, 0)
    kblob(kit, (0.86, 0, 1.6), (0.2, 0.085, 0.1), 8, 6, 0.0, 2, 0)
    for side in (-1, 1):
        kblob(kit, (0.76, side * 0.09, 1.72), (0.03, 0.06, 0.09), 5, 4, 0.0, 3, 0)
    kblob(kit, (-0.62, 0, 1.12), (0.08, 0.06, 0.12), 5, 4, 0.0, 4, 1)
    for lx in (-0.42, 0.42):
        for ly in (-0.12, 0.12):
            ktube(kit, [(lx, ly, 0.0), (lx + 0.04, ly, 0.45), (lx, ly, 0.9)], 0.028, 0.05, 5, 0)
    return kfinish(kit, 'KIT-Deer', [mats['deer'], mats['cotton']])


def kit_bird(mats):
    kit = new_kit()
    v = [kit['bm'].verts.new(p) for p in ((-0.45, 0.15, 0.08), (0, 0, 0), (0.45, 0.15, 0.08), (0, -0.2, 0),
                                        (0, 0.18, 0.02))]
    for tri in ((v[0], v[1], v[4]), (v[1], v[2], v[4]), (v[1], v[3], v[4])):
        kit['bm'].faces.new(tri)
    return kfinish(kit, 'KIT-Bird', [mats['bird']], smooth=False)


def kit_pebbles(mats, seed):
    rng = random.Random(seed)
    kit = new_kit()
    for k in range(5):
        kblob(kit, (rng.uniform(-0.8, 0.8), rng.uniform(-0.8, 0.8), 0.02),
                 (rng.uniform(0.12, 0.3), rng.uniform(0.1, 0.25), rng.uniform(0.06, 0.14)), 6, 4, 0.3, seed + k, 0)
    return kfinish(kit, f'KIT-Pebbles_{seed}', [mats['stone']])


def kit_shicra_pile(mats, seed):
    """Pile of shicra bags waiting to be laid (documented fill; pile placement assumed)."""
    rng = random.Random(seed)
    kit = new_kit()
    for k in range(18):
        a = rng.random() * math.tau
        r = rng.random() * 1.2
        z = 0.15 + (1.2 - r) * 0.42 + rng.random() * 0.15
        kblob(kit, (math.cos(a) * r, math.sin(a) * r, z), (0.34, 0.27, 0.22), 8, 6, 0.18, seed + k, 0)
    return kfinish(kit, f'KIT-Shicras_{seed}', [mats['shicra']])


# ------------------------------------------------------------------- architecture


def add_box(bm, center, size, mat_index=0):
    res = bmesh.ops.create_cube(bm, size=1.0)
    for v in res['verts']:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])) + Vector(center)
    for f in {f for v in res['verts'] for f in v.link_faces}:
        f.material_index = mat_index
    return res['verts']


def add_rough_box(bm, center, size, mat_index, cuts, amp, seed, batter=0.0):
    """Hand-built platform: a subdivided box whose surface wobbles (noise) and whose walls lean
    inwards (batter), so edges read as plastered by hand, not CAD-perfect."""
    tmp = bmesh.new()
    bmesh.ops.create_cube(tmp, size=1.0)
    bmesh.ops.subdivide_edges(tmp, edges=list(tmp.edges), cuts=cuts, use_grid_fill=True)
    off = Vector((seed * 3.1, seed * 1.7, seed * 0.9))
    for v in tmp.verts:
        x, y, z = v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]
        k = 1.0 - batter * (z / size[2] + 0.5)
        x, y = x * k, y * k
        p = Vector((x, y, z))
        w = Vector((noise.noise(p * 0.22 + off), noise.noise(p * 0.22 + off + Vector((7, 0, 0))),
                    noise.noise(p * 0.22 + off + Vector((0, 7, 0))) * 0.4)) * amp
        v.co = p + w + Vector(center)
    vmap = {v: bm.verts.new(v.co) for v in tmp.verts}
    for f in tmp.faces:
        nf = bm.faces.new([vmap[v] for v in f.verts])
        nf.material_index = mat_index
        nf.smooth = False
    tmp.free()


def build_pyramid(col, mats, shicra_meshes):
    """Pyramid Mayor: first phase standing, the next level being raised.

    Documented: stepped platforms, plastered finish, stone retaining walls, shicra bag fill, central
    stair facing a sunken circular plaza, a sacred-fire altar on the Pyramid Mayor. Inferred: white
    plaster for the early period. Assumed: dimensions of this phase (below the final 7–9 P target on
    purpose), the half-built level layout and the bag piles.
    """
    pyr_z, plaza_z = base_levels()
    ox, oy = PYR
    bm = bmesh.new()
    levels = [(34.0, 24.0, 2.8, -0.6), (28.0, 19.0, 2.8, 2.6)]
    top = 0.0
    for k, (w, d, h, z0) in enumerate(levels):
        hh = h + (0.0 if z0 >= 0 else -z0)
        add_rough_box(bm, (0, 0, z0 + hh / 2), (w, d, hh), 0, 16, 0.16, k + 1, batter=0.03)
        top = z0 + hh
    # Third level: west half finished and plastered.
    add_rough_box(bm, (-5.0, 0.0, top + 1.4), (12.0, 14.0, 2.8), 0, 12, 0.13, 9, batter=0.035)
    finished_top = top + 2.8
    # Central stair (plastered steps) from the plaza side.
    steps = 22
    sh = finished_top / steps
    y_bottom, y_top = -16.0, -7.0
    run = (y_top - y_bottom) / steps
    for s in range(steps):
        add_box(bm, (0.0, y_bottom + run * (s + 0.5), (sh * (s + 1) - 0.6) / 2), (3.2, run, sh * (s + 1) + 0.6), 0)
    # Fire altar on the finished part (documented on the Pyramid Mayor; form assumed).
    add_box(bm, (-6.5, 2.0, finished_top + 0.25), (2.0, 2.0, 0.5), 0)
    add_box(bm, (-6.5, 2.0, finished_top + 0.45), (0.8, 0.8, 0.2), 3)
    mesh = bpy.data.meshes.new('GEO-Slice_PyramidMayor_Phase1')
    bm.to_mesh(mesh)
    bm.free()
    for key in ('plaster_early', 'stone_wall', 'shicra', 'altar'):
        mesh.materials.append(mats[key])
    obj = link(bpy.data.objects.new('GEO-Slice_PyramidMayor_Phase1', mesh), col)
    obj.location = (ox, oy, pyr_z)

    # East half of the third level: stone retaining wall going up course by course, shicra fill inside.
    rng = random.Random(77)
    bm = bmesh.new()
    x0, x1, y0, y1 = 1.0, 11.0, -7.0, 7.0
    perimeter = [((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1))]
    for (ax, ay), (bx, by) in perimeter:
        length = math.hypot(bx - ax, by - ay)
        n = int(length / 0.55)
        for course in range(4):
            for k in range(n):
                t = (k + 0.5 + (course % 2) * 0.5) / n
                if t > 1.0:
                    continue
                along = (ax + (bx - ax) * t, ay + (by - ay) * t)
                limit = 4 - int(3.5 * (along[0] - x0) / (x1 - x0) * (0.6 + 0.4 * rng.random()))
                if course >= limit:
                    continue
                horiz = abs(by - ay) < 1e-3
                sz = (0.5 if horiz else 0.42, 0.42 if horiz else 0.5, 0.34)
                sz = tuple(s * rng.uniform(0.85, 1.1) for s in sz)
                add_box(bm, (along[0] + rng.uniform(-0.03, 0.03), along[1] + rng.uniform(-0.03, 0.03),
                             top + 0.17 + course * 0.36), sz, 1)
    mesh = bpy.data.meshes.new('GEO-Slice_PyramidMayor_Works')
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mats['stone_wall'])
    works = link(bpy.data.objects.new('GEO-Slice_PyramidMayor_Works', mesh), col)
    works.location = (ox, oy, pyr_z)
    fill = new_kit()
    for k in range(150):
        x = rng.uniform(x0 + 0.5, x1 - 0.4)
        y = rng.uniform(y0 + 0.5, y1 - 0.5)
        level = 1.25 * (1.0 - (x - x0) / (x1 - x0)) + 0.25
        kblob(fill, (x, y, top + rng.uniform(0.0, level)), (0.34, 0.27, 0.22), 7, 5, 0.18, k, 0)
    fmesh = kfinish(fill, 'GEO-Slice_PyramidMayor_ShicraFill', [mats['shicra']])
    fobj = link(bpy.data.objects.new('GEO-Slice_PyramidMayor_ShicraFill', fmesh), col)
    fobj.location = (ox, oy, pyr_z)

    for k, (dx, dy) in enumerate(((3.5, -9.0), (8.0, -8.5), (12.5, -2.0), (12.5, 4.0))):
        pile = bpy.data.objects.new('Shicras', shicra_meshes[k % len(shicra_meshes)])
        pile.location = (ox + dx, oy + dy, pyr_z + top)
        link(pile, col)
    for k, (dx, dy) in enumerate(((19.5, -10.0), (-20.0, -6.0), (21.0, 4.0), (6.0, -15.5))):
        pile = bpy.data.objects.new('Shicras', shicra_meshes[k % len(shicra_meshes)])
        x, y = ox + dx, oy + dy
        pile.location = (x, y, height(x, y))
        link(pile, col)

    # Sunken circular plaza (documented): rim, two steps down, plastered floor.
    cx, cy = PLAZA
    bm = bmesh.new()
    segs = 64
    rings = [(5.0, 0.35), (PLAZA_R, 0.35), (PLAZA_R, -0.3), (PLAZA_R - 0.45, -0.3), (PLAZA_R - 0.45, -0.95),
             (0.0, -0.95)]
    loops = []
    for r, z in rings:
        if r == 0.0:
            loops.append([bm.verts.new((0, 0, z))])
            continue
        loops.append([bm.verts.new((math.cos(a) * r, math.sin(a) * r, z))
                      for a in (k / segs * math.tau for k in range(segs))])
    for i in range(len(loops) - 1):
        a, b = loops[i], loops[i + 1]
        for k in range(segs):
            if len(b) == 1:
                bm.faces.new((a[k], a[(k + 1) % segs], b[0]))
            else:
                bm.faces.new((a[k], a[(k + 1) % segs], b[(k + 1) % segs], b[k]))
    outer = [bm.verts.new((math.cos(a) * 5.0, math.sin(a) * 5.0, -0.4)) for a in (k / segs * math.tau for k in range(segs))]
    for k in range(segs):
        bm.faces.new((outer[k], outer[(k + 1) % segs], loops[0][(k + 1) % segs], loops[0][k]))
    # Stair gaps are not cut; two small stairs on the axis lead down (documented layout simplified).
    for side in (-1, 1):
        for s in range(3):
            add_box(bm, (0.0, side * (PLAZA_R - 0.25 - s * 0.3), 0.35 - (s + 1) * 0.42), (1.6, 0.32, 0.42), 0)
    mesh = bpy.data.meshes.new('GEO-Slice_CircularPlaza')
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mats['plaster_plaza'])
    plaza = link(bpy.data.objects.new('GEO-Slice_CircularPlaza', mesh), col)
    plaza.location = (cx, cy, plaza_z)
    return pyr_z + top, pyr_z + finished_top


def add_slab(bm, x0, x1, y0, y1, z, nx, ny, thick, sag, jitter, rng, mat_index):
    top, bot = [], []
    for j in range(ny + 1):
        row_t, row_b = [], []
        for i in range(nx + 1):
            u, v = i / nx, j / ny
            x = x0 + (x1 - x0) * u
            y = y0 + (y1 - y0) * v
            edge = i in (0, nx) or j in (0, ny)
            if edge:
                x += rng.uniform(-jitter, jitter)
                y += rng.uniform(-jitter, jitter)
            zz = z - sag * math.sin(math.pi * u) * math.sin(math.pi * v) + rng.uniform(-0.015, 0.015)
            row_t.append(bm.verts.new((x, y, zz)))
            row_b.append(bm.verts.new((x, y, zz - thick)))
        top.append(row_t)
        bot.append(row_b)
    for j in range(ny):
        for i in range(nx):
            bm.faces.new((top[j][i], top[j][i + 1], top[j + 1][i + 1], top[j + 1][i])).material_index = mat_index
            bm.faces.new((bot[j][i], bot[j + 1][i], bot[j + 1][i + 1], bot[j][i + 1])).material_index = mat_index
    for j in range(ny):
        for i in (0, nx):
            a, b = (top[j][i], top[j + 1][i]) if i == 0 else (top[j + 1][i], top[j][i])
            c, d = (bot[j + 1][i], bot[j][i]) if i == 0 else (bot[j][i], bot[j + 1][i])
            bm.faces.new((a, b, c, d)).material_index = mat_index
    for i in range(nx):
        for j in (0, ny):
            a, b = (top[j][i + 1], top[j][i]) if j == 0 else (top[j][i], top[j][i + 1])
            c, d = (bot[j][i], bot[j][i + 1]) if j == 0 else (bot[j][i + 1], bot[j][i])
            bm.faces.new((a, b, c, d)).material_index = mat_index


def build_quincha_house(col, mats, center, yaw, seed, paint_key):
    """Periphery dwelling. Documented: quincha walls (cane plastered with mud and painted), huarango
    posts, cooking hearths and refuse beside dwellings, mates (gourds). Assumed: plan size, the
    doorway, the light cane-mat roof over part of the room and its beams."""
    rng = random.Random(seed)
    kit = new_kit()
    bm = kit['bm']
    w, d, h, t = 4.6, 3.6, 2.5, 0.14
    add_box(bm, (0, 0, 0.0), (w + 0.7, d + 0.7, 0.3), 5)
    posts = [(-w / 2, -d / 2), (0, -d / 2), (w / 2, -d / 2), (w / 2, 0), (w / 2, d / 2), (0, d / 2), (-w / 2, d / 2),
             (-w / 2, 0)]
    door = (0.55, 1.45)
    add_box(bm, ((-w / 2 + door[0]) / 2, -d / 2, h / 2), (w / 2 + door[0] - 0.1, t, h), 0)
    add_box(bm, ((door[1] + w / 2) / 2, -d / 2, h / 2), (w / 2 - door[1] - 0.1, t, h), 0)
    add_box(bm, ((door[0] + door[1]) / 2, -d / 2, h - 0.25), (door[1] - door[0], t, 0.5), 0)
    add_box(bm, (0, d / 2, h / 2), (w - 0.1, t, h), 0)
    add_box(bm, (-w / 2, 0, h / 2), (t, d - 0.1, h), 0)
    add_box(bm, (w / 2, 0, h / 2), (t, d - 0.1, h), 0)
    for px, py in posts:
        lean = (rng.uniform(-0.05, 0.05), rng.uniform(-0.05, 0.05))
        ktube(kit, [(px, py, 0.0), (px + lean[0], py + lean[1], h * 0.55), (px - lean[0] * 0.5, py, h + 0.32)],
                 0.13, 0.1, 7, 1)
    for bx in (-1.6, -0.2, 1.2):
        ktube(kit, [(bx, -d / 2 - 0.35, h + 0.36), (bx + rng.uniform(-0.1, 0.1), d / 2 + 0.35, h + 0.36)], 0.06, 0.05, 5, 1)
    add_slab(bm, -w / 2 - 0.4, w / 2 * 0.1, -d / 2 - 0.45, d / 2 + 0.4, h + 0.5, 5, 4, 0.06, 0.08, 0.14, rng, 2)
    add_slab(bm, -w / 2 * 0.25, w / 2 * 0.6, -d / 2 - 0.3, d / 2 + 0.5, h + 0.56, 4, 4, 0.06, 0.06, 0.14, rng, 2)
    # Hearth: ring of stones and ash behind the house; refuse heap; gourds by the door.
    hx, hy = 0.6, d / 2 + 1.7
    kblob(kit, (hx, hy, 0.02), (0.55, 0.5, 0.05), 8, 4, 0.1, seed, 6)
    for k in range(7):
        a = k / 7 * math.tau
        kblob(kit, (hx + math.cos(a) * 0.62, hy + math.sin(a) * 0.55, 0.1), (0.15, 0.13, 0.11), 6, 4, 0.25, seed + k, 4)
    kblob(kit, (w / 2 + 1.5, d / 2 + 0.9, -0.08), (1.3, 1.1, 0.28), 12, 6, 0.25, seed + 50, 3)
    for k in range(3):
        kblob(kit, (-1.4 + k * 0.32, -d / 2 - 0.6, 0.14), (0.15, 0.15, 0.14), 8, 6, 0.05, seed + 70 + k, 7)
    for k in range(5):
        ktube(kit, [(-w / 2 - 0.25, -0.8 + k * 0.12, 0.0), (-w / 2 - 0.12, -0.75 + k * 0.12, 2.1)], 0.03, 0.025, 4, 8)
    mesh = kfinish(kit, f'GEO-Slice_Quincha_{seed}', [mats[paint_key], mats['bark'], mats['cane_mat'], mats['refuse'],
                                                    mats['stone'], mats['floor'], mats['ash'], mats['gourd'],
                                                    mats['reed_dry']], smooth=False, smooth_mats=(1, 3, 4, 6, 7, 8))
    obj = bpy.data.objects.new(f'GEO-Slice_Quincha_{seed}', mesh)
    obj.location = (center[0], center[1], height(center[0], center[1]) + 0.02)
    obj.rotation_euler = (0, 0, yaw)
    return link(obj, col)


def build_fields(col, crop_meshes):
    """Crop rows following each plot's orientation, with gaps, uneven growth and a little jitter."""
    rng = random.Random(7)
    count = 0
    for plot in PLOTS:
        cx, cy, w, d, ang, kind = plot
        if kind == 'fallow':
            continue
        a = math.radians(ang)
        cos_a, sin_a = math.cos(a), math.sin(a)
        spacing = {'cotton': 1.0, 'squash': 1.9, 'beans': 0.7}[kind]
        growth = rng.uniform(0.75, 1.1)
        rows = int((d - 1.2) / ROW_SPACING) + 1
        for r in range(rows):
            v = -d / 2 + 0.6 + ROW_SPACING * (r + 0.5) - ROW_SPACING / 2 + ROW_SPACING / 2
            if v > d / 2 - 0.5:
                continue
            u = -w / 2 + 0.6
            while u < w / 2 - 0.5:
                if rng.random() > 0.18:
                    uu = u + rng.uniform(-0.2, 0.2)
                    vv = v + rng.uniform(-0.12, 0.12)
                    x = cx + uu * cos_a - vv * sin_a
                    y = cy + uu * sin_a + vv * cos_a
                    meshes = crop_meshes[kind]
                    obj = bpy.data.objects.new(f'Crop_{kind}', meshes[rng.randrange(len(meshes))])
                    obj.location = (x, y, height(x, y) - 0.02)
                    obj.rotation_euler = (0, 0, rng.random() * math.tau)
                    s = growth * rng.uniform(0.6, 1.15)
                    obj.scale = (s, s, s * rng.uniform(0.85, 1.15))
                    link(obj, col)
                    count += 1
                u += spacing * rng.uniform(0.85, 1.2)
    return count


def scatter(col, meshes, count, area_fn, seed, scale=(0.85, 1.2), base_name='Veg', bounds=None, z_offset=0.0):
    rng = random.Random(seed)
    x0, x1, y0, y1 = bounds or (-SIZE_X / 2 + 2, SIZE_X / 2 - 2, -SIZE_Y / 2 + 2, SIZE_Y / 2 - 2)
    placed = tries = 0
    while placed < count and tries < count * 80:
        tries += 1
        x, y = rng.uniform(x0, x1), rng.uniform(y0, y1)
        if not area_fn(x, y, rng):
            continue
        obj = bpy.data.objects.new(base_name, meshes[rng.randrange(len(meshes))])
        obj.location = (x, y, height(x, y) + z_offset)
        obj.rotation_euler = (0, 0, rng.random() * math.tau)
        s = rng.uniform(*scale)
        obj.scale = (s, s, s * rng.uniform(0.9, 1.1))
        link(obj, col)
        placed += 1
    return placed


# --------------------------------------------------------------------- lighting

SUN_ELEVATION = 32.0
SUN_AZIMUTH = -32.0  # degrees from +X towards +Y: low morning sun from screen right, slightly in front.


def sun_vector():
    el, az = math.radians(SUN_ELEVATION), math.radians(SUN_AZIMUTH)
    return Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))


def setup_world(scene):
    """Morning: physical sky (multiple scattering, hazy) tinted to the palette sky, soft low sun."""
    world = bpy.data.worlds.new('World-Slice')
    if world.node_tree is None:
        world.use_nodes = True
    nt = world.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg = nt.nodes.new('ShaderNodeBackground')
    sky = nt.nodes.new('ShaderNodeTexSky')
    sky.sky_type = 'MULTIPLE_SCATTERING'
    sky.sun_disc = False
    sky.sun_elevation = math.radians(SUN_ELEVATION)
    sv = sun_vector()
    sky.sun_rotation = math.atan2(sv.x, sv.y)
    sky.altitude = 350.0
    sky.aerosol_density = 3.0
    sky.air_density = 1.2
    tint = nt.nodes.new('ShaderNodeMix')
    tint.data_type = 'RGBA'
    tint.inputs[0].default_value = 0.45
    tint.inputs[7].default_value = (*PAL['sky'], 1)
    nt.links.new(sky.outputs['Color'], tint.inputs[6])
    nt.links.new(tint.outputs[2], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 0.45
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])
    world.mist_settings.start = 20.0
    world.mist_settings.depth = 160.0
    world.mist_settings.falloff = 'QUADRATIC'
    scene.world = world

    sun_data = bpy.data.lights.new('LGT-Slice_Sun', 'SUN')
    sun_data.energy = 2.9
    sun_data.angle = math.radians(3.0)
    sun_data.color = (1.0, 0.88, 0.74)
    sun = bpy.data.objects.new('LGT-Slice_Sun', sun_data)
    sun.rotation_euler = (-sv).to_track_quat('-Z', 'Y').to_euler()
    scene.collection.objects.link(sun)


def setup_compositor(scene):
    """Aerial perspective from the mist pass, a light warm grade and a soft vignette. Blender 5 uses
    ``scene.compositing_node_group`` with a Group Output instead of the Composite node."""
    scene.view_layers[0].use_pass_mist = True
    ng = bpy.data.node_groups.new('COMP-Slice_Grade', 'CompositorNodeTree')
    ng.interface.new_socket(name='Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    scene.compositing_node_group = ng
    nodes, links = ng.nodes, ng.links
    rl = nodes.new('CompositorNodeRLayers')
    rl.scene = scene
    haze_amount = nodes.new('ShaderNodeMapRange')
    haze_amount.inputs['From Min'].default_value = 0.0
    haze_amount.inputs['From Max'].default_value = 1.0
    haze_amount.inputs['To Min'].default_value = 0.0
    haze_amount.inputs['To Max'].default_value = 0.5
    links.new(rl.outputs['Mist'], haze_amount.inputs['Value'])
    haze = nodes.new('ShaderNodeMix')
    haze.data_type = 'RGBA'
    haze.inputs[7].default_value = (0.62, 0.66, 0.68, 1.0)
    links.new(haze_amount.outputs['Result'], haze.inputs[0])
    links.new(rl.outputs['Image'], haze.inputs[6])
    grade = nodes.new('CompositorNodeColorBalance')
    for inp in grade.inputs:
        if inp.name == 'Gain' and inp.type == 'RGBA':
            inp.default_value = (1.04, 1.0, 0.95, 1.0)
    links.new(haze.outputs[2], grade.inputs['Image'])
    sat = nodes.new('CompositorNodeHueSat')
    sat.inputs['Saturation'].default_value = 0.94
    links.new(grade.outputs['Image'], sat.inputs['Image'])
    contrast = nodes.new('CompositorNodeBrightContrast')
    contrast.inputs['Contrast'].default_value = 10.0
    links.new(sat.outputs['Image'], contrast.inputs['Image'])
    mask = nodes.new('CompositorNodeEllipseMask')
    mask.inputs['Size'].default_value = (0.95, 0.9)
    blur = nodes.new('CompositorNodeBlur')
    blur.inputs['Size'].default_value = (260, 260)
    links.new(mask.outputs['Mask'], blur.inputs['Image'])
    vig = nodes.new('ShaderNodeMapRange')
    vig.inputs['To Min'].default_value = 0.8
    vig.inputs['To Max'].default_value = 1.0
    links.new(blur.outputs['Image'], vig.inputs['Value'])
    vmix = nodes.new('ShaderNodeMix')
    vmix.data_type = 'RGBA'
    vmix.blend_type = 'MULTIPLY'
    vmix.inputs[0].default_value = 1.0
    links.new(contrast.outputs['Image'], vmix.inputs[6])
    links.new(vig.outputs['Result'], vmix.inputs[7])
    out = nodes.new('NodeGroupOutput')
    links.new(vmix.outputs[2], out.inputs[0])


# (zoom distance, target) — mirrors src/core/cameraMath.ts: pitch 0.9 rad, vertical FOV 48°,
# zoom 28 (min) / 54 (mission opening) / wide.
CAMERA_PITCH = 0.9
CAMERA_VFOV = 48.0
VIEWS = {
    'close': (28.0, (-4.0, 30.0, 7.5)),
    'default': (54.0, (-2.0, 8.0, 4.0)),
    'wide': (120.0, (0.0, -2.0, 0.0)),
}


def place_camera(scene, view):
    cam = scene.objects.get('CAM-Slice')
    if cam is None:
        cam_data = bpy.data.cameras.new('CAM-Slice')
        cam = bpy.data.objects.new('CAM-Slice', cam_data)
        scene.collection.objects.link(cam)
    scene.camera = cam
    zoom, target = VIEWS[view]
    cam.data.sensor_fit = 'VERTICAL'
    cam.data.angle_y = math.radians(CAMERA_VFOV)
    cam.data.clip_start = 0.5
    cam.data.clip_end = 3000.0
    cam.location = (target[0], target[1] - zoom * math.cos(CAMERA_PITCH), target[2] + zoom * math.sin(CAMERA_PITCH))
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.world.mist_settings.start = zoom * 0.9
    scene.world.mist_settings.depth = zoom * 4.0
    return cam


def setup_render(scene, samples=64):
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.02
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 6
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 2
    scene.cycles.transmission_bounces = 4
    scene.cycles.transparent_max_bounces = 24
    scene.cycles.seed = 777
    scene.render.use_persistent_data = True
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.exposure = -0.35
    for look in ('AgX - Medium High Contrast', 'Medium High Contrast'):
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            continue


# ------------------------------------------------------------------------- build


def build_materials():
    m = {
        'bark': mat_bark('MAT-Slice_Bark', PAL['bark']),
        'grass': mat_tuft(),
        'huarango_leaf': mat_leaf('MAT-Slice_HuarangoLeaf', PAL['huarango'], (6.0, 6.0), 0.36, (1.06, 1.04, 0.85)),
        'willow_leaf': mat_leaf('MAT-Slice_WillowLeaf', V(PAL['riparian']) * 1.1, (2.5, 9.0), 0.36, (1.1, 1.08, 0.7)),
        'crop_leaf': mat_leaf('MAT-Slice_CropLeaf', V(PAL['reed_green']).lerp(V(PAL['huarango']), 0.4), (3.0, 3.0),
                              0.4),
        'squash_leaf': mat_leaf('MAT-Slice_SquashLeaf', V(PAL['reed_green']) * 0.9, (1.4, 1.4), 0.46),
        'reed': mat_varied('MAT-Slice_Reed', PAL['reed_green'], 0.75, 0.22, 2.0, 0.0),
        'reed_dry': mat_varied('MAT-Slice_ReedDry', PAL['cane'], 0.85, 0.15, 2.0, 0.0),
        'plume': mat_plume('MAT-Slice_Plume', V(PAL['cane']).lerp(V(PAL['cotton']), 0.35) * 0.85),
        'crop_stem': mat_flat('MAT-Slice_CropStem', V(PAL['reed_green']) * 0.7, 0.8),
        'squash': mat_varied('MAT-Slice_Squash', PAL['squash'], 0.6, 0.2, 6.0, 0.1),
        'cotton': mat_varied('MAT-Slice_Cotton', V(PAL['cotton']) * 0.85, 0.95, 0.06, 4.0, 0.2),
        'skin': mat_flat('MAT-Slice_Skin', PAL['skin'], 0.6),
        'hair': mat_flat('MAT-Slice_Hair', PAL['hair'], 0.7),
        'shicra': mat_shicra('MAT-Slice_Shicra'),
        'deer': mat_varied('MAT-Slice_Deer', PAL['deer'], 0.8, 0.1, 3.0, 0.1),
        'bird': mat_flat('MAT-Slice_Bird', (0.04, 0.035, 0.03), 0.8),
        'plaster_early': mat_plaster('MAT-Slice_PlasterEarly', V(PAL['plaster_early']) * V((0.7, 0.63, 0.52)),
                                     V(PAL['stone']).lerp(V(PAL['ochre']), 0.35), 0.22, 0.32),
        'plaster_plaza': mat_plaster('MAT-Slice_PlasterPlaza', V(PAL['plaster_early']) * V((0.68, 0.61, 0.5)),
                                     V(PAL['stone']).lerp(V(PAL['ochre']), 0.35), 0.16, 0.15),
        'quincha_white': mat_quincha('MAT-Slice_QuinchaWhite', V(PAL['plaster_early']) * 0.8),
        'quincha_ochre': mat_quincha('MAT-Slice_QuinchaOchre', PAL['ochre']),
        'stone_wall': mat_varied('MAT-Slice_StoneWall', PAL['stone'], 0.9, 0.25, 3.0, 0.6),
        'stone': mat_varied('MAT-Slice_Stone', V(PAL['stone']) * 0.75, 0.9, 0.25, 2.0, 0.4),
        'altar': mat_flat('MAT-Slice_Altar', PAL['fire'], 0.6, emission=8.0),
        'cane_mat': mat_cane_mat('MAT-Slice_CaneMat'),
        'refuse': mat_varied('MAT-Slice_Refuse', V(PAL['field_soil']).lerp(V(PAL['terrace']), 0.35), 0.95, 0.3, 2.5, 0.5),
        'floor': mat_varied('MAT-Slice_HouseFloor', V(PAL['terrace']) * 0.9, 0.95, 0.1, 0.8, 0.15),
        'ash': mat_varied('MAT-Slice_Ash', (0.12, 0.11, 0.1), 0.95, 0.3, 3.0, 0.1),
        'gourd': mat_varied('MAT-Slice_Gourd', PAL['gourd'], 0.5, 0.1, 3.0, 0.05),
    }
    return m


MAT_NAMES = {
    'bark': 'MAT-Slice_Bark',
    'grass': 'MAT-Slice_Grass',
    'huarango_leaf': 'MAT-Slice_HuarangoLeaf',
    'willow_leaf': 'MAT-Slice_WillowLeaf',
    'crop_leaf': 'MAT-Slice_CropLeaf',
    'squash_leaf': 'MAT-Slice_SquashLeaf',
    'reed': 'MAT-Slice_Reed',
    'reed_dry': 'MAT-Slice_ReedDry',
    'plume': 'MAT-Slice_Plume',
    'crop_stem': 'MAT-Slice_CropStem',
    'squash': 'MAT-Slice_Squash',
    'cotton': 'MAT-Slice_Cotton',
    'skin': 'MAT-Slice_Skin',
    'hair': 'MAT-Slice_Hair',
    'shicra': 'MAT-Slice_Shicra',
    'deer': 'MAT-Slice_Deer',
    'bird': 'MAT-Slice_Bird',
    'plaster_early': 'MAT-Slice_PlasterEarly',
    'plaster_plaza': 'MAT-Slice_PlasterPlaza',
    'quincha_white': 'MAT-Slice_QuinchaWhite',
    'quincha_ochre': 'MAT-Slice_QuinchaOchre',
    'stone_wall': 'MAT-Slice_StoneWall',
    'stone': 'MAT-Slice_Stone',
    'altar': 'MAT-Slice_Altar',
    'cane_mat': 'MAT-Slice_CaneMat',
    'refuse': 'MAT-Slice_Refuse',
    'floor': 'MAT-Slice_HouseFloor',
    'ash': 'MAT-Slice_Ash',
    'gourd': 'MAT-Slice_Gourd',
    'terrain': 'MAT-Slice_Terrain',
    'river': 'MAT-Slice_RiverWater',
    'canal': 'MAT-Slice_CanalWater',
    'wetland': 'MAT-Slice_WetlandWater',
}


def mats_by_name():
    """Materials of the slice by key (stages after the first look them up by datablock name)."""
    return {key: bpy.data.materials[name] for key, name in MAT_NAMES.items()}


def kits(prefix):
    return [m for m in bpy.data.meshes if m.name.startswith(prefix)]


# The build runs in four stages that only share data through Blender datablocks (MAT-*, KIT-* names),
# so each stage can be pasted on its own into a Blender whose MCP safe mode caps a script at 20k AST
# nodes. Headless runs simply call them in order through build().


def build_stage_look(samples=64):
    """Stage 1: materials, sky and sun, compositor and render settings."""
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    build_materials()
    mat_terrain()
    mat_water('MAT-Slice_RiverWater', V(PAL['wet_sand']).lerp(V(PAL['sea']), 0.4) * 0.75, 0.12)
    mat_water('MAT-Slice_CanalWater', V(PAL['wet_sand']).lerp(V(PAL['sea']), 0.3) * 0.7, 0.15, 4.0)
    mat_water('MAT-Slice_WetlandWater', V(PAL['sea']).lerp(V(PAL['wet_sand']), 0.45) * 0.65, 0.08)
    setup_world(scene)
    setup_compositor(scene)
    setup_render(scene, samples)
    return {'materials': len(mats_by_name())}


def build_stage_terrain():
    """Stage 2: continuous terrain, river channel, wetland and canal."""
    env = collection('COL-Slice_Environment')
    mats = mats_by_name()
    build_terrain(env, mats['terrain'])
    water_strip(env, mats['river'], -FAR_X, FAR_X)
    wetland_pool(env, mats['wetland'])
    canal(env, mats['canal'])
    return {'terrain_verts': len(bpy.data.meshes['GEO-Slice_Terrain'].vertices)}


def build_stage_kits():
    """Stage 3: the instanced kit meshes (vegetation, crops, people, fauna, props) and the buildings."""
    mats = mats_by_name()
    for s in range(4):
        kit_huarango(mats, s)
    for s in range(3):
        kit_sauce(mats, s)
    for s in range(2):
        kit_cana(mats, 'CanaBrava', s, 16, 4.0, 1.2, True)
        kit_cana(mats, 'Carrizo', 10 + s, 14, 2.1, 0.9, False)
        kit_totora(mats, s)
    for kind in ('cotton', 'squash', 'beans'):
        for s in range(3):
            kit_crop(mats, kind, s)
    for s in range(4):
        kit_tuft(mats, s)
    for s in range(3):
        kit_pebbles(mats, s)
        kit_shicra_pile(mats, s)
    for pose in ('stand', 'carry', 'stick'):
        kit_person(mats, pose)
    kit_deer(mats)
    kit_bird(mats)
    arch = collection('COL-Slice_Architecture')
    build_pyramid(arch, mats, kits('KIT-Shicras_'))
    houses = [(-22, 28.5, 0.1, 'quincha_white'), (-15.0, 30.5, -0.15, 'quincha_ochre'),
              (-8.0, 27.5, 0.05, 'quincha_white'), (-23.5, 36.0, 0.25, 'quincha_ochre'),
              (-16.0, 37.5, -0.05, 'quincha_white'), (-9.0, 35.0, 0.2, 'quincha_white')]
    for k, (x, y, yaw, paint) in enumerate(houses):
        build_quincha_house(arch, mats, (x, y), yaw, 100 + k, paint)
    return {'kits': len(kits('KIT-'))}


def build_stage_life():
    """Stage 4: scatter vegetation, crop rows, people, deer and birds; frame the default view."""
    scene = bpy.context.scene
    veg = collection('COL-Slice_Vegetation')
    life = collection('COL-Slice_Life')
    huarangos, sauces = kits('KIT-Huarango_'), kits('KIT-Sauce_')
    canas, carrizos, totoras = kits('KIT-CanaBrava_'), kits('KIT-Carrizo_'), kits('KIT-Totora_')
    crops = {kind: kits(f'KIT-Crop_{kind}_') for kind in ('cotton', 'squash', 'beans')}

    def riparian(x, y, rng):
        d = abs(y - river_y(x))
        dens = 0.5 + 0.5 * n2(x * 0.06, 11.0)
        return 5.5 < d < 12.5 and not plot_at(x, y) and not in_wetland(x, y) and rng.random() < dens

    def riverbank(x, y, rng):
        d = abs(y - river_y(x))
        return 3.4 < d < 7.5 and not plot_at(x, y) and not in_wetland(x, y)

    def wet_edge(x, y, rng):
        return (((x + 44) / 14.0) ** 2 + ((y + 50) / 6.4) ** 2) < 1.25 and not in_wetland(x, y) or (
            in_wetland(x, y) and rng.random() < 0.12)

    def grove(x, y, rng):
        edge = y + 1.4 * n2(x * 0.045, 4.0)
        dens = 0.35 + 0.65 * max(0.0, n2(x * 0.05, y * 0.05, 13.0) + 0.3)
        return 6.5 < edge < 15.0 and path_dist(x, y) > 2.5 and rng.random() < dens

    def wet(x, y, rng):
        return in_wetland(x, y)

    def far(fn):
        def wrapped(x, y, rng):
            return (abs(x) > SIZE_X / 2 or abs(y) > SIZE_Y / 2) and fn(x, y, rng)
        return wrapped

    def lomas_scrub(x, y, rng):
        return 24 < y < 95 and rng.random() < 0.25 and not (-8 < x < 36 and 22 < y < 62) and not (
            -28 < x < 0 and 24 < y < 44)

    def terrace_ground(x, y, rng):
        return 22 < y < 110 and rng.random() < 0.35 and not (-6 < x < 34 and 18 < y < 62) and not (
            -28 < x < 0 and 24 < y < 44)

    counts = {}
    counts['sauce'] = scatter(veg, sauces, 46, riparian, 1, (0.85, 1.25), 'Sauce')
    counts['cana'] = scatter(veg, canas, 80, riverbank, 2, (0.85, 1.2), 'CanaBrava')
    counts['carrizo'] = scatter(veg, carrizos, 80, riverbank, 3, (0.8, 1.2), 'Carrizo')
    counts['carrizo_wet'] = scatter(veg, carrizos, 18, wet_edge, 31, (0.8, 1.1), 'Carrizo')
    counts['totora'] = scatter(veg, totoras, 36, wet, 4, (0.8, 1.2), 'Totora')
    counts['huarango'] = scatter(veg, huarangos, 42, grove, 5, (0.85, 1.2), 'Huarango')
    counts['huarango_rip'] = scatter(veg, huarangos, 8, riparian, 6, (0.8, 1.0), 'Huarango')
    counts['grass'] = scatter_grass(veg, kits('KIT-GrassTuft_'), 14000, 12)
    counts['scrub'] = scatter(veg, carrizos, 150, lomas_scrub, 7, (0.3, 0.5), 'Scrub', (-MID_X, MID_X, 20.0, 100.0))
    far_bounds = (-FAR_X * 0.6, FAR_X * 0.6, -110.0, 30.0)
    counts['far_sauce'] = scatter(veg, sauces, 160, far(riparian), 21, (0.85, 1.25), 'FarSauce', far_bounds)
    counts['far_huarango'] = scatter(veg, huarangos, 200, far(grove), 22, (0.85, 1.2), 'FarHuarango', far_bounds)
    counts['crops'] = build_fields(veg, crops)
    counts['pebbles'] = scatter(veg, kits('KIT-Pebbles_'), 420, terrace_ground, 8, (0.8, 1.4), 'Pebbles',
                                (-MID_X, MID_X, 20.0, 110.0))

    people = {p: bpy.data.meshes[f'KIT-Person_{p}'] for p in ('stand', 'carry', 'stick')}
    rng = random.Random(42)
    ox, oy = PYR
    work_z = base_levels()[0] + PYR_WORK_Z
    spots = []
    for plot in PLOTS[:6]:
        if plot[5] != 'fallow':
            spots.append((plot[0] + rng.uniform(-3, 3), plot[1] + rng.uniform(-3, 3), 'stick'))
    for k in range(6):
        t = k / 5
        spots.append((ox - 1.0 + rng.uniform(-0.6, 0.6), oy - 21 + t * 6 + rng.uniform(-0.5, 0.5), 'carry'))
    for k in range(5):
        spots.append((ox + rng.uniform(4, 11), oy + rng.uniform(-6, 6), 'carry'))
    for x, y in ((-19, 33), (-12, 32.8), (-20.5, 31.6), (-5.5, 31.5), (-13, 40.0), (-11.5, 25.0)):
        spots.append((x + rng.uniform(-0.5, 0.5), y + rng.uniform(-0.5, 0.5), 'stand'))
    for x, y in ((6.5, 29.5), (7.5, 30.2), (21.0, 29.0), (-1.0, 26.5)):
        spots.append((x + rng.uniform(-0.3, 0.3), y + rng.uniform(-0.3, 0.3), 'stand'))
    for k in range(3):
        p = PATH_HOUSES[k]
        spots.append((p[0] + rng.uniform(-0.6, 0.6), p[1] + rng.uniform(-0.6, 0.6), 'carry'))
    for k in range(4):
        p = PATH[1 + k]
        spots.append((p[0] + rng.uniform(-0.6, 0.6), p[1] + rng.uniform(-0.6, 0.6), 'carry'))
    for x, y, pose in spots:
        obj = bpy.data.objects.new(f'Person_{pose}', people[pose])
        z = height(x, y)
        if pose == 'carry' and abs(x - ox) < 12 and abs(y - oy) < 8:
            z = work_z
        obj.location = (x, y, z)
        obj.rotation_euler = (0, 0, rng.random() * math.tau)
        link(obj, life)

    deer = bpy.data.meshes['KIT-Deer']
    for x, y, yaw in ((27.0, -38.5, 0.4), (29.5, -40.0, 0.9), (32.0, -38.0, 2.6), (24.5, -40.5, -0.3)):
        obj = bpy.data.objects.new('Deer', deer)
        obj.location = (x, y, height(x, y))
        obj.rotation_euler = (0, 0, yaw)
        link(obj, life)
    bird = bpy.data.meshes['KIT-Bird']
    for k in range(11):
        obj = bpy.data.objects.new('Bird', bird)
        obj.location = (-14 + k * 2.0 + rng.uniform(-1, 1), -22 + rng.uniform(-2.5, 2.5), 12 + rng.uniform(-1.5, 1.5))
        obj.rotation_euler = (rng.uniform(-0.2, 0.2), rng.uniform(-0.3, 0.3), 0.3 + rng.uniform(-0.3, 0.3))
        link(obj, life)

    place_camera(scene, 'default')
    counts['objects'] = len(bpy.data.objects)
    counts['unique_faces_incl_instances'] = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    return counts


def build(samples=64):
    """Build the whole slice into the current (empty) scene. Returns a stats dict."""
    _CACHE.clear()
    stats = build_stage_look(samples)
    stats.update(build_stage_terrain())
    stats.update(build_stage_kits())
    stats.update(build_stage_life())
    return stats


def set_viewport_material_preview():
    screen = bpy.context.screen
    if screen is None:
        return
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    space.shading.type = 'MATERIAL'
                    space.shading.use_scene_lights = True
                    space.shading.use_scene_world = True


# === CLI (headless only; not safe-mode compatible) ===================================


def _cli():
    import argparse
    import os
    import sys
    import time

    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    source_dir = os.path.join(root, 'art-src', 'blender', 'scenes')
    render_dir = os.path.join(root, 'review', 'caral-slice')
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--samples', type=int, default=64)
    parser.add_argument('--no-render', action='store_true')
    parser.add_argument('--render-only', action='store_true')
    parser.add_argument('--views', default='close,default,wide')
    parser.add_argument('--percent', type=int, default=100)
    args = parser.parse_args(argv)

    scene = bpy.context.scene
    if not args.render_only:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        start = time.time()
        stats = build(args.samples)
        print(f'BUILD {time.time() - start:.1f}s {stats}')
        os.makedirs(source_dir, exist_ok=True)
        blend_path = os.path.join(source_dir, 'caral_valley_slice.blend')
        bpy.ops.wm.save_as_mainfile(filepath=blend_path, compress=True)
        print(f'SAVED {blend_path}')
        scene = bpy.context.scene
    if args.no_render:
        return
    setup_render(scene, args.samples)
    scene.render.resolution_percentage = args.percent
    os.makedirs(render_dir, exist_ok=True)
    for name in args.views.split(','):
        place_camera(scene, name)
        path = os.path.join(render_dir, f'slice_{name}.png')
        scene.render.filepath = path
        start = time.time()
        bpy.ops.render.render(write_still=True)
        print(f'WROTE {path} {time.time() - start:.1f}s look={scene.view_settings.look}')


if __name__ == '__main__':
    _cli()
