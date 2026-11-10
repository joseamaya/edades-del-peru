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

Historical idea: Caral sustained a large community by combining coastal fishing with valley agriculture, by
organising communal work and by storing surplus. Monumentality depended on that surplus, not on a documented
war, and the city ended with a drought and its abandonment. Caral is the model mission: its design and status
are in [`caral-model-mission.md`](./caral-model-mission.md), the reusable method in
[`model-mission-pattern.md`](./model-mission-pattern.md).

What the player does, in four acts introduced by a narrated intro and chapter cards:

1. **Áspero, the fishing village.** Fishing in the sea with a cast cotton net, quincha houses, and an
   optional visit to the Huaca de los Ídolos. The tension: nets need cotton and gourds, which do not grow on
   the beach. The act ends by scouting up the Supe river to the valley.
2. **The Supe valley.** Two chacras on the fertile floodplain, the communal canal gate, a communal store to hold the
   surplus, and the cotton nets researched there with valley food and wood: cotton goes down to the coast,
   fish comes up. The act closes with a food surplus.
3. **The Sacred City.** The Pyramid Mayor rises in phases (foundation, fill, finished, in use) as the player
   hands shicra fibre and stone over at its field card; the community gathers at the plaza for the fire
   offering. Optional: tour the six pyramid complexes and call a communal assembly.
4. **The drought.** The valley dries in front of the player (sand advances, the river shrinks, harvests
   halve, riverside trees die); the community seals the pyramid under stone and gathers on the beach to
   leave for Vichama. The epilogue shows the departure.

The reveal chain is the pacing: each act's goals stay hidden until the previous act ends, so the briefing
never spoils them, and a goal already satisfied before its reveal is marked complete instead of becoming an
unexplained moving goalpost. There is no survival timer: the ending is the documented abandonment, framed
as history, not as the player's failure.

Decisions: how many workers fish and how many farm, where to place fields, when to research the nets, how
to split hands between surplus and construction. These use existing mechanics (terrain-aware farms,
resource nodes, dropsites, housing) and need no fictional enemy.

The mission has no market objective. There is no attested market building at Caral; exchange is the
coast–valley complementarity and the hand-overs, and the fair tents that appear once the city is in use are
temporary and seasonal. The communal store is a gameplay abstraction, not an attested Caral term, as its field card says.

## Chavín model mission (m2)

Historical idea: Chavín's power was ceremonial prestige, not a documented war. Pilgrims and
long-distance offerings sustained the temple, and the fair linked the sanctuary to exchange networks.

What the player does:

1. Reaches the ceremonial centre and delivers the first offerings at Edificio B.
2. Hands stone over at the Old Temple, receives pilgrims in the Plaza Circular and builds the fair.
3. Expands the New Temple (Edificio A and the Portada de las Falcónidas), researches the pilgrimage
   technology and receives the great pilgrimage.
4. Tours the Plaza, the Old Temple, the New Temple and the Portada as the centre's record; the epilogue
   connects the documented decline with the fragmentation of Chavín's influence.

The mission deliberately does **not** add a Chavín–Paracas war: Paracas is a coetaneous reference, not an
enemy. The feria uses the game's `Mercado` building as an abstraction and says so in its field card.

## Progression for the other missions

| Mission                | Historical idea                          | Player action                                     | Decision                           | Consequence                            |
| ---------------------- | ---------------------------------------- | ------------------------------------------------- | ---------------------------------- | -------------------------------------- |
| m2 Chavín              | Ceremonial prestige and pilgrimage       | Deliver offerings, receive pilgrims, open feria   | Ceremony vs subsistence            | Prestige and continuity                |
| m3 Moche–Recuay        | Valleys, canals and attested conflict    | Open the canal, hold the huacas, exchange silver  | Defend vs counter-raid             | Control or loss of the valley          |
| m4 Wari                | Planned expansion and provincial centres | Connect two centres, stockpile, hold the frontier | Expand vs consolidate              | Frontier influence                     |
| m5 Yahuar Pampa        | Defence of Cusco                         | Hold Cusco, protect Cusi Yupanqui, counter-attack | Resist vs sortie                   | Survival or fall                       |
| m6 Chimú–Inca          | Water as power                           | Advance, cut the canal, force surrender           | Assault vs siege                   | Chan Chan capitulates                  |
| m6b Guerra Civil Inca  | Dynastic war and division                | Advance to Quipaipan, defeat Huáscar              | Advance vs consolidate             | Atahualpa wins; the empire is weakened |
| m7 Túpac Amaru         | Rebellion and repression                 | Sustain communities, choose assault or siege      | Explicit counterfactual            | Defeat and legacy                      |
| m8 Independencia       | Campaign logistics and coordination      | Move, take the royalist centre, hold              | Timing and concentration           | Patriotic victory                      |
| m9 Guerra del Pacífico | Sea control and port defence             | Protect the port, raid, intercept                 | Risk the squadron vs hold the port | Loss of the Huáscar and Grau           |

m2–m9 are implemented and released across the four chapters. m7 is a counterfactual licence; m9's
historical losses are documented, while its playable land defence of the port is an abstraction. Each
mission remains reviewed against its dossier before it is rewritten.

## Unique units in the campaign

**Decision: keep the documented unique units available in m3–m6b.** They are ordinary barracks units
already backed by [`docs/historia/unidades-unicas.md`](../historia/unidades-unicas.md), not an
undocumented campaign bonus. No mission-specific `allowedUnits` restriction is added; the existing
real-command playtests for m3–m6b remain green with the decision applied, and no balance change was
needed. The campaign unit test and the `civ-uniques` E2E also check the barracks roster and the player/enemy availability. Briefings
name the unique unit when it belongs to the player's civilization, and the Codex keeps the fuller
source.

| Mission               | Player unique  | Enemy unique                                               |
| --------------------- | -------------- | ---------------------------------------------------------- |
| m3 Moche–Recuay       | Guerrero Moche | Guerrero Recuay                                            |
| m4 Wari               | Guardián Wari  | — (Tiahuanaco has a documented gap; the enemy is inactive) |
| m5 Yahuar Pampa       | Guerrero Inca  | Guerrero Chanca                                            |
| m6 Chimú–Inca         | Guerrero Inca  | Fixi Chimú                                                 |
| m6b Guerra Civil Inca | Guerrero Inca  | Guerrero Inca                                              |

The enemy AI may train its own unique unit when the mission has an active enemy. This is the same
civilization-scoped rule used in skirmish, not a hidden production advantage.

## Historical limits recorded by the pilot

- Caral has no documented war; the mission keeps `enemy.active: false`.
- There is no attested market at Caral. The removed market objective was a game abstraction, not evidence.
- Caral's political centralisation and the role of religion are interpretations, not written facts.
- The causes of Caral's abandonment are debated (earthquakes, El Niño and other explanations); the mission
  mentions the debate without staging an invented catastrophe.
- The game does not simulate monumental construction in this pilot. The ceremonial complex is a landmark; the
  epilogue explains its material basis without pretending the player built it.
