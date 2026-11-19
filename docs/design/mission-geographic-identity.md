# Mission geographic identity

**Status:** Proposal · **Audit date:** 2026-11-18 · **Scope:** the 20 released missions

> **Post-audit note (2026-11-19):** Phase 0 has been implemented. It gives `m8_independencia` and
> `m_junta_cusco` an explicit `high_andes` region, puts the high-valley missions on the `andes` vegetation
> kit, adds mission-level atmosphere, removes the accidental Chanca/Colonial lakes and fixes the Vilcabamba
> water label. The audit rows and counts below describe the **2026-11-18** state unless a sentence says
> otherwise; the current implementation state is in the roadmap.

This document audits the geographic identity of the twenty released missions and proposes a specific
landscape for each one. It is a design reference, not an implementation authorisation: no scene, model,
asset, mission definition or generator is changed here.

The reusable architecture is in [`geographic-families.md`](./geographic-families.md), the implementation
order is in [`../plan/geographic-identity-roadmap.md`](../plan/geographic-identity-roadmap.md), and the
pairwise comparison is in [`geographic-similarity-matrix.md`](./geographic-similarity-matrix.md).

The art direction remains **stylized realism** ([`art-direction.md`](./art-direction.md)). The references
are used for principles only: AoE IV for material/light readability, 0 A.D. for modular identity, AoE II DE
for strategic terrain legibility.

---

## 1. Executive summary

The project has a strong geographic **pipeline** and a weak geographic **catalogue**.

- The pipeline is data-driven, deterministic and already produces authored places: 18 authored sites, 13
  authored heightfields, regional profiles, cultural landscapes, vegetation kits and performance gates.
- Two missions already meet the identity bar: **Caral** and **Tambotoco**. They prove the approach works.
- Most other missions are not geographically differentiated. They are differentiated by **name, labels,
  building set, time of day and colour grade**, which rule 5 of the brief explicitly rejects.
- Twelve missions share five heightfields. Fourteen missions share five site models. Seven missions share
  the same base→site→enemy diagonal.
- The seven-region taxonomy is too coarse for twenty missions: 15 missions fall into three regions and the
  `altiplano` region is unused. Two missions (`m8_independencia`, `m_junta_cusco`) resolve to
  `andean_valley` by civilization fallback even though they take place in the high Andes.
- The fastest structural win is not a new engine. It is **one authored heightfield per mission**, mission
  composition with unique anchors, the existing `andes` vegetation kit on all highland missions, and
  mission-level atmosphere/material overrides. The existing pipeline already supports all of it.

The proposals below keep the twenty missions and their mechanics. They change the land, water, vegetation,
materials and composition around those mechanics.

---

## 2. Evidence and limitations

### 2.1 What was inspected

| Source | What it establishes |
| --- | --- |
| `src/model/defs/profiles.ts` | The seven `GeographicRegion` profiles, `MAP_PROFILES`, `applyMapOverrides`, `resolveMapProfile` |
| `src/sim/heightField.ts` | The procedural heightfield, river carving, terraces, canals and the water level |
| `src/model/defs/sites.ts` | The 18 authored sites, their heightfields, models, anchors and terrain palettes |
| `src/model/defs/terrainLayout.ts` | The only authored terrain features available to a mission: one east–west river and flat terraces |
| `src/model/defs/terrainPalettes.ts` | The nine terrain palettes and the shared material multipliers |
| `src/model/defs/landscape.ts` | The cultural-landscape profiles and their settlement shapes |
| `src/model/defs/settlementPlan.ts` | The ring-based settlement planner, fields and roads |
| `src/model/defs/groundCover.ts` | The five ground-cover species and their regional weights |
| `src/rendering/vegetationKit.ts` | The two vegetation packs (`caral`, `andes`) and the nine kit species |
| `src/core/Game.ts` | How a mission selects its region, site, vegetation pack and atmosphere |
| `src/campaign/defs/missions/*.ts` | The twenty mission definitions, maps, layouts, anchors and overrides |
| `scripts/build_*_heightmap.py` | The authored heightfields and their shared templates |
| `scripts/bench_scene.mjs` | The per-mission structural caps and the measured counts |
| `docs/historia/mapas.md` and `docs/historia/campanas/*.md` | The documented geography and the certainty labels |
| `review/audit/<mission>-1600.png` | One opening capture per mission, HUD visible |

### 2.2 What was not done

- The game was **not** executed for this audit, and no new capture was taken.
- The twenty existing audit captures are a single opening view per mission, with HUD, without a documented
  seed/camera protocol. They are enough to see the pattern, not enough for final acceptance.
- The proposal therefore includes an explicit capture protocol in §9. No mission is declared visually
  validated until those captures exist.

### 2.3 A note on honest abstractions

The historical dossiers already label several reuses as abstractions. For example,
[`tarapaca.md`](../historia/campanas/tarapaca.md) says the coastal `arica_site` is reused as a labelled
quebrada and is not a topographic survey; [`vilcabamba.md`](../historia/campanas/vilcabamba.md) says the
site reuses the Chanca fortress and its heightfield; [`miraflores.md`](../historia/campanas/miraflores.md)
says the Lima colonial site is reused; [`real_felipe.md`](../historia/campanas/real_felipe.md) says the
Arica coastal kit is reused.

That honesty is correct. The defect is that the **in-engine result does not communicate the abstraction**:
the player sees the same terrace, the same trees and the same plain. A labelled abstraction still needs a
geographic silhouette.

---

## 3. What the current system shares

### 3.1 Shared components

| Component | Owner | Shared by |
| --- | --- | --- |
| Procedural heightfield | `src/sim/heightField.ts` | Every non-authored area, and the fallback skirmish |
| Regional profiles | `src/model/defs/profiles.ts` | All 20 missions (7 regions) |
| Terrain shader and palettes | `src/rendering/Terrain.ts`, `terrainPalettes.ts` | All 20 missions (9 palettes) |
| Water shader | `src/rendering/Water.ts` | All coastal/lake/river missions |
| Vegetation instancers | `src/rendering/TreeInstances.ts`, `Props.ts` | All missions |
| Vegetation kits | `src/rendering/vegetationKit.ts` | Coastal missions (`caral` pack) and Tambotoco (`andes` pack); no other inland mission |
| Ground cover | `src/model/defs/groundCover.ts`, `GroundCover.ts` | All missions at medium/high quality |
| Cultural landscape | `src/model/defs/landscape.ts`, `CulturalLandscape.ts` | Missions that do not disable it |
| Settlement planner | `src/model/defs/settlementPlan.ts` | Every starting base |
| Site modules | `src/model/defs/sites.ts`, architecture kits | Buildings, forts, churches, walls |
| Atmosphere and colour grade | `Sky`, `PostFX`, regional profile | All missions |
| Bench budgets | `scripts/bench_scene.mjs` | All model missions |

### 3.2 Mission-specific components

