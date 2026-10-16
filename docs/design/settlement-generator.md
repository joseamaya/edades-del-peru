# Settlement generator — design proposal

Status: **partially implemented.** Phases 1–3 (a terrain-aware dwelling layout for
the starting base) are live in `src/model/defs/settlementPlan.ts`, wired in
`Game.spawnStartBase`. The full plan below (roads, farms, dropsites, defense) and
the gameplay coupling remain future work.

Today a skirmish base is a center plus three dwellings on a fixed ring, and
campaign buildings are placed by hand with `dx/dz` offsets (`MissionDef.start`, see
[`src/core/Game.ts`](../../src/core/Game.ts) `spawnStartBase` / `applyMissionSetup`).
The dwellings now read the terrain through `planSettlement`; crops/roads/dropsites
still do not.

## Contract

Pure, deterministic function (no `THREE`, like `generateHeightField`):

```ts
export interface SettlementRequest {
  civ: CivId;
  period: HistoricalPeriod;
  map: HistoricalMapProfile;   // resolved via resolveMapProfile
  seed: number;
}

export interface SettlementPlacement {
  kind: BuildingKind;
  x: number;
  z: number;
  /** Optional facing, for oriented rows (dwellings along a street). */
  yaw: number;
}

export interface SettlementPlan {
  center: SettlementPlacement;
  placements: SettlementPlacement[];   // dwellings, farms, dropsites…
  roads: { from: { x: number; z: number }; to: { x: number; z: number } }[];
}

export function generateSettlement(
  req: SettlementRequest,
  query: {
    isBuildable(x: number, z: number): boolean;
    isWater(x: number, z: number): boolean;
    getSlope(x: number, z: number): number;
    getMoisture(x: number, z: number): number;
    getTerrace(x: number, z: number): number;
    height(x: number, z: number): number;
  },
): SettlementPlan;
```

The `query` is an interface, so the generator is testable headless (no DOM) with a
fake terrain — the same trick that makes `heightField` unit-testable.

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
4. Unit-test determinism + terrain validity with a fake query.
5. Wire `spawnStartBase` to the plan; keep the fallback.

## Acceptance criteria

- [ ] Same request → same plan (unit test, no DOM).
- [ ] A north-coast base sits by the valley and an Andean base on the slope
      (asserted structurally in E2E).
- [ ] No base ever spawns on water/unbuildable ground (fallback covers failure).
- [ ] Existing campaigns unchanged (they opt out by default).
- [ ] `yarn typecheck && yarn lint && yarn format:check && yarn test && yarn build` + E2E green.
