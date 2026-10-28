# Caral sacred city (mission 1)

Scene design for `m1_caral`. The playable site is the exact Caral remaster v2
GLB from Ciudades Sagradas, based on the published Upper/Lower halves, the UNESCO
dimensions and the documented sectors. It is an artistic reconstruction, **not**
a survey and **not** a historical photograph.

## Sources

- UNESCO WHC 1269, _Sacred City of Caral-Supe_: <https://whc.unesco.org/en/list/1269/>.
- UNESCO advisory-body evaluation 1269 (Upper/Lower Half, six pyramids, plazas,
  residential units, painted plaster): ICOMOS, 2009.
- R. Shady Solís, _The Caral-Supe Civilization: 5,000 years of Cultural Identity
  in Peru_ (Zona Arqueológica Caral, 2005). Sectors, dimensions and La Huanca.
- R. Shady Solís, _The social and cultural values of Caral-Supe…_ (Zona
  Arqueológica Caral, 2008): Central Plaza, Plaza de la Huanca, E/H sectors.
- Zona Arqueológica Caral: <https://zonacaral.gob.pe/>.
- `docs/historia/civilizaciones/caral.md`, `docs/historia/arquitectura.md`,
  `docs/historia/mapas.md`, `docs/historia/campanas/caral.md`.

## Runtime source

`m1_caral` uses the exact `caral_site` GLB from Ciudades Sagradas, at `y = 8`,
instead of the modular landmark or a hand-built schematic:

- **Source**: `ciudades-sagradas/public/cities/caral/model_lod0.glb` and
  `model_lod1.glb`, from the `caral_remaster_v2.blend` source scene.
- **Assets**: copied to `src/assets/sites/caral/caral_site_lod0.glb` and
  `caral_site_lod1.glb`; LOD1 is the default runtime mesh, `?lod=0` previews the
  LOD0 detail mesh.
- **Loader**: `src/rendering/siteModels.ts` and `src/rendering/StaticModel.ts`
  decode Draco + WebP. `Infra_Terrain` and `Infra_Reference` are hidden.
- **Transform**: the source is scaled uniformly by `0.25` and translated so the
  Great Pyramid is centred at `{x: 100, z: 30}` on the 192 m map. No vertical
  exaggeration is applied.
- **Terrain**: the source terrain is hidden. The game heightfield owns the
  ground, meanders the green floodplain and its sandy banks, carves a 0.55 m basin
  under the Plaza Mayor so the source's sunken floor and red rings remain
  visible, and raises dry foothills beyond the north, east and south edges of the
  site.
- **Reading the basin**: the authored-only palette separates the wet valley
  floor, the pale desert terrace and the dry lomas by height and slope. Snow is
  suppressed on these 20–25 m foothills, which are lomas, not snowfields. The
  mission opens at a wider zoom (`height 54`) so the base, the green valley and
  the city share the first frame.
- **Collision**: the monumental volumes use axis-aligned footprints from the
  source mesh (`CARAL_SITE_BLOCKERS`), and the low residential/retaining walls are
  rasterized from the source's vertical faces into the pathfinding grid. Units
  route around both while the open plazas and processional ground stay walkable.
  Construction is forbidden over the source footprint (`buildKeepout`), but the
  starting base and its immediate surroundings stay buildable.
- **Mission anchors**: `layout.site.focus` points to the real Plaza Mayor
  (`{x: 0.52, z: 0.277}`); `siteAnchor` remains the Great Pyramid at
  `{x: 100, z: 30}`.
- **Residential fabric**: the source's low-walled residential compounds are kept
  as modelled. No invented roofs or houses are added. Normal game-side base
  vegetation and resources remain outside the source site.
- The base sits in Caral Bajo at `{x: 0.315, z: 0.84}` (≈60.5, 161.3 on the 192 m
  map); Caral Alto and the Great Pyramid remain a short walk north.
- The site keep-out is `{x: 0.52, z: 0.45, rx: 0.27, rz: 0.43}`. It excludes
  resources, not the starting base or prior player buildings.
- The river stays west of the city. Caral itself is on the dry terrace; only the
  low floodplain is green. There is no sea adjacent to the site.

## Attested elements modelled

