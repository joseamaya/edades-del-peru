# Caral sacred city (mission 1)

Scene design for `m1_caral`. The Age of Empires II screenshot used as a mood
reference is **not** an archaeological reconstruction. The plan below follows
the published site description and only uses the screenshot for density,
camera framing and the warm desert palette.

## Sources

- UNESCO WHC 1269, *Sacred City of Caral-Supe* (description, Outstanding
  Universal Value, gallery): <https://whc.unesco.org/en/list/1269/>.
- UNESCO advisory-body evaluation 1269 (Upper/Lower Half, six pyramids, five
  plazas, residential units, painted plaster): ICOMOS, 2009.
- R. Shady Solís, *The Caral-Supe Civilization: 5,000 years of Cultural Identity
  in Peru* (Zona Arqueológica Caral, 2005). Sectors, dimensions and the
  `La Huanca` monolith.
- R. Shady Solís, *The social and cultural values of Caral-Supe…* (Zona
  Arqueológica Caral, 2008): Central/Plaza de la Huanca and the E/H sectors.
- Zona Arqueológica Caral: <https://zonacaral.gob.pe/>.
- `docs/historia/civilizaciones/caral.md`, `docs/historia/arquitectura.md`,
  `docs/historia/mapas.md`, `docs/historia/campanas/caral.md`.

## Attested elements modelled

| Element | Source status | In game |
|---|---|---|
| Dry desert terrace over the green Supe valley | Documented (UNESCO) | Two flattened desert pads above a green river valley. |
| Upper Half (Caral Alto) | Documented | Six Blender pyramids around the Central Plaza, including the modular Pyramid Mayor; elite residences stay procedural. |
| Lower Half (Caral Bajo) | Documented | Player base, smaller residences, workshops, and the modular Anfiteatro ensemble. |
| Great Pyramid (E Sector) | Documented | `greater`: modular Pyramid Mayor GLB on its planned pad; the other five pyramids use their own GLBs at the plan anchors. |
| Central, Quarry, Lesser, Gallery, Huanca pyramids | Documented names | Five further pyramids, smaller than the Great Pyramid. |
| Central Plaza / Plaza de la Huanca | Documented | Large open plaza; secondary plaza with the 2.3 m monolith. |
| Sunken circular plazas | Documented | Great Pyramid and Amphitheatre Temple (the largest). |
| Five open plazas in the Upper Half | Documented count (ICOMOS) | Central Plaza, Plaza de la Huanca and three pyramid forecourts. |
| Supe crossing | Not documented as a bridge; a crossing was necessary | Central dry stone ford/causeway; walkable, with the river on both sides. |
| Residential units B1, B2, B5; Greater Residential Complex; E2-E3 | Documented in the 2005/2009 reports | Low stone-and-mud compounds around patios and narrow rooms. |
| Amphitheatre Temple, Round Altar, Bench Temple, Q residence, Lesser Residential Complex, specialised workshop | Documented in the 2005/2009 reports | The modular Anfiteatro GLB replaces the temple/altar/bench triad; Q and the residential/workshop compounds stay procedural. |
| Additional residences (unnamed) | Plausible | Generic `upper_residence_*` / `lower_residence_*` compounds. |
| Processional paths | Abstraction | Visual-only connectors between the plazas, residences and temples. |
| Stone retaining walls, mud mortar, `shicras` fill, plastered and painted surfaces | Documented | Sand/cream plaster, light stone bands, restrained red/yellow accents. |
| No defensive walls, weapons or warrior class | Documented absence | No fortifications or military props in the set-piece. |

## Deliberate abstractions

- **Scale**: the 66 ha core is compressed into an RTS scene. Relative hierarchy
  and orientation are kept; metres are not.
- **Exact plan**: the six pyramids and named sectors are documented, but their
  exact relative coordinates are not reproduced. The arrangement is a
  `plausible` schematic anchored to the published Upper/Lower split.
