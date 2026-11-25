"""Build the Republican architecture kit as LOD0/LOD1 GLBs: the Arica port terrace and battery, the Real
Felipe bastioned trace, and the Tarapacá adobe village.

Pieces and their evidence (docs/historia/arquitectura.md, docs/historia/campanas/guerra_del_pacifico.md,
docs/historia/campanas/real_felipe.md, docs/historia/campanas/tarapaca.md; docs/design/arica-site.md,
docs/design/real-felipe-model-mission.md, docs/design/tarapaca-model-mission.md):

- Battery. Documented: a low stone battery with gun positions on the port terrace. Assumed: the five gun
  embrasures, the terreplein and the small magazine, compressed for the RTS scale.
- Warehouse and pier. Documented: the port's storage and landing functions. Assumed: the warehouse bay
  count, the pier length and its piles.
- Real Felipe. Documented: a large bastioned fort of brick and stone with four corner bastions, a curtain
  wall and a dry ditch; the sally gates opened onto the esplanade. Assumed: the 24 m side, one magazine and
  the gate positions, compressed for the RTS scale; it is not a survey.
- Tarapacá village. Documented: an adobe village in the quebrada with a chapel, flat-roofed houses and a
  stone corral; Pachica was a hamlet on the road. Assumed: house sizes, roof pitch, the chapel's espadaña.
- Heights. Documented: a low trench/parapet line on the crest. Assumed: the segment length and the outcrops.

Game-safe output follows the Caral/Cusco/colonial kits: Principled BSDF only, flat colours, irregularity in
geometry and a COLOR_0 tint, at most 8 materials for the whole kit. Units are game metres (a person is
1.86). +Z up in Blender, exported Y-up; the front (guns, doors, arcades) faces -Y in Blender, i.e. +Z in the
game. Origin at the footprint centre, ground level.

Run from the repository root:
  blender --background --python scripts/blender/build_republic_architecture_kit.py -- [--only=battery]
"""

import argparse
import json
import math
import os
import random
import shutil
import sys

import bmesh
import bpy
from mathutils import Vector, noise

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
EXPORT_DIR = os.path.join(ROOT, 'art-src', 'blender', 'exports', 'republic', 'architecture')
GAME_DIR = os.path.join(ROOT, 'src', 'assets', 'architecture', 'republic')
SOURCE_BLEND = os.path.join(ROOT, 'art-src', 'blender', 'scenes', 'republic_architecture_kit.blend')

LOD0_BUDGET = 5000
LOD1_BUDGET = 1500
# The chapel (nave, espadaña and atrium) and a Real Felipe bastion are monument pieces; they keep the
# Caral Pyramid Mayor's allowance.
MONUMENT_BUDGET = (8000, 2400)


def hex_rgb(value):
    value = value.lstrip('#')
    return tuple(((int(value[i:i + 2], 16) / 255.0) ** 2.2) for i in (0, 2, 4))


MATERIALS = {
    'brick': ('MAT-Arch_RepublicBrick', hex_rgb('#a2604a'), 0.92),
    'stone': ('MAT-Arch_RepublicStone', hex_rgb('#b8b0a0'), 0.92),
    'adobe': ('MAT-Arch_RepublicAdobe', hex_rgb('#c9a878'), 0.96),
    'earth': ('MAT-Arch_RepublicEarth', hex_rgb('#a98a62'), 0.98),
    'wood': ('MAT-Arch_RepublicWood', hex_rgb('#6b4a33'), 0.9),
    'paving': ('MAT-Arch_RepublicPaving', hex_rgb('#b7a98f'), 0.95),
    'plaza': ('MAT-Arch_RepublicPlaza', hex_rgb('#b8a98f'), 0.95),
    'dark': ('MAT-Arch_RepublicDark', hex_rgb('#241b15'), 1.0),
}

