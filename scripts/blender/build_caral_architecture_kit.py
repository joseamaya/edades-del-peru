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
MAYOR_LEVELS = 6
# Quincha wall heights (art-direction §3: 1.3-1.5 people); recorded in the manifests.
WALL_H = {'common': 2.5, 'elite': 2.7, 'aspero': 2.4}
MAYOR_LEVEL_H = 2.7
# Heights of the floors and terraces of the piece being built, for the grime band in tint().
LEDGES = [0.0]


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


def bevel_box(bm, center, size, mat, offset=0.1, top_only=False, jitter=0.0, seed=0):
    """A box with bevelled edges (one segment): edges catch light and read as hand-finished plaster or
    dressed stone instead of CAD corners. ``top_only`` bevels just the top rim (cheaper)."""
    tmp = bmesh.new()
    bmesh.ops.create_cube(tmp, size=1.0)
    for v in tmp.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    edges = list(tmp.edges)
    if top_only:
        edges = [e for e in edges if all(v.co.z > 0 for v in e.verts)]
    off = min(offset, min(size) * 0.3)
    bmesh.ops.bevel(tmp, geom=edges, offset=off, segments=1, profile=0.5, affect='EDGES')
    rng = random.Random(seed)
    for v in tmp.verts:
        p = v.co
        if jitter:
            p = p + Vector((rng.uniform(-jitter, jitter), rng.uniform(-jitter, jitter), rng.uniform(-jitter, jitter) * 0.3))
        v.co = p + Vector(center)
    vmap = {v: bm.verts.new(v.co) for v in tmp.verts}
    for f in tmp.faces:
        nf = bm.faces.new([vmap[v] for v in f.verts])
        nf.material_index = mat
    tmp.free()


def stone_courses(bm, x0, y0, x1, y1, z, height, thick, mat, lod, seed, course_h=0.45):
    """A set-stone wall along a straight run, built as courses that alternate a few centimetres in and
    out: the coursing reads in relief from the RTS camera, the texture supplies the stones."""
    rng = random.Random(seed)
    length = math.hypot(x1 - x0, y1 - y0)
    if length < 0.05 or height < 0.05:
        return
    horiz = abs(y1 - y0) < 1e-3
    n = max(1, round(height / course_h)) if lod == 0 else 1
    ch = height / n
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    for k in range(n):
        inset = 0.05 if k % 2 else 0.0
        t = thick - inset * 2
        jitter = rng.uniform(-0.03, 0.03)
        size = (length, t + jitter, ch) if horiz else (t + jitter, length, ch)
        box(bm, (cx, cy, z + ch * (k + 0.5)), size, mat)


def terrace(bm, x, y, z0, w, d, h, plaster, stone, lod, seed, exposed=False):
    """One platform of a stepped building: a set-stone footing course, the wall body (plastered, or
    bare coursed stone while it is being built) with a bevelled top, and a thin coping on the rim."""
    if exposed:
        for (ax, ay), (bx, by) in (((x - w / 2, y - d / 2), (x + w / 2, y - d / 2)),
                                   ((x - w / 2, y + d / 2), (x + w / 2, y + d / 2))):
            stone_courses(bm, ax, ay, bx, by, z0, h, 0.6, stone, lod, seed)
        for (ax, ay), (bx, by) in (((x - w / 2, y - d / 2 + 0.3), (x - w / 2, y + d / 2 - 0.3)),
                                   ((x + w / 2, y - d / 2 + 0.3), (x + w / 2, y + d / 2 - 0.3))):
            stone_courses(bm, ax, ay, bx, by, z0, h, 0.6, stone, lod, seed + 5)
        box(bm, (x, y, z0 + h / 2 - 0.05), (w - 1.0, d - 1.0, h - 0.1), stone)
        return
    if lod == 0:
        # Lower wall: set-stone retaining courses in relief, slightly proud of the plaster above (the
        # exposed stone is a reading aid, see the dossier's certainty table); upper wall plastered.
        stone_h = h * 0.5
        sx, sy = w / 2 + 0.08, d / 2 + 0.08
        for (ax, ay), (bx, by) in (((x - sx, y - sy), (x + sx, y - sy)), ((x - sx, y + sy), (x + sx, y + sy))):
            stone_courses(bm, ax, ay, bx, by, z0, stone_h, 0.5, stone, lod, seed)
        for (ax, ay), (bx, by) in (((x - sx, y - sy + 0.25), (x - sx, y + sy - 0.25)),
                                   ((x + sx, y - sy + 0.25), (x + sx, y + sy - 0.25))):
            stone_courses(bm, ax, ay, bx, by, z0, stone_h, 0.5, stone, lod, seed + 3)
        bevel_box(bm, (x, y, z0 + stone_h + (h - stone_h) / 2), (w, d, h - stone_h), plaster, 0.14, top_only=True,
                  jitter=0.03, seed=seed)
        box(bm, (x, y, z0 + stone_h / 2), (w - 0.9, d - 0.9, stone_h), plaster)
        box(bm, (x, y, z0 + h + 0.05), (w - 0.5, d - 0.5, 0.1), plaster)
    else:
        box(bm, (x, y, z0 + h / 2), (w, d, h), plaster)


