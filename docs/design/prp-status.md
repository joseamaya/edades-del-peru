# PRP status & building audit

A point-in-time audit of the map/architecture/landscape PRP: the **Definition of
Done checklist (§27)**, the **building classification (§12)** and the adjacent
science-fiction flag on unit kinds. It records the state and the remaining work;
it is documentation only (no behavioural change).

Sources: the code under `src/`, the tests under `tests/`, the scripts under
`scripts/`, and the dossiers in [`docs/historia/`](../historia/).

## Definition of Done (§27)

| Requirement (§27) | Status | Evidence |
|---|---|---|
| Explicit period / civilization / region representation | done | `HistoricalPeriod`/`Era` (`core/types.ts`), `GeographicRegion` + `HistoricalMapProfile` (`model/defs/profiles.ts`), `CIVS` (`civs.ts`) |
| Maps have historical profiles | done | `MAP_PROFILES` / `resolveMapProfile`; `heightField.ts` |
| Coast / Andes / Altiplano differ beyond colour | done | per-region terrain+climate+vegetation (`profiles.ts`), terrain shader (`Terrain.ts`), landscape features (`landscape.ts`) |
| A cultural-landscape layer exists | done | `model/defs/landscape.ts`, `landscapePlan.ts`, `rendering/CulturalLandscape.ts` |
| Architecture really changes per civilization | done | `architecture.ts` (`archProfileFor`, `CIV_ARCH`), consumed by `ProceduralModel.ts` |
| Caral / Moche / Inca have their own identity | done | `tests/profiles.test.ts`, `tests/e2e/civ-visuals.spec.ts`, `scenes.mjs` |
| Significant landmarks exist | done | 19 landmarks with source + status (`landmarks.ts`), `spawnLandmark` |
| Settlements have spatial logic | **partial** | `planSettlement` lays out the starting dwellings from the terrain (`settlementPlan.ts`); roads, farms, dropsites and defense are still deferred |
| Generation is deterministic | done | `heightField.ts` is pure; `tests/terrain.test.ts`; own RNGs |
| Maps are still procedural | done | FBM/rivers/terraces/canals (`heightField.ts`) |
| Existing campaigns work | done | `tests/e2e/campaign-*.spec.ts` |
| Existing tests pass | done | `yarn test` |
| Relevant new tests added | done | profiles/terrain/landscape/settlement/combat/farm-yield + e2e |
| Comparable screenshots exist | done | `scripts/visual.mjs` + `scenes.mjs` (25 scenes), `tests/visual/baseline.json` |
| No significant performance regression | **partial** | `scripts/bench.mjs` shows draw calls / sim time flat, but the landscape draw-call budget assertion is still pending |
| Historical docs updated | done | `docs/historia/mapas.md`, `arquitectura.md` |
| `PROVENANCE.md` updated | done | `PROVENANCE.md` |
| README has no misleading claims | done | PR #54 (dropped "100% procedural" / absolute accuracy) |
| typecheck / lint / tests / build / E2E | done | CI (`.github/workflows/ci.yml`) |

### Remaining work

- **Cultural-landscape phase 5**: assert the landscape's draw-call budget in `scripts/bench.mjs`.
- **SettlementGenerator full plan**: roads, starting farms/dropsites and defense (`docs/design/settlement-generator.md`).
- **§7 (optional)**: slope-based movement cost and bridges (mountains/rivers/valleys/height already shape play).
- **Building audit follow-ups** (§12): resolved — `stable`/`factory` gated to `VICEROYALTY`, `wonder.minEra` aligned; see below.
- ~~Unit-crowding pathfinding~~: fixed — `Pathfinder.rebuild` keeps the terrain mask and `Unit.updateAttack` closes in when its route is exhausted; a clustered army now razes the base (`tests/e2e/skirmish-winnable.spec.ts`).
- ~~Science-fiction unit~~: `UnitKind.MECH` removed (see below).

## Building audit (§12)

Classification of the 15 `BuildingKind`s (`types.ts:94`, defs in
`model/defs/buildings.ts`) against the historical invariants in `AGENTS.md`.

