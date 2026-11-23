# Cusco 1536 — model mission

**Mission:** `m_cusco_1536` · **Campaign:** El Virreinato · **Period:** Viceroyalty (1536) ·
**Status:** implemented, pending art review and a human playtest.

## Historical problem

Manco Inca's 1536 rebellion surrounded Cusco and fought for Sacsayhuamán. The city did not fall: the
agricultural calendar forced the army back to plant, and Manco withdrew to Ollantaytambo. The mission
plays the siege as a **timed economy of food and seasons**, not as a capture. Sources and certainty:
[`docs/historia/campanas/cusco_1536.md`](../historia/campanas/cusco_1536.md).

## Acts

1. **Take Sacsayhuamán.** Six units hold the fortress for 45 s while a small Spanish sortie probes the
   line; the counterattack proper answers the completed hold. The fortress changes hands in the history, so
   the victory is the withdrawal, not its permanent capture.
2. **Hold the siege through the planting.** Six units hold the city approaches for 60 s while consuming
   6 food per second and the plaza sorties against the closing ring; an empty store pauses the siege rather
   than resetting it. This is the seasonal abstraction, not a full calendar subsystem.
3. **Withdraw to Ollantaytambo.** Reach the road north-west of the city with Manco alive (Ollantaytambo lies
   down the Sacred Valley, not across the pampa to the south-west). The city is not captured; the epilogue
   states the withdrawal and the continuation of the war in Vilcabamba.

Optional: cut the city's supplies. The mission never stages the later «Santiago» hagiography.

## Map and site

- 256 m andes transect, painted ground every 2 m, worker crossing ≈2:22.
- Reuses `cusco_inca_site` and its heightfield; the site is the living Inca capital, not a ruin.
- Player camp in the campiña, enemy in the plaza, Sacsayhuamán on the heights, retreat north-west.
- Own in-engine captures (`scripts/capture_virreinato_arc.mjs`), documented in `PROVENANCE.md`.

## Economy and cast

- `INCA` vs `HUESTE_INDIANA`; period-locked Viceroyalty.
- Units: workers, Inca warriors, Inca slingers, soldiers and scouts; no horses or firearms for the player.
  The slingers (`INCA_SLINGER`) are trained at the «Casa de armas»; the Yachaywasi hosts the loom and quipu
  techs. No market or Spanish doctrine.
- The Spanish city is a **besieged garrison**: `enemy.economy: false` and `start.enemyOpeningUnits: false`
  keep its centre and houses but stop the peasant economy, sawmill and mill. `enemy.attacks: false` keeps
  the authored waves on their targets instead of letting the AI pull them toward the player's base; the
  opening before the probe is deliberately quiet. The probe inside Act I, the counterattack after
  Sacsayhuamán and the sortie that contests the siege carry the pressure, so the mission is a siege of the
  city, not a skirmish beside it. The sortie enters from the city outskirts, clear
  of both the siege ring and its own spawn spread.
- Manco Inca is a protected commander card; no invented likeness.

## Opening and closing

- Cinema intro (`introStyle: 'cinema'`, as the Tarapacá pilot): the besieged plaza with Sacsayhuamán behind
  it (`cine-ciudad`, push-in); a campaign map painted from this terrain where Manco's army marches from
  `CUSCO_1536_CAMP` on Sacsayhuamán, the Spanish sally from the plaza against it and the Act II sortie enters
  dashed from `CUSCO_1536_SORTIE` (constants shared with the objectives and waves); Manco's warriors on the
  terraces as a Spanish sortie climbs from the plaza (`cine-fortaleza`, pan). It states the mission, not its
  outcome: the withdrawal to Ollantaytambo is an Act III card and the epilogue closes it. Both stills are
  dusk captures: Cusco's grass and forest are noisy and a brighter hour exceeds the 160 KB budget.
  Regenerate with `node scripts/capture_cinema.mjs --mission=m_cusco_1536 [--only=cine-fortaleza]`.
- Briefing art `media/cusco-1536/intro-ciudad.webp`; act cards `intro-sacsay` and `intro-retirada`;
  epilogue `intro-epilogo`.

## Tests and evidence

- Data: `tests/campaign.test.ts`, `tests/campaigns.test.ts`, scale/layout/profile guards.
- Completable: `tests/e2e/campaign-completable.spec.ts`.
- Real commands: `tests/e2e/cusco-1536.spec.ts` moves six units onto Sacsayhuamán.
- Layout: `tests/e2e/hud-layout.spec.ts` and `campaign.spec.ts`.
- Real-command full path: `tests/e2e/release-playtest.spec.ts` (nightly slow tier). The opening row is in
  `yarn bench:check`.
- Open: human no-cheat playtest and art review.
