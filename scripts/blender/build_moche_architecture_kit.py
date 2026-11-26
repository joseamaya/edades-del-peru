"""Build the north-coast adobe architecture kit: the Huacas de Moche and Chan Chan.

One script, nine pieces and two LODs, following the Caral method (art-direction §4.2): modelled volumes,
box-projected UVs, a per-vertex tint and shared PBR detail sets at runtime. Run with

    blender --background --python scripts/blender/build_moche_architecture_kit.py -- --only=huaca

The pieces are placed by `src/model/defs/mocheChimuCity.ts`, which also derives the site blockers from the
same layout. Sources: `docs/historia/arquitectura.md`, `docs/design/moche-sacred-site.md`,
`docs/design/chimu-site.md`, `docs/historia/civilizaciones/moche.md` and the Chimú campaign notes.
"""

from __future__ import annotations

import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import arch_kit as ak  # noqa: E402  (needs the script directory on sys.path)

KIT = 'moche'
EXPORT_DIR = os.path.join(ROOT, 'art-src', 'blender', 'exports', 'moche', 'architecture')
GAME_DIR = os.path.join(ROOT, 'src', 'assets', 'architecture', 'moche')
SOURCE_BLEND = os.path.join(ROOT, 'art-src', 'blender', 'scenes', 'moche_architecture_kit.blend')

# Eight materials for the whole kit: adobe, its shadowed face, plaster, the two friezes, the packed earth, the
# timber and the openings. Adobe and plaster are the coastal identity Moche and Chimú share.
MATERIALS = {
    'adobe': ('MAT-Arch_MocheAdobe', ak.hex_rgb('#c9a878'), 0.96),
    'adobe_dark': ('MAT-Arch_MocheAdobeDark', ak.hex_rgb('#a8835c'), 0.96),
    'plaster': ('MAT-Arch_MochePlaster', ak.hex_rgb('#dcc39c'), 0.92),
    'frieze_cream': ('MAT-Arch_MocheFriezeCream', ak.hex_rgb('#d9c48f'), 0.9),
    'frieze_red': ('MAT-Arch_MocheFriezeRed', ak.hex_rgb('#8f3b2c'), 0.9),
    'earth': ('MAT-Arch_MocheEarth', ak.hex_rgb('#b99a6b'), 0.98),
    'wood': ('MAT-Arch_MocheWood', ak.hex_rgb('#6b4a33'), 0.9),
    'dark': ('MAT-Arch_MocheDark', ak.hex_rgb('#241b15'), 1.0),
}

TILE = {
    'MAT-Arch_MocheAdobe': 2.8,
    'MAT-Arch_MocheAdobeDark': 2.8,
    'MAT-Arch_MochePlaster': 2.4,
    'MAT-Arch_MocheFriezeCream': 1.6,
    'MAT-Arch_MocheFriezeRed': 1.6,
    'MAT-Arch_MocheEarth': 4.0,
    'MAT-Arch_MocheWood': 1.2,
    'MAT-Arch_MocheDark': 1.5,
}

CONFIDENCE = {
    'huaca': 'inferred',
    'platform': 'inferred',
    'plaza': 'documented',
    'wall': 'documented',
    'niche_wall': 'documented',
    'hall': 'documented',
    'audiencia': 'inferred',
    'altar': 'documented',
    'frieze': 'documented',
}

BUDGET = {'huaca': ak.MONUMENT_BUDGET, 'audiencia': ak.MONUMENT_BUDGET}


def ramp(kit, cx, y_front, y_back, width, height, key):
    """A stepped access ramp (escalinata) rising from y_front (ground) to y_back (top)."""
    ak.stairs(kit, cx, y_front, y_back, width, height, 6 if kit.lod == 0 else 3, key)


