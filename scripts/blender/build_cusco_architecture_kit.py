"""Build the Cusco architecture kit as LOD0/LOD1 GLBs: the Inca capital of 1532-1536 around the Haukaypata
plaza, and the zig-zag terraces of Sacsayhuamán above it.

Pieces and their evidence (docs/historia/civilizaciones/inca.md, docs/historia/campanas/cusco_1536.md;
Hyslop, *Inka Settlement Planning*; Gasparini & Margolies, *Inca Architecture*; Protzen, *Inca Architecture
and Construction at Ollantaytambo*):

- Kallanka (great hall) and wasi (house). Documented: rectangular plan, coursed cut-stone walls with a slight
  inward batter, trapezoidal doorways, adobe upper walls and gable ends, steep thatched (ichu) gable roofs;
  kallankas open on the plaza with several doorways. Assumed: sizes, door count, the height of the stone
  socle.
- Kancha wall. Documented: the city blocks were walled enclosures of cut stone with trapezoidal gateways.
  Assumed: segment length and height.
- Ushnu. Documented: a stepped stone platform on the plaza, reached by a stair, used as a seat of the Inca and
  for offerings. Assumed: tier count and proportions, the seat stone on top.
- Plaza floor. Documented: the Haukaypata was spread with sand. Assumed: the kerb.
- Sacsayhuamán. Documented: three superposed terraces with zig-zag fronts of very large polygonal stones
  facing the city, and towers on the summit (Muyuq Marka round, Sallaq Marka and Paucar Marka rectangular).
  Assumed: heights compressed for the RTS scale (9 m instead of ~18 m), one salient per 14 m section, the
  tower sizes, flat tower tops.

Game-safe output follows the Caral kit: Principled BSDF only, flat colours, irregularity in geometry and a
COLOR_0 tint, at most 8 materials for the whole kit. Units are game metres (a person is 1.86). +Z up in
Blender, exported Y-up; the front (doorways, stair, terrace faces) faces -Y in Blender, i.e. +Z in the game.
Origin at the footprint centre, ground level.

Run from the repository root:
  blender --background --python scripts/blender/build_cusco_architecture_kit.py -- [--only=kallanka]
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
EXPORT_DIR = os.path.join(ROOT, 'art-src', 'blender', 'exports', 'cusco', 'architecture')
GAME_DIR = os.path.join(ROOT, 'src', 'assets', 'architecture', 'cusco')
SOURCE_BLEND = os.path.join(ROOT, 'art-src', 'blender', 'scenes', 'cusco_architecture_kit.blend')

LOD0_BUDGET = 5000
LOD1_BUDGET = 1500
# A Sacsayhuamán section is a monument piece (three terraces and a tower); it keeps the Caral Pyramid
# Mayor's allowance.
MONUMENT_BUDGET = (8000, 2400)


def hex_rgb(value):
    value = value.lstrip('#')
    return tuple(((int(value[i:i + 2], 16) / 255.0) ** 2.2) for i in (0, 2, 4))


MATERIALS = {
    'ashlar': ('MAT-Arch_IncaAshlar', hex_rgb('#8f877c'), 0.9),
    'megalith': ('MAT-Arch_IncaMegalith', hex_rgb('#a9a294'), 0.92),
    'joint': ('MAT-Arch_IncaJoint', hex_rgb('#4a453f'), 0.98),
    'adobe': ('MAT-Arch_IncaAdobe', hex_rgb('#9a7a58'), 0.96),
    'thatch': ('MAT-Arch_IncaThatch', hex_rgb('#b49456'), 1.0),
    'earth': ('MAT-Arch_IncaEarth', hex_rgb('#7c6a4e'), 0.98),
    'sand': ('MAT-Arch_IncaSand', hex_rgb('#c2ad8a'), 0.97),
}

TILE = {
    'MAT-Arch_IncaAshlar': 2.4,
    'MAT-Arch_IncaMegalith': 3.2,
    'MAT-Arch_IncaJoint': 2.4,
    'MAT-Arch_IncaAdobe': 3.0,
    'MAT-Arch_IncaThatch': 1.4,
    'MAT-Arch_IncaEarth': 4.0,
    'MAT-Arch_IncaSand': 5.0,
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

    def face(self, verts, key):
        vs = [self.bm.verts.new(v) for v in verts]
        f = self.bm.faces.new(vs)
        f.material_index = self.mat(key)
        return f

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
        out = Vector((d.y, -d.x, 0))  # right-hand normal: the wall's outer side for a CCW building
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

    def stone(self, corners, normal, bulge, key):
        """One cushioned stone: the rim inset from the joint, the face pushed out. `corners` are four points
        on the wall plane (bottom-left, bottom-right, top-right, top-left seen from outside)."""
        c = sum(corners, Vector()) / 4
        inset = 0.035
        rim = [p + (c - p).normalized() * inset + normal * 0.03 for p in corners]
        if self.lod > 0:
            f = self.bm.faces.new([self.bm.verts.new(p) for p in rim])
            f.material_index = self.mat(key)
            return
        inner = [p + (c - p) * 0.28 + normal * bulge for p in rim]
        rv = [self.bm.verts.new(p) for p in rim]
        iv = [self.bm.verts.new(p) for p in inner]
        for i in range(4):
            j = (i + 1) % 4
            f = self.bm.faces.new((rv[i], rv[j], iv[j], iv[i]))
            f.material_index = self.mat(key)
        f = self.bm.faces.new(iv)
        f.material_index = self.mat(key)

    def coursed_face(self, p0, p1, z0, z1, key, course=0.42, width=(0.6, 1.1), bulge=0.05, batter=0.0,
                     gaps=(), skip_rows_above=None):
        """Coursed Inca ashlar on the outer face of the wall p0 -> p1 (CCW building): regular courses getting
        lower towards the top, stones of varied width, an inward batter. `gaps` are (u0(v), u1(v)) callables
        for doorways."""
        a = Vector((p0[0], p0[1], 0))
        d = Vector((p1[0] - p0[0], p1[1] - p0[1], 0))
        length = d.length
        d.normalize()
        out = Vector((d.y, -d.x, 0))
        z = z0
        row = 0
        while z < z1 - 0.12:
            h = min(course * max(0.7, 1.0 - 0.05 * row), z1 - z)
            zt = z + h
            vm = (z + zt) / 2 - z0
            spans = [(0.0, length)]
            for g0, g1 in gaps:
                lo_, hi_ = g0(vm), g1(vm)
                if lo_ >= hi_:
                    continue
                nxt = []
                for s0, s1 in spans:
                    if hi_ <= s0 or lo_ >= s1:
                        nxt.append((s0, s1))
                        continue
                    if lo_ > s0:
                        nxt.append((s0, lo_))
                    if hi_ < s1:
                        nxt.append((hi_, s1))
                spans = nxt
            for s0, s1 in spans:
                u = s0
                # Stagger the joints course by course.
                first = self.rng.uniform(*width) * (0.5 if row % 2 else 1.0)
                while u < s1 - 0.08:
                    w = first if u == s0 else self.rng.uniform(*width)
                    ue = min(s1, u + w)
                    if s1 - ue < 0.25:
                        ue = s1
                    lean0 = out * (-batter * (z - z0))
                    lean1 = out * (-batter * (zt - z0))
                    corners = [a + d * u + Vector((0, 0, z)) + lean0, a + d * ue + Vector((0, 0, z)) + lean0,
                               a + d * ue + Vector((0, 0, zt)) + lean1, a + d * u + Vector((0, 0, zt)) + lean1]
                    self.stone(corners, out, bulge, key)
                    u = ue
            z = zt
            row += 1

    def polygonal_face(self, p0, p1, z0, z1, key, bulge=0.12):
        """Sacsayhuamán's fitted polygonal megaliths on the outer face p0 -> p1: two or three rows whose
        joints wander, the largest stones at the foot."""
        a = Vector((p0[0], p0[1], 0))
        d = Vector((p1[0] - p0[0], p1[1] - p0[1], 0))
        length = d.length
        d.normalize()
        out = Vector((d.y, -d.x, 0))
        height = z1 - z0
        rows = [0.0, 0.58, 1.0] if height > 2.8 else [0.0, 1.0]
        rng = self.rng

        def bound(r, u):
            # The bed joint between two rows is one straight, tilted line: the stones above and below meet it
            # at different points, and only a straight joint gives them the same edge (a wavy one opens gaps).
            if r in (0, len(rows) - 1):
                return z0 + rows[r] * height
            tilt = 0.5 if (r + int(length)) % 2 else -0.5
            return z0 + rows[r] * height + tilt * (u / length - 0.5)

        for r in range(len(rows) - 1):
            # Joints of this row: positions along the wall and how far each one leans at the top. The first
            # and last joints are the wall's ends and stand upright; every stone shares its joints with its
            # neighbours, so no gap opens between them.
            big = (1.8, 3.0) if r == 0 else (1.1, 2.0)
            joints = [(0.0, 0.0)]
            u = 0.0
            while u < length - 0.1:
                u = min(length, u + rng.uniform(*big))
                if length - u < 0.7:
                    u = length
                joints.append((u, 0.0 if u >= length else rng.uniform(-0.25, 0.25)))
            for (u0, s0), (u1, s1) in zip(joints, joints[1:]):
                ut0, ut1 = max(0.0, u0 + s0), min(length, u1 + s1)
                corners = [a + d * u0 + Vector((0, 0, bound(r, u0))), a + d * u1 + Vector((0, 0, bound(r, u1))),
                           a + d * ut1 + Vector((0, 0, bound(r + 1, ut1))), a + d * ut0 + Vector((0, 0, bound(r + 1, ut0)))]
                self.stone(corners, out, bulge, key)

    def gable_roof(self, w, d, eave_z, rise, overhang=0.7, end_overhang=0.45, thick=0.32):
        """A steep ichu thatch gable along X: two thick slopes with a ragged, drooping eave and a ridge roll.
        Each slope is a closed slab, so Blender can orient it."""
        segs = 10 if self.lod == 0 else 2
        hx = w / 2 + end_overhang
        hy = d / 2 + overhang
        ridge_z = eave_z + rise
        eave_drop = overhang * rise / (d / 2)

        for side in (-1, 1):
            def slope(side=side):
                nrm = Vector((0, side * rise, d / 2)).normalized()
                under = -nrm * thick
                top = [Vector((-hx + 2 * hx * i / segs, 0.0, ridge_z)) for i in range(segs + 1)]
                low = [Vector((-hx + 2 * hx * i / segs, side * hy,
                               eave_z - eave_drop - (0.0 if self.lod else self.rng.uniform(-0.06, 0.08))))
                       for i in range(segs + 1)]
                tv = [self.bm.verts.new(p) for p in top]
                lv = [self.bm.verts.new(p) for p in low]
                tb = [self.bm.verts.new(p + under) for p in top]
                lb = [self.bm.verts.new(p + under) for p in low]
                for i in range(segs):
                    for quad in ((tv[i], tv[i + 1], lv[i + 1], lv[i]), (tb[i], lb[i], lb[i + 1], tb[i + 1]),
                                 (lv[i], lv[i + 1], lb[i + 1], lb[i]), (tv[i], tb[i], tb[i + 1], tv[i + 1])):
                        f = self.bm.faces.new(quad)
                        f.material_index = self.mat('thatch')
                for end in (0, segs):
                    f = self.bm.faces.new((tv[end], lv[end], lb[end], tb[end]))
                    f.material_index = self.mat('thatch')
            self.shell(slope)
        # Ridge roll of bound grass.
        self.prism([(-hx, -0.22), (hx, -0.22), (hx, 0.22), (-hx, 0.22)], ridge_z - 0.12, ridge_z + 0.16, 'thatch')


# ---------------------------------------------------------------------------------------------- pieces

def trapezoid_gap(u_center, bottom, top, height):
    """A trapezoidal doorway as two callables of the height above the wall foot."""
    def lo(v):
        if v > height:
            return 1e9
        return u_center - (bottom / 2 - (bottom - top) / 2 * (v / height))

    def hi(v):
        if v > height:
            return -1e9
        return u_center + (bottom / 2 - (bottom - top) / 2 * (v / height))
    return lo, hi


def door_outline(length, z_top, doors):
    """Wall outline in (u, v) with trapezoidal door notches cut into its foot."""
    pts = [(0.0, 0.0)]
    for uc, bottom, top, h in sorted(doors):
        pts += [(uc - bottom / 2, 0.0), (uc - top / 2, h), (uc + top / 2, h), (uc + bottom / 2, 0.0)]
    pts += [(length, 0.0), (length, z_top), (0.0, z_top)]
    return pts


def hall(kit, w, d, socle, wall_h, rise, door_count, thick=0.75):
    """Kallanka/wasi: stone socle with coursed ashlar outside, adobe above, adobe gable ends, ichu roof.
    Doorways on the front (-Y) wall."""
    hx, hy = w / 2, d / 2
    # Outer corners, counter-clockwise seen from above, starting at the front-left.
    c = [(-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy)]
    door_h, door_b, door_t = 1.95, 1.05, 0.8
    spacing = w / (door_count + 1)
    front_doors = [(spacing * (i + 1), door_b, door_t, door_h) for i in range(door_count)]
    for i in range(4):
        p0, p1 = c[i], c[(i + 1) % 4]
        length = math.dist(p0, p1)
        doors = front_doors if i == 0 else []
        # Inset each wall by half its thickness so the outer face sits on the footprint.
        dx, dy = (p1[0] - p0[0]) / length, (p1[1] - p0[1]) / length
        nx, ny = dy, -dx
        q0 = (p0[0] - nx * thick / 2, p0[1] - ny * thick / 2)
        q1 = (p1[0] - nx * thick / 2, p1[1] - ny * thick / 2)
        stone_doors = [(uc, b, t, min(h, socle)) for uc, b, t, h in doors]
        kit.slab(q0, q1, thick, door_outline(length, socle, stone_doors), 'joint')
        upper = [(0.0, socle), (length, socle), (length, wall_h), (0.0, wall_h)]
        if doors:
            # The doorway rises into the adobe: notch the upper slab from below.
            upper = [(0.0, socle)]
            for uc, b, t, h in sorted(doors):
                if h > socle:
                    k = (socle / h)
                    wb = b - (b - t) * k
                    upper += [(uc - wb / 2, socle), (uc - t / 2, h), (uc + t / 2, h), (uc + wb / 2, socle)]
            upper += [(length, socle), (length, wall_h), (0.0, wall_h)]
        kit.slab(q0, q1, thick * 0.92, upper, 'adobe')
        gaps = [trapezoid_gap(uc, b, t, h) for uc, b, t, h in doors]
        kit.coursed_face(p0, p1, 0.0, socle, 'ashlar', course=0.4, width=(0.55, 1.05), bulge=0.045,
                         batter=0.0, gaps=gaps)
        # A cut-stone lintel over each doorway.
        for uc, b, t, h in doors:
            a = Vector((p0[0], p0[1], 0))
            dv = Vector((dx, dy, 0))
            centre = a + dv * uc + Vector((nx, ny, 0)) * 0.02
            kit.box(centre.x, centre.y, h, t + 0.5, thick + 0.06, 0.28, 'ashlar')
    # Gable ends in adobe up to the ridge.
    for sx in (-1, 1):
        def gable(sx=sx):
            x = sx * (hx - thick / 2)
            tri = [(-hy + thick / 2, wall_h), (hy - thick / 2, wall_h), (0.0, wall_h + rise - 0.25)]
            f0 = [kit.bm.verts.new((x - thick / 2, y, z)) for y, z in tri]
            f1 = [kit.bm.verts.new((x + thick / 2, y, z)) for y, z in tri]
            for face in (f0, list(reversed(f1))):
                f = kit.bm.faces.new(face)
                f.material_index = kit.mat('adobe')
            for i in range(3):
                j = (i + 1) % 3
                f = kit.bm.faces.new((f0[i], f0[j], f1[j], f1[i]))
                f.material_index = kit.mat('adobe')
        kit.shell(gable)
    kit.gable_roof(w, d, wall_h, rise)


def kallanka(mats, lod):
    kit = Kit(mats, lod, 11)
    hall(kit, 20.0, 7.0, socle=1.7, wall_h=3.0, rise=3.1, door_count=4)
    return kit


def wasi(mats, lod):
    kit = Kit(mats, lod, 23)
    hall(kit, 9.0, 5.0, socle=1.5, wall_h=2.6, rise=2.4, door_count=1, thick=0.65)
    return kit


def kancha_wall(mats, lod):
    """A 12 m enclosure wall of coursed ashlar on both faces, battered, with a stone coping."""
    kit = Kit(mats, lod, 31)
    length, height, thick = 12.0, 2.4, 0.85
    kit.slab((-length / 2, 0.0), (length / 2, 0.0), thick, [(0, 0), (length, 0), (length, height), (0, height)], 'joint')
    kit.coursed_face((-length / 2, -thick / 2), (length / 2, -thick / 2), 0.0, height, 'ashlar', batter=0.02)
    kit.coursed_face((length / 2, thick / 2), (-length / 2, thick / 2), 0.0, height, 'ashlar', batter=0.02)
    for sx in (-1, 1):
        kit.coursed_face((sx * length / 2, -sx * thick / 2), (sx * length / 2, sx * thick / 2), 0.0, height,
                         'ashlar', width=(0.4, 0.45))
    kit.box(0.0, 0.0, height, length + 0.06, thick - 0.1, 0.16, 'ashlar')
    return kit


def ushnu(mats, lod):
    """Three battered tiers of coursed ashlar with a front stair and the Inca's seat stone on top."""
    kit = Kit(mats, lod, 41)
    tiers = [(20.0, 15.0), (16.0, 11.0), (12.0, 8.0)]
    tier_h = 1.35
    z = 0.0
    stair_w = 2.6
    for i, (w, d) in enumerate(tiers):
        hx, hy = w / 2, d / 2
        kit.box(0.0, 0.0, z, w - 0.1, d - 0.1, tier_h, 'joint', top_key='earth')
        c = [(-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy)]
        for j in range(4):
            p0, p1 = c[j], c[(j + 1) % 4]
            gaps = []
            if j == 0:
                # The stair cuts the front of every tier.
                mid = w / 2
                gaps = [(lambda v, m=mid: m - stair_w / 2, lambda v, m=mid: m + stair_w / 2)]
            kit.coursed_face(p0, p1, z, z + tier_h, 'ashlar', course=0.46, width=(0.8, 1.5), bulge=0.05,
                             batter=0.03, gaps=gaps)
        z += tier_h
    # Stair from the plaza to the top, one tread per 0.27 m.
    steps = int(round(z / 0.27))
    run = (tiers[0][1] - tiers[-1][1]) / 2
    for s in range(steps):
        y = -tiers[0][1] / 2 + run * s / steps
        kit.box(0.0, y + run / steps / 2 + 0.05, s * z / steps, stair_w, run / steps + 0.12, z / steps, 'ashlar')
    # Seat stone (tiana) and a low offering basin.
    kit.box(0.0, 1.2, z, 1.6, 0.9, 0.55, 'megalith')
    kit.box(0.0, 1.55, z + 0.55, 1.6, 0.25, 0.5, 'megalith')
    kit.box(0.0, -1.6, z, 1.1, 1.1, 0.25, 'joint')
    return kit


