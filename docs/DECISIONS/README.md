# Decision record

One decision per file: `NNNN-short-title.md`. Each record states the context, the decision, its
consequences and when to revisit it.

A decision is **not edited** after it is accepted. If it changes, write a new record that cites the old one
and mark the old one `Superseded by NNNN`.

## Index

| # | Decision | Status |
| --- | --- | --- |
| 0001 | [Three.js, Vite and TypeScript](./0001-three-js-vite-typescript.md) | Accepted |
| 0002 | [Period-locked matches; `Era` is not `HistoricalPeriod`](./0002-period-locked-matches.md) | Accepted |
| 0003 | [Historical certainty and sources](./0003-historical-certainty.md) | Accepted |
| 0004 | [Procedural-first models with presentation-only rigs](./0004-procedural-first-models.md) | Accepted |
| 0005 | [Blender render provenance gate](./0005-blender-provenance-gate.md) | Accepted |
| 0006 | [The model-mission standard](./0006-model-mission-standard.md) | Accepted |
| 0007 | [Local authoring tools, not CI dependencies](./0007-local-authoring-tools.md) | Accepted |
| 0008 | [A 28 MB `dist/` budget for the cinema intros](./0008-dist-budget-28mb.md) | Accepted |
| 0009 | [A 40 MB `dist/` budget for the site kits](./0009-dist-budget-40mb.md) | Accepted |

## Writing a new record

1. Take the next number; never reuse one.
2. Copy the structure: title, status, date, context, decision, consequences, revisit.
3. State the options that were rejected and why, when that is not obvious.
4. Link the code, tests or documents that implement the decision.
5. Add the row to the index above.
6. Open a PR. The project author accepts or rejects the decision; an agent can propose but not decide.