| Component | Where | How specific it really is |
| --- | --- | --- |
| Map seed, size, `MapType` | `MissionDef.map` | All maps are 256 m; the seed alone does not create identity |
| `region` | `MissionDef.region` | Only 10 missions set it explicitly; the rest fall back to the civilization |
| Authored heightfield | `AuthoredSiteDef.heightField`, `MissionSite.heightField` | 13 base fields for 18 sites, plus 7 mission overrides (Phase 1) |
| Authored site model | `AuthoredSiteDef.modelName` | 5 models cover 14 missions |
| Site anchor and phases | `AuthoredSiteDef`, `MissionSite` | Repeated anchors in the reuse chains |
| Base/enemy anchors | `MissionLayout` | The same diagonal in seven missions |
| Labels and roads | `MissionLayout` | Mission-specific, but they are text/ribbons, not landform |
| Canal | `MissionLayout.canal` | Specific in Caral, Moche, Chimú and Tambotoco |
| Terrain layout | `MissionLayout.terrain` | Only one river and flat rectangles; most missions leave it empty |
| Atmosphere | `MissionDef.atmosphere` | Only Caral and Chavín use it |
| Map overrides | `MissionDef.mapOverrides` | Mostly `culturalLandscape: null`; only Tambotoco overrides vegetation |
| Setpiece/decor | `MissionLayout` | Caral has a city setpiece; a few missions have a church or camp |

### 3.3 The reuse chains

| Authored field | Missions | Site model | What the player sees |
| --- | --- | --- | --- |
| `LIMA_HEIGHTMAP` | `m_lima`, `m_lima_1821`, `m_miraflores` | `colonial_site` | The same Rímac plain and colonial block three times |
| `ARICA_HEIGHTMAP` | `m9_guerra_pacifico`, `m_real_felipe`, `m_tarapaca` | `arica_site` | The same coastal terrace in Arica, Callao and an inland quebrada |
| `CUSCO_HEIGHTMAP` | `m6b_guerra_civil`, `m_cusco_1536` | `cusco_inca_site` | The same basin for a pampa battle and an urban siege |
| `INDEPENDENCE_HEIGHTMAP` | `m8_independencia`, `m_brena` | `independence_site` | The same plain for Junín/Ayacucho and the Mantaro |
| `CHANCA_HEIGHTMAP` | `m5_yahuar_pampa`, `m_vilcabamba` | `chanca_site` | The same high pampa, relabelled as jungle |

**Phase 1-2 status (2026-11-19):** this table is the baseline audit. `m6b_guerra_civil`, `m_cusco_1536`,
`m_lima_1821`, `m_miraflores`, `m_real_felipe`, `m_tarapaca`, `m_vilcabamba` and `m_brena` now carry a
mission-scoped `MissionSite.heightField` (Quipaipan, Cusco basin and Sacsayhuamán, Rímac 1821, Miraflores,
Callao Bay, Tarapacá quebrada, Vilcabamba valley, Mantaro), each with painted ground derived from its own relief,
so their **terrain and paint no longer match the chain above**. The site models, anchors and collision are
still shared; the per-mission site composition and vegetation are Phase 2/3 work
([roadmap](../plan/geographic-identity-roadmap.md)).

### 3.4 Taxonomy coverage

| Region | Missions | Share |
| --- | ---: | ---: |
| `high_andes` | 6 | 30 % |
| `central_coast` | 5 | 25 % |
| `andean_valley` | 4 | 20 % |
| `north_coast` | 2 | 10 % |
| `south_coast` | 2 | 10 % |
| `amazon` | 1 | 5 % |
| `altiplano` | 0 | 0 % |

`m8_independencia` and `m_junta_cusco` resolve to `andean_valley` because their player civilization’s
documented region is not an `andes` map, so `resolveRegion` falls back to the map type’s default
(`regionForMapType('andes')` is `andean_valley`). That is designed behaviour, not a data bug; the audit
question is whether that fallback is the right landscape for a high-altitude mission.

---

## 4. Audit findings

### 4.1 Root causes

1. **The region is the only landscape identity.** A mission can override terrain, climate, vegetation and
   resources, but most do not. The profile, palette, vegetation and atmosphere are therefore regional.
2. **Heightfields are reused as whole maps.** The reuse chains in §3.3 are not shared “terrain families”;
   they are the same geometry, anchor and site.
3. **The site model is reused as the settlement.** A colonial church block is not a city, a fortress, a
   redoubt line or a fishing village. Five site models cover fourteen missions.
4. **Composition repeats.** The base→site→enemy diagonal is the same across most campaigns. The player
   learns one map shape and then sees it with other labels.
5. **Vegetation is generic.** Only two packs exist. `andes` is used only by Tambotoco; the other highland
   missions use procedural `broad`/`needle` crowns. The jungle has no pack at all.
6. **Hydrology is absent or accidental.** Only five missions integrate water. The Chanca and Colonial
   heightfields subtract depth below the fixed water level, creating lakes where the design intended a dry
   valley. Canals are rectangular ribbons, not irrigation systems.
7. **Atmosphere is underused.** Only two missions override it. The six `high_andes` missions share the same
   haze, sky tint and sun warmth.
8. **Relief is too low for the camera.** Amplitudes of 8–17 units over 256 m, with ridges at the border,
   read as a plain at camera height 54. Tambotoco works because its ~19 units of local relief sit in the
   middle of the composition.
9. **Settlement composition is a ring.** `planSettlement` uses a 5.5-unit ring with four shape biases.
   That is enough for a camp, not for a city, a fortress or a dispersed Andean community.
10. **The performance envelope is already tight.** Several missions exceed the general 600k/200 target.
    Identity must come from terrain and distribution, not from more props.

### 4.2 What already works

- **Caral:** the desert terrace, the Supe valley, the sea and the pyramids produce a readable transect. The
  authored heightfield, palette and site are a template for the coastal family.
- **Tambotoco:** the cave ridge, Huanacaure hill, stream, terraced fields and `andes` kit produce a
  highland identity that survives the RTS camera. It is the reference for the highland family.
- **Chavín (partial):** the Mosna valley, ceremonial terrace and mist are the right idea; the execution is
  too flat and too pale.
- **Junta Cusco (partial):** the Cusco→Apacheta→Umachiri transect and the Lalli river are the right
  structure; the map is rendered as a green valley.
- **Lima (partial):** the Rímac and the plaza are the right anchors; the surrounding terrain is a lawn.

---

## 5. The 20-mission matrix

The 13 audit fields are split into two tables for readability. The pairwise scores are in
[`geographic-similarity-matrix.md`](./geographic-similarity-matrix.md).

### 5.1 Historical context, natural region, current geography and target vegetation

