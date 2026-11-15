# Development backlog

**Status:** living · **Last updated:** 2026-11-14

A short, ordered queue for the current roadmap. This is not a second issue tracker: when an item has a
GitHub issue or PR, link it here instead of copying the discussion. The live mission status is in
[`../design/campaign-quality-bar.md`](../design/campaign-quality-bar.md).

## Queue

| # | Item | Why now | Acceptance | Status |
| --- | --- | --- | --- | --- |
| B0 | Documentation foundation | There was no entry point to the docs, no ADR log and no roadmap | `docs/README.md`, `docs/GDD.md`, `docs/DECISIONS/` and `docs/plan/` exist, links resolve, and `AGENTS.md`/`README.md`/`CONTRIBUTING.md` point to them | In review (this PR) |
| B5 | Review the pending art records | Several renders are hidden or block a release | Every `reviewed: false` record is approved or rejected; the decision is recorded with `yarn art:review`; captures are current | Next |
| B6 | Site-specific real-GPU performance pass | The `mixed` benchmark has a real-GPU pass, but the Moche/Wari site views are still measured on software rendering | Frame time and draw calls are recorded at 1280×800 and 1600×900; a decision is documented | Queued |
| B7 | Package the itch build | The Pages build exists; the itch upload was deferred | The package is built from the release commit, checked and uploaded with `butler` | Blocked (tooling) |
| B8 | Character bible and asset-pipeline cookbook | Character design is scattered and the Blender pipeline has no single "start here" | `docs/design/characters.md` and a pipeline quickstart are linked from the map | Deferred (next documentation cycle) |

## Closed this cycle

| # | Item | Result |
| --- | --- | --- |
| B1 | `m5_yahuar_pampa` model-mission rebuild | Merged (`0ee077e`) |
| B2 | `m6_chimu_inca` model-mission rebuild | Merged (`cb1b7e5`) |
| B3 | `m6b_guerra_civil` model-mission rebuild | Merged (`6938884`) |
| B4 | `m8_independencia` model-mission rebuild | Merged (`d52bb32`) |
| B9 | Caral art-review line in the quality bar | Fixed in this PR |

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
