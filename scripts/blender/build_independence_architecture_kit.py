"""Build the Independence architecture kit as LOD0/LOD1 GLBs: the Ayacucho chapel and patriot camp
(m8_independencia) and the sierra-central camp of La Breña (m_brena).

Pieces and their evidence (docs/historia/arquitectura.md,
docs/historia/campanas/{independencia,brena}.md; docs/design/independence-site.md,
docs/design/independencia-model-mission.md, docs/design/brena-model-mission.md):

- Chapel. Documented: a rural Andean chapel with a nave, a bell tower and a tiled gable roof, fronting a
  small atrium. Assumed: the 14 x 8 m nave, the 8.5 m tower, the door/window rhythm, compressed for the RTS.
- Hacienda / camp store. Documented: the campaign's adobe/plaster buildings with tiled roofs and an arcade.
  Assumed: the three-arch porch and the 9 x 6 m footprint.
- Community house. Documented: highland adobe houses with flat earth roofs. Assumed: the 6 x 4 m module,
  the hearth and the parapet.
- Tent. Documented: campaign canvas tents. Assumed: the A-frame, ridge pole and pegs.
- Camp wall, parade ground, well and earthwork. Documented: the patriot camp's low walls, open ground and
  water; assumed: lengths and heights, and the earth bank's profile.

Game-safe output follows the Caral/Cusco/colonial/Republican kits: Principled BSDF only, flat colours,
irregularity in geometry and a COLOR_0 tint, at most 8 materials for the whole kit. Units are game metres (a
person is 1.86). +Z up in Blender, exported Y-up; the front (door, arcade) faces -Y in Blender, i.e. +Z in
the game. Origin at the footprint centre, ground level.

Run from the repository root:
  blender --background --python scripts/blender/build_independence_architecture_kit.py -- [--only=chapel]
"""

import json
import math
import os
import random
import shutil
import sys

import bmesh
import bpy
from mathutils import Vector, noise

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import arch_kit as ak  # noqa: E402  (shared plumbing; see arch_kit.py)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
EXPORT_DIR = os.path.join(ROOT, 'art-src', 'blender', 'exports', 'independence', 'architecture')
GAME_DIR = os.path.join(ROOT, 'src', 'assets', 'architecture', 'independence')
SOURCE_BLEND = os.path.join(ROOT, 'art-src', 'blender', 'scenes', 'independence_architecture_kit.blend')

LOD0_BUDGET = 5000
LOD1_BUDGET = 1500
# The chapel (nave, tower and atrium) is a monument piece and keeps the Caral Pyramid Mayor's allowance.
MONUMENT_BUDGET = (8000, 2400)


def hex_rgb(value):
    value = value.lstrip('#')
    return tuple(((int(value[i:i + 2], 16) / 255.0) ** 2.2) for i in (0, 2, 4))


MATERIALS = {
    'plaster': ('MAT-Arch_IndependencePlaster', hex_rgb('#e2d6bd'), 0.95),
    'adobe': ('MAT-Arch_IndependenceAdobe', hex_rgb('#c9a878'), 0.96),
    'tile': ('MAT-Arch_IndependenceTile', hex_rgb('#a5523a'), 0.9),
    'stone': ('MAT-Arch_IndependenceStone', hex_rgb('#9a958a'), 0.92),
    'wood': ('MAT-Arch_IndependenceWood', hex_rgb('#5a3b28'), 0.9),
    'canvas': ('MAT-Arch_IndependenceCanvas', hex_rgb('#cbbd9c'), 0.98),
    'earth': ('MAT-Arch_IndependenceEarth', hex_rgb('#a98a62'), 0.98),
    'dark': ('MAT-Arch_IndependenceDark', hex_rgb('#241b15'), 1.0),
}

