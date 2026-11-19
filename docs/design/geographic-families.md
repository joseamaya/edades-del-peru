# Geographic families

**Status:** Proposal · **Audit date:** 2026-11-18

This document proposes how to keep geographic diversity without multiplying assets or rewriting the
terrain engine. It is the reusable-system companion to
[`mission-geographic-identity.md`](./mission-geographic-identity.md) and the implementation order in
[`../plan/geographic-identity-roadmap.md`](../plan/geographic-identity-roadmap.md).

The rule is simple: **reuse components, not maps.** Two missions may share a tree, a stone material, an
andén recipe or a colonial module. They may not share the heightfield, the site anchor or the
base→site→enemy composition.

---

## 1. Why families, and why not twenty biomes

The current catalogue already has more “biomes” in its labels than in its geometry. The problem is not a
missing biome list; it is that the same terrain and settlement are reused under different names.

A family is a **shared environmental grammar**:

- the same broad climate and soil logic;
- the same hydrologic vocabulary (river, dry wash, wetland, coast);
- the same vegetation palette and density range;
- the same material language;
- the same settlement logic.

A mission is a **specific composition** inside that grammar. The family may be shared; the place is not.

Eight active families cover the twenty missions; **F9 is reserved** for a future altiplano mission and is
not counted. `altiplano` remains an unused family in the current catalogue; it should not be forced onto a
mission just to complete the table.

| Family | Missions | Shared grammar | What must differ per mission |
| --- | --- | --- | --- |
| **F1 · Desert coast with river valley** | Caral, Moche, Chimú | Coast, river, algarrobal, adobe, canal, fishing | Terrace vs huaca valley vs hyper-arid mud city |
| **F2 · Central coastal oasis** | Lima 1535, Lima 1821, Miraflores, Real Felipe | Rímac/coast, garúa, colonial/republican city | Grid vs outskirts/port vs redoubt line vs fortress/bay |
| **F3 · Southern desert quebrada** | Tarapacá, Arica | Hyper-arid rock/gravel, oasis, Pacific only at Arica | Inland canyon/oasis vs port terrace + Morro |
| **F4 · Humid inter-Andean valley** | Chavín | Deep valley, river, mist, stone | Unique: Mosna valley and ceremonial terrace |
| **F5 · High basin, sacred valley and Quipaipan pampa** | Wari, Tambotoco, Cusco 1536, Quipaipan, Túpac Amaru, Junta Cusco | High Andes, terraces, stone, puna, pampa | Ayacucho basin vs Pacaritambo vs Cusco siege vs Quipaipan battle vs Tinta/Sangarará vs Cusco–altiplano transect |
| **F6 · High pampa** | Yahuar Pampa, Independencia | Open grassland, seasonal water, low hills, cavalry | Pucará height vs Junín/Ayacucho twin pampas |
| **F7 · Central sierra valley** | Breña | Deep valley, river, terraces, passes | Unique: Mantaro valley and Huamachuco route |
| **F8 · Cloud-forest slope** | Vilcabamba | Steep slopes, humid forest, river, mist | Unique: Urubamba/Vilcabamba/Huayna Pucará |
| **F9 · Altiplano (reserved)** | — | High plateau, lake/wetland, bofedal, corrals | Not used by a released mission; do not force |

### Why these families and not the current seven regions

The seven `GeographicRegion` values are a useful **climate/material** layer, but they are too coarse for a
mission. F5 alone contains six different places: an administrative basin (Wari), a mythic origin valley
(Tambotoco), an urban siege (Cusco 1536), a battle pampa (Quipaipan), a rural rebellion (Túpac Amaru) and a
transect to the altiplano
(Junta Cusco). They should share the high-Andean grammar, not the same heightfield.

The proposed families do not replace `GeographicRegion`. They sit above it as an authoring and QA concept:

- `GeographicRegion` keeps driving the runtime profile (climate, soil family, base palette).
- `Family` describes the shared **authoring recipe**.
- `Mission composition` makes the place specific.

---

## 2. Component catalogue

### 2.1 Terrain recipe

The current authored heightfields are copied templates. **Do not build a library first.** Author each
missing field from the nearest existing script; if the same recipe is repeated in three missions, extract a
small helper (for example `scripts/lib/terrain_authoring.py`). The table below is a target vocabulary, not a
Phase 1 deliverable:

| Recipe | Inputs | Output |
| --- | --- | --- |
| `coastal_valley` | coast line, river path, floodplain width, terrace height, dune field | heightfield + ground weights + coast/river metadata |
| `high_basin` | basin centre, terrace rings, ridge axes, quebrada paths | heightfield + terrace strength |
| `pampa` | pampa polygon, low hills, dry wash | heightfield + dry-wash mask |
| `quebrada` | canyon axis, depth, ledge, oasis | heightfield + dry/wet channel |
| `cloud_forest` | ridge axes, river valley, slope profile | heightfield + steepness/moisture |
| `coastal_terrace` | coast, terrace, port bench, backdrop ridge | heightfield + coast metadata |

Each mission still produces its own `AuthoredHeightField` (a `*.ts` data file). The recipes share code, not
geometry. A mission never imports another mission’s heights.

**Why this is the right layer:** the project already uses authored heightfields for 18 sites. Extending that
pattern to all 20 missions is cheaper and safer than adding runtime terrain operators (lakes, ridges, dry
washes) to `generateHeightField`.

### 2.2 Hydrology profile

| Element | Representation | Runtime |
| --- | --- | --- |
| Perennial river | Carved channel below water level + authored polyline | Existing `Water` |
| Seasonal/dry river | Shallow gravel channel above water level; no water plane | Terrain paint + pathfinding mask |
| Wetland/bofedal | Low, wet, moisture-painted basin; shallow ponds | Existing water + ground cover |
| Lake/lagoon | Closed basin below water level | Existing water |
| Coast/bay | Authored coastline + sea plane | Existing `Water` |
| Canal/acequia | Existing `MissionCanal` or painted channel | Existing canal system |

Do not use the water plane as a decoration. A water surface must be justified by a channel, a basin or the
sea, and it must be listed in the mission’s hydrology profile.

### 2.3 Vegetation profile

The existing kit is the right asset base. Use it more intelligently:

| Profile | Trees | Ground cover | Density | Used by |
| --- | --- | --- | --- | --- |
| `coastal_river` | Huarango, willow, caña brava, carrizo, totora | Grass, pebble, gravel | Medium, clustered along water | Caral, Moche, Chimú |
| `coastal_desert` | Almost none; isolated huarango | Pebble, gravel | Very low | Tarapacá, Arica, Miraflores, Real Felipe |
| `high_valley` | Molle, pacay, willow | Grass, ichu | Medium, clustered on terraces and water | Chavín, Tambotoco, Cusco 1536, Túpac Amaru, Junta |
| `puna` | None or very sparse molle | Ichu, gravel, pebble | Low, wind-shaped | Wari, Yahuar Pampa, Quipaipan, Independencia, Breña |
| `cloud_forest` | Frond/fern/palm (no invented species names) | Fern, grass, wet earth | High, layered, clustered | Vilcabamba |

The `andes` pack already exists. Using it on all `high_valley` missions is **configuration**, not new art.
The `puna` profile can be built from the existing ichu ground cover plus sparse molle/pacay; it does not
need a new tree. The `cloud_forest` authoring profile is the only one that probably needs a new runtime pack
(`selva`) and one or two new GLBs.

**Naming:** `coastal_desert` and `cloud_forest` are authoring profiles; `selva` is the runtime pack id;
`cloud_forest_soil` is the material profile. The palette names are `desert_south` and `cloud_forest`.

### 2.4 Material profile

| Profile | Albedo/roughness | Existing assets |
| --- | --- | --- |
| `desert_sand` | Pale sand, gravel, low roughness variation | Existing sand/rock, `coastal_gravel` |
| `river_loam` | Dark alluvial loam, wet silt | Existing dirt/grass |
| `highland_earth` | Ochre earth, grey stone, puna grass | `puna_grass`, existing rock |
| `cloud_forest_soil` | Dark wet earth, mossy rock, clay | New `cloud_forest_floor` + existing rock |
| `colonial_coast` | Adobe, brick, cobble, dust | Existing colonial materials |

Add at most **two new palettes** (`desert_south`, `cloud_forest`) and **two PBR sets**
(`salt/gravel`, `cloud_forest_floor`). Reuse `cusco_valley` and `puna_grass`; everything else uses the
existing nine palettes and PBR slots.

### 2.5 Settlement profile

`SettlementShape` already offers `riverside | hilltop | dispersed | grid`. Use it:

| Family | Default shape | Mission variation |
| --- | --- | --- |
| F1 | `riverside` | Caral: terrace + coastal; Moche: valley + huaca; Chimú: desert + canal |
| F2 | `grid` | Lima 1535: grid; 1821: dispersed edge; Miraflores: linear redoubts; Real Felipe: fortress |
| F3 | `dispersed` | Tarapacá: village on a ledge; Arica: port terrace |
| F4 | `riverside` | Chavín: temple terrace + base across the river |
| F5 | `hilltop` | Wari: terraced basin; Tambotoco: cave/valley; Cusco: urban; Túpac Amaru: rural; Junta: transect |
| F6 | `dispersed` | Yahuar Pampa: pucará; Quipaipan: two camps; Independencia: two pampas |
| F7 | `riverside` | Breña: valley communities |
| F8 | `dispersed` | Vilcabamba: town + pucará + escape |

