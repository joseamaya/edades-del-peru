# Caral model mission (m1 redesign)

Design proposal for rebuilding `m1_caral` as the **model mission** of the campaign series: the player
travels to the Supe valley as it was c. 3000–1800 BC, not to the ruins of today. Later missions should
follow the same pattern.

Status: **first playable pass**. `m1_caral` now runs the four acts below as one mission: Act I starts at
Áspero on the shore, Act II opens the valley fields and the canal, Act III builds the Pyramid Mayor by
handing materials over at its field card (`deliver` objectives with a `heritageId`; each phase swaps the
kit model through `site_phase` trigger effects), and Act IV seals the pyramid and gathers the community on
the beach. Acts II–IV open with a chapter card (`act` trigger effect) and every line is spoken by an
anonymous narrator (`MissionDef.narrator`). Still open: the Áspero site model, the coast–valley exchange
route, allied neighbour villages, fair tents, the paint-colour change per phase and the drought's
environmental events (see *Implementation needs*). The historical facts, and their certainty, live in the
dossier [`docs/historia/campanas/caral.md`](../historia/campanas/caral.md); this document only references
them.

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

## Gaps in the current m1

| Area            | Today                                                           | Problem                                                                   |
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
  wetlands. Remove palms from this map.
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
- Player-built quincha houses use the paint colour of the current phase.

## Narration

No names are known, so no character is invented. The narrator is an anonymous voice of the community
(e.g. "a fisherwoman of Áspero" or "the elders of the valley") who tells the story across generations.
Dialogue speaker labels must not say "Comandante" in this mission.

## Implementation needs (later work)

1. Áspero site model (platforms, quincha houses, Huaca de los Ídolos) in Blender.
2. **Phased monument construction**: a site that grows through delivered materials and phase transitions.
   The modular Caral pyramids and Amphitheatre in `art-src/blender` are a starting point.
   The architecture kit now ships the Pyramid Mayor phase models (foundation, fill, finished, in use) and
   `CaralCity.setMayorPhase` swaps them; act III drives the phases through `Game.setSitePhase`.
3. Local resources: cotton/fibre and reed instead of wood for Caral; no silver.
4. Environmental events: seasonal flood, drought and sand advance.
5. Map-specific vegetation and ambient fauna sets; remove palms from the Supe map.
6. Narrated act cards with per-beat art (see the AoE-style intro proposal discussed for #343).
7. ~~Data fixes in `src/campaign/defs`: speaker label, `didYouKnow` wording, starting resources.~~ Done.

## Certainty labelling

Use the dossier's certainty table as the contract: documented elements can be shown as such; inferred and
assumed elements are allowed but must be labelled in the Codex (and in art provenance via the manifest's
`confidence` field) so the player can tell what is known from what is reconstructed.
