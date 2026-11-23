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
4. **The accent is presentation.** The banner crest, tunic tint and macana tint use the commander's `accent`
   so the player can tell figures apart. The hero ring is a shared gold marker. None of this is a claim about a
   culture's colours.
5. **Hero treatment is deliberate.** `hero: true` adds the `★` nameplate, the field hero treatment and the hero
   card. The eight Ayar siblings are the current hero cast; other named commanders are identified by their
   briefing portrait and, when a unit carries their tag, a field nameplate.
6. **Unique outfits are an art pass, not a gameplay requirement.** Named commanders currently share the role
   rig. A unique garment or headdress must follow the outfit spec and the provenance gate.
7. **Losses are staged.** When the legend loses a character, use the `memory` effect and a named huaca; do not
   present an invented death as documented history.
8. **Animations are shared.** A named commander who is tagged to a unit uses that role's clip set; a
   commander who appears only in the briefing has no field animation. There is no per-character animation
   set; `idle` is the only mandatory clip.

## Cast by mission

The `commander id` is the key in `commanders.ts`. The mission `commanders` list drives the briefing portraits;
a unit `tag` with the same id drives the world nameplate. `Source` is the campaign dossier that documents the
name.

| Mission | Character | `commander id` | Likeness | Presentation | Source |
| --- | --- | --- | --- | --- | --- |
| `m1_caral` | No named characters; anonymous community narrator | — | — | — | [`caral.md`](../historia/campanas/caral.md) |
| `m2_chavin` | No named rulers; the oracle is a voice, not a person | — | — | — | [`chavin.md`](../historia/campanas/chavin.md) |
| `m3_moche_recuay` | No named rulers | — | — | — | [`moche_recuay.md`](../historia/campanas/moche_recuay.md) |
| `m4_wari` | No named rulers | — | — | — | [`wari_tiahuanaco.md`](../historia/campanas/wari_tiahuanaco.md) |
| `m_tambotoco` | Ayar Manco (Manco Cápac) | `manco_capac` | Abstraction | Hero ring (gold), banner with accent, `★` nameplate, hero card | [`tambotoco.md`](../historia/campanas/tambotoco.md) |
| `m_tambotoco` | Ayar Auca | `ayar_auca` | Abstraction | Hero ring (gold), banner with accent, `★` nameplate | [`tambotoco.md`](../historia/campanas/tambotoco.md) |
| `m_tambotoco` | Ayar Cachi | `ayar_cachi` | Abstraction | Hero ring (gold), banner with accent, `★` nameplate | [`tambotoco.md`](../historia/campanas/tambotoco.md) |
| `m_tambotoco` | Ayar Uchu | `ayar_uchu` | Abstraction | Hero ring (gold), banner with accent, `★` nameplate | [`tambotoco.md`](../historia/campanas/tambotoco.md) |
| `m_tambotoco` | Mama Huaco | `mama_huaco` | Abstraction | Hero ring (gold), banner with accent, `★` nameplate | [`tambotoco.md`](../historia/campanas/tambotoco.md) |
| `m_tambotoco` | Mama Ocllo | `mama_ocllo` | Abstraction | Hero ring (gold), banner with accent, `★` nameplate | [`tambotoco.md`](../historia/campanas/tambotoco.md) |
| `m_tambotoco` | Mama Ipacura | `mama_ipacura` | Abstraction | Hero ring (gold), banner with accent, `★` nameplate | [`tambotoco.md`](../historia/campanas/tambotoco.md) |
| `m_tambotoco` | Mama Raua | `mama_raua` | Abstraction | Hero ring (gold), banner with accent, `★` nameplate | [`tambotoco.md`](../historia/campanas/tambotoco.md) |
| `m5_yahuar_pampa` | Cusi Yupanqui | `cusi_yupanqui` | Abstraction | Briefing portrait; field nameplate | [`yahuar_pampa.md`](../historia/campanas/yahuar_pampa.md) |
| `m5_yahuar_pampa` | Anccu Hualloc | `anccu_hualloc` | Abstraction | Briefing portrait only | [`yahuar_pampa.md`](../historia/campanas/yahuar_pampa.md) |
| `m6_chimu_inca` | Túpac Yupanqui | `tupac_yupanqui` | Abstraction | Briefing portrait; field nameplate | [`chimu_inca.md`](../historia/campanas/chimu_inca.md) |
| `m6_chimu_inca` | Minchancaman | `minchancaman` | Abstraction | Briefing portrait only | [`chimu_inca.md`](../historia/campanas/chimu_inca.md) |
| `m6b_guerra_civil` | Atahualpa | `atahualpa` | Abstraction | Briefing portrait; narrator | [`guerra_civil_inca.md`](../historia/campanas/guerra_civil_inca.md) |
| `m6b_guerra_civil` | Huáscar | `huascar` | Abstraction | Briefing portrait only | [`guerra_civil_inca.md`](../historia/campanas/guerra_civil_inca.md) |
| `m6b_guerra_civil` | Quizquiz | `quizquiz` | Abstraction | Briefing portrait; protected field nameplate | [`guerra_civil_inca.md`](../historia/campanas/guerra_civil_inca.md) |
| `m_lima` | Francisco Pizarro | `pizarro` | Documented | Briefing portrait; field nameplate | [`lima.md`](../historia/campanas/lima.md) |
| `m_lima` | Quizu Yupanqui | `quizu_yupanqui` | Abstraction | Briefing portrait only | [`lima.md`](../historia/campanas/lima.md) |
| `m7_tupac_amaru` | Túpac Amaru II | `tupac_amaru` | Documented | Briefing portrait; field nameplate | [`tupac_amaru.md`](../historia/campanas/tupac_amaru.md) |
| `m7_tupac_amaru` | Micaela Bastidas | `micaela_bastidas` | Documented | Briefing portrait; field nameplate | [`tupac_amaru.md`](../historia/campanas/tupac_amaru.md) |
| `m_junta_cusco` | Mateo García Pumacahua | `pumacahua` | Documented | Briefing portrait; field nameplate | [`junta_cusco.md`](../historia/campanas/junta_cusco.md) |
| `m_junta_cusco` | Mariano Melgar | `melgar` | Documented | Briefing portrait; field nameplate | [`junta_cusco.md`](../historia/campanas/junta_cusco.md) |
| `m_junta_cusco` | Juan Ramírez Orozco | `ramirez_orozco` | Documented | Briefing portrait only | [`junta_cusco.md`](../historia/campanas/junta_cusco.md) |
| `m_lima_1821` | José de San Martín | `san_martin` | Documented | Briefing portrait; protected field nameplate | [`lima_1821.md`](../historia/campanas/lima_1821.md) |
| `m8_independencia` | Antonio José de Sucre | `sucre` | Documented | Briefing portrait; protected field nameplate; narrator | [`independencia.md`](../historia/campanas/independencia.md) |
| `m_real_felipe` | Bartolomé Salom | `salom` | Documented | Briefing portrait; protected field nameplate | [`real_felipe.md`](../historia/campanas/real_felipe.md) |
| `m_real_felipe` | José Ramón Rodil | `rodil` | Documented | Briefing portrait only | [`real_felipe.md`](../historia/campanas/real_felipe.md) |
| `m_tarapaca` | Juan Buendía | `buendia` | Documented | Briefing portrait only | [`tarapaca.md`](../historia/campanas/tarapaca.md) |
| `m_cusco_1536` | Manco Inca | `manco_inca` | Abstraction | Briefing portrait; protected field nameplate | [`cusco_1536.md`](../historia/campanas/cusco_1536.md) |
| `m_vilcabamba` | Túpac Amaru I | `tupac_amaru_i` | Abstraction | Briefing portrait only | [`vilcabamba.md`](../historia/campanas/vilcabamba.md) |
| `m_vilcabamba` | Curi Paucar | `curi_paucar` | Abstraction | Briefing portrait; protected field nameplate | [`vilcabamba.md`](../historia/campanas/vilcabamba.md) |
| `m_tarapaca` | Andrés A. Cáceres | `caceres` | Documented | Briefing portrait; protected field nameplate | [`tarapaca.md`](../historia/campanas/tarapaca.md) |
| `m_miraflores` | Andrés A. Cáceres | `caceres` | Documented | Briefing portrait; protected field nameplate | [`miraflores.md`](../historia/campanas/miraflores.md) |
| `m_brena` | Andrés A. Cáceres | `caceres` | Documented | Briefing portrait; protected field nameplate | [`brena.md`](../historia/campanas/brena.md) |
| `m9_guerra_pacifico` | Francisco Bolognesi | `bolognesi` | Documented | Briefing portrait; protected field nameplate | [`guerra_del_pacifico.md`](../historia/campanas/guerra_del_pacifico.md) |
| `m9_guerra_pacifico` | Miguel Grau | `grau` | Documented | Narration/education only; not fielded | [`guerra_del_pacifico.md`](../historia/campanas/guerra_del_pacifico.md) |

