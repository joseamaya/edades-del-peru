# Real Felipe 1824–1826 — model mission

**Mission:** `m_real_felipe` · **Campaign:** La Independencia · **Period:** Independence (1824–1826) ·
**Status:** implemented, pending art review and a human playtest.

## Historical problem

The Callao garrison revolted in February 1824 and handed the fortress to the royalists. After Ayacucho,
Rodil refused the capitulation and held the Real Felipe with the last royalists. Salom besieged the fortress
by land and the patriot squadron blockaded the port. Thousands of civilians took
refuge inside; hunger and scurvy killed thousands. The fortress capitulated in January 1826. The mission is
about **siege economy and endurance**, not about an assault. The civilian suffering is told in the epilogue
and Codex, never rewarded as a mechanic.
Sources and certainty: [`docs/historia/campanas/real_felipe.md`](../historia/campanas/real_felipe.md).

## Acts

1. **Batteries.** Build two `FORTRESS` batteries at the marked approaches. The objective uses the `network`
   kind so both positions must be covered.
2. **Blockade.** Hold the coast with artillery for 45 s. The sea approach is an abstraction: the game has
   no naval units, so the blockade is represented by coastal batteries and the scripted sorties.
3. **Sorties.** Defend the siege camp for 60 s while Rodil's garrison attacks the lines.
4. **Capitulation.** Hold the fortress approaches for 90 s with at least eight units; the hold consumes
   food, so an empty store pauses the siege.

Optional/failure: if Salom dies or the camp falls, the mission is lost.

## Map and site

- 256 m coast transect, painted ground every 2 m, worker crossing ≈2:22.
- New `real_felipe_site` reuses the Arica coastal-fort composition and heightfield as a **labelled
  abstraction**: the real Real Felipe is a larger bastion, but the terrace, battery and sea approach read
  correctly at RTS zoom. No heritage card is attached; the fortress is the objective area, not a museum.
- Player camp inland, two battery nodes between the camp and the fort, coast on the west.
- No new GLB. The reused site is recorded in `PROVENANCE.md`; the mission has its own in-engine captures
  (`scripts/capture_independencia_arc.mjs`) for the bastion, the batteries and the siege camp. A dedicated
  star-fort kit is future work.

## Economy and cast

- `PATRIOTAS` vs `REALISTAS`; period-locked Independence.
- Units: workers, line infantry, musketeers, riflemen, montoneras, cavalry, artillery, scout and
  missionary. Buildings include forts, walls, towers and the siege camp.
- Salom and Rodil are commander cards. Both are documented; no invented likeness, the portraits are the
  existing stylized abstractions.

## Opening and closing

- Three narrated beats: the last bastion after Ayacucho, the siege and civilian crisis, the capitulation.
- Briefing art: `media/real-felipe/intro-bastion.webp`; chapter cards use `intro-baterias` and
  `intro-epilogo`; epilogue uses `intro-epilogo`.
- The epilogue states the civilian deaths and Rodil's honours without turning the siege into a heroic
  massacre.

## Tests and evidence

- Data: `tests/campaign.test.ts`, `tests/campaigns.test.ts`, scale/layout/profile guards.
- Completable: `tests/e2e/campaign-completable.spec.ts`.
- Real commands: `tests/e2e/real-felipe.spec.ts` builds a battery and checks the network objective advances
  without direct objective calls.
- Layout: `tests/e2e/hud-layout.spec.ts` and `campaign.spec.ts` cover the briefing and act cards.
- Open: human no-cheat playtest, current in-engine captures, a dedicated star-fort GLB and a performance row
  if the late view warrants it.
