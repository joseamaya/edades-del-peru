# Tarapacá 1879 — model mission

**Mission:** `m_tarapaca` · **Campaign:** La República · **Period:** Republic (1879) ·
**Status:** implemented, pending art review and a human playtest.

## Historical problem

After the naval campaign, the Peruvian army held Tarapacá without cavalry or artillery. Three Chilean
columns attacked the village and the quebrada in echelon; Pachica sent reinforcements and the Peruvians
captured guns. It was a tactical victory that did not save the province: the army retreated 200 km to
Arica. Sources and certainty: [`docs/historia/campanas/tarapaca.md`](../historia/campanas/tarapaca.md).

## Acts

1. **Hold the village.** Six units hold Tarapacá for 45 s while the first Chilean column marches in from
   the east. The army starts in the village with no workers, no base and no economy.
2. **Take the heights.** Recover the quebrada heights; the optional Pachica link is a real march east and
   brings four republican defenders.
3. **Hold the heights and withdraw.** A 60 s hold receives two captured artillery pieces, then the player
   marches north to the Arica road. The epilogue states that the province is lost and the army retreats.

## Battle contract

- `start.playerBase: false`, `start.enemyBase: false` and `start.openingUnits: false`: neither side gets a
  generic centre, houses, fields, four workers or a scout. The player roster is the authored garrison.
- `enemy.economy: false` and `enemy.attacks: false`: the AI still perceives, micros and defends, but it
  never builds a town, trains or launches its own attacks. The three columns are authored waves.
- Every wave declares a `spawn` far from its `pos` (the objective) and a `target`; nothing materialises on
  the position the player must hold. The first column enters east of the village at 3 s, the second from
  the north-east when Act II opens, and the third from the south-east when the heights are taken.
- Zero economy is deliberate: this is a single-day battle, not a founding scenario. The HUD shows the
  garrison and its military orders only.
- Buendía is the army's overall commander in the briefing (`commanderNotes`), not a unit on the field;
  Cáceres is the protected field commander.

## Map and site

- 256 m coast transect, painted ground every 2 m, worker crossing ≈2:22. The battle opens in the village,
  not at a rear base.
- `tarapaca_site` hides the Arica GLB and draws a procedural adobe village plus a low trench/parapet on the
  heights (`tarapaca-village`, `tarapaca-heights`); no borrowed Arica building appears on the mesa.
- The village is the opening frame; the old rear base at Pachica is gone. Pachica is east along the
  quebrada (a real march, outside the 10 m link radius), and the Arica road is north (`-z`).
- `tarapaca_site` uses the mission-scoped `atacama` palette; the vegetation override removes the coastal
  broadleaf trees and keeps a trace of scrub/gravel, so the quebrada reads as desert rather than green
  coast.
- Own in-engine captures (`scripts/capture_republica_arc.mjs`), documented in `PROVENANCE.md`.

## Economy and cast

- `REPUBLIC` vs `CHILE`; period-locked Republic.
- No workers and no construction: the roster is eight republican defenders, three riflemen, four soldiers
  and Cáceres. The captured artillery arrives as a scripted reinforcement after the heights.
- Two captured artillery pieces arrive after Act II; four defenders arrive if the player links with
  Pachica.
- Cáceres is a protected field commander with a battle marker; Buendía is briefing-only.

## Opening and closing

- Three beats: the quebrada, the echelon attack, the tactical victory and retreat.
- Briefing art `media/tarapaca/intro-quebrada.webp`; act cards `intro-alturas` and `intro-retirada`;
  epilogue `intro-epilogo`.

## Tests and evidence

- Data: `tests/campaign.test.ts`, `tests/campaigns.test.ts`, scale/layout/profile guards.
- Battle contract: `tests/tarapaca.test.ts` (no base/economy, wave spawn distance, Pachica/Arica, palette).
- Force contract: `tests/campaign-forces.test.ts` (a base-less party skips the generic opening crew).
- Headless battle: `tests/tarapaca-battle.test.ts` (roster, first column, village hold, no AI town).
- Completable: `tests/e2e/campaign-completable.spec.ts`.
- Real commands: `tests/e2e/tarapaca.spec.ts` holds the village with move orders.
- Layout: `tests/e2e/hud-layout.spec.ts` and `campaign.spec.ts`.
- Real-command full path: `tests/e2e/release-playtest.spec.ts` (nightly slow tier). The opening row is in
  `yarn bench:check`.
- Open: human no-cheat playtest.