def flight(bm, x, y_front, y_back, z0, z1, width, steps, tread_mat, wall_mat, lod):
    """Stair with real treads and risers between two sloped side walls (alfardas; form assumed)."""
    if lod == 0:
        run = (y_back - y_front) / steps
        rise = (z1 - z0) / steps
        for s in range(steps):
            top = z0 + rise * (s + 1)
            box(bm, (x, y_front + run * (s + 0.5), (z0 + top) / 2 - 0.2), (width, abs(run) + 0.02, top - z0 + 0.4),
                tread_mat)
        for side in (-1, 1):
            sx = x + side * (width / 2 + 0.25)
            v = [bm.verts.new(c) for c in (
                (sx - 0.25, y_front, z0), (sx + 0.25, y_front, z0), (sx + 0.25, y_back, z1 - 0.1), (sx - 0.25, y_back, z1 - 0.1),
                (sx - 0.25, y_front, z0 + 0.7), (sx + 0.25, y_front, z0 + 0.7), (sx + 0.25, y_back, z1 + 0.6),
                (sx - 0.25, y_back, z1 + 0.6))]
            for idx in ((0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7), (3, 2, 1, 0)):
                bm.faces.new([v[i] for i in idx]).material_index = wall_mat
    else:
        ramp(bm, x, y_front, y_back, z0, z1, width + 1.0, tread_mat)


def parapet(bm, x, y, w, d, z, h, mat, gap, lod, seed):
    """Low wall around a terrace rim with an opening on the stair axis (front, -Y)."""
    t = 0.4
    x0, x1, y0, y1 = x - w / 2 + t / 2, x + w / 2 - t / 2, y - d / 2 + t / 2, y + d / 2 - t / 2
    pieces = [((x0 + x1) / 2, y1, x1 - x0 + t, t), (x0, (y0 + y1) / 2, t, y1 - y0), (x1, (y0 + y1) / 2, t, y1 - y0)]
    seg = ((x1 - x0) - gap) / 2
    for side in (-1, 1):
        pieces.append((x + side * (gap / 2 + seg / 2), y0, seg + t, t))
    for k, (cx, cy, sx, sy) in enumerate(pieces):
        if lod == 0:
            bevel_box(bm, (cx, cy, z + h / 2), (sx, sy, h), mat, 0.08, top_only=True, seed=seed + k)
        else:
            box(bm, (cx, cy, z + h / 2), (sx, sy, h), mat)


def retaining_wall(bm, x0, y0, x1, y1, z, courses_at, thick, seed, mat, lod):
    """Stone retaining wall going up course by course, unfinished towards one end:
    ``courses_at(t)`` is the wall height at fraction t along the run."""
    length = math.hypot(x1 - x0, y1 - y0)
    n = max(2, int(length / (3.0 if lod == 0 else 7.0)))
    for k in range(n):
        t0, t1 = k / n, (k + 1) / n
        h = courses_at((t0 + t1) / 2)
        if h < 0.2:
            continue
        ax, ay = x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0
        bx, by = x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1
        stone_courses(bm, ax, ay, bx, by, z, h, thick, mat, lod, seed + k)


