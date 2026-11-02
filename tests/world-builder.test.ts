import { describe, expect, it } from 'vitest';
import { placeStartResources, type ResourceNodeKind } from '../src/sim/WorldBuilder';

function run(seed: number, caralOpening = false) {
  const added: Array<{ kind: ResourceNodeKind; amount: number; x: number; z: number }> = [];
  placeStartResources({
    player: 0,
    x: 64,
    z: 64,
    seed,
    caralOpening,
    isReserved: () => false,
    isWalkable: () => true,
    existing: [],
    add: (kind, amount, x, z) => added.push({ kind, amount, x, z }),
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
    expect(nodes.filter((n) => n.kind === 'tree')).toHaveLength(18);
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
      existing: [],
      add: (kind, _amount, x, z) => added.push({ kind, x, z }),
    });
    expect(added.filter((n) => n.kind === 'tree')).toHaveLength(5);
    expect(added.find((n) => n.kind === 'well')?.x).toBeCloseTo(46);
    expect(added.find((n) => n.kind === 'berry')?.x).toBeCloseTo(84);
  });
});
