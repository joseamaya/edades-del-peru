# Campaign quality bar

This is the definition of done for a historical campaign. Caral (`m1_caral`) and Chavín (`m2_chavin`) are the
gold-master cases; the other missions are reviewed against the same gates before
they are called complete. A mission is not done because it boots or because its
objectives can be satisfied by a test harness.

## Gates

| Gate        | Requirement                                                                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History     | Dates, places, societies and named people come from `docs/historia/`; uncertain forms are labelled plausible or abstraction. No invented war, ruler, battle, technology or ritual.           |
| Identity    | The mission has a world and a mechanic that belong to its historical problem, not only `gather + build + survive`.                                                                           |
| Play        | A player can reach victory through ordinary commands: movement, construction, gathering and the mission's own mechanic. No resource, health, spawn or objective cheats required.             |
| Contract    | Required and optional objectives are distinct; hidden objectives are not spoiled in the briefing; every measurable objective shows live progress.                                            |
| Onboarding  | The tutorial or briefing explains the next useful action without blocking the player; there is no dead end and the Codex remains optional.                                                   |
| Closure     | Victory gives a mission-specific epilogue and a summary of optional achievements; the next mission can be started from the result screen.                                                    |
| UX          | At 1280×800 and 1600×900 the tutorial, briefing, objectives, dialogue, card panel, minimap and result screen remain readable and do not cover their own controls.                            |
| Visuals     | The scene is recognisable at RTS zoom, the authored landmark reads, and the palette/material pass does not hide the silhouettes. Evidence is a current screenshot, not a stale review image. |
| Persistence | Save/load restores the mission, tutorial, optional visits, canal state and hold timers.                                                                                                      |
| Tests       | Data tests, objective/trigger tests, an E2E mission path and a real-command playtest cover the behaviour. `yarn verify:fast` and CI are green.                                               |
| Docs        | README, campaign dossier, experience design and development notes agree with the implemented mission.                                                                                        |

## Caral gold-master status

| Gate        | Status      | Evidence                                                                                                                                                                                                                                   |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| History     | Met         | `docs/historia/campanas/caral.md`, UNESCO / Zona Arqueológica Caral sources; no documented war.                                                                                                                                            |
| Identity    | Met         | Authored Supe valley and Caral Alto/Bajo, six modular pyramids, Anfiteatro, operable canal, heritage cards and communal assembly.                                                                                                          |
| Play        | Met         | `tests/e2e/campaign-playtest.spec.ts` builds, harvests and moves through ordinary commands, then uses the public `visitHeritage` action after the scout reaches the site; the field-card button itself is covered by `caral-city.spec.ts`. |
| Contract    | Met         | Required fields, communal store, food, ceremonial observation and survival; surplus/canal/tour reveals are staged and the assembly stays optional; hidden goals are filtered from the briefing; live progress in the objectives panel.     |
| Onboarding  | Met         | Six-step tutorial, briefing, Codex, minimap destination pips.                                                                                                                                                                              |
| Closure     | Met         | Epilogue, optional-achievement summary and “Continuar” to m2.                                                                                                                                                                              |
| UX          | Met         | Reviewed at 1280×800 and 1600×900; tutorial dialogue and result layout do not hide controls.                                                                                                                                               |
| Visuals     | Met locally | Authored Caral set-piece plus modular GLBs; current 1280/1600 captures are local review artifacts (`review/`, gitignored). Canal state change and HUD layout are covered by E2E; there is no CI pixel gate.                                |
| Persistence | Met         | Heritage, canal, farm yield, tutorial and mission state round-trip; E2E covers the Caral save.                                                                                                                                             |
| Tests       | Met         | Unit tests, campaign/city E2E, real-command playtest, `yarn verify:fast` and CI.                                                                                                                                                           |
| Docs        | Met         | README, dossier, campaign experiences and Caral design notes aligned.                                                                                                                                                                      |

## Chavín gold-master status