def platform_sizes(levels):
    """Stepped levels shrinking towards the back, so the front stair climbs every terrace."""
    out = []
    for k in range(levels):
        w = MAYOR_W - k * 4.6
        d = MAYOR_D - k * 4.2
        back = (MAYOR_D - d) / 2
        out.append((w, d, 0.0, back * 0.6, k * MAYOR_LEVEL_H))
    return out


def pyramid_mayor(mats, lod, phase):
    """phase: 'foundation' | 'fill' | 'finished' | 'in_use'."""
    bm = bmesh.new()
    order = ['plaster_early', 'plaster_ochre', 'stone', 'shicra', 'earth', 'plaster_red', 'cane']
    m = {k: i for i, k in enumerate(order)}
    paint = m['plaster_ochre'] if phase == 'in_use' else m['plaster_early']
    levels = platform_sizes(MAYOR_LEVELS)
    if phase == 'foundation':
        built, partial = 0, 0
    elif phase == 'fill':
        built, partial = 2, 2
    else:
        built, partial = MAYOR_LEVELS, None
    LEDGES[:] = [lv[4] for lv in levels]
    # Levelled ground course the platforms rest on.
    box(bm, (0, 0, -0.3), (MAYOR_W + 2.4, MAYOR_D + 2.4, 0.7), m['earth'])
    for k in range(built):
        w, d, x, y, z0 = levels[k]
        terrace(bm, x, y, z0, w, d, MAYOR_LEVEL_H, paint, m['stone'], lod, 10 + k,
                exposed=phase in ('foundation', 'fill'))
    top_z = built * MAYOR_LEVEL_H
    if partial is not None:
        # The level being raised: coursed retaining walls going up, shicra fill inside.
        w, d, x, y, z0 = levels[partial]
        x0, x1, y0, y1 = x - w / 2, x + w / 2, y - d / 2, y + d / 2
        rise = (lambda t: MAYOR_LEVEL_H * max(0.0, 1.0 - 1.15 * t))
        full = (lambda t: MAYOR_LEVEL_H * (0.85 if t < 0.6 else 0.5))
        retaining_wall(bm, x0, y0, x1, y0, z0, rise, 0.6, 11, m['stone'], lod)
        retaining_wall(bm, x0, y1, x1, y1, z0, rise, 0.6, 13, m['stone'], lod)
        retaining_wall(bm, x0, y0 + 0.3, x0, y1 - 0.3, z0, full, 0.6, 17, m['stone'], lod)
        retaining_wall(bm, x0 + w * 0.42, y0 + 0.3, x0 + w * 0.42, y1 - 0.3, z0, full, 0.5, 19, m['stone'], lod)
        count = 26 if lod == 0 else 8
        segs, rings = (5, 3) if lod == 0 else (4, 2)
        fill_bags(bm, x0 + 0.5, x0 + w * 0.42, y0 + 0.5, y1 - 0.5, z0, MAYOR_LEVEL_H * 0.75, count // 2, 31,
                  m['shicra'], segs, rings, lod)
        fill_bags(bm, x0 + w * 0.42, x1 - w * 0.22, y0 + 0.5, y1 - 0.5, z0, MAYOR_LEVEL_H * 0.4, count // 2, 37,
                  m['shicra'], segs, rings, lod)
        if lod == 0:
            piles = ((x1 + 3.0, y0 + 4.0), (x1 + 2.5, y1 - 5.0), (x0 - 3.0, y0 - 2.0), (6.0, y0 - 3.5))
            for k, (px, py) in enumerate(piles[: 4 if phase == 'foundation' else 3]):
                bag_pile(bm, (px, py, 0.0), 7, 1.1, 50 + k, m['shicra'], 5, 3)
    else:
        front = levels[0][3] - levels[0][1] / 2
        last = levels[-1]
        back = last[3] - last[1] / 2 + 1.2
        flight(bm, 0.0, front - 4.5, back, 0.0, top_z, 4.4, 30, paint, m['stone'], lod)
        w, d, x, y, z0 = last
        if phase == 'finished':
            parapet(bm, x, y, w, d, top_z + 0.1, 0.7, paint, 4.0, lod, 60)
        else:
            # Summit enclosure (atrium) around a court, with the sacred-fire altar (forms assumed).
            parapet(bm, x, y, w - 1.0, d - 1.0, top_z + 0.1, 1.5, paint, 3.0, lod, 61)
            ey1 = y + d / 2 - 0.9
            box(bm, (x, ey1, top_z + 1.68), (w - 1.0, 0.46, 0.16), m['plaster_red'])
            ax, ay = x - w * 0.18, y + d * 0.1
            if lod == 0:
                bevel_box(bm, (ax, ay, top_z + 0.35), (2.4, 2.4, 0.5), m['stone'], 0.1, seed=70)
                bevel_box(bm, (ax, ay, top_z + 0.68), (1.4, 1.4, 0.16), m['earth'], 0.05, seed=71)
                for px, py in ((x + w * 0.1, y + d * 0.02), (x + w * 0.3, y + d * 0.02), (x + w * 0.1, y + d * 0.3),
                               (x + w * 0.3, y + d * 0.3)):
                    box(bm, (px, py, top_z + 1.2), (0.22, 0.22, 2.4), m['earth'])
                box(bm, (x + w * 0.2, y + d * 0.16, top_z + 2.45), (w * 0.26, d * 0.34, 0.08), m['cane'])
            else:
                box(bm, (ax, ay, top_z + 0.4), (2.4, 2.4, 0.6), m['stone'])
    if phase == 'foundation' and lod == 0:
        for k, (px, py) in enumerate(((MAYOR_W / 2 + 3, -6.0), (-MAYOR_W / 2 - 3, 4.0))):
            bag_pile(bm, (px, py, 0.0), 7, 1.1, 70 + k, m['shicra'], 5, 3)
    return bm, [mats[k] for k in order]


