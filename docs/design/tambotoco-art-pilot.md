# Tambotoco art-direction pilot

**Status:** Living · **Mission:** `m_tambotoco` (Los hijos de Tambotoco) · **Started:** 2026-11-16

**Progress:** E0 (docs and baseline), E1 (terrain shadows, palette and plaza), E2a (procedural architecture
finish), E2b (cave and huaca GLBs), E3a (highland vegetation) and E3b (soft banks, ford and paths) are
implemented through E4 (Killke/ayllu variants and the male-only hero GLB). E5–E6 are pending; E7 waits for a
human approval of the reference captures.

This is the pilot that makes Tambotoco the visual reference for the next campaigns. It implements the rules in
[`art-direction.md`](./art-direction.md): audit, reference scene, asset inventory, performance ledger,
backlog and staged production. It does **not** rebuild the mission, the engine or the other campaigns.

The historical basis and the certainty table are in
[`../historia/campanas/tambotoco.md`](../historia/campanas/tambotoco.md); the gameplay design is in
[`tambotoco-model-mission.md`](./tambotoco-model-mission.md). This document does not restate them.

## 1. Why Tambotoco

Tambotoco is the opening of **El Tahuantinsuyo** and the first **Leyenda** mission. It contains the four visual
states the next campaigns need:

1. **Cueva de Tambotoco** — a rocky ridge, a cave mouth and the party leaving.
2. **Campamento** — the first communal store, fires and smoke above the cave flat.
3. **Valle del Cusco** — Huanacaure, the stream, the hualla/sauaseray/alcabizas hamlets, the acequia and the
   terraced fields.
4. **Inticancha** — the traced plaza becoming a founded settlement with four canchas.

It also has a domestic Andean language (Killke/ayllu: fieldstone, mud, thatch, qollqas) that must look
different from imperial Inca. If the pilot works here, the same method transfers to the coast, the sierra and
the later periods.

## 2. Audit (2026-11-16)

Baseline: `a0352d5`, seed 777, 1600×900, `sitePhase=fundada`, acequia open, HUD hidden. Captures:
[`tambotoco-quality-cave.webp`](../media/tambotoco-quality-cave.webp),
[`tambotoco-quality-shrine.webp`](../media/tambotoco-quality-shrine.webp),
[`tambotoco-quality-hualla.webp`](../media/tambotoco-quality-hualla.webp),
[`tambotoco-quality-inticancha.webp`](../media/tambotoco-quality-inticancha.webp),
[`tambotoco-quality-built.webp`](../media/tambotoco-quality-built.webp),
[`tambotoco-quality-close.webp`](../media/tambotoco-quality-close.webp) and
[`tambotoco-heroes-close.webp`](../media/tambotoco-heroes-close.webp). The local pilot baseline is
`review/art-pilot-before-neutral-1600x900-*.png` (gitignored).

