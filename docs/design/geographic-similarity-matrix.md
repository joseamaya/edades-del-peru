# Geographic similarity matrix

**Status:** Snapshot · **Audited:** 2026-11-18 · **Scope:** the 20 released missions

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
| **C16** | 2 | 1 | 2 | 1 | 1 | 1 | 2 | 1 | 3 | 1 | 1 | 1 | 1 | 3 | 1 | · | 2 | 2 | 3 | 1 |
| **C17** | 2 | 1 | 2 | 1 | 1 | 1 | 2 | 1 | 2 | 1 | 1 | 1 | 1 | 2 | 1 | 2 | · | 5 | 2 | 1 |
| **C18** | 2 | 1 | 2 | 1 | 1 | 1 | 2 | 1 | 2 | 1 | 1 | 1 | 1 | 2 | 1 | 2 | 5 | · | 2 | 1 |
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

## Same-topography groups

| Topography | Missions |
| --- | --- |
| Flat coastal terrace + sea west | C16, C17, C18 |
| Flat plain/basin with a single authored site | C4, C6, C8, C10, C12, C15, C20 |
| Green valley with a river and a colonial site | C9, C14, C19 |
| Open pampa with a site and scattered trees | C6, C8, C15 |
| Flat grass with a pond and palms | C11 (the only jungle mission) |

## Same-composition group

Seven missions place the player base at approximately `(0.35, 0.62)` and the site/enemy at
`(0.70, 0.38)`: C6, C7, C12, C15, C16, C18 and C20. The same diagonal axis survives the change of seed.
C9/C14/C19 and C16/C17/C18 repeat their own axes exactly because they share the site anchor.

## Colour and atmosphere dependence

- Six `high_andes` missions share the same palette and the same regional atmosphere. The visible
  differences are time of day, colour grade and labels.
- `north_coast` and `central_coast` use identical terrain-material multipliers and almost identical bands.
- Only `m1_caral` and `m2_chavin` define a mission-level `MissionAtmosphere`; the others inherit the
  regional one.
- Only `m_tambotoco` opts into the `andes` vegetation kit. All other inland missions use procedural
  `broad`/`needle`/`frond` trees.

**Rule:** a mission that scores 4–5 because its palette or lighting differs is not geographically
differentiated. It is the same map in another grade.
