# Development roadmap

**Status:** living · **Last updated:** 2026-11-20

This is the engineering roadmap, not the content proposal. The live per-mission status is
[`../design/campaign-quality-bar.md`](../design/campaign-quality-bar.md); the future campaign structure is
[`../design/campaign-redesign.md`](../design/campaign-redesign.md).

## Where we are

- **Release:** `0.2.0`, campaign-only, five campaigns and twenty missions. Launch catalogue: four missions
  per campaign (20 playable + 0 in development); the other thirteen approved missions are reserved for an
  expansion.
- **Gold master:** Caral (`m1_caral`) meets every gate of the campaign quality bar.
- **Model pattern:** every released mission follows it after the m5–m9, m6b and m8 rebuilds (closed
  2026-11-14); all twenty missions have a model-mission document.
- **Performance:** m3–m9 and m6b meet the scale, opening and performance gates; the m3, m4, m5, Tambotoco,
  Lima, La Junta and Arica intro renders are approved, and the rest of the art review is pending.
- **Art pending:** Chavín, Chimú, the civil war, Túpac Amaru and Independencia still lack mostly art.
- **Art direction:** Tambotoco is the new reference scene; E0–E6 of the pilot are implemented (docs,
  terrain shadows, palette, plaza, procedural architecture finish, cave/huaca GLBs, highland vegetation,
  soft banks/ford and paths, Killke/ayllu variants, the Manco GLB, hero/detail/wide beats and the 3 × 3
  validation set) and the pilot closed with the 2026-11-17 approval; E7 was delivered on 2026-11-17 (baked hero proportions, scoped terrain macro, Inticancha/shrine detail; the 3X recording wins with the optional goals missed), with unique Ayar outfits/portraits, a hand-sculpted body, an andes GLB and new fauna as future work
  ([`../design/tambotoco-art-pilot.md`](../design/tambotoco-art-pilot.md)).
- **Open release work:** human art review, a site-specific real-GPU performance pass and the itch package.
- **Asset audit:** the 0.2.0 asset audit closed with three P0 (late-era architecture and the Inca outfit of
  1536–1572). They are scheduled for 0.2.1 in [`./0.2.1-asset-corrections.md`](./0.2.1-asset-corrections.md).

The audit is the authority. If this summary and the quality bar disagree, the quality bar wins.

## Milestones

| Milestone                            | Scope                                                                                                                        | Exit criterion                                                                                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D0 · Documentation foundation**    | Documentation map, GDD, ADR log, roadmap and backlog                                                                         | A new contributor or agent can find the owner document for a task without asking; links resolve                                                            |
| **D1 · Close the model-mission gap** | `m5`–`m9`, `m6b`, `m8` and the remaining chapters                                                                            | **Done (2026-11-14):** every released mission follows the model pattern and has a model-mission document; the remaining art and performance gaps are D2/D3 |
| **D2 · Art review and capture**      | Pending `reviewed: false` records, the Chavín kit, and the art of the model missions (m3–m9, m6b, Tambotoco, Lima, La Junta) | No unreviewed record ships; the human review is recorded; the captures are current                                                                         |
| **D2b · Art-direction pilot**        | Tambotoco becomes the stylized-realism reference: light/shadows, palette, architecture, highland vegetation, hero variant, presentation | **Done (2026-11-17):** E0–E6 of [`../design/tambotoco-art-pilot.md`](../design/tambotoco-art-pilot.md) close and E7 delivered (baked hero proportions, scoped terrain macro, Inticancha/shrine detail, 3 × 3 E7 set and the 3X recording); caps 500k/280 and 660k/360; `dist` 24.63/25 MB |
| **D3 · Real-GPU performance**        | The remaining model-mission site views (m3–m9, m6b, La Junta) and late views                                                 | **Done (2026-11-17):** 17 site views measured at 1280×800 and 1600×900 on the Intel iGPU, all hardware; 28–38 FPS high at 1600×900. Decision in [`../development/site-view-performance.md`](../development/site-view-performance.md); B13 schedules the m6b/m8 late-view optimization |
| **D4 · Release packaging**           | itch build, Pages artifact, publish checklist                                                                                | The checklist is green on a build that matches the tagged commit                                                                                           |
| **D5 · 0.2.1 asset corrections**     | The three P0 and the P1 site/label corrections from the 0.2.0 asset audit                                                     | **Done (2026-11-20):** P0 mapping and outfit tests green, P1 labels and site art closed with captures; only the realistas era split (P1-9) moves to 0.2.2     |

## D1 · Closed (2026-11-14)

m5–m9, m6b and m8 were rebuilt with 256 m transects, acts, in-engine openings and bench scenes. Every
released mission now has a model-mission document and follows the model pattern; the quality bar records the
evidence. No model-mission rebuild remains.

## D2 · Art review order

1. Chavín kit: **Done (2026-11-17)** — the kit and its in-engine site views were approved as a stylized
   abstraction (contact sheet in `docs/media/chavin-kit-review.webp`). Caral's camp pieces and its Act III
   card were approved and closed on 2026-11-14; do not re-review them.
2. Review every new `reviewed: false` record. The five Caral records were reconciled and the three Workbench
   mission intros were retired on 2026-11-16 (B5/B10 closed); the archived release snapshot lists the set as
   of 2026-10-30. Approve or reject each new record with `yarn art:review`.
