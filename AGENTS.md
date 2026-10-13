# AGENTS.md

"Edades del Perú" — an Age of Empires II-style RTS through Peru's history (Caral to the present), built with
Three.js + Vite + TypeScript. Player-facing docs are in [`README.md`](./README.md); contribution workflow in
[`CONTRIBUTING.md`](./CONTRIBUTING.md); deep subsystem notes and code traps in
[`docs/development.md`](./docs/development.md).

## Commands

Package manager **Yarn 1** (`yarn.lock` exists — never create a `package-lock.json`). Node >= 20.19 (CI uses 22).

- `yarn dev` — Vite at http://localhost:5173
- `yarn build` — `tsc --noEmit && vite build` (dist/)
- `yarn typecheck` / `yarn lint` — `tsc --noEmit` / ESLint (also `yarn format` / `yarn format:check` for Prettier)
- `yarn test` — Vitest. Single file: `yarn test tests/rng.test.ts`; by name: `yarn test -t "…"`
- `yarn test:e2e` — full Playwright suite; `yarn test:e2e:smoke` — `@smoke` subset (requires `npx playwright install chromium`)
- `yarn shot <name> --seed=777 --wait=8000` — screenshot into `review/`
- `yarn sim [--seeds=…] [--max=…] [--difficulty=…]` — headless AI-vs-AI match runner (AI regression baseline)

Everything runs through `package.json`; there is no `npm test`. The CI gate, in order, is
`yarn typecheck && yarn lint && yarn format:check && yarn test && yarn build`, and the repo is kept at
**0 lint warnings** and Prettier-clean.
CI runs that `build` job on every PR, the `@smoke` E2E subset on PRs and the full E2E suite on `main`
(the E2E workflow is skipped for docs-only PRs).

## Conventions

- **Language split**: code (identifiers, comments, docs) is **English**; only the text shown to the player
  (HUD, menus, narrative) and `docs/historia/**` stay **Spanish**. Historical proper nouns (civs, mission ids,
  place names) are data — never translate them.
- Strict TS (`strict`, ES2022, `moduleResolution: bundler`). No comments unless they add context the code
  cannot express. Prettier (single quotes, 120 cols) over `src/**/*.ts`, `scripts/**/*.mjs`, `tests/**/*.ts`
  and `*.config.{ts,js}`.
- Prefer the data-driven defs (`src/model/defs/*`) and existing `src/util/*` over new constants. Type `EventBus`
  events in `GameEvents` (`src/core/types.ts`).
- Keep DOM ids, URL params and `localStorage` keys (`peru-settings`, `peru-campaign`) stable, even if Spanish.
- Import Three addons as `three/addons/...` (not `three/examples/jsm/...`).

## Domain invariants (not obvious from names)

- **`Era` (0-5) is the internal tech level; `HistoricalPeriod` (0-9) is the match's historical period.** Matches
  are **locked by period**: `period` fixes `startingEra` and disables era advancement. Do not conflate them.
- Only **coetaneous** civilizations may face each other (`civsForPeriod`).
- **History must not be invented**: no invented names, dates or battles; cite a source from `docs/historia/`.
  Chronology constraint for models/units: **no firearms, horses, vehicles or engines before 1532**, and no
  sci-fi in any era (outfit spec: `docs/historia/atuendos.md`).

## Debug harness

- `window.game` and `window.THREE` are exposed; the app opens the menu, so use `?play=1` (plus `?seed=`, `?fog=0`,
  `?low=1`, `?speed=`, `?era=N`, `?mission=ID`) to enter a match directly. `?replay=1` plays the stored replay
  (`localStorage['peru-replay']`) and `?noloop=1` skips auto-starting the loop (tests drive fixed steps).
- `yarn shot` and the scripts write generated PNG/JSON to `review/` (gitignored) — never edit those by hand.

## See also

[`README.md`](./README.md) · [`CONTRIBUTING.md`](./CONTRIBUTING.md) · [`docs/development.md`](./docs/development.md) ·
[`docs/historia/`](./docs/historia/) · [`PROVENANCE.md`](./PROVENANCE.md)
