# Visual language

Art direction for Edades del Perú. It fixes how terrain, architecture, materials,
vegetation and colour read on screen so that **a player can recognise the period,
the region and the civilization without reading the mission name**.

This is an implementation-facing document: it names the code that owns each
decision and links the historical claims to [`docs/historia/`](../historia/).
Where a value is a gameplay abstraction rather than a reconstruction it is marked
as such. **No new historical claim is introduced here** — the sources live in the
dossiers.

Everything is data-driven: adding a region or a civilization means editing the
defs in `src/model/defs/`, not the generator.

## Terrain

The playable **`MapType`** (`coast | andes | altiplano | jungle`) is the coarse
family; the fine identity is the **`GeographicRegion`** (`north_coast`,
`central_coast`, `south_coast`, `andean_valley`, `high_andes`, `altiplano`,
`amazon`) resolved by `resolveMapProfile`. Each region owns a
`HistoricalMapProfile` (`src/model/defs/profiles.ts`) whose `terrain`, `climate`,
`water` and `elevation` drive `generateHeightField` (`src/rendering/heightField.ts`)
and the `Terrain` shader (`src/rendering/Terrain.ts`).

| Region | Reads as | Key profile signals |
|---|---|---|
| `north_coast` | desert coast + fertile river valley | `soil: sandy`, `aridity 0.92`, low `mtnAmp`, `wetland` |
| `central_coast` | coastal valley (Supe) | `soil: loam`, `aridity 0.82`, `wetland` |
| `south_coast` | arid south coast + pampa | `soil: sandy`, `aridity 0.95`, no `wetland` |
| `andean_valley` | inter-Andean valley | `soil: loam`, `mtnAmp 16`, `terraceChance 0.45`, vegetation 0.55 |
| `high_andes` | steep high range | `soil: rocky`, `mtnAmp 17`, `terraceChance 0.7`, cold |
| `altiplano` | high plateau + lake | `soil: peaty`, `wetland`, lake, vegetation 0.15 |
| `amazon` | high jungle | `soil: clay`, vegetation 1.0, humid |

Terrain blending (`Terrain.ts` fragment shader) is procedural and slot-based
(`sand`, `dirt`, `grass`, `rock`, `snow`), combined by **slope**, **elevation**
(`snowLine`), **aridity** (`sand`/`dirt` push), **vegetation** (green tint) and
**temperature** (cool → bluish, hot → warm). The same weather reads on the
horizon through each region's `atmosphere` (`skyTint`, `fogDensity`, `sunWarmth`)
— an **abstraction** of the documented geography, applied as aerial perspective.

Distinguishing rule of thumb (the classic "biome" trap to avoid):

- **Coast** is not just sand: it is desert **plus** a fertile river valley,
  agriculture, irrigation/canals and wetland oases.
- **Andes** is not just mountains: it is ravines **plus** valley floors,
  terraced slopes (andenes), terraces and cut-stone settlements.
- **Altiplano** is not just grass: it is a high plateau **plus** lake, bofedales
  and adapted agriculture.

## Architecture

Each civilization has a `CivDef.visual.arch` (`ArchStyle`) and a resolved
`HistoricalArchitectureProfile` from `archProfileFor(civ, era)`
(`src/model/defs/architecture.ts`). The profile names the **wall**, **roof**,
**foundation**, **ornament** and **`monumentalTiers`**, and is consumed by
`ProceduralModel.ts`. **After 1532 (`era ≥ VICEROYALTY`) the era governs the
look** (colonial/republican), overriding the civilization's pre-Hispanic style.

Style bases (`STYLE_BASES`):

| `ArchStyle` | Wall | Roof | Foundation | Ornament | Civs |
|---|---|---|---|---|---|
| `coastal-adobe` | adobe | thatch | platform | frieze | Caral, Cupisnique, Moche, Nazca, Paracas, Chimú, Chincha |
| `andean-masonry` | cut-stone | thatch | platform | niches | Chavín, Wari, Inca |
| `altiplano-stone` | megalithic | flat-stone | platform | megalith + niches | Tiahuanaco, Collas/Lupaca |
| `highland-terraced` | fieldstone | thatch | terrace | — | Recuay, Chanca, Huanca |
| `colonial` | brick | tile | plinth | — | Realistas |
| `republican` | concrete | flat-metal | plinth | — | Patriotas, República, Chile |

Per-civilization overrides (`CIV_ARCH`) tune the same style (e.g. Caral drops the
painted frieze; Moche raises `monumentalTiers` to 3; Inca is cut-stone +
terraced + niches + tapestry). The historical rationale and sources per civ are
in [`arquitectura.md`](../historia/arquitectura.md).

### Silhouette

Silhouette is how a building is recognised from a distance, and it comes from
structure, not colour:

- **Foundation** — `platform` (stepped huaca rise), `terrace` (agricultural
  andenes), `plinth` (colonial/republican block).
- **`monumentalTiers`** — the height of monumental compounds: Caral/Nazca mounds
  (2/1) are low and broad; Moche, Chavín, Wari, Chimú, Inca and Tiahuanaco rise
  higher (3–4).
- **Roof pitch** — Andean thatch gables vs. flat altiplano stone vs. tile/steel.
- **Ornament** — friezes (coastal adobe), trapezoidal niches (masonry), cyclopean
  corner blocks (megalithic), hanging tapestries (Inca).

### Silhouette markers per civilization

The center (and, where it fits, the fortress) carries a compact **silhouette
marker** in addition to the style profile, so two coetaneous civilizations read
differently even when they share an `ArchStyle` (e.g. Chanca vs Huanca before
this layer were both fieldstone, terraced, two-tier centres). The marker is data
in `HistoricalArchitectureProfile.silhouette` (`architecture.ts`) and is built by
`addCivSilhouette` (`ProceduralModel.ts`):

| Motif | Civilization | Attested form (source) |
|---|---|---|
| `circular-plaza` | Caral | sunken circular plaza + upright stones (`caral.md`) |
| `tenon-heads` | Chavín | cabezas clavas on the temple wall (`chavin.md`) |
| `stone-heads` | Cupisnique | stone heads in the adobe facade (`cupisnique.md`) |
| `funerary-enclosure` | Paracas | funerary enclosure with wrapped bundles (`paracas.md`) |
| `ramp` | Moche, Chincha | access ramp on the huaca/complex (`moche.md`, `chincha.md`) |
| `low-mound` | Nazca | low broad mound (Cahuachi) (`nazca.md`) |
| `stelae` | Recuay | carved stelae (Pashash) (`recuay.md`) |
| `perimeter-wall` | Wari | walled urban compound (`wari.md`) |
| `sunken-court` | Tiahuanaco | sunken patio (`tiahuanaco.md`) |
| `citadel` | Chimú | walled citadel (Chan Chan) (`chimu.md`) |
| `pucara` | Chanca | hilltop watchtower/fortress (`chanca.md`) |
| `chullpa` | Collas/Lupaca | funerary tower (`collas_lupaca.md`) |
| `terraces` | Huanca | agricultural andenes (`huanca.md`) |
| `ushnu` | Inca | stepped ushnu platform (`inca.md`) |

The markers are abstractions of the documented forms (not reconstructions) and
never replace the material/ornament layer. `tests/e2e/civ-visuals.spec.ts`
checks the Chanca/Huanca center and fortress pairs; `tests/profiles.test.ts`
guards that every pre-Hispanic civ has a marker and coetaneous profiles differ.

### Emblems

Each civilization's banner carries an procedural emblem
(`CivDef.visual.emblem`) abstracting an attested motif (Inti, feline, staff god,
fret, wave, condor, tocapu, cross, sunburst, shield). Source table in
[`arquitectura.md`](../historia/arquitectura.md) §2.

## Materials

| Material | Kind | Where it reads |
|---|---|---|
| `adobe` | wall | `andeanWall` tint `#c8a878`, `brick` texture |
| `fieldstone` / `cut-stone` | wall | `andeanWall` grey `#a89e8c`, `stone` texture |
| `megalithic` | wall | `andeanWall` light `#b4aca0` + `andeanMegaliths` corner blocks |
| `brick` | wall | colonial facade (`facadeTex` → `brick`) |
| `concrete` | wall | republican facade (`concreteWall`) |
| `metal` | wall | republican `metal` facade |
| `wood` | post / beam | structural posts, lintels and colonial *quincha* (texture `wood`); **not** a `WallMaterial`, so it never appears in `arch.wall` |
| `thatch` | roof | `andeanThatchRoof` (straw `#c9a94e` mixed with the civ colour) |
| `flat-stone` | roof | altiplano flat roof |
| `tile` / `flat-metal` | roof | colonial tile / republican steel |

Material colour is always **mixed with the civilization palette** (`mixHex`) so
walls and roofs stay recognisable per culture without becoming a flat recolour.
Texture slots are generated in `src/rendering/Textures.ts` (`MaterialTex`) and
the AI-generated PBR set is loaded by `src/rendering/Biomes.ts` (falling back to
the procedural material when the assets are absent — see
[`PROVENANCE.md`](../../PROVENANCE.md)). The per-style wall/roof material becomes a
generated slot via `WALL_TEX`/`ROOF_TEX` (`ProceduralModel.ts`): `adobe→wall_adobe`,
`cut-stone→wall_cutstone`, `megalithic→wall_megalith`, `fieldstone→wall_fieldstone`,
`brick→wall_brick`, `concrete→wall_concrete`; `thatch→roof_thatch`,
`flat-stone→roof_flatstone`, `tile→tile`, `flat-metal→roof_flatmetal`. The
cultural landscape (fields, roads, plaza, canals, terraces, walls, corrals) and
the resource/tree materials likewise overlay generated slots via
`applyGeneratedPbr` (`Biomes.ts`).

