# The model-mission pattern

How to rebuild a campaign mission to the standard of **Caral (`m1_caral`)**, the model mission of La Senda
del Sol. Caral's own design and status live in [`caral-model-mission.md`](./caral-model-mission.md); this
document turns what was built there into a repeatable method for the other missions (Chavín, Moche–Recuay,
Wari, the Inca, Viceroyalty and Republic missions).

The gates a finished mission must pass are in [`campaign-quality-bar.md`](./campaign-quality-bar.md); the
pedagogical rules are in [`campaign-experiences.md`](./campaign-experiences.md). This guide is the "how";
those two are the "what" and the "why".

## 1. Principles

1. **Live the period, not the ruins.** The map shows the place as it was in use at the mission's date:
   inhabited, painted, farmed. A ruin is never the setting of a mission set while the site was alive.
2. **One historical problem, one mechanic.** Each mission has a mechanic that belongs to its problem
   (Caral: valley cotton becomes the coast's nets, and the drought ends the city). Avoid
   `gather + build + survive` under a new name.
3. **The documented outcome is the ending.** If the history ends in abandonment, conquest or defeat, the
   mission ends there too, framed as history rather than as the player's failure. Missions whose documented
   ending is a retreat or a resistance set `MissionDef.outcome`; the result screen then reads
   `RETIRADA CUMPLIDA` / `RESISTENCIA CUMPLIDA` and omits the kill tally.
4. **History is not invented.** Every name, date, building and event comes from `docs/historia/`. Where the
   sources are silent, use an assumption that is labelled (dossier certainty table, art manifest
   `confidence`). With no known rulers, the narrator is an anonymous voice of the community.
5. **Chronology guards.** No firearms, horses, vehicles or engines before 1532 and no sci-fi in any era
   (`docs/historia/atuendos.md`).

## 2. Mission structure: one mission, several acts

Target length 30–40 minutes; it is a target, not a gate. A mission that cannot reach it without padding
records its measured path and the exception in its design document. Acts are sequential objectives inside one
`MissionDef` (`src/campaign/defs/missions/<id>.ts`), not separate missions.

- **Acts**: each act teaches one game system and one historical idea. Its objectives start
  `hidden: true` (except Act I's) and are revealed by triggers when the previous act completes
  (`requires`, `objective` effects). The briefing filters hidden objectives so later acts stay a discovery.
- **Chapter cards**: an `act` trigger effect opens a card (kicker, title, text, `image`) between acts; the
  mission clock and the tutorial wait until the player closes it.
- **Optional objectives**: `optional: true` goals for exploration and depth (Caral: visit the Huaca de los
  Ídolos, tour the six pyramid complexes, call an assembly). They never gate victory and are summarised in
  the epilogue.
- **Objective kinds** (`ObjectiveKind` in `src/campaign/types.ts`): `deliver` with a `heritageId` (hand
  materials over at a monument's field card; offerings, trades and construction share it), `hold`, `reach`,
  `inspect`, `canal_open`/`canal_closed`, `research` and the classic `build`/`gather`/`survive`. A `hold` may also
  `consume` a resource per second while it advances; Caral uses it so an empty communal store pauses construction
  instead of resetting it. Prefer ones that need the mission's mechanic.
- **Narration**: `MissionDef.narrator` names the speaker of every `dialogue` effect. Never "Comandante"
  for a society with no known rulers.

Caral's acts, as a reference: I Áspero, the fishing village → II the Supe valley (fields, canal, communal store,
cotton nets) → III building the Pyramid Mayor in phases → IV the drought, the sealing and the departure.

## 3. The map: a geographic transect

- **Scale**: a model mission uses a **256 m** map and painted ground sampled every **2 m** (Caral and
  Chavín: `GROUND_SIZE = 128` over 256 m). A worker must cross it in **130–160 s**; both use
  `MissionDef.unitSpeedScale: 0.75` (1.8 m/s, ≈2:22): the transect still reads as travel, but walking
  no longer drags (the 0.5 of the first pass, 3:33, felt slow in play). Any
  exception is documented here, and `tests/campaign-scale.test.ts` enforces the numbers for the missions
  listed as model missions.
- Build the heightmap with a per-mission script (`scripts/build_<site>_heightmap.py`), like
  `build_caral_heightmap.py`: a compressed transect that reads in order (Caral: sea → beach and Áspero →
  wetlands → valley → desert terrace with the city → foothills). Real distances are not to scale; the
  sequence is.
- Paint ground zones in the same script (Caral's `CARAL_GROUND` RGBA weights, read by
  `TerrainData.getAuthoredGround`): beach, marsh, floodplain, terrace, rock. Trees, reeds and ground cover
  only grow where the paint allows.
- Give the site its own water palette (`terrain.water` of its site in `src/model/defs/sites.ts`) and fords where units
  must cross.
- Keep the start base clear and reachable; check the walkable path from base to every objective.
- Vegetation and fauna are the region's own (Caral: huarango, willow, caña brava, carrizo, totora; deer,
  riparian birds, pelicans). Remove anything the botanical or zoological record does not support (no palms
  in Supe).

## 4. The site grows with the story

- The monument is built in **phases** (Caral: foundation, fill, finished, in use) through a Blender
  architecture kit (`scripts/blender/build_caral_architecture_kit.py`, one LOD0/LOD1 GLB per piece and
  phase) and a phase effect (`site_phase` → `Game.setSitePhase`). Other monuments appear with their phase
  (`CARAL_HERITAGE_SINCE`), and only block and answer clicks once they stand.
- The city starts as it was when the mission begins (Caral: empty terrace, Áspero already standing), not
  fully built.
- **Living details**: smoke, fires, people, seasonal events (Caral: cooking smoke, the sacred fire, fair
  tents once the city is in use, allied hamlets). Presentation only, no gameplay cost.
- **Environmental events** that tell the ending (Caral: the `drought` effect dries the terrain splat,
  lowers the water, turns the haze dusty, halves harvests and kills a third of the riverside trees). A
  loaded save restores them without re-applying their losses.

`site_phase` and the environmental events are generic now: a per-site `SitePhasePlan` orders the phases
(Caral and Chavín use it) and `{ type: 'environment', event }` starts a named event from
`src/core/environment.ts`. Do not add a new site-specific phase type or a new `startX` method; extend the
definitions instead.

## 5. Economy and units of the period

- Restrict the match to what the society had: `MissionDef.allowedBuildings`, `allowedUnits`, and the
  technologies the period knew (the tech tree is filtered to the match, `TechTreeMatch`). Caral has no
  silver, no military and no Inca andenes (its fields are chacras).
- Local resources and technologies with a historical reading (Caral: `cotton_nets` at the communal store is the
  coast–valley exchange; `caral_shicras`, `caral_trade`; the generic `irrigation_canal` is excluded because
  the canal gate already owns that bonus).
- Workers behave as the player expects: they keep working after a build (farm the new field or help the
  nearest site) and show the right tool or net for the task.

### 5a. Armies without a settlement

A battle scenario is not a skirmish with a smaller build menu. Declare the force contract explicitly:

- `start.playerBase` / `start.enemyBase` (`false` = no centre, houses or fields for that seat),
  `start.openingUnits` (`false` = no generic four workers + scout; defaults to the seat's base flag).
  The legacy `start.base` remains the player alias. A base-less seat anchors `ref: 'player'`/`'enemy'`
  on its opening spot, so authored points still resolve.
- `enemy.economy: false` skips worker management, construction, training, research and era advance;
  `enemy.attacks: false` keeps combat micro and defense but leaves the offensive to authored waves.
  Wire the mission's `enemy.difficulty`/`aggression` — they are not the menu difficulty.
- A scripted enemy (`attacks: false`) presses any reachable enemy within 20 m once its authored
  attack-move ends. Without this the wave stops at the edge of its firing envelope and the battle freezes;
  `tests/tarapaca-battle.test.ts` and the release playtest guard it.
- Give every enemy wave a `spawn` (entry point) and a `target`/`pos` (objective); `pos` alone is the legacy
  "spawn here" contract and must not sit inside the player's hold radius. Guard the distance in a test.
  The target must also be walkable: a column ordered into a blocked village footprint stops outside both
  firing envelopes. Tarapacá walks to a plaza edge point, not the exact centre. `campaign-contract` counts
  the missions that still spawn on their objective (a ratchet: a new wave needs an entry point).
- A `hold` must sit where the player has to go. Anchored on the start position it finishes after its timer
  with no order at all (Arica's bombardment and assault, Túpac Amaru's supply beat); a purely timed
  `wait`/`survive` in a mission with no enemy is pacing, not a goal. `campaign-contract` rejects a hold
  within 8 m of the player start unless it is a defended position listed by name or declares
  `clearEnemies`, and the wave ledger it keeps must stay exact, so fixing a mission lowers the number.
- A reconquest is `reach` + `clearEnemies`: the objective stays active while a hostile unit stands inside
  the radius (`clearRadius` widens the check beyond the reach radius so a defender cannot step off and
  back). Arriving on a crest still held by ten men is not taking it.
- A `protect` goal guards its character from the moment that character is on the field, not from its act
  card: if he dies while the goal is still `pendiente`, the goal fails in the same tick and the defeat card
  names it. Otherwise the loss only surfaces when a later trigger activates a goal that was already lost.
- The player's defensive line needs an engagement envelope that matches enemy fire: acquisition uses the
  same `range × 1.15` firing slack plus a margin, and a unit that is shot returns fire from a bounded
  radius. Do not tune a mission around a mismatch of 13.2 m acquisition vs 16 m enemy fire.
- If the mission has a build objective (Lima's cabildo, the Junta's barracks), keep a small founding crew
  and the specific building; do not restore the generic town. Tarapacá has no build objective, so it can
  be a true zero-economy battle.

## 5b. Named characters

When the mission is about named people, put them on the board instead of only in the narration.

- A unit's mission `tag` doubles as the commander id (`src/model/defs/commanders.ts`): tagged units get a
  world nameplate (`CharacterLabels`) and the selection panel shows the commander's name and role. The same
  ids feed the briefing portraits and dialogue.
- Brief the whole cast the story needs; `commanders` is not limited to two figures. If a commander is the
  army's overall chief but is not on the board, keep the card and say so with `MissionDef.commanderNotes`
  ("Mando general · no en el campo") instead of adding a decorative unit.
- Lead characters need field identity, not only a tag: a hero ring/banner, an accent on the tunic or
  portrait, a `★` nameplate and a hero card in the selection panel. Professional RTS leads are readable at
  a glance; a name over a generic soldier is not enough. Modern leads use `fieldCommander: true` (marker and
  a slight scale, no Andean hero attire); the Ayar keep `hero: true`.
- Mission-scoped names belong in `MissionDef.unitNames` (e.g. Tarapacá's republican unique) rather than in a
  global archetype name.
- If the legend loses a character on the way, stage the loss: the `memory` trigger effect retires the unit
  without a death animation and raises a named huaca at the scripted spot (`MemoryStones`).
- Never invent a likeness: nameplates and medallions say who the person is and are labelled `abstraction`
  when no attested portrait exists.
- The current cast, the hero figures and the likeness status are audited in
  [`characters.md`](./characters.md); update both documents in the same PR.

## 6. Opening, briefing and closing

- **Narrated intro** (`MissionDef.intro`, `CinematicBeat[]` with an `image` each): three beats that set the
  place and the problem. It plays over a paused world and is skipped by `?intro=0` and in headless runs.
- **Briefing** (`HUD.showBriefing` → `src/ui/MissionBriefing.ts`): the mission's art, the story and
  context, "¿Sabías que…?", sources, the facts sheet and the visible objectives. Register the mission's own
  art in `MISSION_ART` (`src/ui/menuArt.ts`); a mission without art gets a plain backdrop in its campaign
  colour, never another mission's image.
- **Chapter-card and epilogue images** (`act` effect `image`, `MissionDef.epilogueImage`).
- **Images are in-engine captures** staged through the debug harness and rendered without the HUD
  (`scripts/capture_caral_intro.mjs`: RTS-camera shots and low cinematic `eye`/`look` shots). Document them
  in `PROVENANCE.md` as game captures, never as historical photographs.
- **Victory** gives a mission epilogue, the optional-achievement summary and "Continuar" to the next
  mission; the menu unlocks it (`isMissionUnlocked` in `src/campaign/progress.ts`).

## 7. Tutorial

A short, non-blocking step list in `src/campaign/defs/tutorials.ts`, docked under the objectives, one step
per new action, advancing on what the player does (Caral: select, coast, house, valley, field, storage,
nets, pyramid). It never blocks input and never repeats the briefing. For mechanics that need explaining
before the player can act (a choice of victory routes, the role of a defensive battery, an optional
counterattack) use an informational `{ type: 'elapsed', seconds }` step: it advances on its own, so it
never gates the rest of the tutorial.

## 8. Art and provenance

- New models start `reviewed: false` in their manifest (`art-src/blender/exports/...`) and are approved by
  a human review that records `reviewer` and `reviewedAt`. A rebuild exports them unreviewed again.
- Each piece states its `confidence` (documented, inferred, assumed); the dossier's certainty table and
  `PROVENANCE.md` record the evidence.
- Review aid: a contact sheet of the kit rendered with the game's own loader and materials (the Caral
  review used a one-off script in `review/`).

## 9. Performance

- Add the mission's opening view to `scripts/bench_scene.mjs` and, for missions whose late game fills the
  screen, a `--stage=late` view; `yarn bench:check` asserts both. Targets: art-direction §11 (600k
  triangles; the opening also within its draw-call budget).
- Known costs from Caral: skinned units cannot be instanced (about six draws per unit in view), so keep
  rigs simplified (`scripts/simplify_caral_worker.mjs`) and only the body in the shadow pass; ground cover
  draws the whole map; the `dist/` budget is 25 MB (Caral left ~0.4 MB).

## 10. Tests

- Data tests for the mission definition, acts and triggers (`tests/caral-acts.test.ts` as the model).
- E2E: briefing and hidden objectives, act progression, the mission's mechanic, save/load of the phase and
  events, and the layout at 1280×800 and 1600×900.
- A real-command playtest that reaches victory through ordinary orders.
- `yarn verify:fast`, the mission's E2E specs and `yarn bench:check` green; the full `yarn test:e2e` before
  a release.

## 11. Checklist

| Area        | Done when                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| Dossier     | `docs/historia/campanas/<mission>.md` lists sources and a certainty table for every element shown      |
| Design doc  | `docs/design/<mission>-model-mission.md` with acts, geography, open items (copy Caral's layout)        |
| Acts        | Hidden objectives per act, chapter cards, optional goals, documented ending                            |
| Narrator    | `narrator` set; no invented names or titles                                                            |
| Map         | 256 m, painted ground every 2 m, worker crossing 130–160 s, transect script, fords, region flora/fauna |
| Site        | Phased kit pieces, phase effect, monuments appear and block by phase, living details                   |
| Economy     | `allowedBuildings`, `allowedUnits`, period techs only, the mission's own mechanic                      |
| Intro       | Three narrated beats with captured images; chapter-card and epilogue images                            |
| Briefing    | `MISSION_ART` registered; facts, objectives and sources read well                                      |
| Tutorial    | Step list for the new actions, non-blocking                                                            |
| Cast        | Story characters tagged as units, named in the world and in the briefing; losses staged                |
| Art         | Manifests with `confidence`, human review recorded, PROVENANCE updated                                 |
| Performance | Opening (and late) view in `bench_scene.mjs`, budgets pass, dist under 25 MB                           |
| Tests       | Data, E2E and playtest; `verify:fast` and the mission's E2E green                                      |
| Quality bar | Its gold-master table in `campaign-quality-bar.md` filled with evidence                                |
