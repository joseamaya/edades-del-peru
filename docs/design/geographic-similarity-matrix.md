# Geographic similarity matrix

**Status:** Snapshot · **Audited:** 2026-11-18 · **Close-out:** 2026-11-19 · **Scope:** the 20 released missions

> **Post-audit note (2026-11-19):** Phase 0 changed some of the state this snapshot records: `m8_independencia`
> and `m_junta_cusco` now have an explicit `high_andes` region, the high-valley missions use the `andes`
> vegetation kit, and every mission except Tambotoco has a mission-level atmosphere. Phase 1 then gave seven
> missions their own `MissionSite.heightField` (C8, C11, C14, C16, C17, C19, C20), and Phase 2 added C10 (Cusco
> 1536) plus painted ground derived from each field, so the heightfield column of every cluster below is split
> while the site model, palette and anchors stay shared. The matrix stays the
> **2026-11-18** audit snapshot; the current state and the remaining work are in the roadmap.

This document records how much geography the twenty missions currently share, and why. It is an audit
snapshot, not a target: the proposals that should replace these similarities live in
[`mission-geographic-identity.md`](./mission-geographic-identity.md) and
[`geographic-families.md`](./geographic-families.md).

The matrix is a **heuristic**, not a measurement. It is derived from the components a mission actually
resolves at runtime (`GeographicRegion`, authored heightfield, site model, palette, vegetation pack,
atmosphere) plus the authored composition (base/site/enemy anchors, roads, water). It exists to prioritise
work, not to score art.

## Scale

| Score | Meaning |
| --- | --- |
| **5** | Near-identical: same heightfield and same site model/composition. Only labels, palette, lighting or mission rules differ. |
| **4** | High: same heightfield or same site model, plus the same region/palette; one major layer differs. |
| **3** | Medium: same geographic family and shared palette/vegetation/atmosphere, but a different heightfield or site. |
| **2** | Low: same macro-region (coast or Andes), but a different family, palette or site. |
| **1** | Distinct: different region and different composition. |

Diagonal cells (`·`) are not scored.

## Mission codes

| Code | Mission | Code | Mission |
| --- | --- | --- | --- |
| C1 | `m1_caral` | C11 | `m_vilcabamba` |
| C2 | `m2_chavin` | C12 | `m7_tupac_amaru` |
| C3 | `m3_moche_recuay` | C13 | `m_junta_cusco` |
| C4 | `m4_wari` | C14 | `m_lima_1821` |
| C5 | `m_tambotoco` | C15 | `m8_independencia` |
| C6 | `m5_yahuar_pampa` | C16 | `m_real_felipe` |
| C7 | `m6_chimu_inca` | C17 | `m_tarapaca` |
| C8 | `m6b_guerra_civil` | C18 | `m9_guerra_pacifico` |
| C9 | `m_lima` | C19 | `m_miraflores` |
| C10 | `m_cusco_1536` | C20 | `m_brena` |

## Matrix

| | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | C11 | C12 | C13 | C14 | C15 | C16 | C17 | C18 | C19 | C20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **C1** | · | 1 | 2 | 1 | 1 | 1 | 2 | 1 | 2 | 1 | 1 | 1 | 1 | 2 | 1 | 2 | 2 | 2 | 2 | 1 |
| **C2** | 1 | · | 1 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | 2 | 2 | 3 | 1 | 3 | 1 | 1 | 1 | 1 | 2 |
| **C3** | 2 | 1 | · | 1 | 1 | 1 | 3 | 1 | 2 | 1 | 1 | 1 | 1 | 2 | 1 | 2 | 2 | 2 | 2 | 1 |
| **C4** | 1 | 2 | 1 | · | 2 | 3 | 1 | 3 | 1 | 3 | 1 | 3 | 2 | 1 | 3 | 1 | 1 | 1 | 1 | 3 |
| **C5** | 1 | 2 | 1 | 2 | · | 2 | 1 | 2 | 1 | 2 | 1 | 2 | 2 | 1 | 2 | 1 | 1 | 1 | 1 | 2 |
| **C6** | 1 | 2 | 1 | 3 | 2 | · | 1 | 3 | 1 | 3 | 4 | 3 | 2 | 1 | 3 | 1 | 1 | 1 | 1 | 3 |
| **C7** | 2 | 1 | 3 | 1 | 1 | 1 | · | 1 | 2 | 1 | 1 | 1 | 1 | 2 | 1 | 2 | 2 | 2 | 2 | 1 |
| **C8** | 1 | 2 | 1 | 3 | 2 | 3 | 1 | · | 1 | 5 | 1 | 3 | 2 | 1 | 3 | 1 | 1 | 1 | 1 | 3 |
| **C9** | 2 | 1 | 2 | 1 | 1 | 1 | 2 | 1 | · | 1 | 1 | 3 | 3 | 5 | 1 | 3 | 2 | 2 | 5 | 1 |
| **C10** | 1 | 2 | 1 | 3 | 2 | 3 | 1 | 5 | 1 | · | 1 | 3 | 2 | 1 | 3 | 1 | 1 | 1 | 1 | 3 |
| **C11** | 1 | 2 | 1 | 1 | 1 | 4 | 1 | 1 | 1 | 1 | · | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| **C12** | 1 | 2 | 1 | 3 | 2 | 3 | 1 | 3 | 3 | 3 | 1 | · | 4 | 3 | 3 | 1 | 1 | 1 | 3 | 3 |
| **C13** | 1 | 3 | 1 | 2 | 2 | 2 | 1 | 2 | 3 | 2 | 1 | 4 | · | 3 | 3 | 1 | 1 | 1 | 3 | 2 |
| **C14** | 2 | 1 | 2 | 1 | 1 | 1 | 2 | 1 | 5 | 1 | 1 | 3 | 3 | · | 1 | 3 | 2 | 2 | 5 | 1 |
| **C15** | 1 | 3 | 1 | 3 | 2 | 3 | 1 | 3 | 1 | 3 | 1 | 3 | 3 | 1 | · | 1 | 1 | 1 | 1 | 5 |
| **C16** | 2 | 1 | 2 | 1 | 1 | 1 | 2 | 1 | 3 | 1 | 1 | 1 | 1 | 3 | 1 | · | 5 | 5 | 3 | 1 |
| **C17** | 2 | 1 | 2 | 1 | 1 | 1 | 2 | 1 | 2 | 1 | 1 | 1 | 1 | 2 | 1 | 5 | · | 5 | 2 | 1 |
| **C18** | 2 | 1 | 2 | 1 | 1 | 1 | 2 | 1 | 2 | 1 | 1 | 1 | 1 | 2 | 1 | 5 | 5 | · | 2 | 1 |
| **C19** | 2 | 1 | 2 | 1 | 1 | 1 | 2 | 1 | 5 | 1 | 1 | 3 | 3 | 5 | 1 | 3 | 2 | 2 | · | 1 |
| **C20** | 1 | 2 | 1 | 3 | 2 | 3 | 1 | 3 | 1 | 3 | 1 | 3 | 2 | 1 | 5 | 1 | 1 | 1 | 1 | · |

## Clusters

| Cluster | Missions | Shared components | Similarity |
| --- | --- | --- | ---: |
| Lima reuse | C9, C14, C19 | `LIMA_HEIGHTMAP`, `colonial_site`, `central_coast`, morning, same site anchor | 5 |
| Arica reuse | C16, C17, C18 | `ARICA_HEIGHTMAP`, `arica_site`, coastal terrace; C17/C18 also `south_coast` | 5 |
| Cusco Inca reuse | C8, C10 | `CUSCO_HEIGHTMAP`, `cusco_inca_site`, `high_andes`, morning | 5 |
| Independence reuse | C15, C20 | `INDEPENDENCE_HEIGHTMAP`, `independence_site`, morning | 5 |
| Chanca reuse | C6, C11 | `CHANCA_HEIGHTMAP`, `chanca_site`; region/vegetation differ | 4 |
| Cusco colonial pair | C12, C13 | `colonial_site`, Cusco colonial templates, shared palette family | 4 |
| High Andes family | C4, C6, C8, C10, C12, C20 | `high_andes`, shared palette, shared generic vegetation, shared atmosphere | 3 |
| Central coast family | C1, C9, C14, C16, C19 | `central_coast`, shared palette/vegetation/atmosphere; C1 has a unique site/palette | 2–5 |
| North coast family | C3, C7 | `north_coast`, shared palette/vegetation, canal | 3 |
| Andean valley family | C2, C13, C15 | `andean_valley`; C13/C15 fall into it by civilization default | 3 |
| Pampa group | C6, C8, C15, C20 | Open grassland, sparse trees, no authored hydrology | 3 |
| Coastal valley group | C1, C3, C7 | Coast + river/canal + caral vegetation kit | 2–3 |

