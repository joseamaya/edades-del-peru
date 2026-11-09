# Caral model mission (m1 redesign)

Design proposal for rebuilding `m1_caral` as the **model mission** of the campaign series: the player
travels to the Supe valley as it was c. 3000–1800 BC, not to the ruins of today. Later missions follow the
same pattern, described as a reusable method and checklist in [`model-mission-pattern.md`](./model-mission-pattern.md).

Status: **complete model mission**. `m1_caral` plays the four acts below as one mission on a 256-unit
sea-to-terrace transect, from a narrated intro to an illustrated epilogue. Act I starts at Áspero on the
shore, Act II opens the valley fields, the canal and the coast–valley exchange, Act III builds the Pyramid
Mayor in phases by handing materials over at its field card, and Act IV brings the drought, seals the
pyramid and gathers the community on the beach. What was built, and what is still open, is listed in
_As built_ and _Open items_ below. The historical facts, and their certainty, live in the dossier
[`docs/historia/campanas/caral.md`](../historia/campanas/caral.md); this document only references them.

## Goals

1. **Live the period.** The landscape and the city look and behave as they did in use: a green valley with
   riparian forest and wetlands below a painted city on a desert terrace, smoke, people, fires, fairs.
2. **Teach by playing.** Each act teaches one game system and one historical idea. Pre-Inca is the
   learning campaign, so m1 is also the main tutorial.
3. **Stay close to the evidence.** Every visual or narrative element is tagged documented / inferred /
   assumed (see the dossier table). Assumptions are allowed when they are plausible and labelled; nothing is
   presented as a fact that the sources do not support.
4. **End with the documented outcome.** Abandonment is how this story ends; the mission does not let the
   player "save" Caral and does not frame the ending as a defeat.

## Gaps in the original m1

These motivated the redesign; every row is now addressed (see _As built_).

| Area            | Before the redesign                                             | Problem                                                                   |
| --------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| City            | Static GLB, fully built; the player only inspects it            | Hides the central fact: centuries of communal construction in phases      |
| Áspero          | Only named in a dialogue                                        | Half of the story (the coast) is missing                                  |
| Complementarity | Fishing and farming are independent tasks                       | Nets do not depend on valley cotton                                       |
| Victory         | `survive` 300 s                                                 | Artificial timer                                                          |
| Landscape       | Generic palms, grey gravel base, no riparian forest or wetlands | Palms are not in the botanical record; the valley reads as today's desert |
| City life       | No people, smoke, fire or music in the site                     | Reads as an archaeological site                                           |
| Speaker         | Dialogue labelled "Comandante"                                  | No rulers are known for Caral                                             |
| `didYouKnow`    | Quipu presented as one of the earliest uses                     | The 2005 find is reported as a possible quipu                             |
| Resources       | Starts with 150 silver, no mines                                | Silver has no role in Caral                                               |

## Structure: one mission, four acts

Target length 30–40 minutes. Between acts a narrated card ("Generations passed…") jumps forward in time,
the way AoE-style campaigns move between scenes. Acts are sequential objectives inside one mission, not
separate missions.

### Act I — Áspero, the fishing village (c. 3000 BC)

- Start on the coast with a few families at Áspero (river mouth, beach, wetlands, lomas to the south).
- Teaches: selection, gathering (anchoveta, mussels, clams), quincha houses, scouting.
- Tension: nets wear out and need **cotton** and **gourds**, which do not grow on the beach.
- Exit objective: scout upriver until the valley is found.

### Act II — The Supe valley

- Found the first fields (cotton, gourd, beans, squash) on the valley floor and open a canal.
- Teaches: the **coast–valley exchange route**. Fish travels up, cotton and gourds travel down. Breaking
  the route starves the valley or stops the nets.
- Neighbouring settlements from the dossier (e.g. Chupacigarro, Miraya, El Molino) appear as allied,
  non-controllable villages that follow the dual left/right-bank pattern.

### Act III — Building the Sacred City (c. 2600 BC)

- The Pyramid Mayor is **built in phases** on the desert terrace. Workers gather reed and stone, make
  **shicras** and haul them to the site.
