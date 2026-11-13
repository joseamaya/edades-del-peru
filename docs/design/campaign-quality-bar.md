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
| UX          | At 1280×720, 1600×900 and 1920×1080 the tutorial, briefing, objectives, dialogue, card panel, minimap and result screen remain readable and do not cover their own controls.                            |
| Visuals     | The scene is recognisable at RTS zoom, the authored landmark reads, and the palette/material pass does not hide the silhouettes. Evidence is a current screenshot, not a stale review image. |
| Persistence | Save/load restores the mission, tutorial, optional visits, canal state and hold timers.                                                                                                      |
| Tests       | Data tests, objective/trigger tests, an E2E mission path and a real-command playtest cover the behaviour. `yarn verify:fast` and CI are green.                                               |
| Docs        | README, campaign dossier, experience design and development notes agree with the implemented mission.                                                                                        |
| Structure   | The mission plays as acts: hidden objectives revealed per act, chapter cards between them, optional goals that never gate victory, and the documented outcome as the ending.                 |
| Opening     | A narrated intro and a briefing with the mission's own art (or a neutral backdrop), chapter-card and epilogue images captured in engine and documented as such.                              |
| Art         | New models and images carry `confidence` and pass a recorded human review; PROVENANCE and the dossier certainty table agree.                                                                 |
| Performance | The mission's opening (and, when its late game fills the screen, its late view) is in `scripts/bench_scene.mjs` and passes `yarn bench:check`; `dist/` stays under its budget.               |
| Scale       | A model mission uses a 256 m map and painted ground sampled every 2 m; its worker crosses in 130–160 s. `tests/campaign-scale.test.ts` enforces it for every mission on the model list.      |

## Caral gold-master status

Reviewed 2026-11-07 after the four-act rebuild (design and status: [`caral-model-mission.md`](./caral-model-mission.md)).