| # | Mission | Campaign | Context | Place | Natural region (runtime profile) | Relief now | Hydrography now | Vegetation now → characteristic | Soil/materials now |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `m1_caral` | Preincas | 3000–1800 BC, Supe | Caral / Áspero | Costa desértica central / Supe (`central_coast`, site palette `caral`) | Terrace, scarp, dry hills, lomas | Supe, wetlands, sea, fords | Huarango, willow, reeds, totora → riparian monte, huarango terraces, totora, seasonal lomas | Sand/gravel, loam, beach |
| 2 | `m2_chavin` | Preincas | 1200–200 BC, Mosna | Chavín de Huántar | Sierra alta / Callejón de Conchucos (`andean_valley`) | Valley + terrace, weakly visible | Mosna + ford | Generic broad/needle → ichu, molle, pacay, wet valley | Rocky loam, stone |
| 3 | `m3_moche_recuay` | Preincas | 200 BC–800 AD, Moche | Huacas de Moche | Costa desértica norte / Moche–Chicama (`north_coast`) | Flat valley + terrace | Canal only; no river | Generic, sparse → algarrobal, riparian reeds, dry scrub | Sand, loam, adobe |
| 4 | `m4_wari` | Preincas | 600–1000 AD, Ayacucho | Wari complex | Sierra alta / Ayacucho basin (`high_andes`) | Flat basin, distant ridges | None; dry quebradas | Generic broad/needle → puna/ichu, molle/pacay on sheltered slopes | Rock, loam, stone |
| 5 | `m_tambotoco` | Inca | Myth of Pacaritambo | Tambotoco / Huanacaure | Sierra alta / Cusco valley, Pacaritambo (`andean_valley`, site palette `cusco_valley`) | Ridge, valley, hill | Stream/acequia | Molle, pacay, willow, ichu → same + puna/rock | Earth, rock, fields |
| 6 | `m5_yahuar_pampa` | Inca | 1438, Cusco | Yahuar Pampa | Puna / Yahuar Pampa near Cusco (`high_andes`) | Flat pampa + accidental pond | None; accidental lake | Generic broad/needle → puna grass/ichu, low scrub | Puna soil, gravel |
| 7 | `m6_chimu_inca` | Inca | c. 1470, north coast | Chan Chan / Paramonga | Costa desértica norte / Chan Chan (`north_coast`) | Flat desert/valley | Canal; sea west | Generic, sparse → almost none; algarrobo in river strips, totora wetlands | Sand, gravel, adobe |
| 8 | `m6b_guerra_civil` | Inca | 1532, Quipaipan | Quipaipan | Puna / Quipaipan near Cusco (`high_andes`) | Flat plain | None | Generic broad/needle → puna/ichu, low scrub | Puna soil |
| 9 | `m_lima` | Virreinato | 1535, Lima | Rímac / Lima | Costa desértica central / Rímac (`central_coast`) | Flat coastal plain | Rímac + sea | Algarrobo/willow + generic → algarrobal, reeds, fields | Sand, loam, adobe |
| 10 | `m_cusco_1536` | Virreinato | 1536, Cusco | Cusco / Sacsayhuamán | Sierra alta / Cusco basin (`high_andes`) | Flat basin | None | Generic broad/needle → puna/valley, molle, crops | Stone, earth |
| 11 | `m_vilcabamba` | Virreinato | 1572, Vilcabamba | Vilcabamba / Urubamba | Ceja de selva / Urubamba (`amazon`) | Flat grass + pond | Pond labelled as river | Scattered palms → cloud forest, ferns, palms (no species claim) | Clay/grass |
| 12 | `m7_tupac_amaru` | Virreinato | 1780–81, Tinta/Sangarará | Tungasuca / Sangarará / Cusco | Sierra alta / Tinta–Sangarará (`high_andes`) | Flat valley + ponds | Accidental ponds | Generic broad/needle → ichu, molle, crops | Earth, stone |
| 13 | `m_junta_cusco` | Independencia | 1814–15, Cusco/Umachiri | Cusco / Apacheta / Lalli | Sierra alta / Cusco–altiplano transect (`andean_valley` fallback) | Basin/pass/altiplano, weak | Lalli river | Generic broad/needle → puna/ichu, molle in valley | Earth, gravel |
| 14 | `m_lima_1821` | Independencia | 1820–21, Lima/Callao | Lima / Callao | Costa desértica central / Lima–Callao (`central_coast`) | Flat plain | Rímac + sea | Algarrobo/willow + generic → coastal scrub, algarrobo, fields | Sand, loam |
| 15 | `m8_independencia` | Independencia | 1824, Junín/Ayacucho | Two high pampas | Puna / Junín–Ayacucho (`andean_valley` fallback) | Flat pampas | None | Generic broad/needle → puna/ichu, wetland grasses | Grass, soil |
| 16 | `m_real_felipe` | Independencia | 1824–26, Callao | Real Felipe | Costa desértica central / Callao (`central_coast`) | Flat terrace | Sea west | Generic, sparse → almost none, dry scrub | Sand, gravel |
| 17 | `m_tarapaca` | República | 1879, Tarapacá | Quebrada de San Lorenzo | Desierto interior / Tarapacá quebrada (`south_coast`) | Flat plain + sea (wrong) | Sea west (wrong) | Generic, sparse → oasis vegetation, desert scrub | Sand, gravel |
| 18 | `m9_guerra_pacifico` | República | 1880, Arica | Arica / Morro | Costa desértica sur / Arica (`south_coast`) | Flat terrace + low ridge | Sea west | Generic, sparse → almost none, coastal scrub | Sand, gravel |
| 19 | `m_miraflores` | República | 1881, Lima south | Miraflores / San Juan | Costa desértica central / Lima south (`central_coast`) | Flat green field | Sea off-camera | Algarrobo/willow + generic → coastal scrub, isolated algarrobo | Sand/loam |
| 20 | `m_brena` | República | 1882–83, central sierra | Mantaro / Huamachuco | Sierra central / Mantaro (`high_andes`) | Flat plain | None | Generic broad/needle → crops, molle, ichu | Earth, grass |

### 5.2 Settlement, dominant visual, gameplay and reuse

