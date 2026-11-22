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
2. **Blockade.** Hold the bay shore with artillery for 45 s. The sea approach is an abstraction: the game
   has no naval units, so the blockade is represented by coastal batteries on the bay's east shore and the
   scripted sorties.
3. **Sorties.** Defend the siege camp for 60 s while Rodil's garrison attacks the lines. The intro's last beat and
   the Act III card stage the hunger and the coming surrender; the capitulation itself is narrated after the
   objective is forced, not before.
4. **Capitulation.** Hold the fortress approaches for 90 s with at least eight units; the hold consumes
   food, so an empty store pauses the siege.

Optional/failure: if Salom dies or the camp falls, the mission is lost.

## Map and site

- 256 m coast transect, painted ground every 2 m, worker crossing ≈2:22.
- New `real_felipe_site` reuses the Arica coastal-fort composition and heightfield as a **labelled
  abstraction**: the real Real Felipe is a larger bastion, but the terrace, battery and sea approach read
  correctly at RTS zoom. No heritage card is attached; the fortress is the objective area, not a museum.
- The bay of Callao **opens to the Pacific**: the heightfield (`scripts/build_geographic_heightmaps.py`)
  joins the bight to the western sea through a south-west mouth; before it, a ~27 m dry bar closed the bay
  into a lagoon. The fortress fronts the bay (its pad is ~32 m from the water) — the bay is the port, and
  the open Pacific is beyond it.
- The patriot squadron's blockade node sits on the bay's east shore, ~24 m from the fortress, instead of
  on the Pacific shore 134 m away on the far side of the bay.
- Player camp inland to the **south-west** of the fortress, two battery nodes between the camp and the
  fort, the bay on the west.
- No new GLB. The reused site is recorded in `PROVENANCE.md`; the mission has its own in-engine captures
  (`scripts/capture_independencia_arc.mjs`) for the bastion, the batteries and the siege camp. A dedicated
  star-fort kit is future work.

## Economy and cast

- `PATRIOTAS` vs `REALISTAS`; period-locked Independence.
- Units: workers, line infantry, musketeers, riflemen, montoneras, cavalry, artillery, scout and
  missionary. Buildings include forts, walls, towers and the siege camp.
- Salom and Rodil are commander cards. Both are documented; no invented likeness, the portraits are the
  existing stylized abstractions.

- The Real Felipe is a **besieged fortress**: `enemy.economy: false` and `start.enemyOpeningUnits: false`
  keep its centre and houses but stop the peasant economy, sawmill and mill. Its pressure is authored: the
  sortie against the siege camp, the blockade and the capitulation clock.

## Opening and closing

- Cinema intro (`introStyle: 'cinema'`, see `src/ui/CinemaIntro.ts`): the Real Felipe on the bay at dusk
  (`cine-bastion`, push-in); a campaign map painted from this terrain with the camp, the two battery nodes,
  the blockade shore (dashed) and Rodil's sortie toward the camp, all from the `REAL_FELIPE_*` constants; a
  siege battery with its guns on the fortress (`cine-baterias`, pan). The hunger and the capitulation stay
  for the act cards and the epilogue. Stills: `node scripts/capture_cinema.mjs --mission=m_real_felipe
  [--only=cine-baterias]` (shots in `scripts/cinema-shots/independencia.mjs`).
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
- Real-command full path: `tests/e2e/release-playtest.spec.ts` (nightly slow tier). The opening row is in
  `yarn bench:check`.
- Open: human no-cheat playtest and a dedicated star-fort GLB.
