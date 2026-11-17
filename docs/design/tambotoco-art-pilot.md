# Tambotoco art-direction pilot

**Status:** Living · **Mission:** `m_tambotoco` (Los hijos de Tambotoco) · **Started:** 2026-11-16

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
| **Light and materials** | Ambient-heavy, weak contact shadows, no ground shadows, flat stone and plaster. | `Terrain.ts:737` documents a custom `ShaderMaterial` with `lights: false`; the ground never receives directional shadows (backlog B11). Materials have micro-detail but no macro scale and little roughness break. | B11 first; vertex AO; macro maps; sun 30–35°; exposure; fog/haze. |
| **Presentation** | The opening and act cards are in-engine but framed as aerial views; Inticancha reads as the same disc with more props. | No shot grammar; the foundation lacks a reward moment. | Re-frame the three beats; wide/detail/hero shots; foundation phase + camera + life. |
| **Performance** | Software: 436,880 triangles / 265 calls (opening), 608,324 / 347 (founded). Hardware iGPU: 479,630 / 264 and 651,572 / 353. Caps: 500k/280 and 660k/360. | Draw calls exceed the general ≤200 target; the late scene is close to the 660k cap. `dist` is 24.75 / 25 MB. | Budget-neutral pass; merge/atlas/LOD; do not raise caps; size ledger with offsets. |
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

- Morning sun from the NE at 30–35°, warm; terrain receives shadows; vertex AO; light haze.
- Three beats: cave (wide + detail), Huanacaure (medium + hero), valley (wide + settlement).
- Inticancha foundation: phase change + camera + fire/smoke + people; the plaza becomes a settlement, not a
  bigger disc.

## 5. Capture protocol

The script is `scripts/capture_art_pilot.mjs` (`yarn art:pilot`). It hides the HUD, uses seed 777, sets the
site to `fundada` and opens the acequia.

```bash
# Materials and silhouettes: fog off, post-processing off
yarn art:pilot --tag=before --quality=neutral --sizes=1280x720,1600x900,1920x1080

# Player-facing look: fog on, the player's quality preset
yarn art:pilot --tag=after --quality=final --sizes=1280x720,1600x900,1920x1080
```

- **Before** is captured from the base commit (`a0352d5` or the current `main` at the start of the branch) in
  a clean worktree.
- **After** is captured on the branch with the same views, seed and resolution.
- Views: `hualla`, `acequia`, `inticancha`, `built`, `close`, `wide`, `hero`. The `hero` view stops the loop
  and always runs last.
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
| Cave mouth and rock ring | Procedural → Blender GLB candidate | Implemented, reads as blobs | ≤ 5k / 1.5k per piece | Rebuild as GLB if the material pass fails the gate |
| Huanacaure monolith | Procedural → Blender GLB candidate | Implemented, reads as a box | ≤ 5k / 1.5k | Rebuild as a tapered huaca with a carved niche |
| Highland trees and shrubs | Blender vegetation kit | **Missing** | 1.5k / 400 per tree | Molle, pacay, ichu/puna grass, reeds; LOD0/LOD1 |
| Ground cover | Procedural | Partial | Existing | Add puna/ichu; keep the dry-puna trim |
| Rock outcrops | Blender prop kit | Partial (Caral granodiorite) | 300 / — | Build an andes stone kit; instance |
| Water | `Water.ts` shader | Implemented | Existing | Cold palette, depth gradient, soft banks |
| Paths | Terrain paint + stones | Implemented | Existing | Embedded stone, soft edges; remove the ladder look |
| Ayar hero | Blender GLB + runtime attire | **Missing as unique asset** | 40 draws / 40k | Manco first; opt-in variant |
| Common unit | Shared rig + attire variant | Partial | 25 / 25k | Killke palette, headwear, mantle |
| Llamas | Existing CC0 GLB | Implemented | Existing | Keep; check scale and grouping |
| Household props (hearth, basket, bench…) | Caral prop kit | Partial | 300 / — | Reuse where source-neutral; add highland pieces |
| Cinematic beats | Mission data + `CinematicPlayer` | Implemented | — | Re-frame; no new system |
| Portraits / UI | Existing medallions | Implemented | — | No change in the pilot |

## 8. Size ledger

`dist/` is 24.75 MB of the 25 MB budget. New assets must be offset in the same PR; the cap is not raised.

| Item | Estimated size | Offset |
| --- | --- | --- |
| Tambotoco hero GLB | 0.8–1.2 MB | Lazy-load or move `ual_mannequin.glb` (1.9 MB, demo-only) out of the eager bundle |
| Highland vegetation kit (4–6 species × 2 LODs) | 0.6–1.0 MB | Meshopt; reuse the Caral material set where possible |
| Architecture hero GLBs (cave, monolith, altar) | 0.5–1.0 MB | Replace procedural geometry; no net addition |
| Textures / macro maps | 0.3–0.5 MB | WebP; reuse atlases; remove unused maps |
| **Total** | **2.2–3.7 MB** | **At least 2.5 MB of offsets** |

