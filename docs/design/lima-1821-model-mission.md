# Lima 1821 — model mission

**Mission:** `m_lima_1821` · **Campaign:** La Independencia · **Period:** Independence (1821) ·
**Status:** implemented and art-accepted (site view approved 2026-11-23); pending the human playtest.

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
  traced plaza of 1535. The cathedral, Plaza Mayor, cabildo, portales and balconied houses are the colonial
  Blender kit (`src/model/defs/colonialCity.ts`), shared with `m_lima`, `m_miraflores`, `m_junta_cusco` and
  `m7_tupac_amaru`.
- Player camp south-west of the city, Callao on the coast, Lurín and Carabayllo on the supply roads.
- No new GLB. The site is a documented reuse; the mission has its own in-engine captures
  (`scripts/capture_independencia_arc.mjs`) for the Lurín road, the Plaza Mayor and the Callao coast,
  documented in `PROVENANCE.md`.

## Economy and cast

- `PATRIOTAS` vs `REALISTAS`; period-locked Independence.
- Units: workers, line infantry, musketeers, riflemen, montoneras, cavalry, hussars, artillery, scout and
  missionary. Buildings follow the late-colonial roster. Research is limited to irrigation, the elite ranged
  line, shock cavalry, siege engines, evangelization and the sierra campaign; no mortars, hunters or obrajes.
- San Martín is a tagged rifleman with a commander card; the mission protects him. No invented likeness:
  the portrait is the existing stylized abstraction.

- Callao is a **besieged fortress**: `enemy.economy: false` and `start.enemyOpeningUnits: false` keep its
  centre and houses but stop the peasant economy, sawmill and mill. Its pressure is the authored relief
  column from Carabayllo and the capitulation clock; `enemy.attacks: false` keeps the fortress from marching
  out on its own.

## Opening and closing

- Cinema intro (`introStyle: 'cinema'`, see `src/ui/CinemaIntro.ts`): Lima on the Rímac (`cine-lima`,
  push-in); a campaign map painted from this terrain with the montoneras' cut at Lurín, the march on Lima, the
  siege of the Callao (dashed) and the royalist relief from Carabayllo, all from the mission's own
  `LIMA_1821_*` constants; the montoneras astride the road to Lima (`cine-lurin`, pan). The proclamation is
  stated as the aim, not as done. Stills: `node scripts/capture_cinema.mjs --mission=m_lima_1821
  [--only=cine-lurin]` (shots in `scripts/cinema-shots/independencia.mjs`).
- Briefing art: `media/lima-1821/intro-plaza.webp`; chapter cards use `intro-plaza` and `intro-callao`;
  epilogue uses `intro-epilogo`.
- The epilogue explains the "independencia concedida / conseguida" debate without resolving it.

## Tests and evidence

- Data: `tests/campaign.test.ts`, `tests/campaigns.test.ts`, scale/layout/profile guards.
- Completable: `tests/e2e/campaign-completable.spec.ts` (generic objective driver).
- Real commands: `tests/e2e/lima-1821.spec.ts` moves the montoneras to the Lurín road and checks that the
  first objective advances without direct objective calls.
- Layout: `tests/e2e/hud-layout.spec.ts` and `campaign.spec.ts` cover the briefing and act cards.
- Real-command full path: `tests/e2e/release-playtest.spec.ts` (nightly slow tier). The opening row is in
  `yarn bench:check`.
- Open: human no-cheat playtest.
