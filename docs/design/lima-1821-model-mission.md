# Lima 1821 — model mission

**Mission:** `m_lima_1821` · **Campaign:** La Independencia · **Period:** Independence (1821) ·
**Status:** implemented, pending art review and a human playtest.

## Historical problem

The independence of Peru was not won in a single battle. San Martín's expedition landed on the coast,
the montoneras cut Lima's supply roads and Cochrane blockaded Callao. The viceroy evacuated the capital;
San Martín proclaimed independence on 28 July 1821. The first siege of Callao ended with La Mar's
capitulation in September. The mission is about **pressure and legitimacy**, not about storming the city.
Sources and certainty: [`docs/historia/campanas/lima_1821.md`](../historia/campanas/lima_1821.md).

## Acts

1. **Cut the roads.** Three montoneras hold the Lurín road for 30 s. The mechanic teaches that the city is
   taken by supply, not by assault.
2. **Proclaim independence.** Enter Lima, visit the Plaza Mayor card with San Martín alive. The act card
   states that the city was evacuated, not conquered.
3. **First siege of Callao.** Hold the fortress approaches for 90 s with at least six units while a relief
   column from Carabayllo marches on the siege line. Victory ends with La Mar's capitulation; the epilogue
   states that the war continues in the sierra.


## Map and site

- 256 m coast transect, painted ground every 2 m, worker crossing ≈2:22 (`unitSpeedScale: 0.75`).
- Reuses `lima_site` (colonial city) with `phase: 'ciudad'`: Lima is a living capital in 1821, not the
  traced plaza of 1535. The cathedral, Plaza Mayor and streets are the same authored kit used by `m_lima`.
- Player camp south-west of the city, Callao on the coast, Lurín and Carabayllo on the supply roads.
- No new GLB. The site is a documented reuse; the mission has its own in-engine captures
  (`scripts/capture_independencia_arc.mjs`) for the Lurín road, the Plaza Mayor and the Callao coast,
  documented in `PROVENANCE.md`.

## Economy and cast

- `PATRIOTAS` vs `REALISTAS`; period-locked Independence.
- Units: workers, line infantry, musketeers, riflemen, montoneras, cavalry, hussars, artillery, scout and
  missionary. Buildings follow the late-colonial roster.
- San Martín is a tagged rifleman with a commander card; the mission protects him. No invented likeness:
  the portrait is the existing stylized abstraction.

## Opening and closing

- Three narrated beats: expedition and blockade, the evacuated city, the proclamation.
- Briefing art: `media/lima-1821/intro-plaza.webp`; chapter cards use `intro-plaza` and `intro-callao`;
  epilogue uses `intro-epilogo`.
- The epilogue explains the "independencia concedida / conseguida" debate without resolving it.

## Tests and evidence

- Data: `tests/campaign.test.ts`, `tests/campaigns.test.ts`, scale/layout/profile guards.
- Completable: `tests/e2e/campaign-completable.spec.ts` (generic objective driver).
- Real commands: `tests/e2e/lima-1821.spec.ts` moves the montoneras to the Lurín road and checks that the
  first objective advances without direct objective calls.
- Layout: `tests/e2e/hud-layout.spec.ts` and `campaign.spec.ts` cover the briefing and act cards.
- Open: human no-cheat playtest, current in-engine captures, performance row in `bench_scene.mjs` if the
  late view warrants it.
