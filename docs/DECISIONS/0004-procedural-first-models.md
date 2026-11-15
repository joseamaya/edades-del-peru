# 0004 · Procedural-first models with presentation-only rigs

**Status:** Accepted · **Date:** 2026-11-14 (records a split already implemented in the code)

## Context

The game needs many civilizations, units and buildings on a small art budget. It also needs authored
characters and creatures where silhouette and identity matter. Letting rendering assets own movement would
make the simulation depend on GLB clips and break deterministic tests.

## Decision

Procedural models are the **default** and the fallback for every unit and building. A unit may opt into a
rigged GLB (`src/model/defs/modelAssets.ts` → `src/rendering/RigInstance.ts`), but the rig is
**presentation-only**:

- the simulation owns position, navigation and combat state;
- root motion is ignored;
- a missing or failed GLB never changes gameplay;
- the procedural model remains the fallback.

## Consequences

- Gameplay tests run without loading authored assets.
- Art can be replaced or improved without touching the simulation, and a failed asset load degrades instead
  of breaking the match.
- Rigged assets must match the shared skeleton and the scale/orientation contract in
  `docs/development.md`.
- Animation clips are cosmetic; the combat timing lives in data, not in the clip.
- The Caral worker, mounted units, fauna and vehicles follow this rule; see `docs/design/visual-language.md`.

## Revisit

Revisit if a future system genuinely needs skeletal animation to drive gameplay (for example hitboxes baked
into clips). That would require a new ADR because it breaks the simulation/rendering split.

## References

- `AGENTS.md` (domain invariants)
- `docs/GDD.md` §6
- `docs/design/visual-language.md` (Rigged models)
- `docs/development.md` (Rigged models, Rigged fauna)
