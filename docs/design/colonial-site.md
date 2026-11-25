# Plaza y templo colonial (m7, Lima 1535/1821, Cusco 1814, Miraflores)

Scene design for the colonial sites. The playable site is a project-owned low-poly abstraction of a colonial
plaza and its buildings; the same Blender kit serves `m7_tupac_amaru`, `m_lima`, `m_lima_1821`,
`m_junta_cusco` and `m_miraflores`. It is **not** a survey and **not** a historical photograph.

## Sources

- `docs/historia/campanas/{tupac_amaru,lima,lima_1821,junta_cusco,miraflores}.md`
- `docs/historia/arquitectura.md`
- Colonial chronicles on Cusco's and Lima's urban order; Harth-Terré, Gutiérrez.

## Runtime source

- Kit: `src/assets/architecture/colonial/colonial_<piece>_lod0.glb` and `_lod1.glb` — `catedral` (nave,
  bell tower and cross), `cabildo` (five-arch arcade, gallery and balcony), `casona` (two storeys with the
  «balcón de cajón»), `portal` (four-arch arcade), `plaza` (paving and kerb), `pileta` (fountain) and
  `patio_wall`.
- Source: `scripts/blender/build_colonial_architecture_kit.py`, scene
  `art-src/blender/scenes/colonial_architecture_kit.blend` (Git LFS); per-piece manifests in
  `art-src/blender/exports/colonial/architecture/`.
- LOD1 is the RTS default; `?lod=0` previews LOD0.
- Composition: `src/model/defs/colonialCity.ts` (`colonialLayoutAt`), one Plaza Mayor around each site's
  anchor; the same layout yields the pathfinding blockers (`colonialCityBlockers`).
- The four site definitions (`colonial_site`, `lima_site`, `miraflores_site`, `cusco_junta_site`) hide the
  old `colonial_church` GLB, keep their authored heightfields (`colonialHeightmap.ts`,
  `limaHeightmap.ts`, `juntaHeightmap.ts`) and apply their blockers headless too
  (`simulationCollision`).
- A 1 m pathfinding grid and a walkable corridor connect each base to its site. Construction is forbidden
  over the plaza block.

## Colour and surfaces

The kit's materials are flat Principled colours with world-scale box-projected UVs; the runtime maps the
shared PBR sets onto them (`ARCH_SURFACES` in `src/rendering/architectureKit.ts`):

| Material | Runtime surface | Why |
| --- | --- | --- |
| Lime plaster, adobe, dark openings | `plaster_detail`, keeping the painted colour | trowel swirls and grit without changing the documented paint. |
| Tile roofs | photographed `tile`, keeping 42 % of its colour (58 % towards luma) + a light warm-neutral tint | the source texture is a saturated red; a warm multiply raises its saturation in linear space, which read as fresh paint. |
| Paving | `ground_plaza`, warmed and lifted | the floor has its own light set; the kerb and fountain keep the wall stone. |
| Stone (kerb, fountain, bands) | `wall_cutstone`, lifted 1.25 | the cut-stone mortar read black at the RTS zoom. |
| Wood | `wood` | balconies and doors. |

The plaza floor and the stone up-faces (kerb, fountain bowls, copings) skip the wall-foot grime in the
Blender vertex tint: horizontal ground at z ≈ 0 would otherwise read nearly black, so it gets a light mottle
instead. The kit is seven materials (the §4.2 ceiling is eight per kit and four per building). Evidence:
`docs/media/colonial-kit-color-before-after.webp`.

## Attested elements and abstractions

| Element | Source status | In game |
| --- | --- | --- |
| Cathedral | Documented typology; plan inferred | Nave, tiled gable roof, bell tower and cross; arched doorways as a legible abstraction. |
| Cabildo | Documented (Lima; Cusco 1814); plan inferred | Two storeys: five-arch arcade below, gallery and balcony above. |
| Portales | Documented (Plaza Mayor); plan inferred | Four-arch covered arcades on the east and west sides. |
| Casonas | Documented (Lima's balconies); sizes inferred | Two-storey houses with the closed wooden balcony over the street. |
| Plaza and fountain | Documented | Paved square with a kerb and the central stone fountain. |
| Patio walls | Documented | Adobe walls with a coping. |
| Exact plans and sizes | Not reproduced | A representative composition per site, not a survey; the manifests say `inferred`. |

## Implementation

- Mission data: `src/campaign/defs/missions/{m7_tupac_amaru,m_lima,m_lima_1821,m_junta_cusco,m_miraflores}.ts`.
- Layout and collision: `src/model/defs/colonialCity.ts`; site registry: `src/model/defs/sites.ts`;
  drawing: `ArchitectureCity` in `src/rendering/architectureKit.ts`.
- Heightfield: `scripts/build_colonial_heightmap.py` → `src/model/defs/colonialHeightmap.ts`.
- Heritage: `colonial_church` in `src/model/defs/heritage.ts`.
- Tests: `tests/architecture-layout-blockers.test.ts` (layout → blockers, the four sites),
  `tests/headless-game.test.ts` (headless collision), `tests/authored-sites.test.ts`,
  `tests/e2e/campaign.spec.ts`, `tests/e2e/campaign-completable.spec.ts`.

## Mission acts

The mission follows the documented arc (1780–1781), not a counterfactual capture of Cusco:

1. **Act I · Tinta–Tungasuca.** Micaela Bastidas musters the communities and their supplies at the
   camp, the rebels raise a barracks and the player marches to Tungasuca; the capture of Arriaga is
   narrated, not played.
2. **Act II · Sangarará (18 November 1780).** The column marches to the Sangarará road, where the
   royalists hold the town and its chapel. The player surrounds it and holds the field: it is the
   campaign's documented victory.
3. **Act III · the Cusco siege (January 1781).** The rebels occupy the slopes above the city and hold the
   siege lines. The relief from Lima breaks the siege; the player must withdraw Túpac Amaru to the
   departure point. The city is never taken; the epilogue tells the capture at Langui and the execution
   of 18 May 1781.

The cathedral is the Cusco plaza card; a smaller typological chapel anchors Sangarará on the road.
The map compresses Tinta, Tungasuca, Sangarará and Cusco into one transect; the royalist waves are an
abstraction of the documented actions, not a literal order of battle.

## Status

The site, heightfield, painted ground, collision, heritage card, three-act documented path, no-cheat
playtest and save/load path are implemented. The 256 m transects, the opening scenes in
`scripts/bench_scene.mjs`, the in-engine intro/epilogue captures (`scripts/capture_colonial_intro.mjs`) and
`modelMission: true` are part of the model-mission pass. The colonial kit replaces the approved
`colonial_church` GLB (2026-11-23) and is evidence-gated by `PROVENANCE.md`; there is no CI pixel gate.