The eager `import.meta.glob` in `src/rendering/modelAssetRegistry.ts` bundles every GLB in
`src/assets/models/`, including the demo mannequin. Making it lazy (or moving the mannequin to `public/`) is the
first offset to verify.

## 9. Backlog

Priorities are ordered by visual impact per engineering day. Each item includes its files and acceptance.

### P0 · The pass that changes the read

1. **Terrain receives directional shadows (B11).**
   Files: `src/rendering/Terrain.ts`, `src/rendering/shadowFrame.ts` if needed, a regression capture of one
   non-pilot mission. Acceptance: ground shadows visible, no acne, bench green.
2. **Palette, macro variation and vertex AO.**
   Files: `src/model/defs/terrainPalettes.ts` (`cusco_valley`), `src/model/defs/sites.ts`
   (`tambotoco_site.terrain`), `src/rendering/aylluKit.ts`, `src/rendering/GroundCover.ts`.
   Acceptance: no tiling at 54; stone/earth/thatch within `art-direction.md` §5.
3. **Hero GLB + common variant.**
   Files: `scripts/build_ayllu_hero.mjs` (or Blender), `src/assets/models/ayllu_hero.glb`,
   `src/model/defs/modelAssets.ts`, `src/rendering/modelAssetRegistry.ts`, `src/rendering/UnitView.ts`,
   `src/rendering/rigAttire.ts`, `src/model/defs/commanders.ts`, `PROVENANCE.md`.
   Acceptance: Manco distinct at 54; ≤ 40 draws / 40k; other campaigns unchanged.
4. **Highland vegetation kit.**
   Files: `scripts/blender/build_highland_vegetation_kit.py`, `src/assets/vegetation/andes/*`,
   `src/rendering/vegetationKit.ts`, `src/rendering/vegetationKitLoader.ts`,
   `src/rendering/TreeInstances.ts`, `src/rendering/Props.ts`, `src/model/defs/profiles.ts`.
   Acceptance: groups, LODs, wind, no invented species.

### P1 · The finish

5. **Architecture material/geometry pass.** `aylluKit.ts` (stone, plaster, thatch, eaves, qollqa ring, cancha
   walls, plaza kerb/altar), `AylluSite.ts` (life and phases). Acceptance: no box read at 28/54; ≤ 4
   materials per building.
6. **Water, paths and ford.** `Water.ts`, `Terrain.ts` paint paths, the bridge. Acceptance: cold water, soft
   banks, no ladder path.
7. **Cave and monolith GLBs.** New Blender sources + `architectureKit.ts`/`AylluSite.ts`. Acceptance: the cave
   and the huaca carry the opening.
8. **Cinematic beats.** `src/campaign/defs/missions/m_tambotoco.ts`, `src/ui/CinematicPlayer.ts` (only if
   needed). Acceptance: wide/detail/hero shots; foundation reward.

### P2 · Polish after approval

9. Household props, extra fauna and micro-detail; UI portraits if the field identity changes.
10. Standardize the palette/material/pipeline method for the next campaign.

## 10. Stages

| Stage | Content | Gate |
| --- | --- | --- |
| **E0** | This document, `art-direction.md`, `capture_art_pilot.mjs`, baseline set, quality-bar reconciliation | Docs links, `yarn verify:fast`, docs-only evidence note |
| **E1** | B11, palette, macro/AO, water, ground cover | Shadows on ground, no tiling at 54, bench green, before/after |
| **E2** | Architecture materials/geometry; hero GLB decision | House/qollqa/plaza at 28/54; ≤ 4 materials |
| **E3** | Highland vegetation kit, rocks, paths | Groups, LODs, wind; no invented species |
| **E4** | Hero + common unit | Manco distinct at 54; budget; other campaigns unchanged |
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
4. **Changes are mission-scoped**; only B11 (terrain shadows) is a shared fix, with a regression capture.

## 13. Evidence log

| Date | Command | Result |
| --- | --- | --- |
| 2026-11-16 | `node scripts/capture_ayllu_quality.mjs --tag=before --sizes=1600x900 --views=hualla,acequia,inticancha,built,close,wide` | Baseline PNGs in `review/ayllu-quality-before-1600x900-*.png` |
| 2026-11-16 | `yarn art:pilot --tag=before --quality=neutral --sizes=1600x900` | Baseline PNGs in `review/art-pilot-before-neutral-1600x900-*.png`; includes the `hero` staging |
| pending | `yarn art:pilot --tag=after --quality=neutral --sizes=1280x720,1600x900,1920x1080` | E1/E6 evidence |
| pending | `yarn art:pilot --tag=after --quality=final --sizes=1280x720,1600x900,1920x1080` | Player-facing evidence |

## 14. See also

[`art-direction.md`](./art-direction.md) · [`tambotoco-model-mission.md`](./tambotoco-model-mission.md) ·
[`visual-language.md`](./visual-language.md) · [`asset-pipeline.md`](./asset-pipeline.md) ·
[`characters.md`](./characters.md) · [`campaign-quality-bar.md`](./campaign-quality-bar.md) ·
[`../historia/campanas/tambotoco.md`](../historia/campanas/tambotoco.md) ·
[`../../PROVENANCE.md`](../../PROVENANCE.md)
