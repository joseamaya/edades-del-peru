"""Build the Caral architecture kit (art-direction.md §9) as LOD0/LOD1 GLBs: the Sacred City in use
(c. 2600-2000 BC), not today's ruins.

Pieces and their evidence (docs/historia/campanas/caral.md, docs/historia/civilizaciones/caral.md):

- Pyramid Mayor in four states. Documented: stepped superposed platforms, stone retaining walls,
  shicra (reed-net bag) fill, plastered and painted walls, a central stair, the sacred-fire altar of the
  Pyramid Mayor, construction in phases. Inferred: the paint colour per phase (white early, yellow
  ochre later; the dossier documents colour changing by period). Assumed: platform count and
  proportions (compressed per art-direction §3), the summit enclosure (``atrium``) form, the altar
  form. No scaffolding: none is attested; the art direction asks for scaffold-free shicra piles.
- Smaller pyramid (one shape scaled per building in the game). Same evidence as above.
- Sunken circular plaza. Documented (circular sunken plazas, the largest at the Amphitheatre).
  Assumed: rim, step count and stair layout.
- Quincha houses. Documented: walls of posts woven with caña brava, plastered with mud and painted;
  the upper-half residence larger than the lower-half one; refuse and cooking pits beside dwellings.
  Assumed: plan sizes, doorway, the partial cane-mat roof, the elite house's low stone platform.
- Áspero house. Documented: cotton nets and gourd floats. Assumed: the drying rack and its place.
- Fair tent. Documented: postholes of temporary tents in the open plazas. Assumed: the frame and the
  reed-mat cover (the covering material is not documented).

Game-safe output: Principled BSDF only, flat colours (no textures), irregularity in geometry noise and
a COLOR_0 tint (darker near the ground and per face), at most 8 materials for the whole kit. Units are
game units (a person is 1.86, the Pyramid Mayor ~7.3 P tall); +Z up in Blender, exported Y-up; the
front (stairs, doors) faces -Y in Blender, i.e. +Z in the game. Origin at the footprint centre, ground
level.

Run from the repository root:
  blender --background --python scripts/blender/build_caral_architecture_kit.py -- [--only=pyramid_mayor]
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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_caral_slice as slice_kit  # noqa: E402  (shared bmesh helpers and palette)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
EXPORT_DIR = os.path.join(ROOT, 'art-src', 'blender', 'exports', 'caral', 'architecture')
GAME_DIR = os.path.join(ROOT, 'src', 'assets', 'architecture', 'caral')
SOURCE_BLEND = os.path.join(ROOT, 'art-src', 'blender', 'scenes', 'caral_architecture_kit.blend')

PAL = slice_kit.PAL
hex_rgb = slice_kit.hex_rgb

# blender-game-assets contract: LOD0 <= 5k triangles per building, LOD1 <= 1.5k.
LOD0_BUDGET = 5000
LOD1_BUDGET = 1500

# Pyramid Mayor: footprint of the game's heritage volume (43.4 x 39.8), height ~7.6 people.
MAYOR_W, MAYOR_D = 43.0, 39.0
MAYOR_LEVELS = 5
# Quincha wall heights (art-direction §3: 1.3-1.5 people); recorded in the manifests.
WALL_H = {'common': 2.5, 'elite': 2.7, 'aspero': 2.4}
MAYOR_LEVEL_H = 2.7


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', default='')
    return parser.parse_args(argv)


# ----------------------------------------------------------------------- materials

MATERIALS = {
    # Documented paint colours (dossier); which building wears which is inferred.
    'plaster_early': ('MAT-Arch_PlasterWhite', PAL['plaster_early'], 0.92),
    'plaster_ochre': ('MAT-Arch_PlasterOchre', PAL['ochre'], 0.9),
    'plaster_red': ('MAT-Arch_PlasterRed', PAL['red'], 0.9),
    'stone': ('MAT-Arch_Stone', PAL['stone'], 0.95),
    'shicra': ('MAT-Arch_Shicra', hex_rgb('#8c7650'), 0.97),
    'earth': ('MAT-Arch_Earth', PAL['gravel'], 0.98),
    'wood': ('MAT-Arch_Wood', PAL['wood'], 0.9),
    'cane': ('MAT-Arch_CaneMat', PAL['cane'], 0.95),
}


def build_materials():
    mats = {}
    for key, (name, color, rough) in MATERIALS.items():
        mat, nt, bsdf = slice_kit.new_mat(name)
        bsdf.inputs['Base Color'].default_value = (*color, 1)
        bsdf.inputs['Roughness'].default_value = rough
        bsdf.inputs['Metallic'].default_value = 0.0
        # Woven cane mats and nets are thin planes: double-sided (skill contract).
        mat.use_backface_culling = key != 'cane'
        mats[key] = mat
    return mats


# ------------------------------------------------------------------------ geometry


def rough_box(bm, center, size, mat, cuts, amp, seed, batter=0.0):
    """Hand-built mass: a subdivided box with noisy surfaces and inward-leaning walls (batter)."""
    tmp = bmesh.new()
    bmesh.ops.create_cube(tmp, size=1.0)
    if cuts:
        bmesh.ops.subdivide_edges(tmp, edges=list(tmp.edges), cuts=cuts, use_grid_fill=True)
    off = Vector((seed * 3.1, seed * 1.7, seed * 0.9))
    for v in tmp.verts:
        x, y, z = v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]
        k = 1.0 - batter * (z / size[2] + 0.5)
        p = Vector((x * k, y * k, z))
        if amp:
            w = Vector((noise.noise(p * 0.22 + off), noise.noise(p * 0.22 + off + Vector((7, 0, 0))),
                        noise.noise(p * 0.22 + off + Vector((0, 7, 0))) * 0.35)) * amp
            p = p + w
        v.co = p + Vector(center)
    vmap = {v: bm.verts.new(v.co) for v in tmp.verts}
    for f in tmp.faces:
        nf = bm.faces.new([vmap[v] for v in f.verts])
        nf.material_index = mat
    tmp.free()


def box(bm, center, size, mat):
    rough_box(bm, center, size, mat, 0, 0.0, 0)


def stair(bm, x, y_front, y_back, z0, z1, width, steps, mat):
    """Straight flight from (y_front, z0) up to (y_back, z1); each step is a solid block to the ground."""
    run = (y_back - y_front) / steps
    rise = (z1 - z0) / steps
    for s in range(steps):
        top = z0 + rise * (s + 1)
        box(bm, (x, y_front + run * (s + 0.5), (z0 + top) / 2 - 0.3), (width, abs(run) + 0.02, top - z0 + 0.6), mat)


def ramp(bm, x, y_front, y_back, z0, z1, width, mat):
    """LOD1 stair: one sloped wedge."""
    v = [bm.verts.new(c) for c in (
        (x - width / 2, y_front, z0), (x + width / 2, y_front, z0), (x + width / 2, y_back, z0),
        (x - width / 2, y_back, z0), (x - width / 2, y_back, z1), (x + width / 2, y_back, z1))]
    for idx in ((0, 1, 5, 4), (1, 2, 5), (0, 4, 3), (4, 5, 2, 3)):
        bm.faces.new([v[i] for i in idx]).material_index = mat


def bag_pile(bm, center, count, spread, seed, mat, segs=6, rings=4):
    """Shicra bags heaped and waiting to be laid (fill documented; piles' placement assumed)."""
    rng = random.Random(seed)
    for k in range(count):
        a = rng.random() * math.tau
        r = rng.random() * spread
        z = 0.15 + (spread - r) * 0.35 + rng.random() * 0.12
        blob(bm, (center[0] + math.cos(a) * r, center[1] + math.sin(a) * r, center[2] + z),
             (0.34, 0.27, 0.22), segs, rings, 0.18, seed + k, mat)


def blob(bm, center, radii, segs, rings, jitter, seed, mat):
    rng = random.Random(seed)
    res = bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0)
    for v in res['verts']:
        k = 1.0 + jitter * (rng.random() * 2 - 1)
        v.co = Vector((v.co.x * radii[0] * k, v.co.y * radii[1] * k, v.co.z * radii[2] * k)) + Vector(center)
    for f in {f for v in res['verts'] for f in v.link_faces}:
        f.material_index = mat


