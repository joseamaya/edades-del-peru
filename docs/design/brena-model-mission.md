# La Breña 1882–1883 — model mission

**Mission:** `m_brena` · **Campaign:** La República · **Period:** Republic (1882–1883) ·
**Status:** implemented, pending art review and a human playtest.

## Historical problem

After Lima fell, Cáceres kept the war alive in the central highlands with mobile columns, campesino and
indigenous support, ambushes and galgas. The campaign did not win the war; it sustained resistance until
Huamachuco and the Treaty of Ancón. Sources and certainty: [`docs/historia/campanas/brena.md`](../historia/campanas/brena.md).

## Acts

1. **Build the community network.** Three `HOUSE` nodes in the Mantaro valley represent the communities
   that provide guides, food and guerrillas; completing the network brings four community defenders.
2. **Ambush at the pass.** Hold the pass for 45 s against a Chilean column.
3. **Huamachuco and withdrawal.** Hold the field for 60 s while Cáceres survives (the town sits 44 m west
   of the Chilean camp, so the hold no longer contains the enemy base), then reach the Ayacucho
   road. Victory is the escape, not the destruction of the Chilean army. The final column is infantry and
   riflemen, without the siege battery: the encounter was a knife-edge (the economy change's different RNG
   flipped the real-order autopilot's hold from a win to a wipe) and the battery's long-range shells are what
   empty the line, so it is left out of the assault — the same lesson as Arica's artillery. The player keeps
   its own battery; only the defenders' 60 s infantry hold is spared the howitzer.

The executions and violence of Concepción/Huamachuco are told in the epilogue and Codex, not staged.

## Map and site

- 256 m andes transect, painted ground every 2 m, worker crossing ≈2:22.
- `brena_site` reuses the Ayacucho chapel/camp composition and heightfield as a **labelled abstraction**
  of the sierra-central camp; no surveyed Breña heightfield exists in the repo.
- Player camp in the Mantaro, communities across the valley, enemy column from the north-east.
- Own in-engine captures (`scripts/capture_republica_arc.mjs`), documented in `PROVENANCE.md`.

## Economy and cast

- `REPUBLIC` vs `CHILE`; period-locked Republic.
- Units: workers, republican defenders, riflemen, cavalry, hussars, artillery and scouts.
- Cáceres is a protected commander card; no invented likeness.

- The Chilean counter-guerrilla column is a **field force**: `enemy.economy: false` and
  `start.enemyOpeningUnits: false` keep its camp but stop the peasant economy, sawmill and mill. Its pressure
  is the authored columns at Galgas and Huamachuco (infantry and riflemen; the battery is not part of the
  assault).

## Opening and closing

- Three beats: the Mantaro, galgas and ambushes, Huamachuco and the escape.
- Briefing art `media/brena/intro-mantaro.webp`; act cards `intro-galgas` and `intro-huamachuco`;
  epilogue `intro-epilogo`.

## Tests and evidence

- Data: `tests/campaign.test.ts`, `tests/campaigns.test.ts`, scale/layout/profile guards.
- Completable: `tests/e2e/campaign-completable.spec.ts`.
- Real commands: `tests/e2e/brena.spec.ts` builds the three communities with ordinary place/build orders.
- Layout: `tests/e2e/hud-layout.spec.ts` and `campaign.spec.ts`.
- Real-command full path: `tests/e2e/release-playtest.spec.ts` (nightly slow tier). The opening row is in
  `yarn bench:check`.
- Open: human no-cheat playtest.