3. Capture the model missions whose art review is pending (m3–m9, m6b, Tambotoco, Lima, La Junta) with the
   current build. **Done (2026-11-17):** the current site views are in
   `docs/media/site-review-2026-11-17.webp` (human review still pending). Lima 1821, Real Felipe, Tarapacá, Miraflores, Breña, Cusco 1536 and Vilcabamba have current captures in
   `public/media/{lima-1821,real-felipe,tarapaca,miraflores,brena,cusco-1536,vilcabamba}/`; their human art
   review remains (B15–B17). Their bench rows are now in `yarn bench:check` (2026-11-19).

The release-candidate document is an **archived snapshot** from 2026-10-30. Use its checklist as a template,
but record today's counts and hashes in a new status document or PR, not by editing the snapshot.

## D3 · Performance — Done (2026-11-17)

The pass is recorded in [`../development/site-view-performance.md`](../development/site-view-performance.md):
17 site views (m3–m9, m6b and La Junta) at 1280×800 and 1600×900 on the Intel RPL-S iGPU, all rows on
hardware. The shipped high preset runs **28–38 FPS** at 1600×900 and **32–48 FPS** at 1280×800; the low
fallback is 46–50 FPS on the three tightest late views. The seven missions added on 2026-11-18 are not in
this pass; they have SwiftShader rows and are a **known limitation** of the 0.2.0 release, not a measured
28–38 FPS claim.

Decision: accept the measured high-quality frame times, keep the SwiftShader structural caps unchanged,
and schedule the m6b/m8 late-view optimization as **B13**. Re-run `yarn bench:site-views` before D4.
`yarn bench:check` remains the SwiftShader ratchet. The m8 opening measures ~618–620k triangles against
its 625k cap, so the row is green but within ~1 %; do not add scene weight to m8, m6b or Tambotoco without
re-measuring. `m_cusco_1536` and `m_brena` were added to the command in the 0.2.0 closeout.

## D4 · Release 0.2.0 (closeout)

The evidence and the remaining gates are in [`../release/0.2.0-readiness-audit.md`](../release/0.2.0-readiness-audit.md).

- Build the Pages artifact and the itch package from the same commit.
- Re-run `yarn verify:fast`, the required E2E tier, `yarn art:validate` and `yarn dist:check`.
- Check the campaign menu shows four entries per campaign and that no planned entry is playable.
- Attach the current captures and the performance numbers.
- Tag `v0.2.0` and keep `v0.1.0` as the earlier nine-mission demo. Keep `localStorage` keys and mission ids
  stable.
- The seven 2026-11-18 missions have a green automated no-cheat path
  (`tests/e2e/release-playtest.spec.ts`); a human pass is the first post-release validation and is declared
  as a known limitation in the notes.

## D5 · 0.2.1 asset corrections

The 0.2.0 asset audit ([`../release/0.2.0-asset-historical-audit.md`](../release/0.2.0-asset-historical-audit.md))
found three P0: glass/LED architecture in the Republican era, concrete/radar in the Viceroyalty, and the 1780
rebel outfit on the Inca of 1536–1572. The remediation is
[`./0.2.1-asset-corrections.md`](./0.2.1-asset-corrections.md): remap the two late-era model families, make
the Inca outfit mission-aware, add a regression test, then close the cheap P1 (Miraflores, labels, headwear)
before the site art. No new missions and no save/URL changes.

Exit (2026-11-20): the P0 test and the four era captures are green; the P1 labels, site art and the
colonial-andean profile are closed with captures; the only open P1 is the realistas era split, moved to
0.2.2.

## Risks

| Risk                                     | Impact                                           | Mitigation                                                                                                           |
| ---------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Catalogue reads as playable content      | Players expect four playable missions per chapter | Label planned entries «En desarrollo»; the menu counts only released missions                                         |
| Documentation drifts from code           | Agents follow stale rules                        | Living docs are updated in the same PR; snapshots are labelled; the map is the entry point                           |
| Art review becomes the bottleneck        | Renders stay hidden or block a release           | Review in batches with a contact sheet; `yarn art:review` records the decision                                       |
| The quality bar and the roadmap disagree | A stale line sends work backwards                | The quality bar is the authority; reconcile it in the same PR                                                        |
| No real GPU available                    | Performance decisions rest on software rendering | Schedule a reference-hardware pass; do not present SwiftShader numbers as a GPU verdict                              |
| Scope creep from the campaign redesign   | The released missions never close               | The redesign is approved design, not committed scope; new missions need a dossier, a branch and an explicit approval |

## Non-goals for this cycle

- Adding the missions proposed in `campaign-redesign.md`.
- Ships, a selva biome or a seasonal calendar (they gate future missions, not the current 20).
- A public skirmish UI, multiplayer or a map editor.
- New runtime dependencies or MCP servers.

The geographic-identity audit and its ordered remediation are in
[`./geographic-identity-roadmap.md`](./geographic-identity-roadmap.md); it is a proposal and does not change
the milestones above until it is approved.

## Updating this roadmap

The project author updates this document when a milestone closes or the active phase changes. A model-mission
change updates the quality bar and its own design document in the same PR; it does not rewrite this roadmap
unless it changes a milestone.
