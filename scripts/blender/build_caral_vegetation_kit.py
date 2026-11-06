"""Build the Caral vegetation kit for the game (art-direction.md §7) as LOD0/LOD1 GLBs.

Species and zones come from the dossier (docs/historia/campanas/caral.md): huarango (Prosopis,
used by the game's ``algarrobo`` tree variant), riverbank willow (``sauce``), caña brava, carrizo
and totora. Shapes follow the vertical-slice diorama (scripts/blender/build_caral_slice.py) but are
cut down to the per-species triangle budgets, with game-safe materials: Principled BSDF only,
flat colours or a small generated leaf texture (alpha-masked), per-card tint in COLOR_0 and
crown-aware custom normals so the cards shade as one volume.

Units are game units (a person is 1.86); +Z up in Blender, exported Y-up; origin at the trunk base.

Run from the repository root:
  blender --background --python scripts/blender/build_caral_vegetation_kit.py -- [--only=huarango,sauce]
"""

import argparse
import json
import math
import os
import random
import shutil
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_caral_slice as slice_kit  # noqa: E402  (shared kit helpers and palette)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
EXPORT_DIR = os.path.join(ROOT, 'art-src', 'blender', 'exports', 'caral', 'vegetation')
GAME_DIR = os.path.join(ROOT, 'src', 'assets', 'vegetation', 'caral')
SOURCE_BLEND = os.path.join(ROOT, 'art-src', 'blender', 'scenes', 'caral_vegetation_kit.blend')

PAL = slice_kit.PAL
V = slice_kit.V

# Per-species triangle budgets from docs/design/art-direction.md §7 (LOD0, LOD1).
BUDGETS = {
    'huarango': (1500, 400),
    'sauce': (1200, 350),
    'cana_brava': (600, 150),
    'carrizo': (400, 120),
    'totora': (400, 120),
}


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', default='')
    return parser.parse_args(argv)


# ----------------------------------------------------------------------- materials


def leaf_texture(name, size, leaflets, elongation, rim, seed):
    """Leaf-cluster atlas: jittered grid of leaflets inside a soft disc, RGB tone, A = cut-out."""
    rng = random.Random(seed)
    cells = leaflets
    pts = {}
    for gy in range(cells):
        for gx in range(cells):
            pts[(gx, gy)] = ((gx + 0.15 + rng.random() * 0.7) / cells, (gy + 0.15 + rng.random() * 0.7) / cells,
                             rng.random())
    radius = 0.5 / cells * 0.95
    pixels = [0.0] * (size * size * 4)
    for py in range(size):
        v = (py + 0.5) / size
        for px in range(size):
            u = (px + 0.5) / size
            rc = math.hypot(u - 0.5, v - 0.5)
            if rc > rim:
                continue
            gx, gy = int(u * cells), int(v * cells)
            best, tone = 9.0, 0.0
            for ox in (-1, 0, 1):
                for oy in (-1, 0, 1):
                    p = pts.get((gx + ox, gy + oy))
                    if p is None:
                        continue
                    du, dv = (u - p[0]) * elongation, (v - p[1])
                    d = math.hypot(du, dv)
                    if d < best:
                        best, tone = d, p[2]
            if best > radius:
                continue
            shade = 0.82 + 0.3 * tone - 0.25 * (best / radius) ** 2
            i = (py * size + px) * 4
            pixels[i] = pixels[i + 1] = pixels[i + 2] = shade
            pixels[i + 3] = 1.0
    img = bpy.data.images.new(name, size, size, alpha=True)
    img.pixels = pixels
    img.pack()
    return img


def mat_basic(name, color, roughness=0.9):
    mat, nt, bsdf = slice_kit.new_mat(name)
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


def mat_cards(name, color, image):
    """Alpha-masked card material: texture tone x base colour; the glTF exporter writes MASK."""
    mat, nt, bsdf = slice_kit.new_mat(name)
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = image
    tint = nt.nodes.new('ShaderNodeMix')
    tint.data_type = 'RGBA'
    tint.blend_type = 'MULTIPLY'
    tint.inputs[0].default_value = 1.0
    tint.inputs[7].default_value = (*color, 1)
    nt.links.new(tex.outputs['Color'], tint.inputs[6])
    nt.links.new(tint.outputs[2], bsdf.inputs['Base Color'])
    cut = nt.nodes.new('ShaderNodeMath')
    cut.operation = 'GREATER_THAN'
    cut.inputs[1].default_value = 0.5
    nt.links.new(tex.outputs['Alpha'], cut.inputs[0])
    nt.links.new(cut.outputs[0], bsdf.inputs['Alpha'])
    bsdf.inputs['Roughness'].default_value = 0.8
    mat.surface_render_method = 'DITHERED'
    return mat


