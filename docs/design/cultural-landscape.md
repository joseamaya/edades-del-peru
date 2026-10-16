# Cultural landscape — design proposal

Status: **implemented (visual + gameplay).** All phases are live:
`src/model/defs/landscape.ts`, `src/model/defs/landscapePlan.ts` and
`src/rendering/CulturalLandscape.ts`. Features rendered: plaza, field, road, path,
canal, terrace, wall, corral. The gameplay hook (phase 4) feeds farm yield through
nearby canals/terraces (`farmYield.ts`), and phase 5 asserts the layer's draw-call
budget in `scripts/bench.mjs`.

This document describes how to add a `CulturalLandscape` layer to Edades del Perú.
It extends the existing `HistoricalMapProfile`
([`src/model/defs/profiles.ts`](../../src/model/defs/profiles.ts)) — it does **not**
introduce a parallel map system.

Today the natural world is per-region (`terrain`, `climate`, `water`,
`vegetation`, `resources`, `atmosphere`) and the *human* elements are limited to
the landmark and the buildings a player/AI actually constructs. Nothing makes a
settlement read as a **place** (paths between dwellings, canal-fed fields, plazas,
corrals). This layer fills that gap, and it is what lets a player infer *why* a
society developed where it did (patronage of rivers, terraces, roads).

## Goals

- Represent cultural features as **data** attached to the map profile, consumed
  by the existing generator.
- Distribute them **deterministically** (`seed + profile`), like the terrain.
- Keep the RTS performance budget: batched/instanced geometry, no thousands of
  individual meshes.
- Feed **gameplay** where cheap (agriculture, movement, defense), not only looks.

## Non-goals

- No invented archaeology: every feature kind is a **plausible/abstraction**
  reading of documented traits in [`docs/historia/`](../historia/), and any new
  landmark-like element follows `src/model/defs/landmarks.ts` (source + status).
- No city builder: the generator suggests, it does not simulate urbanism.
- No change to `Era`/`HistoricalPeriod` semantics.

## Data model

Add an optional `culturalLandscape` to `HistoricalMapProfile` (keeps the field
optional so existing profiles and mods stay valid):

```ts
export type LandscapeFeature =
  | 'road'
  | 'path'
  | 'canal'
  | 'terrace'
  | 'field'
  | 'plaza'
  | 'courtyard'
  | 'platform'
  | 'ceremonial'
  | 'wall'
  | 'fortification'
  | 'bridge'
  | 'corral';
```

This covers the full PRP §8 vocabulary; some entries are composed variants rather
than new geometry: `path` is a narrow `road`, `courtyard` is a `plaza` with a
partial `wall`, `ceremonial` is a `platform` + sunken `plaza`, and
`fortification` is a heavy `wall` (the hilltop form of the `chanca_fortress`
landmark). `bridge` is the only feature that spans water.

```ts
export interface LandscapeRule {
  feature: LandscapeFeature;
  /** 0 = absent .. 1 = dominant. Scales density/length. */
  weight: number;
}

export interface CulturalLandscapeProfile {
  features: LandscapeRule[];
  /** How the settlement clusters: 'riverside' | 'hilltop' | 'dispersed' | 'grid'. */
  settlementShape: 'riverside' | 'hilltop' | 'dispersed' | 'grid';
  provenance: string;
}
```

Region defaults (grounded, to validate per civ):

| Region | Features (weight) | Shape | Grounding |
|---|---|---|---|
| `north_coast` | canal, field, road, plaza | riverside | Moche/Chimú irrigation + Chan Chan |
| `central_coast` | canal, field, road, plaza | riverside | Caral-Supe canals and plazas |
| `south_coast` | field, road | dispersed | Paracas/Nazca pampa, puquios |
| `andean_valley` | terrace, road, field, wall | riverside | Chavín/Wari/Inca terraces, Huaylas |
| `high_andes` | terrace, road, plaza, wall | hilltop | Inca andenes, Qhapaq Ñan, pucarás |
| `altiplano` | terrace, field, corral, plaza | dispersed | Tiahuanaco waru-warus, chullpas |
| `amazon` | field (low), road (low) | dispersed | high-jungle gardens |