`Grau` is defined in `commanders.ts` for the naval narration and the educational layer; the Arica mission's
field commander is Bolognesi. Do not add him to the mission's `commanders` list without a design decision.

## Portraits and field identity

- `PORTRAIT_IDS` and `COMMANDERS` in `commanders.ts` are the runtime registry. `commanderById` resolves a
  mission tag; `commanderLabel` adds the `★` for heroes.
- A commander in the mission's `commanders` list gets a briefing portrait. A unit whose `tag` matches a
  commander id gets a world nameplate (`CharacterLabels`); the selection panel shows the name and role.
  `commanders` alone does not create a nameplate.
- Portraits are stylized medallions. `Portrait.ts` derives the initials; no attested face is claimed.
- Hero units clone the visible tunic and macana material for the accent tint; the shared rig geometry is
  untouched. Dispose those clones with the view.
- The `memory` trigger effect retires a character without a death animation and raises a named huaca
  (`MemoryStones`), as in Tambotoco.

## Animation minimums

The shared rig states are `idle | walk | walk_carry | run | gather | build | attack | eat` (`RIG_CLIP_STATES` in
`src/model/defs/modelAssets.ts`). Only `idle` is mandatory; a missing state falls back to `idle`, except `run`,
which falls back to `walk`. `eat` is fauna-only.