| Area | What the captures show | Gap | Action |
| --- | --- | --- | --- |
| **Characters** | Small heads, large hands, boxy torsos, flat cloth, a glossy white mantle, geometric crests on poles, no facial identity. | The shared CC0 bodies read as mannequins (8+ heads); identity is carried almost only by accent colour. `characters.md` still lists unique Ayar outfits as pending. | Hero GLB variant for Tambotoco + a common-unit variant; 6.5–7 heads; woven cloth; headdress/hair silhouette. |
| **Architecture** | Uniform grey stone, mustard roofs, concrete-like retaining walls, a cream plaza disc with radial slats, canchas as grey pads. | Little macro variation, no vertex AO, no eave shadow; some masses still read as boxes. No Tambotoco architecture GLB. | Material/geometry pass on `aylluKit`; hero GLBs for the cave, monolith and plaza furniture; modular kit for the rest. |
| **Landscape** | Flat olive ground with visible tiling, teal water ribbon, identical low-poly trees, neon crop rows, scattered rocks. | No terrain layers, no vegetation groups, no atmospheric depth. The Caral vegetation kit is coastal and does not cover the highlands. | `cusco_valley` palette and layers; highland vegetation kit; clustered placement; water/path pass. |
| **Light and materials** | Ambient-heavy, weak contact shadows, no ground shadows, flat stone and plaster. | The custom terrain `ShaderMaterial` declared `lights: false`, so the ground never received directional shadows (B11). Materials have micro-detail but no macro scale and little roughness break. | **B11 fixed in E1** (terrain samples the shadow map, low morning sun); vertex AO and macro maps still open. |
| **Presentation** | The opening and act cards are in-engine but framed as aerial views; Inticancha reads as the same disc with more props. | No shot grammar; the foundation lacks a reward moment. | Re-frame the three beats; wide/detail/hero shots; foundation phase + camera + life. |
| **Performance** | Pre-E1 baseline: 436,880/265 and 608,324/347. Caps: 500k/280 and 660k/360. E3a–E4b structural: **425,052 / 268** and **633,330 / 356** (kit 9,352/9 and 34,306/12). High-quality frames scene: 450,654/269 (39 FPS) and 659,158/359 (33 FPS); both are under the caps too. The complete render adds the shadow and refraction passes. `dist` is 24.54 / 25 MB. | Draw calls exceed the general ≤200 target. High quality runs at 33 FPS late on the iGPU, so the governor steps down below its 45 FPS window; low/medium stay above 30. `dist` has 0.46 MB of headroom. | The andes kit adds 9.4k/34.3k kit triangles; both structural and frames scene counts stay under the unchanged caps. E5 must keep the governor, LOD radius and kit caps honest. Do not raise scene caps. |
| **Documentation** | `art-direction.md` was Caral-first; `campaign-quality-bar.md` and `tambotoco-model-mission.md` gave different performance numbers; “Visuals: Met” certified presence, not quality. | No Tambotoco standard and no measurable visual gate. | This pilot, the rewritten art direction and the reconciled quality bar. |

The 2026-11-16 kit pass was a real improvement: coursed stone, thatch houses, qollqas, terraced fields and a
paved plaza replaced the earlier mud boxes. The remaining gap is **finish, light and silhouette**, not the
absence of a kit.

## 3. Reference scene

**Primary: the hualla hamlet and the acequia.** It contains the minimum set the brief asks for: a dwelling, a
storehouse, a qollqa, a field, the canal, the stream, people, llamas and vegetation.

| Element | Coordinates (game units) | Capture view |
| --- | --- | --- |
| Hamlet centre | `TAMBOTOCO_VILLAGES[0]`: x 138, z 162 | `hualla` (136, 166, h 24) |
| Huts | 134,160 · 142,163 · 138,167 (storehouse) · 132,166 (shed) | `close` (138, 163, h 13) |
| Field | 131, 175 (10 × 7, 5 rows) | `hualla` |
| Acequia / bridge | 166, 178 · bridge 186, 177 | `acequia` (166, 178, h 30) |
| Hero staging | flat ground near 138, 157 | `hero` (low camera, Manco + worker) |

**Secondary: Inticancha `fundada`** (168, 190). It is the reward moment and the test for the plaza, canchas
and ring houses, but it is not the first fix: its geometry depends on the architecture pass.

The pilot does not move the mission layout, objectives or economy. All coordinates come from
`src/model/defs/tambotocoLayout.ts`.

## 4. Art targets for the pilot

### Palette and materials

- Use the `cusco_valley` palette in [`art-direction.md`](./art-direction.md) §5. The pilot validates it
  in-engine; values may be tuned, but the hue family and the 0.2–0.8 albedo rule stay.
- Replace the mustard thatch with straw (`#b49b6a` / `#8c774d`) and a darker eave shadow.
- Make fieldstone warm grey, not cold uniform grey; add a darker base course and a lighter upper wall.
- Water: deep `#2c4748`, shallow `#4e6b65`, foam only at the ford; no turquoise.
- Crops: muted green with visible soil; no neon rows.
- Macro variation at 32–64 m; vertex AO; roughness per the surface table.

### Characters

- **Acceptance pair:** Ayar Manco + one worker at the hualla hamlet, plus the common unit variant.
- Manco must be identifiable by **two** silhouette layers at 54 (headdress/hair + mantle/weapon), not only
  by the gold ring.
- Proportions 6.5–7 heads; head and hands +10–15 %.
- Hero budget ≤ 40 draws / 40k triangles; common ≤ 25 / 25k.
- The shared rig for other campaigns is not modified; the Tambotoco hero is an opt-in variant.