TILE = {
    'MAT-Arch_RepublicBrick': 1.8,
    'MAT-Arch_RepublicStone': 2.4,
    'MAT-Arch_RepublicAdobe': 2.8,
    'MAT-Arch_RepublicEarth': 4.0,
    'MAT-Arch_RepublicWood': 1.2,
    'MAT-Arch_RepublicPaving': 4.0,
    'MAT-Arch_RepublicPlaza': 4.0,
    'MAT-Arch_RepublicDark': 1.5,
}


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', default='')
    return parser.parse_args(argv)


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

    def cylinder(self, cx, cy, z0, z1, radius, key, sides=8):
        ring = [(cx + radius * math.cos(2 * math.pi * i / sides), cy + radius * math.sin(2 * math.pi * i / sides))
                for i in range(sides)]
        self.prism(ring, z0, z1, key)

    def merlons(self, length, z, count, width, height, thickness, key, centre_y=0.0):
        """A crenellated parapet along X, from the wall top at `z`."""
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
    """Four walls of a rectangular building; ground-level openings are real holes, the outer face sits on
    the footprint. Openings are `(u_center, width, spring, rise)` in wall coordinates."""
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
    """A dark window recess with a stone sill on one facade."""
    if face == 'front':
        x, y, sx, sy = u, -d / 2 + 0.03, width, 0.08
    elif face == 'back':
        x, y, sx, sy = u, d / 2 - 0.03, width, 0.08
    else:
        x, y, sx, sy = side * (w / 2 - 0.03), u, 0.08, width
    kit.box(x, y, z, sx, sy, height, key)
    kit.box(x, y, z - 0.08, sx + 0.16, sy + 0.08, 0.1, frame)


def gable_roof(kit, w, d, eave_z, rise, key, overhang=0.55, end_overhang=0.35, thick=0.22, ridge_key=None):
    """A thick gable roof along X: two slopes and a ridge, for earth or thatch."""
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
    """A flat earth roof inside a low parapet, as in the quebrada houses."""
    kit.box(0.0, 0.0, z, w + 0.3, d + 0.3, thick, key)
    pw = 0.32
    for sx, sy, lx, ly in ((0, -1, w, pw), (0, 1, w, pw), (-1, 0, pw, d), (1, 0, pw, d)):
        kit.box(sx * (w / 2 - pw / 2), sy * (d / 2 - pw / 2), z + thick, lx, ly, height, parapet_key)


def crenellations(kit, length, z, count, width, height, thickness, key, centre_y=0.0):
    kit.merlons(length, z, count, width, height, thickness, key, centre_y)


def battery(mats, lod):
    """A low stone battery: a crenellated rampart, a terreplein with five guns, the magazine and the flag."""
    kit = Kit(mats, lod, 201)
    w, d, h = 13.0, 7.0, 2.4
    kit.box(0.0, 0.0, 0.0, w, d, 0.35, 'stone')
    # The rampart faces the sea (-Y in Blender), with the crenels as gun positions.
    kit.box(0.0, -2.55, 0.35, w, 1.7, 1.35, 'stone')
    crenellations(kit, w, 1.7, 6, 1.05, 0.75, 1.8, 'stone', centre_y=-2.55)
    kit.box(0.0, 0.35, 0.35, w - 0.6, 4.1, 0.5, 'stone')
    for i in range(5):
        x = -4.8 + i * 2.4
        kit.box(x, -1.35, 0.85, 0.95, 0.9, 0.5, 'wood')
        kit.box(x, -1.15, 1.2, 0.32, 1.5, 0.32, 'dark')
        kit.cylinder(x, -1.05, 1.05, 1.45, 0.26, 'dark', sides=6)
    # Magazine and stair at the back of the terreplein.
    kit.box(0.0, 2.25, 0.35, 4.2, 2.2, 1.35, 'stone')
    kit.box(0.0, 2.25, 1.7, 4.6, 2.6, 0.22, 'earth')
    kit.box(0.0, 3.35, 0.35, 2.4, 1.1, 0.7, 'stone')
    kit.box(-1.55, 2.25, 0.7, 0.08, 1.4, 0.9, 'dark')
    kit.cylinder(5.3, 2.2, 0.35, 6.0, 0.09, 'wood', sides=6)
    kit.box(5.95, 2.2, 4.9, 1.2, 0.06, 0.75, 'dark')
    return kit


