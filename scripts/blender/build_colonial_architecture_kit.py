"""Build the colonial architecture kit as LOD0/LOD1 GLBs: the plaza, church, cabildo and houses shared by
Lima (1535, 1821), Cusco (1780, 1814) and Miraflores (1881).

Pieces and their evidence (docs/historia/arquitectura.md, docs/design/colonial-site.md,
docs/historia/campanas/{lima,lima_1821,junta_cusco,miraflores,tupac_amaru}.md; Harth-Terré, *Contribución al
estudio de la arquitectura colonial*; Gutiérrez, *Arquitectura virreinal*):

- Cathedral. Documented: a nave of adobe/quincha with a tiled gable roof, an attached bell tower and arched
  doorways; it fronts the Plaza Mayor. Assumed: the 24 x 12 m footprint, the 17 m tower, the number of side
  windows, compressed for the RTS scale.
- Cabildo. Documented: the town hall stood on the plaza with an arcade below and a gallery above (Lima's
  cabildo; the Cusco cabildo of 1814). Assumed: five arches, the balcony, the roof.
- Casona. Documented: two-storey adobe/quincha houses with tiled roofs; Lima's closed wooden balconies over
  the street (the «balcón de cajón»). Assumed: bay count, balcony depth and window rhythm.
- Portal (arcade). Documented: the portales around the Plaza Mayor sheltered the shops. Assumed: bay count.
- Plaza. Documented: an open, paved square with a fountain. Assumed: paving pattern and kerb.
- Fountain. Documented: the colonial plaza fountain (the Lima pileta). Assumed: basin and column profile.
- Patio wall. Documented: adobe/quincha walls with a stone coping. Assumed: height and length.

Game-safe output follows the Caral/Cusco kits: Principled BSDF only, flat colours, irregularity in geometry
and a COLOR_0 tint, at most 8 materials for the whole kit. Units are game metres (a person is 1.86). +Z up in
Blender, exported Y-up; the front (doors, arcades) faces -Y in Blender, i.e. +Z in the game. Origin at the
footprint centre, ground level.

Run from the repository root:
  blender --background --python scripts/blender/build_colonial_architecture_kit.py -- [--only=casona]
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
EXPORT_DIR = os.path.join(ROOT, 'art-src', 'blender', 'exports', 'colonial', 'architecture')
GAME_DIR = os.path.join(ROOT, 'src', 'assets', 'architecture', 'colonial')
SOURCE_BLEND = os.path.join(ROOT, 'art-src', 'blender', 'scenes', 'colonial_architecture_kit.blend')

LOD0_BUDGET = 5000
LOD1_BUDGET = 1500
# The cathedral (nave, bell tower, atrium) is a monument piece and keeps the Caral Pyramid Mayor's allowance.
MONUMENT_BUDGET = (8000, 2400)


def hex_rgb(value):
    value = value.lstrip('#')
    return tuple(((int(value[i:i + 2], 16) / 255.0) ** 2.2) for i in (0, 2, 4))


MATERIALS = {
    'plaster': ('MAT-Arch_ColonialPlaster', hex_rgb('#e2d6bd'), 0.95),
    'adobe': ('MAT-Arch_ColonialAdobe', hex_rgb('#c9a878'), 0.96),
    'tile': ('MAT-Arch_ColonialTile', hex_rgb('#a5523a'), 0.9),
    'wood': ('MAT-Arch_ColonialWood', hex_rgb('#5a3b28'), 0.9),
    'stone': ('MAT-Arch_ColonialStone', hex_rgb('#9a958a'), 0.92),
    # The plaza floor has its own light paving set at runtime, so the kerb, fountain and bands keep the
    # wall stone and the floor does not inherit its dark mortar.
    'paving': ('MAT-Arch_ColonialPaving', hex_rgb('#b8a98f'), 0.95),
    'dark': ('MAT-Arch_ColonialDark', hex_rgb('#241b15'), 1.0),
}

TILE = {
    'MAT-Arch_ColonialPlaster': 2.6,
    'MAT-Arch_ColonialAdobe': 2.8,
    'MAT-Arch_ColonialTile': 1.4,
    'MAT-Arch_ColonialWood': 1.2,
    'MAT-Arch_ColonialStone': 2.2,
    'MAT-Arch_ColonialPaving': 4.0,
    'MAT-Arch_ColonialDark': 1.5,
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


def wall(kit, w, d, height, thick, front=(), sides=(), back=()):
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
        kit.slab(q0, q1, thick, opening_outline(length, height, openings), 'plaster')
        for uc, width, spring, rise in openings:
            ox, oz = p0[0] + dx * uc + nx * 0.02, p0[1] + dy * uc + ny * 0.02
            kit.box(ox, oz, 0.0, width, 0.06, spring + rise, 'dark')


def window(kit, face, u, z, width, height, side, w, d):
    """A dark window recess with a stone sill on one facade. `face` is 'front' (-Y), 'back' (+Y) or
    'side' (±X, `side` = -1/+1)."""
    if face == 'front':
        x, y, sx, sy = u, -d / 2 + 0.03, width, 0.08
    elif face == 'back':
        x, y, sx, sy = u, d / 2 - 0.03, width, 0.08
    else:
        x, y, sx, sy = side * (w / 2 - 0.03), u, 0.08, width
    kit.box(x, y, z, sx, sy, height, 'dark')
    kit.box(x, y, z - 0.08, sx + 0.16, sy + 0.08, 0.1, 'plaster')


def pyramid(kit, cx, cy, w, d, z, height, key):
    """A four-sided pyramid cap with a thin base slab."""
    base = [(cx - w / 2, cy - d / 2), (cx + w / 2, cy - d / 2), (cx + w / 2, cy + d / 2), (cx - w / 2, cy + d / 2)]
    kit.prism(base, z, z + 0.06, key)
    bv = [kit.bm.verts.new((x, y, z + 0.06)) for x, y in base]
    apex = kit.bm.verts.new((cx, cy, z + height))
    for i in range(4):
        j = (i + 1) % 4
        f = kit.bm.faces.new((bv[i], bv[j], apex))
        f.material_index = kit.mat(key)


def tile_roof(kit, w, d, eave_z, rise, overhang=0.55, end_overhang=0.35, thick=0.22):
    """A tiled gable roof along X: two thick slopes, a ridge tile and a slight sag at the eave."""
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
                    f.material_index = kit.mat('tile')
            for end in (0, segs):
                f = kit.bm.faces.new((tv[end], lv[end], lb[end], tb[end]))
                f.material_index = kit.mat('tile')
        kit.shell(slope)
    kit.prism([(-hx, -0.18), (hx, -0.18), (hx, 0.18), (-hx, 0.18)], ridge_z - 0.04, ridge_z + 0.14, 'tile')


def balcony(kit, w, y, z, depth=1.0, rail=1.0):
    """A closed wooden balcony («balcón de cajón») across a facade: floor, corbels, rails and panels."""
    kit.box(0.0, y - depth / 2, z, w, depth, 0.14, 'wood')
    for sx in (-1, 1):
        kit.box(sx * (w / 2 - 0.2), y - depth / 2, z - 0.45, 0.18, 0.45, 0.5, 'wood')
    kit.box(0.0, y - depth + 0.06, z + 0.14, w, 0.08, 0.08, 'wood')
    kit.box(0.0, y - depth + 0.06, z + rail, w, 0.1, 0.1, 'wood')
    count = 7 if kit.lod == 0 else 3
    for i in range(count):
        x = -w / 2 + w * (i + 0.5) / count
        kit.box(x, y - depth + 0.06, z + 0.2, 0.07, 0.07, rail - 0.06, 'wood')
    for sx in (-1, 1):
        kit.box(sx * (w / 2 - 0.04), y - depth / 2, z + 0.14, 0.08, depth, rail, 'wood')


def catedral(mats, lod):
    """Nave and bell tower with arched doorways, a tiled gable roof and a stone cross."""
    kit = Kit(mats, lod, 101)
    w, d, wall_h, thick = 24.0, 12.0, 8.5, 0.9
    # Wall coordinates run 0..w from the front-left corner; the tower covers u 1.3..6.7.
    front = [(13.0, 2.8, 3.4, 1.3), (8.0, 1.8, 2.6, 0.9), (18.0, 1.8, 2.6, 0.9)]
    wall(kit, w, d, wall_h, thick, front=front)
    for face, u in (('front', -9.0), ('front', 9.0), ('back', -6.0), ('back', 6.0)):
        window(kit, face, u, 5.2, 1.3, 2.2, 1, w, d)
    for side in (-1, 1):
        for u in (-6.0, 0.0, 6.0):
            window(kit, 'side', u, 5.2, 1.3, 2.2, side, w, d)
    tile_roof(kit, w, d, wall_h, 3.2, overhang=0.7, end_overhang=0.45)
    # Tower at the front-left, above the nave.
    tw, td, th = 5.4, 5.4, 17.0
    tx, ty = -8.0, -3.0
    kit.box(tx, ty, 0.0, tw, td, th, 'plaster')
    belfry = 11.2
    for side in (-1, 1):
        kit.box(tx + side * (tw / 2 - 0.03), ty, belfry, 0.06, 1.5, 2.6, 'dark')
        kit.box(tx, ty + side * (td / 2 - 0.03), belfry, 1.5, 0.06, 2.6, 'dark')
    for z in (th - 0.5, belfry - 0.35, wall_h - 0.4):
        kit.box(tx, ty, z, tw + 0.5, td + 0.5, 0.22, 'stone')
    pyramid(kit, tx, ty, tw + 0.6, td + 0.6, th - 0.4, 4.6, 'tile')
    kit.box(tx, ty, th + 4.25, 0.16, 0.16, 1.4, 'stone')
    kit.box(tx, ty, th + 4.75, 0.8, 0.14, 0.16, 'stone')
    return kit


def cabildo(mats, lod):
    """Two-storey town hall: five-arched arcade below, gallery and balcony above, tiled roof."""
    kit = Kit(mats, lod, 111)
    w, d, height, thick = 16.0, 9.0, 7.2, 0.8
    arches = [(w * (i + 0.5) / 5, 2.1, 2.3, 0.8) for i in range(5)]
    wall(kit, w, d, height, thick, front=arches)
    for i in range(5):
        window(kit, 'front', w * (i + 0.5) / 5 - w / 2, 4.5, 1.1, 1.5, 1, w, d)
    kit.box(0.0, 0.0, 3.6, w + 0.4, d + 0.4, 0.2, 'plaster')
    balcony(kit, 6.0, -d / 2 - 0.04, 3.8, depth=1.0)
    tile_roof(kit, w, d, height, 2.0, overhang=0.6)
    return kit


def casona(mats, lod):
    """A two-storey house with a closed wooden balcony over the street and a tiled gable roof."""
    kit = Kit(mats, lod, 121)
    w, d, storey, thick = 9.0, 8.0, 3.2, 0.7
    wall(kit, w, d, storey * 2, thick, front=[(w / 2, 1.5, 2.6, 0.0)])
    for u in (-3.2, 3.2):
        window(kit, 'front', u, 1.0, 1.0, 1.1, 1, w, d)
    for u in (-2.9, 2.9):
        window(kit, 'front', u, 4.5, 1.1, 1.4, 1, w, d)
    kit.box(0.0, 0.0, storey, w + 0.3, d + 0.3, 0.16, 'plaster')
    balcony(kit, 6.0, -d / 2 - 0.04, storey + 0.16, depth=1.0)
    tile_roof(kit, w, d, storey * 2, 1.9, overhang=0.55)
    return kit


def portal(mats, lod):
    """A covered arcade of four arches, open to the plaza, with a tiled roof."""
    kit = Kit(mats, lod, 131)
    w, d, height, thick = 10.0, 4.0, 4.4, 0.6
    arches = [(w * (i + 0.5) / 4, 2.0, 2.2, 0.7) for i in range(4)]
    wall(kit, w, d, height, thick, front=arches, back=[(w * (i + 0.5) / 4, 1.2, 2.4, 0.0) for i in range(4)])
    tile_roof(kit, w, d, height, 0.75, overhang=0.45)
    return kit


def plaza(mats, lod):
    """The Plaza Mayor floor: light paving inside a kerb of set stones."""
    kit = Kit(mats, lod, 141)
    w, d = 34.0, 26.0
    kit.box(0.0, 0.0, 0.0, w, d, 0.12, 'paving')
    for sx, sy, lx, ly in ((0, -1, w, 0.5), (0, 1, w, 0.5), (-1, 0, 0.5, d), (1, 0, 0.5, d)):
        kit.box(sx * (w / 2 - 0.25), sy * (d / 2 - 0.25), 0.0, lx, ly, 0.22, 'stone')
    return kit


def pileta(mats, lod):
    """The plaza fountain: octagonal basin, column, upper bowl and finial."""
    kit = Kit(mats, lod, 151)
    sides = 8
    ring = [(1.7 * math.cos(2 * math.pi * i / sides), 1.7 * math.sin(2 * math.pi * i / sides)) for i in range(sides)]
    kit.prism(ring, 0.0, 0.75, 'stone')
    inner = [(1.4 * math.cos(2 * math.pi * i / sides), 1.4 * math.sin(2 * math.pi * i / sides)) for i in range(sides)]
    kit.prism(inner, 0.69, 0.77, 'dark')
    kit.box(0.0, 0.0, 0.75, 0.5, 0.5, 1.5, 'stone')
    bowl = [(0.62 * math.cos(2 * math.pi * i / sides), 0.62 * math.sin(2 * math.pi * i / sides)) for i in range(sides)]
    kit.prism(bowl, 2.1, 2.35, 'stone')
    kit.prism([(0.2 * math.cos(2 * math.pi * i / sides), 0.2 * math.sin(2 * math.pi * i / sides)) for i in range(sides)],
              2.35, 2.95, 'stone')
    kit.prism([(0.06, 0.0), (0.0, -0.06), (-0.06, 0.0), (0.0, 0.06)], 2.95, 3.3, 'stone')
    return kit


def patio_wall(mats, lod):
    """A 10 m adobe wall with a stone coping, closing a patio or the atrium."""
    kit = Kit(mats, lod, 161)
    length, height, thick = 10.0, 2.3, 0.55
    kit.slab((-length / 2, 0.0), (length / 2, 0.0), thick,
             [(0, 0), (length, 0), (length, height), (0, height)], 'adobe')
    kit.box(0.0, 0.0, height, length + 0.08, thick + 0.08, 0.16, 'stone')
    return kit


ASSETS = {
    'catedral': catedral,
    'cabildo': cabildo,
    'casona': casona,
    'portal': portal,
    'plaza': plaza,
    'pileta': pileta,
    'patio_wall': patio_wall,
}

CONFIDENCE = {
    'catedral': 'inferred',
    'cabildo': 'inferred',
    'casona': 'documented',
    'portal': 'inferred',
    'plaza': 'documented',
    'pileta': 'documented',
    'patio_wall': 'documented',
}

BUDGET = {'catedral': MONUMENT_BUDGET}



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
    """COLOR_0 over the material: grime at the foot of the walls, a shade per roof tile and low-frequency
    weathering; openings and the undersides of the roofs stay dark. Horizontal paving and stone up-faces
    skip the wall-foot grime, which would make the plaza at z 0 read nearly black."""
    col = mesh.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    rng = random.Random(7)
    for poly in mesh.polygons:
        name = mesh.materials[poly.material_index].name
        shade = 1.0
        if name == 'MAT-Arch_ColonialTile':
            shade = rng.uniform(0.86, 1.06)
        if name == 'MAT-Arch_ColonialTile' and poly.normal.z < -0.2:
            shade = 0.55
        if name == 'MAT-Arch_ColonialPaving':
            shade = rng.uniform(0.94, 1.04)
        if name in ('MAT-Arch_ColonialWood', 'MAT-Arch_ColonialDark'):
            shade = 0.92
        # The paving is horizontal ground at z 0; the wall-foot grime would make the whole plaza nearly
        # black. Stone up-faces (kerb, bowls, copings) get the same reprieve, the verticals keep the dirt.
        horizontal = name == 'MAT-Arch_ColonialPaving' or (
            name == 'MAT-Arch_ColonialStone' and poly.normal.z > 0.7
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
    name = f'GEO-Arch_colonial_{asset}_LOD{lod}'
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for mat in kept:
        mesh.materials.append(mat)
    tint(mesh)
    obj = bpy.data.objects.new(name, mesh)
    col = bpy.data.collections.get(f'COL-Arch_colonial_{asset}') or bpy.data.collections.new(f'COL-Arch_colonial_{asset}')
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
        manifest = {'asset_id': f'colonial_{asset}', 'source_scene': 'scenes/colonial_architecture_kit.blend',
                    'script': 'scripts/blender/build_colonial_architecture_kit.py', 'scale': 1.0, 'up': 'Y',
                    'front': '+Z', 'pivot': 'footprint centre at ground level',
                    'collision': 'colonialCityBlockers(anchor) in src/model/defs/colonialCity.ts',
                    'confidence': CONFIDENCE[asset],
                    'sources': ['docs/historia/arquitectura.md', 'docs/design/colonial-site.md',
                                'docs/historia/campanas/lima.md', 'docs/historia/campanas/lima_1821.md',
                                'docs/historia/campanas/junta_cusco.md', 'docs/historia/campanas/miraflores.md'],
                    'license': 'project-owned procedural geometry (no third-party asset)',
                    'budget': {'LOD0': budgets[0], 'LOD1': budgets[1]}, 'reviewed': False, 'lods': {}}
        for lod in (0, 1):
            obj = build_object(asset, lod, mats)
            info = stats(obj)
            file = f'colonial_{asset}_lod{lod}.glb'
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
        with open(os.path.join(EXPORT_DIR, f'colonial_{asset}_manifest.json'), 'w') as fh:
            json.dump(manifest, fh, indent=2)
            fh.write('\n')
    os.makedirs(os.path.dirname(SOURCE_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=SOURCE_BLEND, compress=True)
    if failures:
        raise SystemExit('over budget: ' + '; '.join(failures))


if __name__ == '__main__':
    main()