Do not force every mission through the 5.5-unit ring. A city needs a grid; a fortress needs a plan; a
dispersed community needs clusters. The authored site can own its plan; the base camp can stay simple.

### 2.6 Atmosphere profile

`MissionAtmosphere` already exists. Use it on all 20 missions:

| Family | Light/haze | Palette direction |
| --- | --- | --- |
| F1 | Warm coastal sun, dust haze | Ochre sand, muted green valley, cold sea |
| F2 | Garúa, grey-blue, low contrast | Dust, adobe, grey sea |
| F3 | Hard sun, salt/dust haze | Bleached rock, dark shade |
| F4 | Cold mist, diffuse light | Blue-grey, grey stone, wet green |
| F5 | Thin clear air, strong sun, cold shadows | Olive/ochre, grey stone |
| F6 | Cold clear morning/dusk, long shadows | Puna olive, pale grass |
| F7 | Cold morning, clear air | Green valley, brown earth |
| F8 | Humid dusk, mist | Dark green, wet earth |

The point is not “more fog”. The point is that altitude, humidity and coast must be legible in the light.

---

## 3. Mission-to-family map

| Mission | Family | Terrain recipe | Vegetation | Material | Settlement |
| --- | --- | --- | --- | --- | --- |
| `m1_caral` | F1 | `coastal_valley` + terrace + wetland | `coastal_river` | `desert_sand` + loam | terrace/riverside |
| `m2_chavin` | F4 | `high_basin` + confined valley | `high_valley` | `highland_earth` | riverside |
| `m3_moche_recuay` | F1 | `coastal_valley` + dunes | `coastal_river` | `desert_sand` + adobe | riverside |
| `m4_wari` | F5 | `high_basin` + andenes | `puna`/`high_valley` | `highland_earth` | hilltop |
| `m_tambotoco` | F5 | `high_basin` + cave ridge + hill | `high_valley` | `highland_earth` | dispersed |
| `m5_yahuar_pampa` | F6 | `pampa` + pucará hill | `puna` | `highland_earth` | dispersed |
| `m6_chimu_inca` | F1 | `coastal_valley` + dunes + canal | `coastal_desert` | `desert_sand` + adobe | desert/canal |
| `m6b_guerra_civil` | F5 | `pampa` + dry wash | `puna` | `highland_earth` | two camps |
| `m_lima` | F2 | `coastal_terrace` + Rímac | `coastal_river` | `colonial_coast` | grid |
| `m_cusco_1536` | F5 | `high_basin` + fortress hill + city | `high_valley` | `highland_earth` | urban |
| `m_vilcabamba` | F8 | `cloud_forest` + river | `cloud_forest` | `cloud_forest_soil` | dispersed |
| `m7_tupac_amaru` | F5 | `high_basin` + rural valley | `high_valley` | `highland_earth` | dispersed |
| `m_junta_cusco` | F5 | `high_basin` + pass + altiplano | `puna`/`high_valley` | `highland_earth` | transect |
| `m_lima_1821` | F2 | `coastal_terrace` + bay | `coastal_river` | `colonial_coast` | dispersed edge |
| `m8_independencia` | F6 | `pampa` ×2 | `puna` | `highland_earth` | two pampas |
| `m_real_felipe` | F2 | `coastal_terrace` + bay | `coastal_desert` | `colonial_coast` | fortress |
| `m_tarapaca` | F3 | `quebrada` | `coastal_desert` | `desert_sand` | ledge |
| `m9_guerra_pacifico` | F3 | `coastal_terrace` + Morro | `coastal_desert` | `desert_sand` | port |
| `m_miraflores` | F2 | `coastal_terrace` + cliffs | `coastal_desert` | `desert_sand` | linear redoubts |
| `m_brena` | F7 | `high_basin` + deep valley | `high_valley` | `highland_earth` | riverside |

---

## 4. Reuse rules

### Allowed to share

- A tree/shrub species, material, rock kit, wall module or roof module.
- A terrain **recipe** (code), never its output heightfield.
- A vegetation **profile** (species weights and density range), never its exact scatter positions.
- A settlement shape rule, never the same anchors.
- A site module (church, fort, house, terrace), never the whole site composition.
- An atmosphere preset, never a complete “look”.

### Not allowed to share

- The same `AuthoredHeightField` between two missions.
- The same site anchor/heightfield pair.
- The same base→site→enemy diagonal without a reason.
- The same site model as the whole settlement for a different place.
- The same water body as decoration.
- The same palette as the only difference.

