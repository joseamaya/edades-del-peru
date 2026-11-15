# Characters

**Status:** living

This is the single place to look up who appears in a campaign, how certain their likeness is, and how they
are represented in the field. Historical facts belong to the dossiers in [`../historia/`](../historia/); the
visual rules belong to [`visual-language.md`](./visual-language.md) and
[`../historia/atuendos.md`](../historia/atuendos.md); the mission-level pattern is in
[`model-mission-pattern.md`](./model-mission-pattern.md) §5b.

The runtime source of truth is [`src/model/defs/commanders.ts`](../../src/model/defs/commanders.ts), not this
table. This document explains the cast and the rules; the code decides what the game actually renders.

## Rules

1. **A name needs a dossier.** A named character exists only if the campaign's dossier documents the name.
   Societies without known rulers (Caral, Chavín, Moche, Wari) get an anonymous narrator or a community voice,
   never an invented ruler.
2. **Likeness is not the same as the name.** `CommanderDef.status` describes the *likeness*, not the
   historical existence of the person:
   - `documented`: an attested likeness or portrait tradition exists.
   - `abstraction`: the name is documented but there is no attested face; the portrait is a stylized
     medallion. Pre-Hispanic figures are normally `abstraction`.
3. **No portrait is a historical photograph.** Portraits and medallions are game art. The Codex and captions
   must say so when an image could be mistaken for a document.
4. **The accent is presentation.** The hero ring, banner, tunic tint and macana tint use the commander's
   `accent` so the player can tell figures apart. It is not a claim about a culture's colours.
5. **Hero treatment is deliberate.** `hero: true` adds the `★` nameplate, the field hero treatment and the hero
   card. The eight Ayar siblings are the current hero cast; other named commanders are identified by portrait,
   nameplate and dialogue.
6. **Unique outfits are an art pass, not a gameplay requirement.** Named commanders currently share the role
   rig. A unique garment or headdress must follow the outfit spec and the provenance gate.
7. **Losses are staged.** When the legend loses a character, use the `memory` effect and a named huaca; do not
   present an invented death as documented history.
8. **Animations are shared.** Named commanders use the clip set of the unit role they are tagged to. There is
   no per-character animation set; `idle` is the only mandatory clip.

## Cast by mission

The `commander id` is the key in `commanders.ts` and the mission `tag` that draws the nameplate and portrait.
`Source` is the campaign dossier that documents the name.

