# Miraflores 1881 — model mission

**Mission:** `m_miraflores` · **Campaign:** La República · **Period:** Republic (1881) ·
**Status:** implemented, pending art review and a human playtest.

## Historical problem

After San Juan and Chorrillos, Lima's defence fell back on a line of redoubts at Miraflores. Many
defenders were city reservists; Cáceres held the right sector. The line resisted but Lima fell. The
mission's victory is the **withdrawal**, not saving the capital: hold long enough to take Cáceres and the
force to the sierra. Sources and certainty: [`docs/historia/campanas/miraflores.md`](../historia/campanas/miraflores.md).

## Acts

1. **Build the redoubts.** A `network` objective requires three `FORTRESS` redoubts at the marked nodes.
2. **Hold the line.** Six units hold the Miraflores line for 90 s under Chilean waves.
3. **Withdraw.** Reach the sierra road with Cáceres alive.

The sack of Chorrillos and the occupation of Lima are stated in the epilogue, never staged.

## Map and site

- 256 m coast transect, painted ground every 2 m, worker crossing ≈2:22.
- Adds `miraflores_site`, which reuses the Lima colonial kit at the `ciudad` phase with its own label: Lima in 1881 is a living capital, not the traced plaza of 1535.
- Player camp north of the redoubt line, Chilean base at Chorrillos in the south, retreat road east towards the sierra.
- The opening frames the camp and its line of reservists, not the redoubts 30 m south, and the camp has a
  resource keepout so no grove grows over that frame.
- Own in-engine captures (`scripts/capture_republica_arc.mjs`), documented in `PROVENANCE.md`.

## Economy and cast

- `REPUBLIC` vs `CHILE`; period-locked Republic.
- Units: workers, republican defenders (reservists), riflemen, cavalry, hussars, artillery and scouts.
- Cáceres is a protected commander card; no invented likeness.

- The Chilean army is a **field force**: `enemy.economy: false` and `start.enemyOpeningUnits: false` keep
  its camp but stop the peasant economy, sawmill and mill. Its pressure is the authored redoubt waves, not
  a competing settlement. The assault column is six line infantry and two riflemen, without the siege
  battery: its long-range shells one-shot the reservist line, and the real-order hold needed eight units to
  advance. The line's core is six (`minUnits: 6`); the redoubts are its fortifications, and the withdrawal
  survives the fall of the camp because the mission is a `retirada`. The historical Chilean expedition did
  field artillery; the model records that arm but keeps it out of the four-minute assault because the
  howitzer's 56 m envelope one-shots the reservists (same abstraction as Huamachuco and Arica).

## Opening and closing

- Three beats: Lima, the redoubts, the withdrawal.
- Briefing art `media/miraflores/intro-reductos.webp`; act cards `intro-reductos` and `intro-retirada`;
  epilogue `intro-epilogo`.

## Tests and evidence

- Data: `tests/campaign.test.ts`, `tests/campaigns.test.ts`, scale/layout/profile guards.
- Completable: `tests/e2e/campaign-completable.spec.ts`.
- Real commands: `tests/e2e/miraflores.spec.ts` builds the three redoubts with ordinary place/build orders.
- Layout: `tests/e2e/hud-layout.spec.ts` and `campaign.spec.ts`.
- Real-command full path: `tests/e2e/release-playtest.spec.ts` (nightly slow tier). The opening row is in
  `yarn bench:check`.
- Open: human no-cheat playtest.