| Element                                                             | Source status       | In game                                                                              |
| ------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------ |
| Dry desert terrace over the green Supe valley                       | Documented (UNESCO) | Authored heightfield: terrace ≈8 m, floodplain ≈3.9 m, river bed ≈1.05 m.            |
| Andean foothills around the valley                                  | Geographic context  | Dry lomas rising to ~25 m at the east and ~18 m south/north, outside the site.       |
| Upper Half (Caral Alto)                                             | Documented          | Six pyramids, Central Plaza and Plaza de la Huanca.                                  |
| Lower Half (Caral Bajo)                                             | Documented          | Player base, smaller residences and workshops around the Anfiteatro.                 |
| Great Pyramid (E Sector)                                            | Documented          | Seven-tier pyramid, long processional stair, summit room and circular forecourt.     |
| Central, Quarry, Lesser, Gallery, Huanca pyramids                   | Documented names    | Five smaller pyramids at schematic plan anchors.                                     |
| Central Plaza / Plaza de la Huanca                                  | Documented          | Earth-paved plaza with stone borders and benches; secondary plaza with the monolith. |
| Sunken circular plazas                                              | Documented          | Great Pyramid and Amphitheatre Temple forecourts.                                    |
| Residential units B1, B2, B5; Greater Residential Complex; E2-E3; Q | Documented          | Walled compounds with stone footings, rooms, patios and inferred thatch roofs.       |
| Amphitheatre Temple, Round Altar, Bench Temple                      | Documented          | Temple platform, reduced round altar and bench, with a small hearth.                 |
| Processional paths                                                  | Abstraction         | Visual-only sand paths; they do not grant collision or speed.                        |
| Stone retaining walls, mud mortar, `shicras` fill, painted plaster  | Documented          | Cream plaster, stone cornices and restrained ochre/red bands.                        |
| No defensive walls, weapons or warrior class                        | Documented absence  | No fortifications or military props in the site.                                     |
| No attested market at Caral                                         | Documented absence  | The site contains no market stalls; the plaza-gathering abstraction is not a market. |

## Deliberate abstractions

- **Scale**: the source model is compressed uniformly to 0.25 of its source
  metres; proportions, terraces and residential footprints are preserved.
- **Source reconstruction**: the GLB is an artistic reconstruction with inferred
  perishable roofs, awnings, fires and painted surfaces; the exact plan is not a
  survey.
- **Residential compounds**: the source models low-walled patio compounds, not
  individual roofed houses. They stay as modelled. Adding roofs or new houses
  would be an invention, not a correction.
- **Plazas**: the source provides the Plaza Mayor floor, red rings, hearth and
  stairs; the game only provides the shallow terrain basin beneath them.
- **No invented history**: no rulers, battles, weapons or market are added.

## Implementation

- Source assets: `src/assets/sites/caral/caral_site_lod0.glb` /
  `caral_site_lod1.glb`, copied from Ciudades Sagradas.
- Runtime: `src/core/Game.ts` loads the site through `src/rendering/siteModels.ts`
  (Draco + WebP), hides `Infra_Terrain` / `Infra_Reference`, applies the uniform
  0.25 transform and registers the visible Great Pyramid and Anfiteatro for field
  cards.
- Heightfield: `yarn build:caral-heightmap` (`scripts/build_caral_heightmap.py`)
  → `src/model/defs/caralHeightmap.ts`; sampled by `src/rendering/Terrain.ts`
  through `src/model/defs/authoredTerrain.ts`.
- Mission layout: `src/campaign/defs/campaign.ts` and `src/campaign/types.ts`
  (`layout.site`, 192 m map, base in Caral Bajo, Plaza Mayor focus).
- Heritage proxies: invisible raycast volumes in `Game.ts` map the six pyramids
  and the Anfiteatro to their existing field cards. Their source AABBs feed the
  rectangular pathfinding blockers in `src/model/defs/caralSite.ts`.
- Construction: `MissionSite.buildKeepout` in `src/campaign/defs/campaign.ts`
  rejects placement over the upper, residential and lower source footprints; the
  Caral Bajo base remains outside them.
- Low walls: `Game.addSiteWallCollision` rasterizes vertical `Infra_Residential`,
  `Infra_LowerHalf` and low `Infra_UpperHalf` faces into `Pathfinder.blockCells`;
  the static mask survives dynamic-obstacle rebuilds.
- Terrain palette: `src/assets/textures/terrain/caral_*`, with height/slope bands
  for the green valley floor, pale terrace and warm lomas. The rock slot reuses
  the smooth sand albedo for Caral because the photographic rock/dirt normals
  alias into a repeating floral pattern at RTS tiling.

## Status

The monumental volumes and low residential/retaining walls block pathing;
construction remains forbidden over the `buildKeepout` footprint. Sand paths and
fine wall details remain visual-only, so a full survey-accurate collision plan is
still future work. Render captures are QA artefacts, not historical photographs.