| Mission | Character | `commander id` | Likeness | Field presentation | Source |
| --- | --- | --- | --- | --- | --- |
| `m1_caral` | No named characters; anonymous community narrator | — | — | No nameplate or portrait | [`caral.md`](../historia/campanas/caral.md) |
| `m2_chavin` | No named rulers; the oracle is a voice, not a person | — | — | No nameplate or portrait | [`chavin.md`](../historia/campanas/chavin.md) |
| `m3_moche_recuay` | No named rulers | — | — | No nameplate or portrait | [`moche_recuay.md`](../historia/campanas/moche_recuay.md) |
| `m4_wari` | No named rulers | — | — | No nameplate or portrait | [`wari_tiahuanaco.md`](../historia/campanas/wari_tiahuanaco.md) |
| `m_tambotoco` | Ayar Manco (Manco Cápac) | `manco_capac` | Abstraction | Hero ring, banner, `★` nameplate, accent, hero card | [`tambotoco.md`](../historia/campanas/tambotoco.md) |
| `m_tambotoco` | Ayar Auca | `ayar_auca` | Abstraction | Hero ring, banner, `★` nameplate, accent | [`tambotoco.md`](../historia/campanas/tambotoco.md) |
| `m_tambotoco` | Ayar Cachi | `ayar_cachi` | Abstraction | Hero ring, banner, `★` nameplate, accent | [`tambotoco.md`](../historia/campanas/tambotoco.md) |
| `m_tambotoco` | Ayar Uchu | `ayar_uchu` | Abstraction | Hero ring, banner, `★` nameplate, accent | [`tambotoco.md`](../historia/campanas/tambotoco.md) |
| `m_tambotoco` | Mama Huaco | `mama_huaco` | Abstraction | Hero ring, banner, `★` nameplate, accent | [`tambotoco.md`](../historia/campanas/tambotoco.md) |
| `m_tambotoco` | Mama Ocllo | `mama_ocllo` | Abstraction | Hero ring, banner, `★` nameplate, accent | [`tambotoco.md`](../historia/campanas/tambotoco.md) |
| `m_tambotoco` | Mama Ipacura | `mama_ipacura` | Abstraction | Hero ring, banner, `★` nameplate, accent | [`tambotoco.md`](../historia/campanas/tambotoco.md) |
| `m_tambotoco` | Mama Raua | `mama_raua` | Abstraction | Hero ring, banner, `★` nameplate, accent | [`tambotoco.md`](../historia/campanas/tambotoco.md) |
| `m5_yahuar_pampa` | Cusi Yupanqui | `cusi_yupanqui` | Abstraction | Portrait, nameplate and dialogue | [`yahuar_pampa.md`](../historia/campanas/yahuar_pampa.md) |
| `m5_yahuar_pampa` | Anccu Hualloc | `anccu_hualloc` | Abstraction | Portrait, nameplate and dialogue | [`yahuar_pampa.md`](../historia/campanas/yahuar_pampa.md) |
| `m6_chimu_inca` | Túpac Yupanqui | `tupac_yupanqui` | Abstraction | Portrait, nameplate and dialogue | [`chimu_inca.md`](../historia/campanas/chimu_inca.md) |
| `m6_chimu_inca` | Minchancaman | `minchancaman` | Abstraction | Portrait, nameplate and dialogue | [`chimu_inca.md`](../historia/campanas/chimu_inca.md) |
| `m6b_guerra_civil` | Atahualpa | `atahualpa` | Abstraction | Portrait, nameplate and dialogue | [`guerra_civil_inca.md`](../historia/campanas/guerra_civil_inca.md) |
| `m6b_guerra_civil` | Huáscar | `huascar` | Abstraction | Portrait, nameplate and dialogue | [`guerra_civil_inca.md`](../historia/campanas/guerra_civil_inca.md) |
| `m_lima` | Francisco Pizarro | `pizarro` | Documented | Portrait, nameplate and dialogue | [`lima.md`](../historia/campanas/lima.md) |
| `m_lima` | Quizu Yupanqui | `quizu_yupanqui` | Abstraction | Portrait, nameplate and dialogue | [`lima.md`](../historia/campanas/lima.md) |
| `m7_tupac_amaru` | Túpac Amaru II | `tupac_amaru` | Documented | Portrait, nameplate and dialogue | [`tupac_amaru.md`](../historia/campanas/tupac_amaru.md) |
| `m7_tupac_amaru` | Micaela Bastidas | `micaela_bastidas` | Documented | Portrait, nameplate and dialogue | [`tupac_amaru.md`](../historia/campanas/tupac_amaru.md) |
| `m_junta_cusco` | Mateo García Pumacahua | `pumacahua` | Documented | Portrait, nameplate and dialogue | [`junta_cusco.md`](../historia/campanas/junta_cusco.md) |
| `m_junta_cusco` | Mariano Melgar | `melgar` | Documented | Portrait, nameplate and dialogue | [`junta_cusco.md`](../historia/campanas/junta_cusco.md) |
| `m_junta_cusco` | Juan Ramírez Orozco | `ramirez_orozco` | Documented | Portrait, nameplate and dialogue | [`junta_cusco.md`](../historia/campanas/junta_cusco.md) |
| `m8_independencia` | José de San Martín | `san_martin` | Documented | Portrait and dialogue | [`independencia.md`](../historia/campanas/independencia.md) |
| `m8_independencia` | Simón Bolívar | `bolivar` | Documented | Portrait and dialogue | [`independencia.md`](../historia/campanas/independencia.md) |
| `m8_independencia` | Antonio José de Sucre | `sucre` | Documented | Protected named commander, narrator, portrait and nameplate | [`independencia.md`](../historia/campanas/independencia.md) |
| `m9_guerra_pacifico` | Francisco Bolognesi | `bolognesi` | Documented | Protected named commander, portrait and nameplate | [`guerra_del_pacifico.md`](../historia/campanas/guerra_del_pacifico.md) |
| `m9_guerra_pacifico` | Miguel Grau | `grau` | Documented | Defined for the naval narration and the educational layer; not a field commander | [`guerra_del_pacifico.md`](../historia/campanas/guerra_del_pacifico.md) |