### Architecture

- Huts: fieldstone footing, mud/plaster wall, deep-eave thatch, exposed ridge poles, lintelled door and vent.
- Qollqa: round, corbelled ring, raised threshold; no imperial ashlar.
- Cancha: packed-earth enclosure with low walls and a threshold; not a grey pad.
- Plaza: low kerb, four axes, stepped altar; the radial slats are removed or reinterpreted as paving.
- Cave: rock ring and arch with a scree apron; the pale faceted mass above the mouth is removed.
- Huanacaure: a shorter tapered huaca with a carved niche, not a grey box.
- No cut-stone, niches, double-jamb doors or ushnu.

### Landscape

- Puna grass, dry earth, rock, terrace soil, wet silt, gravel, path and crop soil as distinct layers.
- Trees in groups (hamlet edge, riverbank, slope), not a uniform scatter; add highland species (molle, pacay,
  ichu/puna grass, reeds) with a source or a plausible label.
- Rocks clustered on slopes; none in fields or plazas.
- Stream with soft banks and a ford; acequia with a wet-crop response.
- Paths with embedded stone and soft edges.

### Light and presentation

- Morning sun from the NE at 30–35°, warm; terrain receives shadows (B11, E1); vertex AO; light haze.
- Three beats: cave (wide + detail), Huanacaure (medium + hero), valley (wide + settlement).
- Inticancha foundation: phase change + camera + fire/smoke + people; the plaza becomes a settlement, not a
  bigger disc.

## 5. Capture protocol

The script is `scripts/capture_art_pilot.mjs` (`yarn art:pilot`). It hides the HUD, uses seed 777, sets the
site to `fundada` and opens the acequia.

```bash
# Materials and silhouettes: low preset (no post-processing, 1024 shadows, pixel ratio 1), fog off
yarn art:pilot --tag=before --quality=neutral --sizes=1280x720,1600x900,1920x1080

# Player-facing look: the player's quality preset and post-processing, fog off
yarn art:pilot --tag=after --quality=final --sizes=1280x720,1600x900,1920x1080
```

Fog of war is off in both modes: the comparison is about materials, light and composition, not
exploration. The mission evidence captures (`shots_evidence.mjs`) cover the fog states.

- **Before** is captured from the base commit (`a0352d5` or the current `main` at the start of the branch) in
  a clean worktree.
- **After** is captured on the branch with the same views, seed and resolution.
- `neutral` is a stable material comparison, not the shipped quality; `final` is the look gate.
- Views: `cave`, `shrine`, `hualla`, `acequia`, `inticancha`, `built`, `close`, `wide`, `hero`. `built` runs
  after the clean scene views so its spawned base does not contaminate them; `hero` runs last and stops the loop.
- Output: `review/art-pilot-<tag>-<quality>-<size>-<view>.png` and a JSON summary. `review/` is gitignored; a
  path alone is not evidence. Attach the PNGs to the PR.
- Publish 960×540 WebP copies under `docs/media/` only after the human review, and record them in
  [`../../PROVENANCE.md`](../../PROVENANCE.md).

## 6. Acceptance criteria

The pilot is approved only when all of these are true:

- [ ] The hualla scene reads at 54: hut, qollqa, field, canal and people are recognizable without the HUD.
- [ ] Manco is identifiable at 54 by at least two silhouette layers; the worker is not a clone.
- [ ] Stone, plaster, thatch, earth, wood, cloth and water share one material language; no photo-vs-flat clash.
- [ ] The palette is within `art-direction.md` §5; no mustard roofs, neon crops or turquoise water.
- [ ] No visible tiling at 54; terrain transitions are soft and geographic.
- [ ] The ground receives directional shadows; no floating props or stones.
- [ ] Inticancha `fundada` reads as a settlement, not a disc with props.
- [ ] No imperial Inca element and no invented species, name or date; certainty labels are updated.
- [ ] `bench_scene.mjs --mission=m_tambotoco --assert` is within the 500k/280 and 660k/360 caps.
- [ ] Integrated GPU ≥ 30 FPS at low/medium; high quality is measured and recorded.
- [ ] `yarn dist:check` ≤ 25 MB and the entry chunk ≤ 600 KB gzip.
- [ ] `yarn verify:fast`, `yarn art:validate` and the relevant tests pass.
- [ ] The 3 × 3 before/after set is attached; the docs and provenance are current.
- [ ] A human has approved the reference captures.

