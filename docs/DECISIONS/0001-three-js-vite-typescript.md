# 0001 · Three.js, Vite and TypeScript

**Status:** Accepted · **Date:** 2026-11-14 (records a decision taken before the repository had an ADR log) · Size budget amended by [0008](./0008-dist-budget-28mb.md)

## Context

The game is a campaign-first browser RTS with procedural terrain, models and audio, a full Spanish HUD and a
small team working with AI agents. It needs fast iteration, a distributable web build and no native
toolchain. The project also needs a strict data layer because civilizations, periods, units, buildings and
missions are data-driven.

## Decision

Use **Three.js** for rendering, **Vite** for development and production builds, and **TypeScript** in strict
mode. Use **Yarn 1** as the package manager (`yarn.lock` is committed; there is no `package-lock.json`).
Target desktop browsers on Node ≥ 20.19, with CI on Node 22.

Import Three.js addons through `three/addons/...`, never `three/examples/jsm/...`.

## Consequences

- The whole game ships as a static web build; `yarn build` runs `tsc --noEmit`, the Vite build and the
  `dist/` size check.
- The build has hard budgets: `dist/` < 25 MB and the entry chunk < 600 KB gzip.
- Systems that must stay testable without a browser live outside Three.js (for example `src/sim/`), and the
  simulation owns movement and navigation.
- No native engine features are available. Rendering quality is constrained by WebGL and the performance
  budget in `docs/design/art-direction.md`.
- Tests use Vitest for units and data, and Playwright for browser/E2E behaviour.

## Revisit

Revisit if the web build stops being a viable distribution target, if the renderer cannot hold the
performance budget on the reference hardware, or if a required feature cannot be built on Three.js without
breaking the simulation/rendering split.

## References

- `AGENTS.md` (commands and stack)
- `docs/GDD.md` §7
- `docs/development.md` (architecture)
- `package.json`, `vite.config.ts`, `tsconfig.json`