`Grau` is defined in `commanders.ts` for the naval narration and the educational layer; the Arica mission's
field commander is Bolognesi. Do not add him to the mission's `commanders` list without a design decision.

## Portraits and field identity

- `PORTRAIT_IDS` and `COMMANDERS` in `commanders.ts` are the runtime registry. `commanderById` resolves a
  mission tag; `commanderLabel` adds the `★` for heroes.
- Portraits are stylized medallions. `Portrait.ts` derives the initials; no attested face is claimed.
- A named unit gets a world nameplate (`CharacterLabels`), a portrait in the briefing and the commander's name
  and role in the selection panel; dialogue is attributed to its name.
- Hero units clone the visible tunic and macana material for the accent tint; the shared rig geometry is
  untouched. Dispose those clones with the view.
- The `memory` trigger effect retires a character without a death animation and raises a named huaca
  (`MemoryStones`), as in Tambotoco.

## Animation minimums

The shared rig states are `idle | walk | walk_carry | gather | build | attack | eat` (`RIG_CLIP_STATES` in
`src/model/defs/modelAssets.ts`). Only `idle` is mandatory; a missing state falls back to `idle`. `eat` is
fauna-only.

- A named commander uses the clip set of the unit role it is tagged to (worker, scout, soldier, ranged,
  mounted, siege or vehicle).
- The Caral worker/scout and the Ayar heroes use the shared humanoid rig; the Ayar distinct outfits are the
  next art pass.
- Root motion is ignored. Death uses the rig's `Death` clip when present and the shared topple/corpse FX.
- Do not add a per-character clip or a gameplay timing to a GLB. Combat timing lives in data.

## Adding a character

1. Confirm the name and the source in the campaign dossier; if the record is silent, do not invent a person.
2. Add a `CommanderDef` to `commanders.ts` with `status`, `source` and, only for a lead, `hero`/`accent`.
3. Tag the unit in the mission definition (`commanders: [...]`); the tag is also the nameplate key.
4. Name the narrator and every speaker in the mission; use the anonymous voice when no person is documented.
5. Check the briefing, portrait, nameplate and hero card at RTS and panel scale.
6. Add or update the campaign test and play the mission with `?mission=<id>`.
7. If the character gets a unique model later, follow [`asset-pipeline.md`](./asset-pipeline.md) and record
   the source/hash/licence in [`../../PROVENANCE.md`](../../PROVENANCE.md).
8. Update this table and the mission's model-mission document in the same PR.

## Current gaps

- `m1`–`m4` have no named cast by design; their narrators are anonymous.
- The eight Ayar heroes share the ayllu rig; unique outfits and headdresses are pending.
- Other named commanders use their role's shared rig; no unique garments are claimed.
- There is no per-character animation set. A unique clip is an art decision, not a narrative one.
- Miguel Grau is defined for narration/education but is not fielded in `m9`.

## See also

[`model-mission-pattern.md`](./model-mission-pattern.md) §5b · [`visual-language.md`](./visual-language.md) ·
[`../historia/atuendos.md`](../historia/atuendos.md) · [`asset-pipeline.md`](./asset-pipeline.md) ·
[`campaign-quality-bar.md`](./campaign-quality-bar.md) · [`../../PROVENANCE.md`](../../PROVENANCE.md)