| # | Mission | Settlement distribution | Dominant visual now | Geography that affects play | Reused components | Identity problem |
|---|---|---|---|---|---|---|
| 1 | `m1_caral` | City on terrace; Áspero on coast; fields in valley | White pyramids + green valley + sea | River crossing, fishing, terrace defence | Own heightfield/palette/site; shared generator/water/kit | Green too tropical; dry-season channel not legible |
| 2 | `m2_chavin` | Temple on terrace; base across river | White platform on pale green | Mosna crossing, temple approach | Own heightfield/river/site; generic vegetation/palette | Flat, washed out, river invisible |
| 3 | `m3_moche_recuay` | Base in valley; huacas on terrace; canal between | Huaca edge + blue canal | Canal control, huaca defence | Own heightfield/site/canal; shared coast palette | No river or dunes; generic green valley |
| 4 | `m4_wari` | Complex on terrace; base; provincial nodes | White platform on olive | Road/terrace network | Own heightfield/site; shared `high_andes` | Flat basin; no terraced amphitheatre |
| 5 | `m_tambotoco` | Cave → camp → Inticancha; dispersed hamlets | Ridge + valley + sacred hill | Vertical route, acequia, shrine | Own heightfield/palette/site/`andes` kit | Strong; polish only |
| 6 | `m5_yahuar_pampa` | Cusco base, central pampa, Chanca pucará | Olive pampa + pond | Open battle, pucará | Own heightfield/site; shared `high_andes` | Pampa without a hill; accidental lake |
| 7 | `m6_chimu_inca` | Camp, canal, Chan Chan | Canal trough | Canal closure, advance | Own heightfield/site/canal; shared north coast | No desert, dunes or river; canal reads as a pool |
| 8 | `m6b_guerra_civil` | Two camps, central pampa | Olive plain | Open battle | **Same site/heightfield as `m_cusco_1536`** | Not a pampa: it is the Cusco map |
| 9 | `m_lima` | City on north bank; base; sea | Brown plaza + blue river | River crossing, foundation | Own heightfield/site; shared with 1821/Miraflores | Lawn; no desert or grid |
| 10 | `m_cusco_1536` | City, camp, retreat | Small blocks on olive | Siege, fortress | **Same site/heightfield as `m6b`** | No dense city or Sacsayhuamán height |
| 11 | `m_vilcabamba` | Town, fort, escape | Dark grass + palms | Cover, escape | **Chanca heightfield/site** | Jungle reads as meadow; “river” is a pond |
| 12 | `m7_tupac_amaru` | Village/church, camp, road | Olive plain + ponds | Rebellion, march | **Colonial Cusco site/heightfield** | Tinta/Sangarará read as Cusco; ponds |
| 13 | `m_junta_cusco` | City start, pass, altiplano | Green + church | Transect, pass | Own heightfield/site; colonial model | Green; altiplano not distinct |
| 14 | `m_lima_1821` | Urban edge, roads, Callao | Green field + red roofs | Road cutting, siege | **Lima heightfield/site** | Same as 1535; no port or desert |
| 15 | `m8_independencia` | Two pampas, route | Bright green + trees | Cavalry, march | **Independence heightfield/site** | No pampa; two battles indistinguishable |
| 16 | `m_real_felipe` | Camp, fort | Olive plain + small fort | Siege, batteries | **Arica heightfield/site** | No bay or star fortress |
| 17 | `m_tarapaca` | Village, heights, road | Olive plain + yellow ring | Ambush, heights | **Arica heightfield/site** | No canyon; sea where there is none |
| 18 | `m9_guerra_pacifico` | Port, fort, battery | Olive terrace + small fort | Port defence | Own heightfield/site; shared with 2 | No Morro or port; flat |
| 19 | `m_miraflores` | Redoubt line, city, retreat | Green field + red roofs | Defensive line, retreat | **Lima heightfield/site** | Same as Lima; no desert or redoubts |
| 20 | `m_brena` | Communities, camp, enemy | Olive plain + labels | Guerrilla, passes | **Independence heightfield/site** | No Mantaro valley or terraces |

---

## 6. The 20 proposals

The proposal numbers below follow the family grouping, not the matrix row order; each heading names the
mission id. Group 6.5 includes the Cusco basin and its pampa at Quipaipan because they share the high-basin
grammar even though one is an urban siege and the other an open battle.

Each proposal is labelled with the certainty vocabulary of the project:

- **[DOC]** documented in a dossier under `docs/historia/`;
- **[TRAD]** tradition or chronicle;
- **[MITO]** myth or legend;
- **[DEB]** debated;
- **[ABS]** gameplay or presentation abstraction.

The technical column uses the five categories requested by the brief: **configuration**, **scenario
composition**, **new asset**, **modified asset** and **generation-system change**.

### 6.1 Desert coast with river valley

#### 1. `m1_caral` — La Ciudad Sagrada

**A. Identity.** A desert terrace above the green Supe floodplain, with the Pacific, the Áspero wetlands and
the pyramid skyline. The place should read as “desert city that eats from a river”, not as a tropical
village. **[DOC]**

**B. Topography.** Flat desert terrace about 8 m above the valley, a meandering scarp, dry rocky hills to
the north/east/south, coastal lomas to the south and a low coastal plain. **[DOC]** The terrace edge is the
main tactical height.

**C. Hydrography.** The Supe is irregular: dry most of the year, with a permanent water table and springs.
The mouth has totora wetlands and shallow ponds; the sea is west. Fords cross the north–south reach.
**[DOC]** The river is a barrier with authored crossings, not a decorative ribbon.

**D. Vegetation.** Riparian monte of willow, caña brava, carrizo and horsetail; huarango terraces; totora in
the wetlands; seasonal lomas. No universal lawn. **[DOC]**

**E. Soils and materials.** Desert sand/gravel on the terrace; alluvial loam in the valley; beach sand;
rock in the hills. The terrace and the floodplain must contrast in colour and roughness.

**F. Composition.** City on the terrace, Áspero on the coastal rise, fields in the valley. The river is the
spine; fords are the crossings; the lomas close the southern edge. Fishing on the coast, wood in the riparian
band, stone in the hills.

**G. Atmosphere.** Coastal garúa, cool haze, muted ochre and green. The current saturation is too tropical;
reduce it and let the desert terrace dominate.

**H. Differentiation.** Already the strongest coastal mission: pyramids + river + sea. Keep it; prevent the
green from climbing the terrace and make the dry season legible.

**I. Technical changes.**
- **Configuration:** palette saturation, mission atmosphere, river state.
- **Scenario composition:** dry-season channel, lomas, stronger terrace scarp.
- **New asset:** optional dry-wash decal.
- **Modified asset:** none required.
- **Generation system:** optional dry-river state in the authored heightfield; otherwise bake it.

#### 2. `m3_moche_recuay` — La frontera de los valles

**A. Identity.** A broad desert river valley with the Huacas de Moche, an irrigation canal, dunes and Andean
foothills. **[DOC]**

**B. Topography.** Flat valley floor; the huacas stand on a low terrace; dunes north and south; foothills
east. The current map has the valley but not the dunes or the river.

**C. Hydrography.** The Moche river and its canal; the sea west. The canal is the mission’s water-control
mechanic; the river is the reason the valley is green. **[DOC]** Add fords and a river mouth.

**D. Vegetation.** Algarrobal/huarango groves, riparian reeds, dry scrub. No lawn; density follows the
canal and the river.

**E. Soils and materials.** Sand and gravel on the desert; alluvial loam in the valley; adobe for the
huacas. The huaca terrace should read as adobe, not as a white slab.

**F. Composition.** River as the long axis; canal as the tactical branch; huacas on the terrace; fields
between canal and river; dunes as the open flank. The base is in the valley, the enemy in the foothills.

**G. Atmosphere.** Warm coastal sun, dust haze, ochre and dry green. Avoid the current olive uniformity.

**H. Differentiation.** Huaca silhouette + canal + dunes; a player should never confuse it with Chimú
(hyper-arid, Chan Chan) or Lima (urban oasis).

**I. Technical changes.**
- **Configuration:** palette, atmosphere, vegetation weights.
- **Scenario composition:** river, dunes, huaca terrace, canal trace.
- **New asset:** none mandatory; optional dune/desert PBR.
- **Modified asset:** huaca material.
- **Generation system:** authored heightfield with river and dunes (already the pattern).

#### 3. `m6_chimu_inca` — Chan Chan

**A. Identity.** The hyper-arid north coast, Chan Chan’s mud city, the La Cumbre canal, dunes and the Moche
river. **[DOC]**

**B. Topography.** Flat desert, a shallow river valley, low dunes, and the city on the desert plain. The
current map is a flat olive field.