## 7. Asset inventory

| Asset | Authoring | Status | Budget | Action |
| --- | --- | --- | --- | --- |
| Huts, qollqas, canchas, terraces, fields, plaza | Procedural `aylluKit` | Implemented | Existing scene caps | Material/geometry pass; keep the procedural fallback |
| Cave mouth and rock ring | Blender GLB (E2b) | Implemented, procedural fallback | LOD0 1,802 / LOD1 342 | `tambotocoHeroKit` + `AylluSite`; source in `art-src` |
| Huanacaure monolith | Blender GLB (E2b) | Implemented, procedural fallback | LOD0 288 / LOD1 104 | Tapered huaca with a carved niche; fallback kept |
| Highland trees and shrubs | Blender vegetation kit | **Implemented (E3a)** | Molle 1.5k/400, pacay 1.1k/320, ichu 220/60 | Molle/pacay/sauce trees; ichu GLB built and budgeted but not attached; reeds shared |
| Ground cover | Procedural | Partial | Existing | Ichu stand on a trimmed 0.08 budget (1,280 tufts) to fund the kit |
| Rock outcrops | Blender prop kit | Partial (Caral granodiorite) | 300 / — | Build an andes stone kit; instance |
| Water | `Water.ts` shader | Implemented | Existing | Cold palette, depth gradient, soft banks |
| Paths | Terrain paint + stones | Implemented | Existing | Embedded stone, soft edges; remove the ladder look |
| Ayar hero | CC0 rig + hero outfit GLB (E4b) | **Implemented** | 10 draws / 10,004 tris measured | `tambotoco_hero.glb`; male-only, 4 clips, 1.38 MB; longer tunic, head/hands +12% |
| Common unit | Shared rig + Killke attire variant (E4a) | **Implemented** | 14 draws / 9,628 tris measured | Killke/ayllu palettes and rodela; shared asset |
| Llamas | Existing CC0 GLB | Implemented | Existing | Keep; check scale and grouping |
| Household props (hearth, basket, bench…) | Caral prop kit | Partial | 300 / — | Reuse where source-neutral; add highland pieces |
| Cinematic beats | Mission data + `CinematicPlayer` | Implemented | — | Re-frame; no new system |
| Portraits / UI | Existing medallions | Implemented | — | No change in the pilot |

## 8. Size ledger

`dist/` is 24.54 MB of the 25 MB budget. New assets must be offset in the same PR; the cap is not raised.

| Item | Estimated size | Offset |
| --- | --- | --- |
| Tambotoco hero character GLB (E4b) | **1.38 MB actual** | Male-only subset of the worker sources; the demo mannequin is already out of the bundle |
| Highland vegetation kit (molle, pacay, ichu × 2 LODs) | **0.216 MB actual (E3a)** | Meshopt, project-owned procedural geometry; no new textures |
| Architecture hero GLBs (cave, monolith) | **0.100 MB actual (E2b)** | Replaced procedural geometry; no net addition |
| Textures / macro maps | 0.3–0.5 MB | WebP; reuse atlases; remove unused maps |
| **Total** | **1.8–2.8 MB** | **At least 2.5 MB of offsets** (E2b used 0.10 MB and freed 1.84 MB by not shipping the demo mannequin; E3a added 0.216 MB; E4b added 1.38 MB; `dist` is 24.54 MB) |

The registry imports the gameplay GLBs explicitly; the demo mannequin is not shipped. The hero is preloaded only for `INCA_KILLKE` matches, and `dist` keeps 0.46 MB of headroom.

## 9. Backlog

Priorities are ordered by visual impact per engineering day. Each item includes its files and acceptance.

### P0 · The pass that changes the read

1. **Terrain receives directional shadows (B11). — Done in E1.**
   Files: `src/rendering/Terrain.ts`, `src/core/Game.ts` (mission sun), `src/rendering/AylluSite.ts`
   (shadow-caster trim). Acceptance: ground shadows visible, no acne, bench green
   (437,976/264 opening; 614,594/357 late).
