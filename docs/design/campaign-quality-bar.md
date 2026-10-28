# Campaign quality bar

This is the definition of done for a historical campaign. Caral (`m1_caral`) is the
gold-master case; the other eight missions are reviewed against the same gates before
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

## Applying it to m2–m9

For each mission, first link the dossier claim to the mechanic, then implement the
mechanic, then the UX and tests. Do not copy Caral's `gather + build + survive`
sequence: use the gate table to find the mission's own historical problem. A campaign
with no documented battle must not acquire one merely to fit the RTS template.