def pyramid_small(mats, lod):
    """A smaller stepped pyramid: four terraces, stair with side walls, parapet (scaled per building)."""
    bm = bmesh.new()
    # White (early) plaster: buildings of different periods (documented colour change by period; which
    # building wore which colour is inferred), and it keeps the ochre Pyramid Mayor dominant.
    order = ['plaster_early', 'stone', 'earth']
    w, d, h = 18.0, 16.0, 2.4
    LEDGES[:] = [k * h for k in range(4)]
    box(bm, (0, 0, -0.25), (w + 1.4, d + 1.4, 0.6), 2)
    tops = []
    for k in range(4):
        lw, ld = w - k * 3.4, d - k * 2.9
        y = (d - ld) / 2 * 0.6
        terrace(bm, 0.0, y, k * h, lw, ld, h, 0, 1, lod, 20 + k)
        tops.append((lw, ld, y))
    lw, ld, ly = tops[-1]
    flight(bm, 0.0, -d / 2 - 2.6, ly - ld / 2 + 0.9, 0.0, 4 * h, 2.8, 18, 0, 1, lod)
    parapet(bm, 0.0, ly, lw, ld, 4 * h + 0.1, 0.6, 0, 3.2, lod, 30)
    return bm, [mats[k] for k in order]


def huaca_idolos(mats, lod):
    """Huaca de los Ídolos at Áspero: a platform mound grown in superposed phases, with rooms on top.

    Documented (docs/historia/campanas/caral.md, Feldman 1985): a mound built in phases, with offerings
    (unfired clay figurines under a floor) before each new construction; rooms on its summit. Assumed:
    three terraces, proportions compressed for the RTS camera (~3 people tall), the stair, the room plan,
    whitish plaster like the early Caral buildings.
    """
    bm = bmesh.new()
    order = ['plaster_early', 'stone', 'earth', 'wood']
    w, d, h = 20.0, 16.0, 1.9
    LEDGES[:] = [k * h for k in range(3)]
    box(bm, (0, 0, -0.25), (w + 1.2, d + 1.2, 0.6), 2)
    tops = []
    for k in range(3):
        lw, ld = w - k * 3.8, d - k * 3.2
        y = (d - ld) / 2 * 0.5
        terrace(bm, 0.0, y, k * h, lw, ld, h, 0, 1, lod, 60 + k)
        tops.append((lw, ld, y))
    lw, ld, ly = tops[-1]
    top = 3 * h
    flight(bm, 0.0, -d / 2 - 2.2, ly - ld / 2 + 0.8, 0.0, top, 2.4, 14, 0, 1, lod)
    # Summit rooms: two walled enclosures facing a small court (plan assumed).
    t = 0.3
    rh = 1.3 if lod == 0 else 1.1
    for cx, rw in ((-lw * 0.22, lw * 0.36), (lw * 0.24, lw * 0.3)):
        ry = ly + ld * 0.12
        rd = ld * 0.5
        rough_box(bm, (cx, ry + rd / 2, top + rh / 2), (rw, t, rh), 0, 1 if lod == 0 else 0, 0.03, 70)
        rough_box(bm, (cx - rw / 2, ry, top + rh / 2), (t, rd, rh), 0, 0, 0.03, 71)
        rough_box(bm, (cx + rw / 2, ry, top + rh / 2), (t, rd, rh), 0, 0, 0.03, 72)
        # Front wall in two halves around a doorway.
        box(bm, (cx - (rw / 2 + 0.6) / 2, ry - rd / 2, top + rh / 2), (rw / 2 - 0.6, t, rh), 0)
        box(bm, (cx + (rw / 2 + 0.6) / 2, ry - rd / 2, top + rh / 2), (rw / 2 - 0.6, t, rh), 0)
    if lod == 0:
        # Offering pit in the court (documented offerings; this form assumed) and posts of a shade.
        blob(bm, (0.0, ly - ld * 0.2, top + 0.02), (0.7, 0.6, 0.06), 8, 3, 0.1, 75, 2)
        for px in (-1.2, 1.2):
            box(bm, (px, ly - ld * 0.32, top + 1.0), (0.16, 0.16, 2.0), 3)
    return bm, [mats[k] for k in order]