- Between phases, a **ritual burial**: burnt offerings at the sacred-fire altar, then the next phase is
  built on top. The city's paint colour changes per phase (documented as changing by period).
- Optional objectives teach religion and science: the circular plaza, the Amphitheatre (flutes and
  trumpets), the Huanca monolith.
- Food surplus in the storehouse feeds the builders; an empty store pauses construction.
- During the festive calendar, temporary fair tents appear in the open plazas and pilgrims and traders
  arrive. These replace the current unattested "market stalls" reading: tents are temporary and seasonal.

### Act IV — The drought (c. 1800 BC)

- Fields turn to sand, the riparian forest thins, the river fails; late-period details appear (stone
  houses, a little maize).
- Victory is the documented closure: **seal the pyramids under stone** and lead the community toward the
  coast (Vichama).
- Epilogue: the Vichama reliefs as the memory of the crisis.

## Geography

The 256-unit map (`scripts/build_caral_heightmap.py`) is a compressed **west-to-east transect** of the
valley. The real 23 km are not to scale; what matters is the readable sequence:

```text
sea | beach + Áspero + wetlands (totora) + lomas | lower valley (El Molino)
    | middle valley: river with riparian forest, fields, huarango terraces
    | Caral on the desert terrace (left bank), ~25 m above the valley | rocky hills and dunes
```

- River dry most of the year with groundwater and springs; seasonal flood brings fish and shrimp.
- Vegetation set: willow, giant reed (caña brava), carrizo, horsetail, huarango; totora and junco in the
  wetlands. No palms on this map.
- Fauna (ambient): deer, rodents, birds in the riparian forest; sea birds on the coast.
- Lomas turn green in the foggy winter season.

As built: the sea and a curving beach run along the west edge; Áspero sits on a low dry rise north of the
river mouth; the Supe runs south past the city's west flank, then turns west through totora wetlands into
the sea; two gravel fords cross it; the Sacred City keeps its former layout on the desert terrace, shifted
64 m east (`CARAL_CITY_OFFSET_X`); dry foothills frame the north, east and south, with coastal lomas south
of the mouth. Ground zones (beach, marsh, floodplain, terrace desert, rock) are painted by the same script
(`CARAL_GROUND`), and trees only grow where that paint allows.

## Living city

- Cooking smoke behind houses (pachamanca pits), refuse heaps outside them.
- Fire on the sacred-fire altars; flute music near the Amphitheatre during ceremonies.
- People walking between plazas and houses; pilgrims during fairs.
- Player-built quincha houses use the paint colour of the current phase (open, see _Open items_).

## Narration

No names are known, so no character is invented. The narrator is an anonymous voice of the community
(e.g. "a fisherwoman of Áspero" or "the elders of the valley") who tells the story across generations.
Dialogue speaker labels must not say "Comandante" in this mission.

## As built

- **Mission engine** (`src/campaign/Mission.ts`): objectives can start hidden and be revealed by triggers.
  Kinds used by m1: `deliver` with a `heritageId` (hand-over at a field card, shared by offerings, trades
  and construction), `hold` (optionally `consume`-ing food per second while it advances), `reach`,
  `inspect`, `canal_open` and `research`. Trigger effects: `act` (a chapter card with an image; the mission
  clock and tutorial wait for it), `site_phase`, `ritual` (a presentation-only burial beat), `drought` and
  `dialogue`. A loaded save restores the latest site phase and the drought without re-applying its losses.
- **Intro and epilogue**: `MissionDef.intro` plays three narrated beats (Áspero, the valley, the city to
  come) over a paused world; the Act II–IV cards and the victory epilogue carry images. All six are
  in-engine recreations captured by `scripts/capture_caral_intro.mjs` and recorded in `PROVENANCE.md` as
  game captures, never historical photographs. `?intro=0` and headless runs skip the intro.
- **Áspero**: the `huaca_idolos` kit piece (three superposed terraces) and six fishing houses with net
  racks and gourd floats (`ASPERO_LAYOUT`), baked with the city in one `CaralCity`. Fishing grounds lie in
  the sea; a worker casts and drags a cotton net (`FishingNetFx`) and keeps fishing nearby grounds.