TILE = {
    'MAT-Arch_IndependencePlaster': 2.6,
    'MAT-Arch_IndependenceAdobe': 2.8,
    'MAT-Arch_IndependenceTile': 1.4,
    'MAT-Arch_IndependenceStone': 2.4,
    'MAT-Arch_IndependenceWood': 1.2,
    'MAT-Arch_IndependenceCanvas': 1.6,
    'MAT-Arch_IndependenceEarth': 4.0,
    'MAT-Arch_IndependenceDark': 1.5,
}


parse_args = ak.parse_args  # shared helper


def build_materials():
    mats = {}
    for key, (name, color, rough) in MATERIALS.items():
        mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        bsdf.inputs['Base Color'].default_value = (*color, 1.0)
        bsdf.inputs['Roughness'].default_value = rough
        bsdf.inputs['Metallic'].default_value = 0.0
        mats[key] = mat
    return mats


class Kit:
    """A bmesh plus the material slots it uses, with the shared building helpers."""

    def __init__(self, mats, lod, seed):
        self.bm = bmesh.new()
        self.order = list(MATERIALS)
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
    """Four walls of a rectangular building; ground-level openings are real holes."""
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


def chapel(mats, lod):
    """The campaign chapel: a 14 x 8 m nave with a three-arch front, a tile gable roof, a bell tower and a
    stone cross."""
    kit = Kit(mats, lod, 401)
    w, d, height, thick = 14.0, 8.0, 4.4, 0.7
    # The long south side carries the door and two windows; the tower occupies its west end.
    front = [(9.0, 1.8, 2.3, 0.9), (4.6, 1.0, 2.4, 0.5), (12.4, 1.0, 2.4, 0.5)]
    wall(kit, w, d, height, thick, front=front, back=[(5.0, 1.0, 2.4, 0.5)], wall_key='plaster')
    for u in (-3.0, 0.0, 3.0):
        window(kit, 'side', u, 2.0, 1.0, 1.8, -1, w, d)
        window(kit, 'side', u, 2.0, 1.0, 1.8, 1, w, d)
    gable_roof(kit, w, d, height, 2.3, 'tile', overhang=0.65, end_overhang=0.4)
    # Stone base and a low plinth spray.
    kit.box(0.0, 0.0, 0.0, w + 0.25, d + 0.25, 0.35, 'stone')
    # Bell tower at the west end, rising through the roof.
    tw, td, th = 3.4, 3.4, 8.6
    tx, ty = -5.2, -1.4
    kit.box(tx, ty, 0.35, tw, td, th - 0.35, 'plaster')
    belfry = 6.2
    for side in (-1, 1):
        kit.box(tx + side * (tw / 2 - 0.03), ty, belfry, 0.06, 1.5, 2.2, 'dark')
        kit.box(tx, ty + side * (td / 2 - 0.03), belfry, 1.5, 0.06, 2.2, 'dark')
    for z in (th - 0.5, belfry - 0.35, height - 0.35):
        kit.box(tx, ty, z, tw + 0.55, td + 0.55, 0.22, 'stone')
    pyramid(kit, tx, ty, tw + 0.6, td + 0.6, th - 0.4, 2.2, 'tile')
    kit.box(tx, ty, th + 1.7, 0.16, 0.16, 1.3, 'stone')
    kit.box(tx, ty, th + 2.15, 0.75, 0.12, 0.14, 'stone')
    # Cross on the nave ridge.
    kit.box(2.0, 0.0, height + 2.2, 0.14, 0.14, 1.2, 'stone')
    kit.box(2.0, 0.0, height + 2.55, 0.62, 0.12, 0.12, 'stone')
    return kit


def hacienda(mats, lod):
    """A one-storey campaign hacienda/camp store: three-arch porch, tiled gable roof and a stone base."""
    kit = Kit(mats, lod, 411)
    w, d, height, thick = 9.0, 6.0, 4.2, 0.6
    arches = [(w * (i + 0.5) / 3, 1.6, 2.1, 0.5) for i in range(3)]
    wall(kit, w, d, height, thick, front=arches, back=[(w / 2, 0.8, 1.5, 0.0)], wall_key='plaster')
    kit.box(0.0, 0.0, 0.0, w + 0.2, d + 0.2, 0.35, 'stone')
    for u in (-3.0, 3.0):
        window(kit, 'side', u, 2.4, 0.9, 1.4, -1, w, d)
        window(kit, 'side', u, 2.4, 0.9, 1.4, 1, w, d)
    gable_roof(kit, w, d, height, 1.9, 'tile', overhang=0.55, end_overhang=0.35)
    return kit