def fill_bags(bm, x0, x1, y0, y1, z, height, count, seed, mat, segs=6, rings=4, lod=0):
    """Shicra fill in a walled cell: the laid bags read as one lumpy mass that is higher at the west end
    (work in progress), with loose bags on its surface so the bag texture shows up close."""
    rng = random.Random(seed)
    strips = 4 if lod == 0 else 2
    for k in range(strips):
        sx0 = x0 + (x1 - x0) * k / strips
        sx1 = x0 + (x1 - x0) * (k + 1) / strips
        h = max(0.25, height * (1.0 - (k + 0.5) / strips) + 0.25)
        rough_box(bm, ((sx0 + sx1) / 2, (y0 + y1) / 2, z + h / 2), (sx1 - sx0 + 0.1, y1 - y0 - 0.5, h), mat,
                  2 if lod == 0 else 0, 0.22 if lod == 0 else 0.0, seed + k)
    for k in range(count):
        t = rng.random()
        x = x0 + (x1 - x0) * t
        y = rng.uniform(y0 + 0.6, y1 - 0.6)
        top = z + max(0.25, height * (1.0 - t) + 0.25)
        blob(bm, (x, y, top + 0.1), (0.62, 0.48, 0.34), segs, rings, 0.18, seed + k, mat)


def retaining_wall(bm, x0, y0, x1, y1, z, courses_at, thick, seed, mat, lod):
    """Stone retaining wall along a straight run, its height stepping down where work is unfinished.
    ``courses_at(t)`` returns the wall height at fraction t along the run."""
    rng = random.Random(seed)
    length = math.hypot(x1 - x0, y1 - y0)
    n = max(2, int(length / (2.4 if lod == 0 else 6.0)))
    for k in range(n):
        t0, t1 = k / n, (k + 1) / n
        h = courses_at((t0 + t1) / 2) * (0.92 + 0.12 * rng.random())
        if h < 0.12:
            continue
        cx = x0 + (x1 - x0) * (t0 + t1) / 2
        cy = y0 + (y1 - y0) * (t0 + t1) / 2
        horiz = abs(y1 - y0) < 1e-3
        size = (length / n + 0.05, thick, h) if horiz else (thick, length / n + 0.05, h)
        rough_box(bm, (cx, cy, z + h / 2), size, mat, 1 if lod == 0 else 0, 0.05 if lod == 0 else 0.0, seed + k)