def build_materials():
    huarango_tex = leaf_texture('TEX-Kit_HuarangoLeaf', 256, 22, 1.0, 0.48, 1)
    willow_tex = leaf_texture('TEX-Kit_WillowLeaf', 256, 9, 2.6, 0.48, 2)
    plume_tex = leaf_texture('TEX-Kit_Plume', 64, 6, 3.5, 0.46, 3)
    return {
        'bark': mat_basic('MAT-Kit_Bark', V(PAL['bark']) * 0.85, 0.95),
        'huarango_leaf': mat_cards('MAT-Kit_HuarangoLeaf', V(PAL['huarango']) * 1.55, huarango_tex),
        'willow_leaf': mat_cards('MAT-Kit_WillowLeaf', V(PAL['riparian']) * 1.75, willow_tex),
        'reed': mat_basic('MAT-Kit_Reed', PAL['reed_green'], 0.8),
        'plume': mat_cards('MAT-Kit_Plume', V(PAL['cane']).lerp(V(PAL['cotton']), 0.35), plume_tex),
    }


# ------------------------------------------------------------------------- species


def huarango(mats, lod):
    """Huarango: low fork, four or five arching limbs, wide flat crown (~3 people tall)."""
    rng = random.Random(11)
    kit = slice_kit.new_kit()
    sides = 7 if lod == 0 else 5
    trunk = [Vector((0, 0, -0.1)), Vector((0.12, 0.06, 0.9)), Vector((0.05, 0.16, 1.7)), Vector((0.18, 0.1, 2.3))]
    if lod == 1:
        trunk = [trunk[0], trunk[2], trunk[3]]
    slice_kit.ktube(kit, trunk, 0.32, 0.2, sides, 0)
    fork = trunk[-1]
    tips = []
    for k in range(5 if lod == 0 else 4):
        ang = k / (5 if lod == 0 else 4) * math.tau + rng.uniform(-0.3, 0.3)
        reach = rng.uniform(1.4, 2.2)
        mid = fork + Vector((math.cos(ang) * reach * 0.45, math.sin(ang) * reach * 0.45, rng.uniform(0.8, 1.2)))
        tip = fork + Vector((math.cos(ang) * reach, math.sin(ang) * reach, rng.uniform(1.9, 2.5)))
        pts = [fork, mid, tip] if lod == 0 else [fork, tip]
        slice_kit.ktube(kit, pts, 0.11, 0.035, 6 if lod == 0 else 4, 0)
        tips.append(tip)
    blobs = []
    for tip in tips:
        blobs.append((tuple(tip + Vector((0, 0, 0.2))), (1.45, 1.4, 0.8)))
        blobs.append((tuple(tip * 0.55 + fork * 0.45 + Vector((0, 0, 1.2))), (1.15, 1.15, 0.65)))
    crown = sum((Vector(b[0]) for b in blobs), Vector()) / len(blobs)
    cards, size = (620, 1.05) if lod == 0 else (165, 1.95)
    slice_kit.kcrown(kit, blobs, cards, size, rng, 1, surface=0.3)
    return kit, [mats['bark'], mats['huarango_leaf']], crown - Vector((0, 0, 1.0))


