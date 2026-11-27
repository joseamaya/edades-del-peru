# Human playtest

The automated tiers prove the campaign is playable, deterministic and inside its budgets. They cannot judge how a
mission *reads*: whether the briefing art matches the beat, whether an act drags, whether the optional goal is
worth the detour, or whether a fire, a mine or a withdrawal lands as drama instead of noise. This page is that
last tier.

## Tiers, and what each one already covers

| Tier | Command | Proves |
| --- | --- | --- |
| Static and unit | `yarn verify:fast` | Types, lint, formatting, 1,200+ unit tests, build and size budgets. |
| Campaign playtests | `yarn test:e2e:slow` | The 14 scripted playtests finish their missions with real orders (no objective cheats) and the campaign path stays completable. |
| Deterministic bots | `yarn sim --matrix --assert-balance` | The AI-vs-AI matrix stays monotonic per difficulty, so balance changes do not silently flip a whole tier. |
| Human playtest | this page | Readability, pacing, art-to-beat match, and whether the act is fun. |

The scripted playtests and the bot matrix are the regression net; the human pass is the judgement call. A
mission that passes the first three and fails this one is still not done.

## Running the pass

1. Generate the checklist from the missions themselves:

   ```sh
   yarn qa:checklist                    # all 20 missions into review/qa-checklist.md
   yarn qa:checklist --mission=m3_moche_recuay
   ```

   The generator reads `src/campaign/defs/campaign.ts`, so a new objective, optional goal, fire or prepared
   strike appears in the list without anyone editing it. `review/` is gitignored: the checklist is a working
   document, the sign-off below is the record.

2. Play each mission with the shipped settings (`?play=1`, no `?intro=0`, no cheats), start to epilogue.

3. For each row, mark the boxes on the four axes that only a person can judge:

   - **Reads**: the briefing card names the beat and its art shows it.
   - **Objective**: every panel entry is legible and reaches a state; optionals are reachable and pay out.
   - **Story beats**: fires, prepared strikes and withdrawals fire once, on the documented side.
   - **Continuity**: a mid-act save reloads with objectives, units and timers; victory and defeat land.

4. Record the verdict in the sign-off table and open an issue for every ✗, with the mission id and the step.

## Where things live

- Mission defs (objectives, fires, triggers, rewards): `src/campaign/defs/missions/*`.
- Briefing and act-card art: `public/media/<mission>/` (see `PROVENANCE.md` for size and provenance).
- Model-mission notes (the intended beat and its sources): `docs/design/<mission>-model-mission.md`.
- Historical grounding for every cinematic claim: `docs/historia/**`.

## Known limits

- `yarn sim` runs headless without rendering, so it says nothing about frame pacing; that is `bench:check` and
  `bench:site-views` on a real GPU.
- The recorded playtests use scripted orders, not a human's; they can be optimised without noticing that an act
  is boring. That is exactly what this pass is for.
- A mission where the human verdict is "works, not fun" needs a design change with its own PR, not a checklist
  note.
