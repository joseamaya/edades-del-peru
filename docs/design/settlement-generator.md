# Settlement generator — design proposal

Status: **implemented.** The pure, terrain-aware layout — the dwellings of the
starting base plus the full `SettlementPlan` (center, fields and roads) — is
`planSettlementSite` in `src/model/defs/settlementPlan.ts`. `Game.spawnStartBase`
consumes it (dwellings as entities; fields/roads rendered visually by
`src/rendering/SettlementOverlay.ts`). **Dropsites and defense are deferred** design
extras (there is no dropsite `BuildingKind`).

Decisions: fields and roads are **visual only** (no `BuildingKind.FARM`, no economy
change); **campaigns stay opt-in** (the default keeps the explicit `dx/dz`).

Today a skirmish base is a center plus three dwellings on a ring; campaign
buildings are placed by hand with `dx/dz` offsets (`MissionDef.start`, see
[`src/core/Game.ts`](../../src/core/Game.ts) `spawnStartBase` / `applyMissionSetup`).
The dwellings, fields and roads all read the terrain through the planner.

## Contract

Pure, deterministic function (no `THREE`, like `generateHeightField`). The
**implemented** slice (dwellings of the starting base) is:

```ts
export interface SettlementRequest {
  shape: SettlementShape;      // riverside | hilltop | dispersed | grid
  seed: number;
  anchor: { x: number; z: number };
  count: number;
}

export interface SettlementSpot {
  x: number;
  z: number;
  yaw: number;
}

export function planSettlement(req: SettlementRequest, q: SettlementQuery): SettlementSpot[];
```

The `SettlementQuery` interface (shared `TerrainQuery` + `getHeight`/`getMoisture`,
plus optional `getTerrace`/`getCanal`) keeps the planner testable headless with a
fake terrain. `planSettlement` returns just the dwellings; the **full plan** is:

```ts
export function planSettlementSite(req: SettlementRequest, q: SettlementQuery): SettlementPlan;

export interface SettlementPlan {
  center: { x: number; z: number };
  dwellings: SettlementSpot[];
  fields: SettlementField[];            // { x, z, yaw, size } — layout only (visual)
  roads: { from: { x: number; z: number }; to: { x: number; z: number } }[];
}
```

## Algorithm (spatial logic, not random scatter)

1. **Pick the core.** Score candidate cells in an annulus around the requested
   anchor by the region's `settlementShape` (from
   [`cultural-landscape.md`](./cultural-landscape.md)):
   - `riverside` → maximize proximity to water/moisture, flat buildable ground.
   - `hilltop` → maximize `height`/visibility, moderate slope (defense).
   - `dispersed` → spread from fertility pockets.
   - `grid` → flat area with room for aligned rows (colonial/republican).
2. **Place the center** at the best cell (must pass `isBuildable`).
3. **Lay primary roads** from the center toward the best resource clusters and
   the map edge nearest the player's corner (deterministic, straight, snapped to
   buildable ground).
4. **Cluster dwellings** along the roads on the least fertile ground (keep
   farmland free), reserving farmland cells for farms.
5. **Agriculture** goes on the highest-`terrace`/moisture cells (andenes in the
   Andes), each farm adjacent to a road or the center.
6. **Dropsites** sit between the center and the resource cluster they serve.
7. **Defense** (later phase) orients walls/forts toward the map center/threats.

All angles/offsets come from a dedicated `RNG(seed * k + c)` stream.

## Integration

- **Skirmish**: `Game.spawnStartBase` consumes the plan instead of its hardcoded
  ring (`spawnStartBase`, [`Game.ts`](../../src/core/Game.ts)); resources stay
  hand-placed by `spawnResources` for now.
- **Campaign**: optionally let a mission opt in (`MissionDef.settlement?: true`);
  otherwise keep the explicit `dx/dz` layout so scripted narratives stay exact.
- **Resources**: a later step seeds `spawnStartResources` near the chosen core.
- **No save change**: the plan is derived from `seed + profile + civ + period`, so
  it is regenerated on load; only the *resulting entities* are saved (as today).

## Determinism & performance

- Pure function; same request → same plan (unit test).
- Cost is O(candidates) at boot only; runs once per base, off the frame budget.
- Headless test uses a fake `query`, no WebGL.

## Risks

| Risk | Mitigation |
|---|---|
| Bases on bad terrain (stuck, unreachable) | Every placement is validated by `isBuildable` + `canPlace`; fallback to today's ring if the plan is empty |
| Campaign scripts assume fixed offsets | Campaigns opt in; default stays explicit |
| Replay/save divergence | Derived data + own RNG; entities remain the save surface |
| Visual churn | Regenerate the visual baseline; add a settlement scene |
| Over-engineering | Start with center + roads + dwellings + farms; extras later |

## Phased plan

1. Extract today's ring layout behind the `generateSettlement` interface with a
   trivial "fixed ring" implementation (pure refactor, no behavior change).
2. Implement `riverside` for `north_coast`/`central_coast` (Moche/Caral slice).
3. Implement `hilltop` for `high_andes` (Inca slice).
4. Unit-test determinism + terrain validity with a fake query. ✅
5. Full pure planner: center + dwellings + fields + roads (`planSettlementSite`). ✅
6. Wire `spawnStartBase` to the plan and render the fields/roads; keep the fallback. ✅

## Acceptance criteria

- [x] Same request → same plan (unit test, no DOM).
- [x] A base carries its planned dwellings + fields + roads, all on buildable/dry/
      gentle ground, deterministic for the same seed (asserted structurally in E2E).
- [x] Every placement is validated on buildable, dry, gentle ground; the degenerate
      all-water map keeps the nominal ring (documented fallback).
- [x] Existing campaigns unchanged (they opt out by default; layout stays `dx/dz`).
- [x] `yarn typecheck && yarn lint && yarn format:check && yarn test && yarn build` + E2E green.