| Gate        | Status      | Evidence                                                                                                                                            |
| ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| History     | Met         | `docs/historia/campanas/chavin.md`; UNESCO 330, Plan de Manejo 2020, Rick et al.; no invented war.                                                  |
| Identity    | Met         | Authored Chavín site, plaza/atrio, Edificio A/B, Portada and gallery cards; offering + pilgrimage + feria loop.                                     |
| Terrain     | Met         | Authored Mosna valley heightfield (`chavinHeightmap.ts`): ceremonial terrace, river and highland ridges.                                            |
| Play        | Met         | `tests/e2e/campaign-playtest.spec.ts` builds the feria with ordinary commands, delivers offerings through the mission mechanic and reaches victory. |
| Contract    | Met         | Offerings, pilgrimage, feria and survival; pilgrimage/feria/bonus are staged; hidden goals stay out of the briefing.                                |
| Onboarding  | Met         | Five-step Chavín tutorial, briefing, Codex and minimap destination pips.                                                                            |
| Closure     | Met         | Chavín epilogue, optional major offering and “Continuar” to m3.                                                                                     |
| UX          | Met locally | Briefing and tutorial reviewed at 1280×800/1600×900; no current CI pixel gate.                                                                      |
| Visuals     | Met locally | Authored GLB, highland palette and current RTS captures in `review/`; Lanzón scan removed.                                                          |
| Persistence | Met         | Delivered offerings and mission state round-trip through `save-campaign.spec.ts`.                                                                   |
| Tests       | Met         | Data, tutorial, mission, site, real-command playtest and save/load coverage.                                                                        |
| Docs        | Met         | This document, dossier, quality bar, README and campaign experiences aligned.                                                                       |

## Moche gold-master status

| Gate | Status | Evidence |
| --- | --- | --- |
| History | Met | `docs/historia/campanas/moche_recuay.md`; no invented ruler or single battle. |
| Identity | Met | Authored Huacas de Moche, operable canal, huaca hold and elite exchange. |
| Terrain | Met | Authored coastal heightfield (`mocheHeightmap.ts`): Pacific shore, irrigated valley and Huacas terrace. |
| Play | Met | `campaign-playtest.spec.ts` moves real units and exchanges silver; `moche-campaign.spec.ts` selects the cards through public state and clicks the canal and Huaca de la Luna action buttons. |
| Contract | Met | Canal, hold, required 250 and optional 400 silver; hidden goals stay out of the briefing (covered by `campaign.test.ts`). |
| Onboarding | Met | Four-step Moche tutorial, briefing, Codex and minimap pips. |
| Closure | Met | Mission epilogue and optional elite-exchange summary. |
| UX | Met locally | Briefing/tutorial captured at 1280×800 and 1600×900; no CI pixel gate. |
| Visuals | Met locally | Authored site GLB, desert palette and current RTS captures in `review/`. |
| Persistence | Met | Canal, hold timer, delivered silver and tutorial round-trip in `save-campaign.spec.ts`. |
| Tests | Met | Data, site/proxy collision, tutorial, mission, HUD, real-command playtest and save/load coverage. |
| Docs | Met | This document, dossier, experience table, site note, art docs and README aligned. |

## Wari gold-master status

| Gate | Status | Evidence |
| --- | --- | --- |
| History | Met | `docs/historia/campanas/wari_tiahuanaco.md`; no invented war or ruler. |
| Identity | Met | Authored Wari site and a two-node `network` objective plus frontier hold. |
| Terrain | Met | Authored highland heightfield (`wariHeightmap.ts`): basin, terraces and provincial-node plateaus. |
| Play | Met | `tests/e2e/campaign-playtest.spec.ts` builds the farms and markets with real commands and reaches victory from the documented 300 wood / 100 silver opening stock. |
| Contract | Met | Network progress, hidden frontier, optional third centre and live timers. |
| Onboarding | Met | Four-step Wari tutorial, briefing, Codex and minimap pips. |
| Closure | Met | Epilogue connects the network with the 1000–1100 CE collapse. |
| UX | Met locally | Briefing/tutorial captured at 1280×800 and 1600×900; no CI pixel gate. |
| Visuals | Met locally | Authored site GLB, terrain-following road ribbons, highland palette and current RTS captures in `review/`. |
| Persistence | Met | Network, hold and mission state use the shared save/load path. |
| Tests | Met | Data, site, network, real-command playtest, save/load and completability coverage. |
| Docs | Met | This document, dossier, experience table, site note, art docs and README aligned. |

## Applying it to m2–m9

For each mission, first link the dossier claim to the mechanic, then implement the
mechanic, then the UX and tests. Do not copy Caral's `gather + build + survive`
sequence: use the gate table to find the mission's own historical problem. A campaign
with no documented battle must not acquire one merely to fit the RTS template.


## Chapter II playable status (m5–m6)

Chapter II is released as **playable** with the historical mechanics, onboarding, real-command
victory paths, dedicated decor GLBs and save round-trips covered. It is not yet a full gold master
because the UX evidence is local and there is no CI pixel gate.