def platform_sizes(levels):
    """Stepped levels shrinking towards the back, so the front stair climbs every terrace."""
    out = []
    for k in range(levels):
        w = MAYOR_W - k * 6.2
        d = MAYOR_D - k * 5.6
        back = (MAYOR_D - d) / 2  # keep the back face nearly flush, terraces open to the front
        out.append((w, d, 0.0, back * 0.55, k * MAYOR_LEVEL_H))
    return out


def pyramid_mayor(mats, lod, phase):
    """phase: 'foundation' | 'fill' | 'finished' | 'in_use'."""
    bm = bmesh.new()
    order = ['plaster_early', 'plaster_ochre', 'stone', 'shicra', 'earth', 'plaster_red', 'cane']
    m = {k: i for i, k in enumerate(order)}
    paint = 'plaster_ochre' if phase == 'in_use' else 'plaster_early'
    cuts = 3 if lod == 0 else 0
    amp = 0.18 if lod == 0 else 0.0
    levels = platform_sizes(MAYOR_LEVELS)
    if phase == 'foundation':
        built, partial = 0, 0
    elif phase == 'fill':
        built, partial = 2, 2
    else:
        built, partial = MAYOR_LEVELS, None
    # Ground course: the levelled base the platforms rest on.
    rough_box(bm, (0, 0, -0.25), (MAYOR_W + 2.0, MAYOR_D + 2.0, 0.7), m['earth'], 1 if lod == 0 else 0,
              0.12 if lod == 0 else 0.0, 3)
    face = m[paint] if phase in ('finished', 'in_use') else m['stone']
    for k in range(built):
        w, d, x, y, z0 = levels[k]
        rough_box(bm, (x, y, z0 + MAYOR_LEVEL_H / 2), (w, d, MAYOR_LEVEL_H), face, cuts, amp, k + 1, batter=0.025)
    top_z = built * MAYOR_LEVEL_H
    if partial is not None:
        # The level being raised: retaining walls going up, shicra fill inside, unfinished at the east.
        w, d, x, y, z0 = levels[partial]
        x0, x1, y0, y1 = x - w / 2, x + w / 2, y - d / 2, y + d / 2
        rise = (lambda t: MAYOR_LEVEL_H * max(0.0, 1.0 - 1.15 * t))
        full = (lambda t: MAYOR_LEVEL_H * (0.85 if t < 0.6 else 0.45))
        retaining_wall(bm, x0, y0, x1, y0, z0, rise, 0.7, 11, m['stone'], lod)
        retaining_wall(bm, x0, y1, x1, y1, z0, rise, 0.7, 13, m['stone'], lod)
        retaining_wall(bm, x0, y0, x0, y1, z0, full, 0.7, 17, m['stone'], lod)
        retaining_wall(bm, x0 + w * 0.42, y0, x0 + w * 0.42, y1, z0, full, 0.6, 19, m['stone'], lod)
        count = 30 if lod == 0 else 10
        segs, rings = (5, 3) if lod == 0 else (4, 2)
        fill_bags(bm, x0 + 0.4, x0 + w * 0.42, y0 + 0.4, y1 - 0.4, z0, MAYOR_LEVEL_H * 0.75, count // 2, 31,
                  m['shicra'], segs, rings, lod)
        fill_bags(bm, x0 + w * 0.42, x1 - w * 0.22, y0 + 0.4, y1 - 0.4, z0, MAYOR_LEVEL_H * 0.4, count // 2, 37,
                  m['shicra'], segs, rings, lod)
        if lod == 0 and phase == 'fill':
            for k, (px, py) in enumerate(((x1 + 3.0, y0 + 4.0), (x1 + 2.5, y1 - 5.0), (x0 - 3.0, y0 - 2.0))):
                bag_pile(bm, (px, py, 0.0), 10, 1.2, 50 + k, m['shicra'], 5, 3)
    else:
        # Central stair from the plaza (front, -Y) to the summit.
        w0, d0 = levels[0][0], levels[0][1]
        front = levels[0][3] - d0 / 2
        last = levels[-1]
        back = last[3] - last[1] / 2 + 1.0
        if lod == 0:
            stair(bm, 0.0, front - 4.0, back, 0.0, top_z, 4.4, 24, face)
        else:
            ramp(bm, 0.0, front - 4.0, back, 0.0, top_z, 4.4, face)
        if phase == 'in_use':
            # Summit enclosure (atrium) around a court, with the sacred-fire altar (form assumed).
            w, d, x, y, z0 = last
            ex0, ex1, ey0, ey1 = x - w / 2 + 0.6, x + w / 2 - 0.6, y - d / 2 + 0.6, y + d / 2 - 0.6
            wall_h, t = 1.4, 0.45
            gap = 2.4
            for (a, b) in (((ex0, ey1), (ex1, ey1)), ((ex0, ey0), (ex0, ey1)), ((ex1, ey0), (ex1, ey1))):
                cx, cy = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
                size = (abs(b[0] - a[0]) + t, t, wall_h) if abs(b[1] - a[1]) < 1e-3 else (t, abs(b[1] - a[1]) + t, wall_h)
                rough_box(bm, (cx, cy, top_z + wall_h / 2), size, m[paint], 1 if lod == 0 else 0, 0.04, 61)
            for side in (-1, 1):  # front wall with the stair opening
                seg = ((ex1 - ex0) - gap) / 2
                cx = side * (gap / 2 + seg / 2) + x
                rough_box(bm, (cx, ey0, top_z + wall_h / 2), (seg, t, wall_h), m[paint], 1 if lod == 0 else 0, 0.04, 67)
            # Red band on the enclosure's crest (late colours documented; placement assumed).
            box(bm, (x, ey1, top_z + wall_h + 0.08), (ex1 - ex0 + t, t + 0.06, 0.16), m['plaster_red'])
            ax, ay = x - w * 0.18, y + d * 0.12
            box(bm, (ax, ay, top_z + 0.3), (2.2, 2.2, 0.6), m['stone'])
            box(bm, (ax, ay, top_z + 0.66), (1.1, 1.1, 0.14), m['earth'])
            if lod == 0:
                # A light cane-mat shade over part of the court (roofing is a plausible assumption).
                for px, py in ((x + w * 0.12, y + d * 0.05), (x + w * 0.3, y + d * 0.05), (x + w * 0.12, y + d * 0.3),
                               (x + w * 0.3, y + d * 0.3)):
                    box(bm, (px, py, top_z + 1.1), (0.22, 0.22, 2.2), m['earth'])
                box(bm, (x + w * 0.21, y + d * 0.175, top_z + 2.25), (w * 0.24, d * 0.3, 0.08), m['cane'])
    if phase == 'foundation' and lod == 0:
        for k, (px, py) in enumerate(((MAYOR_W / 2 + 3, -6.0), (MAYOR_W / 2 + 3, 8.0), (-MAYOR_W / 2 - 3, 4.0),
                                      (6.0, -MAYOR_D / 2 - 3.5))):
            bag_pile(bm, (px, py, 0.0), 7, 1.1, 70 + k, m['shicra'], 5, 3)
    return bm, [mats[k] for k in order]