- **Phased Pyramid Mayor**: foundation, fill, finished and in use (`Game.setSitePhase`); the other
  monuments appear with their phase (`CARAL_HERITAGE_SINCE`) and only block and answer clicks once built.
  The finished plaster is white; the in-use phase swaps the Mayor to the documented palette
  (white, ochre, red; the exact per-building colours are inferred) via `CARAL_MAYOR_PHASE_ASSET`, checked by
  `tests/architecture-kit.test.ts`.
- **Communal construction**: after each material hand-over, a worker must hold the site for a 20 s work
  turn. The turn consumes food from the communal store; if the store is empty the timer pauses (it does not
  reset) and a warning explains why, so the Troje really feeds the builders. Each completed turn plays a
  burial ritual (`ritual` effect) and advances the Mayor phase.
- **Valley economy**: chacras on painted fertile ground, the canal, the Troje and the exchange: the
  `cotton_nets` technology, researched at the Troje with valley food and wood, stands for cotton going down
  to the coast. Caral sees only its own buildings, units and technologies (`allowedBuildings`,
  `allowedUnits`, the match-filtered tech tree); there is no silver.
- **Living valley**: cooking smoke behind dwellings, the sacred fire on the Pyramid Mayor and a blaze for
  the Act III offering, temporary fair tents once the city is in use, two allied hamlets up the valley,
  riparian deer and birds, pelicans off Áspero, surf on the shore and a flute line for the era.
- **Drought** (`Game.startEnvironmentalEvent('drought')`, 40 s): the green turns to sand in patches, the river surface drops,
  the haze turns dusty, fields lose half their harvest and about one riverside tree in three dies.
- **Narration**: an anonymous narrator (`MissionDef.narrator`); no "Comandante" label, no invented names.
- **Tutorial**: nine steps (select, coast, house, valley, field, storage, nets, pyramid, works) docked under
  the objectives; the last one explains the Troje supply during construction.

## Performance

The scene budgets of `docs/design/art-direction.md` §11 are checked by `yarn bench:check`
(`scripts/bench_scene.mjs`), both for the opening and, with `--stage=late`, for the end game: the city in
use, the drought and 35 workers in view over the Sacred City.

| View    | Before the worker cuts | Now          | Budget     |
| ------- | ---------------------- | ------------ | ---------- |
| Opening | 474k tris / 224 calls  | ~332k / ~205 | 400k / 230 |
| Late    | 1.57M tris / 396 calls | ~582k / ~262 | 600k / 275 |

The workers dominated the late view. `scripts/simplify_caral_worker.mjs` (run by `yarn models:build`)
simplifies the base bodies from ~12k to ~2.5k triangles and the long hair and tunics by half or more;
they are mostly under the garments and the difference is invisible at game camera distances. Only the
body is in the shadow pass, and the eyes are hidden. Skinned workers cannot be instanced, so each one in
view still costs about six draws; that is why the late call budget sits above the opening's. Pebbles and
gravel drop their downward faces, a third of the ground cover's triangles on a GPU (the software-rendered
bench runs without ground cover).

## Open items

1. ~~The city's paint colour per phase (documented as changing by period) is not yet shown.~~ Done for
   the model: the finished Mayor wears white and the in-use phase swaps to ochre/red; the smaller pyramids
   and houses keep the documented white/red palette. The exact per-building colours are inferred.
2. Seasonal flood, sand advance and green winter lomas are not simulated.
3. Late-period details of Act IV (stone houses, a little maize) are not shown.
4. ~~The Act III fire offering is staged at the plaza, but the burial of one phase under the next is not
   shown on its own, and an empty storehouse does not pause construction.~~ Done: the `ritual` effect
   stages the burial between phases and the `hold.consume` work turns pause when the Troje is empty.
5. ~~Human review of the new art~~ Done: the architecture kit and the intro and menu captures were
   approved on 2026-11-07.
6. The other campaigns follow this pattern later; the m9 scripted playtest is known to fail meanwhile.

## Certainty labelling

Use the dossier's certainty table as the contract: documented elements can be shown as such; inferred and
assumed elements are allowed but must be labelled in the Codex (and in art provenance via the manifest's
`confidence` field) so the player can tell what is known from what is reconstructed.