def community_house(mats, lod):
    """A highland community house: adobe walls, a flat earth roof and a small hearth."""
    kit = Kit(mats, lod, 421)
    w, d, height, thick = 6.0, 4.0, 2.7, 0.5
    wall(kit, w, d, height, thick, front=[(w / 2, 1.2, 2.1, 0.0)], sides=[(1.6, 0.7, 1.5, 0.2)],
         wall_key='adobe')
    flat_roof(kit, w, d, height, 'earth', 'adobe')
    kit.box(0.0, -d / 2 - 0.02, 2.1, 1.5, 0.1, 0.2, 'wood')
    kit.box(w / 2 - 0.9, d / 2 - 0.25, 0.0, 0.9, 0.9, 1.3, 'adobe')
    kit.box(w / 2 - 0.9, d / 2 - 0.25, 1.3, 0.45, 0.45, 0.8, 'earth')
    return kit


def tent(mats, lod):
    """A campaign tent: a canvas A-frame on a ridge pole, with pegs and a dark entrance."""
    kit = Kit(mats, lod, 431)
    w, d, h = 3.0, 2.4, 2.2

    def build():
        a = kit.bm.verts.new((-w / 2, -d / 2, 0))
        b = kit.bm.verts.new((w / 2, -d / 2, 0))
        c = kit.bm.verts.new((w / 2, d / 2, 0))
        e = kit.bm.verts.new((-w / 2, d / 2, 0))
        f = kit.bm.verts.new((-w / 2, 0.0, h))
        g = kit.bm.verts.new((w / 2, 0.0, h))
        for quad in ((a, b, g, f), (e, f, g, c), (a, f, e), (b, c, g), (a, e, c, b)):
            face = kit.bm.faces.new(quad)
            face.material_index = kit.mat('canvas')

    kit.shell(build)
    kit.box(0.0, 0.0, h - 0.07, w + 0.2, 0.11, 0.1, 'wood')
    for x in (-w / 2 + 0.15, w / 2 - 0.15):
        for y in (-d / 2 + 0.15, d / 2 - 0.15):
            kit.cylinder(x, y, 0.0, 0.28, 0.05, 'wood', 4)
    # The entrance on the +X gable.
    kit.box(w / 2 + 0.02, 0.0, 0.0, 0.06, 0.9, 1.35, 'dark')
    return kit


def camp_wall(mats, lod):
    """A 10 m stone camp wall with a coping; the layout leaves the gate gaps between segments."""
    kit = Kit(mats, lod, 441)
    length, height, thick = 10.0, 1.2, 0.6
    kit.slab((-length / 2, 0.0), (length / 2, 0.0), thick,
             [(0, 0), (length, 0), (length, height), (0, height)], 'stone')
    kit.box(0.0, 0.0, height, length + 0.1, thick + 0.1, 0.16, 'stone')
    for i in range(3):
        kit.box(-length / 2 + length * (i + 0.5) / 3, 0.0, height + 0.16, 0.9, thick + 0.14, 0.18, 'stone')
    return kit


def parade_ground(mats, lod):
    """The camp parade ground: packed earth inside a stone kerb, walkable."""
    kit = Kit(mats, lod, 451)
    w, d = 24.0, 16.0
    kit.box(0.0, 0.0, 0.0, w, d, 0.12, 'earth')
    for sx, sy, lx, ly in ((0, 1, w, 0.45), (0, -1, w, 0.45), (-1, 0, 0.45, d), (1, 0, 0.45, d)):
        kit.box(sx * (w / 2 - 0.22), sy * (d / 2 - 0.22), 0.0, lx, ly, 0.2, 'stone')
    for x, y in ((-w / 2 + 1.0, -d / 2 + 1.0), (w / 2 - 1.0, -d / 2 + 1.0), (-w / 2 + 1.0, d / 2 - 1.0),
                 (w / 2 - 1.0, d / 2 - 1.0)):
        kit.box(x, y, 0.12, 0.45, 0.45, 0.5, 'stone')
    return kit