def plaza(mats, lod):
    """The Haukaypata floor: a sand spread inside a kerb of set stones."""
    kit = Kit(mats, lod, 51)
    w, d = 38.0, 30.0
    kit.box(0.0, 0.0, 0.0, w, d, 0.14, 'earth', top_key='sand')
    for sx, sy, lx, ly in ((0, -1, w, 0.45), (0, 1, w, 0.45), (-1, 0, 0.45, d), (1, 0, 0.45, d)):
        cx, cy = sx * (w / 2 - 0.22), sy * (d / 2 - 0.22)
        kit.box(cx, cy, 0.0, lx, ly, 0.24, 'ashlar')
    return kit


SECTION_W = 14.0
# Tier fronts (Blender y, front is -Y) at the section ends and at its salient, the height of each tier.
SACSAY_TIERS = [(-8.0, -10.5, 3.4), (-4.0, -6.2, 3.0), (0.0, -2.0, 2.6)]
SACSAY_BACK = 5.0


def sacsay_section(mats, lod, tower):
    """One 14 m section of the three zig-zag terraces, stacked; the summit carries a tower."""
    kit = Kit(mats, lod, 61 + (0 if tower == 'round' else 7))
    hx = SECTION_W / 2
    z = 0.0
    for front, salient, height in SACSAY_TIERS:
        # Counter-clockwise seen from above: along the zig-zag front, then back across the fill.
        outline = [(-hx, front), (0.0, salient), (hx, front), (hx, SACSAY_BACK), (-hx, SACSAY_BACK)]
        kit.prism(outline, z, z + height, 'joint', top_key='earth')
        kit.polygonal_face((-hx, front), (0.0, salient), z, z + height, 'megalith')
        kit.polygonal_face((0.0, salient), (hx, front), z, z + height, 'megalith')
        # A coping of flat stones along the parapet edge.
        for (ax, ay), (bx, by) in (((-hx, front), (0.0, salient)), ((0.0, salient), (hx, front))):
            mx, my = (ax + bx) / 2, (ay + by) / 2
            length = math.hypot(bx - ax, by - ay)
            yaw = math.atan2(by - ay, bx - ax)
            pts = []
            for su, sv in ((-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5)):
                u, v = su * length, sv * 0.7 + 0.25
                pts.append((mx + u * math.cos(yaw) - v * math.sin(yaw), my + u * math.sin(yaw) + v * math.cos(yaw)))
            kit.prism(pts, z + height, z + height + 0.18, 'megalith')
        z += height
    top_y = (SACSAY_TIERS[-1][0] + SACSAY_BACK) / 2 + 0.5
    if tower == 'round':
        # Muyuq Marka: a round tower of coursed ashlar on the summit.
        sides = 18 if lod == 0 else 10
        r, h = 3.1, 4.2
        ring = [(r * math.cos(2 * math.pi * i / sides), top_y + r * math.sin(2 * math.pi * i / sides)) for i in range(sides)]
        kit.prism(ring, z, z + h, 'joint', top_key='earth')
        for i in range(sides):
            p0, p1 = ring[i], ring[(i + 1) % sides]
            kit.coursed_face(p0, p1, z, z + h, 'ashlar', course=0.45, width=(0.9, 1.2), bulge=0.04)
        ring2 = [(x * 1.02, top_y + (y - top_y) * 1.02) for x, y in ring]
        kit.prism(ring2, z + h, z + h + 0.22, 'ashlar')
    elif tower == 'square':
        # Sallaq / Paucar Marka: a rectangular tower with a doorway on the front.
        w, d, h = 5.0, 5.0, 3.6
        hx2, hy2 = w / 2, d / 2
        kit.box(0.0, top_y, z, w - 0.08, d - 0.08, h, 'joint', top_key='earth')
        c = [(-hx2, top_y - hy2), (hx2, top_y - hy2), (hx2, top_y + hy2), (-hx2, top_y + hy2)]
        for j in range(4):
            gaps = [trapezoid_gap(w / 2, 1.0, 0.75, 1.9)] if j == 0 else []
            kit.coursed_face(c[j], c[(j + 1) % 4], z, z + h, 'ashlar', course=0.44, width=(0.8, 1.3), gaps=gaps)
        kit.box(0.0, top_y - hy2 - 0.02, z, 0.95, 0.12, 1.9, 'joint')
        kit.box(0.0, top_y, z + h, w + 0.1, d + 0.1, 0.2, 'ashlar')
    return kit


