# 0006 · The model-mission standard

**Status:** Accepted · **Date:** 2026-11-14 (records the standard established by Caral and Chavín)

## Context

The campaigns were uneven: some missions were a renamed `gather + build + survive`, some had no acts or
authored opening, and status was judged by "it boots" instead of by a player experience. Caral (`m1_caral`)
became the reference that met every quality gate.

## Decision

A **model mission** is the unit of quality. It must meet the gates in
[`docs/design/campaign-quality-bar.md`](../design/campaign-quality-bar.md), including:

- one historical problem and one mechanic that belongs to it;
- acts inside one `MissionDef`, with a **30–40 minute** target; a mission that cannot reach it without padding
  records its measured path and the exception in its design document;
- a 256 m map with ground painted every 2 m; a worker crosses it in 130–160 s;
- hidden objectives revealed per act, chapter cards, optional objectives that never gate victory;
- the documented historical outcome as the ending;
- a narrated intro, a briefing and a mission-specific epilogue;
- a bench scene, a scale test and a no-cheat playtest;
- a `docs/design/<mission>-model-mission.md` design document and a dossier certainty table.

A mission that does not meet the standard is **pre-model**, regardless of whether it is playable.

## Consequences

- New missions start from `model-mission-pattern.md`; copying an older mission is not enough.
- The quality bar audit is the live status; a mission is not "done" because its tests are green.
- A model-mission rebuild is a large task (L): do one at a time and update the audit when it closes.
- Map scale, act structure and opening assets are testable, so they do not depend on a reviewer's memory.
- Pacing is measured and recorded per mission; the 30–40 minute band is a target, not a pass/fail gate.
- Caral remains the reference; Chavín is the second implementation that proves the pattern is repeatable.

## Revisit

Revisit if the target mission length, map scale or act structure changes. Any change requires updating the
pattern, the quality bar, the scale tests and the missions already promoted.

## References

- `docs/design/model-mission-pattern.md`
- `docs/design/campaign-quality-bar.md`
- `docs/design/campaign-experiences.md`
- `docs/design/caral-model-mission.md`
- `tests/campaign-scale.test.ts`
