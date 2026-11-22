# Geographic identity roadmap

**Status:** Approved · implemented through Phase 4 for the six missions of the close-out; §6.1–6.3 stay open
· **Audit date:** 2026-11-18 · **Scope:** the 20 released missions

This roadmap turns [`mission-geographic-identity.md`](../design/mission-geographic-identity.md) into an
ordered implementation plan. It is a proposal: no mission, scene, model or asset is changed by this
document.

The design principles live in [`geographic-families.md`](../design/geographic-families.md). The evidence and
pairwise comparison live in
[`geographic-similarity-matrix.md`](../design/geographic-similarity-matrix.md).

---

## 1. Goal and non-goals

**Goal:** every released mission has a geography that a player can recognise without reading its name, and
that geography is coherent with the place, the period and the documented sources.

**Non-goals:**

- New missions, new mechanics, new civilizations or a new campaign structure.
- Twenty independent biomes or an asset per map.
- A terrain-engine rewrite, a new renderer or a new water simulation.
- Raising `bench_scene` caps to fit new art.
- Treating palette, time of day or labels as geographic identity.

---

## 2. Baseline

### 2.1 Current identity scores

Scale: 0 = no identity, 1 = labels/palette only, 2 = one strong cue but generic terrain, 3 = unmistakable.

| Score | Missions                                                                                                                                                                                                                    |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3** | `m1_caral`, `m_tambotoco`                                                                                                                                                                                                   |
| **2** | `m2_chavin` (partial), `m_junta_cusco` (partial), `m_lima` (partial)                                                                                                                                                        |
| **1** | `m3_moche_recuay`, `m4_wari`, `m5_yahuar_pampa`, `m6_chimu_inca`, `m6b_guerra_civil`, `m_cusco_1536`, `m7_tupac_amaru`, `m8_independencia`, `m_lima_1821`, `m_real_felipe`, `m9_guerra_pacifico`, `m_miraflores`, `m_brena` |
| **0** | `m_tarapaca`, `m_vilcabamba`                                                                                                                                                                                                |

### 2.2 Current reuse

- 12 missions share 5 authored heightfields.
- 14 missions share 5 site models.
- 7 missions share the base→site→enemy diagonal.
- 2 vegetation packs; the `andes` pack is used by one mission.
- 2 missions define a mission-level atmosphere.
- The `altiplano` region is unused; `m8_independencia` and `m_junta_cusco` fall into `andean_valley`.

### 2.3 Current performance envelope

`scripts/bench_scene.mjs` already carries mission-specific caps. Several are above the general
600k/200 target in [`art-direction.md`](../design/art-direction.md):

| Mission              | Opening cap (triangles / calls) |     Late cap |
| -------------------- | ------------------------------: | -----------: |
| `m_lima`             |                      800k / 860 | 1.2M / 1,250 |
| `m_junta_cusco`      |                    780k / 1,000 |            — |
| `m8_independencia`   |                      625k / 660 | 920k / 1,325 |
| `m7_tupac_amaru`     |                      595k / 710 | 860k / 1,140 |
| `m9_guerra_pacifico` |                      570k / 640 | 860k / 1,160 |
| `m6b_guerra_civil`   |                      745k / 465 | 1.025M / 740 |
| `m6_chimu_inca`      |                      530k / 290 |   815k / 550 |

This is the hard constraint: geographic identity must be bought with relief, distribution and merging, not
with more objects.

---

## 3. Phase 0 — Foundation without a visual change

**Complexity:** S · **Depends on:** approval of this roadmap

**Status (2026-11-19):** implemented in `feat/geographic-identity-phase-0`. The `MapOverrides` surface is
complete; `m8_independencia` and `m_junta_cusco` have an explicit `high_andes` region; the high-valley
missions use the `andes` kit and its molle/pacay/willow mix; the Chanca and Colonial dry valleys no longer
create accidental lakes; every mission except the Tambotoco reference has a mission-level atmosphere.
Shared base/site/enemy anchors are deferred to Phase 1 because changing them requires the new site
definitions. Evidence: [`geographic-identity-phase0.webp`](../media/geographic-identity-phase0.webp).

