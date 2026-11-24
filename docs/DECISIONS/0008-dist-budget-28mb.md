# 0008 · A 28 MB `dist/` budget for the cinema intros

**Status:** Accepted · Amended by [0009](./0009-dist-budget-40mb.md) · **Date:** 2026-11-22 · Amends the size budget of [0001](./0001-three-js-vite-typescript.md)

## Context

[0001](./0001-three-js-vite-typescript.md) set hard build budgets: `dist/` < 25 MB and the entry chunk
< 600 KB gzip. On 2026-11-22 `dist/` measured 24.97 MB, so the budget had no room for new art.

The Tarapacá cinema intro (`introStyle: 'cinema'`, #583) plays full-bleed stills with a slow camera move. The
slide intro's stills (640×360 to 960×540, 2–47 KB) turn soft at full screen, so the pilot captured two
1920×1080 in-engine stills (~65–100 KB each). Extending the format to the twenty released missions adds
about two stills per mission, roughly 3 MB.

Rejected options:

- **Reuse the current intro stills.** No size cost, but they upscale to a blurred full screen; the format
  exists to show the site at full resolution.
- **Lighter 1280×720 stills and offsets elsewhere.** About 1 MB, but there is no 1 MB of dead weight left to
  offset without cutting reviewed art or models, and the stills would still read soft on 1080p screens.

## Decision

- The `dist/` total budget is **28 MB** (`scripts/check-dist.mjs`, `TOTAL_LIMIT`).
- The entry chunk budget is unchanged: **< 600 KB gzip**.
- The extra 3 MB is for the cinema-intro stills (`public/media/*/cine-*.webp`, 1920×1080 WebP, ≤ 160 KB each).
  Any other new asset still needs a size ledger with offsets, as before.

## Consequences

- Every released mission can use the cinema intro with its own full-HD stills (`scripts/capture_cinema.mjs`).
- The game download grows by about 12 %. The stills load lazily with the intro, not with the first play
  payload, so the first match does not wait for them.
- Documents that cite the 25 MB budget point here.

## Revisit

Revisit if the itch or Pages package limits change, if the stills grow past ~3.5 MB in total, or if the
intros move to illustrated art with a different size profile.