## Vegetation

Trees are instanced (`src/rendering/TreeInstances.ts`) with three canopy
variants: `broad`, `needle` (conifer / high Andes), `frond` (jungle). The region
profile sets `vegetation.density` and a `variants` weight map, so the Amazon is
dense and frond-heavy while the coast is nearly bare and the high Andes mixes
`broad`/`needle`. Tree chopping, fog culling and fall animation all run through
the instance manager.

**Ambient props and fauna** add life on top of the trees, also data-driven and
visual-only: `src/model/defs/props.ts` scatters cacti, totora, rock clusters and
shrubs by region suitability (aridity, moisture, slope, beach), and
`src/model/defs/wildlife.ts` places llamas and vicuñas on the puna, condors above
the Andes and pelicans on the shore. The **llama pilot** uses a rigged CC0 Andean
camelid (Quaternius alpaca as a llama stand-in) with `Idle`, `Walk` and `Eating`
clips: it walks its deterministic orbit and stops to graze, grounded on the terrain.
Vicuñas, condors and pelicans keep the procedural bodies
(`src/rendering/faunaModels.ts`) built from rounded shapes with vertex-colour AO and
**articulated legs/wings** (shared geometry and material), rather than flat boxes;
an asset-load failure also falls back to that path. Both are pure planners over
`region + seed` and regenerate deterministically on load.

Fauna evidence (same `map=altiplano`, seed 777, 1600x900):
[`fauna-llama-before-after.webp`](../media/fauna-llama-before-after.webp) (procedural → rigged close-up) and
[`fauna-llama-rts-before-after.webp`](../media/fauna-llama-rts-before-after.webp) (default RTS view). The model
is an abstraction of the existing llama species, not a new spawn rule; a bespoke llama/vicuña mesh remains future
work.

## Colour

- **Civilization palettes** live in `src/model/defs/civs.ts`
  (`primary`/`secondary`/`accent`/`concrete`) and flow into models as **vertex
  colours** (baked by `bakeVertexAO`), not as separate materials.
- **Region colour** is a combination of the terrain shader (aridity, vegetation,
  temperature) and `atmosphere` (`skyTint`, `sunWarmth`, `fogDensity`).