def pyramid_small(mats, lod):
    """A smaller stepped pyramid: three terraces and a front stair (scaled per building in game)."""
    bm = bmesh.new()
    # White (early) plaster: the city's buildings date from different periods (documented colour
    # change by period; which building wore which colour is inferred), and it keeps the ochre Pyramid
    # Mayor the dominant mass.
    order = ['plaster_early', 'earth']
    w, d, h = 18.0, 16.0, 2.6
    cuts = 2 if lod == 0 else 0
    amp = 0.14 if lod == 0 else 0.0
    rough_box(bm, (0, 0, -0.2), (w + 1.2, d + 1.2, 0.6), 1, 1 if lod == 0 else 0, amp * 0.6, 5)
    for k in range(3):
        lw, ld = w - k * 4.4, d - k * 3.8
        y = (d - ld) / 2 * 0.5
        rough_box(bm, (0, y, k * h + h / 2), (lw, ld, h), 0, cuts, amp, 20 + k, batter=0.03)
    front = -d / 2
    top_d = d - 2 * 3.8
    back = (d - top_d) / 2 * 0.5 - top_d / 2 + 0.8  # just onto the top terrace
    if lod == 0:
        stair(bm, 0.0, front - 2.6, back, 0.0, 3 * h, 2.8, 14, 0)
    else:
        ramp(bm, 0.0, front - 2.6, back, 0.0, 3 * h, 2.8, 0)
    return bm, [mats[k] for k in order]