def ring(bm, radius, z, segs, gaps, gap_half):
    """Vertices of a circle, skipping the angles inside the stair gaps (returned as arcs). A full ring
    closes on its first vertex, so smooth bands have no shading seam at 0°."""
    if not gaps:
        verts = [bm.verts.new((math.cos(a) * radius, math.sin(a) * radius, z))
                 for a in (k / segs * math.tau for k in range(segs))]
        return [verts + [verts[0]]]
    arcs = []
    current = []
    for k in range(segs + 1):
        a = k / segs * math.tau
        inside = any(abs(math.atan2(math.sin(a - g), math.cos(a - g))) < gap_half for g in gaps)
        if inside:
            if len(current) > 1:
                arcs.append(current)
            current = []
            continue
        current.append(bm.verts.new((math.cos(a) * radius, math.sin(a) * radius, z)))
    if len(current) > 1:
        arcs.append(current)
    return arcs


def band(bm, r0, z0, r1, z1, segs, gaps, gap_half, mat, smooth):
    """A surface of revolution between two circles (wall faces or treads), cut at the stair gaps."""
    lo = ring(bm, r0, z0, segs, gaps, gap_half)
    hi = ring(bm, r1, z1, segs, gaps, gap_half)
    for a, b in zip(lo, hi):
        for k in range(min(len(a), len(b)) - 1):
            f = bm.faces.new((a[k], a[k + 1], b[k + 1], b[k]))
            f.material_index = mat
            f.smooth = smooth


