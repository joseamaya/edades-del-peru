# Republican architecture kit (Arica, Real Felipe, Tarapacá)

**Status:** Living. The kit draws the three authored Republican sites (Arica 1880, the Real Felipe
1824–1826 and Tarapacá 1879) from one set of Blender pieces, one placement file and one blocker list.
It is a project-owned low-poly abstraction, **not** a survey and **not** a historical photograph.

## Sources

- `docs/historia/arquitectura.md`
- `docs/historia/campanas/guerra_del_pacifico.md`, `real_felipe.md`, `tarapaca.md`
- [`arica-site.md`](./arica-site.md), [`real-felipe-model-mission.md`](./real-felipe-model-mission.md),
  [`tarapaca-model-mission.md`](./tarapaca-model-mission.md)

## Runtime source

- Script: `scripts/blender/build_republic_architecture_kit.py`; kit scene
  `art-src/blender/scenes/republic_architecture_kit.blend` (Git LFS).
- Game GLBs: `src/assets/architecture/republic/republic_<piece>_lod0.glb` and `_lod1.glb` (14 pieces,
  28 files, 278,320 B ≈ 272 KB), meshopt-compressed with `yarn art:models --only=<basenames>`. Uncompressed exports
  and per-piece manifests live in `art-src/blender/exports/republic/architecture/`.
- Registration: `ArchitectureKitId` `republic` in `src/model/defs/architectureKit.ts`;
  `KIT_URLS.republic` (`import.meta.glob`) and `ARCH_SURFACES` in `src/rendering/architectureKit.ts`.
- Layout and collision: `src/model/defs/republicCity.ts` places each composition
  (`ARICA_CITY_LAYOUT`, `REAL_FELIPE_CITY_LAYOUT`, `TARAPACA_CITY_LAYOUT`); `layoutBlockers` derives every
  site's blockers from the same placements. `WorldViewDecor` bakes the city with `ArchitectureCity`; the
  three site definitions set `simulationCollision: true`, so the headless match blocks the same buildings.
- Retired: the `arica_site` battery GLB is no longer drawn (`hideModel`; it remains a registry fallback),
  and the mission-scoped `real-felipe`, `tarapaca-village`, `tarapaca-heights` and `tarapaca-pachica`
  procedural landmarks are gone.

## Materials

Eight Principled materials for the whole kit, box-projected UVs at world scale, a COLOR_0 tint and no
textures in the GLBs. At runtime the shared PBR detail sets are mapped by `ARCH_SURFACES`.

| Material | Runtime set | Use |
| --- | --- | --- |
| `MAT-Arch_RepublicBrick` | `wall_brick`, warm tint and lift | Real Felipe curtains, bastions and magazine |
| `MAT-Arch_RepublicStone` | `wall_fieldstone`, lifted | Battery, fort bases, kerbs, corral, parapet, outcrops |
| `MAT-Arch_RepublicAdobe` | `plaster_detail`, kept colour | Warehouse, quebrada houses and chapel |
| `MAT-Arch_RepublicEarth` | `plaster_detail`, kept colour | Earth gable roofs and flat parapet roofs |
| `MAT-Arch_RepublicWood` | `wood` | Pier, doors, lintels, gun carriages, flagpole |
| `MAT-Arch_RepublicPaving` | `plaster_detail`, kept colour | Packed-earth terrace, village plaza |
| `MAT-Arch_RepublicPlaza` | `ground_plaza` | Real Felipe courtyard paving |
| `MAT-Arch_RepublicDark` | `plaster_detail`, kept colour | Openings, embrasures, gun muzzles |

Maximum 4 materials per piece; LOD0 ≤ 5k and LOD1 ≤ 1.5k triangles, with the chapel and the bastion as
monument pieces (≤ 8k / 2.4k). Every piece is terrain-conformed; floors and the pier have no footprint and
stay walkable.

## Terrain measurement

Sampled from the authored heightfields before placing. `ArchitectureCity` seats each piece on the lowest
ground under its footprint (floors use the highest and a `lift`); the heights below are the pads the kit
was checked against:

| Pad | Height |
| --- | --- |
| Arica port terrace | 4.0 m |
| Callao fort pad (the mission overrides the site heightfield) | 3.535 m |
| Tarapacá village | 6.942 m |
| Tarapacá crest | 9.0–9.5 m |
| Pachica | 6.94 m |

## Pieces