2. **Palette, macro variation and vertex AO. — Done in E1/E2a.**
   Files: `src/model/defs/terrainPalettes.ts` (`cusco_valley`), `src/model/defs/sites.ts`
   (`tambotoco_site.terrain`), `src/rendering/aylluKit.ts`, `src/rendering/AylluSite.ts`.
   Done: stone, plaster, earth, thatch, crop and water palette; single-rim plaza; contact AO and macro
   colour baked into the merged kit surfaces. Ground cover remains in E3.
3. **Hero GLB + common variant.**
   Files: `scripts/build_ayllu_hero.mjs` (or Blender), `src/assets/models/ayllu_hero.glb`,
   `src/model/defs/modelAssets.ts`, `src/rendering/modelAssetRegistry.ts`, `src/rendering/UnitView.ts`,
   `src/rendering/rigAttire.ts`, `src/model/defs/commanders.ts`, `PROVENANCE.md`.
   Acceptance: Manco distinct at 54; ≤ 40 draws / 40k; other campaigns unchanged.
4. **Highland vegetation kit.**
   Files: `scripts/blender/build_andes_vegetation_kit.py`, `src/assets/vegetation/andes/*`,
   `src/rendering/vegetationKit.ts`, `src/rendering/vegetationKitLoader.ts`,
   `src/rendering/TreeInstances.ts`, `src/rendering/Props.ts`, `src/model/defs/profiles.ts`.
   Acceptance: groups, LODs, wind, no invented species.

### P1 · The finish

5. **Architecture material/geometry pass. — Done in E2a.** `aylluKit.ts` (contact AO + macro colour,
   battered walls, thatch eave, qollqa footing/vent), `AylluSite.ts` (baked into the merged surfaces). The
   stone courses are E1's detail map. Acceptance: no box read at 28/54; ≤ 4 materials per building.
6. **Water, paths and ford.** `Water.ts`, `Terrain.ts` paint paths, the bridge. Acceptance: cold water, soft
   banks, no ladder path.
7. **Cave and monolith GLBs. — Done in E2b.** `scripts/blender/build_tambotoco_hero_kit.py`,
   `src/assets/architecture/tambotoco/`, `tambotocoHeroKit.ts`, `AylluSite.ts`, `WorldViewDecor.ts`.
   Cave LOD0 1,802 tris / 4 materials, LOD1 342 / 3; huaca LOD0 288 / 3, LOD1 104 / 3; ≈103 KB after meshopt.
   Acceptance: the cave and the huaca carry the opening with a procedural fallback.
8. **Cinematic beats.** `src/campaign/defs/missions/m_tambotoco.ts`, `src/ui/CinematicPlayer.ts` (only if
   needed). Acceptance: wide/detail/hero shots; foundation reward.

### P2 · Polish after approval

9. Household props, extra fauna and micro-detail; UI portraits if the field identity changes.
10. Standardize the palette/material/pipeline method for the next campaign.

## 10. Stages

| Stage | Content | Gate |
| --- | --- | --- |
| **E0** | This document, `art-direction.md`, `capture_art_pilot.mjs`, baseline set, quality-bar reconciliation | **Done (2026-11-16):** docs links and baseline set |
| **E1** | B11, palette, water, plaza | **Partial (2026-11-16):** shadows on ground, low morning sun, straw/stone palette, single-rim plaza, bench 437,976/264 and 614,594/357; macro/AO and ground cover move to E2–E3 |
| **E2** | Architecture materials/geometry; hero GLB decision | **E2a done (2026-11-17):** AO/macro, battered walls, thatch eave, qollqa footing/vent; bench 438,856/269 and 615,532/354. Acceptance: no box read at 28/54; ≤4 materials per building. **E2b done (2026-11-17):** cave and huaca GLBs, fallback and LODs; bench 430,488/269 and 613,692/354 |
| **E3** | Highland vegetation kit, rocks, paths | **E3a done (2026-11-17):** molle/pacay/ichu kit (1,362/360, 1,048/316, 144/42 tris), andes pack, 14 m LOD0 radius, ichu stand on a trimmed 0.08 cover budget. **E3b done (2026-11-17):** wet-margin stream banks and a gravel ford bar (ground paint; heights unchanged, REPLAY_VERSION 40 for the resource shift), dirt-shouldered stone paths, and ayllu bank/path stones on the existing rock mesh (no new draw call). Bench **424,904/273** and **632,910/356** (kit 9,352/9 and 34,306/12). Acceptance: no invented species (inferred, sourced), LOD1 footprint stable. |
| **E4** | Hero + common unit | **E4a done (2026-11-17):** Killke and valley-ayllu rig variants replace the Chanca proxy. **E4b done (2026-11-17):** male-only `tambotoco_hero.glb` (1.38 MB, 4 clips, longer hero tunic) for Manco; hero 10,004 tris / 10 draws, common 9,628 / 14. Acceptance: Manco distinct at 54; budget; other campaigns unchanged |
| **E5** | Cinematic beats and foundation | Shot grammar; no new system |
| **E6** | 3 × 3 validation, bench, provenance, docs, review | `yarn verify:fast`, `bench:check`, `art:validate`, `dist:check`, human approval |
| **E7** | Full pilot production | Only after E6 approval |