def circular_plaza(mats, lod):
    """Sunken circular plaza: raised rim, two steps down to a plastered floor, axial stairs."""
    bm = bmesh.new()
    order = ['plaster_early', 'stone']
    r = 7.0
    segs = 40 if lod == 0 else 16
    rings = [(r + 1.0, 0.0, 1), (r + 1.0, 0.45, 1), (r, 0.45, 1), (r, -0.5, 0), (r - 0.9, -0.5, 0), (r - 0.9, -1.2, 0),
             (0.0, -1.2, 0)]
    loops = []
    for rad, z, _ in rings:
        if rad == 0.0:
            loops.append([bm.verts.new((0, 0, z))])
            continue
        loops.append([bm.verts.new((math.cos(a) * rad, math.sin(a) * rad, z)) for a in (k / segs * math.tau for k in range(segs))])
    for i in range(len(loops) - 1):
        a, b = loops[i], loops[i + 1]
        mat = rings[i][2] if i < 2 else 0
        for k in range(segs):
            if len(b) == 1:
                f = bm.faces.new((a[k], a[(k + 1) % segs], b[0]))
            else:
                f = bm.faces.new((a[k], a[(k + 1) % segs], b[(k + 1) % segs], b[k]))
            f.material_index = mat
    outer = [bm.verts.new((math.cos(a) * (r + 1.0), math.sin(a) * (r + 1.0), -0.6)) for a in (k / segs * math.tau for k in range(segs))]
    for k in range(segs):
        bm.faces.new((outer[(k + 1) % segs], outer[k], loops[0][k], loops[0][(k + 1) % segs])).material_index = 1
    for side in (-1, 1):
        for s in range(4 if lod == 0 else 1):
            n = 4 if lod == 0 else 1
            depth = (s + 1) * (1.65 / n)
            box(bm, (0.0, side * (r + 0.6 - s * (1.6 / n)), 0.45 - depth / 2), (2.2, 1.6 / n + 0.02, depth), 1)
    for f in bm.faces:
        f.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    return bm, [mats[k] for k in order]