| Asset | Composition | Footprint |
| --- | --- | --- |
| `apron` | Arica's paved port terrace and Tarapacá's packed plaza | none (floor) |
| `battery` | Five-gun stone rampart, terreplein, magazine, flagpole | 13 × 7.4 m |
| `warehouse` | Adobe port warehouse with a loading door and earth roof | 10 × 6 m |
| `pier` | Timber landing on piles | none (walkable) |
| `curtain` | 12 m brick curtain on a stone base, crenellated | 12 × 2.1 m |
| `bastion` | Pentagonal Real Felipe corner bastion | 10 × 8.5 m |
| `magazine` | Vaulted brick magazine under an earth roof | 8 × 6 m |
| `fort_plaza` | Paved fort courtyard | none (floor) |
| `well` | Stone well with timber frame | 2.2 × 2.2 m |
| `chapel` | Adobe nave, earth roof and espadaña | 7 × 10 m |
| `adobe_house` | Flat-roofed quebrada house with a low parapet | 8 × 6 m |
| `corral_wall` | 10 m stone corral wall | 10 × 0.7 m |
| `parapet` | 20 m stone crest parapet | 20 × 1 m |
| `outcrop` | Low rock outcrop for the heights | 3.4 × 2.8 m |

## Compositions

- **Arica.** The 30 × 22 m packed terrace, the battery facing the Pacific, the warehouse behind it and the
  pier running west. Only the battery and warehouse block; the apron and pier are walkable. The battery
  card still points at the drawn piece.
- **Real Felipe.** Four closed curtains on the north and east, four open 4 m sally gates on the south and
  west (the scripted sortie leaves through them), four corner bastions, a 30 × 24 m courtyard, the magazine
  in the north-west quadrant and the well in the south-east one. The courtyard stays open; the generic
  enemy centre and houses still spawn inside the fort, as the mission's besieged garrison.
- **Tarapacá.** The 18 × 11 m plaza at the village centre, the chapel closing the west end, eight houses
  around it, the east street clear for the first Chilean column, the crest parapet and three outcrops, and
  the Pachica hamlet with its four houses and three-wall corral. The houses, chapel, corral, parapet and
  outcrops block; the plaza and street stay walkable.

## Attested elements and abstractions

| Element | Source status | In game |
| --- | --- | --- |
| Port terrace, battery and warehouse | Documented port functions and defensive works | Kit pieces on the authored terrace. |
| Real Felipe bastions and curtains | Documented fort form | Kit trace; the 24 m side and gate positions are compressed for the RTS scale. |
| Adobe village, chapel and corral | Documented quebrada settlement | Kit houses, chapel with espadaña and stone corral. |
| Trench/parapet on the heights | Documented defensive line | Stone parapet and outcrops. |
| Exact plans, bay counts, gun counts | Not reproduced | Marked plausible in the manifests; never presented as a survey. |

## Evidence

`docs/media/republic-sites-before-after.webp` (1652×1351 WebP q74): three rows, Arica, Real Felipe and
Tarapacá, before and after the kit, same mission, seed, camera and light. Produced with:

```
yarn shot republic-arica --url="/?mission=m9_guerra_pacifico&seed=777&fog=0&intro=0" \
  --click --site --height=54 --no-hud --no-labels --wait=7000
yarn shot republic-real-felipe --url="/?mission=m_real_felipe&seed=777&fog=0&intro=0" \
  --click --site --height=56 --no-hud --no-labels --wait=7000
yarn shot republic-tarapaca --url="/?mission=m_tarapaca&seed=777&fog=0&intro=0" \
  --click --site --height=48 --no-hud --no-labels --wait=7000
mkdir -p review/republic-after
cp review/republic-arica_0.png review/republic-after/arica_0.png
cp review/republic-real-felipe_0.png review/republic-after/real-felipe_0.png
cp review/republic-tarapaca_0.png review/republic-after/tarapaca_0.png
# before row: run the same three commands from a worktree at the parent commit, then
# copy its review/republic-*_0.png into review/republic-before/{arica,real-felipe,tarapaca}_0.png
node scripts/republic_sites_sheet.mjs --before=review/republic-before --after=review/republic-after \
  --out=docs/media/republic-sites-before-after.webp
```

## Tests

- `tests/republic-architecture-kit.test.ts` — §4.2 budgets, ≤ 8 materials, the paving/plaza split, game
  GLBs and `ARCH_SURFACES`, every layout asset in the kit, the three blocker sets and the site collision.
- `tests/site-landmarks.test.ts` — the three Republican sites no longer use procedural landmarks; Vilcabamba
  keeps its refuge.
- `tests/authored-sites.test.ts`, `tests/tarapaca-battle.test.ts`, `tests/architecture-layout-blockers.test.ts`.
- `tests/e2e/real-felipe.spec.ts`, `tests/e2e/tarapaca.spec.ts`, the m9 playtest and the three
  `campaign-completable` cases.
