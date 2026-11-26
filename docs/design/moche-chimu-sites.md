# Moche kit: Huacas de Moche and Chan Chan

The two north-coast missions draw their architecture from a shared Blender kit: the Huacas del Sol y de la
Luna (`m3_moche_recuay`) and the Chimú compound of Chan Chan (`m6_chimu_inca`). Both are project-owned
representative massings, **not surveys and not historical photographs**.

## Sources

- [`../historia/arquitectura.md`](../historia/arquitectura.md), [`../historia/civilizaciones/moche.md`](../historia/civilizaciones/moche.md)
- [`../historia/campanas/moche_recuay.md`](../historia/campanas/moche_recuay.md),
  [`../historia/campanas/chimu_inca.md`](../historia/campanas/chimu_inca.md)
- [`moche-sacred-site.md`](./moche-sacred-site.md), [`chimu-site.md`](./chimu-site.md)

## Runtime source

- Pieces: `src/assets/architecture/moche/moche_<piece>_lod{0,1}.glb` (9 pieces, 18 files).
- Builder: `scripts/blender/build_moche_architecture_kit.py` on the shared `scripts/blender/arch_kit.py`
  (the Caral method: bmesh masses, box-projected UVs at world scale, a COLOR_0 tint, shared PBR detail sets
  at runtime). Kit scene `art-src/blender/scenes/moche_architecture_kit.blend` (Git LFS).
- Uncompressed exports and per-piece manifests (triangles, materials, bounds, budget, `confidence`,
  sources, collision, review state) in `art-src/blender/exports/moche/architecture/`; the
  game copies are meshopt-compressed with `yarn art:models --only=<file>`.
- Layout: [`../../src/model/defs/mocheChimuCity.ts`](../../src/model/defs/mocheChimuCity.ts) places both
  compositions and derives each site's blockers from the same placements (`layoutBlockers`).
  `WorldViewDecor` bakes them with `ArchitectureCity`; the sites set `hideModel` and `simulationCollision`,
  so the headless match blocks the same buildings. The old `moche_site` and `chimu_compound` GLBs stay in
  the registry as fallbacks and are no longer drawn.
- `?lod=0` previews LOD0.

## Terrain measurement

Sampled from the authored heightfields before placing. `ArchitectureCity` seats each piece on the lowest
ground under its footprint and sinks it 0.08 m; the pads below are what the layouts were checked against:

| Site | Pad |
| --- | --- |
| Huacas de Moche (the flat huacas terrace, `mocheHeightmap.ts`) | 6.0 m |
| Chan Chan (the Chimú terrace, `chimuHeightmap.ts`) | 5.0 m |

Every placement sits on its pad within 0.03 m; the Chimú compound stays inside the flat core so no piece
seats on the surrounding ramp.

## Materials

Eight Principled materials for the whole kit, ≤ 4 per piece, no textures in the GLBs. At runtime the shared
PBR detail sets are mapped by `ARCH_SURFACES`.

| Material | Runtime set | Use |
| --- | --- | --- |
| `MAT-Arch_MocheAdobe` | `plaster_detail`, kept colour | Huaca tiers, walls, halls, platforms |
| `MAT-Arch_MocheAdobeDark` | `plaster_detail`, kept colour | Copings, kerbs, shadowed adobe |
| `MAT-Arch_MochePlaster` | `plaster_detail`, kept colour | Lime-plastered summit rooms |
| `MAT-Arch_MocheFriezeCream` | `plaster_detail`, kept colour | Painted frieze field |
| `MAT-Arch_MocheFriezeRed` | `plaster_detail`, kept colour | Painted frieze bands |
| `MAT-Arch_MocheEarth` | `plaster_detail`, kept colour | Packed plaza floor, earth roofs, ramps |
| `MAT-Arch_MocheWood` | `wood` | Door leaves, lintels, benches |
| `MAT-Arch_MocheDark` | `plaster_detail`, kept colour | Doors, niches, openings |

LOD0 ≤ 5k and LOD1 ≤ 1.5k triangles per piece, with the huaca and the audiencia as monument pieces
(≤ 8k / 2.4k).

## Pieces

