# Vilcabamba 1572 — model mission

**Mission:** `m_vilcabamba` · **Campaign:** El Virreinato · **Period:** Viceroyalty (1572) ·
**Status:** implemented and art-accepted (procedural site signed 2026-11-23); pending the human playtest.

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
- `vilcabamba_site` keeps its own mission heightfield (`VILCABAMBA_HEIGHTFIELD`) and draws a low
  cloud-forest refuge from the **Wari kit's domestic pieces** ([`wari-chanca-sites.md`](./wari-chanca-sites.md)):
  three thatch longhouses, a small plaza, the Huayna Pucará tower and a stone perimeter wall that keeps a wide
  south gate. The retired procedural refuge (`SiteLandmarks`) is gone; the real Vilcabamba (Espíritu Pampa)
  has no surveyed heightfield in the repo, so the composition is an abstraction.
- Player camp in the valley, Huayna Pucará on the height, Spanish column from the Cusco road, escape to the
  lower Urubamba.
- Own in-engine captures (`scripts/capture_virreinato_arc.mjs`), documented in `PROVENANCE.md`.

## Economy and cast

- `INCA` vs `REALISTAS`; period-locked Viceroyalty.
- Units: workers, Inca warriors, Inca slingers, soldiers and scouts; no horses or firearms for the player.
  The slingers are trained at the «Casa de armas»; the Yachaywasi hosts the loom and quipu techs. No market
  or Spanish doctrine.
- Arbieto's column is an **expedition, not a settlement**: `enemy.economy: false`,
  `start.enemyOpeningUnits: false` and `enemy.attacks: false` keep its camp but stop the peasant economy,
  sawmill and mill, and leave the offensive to the authored waves. The column after Huayna Pucará is five
  soldiers, two cavalry and one arcabucero, and the escape-road column four soldiers and one cavalry: the
  original counts wiped the real-order army before the escape. As a `retirada` mission, the camp can fall
  without ending it; the court's objectives decide.
- The refuge burns during `a2_evacua` through `MissionDef.fires` (ADR 0011); the fire is presentation only.
  `docs/media/vilcabamba-fires-after.webp` is the capture:
  `node scripts/capture_mission_fires.mjs --mission=m_vilcabamba --zoom=42 --out=docs/media/vilcabamba-fires`.
- Túpac Amaru I is a briefing card and narrator; his capture is not a player-controlled survival objective.

## Opening and closing

- Cinema intro (`introStyle: 'cinema'`, as the Tarapacá pilot): Huayna Pucará in the cloud forest at dusk
  (`cine-selva`, push-in); a campaign map painted from this terrain where Toledo's expedition comes down the
  Cusco road (`VILCABAMBA_CUSCO_ROAD`) past Arbieto's camp onto the pucará while the garrison climbs from the
  court's camp (constants shared with the layout, objectives and waves); the garrison facing Arbieto's
  vanguard (`cine-pucara`, pan). It states the mission, not its outcome: the evacuation and the escape to the
  lower Urubamba open as act cards, the capture and execution in the epilogue. Regenerate with
  `node scripts/capture_cinema.mjs --mission=m_vilcabamba [--only=cine-pucara]`.
- Briefing art `media/vilcabamba/intro-pucara.webp`; act cards `intro-pucara` and `intro-captura`;
  epilogue `intro-epilogo`.

## Tests and evidence

- Data: `tests/campaign.test.ts`, `tests/campaigns.test.ts`, scale/layout/profile guards.
- Completable: `tests/e2e/campaign-completable.spec.ts`.
- Real commands: `tests/e2e/vilcabamba.spec.ts` moves five units onto Huayna Pucará.
- Layout: `tests/e2e/hud-layout.spec.ts` and `campaign.spec.ts`.
- Real-command full path: `tests/e2e/release-playtest.spec.ts` (nightly slow tier). The opening row is in
  `yarn bench:check`.
- The kit refuge keeps the abstraction accepted on 2026-11-23 (Miguel Amaya); open: human no-cheat playtest.