E0–E6 are the scope of this pilot. E7 is a separate decision.

## 11. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| The art direction and the quality bar disagree | Work follows a stale rule | Update both in the same PR; the quality bar is the authority for status, this document for the pilot |
| Shared systems change other campaigns | Regressions outside the pilot | Mission-scoped palette/atmosphere/kit; only B11 is shared, with a non-pilot regression capture |
| The shared rig is modified | Every campaign changes | Tambotoco hero variant only; the base rig stays |
| `dist` exceeds 25 MB | Release gate fails | Size ledger with offsets; lazy-load the demo mannequin; meshopt/WebP |
| Blender is unavailable | CI or a contributor cannot build | Procedural fallback; no CI dependency; GLBs are committed |
| The pilot becomes a full rebuild | Scope creep and no approval gate | E0–E6 only; E7 after explicit approval |

## 12. Decisions

Recorded 2026-11-16:

1. **Tambotoco is the reference scene**; Caral is the measured precedent.
2. **The prototype includes a Tambotoco hero GLB and a common-unit variant**, both opt-in.
3. **The primary validation scene is the hualla hamlet + acequia**; Inticancha is the secondary frame.
4. **Changes are mission-scoped**; only B11 (terrain shadows) is a shared visual fix, with a regression capture. Hiding zero-count kit meshes is a shared draw-call cleanup with no visual change.

## 13. Evidence log