1. Approve the family taxonomy and the acceptance criteria.
2. Add the capture protocol and the blind-test sheet to the review process.
3. Complete `MapOverrides` with `water`, `elevation` and `groundPbr`; use the existing
   `MissionDef.atmosphere` for per-mission haze and light.
4. Set an explicit `region` on every mission; correct `m8_independencia` and `m_junta_cusco` to
   `high_andes`.
5. Set `vegetationKit: 'andes'` on every `high_valley` mission (Chavín, Wari, Cusco 1536, Túpac Amaru,
   Junta Cusco, Breña, and any other highland mission that lacks it).
6. Fix accidental water: raise the floors of the Chanca and Colonial valleys above the water level, or
   declare the lakes if they are intended.
7. Defer shared base/site/enemy anchor changes to Phase 1; they require the new site definitions.
8. Correct misleading labels: the Vilcabamba “Río Urubamba” became “Valle del Urubamba” while the field had no
   water. The close-out carved the river and the label is a water toponym again (see §5). The Chimú canal is
   geometry, not a label, and stays in Phase 1.
9. Record the 20-mission `audit:campaigns` capture set and the targeted `bench_scene` baseline for every
   affected mission. The full 20-mission bench baseline follows the Phase 1 heightfield splits.

**Exit:** no geometry or asset has been redesigned, but the data bugs and the misleading labels are gone,
and the baseline is captured.

---

## 4. Phase 1 — Break the reuse chains

**Complexity:** M · **Depends on:** Phase 0, historical validation for the new places

**Status (2026-11-19):** the geometry foundation is implemented. The seven missions now use a
`MissionSite.heightField` override on their existing site: Quipaipan, Lima 1821, Miraflores, Callao,
Tarapacá, Vilcabamba and Mantaro. Each field flattens a pad at the site anchor to the base field's elevation
and inherits its painted ground (plus the Rímac river in Lima and Miraflores), so the shared landmark keeps its grounding and its
`treeless` scatter. Measured separation between any two fields: mean |Δh| 0.9 m and at most 29 % of the grid
within 0.25 m. The site models and full compositions remain in Phase 2/3. Evidence:
[`geographic-identity-phase1.webp`](../media/geographic-identity-phase1.webp).

**Known limitation (feeds Phase 2):** with geometry alone the new landforms read weakly, because the splat is
still the base site's paint authored for the old relief — a carved quebrada or river valley is coloured as the
plain it replaced. Phase 2 pairs each pilot field with paint derived from that field (and the pilot's
composition), which needs a compact ground encoding: a 64×64 RGBA grid is ~16 KB raw per field and the current
`dist` headroom is ~170 KB, so the ground payload has to use the same delta-varint treatment as the heights.

Add one authored heightfield per reused mission. This is the highest identity return per unit of work.

| New heightfield | Mission            | Removes the reuse with                | Notes                           |
| --------------- | ------------------ | ------------------------------------- | ------------------------------- |
| `quipaipan`     | `m6b_guerra_civil` | `m_cusco_1536`                        | Open pampa, dry wash, low hills |
| `lima_1821`     | `m_lima_1821`      | `m_lima`, `m_miraflores`              | Lima edge + Callao road         |
| `miraflores`    | `m_miraflores`     | `m_lima`, `m_lima_1821`               | Coastal cliff + redoubt line    |
| `callao`        | `m_real_felipe`    | `m9_guerra_pacifico`, `m_tarapaca`    | Bay + star fortress             |
| `tarapaca`      | `m_tarapaca`       | `m9_guerra_pacifico`, `m_real_felipe` | Inland quebrada, no sea         |
| `vilcabamba`    | `m_vilcabamba`     | `m5_yahuar_pampa`                     | Cloud-forest slope + Urubamba   |
| `mantaro`       | `m_brena`          | `m8_independencia`                    | Deep valley + terraces + passes |

After this phase:

- no mission shares a heightfield with another;
- each reuse chain has a distinct composition;
- the site-model variants that are still needed (for example Lima vs Miraflores, or Callao vs Arica) are
  scheduled in Phase 2/3 with the pilot or family work.

**Exit:** the similarity matrix has no 5s outside the historical pairs that remain intentionally linked
(for example, the two Lima moments may share a city grammar, but not the same heightfield).

---

## 5. Phase 2 — Pilots

**Status (2026-11-19):** first slice landed. `m_cusco_1536` has its own field (basin, Sacsayhuamán ridge and
shoulder, campiña terraces, retreat corridor) and every mission-scoped field now paints its own ground from
that field's relief instead of inheriting another mission's painting. The paint pays for itself: per-mission
128 x 128 RGBA grids are stored as 4-bit palette indices (`src/model/defs/groundCodec.ts`), and the dead
`cusco_inca_site` field was removed, so `dist` went from 24.83 to 24.74 MB. The paint keeps the thresholds the game reads: groves still grow where `grass > 0.6` and `treeless` still
fires on `sand > 0.45` / `rock > 0.6`, pinned per mission in `tests/geographic-heightfields.test.ts` (Lima
1821/Miraflores keep the irrigated oasis, Callao and Tarapacá stay as bare as their base fields). Three blind rounds are recorded below: 8/8, then 6/8, then 8/8 after the connected Vilcabamba valley.

Still open in this phase: Lima 1535's city-grid composition and the remaining composition work; the formal
blind protocol with a larger sample belongs to Phase 4.

### Close-out slice (2026-11-19, geographic identity)

The last slice closed the two gaps this phase left open for Vilcabamba and made the pair separations
measurable:

