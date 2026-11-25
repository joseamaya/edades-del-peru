# Independence kit: Ayacucho and Breña

**Status:** Living. The kit draws the Ayacucho chapel and patriot camp (`m8_independencia`) and the
sierra-central camp of La Breña (`m_brena`) from one set of Blender pieces, one placement file and one
blocker source. It is a project-owned low-poly abstraction, **not** a survey and **not** a historical
photograph.

## Sources

- `docs/historia/arquitectura.md`
- `docs/historia/campanas/independencia.md`, `brena.md`
- [`independencia-model-mission.md`](./independencia-model-mission.md),
  [`brena-model-mission.md`](./brena-model-mission.md)

## Runtime source

- Script: `scripts/blender/build_independence_architecture_kit.py`; kit scene
  `art-src/blender/scenes/independence_architecture_kit.blend` (Git LFS).
- Game GLBs: `src/assets/architecture/independence/independence_<piece>_lod0.glb` and `_lod1.glb`
  (8 pieces, 16 files, 176,056 B ≈ 172 KB), meshopt-compressed with `yarn art:models --only=<basenames>`.
  Uncompressed exports and per-piece manifests live in
  `art-src/blender/exports/independence/architecture/`.
- Registration: `ArchitectureKitId` `independence` in `src/model/defs/architectureKit.ts`;
  `KIT_URLS.independence` (`import.meta.glob`) and `ARCH_SURFACES` in `src/rendering/architectureKit.ts`.
- Layout and collision: `src/model/defs/independenceCity.ts` places both compositions
  (`INDEPENDENCE_CITY_LAYOUT`, `BRENA_CITY_LAYOUT`); `layoutBlockers` derives each site's blockers from
  the same placements. `WorldViewDecor` bakes the city with `ArchitectureCity`; both site definitions set
  `simulationCollision: true`, so the headless match blocks the same pieces.
- Retired: the `independence_site` chapel/camp GLB is a registry fallback and is not loaded (`hideModel`).

## Terrain measurement

Sampled from the authored heightfields before placing. `ArchitectureCity` seats each piece on the lowest
ground under its footprint (the parade ground uses the highest and a `lift`). Both sites are flat at 5.0 m
(the Ayacucho terrace and the Mantaro camp pad); the Mantaro pass falls to 2.9 m, off the camp footprint.

## Materials

Eight Principled materials for the whole kit, box-projected UVs at world scale, a COLOR_0 tint and no
textures in the GLBs. At runtime the shared PBR detail sets are mapped by `ARCH_SURFACES`.

| Material | Runtime set | Use |
| --- | --- | --- |
| `MAT-Arch_IndependencePlaster` | `plaster_detail`, kept colour | Chapel and hacienda walls |
| `MAT-Arch_IndependenceAdobe` | `plaster_detail`, kept colour | Community houses and hearths |
| `MAT-Arch_IndependenceTile` | `tile`, pulled towards luma and lifted | Chapel, tower and hacienda roofs |
| `MAT-Arch_IndependenceStone` | `wall_fieldstone`, lifted | Bases, camp walls, wells, kerbs |
| `MAT-Arch_IndependenceWood` | `wood` | Doors, tent poles, well frame, cross |
| `MAT-Arch_IndependenceCanvas` | `plaster_detail`, kept colour | Tents |
| `MAT-Arch_IndependenceEarth` | `plaster_detail`, kept colour | Packed parade ground, earth roofs and bank |
| `MAT-Arch_IndependenceDark` | `plaster_detail`, kept colour | Openings, belfry and tent entrance |

Maximum 4 materials per piece; LOD0 ≤ 5k and LOD1 ≤ 1.5k triangles, with the chapel as the monument piece
(≤ 8k / 2.4k).

## Pieces

| Asset | Composition | Footprint |
| --- | --- | --- |
| `chapel` | 14 × 8 m nave, three-arch front, bell tower, tile gable roof and cross | 14 × 8 m |
| `hacienda` | One-storey campaign store with a three-arch porch and tile roof | 9 × 6 m |
| `community_house` | Adobe house with a flat earth roof and hearth | 6 × 4 m |
| `tent` | Canvas A-frame on a ridge pole, pegs and dark entrance | 3 × 2.4 m |
| `camp_wall` | 10 m stone camp wall with a coping | 10 × 0.7 m |
| `parade_ground` | 24 × 16 m packed-earth parade ground with a stone kerb | none (floor) |
| `well` | Stone well with two posts and a crossbar | 2.2 × 2.2 m |
| `earthwork` | 10 m earth bank with a stone revetment | 10 × 1.4 m |

## Compositions

- **Ayacucho (`m8_independencia`).** The parade ground at the site, the chapel closing the north side,
  the hacienda closing the south, four tents on the flanks, low boundary walls behind both buildings and
  the well. The **east–west lane stays open (about 8.5 m clear between the padded tent blockers)**: the
  Junín–Ayacucho march and the walkable corridor cross the site, so the camp cannot enclose it. The
  chapel, hacienda, tents, walls and well block; the parade ground stays walkable.
- **Breña (`m_brena`).** A tighter sierra camp without the chapel: two community houses north, the
  hacienda/camp store south, three tents, a stone corral in the south-west, the earth bank on the north
  edge and the well. The central lane stays open for the mission's columns. The site keeps the camp anchor
  `(179.7, 94.7)` — the camp east of Huamachuco — while the mission focus and hold stay at Huamachuco.

## Attested elements and abstractions

| Element | Source status | In game |
| --- | --- | --- |
| Campaign chapel | Documented rural Andean religious architecture | Nave, three-arch front, bell tower and tile roof. |
| Patriot camp | Campaign context | Tents, hacienda, low walls, parade ground and well. |
| Huamachuco / sierra camp | Documented campaign setting | Community houses, tents, corral and earth bank. |
| Exact chapel, camp plan or tent count | Not reproduced | Marked plausible in the manifests; never a survey. |

## Evidence

`docs/media/independence-kit-before-after.webp` (two rows, Ayacucho and Breña, before and after, same
mission, seed, camera and light). Produced with:

```
yarn shot independence-m8 --url="/?mission=m8_independencia&seed=777&fog=0&intro=0" \
  --click --site --height=56 --no-hud --no-labels --wait=7000
yarn shot independence-brena --url="/?mission=m_brena&seed=777&fog=0&intro=0" \
  --click --site --height=56 --no-hud --no-labels --wait=7000
mkdir -p review/independence-after
cp review/independence-m8_0.png review/independence-after/m8_0.png
cp review/independence-brena_0.png review/independence-after/brena_0.png
# before row: run the same two commands from a worktree at the parent commit, then copy its
# review/independence-*_0.png into review/independence-before/{m8,brena}_0.png
node scripts/independence_sites_sheet.mjs --before=review/independence-before \
  --after=review/independence-after --out=docs/media/independence-kit-before-after.webp
```

## Tests

- `tests/independence-architecture-kit.test.ts` — §4.2 budgets, 8 materials, game GLBs and
  `ARCH_SURFACES`, every layout asset in the kit, both blocker sets, the open lanes, ≥2 m gaps, the chapel
  proxy and the site collision.
- `tests/authored-sites.test.ts`, `tests/site-landmarks.test.ts`, `tests/campaign-layout.test.ts`.
- `tests/e2e/brena.spec.ts`, the m8 playtest and the `m8_independencia`/`m_brena` completable cases.
