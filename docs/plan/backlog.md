# Development backlog

**Status:** living · **Last updated:** 2026-11-16

A short, ordered queue for the current roadmap. This is not a second issue tracker: when an item has a
GitHub issue or PR, link it here instead of copying the discussion. The live mission status is in
[`../design/campaign-quality-bar.md`](../design/campaign-quality-bar.md).

## Queue

| # | Item | Why now | Acceptance | Status |
| --- | --- | --- | --- | --- |
| B0 | Documentation foundation | There was no entry point to the docs, no ADR log and no roadmap | `docs/README.md`, `docs/GDD.md`, `docs/DECISIONS/` and `docs/plan/` exist, links resolve, and `AGENTS.md`/`README.md`/`CONTRIBUTING.md` point to them | In review (this PR) |
| B6 | Real-GPU pass for the remaining model-mission site views | m1, m2, Tambotoco and Lima openings are already in #447; the site views of m3–m9, m6b and La Junta still rest on structural SwiftShader benches | Frame time and draw calls are recorded at 1280×800 and 1600×900; a decision is documented | Queued |
| B12 | Tambotoco art-direction pilot | Tambotoco replaces Caral as the visual reference; the 2026-11-16 kit pass is the baseline, not the target | E0–E6 of [`../design/tambotoco-art-pilot.md`](../design/tambotoco-art-pilot.md) close: art direction and pilot docs, light/terrain, architecture (E2a/E2b done), highland vegetation (E3a done), soft banks/ford and paths (E3b done), common variants and the Manco GLB (E4 done), cinematic beats, 3 × 3 captures, bench and human approval | In progress (E5) |
| B7 | Package the itch build | The Pages build exists; the itch upload was deferred | The package is built from the release commit, checked and uploaded with `butler` | Blocked (tooling) |

## Closed this cycle

| # | Item | Result |
| --- | --- | --- |
| B5 | Review the pending art records | Closed 2026-11-16: no record in `src/art/manifest.json` is `reviewed: false`; the five Caral records were approved and the three Workbench mission intros were removed |
| B10 | Reconcile the five Caral `reviewed: false` records | Closed with B5; the manifest and the quality bar agree |
| B1 | `m5_yahuar_pampa` model-mission rebuild | Merged (`0ee077e`) |
| B2 | `m6_chimu_inca` model-mission rebuild | Merged (`cb1b7e5`) |
| B3 | `m6b_guerra_civil` model-mission rebuild | Merged (`6938884`) |
| B4 | `m8_independencia` model-mission rebuild | Merged (`d52bb32`) |
| B9 | Caral art-review line in the quality bar | Fixed in this PR |
| B8 | Character bible and asset-pipeline cookbook | Done in this PR: `docs/design/characters.md` and `docs/design/asset-pipeline.md` |
| B11 | Terrain receives directional shadows | Closed 2026-11-16 (E1): the terrain material declares `lights: true` and samples the PCF shadow map; E1 structural bench 437,976/264 and 614,594/357, within caps. |

## Rules for the queue

- **No model-mission rebuild remains.** B1–B4 closed on 2026-11-14; the queue now starts at art review and
  release.
- **Definition of ready:** the mission has a historical dossier, a certainty table, an agreed mechanic and a
  named owner.
- **Definition of done:** every quality-bar gate passes, the model-mission document is merged, the audit row
  is updated, the playtest and captures are current, and the PR says what could not be verified.
- **Do not duplicate work.** Check open branches and PRs before starting a rebuild; update this table when an
  item changes state.
- **Do not add a new mission** to this queue without an approved dossier and an explicit scope decision; the
  campaign redesign is approved design, not committed scope.

## Parking lot

Ideas that are explicitly **not** scheduled:

- Ships, a selva biome and a seasonal calendar (they gate future missions, not the current 13).
- A public skirmish UI, multiplayer or a map editor.
- New runtime dependencies or MCP servers.
- New missions from `campaign-redesign.md`.