## Pairs at 4 or 5

These pairs are effectively the same place to a player who does not read the mission name:

| Pair | Score | What is shared |
| --- | ---: | --- |
| C9 ↔ C14 | 5 | Heightfield, site, palette, vegetation, morning |
| C9 ↔ C19 | 5 | Heightfield, site model, palette, vegetation, morning |
| C14 ↔ C19 | 5 | Heightfield, site model, palette, vegetation, morning |
| C16 ↔ C17 | 5 | Heightfield, site model, coastal terrace |
| C16 ↔ C18 | 5 | Heightfield, site model, coastal terrace |
| C17 ↔ C18 | 5 | Heightfield, site model, coastal terrace |
| C8 ↔ C10 | 5 | Heightfield, `cusco_inca_site`, palette, morning |
| C15 ↔ C20 | 5 | Heightfield, `independence_site`, palette, morning |
| C6 ↔ C11 | 4 | Heightfield and `chanca_site`; only region/vegetation differ |
| C12 ↔ C13 | 4 | `colonial_site`, Cusco colonial templates |

## Current state (2026-11-19, after phases 1-3)

The audit snapshot above is history. Eight missions now run their own field **and their own paint**, so the
pairs that scored 5 are no longer the same place even though they still share the site model:

| Pair | Audit | Now | What separates them |
| --- | ---: | ---: | --- |
| C9 ↔ C14 (Lima 1535 / 1821) | 5 | **4** | different heightfield and paint (oasis city vs 1821 river crossing); same site model and coast |
| C9 ↔ C19 (Lima 1535 / Miraflores) | 5 | **4** | different heightfield (redoubt line and headland); same site model |
| C14 ↔ C19 (1821 / Miraflores) | 5 | **4** | different relief and paint; same coast family |
| C16 ↔ C17 (Callao / Tarapacá) | 5 | **3** | share `arica_site`, but Callao is `central_coast` and Tarapacá `south_coast`, with their own fields |
| C16 ↔ C18 (Callao / Arica) | 5 | **3** | share `arica_site`, different region/palette and Callao has its own bay field |
| C17 ↔ C18 (Tarapacá / Arica) | 5 | **4** | dry quebrada vs coastal terrace |
| C8 ↔ C10 (Quipaipan / Cusco 1536) | 5 | **4** | pampa vs basin with Sacsayhuamán |
| C15 ↔ C20 (Independence / Breña) | 5 | **4** | Mantaro valley and dry wash vs the Junín plain |
| C6 ↔ C11 (Yahuar Pampa / Vilcabamba) | 4 | **3** | only the `chanca_site` model is shared: Vilcabamba has its own field and is `amazon` vs `high_andes` |

Nothing scores 5 any more. The remaining 4s keep the same field family plus the same region/palette; the 3s
share only the site model. By the scale above, 4 is "same site model plus the same region/palette, one major
layer differs" — which is exactly the state after the heightfield and paint splits.

## Close-out (2026-11-19)

The geographic-identity close-out finished the three pairs the brief singled out and re-ran the blind test on
the result. Captures use the same camera (site anchor, zoom 78), 1600 × 900, HUD and in-world place names
hidden (`yarn shot … --no-hud --no-labels`); the blind sheet is
[`geographic-identity-closeout.webp`](../media/geographic-identity-closeout.webp).

