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
| No significant performance regression | done | `scripts/bench.mjs`; landscape budget assertion still **pending** |
| Historical docs updated | done | `docs/historia/mapas.md`, `arquitectura.md` |
| `PROVENANCE.md` updated | done | `PROVENANCE.md` |
| README has no misleading claims | done | PR #54 (dropped "100% procedural" / absolute accuracy) |
| typecheck / lint / tests / build / E2E | done | CI (`.github/workflows/ci.yml`) |

### Remaining work

- **Cultural-landscape phase 5**: assert the landscape's draw-call budget in `scripts/bench.mjs`.
- **SettlementGenerator full plan**: roads, starting farms/dropsites and defense (`docs/design/settlement-generator.md`).
- **§7 (optional)**: slope-based movement cost and bridges (mountains/rivers/valleys/height already shape play).
- **Building audit follow-ups** (§12): the `minEra` gates listed below.
- **Unit-crowding pathfinding**: a tight cluster ordered onto a target can wedge against a destroyed building's ruins (surfaced while testing the settlement layout).
- **Science-fiction unit**: `UnitKind.MECH` (see below).

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
| `arsenal` | Arsenal | military | **anachronistic availability** | `minEra FORMATIVE` but trains firearms (Musketeer/Rifleman/Sniper); the units are chronology-gated, the building/name is not |
| `stable` | Establo | military | **anachronistic availability** | `minEra FORMATIVE` with a horse name/icon/description; horses are forbidden before 1532 (units are gated to `VICEROYALTY`) |
| `factory` | Taller de Artillería | military | **anachronistic availability** | `minEra REGIONAL_STATES` but trains artillery/mortar/nuclear; units are gated |
| `fortress` | Pucará | defense | historically appropriate | Andean hillfort; **trains `MECH` (sci-fi) — see below** |
| `market` | Mercado | economy | historically appropriate | exchange/trade (Chincha) |
| `institute` | Yachaywasi | advance | visually inconsistent | an Inca "house of learning" name reused unchanged in the Viceroyalty/Republic |
| `farm` | Andén | economy | historically appropriate | terraced agriculture; same pre-modern model across eras |
| `wonder` | Huaca Sagrada | special | appropriate (with a field caveat) | era-agnostic stepped huaca (fixed in #53); `minEra CONTEMPORARY` is inconsistent with `Game.canBuildKind`, which allows it in any era in wonder mode |

**Model naming (not a defect):** the `eraModel.type` strings keep a generic
`steam/imperial/atomic/information/stellar` (and `plant_*` / `exchange_*`) naming
from the original skeleton. Visual identity is driven by the architecture profile,
so these are *generic but acceptable*; renaming them is cosmetic.

**Recommended follow-ups** (not in this PR): gate `stable`/`arsenal`/`factory` to
their real periods (or give them era-appropriate names/models, e.g. a pre-1532
caravan/corral for `stable`), and align the `wonder` `minEra` field.

## Adjacent flag: science-fiction units

`AGENTS.md` forbids sci-fi *in any era*. Two `UnitKind`s are borderline:

| UnitKind | Comment | Trainable from | `minPeriod` | Verdict |
|---|---|---|---|---|
| `MECH` (`'mec'`) | "unique futuristic unit" | `fortress` (tech `mec`) | `CONTEMPORARY` | **sci-fi** — violates the invariant; recommend removing or re-theming |
| `NUCLEAR` | "atomic-era tactical weapon (area)" | `factory` (tech `cohetería`) | `CONTEMPORARY` | real-world nuclear (1945+) fits `CONTEMPORARY`; acceptable, flagged for review |

Projectile kinds `laser` and `rail` exist only in the mod schema
(`src/game/mods/schema.ts`), not in the base game. Recorded here for completeness.

## Non-goals

This document is a snapshot; it does not change gameplay. The `minEra` and sci-fi
follow-ups above are proposals to be scheduled, each as its own small change with
tests. The history invariant is unchanged: no invented names, dates or battles;
abstractions are labelled as such.