| Date | Command | Result |
| --- | --- | --- |
| 2026-11-16 | `node scripts/capture_ayllu_quality.mjs --tag=before --sizes=1600x900 --views=hualla,acequia,inticancha,built,close,wide` | Baseline PNGs in `review/ayllu-quality-before-1600x900-*.png` |
| 2026-11-16 | `yarn art:pilot --tag=before --quality=neutral --sizes=1600x900` | Baseline PNGs in `review/art-pilot-before-neutral-1600x900-*.png`; includes the `hero` staging |
| 2026-11-16 | `yarn art:pilot --tag=e1b --quality=neutral --sizes=1600x900 --views=hualla,close,inticancha` | E1 PNGs: long ground shadows, straw thatch, warm stone, single-rim plaza |
| 2026-11-16 | `yarn art:pilot --tag=e1b --quality=final --sizes=1600x900 --views=hualla,close,inticancha,hero` | Player-facing grade (fog of war off) |
| 2026-11-16 | `node scripts/bench_scene.mjs --mission=m_tambotoco --assert --out=review/bench-scene-tambotoco-e1c.json` | Opening **437,976 tris / 264 calls** (cap 500k/280) |
| 2026-11-16 | `node scripts/bench_scene.mjs --mission=m_tambotoco --stage=late --assert --out=review/bench-scene-tambotoco-e1c-late.json` | Founded Inticancha **614,594 tris / 357 calls** (cap 660k/360) |
| 2026-11-16 | `node scripts/bench_scene.mjs --mission=m_tambotoco --gpu --frames --quality=high --assert --out=review/bench-scene-tambotoco-e1c-frames.json` | Intel RPL-S iGPU, high, postfx on: **41 FPS** opening (24.2 ms p50), hardware **480,998 / 268** |
| 2026-11-16 | `node scripts/bench_scene.mjs --mission=m_tambotoco --stage=late --gpu --frames --quality=high --assert --out=review/bench-scene-tambotoco-e1c-late-frames.json` | Late: **36 FPS** (27.4 ms p50), frames **657,556 / 360** (at the cap, no raise) |
| 2026-11-16 | `yarn shot m1-b11-before --url='/?play=1&mission=m1_caral&seed=777&fog=0&low=1&intro=0' --click` (baseline worktree) and `yarn shot m1-b11-after ...` | Non-pilot regression: the Caral ground receives the pyramid/tree/house shadows in `review/m1-b11-{before,after}_0.png`; no shader errors |
| 2026-11-17 | `node scripts/capture_art_pilot.mjs --tag=e2a --quality=neutral --sizes=1600x900 --views=cave,shrine,hualla,close,inticancha,built` | E2a PNGs: contact AO/macro, battered walls, layered thatch eave, qollqa footing/vent; published as `docs/media/tambotoco-e2a-{close,hualla}-{before,after}.webp` |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --assert --out=review/bench-scene-tambotoco-e2a.json` | Opening **438,856 tris / 269 calls** (cap 500k/280) |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --stage=late --assert --out=review/bench-scene-tambotoco-e2a-late.json` | Founded Inticancha **615,532 tris / 354 calls** (cap 660k/360) |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --gpu --frames --quality=high --assert --out=review/bench-scene-tambotoco-e2a-frames.json` | Intel RPL-S iGPU, high: **37 FPS** opening (26.8 ms p50), **481,606 / 268** |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --stage=late --gpu --frames --quality=high --assert --out=review/bench-scene-tambotoco-e2a-late-frames.json` | Late: **33 FPS** (30.4 ms p50), **658,780 / 360** (at the cap) |
| 2026-11-17 | `blender --background --python scripts/blender/build_tambotoco_hero_kit.py` | Cave LOD0 1,802 tris / 4 mats, LOD1 342 / 3; huaca LOD0 288 / 3, LOD1 104 / 3 |
| 2026-11-17 | `yarn art:models --only=tambotoco_cave_lod0,tambotoco_cave_lod1,tambotoco_huaca_lod0,tambotoco_huaca_lod1` | Four GLBs, **≈103 KB** total; manifests in `art-src/blender/exports/tambotoco/` |
| 2026-11-17 | `yarn art:pilot --tag=e2b4 --quality=neutral --sizes=1600x900 --views=cave,shrine` | E2b PNGs; published as `docs/media/tambotoco-e2b-{cave,huaca}-{before,after}.webp` |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --assert --out=review/bench-scene-tambotoco-e2b.json` | Opening **430,488 tris / 269 calls** (cap 500k/280) |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --stage=late --assert --out=review/bench-scene-tambotoco-e2b-late.json` | Founded Inticancha **613,692 tris / 354 calls** (cap 660k/360) |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --gpu --frames --quality=high --assert --out=review/bench-scene-tambotoco-e2b-frames.json` | Intel RPL-S iGPU, high: **35 FPS** opening (28.3 ms p50), **473,510 / 273** |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --stage=late --gpu --frames --quality=high --assert --out=review/bench-scene-tambotoco-e2b-late-frames.json` | Late: **34 FPS** (29.2 ms p50), **656,940 / 360** (at the cap) |
| 2026-11-17 | `blender --background --python scripts/blender/build_andes_vegetation_kit.py` | Molle LOD0 1,362 / 360 tris, pacay 1,048 / 316, ichu 144 / 42; manifests in `art-src/blender/exports/tambotoco/vegetation/` |
| 2026-11-17 | `yarn art:models --only=…andes…` | Six GLBs, **≈216 KB** total after meshopt |
| 2026-11-17 | `yarn art:pilot --tag=e3a8 --quality=neutral --sizes=1600x900 --views=wide,trees,hualla` | E3a PNGs; published as `docs/media/tambotoco-e3a-{wide,trees}-{before,after}.webp` |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --assert --out=review/bench-scene-tambotoco-e3a-final.json` | Opening **422,864 tris / 273 calls** (cap 500k/280); kit 9,352/9 |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --stage=late --assert --out=review/bench-scene-tambotoco-e3a-late-final.json` | Founded Inticancha **630,750 tris / 356 calls** (cap 660k/360); kit 34,306/12 |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --gpu --frames --quality=high --assert --out=review/bench-scene-tambotoco-e3a-frames3.json` | Intel RPL-S iGPU, high: **34 FPS** opening (29.5 ms p50); frames mode 448,194 / 269 |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --stage=late --gpu --frames --quality=high --assert --out=review/bench-scene-tambotoco-e3a-late-frames3.json` | Late: **31 FPS** (32.1 ms p50); frames mode 656,578 / 359 |
| 2026-11-17 | `python3 scripts/build_tambotoco_heightmap.py` | Soft stream bank shelf and a dry ford bar; ground weights add a wet sand margin |
| 2026-11-17 | `yarn art:pilot --tag=e3b-final3 --quality=neutral --sizes=1600x900 --views=bank,path,ford,close,wide` | E3b PNGs; published as `docs/media/tambotoco-e3b-{bank,path,ford,close}-{before,after}.webp` |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --assert --out=review/bench-scene-tambotoco-e3b.json` | Opening **425,024 tris / 273 calls** (cap 500k/280); kit 9,352/9 |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --stage=late --assert --out=review/bench-scene-tambotoco-e3b-late.json` | Founded Inticancha **632,910 tris / 356 calls** (cap 660k/360); kit 34,306/12 |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --gpu --frames --quality=high --assert --out=review/bench-scene-tambotoco-e3b-frames.json` | Intel RPL-S iGPU, high: **38 FPS** opening (26.5 ms p50); frames 450,354 / 269 |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --stage=late --gpu --frames --quality=high --assert --out=review/bench-scene-tambotoco-e3b-late-frames.json` | Late: **33 FPS** (30.2 ms p50); frames 658,738 / 359 |
| 2026-11-17 | `node scripts/build_caral_worker.mjs --hero --out=src/assets/models/tambotoco_hero.glb` + `node scripts/simplify_caral_worker.mjs --file=…` | Male-only hero: 7 meshes, 5 clips, 1.44 MB |
| 2026-11-17 | `yarn art:pilot --tag=e4b2 --quality=neutral --sizes=1600x900 --views=hero,hero54` | Hero close-up and strategic frame; published as `docs/media/tambotoco-e4b-hero-{before,after,54}.webp` |
| 2026-11-17 | `yarn hero:budget` | Hero 10,004 tris / 10 draws; common 9,628 / 14 |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --assert --out=review/bench-scene-tambotoco-e4.json` | Opening **425,052 tris / 268 calls** (cap 500k/280) |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --stage=late --assert --out=review/bench-scene-tambotoco-e4-late.json` | Founded Inticancha **633,330 / 356** (cap 660k/360) |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --gpu --frames --quality=high --assert --out=review/bench-scene-tambotoco-e4-frames.json` | **39 FPS** opening (25.5 ms p50); frames 450,654 / 269 |
| 2026-11-17 | `node scripts/bench_scene.mjs --mission=m_tambotoco --stage=late --gpu --frames --quality=high --assert --out=review/bench-scene-tambotoco-e4-late-frames.json` | Late: **33 FPS** (30.2 ms p50); frames 659,158 / 359 |
| pending | `yarn art:pilot --tag=after --quality=neutral --sizes=1280x720,1600x900,1920x1080` | E6 evidence |
| pending | `yarn art:pilot --tag=after --quality=final --sizes=1280x720,1600x900,1920x1080` | E6 evidence |

## 14. See also

[`art-direction.md`](./art-direction.md) · [`tambotoco-model-mission.md`](./tambotoco-model-mission.md) ·
[`visual-language.md`](./visual-language.md) · [`asset-pipeline.md`](./asset-pipeline.md) ·
[`characters.md`](./characters.md) · [`campaign-quality-bar.md`](./campaign-quality-bar.md) ·
[`../historia/campanas/tambotoco.md`](../historia/campanas/tambotoco.md) ·
[`../../PROVENANCE.md`](../../PROVENANCE.md)