- A named commander who is tagged to a unit uses the clip set of that unit role (worker, scout, soldier,
  ranged, mounted, siege or vehicle). A commander with no field unit has no field animation.
- The Caral worker/scout and the Ayar heroes use the shared humanoid rig; the Ayar distinct outfits are the
  next art pass.
- Root motion is ignored. Death uses the rig's `Death` clip when present and the shared topple/corpse FX.
- Do not add a per-character clip or a gameplay timing to a GLB. Combat timing lives in data.

## Adding a character

1. Confirm the name and the source in the campaign dossier; if the record is silent, do not invent a person.
2. Add a `CommanderDef` to `commanders.ts` with `status`, `source` and, only for a lead, `hero`/`accent`.
3. Add the id to the mission's `commanders` list (briefing portraits). To get a world nameplate, also tag a
   unit with the same id in the mission layout; `commanders` alone does not create a nameplate.
4. Name the narrator and every speaker in the mission; use the anonymous voice when no person is documented.
5. Check the briefing, portrait, nameplate and hero card at RTS and panel scale.
6. Add or update the campaign test and play the mission with `?mission=<id>`.
7. If the character gets a unique model later, follow [`asset-pipeline.md`](./asset-pipeline.md) and record
   the source/hash/licence in [`../../PROVENANCE.md`](../../PROVENANCE.md).
8. Update this table and the mission's model-mission document in the same PR.

## Current gaps

- The 2026-11 character visual pilot ([`../art/character-visual-pilot.md`](../art/character-visual-pilot.md))
  implements shaped runtime equipment for the Inca warrior, the 16th-century Spanish infantry, the 1879 line
  infantry, the documented Moche/Wari/Chimú warriors and the late-colonial bicorn, plus a `run` clip and a
  presentation-only hit reaction, and a baked ~7.1-head proportion pass (head/hands +12 %, waist taper). A
  6.5–7-head sculpt, faces and a bind-matrix-safe character GLB remain pending.
- `m1`–`m4` have no named cast by design; their narrators are anonymous.
- The eight Ayar heroes share the ayllu rig; unique outfits and headdresses are pending. Tambotoco's Ayar
  Manco has an opt-in male-only GLB with a longer tunic, a baked proportion pass (head/hands +12% and a
  shoulder/waist taper) and the shared clips; the common units use the Killke/ayllu variants
  ([`tambotoco-art-pilot.md`](./tambotoco-art-pilot.md) E4/E7). A hand-sculpted body and unique portraits for
  the other siblings remain future work.
- Other named commanders use their role's shared rig; no unique garments are claimed.
- There is no per-character animation set. A unique clip is an art decision, not a narrative one.
- Miguel Grau is defined for narration/education but is not fielded in `m9`.

## See also

[`model-mission-pattern.md`](./model-mission-pattern.md) §5b · [`visual-language.md`](./visual-language.md) ·
[`../historia/atuendos.md`](../historia/atuendos.md) · [`asset-pipeline.md`](./asset-pipeline.md) ·
[`campaign-quality-bar.md`](./campaign-quality-bar.md) · [`tambotoco-art-pilot.md`](./tambotoco-art-pilot.md) ·
[`../../PROVENANCE.md`](../../PROVENANCE.md)