**C. Hydrography.** The Moche river, the canal and the sea. The canal is the mission’s lever: closing it
starves the city. **[DOC]** The canal should read as an engineered channel with a gate, not a blue trough.

**D. Vegetation.** Almost none. Algarrobo in narrow riparian strips; totora at the wetlands; dry scrub
elsewhere. **[DOC/ABS]** The desert should be visibly empty.

**E. Soils and materials.** Sand, gravel, adobe. Chan Chan’s walls are mud; the city must not look like a
stone castle.

**F. Composition.** Canal as the strategic spine; Chan Chan in the desert; fields as a narrow green band;
dunes as a barrier; the sea west. The player advances along the canal, not across a lawn.

**G. Atmosphere.** Harsh sun, dust, bleached tones. Dusk can stay, but it must not turn the desert green.

**H. Differentiation.** Mud city + canal in a desert; distinct from Moche (valley + huacas) and Lima
(oasis + grid).

**I. Technical changes.**
- **Configuration:** palette, atmosphere, vegetation density near zero.
- **Scenario composition:** river, dunes, canal trace, city footprint.
- **New asset:** optional dune/desert PBR.
- **Modified asset:** adobe city materials.
- **Generation system:** authored heightfield (current pattern).

### 6.2 Central coastal oasis

#### 4. `m_lima` — La Ciudad de los Reyes (1535)

**A. Identity.** An oasis of the Rímac in the coastal desert: a planned city, the curacazgo, huacas and the
sea. **[DOC]**

**B. Topography.** Flat coastal plain, the Rímac valley, the Cerros de Quizu east and the sea west. The
current map is a flat green lawn.

**C. Hydrography.** The Rímac and its irrigation channels; the sea. The river is the reason for the city and
the main crossing. **[DOC]**

**D. Vegetation.** Algarrobal, riparian reeds and fields; no lawn. Density follows the river and the
irrigation.

**E. Soils and materials.** Sand and gravel on the desert; alluvial loam in the oasis; adobe and stone in
the city.

**F. Composition.** City on the north bank; the Rímac as the spine; the sea west; the hills east; the
curacazgo on the edge. A grid, not a brown circle.

**G. Atmosphere.** Garúa, grey light, muted tones. The city should look damp and grey, not tropical.

**H. Differentiation.** Urban grid + river + desert; distinct from Miraflores (redoubts) and Callao
(fortress).

**I. Technical changes.**
- **Configuration:** palette, atmosphere, vegetation.
- **Scenario composition:** city grid, river, desert edge, hills.
- **New asset:** none mandatory.
- **Modified asset:** colonial site modules.
- **Generation system:** authored heightfield with desert/river.

#### 5. `m_lima_1821` — El cerco de Lima

**A. Identity.** The outskirts of Lima and the Callao road, coastal desert, montoneras and the roads of
Lurín and Carabayllo. **[DOC]**

**B. Topography.** Coastal plain, the Callao bay, low hills. The current map is the same as 1535.

**C. Hydrography.** The Rímac, the sea and the irrigation channels. The port is the strategic edge.

**D. Vegetation.** Coastal scrub, algarrobos and fields; not a lawn.

**E. Soils and materials.** Sand, dust and adobe.

**F. Composition.** Lima as an urban edge; Callao as a port; the roads as the mission’s arteries; the
player cuts supplies rather than founding a city.

**G. Atmosphere.** Garúa/dust, dry tones.

**H. Differentiation.** Outskirts + port; not the 1535 foundation grid.

**I. Technical changes.**
- **Configuration:** palette, atmosphere, vegetation.
- **Scenario composition:** new Lima/Callao heightfield or a variant of Lima with the bay.
- **New asset:** port/battery modules if needed.
- **Modified asset:** colonial site modules.
- **Generation system:** authored heightfield (new).

#### 6. `m_miraflores` — Los reductos

**A. Identity.** The southern coast of Lima, a line of redoubts between the sea and the city, desert and
low relief. **[DOC/ABS]** The line of redoubts is documented; the exact coastal profile is a presentation
abstraction.

**B. Topography.** Coastal plain with low relief and the sea; the cliff/isthmus reading is a plausible
presentation, not a survey. No green field.

**C. Hydrography.** The sea; no river on the battlefield.

**D. Vegetation.** Coastal scrub and isolated algarrobos.

**E. Soils and materials.** Sand, gravel, rock.

**F. Composition.** The redoubt line across the isthmus; the sea as a flank; the city north; the retreat
east. The player defends a line, not a village.

**G. Atmosphere.** Coastal summer, dust, hard light.

**H. Differentiation.** Redoubts + cliff + sea; not the Lima foundation.

**I. Technical changes.**
- **Configuration:** palette, atmosphere, vegetation.
- **Scenario composition:** new heightfield with the redoubt line and cliffs.
- **New asset:** optional redoubt module; existing forts can carry it.
- **Modified asset:** colonial site modules.
- **Generation system:** authored heightfield (new).

#### 7. `m_real_felipe` — El último bastión

**A. Identity.** The Callao bay, the Real Felipe fortress, a sandy isthmus, a siege and a naval blockade.
**[DOC/ABS]** The fortress and the siege are documented; its exact plan and the bay profile are a
typological abstraction.

**B. Topography.** Flat isthmus, a low hill, the bay; the exact plan is a typological abstraction. The
current map is Arica’s terrace.

**C. Hydrography.** The sea and the bay; no river.

**D. Vegetation.** Almost none; dry scrub.

**E. Soils and materials.** Sand, gravel, rock.

**F. Composition.** The fortress as the centre; the besieger camp inland; the batteries; the sea as the
blockade edge. A star fortress needs a star plan, not a rectangular block.

**G. Atmosphere.** Dusk, sea haze.

**H. Differentiation.** Star fortress + bay; not Arica’s terrace.

**I. Technical changes.**
- **Configuration:** palette, atmosphere.
- **Scenario composition:** new Callao heightfield and fortress plan.
- **New asset:** star-fort module (or a modular variant of the existing fort).
- **Modified asset:** coastal fort materials.
- **Generation system:** authored heightfield (new).

### 6.3 Southern desert quebrada

#### 8. `m_tarapaca` — La quebrada

**A. Identity.** A deep quebrada in the Tarapacá desert, a village on a ledge, an oasis and barren heights;
no sea. **[DOC/ABS]** The quebrada and the village are documented; the oasis and the exact canyon profile
are a plausible reconstruction to validate. The dossier explicitly says the current reuse of the Arica
coast is an abstraction, not a survey.

**B. Topography.** A canyon/ravine with steep sides, a pampa above it and a village ledge; the exact profile
is an abstraction. The current map is a flat coastal plain.

**C. Hydrography.** A seasonal stream or spring feeding the oasis; no sea. The quebrada is the reason the
village exists.

**D. Vegetation.** Oasis vegetation (generic, no invented species) and desert scrub. Sparse outside the
oasis.

**E. Soils and materials.** Rock, gravel and sand; the oasis is a small green/earth anomaly.

**F. Composition.** Village in the quebrada; heights for riflemen; the road to Pachica/Arica; the player
fights uphill/downhill, not across a lawn.