def warehouse(mats, lod):
    """The port warehouse: adobe walls, a wide loading door, a gable earth roof and a timber lintel."""
    kit = Kit(mats, lod, 211)
    w, d, height, thick = 10.0, 6.0, 3.2, 0.6
    wall(kit, w, d, height, thick, front=[(w / 2, 2.6, 2.1, 0.7)], sides=[(2.6, 1.0, 1.2, 0.3)],
         wall_key='adobe')
    kit.box(0.0, -d / 2 - 0.02, 2.5, 3.2, 0.14, 0.28, 'wood')
    kit.box(-w / 2 + 0.04, 1.2, 1.5, 0.12, 1.6, 0.25, 'wood')
    gable_roof(kit, w, d, height, 1.55, 'earth', overhang=0.7, end_overhang=0.4)
    kit.box(3.2, -d / 2 - 0.02, 0.35, 1.2, 0.1, 1.5, 'wood')
    return kit


def pier(mats, lod):
    """A timber landing: a plank deck on piles, with bollards at the head. It is walkable (no footprint)."""
    kit = Kit(mats, lod, 221)
    length, width = 18.0, 4.0
    planks = 9 if kit.lod == 0 else 4
    for i in range(planks):
        y = -length / 2 + length * (i + 0.5) / planks
        kit.box(0.0, y, 0.48, width, length / planks - 0.04, 0.14, 'wood')
    for x in (-1.5, 1.5):
        for y in (-7.5, -2.5, 2.5, 7.5):
            kit.cylinder(x, y, -1.6, 0.55, 0.17, 'wood', sides=6)
    kit.box(0.0, length / 2 - 1.0, 0.62, width + 1.6, 2.2, 0.14, 'wood')
    for x in (-1.9, 1.9):
        kit.cylinder(x, length / 2 - 1.0, 0.62, 1.35, 0.15, 'dark', sides=6)
    return kit


def apron(mats, lod):
    """The paved port terrace: the apron that carries the battery and the warehouse, with a stone kerb."""
    kit = Kit(mats, lod, 231)
    w, d = 30.0, 22.0
    kit.box(0.0, 0.0, 0.0, w, d, 0.12, 'paving')
    for sx, sy, lx, ly in ((0, 1, w, 0.5), (-1, 0, 0.5, d), (1, 0, 0.5, d)):
        kit.box(sx * (w / 2 - 0.25), sy * (d / 2 - 0.25), 0.0, lx, ly, 0.22, 'stone')
    for i in range(5):
        kit.box(-w / 2 + 2 + i * 7, -d / 2 + 1.0, 0.12, 0.5, 0.5, 0.55, 'stone')
    return kit


def curtain(mats, lod):
    """One 12 m curtain wall of the Real Felipe: a battered stone base, brick body and crenellated parapet."""
    kit = Kit(mats, lod, 241)
    length, thick, h = 12.0, 1.7, 3.0
    kit.box(0.0, 0.0, 0.0, length, thick + 0.35, 0.6, 'stone')
    kit.box(0.0, 0.0, 0.6, length - 0.2, thick, h - 0.6, 'brick')
    kit.box(0.0, 0.0, h, length, thick + 0.2, 0.45, 'stone')
    crenellations(kit, length, h + 0.45, 5, 1.0, 0.65, thick + 0.25, 'brick')
    for x in (-3.0, 3.0):
        kit.box(x, -thick / 2 - 0.02, 1.25, 1.1, 0.08, 0.75, 'dark')
    return kit


