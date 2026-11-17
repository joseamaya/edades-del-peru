# Campaign quality bar

This is the definition of done for a historical campaign. Caral (`m1_caral`) is the **model mission**: it
meets every gate below and sets the pattern the other missions follow
([`model-mission-pattern.md`](./model-mission-pattern.md) is the how-to and checklist). Chavín
(`m2_chavin`) has been rebuilt to the same pattern; its table below records the evidence, with the human
art review still pending. The other missions are reviewed again against this one before they are called
complete. A mission is not done because it boots or because its objectives can be satisfied by a test
harness. The HUD geometry gate (`tests/e2e/hud-layout.spec.ts`) runs every mission at 1280×720 and Caral at
1600×900 and 1920×1080, including a late-mission objective list with the archive folded and expanded and the
shortcuts panel open.

## Gates

| Gate        | Requirement                                                                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History     | Dates, places, societies and named people come from `docs/historia/`; uncertain forms are labelled plausible or abstraction. No invented war, ruler, battle, technology or ritual.           |
| Identity    | The mission has a world and a mechanic that belong to its historical problem, not only `gather + build + survive`.                                                                           |
| Play        | A player can reach victory through ordinary commands: movement, construction, gathering and the mission's own mechanic. No resource, health, spawn or objective cheats required.             |
| Contract    | Required and optional objectives are distinct; hidden objectives are not spoiled in the briefing; every measurable objective shows live progress.                                            |
| Onboarding  | The tutorial or briefing explains the next useful action without blocking the player; there is no dead end and the Codex remains optional.                                                   |
| Closure     | Victory gives a mission-specific epilogue and a summary of optional achievements; the next mission can be started from the result screen.                                                    |
| UX          | At 1280×720, 1600×900 and 1920×1080 the tutorial, briefing, objectives, dialogue, card panel, minimap and result screen remain readable and do not cover their own controls.                 |
| Visuals     | The scene is recognisable at RTS zoom, the authored landmark reads, and the palette/material pass does not hide the silhouettes. Evidence is a current screenshot, not a stale review image. |
| Persistence | Save/load restores the mission, tutorial, optional visits, canal state and hold timers.                                                                                                      |
| Tests       | Data tests, objective/trigger tests, an E2E mission path and a real-command playtest cover the behaviour. `yarn verify:fast` and CI are green.                                               |
| Docs        | README, campaign dossier, experience design and development notes agree with the implemented mission.                                                                                        |
| Structure   | The mission plays as acts: hidden objectives revealed per act, chapter cards between them, optional goals that never gate victory, and the documented outcome as the ending.                 |
| Opening     | A narrated intro and a briefing with the mission's own art (or a neutral backdrop), chapter-card and epilogue images captured in engine and documented as such.                              |
| Art         | New models and images carry `confidence` and pass a recorded human review; PROVENANCE and the dossier certainty table agree.                                                                 |
| Performance | The mission's opening (and, when its late game fills the screen, its late view) is in `scripts/bench_scene.mjs` and passes `yarn bench:check`; `dist/` stays under its budget.               |
| Scale       | A model mission uses a 256 m map and painted ground sampled every 2 m; its worker crosses in 130–160 s. `tests/campaign-scale.test.ts` enforces it for every mission on the model list.      |

## Audit 2026-11-14: where every mission stands

