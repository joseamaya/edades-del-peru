## What

<!-- What changes, and in which subsystem. One or two sentences. -->

## Why

<!-- The issue this closes and the reason. Use `Closes #…` so it links. -->

## Verification

- [ ] `yarn verify:fast` (typecheck · lint · format · unit · build)
- [ ] Targeted E2E: `yarn test:e2e tests/e2e/<area>.spec.ts` (or N/A)
- [ ] `yarn sim` when gameplay moved (or N/A)

`yarn evidence` lists the captures this diff needs; paste its output in the section below.

## Visual evidence

<!-- Attach the PNG(s) to this PR and keep the command that produced them. `review/` is gitignored, so a
     path alone is not evidence. If the diff is docs/tests/scripts only, write "no visible change, because …". -->

- Before:
- After:
- Command:

## Domain checks

- [ ] History: no invented names, dates or battles; the source is cited from `docs/historia/` (or N/A)
- [ ] Chronology: no firearms, horses, vehicles or engines before 1532, no sci-fi in any era (or N/A)
- [ ] Player-facing copy goes through `t()` in `src/i18n/es.ts` (or N/A)
- [ ] Art: new renders start `reviewed: false` and the manifest hash is updated (or N/A)
- [ ] Stable ids kept: DOM ids, URL params, `localStorage` keys, mission ids (or N/A)

## Notes

<!-- Trade-offs, follow-ups, or what was deliberately left out. -->