def bastion(mats, lod):
    """A Real Felipe corner bastion: a pentagonal brick trace with a stone base and three embrasures."""
    kit = Kit(mats, lod, 251)
    outline = [(-5.0, -1.5), (0.0, -5.0), (5.0, -1.5), (4.5, 3.5), (-4.5, 3.5)]
    kit.prism(outline, 0.0, 0.6, 'stone')
    kit.prism([(x * 0.94, y * 0.94) for x, y in outline], 0.6, 3.0, 'brick')
    kit.prism([(x * 0.91, y * 0.91) for x, y in outline], 3.0, 3.5, 'stone')
    # Merlons around the parapet, one on the salient and one on each shoulder.
    for x, y in ((0.0, -4.5), (-4.0, -1.2), (4.0, -1.2), (-3.8, 2.8), (3.8, 2.8)):
        kit.box(x, y, 3.5, 1.1, 1.1, 0.65, 'brick')
    for x, y, ry in ((-2.6, -2.6, 0.6), (2.6, -2.6, -0.6)):
        kit.box(x, y, 1.6, 1.0, 0.12, 0.7, 'dark')
    return kit


def magazine(mats, lod):
    """The fort magazine: brick walls, a timber door and vents, under an earth-covered gable."""
    kit = Kit(mats, lod, 261)
    w, d, height, thick = 8.0, 6.0, 2.6, 0.6
    wall(kit, w, d, height, thick, front=[(4.0, 1.6, 2.0, 0.4)], sides=[(1.6, 0.7, 1.5, 0.0)],
         back=[(4.0, 0.7, 1.5, 0.0)], wall_key='brick')
    kit.box(0.0, -d / 2 - 0.02, 2.0, 2.0, 0.1, 0.24, 'wood')
    gable_roof(kit, w, d, height, 1.0, 'earth', overhang=0.35, end_overhang=0.25, thick=0.35)
    return kit


def fort_plaza(mats, lod):
    """The fort courtyard: paved, with a stone kerb. Walkable; the well is its own piece."""
    kit = Kit(mats, lod, 271)
    w, d = 30.0, 24.0
    kit.box(0.0, 0.0, 0.0, w, d, 0.12, 'plaza')
    for sx, sy, lx, ly in ((0, -1, w, 0.5), (0, 1, w, 0.5), (-1, 0, 0.5, d), (1, 0, 0.5, d)):
        kit.box(sx * (w / 2 - 0.25), sy * (d / 2 - 0.25), 0.0, lx, ly, 0.22, 'stone')
    return kit


def well(mats, lod):
    """A stone well with two posts and a crossbar, on the fort courtyard."""
    kit = Kit(mats, lod, 281)
    kit.cylinder(0.0, 0.0, 0.0, 0.9, 1.1, 'stone', sides=8)
    kit.cylinder(0.0, 0.0, 0.72, 0.92, 0.82, 'dark', sides=8)
    for x in (-0.9, 0.9):
        kit.box(x, 0.0, 0.0, 0.16, 0.16, 2.2, 'wood')
    kit.box(0.0, 0.0, 2.05, 2.0, 0.14, 0.14, 'wood')
    return kit


def chapel(mats, lod):
    """The quebrada chapel: adobe nave, earth roof and an espadaña with a dark bell opening."""
    kit = Kit(mats, lod, 291)
    w, d, height, thick = 7.0, 10.0, 3.4, 0.6
    wall(kit, w, d, height, thick, front=[(w / 2, 1.7, 2.2, 0.9)], sides=[(5.0, 0.9, 1.6, 0.3)],
         wall_key='adobe')
    gable_roof(kit, w, d, height, 1.5, 'earth', overhang=0.65, end_overhang=0.4)
    # The espadaña rises over the front wall, its opening facing the street.
    kit.box(0.0, -d / 2 + 0.15, height + 0.2, 2.4, 0.6, 2.2, 'adobe')
    kit.box(0.0, -d / 2 - 0.18, height + 1.1, 1.2, 0.14, 1.0, 'dark')
    kit.box(0.0, -d / 2 + 0.15, height + 2.4, 2.8, 0.8, 0.22, 'stone')
    kit.box(0.0, -d / 2 + 0.15, height + 2.62, 0.14, 0.14, 0.7, 'stone')
    kit.box(0.0, -d / 2 + 0.15, height + 2.95, 0.7, 0.12, 0.12, 'stone')
    return kit