def well(mats, lod):
    """A stone well with two posts and a crossbar."""
    kit = Kit(mats, lod, 461)
    kit.cylinder(0.0, 0.0, 0.0, 0.9, 1.1, 'stone', 8)
    kit.cylinder(0.0, 0.0, 0.72, 0.92, 0.82, 'dark', 8)
    for x in (-0.9, 0.9):
        kit.box(x, 0.0, 0.0, 0.16, 0.16, 2.2, 'wood')
    kit.box(0.0, 0.0, 2.05, 2.0, 0.14, 0.14, 'wood')
    return kit


def earthwork(mats, lod):
    """A 10 m earth bank with a stone revetment on its front, for the camp's exposed side."""
    kit = Kit(mats, lod, 471)
    length, d, h = 10.0, 1.2, 1.0
    kit.box(0.0, 0.0, 0.0, length, d, h, 'earth')
    kit.slab((-length / 2, -d / 2), (length / 2, -d / 2), 0.24,
             [(0, 0), (length, 0), (length, h), (0, h)], 'stone')
    kit.box(0.0, 0.0, h, length + 0.15, d + 0.15, 0.12, 'stone')
    for i in range(3):
        kit.box(-length / 2 + length * (i + 0.5) / 3, 0.0, h + 0.12, 1.0, d + 0.2, 0.16, 'stone')
    return kit


ASSETS = {
    'chapel': chapel,
    'hacienda': hacienda,
    'community_house': community_house,
    'tent': tent,
    'camp_wall': camp_wall,
    'parade_ground': parade_ground,
    'well': well,
    'earthwork': earthwork,
}

CONFIDENCE = {
    'chapel': 'inferred',
    'hacienda': 'inferred',
    'community_house': 'documented',
    'tent': 'documented',
    'camp_wall': 'documented',
    'parade_ground': 'documented',
    'well': 'documented',
    'earthwork': 'inferred',
}

BUDGET = {'chapel': MONUMENT_BUDGET}


def assign_uvs(bm, materials):
    """Box-projected UVs at world scale, as in the Caral kit."""
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal
        size = TILE.get(materials[f.material_index].name, 3.0)
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


def tint(mesh):
    """COLOR_0 over the material: wall-foot grime, tile and canvas variation, and low-frequency mottle.
    Horizontal earth and stone up-faces skip the wall-foot grime."""
    col = mesh.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    rng = random.Random(7)
    for poly in mesh.polygons:
        name = mesh.materials[poly.material_index].name
        shade = 1.0
        if name == 'MAT-Arch_IndependenceTile':
            shade = rng.uniform(0.86, 1.06)
        if name == 'MAT-Arch_IndependenceTile' and poly.normal.z < -0.2:
            shade = 0.55
        if name == 'MAT-Arch_IndependenceCanvas':
            shade = rng.uniform(0.93, 1.05)
        if name == 'MAT-Arch_IndependenceEarth':
            shade = rng.uniform(0.94, 1.04)
        if name in ('MAT-Arch_IndependenceWood', 'MAT-Arch_IndependenceDark'):
            shade = 0.92
        horizontal = name == 'MAT-Arch_IndependenceEarth' or (
            name in ('MAT-Arch_IndependenceStone', 'MAT-Arch_IndependenceTile') and poly.normal.z > 0.7
        )
        base, amp, noise_amp = (0.92, 0.08, 0.05) if horizontal else (0.74, 0.26, 0.10)
        for li in poly.loop_indices:
            co = mesh.vertices[mesh.loops[li].vertex_index].co
            grime = base + amp * max(0.0, min(1.0, co.z / 1.4))
            mottle = (1.0 - noise_amp) + noise_amp * (noise.noise(co * 0.35) * 0.5 + 0.5)
            c = grime * mottle * shade
            col.data[li].color = (c, c, c, 1.0)
    mesh.color_attributes.active_color = col
    mesh.color_attributes.render_color_index = mesh.color_attributes.find('Col')


