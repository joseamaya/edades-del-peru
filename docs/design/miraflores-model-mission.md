# Miraflores 1881 — model mission

**Mission:** `m_miraflores` · **Campaign:** La República · **Period:** Republic (1881) ·
**Status:** implemented and art-accepted (site view approved 2026-11-23; earthwork redoubts added for audit
P1-2); pending the human playtest.

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

## Redoubts

The line was earth-and-fascine fieldwork, not masonry: the asset audit's P1-2 found the three nodes drawn as the
generic stone fortress. `m_miraflores` now declares
`buildingModels: { fortress: { type: 'redoubt_1881', scale: 1.06 } }`, so only this mission resolves the
`FORTRESS` to the procedural redoubt (stepped earth parapet with a straw fascine crest, sandbag revetment,
gabions at the front corners and two field guns). The override is presentation-only: HP, armor, cost, footprint,
garrison, defensive attack and the `a1_reductos` / `a1_cuarto` objectives are unchanged. Every other mission and
every skirmish keep the stone `fortress_imperial`.

Evidence: [`miraflores-redoubts.webp`](../media/miraflores-redoubts.webp) (the three nodes and the centre redoubt),
reproduced with `yarn capture:miraflores --out=docs/media/miraflores-redoubts` (seed 1881, UI hidden, redoubts
spawned through `spawnScriptedBuilding`).

## Map and site

- 256 m coast transect, painted ground every 2 m, worker crossing ≈2:22.
- Adds `miraflores_site`, which places the colonial architecture kit at the `ciudad` phase with its own label: Lima in 1881 is a living capital, not the traced plaza of 1535.
- Player camp north of the redoubt line, Chilean base at Chorrillos in the south, retreat road east towards the sierra.
- The opening frames the camp and its line of reservists, not the redoubts 30 m south, and the camp has a
  resource keepout so no grove grows over that frame.
- Own in-engine captures (`scripts/capture_republica_arc.mjs`), documented in `PROVENANCE.md`.

## Economy and cast

- `REPUBLIC` vs `CHILE`; period-locked Republic.
- Units: workers, republican defenders (reservists), riflemen, cavalry, hussars, artillery and scouts.
- The redoubts historically had guns, so the mission allows an artillery workshop; it is the only source of
  trainable artillery.
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

- Cinema intro (`introStyle: 'cinema'`, as the Tarapacá pilot): Lima and the open ground south of it
  (`cine-lima`, push-in); a campaign map painted from this terrain with the three redoubt nodes
  (`MIRAFLORES_REDOUBT_1..3`), the reservists' road from Lima and the Chilean column from its camp through
  San Juan to `MIRAFLORES_REDOUBT_2` (the wave's own spawn and target); the reservists on the line facing
  the Chilean infantry (`cine-linea`, pan). The withdrawal and the optional fourth redoubt are not shown: the
  act cards and the epilogue tell them. Regenerate the two 1920x1080 stills with
  `node scripts/capture_cinema.mjs --mission=m_miraflores [--only=cine-linea]`. The capture cannot stage
  buildings, so the redoubts are not in the stills.
- Briefing art `media/miraflores/intro-reductos.webp`; act cards `intro-reductos` and `intro-retirada`;
  epilogue `intro-epilogo`.

## Tests and evidence

- Data: `tests/campaign.test.ts`, `tests/campaigns.test.ts`, scale/layout/profile guards.
- Redoubt model: `tests/mission-building-models.test.ts` (the override resolves only for `m_miraflores`, and the
  stone fortress stays elsewhere).
- Completable: `tests/e2e/campaign-completable.spec.ts`.
- Real commands: `tests/e2e/miraflores.spec.ts` builds the three redoubts with ordinary place/build orders.
- Layout: `tests/e2e/hud-layout.spec.ts` and `campaign.spec.ts`.
- Real-command full path: `tests/e2e/release-playtest.spec.ts` (nightly slow tier). The opening row is in
  `yarn bench:check`.
- Open: human no-cheat playtest.