| Asset | Composition | Footprint |
| --- | --- | --- |
| `huaca` | Five battered adobe tiers with a painted band on each front, summit room and stepped ramp | 24 × 21 m (with the ramp) |
| `platform` | Two battered tiers, a plastered summit room and a stepped front ramp | 14 × 14.4 m (with the ramp) |
| `plaza` | Packed-earth floor inside a low adobe kerb | none (walkable) |
| `wall` | 10 m battered adobe wall with a coping | 10.1 × 1.4 m |
| `niche_wall` | Chimú wall with four recessed niches on the front | 10.1 × 1.5 m |
| `hall` | Flat-roofed adobe hall with a door, lintel and bench | 8.3 × 6.3 m |
| `audiencia` | Raised Chimú hall with niches and a stepped upper volume | 9 × 7 m |
| `altar` | Small stepped altar | 4.2 × 3.3 m |
| `frieze` | Painted panel, bands on both faces | 10.2 × 0.7 m |

## Compositions

- **Huacas de Moche (`m3_moche_recuay`).** The Huaca del Sol (24 × 16 m base, five tiers, banded friezes)
  and the Huaca de la Luna (terraced platform with its altar) close the north side of a 30 × 20 m plaza.
  Painted panels and the plaza altar sit on the south edge; two patio halls and two low walls frame the
  north; one east wall closes the site. The player's base lies south-west, so the **south and west stay
  open** and the panels leave a 13.8 m central gap.
- **Chan Chan (`m6_chimu_inca`).** A 24 × 17 m compound plaza, the terraced platform with the audiencia on
  its summit, two niched walls on the flanks, two on the north and two on the south with the **6 m central
  gate** the approach passes through.

The ramps are solid and included in the footprints, so units walk around them instead of through the slope.

## Attested elements and abstractions

| Element | Source status | In game |
| --- | --- | --- |
| Huaca del Sol | Documented stepped platform; original height inferred | Five battered adobe tiers with painted frieze bands. |
| Huaca de la Luna | Documented platform and ceremonial complex | Terraced platform, summit room and altar. |
| Painted friezes | Documented in Moche architecture | Abstract cream/red bands, never iconographic copies. |
| Moche plaza and patios | Documented public and elite spaces | Plaza with altar and panels; two patio halls. |
| Chan Chan compound and audiencias | Documented adobe compounds and audiencias | Niched walls, terraced platform and audiencia. |
| Exact dimensions, tier counts, niche counts | Not reproduced | Marked `inferred` in the manifests; never a survey. |

## Evidence

`docs/media/moche-kit-before-after.webp` (1772 × 978 WebP q74): two rows, the Huacas de Moche and Chan
Chan, before and after the kit, same mission, seed, camera and light. Produced with:

```
yarn shot moche --url="/?mission=m3_moche_recuay&seed=777&fog=0&intro=0" \
  --click --site --height=56 --no-hud --no-labels --wait=8000
yarn shot chimu --url="/?mission=m6_chimu_inca&seed=777&fog=0&intro=0" \
  --click --site --height=52 --no-hud --no-labels --wait=8000
mkdir -p review/moche-after
cp review/moche_0.png review/moche-after/moche_0.png
cp review/chimu_0.png review/moche-after/chimu_0.png
# before row: run the same two commands from a worktree at the parent commit, then copy its
# review/moche_0.png and review/chimu_0.png into review/moche-before/
node scripts/sites_sheet.mjs --before=review/moche-before --after=review/moche-after \
  --rows=moche,chimu --captions="Moche · ~500 d. C.,Chan Chan · ~1450" \
  --out=docs/media/moche-kit-before-after.webp \
  --footer="Moche kit · Huacas de Moche and Chan Chan · scripts/blender/build_moche_architecture_kit.py"
```

The two cinematic stills that look at the sites were regenerated with the kit:

```
node scripts/capture_cinema.mjs --mission=m3_moche_recuay --only=cine-huacas
node scripts/capture_cinema.mjs --mission=m3_moche_recuay --only=cine-plaza
node scripts/capture_cinema.mjs --mission=m6_chimu_inca --only=cine-costa
```

## Tests

- `tests/moche-architecture-kit.test.ts` — §4.2 budgets, ≤ 4 materials per piece, the eight kit materials,
  both layouts against the pieces, the blocker sets, the 2 m passages and the site collision/proxies.
- `tests/authored-sites.test.ts`, `tests/architecture-layout-blockers.test.ts`.
- `tests/e2e/moche-campaign.spec.ts`, `tests/e2e/chimu-campaign.spec.ts` and the `campaign-completable`
  cases for m3 and m6.
