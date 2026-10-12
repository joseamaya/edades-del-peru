# Contributing

Thanks for your interest in **Edades del Perú**! This is a Peruvian history RTS
(Caral → present) made with Three.js + Vite + TypeScript. The code, comments and docs are written in
**English**; only the in-game interface (the text shown to the player) and the historical dossiers in
`docs/historia/` stay in **Spanish**. Keep that split in what you add.

## Requirements

- Node.js ≥ 20.19
- Yarn 1 (`yarn --version` → `1.22.x`). `yarn.lock` exists; **do not** generate `package-lock.json`.

## Getting started

```bash
yarn install
yarn dev          # http://localhost:5173
```

The app shows the **main menu** by default. To jump straight into the match use `?play=1`.

## Commands

| Command | What it does |
|---|---|
| `yarn dev` | Development server (Vite). |
| `yarn build` | Typecheck + production build in `dist/`. |
| `yarn typecheck` | Only `tsc --noEmit`. |
| `yarn lint` | ESLint (must stay at **0 warnings**). |
| `yarn format` | Prettier over `src/**/*.ts` and `scripts/**/*.mjs`. |
| `yarn test` | Unit tests (Vitest). |
| `yarn bench` | Entity-scale performance benchmark (writes `review/bench.json`). |
| `yarn test:e2e` | E2E suite (Playwright). Requires `npx playwright install chromium`. |
| `yarn test:e2e:smoke` | Fast `@smoke` subset of the E2E suite (used on PRs). |
| `yarn shot <name>` | Screenshot into `review/` for visual review. |

Before opening a PR, run at least:

```bash
yarn typecheck && yarn lint && yarn test && yarn build
```

**CI:** the `build` job (typecheck/lint/unit/build) runs on every PR; the `e2e` workflow runs the
`@smoke` subset on PRs and the **full** suite on `main`, and is skipped for docs-only PRs
(`**/*.md`, `.agents/**`). Tag a test `{ tag: '@smoke' }` only if it covers a core flow worth gating
every PR on (keep the subset fast).

## Architecture (summary)

```
src/
  core/        Engine: Game (hub), RTS Camera, EventBus, GameLoop, Config, types
  rendering/   Renderer, PostFX, Sky, Water, Terrain, Particles, Biomes, Textures
  model/       Defs (periods, civs, units, buildings, techs) + parametric models
  entities/    Unit, Building, Resource node, Projectile, Views
  campaign/    Mission engine + 9 historical campaigns
  game/        A* pathfinding, Fog of war, AI, Economy
  ui/          Full Spanish HUD
  audio/       Procedural AudioEngine (WebAudio)
  util/        Seeded RNG, noise, math, DOM helpers
```

Details on subsystems, controls and code "traps" are in
[`docs/development.md`](./docs/development.md); the short agent-oriented orientation is in
[`AGENTS.md`](./AGENTS.md).

## History (do not invent)

- All historical documentation is in [`docs/historia/`](./docs/historia/).
- **Do not invent** names, dates or battles. If a datum is unattested, say so.
- Before touching historical content, consult the matching dossier and **add the source**.
- Outfits/weapons: spec in [`docs/historia/atuendos.md`](./docs/historia/atuendos.md).
  Respect chronology: **no firearms, horses, vehicles or engines before 1532**, and
  **no sci-fi** in any era. Chronology is enforced by `tests/history.test.ts`: when adding a
  post-1532 unit, set `UnitArchetype.minPeriod` in `src/model/defs/units.ts`.

## Code conventions

- **Strict TypeScript** (`strict`, `noUnusedLocals`, `noUnusedParameters`). Avoid new `any` when a type
  exists; type `EventBus` events in `GameEvents` (`src/core/types.ts`).
- **No comments** unless they add context the code does not express by itself.
- Follow the existing style: Prettier (single quotes, 120 columns, trailing commas).
- Reuse the existing utilities (`src/util/*`) and the data-driven defs
  (`src/model/defs/*`) instead of introducing duplicated constants.
- Model geometries/textures are **shared and cached**: do not dispose them by hand
  (see "Code traps" in [`docs/development.md`](./docs/development.md)).

## Workflow

1. Create a descriptive branch: `feat/…`, `fix/…`, `docs/…`.
2. Make small commits with clear messages in the imperative.
3. Make sure `typecheck`, `lint`, `test` and `build` pass.
4. Open a Pull Request explaining **what** and **why**, with screenshots if it changes anything visual.

## Reporting problems

Open an issue at <https://github.com/joseamaya/edades-del-peru/issues> stating the Node version,
operating system, steps to reproduce and, if applicable, a screenshot in `review/`.

## License

By contributing you accept that your contribution is distributed under the project's [MIT](./LICENSE) license.
