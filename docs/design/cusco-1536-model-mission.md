# Cusco 1536 — model mission

**Mission:** `m_cusco_1536` · **Campaign:** El Virreinato · **Period:** Viceroyalty (1536) ·
**Status:** implemented, pending art review and a human playtest.

## Historical problem

Manco Inca's 1536 rebellion surrounded Cusco and fought for Sacsayhuamán. The city did not fall: the
agricultural calendar forced the army back to plant, and Manco withdrew to Ollantaytambo. The mission
plays the siege as a **timed economy of food and seasons**, not as a capture. Sources and certainty:
[`docs/historia/campanas/cusco_1536.md`](../historia/campanas/cusco_1536.md).

## Acts

1. **Take Sacsayhuamán.** Six units hold the fortress for 45 s while the Spanish counterattack
   converges; the fortress changes hands in the history, so the victory is the withdrawal, not its permanent capture.
2. **Hold the siege through the planting.** Six units hold the city approaches for 60 s while consuming
   6 food per second; an empty store pauses the siege rather than resetting it. This is the seasonal
   abstraction, not a full calendar subsystem.
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
- Units: workers, Inca warriors, soldiers and scouts; no horses or firearms for the player.
- Manco Inca is a protected commander card; no invented likeness.

## Opening and closing

- Three beats: the rebellion, Sacsayhuamán, the withdrawal.
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
