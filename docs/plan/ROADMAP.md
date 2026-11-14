# Development roadmap

**Status:** living · **Last updated:** 2026-11-14

This is the engineering roadmap, not the content proposal. The live per-mission status is
[`../design/campaign-quality-bar.md`](../design/campaign-quality-bar.md); the future campaign structure is
[`../design/campaign-redesign.md`](../design/campaign-redesign.md).

## Where we are

- **Release:** `0.1.0`, campaign-only, five campaigns and thirteen missions.
- **Gold master:** Caral (`m1_caral`) meets every gate of the campaign quality bar.
- **On the pattern, art pending:** Chavín, Tambotoco, Lima and La Junta.
- **Promoted in the 2026-11-14 pass:** Moche, Wari, Túpac Amaru and Arica (scale, opening and performance
  gates; human art review pending).
- **Model-mission rebuild in progress:** `m5_yahuar_pampa` is being rebuilt on a separate branch. Do not start
  a second rebuild of the same mission; merge that work before updating its row in the quality bar.
- **Still pre-model:** `m6_chimu_inca`, `m6b_guerra_civil` and `m8_independencia`.
- **Open release work:** human art review, a site-specific real-GPU performance pass and the itch package.

The audit is the authority. If this summary and the quality bar disagree, the quality bar wins.

## Milestones

| Milestone | Scope | Exit criterion |
| --- | --- | --- |
| **D0 · Documentation foundation** | Documentation map, GDD, ADR log, roadmap and backlog | A new contributor or agent can find the owner document for a task without asking; links resolve |
| **D1 · Close the model-mission gap** | `m5` (external branch), `m6`, `m6b`, `m8` | Every mission on the model list passes the quality bar; the audit is updated; each mission has a model-mission document |
| **D2 · Art review and capture** | Pending `reviewed: false` records, the Chavín contact sheet, art of the promoted missions | No unreviewed record ships; the human review is recorded; the captures are current |
| **D3 · Real-GPU performance** | Moche/Wari and the heaviest late-game views | A measured pass at 1280×800 and 1600×900 is recorded; optimization work is either scheduled or explicitly rejected |
| **D4 · Release packaging** | itch build, Pages artifact, publish checklist | The checklist is green on a build that matches the tagged commit |

## D1 · Work order

1. Merge the `m5_yahuar_pampa` rebuild that is already in progress on its own branch.
2. Rebuild `m6_chimu_inca`: 256 m transect, acts, intro, bench scene, certainty table and model-mission doc.
3. Rebuild `m6b_guerra_civil` to the same standard.
4. Rebuild `m8_independencia` to the same standard.
5. Re-run the quality-bar audit and update the matrix.

One rebuild at a time. Each rebuild is a large change: it needs its own branch, its own playtest, its own
captures and its own quality-bar row. Do not start the next one until the previous one is merged.

## D2 · Art review order

1. Chavín kit: record the human review. Caral's camp pieces and its Act III card were approved and closed on
   2026-11-14; do not re-review them.
2. Review every remaining `reviewed: false` record; the archived release snapshot lists the set as of
   2026-10-30. Approve or reject each record with `yarn art:review`.
3. Capture the promoted missions (Moche, Wari, Túpac Amaru, Arica) with the current build.

The release-candidate document is an **archived snapshot** from 2026-10-30. Use its checklist as a template,
but record today's counts and hashes in a new status document or PR, not by editing the snapshot.

## D3 · Performance

The `mixed` benchmark already has a real-GPU pass (`yarn bench --gpu`, Intel iGPU), recorded in
[`../development/performance-audit.md`](../development/performance-audit.md). The remaining gap is the
**Moche and Wari site views**, which the archived release snapshot still lists as measured on software
rendering.

The next pass must run on a real GPU and record:

- draw calls, triangles, meshes and materials per site;
- frame time at 1280×800 and 1600×900;
- the effect of the quality governor and of `?low=1`;
- a decision: optimize geometry/materials, lower the target, or accept the measured result.

`yarn bench:check` validates structural budgets; it is not a GPU benchmark.

## D4 · Release

- Build the Pages artifact and the itch package from the same commit.
- Re-run `yarn verify:fast`, the required E2E tier, `yarn art:validate` and `yarn dist:check`.
- Attach the current captures and the performance numbers.
- Tag the release and update the version. Keep `localStorage` keys and mission ids stable.

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Documentation drifts from code | Agents follow stale rules | Living docs are updated in the same PR; snapshots are labelled; the map is the entry point |
| Art review becomes the bottleneck | Renders stay hidden or block a release | Review in batches with a contact sheet; `yarn art:review` records the decision |
| Two branches rebuild the same mission | Wasted work and conflicts | One model-mission rebuild at a time; check the quality bar and open PRs before starting |
| No real GPU available | Performance decisions rest on software rendering | Schedule a reference-hardware pass; do not present SwiftShader numbers as a GPU verdict |
| Scope creep from the campaign redesign | The 13 released missions never close | The redesign is approved design, not committed scope; new missions need a dossier, a branch and an explicit approval |

## Non-goals for this cycle

- Adding the missions proposed in `campaign-redesign.md`.
- Ships, a selva biome or a seasonal calendar (they gate future missions, not the current 13).
- A public skirmish UI, multiplayer or a map editor.
- New runtime dependencies or MCP servers.

## Updating this roadmap

The project author updates this document when a milestone closes or the active phase changes. A model-mission
rebuild updates the quality bar and its own design document in the same PR; it does not rewrite this roadmap
unless it changes the milestone.
