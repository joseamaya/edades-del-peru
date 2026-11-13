import * as THREE from 'three';
import { labelSprite } from './textSprite';

interface Stone {
  readonly group: THREE.Group;
  readonly ring: THREE.MeshBasicMaterial;
  readonly phase: number;
}

/**
 * Huacas raised by the mission script: a named character is buried or turned to stone and the
 * place keeps a marker. Stylized (a slab, three stones and a gold ring), never an archaeological
 * reconstruction; the dossier carries the source.
 */
export class MemoryStones {
  private readonly group = new THREE.Group();
  private readonly stones = new Map<string, Stone>();
  private readonly stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x9c9384,
    roughness: 0.95,
    flatShading: true,
    emissive: 0x2e2414,
    emissiveIntensity: 0.55,
  });
  private readonly ringTemplate = new THREE.MeshBasicMaterial({
    color: 0xffd166,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  private readonly ringGeometry = new THREE.RingGeometry(1.9, 2.2, 40);
  private readonly slabGeometry = new THREE.BoxGeometry(1.05, 2.2, 0.5);
  private readonly rockGeometry = new THREE.DodecahedronGeometry(0.46, 0);

  constructor(
    scene: THREE.Scene,
    private readonly groundAt: (x: number, z: number) => number,
    private readonly decorate?: (root: THREE.Object3D) => void,
  ) {
    this.group.name = 'memory-stones';
    scene.add(this.group);
  }

  /** Raise the marker once; repeated calls for the same id are ignored (save/load, replays). */
  add(id: string, x: number, z: number, label: string): void {
    if (this.stones.has(id)) return;
    const stone = new THREE.Group();
    stone.name = `memory-stone:${id}`;
    stone.position.set(x, this.groundAt(x, z), z);

    const slab = new THREE.Mesh(this.slabGeometry, this.stoneMaterial);
    slab.position.set(0, 1.1, 0);
    slab.rotation.y = 0.42;
    slab.castShadow = true;
    stone.add(slab);

    const rocks: [number, number, number, number][] = [
      [-0.85, 0.24, 0.5, 0.82],
      [0.9, 0.2, 0.35, 0.62],
      [0.45, 0.16, -0.75, 0.5],
    ];
    for (const [dx, y, dz, scale] of rocks) {
      const rock = new THREE.Mesh(this.rockGeometry, this.stoneMaterial);
      rock.position.set(dx, y, dz);
      rock.scale.setScalar(scale);
      rock.rotation.set(dx, dz, y);
      rock.castShadow = true;
      stone.add(rock);
    }

    const ring = this.ringTemplate.clone();
    const ringMesh = new THREE.Mesh(this.ringGeometry, ring);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.06;
    stone.add(ringMesh);

    const labelBillboard = labelSprite(label, { fontSize: 44, color: '#f2dfae', paddingX: 16, paddingY: 8 });
    labelBillboard.material.opacity = 1;
    labelBillboard.sprite.scale.set(0.7 * labelBillboard.aspect, 0.7, 1);
    labelBillboard.sprite.position.y = 2.6;
    stone.add(labelBillboard.sprite);

    this.decorate?.(stone);
    this.group.add(stone);
    this.stones.set(id, { group: stone, ring, phase: this.stones.size * 0.9 });
  }

  /** Breathe each ring on its own phase so the markers do not blink in lockstep. */
  update(time: number): void {
    for (const stone of this.stones.values()) {
      stone.ring.opacity = 0.28 + 0.07 * Math.sin(time * 1.3 + stone.phase);
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const stone of this.stones.values()) stone.ring.dispose();
    this.stones.clear();
    this.stoneMaterial.dispose();
    this.ringTemplate.dispose();
    this.ringGeometry.dispose();
    this.slabGeometry.dispose();
    this.rockGeometry.dispose();
  }
}
