# Campaign experiences: learning history by playing

Campaigns are historical experiences, not lessons with a test at the end. The player should understand how a
society lived, organised work, used its environment, related to other communities and faced change because
those things happened in the scenario, not because a screen asked about them afterwards.

## Rules

- **No player assessment.** No quizzes, scores, grades, percentages, knowledge gates or rewards for answering
  historical questions. Technical tests are separate and must stay.
- **Show, do not lecture.** The briefing sets the scene in a few lines; the Codex holds optional depth.
- **Actions carry the idea.** Exploration, placement, storage, defence, exchange and timing are chosen because
  they make a historical problem legible.
- **Consequences must be visible.** If terrain matters, the HUD shows it. If a route matters, travel time and
  delivery show it. If water matters, the scenario makes it matter.
- **One identity per period.** Do not reuse the same objective sequence with different names.
- **Label the limits.** Separate documented facts, plausible interpretations and design licences. Never invent
  a war, person, exchange or technology to make a mission work.
- **No forced reading.** The Codex is optional and must never gate progress.

## Caral pilot (m1)

Historical idea: Caral sustained a large community by combining valley agriculture with coastal fishing, by
organising communal work and by storing surplus. Monumentality depended on that surplus, not on a documented
war.

What the player does:

1. Explores the valley and finds the coast. The tutorial completes when the scout discovers a fishing ground.
2. Places two fields (the game's Andén building). Fields near moisture or a canal hold more food, and the HUD
   shows the reserve and terrain bonus.
3. Builds a communal store (the game's Troje) to represent the surplus. Both names are gameplay abstractions,
   not attested Caral terms.
4. Reaches a food target, observes the ceremonial complex and keeps the settlement standing.

Decisions: where to farm, how many workers to send to the coast, where to store food, whether to grow the
settlement or accumulate reserves. These use existing mechanics (terrain-aware farms, resource nodes,
dropsites, housing) and need no fictional enemy.

The mission has no market objective. There is no attested market building at Caral; the exchange is represented
by the coast/valley complementarity and by moving goods and workers, not by a market placeholder.

Monumentality is discovered by reaching the documented ceremonial complex. The game does not claim that the
player builds the pyramids; the epilogue connects the surviving architecture with the surplus and communal work
the player has just organised.

## Progression for the other missions

| Mission                | Historical idea                          | Player action                                     | Decision                           | Consequence                   |
| ---------------------- | ---------------------------------------- | ------------------------------------------------- | ---------------------------------- | ----------------------------- |
| m2 Chavín              | Ceremonial prestige and pilgrimage       | Host offerings, sustain the centre                | Ceremony vs subsistence            | Prestige and continuity       |
| m3 Moche–Recuay        | Valleys, canals and attested conflict    | Defend centre and canal, keep production          | Defend vs counter-raid             | Control or loss of the valley |
| m4 Wari                | Planned expansion and provincial centres | Found a frontier centre, stockpile, sustain       | Expand vs consolidate              | Frontier influence            |
| m5 Yahuar Pampa        | Defence of Cusco                         | Hold Cusco, protect Cusi Yupanqui, counter-attack | Resist vs sortie                   | Survival or fall              |
| m6 Chimú–Inca          | Water as power                           | Advance, cut the canal, force surrender           | Assault vs siege                   | Chan Chan capitulates         |
| m7 Túpac Amaru         | Rebellion and repression                 | Sustain communities, choose assault or siege      | Explicit counterfactual            | Defeat and legacy             |
| m8 Independencia       | Campaign logistics and coordination      | Move, take the royalist centre, hold              | Timing and concentration           | Patriotic victory             |
| m9 Guerra del Pacífico | Sea control and port defence             | Protect the port, raid, intercept                 | Risk the squadron vs hold the port | Loss of the Huáscar and Grau  |

These are future design directions, not implemented behaviour and not a shared objective template. m7 is a
counterfactual licence; m9's historical losses are documented, while a playable land defence of the port would
be an abstraction. The other rows describe documented contexts. Each mission must be reviewed against its
dossier before it is rewritten.

## Historical limits recorded by the pilot

- Caral has no documented war; the mission keeps `enemy.active: false`.
- There is no attested market at Caral. The removed market objective was a game abstraction, not evidence.
- Caral's political centralisation and the role of religion are interpretations, not written facts.
- The causes of Caral's abandonment are debated (earthquakes, El Niño and other explanations); the mission
  mentions the debate without staging an invented catastrophe.
- The game does not simulate monumental construction in this pilot. The ceremonial complex is a landmark; the
  epilogue explains its material basis without pretending the player built it.