def adobe_house(mats, lod):
    """A flat-roofed quebrada house: adobe walls, a low parapet and a shaded door."""
    kit = Kit(mats, lod, 301)
    w, d, height, thick = 8.0, 6.0, 2.8, 0.55
    wall(kit, w, d, height, thick, front=[(w / 2, 1.4, 2.2, 0.0)], sides=[(2.0, 0.8, 1.4, 0.2)],
         wall_key='adobe')
    flat_roof(kit, w, d, height, 'earth', 'adobe')
    kit.box(0.0, -d / 2 - 0.02, 2.2, 1.8, 0.1, 0.22, 'wood')
    # A small outdoor hearth and chimney at the back corner (adobe, to keep the piece at four materials).
    kit.box(w / 2 - 1.2, d / 2 - 0.3, 0.0, 1.0, 1.0, 1.4, 'adobe')
    kit.box(w / 2 - 1.2, d / 2 - 0.3, 1.4, 0.5, 0.5, 0.9, 'earth')
    return kit


def corral_wall(mats, lod):
    """A 10 m stone corral wall, low enough to read as a pen rather than a fort."""
    kit = Kit(mats, lod, 311)
    length, height, thick = 10.0, 1.1, 0.6
    kit.slab((-length / 2, 0.0), (length / 2, 0.0), thick,
             [(0, 0), (length, 0), (length, height), (0, height)], 'stone')
    for i in range(3):
        kit.box(-length / 2 + length * (i + 0.5) / 3, 0.0, height, 0.9, thick + 0.12, 0.16, 'stone')
    return kit


def parapet(mats, lod):
    """A 20 m stone parapet for the Tarapacá heights. It carries no ditch: the long thin strip would
    sample the crest's downhill slope and sink the wall, so the wall alone conforms to the crest."""
    kit = Kit(mats, lod, 321)
    length, height, thick = 20.0, 1.4, 0.9
    kit.slab((-length / 2, 0.0), (length / 2, 0.0), thick,
             [(0, 0), (length, 0), (length, height), (0, height)], 'stone')
    for i in range(5):
        kit.box(-length / 2 + length * (i + 0.5) / 5, 0.0, height, 1.0, thick + 0.1, 0.2, 'stone')
    return kit


def outcrop(mats, lod):
    """A low rock outcrop that gives the crest a defensible silhouette."""
    kit = Kit(mats, lod, 331)
    outline = [(-1.6, -1.3), (-0.9, -1.5), (0.4, -1.2), (1.5, -0.6), (1.3, 0.7), (0.5, 1.3),
               (-0.7, 1.2), (-1.5, 0.5)]
    kit.prism(outline, 0.0, 1.6, 'stone')
    kit.prism([(x * 0.62 + 0.9, y * 0.62 + 0.2) for x, y in outline], 0.0, 1.0, 'stone')
    return kit


ASSETS = {
    'battery': battery,
    'warehouse': warehouse,
    'pier': pier,
    'apron': apron,
    'curtain': curtain,
    'bastion': bastion,
    'magazine': magazine,
    'fort_plaza': fort_plaza,
    'well': well,
    'chapel': chapel,
    'adobe_house': adobe_house,
    'corral_wall': corral_wall,
    'parapet': parapet,
    'outcrop': outcrop,
}