def huaca(mats, lod):
    """Huaca del Sol: five battered adobe tiers, the painted frieze band that closes each front, a summit
    room and a long ramp down to the plaza. A representative massing, not a survey."""
    kit = ak.Kit(mats, MATERIALS, lod, 101)
    w, d, tier_h, inset, taper = 24.0, 16.0, 2.3, 1.6, 0.34
    for i in range(5):
        tw, td = w - 2 * inset * i, d - 2 * inset * i
        kit.frustum(0.0, 0.0, tw, td, i * tier_h, tier_h, taper, 'adobe')
        if lod == 0:
            kit.box(0.0, -td / 2 + taper * 0.6, i * tier_h + tier_h * 0.34, tw - 1.0, 0.14, tier_h * 0.4,
                    'frieze_red' if i % 2 == 0 else 'frieze_cream')
    top = 5 * tier_h
    kit.box(0.0, 0.0, top, 8.0, 5.0, 2.4, 'adobe')
    kit.box(0.0, 0.0, top, 2.2, 0.16, 1.7, 'dark')
    kit.box(0.0, 0.0, top + 2.4, 8.3, 5.3, 0.22, 'adobe')
    ramp(kit, -6.6, -13.0, -8.0, 4.4, top * 0.58, 'adobe')
    return kit


def platform(mats, lod):
    """Huaca de la Luna and the Chimú terraces: two battered tiers, a summit room and a short ramp."""
    kit = ak.Kit(mats, MATERIALS, lod, 111)
    kit.frustum(0.0, 0.0, 14.0, 10.0, 0.0, 2.3, 0.26, 'adobe')
    kit.frustum(0.0, 0.0, 10.4, 6.9, 2.3, 2.1, 0.22, 'adobe')
    kit.box(0.0, -0.8, 4.4, 5.6, 3.0, 1.9, 'plaster')
    kit.box(0.0, -0.8, 6.3, 5.9, 3.3, 0.2, 'adobe')
    kit.box(0.0, -0.8, 4.4, 1.6, 0.14, 1.3, 'adobe')
    if lod == 0:
        kit.box(0.0, -3.55, 2.4, 6.0, 0.12, 0.5, 'plaster')
    ramp(kit, 0.0, -9.4, -4.6, 3.4, 2.4, 'earth')
    kit.box(0.0, -3.6, 2.3, 2.2, 2.2, 2.1, 'adobe')
    return kit


def plaza(mats, lod):
    """Packed-earth ceremonial floor inside a low adobe kerb; walkable, no footprint."""
    kit = ak.Kit(mats, MATERIALS, lod, 121)
    w, d = 30.0, 20.0
    kit.box(0.0, 0.0, 0.0, w, d, 0.12, 'earth')
    for sx, sy, lx, ly in ((0, -1, w, 0.5), (0, 1, w, 0.5), (-1, 0, 0.5, d), (1, 0, 0.5, d)):
        kit.box(sx * (w / 2 - 0.25), sy * (d / 2 - 0.25), 0.12, lx, ly, 0.22, 'adobe_dark')
    return kit


def wall(mats, lod):
    """A 10 m adobe compound wall with a battered foot and a coping; the layout leaves the openings."""
    kit = ak.Kit(mats, MATERIALS, lod, 131)
    length, height, thick = 10.0, 2.6, 1.1
    kit.slab((-length / 2, 0.0), (length / 2, 0.0), thick + 0.3,
             [(0, 0), (length, 0), (length - 0.3, height * 0.6), (0.3, height * 0.6), (0.15, height),
              (length - 0.15, height)], 'adobe')
    kit.box(0.0, 0.0, height, length + 0.12, thick + 0.16, 0.18, 'adobe_dark')
    return kit


def niche_wall(mats, lod):
    """A Chimú adobe wall with four recessed niches on its front face, as at Chan Chan."""
    kit = ak.Kit(mats, MATERIALS, lod, 141)
    length, height, thick = 10.0, 3.0, 1.3
    kit.box(0.0, 0.0, 0.0, length, thick, height, 'adobe')
    kit.box(0.0, 0.0, height, length + 0.14, thick + 0.18, 0.2, 'adobe_dark')
    if lod == 0:
        for i in range(4):
            x = -length / 2 + length * (i + 0.5) / 4
            kit.box(x, -thick / 2 - 0.03, 1.15, 1.15, 0.1, 1.2, 'dark')
            kit.box(x, -thick / 2 - 0.06, 2.35, 1.45, 0.12, 0.14, 'adobe_dark')
    return kit