def sauce(mats, lod):
    """Riverbank willow: straight trunk, narrow crown of hanging leaf sprays."""
    rng = random.Random(12)
    kit = slice_kit.new_kit()
    trunk = [(0, 0, -0.1), (0.1, 0, 2.8), (0.22, 0.08, 6.2)]
    slice_kit.ktube(kit, trunk, 0.28, 0.1, 7 if lod == 0 else 5, 0)
    blobs = []
    for k in range(8):
        ang = rng.random() * math.tau
        r = rng.random() * 1.0
        blobs.append(((math.cos(ang) * r, math.sin(ang) * r, 3.4 + rng.random() * 3.0), (0.95, 0.95, 1.4)))
        if lod == 0:
            slice_kit.ktube(kit, [(0.15, 0.05, 3.0 + k * 0.35), (math.cos(ang) * r * 1.2, math.sin(ang) * r * 1.2,
                                                                 3.8 + k * 0.4)], 0.06, 0.03, 4, 0)
    cards, size = (520, 1.1) if lod == 0 else (155, 1.95)
    slice_kit.kcrown(kit, blobs, cards, size, rng, 1, aspect=0.5, droop=0.7, surface=0.4)
    return kit, [mats['bark'], mats['willow_leaf']], Vector((0, 0, 4.4))


def cane_clump(mats, lod, stalks, h, spread, blades, plume, seed):
    rng = random.Random(seed)
    kit = slice_kit.new_kit()
    n = stalks if lod == 0 else max(4, stalks // 2)
    for k in range(n):
        a = rng.random() * math.tau
        r = rng.random() ** 0.6 * spread
        x, y = math.cos(a) * r, math.sin(a) * r
        hh = h * rng.uniform(0.75, 1.1)
        tilt = Vector((x * 0.12 + rng.uniform(-0.15, 0.15), y * 0.12 + rng.uniform(-0.15, 0.15), 0))
        top = Vector((x, y, hh)) + tilt * hh
        slice_kit.ktube(kit, [(x, y, -0.05), tuple(top)], 0.035, 0.015, 4 if lod == 0 else 3, 0)
        for j in range(blades if lod == 0 else 1):
            t = 0.3 + j * 0.2
            p = Vector((x, y, 0)).lerp(top, t)
            ang = rng.random() * math.tau
            slice_kit.kblade(kit, tuple(p), hh * 0.3, (math.cos(ang) * hh * 0.32, math.sin(ang) * hh * 0.32), 0.05,
                             0, 1.2)
        if plume:
            for q in range(2 if lod == 0 else 1):
                nrm = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0)).normalized()
                slice_kit.kcard(kit, tuple(top + Vector((0, 0, 0.3))), nrm, 0.75, rng, 1, aspect=0.4,
                                spin=rng.uniform(-0.3, 0.3))
    return kit, [mats['reed'], mats['plume']], None


def totora(mats, lod):
    """Totora clump: round stems standing in shallow water."""
    rng = random.Random(15)
    kit = slice_kit.new_kit()
    for k in range(30 if lod == 0 else 12):
        a = rng.random() * math.tau
        r = rng.random() ** 0.5 * 1.1
        x, y = math.cos(a) * r, math.sin(a) * r
        hh = rng.uniform(1.4, 2.3)
        lean = (rng.uniform(-0.25, 0.25), rng.uniform(-0.25, 0.25))
        pts = [(x, y, -0.2), (x + lean[0] * 0.5, y + lean[1] * 0.5, hh * 0.6), (x + lean[0], y + lean[1], hh)]
        slice_kit.ktube(kit, pts if lod == 0 else [pts[0], pts[2]], 0.03, 0.007, 3, 0)
    return kit, [mats['reed']], None


SPECIES = {
    'huarango': huarango,
    'sauce': sauce,
    'cana_brava': lambda mats, lod: cane_clump(mats, lod, 12, 3.6, 1.0, 3, True, 13),
    'carrizo': lambda mats, lod: cane_clump(mats, lod, 14, 2.0, 0.8, 2, False, 14),
    'totora': totora,
}


# ------------------------------------------------------------------------- export


def tint_vertex_colors(mesh, blobs):
    """COLOR_0 on leaf/plume cards: random per-card tint, darker deep inside and under the crown (a
    cheap baked self-shadow); white elsewhere."""
    src = mesh.color_attributes.get('leafvar')
    blob = mesh.attributes.get('blob')
    col = mesh.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    for poly in mesh.polygons:
        card = poly.material_index > 0
        shade = 1.0
        idx = blob.data[poly.index].value if blob else 0
        if card and idx > 0:
            c, r = blobs[idx - 1]
            p = poly.center
            d = Vector(((p.x - c.x) / r.x, (p.y - c.y) / r.y, (p.z - c.z) / r.z))
            up = max(0.0, min(1.0, d.z * 0.5 + 0.5))
            shade = (0.55 + 0.45 * min(1.0, d.length)) * (0.78 + 0.22 * up)
        for li in poly.loop_indices:
            v = src.data[li].color[0] if (src and card) else 1.0
            t = (0.85 + 0.15 * v) * shade if card else 1.0
            col.data[li].color = (t, t, t, 1.0)
    if src:
        mesh.color_attributes.remove(src)
    if blob:
        mesh.attributes.remove(blob)
    mesh.color_attributes.active_color = col
    mesh.color_attributes.render_color_index = mesh.color_attributes.find('Col')