def circular_plaza(mats, lod):
    """Sunken circular plaza: a stone-faced ring wall with a plastered coping, two coursed steps down
    to a compacted floor, and axial stairs cut through the rim (layout simplified; documented plazas)."""
    bm = bmesh.new()
    order = ['plaster_early', 'stone', 'earth']
    r = 7.0
    segs = 48 if lod == 0 else 20
    gaps = (math.pi / 2, -math.pi / 2)  # stair axis +Y / -Y (game -Z / +Z)
    half = math.radians(9.0)
    rim_out, rim_in = r + 1.0, r
    LEDGES[:] = [-1.2, -0.55, 0.0]
    # Outer face of the rim (stone), coping (plaster), inner face (stone courses), steps, floor.
    band(bm, rim_out, -0.6, rim_out, 0.45, segs, gaps, half, 1, True)
    band(bm, rim_out, 0.45, rim_in, 0.45, segs, gaps, half, 0, False)
    courses = 2 if lod == 0 else 1
    zs = [0.45 - (0.45 + 0.55) * k / courses for k in range(courses + 1)]
    for k in range(courses):
        inset = 0.04 if k % 2 else 0.0
        band(bm, rim_in - inset, zs[k], rim_in - inset, zs[k + 1], segs, gaps, half, 1, True)
    band(bm, rim_in, -0.55, rim_in - 0.9, -0.55, segs, gaps, half, 0, False)
    band(bm, rim_in - 0.9, -0.55, rim_in - 0.9, -1.2, segs, gaps, half, 1, True)
    # Floor: concentric quad rings down to a small centre fan (no long thin fan triangles).
    radii = [rim_in - 0.9, (rim_in - 0.9) * 0.66, (rim_in - 0.9) * 0.33] if lod == 0 else [rim_in - 0.9, 2.0]
    for k in range(len(radii) - 1):
        band(bm, radii[k], -1.2, radii[k + 1], -1.2, segs, (), 0.0, 2, False)
    centre = bm.verts.new((0, 0, -1.2))
    inner = ring(bm, radii[-1], -1.2, segs, (), 0.0)[0]
    for k in range(len(inner) - 1):
        bm.faces.new((inner[k], inner[k + 1], centre)).material_index = 2
    # Stairs through the rim on the axis, with their side walls.
    for side in (-1, 1):
        y_out, y_in = side * (rim_out + 0.6), side * (rim_in - 0.9)
        steps = 6 if lod == 0 else 1
        if lod == 0:
            for s in range(steps):
                t0, t1 = s / steps, (s + 1) / steps
                ya = y_out + (y_in - y_out) * t0
                yb = y_out + (y_in - y_out) * t1
                top = 0.45 - (0.45 + 1.2) * (s + 0.5) / steps
                box(bm, (0.0, (ya + yb) / 2, (top - 1.2) / 2), (2.2, abs(yb - ya) + 0.02, top + 1.2), 0)
        else:
            ramp(bm, 0.0, y_in, y_out, -1.2, 0.45, 2.2, 0)
        for wx in (-1.35, 1.35):
            box(bm, (wx, (y_out + y_in) / 2, -0.35), (0.4, abs(y_out - y_in), 1.7), 1)
    # No recalc_face_normals: on this open surface it can flip the floor; band() winds every ring so
    # walls face outwards/inwards and treads and the floor face up.
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