- **Period colour grade** (`src/model/defs/grades.ts`) is a display-referred look
  applied after tone mapping (`PERIOD_GRADES` per `HistoricalPeriod`, blended with
  the region's temperature/aridity by `resolveColorGrade`): warm dry coast, cold
  crisp highlands, muted colonial, dramatic republican desaturation. It is part of
  the cinematic set and toggles with it.
- **Textures** are Canvas-generated (`Textures.ts`) with an optional AI-generated
  PBR overlay (`Biomes.ts`).

**Rule:** colour differentiates, but it must never be the *only* difference
between two civilizations. Two coetaneous civs must differ in **silhouette,
material and ornament** as well (guarded by
`tests/e2e/civ-visuals.spec.ts`).

## Water and atmosphere

Water (`src/rendering/Water.ts`) uses Gerstner-style waves, fresnel, sun glints,
shore/crest foam and depth-based colour, and — with the cinematic set on and
quality above `low` — screen-space **refraction** of the seabed (an extra scene
pass into a render target). Region `atmosphere` supplies the water's aerial
perspective. Time of day is per mission (`MissionDef.timeOfDay`) and may be
overridden per scenario (`MissionDef.atmosphere`). On software renderers the game
starts in a safe profile (cinematic effects off, low quality, no refraction);
`?cine=1` disables that fallback for reference captures.

## Interface

The HUD stays dark and gold, with **Andean ornaments** drawn as inline SVG (chakana
divider, stepped-fret top-bar band; no image assets). Campaign briefings and
dialogue show **procedurally drawn commander medallions** in the civilization
palette (bust silhouette + emblem + initials). They are explicitly stylized:
pre-Hispanic figures have no attested likeness, so the data marks them as
`abstraction` and the UI never presents them as portraits from life.

## Rigged models

Units can opt into a local rigged glTF/GLB (`src/model/defs/modelAssets.ts` → `src/rendering/RigInstance.ts`)
while the procedural model remains the fallback. The pipeline is intentionally **presentation-only**: the
simulation owns position/navigation and root motion is ignored. The first asset (`ual_mannequin.glb`) is a
CC0 pipeline fixture, now used as the base for the **Caral worker pilot**: a project-authored simple cotton mantle,
loincloth, headband, hair, digging stick and carry bundle are attached to its bones. `docs/historia/atuendos.md`
documents cotton textiles for Caral-Supe but marks specific garments as **not documented**, so the pilot is an
**abstraction/plausible** treatment, not a reconstruction; there is no metal, footwear, horse or firearm. The
base mesh is still a generic mannequin, so the pilot validates silhouette, attire and state-driven animation
before a bespoke historical mesh replaces it. Historical models must follow the period dossiers and their
source/licence must be recorded in [`PROVENANCE.md`](../../PROVENANCE.md) before they are used in a campaign.
See [`docs/development.md`](../development.md) for the clip convention and the migration steps.
Comparable evidence (same mission `m1_caral`, seed 3000, 1600x900):
[`caral-worker-before-after.webp`](../media/caral-worker-before-after.webp) (procedural worker → dressed rig,
fixed front close-up) and [`caral-rts-before-after.webp`](../media/caral-rts-before-after.webp) (default RTS
view). The left half is the procedural fallback; the right half is the pilot.

## Caral visual pilot

Issue #110 makes the Caral mission (`m1_caral`, Arcaico Tardío, `CivId.CARAL`) read as one
coherent RTS scene. The work is **visual only**: it adds no entities, obstacles, evaluations or
didactic pauses, and the simulation/plan is untouched. Two layers changed:

- **Caral-specific.** `buildCaralLandmark` was rebuilt as a broad stepped platform (plastered
  faces, stone base bands, a central stair and a summit temple with a thatch gable and a low
  parapet) beside a **sunken circular plaza** with a stone ring, a central altar and upright
  stones. `SettlementDressing` (`src/model/defs/settlementDressing.ts`,
  `src/rendering/SettlementDressing.ts`) dresses the starting base with a deterministic set of
  household props: stone hearths, fish drying racks, baskets/shicras, gourds, cotton bundles,
  benches and reed windbreaks. The landmark spawn now requires a broad, gentle footprint so the
  complex no longer clips through cliffs (`Game.spawnLandmark`).
- **Shared builders (affect every region).** The Andean thatch gable was fixed (it used to render
  as a crossed X) and given a deeper eave and a ridge bundle; adobe walls gained a stone base
  band, a plaster cornice, a framed door, a step and a small storage annex; settlement fields now
  carry green young-crop rows (`SettlementOverlay.cropGeometry`) and the cultural landscape
  drapes flat plazas/fields over the relief instead of floating. Trees are smaller and use a
  drier olive canopy; mine rocks use the fieldstone material instead of a coal-dark one.

Historical grounding: the stepped platforms, sunken circular plazas, upright stones, thatch,
cotton, gourds and fishing come from [`docs/historia/civilizaciones/caral.md`](../historia/civilizaciones/caral.md)
and [`docs/historia/arquitectura.md`](../historia/arquitectura.md). Caral has **no pottery**, so
the set uses gourds/baskets instead; the exact prop arrangement and the plaza's altar are an
**abstraction**, not a reconstruction.

Comparable evidence (same mission `m1_caral`, seed 3000, 1600x900, UI hidden):
[`caral-scene-before-after.webp`](../media/caral-scene-before-after.webp) (close base),
[`caral-scene-rts-before-after.webp`](../media/caral-scene-rts-before-after.webp) (RTS base) and
[`caral-landmark-before-after.webp`](../media/caral-landmark-before-after.webp) (landmark close).
Each left half is before, the right half after. The dressing merges into one mesh per base and
the crop rows into one more, so the pilot adds two draw calls per settlement; the landmark stays a
single cached model. Remaining work before applying the style to other campaigns: bespoke historical
meshes (the worker/fauna rigs are still generic CC0 bases), denser regional vegetation, and a shared
palette pass over the other eight dossiers.

## Non-goals

- No sci-fi, firearms, horses, vehicles or engines before 1532
  ([`AGENTS.md`](../../AGENTS.md)).
- No invented structures, names or urban layouts: where the record is silent, the
  asset is documented as `plausible` or `abstraction`
  (`src/model/defs/landmarks.ts`).
- No new asset farms: prefer procedural variation and shared components over
  one-off models. Rigged glTF assets are shared/cached and adopted only when
  they visibly beat the procedural look; the first one is the Caral worker
  pilot, still using a generic CC0 base mesh.

## See also

- [`cultural-landscape.md`](./cultural-landscape.md) — design proposal for a
  cultural-landscape layer (roads, canals, fields, plazas).
- [`settlement-generator.md`](./settlement-generator.md) — design proposal for a
  terrain-aware settlement layout generator.
- [`prp-status.md`](./prp-status.md) — the PRP Definition of Done checklist and the
  building audit.