**G. Atmosphere.** Hard sun, dust, high contrast.

**H. Differentiation.** Canyon + oasis; not Arica and not Callao.

**I. Technical changes.**
- **Configuration:** palette, atmosphere, no sea.
- **Scenario composition:** new quebrada heightfield and village plan.
- **New asset:** optional rock/cliff kit; oasis vegetation can reuse existing species.
- **Modified asset:** none mandatory.
- **Generation system:** authored heightfield (new), dry hydrology.

#### 9. `m9_guerra_pacifico` — Arica

**A. Identity.** The port terrace of Arica, the Morro as a backdrop, the Pacific, the fort and the battery.
**[DOC/ABS]** Arica and its port are documented; the Morro is a documented landmark but its in-game
representation is an abstraction.

**B. Topography.** Flat port terrace, a coastal cliff/ridge, the Morro outside the playable range but
visible as a silhouette. The current map has a low ridge and no Morro.

**C. Hydrography.** The sea; no river.

**D. Vegetation.** Almost none; coastal scrub.

**E. Soils and materials.** Sand, gravel, rock.

**F. Composition.** Port/fort on the terrace; sea west; Chilean camp east; batteries on the approaches.
The Morro gives the place its silhouette.

**G. Atmosphere.** Salt haze, bright sun.

**H. Differentiation.** Morro + port; not Callao and not Tarapacá.

**I. Technical changes.**
- **Configuration:** palette, atmosphere.
- **Scenario composition:** Morro backdrop, port terrace, battery placement.
- **New asset:** optional Morro backdrop mesh (non-playable).
- **Modified asset:** fort materials.
- **Generation system:** authored heightfield (modify existing Arica).

### 6.4 Humid inter-Andean valley

#### 10. `m2_chavin` — Chavín de Huántar

**A. Identity.** A narrow valley of the Mosna at 3180 m, with the ceremonial terrace wedged between steep
slopes and cold mist. **[DOC]**

**B. Topography.** A confined valley, terraces, a quebrada east and high slopes. The current map is a pale
flat plain.

**C. Hydrography.** The Mosna with fords and a dry quebrada. The river is the valley’s spine; today it is
almost invisible at the edge.

**D. Vegetation.** Highland valley: ichu, molle and pacay; not generic broadleaf. Use the existing `andes`
pack.

**E. Soils and materials.** Rocky loam, grey stone and wet silt. The ceremonial platform must read as stone,
not as white cardboard.

**F. Composition.** The temple on the terrace; the base across the river; the crossing as the approach; the
ridges as the frame. The player should feel the valley walls.

**G. Atmosphere.** Cold mist, blue-grey light, low contrast. The current mint-green palette fights the
documented altitude.

**H. Differentiation.** Vertical valley + river + stone platform; it cannot look like a pampa.

**I. Technical changes.**
- **Configuration:** `vegetationKit: 'andes'`, palette, atmosphere.
- **Scenario composition:** deepen the valley, widen the river, add slopes.
- **New asset:** none.
- **Modified asset:** temple material/scale.
- **Generation system:** authored heightfield (modify existing Chavín).

### 6.5 High basin, sacred valley and Quipaipan pampa

#### 11. `m4_wari` — El Horizonte Medio

**A. Identity.** A high basin at Ayacucho, with andenes and a stone complex between dry quebradas. **[DOC]**

**B. Topography.** Basin floor, agricultural terraces on the slopes, surrounding ridges and dry quebradas.
The current map is a flat basin with distant ridges.

**C. Hydrography.** Seasonal streams and dry quebradas; no large river. Water is scarce and that is part of
the economy.

**D. Vegetation.** Puna/ichu and molle/pacay in sheltered slopes; no forest.

**E. Soils and materials.** Rock, terrace loam and grey stone.

**F. Composition.** Complex on a terrace; andenes as productive rings; provincial nodes on the slopes;
roads connecting them. The player reads the network from the terrain.

**G. Atmosphere.** Thin clear air, strong sun, cold shadows.

**H. Differentiation.** Terraced amphitheatre + stone complex; not Cusco and not a pampa.

**I. Technical changes.**
- **Configuration:** `vegetationKit: 'andes'`, palette, atmosphere.
- **Scenario composition:** andenes, ridges, quebradas, node placement.
- **New asset:** none.
- **Modified asset:** complex materials.
- **Generation system:** authored heightfield (modify existing Wari).

#### 12. `m_tambotoco` — Los hijos de Tambotoco

**A. Identity.** The highland valley of Pacaritambo: the cave ridge, the Huanacaure hill, the stream and the
terraced fields. It is the reference scene. **[MITO]** / **[TRAD]**

**B. Topography.** Cave ridge, valley floor, sacred hill. The current composition is the right one.

**C. Hydrography.** Stream/acequia with fords. Keep it.

**D. Vegetation.** Molle, pacay, willow and ichu; the `andes` kit is already in use. Keep it.

**E. Soils and materials.** Earth, rock and field soil; the `cusco_valley` palette is already scoped. Keep
it.

**F. Composition.** Cave → camp → Inticancha; dispersed hamlets. Keep it.

**G. Atmosphere.** Long morning light, `timeOfDayValue 0.34`. Keep it.

**H. Differentiation.** The strongest identity in the game. Do not redesign it; only add distant peaks,
rock outcrops and puna density if the budget allows.

**I. Technical changes.**
- **Configuration:** minor vegetation/atmosphere tuning only.
- **Scenario composition:** optional distant relief and rock clusters.
- **New asset:** optional andes rock kit.
- **Modified asset:** none.
- **Generation system:** none.

**Audit of Huanacaure and Inticancha.** Huanacaure is implemented as a three-tier shrine hill with a route
and a discovery; Inticancha is implemented in `AylluSite` as a paved plaza, altar and four cancha plots,
raised in phases. These are the strongest foundation beats in the catalogue and match the dossier’s
four-cancha account. Keep them. The only gap is the surrounding highland (distant peaks, rock outcrops,
puna density), not the foundation plan.

#### 13. `m_cusco_1536` — Cusco en llamas

**A. Identity.** The Cusco basin, a dense city, Sacsayhuamán on its height and a terraced campiña under
siege. **[DOC]**

**B. Topography.** Basin floor, the Sacsayhuamán hill, agricultural terraces. The current map is a flat
plain and the fortress is a small block.

**C. Hydrography.** A stream/acequia and irrigation channels; do not assert an undocumented river line.
**[ABS]** Keep water subtle.

**D. Vegetation.** Puna/valley, molle and crops. Use the `andes` kit.

**E. Soils and materials.** Stone and earth; the city must read as dense masonry and thatch, not as isolated
blocks.

**F. Composition.** City centre; fortress on the height; campiña; retreat road to Ollantaytambo. The siege
is a ring around a city, not a line on a plain.

**G. Atmosphere.** Morning; smoke from burning roofs **[DOC]**; dust. Smoke is a documented event, not an
invented spectacle.

**H. Differentiation.** Urban siege + fortress height; not Quipaipan.