def hall(mats, lod):
    """A flat-roofed adobe hall (patio, workshop or store) with a door and a low bench."""
    kit = ak.Kit(mats, MATERIALS, lod, 151)
    w, d, height, thick = 8.0, 6.0, 3.0, 0.6
    ak.wall(kit, w, d, height, thick, front=[(4.0, 1.4, 1.9, 0.0)], wall_key='adobe', hole_key='wood')
    ak.flat_roof(kit, w, d, height, 'earth', 'adobe')
    kit.box(-2.4, -d / 2 + 0.5, 0.0, 1.2, 0.8, 0.5, 'adobe_dark')
    return kit


def audiencia(mats, lod):
    """The Chimú audiencia: a raised hall on its own platform, reached by a front ramp, with niches and a
    stepped upper volume. The compound's monument piece."""
    kit = ak.Kit(mats, MATERIALS, lod, 161)
    kit.frustum(0.0, 0.0, 9.0, 7.0, 0.0, 1.3, 0.2, 'adobe')
    inner_w, inner_d, height = 7.0, 5.0, 2.6
    ak.wall(kit, inner_w, inner_d, height, 0.55, front=[(inner_w / 2, 1.4, 1.8, 0.0)], wall_key='plaster')
    kit.box(0.0, 0.0, 1.3 + height, inner_w + 0.3, inner_d + 0.3, 0.26, 'earth')
    if lod == 0:
        for i in range(3):
            x = -2.2 + i * 2.2
            kit.box(x, -inner_d / 2 - 0.03, 2.45, 0.8, 0.08, 1.0, 'dark')
    kit.box(0.0, inner_d / 2 - 0.8, 1.3 + height, 4.2, 2.2, 1.4, 'adobe')
    kit.box(0.0, inner_d / 2 - 0.8, 2.7 + height, 4.5, 2.5, 0.2, 'adobe')
    return kit


def altar(mats, lod):
    """A small stepped altar at the plaza edge."""
    kit = ak.Kit(mats, MATERIALS, lod, 171)
    kit.box(0.0, 0.0, 0.0, 4.2, 3.2, 0.6, 'adobe_dark')
    kit.box(0.0, 0.0, 0.6, 2.9, 2.1, 0.6, 'adobe')
    kit.box(0.0, 0.0, 1.2, 1.5, 1.1, 0.55, 'plaster')
    if lod == 0:
        kit.box(0.0, -1.62, 0.2, 2.2, 0.1, 0.3, 'frieze_cream')
    return kit


def frieze(mats, lod):
    """A freestanding painted panel: cream field, red band and a dark register, the Moche plaza face."""
    kit = ak.Kit(mats, MATERIALS, lod, 181)
    length, height, thick = 10.0, 2.6, 0.5
    kit.box(0.0, 0.0, 0.0, length, thick, height, 'frieze_cream')
    if lod == 0:
        for side in (-1, 1):
            kit.box(0.0, side * (thick / 2 + 0.04), 0.8, length - 0.5, 0.1, 0.9, 'frieze_red')
            kit.box(0.0, side * (thick / 2 + 0.04), 0.38, length - 0.5, 0.1, 0.24, 'dark')
    kit.box(0.0, 0.0, height, length + 0.2, thick + 0.2, 0.18, 'adobe_dark')
    return kit


ASSETS = {
    'huaca': huaca,
    'platform': platform,
    'plaza': plaza,
    'wall': wall,
    'niche_wall': niche_wall,
    'hall': hall,
    'audiencia': audiencia,
    'altar': altar,
    'frieze': frieze,
}

def main():
    ak.run_kit(
        kit=KIT,
        materials=MATERIALS,
        tile=TILE,
        assets=ASSETS,
        budgets=BUDGET,
        confidence=CONFIDENCE,
        sources=[
            'docs/historia/arquitectura.md',
            'docs/design/moche-chimu-sites.md',
            'docs/historia/civilizaciones/moche.md',
            'docs/historia/campanas/moche_recuay.md',
            'docs/historia/campanas/chimu_inca.md',
            'docs/design/moche-sacred-site.md',
            'docs/design/chimu-site.md',
        ],
        collision='mocheCityBlockers / chimuCityBlockers in src/model/defs/mocheChimuCity.ts',
        export_dir=EXPORT_DIR,
        game_dir=GAME_DIR,
        source_blend=SOURCE_BLEND,
        tint_sets={'flat': ('earth',), 'earth': ('earth',), 'dark': ('dark', 'wood')},
    )


if __name__ == '__main__':
    main()