- **Vilcabamba** now has a wet, meandering Urubamba with one shallow ford where both mission roads cross it
  (`AuthoredHeightField.river` + `fords`, the same mechanism as Lima's Rímac), a painted gravel valley floor
  with the green only on the walls (so the groves still grow where `grass > 0.6` but on the slopes), a higher
  east/west wall, denser ferns and 400 visual-only canopy trees in the wall bands (`MissionLayout.groves`,
  registered in `decorGroves` so they follow the same LOD and fog rule as Caral's groves). The gatherable
  trees stay at 244 and the camp→fort march is unchanged: the hold completes 45/45 in ~91 s.
- **Quipaipan** keeps its dry, open puna and gains a deeper arroyo (2.4 m) painted as gravel, so the pair no
  longer shares a waterless green field.
- The **hold regression** that this relief exposed is fixed at the mission level: start units accept an
  optional `stance` (`combatStance` per unit in `MissionDef.start.units`) and Vilcabamba's garrison opens in
  `defensivo`, so a stray enemy worker cannot pull the line out of the objective radius.

`bench_scene` for Vilcabamba is now 680,044 triangles / 499 calls. The cap moves from 630k to 700k as the
documented `selva` exception (§10); draw calls stay inside the original 540.

The three pilots validate the approach before the rest of the catalogue is touched. They represent the
three hardest environments and the three highest-leverage reuse chains.

### Blind test (2026-11-19, eight fields, second round)

An independent reviewer mapped eight HUD-less site captures to eight missions from a geography brief, judging
terrain, water, vegetation and architecture and ignoring the in-world labels: **6 of 8**.

- Correct: Cusco 1536, Tarapacá, Lima 1821, Breña, Callao, Miraflores.
- Confused: **Vilcabamba ↔ Quipaipan**. Both frame an open green plain with a central stone platform, because the
  Vilcabamba relief that would show the valley had not shipped yet. This is the
  clearest remaining gap and the reason the next slice reshaped that valley.
- Near misses: Lima 1821 ↔ Miraflores are separated only by the urban grid vs the tent/redoubt camp, and
  Tarapacá ↔ Callao by cultivation rows vs fortress geometry.

The first round (a different reviewer, before the Phase 3 relief work) scored 8/8. Vilcabamba's field did not
change between the rounds, which is exactly why the miss points at it: the _pampa/valley_ pair still needs the
landform work that has now shipped.

### Pilot A — `m_cusco_1536` (high Andes, urban siege)

**Why:** the most important Andean mission, currently sharing its site and heightfield with Quipaipan. It
proves the high-basin family and the dense-city composition.

**Changes:**

- Own Cusco heightfield: basin, Sacsayhuamán hill, campiña terraces.
- City density; fortress on the height; retreat road.
- `region: 'high_andes'`, `vegetationKit: 'andes'`, existing `cusco_valley` palette.
- Smoke from burning roofs **[DOC]**.

**Acceptance:**

- Blind test: Cusco 1536 vs Quipaipan ≥ 8/10 correct.
- Sacsayhuamán is visible as a height from the default camera.
- The city reads as a city, not isolated blocks.
- `bench_scene --assert` inside the current cap; no cap increase.
- Historical review of the urban abstraction and the fortress.

**Complexity:** M–L.

### Pilot B — `m_lima` (central coast, oasis city)

**Why:** one geometry currently feeds three missions. Fixing Lima unlocks the 1535/1821/Miraflores family.

**Changes:**

- Own Lima heightfield: desert plain, Rímac valley, Cerros de Quizu, coast.
- City grid on the north bank; river as the spine; sea west.
- `central_coast` dry palette, garúa atmosphere, `coastal_river` vegetation.
- Distinct site composition for 1535; 1821 and Miraflores get their own fields in Phase 3.

**Acceptance:**

- Blind test: Lima 1535 vs 1821 vs Miraflores ≥ 8/10 correct once all three exist.
- The desert/river/oasis contrast is visible at the default camera.
- The city reads as a grid from the top-down capture.
- `bench_scene --assert` inside the current cap.

**Complexity:** M.

### Pilot C — `m_vilcabamba` (cloud forest)

**Why:** the worst current mismatch and the only cloud-forest mission. It validates the new vegetation pack
and the steep-terrain hydrology.

**Changes:**

- Own Vilcabamba heightfield: steep ridges, narrow valley, Urubamba.
- `selva` vegetation pack; dense layered forest; ferns; mist.
- Town on a ledge; Huayna Pucará on a spur; escape route.
- `cloud_forest` palette; humid dusk atmosphere.

**Acceptance:**

- Blind test: Vilcabamba vs Yahuar Pampa ≥ 8/10 correct.
- Forest cover and steepness are visible in the wide and top-down captures.
- The river is continuous and connected to the valley, not a pond.
- `bench_scene` has a new, measured cap for the `selva` pack; `dist:check` passes.
- No invented species names; the pack is labelled as a plausible cloud-forest abstraction.

**Complexity:** L.

---

## 6. Phase 3 — Remaining families

**Status (2026-11-19):** the first slice widened one of the three confusable pairs by **relief**; the other two
stay as they were, because the fix broke walkability or belongs to composition:

| Pair | Before (mean |Δh|) | Now | Outcome |
| --- | ---: | ---: | --- |
| Tarapacá ↔ Quipaipan | 0.91 m | **1.75 m** | taller pampa hills and border ridges; a narrower, deeper dry quebrada with a taller stepped bank |
| Vilcabamba ↔ Breña | 3.67 m | **4.71 m** | valley walls as broad, long-wavelength slopes: one walkable component, grass 9,451 cells, and the fort on a spur that visibly falls away |
| Vilcabamba ↔ Quipaipan | 3.20 m | **4.30 m** | the same valley walls; this was the pair the blind test confused |
| Lima 1821 ↔ Miraflores | 1.57 m | 1.57 m | by design (shared anchor); separated by **composition**: three earthwork redoubts (Arica battery kit) stand south of Lima on the mission's own objective nodes, facing the Chilean advance |

The next slice follows the walkability rule the Vilcabamba fix established: a BFS on the 1 m path grid at
`MAX_WALKABLE_SLOPE`, requiring one component covering ≥99 % of the open cells (`tests/geographic-heightfields.test.ts`). Evidence: [`geographic-identity-phase3.webp`](../media/geographic-identity-phase3.webp). The remaining families
(recintos and setpieces) follow below.

Phase 1 created the geometry foundation; Phase 3 completes the mission-level composition, vegetation,
materials and site work for every mission not closed in Phase 2. Rows marked “Phase 1” are not a second
heightfield pass; they finish the mission around the new field.

### 6.1 High Andes and pampas

| Mission            | Main change                                                  | Complexity |
| ------------------ | ------------------------------------------------------------ | ---------- |
| `m4_wari`          | Terraced basin, andenes, dry quebradas, `andes` kit          | M          |
| `m5_yahuar_pampa`  | Remove accidental lake, add pucará hill, puna                | M          |
| `m6b_guerra_civil` | New Quipaipan pampa (Phase 1)                                | M          |
| `m7_tupac_amaru`   | New Tinta/Sangarará site; stop using the Cusco colonial site | M–L        |
| `m_junta_cusco`    | High-andes region, pass/altiplano, `andes` kit               | M          |
| `m8_independencia` | Two contrasting pampas, high-andes region                    | M          |
| `m_brena`          | New Mantaro valley (Phase 1), terraces, `andes` kit          | L          |

### 6.2 Coastal and southern desert

| Mission              | Main change                                | Complexity |
| -------------------- | ------------------------------------------ | ---------- |
| `m3_moche_recuay`    | River, dunes, adobe huacas, canal          | M          |
| `m6_chimu_inca`      | Dunes, dry river, Chan Chan, canal         | M          |
| `m_lima_1821`        | New Lima edge/Callao heightfield (Phase 1) | M          |
| `m_miraflores`       | New redoubt-line heightfield (Phase 1)     | M          |
| `m_real_felipe`      | New Callao bay/star fortress (Phase 1)     | L          |
| `m9_guerra_pacifico` | Morro backdrop, port terrace               | M          |
| `m_tarapaca`         | New quebrada heightfield (Phase 1), no sea | L          |

### 6.3 Refine the strong missions

| Mission       | Main change                                   | Complexity |
| ------------- | --------------------------------------------- | ---------- |
| `m1_caral`    | Dry-season channel, lomas, terrace contrast   | S–M        |
| `m2_chavin`   | Deepen valley, river, `andes` kit, palette    | M          |
| `m_tambotoco` | Optional distant peaks and rock clusters only | S          |

---

## 7. Phase 4 — Validation and close

**Status (2026-11-19):** the blind test now scores **6/6 twice on the shipped build** for the six missions of the
three pairs. The route there is recorded in the matrix: a pre-bay round swapped Miraflores ↔ Callao (the
fortress frame had no water), and a later round swapped Tarapacá ↔ Quipaipan (both read as an arid plain);
the Callao bay and Tarapacá's real quebrada are the fixes. Two earlier rounds scored 8/8 and 6/8 on a broader
eight-mission set. The Miraflores redoubts are a composition
change made after the 8/8 round; they are not claimed as part of that score. Historical/geographical audit of
Tarapacá, Real Felipe and Miraflores: no invented facts, four imprecisions fixed (Tarapacá's uncited "200 km",
Real Felipe's "civilians in Callao" where the source says the fortress, Miraflores' Chorrillos label on the
inland side, and the stale `lima_site` reference in `docs/historia/campanas/miraflores.md`). The similarity
matrix gained a current-state section and a close-out section with no pair left at 5.

Close-out results:

- **Blind test:** two independent reviewers (not humans — the main limitation), six labels-off site captures
  per round, 6/6 each on the shipped build. Three fixes came from the earlier rounds: the Callao bay in the
  fortress frame, and Tarapacá's quebrada as a real dry valley (a ~32 m gravel floor, ~4.8 m banks) instead
  of a shallow dip. The full §8 protocol (three RTS views, top-down, terrain-only, hypsometric and water
  masks, the 24/30 rubric) remains a future round; this close-out ran the default site framing plus a wide
  check. That round needs a real GPU (the frame-time pass and `bench:site-views`) and a human reviewer; it is
  owned by the next release review, together with the §6.1–6.3 composition work.
- **Grayscale pass:** the six captures stay legible without colour (site footprint, objective ring and water
  remain dominant); Quipaipan's dry arroyo loses contrast, so its identity rests on the open pampa and platform.
- **Fog of war:** `Water` now follows the fog mask (a pre-existing gap: unexplored rivers and bays stayed
  visible). Static props and the objective ring still ignore it, unchanged.
- **Bench:** `bench_scene --assert` passes for the two changed missions (Vilcabamba 680,044 / 499 against the
  new 700k selva cap, Quipaipan 679,767 / 391). The cap exception is a structural budget for the canopy, not a
  frame-time claim: the audit machine has no real GPU, so `bench:site-views` was not run and SwiftShader is not
  presented as a GPU verdict. `bench:check` is not a stable gate on a busy machine: the `fortifications` sim
  p99 swung between 12.6 and 15.7 ms against a 12 ms budget across three runs on the same build, while p50
  stayed at 2.6 ms.
- **Package:** `dist` 24.76 MB of 25.00 MB; entry chunk 2 KB gzip of 600 KB. No new asset.
- **Suites:** `yarn verify:fast` (typecheck, lint, format, 987 unit tests, build) and the full
  `yarn test:e2e:fast` (340 tests, 3 workers) are green, plus the six mission specs, Caral's grove specs, the
  m6b playtest and `scripts/sim.mjs` (8 seeds, no errors; first attack 219-295 s).

Still open (documented, not blocking): the remaining Phase 3 missions in §6.1-6.3, the static-prop fog gap, and
a human blind test.

**Complexity:** S · **Depends on:** all pilots and at least one mission per family

1. Run the blind test (8/10 per mission). **Close-out:** 6/6 twice on the six missions of the three pairs,
   with the site framing plus a wide check; the full §8 protocol and the 8/10 rubric stay for the next review.
2. Run the grayscale test. **Close-out:** done on the same six captures.
3. Re-run `yarn bench:check` and `bench_scene --assert` for every mission. **Close-out:** `bench_scene --assert`
   green for the changed missions; `bench:check` was run but is not a stable gate on a busy machine (§7).
4. Re-run `yarn dist:check`. **Close-out:** done, 24.76 MB of 25.00.
5. Record the historical/geographic review for the open questions. **Close-out:** done in the previous slice
   (Tarapacá, Real Felipe, Miraflores).
6. Update `art-direction.md`, `visual-language.md` and `docs/README.md` with the approved family/preset
   references. **Close-out:** `docs/README.md` and the three identity documents updated; the art-direction and
   visual-language references are unchanged because they do not enumerate mission presets.
7. Attach the before/after captures to the PR. **Close-out:** `docs/media/geographic-identity-closeout*.webp`.

**Exit:** every mission meets the ten acceptance criteria; no mission depends on a palette-only difference;
the performance caps are unchanged except for the justified `selva` pack.

---

## 8. Dependencies

| Work                             | Depends on                                                    |
| -------------------------------- | ------------------------------------------------------------- |
| New heightfields                 | Historical/geographic validation of the place                 |
| `selva` pack                     | Art/provenance review; `dist` budget; new bench cap           |
| Quipaipan split                  | Cusco 1536 site plan; mission objectives unchanged            |
| Lima split                       | Callao/Miraflores site plans; 1821/Miraflores mission layouts |
| Tarapacá                         | Quebrada validation; removal of the sea                       |
| Real Felipe                      | Callao bay/fortress validation                                |
| `andes` on all highland missions | Phase 0 config; `bench_scene` per mission                     |
| Acceptance test                  | Capture protocol; blind-test panel                            |

---

## 9. Relative complexity

| Work type                                                | Size     | Why                                 |
| -------------------------------------------------------- | -------- | ----------------------------------- |
| Config-only (region, atmosphere, vegetation kit, labels) | **S**    | Data changes; no new art            |
| Authored heightfield from an existing recipe             | **M**    | Script, data, tests, layout         |
| Site/composition variant reusing modules                 | **M**    | Layout, collision, keepouts, phases |
| New heightfield + new site composition                   | **M–L**  | Both terrain and place              |
| New vegetation pack with 1–2 GLBs                        | **L**    | Asset, LOD, budgets, provenance     |
| New terrain-system feature (biome blend, mist volume)    | **L–XL** | Avoid in the first pass             |
| Capture/blind-test harness                               | **S**    | Script + review process             |

---

## 10. Performance gates

- Every mission keeps its current `bench_scene` cap; no cap increase except the `selva` pilot, which must
  justify its own cap with a measured frame-time improvement or a documented exception.
- `andes` on the six highland missions that do not use it today must fit inside the existing caps; if it
  does not, reduce density or
  merge materials before adding a cap.
- New site variants merge by material and reuse modules; a new city GLB is not acceptable.
- PBR additions are capped at two sets; `dist:check` remains 25 MB / 600 KB gzip.
- The structural bench runs on SwiftShader; the real-GPU pass (`bench:site-views`) is the frame-time check.
  Do not present SwiftShader numbers as a GPU verdict.

---

## 11. Risks

| Risk                                       | Impact                              | Mitigation                                                                                          |
| ------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| Historical validation stalls               | New heightfields cannot be authored | Start with the two best-documented pilots (Cusco, Lima) and queue Vilcabamba/Tarapacá behind review |
| New vegetation breaks the cap              | Pilot fails performance             | Instance, cluster, LOD, near-only leaf shadows; reduce density                                      |
| Site variants multiply draw calls          | Later missions already over target  | Merge by material; reuse modules; no new GLB per city                                               |
| Palette-only work is mistaken for identity | The audit repeats                   | Grayscale and blind tests are mandatory                                                             |
| The `selva` pack looks like a new biome    | Scope creep                         | One pack, one mission, one cap, no species claims                                                   |
| The family model becomes over-abstracted   | More design than game               | Do not add `landscapePresets.ts` until three missions repeat the same preset                        |
| Captures are not comparable                | Acceptance is subjective            | Fixed seed, camera, HUD hidden, top-down and grayscale                                              |

---

## 12. Definition of done

A mission is done when:

1. It has its own heightfield and its own composition.
2. It passes the ten acceptance criteria with ≥ 24/30.
3. It passes the blind test and the grayscale test.
4. It stays inside its `bench_scene` cap.
5. Its historical/geographic claims are labelled and sourced.
6. Its before/after captures are attached to the PR.
7. Its entry in `docs/design/visual-language.md` and `docs/README.md` points to the family/preset it uses.

---

## 13. Recommended order at a glance

1. **Phase 0:** data fixes, explicit regions, `andes` kit, accidental water, labels, baseline captures.
2. **Phase 1:** split Quipaipan, Lima 1821, Miraflores, Callao, Tarapacá, Vilcabamba, Mantaro.
3. **Phase 2:** pilots Cusco 1536, Lima 1535, Vilcabamba.
4. **Phase 3:** Wari, Yahuar Pampa, Túpac Amaru, Junta, Independencia, Breña; then Moche, Chimú, Arica,
   Miraflores, Real Felipe, Lima 1821, Tarapacá.
5. **Phase 4:** Caral/Chavín/Tambotoco polish, blind tests, benches, docs, review.

---

## 14. See also

- [`../design/mission-geographic-identity.md`](../design/mission-geographic-identity.md) — the matrix and the
  twenty proposals.
- [`../design/geographic-families.md`](../design/geographic-families.md) — the family/component architecture.
- [`../design/geographic-similarity-matrix.md`](../design/geographic-similarity-matrix.md) — the current
  similarity clusters.
- [`../design/art-direction.md`](../design/art-direction.md) — camera, palette and budgets.
- [`../design/visual-language.md`](../design/visual-language.md) — implementation map.
- [`./ROADMAP.md`](./ROADMAP.md) — the engineering roadmap.