def quincha_house(mats, lod, kind):
    """kind: 'common' | 'elite' | 'aspero'."""
    bm = bmesh.new()
    order = ['plaster_early', 'wood', 'cane', 'earth', 'stone', 'plaster_red']
    w, d = {'elite': (7.4, 5.8), 'aspero': (4.2, 3.4), 'common': (4.8, 3.8)}[kind]
    h = WALL_H[kind]
    t = 0.16
    z0 = 0.0
    if kind == 'elite':
        rough_box(bm, (0, 0, 0.3), (w + 1.6, d + 1.6, 0.6), 4, 1 if lod == 0 else 0, 0.05, 9, batter=0.04)
        z0 = 0.6
    else:
        box(bm, (0, 0, 0.0), (w + 0.6, d + 0.6, 0.24), 3)
    door = (-0.55, 0.55)
    wcuts = 1 if lod == 0 else 0
    rough_box(bm, ((-w / 2 + door[0]) / 2, -d / 2, z0 + h / 2), (w / 2 + door[0], t, h), 0, wcuts, 0.03, 1)
    rough_box(bm, ((door[1] + w / 2) / 2, -d / 2, z0 + h / 2), (w / 2 - door[1], t, h), 0, wcuts, 0.03, 2)
    box(bm, (0, -d / 2, z0 + h - 0.25), (door[1] - door[0], t, 0.5), 0)
    rough_box(bm, (0, d / 2, z0 + h / 2), (w, t, h), 0, wcuts, 0.03, 3)
    rough_box(bm, (-w / 2, 0, z0 + h / 2), (t, d, h), 0, wcuts, 0.03, 4)
    rough_box(bm, (w / 2, 0, z0 + h / 2), (t, d, h), 0, wcuts, 0.03, 5)
    if kind == 'elite':
        # Inner partition (two rooms) and a red painted band (colours documented; placement assumed).
        rough_box(bm, (w * 0.12, 0.4, z0 + h / 2), (t, d - 0.8, h), 0, wcuts, 0.03, 6)
        box(bm, (0, -d / 2 - t / 2 - 0.03, z0 + 0.35), (w + 0.05, 0.06, 0.3), 5)
    posts = [(-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2)]
    if lod == 0:
        posts += [(0, d / 2), (-w / 2, 0), (w / 2, 0)]
    for k, (px, py) in enumerate(posts):
        box(bm, (px, py, z0 + (h + 0.3) / 2), (0.2, 0.2, h + 0.3), 1)
    # Cane-mat roof on beams.
    for bx in ((-w * 0.35, 0.0, w * 0.35) if lod == 0 else (0.0,)):
        box(bm, (bx, 0.4, z0 + h + 0.36), (0.12, d + 0.6, 0.12), 1)
    # The cover spans most of the plan (front strip open): the roofing is a plausible assumption, and a
    # mostly covered room reads better from the RTS camera than a dark open box.
    box(bm, (-w * 0.03, d * 0.1, z0 + h + 0.48), (w + 0.5, d * 0.85, 0.07), 2)
    if lod == 0:
        # Cooking pit with burnt stones behind, a refuse heap beside (documented).
        hx, hy = w * 0.25, d / 2 + 1.2
        blob(bm, (hx, hy, 0.02), (0.6, 0.5, 0.05), 8, 3, 0.1, 11, 3)
        for k in range(6):
            a = k / 6 * math.tau
            blob(bm, (hx + math.cos(a) * 0.62, hy + math.sin(a) * 0.52, 0.1), (0.15, 0.13, 0.11), 5, 3, 0.25, 20 + k, 4)
        blob(bm, (w / 2 + 1.3, d / 2 + 0.6, -0.08), (1.1, 0.9, 0.26), 8, 4, 0.25, 30, 3)
    if kind == 'aspero':
        # Net-drying rack: two posts, a pole and hanging cotton nets (nets documented; rack assumed).
        rx = -w / 2 - 1.6
        for py in (-1.4, 1.4):
            box(bm, (rx, py, 1.0), (0.14, 0.14, 2.0), 1)
        box(bm, (rx, 0, 1.95), (0.1, 3.0, 0.1), 1)
        for k in range(3 if lod == 0 else 1):
            box(bm, (rx + 0.02, -0.9 + k * 0.9, 1.35), (0.03, 0.8, 1.15), 0)
        if lod == 0:
            for k in range(4):  # gourd floats (mates) by the rack
                blob(bm, (rx + 0.5, -1.2 + k * 0.4, 0.16), (0.16, 0.16, 0.15), 6, 4, 0.05, 40 + k, 3)
    return bm, [mats[k] for k in order]