| BuildingKind | In-game name | Category | Classification | Notes |
|---|---|---|---|---|
| `center` | Plaza Mayor | economy | generic but acceptable | per-era `eraModel` names are legacy (`center_steam/imperial/atomic/information/stellar`); identity comes from the architecture profile |
| `house` | Vivienda | economy | generic but acceptable | same legacy naming |
| `mill` | Troje | economy | historically appropriate | food storehouse (pre-Hispanic *troje*) |
| `sawmill` | Aserradero | economy | generic but acceptable | modern name for the wood drop-off; modelled with the era's architecture |
| `smelter` | Platería | economy | historically appropriate | silver working (Andean metallurgy) |
| `refinery` | Cantera | economy | historically appropriate | stone quarry, `minEra TAHUANTINSUYO` |
| `barracks` | Casa del Guerrero | military | historically appropriate | trains Amauta / Misionero (era-gated) |
| `arsenal` | Arsenal | military | generic but acceptable | `minEra FORMATIVE`; trains Hondero (sling), Tirador, Cazador (`VICEROYALTY`) and Artillero Antiaéreo (`CONTEMPORARY`) — ranged, not firearms. The modern "Arsenal" name is reused across eras |
| `stable` | Establo | military | appropriate (gated) | `minEra VICEROYALTY`; Jinete/Caballería (`VICEROYALTY`), Ariete (`CONTEMPORARY`) — no horses before 1532. The pre-Hispanic Chasqui is trainable at the `center` instead |
| `factory` | Taller de Artillería | military | appropriate (gated) | `minEra VICEROYALTY`; Artillería/Mortero (`VICEROYALTY`), Cohetes (`CONTEMPORARY`) |
| `fortress` | Pucará | defense | historically appropriate | Andean hillfort (defensive; no unit training after the sci-fi `MECH` was removed) |
| `market` | Mercado | economy | historically appropriate | exchange/trade (Chincha) |
| `institute` | Yachaywasi | advance | visually inconsistent | an Inca "house of learning" name reused unchanged in the Viceroyalty/Republic |
| `farm` | Andén | economy | historically appropriate | terraced agriculture; same pre-modern model across eras |
| `wonder` | Huaca Sagrada | special | appropriate | era-agnostic stepped huaca (fixed in #53); `minEra` is a dead field (`Game.canBuildKind` allows it in any era in wonder mode) and now reads `FORMATIVE` to match |

**Model naming (not a defect):** the `eraModel.type` strings keep a generic
`steam/imperial/atomic/information/stellar` (and `plant_*` / `exchange_*`) naming
from the original skeleton. Visual identity is driven by the architecture profile,
so these are *generic but acceptable*. Some names are **sci-fi-flavoured**
(`*_stellar`, `farm_future`); they are model identifiers only, but should be
reviewed against the "no sci-fi in any era" invariant.

**Recommended follow-ups** (not in this PR): give `stable`/`factory` era-appropriate
names/models (e.g. a pre-1532 caravan/corral for `stable`) if they are ever reopened
before 1532, and consider a per-era label for `arsenal`.

## Adjacent flag: science-fiction units

`AGENTS.md` forbids sci-fi *in any era*. Two `UnitKind`s are borderline:

| UnitKind | Comment | Status |
|---|---|---|
| `MECH` (`'mec'`, "Guardián Blindado") | declared "unique futuristic unit" | **removed** — was sci-fi and reachable in the Contemporary period, violating the invariant |
| `NUCLEAR` ("Artillería de Cohetes") | "atomic-era tactical weapon (area)" | kept — real-world rocket artillery fits `CONTEMPORARY` |

Projectile kinds `bullet`, `rocket`, `howitzer_shell`, `laser`, `rail`, `nuclear`
and `tracer` are declared in the **base** game (`ModelSpec.projectile`); `NUCLEAR`
fires `nuclear`. With `MECH` removed, `rail` and `laser` are declared but unused by
any base-game unit (the mod schema also lists them). Recorded for completeness.

## Non-goals

This document is a snapshot; it does not change gameplay. The `minEra` and sci-fi
follow-ups above are proposals to be scheduled, each as its own small change with
tests. The history invariant is unchanged: no invented names, dates or battles;
abstractions are labelled as such.