CONFIDENCE = {
    'battery': 'inferred',
    'warehouse': 'inferred',
    'pier': 'inferred',
    'apron': 'documented',
    'curtain': 'inferred',
    'bastion': 'inferred',
    'magazine': 'inferred',
    'fort_plaza': 'documented',
    'well': 'inferred',
    'chapel': 'inferred',
    'adobe_house': 'documented',
    'corral_wall': 'documented',
    'parapet': 'inferred',
    'outcrop': 'documented',
}

BUDGET = {'chapel': MONUMENT_BUDGET, 'bastion': MONUMENT_BUDGET}


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
    """COLOR_0 over the material: grime at the foot of the walls, weather variation per roof and a
    low-frequency mottle. Horizontal paving and stone up-faces skip the wall-foot grime."""
    col = mesh.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    rng = random.Random(7)
    for poly in mesh.polygons:
        name = mesh.materials[poly.material_index].name
        shade = 1.0
        if name == 'MAT-Arch_RepublicEarth':
            shade = rng.uniform(0.9, 1.06)
        if name == 'MAT-Arch_RepublicEarth' and poly.normal.z < -0.2:
            shade = 0.6
        if name in ('MAT-Arch_RepublicPaving', 'MAT-Arch_RepublicPlaza'):
            shade = rng.uniform(0.94, 1.04)
        if name in ('MAT-Arch_RepublicWood', 'MAT-Arch_RepublicDark'):
            shade = 0.92
        horizontal = name in ('MAT-Arch_RepublicPaving', 'MAT-Arch_RepublicPlaza') or (
            name == 'MAT-Arch_RepublicStone' and poly.normal.z > 0.7
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
    name = f'GEO-Arch_republic_{asset}_LOD{lod}'
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for mat in kept:
        mesh.materials.append(mat)
    tint(mesh)
    obj = bpy.data.objects.new(name, mesh)
    col = bpy.data.collections.get(f'COL-Arch_republic_{asset}') or bpy.data.collections.new(f'COL-Arch_republic_{asset}')
    if col.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(col)
    col.objects.link(obj)
    obj.location.x = list(ASSETS).index(asset) * 60.0
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


def main():
    args = parse_args()
    only = [a for a in args.only.split(',') if a] or list(ASSETS)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = build_materials()
    os.makedirs(GAME_DIR, exist_ok=True)
    failures = []
    for asset in only:
        budgets = BUDGET.get(asset, (LOD0_BUDGET, LOD1_BUDGET))
        manifest = {'asset_id': f'republic_{asset}', 'source_scene': 'scenes/republic_architecture_kit.blend',
                    'script': 'scripts/blender/build_republic_architecture_kit.py', 'scale': 1.0, 'up': 'Y',
                    'front': '+Z', 'pivot': 'footprint centre at ground level',
                    'collision': 'republicCityBlockers in src/model/defs/republicCity.ts',
                    'confidence': CONFIDENCE[asset],
                    'sources': ['docs/historia/arquitectura.md', 'docs/design/arica-site.md',
                                'docs/design/real-felipe-model-mission.md', 'docs/design/tarapaca-model-mission.md',
                                'docs/historia/campanas/guerra_del_pacifico.md',
                                'docs/historia/campanas/real_felipe.md', 'docs/historia/campanas/tarapaca.md'],
                    'license': 'project-owned procedural geometry (no third-party asset)',
                    'budget': {'LOD0': budgets[0], 'LOD1': budgets[1]}, 'reviewed': False, 'lods': {}}
        for lod in (0, 1):
            obj = build_object(asset, lod, mats)
            info = stats(obj)
            file = f'republic_{asset}_lod{lod}.glb'
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
        with open(os.path.join(EXPORT_DIR, f'republic_{asset}_manifest.json'), 'w') as fh:
            json.dump(manifest, fh, indent=2)
            fh.write('\n')
    os.makedirs(os.path.dirname(SOURCE_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=SOURCE_BLEND, compress=True)
    if failures:
        raise SystemExit('over budget: ' + '; '.join(failures))


if __name__ == '__main__':
    main()
