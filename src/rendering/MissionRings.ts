import * as THREE from 'three';
import type { MissionGoal } from '../campaign/types';

/**
 * Ground rings under the active `reach`/`hold` objectives: the tutorial says "the valley marker",
 * so the marker has to exist in the world, not only as a diamond on the minimap. Purely visual.
 */
export class MissionRings {
  private readonly group = new THREE.Group();
  private readonly rings = new Map<string, THREE.Mesh>();
  private signature = '';
  private readonly geometry = new THREE.RingGeometry(0.82, 1, 48);
  private readonly material = new THREE.MeshBasicMaterial({
    color: 0xffd166,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  constructor(
    scene: THREE.Scene,
    private readonly groundAt: (x: number, z: number) => number,
    /** Fog lookup; rings hide while their ground is unexplored. */
    private readonly explored: ((x: number, z: number) => boolean) | null,
  ) {
    this.group.name = 'mission-rings';
    scene.add(this.group);
  }

  /** Create, move and drop rings so they match the mission's active goals. */
  sync(goals: readonly MissionGoal[]): void {
    const visible = this.explored ? goals.filter((goal) => this.explored!(goal.x, goal.z)) : goals;
    const signature = visible.map((g) => `${g.id}:${g.x.toFixed(1)}:${g.z.toFixed(1)}:${g.radius}`).join('|');
    if (signature === this.signature) return;
    this.signature = signature;
    const seen = new Set<string>();
    for (const goal of visible) {
      seen.add(goal.id);
      let ring = this.rings.get(goal.id);
      if (!ring) {
        ring = new THREE.Mesh(this.geometry, this.material);
        ring.rotation.x = -Math.PI / 2;
        ring.renderOrder = 2;
        this.group.add(ring);
        this.rings.set(goal.id, ring);
      }
      ring.position.set(goal.x, this.groundAt(goal.x, goal.z) + 0.08, goal.z);
      ring.scale.setScalar(goal.radius);
    }
    for (const [id, ring] of this.rings) {
      if (seen.has(id)) continue;
      this.group.remove(ring);
      this.rings.delete(id);
    }
  }

  /** Pulse the shared material; the rings themselves only move when `sync` runs. */
  pulse(time: number): void {
    this.material.opacity = 0.42 + Math.sin(time * 2.2) * 0.12;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}