def build_object(asset, lod, mats):
    kit = ASSETS[asset](mats, lod)
    bm = kit.bm
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    used = sorted({f.material_index for f in bm.faces})
    remap = {old: new for new, old in enumerate(used)}
    for f in bm.faces:
        f.material_index = remap[f.material_index]
    kept = [kit.mats[i] for i in used]
    bm.normal_update()
    assign_uvs(bm, kept)
    name = f'GEO-Arch_independence_{asset}_LOD{lod}'
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for mat in kept:
        mesh.materials.append(mat)
    tint(mesh)
    obj = bpy.data.objects.new(name, mesh)
    col = bpy.data.collections.get(f'COL-Arch_independence_{asset}') or bpy.data.collections.new(
        f'COL-Arch_independence_{asset}')
    if col.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(col)
    col.objects.link(obj)
    obj.location.x = list(ASSETS).index(asset) * 60.0
    obj.location.y = lod * 60.0
    return obj


export_glb = ak.export_glb  # shared helper


stats = ak.stats  # shared helper


def main():
    args = parse_args()
    only = [a for a in args.only.split(',') if a] or list(ASSETS)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = build_materials()
    os.makedirs(GAME_DIR, exist_ok=True)
    failures = []
    for asset in only:
        budgets = BUDGET.get(asset, (LOD0_BUDGET, LOD1_BUDGET))
        manifest = {'asset_id': f'independence_{asset}', 'source_scene': 'scenes/independence_architecture_kit.blend',
                    'script': 'scripts/blender/build_independence_architecture_kit.py', 'scale': 1.0, 'up': 'Y',
                    'front': '+Z', 'pivot': 'footprint centre at ground level',
                    'collision': 'independenceCityBlockers / brenaCityBlockers in src/model/defs/independenceCity.ts',
                    'confidence': CONFIDENCE[asset],
                    'sources': ['docs/historia/arquitectura.md', 'docs/design/independence-site.md',
                                'docs/design/independencia-model-mission.md',
                                'docs/design/brena-model-mission.md',
                                'docs/historia/campanas/independencia.md', 'docs/historia/campanas/brena.md'],
                    'license': 'project-owned procedural geometry (no third-party asset)',
                    'budget': {'LOD0': budgets[0], 'LOD1': budgets[1]}, 'reviewed': False, 'lods': {}}
        for lod in (0, 1):
            obj = build_object(asset, lod, mats)
            info = stats(obj)
            file = f'independence_{asset}_lod{lod}.glb'
            path = os.path.join(EXPORT_DIR, file)
            export_glb(obj, path)
            shutil.copy2(path, os.path.join(GAME_DIR, file))
            info['file'] = file
            info['bytes'] = os.path.getsize(path)
            manifest['lods'][f'LOD{lod}'] = info
            if info['triangles'] > budgets[lod]:
                failures.append(f'{asset} LOD{lod}: {info["triangles"]} > {budgets[lod]}')
            print(f'ARCH {asset} LOD{lod} tris={info["triangles"]} calls={info["draw_calls"]} '
                  f'size={info["bounds"]["size"]} bytes={info["bytes"]}')
        with open(os.path.join(EXPORT_DIR, f'independence_{asset}_manifest.json'), 'w') as fh:
            json.dump(manifest, fh, indent=2)
            fh.write('\n')
    os.makedirs(os.path.dirname(SOURCE_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=SOURCE_BLEND, compress=True)
    if failures:
        raise SystemExit('over budget: ' + '; '.join(failures))


if __name__ == '__main__':
    main()