| Gate | m5 Yahuar Pampa | m6 Chimú–Inca |
| --- | --- | --- |
| History | Met: `yahuar_pampa.md`; no invented battle. | Met: `chimu_inca.md`; water/canal campaign. |
| Identity | Met: defend Cusco, protect Cusi, counterattack. | Met: advance to Paramonga, cut the canal, force surrender. |
| Terrain | Met: authored Yahuar Pampa heightfield. | Met: authored Chimú coastal heightfield. |
| Play | Met: real-command playtest holds and counterattacks. | Met: real-command playtest advances and cuts the canal. |
| Contract | Met: defend, destroy, protect; waves and timer. | Met: staged Paramonga/canal objectives; optional Chan Chan/hold. |
| Onboarding | Met: three-step tutorial + briefing. | Met: three-step tutorial + briefing. |
| Closure | Met: epilogue and optional achievements. | Met: epilogue and optional objectives. |
| UX | Met locally: 1600×900 briefing/tutorial reviewed. | Met locally: 1600×900 briefing/tutorial reviewed. |
| Visuals | Met locally: authored Chanca site GLB + heightfield. | Met locally: authored Chimú site GLB + heightfield + canal. |
| Persistence | Met: save/load round-trip. | Met: save/load round-trip. |
| Tests | Met: data, completability, real-command playtest. | Met: data, completability, real-command playtest. |
| Docs | Met: README, dossiers, campaign experiences and this table. | Met: README, dossiers, campaign experiences and this table. |


## Chapter III playable status (m7)

Chapter III is released as **playable** with the historical choice, onboarding, real-command
victory path, dedicated decor GLB and save round-trip covered. It is not yet a full gold master
because the UX evidence is local and there is no CI pixel gate.

| Gate | m7 Túpac Amaru |
| --- | --- |
| History | Met: `tupac_amaru.md`; rebellion, Sangarará and repression. |
| Identity | Met: sustain the rebellion, protect Túpac Amaru, choose assault or siege. |
| Play | Met: real-command playtest assaults the realista command post. |
| Contract | Met: alternative assault/siege victory plus a required protect objective. |
| Onboarding | Met: two-step tutorial + briefing. |
| Terrain | Met: authored Cusco colonial heightfield. |
| Closure | Met: epilogue and optional objectives. |
| UX | Met locally: 1600×900 briefing/tutorial reviewed. |
| Visuals | Met locally: authored colonial site GLB + heightfield. |
| Persistence | Met: save/load round-trip. |
| Tests | Met: data, completability, branch choice and real-command playtest. |
| Docs | Met: README, dossier, campaign experiences and this table. |


## Chapter IV playable status (m8–m9)

Chapter IV is released as **playable** with the historical phases, onboarding, real-command
victory paths, dedicated decor GLBs and save round-trips covered. It is not yet a full gold master
because the UX evidence is local and there is no CI pixel gate.

| Gate | m8 La Independencia | m9 La Defensa de Arica |
| --- | --- | --- |
| History | Met: `independencia.md`; Junín and Ayacucho. | Met: `guerra_del_pacifico.md`; Arica land defence. |
| Identity | Met: hold Junín, protect Sucre, hold Ayacucho. | Met: protect the port and Bolognesi, survive the assault. |
| Play | Met: real-command playtest holds both phases. | Met: real-command playtest defends the port and strikes the command. |
| Contract | Met: sequential holds plus a required protect objective. | Met: required protects and survive, with an optional counterstrike. |
| Onboarding | Met: three-step tutorial + briefing. | Met: two-step tutorial + briefing. |
| Terrain | Met: authored Junín–Ayacucho heightfield. | Partial: Arica decor over terrain; no authored heightfield yet. |
| Closure | Met: epilogue and optional objectives. | Met: epilogue and optional objective. |
| UX | Met locally: 1600×900 briefing/tutorial reviewed. | Met locally: 1600×900 briefing/tutorial reviewed. |
| Visuals | Met locally: authored independence site GLB + heightfield. | Met locally: dedicated Arica battery GLB + authored port terrace. |
| Persistence | Met: save/load round-trip. | Met: save/load round-trip. |
| Tests | Met: data, completability and real-command playtest. | Met: data, failure path, completability and real-command playtest. |
| Docs | Met: README, dossier, campaign experiences and this table. | Met: README, dossier, campaign experiences and this table. |
