# Cultural landscape

Status: **implemented (visual + gameplay).** All phases are live:
`src/model/defs/landscape.ts`, `src/model/defs/landscapePlan.ts` and
`src/rendering/CulturalLandscape.ts`. Features rendered: plaza, field, road, path,
canal, terrace, wall, corral. The gameplay hook (phase 4) feeds farm yield through
nearby canals/terraces (`src/model/defs/farmYield.ts`), and phase 5 asserts the
layer's draw-call budget in `scripts/bench.mjs`.

The layer extends the existing `HistoricalMapProfile`
([`src/model/defs/profiles.ts`](../../src/model/defs/profiles.ts)) — it does **not**
introduce a parallel map system. The natural world is per-region (`terrain`,
`climate`, `water`, `vegetation`, `resources`, `atmosphere`); this layer adds the
*human* reading of the same geography (paths between dwellings, canal-fed fields,
plazas, corrals), so a player can infer *why* a society developed where it did
(patronage of rivers, terraces, roads). See the known limitations below for the
parts that are visual-only or still defective.

## Goals

- Represent cultural features as **data** attached to the map profile, consumed
  by the existing generator.
- Distribute them **deterministically** (`seed + profile`), like the terrain.
- Keep the RTS performance budget: batched geometry, no thousands of individual
  meshes.
- Feed **gameplay** where cheap (agriculture, movement, defense), not only looks.

## Non-goals

- No invented archaeology: every feature kind is a **plausible/abstraction**
  reading of documented traits in [`docs/historia/`](../historia/), and any new
  landmark-like element follows `src/model/defs/landmarks.ts` (source + status).
- No city builder: the generator suggests, it does not simulate urbanism.
- No change to `Era`/`HistoricalPeriod` semantics.

## Data model

`HistoricalMapProfile.culturalLandscape` is optional (existing profiles and mods
stay valid). `LandscapeFeature` covers the full PRP §8 vocabulary; some entries are
composed variants rather than new geometry: `path` is a narrow `road`, `courtyard`
is a `plaza` with a partial `wall`, `ceremonial` is a `platform` + sunken `plaza`,
and `fortification` is a heavy `wall` (the hilltop form of the `chanca_fortress`
landmark). Only the features in `RENDERED_FEATURES` are drawn today.

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

Region defaults (`LANDSCAPE` in `src/model/defs/landscape.ts`, each with its
`provenance` string):

| Region | Features (weight) | Shape | Grounding |
|---|---|---|---|
| `north_coast` | canal, field, road, plaza | riverside | Moche/Chimú irrigation + Chan Chan |
| `central_coast` | canal, field, road, plaza | riverside | Caral-Supe canals and plazas |
| `south_coast` | field, road | dispersed | Paracas/Nazca pampa, puquios |
| `andean_valley` | terrace, road, field, wall | riverside | Chavín/Wari/Inca terraces, Huaylas |
| `high_andes` | terrace, road, plaza, wall | hilltop | Inca andenes, Qhapaq Ñan, pucarás |
| `altiplano` | terrace, field, corral, plaza | dispersed | Tiahuanaco waru-warus, chullpas |
| `amazon` | field (low), path (low) | dispersed | high-jungle gardens |

`terrace` is also implemented as terrain (`terraceChance` → `carveTerraces` in
[`src/rendering/heightField.ts`](../../src/rendering/heightField.ts)); the profile
additionally places visible retaining modules on terrace edges.

## Rendering

`planCulturalLandscape` ([`src/model/defs/landscapePlan.ts`](../../src/model/defs/landscapePlan.ts))
is **pure** (no THREE, unit-tested headless): `seed + profile` always yields the
same placements. `CulturalLandscape`
([`src/rendering/CulturalLandscape.ts`](../../src/rendering/CulturalLandscape.ts))
turns each point placement into a primitive (a plaza is a disc, a wall/terrace a low
box, a corral a ring, a field a quad) and builds **roads, paths and canals as
continuous ribbons** along their polyline (`buildRibbon`,
[`src/rendering/ribbon.ts`](../../src/rendering/ribbon.ts)), sampling the terrain
height at every vertex so they follow the relief with no gaps between segments.
Every feature is then **merged into a single mesh**, so the whole layer is at most
one mesh per drawable feature (`RENDERED_FEATURES.length` meshes). Canals follow
the carved ditches: `heightField.ts` returns the cut centre-lines and `Terrain`
exposes them via `getCanalPaths()`. Placement uses its own `RNG(seed * k + c)`, so
the **simulation RNG is never touched** (replay safety).