| Pair | What separates them now | Score (was) |
| --- | --- | ---: |
| C11 ↔ C8 (Vilcabamba / Quipaipan) | A wet, meandering Urubamba with one ford, forested walls (400 visual-only canopy trees) and a painted gravel floor, against a waterless olive pampa cut by a dry arroyo; different macro-region (`amazon` vs `high_andes`) | **1** (1) |
| C14 ↔ C19 (Lima 1821 / Miraflores) | A grid-like layout of colonial houses along the roads around the church (roads + site model, no grid generator), against a camp and earthwork redoubt line on the coastal plain; still the same `colonial_site` model, coast and Rímac | **4** (4) |
| C16 ↔ C17 (Callao / Tarapacá) | The bay now reaches the Real Felipe terrace, so the fortress frame reads maritime; Tarapacá is now a real inland quebrada (a ~32 m gravel floor with ~4.8 m banks and its village oasis) with no water. The `arica_site` model is still shared | **2** (3) |

**Blind test (six missions, three builds).** Six labels-off site captures were matched against six geography
briefs, each mission used once. The reviewers are independent agents with no access to this document; they are
not human players, which is the main limitation of this round.

| Build | Reviewer 1 | Reviewer 2 | What was wrong |
| --- | ---: | ---: | --- |
| First build (no bay in the Callao frame) | 4/6 | 4/6 | Miraflores ↔ Callao: the fortress frame had no water, the redoubt camp had the coast |
| After the Callao bay | 6/6 | 6/6 | — |
| After the canopy and the Urubamba palette | 4/6 | 4/6 | Tarapacá ↔ Quipaipan: both read as an arid plain, and Tarapacá's gravel bed matched Quipaipan's brief |
| Final build (Tarapacá quebrada with banks) | 6/6 | 6/6 | — |

Two fixes came straight out of those rows. The Callao bay was moved into the fortress frame (geometry only:
the bight reaches the terrace; the siege camp and both battery sites stay dry, and the `m_real_felipe` E2E
still builds both batteries). Tarapacá's quebrada became a real dry valley (a ~32 m gravel floor, ~4.8 m of
bank relief, the village oasis on its floor) instead of a shallow dip, which separated it from Quipaipan
without touching Quipaipan's own pampa. Every round was re-run on the build it describes; the final row is
the shipped build.

**Grayscale.** The six captures were converted to grayscale (Pillow `ImageOps.grayscale`) and reviewed: the
site footprint, the objective ring and the river/wash remain the dominant shapes in every pair. The weakest
case is Quipaipan, whose dry arroyo loses contrast in grayscale; its identity there rests on the open pampa
silhouette and the stepped platform, not on the wash.

**Fog of war.** The close-out also fixed a pre-existing gap: the water plane ignored the fog-of-war mask, so an
unexplored river or bay stayed visible as a bright band. `Water` now samples the same `fowMap` as the terrain.
Static props (rocks, shrubs) and the objective ring still ignore the mask; that is unchanged and documented as a
known limitation.

## Same-topography groups (audit snapshot)

| Topography | Missions |
| --- | --- |
| Flat coastal terrace + sea west | C16, C17, C18 |
| Flat plain/basin with a single authored site | C4, C6, C8, C10, C12, C15, C20 |
| Green valley with a river and a colonial site | C9, C14, C19 |
| Open pampa with a site and scattered trees | C6, C8, C15 |
| Flat grass with a dry channel and palms | C11 (the only jungle mission) |

## Same-composition group

Seven missions place the player base at approximately `(0.35, 0.62)` and the site/enemy at
`(0.70, 0.38)`: C6, C7, C12, C15, C16, C18 and C20. The same diagonal axis survives the change of seed.
C9/C14/C19 and C16/C17/C18 repeat their own axes exactly because they share the site anchor.

## Colour and atmosphere dependence

- The six `high_andes` missions share the same palette and the same regional atmosphere. The visible
  differences are time of day, colour grade and labels.
- `north_coast` and `central_coast` use identical terrain-material multipliers and almost identical bands.
- Only `m1_caral` and `m2_chavin` define a mission-level `MissionAtmosphere`; the others inherit the
  regional one.
- Only `m_tambotoco` opts into the `andes` vegetation kit. All other inland missions use procedural
  `broad`/`needle`/`frond` trees.

**Reading the scores:** a mission that scores 4–5 because its palette or lighting differs is not
geographically differentiated. It is the same map in another grade. That failure mode is what the
proposal in [`mission-geographic-identity.md`](./mission-geographic-identity.md) targets; it is an
observation of this snapshot, not a rule for the current build.
