# Vilcabamba 1572 — model mission

**Mission:** `m_vilcabamba` · **Campaign:** El Virreinato · **Period:** Viceroyalty (1572) ·
**Status:** implemented, pending art review and a human playtest.

## Historical problem

Toledo's 1572 expedition ended the neo-Inca state. Huayna Pucará resisted while Vilcabamba was evacuated,
occupied and burned; Túpac Amaru I fled to the lower Urubamba and was captured. The mission is a **fighting
withdrawal**: defend the fortress, evacuate the refuge and save part of the court. The capture and execution
are told in the epilogue, off-screen. Sources and certainty:
[`docs/historia/campanas/vilcabamba.md`](../historia/campanas/vilcabamba.md).

## Acts

1. **Defend Huayna Pucará.** Five units hold the fortress for 45 s; a two-man Spanish vanguard probes
   it at 20 s so the act is not empty.
2. **Evacuate Vilcabamba.** Reach the town to open the escape route; the expedition occupies and burns it afterwards.
3. **Save the court.** Five units hold the lower-Urubamba exit for 45 s while a column enters from the
   escape road (not from the distant Spanish camp, a 200 m march that never arrived in time). Curi Paucar is
   a **required** protect goal, visible from Act I: the captain who opens the escape is the mission's own
   way to lose the court, and the commander card must say so before he is in danger.

The Inca's capture and execution are narrated in the epilogue; no counterfactual victory is offered.

## Map and site

- 256 m jungle transect, painted ground every 2 m, worker crossing ≈2:22.
- `vilcabamba_site` reuses the Chanca stone-fort composition and heightfield as a **labelled
  cloud-forest abstraction**; the real Vilcabamba (Espíritu Pampa) has no surveyed heightfield in the repo.
- Player camp in the valley, Huayna Pucará on the height, Spanish column from the Cusco road, escape to the
  lower Urubamba.
- Own in-engine captures (`scripts/capture_virreinato_arc.mjs`), documented in `PROVENANCE.md`.

## Economy and cast

- `INCA` vs `REALISTAS`; period-locked Viceroyalty.
- Units: workers, Inca warriors, soldiers and scouts; no horses or firearms for the player.
- Arbieto's column is an **expedition, not a settlement**: `enemy.economy: false`,
  `start.enemyOpeningUnits: false` and `enemy.attacks: false` keep its camp but stop the peasant economy,
  sawmill and mill, and leave the offensive to the authored waves. The column after Huayna Pucará is five
  soldiers, two cavalry and one arcabucero, and the escape-road column four soldiers and one cavalry: the
  original counts wiped the real-order army before the escape. As a `retirada` mission, the camp can fall
  without ending it; the court's objectives decide.
- Túpac Amaru I is a briefing card and narrator; his capture is not a player-controlled survival objective.

## Opening and closing

- Three beats: the last court, Huayna Pucará, the capture.
- Briefing art `media/vilcabamba/intro-pucara.webp`; act cards `intro-pucara` and `intro-captura`;
  epilogue `intro-epilogo`.

## Tests and evidence

- Data: `tests/campaign.test.ts`, `tests/campaigns.test.ts`, scale/layout/profile guards.
- Completable: `tests/e2e/campaign-completable.spec.ts`.
- Real commands: `tests/e2e/vilcabamba.spec.ts` moves five units onto Huayna Pucará.
- Layout: `tests/e2e/hud-layout.spec.ts` and `campaign.spec.ts`.
- Real-command full path: `tests/e2e/release-playtest.spec.ts` (nightly slow tier). The opening row is in
  `yarn bench:check`.
- Open: human no-cheat playtest and art review.
