import type * as THREE from 'three';
import type { RigClipState } from '../model/defs/modelAssets';
import { acquireRig } from './ModelAssets';
import type { RigInstance } from './RigInstance';

export interface RigDemoHost {
  scene: THREE.Scene;
  terrain: { getHeight(x: number, z: number): number };
  playerCenter(owner: number): { x: number; z: number };
}

export interface RigDemoSnapshot {
  states: (RigClipState | null)[];
  times: number[];
  bones: number[][];
}

/**
 * Debug harness (`?rig=1`): two independent instances of the same rigged
 * asset with different clips. It never joins the entity/simulation lists.
 */
export class RigDemo {
  private readonly rigs: RigInstance[] = [];
  private readonly roots: THREE.Object3D[] = [];

  constructor(host: RigDemoHost) {
    const center = host.playerCenter(0);
    const clips: RigClipState[] = ['idle', 'work'];
    for (let i = 0; i < clips.length; i++) {
      const rig = acquireRig('ual_mannequin');
      if (!rig) break;
      const x = center.x + (i === 0 ? -2.4 : 2.4);
      const z = center.z + 13;
      rig.root.position.set(x, host.terrain.getHeight(x, z), z);
      rig.root.rotation.y = i === 0 ? -0.35 : 0.35;
      rig.play(clips[i], 0);
      host.scene.add(rig.root);
      this.rigs.push(rig);
      this.roots.push(rig.root);
    }
  }

  get count(): number {
    return this.rigs.length;
  }

  update(dt: number): void {
    for (const rig of this.rigs) rig.update(dt);
  }

  snapshot(): RigDemoSnapshot {
    return {
      states: this.rigs.map((rig) => rig.currentState),
      times: this.rigs.map((rig) => rig.time),
      bones: this.rigs.map((rig) => {
        const head = rig.root.getObjectByName('Head');
        return head ? head.quaternion.toArray() : [];
      }),
    };
  }

  dispose(): void {
    for (const rig of this.rigs) rig.dispose();
    for (const root of this.roots) root.removeFromParent();
    this.rigs.length = 0;
    this.roots.length = 0;
  }
}

/** Mount the demo if the asset is already loaded (call after preloading). */
export function mountRigDemo(host: RigDemoHost): RigDemo | null {
  const demo = new RigDemo(host);
  return demo.count > 0 ? demo : null;
}
