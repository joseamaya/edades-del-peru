# 0003 · Historical certainty and sources

**Status:** Accepted · **Date:** 2026-11-14 (records an invariant already enforced by the project)

## Context

The game is strategic fiction, but it is built on real societies. Inventing a ruler, a date or a battle would
turn the educational layer into misinformation. Some periods and cultures have no known rulers, no written
record or conflicting chronologies.

## Decision

Every historical name, date, place, battle and technology must come from a source cited in
[`docs/historia/`](../historia/). Where the record is silent or disputed, use the labels already used by the
dossiers:

- **Documentado:** archaeology, geography or material culture.
- **Inferido:** a reasoned reconstruction from the evidence.
- **Supuesto plausible:** a design assumption, labelled as such.
- **Abstracción del juego:** a game abstraction, documented as such.
- **No documentado:** known to be absent from the record; it may be reconstructed or not modelled.

The mission and briefing layer adds **Licencia del juego** for an invented or reordered story, only inside a
mission labelled as such. The campaign research adds `DOC` / `TRAD` / `MITO` / `DEB`. Do not invent a parallel
taxonomy: use the label that matches the dossier, and keep the dossier, the mission and the art record
consistent.

Myths are playable only inside a **Leyenda** mission; elsewhere they are narrated as «cuentan que…». The
chronology guard forbids firearms, horses, vehicles and engines before 1532, and science fiction in every era.

## Consequences

- A mission cannot be implemented before its historical dossier exists.
- Dossiers carry certainty tables; missions and art use the same labels so the Codex can explain them.
- Unknown rulers are not invented: the narrator is an anonymous voice of the community when necessary.
- The Codex and briefings can separate documented history, tradition and game licence without breaking play.
- `tests/history.test.ts` enforces the unit chronology. The no-invention rule is a human/dossier gate
  enforced by the quality bar and review, not by a unit test.

## Revisit

The invariant does not change. Individual interpretations can be revised when the sources change, but that
requires updating the dossier, the certainty table and the affected mission/art record together.

## References

- `AGENTS.md` (domain invariants)
- `docs/GDD.md` §5
- `docs/historia/README.md`
- `docs/design/campaign-quality-bar.md` (History gate)
- `docs/design/model-mission-pattern.md` §1
