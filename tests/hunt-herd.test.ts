import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { HuntHerd } from '../src/rendering/HuntHerd';
import { ResourceNode, clearResourceCaches } from '../src/entities/ResourceNode';
import { clearFaunaTemplates } from '../src/rendering/faunaModels';

afterEach(() => {
  clearFaunaTemplates();
  clearResourceCaches();
});

describe('hunt herd presentation', () => {
  it('starts as a walking herd and converts animals to carcasses as it is harvested', () => {
    const herd = new HuntHerd(7);
    expect(herd.live).toBe(3);
    expect(herd.carcassCount).toBe(0);

    herd.setRemaining(0.7);
    expect(herd.live).toBe(3);
    expect(herd.carcassCount).toBe(0);

    herd.setRemaining(0.5);
    expect(herd.live).toBe(2);
    expect(herd.carcassCount).toBe(1);

    herd.setRemaining(0.2);
    expect(herd.live).toBe(1);
    expect(herd.carcassCount).toBe(2);

    herd.setRemaining(0);
    expect(herd.live).toBe(0);
    expect(herd.carcassCount).toBe(3);
    herd.dispose();
  });

  it('moves the herd over time instead of leaving it in a static pose', () => {
    const herd = new HuntHerd(3);
    const before = herd.group.getObjectByName('hunt_bodies') as THREE.InstancedMesh;
    const first = before.instanceMatrix.array.slice(12, 15);
    herd.update(1.5);
    const after = before.instanceMatrix.array.slice(12, 15);
    expect(Array.from(after)).not.toEqual(Array.from(first));
    herd.dispose();
  });
});

it('reconstructs a partially harvested herd from a saved node', () => {
  const node = new ResourceNode(new THREE.Scene(), 'hunt', 10, 10, 150, 'coast');
  node.subtract(75);
  const saved = node.toSave();
  expect(saved.maxAmount).toBe(150);

  const loaded = new ResourceNode(new THREE.Scene(), 'hunt', saved.x, saved.z, saved.amount, 'coast');
  loaded.applySave(saved);
  expect((loaded.view.getObjectByName('hunt_bodies') as THREE.InstancedMesh).count).toBe(2);
  expect((loaded.view.getObjectByName('hunt_carcasses') as THREE.InstancedMesh).count).toBe(1);
  node.remove();
  loaded.remove();
});