- **Ford/causeway**: no bridge is documented at Caral. The central crossing is a
  `plausible` dry stone ford that keeps the river and lets units move between the
  Lower and Upper halves.
- **Roofs**: Caral's perishable roofs are not preserved. The scene leaves patios
  open and uses no tiled roofs; this is an `abstraction`, not a reconstruction.
- **Painted surfaces**: white/cream plaster with small yellow/red bands follows
  the UNESCO text. The precise colour scheme per building is not known.
- **Terrain**: the Supe river and floodplain are authored as a broad green valley
  for readability. The sea is not adjacent to the city; fishing is represented
  by the river/wetland and a distant coastal strip.
- **Screenshot**: its UI, unit scale and fantasy density are not copied.

## Implementation

- Data/plan: `src/model/defs/setpieces.ts` (`planCaralCity`, `inCaralCity`).
- Mission layout: `MissionDef.layout` and `MissionDef.mapOverrides` in
  `src/campaign/types.ts`; values in `src/campaign/defs/campaign.ts`.
- Terrain: `src/model/defs/terrainLayout.ts` + `generateHeightField` in
  `src/rendering/heightField.ts` (flats, fixed river valley, walkable ford).
- Models: `src/model/ProceduralModel.ts` (`buildCaralPyramid`,
  `buildCaralSunkenPlaza`, `buildCaralCompound`, `buildCaralMonolith`,
  `buildCaralCityModel`) for the surrounding city; the six pyramid GLBs and
  `caral_anfiteatro` for the lower ceremonial ensemble.
- Renderer: `src/rendering/SacredCity.ts` (merged by material; visual only).
- Heritage inspection: `src/model/defs/heritage.ts` and the landmark/canal picking path in `Game.ts`.
  Every modular pyramid and the Anfiteatro open a field card with sector, role, summary,
  confidence and sources; “Visitar” records the card without gating progress. The communal canal
  has a gate operation that raises the irrigation yield of nearby Andenes.
- Wiring: `src/core/Game.ts` (reserved footprints, fixed base, landmark, intro)
  and `src/rendering/Water.ts` (map-aligned depth sampling for inland rivers).

## Modular assets in the plan

The plan keeps the documented positions and hierarchy, while the six pyramids and the
Anfiteatro use modular Blender GLBs:

- `mainPyramid` is the anchor for the **Pyramid Mayor** GLB (`caral_pyramid_mayor`); the
  procedural `SacredCity` does not build it. The GLB keeps its own sand pad and fallback.
- The five remaining Upper-Half pyramids (`central`, `quarry`, `lesser`, `gallery`, `huanca`)
  are separate Blender GLBs placed at their authored plan anchors and filtered from the
  procedural plan.
- The **Anfiteatro** GLB (`caral_anfiteatro`) is placed at the `amphitheatre` plan site; the
  procedural `amphitheatre`, `round_altar` and `bench_temple` placements are filtered from the
  render because that GLB already contains the temple, altar and banqueta.
- The plazas, monolith, sunken plazas, compounds and the ford remain procedural and are
  merged by material.
- The plan's `width`/`depth` values are schematic layout bounds; each Blender module keeps its own
  source-derived mesh footprint and is not stretched to fill the plan row.
- All of these layers are visual-only; they do not add obstacles or entities. Collision footprints
  for the playable-building pass must come from the module bounds, not from the schematic plan rows.

## Guards

- `tests/setpieces.test.ts`: determinism, documented names/hierarchy, bounds,
  Upper/Lower separation, keep-out footprints.
- `tests/e2e/caral-city.spec.ts`: scene present, mesh/vertex budget, landmark
  alignment, all six modular pyramids and the Anfiteatro matching their plan
  anchors, no resources in the Upper-Half keep-out, no generic landscape ribbons,
  river present, deterministic reload.
- `tests/e2e/landmarks.spec.ts`: the modular landmark, fixed plan position and
  Anfiteatro fallback.
