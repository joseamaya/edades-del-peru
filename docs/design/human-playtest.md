# Human playtest

**Status:** Living · last reviewed 2026-11-27 · owner: project owner (the verdict), agents (the worksheet).

The automated tiers prove the campaign is playable, deterministic and inside its budgets. They cannot judge how a
mission *reads*: whether the briefing art matches the beat, whether an act drags, whether the optional goal is
worth the detour, whether the audio speaks where it should, or whether a fire, a mine or a withdrawal lands as
drama instead of noise. This page is that last tier.

## Tiers, and what each one already covers

| Tier | Command | Proves |
| --- | --- | --- |
| Static and unit | `yarn verify:fast` | Types, lint, formatting, 1,200+ unit tests, build and size budgets. |
| Campaign playtests | `yarn test:e2e:slow` | The campaign playtests drive missions with real orders (no objective cheats) and assert the mission state; the release playtest adds the finishing paths. |
| Deterministic bots | `yarn sim --matrix` | A recorded AI-vs-AI baseline per difficulty. It is **not** a gate yet: the committed run is not monotonic (`docs/ai-difficulty.md`), so read it as a trend, never as a pass. |
| Human playtest | this page | Readability, pacing, audio, the three HUD viewports, art-to-beat match and whether the act is fun. |

A mission that passes the first three and fails this one is still not done.

## Running the pass

1. Generate the worksheet from the missions themselves:

   ```sh
   yarn qa:checklist                    # all 20 missions into review/qa-checklist.md
   yarn qa:checklist --mission=m3_moche_recuay
   ```

   The generator reads `src/campaign/defs/campaign.ts`, so a new objective, optional goal, fire, prepared strike
   or scripted withdrawal appears without anyone editing this page. It also lists the campaign-level checks (menu
   entries, unlock order, Codex) once.

2. Play each mission with the shipped settings (`?play=1`, no `?intro=0`, no cheats, no `?low=1`), start to
   epilogue, at 1280×720, 1600×900 and 1920×1080.

3. For each row, mark the four axes only a person can judge:

   - **Reads and teaches**: the briefing card and its art match the beat; the tutorial explains the next useful
     action without blocking.
   - **Plays**: objectives are legible and reach a state; alternatives are real choices; optionals are reachable
     and pay out.
   - **Beats land**: fires, prepared strikes and withdrawals fire once, on the documented side.
   - **Holds up**: audio cues, victory with a summary and the next mission, a reachable defeat, a mid-act save,
     three HUD viewports, no visible jank.

4. Record the verdict in the table below and open an issue for every ✗, with the mission id and the step.

## Sign-off

| Mission | Played by | Date | Verdict | Notes |
| --- | --- | --- | --- | --- |
| m1_caral · La Ciudad Sagrada | | | | |
| m2_chavin · El Oráculo de Chavín | | | | |
| m3_moche_recuay · La Frontera de los Valles | | | | |
| m4_wari · El Horizonte Medio | | | | |
| m_tambotoco · Los hijos de Tambotoco | | | | |
| m5_yahuar_pampa · Yahuar Pampa | | | | |
| m6_chimu_inca · La Guerra del Norte | | | | |
| m6b_guerra_civil · La Guerra Civil | | | | |
| m_lima · La Ciudad de los Reyes | | | | |
| m_cusco_1536 · Cusco en llamas | | | | |
| m_vilcabamba · El último Inca | | | | |
| m7_tupac_amaru · La Gran Rebelión | | | | |
| m_junta_cusco · La Junta del Cusco | | | | |
| m_lima_1821 · El cerco de Lima | | | | |
| m8_independencia · La Independencia | | | | |
| m_real_felipe · El último bastión | | | | |
| m9_guerra_pacifico · La Defensa de Arica | | | | |
| m_tarapaca · La quebrada | | | | |
| m_miraflores · Los reductos | | | | |
| m_brena · El brujo de los Andes | | | | |

## What the generator cannot see

The mission defs carry the objectives, triggers, rewards and fires. They do **not** carry:

- the briefing and act-card art, or its provenance (`PROVENANCE.md`);
- the tutorial copy (`src/i18n/es.ts`);
- the audio cues (`docs/design/audio.md`);
- the campaign unlock order (`src/campaign/progress.ts`).

Those rows are manual and can go stale when a mission changes, which is why the worksheet lists them explicitly
instead of trusting the generator.

## Known limits

- `yarn sim` runs headless without rendering, so it says nothing about frame pacing; that is `bench:check` and
  `bench:site-views` on a real GPU.
- The recorded playtests use scripted orders, not a human's; they can be optimised without noticing that an act
  is boring.
- A mission whose verdict is "works, not fun" needs a design change with its own PR, not a checklist note.
