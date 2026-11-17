# Art direction: stylized realism

**Status:** Living · **Reference scene:** `m_tambotoco` (Los hijos de Tambotoco)

This guide sets the visual target and the rules. [`visual-language.md`](./visual-language.md) is the
implementation map (which code owns terrain, materials, vegetation and colour).
[`tambotoco-art-pilot.md`](./tambotoco-art-pilot.md) is the pilot's audit, scene spec, asset inventory and
backlog. Historical facts and their certainty live in the dossiers under [`../historia/`](../historia/).

Tambotoco replaces Caral as the reference scene. Caral remains the **precedent**: it proved the kit,
provenance and performance pipeline, and its measured lessons are kept in §11. The change does not discard
Caral's art; it promotes the mission that has to carry the next campaigns.

## 1. Decision

The game uses **stylized realism**: believable materials and light, simplified and art-directed so the scene
reads clearly from the RTS camera. The position is the one Relic described for Age of Empires IV, where
readability at both far and near camera distances was the first visual priority
([Windows Central](https://www.windowscentral.com/age-empires-4-success-graphics),
[GamePressure](https://www.gamepressure.com/newsroom/age-of-empires-4-takes-flak-for-visuals-devs-respond/z13167)).

What it means here:

- **Real materials, simplified.** PBR (albedo, roughness, normal) with low-frequency colour variation,
  painted macro shading and a shared roughness language. No photographic noise at small scale.
- **Proportions tuned for the camera.** Heights and silhouettes are exaggerated relative to footprints so
  buildings, trees and people read at the default zoom.
- **One material language.** Terrain, vegetation, buildings, people and fauna share texel density, roughness
  range and lighting response.
- **Identity by shape first.** A civilization is recognisable by its architecture and silhouette before its
  colour. Colour supports identity; it does not replace it.
- **Detail is layered.** The first read is silhouette, the second is material, the third is props. An asset
  that only works at close range fails the RTS test.

What it is not:

- not **photoreal** (scans everywhere, micro-detail, film grain);
- not **flat low-poly** (untextured vertex colours, perfect CAD edges);
- not **hand-painted** (brush strokes, painted light baked into albedo);
- not **imperial Inca as a default**. Killke and the valley ayllus use a domestic fieldstone, earth and thatch
  language; cut-stone, niches, double-jamb doors and the ushnu are imperial and do not belong in this pilot.

## 2. Reference principles

The three references are studied for design principles, never for assets, proportions or UI.

| Reference                | Take                                                                                                  | Do not take                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Age of Empires IV        | Material honesty, directional light, layered detail, readability at both strategic and close cameras. | Exact proportions, assets, interface, colour grading.           |
| 0 A.D.                   | Modular architecture, civilization differentiation by silhouette, resource and settlement composition. | Historical claims beyond the source dossiers.                   |
| Age of Empires II DE     | Unit and building readability from a high camera, player-colour contrast, map composition.            | Sprite-era simplification or copied art.                        |

Comparison against commercial RTS references is done with **local** screenshots only; third-party images are
never committed to the repository.

## 3. Camera and scale

**Reference views.** Every asset and scene is judged in these captures (HUD hidden, fixed seed, 1600×900
unless a resolution sweep is being recorded):

| View    | Camera height        | Purpose                               |
| ------- | -------------------- | ------------------------------------- |
| Close   | 28 (min zoom)        | Material and detail quality           |
| Default | 54 (mission opening) | The view players live in; readability |
| Wide    | max zoom             | Landscape composition and silhouette  |

**Scale rules.** A person is **1.86 units** tall. Everything is measured in "people" (P). Compress footprints
more than heights: real monuments are too large for an RTS map, but height keeps them monumental.

| Element                | Target                                 | Basis                                              |
| ---------------------- | -------------------------------------- | -------------------------------------------------- |
| Hut wall               | 2.4–2.8 units (1.3–1.5 P)              | Killke/ayllu domestic construction; plausible      |
| Door                   | 0.9 × 1.8 units                        | Human scale                                        |
| Thatch overhang        | 0.5–0.8 units                          | Deep-eave roof that reads from above               |
| Qollqa                 | 2.2–3.0 units tall, 1.6–2.0 m diameter | Round storehouse; plausible reconstruction         |
| Plaza radius           | 6 units                                | Authored Inticancha plot                           |
| Terrace step           | 0.8–1.2 units                          | Andean andén; readable from the strategic camera   |
| Molle / pacay          | 3–4 P                                  | Highland tree silhouette                           |
| Smallest readable prop | ≥ 0.4 units                            | From `visual-language.md`                          |

No asset is accepted because it looks good at close range. It must read at 54 first.

## 4. The five pillars

### 4.1 Characters and units

- **Proportions:** 6.5–7 heads tall, not the 8+ heroic proportion of the current CC0 bodies. Head and hands
  are +10–15 % relative to a realistic body so faces and gestures survive the RTS zoom.
- **Silhouette layers:** body, garment, headdress/prop. Each Ayar sibling must be identifiable by at least
  **two** layers at the default zoom, not by accent colour alone. Ayar Manco, Ayar Cachi and Mama Huaco are
  the first acceptance cases.
- **Hero treatment:** a hero is a presentation variant of a role rig, not a new skeleton. Unique garments and
  headdresses are opt-in per mission and must not change the shared rig used by other campaigns.
- **Common units:** three variants per role (tunic colour, headwear, mantle) so a group does not read as
  clones. Variation is deterministic and presentation-only.
- **Materials:** woven cotton/wool with a visible weave and roughness break; skin is matte
  (roughness 0.55–0.70), never glossy. No metal before 1532.
- **Faces:** stylized, painted features; no portrait claim. The likeness rules in
  [`characters.md`](./characters.md) still apply.
- **Animation:** shared clips; `idle`, `walk`, `attack` and `death` are mandatory for a fielded role. Work and
  interaction use the licensed clip set. No per-hero clip and no gameplay timing baked into a GLB.
- **Budgets:** hero ≤ 40 draw calls / 40k triangles; common unit ≤ 25 draw calls / 25k triangles. These are
  ceilings, not targets to fill.

### 4.2 Architecture

The Tambotoco site uses a **domestic Killke/ayllu language**, not imperial Inca (see
[`../historia/arquitectura.md`](../historia/arquitectura.md) §1):

- fieldstone footings with mud mortar; earth or plaster walls;
- deep-eave thatch roofs with exposed ridge poles;
- round qollqas with a corbel ring and raised threshold;
- packed-earth canchas with low walls and a threshold;
- a plaza with a low kerb, four axes and a stepped altar;
- irregular plans; no CAD-perfect edges.

**Rules:**

- 3–5 readable masses per building. Detail lives in material and props, not in geometry noise.
- Edges are slightly bevelled and irregular. No polished ashlar, niches, double-jamb doors or ushnu.
- Maximum 4 materials per building; maximum 8 materials and 12 draw calls per kit.
- LOD0 ≤ 5k triangles and LOD1 ≤ 1.5k per piece; the far LOD switches before the asset drops below ~40 px.
- Every piece is terrain-conformed and samples the ground it spans. Nothing floats.

**Procedural or Blender?** Use the cheapest tool that passes the quality gate:

| Element                                             | Authoring                         | Why                                                       |
| --------------------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| Cave mouth, rock ring, Huanacaure monolith          | Blender GLB                       | Hero silhouettes; the procedural versions read as blobs   |
| Inticancha hero house, altar, plaza furniture       | Blender GLB or hybrid modules      | Unique forms that carry the foundation moment             |
| Ayar headdresses, props, garments                   | Blender GLB + runtime accessories | Identity at close range; shared skeleton                  |
| Highland trees, shrubs, reeds                       | Blender GLB kit                   | Organic silhouettes and wind; two LODs                    |
| Repeated huts, qollqas, canchas, terraces, fields   | Procedural                        | Variation, terrain-conformity and per-material merging    |
| Paths, ground cover, wear, decals                   | Terrain paint / procedural        | Cheap, continuous and easy to revise                      |
| Stone outcrops and quarry props                     | Blender GLB kit                   | Readable material break; instanced                        |

**Hybrid is the preferred production path** for a kit: author modules in Blender, assemble and conform them in
the engine. Do not rebuild the whole site as one GLB.

### 4.3 Landscape

- **Layers (6–8):** puna grass, dry earth, rock, terrace soil, wet silt, gravel, beaten path and crop soil.
  Blend by height, slope, moisture and authored masks.
- **Transitions:** 2–6 units wide, soft and geographic. Sea → beach → wetland is Caral's transect; Tambotoco's
  is cave ridge → dry slope → valley grass → stream → terraced fields → Inticancha.
- **Macro variation:** one detail scale (1–2 m) plus one macro scale (32–64 m). The macro layer is what breaks
  tiling at the default zoom; the current kit only has micro detail.
- **Vegetation:** grow in groups that read as groves, hedgerows and riparian bands, never an even scatter.
  Every tree is instanced with wind and at least two LODs. Species need a source or a plausible label; do not
  invent a species for a mission.
- **Rocks:** only where slope or the dossier justifies them; cluster them and keep fields and plazas clear.
- **Water:** cold Humboldt/Andean palette, depth gradient, soft banks, foam only at fords and drops. No flat
  turquoise ribbon.
- **Paths:** embedded stone and compacted earth with soft edges. A path is not a ladder of floating blocks.
- **Fauna:** llamas, birds and other source-backed animals; at least one group visible in each zone at default
  zoom. No invented species.
- **Composition:** every zone has a purpose: approach, camp, shrine, valley, foundation. A map is not a
  uniform surface with objects scattered on it.

### 4.4 Light and materials

- **Default: morning.** Low warm sun from the east/north-east (30–35° elevation), long soft shadows that model
  the roof eaves and the walls, with directional shading that models the relief.
- **Sun and ambient:** directional sun + hemisphere; hemisphere intensity 0.35–0.5; exposure 1.0–1.1. Avoid
  the flat "ambient fill" look where every face has the same value. A mission may set an explicit
  `timeOfDayValue` (0 night .. 1 day) when the named preset is not the right sun height; it is the initial
  default and the player's time-of-day option still overrides it.
- **Shadows:** PCF; 2048 high, 1024 medium/low; radius ~2; the frustum follows the view. Limit shadow casters
  to the silhouette. The terrain **receives** directional shadows: the custom `ShaderMaterial` declares
  `lights: true` and samples `directionalShadowMap[0]` with the same PCF settings (B11, E1). The late
  Inticancha phases exclude the plaster/earth/rock/wood families from the shadow pass (floors, paving, wall
  plaster and loose rock); roofs and stone keep casting, and the cave/shrine phases keep their rock and earth
  shadows.
- **AO:** bake vertex AO into kit geometry (0.65–1.0 in bases and corners) and use slope/valley shading on the
  terrain. Do not add SSAO: it was removed because its cost was high and its effect invisible with the camera
  range.
- **Post-processing:** keep the existing chain (bloom, vignette, chromatic aberration, colour grade, FXAA).
  No new expensive pass without a measured frame-time justification. The grade protects stone and plaster
  contrast; it does not flatten it.
- **Texture scales:** detail 1–2 m, macro 32–64 m; break tiling with a second, larger sample.
- **Texel density:** buildings and units ~128 px per unit; props 64–128 px per unit; terrain via macro +
  detail. Textures in WebP/KTX2 within the `dist` budget.

Surface language for the Tambotoco kit:

| Surface  | Roughness | Normal | Notes                                                         |
| -------- | --------- | ------ | ------------------------------------------------------------- |
| Stone    | 0.88–0.96 | 0.3–0.5 | Coursed fieldstone; warm grey, never cold uniform grey        |
| Rock     | 0.92–0.98 | 0.4–0.6 | Outcrops and cliff faces; larger scale than wall stone        |
| Earth    | 0.92–0.98 | 0.2–0.4 | Packed plaza and cancha; macro mottling, no flat fill         |
| Plaster  | 0.85–0.92 | 0.2–0.3 | Mud/plaster walls; darker at the base, lighter at the top     |
| Thatch   | 0.80–0.90 | 0.4–0.6 | Straw, not mustard; weathered tips and a darker eave shadow   |
| Wood     | 0.70–0.85 | 0.3–0.4 | Ridge poles, lintels, ramada posts                            |
| Cloth    | 0.85–0.95 | weave  | Cotton/wool; visible weave, no plastic specular               |
| Skin     | 0.55–0.70 | none   | Matte; shared palette from `people.ts`                        |
| Crops    | 0.95–1.00 | 0.1–0.2 | Muted green with visible soil; no neon rows                   |
| Water    | 0.05–0.15 | waves  | Cold depth gradient; foam only at fords                       |

### 4.5 Presentation

- **Shot grammar:** three narrated beats (the cave, Huanacaure, the valley), each with 2–3 shots:
  establishing wide, material detail, hero medium. The strategic camera remains the primary gameplay view.
- **Inticancha:** the foundation is the visual reward of the mission. It uses a phase change, a camera beat,
  fire/smoke, people and the traced plaza becoming a settlement. It must not look like the same disc with
  more props.
- **Implementation:** the existing `CinematicPlayer` and mission beats. No new cinematic engine and no
  gameplay camera takeover beyond the authored beats.
- **Evidence:** cinematic frames are captured at 1600×900 and 1920×1080, with the same seed as the gameplay
  captures.

## 5. Palette

Environment colours are **desaturated and mid-value**; saturation is reserved for interactables, player
colour and ritual accents. Keep albedo luminance between ~0.2 and 0.8: no pure black, no pure white.

**Cusco valley v1** (art decision, to be validated in-engine; not a measured colour):

| Band                    | Reads as                          | Swatch                 |
| ----------------------- | --------------------------------- | ---------------------- |
| Puna grass, valley      | Olive, desaturated                | `#6e7448` / `#8a8258`  |
| Loma / dry slope        | Warm grey-green                   | `#9c9166`              |
| Dry earth / plaza       | Warm ochre-brown                  | `#a08a6a`              |
| Packed earth, shadow    | Darker brown                      | `#7a6650`              |
| Field soil              | Dry / wet                         | `#6b5642` / `#5c4a38`  |
| Fieldstone              | Warm grey                         | `#8a8174` / `#6e675d`  |
| Rock / outcrop          | Warm grey-brown                   | `#8a7c6b`              |
| Earth wall / packed floor | Dry earth / packed              | `#8a7358` / `#a08a6a`  |
| Mortar / plaster        | Pale earth                        | `#9a8c76` / `#b49a78`  |
| Thatch                  | Straw, weathered                  | `#b49b6a` / `#8c774d`  |
| Crops                   | Muted green / wet                 | `#6f7c3f` / `#5f7a3c`  |
| Terrain bands           | Valley / slope / loma             | `#6b7444` / `#8f8660` / `#a09368` |
| Wood                    | Dark warm brown                   | `#6a5238`              |
| Water                   | Deep / shallow                    | `#2c4748` / `#4e6b65`  |
| Sky / haze              | Cool grey-blue morning            | `#c6d0d2` / `#b7c1be`  |
| Sun                     | Warm morning                      | `#ffe9c9`              |
| Ritual / interaction    | Fire orange; hero gold            | `#d97a2e` / `#c9a24a`  |

Rules:

- Use the player colour on banners and unit accents, not on the environment. A red player must not repaint the
  valley.
- Ritual accents are rare: one fire, one gold ring, one Spondylus note. If everything glows, nothing does.
- The palette is period- and region-scoped. Caral's coastal palette is not reused for the highlands, and the
  highland palette is not reused for the coast.

## 6. Asset quality gate

An asset or scene is accepted only when:

1. it is captured in the three reference views (§3), with the same seed and resolution, before and after;
2. it passes the checklist below;
3. its historical elements cite the dossier and carry a certainty label (documented / plausible / stylized);
4. its source, licence and hash are recorded in [`../../PROVENANCE.md`](../../PROVENANCE.md);
5. it is seen inside the mission, not only in a Blender or GIMP viewport.

Checklist:

- [ ] Reads at default zoom: silhouette clear, function recognizable.
- [ ] Same material language as its neighbours (no photo-vs-flat clash).
- [ ] Palette within §5; saturation only where interaction or ritual needs it.
- [ ] Terrain transitions soft and geographic; no visible tiling at 54.
- [ ] Ground receives directional shadows; no floating props.
- [ ] No anachronism and no species, structure or person without a source.
- [ ] Within the performance budgets (§7) and `yarn bench:check`.
- [ ] Provenance recorded and the RTS capture attached to the PR.

**Severity:**

- **Blocker:** wrong history, unlicensed asset, unreadable silhouette at 54, floating geometry, a missing
  source.
- **Major:** material clash, tiling, wrong palette band, over-budget draw calls, flat lighting.
- **Minor:** micro-detail, texture noise, a prop that only shows at close range. Fix after the majors.

## 7. Performance and budgets

Targets for the default view at 1600×900:

| Tier                                 | Target                  |
| ------------------------------------ | ----------------------- |
| Mid-range discrete GPU, high quality | 60 FPS                  |
| Integrated GPU, low/medium quality   | ≥ 30 FPS                |
| Draw calls per frame (general)       | ≤ 200                   |
| Triangles per frame                  | ≤ 600k                  |

**Mission caps are ratified, not raised to hide a regression.** The current Tambotoco caps in
`scripts/bench_scene.mjs` are **500k triangles / 280 draw calls** at the opening and **660k / 360** in the
late founded settlement. The pilot must stay inside them. Prefer a neutral pass; a measured increase is
acceptable only when it buys a visible improvement and the frame-time target still holds. E4b: opening
**424,904 / 273** (vegetation kit 9,352/9) and late **632,910 / 356** structural (kit 34,306/12);
**36 / 31 FPS** at high quality on the integrated GPU; both the structural and frames scene counts stay
under the caps. The complete render adds the shadow and refraction passes. Do not raise a cap to hide a
regression.

Asset budgets:

| Asset                        | LOD0           | LOD1           | Materials / draws      |
| ---------------------------- | -------------- | -------------- | ---------------------- |
| Building piece               | ≤ 5k triangles | ≤ 1.5k         | ≤ 4 materials          |
| Architecture kit             | ≤ 25k total    | ≤ 8k total     | ≤ 8 materials, 12 draws |
| Hero character               | ≤ 40k          | —              | ≤ 40 draws             |
| Common unit                  | ≤ 25k          | —              | ≤ 25 draws             |
| Tree / shrub                 | ≤ 1.5k         | ≤ 400          | 2 materials            |
| Small prop                   | ≤ 300          | —              | 1 material             |
| Terrain texture pack         | —              | —              | WebP/KTX2, `dist` gate |

Implementation rules:

- Repeated assets are instanced or merged; no per-object draw call for vegetation, props or fauna.
- Every model has LOD0/LOD1; the far LOD switches before the asset drops below ~40 px.
- Shadow casters are limited to the silhouette; tiny eyes, crops, people and flat paving do not cast.
- `yarn bench:check` keeps the structural budgets; `bench_scene.mjs --mission=m_tambotoco --assert` is the
  scene gate. New categories are added when a kit lands.
- The structural bench runs on SwiftShader, which disables ground cover; `--gpu --frames` is the runtime
  check that includes ground cover, post-processing and refraction. Read both before claiming a cap is met.
- `yarn dist:check` keeps `dist/` under 25 MB and the entry chunk under 600 KB gzip. New assets need a size
  ledger with offsets, not just an addition.

## 8. Pipeline

```text
reference / concept
        ↓
Blender (3D) or GIMP (2D)
        ↓
export (GLB or PNG)            .blend / .xcf stay in Git LFS
        ↓
place the game copy            src/assets/... for 3D, art-src for render sources
        ↓
ingest command                 yarn art:models / art:textures / art:blender
        ↓
manifest and/or PROVENANCE
        ↓
human review                   yarn art:review (renders only)
        ↓
game integration               StaticModel / modelAssets / architectureKit / vegetationKit
        ↓
RTS capture + bench            yarn art:pilot / bench_scene --assert
```

- **Blender is a local authoring tool, not a CI dependency.** CI must pass without Blender or GIMP.
- **Procedural first, Blender for hero assets and modules that fail the QA gate.** The engine keeps the
  fallback; a missing GLB never breaks a mission.
- **GIMP** is for texture retouching and 2D UI art; `.xcf` sources stay in LFS and the exported PNG hash is
  updated when a render is retouched.
- The full commands and failure modes are in [`asset-pipeline.md`](./asset-pipeline.md); the Blender render
  gate is in [`blender-art.md`](./blender-art.md).

## 9. Cultural identity and certainty

Every visual decision about a culture carries one of three labels:

- **Documented:** there is a source for the form or material (Killke occupation, valley agriculture, canal
  irrigation).
- **Plausible:** a reconstruction from related Andean domestic practice (fieldstone/mud walls, thatch,
  irregular plans, round qollqas).
- **Stylized:** a presentation abstraction with no documented form (the cave arch, the Huanacaure monolith
  shape, the Ayar clothing and headdresses, the exact hut proportions).

These visual labels map to the provenance contract in [`asset-pipeline.md`](./asset-pipeline.md) and the
manifest `confidence` values: **documented → documented**, **plausible → inferred**, **stylized → assumed**.
The manifest stays the machine-readable source of truth; a table or dossier may use either vocabulary, but
the mapping must be explicit.

Rules:

- Do not use imperial Inca architecture, clothing or technology for a pre-imperial society.
- Do not invent names, dates, battles or species. A game abstraction is labelled as such.
- The myth is a myth: Tambotoco is a **Leyenda**, not a dated event. The epilogue keeps the disagreement
  between Sarmiento and Garcilaso.
- A render or portrait is never presented as a historical photograph.

The Tambotoco certainty table is in [`tambotoco-model-mission.md`](./tambotoco-model-mission.md) §"Site
certainty"; the historical basis is [`../historia/campanas/tambotoco.md`](../historia/campanas/tambotoco.md).

## 10. Rollout

1. **E0 · Document and baseline.** This guide, [`tambotoco-art-pilot.md`](./tambotoco-art-pilot.md), the
   capture script and the before set. No gameplay change.
2. **E1 · Light, shadow, palette and plaza.** B11 (terrain receives shadows), the low morning sun,
   `cusco_valley` palette, water and the single-rim plaza. Macro variation, vertex AO and ground cover
   continue in E2–E3.
3. **E2 · Architecture.** Stone, plaster, thatch, eaves, qollqa, cancha and plaza; decide the hero GLB pieces.
4. **E3 · Landscape.** Highland vegetation kit, clustering, rocks, water and paths.
5. **E4 · Characters.** Tambotoco hero GLB and a common-unit variant; proportions, textiles and headdresses.
6. **E5 · Presentation.** The three beats and the Inticancha foundation.
7. **E6 · Validation and approval.** 3 cameras × 3 resolutions, bench, provenance, docs and human review.
8. **E7 · Production.** Only after E6 is approved: the cave, camp, Huanacaure, hamlets, acequia, fields,
   Inticancha and the eight Ayar.

**Standardization.** After the pilot, future campaigns share the quality bar, the pipeline, the palette
method and the performance gate — not the same look. Each campaign defines its own regional palette,
architecture kit, vegetation kit and cast variants.

## 11. Caral precedent

Caral proved the production path and the performance limits; it remains the reference for the coastal
Preceramic language.

- The Caral architecture kit, vegetation kit, prop kit and fauna kit are the template for Tambotoco's Blender
  pipeline.
- The shadow map, not the geometry, was the largest frame cost. The current policy (view-fitted frustum,
  2048/1024, PCF, casters only) came from that measurement. SSAO was removed after it proved invisible at the
  camera range.
- Merging by material, instancing and LOD cut the opening from ~414 to ~203 draw calls and ~685k to ~497k
  triangles in the Caral pass. The same discipline applies here.
- The Caral measured details and implementation status stay in
  [`visual-language.md`](./visual-language.md) §"Caral visual pilot" and
  [`caral-model-mission.md`](./caral-model-mission.md).

## 12. See also

[`tambotoco-art-pilot.md`](./tambotoco-art-pilot.md) · [`visual-language.md`](./visual-language.md) ·
[`asset-pipeline.md`](./asset-pipeline.md) · [`characters.md`](./characters.md) ·
[`tambotoco-model-mission.md`](./tambotoco-model-mission.md) ·
[`campaign-quality-bar.md`](./campaign-quality-bar.md) · [`../historia/arquitectura.md`](../historia/arquitectura.md) ·
[`../historia/atuendos.md`](../historia/atuendos.md) · [`../../PROVENANCE.md`](../../PROVENANCE.md)
