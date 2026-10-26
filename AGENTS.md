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
- `yarn verify:fast` — quick gate (`typecheck + lint + format:check + test + build`, ~10 s)
- `yarn test:e2e` — full Playwright suite; `yarn test:e2e:smoke` — `@smoke` subset for PRs
  (CI shards it 2×); `yarn test:e2e:fast` — quick project, run sharded 4× on `main` (excludes the heavy
  AI/campaign-completable/settlement/save specs); `yarn test:e2e:slow` — those heavy specs (nightly).
  `PW_WORKERS=N` overrides workers.
- `yarn shot <name> --seed=777 --wait=8000` — screenshot into `review/`
- `yarn sim [--seeds=…] [--max=…] [--difficulty=…]` — headless AI-vs-AI match runner (AI regression baseline)
- `yarn bench:check` — rig/fauna/mixed structural budgets (`--assert`); SwiftShader is not a GPU benchmark
- `yarn art:blender` — ingest the in-repo Blender renders into WebP + manifest (`--dry-run`, `--only=…`, `--force`)
- `yarn art:validate` — validate the Blender render manifest/assets; `yarn art:review` — human review gate

Everything runs through `package.json`; there is no `npm test`. The CI gate, in order, is
`yarn typecheck && yarn lint && yarn format:check && yarn test && yarn build`, and the repo is kept at
**0 lint warnings** and Prettier-clean.
CI runs that `build` job on every PR, the `@smoke` E2E subset on PRs and the full E2E suite on `main`
(the E2E workflow is skipped for docs-only PRs). CI must be green, but merging also requires the review and
explicit approval described below.

## Authoring tools (Blender and GIMP)

- Sources live in `art-src/blender` and `art-src/gimp`; `.blend`/`.xcf` are Git LFS.
- Blender 5.2.2 is driven by `mcp-for-blender` on `localhost:9876` with safe mode; GIMP 3.2.6
  by `gimp3-mcp` on `localhost:9877`. Both are local authoring tools, **not** CI dependencies.
- MCP client config is **project-scoped** in this repo's `opencode.json` (gitignored); do not add
  Blender/GIMP to the global opencode config. The tracked reference is
  `docs/design/opencode.authoring.example.json`. Setup, ports, skills and troubleshooting are in
  [`docs/design/authoring-tools.md`](./docs/design/authoring-tools.md).
- Install only **one** GIMP MCP (`gimp3-mcp`, port 9877). A second bridge such as
  `gimp-agent-mcp` conflicts on the same port.
- Blender MCP requires Blender open + **N → MCP for Blender → Start MCP Server**. GIMP MCP
  requires GIMP open + **Tools → MCP → Start MCP Server**.
- Use `blender-game-assets` and `gimp-game-graphics` for project-specific conventions. The
  generic Blender recipes use legacy tool names; map them per `docs/design/authoring-tools.md`.

## Branches, PRs and review

- **Never commit directly to `main`.** Create a descriptive branch (`feat/…`, `fix/…`, `docs/…`), make the
  changes there and open a PR.
- **Run the `code-review` skill before merging** (standards + spec/issue axes). If the skill is unavailable,
  perform an equivalent independent review of the diff.
- **Fix the review findings, rerun the tests/CI, then merge.** The user has explicitly authorized this
  review → fix → merge loop for agent-driven work; do not wait for a separate merge approval unless they
  revoke that instruction. Never merge with unresolved review findings, failing CI or an unclear spec.
- **Do not self-merge outside that authorized loop**, and do not enable auto-merge.
- If work accidentally starts on `main`, move it to a branch before the first commit.

## Conventions

- **Language split**: code (identifiers, comments, docs) is **English**; only the text shown to the player
  (HUD, menus, narrative) and `docs/historia/**` stay **Spanish**. Historical proper nouns (civs, mission ids,
  place names) are data — never translate them.
- Strict TS (`strict`, ES2022, `moduleResolution: bundler`). No comments unless they add context the code
  cannot express. Prettier (single quotes, 120 cols) over `src/**/*.ts`, `scripts/**/*.{mjs,ts}`, `tests/**/*.ts`
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
- **Blender renders are provenance-gated**: `src/art/manifest.json` is the source of truth, new renders start
  `reviewed: false`, the game shows only reviewed renders (`?art=all` previews drafts), and a render is never
  presented as a historical photograph. `.blend`/`.xcf` sources are in Git LFS and the final PNG hash must be
  updated when GIMP retouches a render. See `docs/design/blender-art.md` and
  `docs/design/authoring-tools.md`.

## Debug harness

- `window.game` and `window.THREE` are exposed; the app opens the menu, so use `?play=1` (plus `?seed=`, `?fog=0`,
  `?low=1`, `?speed=`, `?era=N`, `?period=N`, `?mission=ID`, `?intro=0`, `?cine=1`, `?rig=1`, `?art=all`) to
  enter a match directly. `?city=caral` mounts the standalone Blender GLB showcase
  (`window.__cityDemo`); `?scenery=caral` mounts the modular Pyramid Mayor showcase and
  `?scenery=caral-anfiteatro` the Anfiteatro showcase (`window.__sceneryDemo`) instead of booting a match. `?rig=1` mounts the rigged-model demo
  (`window.__rigDemo`, `window.__modelAssets`). `?replay=1` plays
  the stored replay (`localStorage['peru-replay']`) and `?noloop=1` skips auto-starting the loop (tests drive fixed
  steps).
- `yarn shot` and the scripts write generated PNG/JSON to `review/` (gitignored) — never edit those by hand.

## See also

[`README.md`](./README.md) · [`CONTRIBUTING.md`](./CONTRIBUTING.md) · [`docs/development.md`](./docs/development.md) ·
[`docs/historia/`](./docs/historia/) · [`PROVENANCE.md`](./PROVENANCE.md) ·
[`docs/design/authoring-tools.md`](./docs/design/authoring-tools.md)