def build_object(asset, lod, mats):
    kit, materials, crown = SPECIES[asset](mats, lod)
    name = f'GEO-Kit_{asset}_LOD{lod}'
    mesh = slice_kit.kfinish(kit, name, materials, crown=crown)
    tint_vertex_colors(mesh, kit['blobs'])
    obj = bpy.data.objects.new(name, mesh)
    col = bpy.data.collections.get(f'COL-Kit_{asset}') or bpy.data.collections.new(f'COL-Kit_{asset}')
    if col.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(col)
    col.objects.link(obj)
    obj.location.x = (list(SPECIES).index(asset)) * 10.0
    obj.location.y = lod * 10.0
    return obj


def export_glb(obj, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    saved = obj.location.copy()
    obj.location = (0, 0, 0)
    bpy.context.view_layer.update()
    for o in bpy.context.view_layer.objects:
        o.select_set(o == obj)
    bpy.context.view_layer.objects.active = obj
    kwargs = dict(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                  export_animations=False, export_materials='EXPORT', export_normals=True, export_tangents=False)
    try:
        bpy.ops.export_scene.gltf(**kwargs, export_vertex_color='ACTIVE')
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)
    obj.location = saved


def stats(obj):
    mesh = obj.data
    tris = sum(len(p.vertices) - 2 for p in mesh.polygons)
    used = sorted({mesh.materials[p.material_index].name for p in mesh.polygons})
    lo = Vector([min(v.co[i] for v in mesh.vertices) for i in range(3)])
    hi = Vector([max(v.co[i] for v in mesh.vertices) for i in range(3)])
    return {'triangles': tris, 'draw_calls': len(used), 'materials': used,
            'bounds': {'min': [round(c, 4) for c in lo], 'max': [round(c, 4) for c in hi],
                       'size': [round(c, 4) for c in hi - lo]}}


def main():
    args = parse_args()
    only = [a for a in args.only.split(',') if a] or list(SPECIES)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = build_materials()
    os.makedirs(GAME_DIR, exist_ok=True)
    failures = []
    for asset in only:
        manifest = {'asset_id': f'caral_{asset}', 'source_scene': 'scenes/caral_vegetation_kit.blend',
                    'script': 'scripts/blender/build_caral_vegetation_kit.py', 'scale': 1.0, 'up': 'Y',
                    'pivot': 'trunk base at origin', 'budget': {'LOD0': BUDGETS[asset][0], 'LOD1': BUDGETS[asset][1]},
                    'lods': {}}
        for lod in (0, 1):
            obj = build_object(asset, lod, mats)
            info = stats(obj)
            file = f'caral_{asset}_lod{lod}.glb'
            path = os.path.join(EXPORT_DIR, file)
            export_glb(obj, path)
            shutil.copy2(path, os.path.join(GAME_DIR, file))
            info['file'] = file
            info['bytes'] = os.path.getsize(path)
            manifest['lods'][f'LOD{lod}'] = info
            if info['triangles'] > BUDGETS[asset][lod]:
                failures.append(f'{asset} LOD{lod}: {info["triangles"]} > {BUDGETS[asset][lod]}')
            print(f'KIT {asset} LOD{lod} tris={info["triangles"]} calls={info["draw_calls"]} bytes={info["bytes"]}')
        with open(os.path.join(EXPORT_DIR, f'caral_{asset}_manifest.json'), 'w') as fh:
            json.dump(manifest, fh, indent=2)
            fh.write('\n')
    os.makedirs(os.path.dirname(SOURCE_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=SOURCE_BLEND, compress=True)
    if failures:
        raise SystemExit('over budget: ' + '; '.join(failures))


if __name__ == '__main__':
    main()