| Gate        | Status | Evidence                                                                                                                                                                                                                                                                                           |
| ----------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History     | Met    | `docs/historia/campanas/caral.md` with its certainty table; no documented war; anonymous narrator; Vichama as the epilogue's memory of the crisis.                                                                                                                                                 |
| Identity    | Met    | Coast–valley complementarity (valley cotton becomes Áspero's nets), the Pyramid Mayor built in phases by hand-overs and fed by the communal store, the drought that ends the city.                                                                                                                 |
| Play        | Met    | `tests/e2e/campaign-playtest.spec.ts` reaches victory with ordinary commands and locks the bot pacing at 15–30 min; `caral-city.spec.ts` covers the hand-over and the field cards.                                                                                                                 |
| Contract    | Met    | Act objectives start hidden and are revealed by triggers (`tests/caral-acts.test.ts`); construction work turns consume food and pause when the communal store is empty; the briefing shows Act I only; optional Huaca visit, six-complex tour and assembly.                                        |
| Onboarding  | Met    | Nine-step tutorial docked under the objectives (select, coast, house, valley, field, storage, nets, pyramid, works); briefing; Codex optional.                                                                                                                                                     |
| Closure     | Met    | Departure epilogue with its image, optional-achievement summary, "Continuar" to m2, which the campaign path then unlocks.                                                                                                                                                                          |
| UX          | Met    | Horizontal command bar, tutorial on the right; `tests/e2e/hud-layout.spec.ts` checks the HUD panels geometrically at 1280×720, 1600×900 and 1920×1080; the full-screen briefing was checked in a browser.                                                                                                     |
| Visuals     | Met    | 256 m sea-to-terrace transect, Blender architecture kit by phase (white finished plaster; ochre/red in use, exact colours inferred), burial dust/fire, summer flood and drought (valley/lomas paint and river level), Áspero, painted fertile ground, region flora and fauna, living-city details. |
| Persistence | Met    | Save/load restores the site phase and the drought without re-applying its losses; tutorial, canal, construction and hold timers round-trip.                                                                                                                                                        |
| Tests       | Met    | Data, acts (including the empty-store pause), E2E specs and real-command playtest; `yarn verify:fast` and CI green.                                                                                                                                                                                |
| Docs        | Met    | Dossier, `caral-model-mission.md`, `model-mission-pattern.md`, PROVENANCE aligned.                                                                                                                                                                                                                 |
| Structure   | Met    | Four acts: Áspero, the valley, the Sacred City, the drought; chapter cards with images.                                                                                                                                                                                                            |
| Opening     | Met    | Three-beat narrated intro; briefing with Áspero's capture; act and epilogue images from `scripts/capture_caral_intro.mjs`.                                                                                                                                                                         |
| Art         | Met    | Architecture kit and captures approved by human review on 2026-11-07 (`reviewer`/`reviewedAt` in the manifests, PROVENANCE).                                                                                                                                                                       |
| Performance | Met    | `bench_scene.mjs` re-run 2026-11-09: opening 331,766 tris / 205 calls; late 581,611 / 262; within the 400k / 600k budgets.                                                                                                                                                                         |
| Scale       | Met    | 256 m map, painted ground every 2 m (128 over 256) and `unitSpeedScale: 0.75` → worker crossing ≈2:22; `tests/campaign-scale.test.ts`.                                                                                                                                                             |

Updated 2026-11-09: phase paint evidence, the burial ritual and the communal-store-fed construction work turns were
added (see `caral-model-mission.md` Open items); the unit speed scale paces the 256 m transect (0.5 at the time, 0.75 since 2026-11-12).

## Chavín gold-master status

Reviewed 2026-11-07 against the model-mission gates. Status is honest about the human art gate.

| Gate        | Status               | Evidence                                                                                                                                                                               |
| ----------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History     | Met                  | `docs/historia/campanas/chavin.md` with its certainty table; UNESCO 330, Plan de Manejo 2020, Rick et al., Burger/Kembel; no invented war.                                             |
| Identity    | Met                  | Ceremonial prestige: offerings fund the temple, pilgrimage fills the plaza, the fair links long-distance exchange.                                                                     |
| Play        | Met (automated)      | `campaign-playtest.spec.ts` reaches victory through the four acts; the market and offerings use real commands, stone hand-over uses `Mission.recordDelivery`. Manual playtest pending. |
| Contract    | Met                  | Acts II–IV start hidden and are revealed by triggers; optional Plaza, gallery, Portada and major offering never gate victory.                                                          |
| Onboarding  | Met                  | Nine-step non-blocking Chavín tutorial, briefing and Codex; the briefing shows Act I only.                                                                                             |
| Closure     | Met                  | Decline epilogue with its own capture and optional-achievement summary; “Continuar” to m3.                                                                                             |
| UX          | Met                  | `tests/e2e/hud-layout.spec.ts` checks the panels geometrically at 1280×720 (Caral also at 1600×900 and 1920×1080).                                                                                               |
| Visuals     | Met locally          | Source-derived Chavín kit, phased temple, highland palette and current RTS captures in `public/media/chavin/`.                                                                         |
| Persistence | Met                  | `save-campaign.spec.ts` restores the site phase, offerings and tutorial step.                                                                                                          |
| Tests       | Met (automated)      | Data, site, tutorial, E2E mission, save/load and automated playtest; the manual playtest is pending.                                                                                   |
| Docs        | Met                  | Dossier, `chavin-model-mission.md`, this table, `chavin-sacred-site.md`, PROVENANCE and README aligned.                                                                                |
| Structure   | Met                  | Four acts, hidden objectives revealed per act, chapter cards with images, optional goals, documented decline.                                                                          |
| Opening     | Met                  | Three-beat narrated intro and briefing with the mission's own art; chapter-card and epilogue captures from `capture_chavin_intro.mjs`.                                                 |
| Art         | Pending human review | Kit and captures are exported with `reviewed: false`; a human review must record `reviewer`/`reviewedAt` before this gate is Met.                                                      |
| Performance | Met                  | `bench_scene.mjs` re-run 2026-11-09 after the resize: opening 413,433 tris / 160 calls; late 462,835 / 223; within the 450k / 600k budgets.                                            |
| Scale       | Met                  | 256 m map, painted ground every 2 m (128 over 256) and `unitSpeedScale: 0.75` → worker crossing ≈2:22; `tests/campaign-scale.test.ts`.                                                 |

## Moche gold-master status

| Gate        | Status      | Evidence                                                                                                                                                                                     |
| ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History     | Met         | `docs/historia/campanas/moche_recuay.md`; no invented ruler or single battle.                                                                                                                |
| Identity    | Met         | Authored Huacas de Moche, operable canal, huaca hold and elite exchange.                                                                                                                     |
| Terrain     | Met         | Authored coastal heightfield (`mocheHeightmap.ts`): Pacific shore, irrigated valley and Huacas terrace.                                                                                      |
| Play        | Met         | `campaign-playtest.spec.ts` moves real units and exchanges silver; `moche-campaign.spec.ts` selects the cards through public state and clicks the canal and Huaca de la Luna action buttons. |
| Contract    | Met         | Canal, hold, required 250 and optional 400 silver; hidden goals stay out of the briefing (covered by `campaign.test.ts`).                                                                    |
| Onboarding  | Met         | Four-step Moche tutorial, briefing, Codex and minimap pips.                                                                                                                                  |
| Closure     | Met         | Mission epilogue and optional elite-exchange summary.                                                                                                                                        |
| UX          | Met         | `tests/e2e/hud-layout.spec.ts` checks the panels geometrically at 1280×720 (Caral also at 1600×900 and 1920×1080).                                                                                                     |
| Visuals     | Met locally | Authored site GLB, desert palette and current RTS captures in `review/`.                                                                                                                     |
| Persistence | Met         | Canal, hold timer, delivered silver and tutorial round-trip in `save-campaign.spec.ts`.                                                                                                      |
| Tests       | Met         | Data, site/proxy collision, tutorial, mission, HUD, real-command playtest and save/load coverage.                                                                                            |
| Docs        | Met         | This document, dossier, experience table, site note, art docs and README aligned.                                                                                                            |

## Wari gold-master status

| Gate        | Status      | Evidence                                                                                                                                                           |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| History     | Met         | `docs/historia/campanas/wari_tiahuanaco.md`; no invented war or ruler.                                                                                             |
| Identity    | Met         | Authored Wari site and a two-node `network` objective plus frontier hold.                                                                                          |
| Terrain     | Met         | Authored highland heightfield (`wariHeightmap.ts`): basin, terraces and provincial-node plateaus.                                                                  |
| Play        | Met         | `tests/e2e/campaign-playtest.spec.ts` builds the farms and markets with real commands and reaches victory from the documented 300 wood / 100 silver opening stock. |
| Contract    | Met         | Network progress, hidden frontier, optional third centre and live timers.                                                                                          |
| Onboarding  | Met         | Four-step Wari tutorial, briefing, Codex and minimap pips.                                                                                                         |
| Closure     | Met         | Epilogue connects the network with the 1000–1100 CE collapse.                                                                                                      |
| UX          | Met         | `tests/e2e/hud-layout.spec.ts` checks the panels geometrically at 1280×720 (Caral also at 1600×900 and 1920×1080).                                                                           |
| Visuals     | Met locally | Authored site GLB, terrain-following road ribbons, highland palette and current RTS captures in `review/`.                                                         |
| Persistence | Met         | Network, hold and mission state use the shared save/load path.                                                                                                     |
| Tests       | Met         | Data, site, network, real-command playtest, save/load and completability coverage.                                                                                 |
| Docs        | Met         | This document, dossier, experience table, site note, art docs and README aligned.                                                                                  |

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

| Gate        | m5 Yahuar Pampa                                                                                     | m6 Chimú–Inca                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| History     | Met: `yahuar_pampa.md`; no invented battle.                                                         | Met: `chimu_inca.md`; water/canal campaign.                                                         |
| Identity    | Met: defend Cusco, protect Cusi, counterattack.                                                     | Met: advance to Paramonga, cut the canal, force surrender.                                          |
| Terrain     | Met: authored Yahuar Pampa heightfield.                                                             | Met: authored Chimú coastal heightfield.                                                            |
| Play        | Met: real-command playtest holds and counterattacks.                                                | Met: real-command playtest advances and cuts the canal.                                             |
| Contract    | Met: defend, destroy, protect; waves and timer.                                                     | Met: staged Paramonga/canal objectives; optional Chan Chan/hold.                                    |
| Onboarding  | Met: three-step tutorial + briefing.                                                                | Met: four-step tutorial + briefing.                                                                 |
| Closure     | Met: epilogue and optional achievements.                                                            | Met: epilogue and optional objectives.                                                              |
| UX          | Met: briefing reviewed in the browser; `hud-layout.spec.ts` checks the panels at 1280×720 (Caral also at 1600×900/1920×1080). | Met: briefing reviewed in the browser; `hud-layout.spec.ts` checks the panels at 1280×720 (Caral also at 1600×900/1920×1080). |
| Visuals     | Met locally: authored Chanca site GLB + heightfield.                                                | Met locally: authored Chimú site GLB + heightfield + canal.                                         |
| Persistence | Met: save/load round-trip.                                                                          | Met: save/load round-trip.                                                                          |
| Tests       | Met: data, completability, real-command playtest.                                                   | Met: data, completability, real-command playtest.                                                   |
| Docs        | Met: README, dossiers, campaign experiences and this table.                                         | Met: README, dossiers, campaign experiences and this table.                                         |

## Campaign III playable status (m7)

Campaign III is released as **playable** with the historical choice, onboarding, real-command
victory path, dedicated decor GLB and save round-trip covered. It is not yet a full gold master
because the visual evidence is still local (review captures), although the HUD layout now has a CI
geometry gate (`tests/e2e/hud-layout.spec.ts`).

| Gate        | m7 Túpac Amaru                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------- |
| History     | Met: `tupac_amaru.md`; rebellion, Sangarará and repression.                                         |
| Identity    | Met: sustain the rebellion, protect Túpac Amaru, choose assault or siege.                           |
| Play        | Met: real-command playtest assaults the realista command post.                                      |
| Contract    | Met: alternative assault/siege victory plus a required protect objective.                           |
| Onboarding  | Met: six-step tutorial + briefing.                                                                  |
| Terrain     | Met: authored Cusco colonial heightfield.                                                           |
| Closure     | Met: epilogue and optional objectives.                                                              |
| UX          | Met: briefing reviewed in the browser; `hud-layout.spec.ts` checks the panels at 1280×720 (Caral also at 1600×900/1920×1080). |
| Visuals     | Met locally: authored colonial site GLB + heightfield.                                              |
| Persistence | Met: save/load round-trip.                                                                          |
| Tests       | Met: data, completability, branch choice and real-command playtest.                                 |
| Docs        | Met: README, dossier, campaign experiences and this table.                                          |

## Campaign IV playable status (m8–m9)

Campaign IV is released as **playable** with the historical phases, onboarding, real-command
victory paths, dedicated decor GLBs and save round-trips covered. It is not yet a full gold master
because the visual evidence is still local (review captures), although the HUD layout now has a CI
geometry gate (`tests/e2e/hud-layout.spec.ts`).

| Gate        | m8 La Independencia                                                                                 | m9 La Defensa de Arica                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| History     | Met: `independencia.md`; Junín and Ayacucho.                                                        | Met: `guerra_del_pacifico.md`; Arica land defence.                                                  |
| Identity    | Met: hold Junín, protect Sucre, hold Ayacucho.                                                      | Met: protect the port and Bolognesi, survive the assault.                                           |
| Play        | Met: real-command playtest holds both phases with the cavalry, including montoneras.                | Met: real-command playtest defends the port and intercepts the final assault.                       |
| Contract    | Met: sequential holds plus a required protect objective.                                            | Met: required protects and survive, with an optional counterstrike.                                 |
| Onboarding  | Met: four-step tutorial + briefing.                                                                 | Met: five-step tutorial + briefing.                                                                 |
| Terrain     | Met: authored Junín–Ayacucho heightfield.                                                           | Met: authored Arica port heightfield.                                                               |
| Closure     | Met: epilogue and optional objectives.                                                              | Met: epilogue and optional objective.                                                               |
| UX          | Met: briefing reviewed in the browser; `hud-layout.spec.ts` checks the panels at 1280×720 (Caral also at 1600×900/1920×1080). | Met: briefing reviewed in the browser; `hud-layout.spec.ts` checks the panels at 1280×720 (Caral also at 1600×900/1920×1080). |
| Visuals     | Met locally: authored independence site GLB + heightfield.                                          | Met locally: dedicated Arica battery GLB + authored port terrace.                                   |
| Persistence | Met: save/load round-trip.                                                                          | Met: save/load round-trip.                                                                          |
| Tests       | Met: data, completability and real-command playtest.                                                | Met: data, failure path, completability and real-command playtest.                                  |
| Docs        | Met: README, dossier, campaign experiences and this table.                                          | Met: README, dossier, campaign experiences and this table.                                          |


## La Junta del Cusco playable status (m_junta_cusco)

`m_junta_cusco` is the released opening of La Independencia. It is the first mission built after the
redesign and the first one to use the 256 m Cusco–Umachiri transect. The table is honest about the city
art and performance passes, which are still open.

| Gate        | m_junta_cusco                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| History     | Met: `docs/historia/campanas/junta_cusco.md` with a certainty table; the epilogue tells the documented defeat. |
| Identity    | Met: many people and few firearms; the player delays Ramírez and saves the leaders, not the war.       |
| Play        | Met (automated wiring): the three-act chain completes with move/build/attack orders; attrition is isolated in the test and the no-cheat manual playtest is pending. |
| Contract    | Met: Acts II–III hidden, optional Melgar and the Junta's artillery never gate victory, Pumacahua protected from the start. |
| Onboarding  | Met: six-step non-blocking tutorial, briefing and Codex.                                               |
| Closure     | Met: epilogue states Umachiri, the executions and Melgar; no counterfactual is hidden.                 |
| UX          | Met: `hud-layout.spec.ts` at 1280×720 and the later-campaign layout check at 1600×900.                 |
| Visuals     | Partial: authored 256 m transect, painted ground, the colonial plaza/cabildo and in-engine intro/chapter/epilogue captures; the Cusco city overlay is still a typological abstraction. |
| Persistence | Met: save/load round-trip in `save-campaign.spec.ts`.                                                  |
| Tests       | Met: `tests/junta-cusco.test.ts`, scale, campaign path and the campaign E2E specs.                     |
| Docs        | Met: dossier, `junta-cusco-model-mission.md`, this table and the redesign status.                      |
| Performance | Pending: high-preset opening ~738k triangles / ~982 draw calls, dominated by unit rigs; over art-direction §11's 600k/200 budget and not registered as a passing bench scene. |
| Art         | N/A for new models: the mission reuses the colonial plaza GLB; the captures are in-engine and documented in PROVENANCE. |
| Structure   | Met: three acts with hidden objectives, two chapter cards, optional Melgar/artillery goals and the documented ending. |
| Opening     | Met: three narrated beats with in-engine captures, two act cards and the epilogue backdrop.              |
| Scale       | Met: 256 m transect, 128² painted ground and worker crossing ≈2:22 (`tests/campaign-scale.test.ts`).     |

## La Ciudad de los Reyes playable status (m_lima)

`m_lima` is the released opening of El Virreinato. It uses a 256 m coast transect (sea, Rímac, Lima plain,
Quizu's hills) and reuses the colonial plaza GLB for the traza. The table separates what is implemented
from the art and performance passes still open.

| Gate        | m_lima                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| History     | Met: `docs/historia/campanas/lima.md` with a certainty table; the valley was inhabited and the defence relied on Andean allies. |
| Identity    | Met: found the city and hold the siege; the curaca pact is optional.                                  |
| Play        | Met (automated): three acts complete with real move/build/attack orders; a manual playtest is pending. |
| Contract    | Met: Act II–III hidden, the curaca pact optional, Pizarro protected from the start.                    |
| Onboarding  | Met: six-step tutorial, briefing and Codex.                                                           |
| Closure     | Met: the epilogue states that Cusco remains besieged; no counterfactual is hidden.                     |
| UX          | Met: the campaign layout check at 1600×900 and `hud-layout.spec.ts` at 1280×720.                       |
| Visuals     | Partial: authored 256 m coast transect, the reused colonial plaza and in-engine captures; no Lima traza kit. |
| Site        | Partial: the plaza/church is the reused colonial GLB; no phase plan or living traza.                     |
| Persistence | Met: save/load round-trip in `save-campaign.spec.ts`.                                                  |
| Tests       | Met: `tests/lima.test.ts`, scale, campaign path and the campaign E2E specs.                            |
| Docs        | Met: dossier, `lima-model-mission.md`, this table and the redesign status.                             |
| Performance | Met within its first-pass budget: ~763k triangles / ~839 draw calls, under the 860-call cap; tightening to 200 is the follow-up. |
| Art         | N/A for new models: the plaza is the reused colonial GLB; captures are in-engine and documented.       |
| Structure   | Met: three acts with hidden objectives, two chapter cards and the documented siege.                    |
| Opening     | Met: three narrated beats with in-engine captures, two act cards and the epilogue backdrop.            |
| Scale       | Met: 256 m transect, 128² painted ground and worker crossing ≈2:22 (`tests/campaign-scale.test.ts`).    |

## Los hijos de Tambotoco playable status (m_tambotoco)

`m_tambotoco` is the released opening of El Tahuantinsuyo and the first **Leyenda** mission. It is built on
the 256 m Pacaritambo–Huanacaure–Cusco transect and reuses the chanca pucará GLB as the Huanacaure huaca.
The table separates what is implemented from the art and performance passes that are still open.

| Gate        | m_tambotoco                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| History     | Met: `docs/historia/campanas/tambotoco.md` with a certainty table; the dossier states that Sarmiento is hostile and Garcilaso gives another version. |
| Identity    | Met: water and land as leverage, not a pitched battle; the four canchas order the foundation.        |
| Characters  | Met: the eight siblings march as named units; Cachi, Uchu and Auca leave a named huaca.                |
| Play        | Met: the four acts complete with real orders and a recorded run reaches victory; a manual playtest is pending. |
| Contract    | Met: Acts II–IV hidden, the hualla visit is optional, and the acequia is the only required water step. |
| Onboarding  | Met: seven-step tutorial, briefing with the eight siblings and Codex.                                |
| Closure     | Met: the epilogue tells the foundation as tradition and names both versions; no counterfactual is hidden. |
| UX          | Met: campaign layout at 1600×900, the eight-card briefing at 1280×720 and `hud-layout.spec.ts`.       |
| Visuals     | Partial: authored 256 m transect, the Huanacaure huaca and in-engine intro/chapter/epilogue captures; the huaca is a reused pucará. |
| Persistence | Met: save/load round-trip in `save-campaign.spec.ts`.                                                |
| Tests       | Met: `tests/tambotoco.test.ts` (cast, tags, huaca beats), scale, campaign path and the campaign E2E specs. |
| Docs        | Met: dossier, `tambotoco-model-mission.md`, this table and the redesign status.                      |
| Performance | Met within its first-pass budget: ~540k triangles / ~324–327 draw calls (eight Ayar nameplates included), under the 330-call cap in `bench_scene.mjs`; tightening to art-direction §11's 200 calls is the follow-up. |
| Art         | N/A for new models: the huaca reuses the chanca pucará; captures are in-engine and documented in PROVENANCE. |
| Structure   | Met: four acts with hidden objectives, three chapter cards and the documented foundation.             |
| Opening     | Met: three narrated beats with in-engine captures, three act cards and the epilogue backdrop.          |
| Scale       | Met: 256 m transect, 128² painted ground and worker crossing ≈2:22 (`tests/campaign-scale.test.ts`).  |

## Inca civil war playable status (m6b)

`m6b_guerra_civil` is released as **playable**. It uses the same authored-site
pipeline as the later campaigns.

| Gate        | m6b La Guerra Civil                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| History     | Met: `guerra_civil_inca.md`; Huáscar vs Atahualpa.                                                     |
| Identity    | Met: advance to Quipaipan, defeat Huáscar, protect Atahualpa.                                          |
| Terrain     | Met: authored Cusco/Quipaipan heightfield.                                                             |
| Play        | Met: real-command playtest attack-moves to Quipaipan, clears Huáscar's defenders and takes the centre. |
| Contract    | Met: reach, hidden destroy and protect objectives.                                                     |
| Onboarding  | Met: three-step tutorial + briefing.                                                                   |
| Closure     | Met: epilogue and optional objectives.                                                                 |
| UX          | Met: briefing reviewed in the browser; `hud-layout.spec.ts` checks the panels at 1280×720 (Caral also at 1600×900/1920×1080).    |
| Visuals     | Met locally: authored Cusco site GLB + heightfield; intro render pending.                              |
| Persistence | Met: save/load round-trip.                                                                             |
| Tests       | Met: data, completability and real-command playtest.                                                   |
| Docs        | Met: README, dossier, experiences and this table.                                                      |