### Examples

- **Molle and pacay** can appear in Tambotoco, Cusco 1536 and Túpac Amaru. In Tambotoco they cluster around
  the acequia and terraces; in Cusco they line the campiña; in Tinta they sit around the village and the
  pampa. The species is shared; the distribution is geographic.
- **Colonial church modules** can appear in Lima, Cusco and Tinta. In Lima they face a grid plaza; in Cusco
  they sit inside a dense urban block; in Tinta they anchor a rural village. The module is shared; the
  place is not.
- **Fort modules** can appear in Miraflores and Real Felipe. In Miraflores they form a linear redoubt line;
  in Callao they form a star fortress around a bay. The kit is shared; the plan is not.

---

## 5. Architecture

### 5.1 What already exists

The code already has the right seams:

- `HistoricalMapProfile` — climate, soil, terrain parameters, vegetation weights, resources, atmosphere.
- `MapOverrides` — mission-level patches for terrain, climate, vegetation, resources.
- `MissionLayout` — base/enemy/site anchors, terrain layout, canal, roads, labels, fishing, decor.
- `AuthoredHeightField` — heights, painted ground, river path, coastline, fords.
- `SiteTerrainStyle` — palette, PBR slots, water palette, snow/haze flags.
- `VegetationPack` — a named set of tree/prop kits.
- `CulturalLandscapeProfile` — features and settlement shape.

### 5.2 Minimal additions

The proposal does **not** require a new terrain engine. It requires five small extensions:

1. **Complete `MapOverrides`** with `water`, `elevation` and `groundPbr`; mission atmosphere already
   lives on `MissionDef.atmosphere`.
   Today a mission cannot override the water level, inland/coastal flag, snow line, haze or PBR slots.
2. **Add an explicit `region` to every mission.** Do not let `m8_independencia` and `m_junta_cusco` fall
   into `andean_valley` through the map-type fallback.
3. **Use `vegetationKit: 'andes'` on every highland mission.** The pack already exists; only Tambotoco
   opts in today.
4. **Add `puna`, `selva` and `coastal_desert` to the `VegetationPack` union.** `puna` is data; `selva`
   needs one or two GLBs; `coastal_desert` is the empty/sparse profile. This is a data extension, not a new
   vegetation system.
5. **Author one heightfield per mission.** Add the seven missing fields (Quipaipan, Lima 1821, Miraflores,
   Callao, Tarapacá, Vilcabamba, Mantaro) and remove every reuse chain.

### 5.3 Optional preset layer

If, after the first three missions, the same combination of region/palette/vegetation/atmosphere repeats,
a thin data preset (for example a `puna` preset) could remove the duplication. It is **not** part
of the first implementation and the interface is deliberately not designed here. Do **not** add this layer
before it removes duplication; adding an abstraction for its own sake would violate the brief.

### 5.4 What not to build

- A generic biome graph or a node-based terrain editor.
- Twenty independent biomes with independent asset sets.
- A new water simulation for rivers (the authored channel + existing water plane is enough).
- A new LOD/instancing system (the existing one is the budget constraint).
- A new mission format (the existing `MissionDef` already carries what is needed).

---

## 6. Budget rules

- Terrain relief is the cheapest identity lever: it changes vertex heights, not draw calls.
- Vegetation must stay instanced; no per-tree draw call.
- `andes` on the six highland missions that do not use it today is acceptable only if each
  `bench_scene --assert` stays inside its current cap.
- The `selva` pack gets its own cap and its own LOD/shadow policy; it cannot borrow Tambotoco’s headroom.
- New site variants merge by material and reuse modules; a new GLB per city is not acceptable.
- PBR additions are capped at two sets; `dist:check` remains the gate.
- No mission may raise an existing `bench_scene` cap to make room. Only the new `selva` pack may add a new,
  measured category approved in review. If a cap is tight, reduce density or merge.

---

## 7. See also

- [`mission-geographic-identity.md`](./mission-geographic-identity.md) — the mission-by-mission proposals.
- [`geographic-similarity-matrix.md`](./geographic-similarity-matrix.md) — the current similarity clusters.
- [`../plan/geographic-identity-roadmap.md`](../plan/geographic-identity-roadmap.md) — the work order.
- [`art-direction.md`](./art-direction.md) — camera, palette and structural budgets.
- [`cultural-landscape.md`](./cultural-landscape.md) — the existing cultural-landscape layer.
- [`settlement-generator.md`](./settlement-generator.md) — the existing settlement planner.
- [`../historia/mapas.md`](../historia/mapas.md) — the documented geography.
