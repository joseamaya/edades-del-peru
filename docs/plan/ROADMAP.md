# Development roadmap

**Status:** living · **Last updated:** 2026-11-14

This is the engineering roadmap, not the content proposal. The live per-mission status is
[`../design/campaign-quality-bar.md`](../design/campaign-quality-bar.md); the future campaign structure is
[`../design/campaign-redesign.md`](../design/campaign-redesign.md).

## Where we are

- **Release:** `0.1.0`, campaign-only, five campaigns and thirteen missions.
- **Gold master:** Caral (`m1_caral`) meets every gate of the campaign quality bar.
- **Model pattern:** every released mission follows it after the m5–m9, m6b and m8 rebuilds (closed
  2026-11-14); all thirteen missions have a model-mission document.
- **Performance:** m3–m9 and m6b meet the scale, opening and performance gates; the m3, m4, m5, Tambotoco,
  Lima, La Junta and Arica intro renders are approved, and the rest of the art review is pending.
- **Art pending:** Chavín, Chimú, the civil war, Túpac Amaru and Independencia still lack mostly art.
- **Open release work:** human art review, a site-specific real-GPU performance pass and the itch package.

The audit is the authority. If this summary and the quality bar disagree, the quality bar wins.

## Milestones

| Milestone                            | Scope                                                                                                                        | Exit criterion                                                                                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D0 · Documentation foundation**    | Documentation map, GDD, ADR log, roadmap and backlog                                                                         | A new contributor or agent can find the owner document for a task without asking; links resolve                                                            |
| **D1 · Close the model-mission gap** | `m5`–`m9`, `m6b`, `m8` and the remaining chapters                                                                            | **Done (2026-11-14):** every released mission follows the model pattern and has a model-mission document; the remaining art and performance gaps are D2/D3 |
| **D2 · Art review and capture**      | Pending `reviewed: false` records, the Chavín kit, and the art of the model missions (m3–m9, m6b, Tambotoco, Lima, La Junta) | No unreviewed record ships; the human review is recorded; the captures are current                                                                         |
| **D3 · Real-GPU performance**        | The remaining model-mission site views (m3–m9, m6b, La Junta) and late views                                                 | A measured pass at 1280×800 and 1600×900 is recorded; optimization work is either scheduled or explicitly rejected                                         |
| **D4 · Release packaging**           | itch build, Pages artifact, publish checklist                                                                                | The checklist is green on a build that matches the tagged commit                                                                                           |

## D1 · Closed (2026-11-14)

m5–m9, m6b and m8 were rebuilt with 256 m transects, acts, in-engine openings and bench scenes. Every
released mission now has a model-mission document and follows the model pattern; the quality bar records the
evidence. No model-mission rebuild remains.

## D2 · Art review order

1. Chavín kit: record the human review. Caral's camp pieces and its Act III card were approved and closed on
   2026-11-14; do not re-review them.
2. Review every new `reviewed: false` record. The five Caral records were reconciled and the three Workbench
   mission intros were retired on 2026-11-16 (B5/B10 closed); the archived release snapshot lists the set as
   of 2026-10-30. Approve or reject each new record with `yarn art:review`.
3. Capture the model missions whose art review is pending (m3–m9, m6b, Tambotoco, Lima, La Junta) with the
   current build.

The release-candidate document is an **archived snapshot** from 2026-10-30. Use its checklist as a template,
but record today's counts and hashes in a new status document or PR, not by editing the snapshot.

## D3 · Performance

The `mixed` benchmark already has a real-GPU pass (`yarn bench --gpu`, Intel iGPU), recorded in
[`../development/performance-audit.md`](../development/performance-audit.md). Real-GPU openings are also
recorded for m1, m2, Tambotoco and Lima (#447). The remaining gap is the **site views of m3–m9, m6b and
La Junta**, plus the late view of any mission whose late game fills the screen; their bench numbers are
structural SwiftShader numbers unless their design document says otherwise.

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

| Risk                                     | Impact                                           | Mitigation                                                                                                           |
| ---------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Documentation drifts from code           | Agents follow stale rules                        | Living docs are updated in the same PR; snapshots are labelled; the map is the entry point                           |
| Art review becomes the bottleneck        | Renders stay hidden or block a release           | Review in batches with a contact sheet; `yarn art:review` records the decision                                       |
| The quality bar and the roadmap disagree | A stale line sends work backwards                | The quality bar is the authority; reconcile it in the same PR                                                        |
| No real GPU available                    | Performance decisions rest on software rendering | Schedule a reference-hardware pass; do not present SwiftShader numbers as a GPU verdict                              |
| Scope creep from the campaign redesign   | The 13 released missions never close             | The redesign is approved design, not committed scope; new missions need a dossier, a branch and an explicit approval |

## Non-goals for this cycle

- Adding the missions proposed in `campaign-redesign.md`.
- Ships, a selva biome or a seasonal calendar (they gate future missions, not the current 13).
- A public skirmish UI, multiplayer or a map editor.
- New runtime dependencies or MCP servers.

## Updating this roadmap

The project author updates this document when a milestone closes or the active phase changes. A model-mission
change updates the quality bar and its own design document in the same PR; it does not rewrite this roadmap
unless it changes a milestone.