Materials are plain `MeshStandardMaterial` tinted per feature and, when the AI
assets exist, overlaid with generated PBR via `applyGeneratedPbr`
(`LANDSCAPE_SLOT` maps each feature to a `ground_*`/`terrace_face`/… slot); the
per-feature `LANDSCAPE_TINT` multiplies the neutral generated maps with the
regional albedo. Flat features (`plaza`, `field`) sample the terrain height on
every vertex, so they drape over the relief instead of floating on a slope. They
also sample the **fog-of-war grid** (`src/rendering/FowMaterial.ts`, `applyFow`),
sharing the terrain's `Fow` texture (and the landmark and settlement overlays),
so they dim with the relief instead of glowing over unexplored terrain. The
canal is drawn as a translucent turquoise surface on top of the carved ditch; it
does **not** reuse the `Water` renderer. Water carving lives in `heightField.ts`
(`carveCanals` builds a `canalMap`; the bed is kept above the waterline so a canal
is a visual ditch, not a pathfinding wall or a flooding source), and `Terrain`
exposes it via `getCanal`.

## Integration points

- `src/model/defs/profiles.ts` — the data + resolver defaults.
- `src/rendering/heightField.ts` — optional carving (canals lower a path).
- `src/core/Game.ts` — `spawnCulturalLandscape()` next to `spawnLandmark()`, adding
  a static `THREE.Group` (no entities, no pathfinding obstacles). The starting base
  also adds a `SettlementOverlay` (`src/rendering/SettlementOverlay.ts`) with its
  planned roads and fields.
- `src/rendering/CulturalLandscape.ts` — the batcher/builder.
- Save/replay: the layer is **derived** from seed + profile, so it is **not**
  saved (regenerated on load, exactly like the terrain).

## Determinism & performance budget

- Pure function of `seed + profile`, verified by `tests/landscape.test.ts`
  (same input → same feature set; the analogue of `tests/terrain.test.ts`).
- Budget: the layer draws at most one mesh per drawable feature. `scripts/bench.mjs`
  isolates the layer's draw calls (render once with the group visible and once
  hidden, at max zoom so every mesh is in view) and asserts
  `drawCalls <= CulturalLandscape.featureBudget * 2`, where `featureBudget` is
  `RENDERED_FEATURES.length` — the same bound the E2E asserts in
  `tests/e2e/landscape.spec.ts`. Basing the budget on the declared vocabulary (not
  on the measured mesh count) makes it non-circular: un-merging a road/path into
  per-segment meshes exceeds the budget and fails. The factor 2 is three's
  `VSMShadowMap`: it renders every shadow **receiver** into the shadow map as well,
  and every landscape mesh sets `receiveShadow`, so each merged mesh costs one
  main-pass plus one shadow-pass draw. Numbers are only comparable on the same
  machine/browser; `bench.json` records the OS/CPU/Node so runs can be compared
  (see [`docs/development.md`](../development.md) §Performance).

## Known limitations

By design, not defects:

- **Visual only.** The layer adds no entities, no pathfinding obstacles and no
  gameplay effect. Only the farm-yield hook (canals/terraces) reads it.
- **Not every vocabulary feature is drawn.** Only `RENDERED_FEATURES` (plaza, field,
  road, path, canal, terrace, wall, corral) get geometry; `courtyard`, `platform`,
  `ceremonial`, `fortification` and `bridge` are declared but composed from the
  drawn set or unimplemented.
- **Abstraction, not reconstruction.** Feature kinds are plausible readings of
  documented traits, not archaeological reconstructions (see the `provenance` of
  each region).

## Confirmed defects

None open. The original review defects are resolved: Fog of War on the layer
(**#70**), fragmented roads/paths (**#71**), the canal not following the carved
ditch (**#72**) and flat settlement roads/fields (**#73**).

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

## Verification

- `yarn test` — `tests/landscape.test.ts`, `tests/settlement.test.ts`, `tests/farm-yield.test.ts`.
- `yarn test:e2e` — `tests/e2e/landscape.spec.ts`, `tests/e2e/settlement.spec.ts`.
- `yarn bench` — isolates and asserts the layer's draw-call budget.
- `yarn visual:update` — regenerate `tests/visual/baseline.json` when the layer changes.
