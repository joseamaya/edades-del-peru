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

| Command               | What it does                                                                            |
| --------------------- | --------------------------------------------------------------------------------------- |
| `yarn dev`            | Development server (Vite).                                                              |
| `yarn build`          | Typecheck + production build in `dist/`, then the size budget.                          |
| `yarn typecheck`      | Only `tsc --noEmit`.                                                                    |
| `yarn lint`           | ESLint (must stay at **0 warnings**).                                                   |
| `yarn format`         | Prettier over `src/**/*.ts`, `scripts/**/*.mjs` and `tests/**/*.ts`.                    |
| `yarn test`           | Unit tests (Vitest).                                                                    |
| `yarn verify:fast`    | Quick gate: `typecheck + lint + cycles + format:check + test + build` (~15 s).          |
| `yarn bench`          | Entity-scale performance benchmark (writes `review/bench.json`).                        |
| `yarn sim`            | Headless AI-vs-AI match runner (AI regression baseline).                                |
| `yarn test:e2e`       | E2E suite (Playwright). Requires `npx playwright install chromium`.                     |
| `yarn test:e2e:smoke` | Fast `@smoke` subset of the E2E suite (used on PRs).                                    |
| `yarn shot <name>`    | Screenshot into `review/` for visual review.                                            |
| `yarn evidence`       | List the captures a branch needs, as a PR-ready markdown block.                          |
| `yarn shots:periods`  | Capture the period/region snapshots into `review/periods/`.                             |
| `yarn visual:check`   | Re-capture and fail if a period/region scene drifts from the baseline.                  |
| `yarn visual:update`  | Refresh the visual baseline (`tests/visual/baseline.json`) after an intentional change. |

Before opening a PR, run at least:

```bash
yarn typecheck && yarn lint && yarn format:check && yarn test && yarn build
```

**CI:** the `build` job (typecheck/lint/format/unit/build) runs on every PR; the `e2e` workflow runs the
`@smoke` subset on PRs and the **full** suite on `main`. Documentation-only PRs (Markdown outside
`docs/historia/`) run the workflow but skip the browser steps, so the required `smoke` checks still report
success. Historical dossiers count as code because the Codex and E2E assert their text. Tag a test
`{ tag: '@smoke' }` only if it covers a core flow worth gating every PR on (keep the subset fast).

## Architecture (summary)

```
src/
  core/        Engine: Game facade, Input/Selection/Runtime/World/StartBase controllers, camera, loop, config
  rendering/   Renderer, PostFX, Sky, Water, Terrain, Particles, Biomes, Textures, Projectile/FOW views
  model/       Defs (periods, civs, units, buildings, techs) + parametric models
  entities/    Unit, Building, Resource node, Projectile (sim) + entity views
  sim/         Three-free simulation primitives (Vec3)
  campaign/    Mission engine + 5 campaigns (13 missions)
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

## Documentation

[`docs/README.md`](./docs/README.md) owns the documentation map and the status labels; this is the short
version.

- Start at the map; it routes each task to the document that owns it.
- The design source of truth is [`docs/GDD.md`](./docs/GDD.md). Closed technical decisions live in
  [`docs/DECISIONS/`](./docs/DECISIONS/README.md).
- Design docs are in **English**; player-facing text and `docs/historia/**` are in **Spanish**.
- Update the living document in the same PR as the behaviour it describes. Mark point-in-time audits as
  **Snapshot** and do not edit archived documents into current ones.
- Add new documents to [`docs/README.md`](./docs/README.md). A docs-only PR needs no capture: say
  "no visible change, because …" in the `yarn evidence` block.

## Code conventions

- **Strict TypeScript** (`strict`, `noUnusedLocals`, `noUnusedParameters`). `any` is a lint error in `src/`;
  the legacy files listed in `eslint.config.js` still carry some and come off the list once typed. Type
  `EventBus` events in `GameEvents` (`src/core/types.ts`).
- **No runtime import cycles** in `src/` (`yarn cycles`, part of `verify:fast` and CI). When only types cross
  a boundary, import them with `import type`.
- **One file per mission** in `src/campaign/defs/missions/`; `campaign.ts` only lists them in order.
- **No comments** unless they add context the code does not express by itself.
- Follow the existing style: Prettier (single quotes, 120 columns, trailing commas).
- Reuse the existing utilities (`src/util/*`) and the data-driven defs
  (`src/model/defs/*`) instead of introducing duplicated constants.
- Procedural model geometries/textures are **shared and cached**: do not dispose them by hand. The glTF asset
  cache and the per-instance Caral attire are the explicit exceptions (their owner disposes them; see
  "Code traps" and "Rigged models" in [`docs/development.md`](./docs/development.md)).

## Workflow

1. Create a descriptive branch: `feat/…`, `fix/…`, `docs/…`.
2. Make small commits with clear messages in the imperative.
3. Make sure `typecheck`, `lint`, `test` and `build` pass.
4. Run `yarn evidence` and open a Pull Request with the **what**, the **why** and the captures it lists
   (or a line saying why nothing visible changed).

## Reporting problems

Open an issue at <https://github.com/joseamaya/edades-del-peru/issues> stating the Node version,
operating system, steps to reproduce and, if applicable, a screenshot in `review/`.

## License

By contributing you accept that your contribution is distributed under the project's [MIT](./LICENSE) license.
