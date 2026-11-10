import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { MissionRings } from '../src/rendering/MissionRings';

function rings(scene: THREE.Scene): THREE.Object3D[] {
  return scene.getObjectByName('mission-rings')?.children ?? [];
}

describe('mission goal rings', () => {
  it('draws one ring per goal, moves it and drops it when the goal ends', () => {
    const scene = new THREE.Scene();
    const ringsFx = new MissionRings(scene, () => 3, null);
    ringsFx.sync([{ id: 'a1_valle', x: 88, z: 110, radius: 12 }]);
    expect(rings(scene)).toHaveLength(1);
    expect(rings(scene)[0]!.position.x).toBe(88);
    expect(rings(scene)[0]!.scale.x).toBe(12);

    ringsFx.sync([{ id: 'a1_valle', x: 90, z: 110, radius: 12 }]);
    expect(rings(scene)[0]!.position.x).toBe(90);

    ringsFx.sync([]);
    expect(rings(scene)).toHaveLength(0);
    ringsFx.dispose();
  });

  it('hides a goal under unexplored fog and pulses the shared material', () => {
    const scene = new THREE.Scene();
    let explored = false;
    const ringsFx = new MissionRings(
      scene,
      () => 2,
      () => explored,
    );
    ringsFx.sync([{ id: 'a1_valle', x: 10, z: 10, radius: 8 }]);
    expect(rings(scene)).toHaveLength(0);
    explored = true;
    ringsFx.sync([{ id: 'a1_valle', x: 10, z: 10, radius: 8 }]);
    expect(rings(scene)).toHaveLength(1);
    const material = (rings(scene)[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    ringsFx.pulse(0);
    const atZero = material.opacity;
    ringsFx.pulse(0.7);
    expect(material.opacity).not.toBe(atZero);
    ringsFx.dispose();
  });
});
