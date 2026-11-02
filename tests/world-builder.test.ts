import { describe, expect, it } from 'vitest';
import {
  placeStartBuildings,
  placeStartResources,
  planStartSettlement,
  placeStartingUnits,
  planStartingUnitSpots,
  type ResourceNodeKind,
} from '../src/sim/WorldBuilder';

function run(seed: number, caralOpening = false) {
  const added: Array<{ kind: ResourceNodeKind; amount: number; x: number; z: number; pos: { x: number; z: number } }> =
    [];
  placeStartResources({
    player: 0,
    x: 64,
    z: 64,
    seed,
    caralOpening,
    isReserved: () => false,
    isWalkable: () => true,
    existing: () => added,
    add: (kind, amount, x, z) => added.push({ kind, amount, x, z, pos: { x, z } }),
  });
  return added;
}

describe('placeStartResources', () => {
  it('is deterministic for a seed', () => {
    expect(run(777, true)).toEqual(run(777, true));
    expect(run(777, true)).not.toEqual(run(778, true));
  });

  it('places the normal opening ring plus the compact grove', () => {
    const nodes = run(777);
    expect(nodes.filter((n) => n.kind === 'berry')).toHaveLength(1);
    expect(nodes.filter((n) => n.kind === 'mine')).toHaveLength(1);
    expect(nodes.filter((n) => n.kind === 'well')).toHaveLength(1);
    expect(nodes.filter((n) => n.kind === 'hunt')).toHaveLength(1);
    expect(nodes.filter((n) => n.kind === 'tree')).toHaveLength(11);
  });

  it('keeps the authored Caral grove on the valley edge', () => {
    const added: Array<{ kind: ResourceNodeKind; x: number; z: number }> = [];
    placeStartResources({
      player: 1,
      x: 64,
      z: 64,
      seed: 777,
      caralOpening: true,
      isReserved: () => false,
      isWalkable: () => true,
      existing: () => [],
      add: (kind, _amount, x, z) => added.push({ kind, x, z }),
    });
    expect(added.filter((n) => n.kind === 'tree')).toHaveLength(5);
    expect(added.find((n) => n.kind === 'well')?.x).toBeCloseTo(46);
    expect(added.find((n) => n.kind === 'berry')?.x).toBeCloseTo(84);
  });
});

describe('starting units', () => {
  it('places four workers and one scout deterministically', () => {
    const run = () => {
      const out: Array<{ kind: string; x: number; z: number }> = [];
      placeStartingUnits({
        player: 0,
        x: 64,
        z: 64,
        seed: 777,
        mainComponentSpot: (x, z) => ({ x, z }),
        createUnit: (kind, x, z) => out.push({ kind, x, z }),
      });
      return out;
    };
    const a = run();
    expect(a).toEqual(run());
    expect(a.filter((u) => u.kind === 'worker')).toHaveLength(4);
    expect(a[0]).toMatchObject({ kind: 'worker', x: 65.11827230732888, z: 61.206708509940654 });
    expect(a.filter((u) => u.kind === 'scout')).toHaveLength(1);
  });

  it('uses authored spots when provided', () => {
    const spots = [0, 1, 2, 3, 4].map((i) => ({ x: i, z: i }));
    const out: Array<{ kind: string; x: number; z: number }> = [];
    placeStartingUnits({
      player: 0,
      x: 64,
      z: 64,
      seed: 777,
      spots,
      mainComponentSpot: (x, z) => ({ x, z }),
      createUnit: (kind, x, z) => out.push({ kind, x, z }),
    });
    expect(out.slice(0, 4)).toEqual(spots.slice(0, 4).map((p) => ({ kind: 'worker', ...p })));
    expect(out.at(-1)).toEqual({ kind: 'scout', x: 4, z: 4 });
  });

  it('falls back when no clear arc spot exists', () => {
    const spots = planStartingUnitSpots({
      x: 64,
      z: 64,
      isClear: () => false,
      fallback: (_x, _z, used) => ({ x: 10 + used.length, z: 20 }),
    });
    expect(spots).toHaveLength(5);
    expect(spots[0]).toEqual({ x: 10, z: 20 });
  });
});

describe('start buildings', () => {
  const terrain = {
    isWater: () => false,
    isBuildable: () => true,
    getSlope: () => 0,
    getHeight: () => 0,
    getMoisture: () => 0.4,
  };

  it('plans a centre and three dwellings, then creates them in order', () => {
    const plan = planStartSettlement({ shape: 'dispersed', seed: 777, player: 0, x: 64, z: 64, terrain });
    expect(plan.center).toEqual({ x: 64, z: 64 });
    expect(plan.dwellings).toHaveLength(3);
    const created: Array<{ kind: string; x: number; z: number }> = [];
    placeStartBuildings({
      plan,
      createBuilding: (kind, x, z) => created.push({ kind, x, z }),
    });
    expect(created[0]).toEqual({ kind: 'center', x: 64, z: 64 });
    expect(created.slice(1)).toEqual(plan.dwellings.map((d) => ({ kind: 'house', x: d.x, z: d.z })));
  });
});