Re-verified against the code, tests and an in-engine clip of each mission (not copied from the tables
below, which record each mission's own review and are kept for history). **M** met, **P** partial,
**X** missing, **–** not applicable (in-engine captures only, no new models).

| Mission            | Hist | Ident | Play | Contr | Onb | Clos | UX  | Vis | Pers | Tests | Docs | Struct | Open | Art | Perf | Scale |
| ------------------ | ---- | ----- | ---- | ----- | --- | ---- | --- | --- | ---- | ----- | ---- | ------ | ---- | --- | ---- | ----- |
| m1_caral           | M    | M     | M    | M     | M   | M    | M   | M   | M    | M     | M    | M      | M    | M   | M    | M     |
| m2_chavin          | M    | M     | P    | M     | M   | M    | M   | P   | M    | M     | P    | M      | M    | M   | M    | M     |
| m3_moche_recuay    | M    | M     | M    | M     | M   | M    | M   | P   | M    | M     | M    | M      | M    | P   | M    | M     |
| m4_wari            | M    | M     | M    | M     | M   | M    | M   | P   | M    | M     | M    | M      | M    | P   | M    | M     |
| m_tambotoco        | M    | M     | M    | M     | M   | M    | M   | M   | M    | M     | M    | M      | M    | M   | M    | M     |
| m5_yahuar_pampa    | M    | M     | M    | M     | M   | M    | M   | P   | M    | M     | M    | M      | M    | M   | M    | M     |
| m6_chimu_inca      | M    | M     | M    | M     | M   | M    | M   | M   | M    | M     | M    | M      | M    | M   | M    | M     |
| m6b_guerra_civil   | M    | M     | M    | M     | M   | M    | M   | P   | M    | M     | M    | M      | M    | P   | M    | M     |
| m_lima             | M    | M     | M    | M     | M   | M    | M   | P   | M    | M     | M    | M      | M    | M   | P    | M     |
| m7_tupac_amaru     | M    | M     | M    | M     | M   | M    | M   | P   | M    | M     | M    | M      | M    | P   | M    | M     |
| m_junta_cusco      | M    | M     | M    | M     | M   | M    | M   | P   | M    | M     | P    | M      | M    | M   | P    | M     |
| m8_independencia   | M    | M     | M    | M     | M   | M    | M   | P   | M    | M     | M    | M      | M    | P   | M    | M     |
| m9_guerra_pacifico | M    | M     | M    | M     | M   | M    | M   | P   | M    | M     | M    | M      | M    | M   | M    | M     |

**Verdict.** **Caral meets every gate** (closed 2026-11-14: Act III card recaptured with the works camp; the
camp pieces, vegetation, household props and fauna approved by a recorded human review). Chavín's intro render
is approved; its kit and captures keep their own review status. Every released mission now
follows the model pattern (256 m, painted ground, acts, in-engine intro and bench), including m8 in this
pass. **m3–m9 meet the scale, opening and performance gates**; the m3, m4, m5, Tambotoco, Lima, La Junta and
Arica intro renders are approved. Every render record in `src/art/manifest.json` is now approved: the five
Caral education/tour records were reconciled and the three draft Workbench mission intros were removed. The
open art review is the reused site GLBs (#343).

**Tambotoco art pass (2026-11-16).** The ayllu kit now uses per-surface PBR detail (stone, rock, earth,
plaster, thatch, wood, crops, people) with world-scale UVs; the cave is an arch in a scree apron, Huanacaure's
monolith was re-proportioned, canchas are enclosures, the plaza has a kerb and four axes, fields follow the
relief and the acequia skirts Inticancha with flowing water and a wet-crop response. The site is merged per
surface family per phase; contact shadows are one instanced draw; the inland water grid and the dry-puna
ground cover were trimmed. Measured `bench_scene` (Intel RPL-S, high): opening **479,630/264**, late
**651,572/353**, under the ratcheted 500k/280 opening cap and the unchanged 660k/360 late cap; software is
436,880/265 and 608,324/347. The eight Ayar gained per-commander props, headdresses, weaves and combat clips;
`docs/design/tambotoco-model-mission.md` carries the site certainty table and the evidence commands.
The 2026-11-16 pass is the baseline for the art-direction pilot: the next work is light/shadows, palette and
material finish, architecture silhouette, highland vegetation and the Tambotoco hero variant, tracked in
[`tambotoco-art-pilot.md`](./tambotoco-art-pilot.md).

**Fixed in this pass.** The closing trigger of the goal that wins a mission now fires (Tambotoco's founded
Inticancha never appeared); waves can march on a `target` (Lima's siege and the Tambotoco valley wave stood at
their spawn); every authored start fits its population cap (Lima 31/22, Junta 38/22, m8 24/22, Tambotoco
20/7); named speakers who are not portrait commanders label their dialogue («Comandante: Señor de Moche: —»);
Wari offers no fortifications; Caral, Chavín, Tambotoco and m6b texts that promised something else; the m8
playtest re-forms its line instead of racing a fixed budget; `yarn record` keeps one frames folder per run.
m9 now plays the documented fall of Arica in three acts (the summons, the bombardment and the assault)
and its no-cheat playtest is green. m7 now plays Sangarará, the failed Cusco siege and the retreat, with its
no-cheat playtest green. m7 and m9 were promoted to model missions (256 m transect, painted ground,
in-engine intro and epilogue, bench scenes and the scale guard).

**Work order, highest value first.**

1. **Invented outcomes:** fixed for m9 (#468) and m7 (#469). Both play their documented outcomes now.
2. **No-cheat playtests:** HP pinning removed (2026-11-14) from Chavín, Tambotoco, Lima and the Junta;
   Chavín keeps **Play P** because the harness still uses direct field-card/tech calls. Tambotoco and Lima
   are Met (automated): Tambotoco fights the valley wave and visits the shrine and the gate through the HUD;
   Lima opens the Plaza Mayor card through the HUD and advances its tutorial. A manual no-cheat playtest
   remains recommended for all of them.
3. **Art review:** the render records are reconciled (0 `reviewed: false`); what remains is the human review
   of the reused site GLBs and the Chavín kit (#343).
4. **Model-mission rebuilds:** done for m3–m9 (2026-11-14), including m8. The quick wins are done too:
   m6's gate really closes (`canal_closed`) and m6b's victory holds Quipaipan and captures Huáscar instead
   of razing a building.
5. **Mid-mission save/load E2E:** fixed (2026-11-14) for Tambotoco (`inticancha`), Lima (`ciudad`) and
   La Junta (the Apacheta hold).

## Caral gold-master status

Reviewed 2026-11-07 after the four-act rebuild and closed 2026-11-14 (design and status: [`caral-model-mission.md`](./caral-model-mission.md)).

| Gate        | Status | Evidence                                                                                                                                                                                                                                                                                           |
| ----------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History     | Met    | `docs/historia/campanas/caral.md` with its certainty table; no documented war; anonymous narrator; Vichama as the epilogue's memory of the crisis.                                                                                                                                                 |
| Identity    | Met    | Coast–valley complementarity (valley cotton becomes Áspero's nets), the Pyramid Mayor built in phases by hand-overs and fed by the communal store, the drought that ends the city.                                                                                                                 |
| Play        | Met    | `tests/e2e/campaign-playtest.spec.ts` reaches victory with ordinary commands and locks the bot pacing at 15–30 min; `caral-city.spec.ts` covers the hand-over and the field cards.                                                                                                                 |
| Contract    | Met    | Act objectives start hidden and are revealed by triggers (`tests/caral-acts.test.ts`); construction work turns consume food and pause when the communal store is empty; the briefing shows Act I only; optional Huaca visit, six-complex tour and assembly.                                        |
| Onboarding  | Met    | Ten-step tutorial docked under the objectives (select, coast, house, valley, field, canal, storage, nets, pyramid, works); briefing; Codex optional.                                                                                                                                               |
| Closure     | Met    | Departure epilogue with its image, optional-achievement summary, "Continuar" to m2, which the campaign path then unlocks.                                                                                                                                                                          |
| UX          | Met    | Horizontal command bar, tutorial on the right; `tests/e2e/hud-layout.spec.ts` checks the HUD panels geometrically at 1280×720, 1600×900 and 1920×1080; the full-screen briefing was checked in a browser.                                                                                          |
| Visuals     | Met    | 256 m sea-to-terrace transect, Blender architecture kit by phase (white finished plaster; ochre/red in use, exact colours inferred), burial dust/fire, summer flood and drought (valley/lomas paint and river level), Áspero, painted fertile ground, region flora and fauna, living-city details. |
| Persistence | Met    | Save/load restores the site phase and the drought without re-applying its losses; tutorial, canal, construction and hold timers round-trip.                                                                                                                                                        |
| Tests       | Met    | Data, acts (including the empty-store pause), E2E specs and real-command playtest; `yarn verify:fast` and CI green.                                                                                                                                                                                |
| Docs        | Met    | Dossier, `caral-model-mission.md`, `model-mission-pattern.md`, PROVENANCE aligned.                                                                                                                                                                                                                 |
| Structure   | Met    | Four acts: Áspero, the valley, the Sacred City, the drought; chapter cards with images.                                                                                                                                                                                                            |
| Opening     | Met    | Three-beat narrated intro; briefing with Áspero's capture; act and epilogue images from `scripts/capture_caral_intro.mjs`.                                                                                                                                                                         |
| Art         | Met    | City kit and captures approved by human review on 2026-11-07; camp pieces, vegetation, props and fauna on 2026-11-14 (`reviewer`/`reviewedAt` in every manifest, PROVENANCE).                                                                                                                      |
| Performance | Met    | `bench_scene.mjs` re-run 2026-11-09: opening 331,766 tris / 205 calls; late 581,611 / 262; within the 400k / 600k budgets.                                                                                                                                                                         |
| Scale       | Met    | 256 m map, painted ground every 2 m (128 over 256) and `unitSpeedScale: 0.75` → worker crossing ≈2:22; `tests/campaign-scale.test.ts`.                                                                                                                                                             |

Updated 2026-11-09: phase paint evidence, the burial ritual and the communal-store-fed construction work turns were
added (see `caral-model-mission.md` Open items); the unit speed scale paces the 256 m transect (0.5 at the time, 0.75 since 2026-11-12).

## Chavín gold-master status

Reviewed 2026-11-07 against the model-mission gates. Status is honest about the human art gate.

| Gate        | Status              | Evidence                                                                                                                                                                     |
| ----------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History     | Met                 | `docs/historia/campanas/chavin.md` with its certainty table; UNESCO 330, Plan de Manejo 2020, Rick et al., Burger/Kembel; no invented war.                                   |
| Identity    | Met                 | Ceremonial prestige: offerings fund the temple, pilgrimage fills the plaza, the fair links long-distance exchange.                                                           |
| Play        | Partial (automated) | The playtest reaches victory without HP pinning, but still teleports the holder and invokes offerings, techs and heritage directly; the manual no-cheat playtest is pending. |
| Contract    | Met                 | Acts II–IV start hidden and are revealed by triggers; optional Plaza, gallery, Portada and major offering never gate victory.                                                |
| Onboarding  | Met                 | Nine-step non-blocking Chavín tutorial, briefing and Codex; the briefing shows Act I only.                                                                                   |
| Closure     | Met                 | Decline epilogue with its own capture and optional-achievement summary; “Continuar” to m3.                                                                                   |
| UX          | Met                 | `tests/e2e/hud-layout.spec.ts` checks the panels geometrically at 1280×720 (Caral also at 1600×900 and 1920×1080).                                                           |
| Visuals     | Met locally         | Source-derived Chavín kit, phased temple, highland palette and current RTS captures in `public/media/chavin/`.                                                               |
| Persistence | Met                 | `save-campaign.spec.ts` restores the site phase, offerings and tutorial step.                                                                                                |
| Tests       | Met (automated)     | Data, site, tutorial, E2E mission, save/load and automated playtest; the manual playtest is pending.                                                                         |
| Docs        | Met                 | Dossier, `chavin-model-mission.md`, this table, `chavin-sacred-site.md`, PROVENANCE and README aligned.                                                                      |
| Structure   | Met                 | Four acts, hidden objectives revealed per act, chapter cards with images, optional goals, documented decline.                                                                |
| Opening     | Met                 | Three-beat narrated intro and briefing with the mission's own art; chapter-card and epilogue captures from `capture_chavin_intro.mjs`.                                       |
| Art         | Met (intro render)  | Approved `m2_chavin-intro` render; the kit and captures keep their own `reviewed: false` status.                                                                             |
| Performance | Met                 | `bench_scene.mjs` re-run 2026-11-09 after the resize: opening 413,433 tris / 160 calls; late 462,835 / 223; within the 450k / 600k budgets.                                  |
| Scale       | Met                 | 256 m map, painted ground every 2 m (128 over 256) and `unitSpeedScale: 0.75` → worker crossing ≈2:22; `tests/campaign-scale.test.ts`.                                       |

## Moche gold-master status

Reviewed 2026-11-14 as a model mission. The human art gate is still open.

| Gate        | Status               | Evidence                                                                                                                                                                          |
| ----------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History     | Met                  | `docs/historia/campanas/moche_recuay.md` with its certainty table; no invented ruler or single battle; frontier pressure and elite exchange are attested.                         |
| Identity    | Met                  | The valley, the canal and the huacas: water as power, the plaza under Recuay pressure and the elite exchange.                                                                     |
| Terrain     | Met                  | 256 m authored coastal heightfield (`mocheHeightmap.ts`) with painted ground: Pacific shore, irrigated valley and Huacas terrace.                                                 |
| Site        | Met (exception)      | No construction phases: the huacas are a living ceremonial centre, not a monument the player builds; recorded in `moche-model-mission.md`.                                        |
| Play        | Met                  | `campaign-playtest.spec.ts` moves real units, opens the gate and exchanges silver; `moche-campaign.spec.ts` clicks the canal and Huaca de la Luna actions.                        |
| Contract    | Met                  | Three acts (canal, hold, exchange) with hidden goals revealed by triggers, optional 400 silver and chapter cards with images.                                                     |
| Onboarding  | Met                  | Four-step Moche tutorial, briefing, Codex and minimap pips.                                                                                                                       |
| Closure     | Met                  | Dusk epilogue capture narrates the Moche fragmentation toward 800 AD; optional elite exchange summarised.                                                                         |
| UX          | Met                  | `tests/e2e/hud-layout.spec.ts` checks the panels geometrically at 1280×720 (Caral also at 1600×900 and 1920×1080).                                                                |
| Visuals     | Met locally          | Authored `moche_site` GLB, painted valley and in-engine intro/epilogue captures in `public/media/moche/`.                                                                         |
| Persistence | Met                  | Canal, hold timer, delivered silver and tutorial round-trip in `save-campaign.spec.ts`; v6 m3 saves are rejected (`SAVE_VERSION` 7).                                              |
| Tests       | Met                  | Data, site/proxy collision, tutorial, mission, HUD, real-command playtest and save/load coverage.                                                                                 |
| Docs        | Met                  | This document, dossier, `moche-model-mission.md`, experience table, site note, art docs and README aligned.                                                                       |
| Structure   | Met                  | Three acts, hidden objectives revealed per act, chapter cards with images and optional goals.                                                                                     |
| Opening     | Met                  | Three-beat narrated intro, chapter cards and epilogue from `scripts/capture_moche_intro.mjs`; `MISSION_ART` uses the valley capture.                                              |
| Art         | Pending human review | The reused Huacas GLB and its draft Blender records keep `reviewed: false` (#343); in-engine captures are recorded in PROVENANCE.                                                 |
| Performance | Met                  | `bench_scene.mjs`: opening ~550k tris / 332 calls, huacas plaza ~721k / 568; within the recorded first-pass caps (the late view is over the 600k art-direction target, as m7/m9). |
| Scale       | Met                  | 256 m map, 128² painted ground over 256 m and `unitSpeedScale: 0.75` → worker crossing ≈2:22; `tests/campaign-scale.test.ts`.                                                     |

## Wari gold-master status

Reviewed 2026-11-14 as a model mission. The human art gate is still open.

| Gate        | Status               | Evidence                                                                                                                                                                                       |
| ----------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History     | Met                  | `docs/historia/campanas/wari_tiahuanaco.md` with its certainty table; no invented war or ruler.                                                                                                |
| Identity    | Met                  | The network of andenes, roads and provincial centres, and the frontier of influence against Tiahuanaco.                                                                                        |
| Terrain     | Met                  | 256 m authored highland heightfield (`wariHeightmap.ts`) with painted ground: basin, terraces, quebradas and ridges.                                                                           |
| Site        | Met (exception)      | No construction phases: the complex is the operating capital, not a monument the player builds; recorded in `wari-model-mission.md`.                                                           |
| Play        | Met                  | `campaign-playtest.spec.ts` builds the farms and markets with real commands and reaches victory from the documented opening stock; `wari-campaign.spec.ts` covers roads, network and frontier. |
| Contract    | Met                  | Three acts (supplies/andenes, network, frontier) with hidden goals revealed by triggers, optional third centre and chapter cards.                                                              |
| Onboarding  | Met                  | Non-blocking tutorial, briefing, Codex and minimap pips.                                                                                                                                       |
| Closure     | Met                  | Dusk epilogue capture narrates the collapse toward 1000–1100 AD; optional third centre summarised.                                                                                             |
| UX          | Met                  | `tests/e2e/hud-layout.spec.ts` checks the panels geometrically at 1280×720 (Caral also at 1600×900 and 1920×1080).                                                                             |
| Visuals     | Met locally          | Authored `wari_site` GLB, painted highland basin and in-engine intro/epilogue captures in `public/media/wari/`.                                                                                |
| Persistence | Met                  | Network, hold timer, resources and tutorial round-trip in the mission's save path; v7 m4 saves are rejected (`SAVE_VERSION` 8).                                                                |
| Tests       | Met                  | Data, site/proxy collision, tutorial, mission, HUD, real-command playtest and save/load coverage.                                                                                              |
| Docs        | Met                  | This document, dossier, `wari-model-mission.md`, experience table, site note, art docs and README aligned.                                                                                     |
| Structure   | Met                  | Three acts, hidden objectives revealed per act, chapter cards with images and optional goals.                                                                                                  |
| Opening     | Met                  | Three-beat narrated intro, chapter cards and epilogue from `scripts/capture_wari_intro.mjs`; `MISSION_ART` uses the basin capture.                                                             |
| Art         | Pending human review | The reused Wari GLB and its Blender records keep `reviewed: false` (#343); in-engine captures are recorded in PROVENANCE.                                                                      |
| Performance | Met                  | `bench_scene.mjs`: opening ~421k tris / 199 calls, frontier ~494k / 342; within the recorded first-pass caps.                                                                                  |
| Scale       | Met                  | 256 m map, 128² painted ground over 256 m and `unitSpeedScale: 0.75` → worker crossing ≈2:22; `tests/campaign-scale.test.ts`.                                                                  |

## Yahuar Pampa gold-master status

Reviewed 2026-11-14 as a model mission. The Blender intro render is approved (2026-11-15); the reused
pucará GLB keeps its own review status (#343).

| Gate        | Status             | Evidence                                                                                                                                                                                  |
| ----------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History     | Met                | `docs/historia/campanas/yahuar_pampa.md` with its certainty table; the pururaucas are labelled tradition, not fact.                                                                       |
| Identity    | Met                | The 1438 defence, the counterattack on the Chanca heights and the road to Pachacútec.                                                                                                     |
| Terrain     | Met                | 256 m authored highland heightfield (`chancaHeightmap.ts`) with painted ground: pampa, terraces, quebrada and ridges.                                                                     |
| Site        | Met (exception)    | No construction phases: the Chanca pucará is a camp in use, not a monument the player builds; recorded in `chanca-model-mission.md`.                                                      |
| Play        | Met                | `campaign-playtest.spec.ts` holds Cusco and counterattacks with real orders; `campaign-completable` and `save-campaign` cover the mission.                                                |
| Contract    | Met                | Three acts (siege, counterattack, pursuit) with hidden goals revealed by triggers and chapter cards.                                                                                      |
| Onboarding  | Met                | Non-blocking tutorial, briefing, Codex and minimap pips.                                                                                                                                  |
| Closure     | Met                | Dusk epilogue capture narrates the Chanca integration and Pachacútec; the pursuit closes the act.                                                                                         |
| UX          | Met                | `tests/e2e/hud-layout.spec.ts` checks the panels geometrically at 1280×720 (Caral also at 1600×900 and 1920×1080).                                                                        |
| Visuals     | Met locally        | Authored `chanca_site` GLB, painted pampa and in-engine intro/epilogue captures in `public/media/chanca/`.                                                                                |
| Persistence | Met                | Siege, hold/counterattack and tutorial round-trip in the save path; v8 m5 saves are rejected (`SAVE_VERSION` 9).                                                                          |
| Tests       | Met                | Data, site/proxy collision, tutorial, mission, HUD, real-command playtest and save/load coverage.                                                                                         |
| Docs        | Met                | This document, dossier, `chanca-model-mission.md`, experience table, site note, art docs and README aligned.                                                                              |
| Structure   | Met                | Three acts, hidden objectives revealed per act, chapter cards with images; the pursuit closes Act III.                                                                                    |
| Opening     | Met                | Three-beat narrated intro, chapter cards and epilogue from `scripts/capture_chanca_intro.mjs`; `MISSION_ART` uses the approved EEVEE render (`m5_chanca-intro`).                          |
| Art         | Met (intro render) | Approved `chanca/chanca_intro.blend` render in `src/art/manifest.json`; the reused Chanca GLB keeps its own review status (#343), and the in-engine captures stay recorded in PROVENANCE. |
| Performance | Met                | `bench_scene.mjs`: opening ~682k tris / 362 calls, counterattack ~761k / 521; over the 600k art-direction target (as m7/m9), within the recorded first-pass caps.                         |
| Scale       | Met                | 256 m map, 128² painted ground and `unitSpeedScale: 0.75` → worker crossing ≈2:22; `tests/campaign-scale.test.ts`.                                                                        |

## La Guerra del Norte gold-master status

Reviewed 2026-11-14 as a model mission. The human art gate is still open.

| Gate        | Status             | Evidence                                                                                                                                                             |
| ----------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History     | Met                | `docs/historia/campanas/chimu_inca.md` with its certainty table; the canal is a labelled abstraction.                                                                |
| Identity    | Met                | Water as power: Paramonga, the Chan Chan gate and the surrender of the desert capital.                                                                               |
| Terrain     | Met                | 256 m authored coastal heightfield (`chimuHeightmap.ts`) with painted ground: beach, valley, terraces and foothills.                                                 |
| Site        | Met (exception)    | No construction phases: Chan Chan is a living capital, not a monument the player builds; recorded in `chimu-model-mission.md`.                                       |
| Play        | Met                | `campaign.spec.ts` covers gate and surrender; `campaign-playtest.spec.ts` advances, closes and holds with real orders; completable and save paths are covered.       |
| Contract    | Met                | Three acts (Paramonga, canal, capitulation) with hidden goals revealed by triggers and chapter cards; optional centre/timer.                                         |
| Onboarding  | Met                | Non-blocking tutorial, briefing, Codex and minimap pips.                                                                                                             |
| Closure     | Met                | Dusk epilogue capture narrates Minchancaman's transfer and Querrotumi's revolt; optional objectives summarised.                                                      |
| UX          | Met                | `tests/e2e/hud-layout.spec.ts` checks the panels geometrically at 1280×720 (Caral also at 1600×900 and 1920×1080).                                                   |
| Visuals     | Met locally        | Authored Chimú GLB, painted coast and in-engine intro/epilogue captures in `public/media/chimu/`.                                                                    |
| Persistence | Met                | Gate, hold timer and tutorial round-trip in the shared save path; v9 m6 saves are rejected (`SAVE_VERSION` 10).                                                      |
| Tests       | Met                | Data, site/proxy collision, tutorial, mission, HUD, real-command playtest and save/load coverage.                                                                    |
| Docs        | Met                | This document, dossier, `chimu-model-mission.md`, experience table, site note, art docs and README aligned.                                                          |
| Structure   | Met                | Three acts, hidden objectives revealed per act, chapter cards with images and optional goals.                                                                        |
| Opening     | Met                | Three-beat narrated intro, chapter cards and epilogue from `scripts/capture_chimu_intro.mjs`; `MISSION_ART` uses the approved Chan Chan render.                      |
| Art         | Met (intro render) | Approved `m6_chimu-intro` render; the reused Chimú GLB and the captures keep their own `reviewed: false` status.                                                     |
| Performance | Met                | `bench_scene.mjs`: opening ~499k tris / 273 calls, surrender ~765k / 516; within the recorded first-pass caps (the late view is over the 600k art-direction target). |
| Scale       | Met                | 256 m map, 128² painted ground and `unitSpeedScale: 0.75` → worker crossing ≈2:22; `tests/campaign-scale.test.ts`.                                                   |

## Applying it to m2–m9

Follow [`model-mission-pattern.md`](./model-mission-pattern.md) and its checklist. For each mission, first
link the dossier claim to the mechanic, then implement the mechanic, then the UX and tests. Do not copy Caral's `gather + build + survive`
sequence: use the gate table to find the mission's own historical problem. A campaign
with no documented battle must not acquire one merely to fit the RTS template.

## Campaign II playable status (m5–m6)

Campaign II is released as **playable** with the historical mechanics, onboarding, real-command
victory paths, dedicated decor GLBs and save round-trips covered. It is not yet a full gold master
because the visual evidence is still local (review captures), although the HUD layout now has a CI
geometry gate (`tests/e2e/hud-layout.spec.ts`).

| Gate        | m5 Yahuar Pampa                                                                                                               | m6 Chimú–Inca                                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| History     | Met: `yahuar_pampa.md`; no invented battle.                                                                                   | Met: `chimu_inca.md`; water/canal campaign.                                                                                   |
| Identity    | Met: defend Cusco, protect Cusi, counterattack.                                                                               | Met: advance to Paramonga, close the gate and force surrender.                                                                |
| Terrain     | Met: authored Yahuar Pampa heightfield.                                                                                       | Met: authored Chimú coastal heightfield.                                                                                      |
| Play        | Met: real-command playtest holds and counterattacks.                                                                          | Met: real-command playtest advances, reaches the gate and closes it.                                                          |
| Contract    | Met: defend, destroy, protect; waves and timer.                                                                               | Met: staged Paramonga/`canal_closed` objectives; operable gate; optional Chan Chan/hold.                                      |
| Onboarding  | Met: three-step tutorial + briefing.                                                                                          | Met: four-step tutorial + briefing.                                                                                           |
| Closure     | Met: epilogue and optional achievements.                                                                                      | Met: epilogue and optional objectives.                                                                                        |
| UX          | Met: briefing reviewed in the browser; `hud-layout.spec.ts` checks the panels at 1280×720 (Caral also at 1600×900/1920×1080). | Met: briefing reviewed in the browser; `hud-layout.spec.ts` checks the panels at 1280×720 (Caral also at 1600×900/1920×1080). |
| Visuals     | Met locally: authored Chanca site GLB + heightfield.                                                                          | Met locally: authored Chimú site GLB + heightfield + canal.                                                                   |
| Persistence | Met: save/load round-trip.                                                                                                    | Met: save/load round-trip.                                                                                                    |
| Tests       | Met: data, completability, real-command playtest.                                                                             | Met: data, completability, real-command playtest.                                                                             |
| Docs        | Met: README, dossiers, campaign experiences and this table.                                                                   | Met: README, dossiers, campaign experiences and this table.                                                                   |

## Campaign III playable status (m7)

Campaign III is released as **playable** with the documented arc, onboarding, real-command victory path,
dedicated decor GLB and save round-trip covered. m7 is now a model mission (256 m, painted ground, in-engine
intro/epilogue and bench scenes); its art review is pending. The HUD layout has a CI geometry gate
(`tests/e2e/hud-layout.spec.ts`).

| Gate        | m7 Túpac Amaru                                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| History     | Met: `tupac_amaru.md`; Sangarará, the failed Cusco siege and repression, with a certainty table.                              |
| Identity    | Met: muster and supplies, Tungasuca, Sangarará, the failed siege and the retreat.                                             |
| Play        | Met: real-command playtest reaches the documented ending with ordinary orders and no cheats.                                  |
| Contract    | Met: three acts with hidden objectives, a Sangarará hold and the retreat; Micaela is optional.                                |
| Onboarding  | Met: six-step tutorial + briefing.                                                                                            |
| Terrain     | Met: authored Cusco colonial heightfield.                                                                                     |
| Closure     | Met: the epilogue tells the capture at Langui, the execution of 18 May 1781 and the continuity to 1783.                       |
| UX          | Met: briefing reviewed in the browser; `hud-layout.spec.ts` checks the panels at 1280×720 (Caral also at 1600×900/1920×1080). |
| Visuals     | Met locally: authored colonial site GLB + heightfield.                                                                        |
| Persistence | Met: save/load round-trip (act state and hold timers).                                                                        |
| Tests       | Met: data, acts, documented ending and real-command playtest.                                                                 |
| Docs        | Met: dossier, site note, campaign experiences and this table.                                                                 |

### m7 model-mission status (2026-11-14)

| Gate        | Status               | Evidence                                                                                                                                                                                                               |
| ----------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opening     | Met                  | Three-beat in-engine intro (`capture_colonial_intro.mjs`), `MISSION_ART` and an epilogue capture; PROVENANCE records the captures.                                                                                     |
| Art         | Pending (GLB)        | The draft `m7_colonial-intro` record was removed in the art reconciliation (a Workbench blockout with no ground, sky or people; the opening uses the in-engine capture). The reused `colonial_site` GLB keeps its own review status (#343).                                                                                            |
| Performance | Met                  | `bench_scene.mjs`: opening ~537k tris / 661–665 calls, late ~811k / 1083, under the recorded first-pass caps; `yarn bench:check` green.                                                                                |
| Scale       | Met                  | 256 m map, 128² painted ground over 256 m, `unitSpeedScale: 0.75` → worker crossing ≈2:22; `tests/campaign-scale.test.ts`.                                                                                             |
| Pacing      | Pending (exception)  | The real-command bot reaches the ending in ~7 min of simulated time; the agreed 20–30 min human path is still unmeasured. The model pattern's 30–40 band is documented as an exception in `colonial-model-mission.md`. |
| Site        | Met (exception)      | No construction phases: Cusco is a city in use, not a monument the player builds; recorded here and in `colonial-site.md`.                                                                                             |

## La Independencia gold-master status (m8)

Reviewed 2026-11-14 as a model mission. The human art gate is still open.

| Gate        | Status               | Evidence                                                                                                                                      |
| ----------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| History     | Met                  | `docs/historia/campanas/independencia.md` with its certainty table; no invented units, generals or feats.                                     |
| Identity    | Met                  | Junín, the march and Ayacucho, with Sucre protected and the royalist surrender as the ending.                                                 |
| Terrain     | Met                  | 256 m authored highland heightfield (`independenceHeightmap.ts`) with painted ground: pampas, terraces, quebrada and ridges.                  |
| Site        | Met (exception)      | No construction phases: the Ayacucho chapel and camp are in use; recorded in `independencia-model-mission.md`.                                |
| Play        | Met                  | `campaign-playtest.spec.ts` holds Junín, marches and holds Ayacucho with real orders and Sucre alive; completable and save paths are covered. |
| Contract    | Met                  | Three acts (Junín, march, Ayacucho) with a hidden march/third hold revealed by triggers and chapter cards.                                    |
| Onboarding  | Met                  | Non-blocking tutorial, briefing, Codex and minimap pips.                                                                                      |
| Closure     | Met                  | Dusk epilogue capture narrates the royalist surrender and the end of Spanish power.                                                           |
| UX          | Met                  | `tests/e2e/hud-layout.spec.ts` checks the panels geometrically at 1280×720 (Caral also at 1600×900 and 1920×1080).                            |
| Visuals     | Met locally          | Authored Ayacucho GLB, painted pampas and in-engine intro/epilogue captures in `public/media/independencia/`.                                 |
| Persistence | Met                  | Junín, march and Ayacucho state use the shared save path; v11 m8 saves are rejected (`SAVE_VERSION` 12).                                      |
| Tests       | Met                  | Data, site/proxy collision, tutorial, mission, HUD, real-command playtest and save/load coverage.                                             |
| Docs        | Met                  | This document, dossier, `independencia-model-mission.md`, experience table, site note, art docs and README aligned.                           |
| Structure   | Met                  | Three acts, hidden objectives revealed per act and chapter cards with images.                                                                 |
| Opening     | Met                  | Three-beat narrated intro, chapter cards and epilogue from `scripts/capture_independencia_intro.mjs`; `MISSION_ART` uses the Lima capture.    |
| Art         | Pending (GLB)        | The draft `m8_independencia-intro` record (a Workbench blockout that did not show the tents its caption promised) was removed in the art reconciliation; the opening uses the in-engine Lima capture. The reused Ayacucho GLB keeps its review status (#343). |
| Performance | Met                  | `bench_scene.mjs` 2026-11-16, after the PCF shadow pass and the rig silhouette rule: opening 567,865 tris / 603 calls (under 625k/660, over 200 calls), Ayacucho 808,151 / 959 (under 920k/1,325); the caps were not raised; the scene now measures under them. |
| Scale       | Met                  | 256 m map, 128² painted ground and `unitSpeedScale: 0.75` → worker crossing ≈2:22; `tests/campaign-scale.test.ts`.                            |

## Campaign IV playable status (m8–m9)

Campaign IV is released as **playable** with the historical phases, onboarding, real-command
victory paths, dedicated decor GLBs and save round-trips covered. m9 is now a model mission (256 m,
painted ground, in-engine intro/epilogue and bench scenes); m8 is not yet. The HUD layout has a CI
geometry gate (`tests/e2e/hud-layout.spec.ts`).

| Gate        | m8 La Independencia                                                                                                           | m9 La Defensa de Arica                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| History     | Met: `independencia.md`; Junín and Ayacucho.                                                                                  | Met: `guerra_del_pacifico.md`; documented fall and certainty table.                                                           |
| Identity    | Met: hold Junín, protect Sucre, hold Ayacucho.                                                                                | Met: refuse the summons, mine the approaches, hold the cuartel through bombardment and assault.                               |
| Play        | Met: real-command playtest holds both phases with the cavalry, including montoneras.                                          | Met: real-command playtest reaches the documented ending with ordinary orders and no cheats.                                  |
| Contract    | Met: sequential holds plus a required protect objective.                                                                      | Met: three acts with hidden objectives, an optional battery visit and the documented fall as the ending.                      |
| Onboarding  | Met: four-step tutorial + briefing.                                                                                           | Met: five-step tutorial + briefing.                                                                                           |
| Terrain     | Met: authored Junín–Ayacucho heightfield.                                                                                     | Met: authored Arica port heightfield.                                                                                         |
| Closure     | Met: epilogue and optional objectives.                                                                                        | Met: the epilogue tells the fall, Bolognesi's death and the scuttling of the _Manco Cápac_.                                   |
| UX          | Met: briefing reviewed in the browser; `hud-layout.spec.ts` checks the panels at 1280×720 (Caral also at 1600×900/1920×1080). | Met: briefing reviewed in the browser; `hud-layout.spec.ts` checks the panels at 1280×720 (Caral also at 1600×900/1920×1080). |
| Visuals     | Met locally: authored independence site GLB + heightfield.                                                                    | Met locally: dedicated Arica battery GLB + authored port terrace.                                                             |
| Persistence | Met: save/load round-trip.                                                                                                    | Met: save/load round-trip.                                                                                                    |
| Tests       | Met: data, completability and real-command playtest.                                                                          | Met: data, acts, failure path and real-command playtest.                                                                      |
| Docs        | Met: README, dossier, campaign experiences and this table.                                                                    | Met: dossier, site note, campaign experiences and this table.                                                                 |

### m9 model-mission status (2026-11-14)

| Gate        | Status              | Evidence                                                                                                                                                                                           |
| ----------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opening     | Met                 | Three-beat in-engine intro (`capture_arica_intro.mjs`), `MISSION_ART` and an epilogue capture; PROVENANCE records the captures.                                                                    |
| Art         | Met                 | Approved authored battery intro (`m9_guerra_pacifico-intro`); the `arica_site` GLB and the in-engine captures keep their own status.                                                               |
| Performance | Met                 | `bench_scene.mjs`: opening ~535k tris / 600 calls, late ~813k / 782, under the recorded first-pass caps; `yarn bench:check` green. The call count is over §11's 200 target, as Lima and the Junta. |
| Scale       | Met                 | 256 m map, 128² painted ground over 256 m, `unitSpeedScale: 0.75` → worker crossing ≈2:22; `tests/campaign-scale.test.ts`.                                                                         |
| Pacing      | Pending (exception) | The real-command bot reaches the ending in ~7 min of simulated time; a human 20–30 min path is still unmeasured. The 30–40 target is documented as an exception in `arica-model-mission.md`.       |
| Site        | Met (exception)     | No construction phases: the port and fort are in use, not a monument the player builds; recorded here and in `arica-site.md`.                                                                      |

## La Junta del Cusco playable status (m_junta_cusco)

`m_junta_cusco` is the released opening of La Independencia. It is the first mission built after the
redesign and the first one to use the 256 m Cusco–Umachiri transect; its colonial city is dressed with a
procedural life overlay (houses, market, well and people).

| Gate        | m_junta_cusco                                                                                                                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History     | Met: `docs/historia/campanas/junta_cusco.md` with a certainty table; the epilogue tells the documented defeat.                                                                                             |
| Identity    | Met: many people and few firearms; the player delays Ramírez and saves the leaders, not the war.                                                                                                           |
| Play        | Met: the three-act chain completes with move/build/attack orders and no HP pinning; Pumacahua stays in reserve. The Cabildo visit still uses the field-card API, and a human playtest remains recommended. |
| Contract    | Met: Acts II–III hidden, optional Melgar and the Junta's artillery never gate victory, Pumacahua protected from the start.                                                                                 |
| Onboarding  | Met: six-step non-blocking tutorial, briefing and Codex.                                                                                                                                                   |
| Closure     | Met: epilogue states Umachiri, the executions and Melgar; no counterfactual is hidden.                                                                                                                     |
| UX          | Met: `hud-layout.spec.ts` at 1280×720 and the later-campaign layout check at 1600×900.                                                                                                                     |
| Visuals     | Partial: authored 256 m transect, painted ground, the colonial plaza/cabildo, the procedural colonial streets and in-engine captures; the kit is an abstraction, a Blender pass is pending.                |
| Site        | Met: the colonial city stands from the opening (the historical Cusco predates the Junta), with houses, stalls, a well and people; no construction phase is invented.                                       |
| Persistence | Met: save/load round-trip in `save-campaign.spec.ts`.                                                                                                                                                      |
| Tests       | Met: `tests/junta-cusco.test.ts`, scale, campaign path and the campaign E2E specs.                                                                                                                         |
| Docs        | Met: dossier, `junta-cusco-model-mission.md`, this table and the redesign status.                                                                                                                          |
| Performance | Partial: ~741k triangles / ~986 draw calls, dominated by unit rigs; passes the 780k/1000 regression cap but remains over art-direction §11's 600k/200 target.                                              |
| Art         | Met: approved authored plaza intro render; the streets remain procedural and the captures are in-engine and documented in PROVENANCE.                                                                      |
| Structure   | Met: three acts with hidden objectives, two chapter cards, optional Melgar/artillery goals and the documented ending.                                                                                      |
| Opening     | Met: three narrated beats with in-engine captures, two act cards and the epilogue backdrop.                                                                                                                |
| Scale       | Met: 256 m transect, 128² painted ground and worker crossing ≈2:22 (`tests/campaign-scale.test.ts`).                                                                                                       |

## La Ciudad de los Reyes playable status (m_lima)

`m_lima` is the released opening of El Virreinato. It uses a 256 m coast transect (sea, Rímac, Lima plain,
Quizu's hills) and starts as the traced plaza; the colonial church and the streets appear with the cabildo.

| Gate        | m_lima                                                                                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History     | Met: `docs/historia/campanas/lima.md` with a certainty table; the valley was inhabited and the defence relied on Andean allies.                                         |
| Identity    | Met: found the city and hold the siege; the curaca pact is optional.                                                                                                    |
| Play        | Met (automated): three acts complete with real move/build/attack orders and no HP pinning. The plaza visit goes through the HUD — the E2E selects the Plaza Mayor on the map, presses «Visitar» and checks the tutorial advances from `traza` to `cabildo` — instead of calling `visitHeritage`. A human playtest remains recommended. |
| Contract    | Met: Act II–III hidden, the curaca pact optional, Pizarro protected from the start.                                                                                     |
| Onboarding  | Met: six-step tutorial, briefing and Codex.                                                                                                                             |
| Closure     | Met: the epilogue states that Cusco remains besieged; no counterfactual is hidden.                                                                                      |
| UX          | Met: the campaign layout check at 1600×900 and `hud-layout.spec.ts` at 1280×720.                                                                                        |
| Visuals     | Partial: authored 256 m coast transect, a traced plaza phase, the colonial church and houses/stalls/people; the kit is procedural and a Blender pass is pending.        |
| Site        | Met: `traza` (cord, packed plaza, provisional shelters) → `ciudad` (church, ten houses, market, well, people) triggered by the cabildo.                                 |
| Persistence | Met: save/load round-trip in `save-campaign.spec.ts`.                                                                                                                   |
| Tests       | Met: `tests/lima.test.ts`, scale, campaign path and the campaign E2E specs.                                                                                             |
| Docs        | Met: dossier, `lima-model-mission.md`, this table and the redesign status; the 2026-11-16 pass refreshed the performance figures and removed the stale API-only Play claim. |
| Performance | Partial (measured 2026-11-16): software `bench:check` opening ~645k tris (627–664k observed, the vegetation kit varies between runs) / 624 calls and the city with the siege crowd 927,198 / 928, under the 800k/860 and 1.1M/1,250 regression caps. Hardware high (`--gpu`, Intel iGPU) ~874k / 627 and 1,134,038 / 931, against 974,062 / 832 and 1,267,920 / 1,226 with VSM on the same scene: the PCF pass and the rig silhouette rule take ~100k/134k triangles and 205/295 calls off. Both views are still far over §11's 600k/200 target, so the row stays Partial until the hardware/LOD pass. |
| Art         | Met: approved authored plaza/cathedral intro render; the streets remain procedural and the captures are in-engine.                                                      |
| Structure   | Met: three acts with hidden objectives, two chapter cards and the documented siege.                                                                                     |
| Opening     | Met: three narrated beats with in-engine captures, two act cards and the epilogue backdrop.                                                                             |
| Scale       | Met: 256 m transect, 128² painted ground and worker crossing ≈2:22 (`tests/campaign-scale.test.ts`).                                                                    |

## Los hijos de Tambotoco playable status (m_tambotoco)

`m_tambotoco` is the released opening of El Tahuantinsuyo and the first **Leyenda** mission. It is built on
the 256 m Pacaritambo–Huanacaure–Cusco transect and draws its own ayllu kit (cave, shrine, hamlets and the
planned Inticancha).
The table separates what is implemented from the art-direction pilot that is still open; the intro render is
approved.

| Gate        | m_tambotoco                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| History     | Met: `docs/historia/campanas/tambotoco.md` with a certainty table; the dossier states that Sarmiento is hostile and Garcilaso gives another version.                     |
| Identity    | Met: water and land as leverage, not a pitched battle; the four canchas order the foundation.                                                                            |
| Characters  | Met: eight named siblings with declared genders, accent attire and a hero mantle; crests differ and far zoom keeps only the rings. Cachi, Uchu and Auca leave a named huaca. |
| Play        | Met (automated): no HP pinning; the E2E holds Huanacaure through the valley wave, builds the optional irrigation farm and verifies `a3_acequia` is pending before the hold, then opens it. The heritage visit and the gate now go through the HUD — the test selects the monument on the map, presses «Visitar» and «Abrir compuerta» — instead of calling `visitHeritage`/`toggleCanal`. `yarn record --mode=full` completes with the wave; a human 30–40 min playtest is still recommended. |
| Contract    | Met: Acts II–IV hidden; the hualla visit (pays 150 food / 100 wood) and the irrigation farm are optional; the defended intake (`a3_oleada`) gates the acequia, the only required water step.     |
| Onboarding  | Met: six-step tutorial that teaches controls (move, camp store, hunt, visit, water, canchas), briefing with the eight siblings and Codex.                                |
| Closure     | Met: the epilogue tells the foundation as tradition and names both versions; no counterfactual is hidden.                                                                |
| UX          | Met: campaign layout at 1600×900, the eight-card briefing at 1280×720, a left dialogue dock above the minimap, portrait chips for a selected cast, a large-screen HUD scale at 1920×1080 and `hud-layout.spec.ts`. |
| Visuals     | Met (baseline): 256 m transect, the modular terrain-conformed ayllu kit (coursed stone, thatch houses, qollqas, terraced fields, paved plaza at grade) and the approved EEVEE intro render (`m_tambotoco-intro`). The art-direction pilot ([`tambotoco-art-pilot.md`](./tambotoco-art-pilot.md)) is the next pass; it is a quality gate, not a rebuild. |
| Persistence | Met: save/load round-trip in `save-campaign.spec.ts`.                                                                                                                    |
| Tests       | Met: `tests/tambotoco.test.ts` (cast, tags, huaca beats), scale, campaign path and the campaign E2E specs.                                                               |
| Docs        | Met: dossier, `tambotoco-model-mission.md`, this table and the redesign status.                                                                                          |
| Performance | Met (measured 2026-11-16; E1): software `bench:check` opening **431,312 tris / 261 calls** and founded Inticancha **605,084 / 357**; the pre-E1 baseline was 436,880/265 and 608,324/347 and hardware high was **479,630 / 264** and **651,572 / 353** (E1 hardware not re-measured). The opening cap is **500k / 280** (ratcheted from 600k/340) and the late cap stays **660k / 360**, both met without raising them. The pass batched contact shadows into one instanced draw, merged the site by surface family per phase, cut the inland water grid and trimmed the dry-puna ground cover; E1 added the terrain shadow sample and trimmed flat earth/rock/wood casters. Frame time on the Intel RPL-S iGPU at high quality with post-processing on: **41 FPS** opening and **35 FPS** late (24.1 / 28.8 ms p50). `node scripts/bench_scene.mjs --mission=m_tambotoco [--stage=late] [--gpu] --assert` is the gate. |
| Art         | Met: approved authored EEVEE intro render; the ayllu kit stays procedural; captures are in-engine and documented in PROVENANCE.                                          |
| Structure   | Met: four acts with hidden objectives, three chapter cards and the documented foundation.                                                                                |
| Opening     | Met: three narrated beats with in-engine captures, three act cards and the epilogue backdrop.                                                                            |
| Scale       | Met: 256 m transect, 128² painted ground and worker crossing ≈2:22 (`tests/campaign-scale.test.ts`).                                                                     |

## Inca civil war playable status (m6b)

Reviewed 2026-11-14 as a model mission. The human art gate is still open.

| Gate        | Status               | Evidence                                                                                                                                                   |
| ----------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History     | Met                  | `docs/historia/campanas/guerra_civil_inca.md` with its certainty table; no invented battle or ruler.                                                       |
| Identity    | Met                  | The dynastic war, the Quipaipan hold and Huáscar's capture without razing Cusco.                                                                           |
| Terrain     | Met                  | 256 m authored highland heightfield (`cuscoHeightmap.ts`) with painted ground: pampa, terraces, quebrada and ridges.                                       |
| Site        | Met (exception)      | No construction phases: Cusco is a living capital and Quipaipan a battlefield; recorded in `guerra-civil-model-mission.md`.                                |
| Play        | Met                  | `campaign-playtest.spec.ts` advances, holds and captures with real orders and keeps the centre standing; completable and save paths are covered.           |
| Contract    | Met                  | Three acts (march, Quipaipan, capture) with hidden goals revealed by triggers and chapter cards.                                                           |
| Onboarding  | Met                  | Non-blocking tutorial, briefing, Codex and minimap pips.                                                                                                   |
| Closure     | Met                  | Dusk epilogue capture narrates Cajamarca and the weakened empire.                                                                                          |
| UX          | Met                  | `tests/e2e/hud-layout.spec.ts` checks the panels geometrically at 1280×720 (Caral also at 1600×900 and 1920×1080).                                         |
| Visuals     | Met locally          | Authored Cusco GLB, painted pampa and in-engine intro/epilogue captures in `public/media/cusco-inca/`.                                                     |
| Persistence | Met                  | Mid-capture save/load in `save-campaign.spec.ts` (capture progress and tutorial); v10 m6b saves are rejected (`SAVE_VERSION` 11).                          |
| Tests       | Met                  | Data, site/proxy collision, tutorial, mission, HUD, real-command playtest and save/load coverage.                                                          |
| Docs        | Met                  | This document, dossier, `guerra-civil-model-mission.md`, experience table, site note, art docs and README aligned.                                         |
| Structure   | Met                  | Three acts, hidden objectives revealed per act and chapter cards with images.                                                                              |
| Opening     | Met                  | Three-beat narrated intro, chapter cards and epilogue from `scripts/capture_cusco_inca_intro.mjs`; `MISSION_ART` uses the Quipaipan capture.               |
| Art         | Pending (GLB)        | The draft `m6b_guerra_civil-intro` record (a grey Workbench blockout of the walled compound) was removed in the art reconciliation; the opening uses the in-engine Quipaipan capture. The reused Cusco GLB keeps its review status (#343). |
| Performance | Met                  | `bench_scene.mjs`: opening ~703k tris / 436 calls, battle ~967k / 673; over the 600k art-direction target (as m7/m9), within the recorded first-pass caps. |
| Scale       | Met                  | 256 m map, 128² painted ground and `unitSpeedScale: 0.75` → worker crossing ≈2:22; `tests/campaign-scale.test.ts`.                                         |
