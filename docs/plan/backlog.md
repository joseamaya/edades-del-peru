# Development backlog

**Status:** living · **Last updated:** 2026-11-14

A short, ordered queue for the current roadmap. This is not a second issue tracker: when an item has a
GitHub issue or PR, link it here instead of copying the discussion. The live mission status is in
[`../design/campaign-quality-bar.md`](../design/campaign-quality-bar.md).

## Queue

| # | Item | Why now | Acceptance | Status |
| --- | --- | --- | --- | --- |
| B0 | Documentation foundation | There was no entry point to the docs, no ADR log and no roadmap | `docs/README.md`, `docs/GDD.md`, `docs/DECISIONS/` and `docs/plan/` exist, links resolve, and `AGENTS.md`/`README.md`/`CONTRIBUTING.md` point to them | In review |
| B1 | Merge the `m5_yahuar_pampa` model-mission rebuild | The rebuild is already in progress on a separate branch | The branch passes the quality bar, its model-mission doc is merged and the audit row is updated | In progress (external branch) |
| B2 | Rebuild `m6_chimu_inca` | It is pre-model: no acts, intro, 256 m map or bench | Quality bar gates pass; `chimu-inca-model-mission.md` exists; audit updated | Next (after B1) |
| B3 | Rebuild `m6b_guerra_civil` | Same as B2 | Quality bar gates pass; model-mission doc exists; audit updated | Queued |
| B4 | Rebuild `m8_independencia` | Same as B2, with the weakest current row | Quality bar gates pass; model-mission doc exists; audit updated | Queued |
| B5 | Review the pending art records | Several renders are hidden or block a release | Every `reviewed: false` record is approved or rejected; the decision is recorded with `yarn art:review`; captures are current | Queued |
| B6 | Site-specific real-GPU performance pass | The `mixed` benchmark has a real-GPU pass, but the Moche/Wari site views are still measured on software rendering | Frame time and draw calls are recorded at 1280×800 and 1600×900; a decision is documented | Queued |
| B7 | Package the itch build | The Pages build exists; the itch upload was deferred | The package is built from the release commit, checked and uploaded with `butler` | Blocked (tooling) |
| B8 | Character bible and asset-pipeline cookbook | Character design is scattered and the Blender pipeline has no single "start here" | `docs/design/characters.md` and a pipeline quickstart are linked from the map | Deferred (next documentation cycle) |
| B9 | Reconcile the Caral art-review line in the quality bar | Its work order still lists Caral's camp pieces/Act III card, while its verdict records them closed on 2026-11-14. The file is owned by the m5 branch, so do not edit it from another branch | The work order mentions only the Chavín kit; the verdict and work order agree | Queued (after B1) |

## Rules for the queue

- **One model-mission rebuild at a time.** B1 is owned by another branch; do not start B2 until B1 merges.
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
