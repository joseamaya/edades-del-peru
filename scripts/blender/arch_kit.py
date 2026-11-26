"""Shared helpers for the Blender architecture kits (art-direction §4.2).

A kit script builds a handful of pieces twice (LOD0 and LOD1), exports one GLB per piece, copies it into the
game assets and writes a per-piece manifest. This module owns the parts every kit script repeats: the bmesh
builder, the wall/roof primitives, world-scale box UVs, the vertex tint, the GLB export and the manifest.

The five procedural kits that landed before this module (Caral, Cusco, colonial, Republican, Independence)
import the plumbing from here: `parse_args`, the GLB export and `stats`, which were copies of the same code
(Caral's had one stray space). Their piece builders stay local on purpose: each kit uses its own bmesh
primitives, material order and tint
ledges, so rewriting them on `Kit` would change geometry and needs captures, not a mechanical pass. Chavín
is not a procedural kit (it extracts groups from a source `.blend` and writes one manifest per LOD), so it
stays a separate converter.

Usage from a kit script:

    import arch_kit as ak

    MATERIALS = {'adobe': ('MAT-Arch_KitAdobe', ak.hex_rgb('#c9a878'), 0.96), ...}
    TILE = {'MAT-Arch_KitAdobe': 2.8, ...}

    def hall(mats, lod):
        kit = ak.Kit(mats, list(MATERIALS), lod, seed=101)
        ...

    ASSETS = {'hall': hall}
    if __name__ == '__main__':
        ak.run_kit(kit='moche', materials=MATERIALS, tile=TILE, assets=ASSETS, ...)
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import shutil
import sys

import bmesh
import bpy
from mathutils import Vector
from mathutils import noise

LOD0_BUDGET = 5000
LOD1_BUDGET = 1500
MONUMENT_BUDGET = (8000, 2400)


def hex_rgb(value):
    value = value.lstrip('#')
    return tuple(((int(value[i:i + 2], 16) / 255.0) ** 2.2) for i in (0, 2, 4))


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', default='')
    return parser.parse_args(argv)


class Kit:
    """A bmesh plus the material slots it uses, with the shared building helpers."""

    def __init__(self, mats, order, lod, seed):
        self.bm = bmesh.new()
        self.order = list(order)
        self.mats = [mats[k] for k in self.order]
        self.lod = lod
        self.rng = random.Random(seed)

    def mat(self, key):
        return self.order.index(key)

    def shell(self, build):
        """Build a closed volume in its own bmesh, let Blender orient its faces outward, then merge it."""
        main, self.bm = self.bm, bmesh.new()
        build()
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        mesh = bpy.data.meshes.new('shell')
        self.bm.to_mesh(mesh)
        self.bm.free()
        self.bm = main
        self.bm.from_mesh(mesh)
        bpy.data.meshes.remove(mesh)

    def prism(self, outline, z0, z1, key, top_key=None, bottom=False, side_key=None):
        """Extrude a closed XY outline (counter-clockwise seen from above) from z0 to z1."""
        n = len(outline)
        lo = [self.bm.verts.new((x, y, z0)) for x, y in outline]
        hi = [self.bm.verts.new((x, y, z1)) for x, y in outline]
        top = self.bm.faces.new(hi)
        top.material_index = self.mat(top_key or key)
        if bottom:
            b = self.bm.faces.new(list(reversed(lo)))
            b.material_index = self.mat(key)
        for i in range(n):
            j = (i + 1) % n
            f = self.bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
            f.material_index = self.mat(side_key or key)
        return top

    def box(self, cx, cy, z0, sx, sy, sz, key, top_key=None):
        hx, hy = sx / 2, sy / 2
        self.prism([(cx - hx, cy - hy), (cx + hx, cy - hy), (cx + hx, cy + hy), (cx - hx, cy + hy)],
                   z0, z0 + sz, key, top_key)

    def slab(self, p0, p1, thick, outline, key):
        """A vertical wall slab between XY points p0 -> p1 from a 2D outline in (u along the wall, v up)
        coordinates, extruded `thick` across the wall. Concave outlines (door notches) are fine."""
        a = Vector((p0[0], p0[1], 0))
        d = Vector((p1[0] - p0[0], p1[1] - p0[1], 0))
        length = d.length
        d.normalize()
        out = Vector((d.y, -d.x, 0))
        half = thick / 2
        front = [self.bm.verts.new(a + d * u + out * half + Vector((0, 0, v))) for u, v in outline]
        back = [self.bm.verts.new(a + d * u - out * half + Vector((0, 0, v))) for u, v in outline]
        f = self.bm.faces.new(front)
        f.material_index = self.mat(key)
        b = self.bm.faces.new(list(reversed(back)))
        b.material_index = self.mat(key)
        n = len(outline)
        for i in range(n):
            j = (i + 1) % n
            s = self.bm.faces.new((front[j], front[i], back[i], back[j]))
            s.material_index = self.mat(key)
        return length

    def cylinder(self, cx, cy, z0, z1, radius, key, sides=8):
        ring = [(cx + radius * math.cos(2 * math.pi * i / sides), cy + radius * math.sin(2 * math.pi * i / sides))
                for i in range(sides)]
        self.prism(ring, z0, z1, key)

    def frustum(self, cx, cy, sx, sy, z0, sz, taper, key, top_key=None):
        """A battered adobe volume: a rectangular tier whose top is `taper` narrower on every side. The
        tapered face is what makes a mass read as packed earth instead of a concrete box."""
        lo = [(cx - sx / 2, cy - sy / 2), (cx + sx / 2, cy - sy / 2), (cx + sx / 2, cy + sy / 2),
              (cx - sx / 2, cy + sy / 2)]
        hi = [(cx - sx / 2 + taper, cy - sy / 2 + taper), (cx + sx / 2 - taper, cy - sy / 2 + taper),
              (cx + sx / 2 - taper, cy + sy / 2 - taper), (cx - sx / 2 + taper, cy + sy / 2 - taper)]
        lo_v = [self.bm.verts.new((x, y, z0)) for x, y in lo]
        hi_v = [self.bm.verts.new((x, y, z0 + sz)) for x, y in hi]
        top = self.bm.faces.new(hi_v)
        top.material_index = self.mat(top_key or key)
        for i in range(4):
            j = (i + 1) % 4
            face = self.bm.faces.new((lo_v[i], lo_v[j], hi_v[j], hi_v[i]))
            face.material_index = self.mat(key)

    def merlons(self, length, z, count, width, height, thickness, key, centre_y=0.0):
        for i in range(count):
            x = -length / 2 + length * (i + 0.5) / count
            self.box(x, centre_y, z, width, thickness, height, key)


# ---------------------------------------------------------------------------------------------- pieces

def opening_outline(length, height, openings):
    """A wall face in (u, v) with arched openings cut out of its foot. Openings are
    `(u_center, width, spring, rise)`; `rise = 0` gives a rectangular opening."""
    pts = [(0.0, 0.0)]
    for uc, width, spring, rise in sorted(openings):
        left, right = uc - width / 2, uc + width / 2
        pts += [(left, 0.0), (left, spring)]
        if rise > 0:
            steps = 6 if rise > 0.3 else 3
            for i in range(1, steps):
                a = math.pi - i * math.pi / steps
                pts.append((uc + (width / 2) * math.cos(a), spring + rise * math.sin(a)))
        pts += [(right, spring), (right, 0.0)]
    pts += [(length, 0.0), (length, height), (0.0, height)]
    return pts


def wall(kit, w, d, height, thick, front=(), sides=(), back=(), wall_key='plaster', hole_key='dark'):
    """Four walls of a rectangular building; ground-level openings are real holes. The front face is -Y."""
    hx, hy = w / 2, d / 2
    corners = [(-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy)]
    for i in range(4):
        p0, p1 = corners[i], corners[(i + 1) % 4]
        length = math.dist(p0, p1)
        dx, dy = (p1[0] - p0[0]) / length, (p1[1] - p0[1]) / length
        nx, ny = dy, -dx
        q0 = (p0[0] - nx * thick / 2, p0[1] - ny * thick / 2)
        q1 = (p1[0] - nx * thick / 2, p1[1] - ny * thick / 2)
        openings = (front, sides, back, sides)[i]
        kit.slab(q0, q1, thick, opening_outline(length, height, openings), wall_key)
        for uc, width, spring, rise in openings:
            ox, oz = p0[0] + dx * uc + nx * 0.02, p0[1] + dy * uc + ny * 0.02
            kit.box(ox, oz, 0.0, width, 0.06, spring + rise, hole_key)


def window(kit, face, u, z, width, height, side, w, d, key='dark', frame='stone'):
    if face == 'front':
        x, y, sx, sy = u, -d / 2 + 0.03, width, 0.08
    elif face == 'back':
        x, y, sx, sy = u, d / 2 - 0.03, width, 0.08
    else:
        x, y, sx, sy = side * (w / 2 - 0.03), u, 0.08, width
    kit.box(x, y, z, sx, sy, height, key)
    kit.box(x, y, z - 0.08, sx + 0.16, sy + 0.08, 0.1, frame)


def stairs(kit, cx, y_front, y_back, width, height, steps, key):
    """A stepped ramp rising from y_front (ground) to y_back (top); reads better than a wedge at RTS scale."""
    run = (y_back - y_front) / steps
    rise = height / steps

    def build():
        for i in range(steps):
            y0 = y_front + i * run
            kit.box(cx, (y0 + y_back) / 2, 0.0, width, abs(y_back - y0), rise * (i + 1), key)

    kit.shell(build)


def pyramid(kit, cx, cy, w, d, z, height, key):
    base = [(cx - w / 2, cy - d / 2), (cx + w / 2, cy - d / 2), (cx + w / 2, cy + d / 2), (cx - w / 2, cy + d / 2)]
    kit.prism(base, z, z + 0.06, key)
    bv = [kit.bm.verts.new((x, y, z + 0.06)) for x, y in base]
    apex = kit.bm.verts.new((cx, cy, z + height))
    for i in range(4):
        j = (i + 1) % 4
        f = kit.bm.faces.new((bv[i], bv[j], apex))
        f.material_index = kit.mat(key)


def gable_roof(kit, w, d, eave_z, rise, key, overhang=0.55, end_overhang=0.35, thick=0.22, ridge_key=None):
    """A thick gable roof along X: two slopes and a ridge, for tile, thatch or earth."""
    segs = 8 if kit.lod == 0 else 2
    hx = w / 2 + end_overhang
    hy = d / 2 + overhang
    ridge_z = eave_z + rise
    for side in (-1, 1):
        def slope(side=side):
            nrm = Vector((0, side * rise, d / 2)).normalized()
            under = -nrm * thick
            top = [Vector((-hx + 2 * hx * i / segs, 0.0, ridge_z)) for i in range(segs + 1)]
            low = [Vector((-hx + 2 * hx * i / segs, side * hy,
                           eave_z - (0.0 if kit.lod else kit.rng.uniform(-0.03, 0.04))))
                   for i in range(segs + 1)]
            tv = [kit.bm.verts.new(p) for p in top]
            lv = [kit.bm.verts.new(p) for p in low]
            tb = [kit.bm.verts.new(p + under) for p in top]
            lb = [kit.bm.verts.new(p + under) for p in low]
            for i in range(segs):
                for quad in ((tv[i], tv[i + 1], lv[i + 1], lv[i]), (tb[i], lb[i], lb[i + 1], tb[i + 1]),
                             (lv[i], lv[i + 1], lb[i + 1], lb[i]), (tv[i], tb[i], tb[i + 1], tv[i + 1])):
                    f = kit.bm.faces.new(quad)
                    f.material_index = kit.mat(key)
            for end in (0, segs):
                f = kit.bm.faces.new((tv[end], lv[end], lb[end], tb[end]))
                f.material_index = kit.mat(key)
        kit.shell(slope)
    kit.prism([(-hx, -0.18), (hx, -0.18), (hx, 0.18), (-hx, 0.18)], ridge_z - 0.04, ridge_z + 0.14,
              ridge_key or key)


def flat_roof(kit, w, d, z, key, parapet_key, height=0.42, thick=0.28):
    kit.box(0.0, 0.0, z, w + 0.3, d + 0.3, thick, key)
    pw = 0.32
    for sx, sy, lx, ly in ((0, -1, w, pw), (0, 1, w, pw), (-1, 0, pw, d), (1, 0, pw, d)):
        kit.box(sx * (w / 2 - pw / 2), sy * (d / 2 - pw / 2), z + thick, lx, ly, height, parapet_key)


# ------------------------------------------------------------------------------------------- pipeline

def build_materials(materials):
    mats = {}
    for key, (name, color, rough) in materials.items():
        mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        bsdf.inputs['Base Color'].default_value = (*color, 1.0)
        bsdf.inputs['Roughness'].default_value = rough
        bsdf.inputs['Metallic'].default_value = 0.0
        mats[key] = mat
    return mats


def assign_uvs(bm, materials, tile):
    """Box-projected UVs at world scale, as in the Caral kit."""
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal
        size = tile.get(materials[f.material_index].name, 3.0)
        ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
        for loop in f.loops:
            co = loop.vert.co
            if az >= ax and az >= ay:
                u, v = co.x, co.y
            elif ax >= ay:
                u, v = co.y, co.z
            else:
                u, v = co.x, co.z
            loop[uv].uv = (u / size, v / size)


def tint(mesh, flat=(), earth=(), dark=()):
    """COLOR_0 over the material: grime at the foot of the walls, weather variation per roof and a
    low-frequency mottle. Horizontal floors and stone up-faces skip the wall-foot grime."""
    col = mesh.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    rng = random.Random(7)
    for poly in mesh.polygons:
        name = mesh.materials[poly.material_index].name
        shade = 1.0
        if name in earth:
            shade = rng.uniform(0.9, 1.06)
            if poly.normal.z < -0.2:
                shade = 0.6
        if name in flat:
            shade = rng.uniform(0.94, 1.04)
        if name in dark:
            shade = 0.92
        horizontal = name in flat or (name in dark and poly.normal.z > 0.7)
        base, amp, noise_amp = (0.92, 0.08, 0.05) if horizontal else (0.74, 0.26, 0.10)
        for li in poly.loop_indices:
            co = mesh.vertices[mesh.loops[li].vertex_index].co
            grime = base + amp * max(0.0, min(1.0, co.z / 1.4))
            mottle = (1.0 - noise_amp) + noise_amp * (noise.noise(co * 0.35) * 0.5 + 0.5)
            c = grime * mottle * shade
            col.data[li].color = (c, c, c, 1.0)
    mesh.color_attributes.active_color = col
    mesh.color_attributes.render_color_index = mesh.color_attributes.find('Col')


def make_object(kit, kit_id, asset, lod, materials, tile, index, tint_sets):
    bm = kit.bm
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    used = sorted({f.material_index for f in bm.faces})
    remap = {old: new for new, old in enumerate(used)}
    for f in bm.faces:
        f.material_index = remap[f.material_index]
    kept = [kit.mats[i] for i in used]
    bm.normal_update()
    assign_uvs(bm, kept, tile)
    name = f'GEO-Arch_{kit_id}_{asset}_LOD{lod}'
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for mat in kept:
        mesh.materials.append(mat)
    tint(mesh, **tint_sets)
    obj = bpy.data.objects.new(name, mesh)
    col = bpy.data.collections.get(f'COL-Arch_{kit_id}_{asset}') or bpy.data.collections.new(
        f'COL-Arch_{kit_id}_{asset}')
    if col.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(col)
    col.objects.link(obj)
    obj.location.x = index * 60.0
    obj.location.y = lod * 60.0
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
            'bounds': {'min': [round(c, 3) for c in lo], 'max': [round(c, 3) for c in hi],
                       'size': [round(c, 3) for c in hi - lo]}}


def material_names(materials):
    return {key: value[0] for key, value in materials.items()}


def run_kit(*, kit, materials, tile, assets, budgets=None, confidence=None, sources,
            collision, export_dir, game_dir, source_blend, tint_sets=None, confidence_default='inferred'):
    """Build every piece twice, copy the GLBs into the game and write the manifests."""
    args = parse_args()
    only = [a for a in args.only.split(',') if a] or list(assets)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = build_materials(materials)
    order = list(materials)
    names = material_names(materials)
    os.makedirs(game_dir, exist_ok=True)
    budgets = budgets or {}
    confidence = confidence or {}
    tint_sets = {key: tuple(names[name] for name in value) for key, value in (tint_sets or {}).items()}
    failures = []
    for index, asset in enumerate(only):
        limit = budgets.get(asset, (LOD0_BUDGET, LOD1_BUDGET))
        manifest = {'asset_id': f'{kit}_{asset}', 'source_scene': f'scenes/{kit}_architecture_kit.blend',
                    'script': f'scripts/blender/build_{kit}_architecture_kit.py', 'scale': 1.0, 'up': 'Y',
                    'front': '+Z', 'pivot': 'footprint centre at ground level',
                    'collision': collision, 'confidence': confidence.get(asset, confidence_default),
                    'sources': sources, 'license': 'project-owned procedural geometry (no third-party asset)',
                    'budget': {'LOD0': limit[0], 'LOD1': limit[1]}, 'reviewed': False, 'lods': {}}
        for lod in (0, 1):
            built = assets[asset](mats, lod)
            obj = make_object(built, kit, asset, lod, names, tile, index, tint_sets)
            info = stats(obj)
            file = f'{kit}_{asset}_lod{lod}.glb'
            path = os.path.join(export_dir, file)
            export_glb(obj, path)
            shutil.copy2(path, os.path.join(game_dir, file))
            info['file'] = file
            info['bytes'] = os.path.getsize(path)
            manifest['lods'][f'LOD{lod}'] = info
            if info['triangles'] > limit[lod]:
                failures.append(f'{asset} LOD{lod}: {info["triangles"]} > {limit[lod]}')
            print(f'ARCH {asset} LOD{lod} tris={info["triangles"]} calls={info["draw_calls"]} '
                  f'size={info["bounds"]["size"]} bytes={info["bytes"]}')
        with open(os.path.join(export_dir, f'{kit}_{asset}_manifest.json'), 'w') as fh:
            json.dump(manifest, fh, indent=2)
            fh.write('\n')
    os.makedirs(os.path.dirname(source_blend), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=source_blend, compress=True)
    if failures:
        raise SystemExit('over budget: ' + '; '.join(failures))