**I. Technical changes.**
- **Configuration:** palette, atmosphere, `vegetationKit: 'andes'`.
- **Scenario composition:** split from `m6b`; own heightfield and site; fortress hill; city density.
- **New asset:** optional smoke VFX; no new city kit if modules can be merged.
- **Modified asset:** `cusco_inca_site` composition.
- **Generation system:** authored heightfield (new Cusco variant or modified existing).

#### 14. `m6b_guerra_civil` — Quipaipan

**A. Identity.** An open high pampa near Cusco, a battlefield with low hills and a dry quebrada; no city.
**[DOC/DEB]** The battle is documented; the exact site is debated, so the pampa remains a documented
abstraction rather than a survey.

**B. Topography.** Broad pampa with low ridges and a dry wash. The current map is the Cusco basin.

**C. Hydrography.** A dry seasonal channel; no lake.

**D. Vegetation.** Puna/ichu and low scrub.

**E. Soils and materials.** Dry earth, gravel and rock.

**F. Composition.** Two armies facing across the pampa; low hills for flanking; the player reads open
manoeuvre, not a siege.

**G. Atmosphere.** Clear morning, dust.

**H. Differentiation.** Open battlefield vs urban Cusco. This is the most important split in the catalogue.

**I. Technical changes.**
- **Configuration:** palette, atmosphere, `vegetationKit: 'andes'`.
- **Scenario composition:** new Quipaipan heightfield/site; stop sharing `cusco_inca_site`.
- **New asset:** none mandatory; a battle camp can reuse existing modules.
- **Modified asset:** none.
- **Generation system:** authored heightfield (new).

#### 15. `m7_tupac_amaru` — La Gran Rebelión

**A. Identity.** A rural highland place around Tinta/Tungasuca and the Sangarará pampa, with a colonial
village church and puna; not the Cusco plaza. **[DOC/ABS]** The names and the campaign are documented; the
valley/pampa composition is a plausible reconstruction.

**B. Topography.** Valley floor, terraced slopes and pampa; the exact profile is an abstraction. The current
map is a flat plain with ponds.

**C. Hydrography.** A stream/acequia (plausible, labelled) and no accidental lakes.

**D. Vegetation.** Ichu, molle and crops; use the `andes` kit.

**E. Soils and materials.** Earth and stone.

**F. Composition.** Village/church as the centre; pampa for the rebel camp; road to Cusco. The mission is a
rural rebellion, not a city siege.

**G. Atmosphere.** Cold dusk, dust.

**H. Differentiation.** Rural highland village + pampa; not Cusco colonial and not the Altiplano.

**I. Technical changes.**
- **Configuration:** palette, atmosphere, `vegetationKit: 'andes'`.
- **Scenario composition:** new Tinta/Sangarará site and heightfield; stop using `colonial_site` as the
  whole place.
- **New asset:** optional rural chapel variant; existing church module can be reused.
- **Modified asset:** colonial modules.
- **Generation system:** authored heightfield (new).

#### 16. `m_junta_cusco` — La Junta del Cusco

**A. Identity.** A compressed transect from Cusco to La Apacheta, Umachiri and the altiplano, with the Lalli
river. **[DOC]**

**B. Topography.** Basin, pass, altiplano. The current map has the route but reads as a green valley.

**C. Hydrography.** The Lalli river and high-altitude wetlands, if the sources support them. **[DOC/ABS]**

**D. Vegetation.** Puna/ichu; molle in the valley. Use the `andes` kit.

**E. Soils and materials.** Rock, earth and gravel.

**F. Composition.** City start; pass; altiplano; the road as the axis. The transect is the identity.

**G. Atmosphere.** Cold morning, clear air.

**H. Differentiation.** Transect with altiplano; already more distinct than most.

**I. Technical changes.**
- **Configuration:** `region: 'high_andes'` (today it falls back to `andean_valley`), palette, atmosphere,
  `vegetationKit: 'andes'`.
- **Scenario composition:** strengthen the pass and altiplano; keep the route.
- **New asset:** none.
- **Modified asset:** colonial modules.
- **Generation system:** authored heightfield (modify existing Junta).

### 6.6 High pampas

#### 17. `m5_yahuar_pampa` — Yahuar Pampa

**A. Identity.** A high pampa near Cusco, open grassland, a Chanca pucará on a height; no lake. **[TRAD]**

**B. Topography.** Broad pampa, pucará hill, slopes. Remove the depression that creates the accidental lake.

**C. Hydrography.** A dry seasonal channel; no lake.

**D. Vegetation.** Ichu/paja and low scrub; no trees on the pampa.

**E. Soils and materials.** Puna soil, gravel and rock.

**F. Composition.** Cusco base on the edge; pampa in the centre; Chanca pucará on the height; open lines.

**G. Atmosphere.** Cold dusk, clear air, long shadows.

**H. Differentiation.** Open steppe + fortified height; not the Cusco basin.

**I. Technical changes.**
- **Configuration:** palette, atmosphere, `vegetationKit: 'andes'`.
- **Scenario composition:** remove the accidental lake; add the pucará hill; adjust the pampa.
- **New asset:** none.
- **Modified asset:** pucará module.
- **Generation system:** authored heightfield (modify existing Chanca).

#### 18. `m8_independencia` — Junín y Ayacucho

**A. Identity.** Two high pampas, Junín and Ayacucho, linked by the campaign route; cavalry country.
**[DOC/ABS]** The battles and places are documented; the wet/dry contrast is a presentation proposal, not a
claim.

**B. Topography.** Flat pampas with low hills; two distinct halves, not one plain.

**C. Hydrography.** The Junín wetland/lake if the sources support it; a seasonal channel at Ayacucho.
**[DOC/ABS]** This is a validation question, not an invented feature.

**D. Vegetation.** Ichu/paja; no trees.

**E. Soils and materials.** Peat/wet soil at Junín; loam/gravel at Ayacucho.

**F. Composition.** Two contrasting pampas; route between them; space for cavalry. The two battles must be
readable as two places.

**G. Atmosphere.** Cold mist at Junín; clear sun at Ayacucho.

**H. Differentiation.** Two contrasting pampas; not the Mantaro valley.

**I. Technical changes.**
- **Configuration:** `region: 'high_andes'` (today it falls back to `andean_valley`), dual palette,
  atmosphere.
- **Scenario composition:** new or heavily modified heightfield with two pampa zones.
- **New asset:** optional wetland ground cover/PBR.
- **Modified asset:** church/camp modules.
- **Generation system:** authored heightfield (modify existing Independence).

### 6.7 Central sierra and cloud forest

#### 19. `m_brena` — La Breña

**A. Identity.** The deep Mantaro valley, a river, terraced slopes, villages and the passes toward
Huamachuco; guerrilla country. **[DOC]**

**B. Topography.** Deep valley, agricultural terraces, passes. The current map is a flat plain.

**C. Hydrography.** The Mantaro river and irrigation channels.

**D. Vegetation.** Crops, molle and ichu on the puna. Use the `andes` kit.

**E. Soils and materials.** Terrace loam and rock.

**F. Composition.** Communities in the valley; camp; passes; roads. The player uses the valley as cover, not
as an open battlefield.

**G. Atmosphere.** Cold morning, clear air, dust.

