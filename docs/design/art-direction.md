# Art direction: stylized realism

Style guide for the visual quality target of Edades del Perú. **Caral (`m1_caral`) is the reference
scene**: every rule below is stated for Caral first and becomes the template for the other missions.

This guide sets the **target and the rules**. [`visual-language.md`](./visual-language.md) remains the
implementation map (which code owns terrain, materials, vegetation, colour). Historical facts and their
certainty live in [`docs/historia/campanas/caral.md`](../historia/campanas/caral.md); the mission design is
[`caral-model-mission.md`](./caral-model-mission.md).

Status: **adopted direction, not yet implemented**. Values marked _target_ are goals to verify in the first
vertical slice, not measurements.

## 1. Decision

The game uses **stylized realism**: believable materials and light, simplified and art-directed so the
scene reads clearly from the RTS camera. It is the approach Relic described for Age of Empires IV, where
readability at both far and near camera distances was the first visual priority
([Windows Central](https://www.windowscentral.com/age-empires-4-success-graphics),
[GamePressure](https://www.gamepressure.com/newsroom/age-of-empires-4-takes-flak-for-visuals-devs-respond/z13167)).

What it means here:

- **Real materials, simplified.** PBR (albedo, roughness, normal) with low-frequency colour variation and
  painted macro shading; no photographic noise at small scale.
- **Proportions tuned for the camera.** Heights and silhouettes are exaggerated relative to footprints so
  buildings, trees and people read at the default zoom.
- **One material language.** Terrain, vegetation, buildings, people and fauna share the same texel density,
  roughness range and lighting response.

What it is not:

- not **photoreal** (scans everywhere, micro-detail, film grain);
- not **flat low-poly** (untextured vertex colours, perfect CAD edges);
- not **hand-painted** (brush strokes, painted light baked into albedo).

## 2. The problem this guide fixes

Measured in `m1_caral` (seed 3000, 1600×900, `main` @ `b18b45f`, Intel integrated GPU):

| Area        | Today                                                            | Rule broken           |
| ----------- | ---------------------------------------------------------------- | --------------------- |
| Coherence   | Photographic ground scan + flat low-poly trees + block buildings | One material language |
| Vegetation  | 142 generic `broad` trees that read as palms                     | Regional species, §7  |
| Fauna       | 3 animals (pelicans) on the whole map                            | Living world, §8      |
| Ground      | Uniform sand with dense grey pebbles                             | Terrain layers, §5    |
| Sea         | Flat tropical turquoise                                          | Humboldt palette, §4  |
| City        | Clean volumes, empty plazas, outline-only houses                 | Living city, §9       |
| Scale       | Pyramid ≈ 4 people tall (estimated)                              | Scale rules, §3       |
| Performance | ~17 FPS, ~314 draw calls and ~0.8 M triangles per frame          | Budgets, §11          |

## 3. Camera and scale

**Reference views.** Every asset and scene is judged in these captures (UI hidden, 1600×900, fixed seed):

| View    | Camera height        | Purpose                                |
| ------- | -------------------- | -------------------------------------- |
| Close   | 28 (min zoom)        | Material and detail quality            |
| Default | 54 (mission opening) | The view players live in; readability  |
| Wide    | max zoom             | Landscape composition and the transect |

**Scale rules.**

- A person is **1.86 units** tall. Everything is measured in "people" (P).
- **Compress footprints more than heights.** Real monuments are too large for an RTS map; keep height
  closer to reality than width so they still feel monumental.

| Element                 | Real                        | Today                                     | _Target_                                |
| ----------------------- | --------------------------- | ----------------------------------------- | --------------------------------------- |
| Pyramid Mayor height    | ~28–29 m (≈16 P)            | ≈4 P (estimated from the 0.25 site scale) | **7–9 P**                               |
| Pyramid Mayor footprint | ~150 × 110 m (sources vary) | ≈37 units (estimated, same scale)         | 40–55 units (map permitting)            |
| Quincha house wall      | ~2–2.5 m                    | —                                         | 1.3–1.5 P                               |
| Huarango tree           | 8–12 m                      | —                                         | 3–4 P                                   |
| Smallest readable prop  | —                           | —                                         | ≥ 0.4 units (from `visual-language.md`) |

- The map grows to **256–288 units** to hold the coast–valley–terrace transect (decided after a
  performance test, §11). Max zoom must show the whole valley width.

## 4. Palette

Environment colours are **desaturated and mid-value**; saturation is reserved for interactables, player
colour and ritual accents. Keep albedo luminance between ~0.2 and ~0.8: no pure black, no pure white.

**Caral environment** (art decision, not a measured colour):

| Band                  | Reads as                                                          | Swatch                        |
| --------------------- | ----------------------------------------------------------------- | ----------------------------- |
| Sea                   | Cold Humboldt water: grey-green to deep blue-green, not turquoise | `#3f5f5c` → `#24413f`         |
| Wet sand / river silt | Darker, cool brown                                                | `#7a6a55`                     |
| Desert terrace        | Warm pale ochre                                                   | `#c2a77f`                     |
| Rocky hills           | Grey-brown                                                        | `#8a7c6b`                     |
| Riparian forest       | Dark olive green                                                  | `#4d5a34`                     |
| Huarango / fields     | Grey-green, light olive                                           | `#7d8656`                     |
| Lomas (winter)        | Pale green over sand                                              | `#9aa478`                     |
| Sky, morning haze     | Warm grey-blue                                                    | `#cdd3d2` (current `skyTint`) |

**Caral plaster by construction period** (documented colours; the assignment per phase is _inferred_):

| Phase  | Plaster            | Swatch                |
| ------ | ------------------ | --------------------- |
| Early  | White              | `#e6dccb`             |
| Middle | Yellow ochre       | `#c99a55`             |
| Late   | Yellow / red bands | `#d6b14e` / `#9c4a32` |

Ritual accents: sacred-fire orange, cotton white, Spondylus pink-red. Use them sparingly so they draw the eye.

## 5. Terrain

- **Layers** (6–8, blended by height, slope, moisture and authored masks): dry sand, wet sand, river silt,
  field soil, terrace gravel, rock, lomas green, wetland mud.
- **Transitions tell the geography**: sea → beach → wetland → riparian forest → fields → huarango terrace →
  desert terrace → rocky hills. Each boundary is soft (blend width 2–6 units), never a hard line.
- **Break tiling** with a macro colour map and a second, larger-scale detail sample; no repeat should be
  visible at default zoom.
- **Scatter discipline**: loose rocks only where the slope or the hills justify them; target ≤ 1 visible
  rock cluster per 10×10 units on the terrace and none on fields or plazas.
- **Decals** for paths, canal banks, wet edges and worn plaza floors.
- The engine owns the heightfield (see [`caral-sacred-city.md`](./caral-sacred-city.md)); Blender may be
  used to sculpt a reference heightmap.

## 6. Water

- **Sea**: waves visible at default zoom, a foam line on the beach, depth gradient from silt-green
  shallows to deep blue-green, Humboldt palette (§4). The existing Gerstner/fresnel/foam shader
  (`Water.ts`) is the base; tune colour and foam, do not replace it.
- **River Supe**: mostly dry bed with damp patches and springs; the seasonal flood raises a narrow, silty,
  fast channel.
- **Wetlands (oconales)**: shallow still water with totora and reed clumps breaking the surface.

## 7. Vegetation

Only species from the dossier, built as a **Blender kit** with shared materials:

| Species                              | Zone                  | Notes                          | _Budget_ (LOD0 / LOD1 tris) |
| ------------------------------------ | --------------------- | ------------------------------ | --------------------------- |
| Huarango (_Prosopis_)                | Terraces, valley edge | Wide crown, twisted dark trunk | 1500 / 400                  |
| Sauce (willow)                       | Riverbank             | Tall, drooping                 | 1200 / 350                  |
| Caña brava                           | Riverbank             | Dense clumps, plume tips       | 600 / 150                   |
| Carrizo                              | Riverbank, wetland    | Lower clumps                   | 400 / 120                   |
| Cola de caballo                      | Wet ground            | Ground cover                   | 200 / —                     |
| Totora / junco                       | Wetland               | Clumps in water                | 400 / 120                   |
| Lomas herbs                          | Lomas                 | Seasonal ground cover          | 200 / —                     |
| Crops (cotton, gourd, squash, beans) | Fields                | Read as rows from default zoom | 300 / 80                    |

- **No palms and no generic `broad`/`frond` trees on the Supe map.**
- Trees grow in **groups that read as forests** (riparian band, huarango grove), not evenly scattered
  singles.
- Every tree is instanced with **wind sway** in the vertex shader and at least two LODs.

_Status (kit v1)_: huarango, sauce, caña brava, carrizo and totora ship as LOD0/LOD1 GLBs
(`scripts/blender/build_caral_vegetation_kit.py`, `src/assets/vegetation/caral/`). `TreeInstances` draws
the `algarrobo` and `sauce` variants with them, packing only visible trees and switching to LOD1 beyond
45 units from the camera focus (25 on low quality); `Props` draws totora and the m1 riverbank
canes. Wind sway is still the CPU canopy rotation, not a vertex shader. Missing: cola de caballo, lomas
herbs and crops as kit models.

## 8. Fauna

Only species supported by a source; add new ones only with a citation.

| Species      | Zone                    | Source                                                | Behaviour                         |
| ------------ | ----------------------- | ----------------------------------------------------- | --------------------------------- |
| Deer         | Riparian forest         | Shady (venados)                                       | Small groups, flee from units     |
| Rodents      | Riparian forest, fields | Shady (roedores)                                      | Brief appearances                 |
| Birds        | Riparian forest         | Shady (aves)                                          | Flocks that lift and settle       |
| Pelicans     | Coast                   | Existing wildlife set; **needs a citation** for Caral | Flights along the shore           |
| Fish schools | Fishing spots           | Áspero fishing record                                 | Visible shimmer at resource nodes |

_Status (fauna kit v1)_: deer and a generic riparian bird ship as Blender GLBs
(`scripts/blender/build_caral_fauna_kit.py`); in m1 `planCaralValleyFauna` places deer groups on dry
riverside ground and bird flocks that lift and settle over the water. Deer do not flee from units yet, and
rodents are not modelled.

_Target_: at least one animal group visible in each zone at default zoom; 15–30 animals per map,
within the existing per-animal budget (4 draw calls, 5000 triangles; `yarn bench:check`).

## 9. Architecture and the living city

- **Shape language for Caral**: horizontal stepped platforms, sunken circles, low quincha boxes. Edges are
  slightly bevelled and irregular, never CAD-perfect.
- **Three to five readable masses** per monument (from `visual-language.md`); detail lives in material and
  props, not in geometry noise.
- **Life is part of the art**:
  - smoke behind houses;
  - fire on the sacred-fire altars;
  - people crossing plazas;
  - fair tents during festivals;
  - refuse heaps and cooking pits beside dwellings.
- **Construction states** (phased pyramid, scaffold-free shicra piles, sealed state) follow the
  [mission design](./caral-model-mission.md).

## 10. Light and atmosphere

- **Default: morning**, low warm sun from the east/north-east, long soft shadows that model the steps of
  the pyramids.
- **Aerial perspective** over the valley; light haze in the floodplain, stronger fade on the hills.
- **Ambient occlusion** on (screen-space at medium quality and above; baked vertex AO as a fallback).
- The period grade in `grades.ts` stays, but must not flatten stone or plaster contrast.

## 11. Performance budgets

Targets for the default view at 1600×900:

| Tier                                 | Target                 |
| ------------------------------------ | ---------------------- |
| Mid-range discrete GPU, high quality | 60 FPS                 |
| Integrated GPU, low/medium quality   | ≥ 30 FPS (today ~17)   |
| Draw calls per frame                 | ≤ 200 (today ~314)     |
| Triangles per frame                  | ≤ 600 k (today ~0.8 M) |

_Status (m1, opening view, shadow pass included)_: ~497k triangles / ~414 draw calls, within the triangle
target. Steps: procedural tree meshes drawn only up to the highest used slot, a 128×128 water grid and
shadow-free fliers (877k → 685k), then a distance LOD for the terrain mesh (`src/rendering/terrainLod.ts`:
4×4-cell blocks further than 75 units from the camera are drawn as crack-free fans over the same
full-resolution vertices, so heights, colours, normals and the simulation's height field are unchanged;
the terrain draws ~38k instead of 131k triangles per pass at zoom 54). `yarn bench:check` ratchets the m1
scene and the vegetation/fauna kit (`scripts/bench_scene.mjs`). Draw calls (~414) remain the open item;
the units are the next largest triangle cost (~90k).

- Repeated assets are **instanced or merged**; no per-object draw call for vegetation, props or fauna.
- Every model has **LOD0/LOD1**; the far LOD switches before the asset drops below ~40 px on screen.
- Texel density: buildings and units ~128 px per unit; props 64–128 px per unit; terrain via macro +
  detail maps. Textures in WebP/KTX2 within the existing `dist` budget (`yarn dist:check`).
- `yarn bench:check` keeps the structural budgets; add new categories (vegetation, buildings) when the
  kits land.

## 12. Quality gate

An asset or scene is accepted only when:

1. it is captured in the three reference views (§3) with the same seed and resolution, before and after;
2. it passes the checklist below;
3. its historical elements cite the dossier and carry a certainty label (documented / inferred / assumed);
4. renders and models go through the provenance gate (`reviewed: false` until a human approves them).

Checklist:

- [ ] Reads at default zoom: silhouette clear, function recognizable.
- [ ] Same material language as its neighbours (no photo-vs-flat clash).
- [ ] Palette within §4; saturation only where interaction or ritual needs it.
- [ ] Terrain transitions soft and geographic; no visible tiling.
- [ ] No anachronism and no species, structure or person without a source.
- [ ] Within the performance budgets (§11) and `yarn bench:check`.

Comparison against commercial RTS references is done with **local** screenshots only; third-party
images are never committed to the repository.

## 13. Rollout

1. **Vertical slice** (one corner of the valley): river with riparian forest, wetland edge, three fields,
   three quincha houses, the first phase of the Pyramid Mayor, deer and birds, morning light. Must meet
   §11 and §12 before anything else is produced.
2. Vegetation and fauna kits for the whole Supe map.
3. Terrain layers, sea and the enlarged transect map.
4. Pyramid phases, quincha kit, altars and fair tents.
5. Áspero.
6. Apply the same rules to the next mission and record what had to change.
