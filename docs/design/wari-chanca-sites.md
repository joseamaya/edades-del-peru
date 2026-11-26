# Wari kit: Wari complex and Chanca pucará

The two highland missions draw their architecture from a shared Blender kit: the Wari complex (`m4_wari`)
and the Chanca pucará of Yahuar Pampa (`m5_yahuar_pampa`). Both are project-owned representative massings,
**not surveys and not historical photographs**.

## Sources

- [`../historia/arquitectura.md`](../historia/arquitectura.md), [`../historia/civilizaciones/wari.md`](../historia/civilizaciones/wari.md)
- [`../historia/campanas/wari_tiahuanaco.md`](../historia/campanas/wari_tiahuanaco.md),
  [`../historia/campanas/yahuar_pampa.md`](../historia/campanas/yahuar_pampa.md)
- [`wari-sacred-site.md`](./wari-sacred-site.md), [`chanca-site.md`](./chanca-site.md)

## Runtime source

- Pieces: `src/assets/architecture/wari/wari_<piece>_lod{0,1}.glb` (9 pieces, 18 files).
- Builder: `scripts/blender/build_wari_architecture_kit.py` on the shared `scripts/blender/arch_kit.py`.
  Kit scene `art-src/blender/scenes/wari_architecture_kit.blend` (Git LFS); uncompressed exports and
  per-piece manifests in `art-src/blender/exports/wari/architecture/`; the game copies are meshopt-
  compressed with `yarn art:models --only=<file>`.
- Layout: [`../../src/model/defs/wariChancaCity.ts`](../../src/model/defs/wariChancaCity.ts) places both
  compositions and derives each site's blockers from the same placements (`layoutBlockers`).
  `WorldViewDecor` bakes them with `ArchitectureCity`; both sites set `hideModel` and `simulationCollision`.
  The old `wari_site` and `chanca_fortress` GLBs stay in the registry and are no longer drawn.
- `?lod=0` previews LOD0.

## Terrain measurement

Sampled from the authored heightfields before placing. `ArchitectureCity` seats each piece on the lowest
ground under its footprint and sinks it 0.08 m. `scripts/build_wari_heightmap.py` now stops the dry quebrada
at the site edge: it used to cut 0.9 m out of the complex's southern half, so the plaza bench sat ~0.8 m
below the temple.

| Site | Pad |
| --- | --- |
| Complejo Wari (`wariHeightmap.ts`) | 5.0 m (x 115–174, z 96–142 flat) |
| Pucará chanca (`chancaHeightmap.ts`) | 5.0 m (x 168–196, z 82–110 flat) |

The Wari galleries sit on the western pad edge and seat 0.25 m lower; everything else is within 0.1 m.

## Materials

Eight Principled materials for the whole kit, ≤ 4 per piece, no textures in the GLBs. At runtime the shared
PBR detail sets are mapped by `ARCH_SURFACES`.

| Material | Runtime set | Use |
| --- | --- | --- |
| `MAT-Arch_WariStone` | `wall_fieldstone`, warmed and lifted | Walls, towers, galleries, terrace faces |
| `MAT-Arch_WariCutstone` | `wall_cutstone`, warmed and lifted | Kerbs, copings, altars, merlons |
| `MAT-Arch_WariPlasterWhite` | `plaster_detail`, kept colour | Temple body, houses, murals |
| `MAT-Arch_WariPlasterRed` | `plaster_detail`, kept colour | Temple band, mural registers, altar |
| `MAT-Arch_WariEarth` | `plaster_detail`, kept colour | Plaza floor, roofs, terrace tops |
| `MAT-Arch_WariThatch` | `roof_thatch` | House and tower roofs |
| `MAT-Arch_WariWood` | `wood` | Door lintels |
| `MAT-Arch_WariDark` | `plaster_detail`, kept colour | Doors, niches |

LOD0 ≤ 5k and LOD1 ≤ 1.5k triangles per piece, with the D-shaped temple as the monument piece
(≤ 8k / 2.4k).

## Pieces