def camp_shelter(mats, lod):
    """Construction-camp ramada: four posts, a cane roof, a stone hearth, a pot and a mate.

    The dossier documents shicras, phased platforms and the cotton/gourd crops; the camp's form and its
    arrangement are inferred, and no scaffolding is modelled (explicitly undocumented, art-direction).
    """
    bm = bmesh.new()
    order = ['wood', 'cane', 'stone', 'earth']
    wood, cane, stone, earth = 0, 1, 2, 3
    w, d, h = 2.8, 2.2, 1.9
    for px in (-w / 2, w / 2):
        for py in (-d / 2, d / 2):
            box(bm, (px, py, h / 2), (0.13, 0.13, h), wood)
    # A shallow cane roof, slightly higher at the back (rain runs to the patio).
    v = [
        bm.verts.new(c)
        for c in (
            (-w / 2 - 0.2, -d / 2 - 0.2, h),
            (w / 2 + 0.2, -d / 2 - 0.2, h),
            (w / 2 + 0.2, d / 2 + 0.2, h + 0.18),
            (-w / 2 - 0.2, d / 2 + 0.2, h + 0.18),
            (-w / 2 - 0.1, -d / 2 - 0.1, h + 0.06),
            (w / 2 + 0.1, -d / 2 - 0.1, h + 0.06),
            (w / 2 + 0.1, d / 2 + 0.1, h + 0.24),
            (-w / 2 - 0.1, d / 2 + 0.1, h + 0.24),
        )
    ]
    for face in ((0, 1, 2, 3), (4, 5, 6, 7), (0, 4, 7, 3), (1, 2, 6, 5)):
        bm.faces.new([v[i] for i in face]).material_index = cane
    if lod == 0:
        box(bm, (0, -d / 2 - 0.1, h + 0.04), (0.08, d + 0.2, 0.08), wood)
    # Hearth: a ring of burnt stones around an ash bed.
    rng = random.Random(71)
    ball_count = 7 if lod == 0 else 5
    for k in range(ball_count):
        a = k / ball_count * math.tau + rng.uniform(-0.12, 0.12)
        r = 0.52 + rng.uniform(-0.02, 0.03)
        blob(
            bm,
            (math.cos(a) * r - 0.35, math.sin(a) * r * 0.8, 0.09),
            (rng.uniform(0.1, 0.14), rng.uniform(0.09, 0.13), rng.uniform(0.07, 0.1)),
            6 if lod == 0 else 4,
            3,
            0.3,
            72 + k,
            stone,
        )
    if lod == 0:
        blob(bm, (-0.35, 0, 0.02), (0.42, 0.34, 0.035), 8, 3, 0.06, 79, earth)
        # A jar and a mate under the roof, the household scale of the camp.
        blob(bm, (0.55, 0.3, 0.26), (0.2, 0.18, 0.26), 8, 5, 0.08, 80, earth)
        blob(bm, (0.55, 0.3, 0.52), (0.12, 0.11, 0.06), 7, 3, 0.05, 81, earth)
        blob(bm, (-0.15, 0.5, 0.1), (0.13, 0.11, 0.12), 6, 4, 0.06, 82, earth)
    return bm, [mats[k] for k in order]


