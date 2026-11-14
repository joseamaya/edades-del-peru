# 0002 · Period-locked matches; `Era` is not `HistoricalPeriod`

**Status:** Accepted · **Date:** 2026-11-14 (records an invariant already enforced by the code)

## Context

The game covers ten historical periods. It also has a technology ladder (`Era`, 0–5) inherited from the
Age of Empires II model. Conflating the two would allow a Moche army to advance into the Viceroyalty, or a
modern unit to appear in a pre-Hispanic match.

## Decision

A match is **locked to one `HistoricalPeriod`** (0–9). The period fixes `startingEra` and disables era
advancement. `Era` remains the internal tech level used by definitions and models, but it never decides which
period a match belongs to. Only **coetaneous** civilizations may face each other; `civsForPeriod` is the
authority.

## Consequences

- Mission and match definitions must declare a period; the UI groups content by period.
- A unit or tech can be gated by `minPeriod` and still reuse era-based definitions; a building is gated by
  `minEra` and the civilization's architecture profile.
- Tests must cover the period/civilization matrix and the chronology guard. Cross-period matchups are bugs,
  not balance choices.
- Adding a civilization requires declaring which periods it belongs to and which neighbours it can meet.

## Revisit

Revisit only if a deliberately anachronistic mode (for example a sandbox or "what if" campaign) is added. That
mode would need its own rule and must not weaken the campaign invariant.

## References

- `AGENTS.md` (domain invariants)
- `docs/GDD.md` §2 and §5
- `src/core/types.ts`, `src/model/defs/periods.ts`, `src/model/defs/civs.ts`
- `tests/history.test.ts`