| Asset | Composition | Footprint |
| --- | --- | --- |
| `d_temple` | D-shaped plastered platform, red band, stone facade with three niches and a summit altar | 18 × 18 m |
| `plaza` | Packed floor inside a cut-stone kerb | none (walkable) |
| `gallery` | Long stone range with three niches and a parapeted flat roof | 14.3 × 5.3 m |
| `room` | Highland house, plastered walls, deep-eave thatch roof | 7.2 × 5.4 m |
| `pukara_wall` | Thick battered stone wall with merlons | 10 × 2.1 m |
| `tower` | Round stone tower with a thatch cone | 3.7 × 3.7 m |
| `mural` | Red and cream facade panel, painted on both faces | 10.2 × 0.7 m |
| `terrace` | Andén: stone-faced terrace carrying packed earth | walkable step |
| `altar` | Small stepped stone altar | 3.2 × 2.4 m |

## Compositions

- **Wari (`m4_wari`).** The D-shaped temple closes the north of a 26 × 18 m plaza; two painted panels and
  the altar sit on its south edge, the long galleries flank it, two highland houses stand behind, and
  two andenes frame the west and east. The provincial roads enter from the south, so that edge stays open.
- **Chanca (`m5_yahuar_pampa`).** The terraced enclosure inside thick stone walls on three sides, the two
  southern segments leaving the 4 m gate, four round towers at the corners and the altar on the terrace.

The pucará walls and towers form one trace: their corners close to a joint, and the gate is the only passage
through the south side. The terrace is a walkable step, not an obstacle.

## Attested elements and abstractions

| Element | Source status | In game |
| --- | --- | --- |
| D-shaped temple | Documented Wari plan type | Plastered D platform with the red band, facade and summit altar. |
| Walled plaza, galleries, andenes | Documented Wari ceremonial architecture | Plaza, two galleries and two andenes. |
| Red/cream facade painting | Documented Wari practice | Abstract registers on the temple and panels. |
| Chanca pucará walls, towers and gate | Documented highland defensive practice | Thick merloned walls, four round towers, one gate. |
| Exact plans, tier and tower counts | Not reproduced | Marked `inferred` in the manifests; never a survey. |

## Evidence

`docs/media/wari-kit-before-after.webp` (1772 × 978 WebP q74): two rows, the Wari complex and the Chanca
pucará, before and after the kit, same mission, seed, camera and light. Produced with:

```
yarn shot wari --url="/?mission=m4_wari&seed=777&fog=0&intro=0" \
  --click --site --height=56 --no-hud --no-labels --wait=8000
yarn shot chanca --url="/?mission=m5_yahuar_pampa&seed=777&fog=0&intro=0" \
  --click --site --height=48 --no-hud --no-labels --wait=8000
mkdir -p review/wari-after
cp review/wari_0.png review/wari-after/wari_0.png
cp review/chanca_0.png review/wari-after/chanca_0.png
# before row: run the same two commands from a worktree at the parent commit, then copy its
# review/wari_0.png and review/chanca_0.png into review/wari-before/
node scripts/sites_sheet.mjs --before=review/wari-before --after=review/wari-after \
  --rows=wari,chanca --captions="Wari · ~700 d. C.,Yahuar Pampa · ~1438" \
  --out=docs/media/wari-kit-before-after.webp \
  --footer="Wari kit · Wari complex and Chanca pucará · scripts/blender/build_wari_architecture_kit.py"
```

The site-bearing stills were regenerated with the kit:

```
node scripts/capture_cinema.mjs --mission=m4_wari --only=cine-complejo
node scripts/capture_wari_intro.mjs
node scripts/capture_chanca_intro.mjs
```

## Tests

- `tests/wari-architecture-kit.test.ts` — §4.2 budgets, ≤ 4 materials per piece, the eight kit materials,
  both layouts against the pieces, the blocker sets, the pucará trace joints and the site collision/proxies.
- `tests/heightmap-identity.test.ts` — the regenerated Wari field.
- `tests/e2e/wari-campaign.spec.ts`, the m4/m5 playtests and `campaign-completable`.