**H. Differentiation.** Deep valley + terraces; not the Junín pampa.

**I. Technical changes.**
- **Configuration:** palette, atmosphere, `vegetationKit: 'andes'`.
- **Scenario composition:** new Mantaro heightfield/site; stop sharing `independence_site`.
- **New asset:** optional terrace/wall modules (existing).
- **Modified asset:** independence site modules.
- **Generation system:** authored heightfield (new).

#### 20. `m_vilcabamba` — El último Inca

**A. Identity.** The ceja de selva: steep mountains, the Urubamba river, dense cloud forest, Vilcabamba and
Huayna Pucará. **[DOC]** The dossier already says the current Chanca reuse is an abstraction, not Espíritu
Pampa.

**B. Topography.** Steep ridges, a narrow valley and a river. The current map is a flat grass field with a
pond.

**C. Hydrography.** The Urubamba and tributaries; no pond labelled as a river.

**D. Vegetation.** Dense humid forest, ferns and palms; mist. No invented species names; use “cloud forest”
as the label.

**E. Soils and materials.** Clay, wet earth and rock.

**F. Composition.** River as a barrier; town on a ledge; pucará on a spur; forest as cover. The player
should feel enclosed by vegetation.

**G. Atmosphere.** Humid dusk, mist, dark green.

**H. Differentiation.** Vertical jungle + river; unmistakable.

**I. Technical changes.**
- **Configuration:** `region: 'amazon'`, palette, atmosphere, vegetation pack.
- **Scenario composition:** new Vilcabamba heightfield/site; stop sharing `chanca_site`.
- **New asset:** `selva` vegetation pack, 1–2 GLBs maximum; rock/cliff modules.
- **Modified asset:** fortress modules for the pucará.
- **Generation system:** authored heightfield + vegetation pack (new).

---

## 7. Acceptance criteria

A mission has a geographic identity when it passes all ten criteria. Score each 0–3; the minimum is 24/30,
with no 0 in criteria 1, 2, 4, 7 and 10.

| # | Criterion | 0 | 1 | 2 | 3 | Evidence |
|---|---|---|---|---|---|---|
| 1 | Distinguishable without the name | Only the HUD tells | Colour/lighting | Silhouette/topography | Unmistakable | Blind test 8/10 |
| 2 | Topography matches the proposal | Contradicts it | Partly | Mostly | In all three views | Heightfield + captures |
| 3 | Vegetation is environmentally coherent | Wrong species | Generic | Plausible mix | Mix + distribution + density | Species table + clustering |
| 4 | Hydrology is integrated | Missing/accidental | Decorative | Connected | Connected and strategic | Water mask + capture |
| 5 | Composition has its own character | Copies another map | New site | New route | New strategic reading | Anchors + top-down |
| 6 | Terrain supports strategic reading | Flat | One affordance | Two | Three or more, documented | Playtest + briefing |
| 7 | Does not depend on colour/light | Only colour | Colour + light | Silhouette + material | Geometry + material + light | Grayscale test |
| 8 | Units and buildings stay legible | Lost | Acceptable | Clear | Clear at 54 and 28 | Captures at 54/28 |
| 9 | Within the performance budget | Breaks cap | At the limit | Inside | Inside with margin | `bench_scene --assert` |
| 10 | Historical/geographic claims are sourced | Invented claim | No source | Partial source | Source + certainty label | Certainty table |

**Human review is mandatory for:** the location and shape of Vilcabamba/Espíritu Pampa and Huayna Pucará;
the Tarapacá quebrada; the Real Felipe plan and Callao bay; the Miraflores redoubt line; Cusco 1536 and
Sacsayhuamán; the debated location of Quipaipan; the presence of Lake Junín/wetland; Tinta/Sangarará;
the Mantaro/Huamachuco route; the Arica Morro; the Moche/Rímac/Mosna courses; the dry regime of the Supe;
and every vegetation species.

**Do not accept:** a mission that only changes palette, time of day, labels or the site model while keeping
the same heightfield and anchors. That is the current failure mode.

---

## 8. Capture protocol

The existing `review/audit/*-1600.png` captures are a useful snapshot, but they are not an acceptance
protocol. Each mission needs:

1. **Three RTS views** at 1600×900, HUD hidden, fixed seed: close (28), default (54) and wide (max).
2. **Top-down orthographic** full-map view.
3. **Terrain-only** view with units, buildings and props hidden.
4. **Grayscale** version of the default view.
5. **Hypsometric map** (height bands) and **water mask**.
6. **Blind contact sheet** without mission names for the 8/10 test.
7. **Before/after** pairs for every pilot, same seed and camera.
8. **`bench_scene --assert`** output for opening and late states.

The captures should be produced by a new script (for example `scripts/geography_capture.mjs`) and written
to `review/` (gitignored). Only the final, reviewed images belong in `docs/media/`.

---

## 9. Historical and geographic validation

These are the decisions that cannot be closed by code or art review alone:

| Question | Why it matters | Required reviewer |
| --- | --- | --- |
| Vilcabamba/Espíritu Pampa and Huayna Pucará | The current jungle is a Chanca reuse | Historical + geographic review |
| Tarapacá quebrada and village | Current map is Arica’s coast | Historical + geographic review |
| Real Felipe plan and Callao bay | Current map is Arica’s terrace | Historical + military-geography review |
| Miraflores redoubt line | Current map is Lima’s plain | Historical + military-geography review |
| Cusco 1536 and Sacsayhuamán | Current site is shared with Quipaipan | Historical + urban-geography review |
| Quipaipan location | Debated; keep the pampa abstraction | Historical review |
| Junín wetland/lake | Not in the current dossier | Historical + geographic review |
| Tinta/Sangarará | Current site is Cusco’s church | Historical review |
| Mantaro/Huamachuco route | Current site is Junín/Ayacucho | Historical + geographic review |
| Arica Morro | Current map has no Morro | Geographic review |
| Moche/Rímac/Mosna courses | Current maps simplify or omit them | Geographic review |
| Supe dry regime | Current river is always full | Historical + hydrologic review |
| Vegetation species | Do not invent species | Historical/ethnobotanical review |

Every accepted feature must carry one of **[DOC]**, **[TRAD]**, **[MITO]**, **[DEB]** or **[ABS]** and a
link to the dossier that supports it.

---

## 10. See also

- [`geographic-families.md`](./geographic-families.md) — the reusable family/component model.
- [`geographic-similarity-matrix.md`](./geographic-similarity-matrix.md) — pairwise similarity and clusters.
- [`../plan/geographic-identity-roadmap.md`](../plan/geographic-identity-roadmap.md) — pilots, order and
  dependencies.
- [`art-direction.md`](./art-direction.md) — stylized realism, camera and budgets.
- [`visual-language.md`](./visual-language.md) — the implementation map for terrain, vegetation and light.
- [`cultural-landscape.md`](./cultural-landscape.md) — roads, fields, canals, terraces and settlement shape.
- [`../historia/mapas.md`](../historia/mapas.md) — documented geography and region definitions.
- The mission dossiers under [`../historia/campanas/`](../historia/campanas/).