def shicra_stack(mats, lod):
    """A working heap of shicra bags and a few stones, waiting to be laid (fill documented)."""
    bm = bmesh.new()
    order = ['shicra', 'stone', 'earth']
    # Three layers so the heap reads as a stack of bags, not a flat stone ring at RTS zoom.
    count = 14 if lod == 0 else 6
    segs, rings = (6, 4) if lod == 0 else (4, 3)
    bag_pile(bm, (0, 0, 0), count // 2, 1.25, 91, 0, segs, rings)
    bag_pile(bm, (0.15, 0.1, 0.52), count // 3, 0.85, 95, 0, segs, rings)
    bag_pile(bm, (-0.1, -0.1, 0.9), max(1, count // 5), 0.5, 99, 0, segs, rings)
    if lod == 0:
        blob(bm, (0, 0, 0.02), (1.45, 1.2, 0.08), 9, 3, 0.06, 92, 2)
        for k, (px, py) in enumerate(((-1.1, 0.7), (1.0, -0.75), (0.95, 0.8))):
            blob(bm, (px, py, 0.16), (0.24, 0.2, 0.15), 5, 3, 0.25, 93 + k, 1)
    return bm, [mats[k] for k in order]


def stone_yard(mats, lod):
    """Dressed granodiorite blocks laid out for the retaining walls (late-period stone documented)."""
    bm = bmesh.new()
    blocks = 10 if lod == 0 else 4
    rng = random.Random(101)
    for k in range(blocks):
        col = k % 4
        row = k // 4
        x = -1.25 + col * 0.82 + rng.uniform(-0.04, 0.04)
        y = -0.6 + row * 0.72 + rng.uniform(-0.04, 0.04)
        z = 0.22 + (0.45 if row == 2 else 0.0)
        if lod == 0:
            bevel_box(bm, (x, y, z), (0.68, 0.5, 0.42), 0, offset=0.04, jitter=0.025, seed=102 + k)
        else:
            box(bm, (x, y, z), (0.68, 0.5, 0.42), 0)
    return bm, [mats['stone']]


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
    'huaca_idolos': huaca_idolos,
    'camp_shelter': camp_shelter,
    'shicra_stack': shicra_stack,
    'stone_yard': stone_yard,
}


# World size of one texture tile per material (game units). The game maps the shared, tileable
# generated PBR textures (stone, plaster/floor wear, fibre, wood) onto these UVs; see
# src/rendering/architectureKit.ts. A person is 1.86, so a stone of the 512 px dry-stone tile is ~0.3-0.5.
TILE = {
    'MAT-Arch_Stone': 3.2,
    'MAT-Arch_PlasterWhite': 4.0,
    'MAT-Arch_PlasterOchre': 4.0,
    'MAT-Arch_PlasterRed': 4.0,
    'MAT-Arch_Earth': 4.0,
    'MAT-Arch_Shicra': 1.2,
    'MAT-Arch_Wood': 1.2,
    'MAT-Arch_CaneMat': 2.0,
}


def assign_uvs(bm, materials, tile=None):
    """Box-projected UVs at world scale: each face is mapped on the plane it faces most, so tiling
    textures keep a constant texel size on every wall, tread and roof. ``tile`` overrides the shared
    per-material tile size (small props use a finer weave)."""
    uv = bm.loops.layers.uv.verify()
    tiles = tile or TILE
    for f in bm.faces:
        n = f.normal
        size = tiles.get(materials[f.material_index].name, 3.0)
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


def tint(mesh, rgb=(1.0, 1.0, 1.0)):
    """COLOR_0, multiplied over the material: grime at the foot of every terrace and floor (dust and
    splash where walls meet the ground), worn bevelled edges, and low-frequency mottling of
    hand-applied plaster; per vertex, so curved surfaces show no faceting. ``rgb`` is an optional
    per-piece tone (a tuple, or a material-name dict), so small props can share a palette and still
    read as ash, raw cotton or a pale gourd."""
    col = mesh.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    ledges = sorted(LEDGES)
    for poly in mesh.polygons:
        n = poly.normal
        bevel = 0.92 if 0.35 < abs(n.z) < 0.9 else 1.0
        tone = rgb.get(mesh.materials[poly.material_index].name, (1.0, 1.0, 1.0)) if isinstance(rgb, dict) else rgb
        for li in poly.loop_indices:
            co = mesh.vertices[mesh.loops[li].vertex_index].co
            above = min((co.z - z for z in ledges if co.z >= z - 0.05), default=co.z + 0.2)
            grime = 0.8 + 0.2 * max(0.0, min(1.0, above / 1.1))
            mottle = 0.88 + 0.12 * (noise.noise(co * 0.3) * 0.5 + 0.5)
            c = grime * mottle * bevel
            col.data[li].color = (c * tone[0], c * tone[1], c * tone[2], 1.0)
    mesh.color_attributes.active_color = col
    mesh.color_attributes.render_color_index = mesh.color_attributes.find('Col')


def build_object(asset, lod, mats):
    LEDGES[:] = [0.0]
    bm, materials = ASSETS[asset](mats, lod)
    name = f'GEO-Arch_{asset}_LOD{lod}'
    # Keep only the material slots some face uses, so the GLB has no empty primitives.
    used = sorted({f.material_index for f in bm.faces})
    remap = {old: new for new, old in enumerate(used)}
    for f in bm.faces:
        f.material_index = remap[f.material_index]
    kept = [materials[i] for i in used]
    bm.normal_update()
    assign_uvs(bm, kept)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for mat in kept:
        mesh.materials.append(mat)
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
    'huaca_idolos': 'inferred',
    'camp_shelter': 'assumed',
    'shicra_stack': 'documented',
    'stone_yard': 'documented',
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