`terrace` is already implemented as terrain (`terraceChance` → `carveTerraces` in
[`src/rendering/heightField.ts`](../../src/rendering/heightField.ts)); this profile
would let it also place visible retaining-wall modules on terrace edges.

Per-civilization overrides follow the `CIV_ARCH` pattern in
[`architecture.ts`](../../src/model/defs/architecture.ts) (same shape, per-civ tweak).

## Rendering strategy

Feature geometry is composed from reusable modules (the same philosophy as the
modular architecture in §11 of the PRP): a road is a ribbon of flat quads; a
canal is a carved strip + water sliver; a terrace wall is the existing
`andeanTerraceBase` retaining module; a plaza is a paved disc; a corral is a
low-wall ring. Prefer:

- **Merged geometry per feature chain** (one road = one merged mesh), not one
  mesh per segment.
- **`InstancedMesh`** for repeated small props (fence posts, terrace wall
  segments).
- Placement from a dedicated `RNG(seed * k + c)` so the **simulation RNG is never
  touched** (replay safety).

Water (canals) reuses the `Water` material/shader with a narrow channel; the
terrain shader can dim a canal bed via a per-vertex mask (same pattern as
`terraceMap`).

## Integration points

- `src/model/defs/profiles.ts` — the data + resolver defaults.
- `src/rendering/heightField.ts` — optional carving (canals lower a path).
- `src/rendering/Terrain.ts` — expose a canal/feature mask for the shader.
- `src/core/Game.ts` — a `spawnCulturalLandscape()` next to `spawnLandmark()`,
  adding a static `THREE.Group` (no entities, no pathfinding obstacles unless the
  design says so).
- `src/rendering/CulturalLandscape.ts` (new) — the batcher/builder.
- Save/replay: the layer is **derived** from seed + profile, so it is **not
  saved** (regenerated on load, exactly like the terrain).

## Determinism & performance budget

- Pure function of `seed + profile`, verified by a unit test (same input → same
  feature set; the analogue of `tests/terrain.test.ts`).
- Budget: the layer must add **≤ ~150 draw calls** and stay within the existing
  `yarn bench` frame budget at 300 units (see
  [`docs/development.md`](../development.md) §Performance). Features are static →
  they can be merged aggressively and are candidate for `BatchedMesh`.

## Risks

| Risk | Mitigation |
|---|---|
| Map/screenshot churn | Like the terrace change: regenerate `tests/visual/baseline.json`, rerun E2E |
| Over-decoration killing FPS | Merged/instanced static geometry; budget assertion in bench |
| Inventing history | Every feature cites the dossier; abstractions marked |
| Campaign layouts broken | Layer is visual at first; keep it off the buildable footprint of scripted bases |
| Determinism drift | Own RNG stream; never touch the sim RNG |

## Phased plan

1. **Data + types** (`culturalLandscape` in profiles, resolver + tests). ✅
2. **One feature, one region**: canals + fields on `north_coast` (Moche slice). ✅
3. **Rendering batcher** and the visual-regression scene. ✅ (`CulturalLandscape`, `landscape_*` scenes)
4. **Gameplay hook**: fields/canals nudge nearby farm yield (reuse
   `applyTerrainFarmYield`). ✅
5. **Generalize** to the remaining regions; add the bench budget assertion. ✅ regions + bench budget assertion

## Acceptance criteria

- [x] `seed + profile` → same landscape (unit test).
- [x] North-coast, high-Andes and altiplano read differently **beyond** colour.
- [x] No measurable regression in `yarn bench` draw calls / frame time (budget asserted).
- [x] No new historical claim without a `docs/historia/` source.
- [x] `yarn typecheck && yarn lint && yarn format:check && yarn test && yarn build` + E2E green.