ASSETS = {
    'kallanka': kallanka,
    'wasi': wasi,
    'kancha_wall': kancha_wall,
    'ushnu': ushnu,
    'plaza': plaza,
    'sacsay_round': lambda mats, lod: sacsay_section(mats, lod, 'round'),
    'sacsay_square': lambda mats, lod: sacsay_section(mats, lod, 'square'),
}

CONFIDENCE = {
    'kallanka': 'documented',
    'wasi': 'documented',
    'kancha_wall': 'documented',
    'ushnu': 'inferred',
    'plaza': 'inferred',
    'sacsay_round': 'inferred',
    'sacsay_square': 'inferred',
}

BUDGET = {'sacsay_round': MONUMENT_BUDGET, 'sacsay_square': MONUMENT_BUDGET}


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
    """COLOR_0 over the material: grime at the foot of the walls, a per-stone shade so the cut blocks read
    individually, and low-frequency weathering; joints and the undersides of the thatch stay dark."""
    col = mesh.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    rng = random.Random(7)
    for poly in mesh.polygons:
        name = mesh.materials[poly.material_index].name
        shade = 1.0
        if name in ('MAT-Arch_IncaAshlar', 'MAT-Arch_IncaMegalith'):
            shade = rng.uniform(0.84, 1.08)
        if name == 'MAT-Arch_IncaThatch' and poly.normal.z < -0.2:
            shade = 0.55
        for li in poly.loop_indices:
            co = mesh.vertices[mesh.loops[li].vertex_index].co
            grime = 0.78 + 0.22 * max(0.0, min(1.0, co.z / 1.2))
            mottle = 0.9 + 0.1 * (noise.noise(co * 0.35) * 0.5 + 0.5)
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
    name = f'GEO-Arch_cusco_{asset}_LOD{lod}'
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for mat in kept:
        mesh.materials.append(mat)
    tint(mesh)
    obj = bpy.data.objects.new(name, mesh)
    col = bpy.data.collections.get(f'COL-Arch_cusco_{asset}') or bpy.data.collections.new(f'COL-Arch_cusco_{asset}')
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
        manifest = {'asset_id': f'cusco_{asset}', 'source_scene': 'scenes/cusco_architecture_kit.blend',
                    'script': 'scripts/blender/build_cusco_architecture_kit.py', 'scale': 1.0, 'up': 'Y',
                    'front': '+Z', 'pivot': 'footprint centre at ground level',
                    'collision': 'layoutBlockers(CUSCO_CITY_LAYOUT, CUSCO_KIT_FOOTPRINTS) in src/model/defs/cuscoCity.ts',
                    'confidence': CONFIDENCE[asset],
                    'sources': ['docs/historia/civilizaciones/inca.md', 'docs/historia/campanas/cusco_1536.md'],
                    'license': 'project-owned procedural geometry (no third-party asset)',
                    'budget': {'LOD0': budgets[0], 'LOD1': budgets[1]}, 'reviewed': False, 'lods': {}}
        for lod in (0, 1):
            obj = build_object(asset, lod, mats)
            info = stats(obj)
            file = f'cusco_{asset}_lod{lod}.glb'
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
        with open(os.path.join(EXPORT_DIR, f'cusco_{asset}_manifest.json'), 'w') as fh:
            json.dump(manifest, fh, indent=2)
            fh.write('\n')
    os.makedirs(os.path.dirname(SOURCE_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=SOURCE_BLEND, compress=True)
    if failures:
        raise SystemExit('over budget: ' + '; '.join(failures))


if __name__ == '__main__':
    main()