def fair_tent(mats, lod):
    """Temporary fair tent: four posts and a cover (postholes documented; frame and cover assumed)."""
    bm = bmesh.new()
    order = ['wood', 'cane']
    w, d, h = 3.6, 3.0, 2.3
    for px in (-w / 2, w / 2):
        for py in (-d / 2, d / 2):
            box(bm, (px, py, h / 2 + (0.15 if py > 0 else 0.0)), (0.14, 0.14, h + (0.3 if py > 0 else 0.0)), 0)
    v = [bm.verts.new(c) for c in ((-w / 2 - 0.3, -d / 2 - 0.4, h), (w / 2 + 0.3, -d / 2 - 0.4, h),
                                   (w / 2 + 0.3, d / 2 + 0.3, h + 0.35), (-w / 2 - 0.3, d / 2 + 0.3, h + 0.35))]
    bm.faces.new(v).material_index = 1
    if lod == 0:
        for k in range(3):  # bundles of goods laid out under the cover
            blob(bm, (-1.0 + k * 1.0, 0.2, 0.18), (0.35, 0.3, 0.2), 6, 4, 0.15, 80 + k, 1)
    return bm, [mats[k] for k in order]


ASSETS = {
    'pyramid_mayor': lambda mats, lod: pyramid_mayor(mats, lod, 'in_use'),
    'pyramid_mayor_phase1': lambda mats, lod: pyramid_mayor(mats, lod, 'foundation'),
    'pyramid_mayor_phase2': lambda mats, lod: pyramid_mayor(mats, lod, 'fill'),
    'pyramid_mayor_phase3': lambda mats, lod: pyramid_mayor(mats, lod, 'finished'),
    'pyramid_small': pyramid_small,
    'circular_plaza': circular_plaza,
    'house_common': lambda mats, lod: quincha_house(mats, lod, 'common'),
    'house_elite': lambda mats, lod: quincha_house(mats, lod, 'elite'),
    'house_aspero': lambda mats, lod: quincha_house(mats, lod, 'aspero'),
    'fair_tent': fair_tent,
}


def tint(mesh):
    """COLOR_0: darker near the ground (a cheap baked contact shadow) and a small per-face variation, so
    flat colours read hand-made from the RTS camera."""
    rng = random.Random(len(mesh.polygons))
    col = mesh.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    for poly in mesh.polygons:
        face = 0.97 + 0.03 * rng.random()
        for li in poly.loop_indices:
            co = mesh.vertices[mesh.loops[li].vertex_index].co
            ground = 0.78 + 0.22 * max(0.0, min(1.0, (co.z + 0.2) / 1.6))
            # Mottled, hand-applied plaster: low-frequency noise over the surface.
            mottle = 0.9 + 0.1 * (noise.noise(co * 0.35) * 0.5 + 0.5)
            c = face * ground * mottle
            col.data[li].color = (c, c, c, 1.0)
    mesh.color_attributes.active_color = col
    mesh.color_attributes.render_color_index = mesh.color_attributes.find('Col')


def build_object(asset, lod, mats):
    bm, materials = ASSETS[asset](mats, lod)
    name = f'GEO-Arch_{asset}_LOD{lod}'
    # Keep only the material slots some face uses, so the GLB has no empty primitives.
    used = sorted({f.material_index for f in bm.faces})
    remap = {old: new for new, old in enumerate(used)}
    for f in bm.faces:
        f.material_index = remap[f.material_index]
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for i in used:
        mesh.materials.append(materials[i])
    for p in mesh.polygons:
        p.use_smooth = False
    tint(mesh)
    obj = bpy.data.objects.new(name, mesh)
    col = bpy.data.collections.get(f'COL-Arch_{asset}') or bpy.data.collections.new(f'COL-Arch_{asset}')
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


CONFIDENCE = {
    'pyramid_mayor': 'inferred',
    'pyramid_mayor_phase1': 'inferred',
    'pyramid_mayor_phase2': 'inferred',
    'pyramid_mayor_phase3': 'inferred',
    'pyramid_small': 'inferred',
    'circular_plaza': 'documented',
    'house_common': 'inferred',
    'house_elite': 'inferred',
    'house_aspero': 'assumed',
    'fair_tent': 'assumed',
}


def main():
    args = parse_args()
    only = [a for a in args.only.split(',') if a] or list(ASSETS)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = build_materials()
    os.makedirs(GAME_DIR, exist_ok=True)
    failures = []
    for asset in only:
        manifest = {'asset_id': f'caral_{asset}', 'source_scene': 'scenes/caral_architecture_kit.blend',
                    'script': 'scripts/blender/build_caral_architecture_kit.py', 'scale': 1.0, 'up': 'Y',
                    'front': '+Z', 'pivot': 'footprint centre at ground level', 'confidence': CONFIDENCE[asset],
                    'sources': ['docs/historia/campanas/caral.md', 'docs/historia/civilizaciones/caral.md'],
                    'budget': {'LOD0': LOD0_BUDGET, 'LOD1': LOD1_BUDGET}, 'reviewed': False, 'lods': {}}
        if asset.startswith('house_'):
            manifest['wall_height'] = WALL_H[asset.split('_', 1)[1]]
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
            budget = LOD0_BUDGET if lod == 0 else LOD1_BUDGET
            if info['triangles'] > budget:
                failures.append(f'{asset} LOD{lod}: {info["triangles"]} > {budget}')
            print(f'ARCH {asset} LOD{lod} tris={info["triangles"]} calls={info["draw_calls"]} '
                  f'size={info["bounds"]["size"]} bytes={info["bytes"]}')
        with open(os.path.join(EXPORT_DIR, f'caral_{asset}_manifest.json'), 'w') as fh:
            json.dump(manifest, fh, indent=2)
            fh.write('\n')
    os.makedirs(os.path.dirname(SOURCE_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=SOURCE_BLEND, compress=True)
    if failures:
        raise SystemExit('over budget: ' + '; '.join(failures))


if __name__ == '__main__':
    main()
